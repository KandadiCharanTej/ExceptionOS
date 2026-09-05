import { useNavigate } from 'react-router-dom';
import {
  Database, CheckCircle2, AlertTriangle, ChevronRight, ArrowUpRight,
  PlusCircle, Clock, Bot, Activity, Sparkles
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getDatasets, getCases } from '../services/api';
import {
  PageHeader, SectionHeader, Metric, Surface, StatusBadge,
  IntelligenceCard, AttentionItem, EmptyState, LoadingState, ErrorState,
  PrimaryButton, SecondaryButton, SystemStatus, PageContainer
} from '../components/ui';
import { cn } from '../lib/utils';

const CLASSIFICATION_LABELS: Record<string, { label: string; priority: 'critical' | 'high' | 'medium' }> = {
  duplicate_detected: { label: 'Duplicate transactions detected', priority: 'critical' },
  amount_mismatch: { label: 'Amount mismatches detected', priority: 'critical' },
  missing_in_bank: { label: 'Missing settlement records', priority: 'high' },
  missing_in_gateway: { label: 'Missing gateway records', priority: 'high' },
  missing_in_ledger: { label: 'Missing ledger records', priority: 'high' },
  date_mismatch: { label: 'Date mismatches detected', priority: 'medium' },
  system_error: { label: 'System errors detected', priority: 'medium' },
};

export default function Dashboard() {
  const navigate = useNavigate();

  const { data: datasetsData, isLoading, isError, error } = useQuery({
    queryKey: ['datasets'],
    queryFn: getDatasets,
  });

  const datasets = datasetsData?.datasets || [];
  const activeDataset = datasets[0];
  const recentDatasets = datasets.slice(0, 5);

  const { data: exceptionsData, isLoading: loadingExceptions } = useQuery({
    queryKey: ['cases', activeDataset?.id, 'dashboard'],
    queryFn: () => getCases(1, 100, undefined, activeDataset?.id),
    enabled: !!activeDataset,
  });

  const { data: statsData } = useQuery({
    queryKey: ['cases', 'stats'],
    queryFn: () => getCases(1, 100),
    enabled: datasets.length > 0,
  });

  const totalTransactions = datasets.reduce((a, d) => a + (d.total_cases || 0), 0);
  const totalMatched = datasets.reduce((a, d) => a + (d.matched_cases || 0), 0);
  const totalExceptions = datasets.reduce((a, d) => a + (d.exception_count || 0), 0);

  const txCount = activeDataset?.total_cases || totalTransactions;
  const matchRate = txCount > 0
    ? (((activeDataset?.matched_cases || totalMatched) / txCount) * 100).toFixed(1)
    : '0.0';
  const exceptionCount = activeDataset?.exception_count ?? totalExceptions;

  const resolvedCases = statsData?.items.filter(
    (c) => c.status === 'RESOLVED' || c.status === 'VERIFIED' || c.status === 'RECORDED'
  ).length || 0;
  const openExceptions = statsData?.items.filter((c) => c.classification !== 'matched').length || exceptionCount;
  const resolutionRate = openExceptions > 0
    ? ((resolvedCases / openExceptions) * 100).toFixed(1)
    : exceptionCount === 0 ? '100' : '—';

  const exceptionGroups: Record<string, number> = {};
  (exceptionsData?.items || []).forEach((c) => {
    if (c.classification !== 'matched') {
      exceptionGroups[c.classification] = (exceptionGroups[c.classification] || 0) + 1;
    }
  });
  const attentionItems = Object.entries(exceptionGroups)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([cls, count]) => ({
      cls,
      count,
      ...(CLASSIFICATION_LABELS[cls] || { label: cls.replace(/_/g, ' '), priority: 'medium' as const }),
    }));

  const topException = attentionItems[0];

  return (
    <PageContainer className="space-y-12">
      <PageHeader
        overline="ExceptionOS"
        title="Financial Intelligence Command Center"
        description="Monitor reconciliation health, identify financial risk, and coordinate intelligent resolution."
        actions={
          <>
            <SystemStatus healthy={!isError} />
            <PrimaryButton onClick={() => navigate('/datasets')}>
              Run Reconciliation <ArrowUpRight className="w-4 h-4" />
            </PrimaryButton>
          </>
        }
      />

      {isLoading && <LoadingState message="Connecting to reconciliation engine..." />}
      {isError && <ErrorState title="Unable to load metrics" message={(error as Error)?.message} />}

      {!isLoading && datasets.length === 0 && (
        <EmptyState
          icon={Database}
          title="No reconciliation data yet"
          description="Upload Ledger, Gateway, and Bank CSV files to run your first 3-way deterministic reconciliation."
          action={
            <PrimaryButton onClick={() => navigate('/datasets')}>
              <PlusCircle className="w-4 h-4" /> Start Reconciliation
            </PrimaryButton>
          }
        />
      )}

      {!isLoading && datasets.length > 0 && (
        <>
          {/* Asymmetric metrics */}
          <div className="grid gap-4 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <Metric
                label="Transactions processed"
                value={txCount.toLocaleString()}
                subtitle={`Across ${datasets.length} reconciliation ${datasets.length === 1 ? 'run' : 'runs'}`}
                icon={Database}
                size="hero"
              />
            </div>
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Metric
                label="Successfully reconciled"
                value={`${matchRate}%`}
                variant="success"
                icon={CheckCircle2}
                trend={{ direction: 'up', value: `${activeDataset?.matched_cases || totalMatched} matched` }}
              />
              <Metric
                label="Require investigation"
                value={exceptionCount.toLocaleString()}
                variant="error"
                icon={AlertTriangle}
                subtitle="Active exceptions"
              />
              <Metric
                label="Resolution rate"
                value={resolutionRate === '—' ? '—' : `${resolutionRate}%`}
                variant="accent"
                icon={Activity}
                subtitle="Of open exceptions"
              />
            </div>
          </div>

          {/* Attention + AI */}
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <SectionHeader
                title="Requires Attention"
                description="Financial exceptions prioritized by risk and impact."
                action={
                  <SecondaryButton onClick={() => navigate(activeDataset ? `/cases?dataset_id=${activeDataset.id}` : '/cases')} className="text-xs">
                    Full Queue ({exceptionCount}) <ChevronRight className="w-3.5 h-3.5" />
                  </SecondaryButton>
                }
              />
              <Surface className="overflow-hidden">
                {loadingExceptions ? (
                  <LoadingState message="Loading exception queue..." />
                ) : attentionItems.length > 0 ? (
                  attentionItems.map((item) => (
                    <AttentionItem
                      key={item.cls}
                      priority={item.priority}
                      title={item.label}
                      count={item.count}
                      subtitle="affected records · High financial risk"
                      onAction={() => navigate(`/cases?dataset_id=${activeDataset?.id}&classification=${item.cls}`)}
                    />
                  ))
                ) : (
                  <div className="p-12 text-center">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-slate-800">All Clear</p>
                    <p className="text-xs text-slate-500 mt-1">No active exceptions requiring attention.</p>
                  </div>
                )}
              </Surface>
            </div>

            <div className="space-y-4">
              <IntelligenceCard
                insight={
                  topException
                    ? `Your reconciliation data has a significant ${topException.label.toLowerCase()}.`
                    : 'Reconciliation engine is operating normally.'
                }
                detail={topException ? `${topException.count.toLocaleString()} exceptions detected.` : `${matchRate}% match rate across all runs.`}
                recommendation={
                  topException
                    ? `Investigate high-impact ${topException.label.toLowerCase()} first.`
                    : 'Run analytics to explore operational patterns.'
                }
                action={
                  <button
                    onClick={() => navigate('/copilot')}
                    className="w-full py-2.5 bg-white/10 hover:bg-white/15 text-white text-sm font-semibold rounded-xl border border-white/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Bot className="w-4 h-4" /> Ask AI Intelligence →
                  </button>
                }
              />

              <Surface className="p-5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-4">System Status</p>
                <div className="space-y-3 text-xs">
                  {[
                    ['Deterministic Engine', '3-Way Active'],
                    ['AI Advisory Layer', 'Bounded / Online'],
                    ['Active Datasets', datasets.length.toString()],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between items-center">
                      <span className="text-slate-500">{k}</span>
                      <span className="font-semibold text-slate-900">{v}</span>
                    </div>
                  ))}
                </div>
              </Surface>
            </div>
          </div>

          {/* Recent activity */}
          <div>
            <SectionHeader
              title="Recent Reconciliation Activity"
              action={
                <SecondaryButton onClick={() => navigate('/datasets')} className="text-xs">
                  View All <ChevronRight className="w-3.5 h-3.5" />
                </SecondaryButton>
              }
            />
            <Surface className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                      <th className="px-6 py-4 text-left font-semibold">Dataset</th>
                      <th className="px-6 py-4 text-right font-semibold">Records</th>
                      <th className="px-6 py-4 text-right font-semibold">Exceptions</th>
                      <th className="px-6 py-4 text-left font-semibold">Status</th>
                      <th className="px-6 py-4 text-left font-semibold">Created</th>
                      <th className="px-6 py-4" />
                    </tr>
                  </thead>
                  <tbody>
                    {recentDatasets.map((ds) => (
                      <tr
                        key={ds.id}
                        onClick={() => navigate(`/cases?dataset_id=${ds.id}`)}
                        className="border-b border-slate-50 last:border-0 hover:bg-slate-50/80 transition-colors cursor-pointer group"
                      >
                        <td className="px-6 py-4 font-semibold text-slate-900">{ds.name}</td>
                        <td className="px-6 py-4 text-right tabular-nums text-slate-700">{ds.total_cases.toLocaleString()}</td>
                        <td className="px-6 py-4 text-right">
                          <span className={cn('font-bold tabular-nums', ds.exception_count > 0 ? 'text-red-600' : 'text-emerald-600')}>
                            {ds.exception_count}
                          </span>
                        </td>
                        <td className="px-6 py-4"><StatusBadge status={ds.status} /></td>
                        <td className="px-6 py-4 text-xs text-slate-500">
                          {new Date(ds.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 transition-colors inline" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Surface>
          </div>

          {/* Quick actions - minimal, not card grid overload */}
          <div className="flex flex-wrap gap-3 pt-2">
            {[
              { label: 'Run Reconciliation', desc: 'Upload & match', to: '/datasets', icon: PlusCircle },
              { label: 'Investigations', desc: 'Triage exceptions', to: '/cases', icon: AlertTriangle },
              { label: 'AI Intelligence', desc: 'Natural language queries', to: '/copilot', icon: Sparkles },
            ].map(({ label, desc, to, icon: Icon }) => (
              <button
                key={to}
                onClick={() => navigate(to)}
                className="flex items-center gap-3 px-5 py-3.5 bg-white border border-slate-200/80 rounded-xl hover:border-blue-300 hover:shadow-sm transition-all text-left cursor-pointer group"
              >
                <Icon className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                <div>
                  <p className="text-sm font-semibold text-slate-900">{label}</p>
                  <p className="text-[11px] text-slate-500">{desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 ml-2 group-hover:text-blue-500" />
              </button>
            ))}
          </div>
        </>
      )}
    </PageContainer>
  );
}
