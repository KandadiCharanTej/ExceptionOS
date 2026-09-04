import unittest
import os
import json

from exceptionos.memory.case_memory import MemoryCase, save_case_to_memory, load_memory
from exceptionos.memory.similarity import find_similar_cases

class TestMemory(unittest.TestCase):
    test_filepath = "data/memory/test_cases.json"
    
    def setUp(self):
        if os.path.exists(self.test_filepath):
            os.remove(self.test_filepath)
            
    def tearDown(self):
        if os.path.exists(self.test_filepath):
            os.remove(self.test_filepath)

    def test_save_and_load_memory(self):
        case = MemoryCase(
            case_id="TXN-TEST-1",
            classification="amount_mismatch",
            root_cause="gateway_fee",
            root_cause_status="CONFIRMED",
            confidence_score=95,
            resolution_action="record_gateway_fee",
            verification_status="VERIFIED_RESOLVED",
            amount_difference=5.00,
            date_difference=0,
            missing_sources=[],
            duplicate_flag=False,
            timestamp="2026-09-04T12:00:00"
        )
        save_case_to_memory(case, self.test_filepath)
        
        loaded = load_memory(self.test_filepath)
        self.assertEqual(len(loaded), 1)
        self.assertEqual(loaded[0].case_id, "TXN-TEST-1")

    def test_duplicate_case_id_handling(self):
        case1 = MemoryCase(
            case_id="TXN-TEST-2",
            classification="amount_mismatch",
            root_cause="gateway_fee",
            root_cause_status="CONFIRMED",
            confidence_score=95,
            resolution_action="record_gateway_fee",
            verification_status="VERIFIED_RESOLVED",
            amount_difference=5.00,
            date_difference=0,
            missing_sources=[],
            duplicate_flag=False,
            timestamp="2026-09-04T12:00:00"
        )
        save_case_to_memory(case1, self.test_filepath)
        
        # Save a modified version with the same ID
        case2 = MemoryCase(
            case_id="TXN-TEST-2",
            classification="amount_mismatch",
            root_cause="gateway_fee",
            root_cause_status="CONFIRMED",
            confidence_score=95,
            resolution_action="record_gateway_fee",
            verification_status="STILL_OPEN", # Changed
            amount_difference=5.00,
            date_difference=0,
            missing_sources=[],
            duplicate_flag=False,
            timestamp="2026-09-04T12:01:00"
        )
        save_case_to_memory(case2, self.test_filepath)
        
        loaded = load_memory(self.test_filepath)
        self.assertEqual(len(loaded), 1)
        self.assertEqual(loaded[0].verification_status, "STILL_OPEN")

    def test_similarity_ranking(self):
        c1 = MemoryCase(
            case_id="TXN-1",
            classification="amount_mismatch",
            root_cause="gateway_fee",
            root_cause_status="CONFIRMED",
            confidence_score=95,
            resolution_action="act",
            verification_status="VERIFIED_RESOLVED",
            amount_difference=500.0,
            date_difference=0,
            missing_sources=[],
            duplicate_flag=False,
            timestamp=""
        )
        c2 = MemoryCase(
            case_id="TXN-2",
            classification="missing",
            root_cause="missing_ledger",
            root_cause_status="CONFIRMED",
            confidence_score=95,
            resolution_action="act",
            verification_status="VERIFIED_RESOLVED",
            amount_difference=None,
            date_difference=None,
            missing_sources=["ledger"],
            duplicate_flag=False,
            timestamp=""
        )
        
        current = {
            "classification": "amount_mismatch",
            "amount_difference": 510.0, # Within 5% of 500
            "missing_sources": []
        }
        
        results = find_similar_cases(current, [c1, c2])
        self.assertEqual(len(results), 1) # c2 should be below threshold 50 (only gets 0)
        self.assertEqual(results[0].remembered_case.case_id, "TXN-1")
        self.assertEqual(results[0].similarity_score, 55) # 40 (class) + 15 (amount within 5%)

if __name__ == "__main__":
    unittest.main()
