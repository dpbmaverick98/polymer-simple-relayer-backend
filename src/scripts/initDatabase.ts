#!/usr/bin/env bun

import { Database } from 'bun:sqlite';

const config = {
  database: {
    path: './relayer.db'
  }
};

console.log('Initializing database...');

const db = new Database(config.database.path);

// Jobs table
db.exec(`
  CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    unique_id TEXT UNIQUE NOT NULL,
    source_chain TEXT NOT NULL,
    source_tx_hash TEXT NOT NULL,
    source_block_number INTEGER NOT NULL,
    dest_chain TEXT NOT NULL,
    dest_address TEXT NOT NULL,
    dest_method TEXT NOT NULL,
    event_data TEXT NOT NULL,
    proof_data TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    proof_required BOOLEAN DEFAULT 0,
    dest_tx_hash TEXT,
    retry_count INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TEXT NOT NULL,
    completed_at TEXT,
    last_retry_at TEXT
  )
`);

// Chain state table
db.exec(`
  CREATE TABLE IF NOT EXISTS chain_state (
    chain_name TEXT PRIMARY KEY,
    last_processed_block INTEGER NOT NULL,
    updated_at TEXT NOT NULL
  )
`);

// Performance indexes
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
  CREATE INDEX IF NOT EXISTS idx_jobs_created ON jobs(created_at);
  CREATE INDEX IF NOT EXISTS idx_jobs_chain ON jobs(source_chain);
  CREATE INDEX IF NOT EXISTS idx_jobs_unique ON jobs(unique_id);
`);

console.log('✅ Database initialized successfully');
console.log(`Database path: ${config.database.path}`);

db.close(); 