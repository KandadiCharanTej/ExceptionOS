import axios from 'axios';
import type {
  PipelineRunResponse,
  CaseListResponse,
  InvestigationResponse,
  ResolveActionRequest,
  ResolveActionResponse,
  VerificationResponse
} from '../types/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const healthCheck = async () => {
  const response = await api.get('/health');
  return response.data;
};

export const runReconciliation = async (): Promise<PipelineRunResponse> => {
  const response = await api.post<PipelineRunResponse>('/api/reconcile');
  return response.data;
};

export const uploadReconciliationFiles = async (ledger: File, gateway: File, bank: File): Promise<PipelineRunResponse> => {
  const formData = new FormData();
  formData.append('ledger', ledger);
  formData.append('gateway', gateway);
  formData.append('bank', bank);

  const response = await api.post<PipelineRunResponse>('/api/reconcile/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const getCases = async (page = 1, limit = 50, classification?: string): Promise<CaseListResponse> => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  if (classification) {
    params.append('classification', classification);
  }
  const response = await api.get<CaseListResponse>(`/api/cases?${params.toString()}`);
  return response.data;
};

export const getInvestigation = async (caseId: string): Promise<InvestigationResponse> => {
  const response = await api.get<InvestigationResponse>(`/api/cases/${caseId}`);
  return response.data;
};

export const resolveCase = async (caseId: string, payload: ResolveActionRequest): Promise<ResolveActionResponse> => {
  const response = await api.post<ResolveActionResponse>(`/api/cases/${caseId}/resolve`, payload);
  return response.data;
};

export const verifyResolution = async (caseId: string): Promise<VerificationResponse> => {
  const response = await api.post<VerificationResponse>(`/api/cases/${caseId}/verify`);
  return response.data;
};
