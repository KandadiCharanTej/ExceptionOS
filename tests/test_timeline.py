import unittest
from datetime import date
from decimal import Decimal

from exceptionos.models import Transaction
from exceptionos.pipeline.unified import UnifiedCase
from exceptionos.pipeline.timeline import build_timeline

class TestEvidenceTimeline(unittest.TestCase):
    def test_normal_matched_timeline(self):
        row = {}
        l = Transaction("ledger", "T1", Decimal("100"), "USD", date(2026, 9, 1), row)
        g = Transaction("gateway", "T1", Decimal("100"), "USD", date(2026, 9, 1), row)
        b = Transaction("bank", "T1", Decimal("100"), "USD", date(2026, 9, 1), row)
        
        case = UnifiedCase(key="T1", ledger_txn=l, gateway_txn=g, bank_txn=b)
        
        timeline = build_timeline(case)
        self.assertEqual(len(timeline.events), 4) # L, G, B, Exception Created
        
        events = timeline.events
        self.assertEqual(events[0].source, "ledger")
        self.assertEqual(events[1].source, "gateway")
        self.assertEqual(events[2].source, "bank")
        self.assertEqual(events[3].event_type, "exception_created")
        self.assertEqual(events[3].evidence["classification"], "matched")

    def test_amount_mismatch_timeline(self):
        row = {}
        l = Transaction("ledger", "T2", Decimal("100"), "USD", date(2026, 9, 1), row)
        g = Transaction("gateway", "T2", Decimal("98"), "USD", date(2026, 9, 1), row)
        b = Transaction("bank", "T2", Decimal("98"), "USD", date(2026, 9, 1), row)
        
        case = UnifiedCase(key="T2", ledger_txn=l, gateway_txn=g, bank_txn=b)
        
        timeline = build_timeline(case)
        
        # We expect L, G, B, amount_difference_detected, exception_created
        self.assertEqual(len(timeline.events), 5)
        
        amount_diff_event = next(e for e in timeline.events if e.event_type == "amount_difference_detected")
        self.assertIsNotNone(amount_diff_event)
        self.assertEqual(amount_diff_event.evidence["ledger_amount"], "100")
        self.assertEqual(amount_diff_event.evidence["gateway_amount"], "98")

    def test_missing_transaction_timeline(self):
        row = {}
        l = Transaction("ledger", "T3", Decimal("100"), "USD", date(2026, 9, 1), row)
        
        case = UnifiedCase(key="T3", ledger_txn=l, gateway_txn=None, bank_txn=None)
        
        timeline = build_timeline(case)
        
        # We expect L, System(Gateway missing), System(Bank missing), exception_created
        self.assertEqual(len(timeline.events), 4)
        
        missing_events = [e for e in timeline.events if e.event_type == "transaction_missing"]
        self.assertEqual(len(missing_events), 2)
        
if __name__ == "__main__":
    unittest.main()
