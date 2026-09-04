import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, BrainCircuit, History, CheckCircle, Clock, 
  AlertCircle, Activity, FileText
} from 'lucide-react';
import { 
  getInvestigation, resolveCase, verifyResolution 
} from '../services/api';
import type { 
  InvestigationResponse, ResolveActionResponse, VerificationResponse 
} from '../types/api';
import { Card, CardContent, CardHeader, CardTitle, Badge, StatusBadge } from '../components/ui';

export default function Investigation() {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  
  const [data, setData] = useState<InvestigationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [actionInput, setActionInput] = useState('');
  const [resolving, setResolving] = useState(false);
  const [resolveResult, setResolveResult] = useState<ResolveActionResponse | null>(null);
  
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerificationResponse | null>(null);

  useEffect(() => {
    if (caseId) fetchCase(caseId);
  }, [caseId]);

  const fetchCase = async (id: string) => {
    setLoading(true);
    try {
      const res = await getInvestigation(id);
      setData(res);
      // Pre-fill recommended action
      if (res.resolution_recommendation.recommended_action !== 'None') {
        setActionInput(`Applied recommendation: ${res.resolution_recommendation.recommended_action}`);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to load case investigation');
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!caseId || !actionInput) return;
    setResolving(true);
    try {
      const res = await resolveCase(caseId, {
        action_taken: actionInput,
        approved_by: 'Admin User'
      });
      setResolveResult(res);
      setVerifyResult(null); // Clear previous verification
    } catch (err: any) {
      alert('Failed to record resolution: ' + (err.response?.data?.detail || err.message));
    } finally {
      setResolving(false);
    }
  };

  const handleVerify = async () => {
    if (!caseId) return;
    setVerifying(true);
    try {
      const res = await verifyResolution(caseId);
      setVerifyResult(res);
    } catch (err: any) {
      alert('Failed to verify resolution: ' + (err.response?.data?.detail || err.message));
    } finally {
      setVerifying(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-md border border-red-200 max-w-3xl mx-auto mt-8">
        <p className="font-medium">Investigation Error</p>
        <p className="text-sm">{error || 'Case not found'}</p>
        <button onClick={() => navigate('/cases')} className="mt-4 text-red-700 underline text-sm">
          Return to cases
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      {/* SECTION A: CASE HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => navigate('/cases')}
            className="p-2 rounded-full hover:bg-slate-200 transition-colors text-slate-500"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center space-x-3">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">{data.case_id}</h2>
              <Badge variant="secondary">{data.classification.replace('_', ' ')}</Badge>
              <StatusBadge status={data.root_cause.status} />
            </div>
            <p className="text-slate-500 mt-1">Intelligence Workspace</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: Timeline & Raw Data */}
        <div className="xl:col-span-1 space-y-6">
          
          {/* SECTION B: EVIDENCE TIMELINE */}
          <Card>
            <CardHeader className="bg-slate-50/50 pb-4">
              <CardTitle className="flex items-center text-sm uppercase text-slate-500">
                <Clock className="h-4 w-4 mr-2" />
                Evidence Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="relative border-l-2 border-slate-200 ml-3 space-y-8">
                {data.timeline.map((event, idx) => (
                  <div key={idx} className="relative pl-6">
                    <div className={`absolute -left-1.5 top-1.5 h-3 w-3 rounded-full border-2 border-white ${
                      event.event_type.includes('exception') ? 'bg-amber-500' : 'bg-blue-500'
                    }`} />
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{event.source}</span>
                      <span className="text-sm font-medium text-slate-900 mt-0.5">{event.description}</span>
                      {Object.keys(event.evidence).length > 0 && (
                        <div className="mt-2 bg-slate-50 rounded p-2 text-xs font-mono text-slate-600 border border-slate-100">
                          {JSON.stringify(event.evidence)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: Intelligence Core */}
        <div className="xl:col-span-2 space-y-6">
          
          {/* SECTION D: ROOT CAUSE */}
          <Card className="border-blue-200 shadow-md shadow-blue-900/5">
            <CardHeader className="bg-blue-50/50 pb-4 border-b-blue-100">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center text-blue-900">
                  <BrainCircuit className="h-5 w-5 mr-2 text-blue-600" />
                  Root Cause Decision
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-blue-700">Confidence:</span>
                  <Badge variant="default" className="bg-blue-600 text-white">{data.root_cause.confidence_score}%</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-slate-900 capitalize mb-2">
                  {data.root_cause.cause ? data.root_cause.cause.replace(/_/g, ' ') : 'No Exception'}
                </h3>
                <p className="text-slate-600">{data.root_cause.explanation}</p>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-900 mb-3 uppercase tracking-wider">Supporting Evidence</h4>
                <ul className="space-y-2">
                  {data.root_cause.supporting_evidence.map((ev, idx) => (
                    <li key={idx} className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-emerald-500 mr-2 mt-0.5 shrink-0" />
                      <span className="text-sm text-slate-700">{ev}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* SECTION E & F: RESOLUTION & VERIFICATION */}
          <Card>
            <CardHeader className="bg-slate-50/50 pb-4">
              <CardTitle className="flex items-center">
                <CheckCircle className="h-5 w-5 mr-2 text-slate-600" />
                Resolution & Verification
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6">
                <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-2">System Recommendation</h4>
                <div className="flex items-center justify-between">
                  <span className="text-base font-medium text-slate-900">
                    {data.resolution_recommendation.recommended_action.replace(/_/g, ' ').toUpperCase()}
                  </span>
                  {data.resolution_recommendation.requires_human_approval ? (
                    <Badge variant="warning">Requires Approval</Badge>
                  ) : (
                    <Badge variant="success">Auto-Verifiable</Badge>
                  )}
                </div>
                <p className="text-sm text-slate-600 mt-2">{data.resolution_recommendation.explanation}</p>
              </div>

              {!resolveResult ? (
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-slate-700">Record Action Taken</label>
                  <div className="flex space-x-2">
                    <input 
                      type="text" 
                      value={actionInput}
                      onChange={(e) => setActionInput(e.target.value)}
                      className="flex-1 bg-white border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. Adjusted ledger entry to account for fee..."
                    />
                    <button
                      onClick={handleResolve}
                      disabled={resolving || !actionInput}
                      className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 py-2 disabled:opacity-50"
                    >
                      {resolving ? 'Recording...' : 'Record Action'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-emerald-900 mb-1">Action Recorded Successfully</h4>
                      <p className="text-sm text-emerald-700">"{resolveResult.action_taken}"</p>
                    </div>
                    <Badge variant="success">Recorded</Badge>
                  </div>

                  {!verifyResult ? (
                    <div className="flex justify-end">
                      <button
                        onClick={handleVerify}
                        disabled={verifying}
                        className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-slate-900 text-white hover:bg-slate-800 h-10 px-4 py-2 disabled:opacity-50"
                      >
                        {verifying ? <Activity className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                        Verify Resolution
                      </button>
                    </div>
                  ) : (
                    <div className={`border rounded-lg p-4 flex items-start space-x-4 ${
                      verifyResult.status === 'VERIFIED_RESOLVED' 
                        ? 'bg-emerald-50 border-emerald-200' 
                        : 'bg-amber-50 border-amber-200'
                    }`}>
                      {verifyResult.status === 'VERIFIED_RESOLVED' ? (
                        <CheckCircle className="h-6 w-6 text-emerald-600 mt-0.5" />
                      ) : (
                        <AlertCircle className="h-6 w-6 text-amber-600 mt-0.5" />
                      )}
                      <div>
                        <h4 className={`text-sm font-bold ${verifyResult.status === 'VERIFIED_RESOLVED' ? 'text-emerald-900' : 'text-amber-900'}`}>
                          {verifyResult.status.replace('_', ' ')}
                        </h4>
                        <p className={`text-sm mt-1 ${verifyResult.status === 'VERIFIED_RESOLVED' ? 'text-emerald-700' : 'text-amber-700'}`}>
                          {verifyResult.explanation}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* SECTION G: EXCEPTION MEMORY */}
          {data.similar_cases.length > 0 && (
            <Card className="border-indigo-100 bg-indigo-50/30">
              <CardHeader className="pb-3 border-b border-indigo-100">
                <CardTitle className="flex items-center text-indigo-900 text-sm uppercase tracking-wider font-bold">
                  <History className="h-4 w-4 mr-2 text-indigo-600" />
                  Exception Memory Context
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <p className="text-sm text-indigo-800/70 mb-4">
                  The system found similar historical cases that were previously verified.
                </p>
                <div className="space-y-4">
                  {data.similar_cases.map((sim, idx) => (
                    <div key={idx} className="bg-white border border-indigo-100 rounded-lg p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-mono text-xs font-semibold text-indigo-900">{sim.remembered_case.case_id}</span>
                        <Badge variant="outline" className="text-indigo-700 border-indigo-200">
                          {sim.similarity_score}% Similar
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <span className="block text-xs font-medium text-slate-500 uppercase">Previous Root Cause</span>
                          <span className="block text-sm font-medium text-slate-900 mt-1 capitalize">{sim.remembered_case.root_cause.replace('_', ' ')}</span>
                        </div>
                        <div>
                          <span className="block text-xs font-medium text-slate-500 uppercase">Previous Resolution</span>
                          <span className="block text-sm font-medium text-slate-900 mt-1 capitalize">{sim.remembered_case.resolution_action.replace('_', ' ')}</span>
                        </div>
                      </div>

                      <div className="bg-slate-50 rounded p-3 text-xs">
                        <span className="font-semibold text-slate-700 block mb-2">Similarity Evidence:</span>
                        <ul className="space-y-1">
                          {sim.similarity_evidence.map((ev, eIdx) => (
                            <li key={eIdx} className="text-slate-600 flex items-start">
                              <span className="text-indigo-400 mr-2">✓</span> {ev}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* SECTION C: HYPOTHESES */}
          <Card>
            <CardHeader className="bg-slate-50/50 pb-4">
              <CardTitle className="text-sm uppercase text-slate-500 flex items-center">
                <FileText className="h-4 w-4 mr-2" />
                Alternative Hypotheses Considered
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {data.root_cause.alternative_hypotheses.length > 0 ? (
                  data.root_cause.alternative_hypotheses.map((hyp, idx) => (
                    <div key={idx} className="border border-slate-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-slate-900 capitalize">{hyp.hypothesis_type.replace(/_/g, ' ')}</span>
                        <span className="text-xs font-medium text-slate-500">Score: {hyp.confidence_score}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full mb-3 overflow-hidden">
                        <div className="h-full bg-slate-400" style={{ width: `${hyp.confidence_score}%` }} />
                      </div>
                      <p className="text-sm text-slate-600">{hyp.explanation}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">No alternative hypotheses generated.</p>
                )}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
