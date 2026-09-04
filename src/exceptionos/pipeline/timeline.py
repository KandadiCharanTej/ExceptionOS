"""Evidence Timeline generation for ExceptionOS."""
import datetime
from dataclasses import dataclass, field
from typing import List, Dict, Any

from exceptionos.pipeline.unified import UnifiedCase

@dataclass
class TimelineEvent:
    timestamp: datetime.date
    source: str
    event_type: str
    description: str
    transaction_id: str
    evidence: Dict[str, Any] = field(default_factory=dict)
    
    def __repr__(self) -> str:
        return f"{self.timestamp} | [{self.source.upper()}] {self.event_type}: {self.description}"

@dataclass
class EvidenceTimeline:
    case_key: str
    events: List[TimelineEvent] = field(default_factory=list)
    
    def format_timeline(self) -> str:
        lines = [f"=== Evidence Timeline: {self.case_key} ==="]
        for e in self.events:
            lines.append(repr(e))
        return "\n".join(lines)

def build_timeline(case: UnifiedCase) -> EvidenceTimeline:
    timeline = EvidenceTimeline(case_key=case.key)
    events = []
    
    # Identify a base date (latest available date) for System events
    available_dates = []
    if case.ledger_txn and case.ledger_txn.date:
        available_dates.append(case.ledger_txn.date)
    if case.gateway_txn and case.gateway_txn.date:
        available_dates.append(case.gateway_txn.date)
    if case.bank_txn and case.bank_txn.date:
        available_dates.append(case.bank_txn.date)
        
    base_date = max(available_dates) if available_dates else datetime.date.today()
    
    # Helper to get date for missing events
    def get_date(txn):
        return txn.date if txn and txn.date else base_date
        
    # 1. Gather transactional events
    if case.ledger_txn:
        events.append(TimelineEvent(
            timestamp=get_date(case.ledger_txn),
            source="ledger",
            event_type="transaction_found",
            description="Ledger transaction recorded",
            transaction_id=case.key,
            evidence={"amount": str(case.ledger_txn.amount), "currency": case.ledger_txn.currency}
        ))
    else:
        events.append(TimelineEvent(
            timestamp=base_date,
            source="system",
            event_type="transaction_missing",
            description="Ledger transaction is completely missing",
            transaction_id=case.key
        ))
        
    if case.gateway_txn:
        events.append(TimelineEvent(
            timestamp=get_date(case.gateway_txn),
            source="gateway",
            event_type="transaction_found",
            description="Gateway transaction recorded",
            transaction_id=case.key,
            evidence={"amount": str(case.gateway_txn.amount), "currency": case.gateway_txn.currency}
        ))
    else:
        events.append(TimelineEvent(
            timestamp=base_date,
            source="system",
            event_type="transaction_missing",
            description="Gateway transaction is missing",
            transaction_id=case.key
        ))
        
    if case.bank_txn:
        events.append(TimelineEvent(
            timestamp=get_date(case.bank_txn),
            source="bank",
            event_type="transaction_found",
            description="Bank settlement transaction recorded",
            transaction_id=case.key,
            evidence={"amount": str(case.bank_txn.amount), "currency": case.bank_txn.currency}
        ))
    else:
        events.append(TimelineEvent(
            timestamp=base_date,
            source="system",
            event_type="transaction_missing",
            description="Bank settlement transaction is missing",
            transaction_id=case.key
        ))
        
    # 2. Add Discrepancy Events based on classification
    cls = case.classification
    
    if cls == "amount_mismatch":
        events.append(TimelineEvent(
            timestamp=base_date,
            source="system",
            event_type="amount_difference_detected",
            description="An amount discrepancy was detected between systems",
            transaction_id=case.key,
            evidence={
                "ledger_amount": str(case.ledger_txn.amount) if case.ledger_txn else None,
                "gateway_amount": str(case.gateway_txn.amount) if case.gateway_txn else None,
                "bank_amount": str(case.bank_txn.amount) if case.bank_txn else None,
            }
        ))
        
    elif cls == "duplicate":
        events.append(TimelineEvent(
            timestamp=base_date,
            source="system",
            event_type="duplicate_detected",
            description="Multiple identical keys or transactions detected",
            transaction_id=case.key
        ))
        
    elif cls in ("date_mismatch", "timing_issue"):
        events.append(TimelineEvent(
            timestamp=base_date,
            source="system",
            event_type="date_difference_detected",
            description=f"A {cls.replace('_', ' ')} was detected",
            transaction_id=case.key,
            evidence={
                "ledger_date": str(get_date(case.ledger_txn)) if case.ledger_txn else None,
                "gateway_date": str(get_date(case.gateway_txn)) if case.gateway_txn else None,
                "bank_date": str(get_date(case.bank_txn)) if case.bank_txn else None,
            }
        ))
        
    # 3. Add final Exception Created event
    events.append(TimelineEvent(
        timestamp=base_date,
        source="system",
        event_type="exception_created",
        description=f"ExceptionOS classified this case as: {cls}",
        transaction_id=case.key,
        evidence={"classification": cls}
    ))
    
    # 4. Sort chronological, then by source precedence to maintain logical flow on same-day
    source_order = {"ledger": 1, "gateway": 2, "bank": 3, "system": 4}
    
    events.sort(key=lambda e: (e.timestamp, source_order.get(e.source, 5)))
    
    timeline.events = events
    return timeline
