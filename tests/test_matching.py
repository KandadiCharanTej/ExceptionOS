"""Unit tests for the reconciliation engine.

Runnable two ways:
    pytest
    python tests/test_matching.py     (no pytest required)
"""
from datetime import date
from decimal import Decimal

from exceptionos.matching import reconcile
from exceptionos.models import Transaction


def T(source, key, amount, d, cur="USD"):
    return Transaction(source, key, Decimal(amount), cur, d, {}, 0)


def test_key_match_and_amount_mismatch():
    left = [T("ledger", "L1", "100.00", date(2026, 6, 1)),
            T("ledger", "L2", "50.00", date(2026, 6, 1))]
    right = [T("proc", "L1", "100.00", date(2026, 6, 1)),
             T("proc", "L2", "49.00", date(2026, 6, 1))]
    r = reconcile(left, right)
    assert len(r.clean_matches) == 1
    assert len(r.mismatches) == 1
    assert r.mismatches[0].amount_delta == Decimal("1.00")
    assert r.mismatches[0].method == "key"


def test_heuristic_match_and_unmatched():
    left = [T("ledger", None, "49.99", date(2026, 6, 3)),
            T("ledger", "L9", "15.00", date(2026, 6, 3))]
    right = [T("proc", "P8", "49.99", date(2026, 6, 3)),
             T("proc", "P9", "310.00", date(2026, 6, 4))]
    r = reconcile(left, right)
    assert len(r.clean_matches) == 1
    assert r.clean_matches[0].method == "heuristic"
    assert len(r.unmatched_left) == 1 and r.unmatched_left[0].amount == Decimal("15.00")
    assert len(r.unmatched_right) == 1 and r.unmatched_right[0].amount == Decimal("310.00")


def test_amount_tolerance_absorbs_small_diff():
    left = [T("l", "A", "100.00", date(2026, 6, 1))]
    right = [T("r", "A", "100.02", date(2026, 6, 1))]
    r = reconcile(left, right, amount_tolerance="0.05")
    assert len(r.clean_matches) == 1
    assert r.is_reconciled


def test_heuristic_respects_date_window():
    left = [T("l", None, "20.00", date(2026, 6, 1))]
    right = [T("r", None, "20.00", date(2026, 6, 30))]
    r = reconcile(left, right, date_window_days=3)
    assert len(r.clean_matches) == 0
    assert len(r.unmatched_left) == 1 and len(r.unmatched_right) == 1


def test_heuristic_picks_closest_date():
    left = [T("l", None, "30.00", date(2026, 6, 10))]
    right = [T("r", "X", "30.00", date(2026, 6, 14)),
             T("r", "Y", "30.00", date(2026, 6, 11))]
    r = reconcile(left, right, date_window_days=7)
    assert len(r.clean_matches) == 1
    assert r.clean_matches[0].right.key == "Y"  # 1 day away beats 4 days


def test_fully_reconciled_flag():
    left = [T("l", "A", "10.00", date(2026, 6, 1))]
    right = [T("r", "A", "10.00", date(2026, 6, 1))]
    assert reconcile(left, right).is_reconciled


if __name__ == "__main__":
    passed = 0
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            fn()
            print("ok  ", name)
            passed += 1
    print(f"\n{passed} tests passed")
