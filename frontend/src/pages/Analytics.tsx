import { useEffect, useState } from 'react';
import { getCases } from '../services/api';
import type { CaseListResponse } from '../types/api';
import { PageHeader, Metric, ChartContainer, LoadingState, ErrorState, Surface, PageContainer } from '../components/ui';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { BarChart3, PieChart as PieIcon, Lightbulb } from 'lucide-react';

const COLORS = ['#0F172A', '#2563EB', '#F59E0B', '#EF4444'];

export default function Analytics() {
  const [data, setData] = useState<CaseListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCases(1, 100)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState message="Aggregating financial intelligence..." />;
  if (error) return <ErrorState title="Unable to load analytics" message={error} />;

  if (!data?.items.length) {
    return (
      <PageContainer className="space-y-8">
        <PageHeader overline="Intelligence" title="Financial Intelligence" description="Run a reconciliation to see analytics." />
      </PageContainer>
    );
  }

  const classificationMap: Record<string, number> = {};
  const rootCauseMap: Record<string, number> = {};
  let exceptionCount = 0;

  data.items.forEach((c) => {
    const cls = c.classification.replace(/_/g, ' ');
    classificationMap[cls] = (classificationMap[cls] || 0) + 1;
    if (c.classification !== 'matched') exceptionCount++;
    if (c.root_cause) {
      const rc = c.root_cause.replace(/_/g, ' ');
      rootCauseMap[rc] = (rootCauseMap[rc] || 0) + 1;
    }
  });

  const classificationData = Object.entries(classificationMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  const rootCauseData = Object.entries(rootCauseMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  const totalRecords = data.items.length;
  const exceptionRate = ((exceptionCount / totalRecords) * 100).toFixed(1);
  const largestCategory = classificationData.filter((c) => c.name !== 'matched')[0];
  const topRootCause = rootCauseData[0];

  return (
    <PageContainer className="space-y-12">
      <PageHeader
        overline="Intelligence"
        title="Financial Intelligence"
        description="Understand operational patterns, exception distribution, and financial risk."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Metric label="Total Records" value={totalRecords} size="compact" />
        <Metric label="Exception Rate" value={`${exceptionRate}%`} variant="error" subtitle={`${exceptionCount} records`} size="compact" />
        <Metric label="Largest Exception" value={largestCategory?.name || '—'} variant="warning" size="compact" subtitle={`${largestCategory?.value || 0} cases`} />
        <Metric label="Top Root Cause" value={topRootCause?.name || '—'} variant="accent" size="compact" subtitle={`${topRootCause?.value || 0} cases`} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <ChartContainer title="Exception Distribution" icon={BarChart3}>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={classificationData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Bar dataKey="value" fill="#2563EB" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartContainer>

        <ChartContainer title="Root Cause Patterns" icon={PieIcon}>
          {rootCauseData.length > 0 ? (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={rootCauseData} cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={3} dataKey="value">
                    {rootCauseData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-3 mt-2">
                {rootCauseData.slice(0, 4).map((d, i) => (
                  <span key={d.name} className="flex items-center gap-1.5 text-[11px] text-slate-600 capitalize">
                    <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />{d.name}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-sm text-slate-500">No root cause data</div>
          )}
        </ChartContainer>
      </div>

      {largestCategory && (
        <Surface className="p-6 border-l-4 border-l-blue-600">
          <div className="flex items-start gap-4">
            <div className="p-2.5 rounded-xl bg-blue-50"><Lightbulb className="w-5 h-5 text-blue-600" /></div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">Key Insight</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                <span className="capitalize font-semibold">{largestCategory.name}</span> is the largest exception category with{' '}
                <strong>{largestCategory.value}</strong> occurrences ({((largestCategory.value / totalRecords) * 100).toFixed(1)}% of records).
                {topRootCause && <> Most frequent root cause: <span className="capitalize font-semibold">{topRootCause.name}</span>.</>}
              </p>
              <p className="text-[11px] text-slate-400 mt-2 italic">Derived from deterministic reconciliation data.</p>
            </div>
          </div>
        </Surface>
      )}
    </PageContainer>
  );
}
