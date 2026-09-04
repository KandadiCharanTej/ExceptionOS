import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronRight } from 'lucide-react';
import { getCases } from '../services/api';
import type { CaseSummarySchema, CaseListResponse } from '../types/api';
import { Card, Badge, StatusBadge } from '../components/ui';

export default function Cases() {
  const [data, setData] = useState<CaseListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchCases();
  }, []);

  const fetchCases = async () => {
    setLoading(true);
    try {
      const res = await getCases(1, 100); // 100 limit for prototype
      setData(res);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to load cases');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-md border border-red-200">
        <p className="font-medium">Error loading cases</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Cases</h2>
          <p className="text-slate-500">View and investigate reconciliation exceptions.</p>
        </div>
      </div>

      <Card>
        <div className="p-4 border-b border-slate-100 flex items-center space-x-4 bg-slate-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by Case ID..." 
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="text-sm text-slate-500">
            Showing {data?.cases.length || 0} of {data?.total || 0} cases
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 font-semibold">Case ID</th>
                <th className="px-6 py-3 font-semibold">Classification</th>
                <th className="px-6 py-3 font-semibold">Root Cause</th>
                <th className="px-6 py-3 font-semibold">Confidence</th>
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {data?.cases.map((c: CaseSummarySchema) => (
                <tr key={c.case_id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">{c.case_id}</td>
                  <td className="px-6 py-4">
                    <Badge variant="secondary">{c.classification.replace('_', ' ')}</Badge>
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {c.root_cause ? c.root_cause.replace(/_/g, ' ') : '-'}
                  </td>
                  <td className="px-6 py-4">
                    {c.confidence_score !== null ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500" 
                            style={{ width: `${c.confidence_score}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-slate-600">{c.confidence_score}%</span>
                      </div>
                    ) : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => navigate(`/cases/${c.case_id}`)}
                      className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-blue-50 text-blue-600 h-8 px-3"
                    >
                      Investigate
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              
              {(!data?.cases || data.cases.length === 0) && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    No cases found. Try running the reconciliation pipeline first.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
