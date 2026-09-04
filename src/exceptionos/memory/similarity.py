"""ExceptionOS Deterministic Similarity Engine."""
from dataclasses import dataclass, field
from typing import List, Dict, Any

from exceptionos.memory.case_memory import MemoryCase

@dataclass
class SimilarityResult:
    remembered_case: MemoryCase
    similarity_score: int
    similarity_evidence: List[str] = field(default_factory=list)

def find_similar_cases(
    current_features: Dict[str, Any], 
    memory_cases: List[MemoryCase], 
    threshold: int = 50, 
    limit: int = 3
) -> List[SimilarityResult]:
    """Deterministically scores and finds similar historical cases."""
    results = []
    
    for mem_case in memory_cases:
        score = 0
        evidence = []
        
        # 1. Classification Match (Core identity)
        if current_features.get("classification") == mem_case.classification:
            score += 40
            evidence.append(f"Classification matches exactly ({mem_case.classification})")
            
        # 2. Missing Sources Match
        curr_missing = set(current_features.get("missing_sources", []))
        mem_missing = set(mem_case.missing_sources)
        if curr_missing and mem_missing:
            if curr_missing == mem_missing:
                score += 30
                evidence.append(f"Missing source pattern matches exactly ({', '.join(mem_missing)})")
            elif curr_missing.intersection(mem_missing):
                score += 15
                evidence.append("Missing source pattern partially matches")
                
        # 3. Amount Difference Match
        curr_amt = current_features.get("amount_difference")
        mem_amt = mem_case.amount_difference
        if curr_amt is not None and mem_amt is not None:
            # Check if amounts are within 5% of each other
            if curr_amt == mem_amt:
                score += 20
                evidence.append(f"Amount discrepancy is identical ({curr_amt})")
            elif mem_amt != 0:
                diff_pct = abs((curr_amt - mem_amt) / mem_amt)
                if diff_pct <= 0.05:
                    score += 15
                    evidence.append("Amount discrepancy is highly similar (within 5%)")
                    
        # 4. Date Difference Match
        curr_date = current_features.get("date_difference")
        mem_date = mem_case.date_difference
        if curr_date is not None and mem_date is not None:
            if curr_date == mem_date:
                score += 20
                evidence.append(f"Date delay is identical ({curr_date} days)")
            elif abs(curr_date - mem_date) <= 1:
                score += 15
                evidence.append("Date delay is highly similar (within 1 day)")
                
        # 5. Duplicate Flag Match
        curr_dup = current_features.get("duplicate_flag", False)
        mem_dup = mem_case.duplicate_flag
        if curr_dup and mem_dup:
            score += 10
            evidence.append("Both cases involve flagged duplicates")
            
        # Cap score at 100
        if score > 100:
            score = 100
            
        if score >= threshold:
            results.append(SimilarityResult(
                remembered_case=mem_case,
                similarity_score=score,
                similarity_evidence=evidence
            ))
            
    # Sort descending
    results.sort(key=lambda x: x.similarity_score, reverse=True)
    
    return results[:limit]
