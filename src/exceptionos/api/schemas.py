from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import date, datetime

class HealthResponse(BaseModel):
    status: str
    service: str

class PipelineRunResponse(BaseModel):
    dataset_id: str
    total_cases: int
    matched_cases: int
    exceptions_found: int
    classification_counts: Dict[str, int]

class DatasetSchema(BaseModel):
    id: str
    name: str
    source_type: str
    status: str
    total_cases: int
    matched_cases: int
    exception_count: int
    created_at: datetime
    
class DatasetListResponse(BaseModel):
    datasets: List[DatasetSchema]

class CaseSummarySchema(BaseModel):
    case_id: str
    classification: str
    root_cause: Optional[str] = None
    status: Optional[str] = None
    confidence_score: Optional[int] = None
    requires_human_review: Optional[bool] = None
    analyst_classification: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None

class CaseListResponse(BaseModel):
    items: List[CaseSummarySchema]
    total: int
    page: int
    limit: int
    total_pages: int

class TransactionSchema(BaseModel):
    source: str
    key: str
    amount: float
    currency: str
    date: date
    row: Dict[str, Any]

class TimelineEventSchema(BaseModel):
    timestamp: date
    source: str
    event_type: str
    description: str
    transaction_id: str
    evidence: Dict[str, Any]

class HypothesisSchema(BaseModel):
    hypothesis_type: str
    confidence_score: int
    evidence: List[str]
    explanation: str

class RootCauseDecisionSchema(BaseModel):
    cause: Optional[str] = None
    status: str
    confidence_score: int
    supporting_evidence: List[str]
    alternative_hypotheses: List[HypothesisSchema]
    explanation: str

class ResolutionRecommendationSchema(BaseModel):
    recommended_action: str
    explanation: str
    requires_human_approval: bool

class MemoryCaseSchema(BaseModel):
    case_id: str
    classification: str
    root_cause: str
    root_cause_status: str
    confidence_score: int
    resolution_action: str
    verification_status: str
    amount_difference: Optional[float] = None
    date_difference: Optional[int] = None
    missing_sources: List[str]
    duplicate_flag: bool
    timestamp: str

class SimilarityResultSchema(BaseModel):
    remembered_case: MemoryCaseSchema
    similarity_score: int
    similarity_evidence: List[str]

class InvestigationResponse(BaseModel):
    case_id: str
    classification: str
    analyst_classification: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None
    transactions: Dict[str, Optional[TransactionSchema]]
    timeline: List[TimelineEventSchema]
    hypotheses: List[HypothesisSchema]
    root_cause: RootCauseDecisionSchema
    resolution_recommendation: ResolutionRecommendationSchema
    similar_cases: List[SimilarityResultSchema]

class ResolveActionRequest(BaseModel):
    action_taken: str
    approved_by: str

class ResolveActionResponse(BaseModel):
    case_id: str
    root_cause: str
    action_taken: str
    approved_by: str
    timestamp: datetime
    status: str

class VerificationResponse(BaseModel):
    case_id: str
    status: str
    explanation: str

class CaseUpdateRequest(BaseModel):
    analyst_classification: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None

class CaseAnnotationResponse(BaseModel):
    case_id: str
    analyst_classification: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None
    message: str

class BulkDeleteRequest(BaseModel):
    case_ids: List[str]
    dataset_id: Optional[str] = None

class BulkDeleteResponse(BaseModel):
    deleted_count: int
    message: str
