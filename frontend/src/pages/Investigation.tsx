import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeft, BrainCircuit, History, CheckCircle, Clock, 
  AlertCircle, Activity, FileText, List, Shield, Lightbulb, Edit3, Tag, Save, Columns, Bot, Sparkles, ShieldCheck
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { 
  getCase, getCaseHistory, resolveCase, verifyResolution, updateAnnotations, explainCase
} from '../services/api';
import type { 
  ResolveActionResponse, VerificationResponse 
} from '../types/api';
import { Card, CardContent, CardHeader, CardTitle, Badge, StatusBadge } from '../components/ui';
import { cn } from '../App';

export default function Investigation() {
  const { caseId } = useParams<{ caseId: string }>();
  const [searchParams] = useSearchParams();
  const datasetId = searchParams.get('dataset_id') || undefined;
  const navigate = useNavigate();
  const [explainModalOpen, setExplainModalOpen] = useState(false);

  const queryClient = useQueryClient();
  
  const [actionInput, setActionInput] = useState('');
  const [resolveResult, setResolveResult] = useState<ResolveActionResponse | null>(null);
  const [verifyResult, setVerifyResult] = useState<VerificationResponse | null>(null);

  // Annotation State
  const [notes, setNotes] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [analystClassification, setAnalystClassification] = useState('');
  const [isEditingAnnotations, setIsEditingAnnotations] = useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['case', caseId, datasetId],
    queryFn: () => getCase(caseId!, datasetId),
    enabled: !!caseId,
  });

  const { data: historyData, refetch: refetchHistory, isLoading: historyLoading } = useQuery({
    queryKey: ['caseHistory', caseId, datasetId],
    queryFn: () => getCaseHistory(caseId!, datasetId),
    enabled: !!caseId,
  });

  useEffect(() => {
    if (data && !isEditingAnnotations) {
      setNotes(data.notes || '');
      setTagsInput((data.tags || []).join(', '));
      setAnalystClassification(data.analyst_classification || '');
      if (data.resolution_recommendation.recommended_action !== 'None' && !actionInput) {
        setActionInput(`Applied recommendation: ${data.resolution_recommendation.recommended_action}`);
      }
    }
  }, [data, isEditingAnnotations]);

  const resolveMutation = useMutation({
    mutationFn: () => resolveCase(caseId!, actionInput, 'Admin User', datasetId),
    onSuccess: (res) => {
      setResolveResult(res);
      setVerifyResult(null);
      refetchHistory();
      toast.success('Action recorded successfully');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to record resolution')
  });

  const verifyMutation = useMutation({
    mutationFn: () => verifyResolution(caseId!, datasetId),
    onSuccess: (res) => {
      setVerifyResult(res);
      refetchHistory();
      if (res.status === 'VERIFIED_RESOLVED') toast.success('Verification successful');
      else toast.error('Verification failed');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to verify resolution')
  });

  const annotationsMutation = useMutation({
    mutationFn: () => updateAnnotations(caseId!, {
      notes,
      tags: tagsInput.split(',').map(t => t.trim()).filter(Boolean),
      analyst_classification: analystClassification || undefined
    }, datasetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case', caseId, datasetId] });
      refetchHistory();
      toast.success('Annotations saved');
      setIsEditingAnnotations(false);
    },
    onError: (err: any) => toast.error(err.message || 'Failed to save annotations')
  });

  const explainMutation = useMutation({
    mutationFn: () => explainCase(caseId!),
    onSuccess: () => {},
    onError: (err: any) => {
      if (err.response?.status === 503) {
        toast.error('⚠️ AI service temporarily unavailable. Please try again.');
      } else {
        const errDetail = err.response?.data?.detail || err.message;
        toast.error(`Failed to generate AI explanation: ${errDetail}`);
      }
      setExplainModalOpen(false);
    }
  });

  if (isLoading || historyLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)]">
        <Activity className="h-10 w-10 text-blue-500 animate-spin mb-4" />
        <p className="text-slate-400 font-medium">Initializing Investigation Workspace...</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="bg-red-500/10 text-red-400 p-6 rounded-xl border border-red-500/20 max-w-3xl mx-auto mt-12 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Investigation Error</h3>
        <p className="text-slate-400 mb-6">{(error as Error)?.message || 'Case not found'}</p>
        <button onClick={() => navigate('/cases')} className="px-6 py-2 bg-[#1E293B] hover:bg-slate-700 text-white rounded-md transition-colors cursor-pointer">
          Return to Queue
        </button>
      </div>
    );
  }

  const history = historyData?.events || [];

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => navigate(`/cases${datasetId ? `?dataset_id=${datasetId}` : ''}`)}
            className="p-2 rounded-full hover:bg-[#1E293B] transition-colors text-slate-400 hover:text-white cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center space-x-3 mb-1">
              <h2 className="text-2xl font-bold tracking-tight text-white font-mono">{data.case_id}</h2>
              <Badge variant="outline" className="border-slate-700 bg-slate-900">{data.classification.replace('_', ' ')}</Badge>
              {data.analyst_classification && (
                <Badge variant="secondary" className="bg-purple-900/40 text-purple-400 border-purple-900/50">
                  Override: {data.analyst_classification.replace('_', ' ')}
                </Badge>
              )}
              <StatusBadge status={data.root_cause.status} />
            </div>
            <p className="text-slate-400 text-sm">Exception Intelligence Workspace</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Badge variant="secondary" className="px-3 py-1">
            <Shield className="w-3 h-3 mr-2 text-indigo-400" />
            Deterministic Analysis Complete
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        <div className="xl:col-span-1 space-y-6">
          <Card className="bg-[#0A0F1C] border-[#1E293B]">
            <CardHeader className="bg-[#1E293B]/30 pb-4 border-b border-[#1E293B] flex flex-row items-center justify-between">
              <CardTitle className="flex items-center text-xs uppercase tracking-widest text-slate-400 font-semibold">
                <Edit3 className="h-4 w-4 mr-2 text-purple-400" />
                Analyst Annotations
              </CardTitle>
              {!isEditingAnnotations ? (
                <button onClick={() => setIsEditingAnnotations(true)} className="text-xs text-blue-400 hover:text-blue-300 font-medium cursor-pointer">
                  Edit
                </button>
              ) : (
                <button onClick={() => annotationsMutation.mutate()} disabled={annotationsMutation.isPending} className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center cursor-pointer disabled:opacity-50">
                  {annotationsMutation.isPending ? <Activity className="w-3 h-3 mr-1 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
                  Save
                </button>
              )}
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Analyst Override Classification</label>
                  {isEditingAnnotations ? (
                    <select 
                      value={analystClassification}
                      onChange={(e) => setAnalystClassification(e.target.value)}
                      className="w-full bg-[#05080F] border border-[#1E293B] text-slate-200 rounded-md text-sm px-3 py-2 focus:outline-none focus:border-blue-500"
                    >
                      <option value="">No Override</option>
                      <option value="matched">Matched (False Positive)</option>
                      <option value="missing_in_ledger">Missing in Ledger</option>
                      <option value="missing_in_gateway">Missing in Gateway</option>
                      <option value="missing_in_bank">Missing in Bank</option>
                      <option value="amount_mismatch">Amount Mismatch</option>
                      <option value="date_mismatch">Date Mismatch</option>
                      <option value="duplicate_detected">Duplicate</option>
                      <option value="system_error">System Error</option>
                    </select>
                  ) : (
                    <div className="text-sm text-slate-300">{data.analyst_classification ? data.analyst_classification.replace('_', ' ') : <span className="text-slate-600 italic">None</span>}</div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Investigation Notes</label>
                  {isEditingAnnotations ? (
                    <textarea 
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      className="w-full bg-[#05080F] border border-[#1E293B] text-slate-200 rounded-md text-sm px-3 py-2 focus:outline-none focus:border-blue-500 resize-none"
                      placeholder="Add case notes..."
                    />
                  ) : (
                    <div className="text-sm text-slate-300 whitespace-pre-wrap">{data.notes || <span className="text-slate-600 italic">No notes</span>}</div>
                  )}
                </div>
                <div>
                  <label className="flex items-center text-xs font-medium text-slate-500 mb-1">
                    <Tag className="w-3 h-3 mr-1" /> Tags
                  </label>
                  {isEditingAnnotations ? (
                    <input 
                      type="text" 
                      value={tagsInput}
                      onChange={(e) => setTagsInput(e.target.value)}
                      className="w-full bg-[#05080F] border border-[#1E293B] text-slate-200 rounded-md text-sm px-3 py-2 focus:outline-none focus:border-blue-500"
                      placeholder="Comma separated (e.g. urgent, manual-review)"
                    />
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {data.tags && data.tags.length > 0 ? (
                        data.tags.map((tag, i) => <Badge key={i} variant="secondary" className="text-xs py-0 h-5">{tag}</Badge>)
                      ) : (
                        <span className="text-sm text-slate-600 italic">No tags</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#0A0F1C] border-[#1E293B]">
            <CardHeader className="bg-[#1E293B]/30 pb-4 border-b border-[#1E293B]">
              <CardTitle className="flex items-center text-xs uppercase tracking-widest text-slate-400 font-semibold">
                <Clock className="h-4 w-4 mr-2 text-blue-400" />
                Evidence Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="relative border-l border-[#1E293B] ml-3 space-y-8">
                {data.timeline.map((event, idx) => (
                  <div key={idx} className="relative pl-6">
                    <div className={cn("absolute -left-[5px] top-1.5 h-2 w-2 rounded-full ring-4 ring-[#0A0F1C]",
                      event.event_type.includes('exception') ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]' : 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]'
                    )} />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{event.source}</span>
                      <span className="text-sm font-medium text-slate-200">{event.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#0A0F1C] border-[#1E293B]">
            <CardHeader className="bg-[#1E293B]/30 pb-4 border-b border-[#1E293B]">
              <CardTitle className="flex items-center text-xs uppercase tracking-widest text-slate-400 font-semibold">
                <List className="h-4 w-4 mr-2 text-slate-500" />
                Investigation Audit Trail
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {history.length > 0 ? (
                <div className="relative border-l border-[#1E293B] ml-3 space-y-6">
                  {history.map((event, idx) => (
                    <div key={idx} className="relative pl-6">
                      <div className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full ring-4 ring-[#0A0F1C] bg-slate-600" />
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                          {event.event_type.replace(/_/g, ' ')}
                        </span>
                        <span className="text-sm text-slate-300">
                          {event.description}
                        </span>
                        <span className="text-xs text-slate-500 mt-1">
                          {new Date(event.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No activity recorded yet.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="xl:col-span-2 space-y-6">
          <Card className="bg-[#0A0F1C] border-[#1E293B]">
            <CardHeader className="bg-[#1E293B]/30 pb-4 border-b border-[#1E293B]">
              <CardTitle className="flex items-center text-xs uppercase tracking-widest text-slate-400 font-semibold">
                <Columns className="h-4 w-4 mr-2 text-emerald-400" />
                3-Way Transaction Comparison
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 px-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-[#1E293B]/50 border-b border-[#1E293B] text-slate-400">
                    <tr>
                      <th className="px-6 py-3 font-medium">Field</th>
                      <th className="px-6 py-3 font-medium text-blue-400">Ledger</th>
                      <th className="px-6 py-3 font-medium text-emerald-400">Gateway</th>
                      <th className="px-6 py-3 font-medium text-indigo-400">Bank</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E293B] text-slate-300">
                    <tr className="hover:bg-[#1E293B]/30">
                      <td className="px-6 py-3 font-medium text-slate-400">Transaction ID</td>
                      <td className="px-6 py-3 font-mono text-xs">{data.transactions.ledger?.key || '-'}</td>
                      <td className="px-6 py-3 font-mono text-xs">{data.transactions.gateway?.key || '-'}</td>
                      <td className="px-6 py-3 font-mono text-xs">{data.transactions.bank?.key || '-'}</td>
                    </tr>
                    <tr className="hover:bg-[#1E293B]/30">
                      <td className="px-6 py-3 font-medium text-slate-400">Amount</td>
                      <td className={cn("px-6 py-3 font-mono", !data.transactions.ledger ? "text-slate-500" : "text-white")}>
                        {data.transactions.ledger ? `${data.transactions.ledger.currency} ${data.transactions.ledger.amount.toFixed(2)}` : 'Missing'}
                      </td>
                      <td className={cn("px-6 py-3 font-mono", !data.transactions.gateway ? "text-slate-500" : "text-white")}>
                        {data.transactions.gateway ? `${data.transactions.gateway.currency} ${data.transactions.gateway.amount.toFixed(2)}` : 'Missing'}
                      </td>
                      <td className={cn("px-6 py-3 font-mono", !data.transactions.bank ? "text-slate-500" : "text-white")}>
                        {data.transactions.bank ? `${data.transactions.bank.currency} ${data.transactions.bank.amount.toFixed(2)}` : 'Missing'}
                      </td>
                    </tr>
                    <tr className="hover:bg-[#1E293B]/30">
                      <td className="px-6 py-3 font-medium text-slate-400">Date</td>
                      <td className="px-6 py-3">{data.transactions.ledger?.date || '-'}</td>
                      <td className="px-6 py-3">{data.transactions.gateway?.date || '-'}</td>
                      <td className="px-6 py-3">{data.transactions.bank?.date || '-'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#0A0F1C] to-[#0D1526] border-blue-900/50 shadow-xl shadow-blue-900/10">
            <CardHeader className="bg-blue-900/10 pb-4 border-b border-blue-900/30">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center text-blue-400 text-sm tracking-widest uppercase">
                  <BrainCircuit className="h-5 w-5 mr-2 text-blue-500" />
                  Deterministic Root Cause Analysis
                </CardTitle>
                <div className="flex items-center space-x-3">
                  <div className="bg-[#0A0F1C] px-3 py-1 rounded-full border border-[#1E293B] flex items-center">
                    <span className="text-xs font-semibold text-slate-400 mr-2">Confidence Match</span>
                    <div className="flex items-center">
                      <span className="text-sm font-bold text-blue-400 mr-2">{data.root_cause.confidence_score}%</span>
                      <div className="w-16 h-1.5 bg-[#1E293B] rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" style={{ width: `${data.root_cause.confidence_score}%` }} />
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setExplainModalOpen(true);
                      if (!explainMutation.data && !explainMutation.isPending) {
                        explainMutation.mutate();
                      }
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 rounded-full h-8 text-xs px-3 shadow-[0_0_10px_rgba(79,70,229,0.3)] cursor-pointer"
                  >
                    <Bot className="h-3 w-3" />
                    Ask AI to Explain
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {explainModalOpen && (
                <div className="mb-8 p-5 rounded-xl bg-slate-900/80 border border-indigo-900/50 shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                  <div className="flex justify-between items-center mb-5 relative z-10">
                    <h4 className="font-semibold text-indigo-400 flex items-center gap-2 text-sm tracking-wide uppercase">
                      <Sparkles className="h-4 w-4" />
                      AI Copilot Explanation
                    </h4>
                    <button onClick={() => setExplainModalOpen(false)} className="text-slate-500 hover:text-slate-300 transition-colors">
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                  </div>
                  
                  {explainMutation.isPending ? (
                    <div className="flex items-center gap-3 text-slate-400 py-6">
                      <div className="animate-spin h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full" />
                      <span className="text-sm">Analyzing deterministic evidence...</span>
                    </div>
                  ) : explainMutation.data ? (
                    <div className="space-y-5 relative z-10">
                      {explainMutation.data.response_mode === 'insufficient_data' ? (
                        <div className="bg-slate-900/50 p-6 rounded-lg border border-amber-900/30">
                          <h4 className="text-sm font-semibold text-amber-400 mb-2 flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5" />
                            Not enough verified data yet
                          </h4>
                          <p className="text-sm text-slate-300 leading-relaxed">{explainMutation.data.answer}</p>
                        </div>
                      ) : (
                        <>
                          <div className="bg-slate-950/80 p-4 rounded-lg border border-slate-800">
                            <h5 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                              <ShieldCheck className="h-4 w-4" /> Verified Facts
                            </h5>
                            <ul className="list-disc list-inside space-y-1 text-sm text-slate-300">
                              {explainMutation.data.verified_facts.map((f, i) => <li key={i}>{f}</li>)}
                            </ul>
                          </div>
                          
                          <div className="px-2">
                            <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                              {explainMutation.data.answer}
                            </p>
                          </div>
                          
                          {explainMutation.data.recommendations.length > 0 && (
                            <div className="bg-indigo-950/20 p-4 rounded-lg border border-indigo-900/30">
                              <h5 className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <Activity className="h-4 w-4" />
                                Recommendations
                              </h5>
                              <ul className="list-disc list-inside space-y-1 text-sm text-slate-300">
                                {explainMutation.data.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                              </ul>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="text-red-400 text-sm py-4">Explanation failed to generate.</div>
                  )}
                </div>
              )}
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-white capitalize mb-3 tracking-tight">
                  {data.root_cause.cause ? data.root_cause.cause.replace(/_/g, ' ') : 'No Exception'}
                </h3>
                <p className="text-slate-300 text-base leading-relaxed">{data.root_cause.explanation}</p>
              </div>

              <div className="bg-[#05080F] rounded-xl p-5 border border-[#1E293B]">
                <h4 className="text-xs font-bold text-slate-500 mb-4 uppercase tracking-widest">Validated Evidence Factors</h4>
                <ul className="space-y-3">
                  {data.root_cause.supporting_evidence.map((ev, idx) => (
                    <li key={idx} className="flex items-start bg-[#1E293B]/20 p-3 rounded-lg border border-[#1E293B]/50">
                      <CheckCircle className="h-5 w-5 text-emerald-500 mr-3 shrink-0" />
                      <span className="text-sm text-slate-200">{ev}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#0A0F1C] border-[#1E293B]">
            <CardHeader className="bg-[#1E293B]/30 pb-4 border-b border-[#1E293B]">
              <CardTitle className="flex items-center text-xs uppercase tracking-widest text-slate-400 font-semibold">
                <Shield className="h-4 w-4 mr-2 text-indigo-400" />
                Action Center
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="bg-indigo-900/10 border border-indigo-900/30 rounded-xl p-5 mb-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-3 flex items-center">
                  <Lightbulb className="w-4 h-4 mr-2" />
                  Recommended Resolution
                </h4>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg font-bold text-white tracking-tight">
                    {data.resolution_recommendation.recommended_action.replace(/_/g, ' ').toUpperCase()}
                  </span>
                  {data.resolution_recommendation.requires_human_approval ? (
                    <Badge variant="warning">Requires Approval</Badge>
                  ) : (
                    <Badge variant="success">Auto-Verifiable</Badge>
                  )}
                </div>
                <p className="text-sm text-indigo-200/70">{data.resolution_recommendation.explanation}</p>
              </div>

              {!resolveResult ? (
                <div className="space-y-4 bg-[#05080F] p-5 rounded-xl border border-[#1E293B]">
                  <label className="block text-sm font-semibold text-slate-300">Execute Resolution Protocol</label>
                  <div className="flex space-x-3">
                    <input 
                      type="text" 
                      value={actionInput}
                      onChange={(e) => setActionInput(e.target.value)}
                      className="flex-1 bg-[#0A0F1C] border border-[#1E293B] text-slate-200 rounded-md px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                      placeholder="Enter resolution notes or command..."
                    />
                    <button
                      onClick={() => resolveMutation.mutate()}
                      disabled={resolveMutation.isPending || !actionInput}
                      className="inline-flex items-center justify-center rounded-md text-sm font-bold transition-all bg-blue-600 text-white hover:bg-blue-500 px-6 py-2.5 disabled:opacity-50 shadow-[0_0_15px_rgba(37,99,235,0.2)] cursor-pointer"
                    >
                      {resolveMutation.isPending ? <Activity className="h-4 w-4 animate-spin" /> : 'Record Action'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-emerald-900/10 border border-emerald-900/30 rounded-xl p-5 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-emerald-500 mb-1 tracking-widest uppercase">Action Recorded</h4>
                      <p className="text-sm font-medium text-emerald-100">"{resolveResult.action_taken}"</p>
                    </div>
                    <CheckCircle className="h-6 w-6 text-emerald-500" />
                  </div>

                  {!verifyResult ? (
                    <div className="flex justify-end border-t border-[#1E293B] pt-6">
                      <button
                        onClick={() => verifyMutation.mutate()}
                        disabled={verifyMutation.isPending}
                        className="inline-flex items-center justify-center rounded-md text-sm font-bold transition-all bg-indigo-600 text-white hover:bg-indigo-500 px-8 py-3 disabled:opacity-50 shadow-[0_0_15px_rgba(79,70,229,0.3)] cursor-pointer"
                      >
                        {verifyMutation.isPending ? <Activity className="h-5 w-5 animate-spin mr-2" /> : <Shield className="h-5 w-5 mr-2" />}
                        Verify Resolution State
                      </button>
                    </div>
                  ) : (
                    <div className={cn("border rounded-xl p-5 flex items-start space-x-4",
                      verifyResult.status === 'VERIFIED_RESOLVED' 
                        ? 'bg-emerald-900/10 border-emerald-900/30' 
                        : 'bg-amber-900/10 border-amber-900/30'
                    )}>
                      {verifyResult.status === 'VERIFIED_RESOLVED' ? (
                        <CheckCircle className="h-8 w-8 text-emerald-500 shrink-0" />
                      ) : (
                        <AlertCircle className="h-8 w-8 text-amber-500 shrink-0" />
                      )}
                      <div>
                        <h4 className={cn("text-base font-bold tracking-tight mb-1", verifyResult.status === 'VERIFIED_RESOLVED' ? 'text-emerald-400' : 'text-amber-400')}>
                          {verifyResult.status.replace('_', ' ')}
                        </h4>
                        <p className={cn("text-sm", verifyResult.status === 'VERIFIED_RESOLVED' ? 'text-emerald-200/70' : 'text-amber-200/70')}>
                          {verifyResult.explanation}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {data.similar_cases.length > 0 && (
              <Card className="bg-[#0A0F1C] border-[#1E293B]">
                <CardHeader className="bg-[#1E293B]/30 pb-4 border-b border-[#1E293B]">
                  <CardTitle className="flex items-center text-xs uppercase tracking-widest text-slate-400 font-semibold">
                    <History className="h-4 w-4 mr-2 text-indigo-400" />
                    Exception Memory
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {data.similar_cases.map((sim, idx) => (
                      <div key={idx} className="bg-[#05080F] border border-[#1E293B] rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-mono text-xs font-bold text-slate-300">{sim.remembered_case.case_id}</span>
                          <span className="text-xs font-bold text-indigo-400">{sim.similarity_score}% Match</span>
                        </div>
                        <div className="space-y-2 mb-3">
                          <div className="flex justify-between">
                            <span className="text-xs text-slate-500 uppercase">Root Cause</span>
                            <span className="text-xs font-medium text-slate-300 capitalize">{sim.remembered_case.root_cause.replace('_', ' ')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-xs text-slate-500 uppercase">Resolution</span>
                            <span className="text-xs font-medium text-slate-300 capitalize">{sim.remembered_case.resolution_action.replace('_', ' ')}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="bg-[#0A0F1C] border-[#1E293B]">
              <CardHeader className="bg-[#1E293B]/30 pb-4 border-b border-[#1E293B]">
                <CardTitle className="text-xs uppercase tracking-widest text-slate-400 font-semibold flex items-center">
                  <FileText className="h-4 w-4 mr-2 text-slate-500" />
                  Rejected Hypotheses
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {data.root_cause.alternative_hypotheses.length > 0 ? (
                    data.root_cause.alternative_hypotheses.map((hyp, idx) => (
                      <div key={idx} className="bg-[#05080F] border border-[#1E293B] rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-bold text-slate-300 capitalize">{hyp.hypothesis_type.replace(/_/g, ' ')}</span>
                          <span className="text-xs font-mono text-slate-500">{hyp.confidence_score}%</span>
                        </div>
                        <div className="w-full h-1 bg-[#1E293B] rounded-full mb-3 overflow-hidden">
                          <div className="h-full bg-slate-600" style={{ width: `${hyp.confidence_score}%` }} />
                        </div>
                        <p className="text-xs text-slate-500">{hyp.explanation}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">No alternatives generated.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
