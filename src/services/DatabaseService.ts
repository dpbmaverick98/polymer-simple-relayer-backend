import { Database } from 'bun:sqlite';
import type { Job, JobStatus } from '../types/index.js';
import { logger } from '../utils/logger.js';

export class DatabaseService {
  private db: Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.initializeDatabase();
  }

  private initializeDatabase() {
    logger.info('Initializing database schema');

    // Jobs table with new mapping_name field
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        unique_id TEXT UNIQUE NOT NULL,
        source_chain TEXT NOT NULL,
        source_tx_hash TEXT NOT NULL,
        source_block_number INTEGER NOT NULL,
        dest_chain TEXT NOT NULL,
        dest_address TEXT NOT NULL,
        dest_method TEXT NOT NULL,
        dest_method_signature TEXT,
        event_data TEXT NOT NULL,
        proof_data TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        proof_required BOOLEAN DEFAULT 0,
        dest_tx_hash TEXT,
        retry_count INTEGER DEFAULT 0,
        error_message TEXT,
        created_at TEXT NOT NULL,
        completed_at TEXT,
        last_retry_at TEXT,
        mapping_name TEXT
      )
    `);

    // Add columns if they don't exist (for migration)
    try {
      this.db.exec(`ALTER TABLE jobs ADD COLUMN mapping_name TEXT`);
    } catch (error) {
      // Column already exists, ignore
    }
    
    try {
      this.db.exec(`ALTER TABLE jobs ADD COLUMN dest_method_signature TEXT`);
    } catch (error) {
      // Column already exists, ignore
    }

    // Chain state table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS chain_state (
        chain_name TEXT PRIMARY KEY,
        last_processed_block INTEGER NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    // Performance indexes
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
      CREATE INDEX IF NOT EXISTS idx_jobs_created ON jobs(created_at);
      CREATE INDEX IF NOT EXISTS idx_jobs_chain ON jobs(source_chain);
      CREATE INDEX IF NOT EXISTS idx_jobs_unique ON jobs(unique_id);
      CREATE INDEX IF NOT EXISTS idx_jobs_mapping ON jobs(mapping_name);
      CREATE INDEX IF NOT EXISTS idx_jobs_dest_chain ON jobs(dest_chain);
    `);

    logger.info('Database initialized successfully');
  }

  // Job operations
  createJob(job: Omit<Job, 'id'>): number {
    const stmt = this.db.prepare(`
      INSERT INTO jobs (
        unique_id, source_chain, source_tx_hash, source_block_number,
        dest_chain, dest_address, dest_method, dest_method_signature, event_data, status,
        proof_required, retry_count, created_at, mapping_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      job.unique_id,
      job.source_chain,
      job.source_tx_hash,
      job.source_block_number,
      job.dest_chain,
      job.dest_address,
      job.dest_method,
      job.dest_method_signature,
      job.event_data,
      job.status,
      job.proof_required ? 1 : 0,
      job.retry_count,
      job.created_at,
      job.mapping_name
    );

    return result.lastInsertRowid as number;
  }

  updateJobStatus(jobId: number, status: JobStatus, additionalData?: Partial<Job>) {
    let query = 'UPDATE jobs SET status = ?, last_retry_at = ?';
    const params: any[] = [status, new Date().toISOString()];

    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        if (key !== 'id' && value !== undefined) {
          query += `, ${key} = ?`;
          params.push(value);
        }
      });
    }

    if (status === 'completed') {
      query += ', completed_at = ?';
      params.push(new Date().toISOString());
    }

    query += ' WHERE id = ?';
    params.push(jobId);

    const stmt = this.db.prepare(query);
    stmt.run(...params);
  }

  getJobByUniqueId(uniqueId: string): Job | null {
    const stmt = this.db.prepare('SELECT * FROM jobs WHERE unique_id = ?');
    const result = stmt.get(uniqueId) as Job | undefined;
    return result || null;
  }

  getJobsByStatus(status: JobStatus): Job[] {
    const stmt = this.db.prepare('SELECT * FROM jobs WHERE status = ? ORDER BY created_at ASC');
    return stmt.all(status) as Job[];
  }

  getJobsByMapping(mappingName: string): Job[] {
    const stmt = this.db.prepare('SELECT * FROM jobs WHERE mapping_name = ? ORDER BY created_at DESC');
    return stmt.all(mappingName) as Job[];
  }

  getJobsByChain(chainName: string, isSource: boolean = true): Job[] {
    const column = isSource ? 'source_chain' : 'dest_chain';
    const stmt = this.db.prepare(`SELECT * FROM jobs WHERE ${column} = ? ORDER BY created_at DESC`);
    return stmt.all(chainName) as Job[];
  }

  getPendingJobs(): Job[] {
    const stmt = this.db.prepare(`
      SELECT * FROM jobs 
      WHERE status IN ('pending', 'proof_requested', 'proof_ready') 
      ORDER BY created_at ASC
    `);
    return stmt.all() as Job[];
  }

  getFailedJobs(maxRetries: number = 3): Job[] {
    const stmt = this.db.prepare(`
      SELECT * FROM jobs 
      WHERE status = 'failed' AND retry_count < ?
      ORDER BY last_retry_at ASC
    `);
    return stmt.all(maxRetries) as Job[];
  }

  incrementRetryCount(jobId: number) {
    const stmt = this.db.prepare(`
      UPDATE jobs 
      SET retry_count = retry_count + 1, last_retry_at = ?
      WHERE id = ?
    `);
    stmt.run(new Date().toISOString(), jobId);
  }

  // Chain state operations
  getLastProcessedBlock(chainName: string): number {
    const stmt = this.db.prepare('SELECT last_processed_block FROM chain_state WHERE chain_name = ?');
    const result = stmt.get(chainName) as { last_processed_block: number } | undefined;
    return result?.last_processed_block || 0;
  }

  updateLastProcessedBlock(chainName: string, blockNumber: number) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO chain_state (chain_name, last_processed_block, updated_at)
      VALUES (?, ?, ?)
    `);
    stmt.run(chainName, blockNumber, new Date().toISOString());
  }

  // Statistics
  getJobStats(): Record<string, number> {
    const stmt = this.db.prepare(`
      SELECT status, COUNT(*) as count 
      FROM jobs 
      GROUP BY status
    `);
    const results = stmt.all() as Array<{ status: string; count: number }>;
    
    const stats: Record<string, number> = {};
    results.forEach(({ status, count }) => {
      stats[status] = count;
    });
    
    return stats;
  }

  getMappingStats(): Record<string, number> {
    const stmt = this.db.prepare(`
      SELECT mapping_name, COUNT(*) as count 
      FROM jobs 
      WHERE mapping_name IS NOT NULL
      GROUP BY mapping_name
    `);
    const results = stmt.all() as Array<{ mapping_name: string; count: number }>;
    
    const stats: Record<string, number> = {};
    results.forEach(({ mapping_name, count }) => {
      stats[mapping_name] = count;
    });
    
    return stats;
  }

  getChainStats(): Record<string, { source: number; destination: number }> {
    const sourceStmt = this.db.prepare(`
      SELECT source_chain, COUNT(*) as count 
      FROM jobs 
      GROUP BY source_chain
    `);
    const destStmt = this.db.prepare(`
      SELECT dest_chain, COUNT(*) as count 
      FROM jobs 
      GROUP BY dest_chain
    `);
    
    const sourceResults = sourceStmt.all() as Array<{ source_chain: string; count: number }>;
    const destResults = destStmt.all() as Array<{ dest_chain: string; count: number }>;
    
    const stats: Record<string, { source: number; destination: number }> = {};
    
    sourceResults.forEach(({ source_chain, count }) => {
      if (!stats[source_chain]) stats[source_chain] = { source: 0, destination: 0 };
      stats[source_chain].source = count;
    });
    
    destResults.forEach(({ dest_chain, count }) => {
      if (!stats[dest_chain]) stats[dest_chain] = { source: 0, destination: 0 };
      stats[dest_chain].destination = count;
    });
    
    return stats;
  }

  cleanup(olderThanDays: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    
    const stmt = this.db.prepare(`
      DELETE FROM jobs 
      WHERE status = 'completed' 
      AND completed_at < ?
    `);
    
    const result = stmt.run(cutoffDate.toISOString());
    logger.info(`Cleaned up ${result.changes} completed jobs older than ${olderThanDays} days`);
  }

  clearJobs() {
    try {
      this.db.exec('DELETE FROM jobs');
      this.db.exec('DELETE FROM sqlite_sequence WHERE name=\'jobs\''); // Reset autoincrement
      logger.info('All jobs cleared from the database.');
    } catch (error) {
      logger.error('Failed to clear jobs table', { error });
    }
  }

  close() {
    this.db.close();
    logger.info('Database connection closed.');
  }
} 