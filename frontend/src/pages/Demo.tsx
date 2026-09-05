import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Play, Activity, CheckCircle, AlertTriangle, ShieldCheck, Download, Bot, UserCheck, Database, FileText, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

import { Card, CardContent, CardHeader, CardTitle, Badge } from '../components/ui';
import { cn } from '../App';

export default function Demo() {
  const [selectedScenario, setSelectedScenario] = useState<string>('NORMAL_RECONCILIATION');
  const [activeDatasetId, setActiveDatasetId] = useState<string | null>(null);

  const { data: aiHealth } = useQuery({
    queryKey: ['health', 'ai'],
    queryFn: async () => {
      const res = await fetch('http://127.0.0.1:8000/api/health/ai');
      return res.ok ? res.json() : { status: 'UNAVAILABLE' };
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

  const { data: proofReport } = useQuery({
    queryKey: ['evaluation', activeDatasetId, 'report'],
    queryFn: async () => {
      const res = await fetch(`http://127.0.0.1:8000/api/evaluation/${activeDatasetId}/report`);
      if (!res.ok) throw new Error('Failed to fetch report');
      const data = await res.json();
      return data.report;
    },
    enabled: !!activeDatasetId
  });

  const runDemoMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`http://127.0.0.1:8000/api/evaluation/run?scenario_type=${selectedScenario}`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to run evaluation');
      return res.json();
    },
    onSuccess: (data) => {
      toast.success('Finance Ops Loop completed successfully!');
      setActiveDatasetId(data.dataset_id);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Evaluation failed');
    }
  });

  const scenarios = [
    { id: 'NORMAL_RECONCILIATION', label: 'Normal Reconciliation' },
    { id: 'EXCEPTION_SPIKE', label: 'Exception Spike' },
    { id: 'SETTLEMENT_DELAY', label: 'Settlement Delay' },
    { id: 'DUPLICATE_INVESTIGATION', label: 'Duplicate Investigation' }
  ];

  const pipelineSteps = [
    { icon: Database, label: 'Data Ingestion' },
    { icon: Activity, label: '3-Way Reconciliation' },
    { icon: AlertTriangle, label: 'Exception Detection' },
    { icon: CheckCircle, label: 'Performance Evaluation' },
    { icon: ShieldCheck, label: 'Priority Engine' },
    { icon: Bot, label: 'Bounded AI Agent' },
    { icon: UserCheck, label: 'Human Approval' },
    { icon: FileText, label: 'Audit Trail' }
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold tracking-tight text-white mb-3">EXCEPTIONOS</h1>
        <h2 className="text-xl text-blue-400 font-medium tracking-widest uppercase">Finance Operations Demo</h2>
        <p className="text-slate-400 mt-4 max-w-2xl mx-auto">
          Razorpay AI Buildathon — Track 04
        </p>
      </div>

      <Card className="bg-[#0A0F1C] border-[#1E293B]">
        <CardContent className="p-8">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">Choose a Scenario</h3>
          <div className="flex flex-wrap gap-4 mb-8">
            {scenarios.map(s => (
              <button
                key={s.id}
                onClick={() => setSelectedScenario(s.id)}
                className={cn(
                  "px-6 py-3 rounded-lg font-medium transition-all text-sm border",
                  selectedScenario === s.id 
                    ? "bg-blue-600/20 text-blue-400 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.2)]" 
                    : "bg-[#1E293B]/50 text-slate-400 border-[#1E293B] hover:bg-[#1E293B] hover:text-slate-200"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="flex justify-center">
            <button
              onClick={() => runDemoMutation.mutate()}
              disabled={runDemoMutation.isPending}
              className="w-full md:w-1/2 cursor-pointer inline-flex items-center justify-center rounded-xl text-lg font-bold transition-all bg-emerald-600 text-white hover:bg-emerald-500 h-16 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_30px_rgba(16,185,129,0.3)]"
            >
              {runDemoMutation.isPending ? (
                <><RefreshCw className="mr-3 h-6 w-6 animate-spin" /> RUNNING PIPELINE...</>
              ) : (
                <><Play className="mr-3 h-6 w-6 fill-current" /> RUN FINANCE OPS LOOP</>
              )}
            </button>
          </div>
        </CardContent>
      </Card>

      {activeDatasetId && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          
          {/* Visual Pipeline */}
          <Card className="bg-[#0A0F1C] border-[#1E293B] overflow-hidden">
            <CardHeader className="border-b border-[#1E293B] bg-slate-900/50">
              <CardTitle className="text-lg">Orchestration Pipeline</CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="flex flex-wrap justify-center items-center gap-2 md:gap-4">
                {pipelineSteps.map((step, idx) => (
                  <div key={idx} className="flex items-center group">
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mb-2 group-hover:bg-blue-900/50 group-hover:border-blue-500/50 transition-colors">
                        <step.icon className="w-5 h-5 text-slate-400 group-hover:text-blue-400" />
                      </div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 text-center max-w-[80px] leading-tight">
                        {step.label}
                      </span>
                    </div>
                    {idx < pipelineSteps.length - 1 && (
                      <div className="w-4 md:w-8 h-[2px] bg-slate-800 -mt-6"></div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-3 gap-8">
            
            <div className="md:col-span-2 space-y-8">
              {/* Performance Metrics */}
              <Card className="bg-[#0A0F1C] border-[#1E293B]">
                <CardHeader className="border-b border-[#1E293B]">
                  <CardTitle className="text-lg flex items-center">
                    <Activity className="w-5 h-5 mr-2 text-blue-500" />
                    Performance Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Total Records</p>
                      <p className="text-2xl font-mono text-white">{isLoadingRun ? '-' : currentRun?.total_records}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Match Rate</p>
                      <p className="text-2xl font-mono text-white">
                        {isLoadingRun ? '-' : ((currentRun?.matched_records / currentRun?.total_records) * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Precision</p>
                      <p className="text-2xl font-mono text-emerald-400">{isLoadingRun ? '-' : currentRun?.precision.toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Recall</p>
                      <p className="text-2xl font-mono text-emerald-400">{isLoadingRun ? '-' : currentRun?.recall.toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">F1 Score</p>
                      <p className="text-2xl font-mono text-indigo-400">{isLoadingRun ? '-' : currentRun?.f1_score.toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Throughput</p>
                      <p className="text-2xl font-mono text-white">{isLoadingRun ? '-' : currentRun?.throughput.toFixed(1)} <span className="text-sm">/s</span></p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Processing Time</p>
                      <p className="text-2xl font-mono text-white">{isLoadingRun ? '-' : currentRun?.processing_time_ms.toFixed(0)} <span className="text-sm">ms</span></p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Unresolved Exceptions */}
              <Card className="bg-[#0A0F1C] border-[#1E293B]">
                <CardHeader className="border-b border-[#1E293B]">
                  <CardTitle className="text-lg flex items-center text-red-400">
                    <AlertTriangle className="w-5 h-5 mr-2" />
                    Honest Unresolved Exceptions
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <table className="w-full text-sm text-left text-slate-300">
                    <thead className="text-xs text-slate-400 uppercase bg-[#1E293B]/50">
                      <tr>
                        <th className="px-4 py-3">ID</th>
                        <th className="px-4 py-3">Classification</th>
                        <th className="px-4 py-3">Priority</th>
                        <th className="px-4 py-3">Impact</th>
                        <th className="px-4 py-3">AI Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1E293B]">
                      {isLoadingExceptions ? (
                        <tr><td colSpan={5} className="p-4 text-center text-slate-500">Loading...</td></tr>
                      ) : exceptions?.length === 0 ? (
                        <tr><td colSpan={5} className="p-4 text-center text-emerald-500">No unresolved exceptions</td></tr>
                      ) : (
                        exceptions?.map((exc: any) => (
                          <tr key={exc.case_id} className="hover:bg-[#1E293B]/30">
                            <td className="px-4 py-3 font-mono text-xs">{exc.transaction_id}</td>
                            <td className="px-4 py-3">
                              <span className="text-red-400 text-xs font-medium bg-red-400/10 px-2 py-1 rounded">
                                {exc.classification.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={cn(
                                "font-bold text-xs",
                                exc.priority === 'CRITICAL' ? "text-red-500" :
                                exc.priority === 'HIGH' ? "text-orange-500" :
                                exc.priority === 'MEDIUM' ? "text-yellow-500" : "text-slate-400"
                              )}>
                                {exc.priority}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-mono">${exc.financial_impact.toFixed(2)}</td>
                            <td className="px-4 py-3">
                              <span className="text-xs font-medium text-slate-300 bg-slate-800 px-2 py-1 rounded border border-slate-700">
                                {exc.recommended_action}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-8">
              {/* System Reliability */}
              <Card className="bg-[#0A0F1C] border-[#1E293B]">
                <CardHeader className="border-b border-[#1E293B]">
                  <CardTitle className="text-lg flex items-center">
                    <ShieldCheck className="w-5 h-5 mr-2 text-emerald-500" />
                    System Reliability
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-400">Deterministic Engine</span>
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">ACTIVE</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-400">AI Service</span>
                    <Badge className={cn(
                      aiHealth?.status === 'AVAILABLE' ? "bg-blue-500/20 text-blue-400 border-blue-500/30" :
                      aiHealth?.status === 'MOCK_MODE' ? "bg-amber-500/20 text-amber-400 border-amber-500/30" :
                      "bg-red-500/20 text-red-400 border-red-500/30"
                    )}>
                      {aiHealth?.status || 'CHECKING...'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-400">Audit Trail</span>
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">ACTIVE</Badge>
                  </div>
                  
                  {aiHealth?.status !== 'AVAILABLE' && (
                    <div className="mt-4 p-3 bg-red-900/20 border border-red-900/50 rounded-md text-xs text-red-400">
                      <strong>Note:</strong> AI services are {aiHealth?.status.toLowerCase()}. ExceptionOS deterministic reconciliation continues normally. AI gracefully degrades to safe defaults.
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Buildathon Proof Report */}
              <Card className="bg-black border-[#1E293B] shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                <CardHeader className="border-b border-[#1E293B] flex flex-row items-center justify-between pb-4">
                  <CardTitle className="text-lg flex items-center text-slate-300">
                    <FileText className="w-5 h-5 mr-2" />
                    Buildathon Proof Report
                  </CardTitle>
                  <button className="text-slate-500 hover:text-white transition-colors">
                    <Download className="w-4 h-4" />
                  </button>
                </CardHeader>
                <CardContent className="p-0">
                  <pre className="text-[10px] text-emerald-500/80 p-4 font-mono overflow-auto max-h-[300px] leading-tight whitespace-pre-wrap">
                    {proofReport || 'Generating...'}
                  </pre>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
