import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search, ChevronRight, FileText, ArrowUpDown, Trash2, Download,
  CheckSquare, Square, Activity, Filter, ChevronLeft, ChevronDown, X
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getCases, bulkDeleteCases, exportCases } from '../services/api';
import type { CaseSummarySchema } from '../types/api';
import {
  PageHeader, Surface, StatusBadge, PriorityBadge, SecondaryButton,
  LoadingState, ErrorState, EmptyState, Metric, PageContainer
} from '../components/ui';
import { cn } from '../lib/utils';

export default function Cases() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const datasetId = searchParams.get('dataset_id') || undefined;

  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [searchQuery, setSearchQuery] = useState('');
  const [classification, setClassification] = useState(searchParams.get('classification') || '');
  const [status, setStatus] = useState('');
  const [sortBy, setSortBy] = useState('confidence_score');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedCases, setSelectedCases] = useState<Set<string>>(new Set());

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['cases', { page, limit, datasetId, searchQuery, classification, status, sortBy, sortOrder }],
    queryFn: () => getCases(page, limit, classification || undefined, datasetId, searchQuery || undefined, status || undefined, sortBy, sortOrder),
  });

  const deleteMutation = useMutation({
    mutationFn: (caseIds: string[]) => bulkDeleteCases(caseIds, datasetId),
    onSuccess: (res) => {
      toast.success(res.message || 'Cases deleted');
      setSelectedCases(new Set());
      queryClient.invalidateQueries({ queryKey: ['cases'] });
    },
    onError: (err: any) => toast.error(err.message || 'Delete failed'),
  });

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const toastId = toast.loading(`Exporting ${format.toUpperCase()}...`);
      const blob = await exportCases(format, datasetId, classification || undefined, searchQuery || undefined);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `exceptionos_export.${format}`;
      link.click();
      toast.success('Export complete', { id: toastId });
    } catch (err: any) {
      toast.error(err.message || 'Export failed');
    }
  };

  const toggleSort = (field: string) => {
    if (sortBy === field) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortOrder('desc'); }
  };

  const renderSortIcon = (field: string) => {
    if (sortBy !== field) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-30" />;
    return <ChevronDown className={cn('w-3 h-3 ml-1', sortOrder === 'asc' && 'rotate-180')} />;
  };

  const criticalCount = data?.items.filter((c) => (c as any).priority === 'CRITICAL').length || 0;
  const highCount = data?.items.filter((c) => (c as any).priority === 'HIGH').length || 0;
  const reviewCount = data?.items.filter((c) => c.classification !== 'matched' && c.status !== 'RESOLVED').length || 0;
  const resolvedCount = data?.items.filter((c) => c.status === 'RESOLVED' || c.status === 'VERIFIED').length || 0;

  return (
    <PageContainer className="space-y-12">
      <PageHeader
        overline="Operations"
        title="Investigations"
        description="Review and resolve financial discrepancies across all reconciliation runs."
        actions={
          <div className="flex items-center gap-2">
            {selectedCases.size > 0 && (
              <button
                onClick={() => {
                  if (window.confirm(`Delete ${selectedCases.size} cases?`)) {
                    deleteMutation.mutate(Array.from(selectedCases));
                  }
                }}
                className="px-3 py-2 bg-red-50 text-red-600 border border-red-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete {selectedCases.size}
              </button>
            )}
            <div className="relative group">
              <SecondaryButton><Download className="w-4 h-4" /> Export</SecondaryButton>
              <div className="absolute right-0 mt-1 w-36 bg-white border border-slate-200 rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 py-1">
                <button onClick={() => handleExport('csv')} className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 cursor-pointer">CSV</button>
                <button onClick={() => handleExport('json')} className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 cursor-pointer">JSON</button>
              </div>
            </div>
          </div>
        }
      />

      {/* Priority strip */}
      {data && data.items.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Metric label="Critical" value={criticalCount} variant="error" size="compact" className="!p-4" />
          <Metric label="High Priority" value={highCount} variant="warning" size="compact" className="!p-4" />
          <Metric label="Needs Review" value={reviewCount} variant="accent" size="compact" className="!p-4" />
          <Metric label="Resolved" value={resolvedCount} variant="success" size="compact" className="!p-4" />
        </div>
      )}

      {datasetId && (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-medium">
            <Filter className="w-3 h-3" /> Dataset filtered
            <button onClick={() => { searchParams.delete('dataset_id'); setSearchParams(searchParams); }} className="ml-1 cursor-pointer">
              <X className="w-3 h-3" />
            </button>
          </span>
        </div>
      )}

      {isError && <ErrorState title="Unable to load queue" message={(error as Error)?.message} />}

      <Surface className="overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Case ID..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
            />
          </div>
          <select value={classification} onChange={(e) => { setClassification(e.target.value); setPage(1); }}
            className="bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium px-3 py-2.5 focus:outline-none">
            <option value="">All Exceptions</option>
            <option value="matched">Matched</option>
            <option value="duplicate_detected">Duplicate</option>
            <option value="amount_mismatch">Amount Mismatch</option>
            <option value="missing_in_bank">Missing Bank</option>
            <option value="missing_in_gateway">Missing Gateway</option>
            <option value="missing_in_ledger">Missing Ledger</option>
            <option value="date_mismatch">Date Mismatch</option>
          </select>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium px-3 py-2.5 focus:outline-none">
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="OPEN">Open</option>
            <option value="RESOLVED">Resolved</option>
            <option value="VERIFIED">Verified</option>
          </select>
        </div>

        {isLoading ? (
          <LoadingState message="Loading investigation queue..." />
        ) : !data?.items.length ? (
          <EmptyState icon={FileText} title="No cases found" description="Adjust filters or run a reconciliation to generate cases." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  <th className="px-4 py-4 w-10">
                    <button onClick={() => {
                      if (data && selectedCases.size === data.items.length) setSelectedCases(new Set());
                      else if (data) setSelectedCases(new Set(data.items.map((c) => c.case_id)));
                    }} className="cursor-pointer">
                      {selectedCases.size === data.items.length ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4 text-slate-300" />}
                    </button>
                  </th>
                  <th className="px-4 py-4 text-left cursor-pointer" onClick={() => toggleSort('case_id')}>
                    <span className="flex items-center">Transaction {renderSortIcon('case_id')}</span>
                  </th>
                  <th className="px-4 py-4 text-left cursor-pointer" onClick={() => toggleSort('classification')}>
                    <span className="flex items-center">Exception {renderSortIcon('classification')}</span>
                  </th>
                  <th className="px-4 py-4 text-left">Priority</th>
                  <th className="px-4 py-4 text-left">Root Cause</th>
                  <th className="px-4 py-4 text-left cursor-pointer" onClick={() => toggleSort('confidence_score')}>
                    <span className="flex items-center">Confidence {renderSortIcon('confidence_score')}</span>
                  </th>
                  <th className="px-4 py-4 text-left">Status</th>
                  <th className="px-4 py-4" />
                </tr>
              </thead>
              <tbody>
                {data.items.map((c: CaseSummarySchema) => (
                  <tr
                    key={c.case_id}
                    onClick={() => navigate(`/cases/${c.case_id}${datasetId ? `?dataset_id=${datasetId}` : ''}`)}
                    className={cn(
                      'border-b border-slate-50 last:border-0 cursor-pointer transition-colors group',
                      selectedCases.has(c.case_id) ? 'bg-blue-50/40' : 'hover:bg-slate-50/80'
                    )}
                  >
                    <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => {
                        const s = new Set(selectedCases);
                        s.has(c.case_id) ? s.delete(c.case_id) : s.add(c.case_id);
                        setSelectedCases(s);
                      }} className="cursor-pointer">
                        {selectedCases.has(c.case_id) ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4 text-slate-300" />}
                      </button>
                    </td>
                    <td className="px-4 py-4 font-mono font-bold text-slate-900">{c.case_id}</td>
                    <td className="px-4 py-4"><StatusBadge status={c.classification} /></td>
                    <td className="px-4 py-4"><PriorityBadge priority={(c as any).priority} /></td>
                    <td className="px-4 py-4 text-xs text-slate-500 capitalize">{c.root_cause?.replace(/_/g, ' ') || '—'}</td>
                    <td className="px-4 py-4">
                      {c.confidence_score != null ? (
                        <span className="text-xs font-bold tabular-nums text-slate-700">{c.confidence_score}%</span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-4"><StatusBadge status={c.status} /></td>
                    <td className="px-4 py-4 text-right">
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 inline transition-colors" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && data.total_pages > 1 && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              {((page - 1) * limit) + 1}–{Math.min(page * limit, data.total)} of {data.total}
            </span>
            <div className="flex items-center gap-2">
              <SecondaryButton onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="text-xs py-1.5">
                <ChevronLeft className="w-4 h-4" /> Prev
              </SecondaryButton>
              <span className="text-xs font-semibold tabular-nums px-2">{page}/{data.total_pages}</span>
              <SecondaryButton onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))} disabled={page === data.total_pages} className="text-xs py-1.5">
                Next <ChevronRight className="w-4 h-4" />
              </SecondaryButton>
            </div>
          </div>
        )}
      </Surface>
    </PageContainer>
  );
}
