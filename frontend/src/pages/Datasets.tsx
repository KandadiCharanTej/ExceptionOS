import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Database, Folder, Activity, UploadCloud, Search, Filter, Trash2, LineChart, AlertTriangle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { getDatasets, deleteDataset } from '../services/api';
import { Card, CardContent, Badge } from '../components/ui';

export default function Datasets() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal State
  const [datasetToDelete, setDatasetToDelete] = useState<{id: string, name: string} | null>(null);

  const { data: datasetsData, isLoading, isError, error } = useQuery({
    queryKey: ['datasets'],
    queryFn: getDatasets,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDataset,
    onSuccess: () => {
      toast.success('Dataset and associated cases deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
      setDatasetToDelete(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete dataset');
      setDatasetToDelete(null);
    }
  });

  const confirmDelete = (id: string, name: string) => {
    setDatasetToDelete({ id, name });
  };

  const executeDelete = () => {
    if (datasetToDelete) {
      deleteMutation.mutate(datasetToDelete.id);
    }
  };

  const datasets = datasetsData?.datasets || [];
  const filteredDatasets = datasets.filter(ds => 
    ds.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    ds.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Delete Confirmation Modal */}
      {datasetToDelete && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[#0A0F1C] border border-red-900/50 rounded-lg max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center text-red-500 mb-4">
              <AlertTriangle className="h-6 w-6 mr-3" />
              <h3 className="text-lg font-bold text-white">Delete Dataset?</h3>
            </div>
            <p className="text-slate-300 mb-6">
              Are you sure you want to delete <span className="font-semibold text-white">"{datasetToDelete.name}"</span>? 
              This will permanently delete all associated cases, events, and resolutions. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setDatasetToDelete(null)}
                className="px-4 py-2 bg-[#1E293B] text-slate-300 rounded-md hover:bg-slate-700 transition-colors cursor-pointer"
                disabled={deleteMutation.isPending}
              >
                Cancel
              </button>
              <button 
                onClick={executeDelete}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center cursor-pointer"
              >
                {deleteMutation.isPending ? <Activity className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

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
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#0A0F1C] border border-[#1E293B] text-slate-200 text-sm rounded-md pl-9 pr-4 py-2 w-64 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            />
          </div>
          <button className="flex items-center px-4 py-2 bg-[#0A0F1C] border border-[#1E293B] rounded-md text-sm font-medium text-slate-300 hover:bg-[#1E293B] transition-colors cursor-pointer">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </button>
        </div>
      </div>

      {isError && (
        <div className="bg-red-500/10 text-red-400 p-4 rounded-md border border-red-500/20 font-medium">
          {(error as Error).message || 'Failed to load datasets'}
        </div>
      )}

      <Card className="bg-[#0A0F1C] border-[#1E293B] overflow-hidden shadow-lg shadow-black/20">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Activity className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : filteredDatasets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-[#1E293B] m-6 rounded-xl bg-slate-900/30">
              <Database className="h-10 w-10 text-slate-600 mb-4" />
              <h3 className="text-lg font-medium text-white">No Datasets Found</h3>
              <p className="text-slate-400 max-w-sm text-center mt-2">
                {searchQuery ? "No datasets match your search criteria." : "Run a reconciliation pipeline from the dashboard to create a dataset."}
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
                  {filteredDatasets.map((dataset) => (
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
                            className="p-1.5 text-blue-400 hover:text-white hover:bg-blue-600 rounded transition-colors cursor-pointer"
                            title="View Cases"
                          >
                            <Search className="w-4 h-4" />
                          </button>
                          <button 
                            className="p-1.5 text-indigo-400 hover:text-white hover:bg-indigo-600 rounded transition-colors cursor-pointer"
                            title="View Analytics"
                          >
                            <LineChart className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => confirmDelete(dataset.id, dataset.name)}
                            className="p-1.5 text-slate-500 hover:text-white hover:bg-red-600 rounded transition-colors cursor-pointer"
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
