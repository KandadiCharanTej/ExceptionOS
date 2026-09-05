import { useEffect, useState } from 'react';
import { getCases } from '../services/api';
import type { CaseListResponse } from '../types/api';
import { LoadingState, ErrorState } from '../components/ui';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { BarChart3, PieChart as PieChartIcon, TrendingUp, AlertTriangle, Lightbulb } from 'lucide-react';
import { cn } from '../App';

export default function Analytics() {
  const [data, setData] = useState<CaseListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await getCases(1, 100);
        setData(res);
      } catch (err: any) {
        setError(err.message || 'Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return <LoadingState message="Aggregating financial intelligence data..." />;
  }

  if (error) {
    return <ErrorState title="Unable to load analytics" message={error} />;
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="space-y-8 max-w-7xl mx-auto pb-12">
        <div className="pb-6 border-b border-slate-200/60">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-1">Intelligence</p>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Financial Intelligence Analytics</h1>
          <p className="text-xs text-slate-500 mt-1">No data available. Run a reconciliation to see analytics.</p>
        </div>
      </div>
    );
  }

  // Classification distribution
  const classificationMap: Record<string, number> = {};
  const rootCauseMap: Record<string, number> = {};
  let totalRecords = data.items.length;
  let exceptionCount = 0;

  data.items.forEach(c => {
    const cls = c.classification.replace(/_/g, ' ');
    classificationMap[cls] = (classificationMap[cls] || 0) + 1;
    if (c.classification !== 'matched') exceptionCount++;

    if (c.root_cause) {
      const rc = c.root_cause.replace(/_/g, ' ');
      rootCauseMap[rc] = (rootCauseMap[rc] || 0) + 1;
    }
  });

  const classificationData = Object.entries(classificationMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const rootCauseData = Object.entries(rootCauseMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const exceptionRate = totalRecords > 0 ? ((exceptionCount / totalRecords) * 100).toFixed(1) : '0';
  const largestCategory = classificationData.filter(c => c.name !== 'matched')[0];
  const topRootCause = rootCauseData[0];

  const CHART_COLORS = ['#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#be185d', '#4f46e5'];

  return (
    <div className="space-y-10 max-w-7xl mx-auto pb-12">
      {/* === HEADER === */}
      <div className="pb-6 border-b border-slate-200/60">
        <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-1">Intelligence</p>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Financial Intelligence Analytics</h1>
        <p className="text-xs text-slate-500 mt-1">Understand reconciliation patterns, exception trends, and operational risk.</p>
      </div>

      {/* === SUMMARY METRICS === */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Total Records</span>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">{totalRecords}</p>
          <p className="text-xs text-slate-500 mt-1">Analyzed transactions</p>
        </div>
        <div className="bg-white rounded-xl border border-red-200/60 p-5 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-widest text-red-500">Exception Rate</span>
          <p className="text-2xl font-extrabold text-red-600 mt-2">{exceptionRate}%</p>
          <p className="text-xs text-slate-500 mt-1">{exceptionCount} of {totalRecords} records</p>
        </div>
        <div className="bg-white rounded-xl border border-amber-200/60 p-5 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-widest text-amber-600">Largest Exception</span>
          <p className="text-lg font-extrabold text-amber-700 mt-2 capitalize truncate">{largestCategory?.name || 'None'}</p>
          <p className="text-xs text-slate-500 mt-1">{largestCategory?.value || 0} occurrences</p>
        </div>
        <div className="bg-white rounded-xl border border-indigo-200/60 p-5 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-widest text-indigo-500">Top Root Cause</span>
          <p className="text-lg font-extrabold text-indigo-700 mt-2 capitalize truncate">{topRootCause?.name || 'None'}</p>
          <p className="text-xs text-slate-500 mt-1">{topRootCause?.value || 0} cases</p>
        </div>
      </div>

      {/* === CHARTS === */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Exception Distribution */}
        <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">Exception Distribution</h3>
          </div>
          <div className="p-6">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={classificationData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" stroke="#94a3b8" tick={{ fill: '#64748b', fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" width={130} tick={{ fontSize: 11, fill: '#334155' }} stroke="#e2e8f0" />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }} 
                    contentStyle={{ backgroundColor: '#fff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  />
                  <Bar dataKey="value" fill="#2563eb" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Root Cause Intelligence */}
        <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center gap-2">
            <PieChartIcon className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">Root Cause Intelligence</h3>
          </div>
          <div className="p-6">
            {rootCauseData.length > 0 ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={rootCauseData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={105}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {rootCauseData.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#fff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                    <Legend 
                      wrapperStyle={{ fontSize: '11px', color: '#475569' }} 
                      formatter={(value: string) => <span className="capitalize text-slate-700">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-sm text-slate-500">
                No root cause data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* === INSIGHT PANEL === */}
      {largestCategory && (
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl border border-indigo-200/60 p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="p-2.5 rounded-xl bg-indigo-100 border border-indigo-200 shrink-0">
              <Lightbulb className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-indigo-900 mb-1">Key Insight</h3>
              <p className="text-sm text-slate-700 leading-relaxed">
                <span className="capitalize font-semibold">{largestCategory.name}</span> transactions represent the largest category of exceptions with <span className="font-bold">{largestCategory.value}</span> occurrences 
                ({((largestCategory.value / totalRecords) * 100).toFixed(1)}% of all records).
                {topRootCause && (
                  <> The most frequent root cause is <span className="capitalize font-semibold">{topRootCause.name}</span> affecting {topRootCause.value} cases.</>
                )}
              </p>
              <p className="text-[11px] text-slate-500 mt-2 italic">
                This insight is derived from deterministic reconciliation data, not AI-generated content.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
