import { useState, useRef, useEffect } from 'react';
import { Bot, Send, Loader2, Sparkles, ShieldCheck, ChevronRight, Activity, UploadCloud, X, FileText, Play, MessageSquare, Lightbulb } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { askCopilot, getDatasets, uploadReconciliationFiles, prioritizeCases } from '../services/api';
import type { CopilotResponse } from '../types/api';
import { Badge, PrimaryButton, SecondaryButton } from '../components/ui';
import { cn } from '../App';

interface Message {
  role: 'user' | 'assistant';
  content?: string;
  data?: CopilotResponse;
}

const SUGGESTED_QUESTIONS = [
  { q: "What requires attention first?", icon: "🚨" },
  { q: "Give me an executive summary.", icon: "📊" },
  { q: "Which exception is most expensive?", icon: "💰" },
  { q: "What pattern appears most frequently?", icon: "🔍" },
  { q: "What are the biggest problems?", icon: "⚠️" },
];

export default function Copilot() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [ledgerFile, setLedgerFile] = useState<File | null>(null);
  const [gatewayFile, setGatewayFile] = useState<File | null>(null);
  const [bankFile, setBankFile] = useState<File | null>(null);

  const ledgerRef = useRef<HTMLInputElement>(null);
  const gatewayRef = useRef<HTMLInputElement>(null);
  const bankRef = useRef<HTMLInputElement>(null);

  const { data: datasetsData } = useQuery({
    queryKey: ['datasets'],
    queryFn: getDatasets,
  });

  const datasets = datasetsData?.datasets || [];
  const selectedDataset = datasets.find(d => d.id === selectedDatasetId);

  const uploadMutation = useMutation({
    mutationFn: (files: { ledger: File, gateway: File, bank: File }) => 
      uploadReconciliationFiles(files.ledger, files.gateway, files.bank),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
      toast.success('Dataset uploaded & reconciled!');
      setSelectedDatasetId(res.dataset_id);
      setIsUploadModalOpen(false);
      setLedgerFile(null);
      setGatewayFile(null);
      setBankFile(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || error.message || 'Failed to upload files');
    }
  });

  const handleUpload = () => {
    if (!ledgerFile || !gatewayFile || !bankFile) {
      toast.error('Please provide all three CSV files.');
      return;
    }
    uploadMutation.mutate({ ledger: ledgerFile, gateway: gatewayFile, bank: bankFile });
  };

  const FileSelector = ({ label, file, setFile, inputRef }: any) => (
    <div className={cn(
      "flex flex-col space-y-2 p-4 rounded-xl border border-dashed transition-all duration-200",
      file ? "bg-emerald-50 border-emerald-300" : "bg-slate-50 border-slate-200 hover:border-slate-300"
    )}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-800">{label} CSV</span>
        {file && <Badge variant="success">Ready</Badge>}
      </div>
      <div className="flex items-center mt-2">
        <SecondaryButton onClick={() => inputRef.current?.click()} className="text-xs py-1 px-3">
          {file ? 'Change File' : 'Choose File'}
        </SecondaryButton>
        <span className="text-xs text-slate-500 ml-3 truncate max-w-[200px]">
          {file ? (
            <span className="flex items-center text-emerald-700 font-semibold">
              <FileText className="w-3.5 h-3.5 mr-1 text-emerald-600" />
              {file.name}
              <button onClick={() => setFile(null)} className="ml-2 text-slate-400 hover:text-red-600 cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ) : 'Select file'}
        </span>
        <input 
          type="file" 
          accept=".csv,text/csv" 
          className="hidden" 
          ref={inputRef} 
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              setFile(e.target.files[0]);
            }
          }}
        />
      </div>
    </div>
  );

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const chatMutation = useMutation({
    mutationFn: (query: string) => askCopilot(query, selectedDatasetId || undefined),
    onSuccess: (data: CopilotResponse) => {
      setMessages(prev => [...prev, { role: 'assistant', data }]);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to get answer from Copilot');
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "Sorry, I encountered an error retrieving deterministic facts for this query. Please check your backend connection." 
      }]);
    }
  });

  const prioritizeMutation = useMutation({
    mutationFn: () => prioritizeCases(selectedDatasetId),
    onSuccess: (data: CopilotResponse) => {
      setMessages(prev => [...prev, { role: 'assistant', data }]);
    },
    onError: (err: any) => toast.error(err.message)
  });

  const handleSend = (textToSend?: string) => {
    const q = textToSend || input;
    if (!q.trim() || chatMutation.isPending) return;

    setMessages(prev => [...prev, { role: 'user', content: q }]);
    if (!textToSend) setInput('');
    chatMutation.mutate(q);
  };

  return (
    <div className="space-y-0 max-w-7xl mx-auto flex flex-col h-[calc(100vh-6rem)]">
      {/* === HEADER === */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-slate-200/60 shrink-0">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-indigo-600 mb-1">Intelligence</p>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">AI Finance Copilot</h1>
          <p className="text-xs text-slate-500 mt-1">Ask questions about verified reconciliation intelligence.</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Dataset Context Selector */}
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Analyzing:</span>
            <select
              value={selectedDatasetId}
              onChange={(e) => setSelectedDatasetId(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="">Global Intelligence Context</option>
              {datasets.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.total_cases} records)
                </option>
              ))}
            </select>
          </div>
          
          <PrimaryButton 
            onClick={() => setIsUploadModalOpen(true)}
            className="text-xs py-2 px-3 bg-indigo-600 hover:bg-indigo-700"
          >
            <UploadCloud className="w-4 h-4" />
            Upload
          </PrimaryButton>
        </div>
      </div>

      {/* === MAIN AREA === */}
      <div className="flex gap-6 flex-1 min-h-0 pt-6">
        {/* Left: Suggested Questions */}
        <div className="w-64 shrink-0 space-y-5 overflow-y-auto hidden lg:block">
          {/* Trust Indicator */}
          <div className="bg-indigo-50/60 border border-indigo-200/80 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="h-4 w-4 text-indigo-600" />
              <span className="text-xs font-bold text-indigo-900">Verified Data Only</span>
            </div>
            <p className="text-[11px] text-indigo-950/70 leading-relaxed">
              The Copilot explains data but the <span className="font-bold">Deterministic Engine</span> remains the source of truth. AI cannot alter financial amounts.
            </p>
          </div>

          {/* Suggested */}
          <div>
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Suggested Questions</h4>
            <div className="space-y-2">
              {SUGGESTED_QUESTIONS.map((item, i) => (
                <button 
                  key={i}
                  onClick={() => handleSend(item.q)}
                  className="w-full text-left p-3 rounded-lg bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 transition-all text-xs font-medium text-slate-700 flex items-center gap-2.5 group shadow-sm cursor-pointer"
                >
                  <span className="text-sm">{item.icon}</span>
                  <span className="flex-1">{item.q}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-blue-500 transition-colors" />
                </button>
              ))}
              
              {selectedDatasetId && (
                <button 
                  onClick={() => prioritizeMutation.mutate()}
                  disabled={prioritizeMutation.isPending}
                  className="w-full text-left p-3 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-all text-xs font-semibold flex items-center gap-2.5 cursor-pointer shadow-sm mt-3"
                >
                  <Lightbulb className="h-4 w-4" />
                  <span className="flex-1">Prioritize cases for me</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right: Chat Area */}
        <div className="flex-1 bg-white rounded-xl border border-slate-200/80 flex flex-col overflow-hidden shadow-sm">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto space-y-5 py-12">
                <div className="h-16 w-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center border border-blue-200/60">
                  <Sparkles className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-1">How can I help?</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Ask natural language questions about reconciliation runs, exception patterns, and financial intelligence.
                  </p>
                </div>
                {/* Inline prompt chips for mobile */}
                <div className="flex flex-wrap gap-2 justify-center lg:hidden">
                  {SUGGESTED_QUESTIONS.slice(0, 3).map((item, i) => (
                    <button 
                      key={i}
                      onClick={() => handleSend(item.q)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-blue-50 border border-slate-200 rounded-full text-xs font-medium text-slate-600 cursor-pointer transition-colors"
                    >
                      {item.icon} {item.q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, idx) => (
                <div key={idx} className={cn("flex gap-3.5 max-w-3xl", m.role === 'user' ? "ml-auto flex-row-reverse" : "")}>
                  {/* Avatar */}
                  <div className="shrink-0">
                    {m.role === 'user' ? (
                      <div className="h-8 w-8 rounded-full bg-slate-900 flex items-center justify-center text-xs font-bold text-white">U</div>
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white">
                        <Bot className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                  
                  <div className={cn("space-y-3 min-w-0", m.role === 'user' ? "text-right" : "")}>
                    {m.content && (
                      <div className={cn(
                        "inline-block rounded-2xl px-4 py-2.5 text-sm font-medium max-w-full text-left",
                        m.role === 'user' ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-800"
                      )}>
                        {m.content}
                      </div>
                    )}
                    
                    {m.data && (
                      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden text-left">
                        {m.data.response_mode === 'insufficient_data' ? (
                          <div className="p-5 bg-amber-50/50">
                            <div className="flex items-center gap-2 mb-2">
                              <ShieldCheck className="h-4 w-4 text-amber-600" />
                              <h4 className="text-xs font-bold text-amber-900">Insufficient Verified Data</h4>
                            </div>
                            <p className="text-xs text-slate-700 leading-relaxed">{m.data.answer}</p>
                            <p className="text-[11px] text-slate-500 mt-3">Upload a dataset or select a specific dataset for evidence-based analysis.</p>
                          </div>
                        ) : (
                          <>
                            {/* Verified Facts */}
                            {m.data.verified_facts && m.data.verified_facts.length > 0 && (
                              <div className="p-4 border-b border-slate-100 bg-emerald-50/30">
                                <h4 className="text-[11px] font-bold text-emerald-800 uppercase tracking-widest mb-2.5 flex items-center gap-2">
                                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                                  Verified Facts
                                </h4>
                                <ul className="space-y-1.5">
                                  {m.data.verified_facts.map((f, i) => (
                                    <li key={i} className="text-xs text-slate-700 flex items-start gap-2">
                                      <span className="text-emerald-500 mt-0.5">✓</span>
                                      {f}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {/* AI Analysis */}
                            <div className="p-4 border-b border-slate-100">
                              <h4 className="text-[11px] font-bold text-blue-700 uppercase tracking-widest mb-2.5 flex items-center gap-2">
                                <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                                AI Analysis
                              </h4>
                              <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">{m.data.answer}</p>
                            </div>
                            
                            {/* Recommendations */}
                            {m.data.recommendations && m.data.recommendations.length > 0 && (
                              <div className="p-4 bg-indigo-50/20 border-b border-slate-100">
                                <h4 className="text-[11px] font-bold text-indigo-800 uppercase tracking-widest mb-2.5 flex items-center gap-2">
                                  <Lightbulb className="h-3.5 w-3.5 text-indigo-600" />
                                  Recommended Next Steps
                                </h4>
                                <ul className="space-y-1.5">
                                  {m.data.recommendations.map((r, i) => (
                                    <li key={i} className="text-xs text-slate-700 flex items-start gap-2">
                                      <span className="text-indigo-500 mt-0.5">→</span>
                                      {r}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {/* Footer */}
                            <div className="px-4 py-2.5 bg-slate-50/60 flex justify-between items-center text-[11px]">
                              <span className="text-slate-400 italic truncate max-w-[60%]">{m.data.disclaimer}</span>
                              <span className={cn(
                                "px-2.5 py-1 rounded-full font-bold text-[10px] tracking-wide shrink-0",
                                m.data.confidence >= 0.8 ? "bg-emerald-100 text-emerald-800" :
                                m.data.confidence >= 0.4 ? "bg-amber-100 text-amber-800" :
                                "bg-red-100 text-red-800"
                              )}>
                                {Math.round(m.data.confidence * 100)}% Confidence
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            {chatMutation.isPending && (
              <div className="flex gap-3.5">
                <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="bg-slate-100 rounded-2xl px-4 py-3 flex items-center gap-2.5">
                  <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                  <span className="text-xs text-slate-600 font-medium">Querying verified data...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          {/* Input */}
          <div className="p-4 border-t border-slate-200 bg-slate-50/50">
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
              className="flex gap-2.5"
            >
              <input 
                type="text" 
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask about reconciliation performance, exceptions, or financial patterns..."
                className="flex-1 bg-white border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 px-4 py-3 outline-none transition-all shadow-sm"
                disabled={chatMutation.isPending}
              />
              <PrimaryButton 
                type="submit" 
                disabled={!input.trim() || chatMutation.isPending}
                className="rounded-xl px-5 shadow-sm"
              >
                <Send className="h-4 w-4" />
              </PrimaryButton>
            </form>
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col space-y-4 p-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-blue-600" />
                Upload Data Batch
              </h3>
              <button 
                onClick={() => setIsUploadModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <FileSelector label="Ledger" file={ledgerFile} setFile={setLedgerFile} inputRef={ledgerRef} />
              <FileSelector label="Gateway" file={gatewayFile} setFile={setGatewayFile} inputRef={gatewayRef} />
              <FileSelector label="Bank" file={bankFile} setFile={setBankFile} inputRef={bankRef} />
            </div>
            <div className="pt-2">
              <PrimaryButton
                onClick={handleUpload}
                disabled={uploadMutation.isPending || !ledgerFile || !gatewayFile || !bankFile}
                className="w-full py-2.5"
              >
                {uploadMutation.isPending ? (
                  <><Activity className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
                ) : (
                  <><Play className="mr-2 h-4 w-4" /> Run Reconciliation & Select</>
                )}
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
