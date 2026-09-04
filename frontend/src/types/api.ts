export interface PipelineRunResponse {
  dataset_id: string;
  total_cases: number;
  matched_cases: number;
  exceptions_found: number;
  classification_counts: Record<string, number>;
}

export interface Dataset {
  id: string;
  name: string;
  source_type: string;
  status: string;
  total_cases: number;
  matched_cases: number;
  exception_count: number;
  created_at: string;
}

export interface DatasetListResponse {
  datasets: Dataset[];
}

export interface CaseSummarySchema {
  case_id: string;
  classification: string;
  root_cause: string | null;
  status: string | null;
  confidence_score: number | null;
  requires_human_review: boolean | null;
}

export interface CaseListResponse {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  items: CaseSummarySchema[];
}

export interface TransactionSchema {
  source: string;
  key: string;
  amount: number;
  currency: string;
  date: string;
  row: Record<string, unknown>;
}

export interface TimelineEventSchema {
  timestamp: string;
  source: string;
  event_type: string;
  description: string;
  transaction_id: string;
  evidence: Record<string, unknown>;
}

export interface HypothesisSchema {
  hypothesis_type: string;
  confidence_score: number;
  evidence: string[];
  explanation: string;
}

export interface RootCauseDecisionSchema {
  cause: string | null;
  status: string;
  confidence_score: number;
  supporting_evidence: string[];
  alternative_hypotheses: HypothesisSchema[];
  explanation: string;
}

export interface ResolutionRecommendationSchema {
  recommended_action: string;
  explanation: string;
  requires_human_approval: boolean;
}

export interface MemoryCaseSchema {
  case_id: string;
  classification: string;
  root_cause: string;
  root_cause_status: string;
  confidence_score: number;
  resolutions?: any[];
  verifications?: any[];
  resolution_action: string;
  verification_status: string;
  amount_difference: number | null;
  date_difference: number | null;
  missing_sources: string[];
  duplicate_flag: boolean;
  timestamp: string;
}

export interface CopilotSource {
  type: string;
  id: string;
}

export interface CopilotResponse {
  answer: string;
  verified_facts: string[];
  recommendations: string[];
  confidence: string;
  sources: CopilotSource[];
  disclaimer: string;
}

export interface SimilarityResultSchema {
  remembered_case: MemoryCaseSchema;
  similarity_score: number;
  similarity_evidence: string[];
}

export interface InvestigationResponse {
  case_id: string;
  classification: string;
  analyst_classification?: string;
  notes?: string;
  tags?: string[];
  transactions: {
    ledger: TransactionSchema | null;
    gateway: TransactionSchema | null;
    bank: TransactionSchema | null;
  };
  timeline: TimelineEventSchema[];
  hypotheses: HypothesisSchema[];
  root_cause: RootCauseDecisionSchema;
  resolution_recommendation: ResolutionRecommendationSchema;
  similar_cases: SimilarityResultSchema[];
}

export interface ResolveActionRequest {
  action_taken: string;
  approved_by: string;
}

export interface ResolveActionResponse {
  case_id: string;
  root_cause: string;
  action_taken: string;
  approved_by: string;
  timestamp: string;
  status: string;
}

export interface VerificationResponse {
  case_id: string;
  status: string;
  explanation: string;
}
