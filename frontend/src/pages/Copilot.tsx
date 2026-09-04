import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Bot, Send, ShieldCheck, Loader2, Sparkles, ChevronRight, Activity } from 'lucide-react';
import { getDatasets, askCopilot, prioritizeCases } from '../services/api';
import type { CopilotResponse } from '../types/api';
import { Card, CardContent } from '../components/ui';
import { cn } from '../App';

export default function Copilot() {
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('');
  const [messages, setMessages] = useState<{role: 'user'|'ai', content: string, data?: CopilotResponse}[]>([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
      setMessages(prev => [...prev, { role: 'ai', content: 'AI Copilot is temporarily unavailable. Error: ' + (error.response?.data?.detail || error.message) }]);
    }
  });

  const prioritizeMutation = useMutation({
    mutationFn: () => prioritizeCases(selectedDatasetId),
    onSuccess: (data) => {
      setMessages(prev => [...prev, { role: 'user', content: 'What should I investigate first?' }]);
      setMessages(prev => [...prev, { role: 'ai', content: '', data }]);
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
                        {/* Verified Facts */}
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
                        
                        {/* AI Analysis */}
                        <div className="p-4 border-b border-[#1E293B]">
                          <h4 className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <Sparkles className="h-4 w-4" />
                            AI Analysis
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
                            "px-2 py-0.5 rounded uppercase font-medium tracking-wide",
                            m.data.confidence === 'high' ? "bg-emerald-950 text-emerald-400" :
                            m.data.confidence === 'medium' ? "bg-amber-950 text-amber-400" :
                            "bg-red-950 text-red-400"
                          )}>
                            Confidence: {m.data.confidence}
                          </span>
                        </div>
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
    </div>
  );
}
