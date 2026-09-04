import { useState } from 'react';
import { Play, Activity, CheckCircle, AlertTriangle, Database } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { runReconciliation } from '../services/api';
import type { PipelineRunResponse } from '../types/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui';

export default function Dashboard() {
  const [data, setData] = useState<PipelineRunResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRun = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await runReconciliation();
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to run reconciliation');
    } finally {
      setLoading(false);
    }
  };

  const chartData = data ? Object.entries(data.classification_counts).map(([name, value]) => ({
    name: name.replace('_', ' ').toUpperCase(),
    value
  })) : [];

  const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#64748b'];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h2>
          <p className="text-slate-500">Executive overview of your reconciliation pipeline.</p>
        </div>
        <button
          onClick={handleRun}
          disabled={loading}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 py-2"
        >
          {loading ? (
            <Activity className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Play className="mr-2 h-4 w-4" />
          )}
          Run Pipeline
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md border border-red-200">
          {error}
        </div>
      )}

      {!data && !loading && !error && (
        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
          <Database className="h-10 w-10 text-slate-400 mb-4" />
          <h3 className="text-lg font-medium text-slate-900">No Data Available</h3>
          <p className="text-slate-500 max-w-sm text-center mt-2 mb-4">
            Run the reconciliation pipeline to process transactions and identify exceptions.
          </p>
          <button onClick={handleRun} className="text-blue-600 font-medium hover:underline">
            Start Reconciliation &rarr;
          </button>
        </div>
      )}

      {data && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
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
        </>
      )}
    </div>
  );
}
