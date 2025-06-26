import React, { useState, useEffect } from 'react';
import { Database, Activity, BarChart3, Settings, RefreshCw, Search, Filter } from 'lucide-react';
import JobsTable from './components/JobsTable';
import StatsCards from './components/StatsCards';
import ChainStateTable from './components/ChainStateTable';
import JobDetails from './components/JobDetails';
import { Job, ChainState, DatabaseStats } from './types';

function App() {
  const [activeTab, setActiveTab] = useState<'jobs' | 'chains' | 'stats'>('jobs');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [chainStates, setChainStates] = useState<ChainState[]>([]);
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [chainFilter, setChainFilter] = useState<string>('all');

  const fetchData = async (isInitialLoad = false) => {
    if (isInitialLoad) {
      setLoading(true);
    }
    try {
      const [jobsRes, chainsRes, statsRes] = await Promise.all([
        fetch('/api/jobs'),
        fetch('/api/chain-states'),
        fetch('/api/stats')
      ]);

      if (jobsRes.ok) setJobs(await jobsRes.json());
      if (chainsRes.ok) setChainStates(await chainsRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchData(true); // Initial fetch with loader
    const interval = setInterval(() => fetchData(false), 5000); // Subsequent fetches without loader
    return () => clearInterval(interval);
  }, []);

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = searchTerm === '' || 
      job.source_tx_hash.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.dest_tx_hash?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.mapping_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
    const matchesChain = chainFilter === 'all' || 
      job.source_chain === chainFilter || 
      job.dest_chain === chainFilter;

    return matchesSearch && matchesStatus && matchesChain;
  });

  const uniqueStatuses = [...new Set(jobs.map(job => job.status))];
  const uniqueChains = [...new Set([...jobs.map(job => job.source_chain), ...jobs.map(job => job.dest_chain)])];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Database className="h-8 w-8 text-primary-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Polymer Relayer Database</h1>
                <p className="text-sm text-gray-500">SQLite Database Management Interface</p>
              </div>
            </div>
            <button
              onClick={() => fetchData(true)}
              disabled={loading}
              className="btn-secondary flex items-center space-x-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {[
              { id: 'jobs', label: 'Jobs', icon: Activity },
              { id: 'chains', label: 'Chain States', icon: Settings },
              { id: 'stats', label: 'Statistics', icon: BarChart3 }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                  activeTab === id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'jobs' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="card">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex-1 min-w-64">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by transaction hash or mapping name..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Filter className="h-4 w-4 text-gray-400" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="all">All Statuses</option>
                    {uniqueStatuses.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                  
                  <select
                    value={chainFilter}
                    onChange={(e) => setChainFilter(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="all">All Chains</option>
                    {uniqueChains.map(chain => (
                      <option key={chain} value={chain}>{chain}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <JobsTable 
              jobs={filteredJobs} 
              loading={loading}
              onJobSelect={setSelectedJob}
            />
          </div>
        )}

        {activeTab === 'chains' && (
          <ChainStateTable chainStates={chainStates} loading={loading} />
        )}

        {activeTab === 'stats' && (
          <StatsCards stats={stats} loading={loading} />
        )}
      </main>

      {/* Job Details Modal */}
      {selectedJob && (
        <JobDetails 
          job={selectedJob} 
          onClose={() => setSelectedJob(null)} 
        />
      )}
    </div>
  );
}

export default App;