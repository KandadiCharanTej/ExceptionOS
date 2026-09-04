"""Unified 3-way reconciliation pipeline."""
from collections import defaultdict
from dataclasses import dataclass
from typing import List, Optional

from exceptionos.models import Transaction
from exceptionos.matching import reconcile

@dataclass
class UnifiedCase:
    key: str
    ledger_txn: Optional[Transaction] = None
    gateway_txn: Optional[Transaction] = None
    bank_txn: Optional[Transaction] = None
    is_duplicate: bool = False

    @property
    def classification(self) -> str:
        if self.is_duplicate:
            return "duplicate"
        
        # Missing
        if not self.ledger_txn or not self.gateway_txn or not self.bank_txn:
            return "missing"
            
        # All three present, check amounts
        if self.ledger_txn.amount == self.gateway_txn.amount == self.bank_txn.amount:
            # Check dates
            if self.ledger_txn.date and self.gateway_txn.date and self.bank_txn.date:
                # Gateway should closely match ledger date
                if abs((self.ledger_txn.date - self.gateway_txn.date).days) > 14:
                    return "date_mismatch"
                
                # Bank can be delayed
                delay = (self.bank_txn.date - self.ledger_txn.date).days
                if delay > 0 and delay <= 14:
                    return "timing_issue"
                elif delay > 14 or delay < -14:
                    return "date_mismatch"
                    
            return "matched"
            
        # Amount mismatch logic
        # Usually gateway takes a fee, so ledger > gateway == bank
        if self.ledger_txn.amount > self.gateway_txn.amount and self.gateway_txn.amount == self.bank_txn.amount:
            return "amount_mismatch"
            
        # Any other mismatch is unknown
        return "unresolved/unknown"


def run_pipeline(
    ledger: List[Transaction], 
    gateway: List[Transaction], 
    bank: List[Transaction], 
    amount_tolerance="15.00", 
    date_window=3
) -> List[UnifiedCase]:
    """Runs a 3-way reconciliation pipeline without breaking the original engine."""
    
    # Phase 1: Ledger <-> Gateway
    res_lg = reconcile(ledger, gateway, amount_tolerance=amount_tolerance, date_window_days=date_window)
    
    # Phase 2: Gateway <-> Bank
    res_gb = reconcile(gateway, bank, amount_tolerance=amount_tolerance, date_window_days=date_window)
    
    # Combine results
    cases_by_key = defaultdict(list)
    
    # Track which gateway transactions are paired where
    gw_to_ledger = {}
    for match in res_lg.matches:
        gw_to_ledger[id(match.right)] = match.left
        
    gw_to_bank = {}
    for match in res_gb.matches:
        gw_to_bank[id(match.left)] = match.right
        
    all_gw_txns = gateway.copy()
    cases = []
    
    # 1. Build cases from Gateway perspective
    for gw in all_gw_txns:
        l_txn = gw_to_ledger.get(id(gw))
        b_txn = gw_to_bank.get(id(gw))
        
        key = gw.key or (l_txn.key if l_txn else (b_txn.key if b_txn else "unknown"))
        case = UnifiedCase(key=key, ledger_txn=l_txn, gateway_txn=gw, bank_txn=b_txn)
        cases.append(case)
        cases_by_key[key].append(case)
        
    # 2. Build cases for unmatched ledger
    for l_txn in res_lg.unmatched_left:
        key = l_txn.key or "unknown"
        case = UnifiedCase(key=key, ledger_txn=l_txn, gateway_txn=None, bank_txn=None)
        cases.append(case)
        cases_by_key[key].append(case)
        
    # 3. Build cases for unmatched bank
    for b_txn in res_gb.unmatched_right:
        key = b_txn.key or "unknown"
        case = UnifiedCase(key=key, ledger_txn=None, gateway_txn=None, bank_txn=b_txn)
        cases.append(case)
        cases_by_key[key].append(case)
        
    # 4. Detect duplicates across all cases
    for key, key_cases in cases_by_key.items():
        if len(key_cases) > 1 and key != "unknown":
            for c in key_cases:
                c.is_duplicate = True
                
    return cases

def report_pipeline(cases: List[UnifiedCase]) -> str:
    counts = defaultdict(int)
    for c in cases:
        counts[c.classification] += 1
        
    total = len(cases)
    matched = counts.get("matched", 0)
    exceptions = total - matched
    
    lines = [
        "",
        "  ExceptionOS 3-Way Pipeline Summary",
        "  " + "-" * 42,
        f"  Total Cases          {total:>6}",
        f"  Matched Cases        {matched:>6}",
        f"  Exceptions Found     {exceptions:>6}",
        "  " + "-" * 42,
    ]
    
    for cls, count in sorted(counts.items()):
        if cls != "matched":
            lines.append(f"  {cls:<20} {count:>6}")
            
    lines.append("")
    return "\n".join(lines)
