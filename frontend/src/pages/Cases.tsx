import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, ChevronRight, FileText, ArrowUpDown, Trash2, Download, CheckSquare, Square, Activity, Filter, ChevronLeft, ChevronDown, X, AlertTriangle, CheckCircle2, Clock, Zap } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { getCases, bulkDeleteCases, exportCases } from '../services/api';
import type { CaseSummarySchema } from '../types/api';
import { Badge, StatusBadge, PriorityBadge, SecondaryButton, LoadingState, ErrorState, EmptyState } from '../components/ui';
import { cn } from '../App';

export default function Cases() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const datasetId = searchParams.get('dataset_id') || undefined;
  
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [searchQuery, setSearchQuery] = useState('');
  const [classification, setClassification] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('confidence_score');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  const [selectedCases, setSelectedCases] = useState<Set<string>>(new Set());

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['cases', { page, limit, datasetId, searchQuery, classification, status, sortBy, sortOrder }],
    queryFn: () => getCases(page, limit, classification || undefined, datasetId, searchQuery || undefined, status || undefined, sortBy, sortOrder),
  });

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

  // Summary stats
  const totalExceptions = data?.items.filter(c => c.classification !== 'matched').length || 0;
  const criticalCount = data?.items.filter(c => (c as any).priority === 'CRITICAL').length || 0;
  const highCount = data?.items.filter(c => (c as any).priority === 'HIGH').length || 0;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* === HEADER === */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-200/60">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-amber-600 mb-1">Operations</p>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Investigation Queue</h1>
          <p className="text-xs text-slate-500 mt-1">Prioritized financial discrepancies requiring analyst attention.</p>
        </div>
        <div className="flex items-center gap-3">
          {selectedCases.size > 0 && (
            <button 
              onClick={handleBulkDelete}
              className="px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-lg text-xs font-semibold flex items-center transition-colors cursor-pointer"
            >
              {deleteMutation.isPending ? <Activity className="w-3 h-3 mr-1.5 animate-spin" /> : <Trash2 className="w-3 h-3 mr-1.5" />}
              Delete {selectedCases.size}
            </button>
          )}
          <div className="relative group">
            <SecondaryButton>
              <Download className="w-4 h-4" />
              Export
            </SecondaryButton>
            <div className="absolute right-0 mt-1 w-36 bg-white border border-slate-200 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 overflow-hidden">
              <button onClick={() => handleExport('csv')} className="w-full text-left px-4 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer">CSV Format</button>
              <button onClick={() => handleExport('json')} className="w-full text-left px-4 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer">JSON Format</button>
            </div>
          </div>
        </div>
      </div>

      {/* === SUMMARY STRIP === */}
      {data && data.items.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          {criticalCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-full">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              <span className="text-xs font-bold text-red-700">{criticalCount} Critical</span>
            </div>
          )}
          {highCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span className="text-xs font-bold text-amber-700">{highCount} High Priority</span>
            </div>
          )}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-full">
            <span className="text-xs font-semibold text-slate-600">{data.total} Total Cases</span>
          </div>
          {datasetId && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-semibold">
              <Filter className="w-3 h-3" />
              Dataset Filtered
              <button 
                onClick={() => { searchParams.delete('dataset_id'); setSearchParams(searchParams); }}
                className="ml-1 hover:text-blue-900 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      )}

      {isError && (
        <ErrorState 
          title="Unable to load investigation queue"
          message={(error as Error)?.message || 'Failed to communicate with the reconciliation engine.'} 
        />
      )}

      {/* === FILTERS + TABLE === */}
      <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-sm">
        {/* Filter Bar */}
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center gap-3 bg-slate-50/50">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by Case ID or Root Cause..." 
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 text-slate-900 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors shadow-sm"
            />
          </div>
          
          <select 
            value={classification}
            onChange={(e) => { setClassification(e.target.value); setPage(1); }}
            className="bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-medium px-3 py-2 focus:outline-none focus:border-blue-500 shadow-sm"
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
            className="bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-medium px-3 py-2 focus:outline-none focus:border-blue-500 shadow-sm"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="OPEN">Open</option>
            <option value="RECORDED">Recorded</option>
            <option value="RESOLVED">Resolved</option>
            <option value="VERIFIED">Verified</option>
          </select>
        </div>
        
        {/* Table */}
        {isLoading ? (
          <LoadingState message="Loading investigation queue..." />
        ) : (!data?.items || data.items.length === 0) ? (
          <EmptyState
            icon={FileText}
            title="No cases found"
            description="There are no open exceptions matching your current search criteria. Try adjusting your filters."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-600">
              <thead className="text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/80 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3.5 w-10">
                    <button onClick={handleSelectAll} className="text-slate-400 hover:text-blue-600 focus:outline-none cursor-pointer">
                      {selectedCases.size > 0 && selectedCases.size === data.items.length ? (
                        <CheckSquare className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3.5 cursor-pointer hover:text-slate-900 flex items-center select-none group" onClick={() => toggleSort('case_id')}>
                    Transaction {renderSortIcon('case_id')}
                  </th>
                  <th className="px-4 py-3.5 cursor-pointer hover:text-slate-900 select-none group" onClick={() => toggleSort('classification')}>
                    <div className="flex items-center">Classification {renderSortIcon('classification')}</div>
                  </th>
                  <th className="px-4 py-3.5">Root Cause</th>
                  <th className="px-4 py-3.5 cursor-pointer hover:text-slate-900 select-none group" onClick={() => toggleSort('confidence_score')}>
                    <div className="flex items-center">Confidence {renderSortIcon('confidence_score')}</div>
                  </th>
                  <th className="px-4 py-3.5 cursor-pointer hover:text-slate-900 select-none group" onClick={() => toggleSort('status')}>
                    <div className="flex items-center">Status {renderSortIcon('status')}</div>
                  </th>
                  <th className="px-4 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map((c: CaseSummarySchema) => (
                  <tr 
                    key={c.case_id} 
                    className={cn(
                      "transition-all group cursor-pointer",
                      selectedCases.has(c.case_id) ? "bg-blue-50/50" : "hover:bg-slate-50/80"
                    )} 
                    onClick={() => navigate(`/cases/${c.case_id}${datasetId ? `?dataset_id=${datasetId}` : ''}`)}
                  >
                    <td className="px-4 py-4">
                      <button onClick={(e) => toggleSelection(c.case_id, e)} className="text-slate-400 hover:text-blue-600 focus:outline-none cursor-pointer">
                        {selectedCases.has(c.case_id) ? (
                          <CheckSquare className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-mono font-bold text-slate-900 text-sm">{c.case_id}</span>
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={c.classification} />
                    </td>
                    <td className="px-4 py-4 text-slate-500 font-medium text-xs">
                      {c.root_cause ? c.root_cause.replace(/_/g, ' ') : <span className="italic text-slate-400">Pending</span>}
                    </td>
                    <td className="px-4 py-4">
                      {c.confidence_score !== null ? (
                        <div className="flex items-center space-x-2.5 w-28">
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                            <div 
                              className={cn(
                                "h-full transition-all",
                                c.confidence_score > 90 ? "bg-emerald-500" : c.confidence_score > 70 ? "bg-blue-500" : "bg-amber-500"
                              )} 
                              style={{ width: `${c.confidence_score}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono font-bold text-slate-600 tabular-nums">{c.confidence_score}%</span>
                        </div>
                      ) : <span className="text-xs text-slate-400">—</span>}
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
                        className="inline-flex items-center justify-center rounded-lg text-xs font-bold transition-all bg-slate-900 hover:bg-blue-600 text-white h-8 px-3 opacity-0 group-hover:opacity-100 cursor-pointer shadow-sm"
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
        
        {/* Pagination */}
        {data && data.total_pages > 1 && (
          <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-4 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              Showing <span className="font-bold text-slate-900">{((page - 1) * limit) + 1}</span> to <span className="font-bold text-slate-900">{Math.min(page * limit, data.total)}</span> of <span className="font-bold text-slate-900">{data.total}</span>
            </div>
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || isLoading}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center shadow-sm"
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Prev
              </button>
              <div className="text-xs text-slate-600 font-semibold px-2 tabular-nums">
                {page} / {data.total_pages}
              </div>
              <button 
                onClick={() => setPage(p => Math.min(data.total_pages, p + 1))}
                disabled={page === data.total_pages || isLoading}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center shadow-sm"
              >
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
