import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, Activity, List, Shield, Lightbulb, Edit3, Tag, Save, Columns, Bot, Sparkles, ShieldCheck, ChevronRight, X, ArrowLeft, BrainCircuit, CheckCircle, Clock } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { 
  getCase, getCaseHistory, resolveCase, verifyResolution, updateAnnotations, explainCase
} from '../services/api';
import type { 
  ResolveActionResponse, VerificationResponse 
} from '../types/api';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '../components/ui';
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
        <Activity className="h-10 w-10 text-primary animate-spin mb-4" />
        <p className="text-slate-500 font-medium">Initializing Intelligence Dossier...</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="bg-red-50 text-red-800 p-8 rounded-2xl border border-red-100 max-w-2xl mx-auto mt-12 text-center shadow-sm">
        <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="h-8 w-8 text-red-600" />
        </div>
        <h3 className="text-xl font-bold mb-2 tracking-tight">Investigation Error</h3>
        <p className="text-slate-600 mb-8 max-w-md mx-auto">{(error as Error)?.message || 'Case not found or you do not have permission to view it.'}</p>
        <button onClick={() => navigate('/cases')} className="px-6 py-2.5 bg-white border border-slate-200 shadow-sm hover:bg-slate-50 text-slate-700 rounded-lg transition-colors font-medium cursor-pointer inline-flex items-center">
          <ArrowLeft className="w-4 h-4 mr-2" /> Return to Queue
        </button>
      </div>
    );
  }

  const history = historyData?.events || [];

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 animate-in fade-in duration-500">
      
      {/* Breadcrumbs and Header */}
      <div className="flex flex-col space-y-4 md:space-y-0 md:flex-row md:items-center justify-between">
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => navigate(`/cases${datasetId ? `?dataset_id=${datasetId}` : ''}`)}
            className="p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-900 cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          
          <div className="flex items-center space-x-2 text-sm text-slate-500 font-medium">
            <span className="cursor-pointer hover:text-primary transition-colors" onClick={() => navigate('/cases')}>Queue</span>
            <ChevronRight className="w-4 h-4" />
            <span className="text-slate-900">{data.case_id}</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-3 pl-12 md:pl-0">
          <Badge variant="success" className="px-3 py-1 bg-emerald-50 text-emerald-700 border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
            Deterministic Engine Verified
          </Badge>
        </div>
      </div>

      {/* Main Title Area */}
      <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-mono">{data.case_id}</h1>
              {data.analyst_classification && (
                <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                  Override: {data.analyst_classification.replace('_', ' ')}
                </Badge>
              )}
            </div>
            
            <h2 className="text-xl font-semibold text-slate-700 mb-2 capitalize">
              {data.root_cause.cause ? data.root_cause.cause.replace(/_/g, ' ') : 'Unclassified Exception'}
            </h2>
            <p className="text-slate-500 max-w-3xl leading-relaxed">
              {data.root_cause.explanation}
            </p>
          </div>
          
          <div className="shrink-0 flex flex-col items-end">
            <div className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Intelligence Match</div>
            <div className="flex items-center bg-indigo-50 px-4 py-2 rounded-lg border border-indigo-100">
              <BrainCircuit className="w-5 h-5 text-indigo-600 mr-2" />
              <span className="text-2xl font-bold text-indigo-700">{data.root_cause.confidence_score}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left Column (Metadata) */}
        <div className="xl:col-span-1 space-y-6">
          <Card>
            <CardHeader className="border-b border-border bg-slate-50/50 pb-4 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-900 flex items-center">
                <Edit3 className="h-4 w-4 mr-2 text-indigo-500" />
                Analyst Annotations
              </CardTitle>
              {!isEditingAnnotations ? (
                <button onClick={() => setIsEditingAnnotations(true)} className="text-xs text-primary hover:text-primary/80 font-medium cursor-pointer transition-colors">
                  Edit
                </button>
              ) : (
                <button onClick={() => annotationsMutation.mutate()} disabled={annotationsMutation.isPending} className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center cursor-pointer transition-colors disabled:opacity-50">
                  {annotationsMutation.isPending ? <Activity className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
                  Save
                </button>
              )}
            </CardHeader>
            <CardContent className="pt-5 space-y-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Classification Override</label>
                {isEditingAnnotations ? (
                  <select 
                    value={analystClassification}
                    onChange={(e) => setAnalystClassification(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-slate-900 rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
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
                  <div className="text-sm font-medium text-slate-700">{data.analyst_classification ? data.analyst_classification.replace('_', ' ') : <span className="text-slate-400 italic font-normal">None</span>}</div>
                )}
              </div>
              
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Investigation Notes</label>
                {isEditingAnnotations ? (
                  <textarea 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    className="w-full bg-white border border-slate-200 text-slate-900 rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                    placeholder="Add detailed case notes..."
                  />
                ) : (
                  <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">{data.notes || <span className="text-slate-400 italic font-normal">No notes provided.</span>}</div>
                )}
              </div>
              
              <div>
                <label className="flex items-center text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  <Tag className="w-3.5 h-3.5 mr-1" /> Case Tags
                </label>
                {isEditingAnnotations ? (
                  <input 
                    type="text" 
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-slate-900 rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    placeholder="Comma separated (e.g. urgent, manual-review)"
                  />
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {data.tags && data.tags.length > 0 ? (
                      data.tags.map((tag, i) => (
                        <span key={i} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-slate-400 italic">No tags attached.</span>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-border bg-slate-50/50 pb-4">
              <CardTitle className="text-sm font-semibold text-slate-900 flex items-center">
                <Clock className="h-4 w-4 mr-2 text-blue-500" />
                Evidence Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="relative border-l-2 border-slate-100 ml-3 space-y-6">
                {data.timeline.map((event, idx) => (
                  <div key={idx} className="relative pl-6">
                    <div className={cn("absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-white",
                      event.event_type.includes('exception') ? 'bg-amber-400 shadow-sm' : 'bg-blue-500 shadow-sm'
                    )} />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">{event.source}</span>
                      <span className="text-sm font-medium text-slate-700">{event.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column (Data & Actions) */}
        <div className="xl:col-span-2 space-y-6">
          
          {/* Action Center - Moved to top for visibility */}
          <Card className="border-indigo-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl -mr-20 -mt-20 z-0"></div>
            <CardHeader className="border-b border-indigo-50 bg-white/50 pb-4 relative z-10">
              <CardTitle className="flex items-center text-sm font-semibold text-indigo-900">
                <Shield className="h-4 w-4 mr-2 text-indigo-600" />
                Resolution Protocol
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 relative z-10">
              <div className="bg-white border border-indigo-100 rounded-xl p-5 mb-6 shadow-sm">
                <h4 className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-3 flex items-center">
                  <Lightbulb className="w-4 h-4 mr-2" />
                  AI Recommended Action
                </h4>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <span className="text-lg font-bold text-slate-900 tracking-tight">
                    {data.resolution_recommendation.recommended_action.replace(/_/g, ' ').toUpperCase()}
                  </span>
                  {data.resolution_recommendation.requires_human_approval ? (
                    <Badge variant="warning">Requires Human Approval</Badge>
                  ) : (
                    <Badge variant="success">Auto-Verifiable</Badge>
                  )}
                </div>
                <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg">{data.resolution_recommendation.explanation}</p>
              </div>

              {!resolveResult ? (
                <div className="space-y-4">
                  <label className="block text-sm font-semibold text-slate-900">Execute Action</label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input 
                      type="text" 
                      value={actionInput}
                      onChange={(e) => setActionInput(e.target.value)}
                      className="flex-1 bg-white border border-slate-300 text-slate-900 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                      placeholder="Enter resolution command or notes..."
                    />
                    <button
                      onClick={() => resolveMutation.mutate()}
                      disabled={resolveMutation.isPending || !actionInput}
                      className="inline-flex items-center justify-center rounded-lg text-sm font-bold transition-all bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-3 disabled:opacity-50 shadow-sm cursor-pointer whitespace-nowrap"
                    >
                      {resolveMutation.isPending ? <Activity className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                      Record Action
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-5 flex items-center justify-between shadow-sm">
                    <div>
                      <h4 className="text-xs font-bold text-emerald-600 mb-1 tracking-widest uppercase">Action Recorded Successfully</h4>
                      <p className="text-sm font-medium text-emerald-900">"{resolveResult.action_taken}"</p>
                    </div>
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                      <CheckCircle className="h-6 w-6 text-emerald-500" />
                    </div>
                  </div>

                  {!verifyResult ? (
                    <div className="flex justify-end pt-2">
                      <button
                        onClick={() => verifyMutation.mutate()}
                        disabled={verifyMutation.isPending}
                        className="inline-flex items-center justify-center rounded-lg text-sm font-bold transition-all bg-indigo-600 text-white hover:bg-indigo-700 px-8 py-3 disabled:opacity-50 shadow-sm cursor-pointer"
                      >
                        {verifyMutation.isPending ? <Activity className="h-5 w-5 animate-spin mr-2" /> : <Shield className="h-5 w-5 mr-2" />}
                        Verify System State
                      </button>
                    </div>
                  ) : (
                    <div className={cn("rounded-xl p-5 border shadow-sm flex items-start space-x-4",
                      verifyResult.status === 'VERIFIED_RESOLVED' 
                        ? 'bg-emerald-50 border-emerald-200' 
                        : 'bg-amber-50 border-amber-200'
                    )}>
                      {verifyResult.status === 'VERIFIED_RESOLVED' ? (
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shrink-0 shadow-sm border border-emerald-100">
                          <CheckCircle className="h-6 w-6 text-emerald-500" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shrink-0 shadow-sm border border-amber-100">
                          <AlertCircle className="h-6 w-6 text-amber-500" />
                        </div>
                      )}
                      <div>
                        <h4 className={cn("text-base font-bold tracking-tight mb-1", verifyResult.status === 'VERIFIED_RESOLVED' ? 'text-emerald-800' : 'text-amber-800')}>
                          {verifyResult.status.replace('_', ' ')}
                        </h4>
                        <p className={cn("text-sm", verifyResult.status === 'VERIFIED_RESOLVED' ? 'text-emerald-700' : 'text-amber-700')}>
                          {verifyResult.explanation}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 3-Way Comparison Data */}
          <Card>
            <CardHeader className="border-b border-border bg-slate-50/50 pb-4 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-900 flex items-center">
                <Columns className="h-4 w-4 mr-2 text-emerald-500" />
                3-Way Transaction Data Matrix
              </CardTitle>
              <button 
                onClick={() => {
                  setExplainModalOpen(true);
                  if (!explainMutation.data && !explainMutation.isPending) {
                    explainMutation.mutate();
                  }
                }}
                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center gap-2 rounded-lg h-9 font-semibold text-xs px-4 transition-colors cursor-pointer shadow-sm"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Explain with AI
              </button>
            </CardHeader>
            <CardContent className="pt-0 px-0">
              
              {explainModalOpen && (
                <div className="m-6 p-6 rounded-xl bg-slate-900 border border-slate-800 shadow-xl relative overflow-hidden animate-in slide-in-from-top-2">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                  
                  <div className="flex justify-between items-center mb-6 relative z-10">
                    <h4 className="font-semibold text-indigo-400 flex items-center gap-2 text-sm uppercase tracking-wider">
                      <Bot className="h-5 w-5" />
                      AI Copilot Analysis
                    </h4>
                    <button onClick={() => setExplainModalOpen(false)} className="text-slate-400 hover:text-white transition-colors bg-slate-800 rounded-full p-1.5">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  
                  {explainMutation.isPending ? (
                    <div className="flex flex-col items-center justify-center gap-4 text-slate-400 py-10">
                      <div className="animate-spin h-8 w-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
                      <span className="text-sm font-medium">Synthesizing deterministic matrix...</span>
                    </div>
                  ) : explainMutation.data ? (
                    <div className="space-y-6 relative z-10">
                      {explainMutation.data.response_mode === 'insufficient_data' ? (
                        <div className="bg-slate-800/50 p-5 rounded-lg border border-amber-900/50">
                          <h4 className="text-sm font-semibold text-amber-400 mb-2 flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5" />
                            Insufficient Evidence
                          </h4>
                          <p className="text-sm text-slate-300 leading-relaxed">{explainMutation.data.answer}</p>
                        </div>
                      ) : (
                        <>
                          <div className="bg-slate-950 p-5 rounded-lg border border-slate-800 shadow-inner">
                            <h5 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                              <ShieldCheck className="h-4 w-4" /> Verified Facts
                            </h5>
                            <ul className="list-disc list-inside space-y-2 text-sm text-slate-300">
                              {explainMutation.data.verified_facts.map((f, i) => <li key={i}>{f}</li>)}
                            </ul>
                          </div>
                          
                          <div className="px-2">
                            <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                              {explainMutation.data.answer}
                            </p>
                          </div>
                          
                          {explainMutation.data.recommendations.length > 0 && (
                            <div className="bg-indigo-950/40 p-5 rounded-lg border border-indigo-900/50">
                              <h5 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <Activity className="h-4 w-4" />
                                Suggested Interventions
                              </h5>
                              <ul className="list-disc list-inside space-y-2 text-sm text-slate-300">
                                {explainMutation.data.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                              </ul>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="text-red-400 text-sm py-4 text-center">Explanation failed to generate.</div>
                  )}
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 border-b border-border text-slate-500 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Data Field</th>
                      <th className="px-6 py-4 font-semibold text-blue-600">Internal Ledger</th>
                      <th className="px-6 py-4 font-semibold text-indigo-600">Payment Gateway</th>
                      <th className="px-6 py-4 font-semibold text-emerald-600">Bank Statement</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-slate-900">
                    <tr className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-500">Transaction ID</td>
                      <td className="px-6 py-4 font-mono text-xs">{data.transactions.ledger?.key || <span className="text-slate-400">-</span>}</td>
                      <td className="px-6 py-4 font-mono text-xs">{data.transactions.gateway?.key || <span className="text-slate-400">-</span>}</td>
                      <td className="px-6 py-4 font-mono text-xs">{data.transactions.bank?.key || <span className="text-slate-400">-</span>}</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-500">Amount</td>
                      <td className={cn("px-6 py-4 font-mono font-medium", !data.transactions.ledger ? "text-slate-400 italic" : "text-slate-900")}>
                        {data.transactions.ledger ? `${data.transactions.ledger.currency} ${data.transactions.ledger.amount.toFixed(2)}` : 'Missing'}
                      </td>
                      <td className={cn("px-6 py-4 font-mono font-medium", !data.transactions.gateway ? "text-slate-400 italic" : "text-slate-900")}>
                        {data.transactions.gateway ? `${data.transactions.gateway.currency} ${data.transactions.gateway.amount.toFixed(2)}` : 'Missing'}
                      </td>
                      <td className={cn("px-6 py-4 font-mono font-medium", !data.transactions.bank ? "text-slate-400 italic" : "text-slate-900")}>
                        {data.transactions.bank ? `${data.transactions.bank.currency} ${data.transactions.bank.amount.toFixed(2)}` : 'Missing'}
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-500">Date & Time</td>
                      <td className={cn("px-6 py-4", !data.transactions.ledger ? "text-slate-400" : "text-slate-700")}>{data.transactions.ledger?.date || '-'}</td>
                      <td className={cn("px-6 py-4", !data.transactions.gateway ? "text-slate-400" : "text-slate-700")}>{data.transactions.gateway?.date || '-'}</td>
                      <td className={cn("px-6 py-4", !data.transactions.bank ? "text-slate-400" : "text-slate-700")}>{data.transactions.bank?.date || '-'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <div className="p-6 bg-slate-50 border-t border-border">
                <h4 className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-widest">Verified Evidence Vectors</h4>
                <ul className="space-y-2">
                  {data.root_cause.supporting_evidence.map((ev, idx) => (
                    <li key={idx} className="flex items-start bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                      <CheckCircle className="h-4 w-4 text-emerald-500 mr-3 mt-0.5 shrink-0" />
                      <span className="text-sm text-slate-700 font-medium">{ev}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Audit Trail & History */}
          <Card>
            <CardHeader className="border-b border-border bg-slate-50/50 pb-4">
              <CardTitle className="flex items-center text-sm font-semibold text-slate-900">
                <List className="h-4 w-4 mr-2 text-slate-500" />
                Complete Audit Trail
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {history.length > 0 ? (
                <div className="relative border-l-2 border-slate-100 ml-3 space-y-6">
                  {history.map((event, idx) => (
                    <div key={idx} className="relative pl-6">
                      <div className="absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-white bg-slate-300 shadow-sm" />
                      <div className="flex flex-col bg-white border border-slate-100 rounded-lg p-3 shadow-sm">
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            {event.event_type.replace(/_/g, ' ')}
                          </span>
                          <span className="text-[10px] font-medium text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
                            {new Date(event.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <span className="text-sm text-slate-700">
                          {event.description}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-sm text-slate-500">No activity recorded yet.</p>
                </div>
              )}
            </CardContent>
          </Card>
          
        </div>
      </div>
    </div>
  );
}
