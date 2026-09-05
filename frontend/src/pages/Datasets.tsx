import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Database, 
  UploadCloud, 
  Search, 
  Trash2, 
  LineChart, 
  AlertTriangle, 
  Play, 
  CheckCircle2, 
  FileText, 
  X, 
  ArrowRight,
  Activity,
  PlusCircle
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { getDatasets, deleteDataset, uploadReconciliationFiles } from '../services/api';
import { 
  Badge, 
  StatusBadge, 
  PrimaryButton,
  SecondaryButton,
  LoadingState,
  ErrorState,
  EmptyState
} from '../components/ui';
import { cn } from '../App';

export default function Datasets() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  
  const [ledgerFile, setLedgerFile] = useState<File | null>(null);
  const [gatewayFile, setGatewayFile] = useState<File | null>(null);
  const [bankFile, setBankFile] = useState<File | null>(null);

  const ledgerRef = useRef<HTMLInputElement>(null);
  const gatewayRef = useRef<HTMLInputElement>(null);
  const bankRef = useRef<HTMLInputElement>(null);

  const [datasetToDelete, setDatasetToDelete] = useState<{id: string, name: string} | null>(null);
  const [latestResult, setLatestResult] = useState<{dataset_id: string, total_cases: number, matched_cases: number, exception_count: number} | null>(null);

  const { data: datasetsData, isLoading, isError, error } = useQuery({
    queryKey: ['datasets'],
    queryFn: getDatasets,
  });

  const uploadMutation = useMutation({
    mutationFn: (files: { ledger: File, gateway: File, bank: File }) => 
      uploadReconciliationFiles(files.ledger, files.gateway, files.bank),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
      toast.success('Reconciliation completed successfully');
      setLatestResult({
        dataset_id: data.dataset_id,
        total_cases: data.total_cases,
        matched_cases: data.matched_cases,
        exception_count: data.exceptions_found
      });
      setLedgerFile(null);
      setGatewayFile(null);
      setBankFile(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || err.message || 'Failed to process reconciliation files');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDataset,
    onSuccess: () => {
      toast.success('Dataset deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
      setDatasetToDelete(null);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to delete dataset');
      setDatasetToDelete(null);
    }
  });

  const handleUpload = () => {
    if (!ledgerFile || !gatewayFile || !bankFile) {
      toast.error('Please select all three CSV sources (Ledger, Gateway, Bank).');
      return;
    }
    setLatestResult(null);
    uploadMutation.mutate({ ledger: ledgerFile, gateway: gatewayFile, bank: bankFile });
  };

  const datasets = datasetsData?.datasets || [];
  const filteredDatasets = datasets.filter(ds => 
    ds.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    ds.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const FileCard = ({
    title,
    description,
    file,
    setFile,
    inputRef
  }: {
    title: string;
    description: string;
    file: File | null;
    setFile: (f: File | null) => void;
    inputRef: React.RefObject<HTMLInputElement | null>;
  }) => (
    <div className={cn(
      "p-5 rounded-xl border-2 transition-all duration-200 flex flex-col justify-between h-full",
      file 
        ? "bg-emerald-50/50 border-emerald-300 shadow-sm" 
        : "bg-white border-dashed border-slate-200 hover:border-blue-300 hover:bg-blue-50/20"
    )}>
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="font-bold text-sm text-slate-900">{title}</span>
          {file ? <Badge variant="success">Ready</Badge> : <Badge variant="secondary">Required</Badge>}
        </div>
        <p className="text-[11px] text-slate-500 mb-4 leading-relaxed">{description}</p>
      </div>

      <div>
        {file ? (
          <div className="p-3 bg-white border border-emerald-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-900 truncate">{file.name}</p>
                <p className="text-[10px] text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            </div>
            <button 
              onClick={() => setFile(null)} 
              className="text-slate-400 hover:text-red-600 transition-colors p-1 cursor-pointer"
              title="Remove file"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => inputRef.current?.click()}
            className="w-full py-2.5 px-3 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-lg text-xs font-semibold text-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <UploadCloud className="w-4 h-4 text-blue-600" />
            Select {title} CSV
          </button>
        )}
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
    <div className="space-y-10 max-w-7xl mx-auto pb-12">
      {/* Delete Modal */}
      {datasetToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center text-red-600 gap-2">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="text-lg font-bold text-slate-900">Delete Dataset?</h3>
            </div>
            <p className="text-sm text-slate-600">
              Are you sure you want to delete <span className="font-semibold text-slate-900">"{datasetToDelete.name}"</span>? 
              This will permanently remove all associated cases and audit records.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <SecondaryButton onClick={() => setDatasetToDelete(null)} disabled={deleteMutation.isPending}>
                Cancel
              </SecondaryButton>
              <button 
                onClick={() => deleteMutation.mutate(datasetToDelete.id)}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 cursor-pointer"
              >
                {deleteMutation.isPending ? <Activity className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === HEADER === */}
      <div className="pb-6 border-b border-slate-200/60">
        <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-1">Operations</p>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Reconciliation Data</h1>
        <p className="text-xs text-slate-500 mt-1">Manage reconciliation runs and historical financial datasets.</p>
      </div>

      {/* === UPLOAD WORKSPACE === */}
      <div className="bg-white rounded-xl border border-blue-200/60 overflow-hidden shadow-sm">
        <div className="px-6 py-4 bg-blue-50/30 border-b border-blue-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-blue-100">
              <UploadCloud className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-blue-900">Start 3-Way Reconciliation</h3>
              <p className="text-[11px] text-blue-600/80">Deterministic Pipeline</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* File Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <FileCard
              title="Ledger Source"
              description="Internal ERP or core accounting software transactions ledger."
              file={ledgerFile}
              setFile={setLedgerFile}
              inputRef={ledgerRef}
            />
            <FileCard
              title="Payment Gateway"
              description="Razorpay / payment provider captured charges and payouts."
              file={gatewayFile}
              setFile={setGatewayFile}
              inputRef={gatewayRef}
            />
            <FileCard
              title="Bank Settlement"
              description="Official bank statement credits and settlement line items."
              file={bankFile}
              setFile={setBankFile}
              inputRef={bankRef}
            />
          </div>

          {/* Pipeline Diagram */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3 text-xs font-medium text-slate-600">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 bg-white border border-slate-200 rounded font-bold text-slate-800">LEDGER</span>
              <span className="text-slate-400">+</span>
              <span className="px-2.5 py-1 bg-white border border-slate-200 rounded font-bold text-slate-800">GATEWAY</span>
              <span className="text-slate-400">+</span>
              <span className="px-2.5 py-1 bg-white border border-slate-200 rounded font-bold text-slate-800">BANK</span>
            </div>
            <ArrowRight className="w-4 h-4 text-blue-500" />
            <span className="font-bold text-blue-600 uppercase tracking-wider">Deterministic 3-Way Engine</span>
            <ArrowRight className="w-4 h-4 text-blue-500" />
            <span className="px-3 py-1 bg-blue-600 text-white rounded font-bold">Results</span>
          </div>

          {/* Action */}
          {uploadMutation.isPending ? (
            <div className="p-6 bg-blue-50/50 border border-blue-200 rounded-xl space-y-4">
              <div className="flex items-center gap-3">
                <Activity className="w-5 h-5 text-blue-600 animate-spin" />
                <span className="font-bold text-slate-900 text-sm">Processing 3-Way Reconciliation...</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs font-semibold">
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded border border-emerald-200 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Uploading
                </div>
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded border border-emerald-200 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Validating
                </div>
                <div className="p-2 bg-blue-100 text-blue-800 rounded border border-blue-200 flex items-center gap-1.5 animate-pulse">
                  <Activity className="w-3.5 h-3.5 animate-spin" /> 3-Way Matching
                </div>
                <div className="p-2 bg-slate-100 text-slate-500 rounded border border-slate-200">
                  ○ Exceptions
                </div>
                <div className="p-2 bg-slate-100 text-slate-500 rounded border border-slate-200">
                  ○ Cases Created
                </div>
              </div>
            </div>
          ) : (
            <PrimaryButton 
              onClick={handleUpload}
              disabled={!ledgerFile || !gatewayFile || !bankFile}
              className="w-full py-3.5 text-base shadow-md"
            >
              <Play className="w-5 h-5" />
              Run Reconciliation Pipeline
            </PrimaryButton>
          )}

          {/* Results */}
          {latestResult && (
            <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-800 font-bold">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  Reconciliation Complete
                </div>
                <Badge variant="success">Success</Badge>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-white rounded-xl border border-emerald-100 text-center">
                  <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Records</p>
                  <p className="text-2xl font-extrabold text-slate-900 mt-1">{latestResult.total_cases.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-white rounded-xl border border-emerald-100 text-center">
                  <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Matched</p>
                  <p className="text-2xl font-extrabold text-emerald-600 mt-1">{latestResult.matched_cases.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-white rounded-xl border border-emerald-100 text-center">
                  <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Exceptions</p>
                  <p className="text-2xl font-extrabold text-red-600 mt-1">{latestResult.exception_count.toLocaleString()}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-1">
                <PrimaryButton 
                  onClick={() => navigate(`/cases?dataset_id=${latestResult.dataset_id}`)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-xs py-2"
                >
                  View Investigation Queue →
                </PrimaryButton>
                <SecondaryButton onClick={() => setLatestResult(null)} className="text-xs py-2">
                  Start Another Run
                </SecondaryButton>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* === HISTORICAL DATASETS === */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">Reconciliation History</h3>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Search datasets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-56 shadow-sm"
            />
          </div>
        </div>

        {isError && (
          <ErrorState 
            title="Unable to load datasets"
            message={(error as Error)?.message || 'Failed to communicate with the reconciliation engine.'} 
          />
        )}

        <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-sm">
          {isLoading ? (
            <LoadingState message="Loading reconciliation history..." />
          ) : filteredDatasets.length === 0 ? (
            <EmptyState
              icon={Database}
              title="No reconciliation data yet"
              description={searchQuery ? "No dataset matches your search." : "Upload Ledger, Gateway, and Bank data to run your first deterministic reconciliation."}
              action={!searchQuery ? (
                <PrimaryButton onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                  <PlusCircle className="w-4 h-4" /> Run First Reconciliation
                </PrimaryButton>
              ) : undefined}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-slate-600">
                <thead className="text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/80 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3.5">Dataset</th>
                    <th className="px-6 py-3.5">Source</th>
                    <th className="px-6 py-3.5 text-right">Records</th>
                    <th className="px-6 py-3.5 text-right">Exceptions</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Created</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDatasets.map((dataset) => (
                    <tr key={dataset.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                            <Database className="w-4 h-4" />
                          </div>
                          <span className="font-semibold text-slate-900">{dataset.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="secondary">{dataset.source_type}</Badge>
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-slate-800 tabular-nums">
                        {dataset.total_cases.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={cn("font-bold tabular-nums", dataset.exception_count > 0 ? "text-red-600" : "text-emerald-600")}>
                          {dataset.exception_count.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={dataset.status} />
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {new Date(dataset.created_at).toLocaleString(undefined, {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => navigate(`/cases?dataset_id=${dataset.id}`)}
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                            title="Investigate Cases"
                          >
                            <Search className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => navigate('/analytics')}
                            className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-md transition-colors cursor-pointer"
                            title="View Analytics"
                          >
                            <LineChart className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDatasetToDelete({ id: dataset.id, name: dataset.name })}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                            title="Delete Dataset"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
