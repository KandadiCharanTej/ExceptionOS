import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Database, Folder, Activity, UploadCloud, Search, Filter, Trash2, LineChart } from 'lucide-react';
import { getDatasets } from '../services/api';
import type { Dataset } from '../types/api';
import { Card, CardContent, Badge } from '../components/ui';

export default function Datasets() {
  const navigate = useNavigate();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchDatasets() {
      try {
        const res = await getDatasets();
        setDatasets(res.datasets);
      } catch (err: any) {
        setError(err.message || 'Failed to load datasets');
      } finally {
        setLoading(false);
      }
    }
    fetchDatasets();
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white mb-1">Datasets</h2>
          <p className="text-slate-400">Manage historical reconciliation runs and active datasets.</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search datasets..." 
              className="bg-[#0A0F1C] border border-[#1E293B] text-slate-200 text-sm rounded-md pl-9 pr-4 py-2 w-64 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            />
          </div>
          <button className="flex items-center px-4 py-2 bg-[#0A0F1C] border border-[#1E293B] rounded-md text-sm font-medium text-slate-300 hover:bg-[#1E293B] transition-colors">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 text-red-400 p-4 rounded-md border border-red-500/20 font-medium">
          {error}
        </div>
      )}

      <Card className="bg-[#0A0F1C] border-[#1E293B] overflow-hidden shadow-lg shadow-black/20">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Activity className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : datasets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-[#1E293B] m-6 rounded-xl bg-slate-900/30">
              <Database className="h-10 w-10 text-slate-600 mb-4" />
              <h3 className="text-lg font-medium text-white">No Datasets Found</h3>
              <p className="text-slate-400 max-w-sm text-center mt-2">
                Run a reconciliation pipeline from the dashboard to create a dataset.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-slate-300">
                <thead className="text-xs text-slate-400 uppercase bg-[#1E293B]/50 border-b border-[#1E293B]">
                  <tr>
                    <th className="px-6 py-4 font-semibold tracking-wider">Dataset Name</th>
                    <th className="px-6 py-4 font-semibold tracking-wider">Source</th>
                    <th className="px-6 py-4 font-semibold tracking-wider text-right">Total Cases</th>
                    <th className="px-6 py-4 font-semibold tracking-wider text-right">Exceptions</th>
                    <th className="px-6 py-4 font-semibold tracking-wider">Status</th>
                    <th className="px-6 py-4 font-semibold tracking-wider">Created At</th>
                    <th className="px-6 py-4 font-semibold tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E293B]">
                  {datasets.map((dataset) => (
                    <tr key={dataset.id} className="hover:bg-[#1E293B]/30 transition-colors group">
                      <td className="px-6 py-4 font-medium text-white flex items-center">
                        <div className="w-8 h-8 rounded bg-blue-900/30 flex items-center justify-center mr-3 text-blue-400">
                          {dataset.source_type === 'UPLOAD' ? <UploadCloud className="w-4 h-4" /> : <Folder className="w-4 h-4" />}
                        </div>
                        {dataset.name}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="secondary">{dataset.source_type}</Badge>
                      </td>
                      <td className="px-6 py-4 text-right text-slate-300 font-medium">
                        {dataset.total_cases}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="inline-flex items-center text-red-400 font-medium">
                          {dataset.exception_count}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={dataset.status === 'COMPLETED' ? 'success' : 'warning'}>
                          {dataset.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-slate-400">
                        {new Date(dataset.created_at).toLocaleString(undefined, {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => navigate(`/cases?dataset_id=${dataset.id}`)}
                            className="p-1.5 text-blue-400 hover:text-white hover:bg-blue-600 rounded transition-colors"
                            title="View Cases"
                          >
                            <Search className="w-4 h-4" />
                          </button>
                          <button 
                            className="p-1.5 text-indigo-400 hover:text-white hover:bg-indigo-600 rounded transition-colors"
                            title="View Analytics"
                          >
                            <LineChart className="w-4 h-4" />
                          </button>
                          <button 
                            className="p-1.5 text-slate-500 hover:text-white hover:bg-red-600 rounded transition-colors"
                            title="Delete Dataset"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
