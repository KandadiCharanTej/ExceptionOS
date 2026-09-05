import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Play, CheckCircle, AlertTriangle, RefreshCw, Database, Bot, UserCheck, FileText, ShieldCheck, Clock, Zap, BarChart3, Target } from 'lucide-react';
import toast from 'react-hot-toast';

import { Badge, PrimaryButton, LoadingState, ErrorState, PageContainer } from '../components/ui';
import { cn } from '../lib/utils';

export default function Demo() {
  const [selectedScenario, setSelectedScenario] = useState('50_records');
  const [activeDatasetId, setActiveDatasetId] = useState<string | null>(null);

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
      const json = await res.json();
      return json.report || json.proof_report;
    },
    enabled: !!activeDatasetId
  });

  const { data: aiHealth } = useQuery({
    queryKey: ['health', 'ai'],
    queryFn: async () => {
      const res = await fetch('http://127.0.0.1:8000/api/health/ai');
      if (!res.ok) throw new Error('Failed to fetch AI health');
      return res.json();
    }
  });

  const runDemoMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('http://127.0.0.1:8000/api/evaluation/run', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to run evaluation');
      return res.json();
    },
    onSuccess: (data) => {
      toast.success('Finance-Ops Loop evaluation finished successfully!');
      setActiveDatasetId(data.dataset_id);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Evaluation failed');
    }
  });

  const scenarios = [
    { id: '50_records', label: 'Normal', desc: 'Healthy reconciliation flow', icon: '✅' },
    { id: 'high_mismatch', label: 'Exception Spike', desc: 'High volume of discrepancies', icon: '⚠️' },
    { id: 'edge_cases', label: 'Settlement Delay', desc: 'Delayed bank settlements', icon: '⏱️' },
    { id: 'duplicates', label: 'Duplicate Investigation', desc: 'Duplicate transaction detection', icon: '🔁' },
  ];

  const pipelineSteps = [
    { icon: Database, label: 'Data Ingestion', color: 'text-blue-600 bg-blue-50 border-blue-200' },
    { icon: RefreshCw, label: '3-Way Reconciliation', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    { icon: AlertTriangle, label: 'Exception Detection', color: 'text-amber-600 bg-amber-50 border-amber-200' },
    { icon: Target, label: 'Priority Engine', color: 'text-red-600 bg-red-50 border-red-200' },
    { icon: Bot, label: 'Bounded AI Agent', color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
    { icon: UserCheck, label: 'Human Approval', color: 'text-purple-600 bg-purple-50 border-purple-200' },
    { icon: FileText, label: 'Audit Trail', color: 'text-slate-600 bg-slate-50 border-slate-200' },
  ];

  // Parse proof report into sections
  const parseProofReport = (raw: string) => {
    if (!raw) return null;
    const sections: { title: string; content: string }[] = [];
    const lines = raw.split('\n');
    let currentTitle = '';
    let currentContent: string[] = [];

    for (const line of lines) {
      if (line.startsWith('===') || line.trim() === '') continue;
      if (line === line.toUpperCase() && line.trim().length > 3 && !line.startsWith('-') && !line.startsWith(' ')) {
        if (currentTitle) {
          sections.push({ title: currentTitle, content: currentContent.join('\n').trim() });
        }
        currentTitle = line.trim();
        currentContent = [];
      } else {
        currentContent.push(line);
      }
    }
    if (currentTitle) {
      sections.push({ title: currentTitle, content: currentContent.join('\n').trim() });
    }
    return sections.length > 0 ? sections : null;
  };

  const reportSections = proofReport ? parseProofReport(proofReport) : null;

  return (
    <PageContainer className="space-y-12">
      {/* === HERO === */}
      <div className="pb-8 border-b border-slate-200/60">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-[11px] font-bold uppercase tracking-widest border border-purple-200">
                Razorpay AI Buildathon
              </div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Track 04</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
              ExceptionOS
            </h1>
            <p className="text-base font-semibold text-slate-600 mt-1">Live Finance Operations Demo</p>
            <p className="text-xs text-slate-500 mt-2 max-w-lg leading-relaxed">
              Watch a deterministic reconciliation engine detect exceptions, prioritize financial risk, and coordinate bounded AI assistance — processing 50+ synthetic records in a complete finance-ops loop.
            </p>
          </div>
        </div>
      </div>

      {/* === SCENARIO SELECTION === */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-6">Select Demo Scenario</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {scenarios.map(s => (
            <button
              key={s.id}
              onClick={() => setSelectedScenario(s.id)}
              className={cn(
                "p-6 rounded-2xl border-2 transition-all duration-300 text-left cursor-pointer hover:-translate-y-1",
                selectedScenario === s.id 
                  ? "bg-blue-50/50 border-blue-500 shadow-md ring-4 ring-blue-50" 
                  : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 hover:shadow-lg"
              )}
            >
              <div className="flex items-center gap-4 mb-3">
                <span className="text-2xl p-2 bg-white rounded-xl shadow-sm border border-slate-100 block">{s.icon}</span>
                <p className={cn("text-base font-bold", selectedScenario === s.id ? "text-blue-900" : "text-slate-900")}>
                  {s.label}
                </p>
              </div>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">{s.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-center mt-12 mb-12">
        <PrimaryButton
          onClick={() => runDemoMutation.mutate()}
          disabled={runDemoMutation.isPending}
          className={cn(
            "w-full md:w-3/5 py-5 text-lg font-bold rounded-2xl shadow-xl transition-all duration-300",
            runDemoMutation.isPending 
              ? "bg-slate-700 scale-95" 
              : "bg-emerald-600 hover:bg-emerald-500 hover:scale-[1.02] hover:shadow-emerald-500/30 ring-4 ring-emerald-50"
          )}
        >
          {runDemoMutation.isPending ? (
            <><RefreshCw className="mr-2.5 h-5 w-5 animate-spin" /> Running 50+ Record Finance-Ops Loop...</>
          ) : (
            <><Play className="mr-2.5 h-5 w-5 fill-current" /> Run Finance Ops Loop</>
          )}
        </PrimaryButton>
      </div>

      {activeDatasetId && (
        <div className="space-y-14 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
          {/* === PIPELINE VISUALIZATION === */}
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-6">Orchestration Pipeline</h2>
            <div className="bg-white rounded-2xl border border-slate-200/60 p-8 shadow-sm">
              <div className="flex flex-wrap justify-between items-center gap-3">
                {pipelineSteps.map((step, idx) => (
                  <div key={idx} className="flex items-center group">
                    <div className="flex flex-col items-center">
                      <div className={cn("w-12 h-12 rounded-xl border flex items-center justify-center mb-2 transition-all shadow-sm", step.color)}>
                        <step.icon className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 text-center max-w-[80px] leading-tight">
                        {step.label}
                      </span>
                    </div>
                    {idx < pipelineSteps.length - 1 && (
                      <div className="w-6 h-0.5 bg-emerald-300 -mt-6 mx-1 hidden md:block"></div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* === RESULTS METRICS === */}
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-6">Performance Results</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-5">
              <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Records</span>
                <p className="text-2xl font-extrabold text-slate-900 mt-2">{isLoadingRun ? '—' : currentRun?.total_records}</p>
              </div>
              <div className="bg-white rounded-xl border border-emerald-200/80 p-5 shadow-sm">
                <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-600">Match Rate</span>
                <p className="text-2xl font-extrabold text-emerald-600 mt-2">
                  {isLoadingRun ? '—' : `${((currentRun?.matched_records / currentRun?.total_records) * 100).toFixed(1)}%`}
                </p>
              </div>
              <div className="bg-white rounded-xl border border-red-200/60 p-5 shadow-sm">
                <span className="text-[11px] font-bold uppercase tracking-widest text-red-500">Exceptions</span>
                <p className="text-2xl font-extrabold text-red-600 mt-2">{isLoadingRun ? '—' : currentRun?.exception_records}</p>
              </div>
              <div className="bg-white rounded-2xl border border-indigo-200/60 p-6 shadow-sm hover:shadow-md transition-shadow">
                <span className="text-xs font-bold uppercase tracking-widest text-indigo-500">F1 Score</span>
                <p className="text-3xl font-extrabold text-indigo-600 mt-3">{isLoadingRun ? '—' : `${currentRun?.f1_score?.toFixed(1)}%`}</p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition-shadow">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Throughput</span>
                <p className="text-3xl font-extrabold text-slate-900 mt-3">{isLoadingRun ? '—' : `${currentRun?.throughput?.toFixed(0)}`}<span className="text-base font-semibold text-slate-400 ml-1.5">req/s</span></p>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* === EXCEPTIONS TABLE (2 cols) === */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  Honest Unresolved Exceptions
                </h2>
                <span className="text-sm text-slate-500 font-medium bg-slate-100 px-3 py-1 rounded-full">
                  Requires human or source-system investigation
                </span>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left text-slate-600">
                    <thead className="text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50/80 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4">Transaction</th>
                        <th className="px-6 py-4">Classification</th>
                        <th className="px-6 py-4">Priority</th>
                        <th className="px-6 py-4">Impact</th>
                        <th className="px-6 py-4">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {isLoadingExceptions ? (
                        <tr><td colSpan={5} className="p-10 text-center text-slate-500 text-sm">
                          <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-3 text-blue-600" />
                          Loading exceptions...
                        </td></tr>
                      ) : exceptions?.length === 0 ? (
                        <tr><td colSpan={5} className="p-10 text-center">
                          <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto mb-3" />
                          <p className="text-base font-semibold text-emerald-700">No unresolved exceptions</p>
                        </td></tr>
                      ) : (
                        exceptions?.map((exc: any) => (
                          <tr key={exc.case_id} className="hover:bg-slate-50/80 transition-colors group">
                            <td className="px-6 py-4 font-mono font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">{exc.transaction_id}</td>
                            <td className="px-6 py-4">
                              <Badge variant="error" className="py-1 px-2.5">{exc.classification.replace('_', ' ')}</Badge>
                            </td>
                            <td className="px-6 py-4">
                              <span className={cn(
                                "text-sm font-bold flex items-center gap-1.5",
                                exc.priority === 'CRITICAL' ? "text-red-600" :
                                exc.priority === 'HIGH' ? "text-amber-600" : "text-slate-500"
                              )}>
                                {exc.priority === 'CRITICAL' && <div className="w-1.5 h-1.5 rounded-full bg-red-600" />}
                                {exc.priority === 'HIGH' && <div className="w-1.5 h-1.5 rounded-full bg-amber-600" />}
                                {exc.priority}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-mono text-red-600 font-bold text-sm">
                              ${exc.financial_impact.toFixed(2)}
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
                                {exc.recommended_action?.replace(/_/g, ' ')}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* === RIGHT COLUMN: System Reliability + Proof === */}
            <div className="space-y-6">
              {/* System Reliability */}
              <div>
                <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4">System Reliability</h2>
                <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                        <span className="text-xs font-semibold text-slate-700">Deterministic Engine</span>
                      </div>
                      <Badge variant="success">ACTIVE</Badge>
                    </div>
                    <div className="w-full h-px bg-slate-100"></div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <CheckCircle className={cn("w-4 h-4", aiHealth?.status === 'AVAILABLE' ? "text-emerald-500" : "text-amber-500")} />
                        <span className="text-xs font-semibold text-slate-700">AI Service</span>
                      </div>
                      <Badge variant={aiHealth?.status === 'AVAILABLE' ? 'success' : 'warning'}>
                        {aiHealth?.status || 'CHECKING'}
                      </Badge>
                    </div>
                    <div className="w-full h-px bg-slate-100"></div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                        <span className="text-xs font-semibold text-slate-700">Human Approval</span>
                      </div>
                      <Badge variant="warning">REQUIRED</Badge>
                    </div>
                    <div className="w-full h-px bg-slate-100"></div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                        <span className="text-xs font-semibold text-slate-700">Audit Trail</span>
                      </div>
                      <Badge variant="success">ACTIVE</Badge>
                    </div>
                  </div>
                  <div className="px-5 py-3 bg-slate-50/60 border-t border-slate-100">
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      The AI is <span className="font-bold">not</span> the source of truth. The deterministic engine remains authoritative for all financial decisions.
                    </p>
                  </div>
                </div>
              </div>

              {/* Buildathon Proof */}
              <div>
                <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4">Buildathon Proof</h2>
                <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl shadow-slate-900/20">
                  {reportSections ? (
                    <div className="divide-y divide-slate-100">
                      {reportSections.map((section, idx) => (
                        <div key={idx} className="p-5 border-b border-slate-800 last:border-0">
                          <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">{section.title}</h4>
                          <pre className="text-sm text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">{section.content}</pre>
                        </div>
                      ))}
                    </div>
                  ) : proofReport ? (
                    <div className="p-5">
                      <pre className="text-sm text-slate-300 whitespace-pre-wrap font-mono leading-relaxed max-h-[400px] overflow-y-auto custom-scrollbar">{proofReport}</pre>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-sm text-slate-400">
                      <Zap className="w-6 h-6 mx-auto mb-3 text-slate-500 opacity-50" />
                      Proof report will generate after pipeline completion.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
