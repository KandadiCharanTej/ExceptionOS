import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bot, Send, ShieldCheck, Loader2, Sparkles, ChevronRight, Activity, UploadCloud, X, FileText, Play } from 'lucide-react';
import toast from 'react-hot-toast';
import { getDatasets, askCopilot, prioritizeCases, uploadReconciliationFiles } from '../services/api';
import { Card, CardContent, Badge } from '../components/ui';
import { cn } from '../App';
import { useApp } from '../context/AppContext';

export default function Copilot() {
  const { activeDatasetId, setActiveDatasetId, copilotState, setCopilotState } = useApp();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const selectedDatasetId = copilotState.selectedDatasetId || activeDatasetId || '';
  const messages = copilotState.messages;
  const input = copilotState.input;

  const updateCopilotState = (updater: Partial<typeof copilotState>) => {
    setCopilotState(prev => ({ ...prev, ...updater }));
  };

  const setSelectedDatasetId = (id: string) => {
    updateCopilotState({ selectedDatasetId: id });
    setActiveDatasetId(id || null);
  };

  const setMessages = (messagesOrFn: any) => {
    if (typeof messagesOrFn === 'function') {
      updateCopilotState({ messages: messagesOrFn(copilotState.messages) });
    } else {
      updateCopilotState({ messages: messagesOrFn });
    }
  };

  const setInput = (val: string) => {
    updateCopilotState({ input: val });
  };
  
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
      "flex flex-col space-y-2 p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer",
      file ? "bg-emerald-50 border-emerald-200" : "bg-white border-dashed border-slate-200 hover:border-primary/50"
    )} onClick={() => !file && inputRef.current?.click()}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-700">{label} Data</span>
        {file && <Badge variant="success">Ready</Badge>}
      </div>
      <div className="flex items-center mt-2">
        <span className="text-sm text-slate-500 truncate max-w-full">
          {file ? (
            <span className="flex items-center text-emerald-700 font-medium">
              <FileText className="w-4 h-4 mr-2" />
              {file.name}
              <button onClick={(e) => { e.stopPropagation(); setFile(null); }} className="ml-3 text-slate-400 hover:text-red-500">
                <X className="w-4 h-4" />
              </button>
            </span>
          ) : 'Click to select CSV file'}
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
      setMessages((prev: any) => [...prev, { role: 'ai', content: '', data }]);
    },
    onError: (error: any) => {
      if (error.response?.status === 503) {
        setMessages((prev: any) => [...prev, { role: 'ai', content: '⚠️ AI service temporarily unavailable. Please try again.' }]);
        return;
      }
      const errDetail = error.response?.data?.detail || error.message;
      setMessages((prev: any) => [...prev, { role: 'ai', content: `AI Copilot error: ${errDetail}` }]);
    }
  });

  const prioritizeMutation = useMutation({
    mutationFn: () => prioritizeCases(selectedDatasetId),
    onSuccess: (data) => {
      setMessages((prev: any) => [...prev, { role: 'user', content: 'What should I investigate first?' }]);
      setMessages((prev: any) => [...prev, { role: 'ai', content: '', data }]);
    },
    onError: (error: any) => {
      if (error.response?.status === 503) {
        setMessages((prev: any) => [...prev, { role: 'ai', content: '⚠️ AI service temporarily unavailable. Please try again.' }]);
        return;
      }
      const errDetail = error.response?.data?.detail || error.message;
      setMessages((prev: any) => [...prev, { role: 'ai', content: `AI Copilot error: ${errDetail}` }]);
    }
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatMutation.isPending]);

  const handleSend = (msg: string) => {
    if (!msg.trim()) return;
    setMessages((prev: any) => [...prev, { role: 'user', content: msg }]);
    setInput('');
    chatMutation.mutate(msg);
  };

  const SUGGESTED_QUESTIONS = [
    "What are the biggest problems in this dataset?",
    "Give me an executive summary.",
    "Which root cause occurs most frequently?"
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row justify-between md:items-end gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-1 flex items-center gap-2">
            <Bot className="h-8 w-8 text-primary" />
            AI Intelligence
          </h1>
          <p className="text-slate-500">Ask questions and analyze your financial reconciliation data.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex-1 md:w-64">
            <select 
              value={selectedDatasetId}
              onChange={(e) => setSelectedDatasetId(e.target.value)}
              className="w-full bg-white border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary block p-2.5 shadow-sm transition-all"
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
            className="p-2.5 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 hover:text-primary transition-colors flex items-center justify-center cursor-pointer shadow-sm shrink-0"
            title="Upload New Dataset"
          >
            <UploadCloud className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        
        {/* Sidebar */}
        <div className="w-full lg:w-80 space-y-4 shrink-0 overflow-y-auto hidden lg:block">
          <Card className="bg-indigo-50 border-indigo-100 shadow-sm">
            <CardContent className="pt-6">
              <h3 className="font-semibold text-indigo-900 flex items-center gap-2 mb-3">
                <ShieldCheck className="h-5 w-5 text-indigo-600" />
                Verified Data Only
              </h3>
              <p className="text-sm text-indigo-900/70 leading-relaxed">
                The Copilot explains and analyzes data, but the <span className="font-semibold text-indigo-900">Deterministic Engine</span> remains the absolute source of truth.
              </p>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 pl-1">Suggested Prompts</h4>
            {SUGGESTED_QUESTIONS.map((q, i) => (
              <button 
                key={i}
                onClick={() => handleSend(q)}
                className="w-full text-left p-4 rounded-xl bg-white border border-slate-200 hover:border-primary/50 hover:shadow-md transition-all text-sm text-slate-700 font-medium flex items-center justify-between group cursor-pointer"
              >
                {q}
                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-primary transition-colors" />
              </button>
            ))}
            
            {selectedDatasetId && (
              <button 
                onClick={() => prioritizeMutation.mutate()}
                disabled={prioritizeMutation.isPending}
                className="w-full text-left p-4 rounded-xl bg-primary text-white border border-primary hover:bg-primary/90 transition-all text-sm font-medium flex items-center justify-between group shadow-sm shadow-primary/20 cursor-pointer disabled:opacity-50"
              >
                <span className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  What should I investigate first?
                </span>
                <ChevronRight className="h-4 w-4 opacity-50 group-hover:opacity-100 transition-opacity" />
              </button>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <Card className="flex-1 flex flex-col h-full overflow-hidden shadow-sm">
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-4">
                <div className="h-20 w-20 bg-indigo-50 rounded-full flex items-center justify-center border border-indigo-100 shadow-sm">
                  <Sparkles className="h-10 w-10 text-indigo-500" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">How can I help you analyze?</h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  I can summarize reconciliation runs, identify patterns, and recommend next steps based on verified deterministic evidence.
                </p>
                <div className="grid grid-cols-1 gap-2 w-full mt-4 lg:hidden">
                  {SUGGESTED_QUESTIONS.map((q, i) => (
                    <button key={i} onClick={() => handleSend(q)} className="text-sm bg-white border border-slate-200 rounded-lg p-3 text-slate-700 hover:bg-slate-50 text-left cursor-pointer">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, idx) => (
                <div key={idx} className={cn("flex gap-3 md:gap-4 max-w-3xl", m.role === 'user' ? "ml-auto flex-row-reverse" : "")}>
                  <div className="shrink-0">
                    {m.role === 'user' ? (
                      <div className="h-8 w-8 rounded-full bg-slate-900 flex items-center justify-center text-sm font-bold text-white shadow-sm">U</div>
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center shadow-sm">
                        <Bot className="h-5 w-5 text-white" />
                      </div>
                    )}
                  </div>
                  
                  <div className={cn("space-y-4 max-w-[85%]", m.role === 'user' ? "text-right" : "")}>
                    {m.content && (
                      <div className={cn(
                        "inline-block rounded-2xl px-5 py-3 text-sm max-w-full text-left shadow-sm",
                        m.role === 'user' ? "bg-slate-900 text-white rounded-tr-sm" : "bg-white border border-slate-200 text-slate-800 rounded-tl-sm"
                      )}>
                        {m.content}
                      </div>
                    )}
                    
                    {m.data && (
                      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-left text-sm rounded-tl-sm">
                        {m.data.response_mode === 'insufficient_data' ? (
                          <div className="p-6 bg-slate-50">
                            <h4 className="text-sm font-bold text-amber-600 mb-2 flex items-center gap-2">
                              <ShieldCheck className="h-5 w-5" />
                              Insufficient Evidence
                            </h4>
                            <p className="text-slate-600 leading-relaxed">{m.data.answer}</p>
                          </div>
                        ) : (
                          <>
                            {m.data.verified_facts.length > 0 && (
                              <div className="p-5 border-b border-slate-100 bg-slate-50">
                                <h4 className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                                  <ShieldCheck className="h-4 w-4" />
                                  Verified Facts
                                </h4>
                                <ul className="list-disc list-inside space-y-1">
                                  {m.data.verified_facts.map((f, i) => (
                                    <li key={i} className="text-slate-700">{f}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            <div className="p-5 border-b border-slate-100">
                              <h4 className="text-xs font-bold text-primary uppercase tracking-widest mb-3 flex items-center gap-2">
                                <Sparkles className="h-4 w-4" />
                                Analysis
                              </h4>
                              <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">{m.data.answer}</p>
                            </div>
                            
                            {m.data.recommendations.length > 0 && (
                              <div className="p-5 bg-indigo-50/50">
                                <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                                  <Activity className="h-4 w-4" />
                                  Recommendations
                                </h4>
                                <ul className="list-disc list-inside space-y-1">
                                  {m.data.recommendations.map((r, i) => (
                                    <li key={i} className="text-slate-700">{r}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            <div className="px-5 py-3 bg-slate-50 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 text-xs border-t border-slate-100">
                              <span className="text-slate-500 italic flex-1">{m.data.disclaimer}</span>
                              <span className={cn(
                                "px-2.5 py-1 rounded-full font-bold uppercase tracking-widest shrink-0 flex items-center gap-1",
                                m.data.confidence >= 0.8 ? "bg-emerald-100 text-emerald-700" :
                                m.data.confidence >= 0.4 ? "bg-amber-100 text-amber-700" :
                                "bg-red-100 text-red-700"
                              )}>
                                Confidence: {Math.round(m.data.confidence * 100)}%
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
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center shrink-0 shadow-sm">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-5 py-4 flex items-center gap-3 shadow-sm">
                  <Loader2 className="h-4 w-4 text-primary animate-spin" />
                  <span className="text-sm font-medium text-slate-600">Analyzing deterministic data...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          <div className="p-4 border-t border-border bg-white">
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
              className="flex gap-3 max-w-4xl mx-auto relative"
            >
              <input 
                type="text" 
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask the AI Finance Copilot..."
                className="flex-1 bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white p-4 pr-14 outline-none transition-all shadow-inner"
                disabled={chatMutation.isPending}
              />
              <button 
                type="submit" 
                disabled={!input.trim() || chatMutation.isPending}
                className="absolute right-2 top-2 bottom-2 bg-primary hover:bg-primary/90 text-white rounded-lg w-10 flex items-center justify-center disabled:opacity-50 transition-colors cursor-pointer"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </Card>
      </div>

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-primary" />
                Upload Dataset
              </h3>
              <button 
                onClick={() => setIsUploadModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1 rounded-md transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
              <FileSelector label="Ledger" file={ledgerFile} setFile={setLedgerFile} inputRef={ledgerRef} />
              <FileSelector label="Gateway" file={gatewayFile} setFile={setGatewayFile} inputRef={gatewayRef} />
              <FileSelector label="Bank" file={bankFile} setFile={setBankFile} inputRef={bankRef} />
            </div>
            <div className="p-6 border-t border-slate-100 bg-slate-50/50">
              <button
                onClick={handleUpload}
                disabled={uploadMutation.isPending || !ledgerFile || !gatewayFile || !bankFile}
                className="w-full cursor-pointer inline-flex items-center justify-center rounded-xl text-sm font-bold transition-all bg-primary text-white hover:bg-primary/90 h-12 disabled:opacity-50 shadow-sm"
              >
                {uploadMutation.isPending ? (
                  <><Activity className="mr-2 h-4 w-4 animate-spin" /> Processing Data...</>
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

