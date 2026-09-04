import unittest
from datetime import date
from decimal import Decimal

from exceptionos.models import Transaction
from exceptionos.pipeline.unified import UnifiedCase, run_pipeline

class TestPipeline(unittest.TestCase):
    def test_normal_match(self):
        row = {}
        l = [Transaction("ledger", "T1", Decimal("100.00"), "INR", date(2026, 9, 1), row)]
        g = [Transaction("gateway", "T1", Decimal("100.00"), "INR", date(2026, 9, 1), row)]
        b = [Transaction("bank", "T1", Decimal("100.00"), "INR", date(2026, 9, 1), row)]
        
        cases = run_pipeline(l, g, b)
        self.assertEqual(len(cases), 1)
        self.assertEqual(cases[0].classification, "matched")

    def test_amount_mismatch_fee(self):
        row = {}
        l = [Transaction("ledger", "T2", Decimal("100.00"), "INR", date(2026, 9, 1), row)]
        g = [Transaction("gateway", "T2", Decimal("98.00"), "INR", date(2026, 9, 1), row)]
        b = [Transaction("bank", "T2", Decimal("98.00"), "INR", date(2026, 9, 1), row)]
        
        cases = run_pipeline(l, g, b, amount_tolerance="2.00")
        self.assertEqual(len(cases), 1)
        self.assertEqual(cases[0].classification, "amount_mismatch")

    def test_missing_transaction(self):
        row = {}
        l = [Transaction("ledger", "T3", Decimal("100.00"), "INR", date(2026, 9, 1), row)]
        g = []
        b = []
        
        cases = run_pipeline(l, g, b)
        self.assertEqual(len(cases), 1)
        self.assertEqual(cases[0].classification, "missing")

    def test_duplicate(self):
        row = {}
        l = [Transaction("ledger", "T4", Decimal("100.00"), "INR", date(2026, 9, 1), row)]
        g = [
            Transaction("gateway", "T4", Decimal("100.00"), "INR", date(2026, 9, 1), row),
            Transaction("gateway", "T4", Decimal("100.00"), "INR", date(2026, 9, 1), row)
        ]
        b = [
            Transaction("bank", "T4", Decimal("100.00"), "INR", date(2026, 9, 1), row),
            Transaction("bank", "T4", Decimal("100.00"), "INR", date(2026, 9, 1), row)
        ]
        
        cases = run_pipeline(l, g, b)
        self.assertEqual(len(cases), 2)
        self.assertEqual(cases[0].classification, "duplicate")
        self.assertEqual(cases[1].classification, "duplicate")

if __name__ == "__main__":
    unittest.main()
