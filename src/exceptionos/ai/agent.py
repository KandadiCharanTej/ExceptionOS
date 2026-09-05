import json
from sqlalchemy.orm import Session
from exceptionos.database.models import CaseRecord, AgentAction
from exceptionos.ai.provider import get_ai_provider
from exceptionos.intelligence.priority import calculate_priority

ALLOWED_ACTIONS = [
    "INVESTIGATE_SOURCE",
    "REQUEST_ANALYST_REVIEW",
    "VERIFY_DUPLICATE",
    "RECHECK_SETTLEMENT",
    "MARK_FOR_FOLLOW_UP",
    "AUTO_RESOLVE_ONLY_IF_SAFE"
]

AGENT_PROMPT = """
You are a Finance Operations Resolution Agent.
Your job is to analyze the following case and recommend ONE safe action from the allowed list.
You MUST output valid JSON only.

Allowed Actions:
- INVESTIGATE_SOURCE: The data source itself needs checking.
- REQUEST_ANALYST_REVIEW: The issue requires human domain expertise or approval.
- VERIFY_DUPLICATE: To trigger a duplicate verification workflow.
- RECHECK_SETTLEMENT: To wait and re-check settlement data later.
- MARK_FOR_FOLLOW_UP: General follow-up needed without immediate financial action.
- AUTO_RESOLVE_ONLY_IF_SAFE: Only if deterministic evidence proves it's perfectly safe to resolve automatically.

Case Details:
ID: {case_id}
Classification: {classification}
Priority: {priority} ({priority_score}/100)
Notes: {notes}
Tags: {tags}

Your output MUST precisely match this JSON schema:
{{
    "recommended_action": "STRING (must be one of the Allowed Actions)",
    "reason": "STRING (brief explanation)",
    "risk_level": "STRING (LOW, MEDIUM, HIGH, CRITICAL)",
    "requires_approval": BOOLEAN (true if human needed, false if safe to auto-execute)
}}
"""

def analyze_case_with_agent(db: Session, case_id: str, actor: str = "AI_AGENT") -> AgentAction:
    case = db.query(CaseRecord).filter(CaseRecord.id == case_id).first()
    if not case:
        raise ValueError("Case not found")
        
    priority_data = calculate_priority(case)
    
    prompt = AGENT_PROMPT.format(
        case_id=case.id,
        classification=case.classification,
        priority=priority_data["priority"],
        priority_score=priority_data["priority_score"],
        notes=case.notes or "None",
        tags=case.tags or []
    )
    
    provider = get_ai_provider()
    raw_response = provider.generate("You are an expert financial resolution agent. Output strictly JSON.", prompt)
    
    try:
        # Clean up JSON if necessary
        cleaned = raw_response.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.replace("```json", "").replace("```", "").strip()
        
        response_data = json.loads(cleaned)
        
        action = response_data.get("recommended_action")
        if action not in ALLOWED_ACTIONS:
            action = "REQUEST_ANALYST_REVIEW"
            
        reason = response_data.get("reason", "Fallback due to invalid agent action response.")
        risk_level = response_data.get("risk_level", "HIGH")
        requires_approval = bool(response_data.get("requires_approval", True))
        
        # Enforce rule: high risk always requires approval
        if risk_level in ["HIGH", "CRITICAL"]:
            requires_approval = True
            
        agent_action = AgentAction(
            case_id=case.id,
            recommended_action=action,
            reason=reason,
            risk_level=risk_level,
            requires_approval=requires_approval,
            status="PENDING",
            actor=actor
        )
        
        db.add(agent_action)
        db.commit()
        db.refresh(agent_action)
        
        return agent_action
        
    except Exception as e:
        # Fallback action on failure
        agent_action = AgentAction(
            case_id=case.id,
            recommended_action="REQUEST_ANALYST_REVIEW",
            reason=f"Failed to generate action: {str(e)}",
            risk_level="HIGH",
            requires_approval=True,
            status="PENDING",
            actor="SYSTEM_FALLBACK"
        )
        db.add(agent_action)
        db.commit()
        db.refresh(agent_action)
        
        return agent_action
