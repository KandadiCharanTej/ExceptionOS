import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, ChevronRight, Filter, FileText, ArrowUpDown } from 'lucide-react';
import { getCases } from '../services/api';
import type { CaseSummarySchema, CaseListResponse } from '../types/api';
import { Card, CardContent, Badge, StatusBadge } from '../components/ui';

export default function Cases() {
  const [data, setData] = useState<CaseListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const datasetId = searchParams.get('dataset_id') || undefined;

  useEffect(() => {
    fetchCases();
  }, [datasetId]);

  const fetchCases = async () => {
    setLoading(true);
    try {
      const res = await getCases(1, 100, undefined, datasetId);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load cases');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white mb-1">Investigation Queue</h2>
          <p className="text-slate-400">Triage and resolve financial discrepancies.</p>
        </div>
        <div className="flex space-x-3">
          <button className="flex items-center px-4 py-2 bg-[#0A0F1C] border border-[#1E293B] rounded-md text-sm font-medium text-slate-300 hover:bg-[#1E293B] transition-colors shadow-sm">
            <Filter className="w-4 h-4 mr-2" />
            Filter Queue
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 text-red-400 p-4 rounded-md border border-red-500/20 font-medium">
          {error}
        </div>
      )}

      <Card className="bg-[#0A0F1C] border-[#1E293B] overflow-hidden shadow-lg shadow-black/20">
        <div className="p-4 border-b border-[#1E293B] flex flex-wrap items-center justify-between gap-4 bg-[#0A0F1C]">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search by Transaction ID or Case ID..." 
              className="w-full pl-9 pr-4 py-2 bg-[#05080F] border border-[#1E293B] text-slate-200 rounded-md text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            />
          </div>
          <div className="flex items-center space-x-4 text-sm text-slate-400">
            {datasetId && (
              <span className="px-3 py-1 bg-[#1E293B]/50 border border-[#1E293B] rounded-full">
                Filtered by Dataset
              </span>
            )}
            <span>
              Showing <strong className="text-white">{data?.cases.length || 0}</strong> of <strong className="text-white">{data?.total || 0}</strong> cases
            </span>
          </div>
        </div>
        
        <CardContent className="p-0">
          {loading && !data ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <p className="text-slate-400 text-sm">Loading investigation queue...</p>
            </div>
          ) : (!data?.cases || data.cases.length === 0) ? (
            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-[#1E293B] m-6 rounded-xl bg-slate-900/30">
              <FileText className="h-10 w-10 text-slate-600 mb-4" />
              <h3 className="text-lg font-medium text-white">No Cases Found</h3>
              <p className="text-slate-400 max-w-sm text-center mt-2">
                There are no open exceptions matching your criteria.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-slate-300">
                <thead className="text-xs text-slate-400 uppercase bg-[#1E293B]/50 border-b border-[#1E293B]">
                  <tr>
                    <th className="px-6 py-4 font-semibold tracking-wider cursor-pointer hover:text-white flex items-center">
                      Case ID <ArrowUpDown className="w-3 h-3 ml-1" />
                    </th>
                    <th className="px-6 py-4 font-semibold tracking-wider">Classification</th>
                    <th className="px-6 py-4 font-semibold tracking-wider">Root Cause Analysis</th>
                    <th className="px-6 py-4 font-semibold tracking-wider">Confidence</th>
                    <th className="px-6 py-4 font-semibold tracking-wider">Status</th>
                    <th className="px-6 py-4 font-semibold tracking-wider text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E293B]">
                  {data?.cases.map((c: CaseSummarySchema) => (
                    <tr key={c.case_id} className="hover:bg-[#1E293B]/30 transition-colors group cursor-pointer" onClick={() => navigate(`/cases/${c.case_id}${datasetId ? `?dataset_id=${datasetId}` : ''}`)}>
                      <td className="px-6 py-4 font-mono font-medium text-slate-200">{c.case_id}</td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className="border-slate-700 bg-slate-900/50">
                          {c.classification.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-slate-400">
                        {c.root_cause ? c.root_cause.replace(/_/g, ' ') : 'Pending Analysis'}
                      </td>
                      <td className="px-6 py-4">
                        {c.confidence_score !== null ? (
                          <div className="flex items-center space-x-3 w-32">
                            <div className="flex-1 h-1.5 bg-[#1E293B] rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" 
                                style={{ width: `${c.confidence_score}%` }}
                              />
                            </div>
                            <span className="text-xs font-mono font-medium text-slate-400">{c.confidence_score}%</span>
                          </div>
                        ) : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/cases/${c.case_id}${datasetId ? `?dataset_id=${datasetId}` : ''}`);
                          }}
                          className="inline-flex items-center justify-center rounded-md text-xs font-bold transition-all hover:bg-blue-600 hover:shadow-[0_0_10px_rgba(37,99,235,0.4)] text-blue-400 hover:text-white h-8 px-3 opacity-0 group-hover:opacity-100"
                        >
                          Investigate
                          <ChevronRight className="ml-1 h-3 w-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
