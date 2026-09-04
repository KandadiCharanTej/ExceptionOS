"""Summaries and exports for a reconciliation Result."""
from __future__ import annotations

import csv
import json
from decimal import Decimal
from typing import List

from .matching import Result
from .models import Transaction


def _sum(txns: List[Transaction]) -> Decimal:
    total = Decimal("0.00")
    for t in txns:
        total += t.amount
    return total


def summarize(result: Result) -> dict:
    mism = result.mismatches
    matched_left = [m.left for m in result.matches]
    matched_right = [m.right for m in result.matches]
    return {
        "matched": len(result.clean_matches),
        "amount_mismatches": len(mism),
        "unmatched_left": len(result.unmatched_left),
        "unmatched_right": len(result.unmatched_right),
        "total_left": str(_sum(matched_left + result.unmatched_left)),
        "total_right": str(_sum(matched_right + result.unmatched_right)),
        "mismatch_total": str(sum((abs(m.amount_delta) for m in mism), Decimal("0.00"))),
        "unmatched_left_total": str(_sum(result.unmatched_left)),
        "unmatched_right_total": str(_sum(result.unmatched_right)),
        "reconciled": result.is_reconciled,
        "options": result.options,
    }


def exceptions(result: Result) -> List[dict]:
    """Flat list of every discrepancy, ready for CSV/JSON."""
    out: List[dict] = []
    for m in result.mismatches:
        out.append({
            "type": "amount_mismatch",
            "key": m.left.key or m.right.key or "",
            "currency": m.left.currency,
            "left_amount": str(m.left.amount),
            "right_amount": str(m.right.amount),
            "delta": str(m.amount_delta),
            "left_line": m.left.line,
            "right_line": m.right.line,
        })
    for t in result.unmatched_left:
        out.append({
            "type": "unmatched_left", "key": t.key or "", "currency": t.currency,
            "left_amount": str(t.amount), "right_amount": "", "delta": "",
            "left_line": t.line, "right_line": "",
        })
    for t in result.unmatched_right:
        out.append({
            "type": "unmatched_right", "key": t.key or "", "currency": t.currency,
            "left_amount": "", "right_amount": str(t.amount), "delta": "",
            "left_line": "", "right_line": t.line,
        })
    return out


def write_json(result: Result, path) -> None:
    payload = {"summary": summarize(result), "exceptions": exceptions(result)}
    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)


def write_exceptions_csv(result: Result, path) -> None:
    rows = exceptions(result)
    fields = ["type", "key", "currency", "left_amount", "right_amount", "delta", "left_line", "right_line"]
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        w.writerows(rows)


def console_summary(result: Result, left_name="left", right_name="right") -> str:
    s = summarize(result)
    lines = [
        "",
        "  ExceptionOS — reconciliation summary",
        "  " + "-" * 42,
        f"  matched              {s['matched']:>6}",
        f"  amount mismatches    {s['amount_mismatches']:>6}   ({s['mismatch_total']})",
        f"  in {left_name} only        {s['unmatched_left']:>6}   ({s['unmatched_left_total']})",
        f"  in {right_name} only      {s['unmatched_right']:>6}   ({s['unmatched_right_total']})",
        "  " + "-" * 42,
        f"  status               {'RECONCILED' if s['reconciled'] else 'EXCEPTIONS FOUND'}",
        "",
    ]
    return "\n".join(lines)
