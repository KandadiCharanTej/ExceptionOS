import { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Shield, CheckCircle, Clock, Lightbulb, Activity, BrainCircuit, Columns, Edit3, Save, Tag, List, Bot, Sparkles, AlertCircle, ExternalLink } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { getCase, resolveCase, verifyResolution, updateAnnotations, getCaseHistory, explainCase } from '../services/api';
import { Badge, StatusBadge, PriorityBadge, SecondaryButton, PrimaryButton, LoadingState, ErrorState } from '../components/ui';
import { cn } from '../App';

export default function Investigation() {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const datasetId = searchParams.get('dataset_id') || undefined;
  const queryClient = useQueryClient();

  const [actionInput, setActionInput] = useState('');
  const [isEditingAnnotations, setIsEditingAnnotations] = useState(false);
  const [analystClassification, setAnalystClassification] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [tagsInput, setTagsInput] = useState<string>('');
  const [explainModalOpen, setExplainModalOpen] = useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['case', caseId, datasetId],
    queryFn: () => getCase(caseId!, datasetId),
    enabled: !!caseId,
  });

  const { data: historyData } = useQuery({
    queryKey: ['caseHistory', caseId, datasetId],
    queryFn: () => getCaseHistory(caseId!, datasetId),
    enabled: !!caseId,
  });

  const explainMutation = useMutation({
    mutationFn: () => explainCase(caseId!),
  });

  const annotationsMutation = useMutation({
    mutationFn: () => updateAnnotations(
      caseId!,
      {
        analyst_classification: analystClassification || undefined,
        notes: notes || undefined,
        tags: tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(Boolean) : undefined,
      },
      datasetId
    ),
    onSuccess: () => {
      toast.success('Annotations saved successfully');
      setIsEditingAnnotations(false);
      queryClient.invalidateQueries({ queryKey: ['case', caseId, datasetId] });
      queryClient.invalidateQueries({ queryKey: ['caseHistory', caseId, datasetId] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to save annotations');
    }
  });

  const resolveMutation = useMutation({
    mutationFn: () => resolveCase(caseId!, actionInput, 'ANALYST', datasetId),
    onSuccess: () => {
      toast.success('Resolution recorded');
      queryClient.invalidateQueries({ queryKey: ['case', caseId, datasetId] });
      queryClient.invalidateQueries({ queryKey: ['caseHistory', caseId, datasetId] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to record resolution');
    }
  });

  const verifyMutation = useMutation({
    mutationFn: () => verifyResolution(caseId!, datasetId),
    onSuccess: () => {
      toast.success('Verification pass finished');
      queryClient.invalidateQueries({ queryKey: ['case', caseId, datasetId] });
      queryClient.invalidateQueries({ queryKey: ['caseHistory', caseId, datasetId] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Verification failed');
    }
  });

  if (isLoading) {
    return <LoadingState message="Retrieving transaction evidence and 3-way reconciliation record..." />;
  }

  if (isError || !data) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <SecondaryButton onClick={() => navigate('/cases')}>
          <ArrowLeft className="w-4 h-4" /> Back to Queue
        </SecondaryButton>
        <ErrorState 
          title="Unable to load case details"
          message={(error as Error)?.message || 'The investigation record could not be retrieved. Check that the backend is running and try again.'} 
        />
      </div>
    );
  }

  const resolveResult = (data as any).manual_resolution;
  const verifyResult = (data as any).verification_result;
  const history = historyData?.events || [];

  // Helper to get amount display
  const getAmountDisplay = (txn: any) => {
    if (!txn) return { value: 'Missing', missing: true };
    return { value: `${txn.currency} ${txn.amount.toFixed(2)}`, missing: false };
  };

  const ledgerAmt = getAmountDisplay(data.transactions.ledger);
  const gatewayAmt = getAmountDisplay(data.transactions.gateway);
  const bankAmt = getAmountDisplay(data.transactions.bank);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* === CASE HEADER === */}
      <div className="pb-6 border-b border-slate-200/60">
        <div className="flex items-center gap-3 mb-4">
          <SecondaryButton onClick={() => navigate(datasetId ? `/cases?dataset_id=${datasetId}` : '/cases')} className="py-1.5 px-3 text-xs">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Queue
          </SecondaryButton>
          <div className="h-4 w-px bg-slate-200"></div>
          <Badge variant="secondary" className="px-3 py-1">
            <Shield className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
            Deterministic Analysis
          </Badge>
        </div>
        
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">Transaction Investigation</p>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 font-mono">{data.case_id}</h1>
            <div className="flex items-center gap-3 mt-3">
              <StatusBadge status={data.classification} />
              {(data as any).priority && <PriorityBadge priority={(data as any).priority} />}
              <StatusBadge status={(data as any).status || data.classification} />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Confidence</p>
              <p className="text-2xl font-extrabold text-slate-900">{data.root_cause.confidence_score}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* === 3-WAY COMPARISON === */}
      <div>
        <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Columns className="w-4 h-4 text-blue-600" />
          3-Way Transaction Evidence
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Ledger */}
          <div className={cn(
            "rounded-xl border-2 p-5 transition-all",
            data.transactions.ledger ? "bg-white border-blue-200" : "bg-red-50/50 border-red-200"
          )}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-bold uppercase tracking-widest text-blue-600">Ledger</span>
              {data.transactions.ledger ? (
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              ) : (
                <Badge variant="error">Missing</Badge>
              )}
            </div>
            <div className={cn("text-xl font-extrabold font-mono tracking-tight", ledgerAmt.missing ? "text-red-400" : "text-slate-900")}>
              {ledgerAmt.value}
            </div>
            <div className="mt-3 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">ID</span>
                <span className="font-mono font-medium text-slate-700">{data.transactions.ledger?.key || '—'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Date</span>
                <span className="font-medium text-slate-700">{data.transactions.ledger?.date || '—'}</span>
              </div>
            </div>
          </div>

          {/* Gateway */}
          <div className={cn(
            "rounded-xl border-2 p-5 transition-all",
            data.transactions.gateway ? "bg-white border-emerald-200" : "bg-red-50/50 border-red-200"
          )}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-600">Gateway</span>
              {data.transactions.gateway ? (
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              ) : (
                <Badge variant="error">Missing</Badge>
              )}
            </div>
            <div className={cn("text-xl font-extrabold font-mono tracking-tight", gatewayAmt.missing ? "text-red-400" : "text-slate-900")}>
              {gatewayAmt.value}
            </div>
            <div className="mt-3 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">ID</span>
                <span className="font-mono font-medium text-slate-700">{data.transactions.gateway?.key || '—'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Date</span>
                <span className="font-medium text-slate-700">{data.transactions.gateway?.date || '—'}</span>
              </div>
            </div>
          </div>

          {/* Bank */}
          <div className={cn(
            "rounded-xl border-2 p-5 transition-all",
            data.transactions.bank ? "bg-white border-indigo-200" : "bg-red-50/50 border-red-200"
          )}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-bold uppercase tracking-widest text-indigo-600">Bank</span>
              {data.transactions.bank ? (
                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              ) : (
                <Badge variant="error">Missing</Badge>
              )}
            </div>
            <div className={cn("text-xl font-extrabold font-mono tracking-tight", bankAmt.missing ? "text-red-400" : "text-slate-900")}>
              {bankAmt.value}
            </div>
            <div className="mt-3 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">ID</span>
                <span className="font-mono font-medium text-slate-700">{data.transactions.bank?.key || '—'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Date</span>
                <span className="font-medium text-slate-700">{data.transactions.bank?.date || '—'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* === INVESTIGATION GRID === */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* LEFT: Deterministic Analysis + AI */}
        <div className="xl:col-span-2 space-y-8">
          {/* Deterministic Root Cause */}
          <div className="bg-white rounded-xl border border-blue-200/80 overflow-hidden shadow-sm">
            <div className="px-6 py-4 bg-blue-50/40 border-b border-blue-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-md bg-blue-100">
                  <BrainCircuit className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-blue-900">Deterministic Findings</h3>
                  <p className="text-[11px] text-blue-600/80">Source of truth — verified by reconciliation engine</p>
                </div>
              </div>
              <span className="text-xs font-bold text-blue-700 bg-blue-100 px-3 py-1.5 rounded-full border border-blue-200">
                {data.root_cause.confidence_score}% Confidence
              </span>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <h3 className="text-xl font-extrabold text-slate-900 capitalize mb-2">
                  {data.root_cause.cause ? data.root_cause.cause.replace(/_/g, ' ') : 'No Exception'}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">{data.root_cause.explanation}</p>
              </div>

              <div className="bg-slate-50 rounded-xl p-5 border border-slate-200/80">
                <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">Validated Evidence</h4>
                <div className="space-y-2.5">
                  {data.root_cause.supporting_evidence.map((ev: string, idx: number) => (
                    <div key={idx} className="flex items-start bg-white p-3 rounded-lg border border-slate-200/80 text-xs text-slate-800">
                      <CheckCircle className="h-4 w-4 text-emerald-600 mr-2.5 shrink-0 mt-0.5" />
                      <span>{ev}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* AI Investigation Panel */}
          <div className="bg-white rounded-xl border border-indigo-200/60 overflow-hidden shadow-sm">
            <div className="px-6 py-4 bg-indigo-50/30 border-b border-indigo-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-md bg-indigo-100">
                  <Sparkles className="h-4 w-4 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-indigo-900">AI Investigation</h3>
                  <p className="text-[11px] text-indigo-600/80">Advisory analysis — requires human verification</p>
                </div>
              </div>
              <SecondaryButton 
                onClick={() => {
                  setExplainModalOpen(true);
                  if (!explainMutation.data && !explainMutation.isPending) {
                    explainMutation.mutate();
                  }
                }}
                className="text-xs py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white border-0"
              >
                <Bot className="h-3.5 w-3.5" />
                {explainMutation.data ? 'View Explanation' : 'Generate Explanation'}
              </SecondaryButton>
            </div>
            {explainModalOpen && (
              <div className="p-6">
                {explainMutation.isPending ? (
                  <div className="flex items-center gap-3 text-slate-600 text-sm py-6 justify-center">
                    <Activity className="animate-spin h-5 w-5 text-indigo-600" />
                    <span>Analyzing deterministic evidence with AI...</span>
                  </div>
                ) : explainMutation.data ? (
                  <div className="space-y-4">
                    <div className="bg-indigo-50/40 rounded-lg p-4 border border-indigo-100">
                      <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                        {explainMutation.data.answer}
                      </p>
                    </div>
                    <p className="text-[11px] text-slate-400 italic">
                      This AI analysis is advisory only. The deterministic engine findings above remain the source of truth.
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-red-600 py-4 text-center">Unable to generate AI explanation. Try again.</p>
                )}
              </div>
            )}
            {!explainModalOpen && (
              <div className="p-6 text-center text-sm text-slate-500">
                Click "Generate Explanation" to get AI-powered analysis of this case.
              </div>
            )}
          </div>

          {/* Action Center */}
          <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Shield className="h-4 w-4 text-indigo-600" />
                Action Center
              </h3>
            </div>
            <div className="p-6 space-y-5">
              {/* Recommended Action */}
              <div className="bg-indigo-50/40 border border-indigo-100 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-indigo-600" />
                    <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider">Recommended Action</h4>
                  </div>
                  {data.resolution_recommendation.requires_human_approval ? (
                    <Badge variant="warning">Requires Approval</Badge>
                  ) : (
                    <Badge variant="success">Auto-Verifiable</Badge>
                  )}
                </div>
                <p className="text-sm font-bold text-slate-900 mb-1">
                  {data.resolution_recommendation.recommended_action.replace(/_/g, ' ').toUpperCase()}
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">{data.resolution_recommendation.explanation}</p>
              </div>

              {/* Resolution */}
              {!resolveResult ? (
                <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-3">
                  <label className="block text-xs font-bold text-slate-700">Record Resolution Action</label>
                  <div className="flex gap-3">
                    <input 
                      type="text" 
                      value={actionInput}
                      onChange={(e) => setActionInput(e.target.value)}
                      className="flex-1 bg-white border border-slate-200 text-slate-900 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm"
                      placeholder="Describe the resolution action taken..."
                    />
                    <PrimaryButton
                      onClick={() => resolveMutation.mutate()}
                      disabled={resolveMutation.isPending || !actionInput}
                      className="text-xs py-2.5 px-5"
                    >
                      {resolveMutation.isPending ? <Activity className="h-4 w-4 animate-spin" /> : 'Record Action'}
                    </PrimaryButton>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-emerald-800 uppercase">Action Recorded</h4>
                      <p className="text-xs font-medium text-slate-800 mt-0.5">"{resolveResult.action_taken}"</p>
                    </div>
                    <CheckCircle className="h-5 w-5 text-emerald-600" />
                  </div>

                  {!verifyResult ? (
                    <div className="flex justify-end">
                      <PrimaryButton
                        onClick={() => verifyMutation.mutate()}
                        disabled={verifyMutation.isPending}
                        className="bg-indigo-600 hover:bg-indigo-700 text-xs py-2.5"
                      >
                        {verifyMutation.isPending ? <Activity className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                        Verify Resolution
                      </PrimaryButton>
                    </div>
                  ) : (
                    <div className={cn("border rounded-xl p-4 flex items-start gap-3",
                      verifyResult.status === 'VERIFIED_RESOLVED' 
                        ? 'bg-emerald-50 border-emerald-200' 
                        : 'bg-amber-50 border-amber-200'
                    )}>
                      {verifyResult.status === 'VERIFIED_RESOLVED' ? (
                        <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <h4 className={cn("text-xs font-bold uppercase", verifyResult.status === 'VERIFIED_RESOLVED' ? 'text-emerald-900' : 'text-amber-900')}>
                          {verifyResult.status.replace('_', ' ')}
                        </h4>
                        <p className="text-xs text-slate-700 mt-0.5">{verifyResult.explanation}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT SIDEBAR: Annotations + Timeline + Audit */}
        <div className="xl:col-span-1 space-y-6">
          {/* Analyst Annotations */}
          <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-sm">
            <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <Edit3 className="h-3.5 w-3.5 text-purple-600" />
                Analyst Annotations
              </h3>
              {!isEditingAnnotations ? (
                <button onClick={() => {
                  setAnalystClassification(data.analyst_classification || '');
                  setNotes(data.notes || '');
                  setTagsInput(data.tags ? data.tags.join(', ') : '');
                  setIsEditingAnnotations(true);
                }} className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer">
                  Edit
                </button>
              ) : (
                <button onClick={() => annotationsMutation.mutate()} disabled={annotationsMutation.isPending} className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold flex items-center cursor-pointer disabled:opacity-50">
                  {annotationsMutation.isPending ? <Activity className="w-3 h-3 mr-1 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
                  Save
                </button>
              )}
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Override Classification</label>
                {isEditingAnnotations ? (
                  <select 
                    value={analystClassification}
                    onChange={(e) => setAnalystClassification(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-slate-900 rounded-lg text-sm px-3 py-2 focus:outline-none focus:border-blue-500 shadow-sm"
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
                  <div className="text-sm font-medium text-slate-800">{data.analyst_classification ? data.analyst_classification.replace('_', ' ') : <span className="text-slate-400 italic">None</span>}</div>
                )}
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Notes</label>
                {isEditingAnnotations ? (
                  <textarea 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full bg-white border border-slate-200 text-slate-900 rounded-lg text-sm px-3 py-2 focus:outline-none focus:border-blue-500 resize-none shadow-sm"
                    placeholder="Add investigation notes..."
                  />
                ) : (
                  <div className="text-sm text-slate-700 whitespace-pre-wrap">{data.notes || <span className="text-slate-400 italic">No notes</span>}</div>
                )}
              </div>
              <div>
                <label className="flex items-center text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  <Tag className="w-3 h-3 mr-1" /> Tags
                </label>
                {isEditingAnnotations ? (
                  <input 
                    type="text" 
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-slate-900 rounded-lg text-sm px-3 py-2 focus:outline-none focus:border-blue-500 shadow-sm"
                    placeholder="Comma separated tags"
                  />
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {data.tags && data.tags.length > 0 ? (
                      data.tags.map((tag: string, i: number) => <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>)
                    ) : (
                      <span className="text-xs text-slate-400 italic">No tags</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Evidence Timeline */}
          <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-sm">
            <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/60">
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-blue-600" />
                Evidence Timeline
              </h3>
            </div>
            <div className="p-5">
              <div className="relative border-l-2 border-slate-200 ml-2 space-y-5">
                {data.timeline.map((event: any, idx: number) => (
                  <div key={idx} className="relative pl-5">
                    <div className={cn("absolute -left-[6px] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-white",
                      event.event_type.includes('exception') ? 'bg-amber-500' : 'bg-blue-500'
                    )} />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{event.source}</span>
                    <p className="text-xs font-semibold text-slate-900 mt-0.5">{event.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Audit Trail */}
          <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-sm">
            <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/60">
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <List className="h-3.5 w-3.5 text-slate-600" />
                Audit Trail
              </h3>
            </div>
            <div className="p-5">
              {history.length > 0 ? (
                <div className="relative border-l-2 border-slate-200 ml-2 space-y-5">
                  {history.map((event: any, idx: number) => (
                    <div key={idx} className="relative pl-5">
                      <div className="absolute -left-[6px] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-white bg-slate-400" />
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        {event.event_type.replace(/_/g, ' ')}
                      </span>
                      <p className="text-xs font-medium text-slate-800 mt-0.5">{event.description}</p>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        {new Date(event.timestamp).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic text-center py-4">No audit history recorded yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
