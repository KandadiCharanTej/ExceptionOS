from exceptionos.database.models import CaseRecord
import json

def calculate_priority(case: CaseRecord) -> dict:
    score = 0
    reasons = []
    
    # 1. Classification weight
    if case.classification == "amount_mismatch":
        score += 40
        reasons.append("High-impact amount mismatch exception")
    elif case.classification == "unmatched_right" or case.classification == "unmatched_left":
        score += 30
        reasons.append("Missing transaction across ledgers")
    
    if case.is_duplicate:
        score += 25
        reasons.append("Duplicate transaction detected")
        
    # 2. Amount impact
    amount = 0.0
    try:
        if case.ledger_txn and isinstance(case.ledger_txn, dict) and "amount" in case.ledger_txn:
            amount = float(case.ledger_txn["amount"])
        elif case.gateway_txn and isinstance(case.gateway_txn, dict) and "amount" in case.gateway_txn:
            amount = float(case.gateway_txn["amount"])
        elif case.bank_txn and isinstance(case.bank_txn, dict) and "amount" in case.bank_txn:
            amount = float(case.bank_txn["amount"])
            
        if abs(amount) > 5000:
            score += 35
            reasons.append("High value transaction impact (>5000)")
        elif abs(amount) > 1000:
            score += 20
            reasons.append("Medium value transaction impact (>1000)")
    except Exception:
        pass
        
    # 3. Status weight
    if not case.resolutions or all(r.status != "RESOLVED" for r in case.resolutions):
        score += 15
        reasons.append("Transaction remains unresolved")
        
    # Cap score at 100
    score = min(score, 100)
    
    if score >= 80:
        priority = "CRITICAL"
    elif score >= 50:
        priority = "HIGH"
    elif score >= 30:
        priority = "MEDIUM"
    else:
        priority = "LOW"
        
    return {
        "priority": priority,
        "priority_score": score,
        "reasons": reasons
    }
