import json
from sqlalchemy.orm import Session
from exceptionos.database.models import Dataset, CaseRecord

def build_dataset_context(db: Session, dataset_id: str) -> str:
    """Build a context string from verified dataset facts."""
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        return "Dataset not found."
    
    cases = db.query(CaseRecord).filter(CaseRecord.dataset_id == dataset_id).all()
    
    classification_counts = {}
    status_counts = {}
    
    for case in cases:
        c = case.classification
        classification_counts[c] = classification_counts.get(c, 0) + 1
        
        # Check resolutions
        if case.resolutions:
            res_status = case.resolutions[-1].status
            status_counts[res_status] = status_counts.get(res_status, 0) + 1
        else:
            status_counts['UNRESOLVED'] = status_counts.get('UNRESOLVED', 0) + 1
            
    context = f"""
DATASET VERIFIED FACTS:
ID: {dataset.id}
Name: {dataset.name}
Total Cases: {dataset.total_cases}
Matched: {dataset.matched_cases}
Exceptions: {dataset.exception_count}

EXCEPTION BREAKDOWN:
{json.dumps(classification_counts, indent=2)}

RESOLUTION STATUS:
{json.dumps(status_counts, indent=2)}
"""
    return context

def build_case_context(db: Session, case_id: str) -> str:
    """Build a context string from a specific case's verified facts."""
    case = db.query(CaseRecord).filter(CaseRecord.id == case_id).first()
    if not case:
        return "Case not found."
        
    timeline = []
    for event in case.events:
        timeline.append(f"[{event.created_at}] {event.event_type}: {event.description}")
        
    context = f"""
CASE VERIFIED FACTS:
ID: {case.id}
Key: {case.key}
Deterministic Classification: {case.classification}
Is Duplicate: {case.is_duplicate}
Analyst Classification: {case.analyst_classification}
Analyst Notes: {case.notes}
Analyst Tags: {json.dumps(case.tags)}

LEDGER TRANSACTION:
{json.dumps(case.ledger_txn, indent=2)}

GATEWAY TRANSACTION:
{json.dumps(case.gateway_txn, indent=2)}

BANK TRANSACTION:
{json.dumps(case.bank_txn, indent=2)}

EVIDENCE TIMELINE:
{chr(10).join(timeline)}
"""
    return context

def build_priority_context(db: Session, dataset_id: str, prioritized_cases: list) -> str:
    context = f"Top {len(prioritized_cases)} prioritized cases for dataset {dataset_id}:\n\n"
    for idx, case in enumerate(prioritized_cases):
        context += f"Priority {idx + 1}:\n"
        context += build_case_context(db, case.id) + "\n\n"
    return context
