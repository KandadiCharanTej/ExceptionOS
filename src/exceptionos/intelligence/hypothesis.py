"""Deterministic Hypothesis Engine for ExceptionOS."""
from dataclasses import dataclass, field
from typing import List
from decimal import Decimal

from exceptionos.pipeline.unified import UnifiedCase
from exceptionos.pipeline.timeline import EvidenceTimeline, TimelineEvent

@dataclass
class Hypothesis:
    hypothesis_type: str
    confidence_score: int
    evidence: List[str] = field(default_factory=list)
    explanation: str = ""

def generate_hypotheses(case: UnifiedCase, timeline: EvidenceTimeline) -> List[Hypothesis]:
    """Generates and scores possible explanations for an exception deterministically."""
    
    hypotheses = []
    
    # Pre-compute some facts from the case and timeline
    has_ledger = case.ledger_txn is not None
    has_gateway = case.gateway_txn is not None
    has_bank = case.bank_txn is not None
    
    amount_mismatch = any(e.event_type == "amount_difference_detected" for e in timeline.events)
    duplicate_detected = any(e.event_type == "duplicate_detected" for e in timeline.events)
    date_mismatch = any(e.event_type == "date_difference_detected" for e in timeline.events)
    missing_detected = any(e.event_type == "transaction_missing" for e in timeline.events)
    
    # 1. Gateway Fee Hypothesis
    fee_score = 0
    fee_evidence = []
    if has_ledger and has_gateway and has_bank:
        if amount_mismatch:
            fee_score += 40
            fee_evidence.append("An amount discrepancy exists across systems.")
            
        if case.ledger_txn.amount > case.gateway_txn.amount and case.gateway_txn.amount == case.bank_txn.amount:
            fee_score += 35
            fee_evidence.append("Ledger amount is greater than the Gateway and Bank settlement amount.")
            
            # Check if it looks like a realistic fee (e.g. 1% to 10%)
            diff = case.ledger_txn.amount - case.gateway_txn.amount
            if diff > 0:
                fee_pct = (diff / case.ledger_txn.amount) * Decimal("100")
                if Decimal("0.5") <= fee_pct <= Decimal("10.0"):
                    fee_score += 20
                    fee_evidence.append(f"The difference ({diff}) resembles a standard processing fee ({fee_pct:.1f}%).")
                    
    if fee_score > 0:
        hypotheses.append(Hypothesis(
            hypothesis_type="gateway_fee",
            confidence_score=fee_score,
            evidence=fee_evidence,
            explanation="The gateway likely deducted a processing fee before settlement."
        ))

    # 2. Delayed Settlement Hypothesis
    delayed_score = 0
    delayed_evidence = []
    if date_mismatch:
        if has_ledger and has_gateway and has_bank:
            delayed_score += 40
            delayed_evidence.append("All core transactions exist but dates misalign.")
            
            if case.ledger_txn.amount == case.gateway_txn.amount == case.bank_txn.amount:
                delayed_score += 30
                delayed_evidence.append("Transaction amounts match perfectly.")
                
            delay = (case.bank_txn.date - case.ledger_txn.date).days
            if 0 < delay <= 14:
                delayed_score += 25
                delayed_evidence.append(f"Bank settlement occurred {delay} days after ledger record.")
    if delayed_score > 0:
        hypotheses.append(Hypothesis(
            hypothesis_type="delayed_settlement",
            confidence_score=delayed_score,
            evidence=delayed_evidence,
            explanation="The transaction successfully processed but took longer than usual to settle at the bank."
        ))

    # 3. Duplicate Transaction
    dup_score = 0
    dup_evidence = []
    if duplicate_detected or case.is_duplicate:
        dup_score += 50
        dup_evidence.append("System explicitly flagged duplicate keys or properties.")
        if missing_detected:
            dup_score += 45
            dup_evidence.append("Duplicates often cause matching engine mismatches resulting in missing counterparts.")
        else:
            dup_score += 49
            dup_evidence.append("Multiple exact matches detected on one or more sides.")
            
    if dup_score > 0:
        hypotheses.append(Hypothesis(
            hypothesis_type="duplicate_transaction",
            confidence_score=dup_score,
            evidence=dup_evidence,
            explanation="Multiple identical transactions were found sharing the same key or properties."
        ))

    # 4. Missing Gateway Record
    mg_score = 0
    mg_evidence = []
    if has_ledger and not has_gateway:
        mg_score += 50
        mg_evidence.append("Ledger record exists but Gateway record is completely absent.")
        if has_bank:
            mg_score += 40
            mg_evidence.append("Bank settlement exists, suggesting a reporting failure at the Gateway.")
        else:
            mg_score += 25
            mg_evidence.append("Bank settlement is also absent.")
    if mg_score > 0:
        hypotheses.append(Hypothesis(
            hypothesis_type="missing_gateway_record",
            confidence_score=mg_score,
            evidence=mg_evidence,
            explanation="The transaction is recorded internally but absent from the Gateway report."
        ))

    # 5. Missing Bank Settlement
    mb_score = 0
    mb_evidence = []
    if has_gateway and not has_bank:
        mb_score += 50
        mb_evidence.append("Gateway record exists but Bank settlement is absent.")
        if has_ledger:
            mb_score += 40
            mb_evidence.append("Ledger correctly recorded the intent, meaning settlement failed or is delayed heavily.")
    if mb_score > 0:
        hypotheses.append(Hypothesis(
            hypothesis_type="missing_bank_settlement",
            confidence_score=mb_score,
            evidence=mb_evidence,
            explanation="The transaction cleared the Gateway but did not arrive in the Bank account."
        ))

    # 6. Missing Ledger Record
    ml_score = 0
    ml_evidence = []
    if not has_ledger and (has_gateway or has_bank):
        ml_score += 50
        ml_evidence.append("Gateway or Bank records exist but Ledger is absent.")
        if has_gateway and has_bank:
            ml_score += 40
            ml_evidence.append("Both external systems agree, indicating a strict internal tracking failure.")
    if ml_score > 0:
        hypotheses.append(Hypothesis(
            hypothesis_type="missing_ledger_record",
            confidence_score=ml_score,
            evidence=ml_evidence,
            explanation="An external charge was settled but was never recorded in the internal Ledger."
        ))
        
    # 7. Refund Hypothesis
    ref_score = 0
    ref_evidence = []
    is_negative = False
    if has_ledger and case.ledger_txn.amount < 0: is_negative = True
    if has_gateway and case.gateway_txn.amount < 0: is_negative = True
    
    if is_negative:
        ref_score += 50
        ref_evidence.append("Negative transaction amounts detected.")
        if missing_detected:
            ref_score += 35
            ref_evidence.append("Refunds often lack counterparts on one side depending on timing.")
    if ref_score > 0:
        hypotheses.append(Hypothesis(
            hypothesis_type="refund",
            confidence_score=ref_score,
            evidence=ref_evidence,
            explanation="The transaction appears to be a refund or reversal."
        ))

    # 8. Date / Timezone Issue
    dt_score = 0
    dt_evidence = []
    if date_mismatch:
        if has_ledger and has_gateway:
            delay = abs((case.ledger_txn.date - case.gateway_txn.date).days)
            if delay > 14:
                dt_score += 50
                dt_evidence.append(f"Severe date discrepancy ({delay} days) detected between Ledger and Gateway.")
                if case.ledger_txn.amount == case.gateway_txn.amount:
                    dt_score += 35
                    dt_evidence.append("Amounts match perfectly despite the massive date difference.")
    if dt_score > 0:
        hypotheses.append(Hypothesis(
            hypothesis_type="date_or_timezone_issue",
            confidence_score=dt_score,
            evidence=dt_evidence,
            explanation="Dates mismatch severely, potentially due to timezone parsing errors or stale data."
        ))

    # Cap all scores at 99 (100 is reserved for absolute certainty which a hypothesis shouldn't have)
    for h in hypotheses:
        if h.confidence_score > 99:
            h.confidence_score = 99

    # Filter out weak hypotheses
    hypotheses = [h for h in hypotheses if h.confidence_score >= 30]

    # 9. Unknown Discrepancy (Fallback)
    max_score = max([h.confidence_score for h in hypotheses]) if hypotheses else 0
    unk_score = 10
    unk_evidence = ["A discrepancy was flagged by the matching engine."]
    
    if max_score < 40:
        unk_score += 70
        unk_evidence.append("No other hypothesis has strong evidence.")
        
    if unk_score > 30 or not hypotheses:
        hypotheses.append(Hypothesis(
            hypothesis_type="unknown_discrepancy",
            confidence_score=unk_score,
            evidence=unk_evidence,
            explanation="The root cause cannot be strongly determined based on current evidence."
        ))
        
    # Sort descending
    hypotheses.sort(key=lambda x: x.confidence_score, reverse=True)
    
    return hypotheses
