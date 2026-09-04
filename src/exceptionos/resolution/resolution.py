"""ExceptionOS Resolution and Recommendation module."""
import datetime
from dataclasses import dataclass, field
from typing import Optional

from exceptionos.intelligence.root_cause import RootCauseDecision

@dataclass
class ResolutionRecommendation:
    root_cause: Optional[str]
    recommended_action: str
    explanation: str
    requires_human_approval: bool

@dataclass
class ResolutionAction:
    case_id: str
    root_cause: str
    action_taken: str
    approved_by: str
    timestamp: datetime.datetime
    status: str

def recommend_resolution(decision: RootCauseDecision) -> ResolutionRecommendation:
    """Generates a resolution recommendation based on a RootCauseDecision."""
    rc = decision.root_cause
    
    if decision.status == "NO_EXCEPTION":
        return ResolutionRecommendation(
            root_cause=None,
            recommended_action="None",
            explanation="Transaction is fully reconciled.",
            requires_human_approval=False
        )
        
    if decision.status in ("UNKNOWN", "NEEDS_REVIEW") or rc == "unknown_discrepancy":
        return ResolutionRecommendation(
            root_cause=rc,
            recommended_action="human_investigation",
            explanation="Confidence is too low or evidence conflicts. Requires manual investigation.",
            requires_human_approval=True
        )
        
    if rc == "gateway_fee":
        return ResolutionRecommendation(
            root_cause=rc,
            recommended_action="record_gateway_fee",
            explanation="Verify and record the gateway fee in the internal ledger to match the settlement.",
            requires_human_approval=False
        )
        
    if rc == "missing_ledger_record":
        return ResolutionRecommendation(
            root_cause=rc,
            recommended_action="create_ledger_entry",
            explanation="Add the missing ledger entry to properly track the external settlement.",
            requires_human_approval=True
        )
        
    if rc == "missing_bank_settlement":
        return ResolutionRecommendation(
            root_cause=rc,
            recommended_action="investigate_missing_settlement",
            explanation="Check whether settlement is pending, or escalate with the gateway/bank.",
            requires_human_approval=True
        )
        
    if rc == "missing_gateway_record":
        return ResolutionRecommendation(
            root_cause=rc,
            recommended_action="investigate_missing_gateway",
            explanation="Gateway failed to report this transaction. Follow up with the gateway provider.",
            requires_human_approval=True
        )
        
    if rc == "duplicate_transaction":
        return ResolutionRecommendation(
            root_cause=rc,
            recommended_action="reverse_duplicate",
            explanation="Reverse or remove the duplicate transaction record.",
            requires_human_approval=True
        )
        
    if rc == "delayed_settlement":
        return ResolutionRecommendation(
            root_cause=rc,
            recommended_action="wait_for_settlement",
            explanation="Wait for the settlement to complete. Re-check in subsequent runs.",
            requires_human_approval=False
        )
        
    if rc == "date_or_timezone_issue":
        return ResolutionRecommendation(
            root_cause=rc,
            recommended_action="correct_date_mapping",
            explanation="Correct the date or timezone mapping to align the records.",
            requires_human_approval=False
        )
        
    if rc == "refund":
        return ResolutionRecommendation(
            root_cause=rc,
            recommended_action="record_refund",
            explanation="Ensure the refund is accurately reflected in all systems.",
            requires_human_approval=False
        )
        
    # Fallback
    return ResolutionRecommendation(
        root_cause=rc,
        recommended_action="human_investigation",
        explanation="Unhandled root cause. Requires manual investigation.",
        requires_human_approval=True
    )
