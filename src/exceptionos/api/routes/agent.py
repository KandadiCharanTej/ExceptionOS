from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from datetime import datetime

from exceptionos.database.session import get_db
from exceptionos.database.models import AgentAction, CaseEvent, EvaluationRun, CaseRecord
from exceptionos.api.schemas import AgentActionResponse
from exceptionos.ai.agent import analyze_case_with_agent

router = APIRouter()

@router.post("/api/agent/case/{case_id}/analyze", response_model=AgentActionResponse)
def analyze_case(case_id: str, db: Session = Depends(get_db)):
    try:
        action = analyze_case_with_agent(db, case_id)
        
        # Log event
        db.add(CaseEvent(
            case_id=case_id,
            event_type="AGENT_ANALYZED",
            description=f"Agent recommended: {action.recommended_action} with {action.risk_level} risk."
        ))
        db.commit()
        
        return action
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/agent/action/{action_id}/approve", response_model=AgentActionResponse)
def approve_action(action_id: str, db: Session = Depends(get_db)):
    action = db.query(AgentAction).filter(AgentAction.id == action_id).first()
    if not action:
        raise HTTPException(status_code=404, detail="Action not found")
        
    if action.status != "PENDING":
        raise HTTPException(status_code=400, detail="Action is not pending")
        
    action.status = "APPROVED"
    action.approved_at = datetime.utcnow()
    
    db.add(CaseEvent(
        case_id=action.case_id,
        event_type="ACTION_APPROVED",
        description=f"Action {action.recommended_action} was approved by ANALYST."
    ))
    db.commit()
    db.refresh(action)
    
    return action

@router.post("/api/agent/action/{action_id}/reject", response_model=AgentActionResponse)
def reject_action(action_id: str, db: Session = Depends(get_db)):
    action = db.query(AgentAction).filter(AgentAction.id == action_id).first()
    if not action:
        raise HTTPException(status_code=404, detail="Action not found")
        
    if action.status != "PENDING":
        raise HTTPException(status_code=400, detail="Action is not pending")
        
    action.status = "REJECTED"
    
    db.add(CaseEvent(
        case_id=action.case_id,
        event_type="ACTION_REJECTED",
        description=f"Action {action.recommended_action} was rejected by ANALYST."
    ))
    db.commit()
    db.refresh(action)
    
    return action

@router.post("/api/agent/action/{action_id}/execute", response_model=AgentActionResponse)
def execute_action(action_id: str, db: Session = Depends(get_db)):
    action = db.query(AgentAction).filter(AgentAction.id == action_id).first()
    if not action:
        raise HTTPException(status_code=404, detail="Action not found")
        
    if action.status != "APPROVED" and action.requires_approval:
        raise HTTPException(status_code=400, detail="Action requires approval before execution")
        
    if action.status == "EXECUTED":
        raise HTTPException(status_code=400, detail="Action already executed")
        
    # Execute bounded action safely
    # (In a real system, this would trigger external workflows. Here we log it)
    action.status = "EXECUTED"
    action.executed_at = datetime.utcnow()
    
    db.add(CaseEvent(
        case_id=action.case_id,
        event_type="ACTION_EXECUTED",
        description=f"Executed bounded action: {action.recommended_action}"
    ))
    
    # If AUTO_RESOLVE_ONLY_IF_SAFE, update the evaluation metric
    if action.recommended_action == "AUTO_RESOLVE_ONLY_IF_SAFE":
        case = db.query(CaseRecord).filter(CaseRecord.id == action.case_id).first()
        if case:
            run = db.query(EvaluationRun).filter(EvaluationRun.dataset_id == case.dataset_id).first()
            if run:
                run.auto_resolved += 1
                run.unresolved -= 1
                
            db.add(CaseEvent(
                case_id=action.case_id,
                event_type="CASE_RESOLVED",
                description="Case automatically resolved by safe agent action."
            ))
            
    db.commit()
    db.refresh(action)
    
    return action
