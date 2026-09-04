import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, ChevronRight, FileText, ArrowUpDown, Trash2, Download, CheckSquare, Square, Activity, Filter, ChevronLeft, ChevronDown, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { getCases, bulkDeleteCases, exportCases } from '../services/api';
import type { CaseSummarySchema } from '../types/api';
import { Card, CardContent, Badge, StatusBadge } from '../components/ui';
import { cn } from '../App';

export default function Cases() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // State from URL
  const datasetId = searchParams.get('dataset_id') || undefined;
  
  // Local state for UI controls
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [searchQuery, setSearchQuery] = useState('');
  const [classification, setClassification] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('confidence_score');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  const [selectedCases, setSelectedCases] = useState<Set<string>>(new Set());

  // Fetch Cases
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['cases', { page, limit, datasetId, searchQuery, classification, status, sortBy, sortOrder }],
    queryFn: () => getCases(page, limit, classification || undefined, datasetId, searchQuery || undefined, status || undefined, sortBy, sortOrder),
  });

  // Bulk Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (caseIds: string[]) => bulkDeleteCases(caseIds, datasetId),
    onSuccess: (res) => {
      toast.success(res.message || 'Cases deleted successfully');
      setSelectedCases(new Set());
      queryClient.invalidateQueries({ queryKey: ['cases'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to delete cases');
    }
  });

  const handleSelectAll = () => {
    if (data && selectedCases.size === data.items.length) {
      setSelectedCases(new Set());
    } else if (data) {
      setSelectedCases(new Set(data.items.map(c => c.case_id)));
    }
  };

  const toggleSelection = (caseId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSet = new Set(selectedCases);
    if (newSet.has(caseId)) {
      newSet.delete(caseId);
    } else {
      newSet.add(caseId);
    }
    setSelectedCases(newSet);
  };

  const handleBulkDelete = () => {
    if (selectedCases.size === 0) return;
    if (window.confirm(`Are you sure you want to delete ${selectedCases.size} selected cases?`)) {
      deleteMutation.mutate(Array.from(selectedCases));
    }
  };

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const toastId = toast.loading(`Exporting as ${format.toUpperCase()}...`);
      const blob = await exportCases(format, datasetId, classification || undefined, searchQuery || undefined);
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `exceptionos_export.${format}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      
      toast.success('Export successful', { id: toastId });
    } catch (err: any) {
      toast.error(err.message || 'Export failed');
    }
  };

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const renderSortIcon = (field: string) => {
    if (sortBy !== field) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-40 group-hover:opacity-100" />;
    return <ChevronDown className={cn("w-3 h-3 ml-1 transition-transform", sortOrder === 'asc' && "rotate-180")} />;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white mb-1">Investigation Queue</h2>
          <p className="text-slate-400">Triage and resolve financial discrepancies.</p>
        </div>
        <div className="flex space-x-3">
          <div className="relative group">
            <button className="flex items-center px-4 py-2 bg-[#0A0F1C] border border-[#1E293B] rounded-md text-sm font-medium text-slate-300 hover:bg-[#1E293B] transition-colors shadow-sm cursor-pointer">
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
            <div className="absolute right-0 mt-1 w-32 bg-[#0A0F1C] border border-[#1E293B] rounded-md shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button onClick={() => handleExport('csv')} className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-[#1E293B] hover:text-white cursor-pointer">CSV Format</button>
              <button onClick={() => handleExport('json')} className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-[#1E293B] hover:text-white cursor-pointer">JSON Format</button>
            </div>
          </div>
        </div>
      </div>

      {isError && (
        <div className="bg-red-500/10 text-red-400 p-4 rounded-md border border-red-500/20 font-medium">
          {(error as Error).message || 'Failed to load cases'}
        </div>
      )}

      <Card className="bg-[#0A0F1C] border-[#1E293B] overflow-hidden shadow-lg shadow-black/20">
        <div className="p-4 border-b border-[#1E293B] flex flex-wrap items-center justify-between gap-4 bg-[#0A0F1C]">
          <div className="flex flex-1 gap-3 max-w-3xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input 
                type="text" 
                placeholder="Search by ID or RCA..." 
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                className="w-full pl-9 pr-4 py-2 bg-[#05080F] border border-[#1E293B] text-slate-200 rounded-md text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              />
            </div>
            
            <select 
              value={classification}
              onChange={(e) => { setClassification(e.target.value); setPage(1); }}
              className="bg-[#05080F] border border-[#1E293B] text-slate-200 rounded-md text-sm px-3 py-2 focus:outline-none focus:border-blue-500"
            >
              <option value="">All Classifications</option>
              <option value="matched">Matched</option>
              <option value="missing_in_ledger">Missing in Ledger</option>
              <option value="missing_in_gateway">Missing in Gateway</option>
              <option value="missing_in_bank">Missing in Bank</option>
              <option value="amount_mismatch">Amount Mismatch</option>
              <option value="date_mismatch">Date Mismatch</option>
              <option value="duplicate_detected">Duplicate</option>
              <option value="system_error">System Error</option>
            </select>
            
            <select 
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="bg-[#05080F] border border-[#1E293B] text-slate-200 rounded-md text-sm px-3 py-2 focus:outline-none focus:border-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="OPEN">Open</option>
              <option value="RECORDED">Recorded</option>
              <option value="RESOLVED">Resolved</option>
              <option value="VERIFIED">Verified</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-4 text-sm text-slate-400">
            {datasetId && (
              <span className="px-3 py-1 bg-blue-900/20 text-blue-400 border border-blue-900/30 rounded-full flex items-center">
                <Filter className="w-3 h-3 mr-1" />
                Dataset Filtered
                <button 
                  onClick={() => { searchParams.delete('dataset_id'); setSearchParams(searchParams); }}
                  className="ml-2 hover:text-blue-300"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedCases.size > 0 && (
              <button 
                onClick={handleBulkDelete}
                className="px-3 py-1.5 bg-red-600/10 text-red-500 hover:bg-red-600/20 border border-red-900/50 rounded-md flex items-center transition-colors cursor-pointer"
              >
                {deleteMutation.isPending ? <Activity className="w-3 h-3 mr-1 animate-spin" /> : <Trash2 className="w-3 h-3 mr-1" />}
                Delete {selectedCases.size}
              </button>
            )}
          </div>
        </div>
        
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
              <Activity className="h-8 w-8 animate-spin text-blue-500" />
              <p className="text-slate-400 text-sm">Loading investigation queue...</p>
            </div>
          ) : (!data?.items || data.items.length === 0) ? (
            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-[#1E293B] m-6 rounded-xl bg-slate-900/30">
              <FileText className="h-10 w-10 text-slate-600 mb-4" />
              <h3 className="text-lg font-medium text-white">No Cases Found</h3>
              <p className="text-slate-400 max-w-sm text-center mt-2">
                There are no open exceptions matching your criteria.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-slate-300">
                <thead className="text-xs text-slate-400 uppercase bg-[#1E293B]/50 border-b border-[#1E293B]">
                  <tr>
                    <th className="px-4 py-4 w-10">
                      <button onClick={handleSelectAll} className="text-slate-400 hover:text-blue-400 focus:outline-none cursor-pointer">
                        {selectedCases.size > 0 && selectedCases.size === data.items.length ? (
                          <CheckSquare className="w-4 h-4 text-blue-500" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </th>
                    <th className="px-4 py-4 font-semibold tracking-wider cursor-pointer hover:text-white flex items-center select-none group" onClick={() => toggleSort('case_id')}>
                      Case ID {renderSortIcon('case_id')}
                    </th>
                    <th className="px-4 py-4 font-semibold tracking-wider cursor-pointer hover:text-white select-none group" onClick={() => toggleSort('classification')}>
                      <div className="flex items-center">Classification {renderSortIcon('classification')}</div>
                    </th>
                    <th className="px-4 py-4 font-semibold tracking-wider">Root Cause Analysis</th>
                    <th className="px-4 py-4 font-semibold tracking-wider cursor-pointer hover:text-white select-none group" onClick={() => toggleSort('confidence_score')}>
                      <div className="flex items-center">Confidence {renderSortIcon('confidence_score')}</div>
                    </th>
                    <th className="px-4 py-4 font-semibold tracking-wider cursor-pointer hover:text-white select-none group" onClick={() => toggleSort('status')}>
                      <div className="flex items-center">Status {renderSortIcon('status')}</div>
                    </th>
                    <th className="px-4 py-4 font-semibold tracking-wider text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E293B]">
                  {data.items.map((c: CaseSummarySchema) => (
                    <tr 
                      key={c.case_id} 
                      className={cn(
                        "transition-colors group cursor-pointer",
                        selectedCases.has(c.case_id) ? "bg-blue-900/10" : "hover:bg-[#1E293B]/30"
                      )} 
                      onClick={() => navigate(`/cases/${c.case_id}${datasetId ? `?dataset_id=${datasetId}` : ''}`)}
                    >
                      <td className="px-4 py-4">
                        <button onClick={(e) => toggleSelection(c.case_id, e)} className="text-slate-500 hover:text-blue-400 focus:outline-none cursor-pointer">
                          {selectedCases.has(c.case_id) ? (
                            <CheckSquare className="w-4 h-4 text-blue-500" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-4 font-mono font-medium text-slate-200">{c.case_id}</td>
                      <td className="px-4 py-4">
                        <Badge variant="outline" className="border-slate-700 bg-slate-900/50">
                          {c.classification.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-slate-400">
                        {c.root_cause ? c.root_cause.replace(/_/g, ' ') : 'Pending Analysis'}
                      </td>
                      <td className="px-4 py-4">
                        {c.confidence_score !== null ? (
                          <div className="flex items-center space-x-3 w-32">
                            <div className="flex-1 h-1.5 bg-[#1E293B] rounded-full overflow-hidden">
                              <div 
                                className={cn(
                                  "h-full shadow-[0_0_8px_rgba(59,130,246,0.6)]",
                                  c.confidence_score > 90 ? "bg-emerald-500" : c.confidence_score > 70 ? "bg-blue-500" : "bg-amber-500"
                                )} 
                                style={{ width: `${c.confidence_score}%` }}
                              />
                            </div>
                            <span className="text-xs font-mono font-medium text-slate-400">{c.confidence_score}%</span>
                          </div>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/cases/${c.case_id}${datasetId ? `?dataset_id=${datasetId}` : ''}`);
                          }}
                          className="inline-flex items-center justify-center rounded-md text-xs font-bold transition-all hover:bg-blue-600 hover:shadow-[0_0_10px_rgba(37,99,235,0.4)] text-blue-400 hover:text-white h-8 px-3 opacity-0 group-hover:opacity-100 cursor-pointer"
                        >
                          Investigate
                          <ChevronRight className="ml-1 h-3 w-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
        
        {/* Pagination Footer */}
        {data && data.total_pages > 1 && (
          <div className="border-t border-[#1E293B] bg-[#0A0F1C] px-6 py-4 flex items-center justify-between">
            <div className="text-sm text-slate-400">
              Showing <span className="font-medium text-white">{((page - 1) * limit) + 1}</span> to <span className="font-medium text-white">{Math.min(page * limit, data.total)}</span> of <span className="font-medium text-white">{data.total}</span> results
            </div>
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || isLoading}
                className="px-3 py-1.5 border border-[#1E293B] rounded-md text-sm text-slate-300 hover:bg-[#1E293B] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center"
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Prev
              </button>
              <div className="text-sm text-slate-400 font-medium px-2">
                Page {page} of {data.total_pages}
              </div>
              <button 
                onClick={() => setPage(p => Math.min(data.total_pages, p + 1))}
                disabled={page === data.total_pages || isLoading}
                className="px-3 py-1.5 border border-[#1E293B] rounded-md text-sm text-slate-300 hover:bg-[#1E293B] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center"
              >
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
