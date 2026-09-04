import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Activity, CheckCircle, AlertTriangle, Database, UploadCloud, X, FileText, ChevronRight } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { uploadReconciliationFiles, getDatasets, getCases } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '../components/ui';
import { cn } from '../App';

export default function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [ledgerFile, setLedgerFile] = useState<File | null>(null);
  const [gatewayFile, setGatewayFile] = useState<File | null>(null);
  const [bankFile, setBankFile] = useState<File | null>(null);

  const ledgerRef = useRef<HTMLInputElement>(null);
  const gatewayRef = useRef<HTMLInputElement>(null);
  const bankRef = useRef<HTMLInputElement>(null);

  const { data: datasetsData, isLoading: isLoadingDatasets } = useQuery({
    queryKey: ['datasets'],
    queryFn: getDatasets,
  });

  const recentDatasets = datasetsData?.datasets.slice(0, 5) || [];
  const activeDataset = recentDatasets[0];

  const { data: exceptionsData, isLoading: isLoadingExceptions } = useQuery({
    queryKey: ['cases', activeDataset?.id, 'exceptions'],
    queryFn: () => getCases(1, 5, undefined, activeDataset.id),
    enabled: !!activeDataset,
  });

  const uploadMutation = useMutation({
    mutationFn: (files: { ledger: File, gateway: File, bank: File }) => 
      uploadReconciliationFiles(files.ledger, files.gateway, files.bank),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
      toast.success('Reconciliation completed successfully');
      setLedgerFile(null);
      setGatewayFile(null);
      setBankFile(null);
      navigate('/datasets');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || error.message || 'Failed to process files');
    }
  });

  const handleUpload = () => {
    if (!ledgerFile || !gatewayFile || !bankFile) {
      toast.error('Please provide all three CSV files (Ledger, Gateway, Bank).');
      return;
    }
    uploadMutation.mutate({ ledger: ledgerFile, gateway: gatewayFile, bank: bankFile });
  };

  const FileSelector = ({ 
    label, 
    file, 
    setFile, 
    inputRef 
  }: { 
    label: string, 
    file: File | null, 
    setFile: (f: File | null) => void,
    inputRef: React.RefObject<HTMLInputElement | null>
  }) => (
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
          ) : 'Drag and drop or select file'}
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

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col">
        <h2 className="text-3xl font-bold tracking-tight text-white mb-1">Financial Intelligence Command Center</h2>
        <p className="text-slate-400">Deterministic 3-way reconciliation pipeline monitoring.</p>
      </div>

      {/* Top KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-[#0A0F1C] to-[#0D1526] border-[#1E293B]">
          <CardContent className="p-6">
            <div className="flex flex-row items-center justify-between pb-2">
              <h3 className="tracking-tight text-sm font-medium text-slate-400">Total Transactions</h3>
              <Database className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-3xl font-bold text-white">
              {isLoadingDatasets ? <Activity className="h-6 w-6 animate-spin text-slate-600" /> : (activeDataset?.total_cases || '-')}
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center">
              <span className="text-emerald-400 mr-1">↑</span> Latest Dataset
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-[#0A0F1C] to-[#0D1526] border-[#1E293B]">
          <CardContent className="p-6">
            <div className="flex flex-row items-center justify-between pb-2">
              <h3 className="tracking-tight text-sm font-medium text-slate-400">Perfect Matches</h3>
              <CheckCircle className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-3xl font-bold text-white">
              {isLoadingDatasets ? <Activity className="h-6 w-6 animate-spin text-slate-600" /> : (activeDataset?.matched_cases || '-')}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {activeDataset && activeDataset.total_cases > 0 
                ? `${((activeDataset.matched_cases / activeDataset.total_cases) * 100).toFixed(1)}%` 
                : '-'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#0A0F1C] to-[#1a0f12] border-[#1E293B] border-r-red-900/30">
          <CardContent className="p-6">
            <div className="flex flex-row items-center justify-between pb-2">
              <h3 className="tracking-tight text-sm font-medium text-slate-400">Exceptions</h3>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </div>
            <div className="text-3xl font-bold text-red-500">
              {isLoadingDatasets ? <Activity className="h-6 w-6 animate-spin text-red-900/50" /> : (activeDataset?.exception_count || '-')}
            </div>
            <p className="text-xs text-slate-500 mt-1 text-red-400/70">Requires Investigation</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-[#0A0F1C] to-[#0D1526] border-[#1E293B]">
          <CardContent className="p-6">
            <div className="flex flex-row items-center justify-between pb-2">
              <h3 className="tracking-tight text-sm font-medium text-slate-400">Resolution Rate</h3>
              <Activity className="h-4 w-4 text-indigo-500" />
            </div>
            <div className="text-3xl font-bold text-white">42%</div>
            <p className="text-xs text-slate-500 mt-1">Across Historical Datasets</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Reconciliation Action Panel */}
        <Card className="border-blue-500/20 shadow-xl shadow-blue-900/5 bg-[#0A0F1C]">
          <CardHeader className="bg-blue-900/10 border-b border-[#1E293B] pb-4">
            <CardTitle className="flex items-center text-blue-400">
              <UploadCloud className="w-5 h-5 mr-2" />
              Reconcile Financial Data
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <p className="text-sm text-slate-400">Upload three financial data sources to start the deterministic reconciliation pipeline.</p>
            
            <div className="space-y-4">
              <FileSelector label="Ledger" file={ledgerFile} setFile={setLedgerFile} inputRef={ledgerRef} />
              <FileSelector label="Gateway" file={gatewayFile} setFile={setGatewayFile} inputRef={gatewayRef} />
              <FileSelector label="Bank" file={bankFile} setFile={setBankFile} inputRef={bankRef} />
            </div>

            <button
              onClick={handleUpload}
              disabled={uploadMutation.isPending || !ledgerFile || !gatewayFile || !bankFile}
              className="w-full cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-bold transition-all bg-blue-600 text-white hover:bg-blue-500 h-12 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(37,99,235,0.3)]"
            >
              {uploadMutation.isPending ? (
                <><Activity className="mr-2 h-5 w-5 animate-spin" /> Processing...</>
              ) : (
                <><Play className="mr-2 h-5 w-5" /> Run Reconciliation</>
              )}
            </button>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {/* Recent Datasets */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle>Recent Datasets</CardTitle>
              <button onClick={() => navigate('/datasets')} className="text-sm text-blue-400 hover:text-blue-300 flex items-center cursor-pointer">
                View All <ChevronRight className="h-4 w-4 ml-1" />
              </button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-300">
                  <thead className="text-xs text-slate-400 uppercase bg-[#1E293B]/50 border-y border-[#1E293B]">
                    <tr>
                      <th className="px-6 py-3">Dataset Name</th>
                      <th className="px-6 py-3 text-right">Cases</th>
                      <th className="px-6 py-3 text-right">Exceptions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoadingDatasets ? (
                      <tr>
                        <td colSpan={3} className="px-6 py-8 text-center text-slate-500">
                          <Activity className="h-5 w-5 animate-spin mx-auto mb-2" />
                          Loading...
                        </td>
                      </tr>
                    ) : recentDatasets.length > 0 ? (
                      recentDatasets.map(ds => (
                        <tr key={ds.id} className="border-b border-[#1E293B] hover:bg-[#1E293B]/30 cursor-pointer" onClick={() => navigate(`/cases?dataset_id=${ds.id}`)}>
                          <td className="px-6 py-4 font-medium text-white">{ds.name}</td>
                          <td className="px-6 py-4 text-right">{ds.total_cases}</td>
                          <td className="px-6 py-4 text-right text-red-400">{ds.exception_count}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="px-6 py-8 text-center text-slate-500">No datasets found. Run reconciliation to get started.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Recent High Priority Exceptions */}
          {activeDataset && (
            <Card className="border-red-900/30">
              <CardHeader className="pb-3 border-b border-[#1E293B]">
                <CardTitle className="text-red-400 flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Investigation Queue
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {isLoadingExceptions ? (
                  <div className="p-8 text-center text-slate-500">
                    <Activity className="h-5 w-5 animate-spin mx-auto mb-2" />
                    Loading exceptions...
                  </div>
                ) : exceptionsData?.items.filter(c => c.classification !== 'matched').slice(0, 3).map(c => (
                  <div key={c.case_id} className="p-4 border-b border-[#1E293B] hover:bg-[#1E293B]/30 flex items-center justify-between group cursor-pointer" onClick={() => navigate(`/cases/${c.case_id}?dataset_id=${activeDataset.id}`)}>
                    <div>
                      <div className="text-sm font-bold text-slate-200 mb-1">{c.case_id}</div>
                      <div className="flex items-center text-xs">
                        <Badge variant="error" className="mr-2">{c.classification.replace('_', ' ')}</Badge>
                        {c.confidence_score !== null && <span className="text-slate-400">Confidence: {c.confidence_score}%</span>}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-600 group-hover:text-blue-400 transition-colors" />
                  </div>
                ))}
                
                {(!exceptionsData || exceptionsData.items.filter(c => c.classification !== 'matched').length === 0) && !isLoadingExceptions && (
                  <div className="p-6 text-center text-slate-400 text-sm">
                    No exceptions found in the latest dataset.
                  </div>
                )}
                
                <div className="p-3 text-center bg-slate-900/50">
                  <button onClick={() => navigate(`/cases?dataset_id=${activeDataset.id}`)} className="text-sm text-blue-400 hover:text-blue-300 font-medium cursor-pointer">
                    Open Full Queue →
                  </button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
