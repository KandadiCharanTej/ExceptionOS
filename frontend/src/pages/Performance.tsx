import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Play, Activity, CheckCircle, AlertTriangle, RefreshCw, Zap, Target } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader, Metric, Surface, PrimaryButton, Badge, SectionHeader, PageContainer } from '../components/ui';
import { cn } from '../lib/utils';

export default function Performance() {
  const queryClient = useQueryClient();
  const [activeDatasetId, setActiveDatasetId] = useState<string | null>(null);

  const { data: currentRun, isLoading: isLoadingRun } = useQuery({
    queryKey: ['evaluation', activeDatasetId],
    queryFn: async () => {
      const res = await fetch(`http://127.0.0.1:8000/api/evaluation/${activeDatasetId}`);
      if (!res.ok) throw new Error('Failed to fetch run data');
      return res.json();
    },
    enabled: !!activeDatasetId,
  });

  const { data: exceptions, isLoading: isLoadingExceptions } = useQuery({
    queryKey: ['evaluation', activeDatasetId, 'exceptions'],
    queryFn: async () => {
      const res = await fetch(`http://127.0.0.1:8000/api/evaluation/${activeDatasetId}/exceptions`);
      if (!res.ok) throw new Error('Failed to fetch exceptions');
      return res.json();
    },
    enabled: !!activeDatasetId,
  });

  const runMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('http://127.0.0.1:8000/api/evaluation/run', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to run evaluation');
      return res.json();
    },
    onSuccess: (data) => {
      toast.success('Evaluation complete');
      setActiveDatasetId(data.dataset_id);
      queryClient.invalidateQueries({ queryKey: ['performance'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const analyzeMutation = useMutation({
    mutationFn: async (caseId: string) => {
      const res = await fetch(`http://127.0.0.1:8000/api/agent/case/${caseId}/analyze`, { method: 'POST' });
      if (!res.ok) throw new Error('Analysis failed');
      return res.json();
    },
    onSuccess: () => {
      toast.success('Analysis generated');
      queryClient.invalidateQueries({ queryKey: ['evaluation', activeDatasetId, 'exceptions'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <PageContainer className="space-y-12">
      <PageHeader
        overline="System"
        title="System Performance Laboratory"
        description="Measure deterministic reconciliation accuracy, reliability, and throughput."
        actions={
          <PrimaryButton onClick={() => runMutation.mutate()} disabled={runMutation.isPending}>
            {runMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Run Performance Evaluation
          </PrimaryButton>
        }
      />

      {!activeDatasetId && (
        <Surface className="p-16 text-center max-w-lg mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-5">
            <Zap className="w-7 h-7 text-emerald-600" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">Ready to Benchmark</h3>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            Generate a synthetic dataset and benchmark precision, recall, F1 score, and throughput.
          </p>
          <PrimaryButton onClick={() => runMutation.mutate()} disabled={runMutation.isPending} className="mx-auto">
            <Play className="w-4 h-4" /> Run Evaluation Pipeline
          </PrimaryButton>
        </Surface>
      )}

      {activeDatasetId && (
        <>
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            <Metric label="Records Processed" value={isLoadingRun ? '—' : currentRun?.total_records} icon={Activity} size="compact" />
            <Metric label="Accuracy" value={isLoadingRun ? '—' : `${currentRun?.f1_score?.toFixed(1)}%`} variant="accent" icon={Target} size="compact" />
            <Metric label="Precision" value={isLoadingRun ? '—' : `${currentRun?.precision?.toFixed(1)}%`} size="compact" />
            <Metric label="Recall" value={isLoadingRun ? '—' : `${currentRun?.recall?.toFixed(1)}%`} size="compact" />
            <Metric label="F1 Score" value={isLoadingRun ? '—' : `${currentRun?.f1_score?.toFixed(1)}%`} variant="success" icon={Target} size="compact" />
            <Metric label="Throughput" value={isLoadingRun ? '—' : `${currentRun?.throughput?.toFixed(1)}`} subtitle="req/s" variant="accent" icon={Zap} size="compact" />
          </div>

          <div>
            <SectionHeader title="Unresolved Exceptions" description="Cases requiring human or source-system investigation." />
            <Surface className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                      <th className="px-6 py-4 text-left">Transaction</th>
                      <th className="px-6 py-4 text-left">Classification</th>
                      <th className="px-6 py-4 text-left">Priority</th>
                      <th className="px-6 py-4 text-left">Financial Impact</th>
                      <th className="px-6 py-4 text-left">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoadingExceptions ? (
                      <tr><td colSpan={5} className="p-12 text-center"><Activity className="w-5 h-5 animate-spin mx-auto text-blue-600" /></td></tr>
                    ) : !exceptions?.length ? (
                      <tr><td colSpan={5} className="p-12 text-center">
                        <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                        <p className="text-sm font-semibold text-emerald-700">All exceptions resolved</p>
                      </td></tr>
                    ) : (
                      exceptions.map((exc: any) => (
                        <tr key={exc.case_id} className="border-b border-slate-50 hover:bg-slate-50/80">
                          <td className="px-6 py-4 font-mono font-bold text-xs">{exc.transaction_id}</td>
                          <td className="px-6 py-4"><Badge variant="error" dot>{exc.classification.replace(/_/g, ' ')}</Badge></td>
                          <td className="px-6 py-4">
                            <span className={cn('text-xs font-bold',
                              exc.priority === 'CRITICAL' ? 'text-red-600' : exc.priority === 'HIGH' ? 'text-amber-600' : 'text-slate-500')}>
                              {exc.priority}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-mono text-red-600 text-xs font-semibold">${exc.financial_impact.toFixed(2)}</td>
                          <td className="px-6 py-4">
                            {exc.recommended_action === 'REQUEST_ANALYST_REVIEW' ? (
                              <button onClick={() => analyzeMutation.mutate(exc.case_id)} disabled={analyzeMutation.isPending}
                                className="px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold cursor-pointer">
                                Ask AI Agent
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-500">{exc.recommended_action?.replace(/_/g, ' ')}</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Surface>
          </div>
        </>
      )}
    </PageContainer>
  );
}
