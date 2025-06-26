import React from 'react';
import { X, ExternalLink, Copy, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { Job } from '../types';

interface JobDetailsProps {
  job: Job;
  onClose: () => void;
}

const JobDetails: React.FC<JobDetailsProps> = ({ job, onClose }) => {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status: Job['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50';
      case 'failed':
        return 'text-red-600 bg-red-50';
      case 'executing':
        return 'text-purple-600 bg-purple-50';
      case 'pending':
      case 'proof_requested':
      case 'proof_ready':
        return 'text-yellow-600 bg-yellow-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: Job['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5" />;
      case 'failed':
        return <XCircle className="h-5 w-5" />;
      case 'executing':
        return <Clock className="h-5 w-5" />;
      default:
        return <AlertCircle className="h-5 w-5" />;
    }
  };

  let eventData;
  try {
    eventData = JSON.parse(job.event_data);
  } catch {
    eventData = job.event_data;
  }

  let proofData;
  try {
    proofData = job.proof_data ? JSON.parse(job.proof_data) : null;
  } catch {
    proofData = job.proof_data;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${getStatusColor(job.status)}`}>
              {getStatusIcon(job.status)}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Job #{job.id} - {job.mapping_name || 'Unknown Mapping'}
              </h2>
              <p className="text-sm text-gray-500">
                {job.source_chain} → {job.dest_chain}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status and Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(job.status)}`}>
                  {getStatusIcon(job.status)}
                  <span>{job.status.replace('_', ' ')}</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Created</label>
                <p className="text-sm text-gray-900">{formatDate(job.created_at)}</p>
              </div>
              
              {job.completed_at && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Completed</label>
                  <p className="text-sm text-gray-900">{formatDate(job.completed_at)}</p>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Retry Count</label>
                <p className="text-sm text-gray-900">{job.retry_count}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Proof Required</label>
                <p className="text-sm text-gray-900">{job.proof_required ? 'Yes' : 'No'}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Destination Method</label>
                <p className="text-sm text-gray-900 font-mono">{job.dest_method}</p>
              </div>
              
              {job.dest_method_signature && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Method Signature</label>
                  <p className="text-sm text-gray-900 font-mono break-all">{job.dest_method_signature}</p>
                </div>
              )}
            </div>
          </div>

          {/* Transaction Hashes */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Transaction Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Source Transaction</label>
                <div className="flex items-center space-x-2">
                  <p className="text-sm text-gray-900 font-mono break-all">{job.source_tx_hash}</p>
                  <button
                    onClick={() => copyToClipboard(job.source_tx_hash)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Block #{job.source_block_number}</p>
              </div>
              
              {job.dest_tx_hash && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Destination Transaction</label>
                  <div className="flex items-center space-x-2">
                    <p className="text-sm text-gray-900 font-mono break-all">{job.dest_tx_hash}</p>
                    <button
                      onClick={() => copyToClipboard(job.dest_tx_hash!)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Destination Address</label>
              <div className="flex items-center space-x-2">
                <p className="text-sm text-gray-900 font-mono break-all">{job.dest_address}</p>
                <button
                  onClick={() => copyToClipboard(job.dest_address)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {job.error_message && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Error Message</label>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800">{job.error_message}</p>
              </div>
            </div>
          )}

          {/* Event Data */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Event Data</label>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <pre className="text-xs text-gray-800 whitespace-pre-wrap overflow-x-auto">
                {typeof eventData === 'object' ? JSON.stringify(eventData, null, 2) : eventData}
              </pre>
            </div>
          </div>

          {/* Proof Data */}
          {proofData && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Proof Data</label>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <pre className="text-xs text-gray-800 whitespace-pre-wrap overflow-x-auto">
                  {typeof proofData === 'object' ? JSON.stringify(proofData, null, 2) : proofData}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobDetails;