import { useEffect, useState } from 'react';
import { getCases } from '../services/api';
import type { CaseListResponse } from '../types/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Activity } from 'lucide-react';

export default function Analytics() {
  const [data, setData] = useState<CaseListResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await getCases(1, 100);
        setData(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)]">
        <Activity className="h-10 w-10 text-blue-500 animate-spin mb-4" />
        <p className="text-slate-400 font-medium">Aggregating historical intelligence data...</p>
      </div>
    );
  }

  // Transform data for charts
  const classificationMap: Record<string, number> = {};
  const statusMap: Record<string, number> = {};
  
  data.cases.forEach(c => {
    classificationMap[c.classification] = (classificationMap[c.classification] || 0) + 1;
    if (c.status) {
      statusMap[c.status] = (statusMap[c.status] || 0) + 1;
    }
  });

  const classificationData = Object.entries(classificationMap).map(([name, value]) => ({
    name: name.replace('_', ' ').toUpperCase(),
    value
  }));

  const statusData = Object.entries(statusMap).map(([name, value]) => ({
    name: name.replace('_', ' ').toUpperCase(),
    value
  }));

  const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6'];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white mb-1">Intelligence Analytics</h2>
        <p className="text-slate-400">Visualization of historical exception data and resolution trends.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-[#0A0F1C] border-[#1E293B]">
          <CardHeader className="bg-[#1E293B]/30 pb-4 border-b border-[#1E293B]">
            <CardTitle className="text-slate-300">Exception Classifications</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={classificationData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#1E293B" />
                  <XAxis type="number" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
                  <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 12, fill: '#cbd5e1' }} stroke="#1E293B" />
                  <Tooltip 
                    cursor={{fill: '#1E293B'}} 
                    contentStyle={{ backgroundColor: '#05080F', borderColor: '#1E293B', color: '#fff' }}
                  />
                  <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#0A0F1C] border-[#1E293B]">
          <CardHeader className="bg-[#1E293B]/30 pb-4 border-b border-[#1E293B]">
            <CardTitle className="text-slate-300">Root Cause Status Distribution</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {statusData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#05080F', borderColor: '#1E293B', color: '#fff' }} />
                  <Legend wrapperStyle={{ color: '#cbd5e1' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
