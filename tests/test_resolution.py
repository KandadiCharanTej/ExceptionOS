import unittest
import datetime
from decimal import Decimal

from exceptionos.models import Transaction
from exceptionos.pipeline.unified import UnifiedCase
from exceptionos.intelligence.root_cause import RootCauseDecision
from exceptionos.resolution.resolution import recommend_resolution, ResolutionAction
from exceptionos.resolution.verification import verify_resolution

class TestResolution(unittest.TestCase):
    def test_gateway_fee_recommendation(self):
        decision = RootCauseDecision(
            root_cause="gateway_fee",
            confidence_score=95,
            status="CONFIRMED",
            selected_hypothesis=None
        )
        rec = recommend_resolution(decision)
        self.assertEqual(rec.recommended_action, "record_gateway_fee")
        self.assertFalse(rec.requires_human_approval)

    def test_missing_ledger_recommendation(self):
        decision = RootCauseDecision(
            root_cause="missing_ledger_record",
            confidence_score=90,
            status="CONFIRMED",
            selected_hypothesis=None
        )
        rec = recommend_resolution(decision)
        self.assertEqual(rec.recommended_action, "create_ledger_entry")
        self.assertTrue(rec.requires_human_approval)
        
    def test_verified_resolved(self):
        # Original case (Mismatch)
        orig = UnifiedCase(key="T1")
        row = {}
        orig.ledger_txn = Transaction("ledger", "T1", Decimal("100"), "USD", datetime.date(2026, 9, 1), row)
        orig.gateway_txn = Transaction("gateway", "T1", Decimal("98"), "USD", datetime.date(2026, 9, 1), row)
        
        # Action taken
        action = ResolutionAction(
            case_id="T1",
            root_cause="gateway_fee",
            action_taken="Recorded 2.00 fee",
            approved_by="system",
            timestamp=datetime.datetime.now(),
            status="APPLIED"
        )
        
        # Updated case (Matched)
        updated = UnifiedCase(key="T1")
        updated.ledger_txn = Transaction("ledger", "T1", Decimal("98"), "USD", datetime.date(2026, 9, 1), row)
        updated.gateway_txn = Transaction("gateway", "T1", Decimal("98"), "USD", datetime.date(2026, 9, 1), row)
        updated.bank_txn = Transaction("bank", "T1", Decimal("98"), "USD", datetime.date(2026, 9, 1), row)
        
        # We need to manually set the classification property via internal means or assert based on what verification does.
        # verification.py just checks updated_case.classification == "matched"
        
        result = verify_resolution(action, orig, updated)
        self.assertEqual(result.status, "VERIFIED_RESOLVED")

    def test_still_open(self):
        orig = UnifiedCase(key="T2")
        # Action taken
        action = ResolutionAction(
            case_id="T2",
            root_cause="gateway_fee",
            action_taken="Did something wrong",
            approved_by="system",
            timestamp=datetime.datetime.now(),
            status="APPLIED"
        )
        # Updated case is still missing Bank
        updated = UnifiedCase(key="T2")
        updated.ledger_txn = Transaction("ledger", "T2", Decimal("100"), "USD", datetime.date(2026, 9, 1), {})
        updated.gateway_txn = Transaction("gateway", "T2", Decimal("98"), "USD", datetime.date(2026, 9, 1), {})
        
        result = verify_resolution(action, orig, updated)
        self.assertEqual(result.status, "STILL_OPEN")

    def test_pending_delayed_settlement(self):
        orig = UnifiedCase(key="T3")
        action = ResolutionAction(
            case_id="T3",
            root_cause="delayed_settlement",
            action_taken="Wait",
            approved_by="system",
            timestamp=datetime.datetime.now(), # Just now
            status="APPLIED"
        )
        updated = UnifiedCase(key="T3")
        # Still a mismatch
        updated.ledger_txn = Transaction("ledger", "T3", Decimal("100"), "USD", datetime.date(2026, 9, 1), {})
        updated.gateway_txn = Transaction("gateway", "T3", Decimal("100"), "USD", datetime.date(2026, 9, 1), {})
        
        result = verify_resolution(action, orig, updated)
        self.assertEqual(result.status, "PENDING")

if __name__ == "__main__":
    unittest.main()
