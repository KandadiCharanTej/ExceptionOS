import { useNavigate } from 'react-router-dom';
import { Activity, Database, CheckCircle, AlertTriangle, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

import { getDatasets, getCases } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '../components/ui';
import { useApp } from '../context/AppContext';
import { cn } from '../App';

const COLORS = ['#4f46e5', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6'];

export default function Dashboard() {
  const navigate = useNavigate();
  const { activeDatasetId, setActiveDatasetId } = useApp();
  
  const { data: datasetsData, isLoading: isLoadingDatasets } = useQuery({
    queryKey: ['datasets'],
    queryFn: getDatasets,
  });

  const recentDatasets = datasetsData?.datasets.slice(0, 5) || [];

  // Only select a dataset if activeDatasetId is explicitly set by the user or URL
  const activeDataset = activeDatasetId ? recentDatasets.find(d => d.id === activeDatasetId) : undefined;

  const { data: exceptionsData, isLoading: isLoadingExceptions } = useQuery({
    queryKey: ['cases', activeDataset?.id, 'exceptions'],
    queryFn: () => getCases(1, 100, undefined, activeDataset?.id),
    enabled: !!activeDataset,
  });

  // Calculate real trend data dynamically from existing datasets in DB
  const trendData = (datasetsData?.datasets || []).slice(0, 7).reverse().map(d => ({
    name: d.name.length > 10 ? d.name.substring(0, 8) + '...' : d.name,
    transactions: d.total_cases,
    exceptions: d.exception_count,
  }));

  const displayTrendData = (activeDatasetId && trendData.length > 0) ? trendData : [
    { name: 'Mon', transactions: 0, exceptions: 0 },
    { name: 'Tue', transactions: 0, exceptions: 0 },
    { name: 'Wed', transactions: 0, exceptions: 0 },
    { name: 'Thu', transactions: 0, exceptions: 0 },
    { name: 'Fri', transactions: 0, exceptions: 0 },
    { name: 'Sat', transactions: 0, exceptions: 0 },
    { name: 'Sun', transactions: 0, exceptions: 0 },
  ];

  // Calculate real exception distribution dynamically from active dataset exceptions
  const exceptionCounts: Record<string, number> = {};
  if (exceptionsData?.items) {
    exceptionsData.items.forEach(c => {
      if (c.classification !== 'matched') {
        const label = c.classification.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        exceptionCounts[label] = (exceptionCounts[label] || 0) + 1;
      }
    });
  }
  const exceptionDistribution = Object.entries(exceptionCounts).map(([name, value]) => ({ name, value }));

  const displayExceptionDistribution = (activeDatasetId && exceptionDistribution.length > 0) ? exceptionDistribution : [
    { name: 'No Active Data', value: 1 }
  ];

  const handleSelectDataset = (id: string) => {
    setActiveDatasetId(id);
    navigate(`/cases?dataset_id=${id}`);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-1">Financial Intelligence</h1>
          <p className="text-slate-500">Monitor your deterministic reconciliation pipeline and active exceptions.</p>
        </div>
        <button
          onClick={() => navigate('/demo')}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-5 py-2.5 rounded-lg shadow-sm transition-all cursor-pointer"
        >
          Run Reconciliation
        </button>
      </div>

      {!activeDatasetId && (
        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center flex flex-col items-center justify-center">
          <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-slate-100">
            <Database className="w-7 h-7 text-slate-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">No Active Dataset Selected</h3>
          <p className="text-slate-500 max-w-md mx-auto text-sm leading-relaxed mb-6">
            Upload your 3-way financial CSV files (Internal Ledger, Payment Gateway, Bank Statement) or run a synthetic scenario to initialize reconciliation metrics.
          </p>
          <button
            onClick={() => navigate('/demo')}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 py-3 rounded-xl shadow-sm transition-all cursor-pointer inline-flex items-center gap-2"
          >
            <Database className="w-4 h-4" /> Upload Dataset & Run Reconciliation
          </button>
        </div>
      )}

      {/* Top KPIs */}
      <div className="grid gap-5 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-row items-center justify-between pb-2">
              <h3 className="text-sm font-medium text-slate-500">Total Transactions</h3>
              <div className="p-2 bg-indigo-50 rounded-lg">
                <Database className="h-4 w-4 text-primary" />
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-900">
              {isLoadingDatasets ? <Activity className="h-6 w-6 animate-spin text-slate-300" /> : (activeDataset?.total_cases?.toLocaleString() || '-')}
            </div>
            <div className="mt-2 flex items-center text-xs text-slate-500">
              {activeDataset ? (
                <span className="text-indigo-600 font-medium bg-indigo-50 px-1.5 py-0.5 rounded truncate max-w-full">
                  Batch: {activeDataset.name}
                </span>
              ) : (
                <span>No active batch selected</span>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-row items-center justify-between pb-2">
              <h3 className="text-sm font-medium text-slate-500">Match Rate</h3>
              <div className="p-2 bg-emerald-50 rounded-lg">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-900">
              {isLoadingDatasets ? <Activity className="h-6 w-6 animate-spin text-slate-300" /> : 
                (activeDataset && activeDataset.total_cases > 0 
                  ? `${((activeDataset.matched_cases / activeDataset.total_cases) * 100).toFixed(1)}%` 
                  : '-')}
            </div>
            <div className="mt-2 flex items-center text-xs text-slate-500">
              {activeDataset ? (
                <span className="text-emerald-600 font-medium bg-emerald-50 px-1.5 py-0.5 rounded">
                  {activeDataset.matched_cases.toLocaleString()} matched
                </span>
              ) : (
                <span>No active batch selected</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className={cn(activeDataset && activeDataset.exception_count > 0 ? "border-red-100 bg-red-50/30" : "")}>
          <CardContent className="p-6">
            <div className="flex flex-row items-center justify-between pb-2">
              <h3 className="text-sm font-medium text-slate-500">Active Exceptions</h3>
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-900">
              {isLoadingDatasets ? <Activity className="h-6 w-6 animate-spin text-red-300" /> : (activeDataset ? activeDataset.exception_count.toLocaleString() : '-')}
            </div>
            <div className="mt-2 flex items-center text-xs text-slate-500">
              {activeDataset ? (
                <span className={cn("font-medium px-1.5 py-0.5 rounded", activeDataset.exception_count > 0 ? "text-red-600 bg-red-100" : "text-emerald-600 bg-emerald-50")}>
                  {activeDataset.exception_count > 0 ? `${activeDataset.exception_count} require review` : "All clear"}
                </span>
              ) : (
                <span>No active batch selected</span>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-row items-center justify-between pb-2">
              <h3 className="text-sm font-medium text-slate-500">Resolution Rate</h3>
              <div className="p-2 bg-indigo-50 rounded-lg">
                <Activity className="h-4 w-4 text-indigo-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-900">
              {activeDataset ? (
                activeDataset.exception_count > 0 
                  ? `${Math.round(((activeDataset.matched_cases) / activeDataset.total_cases) * 100)}%` 
                  : '100%'
              ) : '-'}
            </div>
            <div className="mt-2 flex items-center text-xs text-slate-500">
              <span>{activeDataset ? "Automated reconciliation" : "No active batch selected"}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Visualizations Row */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Reconciliation Volume Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={displayTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTx" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorExc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dx={-10} domain={[0, 'auto']} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ fontSize: '14px', fontWeight: 500 }}
                  />
                  <Area type="linear" dataKey="transactions" stroke="#4f46e5" strokeWidth={2} fillOpacity={1} fill="url(#colorTx)" />
                  <Area type="linear" dataKey="exceptions" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorExc)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Exception Distribution</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center">
            <div className="h-[250px] w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={displayExceptionDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {displayExceptionDistribution.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={exceptionDistribution.length > 0 ? COLORS[index % COLORS.length] : '#cbd5e1'} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ fontSize: '14px', fontWeight: 500 }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Datasets */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Data Batches</CardTitle>
            <button onClick={() => navigate(activeDataset ? `/cases?dataset_id=${activeDataset.id}` : '/cases')} className="text-sm font-medium text-primary hover:text-primary/80 flex items-center transition-colors cursor-pointer">
              View All <ChevronRight className="h-4 w-4 ml-1" />
            </button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-y border-border">
                  <tr>
                    <th className="px-6 py-3 font-medium">Dataset Name</th>
                    <th className="px-6 py-3 font-medium text-right">Cases</th>
                    <th className="px-6 py-3 font-medium text-right">Exceptions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoadingDatasets ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-slate-500">
                        <Activity className="h-5 w-5 animate-spin mx-auto mb-2" />
                        Loading...
                      </td>
                    </tr>
                  ) : recentDatasets.length > 0 ? (
                    recentDatasets.map(ds => (
                      <tr 
                        key={ds.id} 
                        className={cn(
                          "hover:bg-slate-50 transition-colors cursor-pointer group",
                          ds.id === activeDataset?.id && "bg-indigo-50/40 font-semibold"
                        )} 
                        onClick={() => handleSelectDataset(ds.id)}
                      >
                        <td className="px-6 py-4 text-slate-900 group-hover:text-primary transition-colors flex items-center gap-2">
                          {ds.id === activeDataset?.id && <span className="w-2 h-2 rounded-full bg-primary inline-block"></span>}
                          {ds.name}
                        </td>
                        <td className="px-6 py-4 text-right text-slate-600">{ds.total_cases.toLocaleString()}</td>
                        <td className="px-6 py-4 text-right font-medium text-red-600">{ds.exception_count.toLocaleString()}</td>
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

        {/* Priority Investigation Queue */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between border-b border-border">
            <div className="flex items-center">
              <div className="p-1.5 bg-red-100 rounded-md mr-3">
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </div>
              <CardTitle className="text-base text-slate-900">Priority Investigation Queue</CardTitle>
            </div>
            {activeDataset && (
              <button onClick={() => navigate(`/cases?dataset_id=${activeDataset.id}`)} className="text-sm font-medium text-primary hover:text-primary/80 transition-colors cursor-pointer">
                View Queue
              </button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {isLoadingExceptions ? (
              <div className="p-8 text-center text-slate-500">
                <Activity className="h-5 w-5 animate-spin mx-auto mb-2" />
                Loading exceptions...
              </div>
            ) : exceptionsData?.items.filter(c => c.classification !== 'matched').slice(0, 4).map(c => (
              <div key={c.case_id} className="p-4 border-b border-border hover:bg-slate-50 transition-colors flex items-center justify-between group cursor-pointer" onClick={() => navigate(`/cases/${c.case_id}${activeDataset?.id ? `?dataset_id=${activeDataset.id}` : ''}`)}>
                <div>
                  <div className="text-sm font-bold text-slate-900 mb-1.5 group-hover:text-primary transition-colors">{c.case_id}</div>
                  <div className="flex items-center text-xs gap-2">
                    <Badge variant="error">{c.classification.replace('_', ' ')}</Badge>
                    {c.confidence_score !== null && <span className="text-slate-500 font-medium">Confidence: {c.confidence_score}%</span>}
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-primary transition-colors" />
              </div>
            ))}
            
            {(!exceptionsData || exceptionsData.items.filter(c => c.classification !== 'matched').length === 0) && !isLoadingExceptions && (
              <div className="p-8 text-center flex flex-col items-center">
                <div className="h-12 w-12 bg-emerald-50 rounded-full flex items-center justify-center mb-3">
                  <CheckCircle className="h-6 w-6 text-emerald-500" />
                </div>
                <h3 className="text-sm font-medium text-slate-900 mb-1">Queue Clear</h3>
                <p className="text-sm text-slate-500">No active exceptions require investigation.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

