import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Play, CheckCircle, AlertTriangle, RefreshCw, Database, Bot, UserCheck, FileText, ShieldCheck, Clock, Zap, BarChart3, Target } from 'lucide-react';
import toast from 'react-hot-toast';

import { Badge, PrimaryButton, LoadingState, ErrorState } from '../components/ui';
import { cn } from '../App';

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
    <div className="space-y-10 max-w-7xl mx-auto pb-12">
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
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Select Demo Scenario</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {scenarios.map(s => (
            <button
              key={s.id}
              onClick={() => setSelectedScenario(s.id)}
              className={cn(
                "p-4 rounded-xl border-2 transition-all text-left cursor-pointer",
                selectedScenario === s.id 
                  ? "bg-blue-50 border-blue-400 shadow-sm" 
                  : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              )}
            >
              <span className="text-lg mb-2 block">{s.icon}</span>
              <p className={cn("text-sm font-bold", selectedScenario === s.id ? "text-blue-900" : "text-slate-900")}>
                {s.label}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">{s.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* === PRIMARY ACTION === */}
      <div className="flex justify-center">
        <PrimaryButton
          onClick={() => runDemoMutation.mutate()}
          disabled={runDemoMutation.isPending}
          className={cn(
            "w-full md:w-2/3 py-5 text-base shadow-lg transition-all",
            runDemoMutation.isPending 
              ? "bg-slate-700" 
              : "bg-emerald-600 hover:bg-emerald-700 hover:shadow-xl"
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
        <div className="space-y-10">
          {/* === PIPELINE VISUALIZATION === */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Orchestration Pipeline</h2>
            <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-sm">
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
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Performance Results</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
              <div className="bg-white rounded-xl border border-indigo-200/60 p-5 shadow-sm">
                <span className="text-[11px] font-bold uppercase tracking-widest text-indigo-500">F1 Score</span>
                <p className="text-2xl font-extrabold text-indigo-600 mt-2">{isLoadingRun ? '—' : `${currentRun?.f1_score?.toFixed(1)}%`}</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Throughput</span>
                <p className="text-2xl font-extrabold text-slate-900 mt-2">{isLoadingRun ? '—' : `${currentRun?.throughput?.toFixed(0)}`}<span className="text-sm font-semibold text-slate-400 ml-1">req/s</span></p>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* === EXCEPTIONS TABLE (2 cols) === */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  Honest Unresolved Exceptions
                </h2>
                <span className="text-xs text-slate-500 font-medium">
                  These cases require human or source-system investigation
                </span>
              </div>

              <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left text-slate-600">
                    <thead className="text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/80 border-b border-slate-200">
                      <tr>
                        <th className="px-5 py-3.5">Transaction</th>
                        <th className="px-5 py-3.5">Classification</th>
                        <th className="px-5 py-3.5">Priority</th>
                        <th className="px-5 py-3.5">Impact</th>
                        <th className="px-5 py-3.5">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {isLoadingExceptions ? (
                        <tr><td colSpan={5} className="p-8 text-center text-slate-500 text-xs">
                          <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-2 text-blue-600" />
                          Loading exceptions...
                        </td></tr>
                      ) : exceptions?.length === 0 ? (
                        <tr><td colSpan={5} className="p-8 text-center">
                          <CheckCircle className="h-6 w-6 text-emerald-500 mx-auto mb-2" />
                          <p className="text-sm font-semibold text-emerald-700">No unresolved exceptions</p>
                        </td></tr>
                      ) : (
                        exceptions?.map((exc: any) => (
                          <tr key={exc.case_id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-5 py-3.5 font-mono font-bold text-slate-900 text-xs">{exc.transaction_id}</td>
                            <td className="px-5 py-3.5">
                              <Badge variant="error">{exc.classification.replace('_', ' ')}</Badge>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className={cn(
                                "text-xs font-bold",
                                exc.priority === 'CRITICAL' ? "text-red-600" :
                                exc.priority === 'HIGH' ? "text-amber-600" : "text-slate-500"
                              )}>
                                {exc.priority}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 font-mono text-red-600 font-semibold text-xs">
                              ${exc.financial_impact.toFixed(2)}
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
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
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">System Reliability</h2>
                <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-sm">
                  <div className="p-5 space-y-3.5">
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
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Buildathon Proof</h2>
                <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-sm">
                  {reportSections ? (
                    <div className="divide-y divide-slate-100">
                      {reportSections.map((section, idx) => (
                        <div key={idx} className="p-4">
                          <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2">{section.title}</h4>
                          <pre className="text-xs text-slate-700 whitespace-pre-wrap font-mono leading-relaxed">{section.content}</pre>
                        </div>
                      ))}
                    </div>
                  ) : proofReport ? (
                    <div className="p-4">
                      <pre className="text-xs text-slate-700 whitespace-pre-wrap font-mono leading-relaxed max-h-[300px] overflow-y-auto">{proofReport}</pre>
                    </div>
                  ) : (
                    <div className="p-6 text-center text-xs text-slate-500">
                      <Zap className="w-5 h-5 mx-auto mb-2 text-slate-400" />
                      Proof report will generate after pipeline completion.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
