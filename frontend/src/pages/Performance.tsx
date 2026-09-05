import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Play, Activity, CheckCircle, AlertTriangle, Clock, RefreshCw, Server, Zap, Target, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

import { Badge, PrimaryButton, EmptyState, ErrorState } from '../components/ui';
import { cn } from '../App';

export default function Performance() {
  const queryClient = useQueryClient();
  const [activeDatasetId, setActiveDatasetId] = useState<string | null>(null);

  useQuery({
    queryKey: ['performance', 'summary'],
    queryFn: async () => {
      const res = await fetch('http://127.0.0.1:8000/api/performance/summary');
      if (!res.ok) throw new Error('Failed to fetch summary');
      return res.json();
    }
  });

  const { data: currentRun, isLoading: isLoadingRun } = useQuery({
    queryKey: ['evaluation', activeDatasetId],
    queryFn: async () => {
      const res = await fetch(`http://127.0.0.1:8000/api/evaluation/${activeDatasetId}`);
      if (!res.ok) throw new Error('Failed to fetch run data');
      return res.json();
    },
    enabled: !!activeDatasetId
  });

  const { data: exceptions, isLoading: isLoadingExceptions } = useQuery({
    queryKey: ['evaluation', activeDatasetId, 'exceptions'],
    queryFn: async () => {
      const res = await fetch(`http://127.0.0.1:8000/api/evaluation/${activeDatasetId}/exceptions`);
      if (!res.ok) throw new Error('Failed to fetch exceptions');
      return res.json();
    },
    enabled: !!activeDatasetId
  });

  const runDemoMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('http://127.0.0.1:8000/api/evaluation/run', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to run evaluation');
      return res.json();
    },
    onSuccess: (data) => {
      toast.success('Evaluation run completed!');
      setActiveDatasetId(data.dataset_id);
      queryClient.invalidateQueries({ queryKey: ['performance', 'summary'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Evaluation failed');
    }
  });

  const analyzeActionMutation = useMutation({
    mutationFn: async (caseId: string) => {
      const res = await fetch(`http://127.0.0.1:8000/api/agent/case/${caseId}/analyze`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to run agent analysis');
      return res.json();
    },
    onSuccess: () => {
      toast.success('Agent analysis generated');
      queryClient.invalidateQueries({ queryKey: ['evaluation', activeDatasetId, 'exceptions'] });
    },
    onError: (err: any) => toast.error(err.message)
  });

  return (
    <div className="space-y-10 max-w-7xl mx-auto pb-12">
      {/* === HEADER === */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-200/60">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 mb-1">System</p>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Performance Lab</h1>
          <p className="text-xs text-slate-500 mt-1">Measure deterministic reconciliation accuracy, reliability, and processing performance.</p>
        </div>
        <PrimaryButton
          onClick={() => runDemoMutation.mutate()}
          disabled={runDemoMutation.isPending}
          className="bg-emerald-600 hover:bg-emerald-700 shadow-md"
        >
          {runDemoMutation.isPending ? (
            <><RefreshCw className="w-4 h-4 animate-spin" /> Running Evaluation...</>
          ) : (
            <><Play className="w-4 h-4" /> Run Performance Evaluation</>
          )}
        </PrimaryButton>
      </div>

      {/* Empty state */}
      {!activeDatasetId && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200/80 p-10 shadow-sm text-center max-w-xl mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-4">
              <Zap className="w-7 h-7 text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Ready to Benchmark</h3>
            <p className="text-sm text-slate-500 leading-relaxed mb-6">
              Generate a reproducible synthetic dataset and benchmark the reconciliation engine's precision, recall, F1 score, and throughput.
            </p>
            <PrimaryButton
              onClick={() => runDemoMutation.mutate()}
              disabled={runDemoMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 mx-auto"
            >
              {runDemoMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Run Evaluation Pipeline
            </PrimaryButton>
          </div>
        </div>
      )}

      {activeDatasetId && (
        <>
          {/* === PERFORMANCE METRICS === */}
          <div className="grid gap-5 md:grid-cols-4">
            {/* Total Processed */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Total Processed</span>
                <div className="p-2 rounded-lg bg-blue-50 border border-blue-100">
                  <Activity className="h-4 w-4 text-blue-600" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {isLoadingRun ? '...' : currentRun?.total_records}
              </div>
              <p className="text-xs text-slate-500 mt-2">Batch records evaluated</p>
            </div>

            {/* F1 Score — Highlighted */}
            <div className="bg-white rounded-xl border-2 border-indigo-300 p-6 shadow-md">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold uppercase tracking-widest text-indigo-600">F1 Accuracy</span>
                <div className="p-2 rounded-lg bg-indigo-50 border border-indigo-100">
                  <Target className="h-4 w-4 text-indigo-600" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-indigo-600 tracking-tight">
                {isLoadingRun ? '...' : `${currentRun?.f1_score?.toFixed(1)}%`}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                P: {isLoadingRun ? '...' : `${currentRun?.precision?.toFixed(1)}%`} · R: {isLoadingRun ? '...' : `${currentRun?.recall?.toFixed(1)}%`}
              </p>
            </div>

            {/* Throughput — Highlighted */}
            <div className="bg-white rounded-xl border-2 border-emerald-300 p-6 shadow-md">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-600">Throughput</span>
                <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-100">
                  <Zap className="h-4 w-4 text-emerald-600" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-emerald-600 tracking-tight">
                {isLoadingRun ? '...' : `${currentRun?.throughput?.toFixed(1)}`}<span className="text-sm font-semibold text-slate-400 ml-1">req/s</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {isLoadingRun ? '...' : `${currentRun?.processing_time_ms?.toFixed(0)}ms`} processing time
              </p>
            </div>

            {/* Unresolved */}
            <div className="bg-white rounded-xl border border-red-200/60 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold uppercase tracking-widest text-red-500">Unresolved</span>
                <div className="p-2 rounded-lg bg-red-50 border border-red-100">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-red-600 tracking-tight">
                {isLoadingRun ? '...' : currentRun?.unresolved}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                of {isLoadingRun ? '...' : currentRun?.exception_records} total exceptions
              </p>
            </div>
          </div>

          {/* === UNRESOLVED EXCEPTIONS === */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  Honest Unresolved Exception List
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">These cases require human or source-system investigation.</p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-600">
                  <thead className="text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/80 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3.5">Transaction ID</th>
                      <th className="px-6 py-3.5">Classification</th>
                      <th className="px-6 py-3.5">Priority</th>
                      <th className="px-6 py-3.5">Financial Impact</th>
                      <th className="px-6 py-3.5">AI Agent Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isLoadingExceptions ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-10 text-center">
                          <Activity className="h-5 w-5 animate-spin mx-auto mb-2 text-blue-600" />
                          <p className="text-xs text-slate-500">Loading evaluation exceptions...</p>
                        </td>
                      </tr>
                    ) : exceptions?.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-10 text-center">
                          <CheckCircle className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                          <p className="text-sm font-semibold text-emerald-700">All exceptions resolved cleanly!</p>
                        </td>
                      </tr>
                    ) : (
                      exceptions?.map((exc: any) => (
                        <tr key={exc.case_id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-6 py-4 font-mono font-bold text-slate-900 text-xs">{exc.transaction_id}</td>
                          <td className="px-6 py-4">
                            <Badge variant="error">{exc.classification.replace('_', ' ')}</Badge>
                            {exc.root_cause && (
                              <p className="text-[11px] text-slate-500 mt-1 truncate max-w-[180px]">{exc.root_cause}</p>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "text-xs font-bold",
                              exc.priority === 'CRITICAL' ? "text-red-600" :
                              exc.priority === 'HIGH' ? "text-amber-600" :
                              exc.priority === 'MEDIUM' ? "text-indigo-600" : "text-slate-500"
                            )}>
                              {exc.priority}
                              {exc.priority_score !== undefined && (
                                <span className="text-slate-400 font-normal ml-1">({exc.priority_score})</span>
                              )}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-red-600 font-mono font-semibold text-xs">
                            ${exc.financial_impact.toFixed(2)}
                          </td>
                          <td className="px-6 py-4">
                            {exc.recommended_action === 'REQUEST_ANALYST_REVIEW' ? (
                              <button 
                                onClick={() => analyzeActionMutation.mutate(exc.case_id)}
                                disabled={analyzeActionMutation.isPending}
                                className="px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold hover:bg-indigo-100 transition-colors cursor-pointer"
                              >
                                {analyzeActionMutation.isPending ? 'Analyzing...' : 'Ask AI Agent'}
                              </button>
                            ) : (
                              <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                                {exc.recommended_action?.replace(/_/g, ' ')}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
