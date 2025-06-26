import React from 'react';
import { BarChart3, Activity, Clock, CheckCircle, XCircle, Loader } from 'lucide-react';
import { DatabaseStats } from '../types';

interface StatsCardsProps {
  stats: DatabaseStats | null;
  loading: boolean;
}

const StatsCards: React.FC<StatsCardsProps> = ({ stats, loading }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="h-8 w-8 animate-spin text-primary-600" />
        <span className="ml-2 text-gray-600">Loading statistics...</span>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-2">No statistics available</div>
      </div>
    );
  }

  const statusCards = [
    { 
      title: 'Total Jobs', 
      value: stats.totalJobs, 
      icon: Activity, 
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    { 
      title: 'Completed', 
      value: stats.jobStats.completed || 0, 
      icon: CheckCircle, 
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    { 
      title: 'Failed', 
      value: stats.jobStats.failed || 0, 
      icon: XCircle, 
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    },
    { 
      title: 'Pending', 
      value: (stats.jobStats.pending || 0) + (stats.jobStats.proof_requested || 0) + (stats.jobStats.proof_ready || 0), 
      icon: Clock, 
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statusCards.map((card) => (
          <div key={card.title} className="card">
            <div className="flex items-center">
              <div className={`p-3 rounded-lg ${card.bgColor}`}>
                <card.icon className={`h-6 w-6 ${card.color}`} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">{card.title}</p>
                <p className="text-2xl font-semibold text-gray-900">{card.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Detailed Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Job Status Breakdown */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Job Status Breakdown
          </h3>
          <div className="space-y-3">
            {Object.entries(stats.jobStats).map(([status, count]) => (
              <div key={status} className="flex justify-between items-center">
                <span className="text-sm text-gray-600 capitalize">
                  {status.replace('_', ' ')}
                </span>
                <div className="flex items-center space-x-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-primary-600 h-2 rounded-full" 
                      style={{ width: `${(count / stats.totalJobs) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-8 text-right">
                    {count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mapping Statistics */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Event Mapping Statistics
          </h3>
          <div className="space-y-3">
            {Object.entries(stats.mappingStats).map(([mapping, count]) => (
              <div key={mapping} className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{mapping}</span>
                <span className="text-sm font-medium text-gray-900">{count}</span>
              </div>
            ))}
            {Object.keys(stats.mappingStats).length === 0 && (
              <p className="text-sm text-gray-500">No mapping data available</p>
            )}
          </div>
        </div>

        {/* Chain Statistics */}
        <div className="card lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Chain Activity
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(stats.chainStats).map(([chain, data]) => (
              <div key={chain} className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">{chain}</h4>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Source:</span>
                    <span className="font-medium">{data.source}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Destination:</span>
                    <span className="font-medium">{data.destination}</span>
                  </div>
                </div>
              </div>
            ))}
            {Object.keys(stats.chainStats).length === 0 && (
              <p className="text-sm text-gray-500 col-span-full">No chain data available</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsCards;