import unittest
from datetime import date
from decimal import Decimal

from exceptionos.models import Transaction
from exceptionos.pipeline.unified import UnifiedCase
from exceptionos.intelligence.hypothesis import Hypothesis
from exceptionos.intelligence.root_cause import select_root_cause

class TestRootCause(unittest.TestCase):
    
    def test_no_exception(self):
        case = UnifiedCase(key="T1")
        # Overwrite classification directly for test
        # UnifiedCase uses a property, so we can't overwrite it directly like this.
        # Let's populate transactions that match perfectly.
        row = {}
        case.ledger_txn = Transaction("ledger", "T1", Decimal("100"), "USD", date(2026, 9, 1), row)
        case.gateway_txn = Transaction("gateway", "T1", Decimal("100"), "USD", date(2026, 9, 1), row)
        case.bank_txn = Transaction("bank", "T1", Decimal("100"), "USD", date(2026, 9, 1), row)
        
        self.assertEqual(case.classification, "matched")
        
        decision = select_root_cause(case, None, [])
        self.assertEqual(decision.status, "NO_EXCEPTION")
        self.assertIsNone(decision.root_cause)

    def test_confirmed_decision(self):
        case = UnifiedCase(key="T2")
        # Force a mismatch classification indirectly by leaving bank missing
        row = {}
        case.ledger_txn = Transaction("ledger", "T2", Decimal("100"), "USD", date(2026, 9, 1), row)
        
        h1 = Hypothesis("gateway_fee", 95, ["Strong evidence"], "Test")
        h2 = Hypothesis("unknown_discrepancy", 20, [], "")
        
        decision = select_root_cause(case, None, [h1, h2])
        self.assertEqual(decision.status, "CONFIRMED")
        self.assertEqual(decision.root_cause, "gateway_fee")
        self.assertFalse(decision.requires_human_review)

    def test_probable_decision(self):
        case = UnifiedCase(key="T3")
        case.ledger_txn = Transaction("ledger", "T3", Decimal("100"), "USD", date(2026, 9, 1), row={})
        
        h1 = Hypothesis("delayed_settlement", 75, ["Okay evidence"], "Test")
        h2 = Hypothesis("unknown_discrepancy", 20, [], "")
        
        decision = select_root_cause(case, None, [h1, h2])
        self.assertEqual(decision.status, "PROBABLE")
        self.assertEqual(decision.root_cause, "delayed_settlement")

    def test_needs_review_conflict(self):
        case = UnifiedCase(key="T4")
        case.ledger_txn = Transaction("ledger", "T4", Decimal("100"), "USD", date(2026, 9, 1), row={})
        
        h1 = Hypothesis("refund", 85, [], "")
        h2 = Hypothesis("gateway_fee", 82, [], "")
        
        decision = select_root_cause(case, None, [h1, h2])
        self.assertEqual(decision.status, "NEEDS_REVIEW")
        self.assertEqual(decision.root_cause, "needs_review")
        self.assertTrue(decision.requires_human_review)
        
    def test_needs_review_low_confidence(self):
        case = UnifiedCase(key="T5")
        case.ledger_txn = Transaction("ledger", "T5", Decimal("100"), "USD", date(2026, 9, 1), row={})
        
        h1 = Hypothesis("refund", 55, [], "")
        h2 = Hypothesis("gateway_fee", 20, [], "")
        
        decision = select_root_cause(case, None, [h1, h2])
        self.assertEqual(decision.status, "NEEDS_REVIEW")
        self.assertTrue(decision.requires_human_review)
        
    def test_unknown(self):
        case = UnifiedCase(key="T6")
        case.ledger_txn = Transaction("ledger", "T6", Decimal("100"), "USD", date(2026, 9, 1), row={})
        
        h1 = Hypothesis("unknown_discrepancy", 80, [], "")
        
        decision = select_root_cause(case, None, [h1])
        self.assertEqual(decision.status, "UNKNOWN")
        self.assertEqual(decision.root_cause, "unknown_discrepancy")
        self.assertTrue(decision.requires_human_review)

if __name__ == "__main__":
    unittest.main()
