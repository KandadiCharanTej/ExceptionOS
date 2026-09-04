import unittest
from datetime import date
from decimal import Decimal

from exceptionos.models import Transaction
from exceptionos.pipeline.unified import UnifiedCase
from exceptionos.pipeline.timeline import build_timeline
from exceptionos.intelligence.hypothesis import generate_hypotheses

class TestHypothesisEngine(unittest.TestCase):
    def test_gateway_fee(self):
        row = {}
        l = Transaction("ledger", "T1", Decimal("100"), "USD", date(2026, 9, 1), row)
        g = Transaction("gateway", "T1", Decimal("98"), "USD", date(2026, 9, 1), row)
        b = Transaction("bank", "T1", Decimal("98"), "USD", date(2026, 9, 1), row)
        case = UnifiedCase(key="T1", ledger_txn=l, gateway_txn=g, bank_txn=b)
        # Mock classification so timeline has amount_difference_detected
        case.classification # will return amount_mismatch internally
        
        timeline = build_timeline(case)
        hypotheses = generate_hypotheses(case, timeline)
        
        self.assertTrue(len(hypotheses) > 0)
        self.assertEqual(hypotheses[0].hypothesis_type, "gateway_fee")
        self.assertEqual(hypotheses[0].confidence_score, 95) # 40 + 35 + 20

    def test_delayed_settlement(self):
        row = {}
        l = Transaction("ledger", "T2", Decimal("100"), "USD", date(2026, 9, 1), row)
        g = Transaction("gateway", "T2", Decimal("100"), "USD", date(2026, 9, 1), row)
        b = Transaction("bank", "T2", Decimal("100"), "USD", date(2026, 9, 5), row)
        case = UnifiedCase(key="T2", ledger_txn=l, gateway_txn=g, bank_txn=b)
        
        timeline = build_timeline(case)
        hypotheses = generate_hypotheses(case, timeline)
        
        self.assertTrue(len(hypotheses) > 0)
        self.assertEqual(hypotheses[0].hypothesis_type, "delayed_settlement")
        self.assertEqual(hypotheses[0].confidence_score, 95)

    def test_missing_gateway(self):
        row = {}
        l = Transaction("ledger", "T3", Decimal("100"), "USD", date(2026, 9, 1), row)
        b = Transaction("bank", "T3", Decimal("100"), "USD", date(2026, 9, 1), row)
        case = UnifiedCase(key="T3", ledger_txn=l, gateway_txn=None, bank_txn=b)
        
        timeline = build_timeline(case)
        hypotheses = generate_hypotheses(case, timeline)
        
        self.assertTrue(len(hypotheses) > 0)
        self.assertEqual(hypotheses[0].hypothesis_type, "missing_gateway_record")
        self.assertEqual(hypotheses[0].confidence_score, 90)

    def test_unknown_fallback(self):
        row = {}
        # Unrealistic case: all match perfectly, but we still generate hypotheses
        # The engine should return empty or unknown
        l = Transaction("ledger", "T4", Decimal("100"), "USD", date(2026, 9, 1), row)
        g = Transaction("gateway", "T4", Decimal("100"), "USD", date(2026, 9, 1), row)
        b = Transaction("bank", "T4", Decimal("100"), "USD", date(2026, 9, 1), row)
        case = UnifiedCase(key="T4", ledger_txn=l, gateway_txn=g, bank_txn=b)
        
        timeline = build_timeline(case)
        hypotheses = generate_hypotheses(case, timeline)
        
        self.assertEqual(len(hypotheses), 1)
        self.assertEqual(hypotheses[0].hypothesis_type, "unknown_discrepancy")
        self.assertEqual(hypotheses[0].confidence_score, 80)

if __name__ == "__main__":
    unittest.main()
