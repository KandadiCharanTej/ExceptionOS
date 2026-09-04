"""ExceptionOS Memory Storage and Data Models."""
import os
import json
import datetime
from dataclasses import dataclass, asdict
from typing import List, Optional

@dataclass
class MemoryCase:
    case_id: str
    classification: str
    root_cause: str
    root_cause_status: str
    confidence_score: int
    resolution_action: str
    verification_status: str
    amount_difference: Optional[float]
    date_difference: Optional[int]
    missing_sources: List[str]
    duplicate_flag: bool
    timestamp: str

def save_case_to_memory(case: MemoryCase, filepath: str = "data/memory/cases.json"):
    """Saves a MemoryCase to the JSON memory store."""
    cases = load_memory(filepath)
    
    # Remove existing case with the same ID if it exists
    cases = [c for c in cases if c.case_id != case.case_id]
    
    cases.append(case)
    
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, 'w') as f:
        json.dump([asdict(c) for c in cases], f, indent=4)

def load_memory(filepath: str = "data/memory/cases.json") -> List[MemoryCase]:
    """Loads all MemoryCases from the JSON memory store."""
    if not os.path.exists(filepath):
        return []
    
    try:
        with open(filepath, 'r') as f:
            data = json.load(f)
            return [MemoryCase(**item) for item in data]
    except (json.JSONDecodeError, FileNotFoundError):
        return []

def get_case_by_id(case_id: str, filepath: str = "data/memory/cases.json") -> Optional[MemoryCase]:
    """Retrieves a specific MemoryCase by its ID."""
    cases = load_memory(filepath)
    for c in cases:
        if c.case_id == case_id:
            return c
    return None
