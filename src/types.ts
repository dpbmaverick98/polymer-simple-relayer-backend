export interface Job {
  id: number;
  unique_id: string;
  source_chain: string;
  source_tx_hash: string;
  source_block_number: number;
  dest_chain: string;
  dest_address: string;
  dest_method: string;
  dest_method_signature?: string;
  event_data: string;
  proof_data?: string;
  status: 'pending' | 'proof_requested' | 'proof_ready' | 'executing' | 'completed' | 'failed';
  proof_required: boolean;
  dest_tx_hash?: string;
  retry_count: number;
  error_message?: string;
  created_at: string;
  completed_at?: string;
  last_retry_at?: string;
  mapping_name?: string;
}

export interface ChainState {
  chain_name: string;
  last_processed_block: number;
  updated_at: string;
}

export interface DatabaseStats {
  jobStats: Record<string, number>;
  mappingStats: Record<string, number>;
  chainStats: Record<string, { source: number; destination: number }>;
  totalJobs: number;
  recentJobs: number;
}