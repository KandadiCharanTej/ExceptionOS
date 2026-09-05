import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bot, Send, ShieldCheck, Loader2, Sparkles, ChevronRight, Activity, UploadCloud, X, FileText, Play } from 'lucide-react';
import toast from 'react-hot-toast';
import { getDatasets, askCopilot, prioritizeCases, uploadReconciliationFiles } from '../services/api';
import type { CopilotResponse } from '../types/api';
import { Card, CardContent, Badge } from '../components/ui';
import { cn } from '../App';

export default function Copilot() {
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('');
  const [messages, setMessages] = useState<{role: 'user'|'ai', content: string, data?: CopilotResponse}[]>([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [ledgerFile, setLedgerFile] = useState<File | null>(null);
  const [gatewayFile, setGatewayFile] = useState<File | null>(null);
  const [bankFile, setBankFile] = useState<File | null>(null);

  const ledgerRef = useRef<HTMLInputElement>(null);
  const gatewayRef = useRef<HTMLInputElement>(null);
  const bankRef = useRef<HTMLInputElement>(null);

  const uploadMutation = useMutation({
    mutationFn: (files: { ledger: File, gateway: File, bank: File }) => 
      uploadReconciliationFiles(files.ledger, files.gateway, files.bank),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
      toast.success('Dataset uploaded successfully');
      setIsUploadModalOpen(false);
      setLedgerFile(null);
      setGatewayFile(null);
      setBankFile(null);
      if (data && data.dataset_id) {
        setSelectedDatasetId(data.dataset_id);
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || error.message || 'Failed to upload dataset');
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
      "flex flex-col space-y-2 p-4 rounded-lg border border-dashed transition-all duration-200",
      file ? "bg-emerald-500/5 border-emerald-500/30" : "bg-[#0A0F1C] border-[#1E293B] hover:border-slate-600"
    )}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-300">{label} CSV</span>
        {file && <Badge variant="success">Ready</Badge>}
      </div>
      <div className="flex items-center mt-2">
        <button
          onClick={() => inputRef.current?.click()}
          className="px-3 py-1.5 bg-[#1E293B] border border-slate-700 rounded text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors shadow-sm cursor-pointer"
        >
          {file ? 'Change File' : 'Choose File'}
        </button>
        <span className="text-sm text-slate-400 ml-3 truncate max-w-[200px]">
          {file ? (
            <span className="flex items-center text-emerald-400 font-medium">
              <FileText className="w-4 h-4 mr-1" />
              {file.name}
              <button onClick={() => setFile(null)} className="ml-2 text-slate-500 hover:text-red-400 cursor-pointer">
                <X className="w-4 h-4" />
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

  const { data: datasetsData, isLoading: datasetsLoading } = useQuery({
    queryKey: ['datasets'],
    queryFn: getDatasets,
  });

  const chatMutation = useMutation({
    mutationFn: (message: string) => askCopilot(message, selectedDatasetId || undefined),
    onSuccess: (data) => {
      setMessages(prev => [...prev, { role: 'ai', content: '', data }]);
    },
    onError: (error: any) => {
      if (error.response?.status === 503) {
        setMessages(prev => [...prev, { role: 'ai', content: '⚠️ AI service temporarily unavailable. Please try again.' }]);
        return;
      }
      const errDetail = error.response?.data?.detail || error.message;
      setMessages(prev => [...prev, { role: 'ai', content: `AI Copilot error: ${errDetail}` }]);
    }
  });

  const prioritizeMutation = useMutation({
    mutationFn: () => prioritizeCases(selectedDatasetId),
    onSuccess: (data) => {
      setMessages(prev => [...prev, { role: 'user', content: 'What should I investigate first?' }]);
      setMessages(prev => [...prev, { role: 'ai', content: '', data }]);
    },
    onError: (error: any) => {
      if (error.response?.status === 503) {
        setMessages(prev => [...prev, { role: 'ai', content: '⚠️ AI service temporarily unavailable. Please try again.' }]);
        return;
      }
      const errDetail = error.response?.data?.detail || error.message;
      setMessages(prev => [...prev, { role: 'ai', content: `AI Copilot error: ${errDetail}` }]);
    }
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatMutation.isPending]);

  const handleSend = (msg: string) => {
    if (!msg.trim()) return;
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setInput('');
    chatMutation.mutate(msg);
  };

  const SUGGESTED_QUESTIONS = [
    "What are the biggest problems in this dataset?",
    "Give me an executive summary.",
    "Which root cause occurs most frequently?"
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]">
      <div className="mb-6 flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white mb-1 flex items-center gap-2">
            <Bot className="h-8 w-8 text-blue-400" />
            AI Finance Copilot
          </h2>
          <p className="text-slate-400">Ask questions about your verified financial reconciliation data.</p>
        </div>
        
        <div className="flex items-end gap-2">
          <div className="w-64">
            <label className="block text-sm font-medium text-slate-400 mb-1">Select Dataset Context</label>
            <select 
              value={selectedDatasetId}
              onChange={(e) => setSelectedDatasetId(e.target.value)}
              className="w-full bg-[#05080F] border border-[#1E293B] text-slate-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
              disabled={datasetsLoading}
            >
              <option value="">Global Context (All Data)</option>
              {datasetsData?.datasets.map(d => (
                <option key={d.id} value={d.id}>{d.name} ({d.total_cases} cases)</option>
              ))}
            </select>
          </div>
          <button 
            onClick={() => setIsUploadModalOpen(true)}
            className="p-2.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-600/30 transition-colors flex items-center justify-center cursor-pointer"
            title="Upload New Dataset"
          >
            <UploadCloud className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0">
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-4 overflow-y-auto">
          <Card className="bg-blue-950/20 border-blue-900/50">
            <CardContent className="pt-6">
              <h3 className="font-semibold text-blue-400 flex items-center gap-2 mb-4">
                <ShieldCheck className="h-5 w-5" />
                Verified Data Only
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                The Copilot explains and analyzes data, but the <span className="font-semibold text-white">Deterministic Engine</span> remains the absolute source of truth. AI cannot modify financial amounts or system classifications.
              </p>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Suggested Questions</h4>
            {SUGGESTED_QUESTIONS.map((q, i) => (
              <button 
                key={i}
                onClick={() => handleSend(q)}
                className="w-full text-left p-3 rounded-lg bg-[#0A0F1C] border border-[#1E293B] hover:border-blue-500/50 hover:bg-[#1E293B]/50 transition-colors text-sm text-slate-300 flex items-center justify-between group"
              >
                {q}
                <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-blue-400" />
              </button>
            ))}
            
            {selectedDatasetId && (
              <button 
                onClick={() => prioritizeMutation.mutate()}
                disabled={prioritizeMutation.isPending}
                className="w-full text-left p-3 rounded-lg bg-indigo-900/20 border border-indigo-900/50 hover:bg-indigo-900/40 transition-colors text-sm text-indigo-200 flex items-center justify-between group"
              >
                <span className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  What should I investigate first?
                </span>
                <ChevronRight className="h-4 w-4 text-indigo-400 opacity-0 group-hover:opacity-100" />
              </button>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <Card className="lg:col-span-3 bg-[#0A0F1C] border-[#1E293B] flex flex-col h-full overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-4">
                <div className="h-16 w-16 bg-blue-500/10 rounded-2xl flex items-center justify-center">
                  <Sparkles className="h-8 w-8 text-blue-400" />
                </div>
                <h3 className="text-xl font-semibold text-slate-200">How can I help you analyze this data?</h3>
                <p className="text-slate-400 text-sm">
                  I can summarize reconciliation runs, identify patterns, and recommend next steps based on verified deterministic evidence.
                </p>
              </div>
            ) : (
              messages.map((m, idx) => (
                <div key={idx} className={cn("flex gap-4 max-w-3xl", m.role === 'user' ? "ml-auto flex-row-reverse" : "")}>
                  <div className="shrink-0">
                    {m.role === 'user' ? (
                      <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center text-sm font-semibold text-white">U</div>
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center">
                        <Bot className="h-5 w-5 text-white" />
                      </div>
                    )}
                  </div>
                  
                  <div className={cn("space-y-4", m.role === 'user' ? "text-right" : "")}>
                    {m.content && (
                      <div className={cn(
                        "inline-block rounded-2xl px-4 py-2.5 text-sm max-w-full text-left",
                        m.role === 'user' ? "bg-blue-600 text-white" : "bg-[#1E293B] text-slate-200"
                      )}>
                        {m.content}
                      </div>
                    )}
                    
                    {m.data && (
                      <div className="bg-[#1E293B]/30 rounded-xl border border-[#1E293B] overflow-hidden text-left">
                        {m.data.response_mode === 'insufficient_data' ? (
                          <div className="p-6 bg-slate-900/50">
                            <h4 className="text-sm font-semibold text-amber-400 mb-2 flex items-center gap-2">
                              <ShieldCheck className="h-5 w-5" />
                              Not enough verified data yet
                            </h4>
                            <p className="text-sm text-slate-300 leading-relaxed">{m.data.answer}</p>
                            <div className="mt-4 text-xs text-slate-500">
                              Upload a dataset or select a case to get evidence-based financial analysis.
                            </div>
                          </div>
                        ) : (
                          <>
                            {/* Verified Facts */}
                            {m.data.verified_facts.length > 0 && (
                              <div className="p-4 border-b border-[#1E293B] bg-slate-900/50">
                                <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                  <ShieldCheck className="h-4 w-4" />
                                  Verified Facts
                                </h4>
                                <ul className="list-disc list-inside space-y-1">
                                  {m.data.verified_facts.map((f, i) => (
                                    <li key={i} className="text-sm text-slate-300">{f}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {/* AI Analysis */}
                            <div className="p-4 border-b border-[#1E293B]">
                              <h4 className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                <Sparkles className="h-4 w-4" />
                                AI Answer
                              </h4>
                              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{m.data.answer}</p>
                            </div>
                            
                            {/* Recommendations */}
                            {m.data.recommendations.length > 0 && (
                              <div className="p-4 bg-indigo-950/20">
                                <h4 className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                  <Activity className="h-4 w-4" />
                                  Recommendations
                                </h4>
                                <ul className="list-disc list-inside space-y-1">
                                  {m.data.recommendations.map((r, i) => (
                                    <li key={i} className="text-sm text-slate-300">{r}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            <div className="px-4 py-2 bg-slate-950 flex justify-between items-center text-xs">
                              <span className="text-slate-500 italic">{m.data.disclaimer}</span>
                              <span className={cn(
                                "px-2 py-0.5 rounded uppercase font-medium tracking-wide flex items-center gap-1",
                                m.data.confidence >= 0.8 ? "bg-emerald-950 text-emerald-400" :
                                m.data.confidence >= 0.4 ? "bg-amber-950 text-amber-400" :
                                "bg-red-950 text-red-400"
                              )}>
                                📊 Confidence: {Math.round(m.data.confidence * 100)}%
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
              <div className="flex gap-4">
                <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div className="bg-[#1E293B] rounded-2xl px-4 py-3 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 text-slate-400 animate-spin" />
                  <span className="text-sm text-slate-400">Analyzing deterministic data...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          <div className="p-4 border-t border-[#1E293B] bg-[#05080F]">
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
              className="flex gap-2"
            >
              <input 
                type="text" 
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask the AI Finance Copilot..."
                className="flex-1 bg-[#1E293B] border border-slate-700 text-slate-200 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 p-3 outline-none"
                disabled={chatMutation.isPending}
              />
              <button 
                type="submit" 
                disabled={!input.trim() || chatMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 flex items-center justify-center disabled:opacity-50"
              >
                <Send className="h-5 w-5" />
              </button>
            </form>
          </div>
        </Card>
      </div>

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0A0F1C] border border-[#1E293B] rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-5 border-b border-[#1E293B] bg-slate-900/50">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-blue-400" />
                Upload Dataset
              </h3>
              <button 
                onClick={() => setIsUploadModalOpen(false)}
                className="text-slate-500 hover:text-slate-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
              <FileSelector label="Ledger" file={ledgerFile} setFile={setLedgerFile} inputRef={ledgerRef} />
              <FileSelector label="Gateway" file={gatewayFile} setFile={setGatewayFile} inputRef={gatewayRef} />
              <FileSelector label="Bank" file={bankFile} setFile={setBankFile} inputRef={bankRef} />
            </div>
            <div className="p-5 border-t border-[#1E293B] bg-slate-900/50">
              <button
                onClick={handleUpload}
                disabled={uploadMutation.isPending || !ledgerFile || !gatewayFile || !bankFile}
                className="w-full cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-bold transition-all bg-blue-600 text-white hover:bg-blue-500 h-11 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(37,99,235,0.3)]"
              >
                {uploadMutation.isPending ? (
                  <><Activity className="mr-2 h-5 w-5 animate-spin" /> Processing...</>
                ) : (
                  <><Play className="mr-2 h-4 w-4" /> Run Reconciliation & Upload</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
