import axios from 'axios';
import type {
  PipelineRunResponse,
  CaseListResponse,
  InvestigationResponse,
  ResolveActionResponse,
  VerificationResponse,
  DatasetListResponse,
  Dataset
} from '../types/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds timeout
});

// Add a response interceptor for global error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If the error is a network error or connection refused
    if (!error.response) {
      console.error('API Connection Error. Backend might be down.');
      return Promise.reject(new Error('Backend API is unavailable. Please check your connection.'));
    }
    return Promise.reject(error);
  }
);

export const healthCheck = async () => {
  try {
    const response = await api.get('/health', { timeout: 5000 });
    return response.data;
  } catch (error) {
    throw new Error('API Unavailable');
  }
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

export const getDatasets = async (): Promise<DatasetListResponse> => {
  const response = await api.get<DatasetListResponse>('/api/datasets');
  return response.data;
};

export const getDataset = async (datasetId: string): Promise<Dataset> => {
  const response = await api.get<Dataset>(`/api/datasets/${datasetId}`);
  return response.data;
};

export const deleteDataset = async (datasetId: string): Promise<void> => {
  await api.delete(`/api/datasets/${datasetId}`);
};

export const getCases = async (
  page = 1, 
  limit = 20, 
  classification?: string, 
  datasetId?: string,
  search?: string,
  status?: string,
  sort_by?: string,
  sort_order?: string
): Promise<CaseListResponse> => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  if (classification) params.append('classification', classification);
  if (datasetId) params.append('dataset_id', datasetId);
  if (search) params.append('search', search);
  if (status) params.append('status', status);
  if (sort_by) params.append('sort_by', sort_by);
  if (sort_order) params.append('sort_order', sort_order);
  
  const response = await api.get<CaseListResponse>(`/api/cases?${params.toString()}`);
  return response.data;
};

export const exportCases = async (format: 'csv' | 'json', datasetId?: string, classification?: string, search?: string) => {
  const params = new URLSearchParams({ format });
  if (datasetId) params.append('dataset_id', datasetId);
  if (classification) params.append('classification', classification);
  if (search) params.append('search', search);
  
  const response = await api.get(`/api/cases/export?${params.toString()}`, {
    responseType: 'blob'
  });
  return response.data;
};

export const bulkDeleteCases = async (caseIds: string[], datasetId?: string) => {
  const response = await api.post('/api/cases/bulk-delete', {
    case_ids: caseIds,
    dataset_id: datasetId
  });
  return response.data;
};

export const getCase = async (caseId: string, datasetId?: string): Promise<InvestigationResponse> => {
  const params = new URLSearchParams();
  if (datasetId) {
    params.append('dataset_id', datasetId);
  }
  const url = datasetId ? `/api/cases/${caseId}?${params.toString()}` : `/api/cases/${caseId}`;
  const response = await api.get<InvestigationResponse>(url);
  return response.data;
};

export const getCaseHistory = async (caseId: string, datasetId?: string): Promise<{events: any[]}> => {
  const params = new URLSearchParams();
  if (datasetId) {
    params.append('dataset_id', datasetId);
  }
  const url = datasetId ? `/api/cases/${caseId}/history?${params.toString()}` : `/api/cases/${caseId}/history`;
  const response = await api.get<{events: any[]}>(url);
  return response.data;
};

export const resolveCase = async (caseId: string, action_taken: string, approved_by: string, datasetId?: string): Promise<ResolveActionResponse> => {
  const params = new URLSearchParams();
  if (datasetId) {
    params.append('dataset_id', datasetId);
  }
  const url = datasetId ? `/api/cases/${caseId}/resolve?${params.toString()}` : `/api/cases/${caseId}/resolve`;
  const response = await api.post<ResolveActionResponse>(url, {
    action_taken,
    approved_by
  });
  return response.data;
};

export const verifyResolution = async (caseId: string, datasetId?: string): Promise<VerificationResponse> => {
  const params = new URLSearchParams();
  if (datasetId) {
    params.append('dataset_id', datasetId);
  }
  const url = datasetId ? `/api/cases/${caseId}/verify?${params.toString()}` : `/api/cases/${caseId}/verify`;
  const response = await api.post<VerificationResponse>(url);
  return response.data;
};

export const updateAnnotations = async (
  caseId: string, 
  data: { analyst_classification?: string, notes?: string, tags?: string[] },
  datasetId?: string
) => {
  const params = new URLSearchParams();
  if (datasetId) params.append('dataset_id', datasetId);
  const url = datasetId ? `/api/cases/${caseId}/annotations?${params.toString()}` : `/api/cases/${caseId}/annotations`;
  const response = await api.patch(url, data);
  return response.data;
};
