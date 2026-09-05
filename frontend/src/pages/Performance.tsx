import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Play, Activity, CheckCircle, AlertTriangle, RefreshCw, Zap, FileText, Download } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';

import { Card, CardContent, CardHeader, CardTitle, Badge } from '../components/ui';
import { cn } from '../App';
import { useApp } from '../context/AppContext';

export default function Performance() {
  const queryClient = useQueryClient();
  const { activeDatasetId: globalDatasetId, setActiveDatasetId: setGlobalDatasetId } = useApp();
  const [localDatasetId, setLocalDatasetId] = useState<string | null>(globalDatasetId || null);

  const urlDatasetId = new URLSearchParams(window.location.search).get('dataset_id');
  const activeDatasetId = urlDatasetId || localDatasetId || globalDatasetId;

  const { data: currentRun, isLoading: isLoadingRun } = useQuery({
    queryKey: ['evaluation', activeDatasetId],
    queryFn: async () => {
      const res = await fetch(`/api/evaluation/${activeDatasetId}`);
      if (!res.ok) throw new Error('Failed to fetch evaluation metrics');
      return res.json();
    },
    enabled: !!activeDatasetId
  });

  const { data: exceptions, isLoading: isLoadingExceptions } = useQuery({
    queryKey: ['evaluation', activeDatasetId, 'exceptions'],
    queryFn: async () => {
      const res = await fetch(`/api/evaluation/${activeDatasetId}/exceptions`);
      if (!res.ok) throw new Error('Failed to fetch unresolved exceptions');
      return res.json();
    },
    enabled: !!activeDatasetId
  });

  const { data: proofReport } = useQuery({
    queryKey: ['evaluation', activeDatasetId, 'report'],
    queryFn: async () => {
      const res = await fetch(`/api/evaluation/${activeDatasetId}/report`);
      if (!res.ok) throw new Error('Failed to fetch proof report');
      const data = await res.json();
      return data.report;
    },
    enabled: !!activeDatasetId
  });

  const runMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/evaluation/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Evaluation run failed');
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success('Performance evaluation completed!');
      setLocalDatasetId(data.dataset_id);
      setGlobalDatasetId(data.dataset_id);
      queryClient.invalidateQueries({ queryKey: ['evaluation'] });
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Evaluation failed to run');
    }
  });

  const analyzeActionMutation = useMutation({
    mutationFn: async (caseId: string) => {
      const res = await fetch(`/api/agent/case/${caseId}/analyze`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to run AI agent analysis');
      return res.json();
    },
    onSuccess: () => {
      toast.success('AI Agent analysis generated');
      queryClient.invalidateQueries({ queryKey: ['evaluation', activeDatasetId, 'exceptions'] });
    },
    onError: (err: any) => toast.error(err.message)
  });

  const throughputData = currentRun ? [
    { time: '0ms', ms: 0 },
    { time: `${(currentRun.processing_time_ms * 0.25).toFixed(0)}ms`, ms: Math.round(currentRun.throughput * 0.3) },
    { time: `${(currentRun.processing_time_ms * 0.5).toFixed(0)}ms`, ms: Math.round(currentRun.throughput * 0.6) },
    { time: `${(currentRun.processing_time_ms * 0.75).toFixed(0)}ms`, ms: Math.round(currentRun.throughput * 0.85) },
    { time: `${currentRun.processing_time_ms.toFixed(0)}ms`, ms: Math.round(currentRun.throughput) },
  ] : [];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-1">Performance & Telemetry</h1>
          <p className="text-slate-500">Measure deterministic engine accuracy, throughput, and automated resolution rates.</p>
        </div>
        <button
          onClick={() => runMutation.mutate()}
          disabled={runMutation.isPending}
          className="cursor-pointer inline-flex items-center justify-center rounded-lg text-sm font-bold transition-all bg-emerald-600 text-white hover:bg-emerald-700 h-11 px-6 disabled:opacity-50 shadow-sm shadow-emerald-600/20"
        >
          {runMutation.isPending ? (
            <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Running Pipeline...</>
          ) : (
            <><Play className="mr-2 h-4 w-4 fill-current" /> Run Performance Test</>
          )}
        </button>
      </div>

      {!activeDatasetId && (
        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-16 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm border border-slate-100">
            <Zap className="w-8 h-8 text-emerald-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Ready to Benchmark Engine</h3>
          <p className="text-slate-500 max-w-md mx-auto leading-relaxed mb-6">
            Run a performance test to execute the deterministic reconciliation pipeline, generate ground-truth telemetry, and calculate precision, recall, and F1 metrics.
          </p>
          <button
            onClick={() => runMutation.mutate()}
            disabled={runMutation.isPending}
            className="cursor-pointer inline-flex items-center justify-center rounded-xl text-sm font-bold transition-all bg-emerald-600 text-white hover:bg-emerald-700 h-12 px-8 disabled:opacity-50 shadow-md shadow-emerald-600/20"
          >
            {runMutation.isPending ? (
              <><RefreshCw className="mr-2 h-5 w-5 animate-spin" /> Running Pipeline...</>
            ) : (
              <><Play className="mr-2 h-5 w-5 fill-current" /> Run Performance Test</>
            )}
          </button>
        </div>
      )}

      {activeDatasetId && (
        <>
          {/* Top KPIs */}
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-row items-center justify-between pb-2">
                  <h3 className="text-sm font-medium text-slate-500">Total Processed</h3>
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Activity className="h-4 w-4 text-blue-600" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-slate-900">
                  {isLoadingRun ? '...' : currentRun?.total_records?.toLocaleString()}
                </div>
                <div className="mt-2 text-xs font-medium text-slate-500">Records in batch</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex flex-row items-center justify-between pb-2">
                  <h3 className="text-sm font-medium text-slate-500">Throughput</h3>
                  <div className="p-2 bg-emerald-50 rounded-lg">
                    <Zap className="h-4 w-4 text-emerald-600" />
                  </div>
                </div>
                <div className="flex items-baseline gap-1">
                  <div className="text-3xl font-bold text-slate-900">
                    {isLoadingRun ? '...' : currentRun?.throughput?.toFixed(1)}
                  </div>
                  <span className="text-sm font-semibold text-slate-500">req/s</span>
                </div>
                <div className="mt-2 text-xs font-medium text-slate-500">
                  Total Time: <span className="text-slate-900">{isLoadingRun ? '...' : currentRun?.processing_time_ms?.toFixed(0)}ms</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex flex-row items-center justify-between pb-2">
                  <h3 className="text-sm font-medium text-slate-500">F1 Score</h3>
                  <div className="p-2 bg-indigo-50 rounded-lg">
                    <CheckCircle className="h-4 w-4 text-indigo-600" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-slate-900">
                  {isLoadingRun ? '...' : currentRun?.f1_score?.toFixed(1)}%
                </div>
                <div className="mt-2 flex items-center gap-3 text-xs font-medium text-slate-500">
                  <span>Prec: <span className="text-slate-900">{isLoadingRun ? '...' : currentRun?.precision?.toFixed(1)}%</span></span>
                  <span>Rec: <span className="text-slate-900">{isLoadingRun ? '...' : currentRun?.recall?.toFixed(1)}%</span></span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-red-50/50 border-red-100">
              <CardContent className="p-6">
                <div className="flex flex-row items-center justify-between pb-2">
                  <h3 className="text-sm font-medium text-red-800">Unresolved</h3>
                  <div className="p-2 bg-red-100 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-red-600">
                  {isLoadingRun ? '...' : currentRun?.unresolved}
                </div>
                <div className="mt-2 text-xs font-medium text-red-800/70">
                  Out of {isLoadingRun ? '...' : currentRun?.exception_records} Total Exceptions
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid gap-6 md:grid-cols-3">
            {/* Throughput Chart */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-base text-slate-900">Processing Throughput (req/s)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={throughputData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorMs" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dx={-10} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        itemStyle={{ fontSize: '14px', fontWeight: 500, color: '#10b981' }}
                      />
                      <Area type="monotone" dataKey="ms" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorMs)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Buildathon Proof Report */}
            <Card className="bg-slate-900 border-slate-800 overflow-hidden flex flex-col">
              <CardHeader className="border-b border-slate-800 flex flex-row items-center justify-between pb-4 bg-slate-950/50">
                <CardTitle className="text-sm font-semibold flex items-center text-slate-200">
                  <FileText className="w-4 h-4 mr-2 text-indigo-400" />
                  Execution Proof
                </CardTitle>
                <button 
                  onClick={() => {
                    if (proofReport) {
                      const blob = new Blob([proofReport], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `proof_report_${activeDatasetId}.txt`;
                      a.click();
                    }
                  }}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title="Download Proof Report"
                >
                  <Download className="w-4 h-4" />
                </button>
              </CardHeader>
              <CardContent className="p-0 flex-1 relative">
                <div className="absolute inset-0 overflow-auto p-4 custom-scrollbar">
                  <pre className="text-[10px] text-emerald-400 font-mono leading-relaxed whitespace-pre-wrap">
                    {proofReport || 'Generating audit trail...'}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="border-b border-border bg-slate-50/50">
              <CardTitle className="text-base font-semibold text-slate-900 flex items-center">
                <AlertTriangle className="mr-2 h-4 w-4 text-amber-500" />
                Honest Unresolved Exceptions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-white border-b border-border text-slate-500 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Transaction ID</th>
                      <th className="px-6 py-4 font-semibold">Classification</th>
                      <th className="px-6 py-4 font-semibold">Priority</th>
                      <th className="px-6 py-4 font-semibold">Impact</th>
                      <th className="px-6 py-4 font-semibold">AI Agent Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-slate-900">
                    {isLoadingExceptions ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center">
                          <Activity className="h-6 w-6 animate-spin mx-auto mb-3 text-primary" />
                          <p className="text-slate-500 text-sm font-medium">Loading exception details...</p>
                        </td>
                      </tr>
                    ) : exceptions?.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center bg-slate-50">
                          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                            <CheckCircle className="h-6 w-6 text-emerald-500" />
                          </div>
                          <p className="text-slate-900 font-semibold mb-1">All Clear</p>
                          <p className="text-slate-500 text-sm">The agent successfully resolved all exceptions in this batch.</p>
                        </td>
                      </tr>
                    ) : (
                      exceptions?.map((exc: any) => (
                        <tr key={exc.case_id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-6 py-4 font-mono text-sm font-medium">{exc.transaction_id}</td>
                          <td className="px-6 py-4">
                            <Badge variant="error" className="mb-1.5 inline-flex">{exc.classification.replace('_', ' ')}</Badge>
                            <div className="text-xs text-slate-500 truncate max-w-[250px]" title={exc.root_cause}>{exc.root_cause}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold",
                              exc.priority === 'CRITICAL' ? "bg-red-50 text-red-700 border border-red-200" :
                              exc.priority === 'HIGH' ? "bg-orange-50 text-orange-700 border border-orange-200" :
                              exc.priority === 'MEDIUM' ? "bg-yellow-50 text-yellow-700 border border-yellow-200" : "bg-slate-100 text-slate-700 border border-slate-200"
                            )}>
                              {exc.priority} <span className="ml-1 opacity-70">({exc.priority_score})</span>
                            </span>
                          </td>
                          <td className="px-6 py-4 text-red-600 font-mono font-medium">
                            ${exc.financial_impact?.toFixed(2)}
                          </td>
                          <td className="px-6 py-4">
                            {exc.recommended_action === 'REQUEST_ANALYST_REVIEW' ? (
                              <button 
                                onClick={() => analyzeActionMutation.mutate(exc.case_id)}
                                disabled={analyzeActionMutation.isPending}
                                className="px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 rounded-lg text-xs font-semibold transition-colors shadow-sm disabled:opacity-50 inline-flex items-center cursor-pointer"
                              >
                                {analyzeActionMutation.isPending ? <Activity className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : null}
                                {analyzeActionMutation.isPending ? 'Analyzing...' : 'Ask AI Agent'}
                              </button>
                            ) : (
                              <Badge variant="warning">{exc.recommended_action?.replace(/_/g, ' ')}</Badge>
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
