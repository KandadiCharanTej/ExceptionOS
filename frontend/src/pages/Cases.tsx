import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, ChevronRight, FileText, ArrowUpDown, Trash2, Download, CheckSquare, Square, Activity, Filter, ChevronLeft, ChevronDown, X, AlertTriangle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { getCases, bulkDeleteCases, exportCases } from '../services/api';
import type { CaseSummarySchema } from '../types/api';
import { Card, CardContent, Badge, StatusBadge } from '../components/ui';
import { cn } from '../App';
import { useApp } from '../context/AppContext';

export default function Cases() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const { activeDatasetId, setActiveDatasetId, casesState, setCasesState } = useApp();

  const urlDatasetId = searchParams.get('dataset_id');
  const datasetId = urlDatasetId || activeDatasetId || undefined;

  useEffect(() => {
    if (urlDatasetId && urlDatasetId !== activeDatasetId) {
      setActiveDatasetId(urlDatasetId);
    }
  }, [urlDatasetId, activeDatasetId, setActiveDatasetId]);

  const {
    page,
    searchQuery,
    classification,
    status,
    sortBy,
    sortOrder,
    selectedCases: selectedCasesArray
  } = casesState;

  const limit = 20;
  const selectedCases = new Set(selectedCasesArray);

  const updateState = (updater: Partial<typeof casesState>) => {
    setCasesState(prev => ({ ...prev, ...updater }));
  };

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['cases', { page, limit, datasetId, searchQuery, classification, status, sortBy, sortOrder }],
    queryFn: () => getCases(page, limit, classification || undefined, datasetId, searchQuery || undefined, status || undefined, sortBy, sortOrder),
  });

  const deleteMutation = useMutation({
    mutationFn: (caseIds: string[]) => bulkDeleteCases(caseIds, datasetId),
    onSuccess: (res) => {
      toast.success(res.message || 'Cases deleted successfully');
      updateState({ selectedCases: [] });
      queryClient.invalidateQueries({ queryKey: ['cases'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to delete cases');
    }
  });

  const handleSelectAll = () => {
    if (data && selectedCases.size === data.items.length) {
      updateState({ selectedCases: [] });
    } else if (data) {
      updateState({ selectedCases: data.items.map(c => c.case_id) });
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
    updateState({ selectedCases: Array.from(newSet) });
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
      updateState({ sortOrder: sortOrder === 'asc' ? 'desc' : 'asc' });
    } else {
      updateState({ sortBy: field, sortOrder: 'desc' });
    }
  };

  const renderSortIcon = (field: string) => {
    if (sortBy !== field) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-40 group-hover:opacity-100 transition-opacity" />;
    return <ChevronDown className={cn("w-3 h-3 ml-1 transition-transform", sortOrder === 'asc' && "rotate-180")} />;
  };

  const handleClearDatasetFilter = () => {
    setActiveDatasetId(null);
    if (searchParams.has('dataset_id')) {
      searchParams.delete('dataset_id');
      setSearchParams(searchParams);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-1">Investigation Queue</h1>
          <p className="text-sm text-slate-500">
            {datasetId ? `Filtering exceptions for dataset: ${datasetId}` : 'Global view of all open financial discrepancies.'}
          </p>
        </div>
        <div className="flex space-x-3">
          <div className="relative group">
            <button className="flex items-center px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm cursor-pointer">
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
            <div className="absolute right-0 top-full mt-2 w-36 bg-white border border-slate-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 py-1">
              <button onClick={() => handleExport('csv')} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-primary transition-colors cursor-pointer">CSV Format</button>
              <button onClick={() => handleExport('json')} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-primary transition-colors cursor-pointer">JSON Format</button>
            </div>
          </div>
        </div>
      </div>

      {isError && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-100 text-sm font-medium flex items-center">
          <AlertTriangle className="w-4 h-4 mr-2" />
          {(error as Error).message || 'Failed to load investigation queue'}
        </div>
      )}

      {/* Main Card */}
      <Card>
        
        {/* Filters */}
        <div className="p-4 border-b border-border bg-slate-50/50 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-1 gap-3 max-w-3xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search case ID or cause..." 
                value={searchQuery}
                onChange={(e) => updateState({ searchQuery: e.target.value, page: 1 })}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 text-slate-900 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
              />
            </div>
            
            <select 
              value={classification}
              onChange={(e) => updateState({ classification: e.target.value, page: 1 })}
              className="bg-white border border-slate-200 text-slate-900 rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm"
            >
              <option value="exceptions">Actionable Exceptions Only</option>
              <option value="">All Cases (incl. Matched)</option>
              <option value="matched">Matched</option>
              <option value="amount_mismatch">Amount Mismatch</option>
              <option value="date_mismatch">Date Mismatch</option>
              <option value="timing_issue">Timing Issue</option>
              <option value="missing">Missing</option>
              <option value="duplicate">Duplicate</option>
            </select>
            
            <select 
              value={status}
              onChange={(e) => updateState({ status: e.target.value, page: 1 })}
              className="bg-white border border-slate-200 text-slate-900 rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="OPEN">Open</option>
              <option value="RECORDED">Recorded</option>
              <option value="RESOLVED">Resolved</option>
              <option value="VERIFIED">Verified</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-4 text-sm">
            {datasetId && (
              <span className="px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-md flex items-center font-medium text-xs">
                <Filter className="w-3.5 h-3.5 mr-1.5" />
                Filtered by Dataset
                <button 
                  onClick={handleClearDatasetFilter}
                  className="ml-2 hover:text-indigo-900 transition-colors cursor-pointer"
                  title="Clear dataset filter"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            )}
            {selectedCases.size > 0 && (
              <button 
                onClick={handleBulkDelete}
                className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-md flex items-center transition-colors shadow-sm font-medium text-xs cursor-pointer"
              >
                {deleteMutation.isPending ? <Activity className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 mr-1.5" />}
                Delete {selectedCases.size}
              </button>
            )}
          </div>
        </div>
        
        {/* Table Content */}
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
              <Activity className="h-8 w-8 animate-spin text-primary" />
              <p className="text-slate-500 text-sm font-medium">Loading queue...</p>
            </div>
          ) : (!data?.items || data.items.length === 0) ? (
            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-slate-200 m-8 rounded-xl bg-slate-50">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-slate-100">
                <FileText className="h-6 w-6 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Queue is empty</h3>
              <p className="text-slate-500 text-sm max-w-sm text-center mt-1">
                There are no exceptions matching your current filters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50/80 border-b border-border">
                  <tr>
                    <th className="px-6 py-4 w-10">
                      <button onClick={handleSelectAll} className="text-slate-400 hover:text-primary transition-colors cursor-pointer">
                        {selectedCases.size > 0 && selectedCases.size === data.items.length ? (
                          <CheckSquare className="w-4 h-4 text-primary" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </th>
                    <th className="px-6 py-4 font-semibold tracking-wider cursor-pointer hover:text-slate-900 group transition-colors" onClick={() => toggleSort('case_id')}>
                      <div className="flex items-center">Case ID {renderSortIcon('case_id')}</div>
                    </th>
                    <th className="px-6 py-4 font-semibold tracking-wider cursor-pointer hover:text-slate-900 group transition-colors" onClick={() => toggleSort('classification')}>
                      <div className="flex items-center">Classification {renderSortIcon('classification')}</div>
                    </th>
                    <th className="px-6 py-4 font-semibold tracking-wider">Root Cause Analysis</th>
                    <th className="px-6 py-4 font-semibold tracking-wider cursor-pointer hover:text-slate-900 group transition-colors" onClick={() => toggleSort('confidence_score')}>
                      <div className="flex items-center">Confidence {renderSortIcon('confidence_score')}</div>
                    </th>
                    <th className="px-6 py-4 font-semibold tracking-wider cursor-pointer hover:text-slate-900 group transition-colors" onClick={() => toggleSort('status')}>
                      <div className="flex items-center">Status {renderSortIcon('status')}</div>
                    </th>
                    <th className="px-6 py-4 font-semibold tracking-wider text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.items.map((c: CaseSummarySchema) => (
                    <tr 
                      key={c.case_id} 
                      className={cn(
                        "transition-colors group cursor-pointer",
                        selectedCases.has(c.case_id) ? "bg-indigo-50/50" : "hover:bg-slate-50/80"
                      )} 
                      onClick={() => navigate(`/cases/${c.case_id}${datasetId ? `?dataset_id=${datasetId}` : ''}`)}
                    >
                      <td className="px-6 py-4">
                        <button onClick={(e) => toggleSelection(c.case_id, e)} className="text-slate-400 hover:text-primary transition-colors cursor-pointer">
                          {selectedCases.has(c.case_id) ? (
                            <CheckSquare className="w-4 h-4 text-primary" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 font-mono text-sm font-medium text-slate-900">{c.case_id}</td>
                      <td className="px-6 py-4">
                        <Badge variant="error">
                          {c.classification.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {c.root_cause ? c.root_cause.replace(/_/g, ' ') : <span className="text-slate-400 italic">Pending</span>}
                      </td>
                      <td className="px-6 py-4">
                        {c.confidence_score !== null ? (
                          <div className="flex items-center space-x-3 w-32">
                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className={cn(
                                  "h-full rounded-full",
                                  c.confidence_score > 90 ? "bg-emerald-500" : c.confidence_score > 70 ? "bg-blue-500" : "bg-amber-500"
                                )} 
                                style={{ width: `${c.confidence_score}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-slate-600">{c.confidence_score}%</span>
                          </div>
                        ) : <span className="text-slate-400">-</span>}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/cases/${c.case_id}${datasetId ? `?dataset_id=${datasetId}` : ''}`);
                          }}
                          className="inline-flex items-center justify-center rounded-lg text-xs font-semibold transition-all bg-white border border-slate-200 shadow-sm hover:bg-slate-50 hover:border-slate-300 text-slate-700 h-8 px-3 opacity-0 group-hover:opacity-100 cursor-pointer"
                        >
                          Review
                          <ChevronRight className="ml-1 h-3.5 w-3.5 text-slate-400" />
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
          <div className="border-t border-border bg-slate-50/50 px-6 py-4 flex items-center justify-between">
            <div className="text-sm text-slate-500">
              Showing <span className="font-medium text-slate-900">{((page - 1) * limit) + 1}</span> to <span className="font-medium text-slate-900">{Math.min(page * limit, data.total)}</span> of <span className="font-medium text-slate-900">{data.total}</span> entries
            </div>
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => updateState({ page: Math.max(1, page - 1) })}
                disabled={page === 1 || isLoading}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:bg-slate-50 shadow-sm transition-colors flex items-center cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4 mr-1 text-slate-400" /> Prev
              </button>
              <div className="text-sm text-slate-600 font-medium px-4">
                {page} / {data.total_pages}
              </div>
              <button 
                onClick={() => updateState({ page: Math.min(data.total_pages, page + 1) })}
                disabled={page === data.total_pages || isLoading}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:bg-slate-50 shadow-sm transition-colors flex items-center cursor-pointer disabled:cursor-not-allowed"
              >
                Next <ChevronRight className="w-4 h-4 ml-1 text-slate-400" />
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

