import React from 'react';
import { Loader, Link } from 'lucide-react';
import { ChainState } from '../types';

interface ChainStateTableProps {
  chainStates: ChainState[];
  loading: boolean;
}

const ChainStateTable: React.FC<ChainStateTableProps> = ({ chainStates, loading }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="card">
        <div className="flex items-center justify-center py-12">
          <Loader className="h-8 w-8 animate-spin text-primary-600" />
          <span className="ml-2 text-gray-600">Loading chain states...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center">
          <Link className="h-5 w-5 mr-2" />
          Chain States ({chainStates.length})
        </h2>
      </div>

      {chainStates.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-2">No chain states found</div>
          <p className="text-sm text-gray-500">Chain states will appear here when the relayer starts monitoring chains</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Chain Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Processed Block
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Updated
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {chainStates.map((chainState) => (
                <tr key={chainState.chain_name} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-3 w-3 bg-green-400 rounded-full mr-3"></div>
                      <div className="text-sm font-medium text-gray-900">
                        {chainState.chain_name}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 font-mono">
                      #{chainState.last_processed_block.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(chainState.updated_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ChainStateTable;