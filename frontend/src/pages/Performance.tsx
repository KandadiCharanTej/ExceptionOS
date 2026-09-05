import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Play, Activity, CheckCircle, AlertTriangle, Clock, RefreshCw, Server } from 'lucide-react';
import toast from 'react-hot-toast';

import { Card, CardContent, CardHeader, CardTitle, Badge } from '../components/ui';
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
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white mb-1">Performance Operations</h2>
          <p className="text-slate-400">Measure deterministic engine accuracy, throughput, and agent resolution.</p>
        </div>
        <button
          onClick={() => runDemoMutation.mutate()}
          disabled={runDemoMutation.isPending}
          className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-bold transition-all bg-emerald-600 text-white hover:bg-emerald-500 h-12 px-6 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(16,185,129,0.3)]"
        >
          {runDemoMutation.isPending ? (
            <><RefreshCw className="mr-2 h-5 w-5 animate-spin" /> Running Demo...</>
          ) : (
            <><Play className="mr-2 h-5 w-5" /> Run 50+ Record Demo</>
          )}
        </button>
      </div>

      {!activeDatasetId && (
        <Card className="bg-slate-900/50 border-dashed border-[#1E293B]">
          <CardContent className="p-12 text-center flex flex-col items-center">
            <Server className="w-12 h-12 text-slate-500 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Active Evaluation Run</h3>
            <p className="text-slate-400 max-w-md">
              Click the "Run 50+ Record Demo" button above to generate a synthetic ground-truth dataset, run the deterministic reconciliation pipeline, and calculate performance metrics.
            </p>
          </CardContent>
        </Card>
      )}

      {activeDatasetId && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-gradient-to-br from-[#0A0F1C] to-[#0D1526] border-[#1E293B]">
              <CardContent className="p-6">
                <div className="flex flex-row items-center justify-between pb-2">
                  <h3 className="tracking-tight text-sm font-medium text-slate-400">Total Processed</h3>
                  <Activity className="h-4 w-4 text-blue-500" />
                </div>
                <div className="text-3xl font-bold text-white">
                  {isLoadingRun ? '...' : currentRun?.total_records}
                </div>
                <p className="text-xs text-slate-500 mt-1">Records in batch</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-[#0A0F1C] to-[#0D1526] border-[#1E293B]">
              <CardContent className="p-6">
                <div className="flex flex-row items-center justify-between pb-2">
                  <h3 className="tracking-tight text-sm font-medium text-slate-400">Throughput</h3>
                  <Clock className="h-4 w-4 text-emerald-500" />
                </div>
                <div className="text-3xl font-bold text-white">
                  {isLoadingRun ? '...' : currentRun?.throughput.toFixed(1)} <span className="text-xl font-medium text-slate-400">req/s</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Time: {isLoadingRun ? '...' : currentRun?.processing_time_ms.toFixed(0)} ms
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-[#0A0F1C] to-[#0D1526] border-[#1E293B]">
              <CardContent className="p-6">
                <div className="flex flex-row items-center justify-between pb-2">
                  <h3 className="tracking-tight text-sm font-medium text-slate-400">F1 Score</h3>
                  <CheckCircle className="h-4 w-4 text-indigo-500" />
                </div>
                <div className="text-3xl font-bold text-white">
                  {isLoadingRun ? '...' : currentRun?.f1_score.toFixed(1)}%
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Prec: {isLoadingRun ? '...' : currentRun?.precision.toFixed(1)}% | Rec: {isLoadingRun ? '...' : currentRun?.recall.toFixed(1)}%
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-[#0A0F1C] to-[#1a0f12] border-r-red-900/30 border-[#1E293B]">
              <CardContent className="p-6">
                <div className="flex flex-row items-center justify-between pb-2">
                  <h3 className="tracking-tight text-sm font-medium text-slate-400">Unresolved</h3>
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                </div>
                <div className="text-3xl font-bold text-red-500">
                  {isLoadingRun ? '...' : currentRun?.unresolved}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {isLoadingRun ? '...' : currentRun?.exception_records} Total Exceptions
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-red-900/30 bg-[#0A0F1C]">
            <CardHeader className="border-b border-[#1E293B] bg-slate-900/30">
              <CardTitle className="text-lg font-bold text-red-400 flex items-center">
                <AlertTriangle className="mr-2 h-5 w-5" />
                Honest Unresolved Exceptions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-300">
                  <thead className="text-xs text-slate-400 uppercase bg-[#1E293B]/50">
                    <tr>
                      <th className="px-6 py-4">Transaction ID</th>
                      <th className="px-6 py-4">Classification</th>
                      <th className="px-6 py-4">Priority</th>
                      <th className="px-6 py-4">Impact</th>
                      <th className="px-6 py-4">AI Agent Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E293B]">
                    {isLoadingExceptions ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                          <Activity className="h-5 w-5 animate-spin mx-auto mb-2" />
                          Loading exceptions...
                        </td>
                      </tr>
                    ) : exceptions?.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-emerald-500">
                          <CheckCircle className="h-8 w-8 mx-auto mb-2" />
                          All exceptions resolved!
                        </td>
                      </tr>
                    ) : (
                      exceptions?.map((exc: any) => (
                        <tr key={exc.case_id} className="hover:bg-[#1E293B]/30">
                          <td className="px-6 py-4 font-mono text-xs">{exc.transaction_id}</td>
                          <td className="px-6 py-4">
                            <Badge variant="error">{exc.classification.replace('_', ' ')}</Badge>
                            <div className="text-xs text-slate-500 mt-1 truncate max-w-[200px]">{exc.root_cause}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "font-bold",
                              exc.priority === 'CRITICAL' ? "text-red-500" :
                              exc.priority === 'HIGH' ? "text-orange-500" :
                              exc.priority === 'MEDIUM' ? "text-yellow-500" : "text-slate-400"
                            )}>
                              {exc.priority} ({exc.priority_score})
                            </span>
                          </td>
                          <td className="px-6 py-4 text-red-400 font-mono">
                            ${exc.financial_impact.toFixed(2)}
                          </td>
                          <td className="px-6 py-4">
                            {exc.recommended_action === 'REQUEST_ANALYST_REVIEW' ? (
                              <button 
                                onClick={() => analyzeActionMutation.mutate(exc.case_id)}
                                disabled={analyzeActionMutation.isPending}
                                className="px-3 py-1 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded text-xs hover:bg-indigo-600/40"
                              >
                                {analyzeActionMutation.isPending ? 'Analyzing...' : 'Ask AI Agent'}
                              </button>
                            ) : (
                              <Badge variant="warning">{exc.recommended_action.replace(/_/g, ' ')}</Badge>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
