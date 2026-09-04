import { useState, useRef } from 'react';
import { Play, Activity, CheckCircle, AlertTriangle, Database, UploadCloud, X, FileText } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { runReconciliation, uploadReconciliationFiles } from '../services/api';
import type { PipelineRunResponse } from '../types/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui';

export default function Dashboard() {
  const [data, setData] = useState<PipelineRunResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [ledgerFile, setLedgerFile] = useState<File | null>(null);
  const [gatewayFile, setGatewayFile] = useState<File | null>(null);
  const [bankFile, setBankFile] = useState<File | null>(null);

  const ledgerRef = useRef<HTMLInputElement>(null);
  const gatewayRef = useRef<HTMLInputElement>(null);
  const bankRef = useRef<HTMLInputElement>(null);

  const handleRunDemo = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await runReconciliation();
      setData(res);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to run reconciliation');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!ledgerFile || !gatewayFile || !bankFile) {
      setError('Please provide all three CSV files (Ledger, Gateway, Bank).');
      return;
    }
    
    setLoading(true);
    setError('');
    try {
      const res = await uploadReconciliationFiles(ledgerFile, gatewayFile, bankFile);
      setData(res);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to process uploaded files');
    } finally {
      setLoading(false);
    }
  };

  const chartData = data ? Object.entries(data.classification_counts).map(([name, value]) => ({
    name: name.replace('_', ' ').toUpperCase(),
    value
  })) : [];

  const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#64748b'];

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
    <div className="flex flex-col space-y-2">
      <span className="text-sm font-medium text-slate-700">{label} CSV</span>
      <div className="flex items-center space-x-3">
        <button
          onClick={() => inputRef.current?.click()}
          className="px-4 py-2 bg-white border border-slate-300 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
        >
          Choose File
        </button>
        <span className="text-sm text-slate-500 truncate max-w-[200px]">
          {file ? (
            <span className="flex items-center text-blue-600 font-medium">
              <FileText className="w-4 h-4 mr-1" />
              {file.name}
              <button onClick={() => setFile(null)} className="ml-2 text-slate-400 hover:text-red-500">
                <X className="w-4 h-4" />
              </button>
            </span>
          ) : 'No file selected'}
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
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h2>
          <p className="text-slate-500">Executive overview of your reconciliation pipeline.</p>
        </div>
        {data && (
          <button
            onClick={() => setData(null)}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors border border-slate-200 bg-white hover:bg-slate-100 h-10 px-4 py-2"
          >
            Start New Session
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md border border-red-200 font-medium flex items-center">
          <AlertTriangle className="w-5 h-5 mr-2 flex-shrink-0" />
          {error}
        </div>
      )}

      {!data && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Custom Upload Card */}
          <Card className="border-blue-100 shadow-sm">
            <CardHeader className="bg-blue-50/50 border-b border-blue-100 pb-4">
              <CardTitle className="flex items-center text-blue-900">
                <UploadCloud className="w-5 h-5 mr-2 text-blue-600" />
                Reconcile Your Financial Data
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <p className="text-sm text-slate-600">Upload your three financial data sources to start the deterministic reconciliation pipeline.</p>
              
              <div className="space-y-5 bg-slate-50 p-5 rounded-lg border border-slate-100">
                <FileSelector label="Ledger" file={ledgerFile} setFile={setLedgerFile} inputRef={ledgerRef} />
                <FileSelector label="Gateway" file={gatewayFile} setFile={setGatewayFile} inputRef={gatewayRef} />
                <FileSelector label="Bank" file={bankFile} setFile={setBankFile} inputRef={bankRef} />
              </div>

              <button
                onClick={handleUpload}
                disabled={loading || !ledgerFile || !gatewayFile || !bankFile}
                className="w-full inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700 h-11 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {loading ? (
                  <><Activity className="mr-2 h-4 w-4 animate-spin" /> Validating data & running reconciliation...</>
                ) : (
                  <><Play className="mr-2 h-4 w-4" /> Run Reconciliation</>
                )}
              </button>
            </CardContent>
          </Card>

          {/* Demo Data Card */}
          <Card className="border-slate-200 border-dashed bg-slate-50/50">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-slate-700">
                <Database className="w-5 h-5 mr-2 text-slate-500" />
                Use Built-in Training Data
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-sm text-slate-600 mb-6">
                Don't have your own CSVs ready? Run the pipeline on the internal ExceptionOS training dataset to explore the intelligence platform.
              </p>
              <button
                onClick={handleRunDemo}
                disabled={loading}
                className="w-full inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors border-2 border-slate-300 bg-white text-slate-700 hover:bg-slate-100 h-11 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Activity className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-2 h-4 w-4" />
                )}
                Run Demo Reconciliation
              </button>
            </CardContent>
          </Card>
        </div>
      )}

      {data && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-row items-center justify-between pb-2">
                  <h3 className="tracking-tight text-sm font-medium text-slate-500">Total Transactions</h3>
                  <Database className="h-4 w-4 text-slate-400" />
                </div>
                <div className="text-3xl font-bold text-slate-900">{data.total_cases}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-row items-center justify-between pb-2">
                  <h3 className="tracking-tight text-sm font-medium text-slate-500">Perfect Matches</h3>
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                </div>
                <div className="text-3xl font-bold text-slate-900">{data.matched_cases}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-row items-center justify-between pb-2">
                  <h3 className="tracking-tight text-sm font-medium text-slate-500">Exceptions Found</h3>
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                </div>
                <div className="text-3xl font-bold text-slate-900">{data.exceptions_found}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Exception Classifications</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {chartData.map((_entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: any) => [`${value} cases`, 'Count']}
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
