import pytest
import os
from exceptionos.database.session import SessionLocal
from exceptionos.ai.agent import analyze_case_with_agent
from exceptionos.database.models import CaseRecord

def test_agent_fallback_mock():
    # Use mock provider
    os.environ["AI_PROVIDER"] = "mock"
    
    db = SessionLocal()
    try:
        # Get or create a case
        case = db.query(CaseRecord).first()
        if not case:
            case = CaseRecord(dataset_id="test", key="test", classification="amount_mismatch")
            db.add(case)
            db.commit()
            
        action = analyze_case_with_agent(db, case.id)
        
        # The mock provider returns JSON but it doesn't match the strict action schema, 
        # so it will fallback to REQUEST_ANALYST_REVIEW.
        assert action is not None
        assert action.recommended_action == "REQUEST_ANALYST_REVIEW"
        assert action.requires_approval == True
    finally:
        db.close()
