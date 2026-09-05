import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Database, UploadCloud, Search, Trash2, LineChart, AlertTriangle,
  Play, CheckCircle2, FileText, X, ArrowDown, Activity, PlusCircle
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getDatasets, deleteDataset, uploadReconciliationFiles } from '../services/api';
import {
  Badge, StatusBadge, PageHeader, Surface, PrimaryButton, SecondaryButton,
  LoadingState, ErrorState, EmptyState, SectionHeader, PageContainer
} from '../components/ui';
import { cn } from '../lib/utils';

function UploadStep({
  step, title, file, setFile, inputRef
}: {
  step: number; title: string; file: File | null;
  setFile: (f: File | null) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <div className={cn(
      'flex-1 p-6 rounded-2xl border-2 border-dashed transition-all',
      file ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-200 bg-white hover:border-blue-300'
    )}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Step {step}</p>
      <h3 className="text-base font-bold text-slate-900 mb-4">{title}</h3>
      {file ? (
        <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-emerald-200">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="text-xs font-semibold truncate">{file.name}</span>
          </div>
          <button onClick={() => setFile(null)} className="text-slate-400 hover:text-red-500 cursor-pointer"><X className="w-4 h-4" /></button>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full py-8 flex flex-col items-center gap-2 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
        >
          <UploadCloud className="w-6 h-6" />
          <span className="text-xs font-medium">Drop CSV or Browse</span>
        </button>
      )}
      <input type="file" accept=".csv" className="hidden" ref={inputRef}
        onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])} />
    </div>
  );
}

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
  const [datasetToDelete, setDatasetToDelete] = useState<{ id: string; name: string } | null>(null);
  const [latestResult, setLatestResult] = useState<{ dataset_id: string; total_cases: number; matched_cases: number; exception_count: number } | null>(null);

  const { data: datasetsData, isLoading, isError, error } = useQuery({ queryKey: ['datasets'], queryFn: getDatasets });

  const uploadMutation = useMutation({
    mutationFn: (files: { ledger: File; gateway: File; bank: File }) =>
      uploadReconciliationFiles(files.ledger, files.gateway, files.bank),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
      toast.success('Reconciliation complete');
      setLatestResult({ dataset_id: data.dataset_id, total_cases: data.total_cases, matched_cases: data.matched_cases, exception_count: data.exceptions_found });
      setLedgerFile(null); setGatewayFile(null); setBankFile(null);
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDataset,
    onSuccess: () => { toast.success('Deleted'); queryClient.invalidateQueries({ queryKey: ['datasets'] }); setDatasetToDelete(null); },
    onError: (err: any) => toast.error(err.message),
  });

  const datasets = datasetsData?.datasets || [];
  const filtered = datasets.filter((ds) => ds.name.toLowerCase().includes(searchQuery.toLowerCase()) || ds.id.includes(searchQuery));

  return (
    <PageContainer className="space-y-12">
      {datasetToDelete && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Surface className="max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-2 text-red-600"><AlertTriangle className="w-5 h-5" /><h3 className="font-bold text-slate-900">Delete Dataset?</h3></div>
            <p className="text-sm text-slate-600">Permanently delete <strong>{datasetToDelete.name}</strong> and all associated cases.</p>
            <div className="flex justify-end gap-3">
              <SecondaryButton onClick={() => setDatasetToDelete(null)}>Cancel</SecondaryButton>
              <button onClick={() => deleteMutation.mutate(datasetToDelete.id)} className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold cursor-pointer">Delete</button>
            </div>
          </Surface>
        </div>
      )}

      <PageHeader
        overline="Operations"
        title="Run Reconciliation"
        description="Compare financial records across Ledger, Gateway, and Bank settlement systems."
      />

      {/* Workflow */}
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <UploadStep step={1} title="Ledger" file={ledgerFile} setFile={setLedgerFile} inputRef={ledgerRef} />
          <UploadStep step={2} title="Gateway" file={gatewayFile} setFile={setGatewayFile} inputRef={gatewayRef} />
          <UploadStep step={3} title="Bank" file={bankFile} setFile={setBankFile} inputRef={bankRef} />
        </div>

        {/* Pipeline diagram */}
        <div className="flex flex-col items-center gap-3 py-6">
          <div className="flex items-center gap-3 text-xs font-bold text-slate-600">
            <span className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg">Ledger</span>
            <span className="text-slate-300">+</span>
            <span className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg">Gateway</span>
            <span className="text-slate-300">+</span>
            <span className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg">Bank</span>
          </div>
          <ArrowDown className="w-4 h-4 text-slate-300" />
          <div className="px-5 py-2 bg-[#0F172A] text-white rounded-xl text-xs font-bold tracking-wide">ExceptionOS Deterministic Engine</div>
          <ArrowDown className="w-4 h-4 text-slate-300" />
          <span className="text-xs font-semibold text-blue-600">Reconciliation Results</span>
        </div>

        {uploadMutation.isPending ? (
          <Surface className="p-6 flex items-center gap-3">
            <Activity className="w-5 h-5 text-blue-600 animate-spin" />
            <span className="text-sm font-semibold text-slate-800">Processing 3-way reconciliation...</span>
          </Surface>
        ) : (
          <PrimaryButton
            onClick={() => {
              if (!ledgerFile || !gatewayFile || !bankFile) { toast.error('Select all three CSV files'); return; }
              setLatestResult(null);
              uploadMutation.mutate({ ledger: ledgerFile, gateway: gatewayFile, bank: bankFile });
            }}
            disabled={!ledgerFile || !gatewayFile || !bankFile}
            className="w-full py-4 text-base"
          >
            <Play className="w-5 h-5" /> Run Reconciliation →
          </PrimaryButton>
        )}

        {latestResult && (
          <Surface className="p-6 border-emerald-200 bg-emerald-50/30">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span className="font-bold text-emerald-800">Reconciliation Complete</span>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              {[
                ['Records', latestResult.total_cases, 'text-slate-900'],
                ['Matched', latestResult.matched_cases, 'text-emerald-600'],
                ['Exceptions', latestResult.exception_count, 'text-red-600'],
              ].map(([label, val, color]) => (
                <div key={label as string} className="text-center p-4 bg-white rounded-xl">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
                  <p className={cn('text-2xl font-bold tabular-nums mt-1', color)}>{(val as number).toLocaleString()}</p>
                </div>
              ))}
            </div>
            <PrimaryButton onClick={() => navigate(`/cases?dataset_id=${latestResult.dataset_id}`)} className="bg-emerald-700 hover:bg-emerald-800">
              View Investigation Queue →
            </PrimaryButton>
          </Surface>
        )}
      </div>

      {/* History */}
      <div>
        <SectionHeader
          title="Reconciliation History"
          action={
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search..."
                className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm w-48 focus:outline-none focus:border-blue-500" />
            </div>
          }
        />
        {isError && <ErrorState title="Failed to load" message={(error as Error)?.message} />}
        <Surface className="overflow-hidden">
          {isLoading ? <LoadingState /> : filtered.length === 0 ? (
            <EmptyState icon={Database} title="No datasets" description="Run your first reconciliation above."
              action={<PrimaryButton onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}><PlusCircle className="w-4 h-4" /> Upload Files</PrimaryButton>} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                    <th className="px-6 py-4 text-left">Dataset</th>
                    <th className="px-6 py-4 text-right">Records</th>
                    <th className="px-6 py-4 text-right">Exceptions</th>
                    <th className="px-6 py-4 text-left">Status</th>
                    <th className="px-6 py-4 text-left">Created</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((ds) => (
                    <tr key={ds.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/80 group">
                      <td className="px-6 py-4 font-semibold text-slate-900">{ds.name}</td>
                      <td className="px-6 py-4 text-right tabular-nums">{ds.total_cases.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right"><span className={cn('font-bold tabular-nums', ds.exception_count > 0 ? 'text-red-600' : 'text-emerald-600')}>{ds.exception_count}</span></td>
                      <td className="px-6 py-4"><StatusBadge status={ds.status} /></td>
                      <td className="px-6 py-4 text-xs text-slate-500">{new Date(ds.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric' })}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => navigate(`/cases?dataset_id=${ds.id}`)} className="p-1.5 hover:bg-blue-50 rounded-lg cursor-pointer" title="Investigate"><Search className="w-4 h-4 text-blue-600" /></button>
                          <button onClick={() => navigate('/analytics')} className="p-1.5 hover:bg-indigo-50 rounded-lg cursor-pointer" title="Analytics"><LineChart className="w-4 h-4 text-indigo-600" /></button>
                          <button onClick={() => setDatasetToDelete({ id: ds.id, name: ds.name })} className="p-1.5 hover:bg-red-50 rounded-lg cursor-pointer" title="Delete"><Trash2 className="w-4 h-4 text-slate-400" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Surface>
      </div>
    </PageContainer>
  );
}
