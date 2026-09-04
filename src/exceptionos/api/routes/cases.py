from fastapi import APIRouter, HTTPException, Query
from typing import Optional
import datetime
from decimal import Decimal

from exceptionos.api.schemas import (
    CaseListResponse, CaseSummarySchema, InvestigationResponse,
    TransactionSchema, TimelineEventSchema, HypothesisSchema,
    RootCauseDecisionSchema, ResolutionRecommendationSchema,
    SimilarityResultSchema, MemoryCaseSchema,
    ResolveActionRequest, ResolveActionResponse, VerificationResponse
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

@router.get("/api/cases", response_model=CaseListResponse)
def list_cases(
    classification: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100)
):
    all_cases = investigation_service.get_all_cases()
    if not all_cases:
        raise HTTPException(status_code=400, detail="Pipeline has not been run yet. Call /api/reconcile first.")
        
    filtered = all_cases
    if classification:
        filtered = [c for c in filtered if c.classification == classification]
        
    total = len(filtered)
    start = (page - 1) * limit
    end = start + limit
    paginated = filtered[start:end]
    
    summaries = []
    for c in paginated:
        # We don't want to run full intelligence pipeline for all cases just to get status,
        # but the prompt asked for root_cause, status, etc in the summary.
        # For a production app we'd save this to a DB. For this prototype, we'll quickly run it.
        timeline = build_timeline(c)
        hypotheses = generate_hypotheses(c, timeline)
        decision = select_root_cause(c, timeline, hypotheses)
        
        summaries.append(CaseSummarySchema(
            case_id=c.key,
            classification=c.classification,
            root_cause=decision.root_cause,
            status=decision.status,
            confidence_score=decision.confidence_score,
            requires_human_review=decision.requires_human_review
        ))
        
    return CaseListResponse(
        total=total,
        page=page,
        limit=limit,
        cases=summaries
    )

@router.get("/api/cases/{case_id}", response_model=InvestigationResponse)
def get_case(case_id: str):
    case = investigation_service.get_case(case_id)
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

@router.post("/api/cases/{case_id}/resolve", response_model=ResolveActionResponse)
def resolve_case(case_id: str, payload: ResolveActionRequest):
    case = investigation_service.get_case(case_id)
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
    
    investigation_service.record_action(action)
    
    return ResolveActionResponse(
        case_id=action.case_id,
        root_cause=action.root_cause,
        action_taken=action.action_taken,
        approved_by=action.approved_by,
        timestamp=action.timestamp,
        status=action.status
    )

@router.post("/api/cases/{case_id}/verify", response_model=VerificationResponse)
def verify_case(case_id: str):
    case = investigation_service.get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail=f"Case {case_id} was not found")
        
    action = investigation_service.get_action(case_id)
    if not action:
        raise HTTPException(status_code=400, detail="No resolution action has been recorded for this case.")
        
    # In a real app, we would fetch the UPDATED case from the database after a new pipeline run.
    # For this API prototype, we will assume the case hasn't magically changed in memory unless modified.
    # To demonstrate functionality, we'll verify the same case, which will usually return STILL_OPEN
    # unless it was a NO_EXCEPTION.
    
    verification = verify_resolution(action, case, case) # using the same case as both original and updated
    
    return VerificationResponse(
        case_id=case_id,
        status=verification.status,
        explanation=verification.explanation
    )
