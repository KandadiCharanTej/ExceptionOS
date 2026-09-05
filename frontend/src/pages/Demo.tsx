import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Database, Activity, Server, FileText, CheckCircle, AlertTriangle, UploadCloud, Globe, Landmark, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

import { uploadReconciliationFiles } from '../services/api';
import { Card, CardContent, Badge } from '../components/ui';
import { cn } from '../App';
import { useApp } from '../context/AppContext';

export default function Reconcile() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setActiveDatasetId } = useApp();
  
  const [ledgerFile, setLedgerFile] = useState<File | null>(null);
  const [gatewayFile, setGatewayFile] = useState<File | null>(null);
  const [bankFile, setBankFile] = useState<File | null>(null);

  const ledgerRef = useRef<HTMLInputElement>(null);
  const gatewayRef = useRef<HTMLInputElement>(null);
  const bankRef = useRef<HTMLInputElement>(null);

  const [activeStep, setActiveStep] = useState<number>(0);
  const [demoScenario, setDemoScenario] = useState<string>('');

  const uploadMutation = useMutation({
    mutationFn: (files: { ledger: File, gateway: File, bank: File }) => 
      uploadReconciliationFiles(files.ledger, files.gateway, files.bank),
    onMutate: () => {
      setActiveStep(1); // Ingestion
      setTimeout(() => setActiveStep(2), 1500); // Matching
      setTimeout(() => setActiveStep(3), 3000); // Detection
      setTimeout(() => setActiveStep(4), 4500); // RCA
    },
    onSuccess: (data) => {
      setActiveStep(5); // Complete
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
      toast.success('Reconciliation completed successfully');
      if (data?.dataset_id) {
        setActiveDatasetId(data.dataset_id);
      }
      setTimeout(() => {
        navigate(data?.dataset_id ? `/cases?dataset_id=${data.dataset_id}` : '/cases');
      }, 2000);
    },
    onError: (error: any) => {
      setActiveStep(0);
      toast.error(error.response?.data?.detail || error.message || 'Failed to process files');
    }
  });

  const demoMutation = useMutation({
    mutationFn: async (scenario: string) => {
      const res = await fetch(`/api/evaluation/run?scenario_type=${scenario}`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to run evaluation');
      return res.json();
    },
    onMutate: () => {
      setActiveStep(1);
      setTimeout(() => setActiveStep(2), 1500);
      setTimeout(() => setActiveStep(3), 3000);
      setTimeout(() => setActiveStep(4), 4500);
    },
    onSuccess: (data) => {
      setActiveStep(5);
      toast.success('Synthetic Demo completed successfully!');
      if (data?.dataset_id) {
        setActiveDatasetId(data.dataset_id);
      }
      setTimeout(() => {
        navigate(data?.dataset_id ? `/performance?dataset_id=${data.dataset_id}` : '/performance');
      }, 2000);
    },
    onError: (error: any) => {
      setActiveStep(0);
      toast.error(error.message || 'Evaluation failed');
    }
  });

  const handleRunReconciliation = () => {
    if (demoScenario) {
      demoMutation.mutate(demoScenario);
    } else {
      if (!ledgerFile || !gatewayFile || !bankFile) {
        toast.error('Please provide all three CSV files, or select a Demo Scenario.');
        return;
      }
      uploadMutation.mutate({ ledger: ledgerFile, gateway: gatewayFile, bank: bankFile });
    }
  };

  const isProcessing = uploadMutation.isPending || demoMutation.isPending;

  const FileBox = ({ 
    title, icon: Icon, file, setFile, inputRef, colorClass, borderClass
  }: any) => (
    <div className={cn(
      "flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all duration-300 relative overflow-hidden group cursor-pointer",
      file ? borderClass + " bg-slate-50" : "border-dashed border-slate-200 bg-white hover:border-primary/50",
      isProcessing && "opacity-50 pointer-events-none"
    )} onClick={() => !file && inputRef.current?.click()}>
      
      {file && (
        <div className="absolute top-2 right-2">
          <Badge variant="success">Ready</Badge>
        </div>
      )}
      
      <div className={cn("p-4 rounded-full mb-3 transition-colors", file ? colorClass + " text-white" : "bg-slate-100 text-slate-400 group-hover:text-primary group-hover:bg-primary/10")}>
        <Icon className="w-8 h-8" />
      </div>
      
      <h3 className="font-semibold text-slate-900 mb-1">{title}</h3>
      
      <p className="text-xs text-center text-slate-500 max-w-[150px] truncate">
        {file ? (
          <span className="font-medium text-slate-900 flex items-center justify-center">
            {file.name}
            <button 
              onClick={(e) => { e.stopPropagation(); setFile(null); }}
              className="ml-2 text-slate-400 hover:text-red-500"
            >
              ×
            </button>
          </span>
        ) : 'Click to upload CSV'}
      </p>
      
      <input 
        type="file" 
        accept=".csv,text/csv" 
        className="hidden" 
        ref={inputRef} 
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
            setDemoScenario('');
          }
        }}
      />
    </div>
  );

  return (
    <div className="space-y-10 max-w-5xl mx-auto animate-in fade-in duration-500">
      
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">Run Reconciliation</h1>
        <p className="text-slate-500 text-lg">Upload financial data sources or run a synthetic demo scenario to trigger the deterministic engine.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
        
        {/* Data Sources Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          <div className="hidden md:block absolute top-1/2 left-[20%] right-[20%] h-[2px] bg-slate-100 -z-10 -translate-y-1/2"></div>
          
          <FileBox 
            title="Internal Ledger" 
            icon={Server} 
            file={ledgerFile} 
            setFile={setLedgerFile} 
            inputRef={ledgerRef}
            colorClass="bg-blue-600"
            borderClass="border-blue-200"
          />
          <FileBox 
            title="Payment Gateway" 
            icon={Globe} 
            file={gatewayFile} 
            setFile={setGatewayFile} 
            inputRef={gatewayRef}
            colorClass="bg-indigo-600"
            borderClass="border-indigo-200"
          />
          <FileBox 
            title="Bank Statement" 
            icon={Landmark} 
            file={bankFile} 
            setFile={setBankFile} 
            inputRef={bankRef}
            colorClass="bg-emerald-600"
            borderClass="border-emerald-200"
          />
        </div>

        {/* OR Divider */}
        <div className="flex items-center justify-center py-8">
          <div className="h-px bg-slate-200 w-full max-w-[100px]"></div>
          <span className="px-4 text-xs font-bold text-slate-400 uppercase tracking-widest">OR</span>
          <div className="h-px bg-slate-200 w-full max-w-[100px]"></div>
        </div>

        {/* Synthetic Demo Scenarios */}
        <div className="text-center mb-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Run Synthetic Buildathon Data</h3>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              { id: 'NORMAL_RECONCILIATION', label: 'Normal' },
              { id: 'EXCEPTION_SPIKE', label: 'Exception Spike' },
              { id: 'SETTLEMENT_DELAY', label: 'Settlement Delay' },
              { id: 'DUPLICATE_INVESTIGATION', label: 'Duplicates' }
            ].map(s => (
              <button
                key={s.id}
                onClick={() => {
                  setDemoScenario(s.id);
                  setLedgerFile(null);
                  setGatewayFile(null);
                  setBankFile(null);
                }}
                disabled={isProcessing}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium transition-colors border",
                  demoScenario === s.id 
                    ? "bg-primary text-primary-foreground border-primary" 
                    : "bg-white text-slate-600 border-slate-200 hover:border-primary/50 hover:bg-slate-50",
                  isProcessing && "opacity-50"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* Action Button */}
      <div className="flex justify-center">
        <button
          onClick={handleRunReconciliation}
          disabled={isProcessing || (!demoScenario && (!ledgerFile || !gatewayFile || !bankFile))}
          className={cn(
            "group flex items-center justify-center gap-3 px-8 py-4 rounded-xl text-lg font-bold transition-all duration-300",
            isProcessing 
              ? "bg-slate-100 text-slate-400 border border-slate-200" 
              : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md hover:shadow-lg disabled:opacity-50 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:shadow-none"
          )}
        >
          {isProcessing ? (
            <><Activity className="w-6 h-6 animate-spin" /> Processing Engine...</>
          ) : (
            <><Database className="w-6 h-6" /> Initialize 3-Way Match <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>
          )}
        </button>
      </div>

      {/* Progress Visualization */}
      {isProcessing && (
        <Card className="border-primary/20 bg-primary/5 animate-in slide-in-from-bottom-4">
          <CardContent className="p-8">
            <div className="flex justify-between items-center relative">
              <div className="absolute left-0 right-0 top-1/2 h-1 bg-slate-200 -z-10 -translate-y-1/2 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-1000 ease-in-out" 
                  style={{ width: `${(activeStep / 4) * 100}%` }}
                ></div>
              </div>
              
              {[
                { step: 1, label: 'Data Ingestion', icon: UploadCloud },
                { step: 2, label: 'Matching Transactions', icon: Activity },
                { step: 3, label: 'Detecting Exceptions', icon: AlertTriangle },
                { step: 4, label: 'Root Cause Analysis', icon: FileText }
              ].map((s) => (
                <div key={s.step} className="flex flex-col items-center bg-transparent">
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center mb-3 border-2 transition-colors duration-500",
                    activeStep > s.step ? "bg-primary border-primary text-white" :
                    activeStep === s.step ? "bg-white border-primary text-primary shadow-[0_0_15px_rgba(79,70,229,0.3)] animate-pulse" :
                    "bg-white border-slate-200 text-slate-300"
                  )}>
                    {activeStep > s.step ? <CheckCircle className="w-6 h-6" /> : <s.icon className="w-5 h-5" />}
                  </div>
                  <span className={cn(
                    "text-xs font-bold uppercase tracking-wider",
                    activeStep >= s.step ? "text-primary" : "text-slate-400"
                  )}>{s.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {activeStep === 5 && (
        <div className="flex flex-col items-center justify-center p-8 bg-emerald-50 rounded-2xl border border-emerald-100 animate-in zoom-in-95 duration-500">
          <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/20">
            <CheckCircle className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Reconciliation Complete</h2>
          <p className="text-emerald-700 font-medium mb-6">Deterministic rules applied successfully.</p>
          <Activity className="w-6 h-6 animate-spin text-emerald-400" />
          <p className="text-xs text-slate-500 mt-2">Redirecting to results...</p>
        </div>
      )}

    </div>
  );
}
