"""The reconciliation engine.

Two-phase, deterministic matching:

  Phase A — exact match on a shared key (charge id / reference). Amount
            differences within tolerance count as matched; larger differences
            are reported as ``amount_mismatch`` (e.g. a fee or a wrong amount).
  Phase B — heuristic match on the leftovers by (currency, amount within
            tolerance, date within a window), choosing the closest date.

Whatever is still unmatched is reported per side:
  * unmatched_left  — in your ledger but missing from the processor
  * unmatched_right — in the processor but never recorded in your ledger
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal
from typing import Dict, List, Optional

from .models import Transaction


@dataclass
class Match:
    left: Transaction
    right: Transaction
    method: str            # "key" or "heuristic"
    amount_delta: Decimal  # left.amount - right.amount (0 when reconciled)

    @property
    def status(self) -> str:
        return "matched" if self.amount_delta == 0 else "amount_mismatch"


@dataclass
class Result:
    matches: List[Match]
    unmatched_left: List[Transaction]
    unmatched_right: List[Transaction]
    options: dict = field(default_factory=dict)

    @property
    def clean_matches(self) -> List[Match]:
        return [m for m in self.matches if m.status == "matched"]

    @property
    def mismatches(self) -> List[Match]:
        return [m for m in self.matches if m.status == "amount_mismatch"]

    @property
    def is_reconciled(self) -> bool:
        return not (self.mismatches or self.unmatched_left or self.unmatched_right)


def _date_distance(a: Optional[date], b: Optional[date]) -> Optional[int]:
    if a is None or b is None:
        return None
    return abs((a - b).days)


def reconcile(
    left: List[Transaction],
    right: List[Transaction],
    *,
    amount_tolerance="0.00",
    date_window_days: int = 3,
    match_keys: bool = True,
) -> Result:
    tol = abs(Decimal(str(amount_tolerance)))
    left_pool = list(left)
    right_pool = list(right)
    matches: List[Match] = []

    # --- Phase A: exact key match ---
    if match_keys:
        right_by_key: Dict[str, List[Transaction]] = {}
        for t in right_pool:
            if t.key:
                right_by_key.setdefault(t.key, []).append(t)

        consumed_right = set()
        remaining_left: List[Transaction] = []
        for lt in left_pool:
            bucket = right_by_key.get(lt.key) if lt.key else None
            if bucket:
                rt = bucket.pop(0)
                consumed_right.add(id(rt))
                delta = lt.amount - rt.amount
                if abs(delta) <= tol:
                    delta = Decimal("0.00")
                matches.append(Match(lt, rt, "key", delta))
            else:
                remaining_left.append(lt)

        left_pool = remaining_left
        right_pool = [t for t in right_pool if id(t) not in consumed_right]

    # --- Phase B: heuristic match on the leftovers ---
    remaining_left = []
    for lt in left_pool:
        best = None
        best_dist = None
        for rt in right_pool:
            if rt.currency != lt.currency:
                continue
            if abs(lt.amount - rt.amount) > tol:
                continue
            dist = _date_distance(lt.date, rt.date)
            if dist is not None and dist > date_window_days:
                continue
            score = dist if dist is not None else date_window_days  # missing dates rank last
            if best is None or score < best_dist:
                best, best_dist = rt, score
        if best is not None:
            right_pool.remove(best)
            matches.append(Match(lt, best, "heuristic", Decimal("0.00")))
        else:
            remaining_left.append(lt)
    left_pool = remaining_left

    return Result(
        matches=matches,
        unmatched_left=left_pool,
        unmatched_right=right_pool,
        options={
            "amount_tolerance": str(tol),
            "date_window_days": date_window_days,
            "match_keys": match_keys,
        },
    )
