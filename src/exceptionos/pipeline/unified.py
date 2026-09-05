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
        
        # Missing record in any source
        if not self.ledger_txn or not self.gateway_txn or not self.bank_txn:
            return "missing"
            
        # Amount mismatch: financial amounts do not reconcile across sources
        if not (self.ledger_txn.amount == self.gateway_txn.amount == self.bank_txn.amount):
            return "amount_mismatch"
            
        # Amounts reconcile, check transaction and settlement dates
        if self.ledger_txn.date and self.gateway_txn.date and self.bank_txn.date:
            # Gateway vs Ledger date mismatch
            if self.ledger_txn.date != self.gateway_txn.date:
                return "date_mismatch"
            
            # Settlement delay between bank and ledger/gateway
            delay = (self.bank_txn.date - self.ledger_txn.date).days
            if delay == 0:
                return "matched"
            elif delay == 1:
                return "timing_issue"  # Standard T+1 settlement timing
            else:
                return "date_mismatch"  # Delay > 1 or negative delay
                
        return "matched"


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
    raw_cases = []
    
    # 1. Build cases from Gateway perspective
    for gw in all_gw_txns:
        l_txn = gw_to_ledger.get(id(gw))
        b_txn = gw_to_bank.get(id(gw))
        
        key = gw.key or (l_txn.key if l_txn else (b_txn.key if b_txn else "unknown"))
        case = UnifiedCase(key=key, ledger_txn=l_txn, gateway_txn=gw, bank_txn=b_txn)
        raw_cases.append(case)
        cases_by_key[key].append(case)
        
    # 2. Build cases for unmatched ledger
    for l_txn in res_lg.unmatched_left:
        key = l_txn.key or "unknown"
        case = UnifiedCase(key=key, ledger_txn=l_txn, gateway_txn=None, bank_txn=None)
        raw_cases.append(case)
        cases_by_key[key].append(case)
        
    # 3. Build cases for unmatched bank
    for b_txn in res_gb.unmatched_right:
        key = b_txn.key or "unknown"
        case = UnifiedCase(key=key, ledger_txn=None, gateway_txn=None, bank_txn=b_txn)
        raw_cases.append(case)
        cases_by_key[key].append(case)
        
    # Consolidate cases by unique transaction key so duplicate rows create a duplicate exception
    # on the unique transaction case rather than inflating the total transaction count.
    consolidated_cases = []
    seen_keys = set()
    for c in raw_cases:
        if c.key != "unknown":
            if c.key in seen_keys:
                continue
            seen_keys.add(c.key)
            all_key_cases = cases_by_key[c.key]
            if len(all_key_cases) > 1:
                # Duplicate detected for this transaction identity
                merged = UnifiedCase(
                    key=c.key,
                    ledger_txn=next((x.ledger_txn for x in all_key_cases if x.ledger_txn), None),
                    gateway_txn=next((x.gateway_txn for x in all_key_cases if x.gateway_txn), None),
                    bank_txn=next((x.bank_txn for x in all_key_cases if x.bank_txn), None),
                    is_duplicate=True
                )
                consolidated_cases.append(merged)
            else:
                consolidated_cases.append(c)
        else:
            consolidated_cases.append(c)
            
    return consolidated_cases

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
