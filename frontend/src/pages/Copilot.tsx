import { useState, useRef, useEffect } from 'react';
import { Bot, Send, Loader2, Sparkles, ShieldCheck, ChevronRight, Activity, UploadCloud, X, FileText, Play, Lightbulb } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { askCopilot, getDatasets, uploadReconciliationFiles, prioritizeCases } from '../services/api';
import type { CopilotResponse } from '../types/api';
import { PageHeader, Surface, PrimaryButton, SecondaryButton, Badge, PageContainer } from '../components/ui';
import { cn } from '../lib/utils';

interface Message { role: 'user' | 'assistant'; content?: string; data?: CopilotResponse; }

const SUGGESTED = [
  'What are the biggest problems?',
  'Give me an executive summary.',
  'Which exception occurs most frequently?',
  'What should we investigate first?',
];

export default function Copilot() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [selectedDatasetId, setSelectedDatasetId] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [ledgerFile, setLedgerFile] = useState<File | null>(null);
  const [gatewayFile, setGatewayFile] = useState<File | null>(null);
  const [bankFile, setBankFile] = useState<File | null>(null);
  const ledgerRef = useRef<HTMLInputElement>(null);
  const gatewayRef = useRef<HTMLInputElement>(null);
  const bankRef = useRef<HTMLInputElement>(null);

  const { data: datasetsData } = useQuery({ queryKey: ['datasets'], queryFn: getDatasets });
  const datasets = datasetsData?.datasets || [];
  const selectedDataset = datasets.find((d) => d.id === selectedDatasetId);

  const uploadMutation = useMutation({
    mutationFn: (f: { ledger: File; gateway: File; bank: File }) => uploadReconciliationFiles(f.ledger, f.gateway, f.bank),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
      toast.success('Dataset ready');
      setSelectedDatasetId(res.dataset_id);
      setUploadOpen(false);
      setLedgerFile(null); setGatewayFile(null); setBankFile(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const chatMutation = useMutation({
    mutationFn: (q: string) => askCopilot(q, selectedDatasetId || undefined),
    onSuccess: (data) => setMessages((p) => [...p, { role: 'assistant', data }]),
    onError: (e: any) => {
      toast.error(e.message);
      setMessages((p) => [...p, { role: 'assistant', content: 'Unable to retrieve verified data. Check backend connection.' }]);
    },
  });

  const prioritizeMutation = useMutation({
    mutationFn: () => prioritizeCases(selectedDatasetId),
    onSuccess: (data) => setMessages((p) => [...p, { role: 'assistant', data }]),
    onError: (e: any) => toast.error(e.message),
  });

  const handleSend = (text?: string) => {
    const q = text || input;
    if (!q.trim() || chatMutation.isPending) return;
    setMessages((p) => [...p, { role: 'user', content: q }]);
    if (!text) setInput('');
    chatMutation.mutate(q);
  };

  const FilePicker = ({ label, file, setFile, ref }: any) => (
    <div className={cn('p-4 rounded-xl border border-dashed', file ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-200')}>
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-semibold">{label}</span>
        {file && <Badge variant="success">Ready</Badge>}
      </div>
      <SecondaryButton onClick={() => ref.current?.click()} className="text-xs">{file ? file.name : 'Choose CSV'}</SecondaryButton>
      <input type="file" accept=".csv" className="hidden" ref={ref} onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])} />
    </div>
  );

  return (
    <PageContainer className="flex flex-col h-[calc(100vh-5rem)]">
      <PageHeader
        overline="Intelligence"
        title="AI Financial Intelligence"
        description="Analyze verified reconciliation evidence using natural language."
        actions={
          <div className="flex items-center gap-2">
            <SecondaryButton onClick={() => setUploadOpen(true)} className="text-xs"><UploadCloud className="w-4 h-4" /> Upload</SecondaryButton>
          </div>
        }
      />

      <div className="flex gap-6 flex-1 min-h-0 mt-8">
        {/* Context panel */}
        <div className="w-72 shrink-0 hidden lg:flex flex-col gap-5">
          <Surface className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-3">Active Context</p>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-sm font-semibold text-slate-900">
                {selectedDataset ? selectedDataset.name : 'Global Financial Intelligence'}
              </span>
            </div>
            <select value={selectedDatasetId} onChange={(e) => setSelectedDatasetId(e.target.value)}
              className="w-full mt-3 bg-slate-50 border border-slate-200 rounded-lg text-xs px-3 py-2 focus:outline-none">
              <option value="">Global context</option>
              {datasets.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </Surface>

          <Surface className="p-4 bg-indigo-50/50 border-indigo-100">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-bold text-indigo-900">Verified Data Only</span>
            </div>
            <p className="text-[11px] text-indigo-900/70 leading-relaxed">
              AI analyzes deterministic evidence. AI does not alter financial records.
            </p>
          </Surface>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-3">Suggested Questions</p>
            <div className="space-y-2">
              {SUGGESTED.map((q) => (
                <button key={q} onClick={() => handleSend(q)}
                  className="w-full text-left px-4 py-3 rounded-xl bg-white border border-slate-200 hover:border-blue-300 text-xs font-medium text-slate-700 transition-all flex items-center justify-between group cursor-pointer">
                  {q}
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-500" />
                </button>
              ))}
              {selectedDatasetId && (
                <button onClick={() => prioritizeMutation.mutate()} disabled={prioritizeMutation.isPending}
                  className="w-full text-left px-4 py-3 rounded-xl bg-[#0F172A] text-white text-xs font-semibold cursor-pointer">
                  Prioritize cases for me →
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Chat */}
        <Surface className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto">
                <div className="w-14 h-14 rounded-2xl bg-[#0F172A] flex items-center justify-center mb-5">
                  <Sparkles className="w-6 h-6 text-indigo-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Financial Intelligence Ready</h3>
                <p className="text-sm text-slate-500 leading-relaxed">Ask about exceptions, patterns, and operational risk using verified reconciliation data.</p>
              </div>
            ) : (
              messages.map((m, i) => (
                <div key={i} className={cn('flex gap-3 max-w-2xl', m.role === 'user' && 'ml-auto flex-row-reverse')}>
                  <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold',
                    m.role === 'user' ? 'bg-slate-900 text-white' : 'bg-blue-600 text-white')}>
                    {m.role === 'user' ? 'U' : <Bot className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    {m.content && (
                      <div className={cn('inline-block rounded-2xl px-4 py-2.5 text-sm', m.role === 'user' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-800')}>
                        {m.content}
                      </div>
                    )}
                    {m.data && (
                      <div className="mt-1 space-y-0 rounded-2xl border border-slate-200 overflow-hidden">
                        {m.data.verified_facts && m.data.verified_facts.length > 0 && (
                          <div className="p-4 bg-emerald-50/40 border-b border-slate-100">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 mb-2 flex items-center gap-1.5">
                              <ShieldCheck className="w-3 h-3" /> Verified Facts
                            </p>
                            <ul className="space-y-1">{m.data.verified_facts.map((f, j) => (
                              <li key={j} className="text-xs text-slate-700 flex gap-2"><span className="text-emerald-500">✓</span>{f}</li>
                            ))}</ul>
                          </div>
                        )}
                        <div className="p-4 border-b border-slate-100">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700 mb-2 flex items-center gap-1.5">
                            <Sparkles className="w-3 h-3" /> Intelligence Analysis
                          </p>
                          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{m.data.answer}</p>
                        </div>
                        {m.data.recommendations && m.data.recommendations.length > 0 && (
                          <div className="p-4 bg-slate-50">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-2 flex items-center gap-1.5">
                              <Lightbulb className="w-3 h-3" /> Recommended Actions
                            </p>
                            <ul className="space-y-1">{m.data.recommendations.map((r, j) => (
                              <li key={j} className="text-xs text-slate-700 flex gap-2"><span className="text-blue-500">→</span>{r}</li>
                            ))}</ul>
                          </div>
                        )}
                        <div className="px-4 py-2 bg-slate-50/80 text-[10px] text-slate-400 italic border-t border-slate-100">
                          {m.data.disclaimer}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            {chatMutation.isPending && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center"><Bot className="w-4 h-4 text-white" /></div>
                <div className="bg-slate-100 rounded-2xl px-4 py-3 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span className="text-xs text-slate-600">Querying verified data...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-slate-100">
            <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
              <input value={input} onChange={(e) => setInput(e.target.value)} disabled={chatMutation.isPending}
                placeholder="Ask about reconciliation performance, exceptions, or patterns..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10" />
              <PrimaryButton type="submit" disabled={!input.trim() || chatMutation.isPending} className="px-5">
                <Send className="w-4 h-4" />
              </PrimaryButton>
            </form>
          </div>
        </Surface>
      </div>

      {uploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <Surface className="w-full max-w-lg p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-900">Upload Data Batch</h3>
              <button onClick={() => setUploadOpen(false)} className="cursor-pointer"><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <FilePicker label="Ledger" file={ledgerFile} setFile={setLedgerFile} ref={ledgerRef} />
            <FilePicker label="Gateway" file={gatewayFile} setFile={setGatewayFile} ref={gatewayRef} />
            <FilePicker label="Bank" file={bankFile} setFile={setBankFile} ref={bankRef} />
            <PrimaryButton onClick={() => {
              if (!ledgerFile || !gatewayFile || !bankFile) { toast.error('All three files required'); return; }
              uploadMutation.mutate({ ledger: ledgerFile, gateway: gatewayFile, bank: bankFile });
            }} disabled={uploadMutation.isPending} className="w-full">
              {uploadMutation.isPending ? <Activity className="animate-spin w-4 h-4" /> : <Play className="w-4 h-4" />}
              Run Reconciliation
            </PrimaryButton>
          </Surface>
        </div>
      )}
    </PageContainer>
  );
}
