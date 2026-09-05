from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func

from exceptionos.database.session import get_db
from exceptionos.database.models import EvaluationRun, CaseRecord, ResolutionRecord, AgentAction
from exceptionos.api.schemas import EvaluationRunResponse, UnresolvedExceptionSchema
from exceptionos.pipeline.evaluation import run_evaluation, generate_proof_report
from exceptionos.intelligence.priority import calculate_priority

router = APIRouter()

@router.post("/api/evaluation/run", response_model=EvaluationRunResponse)
def trigger_evaluation_run(scenario_type: str = "NORMAL_RECONCILIATION", db: Session = Depends(get_db)):
    try:
        run = run_evaluation(db, num_records=100, scenario_type=scenario_type)
        return run
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Evaluation failed: {str(e)}")

@router.get("/api/evaluation/{dataset_id}", response_model=EvaluationRunResponse)
def get_evaluation(dataset_id: str, db: Session = Depends(get_db)):
    run = db.query(EvaluationRun).filter(EvaluationRun.dataset_id == dataset_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Evaluation run not found")
    return run

@router.get("/api/evaluation/{dataset_id}/exceptions", response_model=List[UnresolvedExceptionSchema])
def get_unresolved_exceptions(dataset_id: str, db: Session = Depends(get_db)):
    cases = db.query(CaseRecord).filter(
        CaseRecord.dataset_id == dataset_id,
        CaseRecord.classification != "matched"
    ).all()
    
    unresolved = []
    
    for case in cases:
        # Check if resolved
        is_resolved = any(r.status == "RESOLVED" for r in case.resolutions)
        if is_resolved:
            continue
            
        priority_data = calculate_priority(case)
        
        amount = 0.0
        try:
            if case.ledger_txn and isinstance(case.ledger_txn, dict) and "amount" in case.ledger_txn:
                amount = float(case.ledger_txn["amount"])
            elif case.gateway_txn and isinstance(case.gateway_txn, dict) and "amount" in case.gateway_txn:
                amount = float(case.gateway_txn["amount"])
            elif case.bank_txn and isinstance(case.bank_txn, dict) and "amount" in case.bank_txn:
                amount = float(case.bank_txn["amount"])
        except Exception:
            pass
            
        # Get latest agent action if any
        latest_action = db.query(AgentAction).filter(AgentAction.case_id == case.id).order_by(AgentAction.created_at.desc()).first()
        rec_action = latest_action.recommended_action if latest_action else "REQUEST_ANALYST_REVIEW"
        
        unresolved.append(UnresolvedExceptionSchema(
            case_id=case.id,
            transaction_id=case.key,
            classification=case.classification,
            root_cause=case.resolutions[-1].root_cause if case.resolutions else "Requires source-system investigation",
            priority=priority_data["priority"],
            priority_score=priority_data["priority_score"],
            financial_impact=abs(amount),
            reason_unresolved="Insufficient deterministic evidence to auto-resolve",
            recommended_action=rec_action
        ))
        
    return unresolved

@router.get("/api/performance/summary")
def get_performance_summary(db: Session = Depends(get_db)):
    total_runs = db.query(EvaluationRun).count()
    if total_runs == 0:
        return {
            "total_records": 0,
            "avg_throughput": 0,
            "avg_precision": 0,
            "avg_recall": 0,
            "avg_f1": 0,
            "auto_resolution_rate": 0
        }
        
    stats = db.query(
        func.sum(EvaluationRun.total_records),
        func.avg(EvaluationRun.throughput),
        func.avg(EvaluationRun.precision),
        func.avg(EvaluationRun.recall),
        func.avg(EvaluationRun.f1_score),
        func.sum(EvaluationRun.auto_resolved),
        func.sum(EvaluationRun.exception_records)
    ).first()
    
    total_exceptions = stats[6] or 0
    auto_resolved = stats[5] or 0
    
    return {
        "total_records": stats[0] or 0,
        "avg_throughput": stats[1] or 0,
        "avg_precision": stats[2] or 0,
        "avg_recall": stats[3] or 0,
        "avg_f1": stats[4] or 0,
        "auto_resolution_rate": (auto_resolved / total_exceptions * 100) if total_exceptions > 0 else 0
    }

@router.get("/api/evaluation/{dataset_id}/report")
def get_proof_report(dataset_id: str, db: Session = Depends(get_db)):
    report = generate_proof_report(db, dataset_id)
    return {"report": report}
