from fastapi import APIRouter, HTTPException, Query, Response
from fastapi.responses import PlainTextResponse
from typing import Optional, List
import datetime
import math
from decimal import Decimal

from exceptionos.api.schemas import (
    CaseListResponse, CaseSummarySchema, InvestigationResponse,
    TransactionSchema, TimelineEventSchema, HypothesisSchema,
    RootCauseDecisionSchema, ResolutionRecommendationSchema,
    SimilarityResultSchema, MemoryCaseSchema,
    ResolveActionRequest, ResolveActionResponse, VerificationResponse,
    DatasetListResponse, DatasetSchema,
    CaseUpdateRequest, CaseAnnotationResponse,
    BulkDeleteRequest, BulkDeleteResponse
)
from exceptionos.api.services import investigation_service

from exceptionos.pipeline.timeline import build_timeline
from exceptionos.intelligence.hypothesis import generate_hypotheses
from exceptionos.intelligence.root_cause import select_root_cause
from exceptionos.resolution.resolution import recommend_resolution, ResolutionAction
from exceptionos.resolution.verification import verify_resolution
from exceptionos.memory.case_memory import load_memory
from exceptionos.memory.similarity import find_similar_cases

router = APIRouter()

# ─────────────────────────────────────────────────────────
# HELPER
# ─────────────────────────────────────────────────────────

def serialize_txn(txn) -> Optional[TransactionSchema]:
    if not txn:
        return None
    return TransactionSchema(
        source=txn.source,
        key=txn.key,
        amount=float(txn.amount),
        currency=txn.currency,
        date=txn.date,
        row=txn.row
    )

# ─────────────────────────────────────────────────────────
# DATASET ROUTES
# ─────────────────────────────────────────────────────────

@router.get("/api/datasets", response_model=DatasetListResponse)
def list_datasets():
    datasets = investigation_service.get_datasets()
    return DatasetListResponse(
        datasets=[DatasetSchema(
            id=d.id,
            name=d.name,
            source_type=d.source_type,
            status=d.status,
            total_cases=d.total_cases,
            matched_cases=d.matched_cases,
            exception_count=d.exception_count,
            created_at=d.created_at
        ) for d in datasets]
    )

@router.get("/api/datasets/{dataset_id}", response_model=DatasetSchema)
def get_dataset(dataset_id: str):
    d = investigation_service.get_dataset(dataset_id)
    if not d:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return DatasetSchema(
        id=d.id,
        name=d.name,
        source_type=d.source_type,
        status=d.status,
        total_cases=d.total_cases,
        matched_cases=d.matched_cases,
        exception_count=d.exception_count,
        created_at=d.created_at
    )

# ─────────────────────────────────────────────────────────
# CASE LIST (with pagination, search, filters, sorting)
# ─────────────────────────────────────────────────────────

@router.get("/api/cases", response_model=CaseListResponse)
def list_cases(
    dataset_id: Optional[str] = None,
    classification: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: Optional[str] = Query(None, description="Sort field: case_id, classification, confidence_score"),
    sort_order: Optional[str] = Query("asc", description="asc or desc"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    if dataset_id:
        all_cases = investigation_service.get_cases_for_dataset(dataset_id)
    else:
        d = investigation_service.get_latest_dataset()
        if not d:
            return CaseListResponse(items=[], total=0, page=page, limit=limit, total_pages=0)
        all_cases = investigation_service.get_cases_for_dataset(d.id)
        
    if not all_cases:
        return CaseListResponse(items=[], total=0, page=page, limit=limit, total_pages=0)

    # Build summaries with intelligence data (needed for status/confidence filters and sorting)
    summaries = []
    for c in all_cases:
        timeline = build_timeline(c)
        hypotheses = generate_hypotheses(c, timeline)
        decision = select_root_cause(c, timeline, hypotheses)
        
        summaries.append(CaseSummarySchema(
            case_id=c.key,
            classification=c.classification,
            root_cause=decision.root_cause,
            status=decision.status,
            confidence_score=decision.confidence_score,
            requires_human_review=decision.requires_human_review,
            analyst_classification=getattr(c, 'analyst_classification', None),
            notes=getattr(c, 'notes', None),
            tags=getattr(c, 'tags', None),
        ))
    
    # Apply filters
    filtered = summaries
    if classification:
        filtered = [s for s in filtered if s.classification == classification]
    if status:
        filtered = [s for s in filtered if s.status == status]
    if search:
        lowered = search.lower()
        filtered = [s for s in filtered if lowered in s.case_id.lower() or (s.root_cause and lowered in s.root_cause.lower())]

    # Apply sorting
    if sort_by:
        reverse = sort_order == "desc"
        if sort_by == "case_id":
            filtered.sort(key=lambda s: s.case_id, reverse=reverse)
        elif sort_by == "classification":
            filtered.sort(key=lambda s: s.classification, reverse=reverse)
        elif sort_by == "confidence_score":
            filtered.sort(key=lambda s: s.confidence_score or 0, reverse=reverse)
        elif sort_by == "status":
            filtered.sort(key=lambda s: s.status or "", reverse=reverse)

    total = len(filtered)
    total_pages = math.ceil(total / limit) if limit > 0 else 0
    start = (page - 1) * limit
    end = start + limit
    paginated = filtered[start:end]
    
    return CaseListResponse(
        items=paginated,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages
    )

# ─────────────────────────────────────────────────────────
# STATIC CASE ROUTES (must be BEFORE /api/cases/{case_id})
# ─────────────────────────────────────────────────────────

@router.get("/api/cases/export")
def export_cases(
    format: str = Query("csv", description="csv or json"),
    dataset_id: Optional[str] = None,
    classification: Optional[str] = None,
    search: Optional[str] = None,
):
    """Export cases as CSV or JSON, respecting active filters."""
    content = investigation_service.export_cases(
        dataset_id=dataset_id,
        classification=classification,
        search=search,
        fmt=format
    )
    if format == "json":
        return Response(content=content, media_type="application/json", headers={
            "Content-Disposition": "attachment; filename=exceptionos_cases.json"
        })
    return PlainTextResponse(content=content, media_type="text/csv", headers={
        "Content-Disposition": "attachment; filename=exceptionos_cases.csv"
    })

@router.post("/api/cases/bulk-delete", response_model=BulkDeleteResponse)
def bulk_delete_cases(payload: BulkDeleteRequest):
    """Delete multiple cases by their case IDs."""
    if not payload.case_ids:
        raise HTTPException(status_code=400, detail="No case IDs provided")
    count = investigation_service.bulk_delete_cases(payload.case_ids, dataset_id=payload.dataset_id)
    return BulkDeleteResponse(
        deleted_count=count,
        message=f"Successfully deleted {count} case(s)"
    )

# ─────────────────────────────────────────────────────────
# DYNAMIC CASE ROUTES (after static routes)
# ─────────────────────────────────────────────────────────

@router.get("/api/cases/{case_id}", response_model=InvestigationResponse)
def get_case(case_id: str, dataset_id: Optional[str] = None):
    case = investigation_service.get_case(case_id, dataset_id=dataset_id)
    if not case:
        raise HTTPException(status_code=404, detail=f"Case {case_id} was not found")
        
    timeline = build_timeline(case)
    hypotheses = generate_hypotheses(case, timeline)
    decision = select_root_cause(case, timeline, hypotheses)
    recommendation = recommend_resolution(decision)
    
    current_features = {
        'classification': case.classification,
        'amount_difference': abs(float(case.ledger_txn.amount - case.gateway_txn.amount)) if (case.ledger_txn and case.gateway_txn) else None,
        'date_difference': abs((case.ledger_txn.date - case.gateway_txn.date).days) if (case.ledger_txn and case.gateway_txn) else None,
        'missing_sources': [src for src, txn in [('ledger', case.ledger_txn), ('gateway', case.gateway_txn), ('bank', case.bank_txn)] if not txn],
        'duplicate_flag': case.is_duplicate
    }
    mem_cases = load_memory()
    similar = find_similar_cases(current_features, mem_cases)
    
    return InvestigationResponse(
        case_id=case.key,
        classification=case.classification,
        analyst_classification=getattr(case, 'analyst_classification', None),
        notes=getattr(case, 'notes', None),
        tags=getattr(case, 'tags', None),
        transactions={
            "ledger": serialize_txn(case.ledger_txn),
            "gateway": serialize_txn(case.gateway_txn),
            "bank": serialize_txn(case.bank_txn)
        },
        timeline=[TimelineEventSchema(
            timestamp=e.timestamp,
            source=e.source,
            event_type=e.event_type,
            description=e.description,
            transaction_id=e.transaction_id,
            evidence=e.evidence
        ) for e in timeline.events],
        hypotheses=[HypothesisSchema(
            hypothesis_type=h.hypothesis_type,
            confidence_score=h.confidence_score,
            evidence=h.evidence,
            explanation=h.explanation
        ) for h in hypotheses],
        root_cause=RootCauseDecisionSchema(
            cause=decision.root_cause,
            status=decision.status,
            confidence_score=decision.confidence_score,
            supporting_evidence=decision.supporting_evidence,
            alternative_hypotheses=[HypothesisSchema(
                hypothesis_type=a.hypothesis_type,
                confidence_score=a.confidence_score,
                evidence=a.evidence,
                explanation=a.explanation
            ) for a in decision.alternative_hypotheses],
            explanation=decision.explanation
        ),
        resolution_recommendation=ResolutionRecommendationSchema(
            recommended_action=recommendation.recommended_action,
            explanation=recommendation.explanation,
            requires_human_approval=recommendation.requires_human_approval
        ),
        similar_cases=[SimilarityResultSchema(
            remembered_case=MemoryCaseSchema(**r.remembered_case.__dict__),
            similarity_score=r.similarity_score,
            similarity_evidence=r.similarity_evidence
        ) for r in similar]
    )

@router.patch("/api/cases/{case_id}/annotations", response_model=CaseAnnotationResponse)
def update_annotations(case_id: str, payload: CaseUpdateRequest, dataset_id: Optional[str] = None):
    """Update analyst annotations. The original system classification remains immutable."""
    result = investigation_service.update_case_annotations(
        case_id=case_id,
        analyst_classification=payload.analyst_classification,
        notes=payload.notes,
        tags=payload.tags,
        dataset_id=dataset_id
    )
    if result is None:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found")
    return CaseAnnotationResponse(
        case_id=result["case_id"],
        analyst_classification=result["analyst_classification"],
        notes=result["notes"],
        tags=result["tags"],
        message="Annotations updated successfully"
    )

@router.delete("/api/cases/{case_id}", status_code=204)
def delete_case(case_id: str, dataset_id: Optional[str] = None):
    """Hard delete a case and cascade delete related records."""
    success = investigation_service.delete_case(case_id, dataset_id=dataset_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found")
    return Response(status_code=204)

@router.post("/api/cases/{case_id}/resolve", response_model=ResolveActionResponse)
def resolve_case(case_id: str, payload: ResolveActionRequest, dataset_id: Optional[str] = None):
    case = investigation_service.get_case(case_id, dataset_id=dataset_id)
    if not case:
        raise HTTPException(status_code=404, detail=f"Case {case_id} was not found")
        
    timeline = build_timeline(case)
    hypotheses = generate_hypotheses(case, timeline)
    decision = select_root_cause(case, timeline, hypotheses)
    
    action = ResolutionAction(
        case_id=case_id,
        root_cause=decision.root_cause or "none",
        action_taken=payload.action_taken,
        approved_by=payload.approved_by,
        timestamp=datetime.datetime.now(),
        status="RECORDED"
    )
    
    investigation_service.record_action(action, dataset_id=dataset_id)
    
    return ResolveActionResponse(
        case_id=action.case_id,
        root_cause=action.root_cause,
        action_taken=action.action_taken,
        approved_by=action.approved_by,
        timestamp=action.timestamp,
        status=action.status
    )

@router.post("/api/cases/{case_id}/verify", response_model=VerificationResponse)
def verify_case(case_id: str, dataset_id: Optional[str] = None):
    case = investigation_service.get_case(case_id, dataset_id=dataset_id)
    if not case:
        raise HTTPException(status_code=404, detail=f"Case {case_id} was not found")
        
    action = investigation_service.get_action(case_id, dataset_id=dataset_id)
    if not action:
        raise HTTPException(status_code=400, detail="No resolution action has been recorded for this case.")
        
    verification = verify_resolution(action, case, case) 
    
    investigation_service.record_verification(case_id, verification.status, verification.explanation, dataset_id=dataset_id)
    
    return VerificationResponse(
        case_id=case_id,
        status=verification.status,
        explanation=verification.explanation
    )
    
@router.get("/api/cases/{case_id}/history")
def get_case_history(case_id: str, dataset_id: Optional[str] = None):
    events = investigation_service.get_case_events(case_id, dataset_id=dataset_id)
    return {"events": events}
