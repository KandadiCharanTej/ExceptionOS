"""ExceptionOS Resolution Verification module."""
from dataclasses import dataclass
import datetime

from exceptionos.pipeline.unified import UnifiedCase
from exceptionos.resolution.resolution import ResolutionAction

@dataclass
class VerificationResult:
    status: str
    explanation: str

def verify_resolution(
    action: ResolutionAction, 
    original_case: UnifiedCase, 
    updated_case: UnifiedCase
) -> VerificationResult:
    """Deterministically verifies if an exception was successfully resolved."""
    
    # 1. Did the classification become matched?
    if updated_case.classification == "matched":
        return VerificationResult(
            status="VERIFIED_RESOLVED",
            explanation=f"The transaction records now perfectly match. Action '{action.action_taken}' was successful."
        )
        
    rc = action.root_cause
    
    # 2. Duplicate handling (it could be matched now, or one side deleted but still mismatched for other reasons)
    if rc == "duplicate_transaction":
        if not updated_case.is_duplicate and updated_case.classification != "duplicate":
            # The duplicate aspect is fixed, even if it's now a different exception
            return VerificationResult(
                status="VERIFIED_RESOLVED",
                explanation="The duplicate transaction was successfully removed or resolved."
            )
            
    # 3. Delayed settlement handling (Pending grace period)
    if rc == "delayed_settlement":
        # Check if we're still missing the bank side but it's within 7 days
        # We need a reference date. Let's use today or the latest action timestamp.
        # For simplicity, we check if the updated case is still missing the bank transaction.
        if updated_case.classification in ("missing", "date_mismatch", "timing_issue"):
            # Check elapsed time since action was taken
            elapsed = (datetime.datetime.now() - action.timestamp).days
            if elapsed < 7:
                return VerificationResult(
                    status="PENDING",
                    explanation=f"Settlement is still pending. Waiting for grace period ({elapsed} days elapsed)."
                )
            else:
                return VerificationResult(
                    status="NEEDS_REVIEW",
                    explanation=f"Grace period exceeded ({elapsed} days). Settlement is still missing or delayed."
                )
                
    # 4. Unknown / Needs Review
    if rc in ("unknown_discrepancy", "needs_review"):
        return VerificationResult(
            status="NEEDS_REVIEW",
            explanation="This case previously required human investigation and remains unresolved."
        )
        
    # 5. Fallback - the exception is still open
    return VerificationResult(
        status="STILL_OPEN",
        explanation=f"The updated records are still classified as '{updated_case.classification}'. The exception remains open."
    )
