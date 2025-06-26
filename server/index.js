import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
let db;
try {
  // Try to connect to the relayer database
  db = new Database(join(__dirname, '../relayer.db'));
  console.log('✅ Connected to SQLite database');
} catch (error) {
  console.error('❌ Failed to connect to database:', error.message);
  console.log('Creating a demo database with sample data...');
  
  // Create a demo database if the real one doesn't exist
  db = new Database(':memory:');
  
  // Create tables
  db.exec(`
    CREATE TABLE jobs (
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
    );
    
    CREATE TABLE chain_state (
      chain_name TEXT PRIMARY KEY,
      last_processed_block INTEGER NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  
  // Insert sample data
  const sampleJobs = [
    {
      unique_id: 'baseSepolia-0x123-1-arbitrumSepolia',
      source_chain: 'baseSepolia',
      source_tx_hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      source_block_number: 1000000,
      dest_chain: 'arbitrumSepolia',
      dest_address: '0xabcdef1234567890abcdef1234567890abcdef12',
      dest_method: 'setValueFromSource',
      dest_method_signature: 'setValueFromSource(string key, bytes value, bytes proof)',
      event_data: JSON.stringify({
        name: 'ValueSet',
        args: { key: 'test-key', value: '0x1234' },
        blockNumber: 1000000
      }),
      status: 'completed',
      proof_required: 1,
      dest_tx_hash: '0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321',
      retry_count: 0,
      created_at: new Date(Date.now() - 3600000).toISOString(),
      completed_at: new Date(Date.now() - 3500000).toISOString(),
      mapping_name: 'ValueSetCrossChain'
    },
    {
      unique_id: 'baseSepolia-0x456-2-arbitrumSepolia',
      source_chain: 'baseSepolia',
      source_tx_hash: '0x456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef012345',
      source_block_number: 1000001,
      dest_chain: 'arbitrumSepolia',
      dest_address: '0xabcdef1234567890abcdef1234567890abcdef12',
      dest_method: 'setValueFromSource',
      dest_method_signature: 'setValueFromSource(string key, bytes value, bytes proof)',
      event_data: JSON.stringify({
        name: 'ValueSet',
        args: { key: 'another-key', value: '0x5678' },
        blockNumber: 1000001
      }),
      status: 'pending',
      proof_required: 1,
      retry_count: 0,
      created_at: new Date(Date.now() - 1800000).toISOString(),
      mapping_name: 'ValueSetCrossChain'
    },
    {
      unique_id: 'baseSepolia-0x789-3-arbitrumSepolia',
      source_chain: 'baseSepolia',
      source_tx_hash: '0x789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
      source_block_number: 1000002,
      dest_chain: 'arbitrumSepolia',
      dest_address: '0xabcdef1234567890abcdef1234567890abcdef12',
      dest_method: 'setValueFromSource',
      dest_method_signature: 'setValueFromSource(string key, bytes value, bytes proof)',
      event_data: JSON.stringify({
        name: 'ValueSet',
        args: { key: 'failed-key', value: '0x9abc' },
        blockNumber: 1000002
      }),
      status: 'failed',
      proof_required: 1,
      retry_count: 2,
      error_message: 'Transaction reverted: insufficient gas',
      created_at: new Date(Date.now() - 900000).toISOString(),
      last_retry_at: new Date(Date.now() - 300000).toISOString(),
      mapping_name: 'ValueSetCrossChain'
    }
  ];
  
  const insertJob = db.prepare(`
    INSERT INTO jobs (
      unique_id, source_chain, source_tx_hash, source_block_number,
      dest_chain, dest_address, dest_method, dest_method_signature, event_data, status,
      proof_required, dest_tx_hash, retry_count, error_message, created_at, completed_at,
      last_retry_at, mapping_name
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  sampleJobs.forEach(job => {
    insertJob.run(
      job.unique_id, job.source_chain, job.source_tx_hash, job.source_block_number,
      job.dest_chain, job.dest_address, job.dest_method, job.dest_method_signature,
      job.event_data, job.status, job.proof_required, job.dest_tx_hash,
      job.retry_count, job.error_message, job.created_at, job.completed_at,
      job.last_retry_at, job.mapping_name
    );
  });
  
  // Insert sample chain states
  const insertChainState = db.prepare(`
    INSERT INTO chain_state (chain_name, last_processed_block, updated_at)
    VALUES (?, ?, ?)
  `);
  
  insertChainState.run('baseSepolia', 1000002, new Date().toISOString());
  insertChainState.run('arbitrumSepolia', 2000500, new Date().toISOString());
  
  console.log('✅ Demo database created with sample data');
}

// API Routes

// Get all jobs
app.get('/api/jobs', (req, res) => {
  try {
    const jobs = db.prepare('SELECT * FROM jobs ORDER BY created_at DESC').all();
    res.json(jobs);
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// Get job by ID
app.get('/api/jobs/:id', (req, res) => {
  try {
    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    res.json(job);
  } catch (error) {
    console.error('Error fetching job:', error);
    res.status(500).json({ error: 'Failed to fetch job' });
  }
});

// Get chain states
app.get('/api/chain-states', (req, res) => {
  try {
    const chainStates = db.prepare('SELECT * FROM chain_state ORDER BY chain_name').all();
    res.json(chainStates);
  } catch (error) {
    console.error('Error fetching chain states:', error);
    res.status(500).json({ error: 'Failed to fetch chain states' });
  }
});

// Get database statistics
app.get('/api/stats', (req, res) => {
  try {
    // Job status statistics
    const jobStats = {};
    const statusCounts = db.prepare(`
      SELECT status, COUNT(*) as count 
      FROM jobs 
      GROUP BY status
    `).all();
    
    statusCounts.forEach(({ status, count }) => {
      jobStats[status] = count;
    });

    // Mapping statistics
    const mappingStats = {};
    const mappingCounts = db.prepare(`
      SELECT mapping_name, COUNT(*) as count 
      FROM jobs 
      WHERE mapping_name IS NOT NULL
      GROUP BY mapping_name
    `).all();
    
    mappingCounts.forEach(({ mapping_name, count }) => {
      mappingStats[mapping_name] = count;
    });

    // Chain statistics
    const chainStats = {};
    const sourceCounts = db.prepare(`
      SELECT source_chain, COUNT(*) as count 
      FROM jobs 
      GROUP BY source_chain
    `).all();
    
    const destCounts = db.prepare(`
      SELECT dest_chain, COUNT(*) as count 
      FROM jobs 
      GROUP BY dest_chain
    `).all();
    
    sourceCounts.forEach(({ source_chain, count }) => {
      if (!chainStats[source_chain]) chainStats[source_chain] = { source: 0, destination: 0 };
      chainStats[source_chain].source = count;
    });
    
    destCounts.forEach(({ dest_chain, count }) => {
      if (!chainStats[dest_chain]) chainStats[dest_chain] = { source: 0, destination: 0 };
      chainStats[dest_chain].destination = count;
    });

    // Total jobs
    const totalJobs = db.prepare('SELECT COUNT(*) as count FROM jobs').get().count;
    
    // Recent jobs (last 24 hours)
    const recentJobs = db.prepare(`
      SELECT COUNT(*) as count 
      FROM jobs 
      WHERE created_at > datetime('now', '-1 day')
    `).get().count;

    res.json({
      jobStats,
      mappingStats,
      chainStats,
      totalJobs,
      recentJobs
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Delete job (for testing)
app.delete('/api/jobs/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM jobs WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }
    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    console.error('Error deleting job:', error);
    res.status(500).json({ error: 'Failed to delete job' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    database: 'connected'
  });
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Database API server running on http://localhost:${port}`);
  console.log(`📊 Access the web UI at http://localhost:3000`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  db.close();
  process.exit(0);
});