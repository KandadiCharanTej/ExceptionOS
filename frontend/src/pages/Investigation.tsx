import { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Shield, CheckCircle, Clock, Lightbulb, Activity, BrainCircuit,
  Edit3, Save, Tag, List, Bot, Sparkles, AlertCircle, ArrowDown
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getCase, resolveCase, verifyResolution, updateAnnotations, getCaseHistory, explainCase } from '../services/api';
import {
  Badge, StatusBadge, PriorityBadge, SecondaryButton, PrimaryButton,
  LoadingState, ErrorState, Surface, SectionHeader, PageContainer
} from '../components/ui';
import { cn } from '../lib/utils';

function SourceColumn({ label, txn, color }: { label: string; txn: any; color: string }) {
  const missing = !txn;
  const amount = missing ? 'Missing' : `${txn.currency} ${txn.amount.toFixed(2)}`;
  const aligned = !missing;

  return (
    <div className={cn('flex-1 text-center', missing && 'opacity-60')}>
      <div className={cn('inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-4', color)}>
        {label}
      </div>
      <p className={cn('text-2xl font-bold font-mono tabular-nums', missing ? 'text-red-400' : 'text-slate-900')}>{amount}</p>
      <div className="mt-3 space-y-1 text-xs text-slate-500">
        <p><span className="text-slate-400">ID </span>{txn?.key || '—'}</p>
        <p><span className="text-slate-400">Date </span>{txn?.date || '—'}</p>
      </div>
      <div className={cn('mt-4 inline-flex items-center gap-1 text-xs font-semibold', aligned ? 'text-emerald-600' : 'text-red-500')}>
        {aligned ? <><CheckCircle className="w-3.5 h-3.5" /> Present</> : <><AlertCircle className="w-3.5 h-3.5" /> Missing</>}
      </div>
    </div>
  );
}

export default function Investigation() {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const datasetId = searchParams.get('dataset_id') || undefined;
  const queryClient = useQueryClient();

  const [actionInput, setActionInput] = useState('');
  const [isEditingAnnotations, setIsEditingAnnotations] = useState(false);
  const [analystClassification, setAnalystClassification] = useState('');
  const [notes, setNotes] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [explainOpen, setExplainOpen] = useState(false);

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

  const explainMutation = useMutation({ mutationFn: () => explainCase(caseId!) });
  const annotationsMutation = useMutation({
    mutationFn: () => updateAnnotations(caseId!, {
      analyst_classification: analystClassification || undefined,
      notes: notes || undefined,
      tags: tagsInput ? tagsInput.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
    }, datasetId),
    onSuccess: () => {
      toast.success('Annotations saved');
      setIsEditingAnnotations(false);
      queryClient.invalidateQueries({ queryKey: ['case', caseId] });
    },
    onError: (err: any) => toast.error(err.message),
  });
  const resolveMutation = useMutation({
    mutationFn: () => resolveCase(caseId!, actionInput, 'ANALYST', datasetId),
    onSuccess: () => {
      toast.success('Resolution recorded');
      queryClient.invalidateQueries({ queryKey: ['case', caseId] });
    },
    onError: (err: any) => toast.error(err.message),
  });
  const verifyMutation = useMutation({
    mutationFn: () => verifyResolution(caseId!, datasetId),
    onSuccess: () => {
      toast.success('Verification complete');
      queryClient.invalidateQueries({ queryKey: ['case', caseId] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (isLoading) return <LoadingState message="Loading investigation workspace..." />;
  if (isError || !data) {
    return (
      <div className="space-y-6">
        <SecondaryButton onClick={() => navigate('/cases')}><ArrowLeft className="w-4 h-4" /> Investigations</SecondaryButton>
        <ErrorState title="Case not found" message={(error as Error)?.message} />
      </div>
    );
  }

  const resolveResult = (data as any).manual_resolution;
  const verifyResult = (data as any).verification_result;
  const history = historyData?.events || [];
  const isMatched = data.classification === 'matched' || data.classification === 'MATCHED';

  return (
    <PageContainer className="space-y-12">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate(datasetId ? `/cases?dataset_id=${datasetId}` : '/cases')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-5 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Investigations
        </button>
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold font-mono tracking-tight text-slate-900">{data.case_id}</h1>
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <StatusBadge status={isMatched ? 'MATCHED' : data.classification} />
              {(data as any).priority && <PriorityBadge priority={(data as any).priority} />}
            </div>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Confidence</p>
            <p className="text-3xl font-bold tabular-nums text-slate-900">{data.root_cause.confidence_score}%</p>
          </div>
        </div>
      </div>

      {/* 3-Way Comparison */}
      <div>
        <SectionHeader title="3-Way Transaction Comparison" description="Ledger → Gateway → Bank alignment" />
        <Surface className="p-8">
          <div className="flex flex-col md:flex-row items-center gap-6 md:gap-4">
            <SourceColumn label="Ledger" txn={data.transactions.ledger} color="bg-blue-50 text-blue-700" />
            <ArrowDown className="w-5 h-5 text-slate-300 rotate-90 md:rotate-0 shrink-0 hidden md:block" />
            <SourceColumn label="Gateway" txn={data.transactions.gateway} color="bg-emerald-50 text-emerald-700" />
            <ArrowDown className="w-5 h-5 text-slate-300 rotate-90 md:rotate-0 shrink-0 hidden md:block" />
            <SourceColumn label="Bank" txn={data.transactions.bank} color="bg-indigo-50 text-indigo-700" />
          </div>
        </Surface>
      </div>

      <div className="grid xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-8">
          {/* Deterministic Analysis */}
          <Surface className="overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
              <BrainCircuit className="w-4 h-4 text-blue-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Deterministic Analysis</h3>
                <p className="text-[11px] text-slate-500">Verified by reconciliation engine</p>
              </div>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Confidence</p>
                  <p className="text-xl font-bold text-slate-900">{data.root_cause.confidence_score}%</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Root Cause</p>
                  <p className="text-sm font-bold text-slate-900 capitalize">{data.root_cause.cause?.replace(/_/g, ' ') || 'No Exception'}</p>
                </div>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Recommendation</p>
                <p className="text-sm text-slate-600 leading-relaxed">{data.root_cause.explanation}</p>
              </div>
              {data.root_cause.supporting_evidence.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Validated Evidence</p>
                  {data.root_cause.supporting_evidence.map((ev: string, i: number) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-slate-700 bg-slate-50 rounded-lg p-3">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" /> {ev}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Surface>

          {/* AI Panel */}
          <Surface className="overflow-hidden border-indigo-100">
            <div className="px-6 py-4 bg-[#0F172A] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-300" />
                <span className="text-sm font-semibold text-white">AI Investigation</span>
              </div>
              <SecondaryButton
                onClick={() => { setExplainOpen(true); if (!explainMutation.data && !explainMutation.isPending) explainMutation.mutate(); }}
                className="text-xs py-1.5 bg-white/10 border-white/10 text-white hover:bg-white/20"
              >
                <Bot className="w-3.5 h-3.5" /> Generate Explanation
              </SecondaryButton>
            </div>
            {explainOpen && (
              <div className="p-6">
                {explainMutation.isPending ? (
                  <div className="flex items-center gap-2 text-sm text-slate-500 py-4">
                    <Activity className="animate-spin w-4 h-4 text-indigo-600" /> Analyzing evidence...
                  </div>
                ) : explainMutation.data ? (
                  <div>
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{explainMutation.data.answer}</p>
                    <p className="text-[11px] text-slate-400 mt-3 italic">Advisory only — deterministic findings remain authoritative.</p>
                  </div>
                ) : (
                  <p className="text-sm text-red-600">Unable to generate explanation.</p>
                )}
              </div>
            )}
          </Surface>

          {/* Resolution */}
          <Surface className="overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Shield className="w-4 h-4 text-indigo-600" /> Resolution Actions
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-indigo-50/50 rounded-xl p-4 border border-indigo-100">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider">Recommended</span>
                  {data.resolution_recommendation.requires_human_approval && <Badge variant="warning">Requires Approval</Badge>}
                </div>
                <p className="text-sm font-semibold text-slate-900 capitalize">{data.resolution_recommendation.recommended_action.replace(/_/g, ' ')}</p>
                <p className="text-xs text-slate-600 mt-1">{data.resolution_recommendation.explanation}</p>
              </div>

              {!resolveResult ? (
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={actionInput}
                    onChange={(e) => setActionInput(e.target.value)}
                    placeholder="Describe resolution action..."
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                  />
                  <PrimaryButton onClick={() => resolveMutation.mutate()} disabled={!actionInput || resolveMutation.isPending}>
                    {resolveMutation.isPending ? <Activity className="animate-spin w-4 h-4" /> : 'Record'}
                  </PrimaryButton>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-emerald-800 uppercase">Action Recorded</p>
                      <p className="text-sm text-slate-800 mt-0.5">"{resolveResult.action_taken}"</p>
                    </div>
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                  </div>
                  {!verifyResult && (
                    <PrimaryButton onClick={() => verifyMutation.mutate()} disabled={verifyMutation.isPending} className="ml-auto">
                      Verify Resolution
                    </PrimaryButton>
                  )}
                  {verifyResult && (
                    <div className={cn('rounded-xl p-4 border flex gap-3', verifyResult.status === 'VERIFIED_RESOLVED' ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200')}>
                      <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div>
                        <p className="text-xs font-bold uppercase">{verifyResult.status.replace(/_/g, ' ')}</p>
                        <p className="text-xs text-slate-700 mt-0.5">{verifyResult.explanation}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Surface>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Annotations */}
          <Surface className="overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Edit3 className="w-3.5 h-3.5" /> Analyst Notes
              </span>
              {!isEditingAnnotations ? (
                <button onClick={() => {
                  setAnalystClassification(data.analyst_classification || '');
                  setNotes(data.notes || '');
                  setTagsInput(data.tags?.join(', ') || '');
                  setIsEditingAnnotations(true);
                }} className="text-xs text-blue-600 font-semibold cursor-pointer">Edit</button>
              ) : (
                <button onClick={() => annotationsMutation.mutate()} disabled={annotationsMutation.isPending} className="text-xs text-emerald-700 font-semibold flex items-center gap-1 cursor-pointer">
                  <Save className="w-3 h-3" /> Save
                </button>
              )}
            </div>
            <div className="p-5 space-y-4 text-sm">
              {isEditingAnnotations ? (
                <>
                  <select value={analystClassification} onChange={(e) => setAnalystClassification(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
                    <option value="">No Override</option>
                    <option value="matched">Matched</option>
                    <option value="duplicate_detected">Duplicate</option>
                    <option value="amount_mismatch">Amount Mismatch</option>
                  </select>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none" placeholder="Notes..." />
                  <input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="Tags, comma separated" />
                </>
              ) : (
                <>
                  <p className="text-slate-700">{data.notes || <span className="text-slate-400 italic">No notes</span>}</p>
                  {data.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {data.tags.map((t: string, i: number) => <Badge key={i} variant="secondary"><Tag className="w-3 h-3 mr-1" />{t}</Badge>)}
                    </div>
                  )}
                </>
              )}
            </div>
          </Surface>

          {/* Timeline */}
          <Surface className="overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Evidence Timeline
              </span>
            </div>
            <div className="p-5">
              <div className="relative border-l-2 border-slate-200 ml-2 space-y-6">
                {data.timeline.map((event: any, idx: number) => (
                  <div key={idx} className="relative pl-5">
                    <div className={cn('absolute -left-[5px] top-1 w-2 h-2 rounded-full ring-4 ring-white', event.event_type.includes('exception') ? 'bg-amber-500' : 'bg-emerald-500')} />
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{event.source}</p>
                    <p className="text-xs font-medium text-slate-800 mt-0.5">{event.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </Surface>

          {/* Audit */}
          <Surface className="overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <List className="w-3.5 h-3.5" /> Audit Trail
              </span>
            </div>
            <div className="p-5">
              {history.length > 0 ? (
                <div className="relative border-l-2 border-slate-200 ml-2 space-y-5">
                  {history.map((event: any, idx: number) => (
                    <div key={idx} className="relative pl-5">
                      <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-slate-400 ring-4 ring-white" />
                      <p className="text-[10px] font-bold uppercase text-slate-500">{event.event_type.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-slate-700 mt-0.5">{event.description}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{new Date(event.timestamp).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic text-center py-4">No audit history yet.</p>
              )}
            </div>
          </Surface>
        </div>
      </div>
    </PageContainer>
  );
}
