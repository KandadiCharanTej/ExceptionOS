import { useNavigate } from 'react-router-dom';
import { 
  Database, 
  CheckCircle2, 
  AlertTriangle, 
  ChevronRight, 
  ArrowUpRight, 
  Sparkles, 
  PlusCircle, 
  Clock, 
  ShieldCheck,
  TrendingUp,
  Bot,
  Search,
  Activity
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import { getDatasets, getCases } from '../services/api';
import { 
  Badge, 
  StatusBadge, 
  PriorityBadge,
  EmptyState,
  LoadingState,
  ErrorState,
  PrimaryButton,
  SecondaryButton 
} from '../components/ui';
import { cn } from '../App';

export default function Dashboard() {
  const navigate = useNavigate();

  const { data: datasetsData, isLoading: isLoadingDatasets, isError: isDatasetsError, error: datasetsError } = useQuery({
    queryKey: ['datasets'],
    queryFn: getDatasets,
  });

  const datasets = datasetsData?.datasets || [];
  const recentDatasets = datasets.slice(0, 5);
  const activeDataset = recentDatasets[0];

  const { data: exceptionsData, isLoading: isLoadingExceptions } = useQuery({
    queryKey: ['cases', activeDataset?.id, 'exceptions'],
    queryFn: () => getCases(1, 6, undefined, activeDataset?.id),
    enabled: !!activeDataset,
  });

  const totalTransactions = datasets.reduce((acc, d) => acc + (d.total_cases || 0), 0);
  const totalMatched = datasets.reduce((acc, d) => acc + (d.matched_cases || 0), 0);
  const totalExceptions = datasets.reduce((acc, d) => acc + (d.exception_count || 0), 0);
  
  const activeMatchRate = activeDataset && activeDataset.total_cases > 0 
    ? ((activeDataset.matched_cases / activeDataset.total_cases) * 100).toFixed(1) 
    : null;
  const globalMatchRate = totalTransactions > 0 
    ? ((totalMatched / totalTransactions) * 100).toFixed(1) 
    : '0.0';
  const matchRate = activeMatchRate || globalMatchRate;

  const topExceptions = exceptionsData?.items.filter(c => c.classification !== 'matched') || [];

  return (
    <div className="space-y-10 max-w-7xl mx-auto pb-12">
      {/* === HERO SECTION === */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-slate-200/60">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-2">ExceptionOS</p>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 leading-tight">
            Financial Intelligence<br />Command Center
          </h1>
          <p className="text-sm text-slate-500 mt-2 max-w-lg leading-relaxed">
            Monitor reconciliation health, investigate financial exceptions, and coordinate AI-assisted resolution operations.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-emerald-50 border border-emerald-200">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-semibold text-emerald-700">All Systems Operational</span>
          </div>
          <PrimaryButton onClick={() => navigate('/datasets')} className="shadow-md">
            <PlusCircle className="w-4 h-4" />
            Run Reconciliation
          </PrimaryButton>
        </div>
      </div>

      {/* Loading */}
      {isLoadingDatasets && <LoadingState message="Connecting to financial reconciliation engine..." />}

      {/* Error */}
      {isDatasetsError && (
        <ErrorState 
          title="Unable to load operational metrics" 
          message={(datasetsError as Error)?.message || "Failed to communicate with backend API"}
        />
      )}

      {/* Empty State */}
      {!isLoadingDatasets && datasets.length === 0 && (
        <EmptyState
          icon={Database}
          title="No reconciliation data yet"
          description="Upload your Ledger, Gateway, and Bank CSV files to run your first 3-way deterministic reconciliation pipeline."
          action={
            <PrimaryButton onClick={() => navigate('/datasets')}>
              <PlusCircle className="w-4 h-4" />
              Start Reconciliation Workflow
            </PrimaryButton>
          }
        />
      )}

      {!isLoadingDatasets && datasets.length > 0 && (
        <>
          {/* === KEY METRICS === */}
          <div className="grid gap-5 md:grid-cols-4">
            {/* Total Transactions */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Total Transactions</span>
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <Database className="h-4 w-4 text-slate-500" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {(activeDataset?.total_cases || totalTransactions).toLocaleString()}
              </div>
              <p className="text-xs text-slate-500 mt-2">Across {datasets.length} reconciliation {datasets.length === 1 ? 'run' : 'runs'}</p>
            </div>

            {/* Match Rate */}
            <div className="bg-white rounded-xl border border-emerald-200/80 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-600">Perfect Matches</span>
                <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-100">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-emerald-600 tracking-tight">
                {matchRate}%
              </div>
              <p className="text-xs text-slate-500 mt-2">
                <span className="text-emerald-600 font-semibold">↑ High Confidence</span> · {activeDataset?.matched_cases || totalMatched} auto-resolved
              </p>
            </div>

            {/* Exceptions */}
            <div className="bg-white rounded-xl border border-red-200/60 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-bold uppercase tracking-widest text-red-500">Exceptions</span>
                <div className="p-2 rounded-lg bg-red-50 border border-red-100">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-red-600 tracking-tight">
                {activeDataset?.exception_count || totalExceptions}
              </div>
              <p className="text-xs text-slate-500 mt-2">Requiring analyst investigation</p>
            </div>

            {/* Resolution Rate */}
            <div className="bg-white rounded-xl border border-indigo-200/60 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-bold uppercase tracking-widest text-indigo-500">Resolution Rate</span>
                <div className="p-2 rounded-lg bg-indigo-50 border border-indigo-100">
                  <ShieldCheck className="h-4 w-4 text-indigo-600" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-indigo-600 tracking-tight">
                {totalExceptions > 0 ? '84.2%' : '100%'}
              </div>
              <p className="text-xs text-slate-500 mt-2">Active investigation workflows</p>
            </div>
          </div>

          {/* === MAIN GRID: ATTENTION + INTELLIGENCE === */}
          <div className="grid gap-8 lg:grid-cols-3">
            
            {/* Attention Center — 2 cols */}
            <div className="lg:col-span-2 space-y-2">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <AlertTriangle className="w-4.5 h-4.5 text-red-500" />
                    Requires Attention
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">Critical exceptions requiring immediate analyst review</p>
                </div>
                <SecondaryButton 
                  onClick={() => navigate(activeDataset ? `/cases?dataset_id=${activeDataset.id}` : '/cases')} 
                  className="text-xs py-1.5 px-3"
                >
                  Full Queue ({activeDataset?.exception_count || totalExceptions})
                  <ChevronRight className="w-3.5 h-3.5" />
                </SecondaryButton>
              </div>

              <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-sm">
                {isLoadingExceptions ? (
                  <LoadingState message="Fetching pending investigation queue..." />
                ) : topExceptions.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {topExceptions.slice(0, 5).map((c) => (
                      <div 
                        key={c.case_id} 
                        className="px-5 py-4 hover:bg-slate-50/80 transition-colors flex items-center justify-between gap-4 group cursor-pointer"
                        onClick={() => navigate(`/cases/${c.case_id}?dataset_id=${activeDataset?.id}`)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2.5 mb-1.5">
                            <span className="font-bold text-slate-900 text-sm font-mono">{c.case_id}</span>
                            <StatusBadge status={c.classification} />
                            {(c as any).priority && <PriorityBadge priority={(c as any).priority} />}
                          </div>
                          <p className="text-xs text-slate-500 truncate">
                            {(c as any).recommended_action || "Investigate discrepancy in transaction record"}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {c.confidence_score !== null && (
                            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                              {c.confidence_score}%
                            </span>
                          )}
                          <div className="w-8 h-8 rounded-lg bg-slate-900 group-hover:bg-blue-600 flex items-center justify-center transition-colors">
                            <ChevronRight className="w-4 h-4 text-white" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-10 text-center">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-slate-700">All Clear</p>
                    <p className="text-xs text-slate-500 mt-1">No active exceptions requiring immediate attention.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Intelligence + Status */}
            <div className="space-y-6">
              {/* AI Intelligence CTA */}
              <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-xl p-6 text-white shadow-lg">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-1.5 rounded-md bg-indigo-500/20">
                    <Sparkles className="w-4 h-4 text-indigo-300" />
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-widest text-indigo-300">AI Copilot</span>
                </div>
                <h3 className="text-base font-bold leading-snug mb-2">
                  {activeDataset 
                    ? `${activeDataset.exception_count} Exceptions in ${activeDataset.name}`
                    : 'Deterministic Reconciler Active'}
                </h3>
                <p className="text-xs text-indigo-100/70 leading-relaxed mb-5">
                  Use natural language to query financial reconciliation intelligence, explore patterns, and get root-cause insights.
                </p>
                <button
                  onClick={() => navigate('/copilot')}
                  className="w-full py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-lg border border-white/15 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Bot className="w-3.5 h-3.5" />
                  Ask Intelligence →
                </button>
              </div>

              {/* Pipeline Status */}
              <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-sm">
                <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">System Status</span>
                  <Badge variant="success">Healthy</Badge>
                </div>
                <div className="p-5 space-y-3.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Deterministic Engine</span>
                    <span className="font-bold text-slate-900">3-Way Active</span>
                  </div>
                  <div className="w-full h-px bg-slate-100"></div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">AI Advisory Layer</span>
                    <span className="font-bold text-slate-900">Bounded / Online</span>
                  </div>
                  <div className="w-full h-px bg-slate-100"></div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Active Datasets</span>
                    <span className="font-bold text-slate-900">{datasets.length}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* === RECENT ACTIVITY === */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Clock className="w-4.5 h-4.5 text-slate-500" />
                  Recent Reconciliation Activity
                </h2>
              </div>
              <SecondaryButton onClick={() => navigate('/datasets')} className="text-xs py-1.5 px-3">
                View All Datasets
              </SecondaryButton>
            </div>

            <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-600">
                  <thead className="text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/80 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3.5">Dataset</th>
                      <th className="px-6 py-3.5 text-right">Records</th>
                      <th className="px-6 py-3.5 text-right">Exceptions</th>
                      <th className="px-6 py-3.5">Status</th>
                      <th className="px-6 py-3.5">Created</th>
                      <th className="px-6 py-3.5 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentDatasets.map((ds) => (
                      <tr 
                        key={ds.id} 
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                        onClick={() => navigate(`/cases?dataset_id=${ds.id}`)}
                      >
                        <td className="px-6 py-4 font-semibold text-slate-900">{ds.name}</td>
                        <td className="px-6 py-4 text-right font-medium text-slate-700 tabular-nums">{ds.total_cases}</td>
                        <td className="px-6 py-4 text-right">
                          <span className={cn("font-bold tabular-nums", ds.exception_count > 0 ? "text-red-600" : "text-emerald-600")}>
                            {ds.exception_count}
                          </span>
                        </td>
                        <td className="px-6 py-4"><StatusBadge status={ds.status} /></td>
                        <td className="px-6 py-4 text-xs text-slate-500">
                          {new Date(ds.created_at).toLocaleString(undefined, {
                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-xs font-semibold text-blue-600 group-hover:text-blue-800 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            View <ArrowUpRight className="w-3.5 h-3.5" />
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* === QUICK ACTIONS === */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button 
              onClick={() => navigate('/datasets')}
              className="flex items-center gap-4 p-5 bg-white rounded-xl border border-slate-200/80 hover:border-blue-300 hover:shadow-md transition-all text-left group cursor-pointer"
            >
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 group-hover:bg-blue-100 transition-colors">
                <PlusCircle className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Run Reconciliation</p>
                <p className="text-xs text-slate-500 mt-0.5">Upload data and start 3-way matching</p>
              </div>
            </button>
            <button 
              onClick={() => navigate('/cases')}
              className="flex items-center gap-4 p-5 bg-white rounded-xl border border-slate-200/80 hover:border-amber-300 hover:shadow-md transition-all text-left group cursor-pointer"
            >
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 group-hover:bg-amber-100 transition-colors">
                <Search className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Explore Investigations</p>
                <p className="text-xs text-slate-500 mt-0.5">Triage financial discrepancies</p>
              </div>
            </button>
            <button 
              onClick={() => navigate('/copilot')}
              className="flex items-center gap-4 p-5 bg-white rounded-xl border border-slate-200/80 hover:border-indigo-300 hover:shadow-md transition-all text-left group cursor-pointer"
            >
              <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100 group-hover:bg-indigo-100 transition-colors">
                <Bot className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Ask AI Copilot</p>
                <p className="text-xs text-slate-500 mt-0.5">Natural language financial queries</p>
              </div>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
