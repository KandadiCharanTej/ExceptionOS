import unittest
from fastapi.testclient import TestClient
from exceptionos.api.main import app

class TestAPI(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        
    def test_health(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "healthy")
        
    def test_reconcile_and_cases(self):
        # Run reconciliation
        res = self.client.post("/api/reconcile")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["total_cases"] > 0)
        
        # Get cases
        res_cases = self.client.get("/api/cases?limit=10")
        self.assertEqual(res_cases.status_code, 200)
        cases_data = res_cases.json()
        self.assertTrue(len(cases_data["items"]) > 0)
        
        # Investigate the first case
        first_case_id = cases_data["items"][0]["case_id"]
        res_inv = self.client.get(f"/api/cases/{first_case_id}")
        self.assertEqual(res_inv.status_code, 200)
        inv_data = res_inv.json()
        self.assertEqual(inv_data["case_id"], first_case_id)
        self.assertIn("root_cause", inv_data)
        
        # Resolve case
        resolve_payload = {
            "action_taken": "Test resolution",
            "approved_by": "test_admin"
        }
        res_resolve = self.client.post(f"/api/cases/{first_case_id}/resolve", json=resolve_payload)
        self.assertEqual(res_resolve.status_code, 200)
        self.assertEqual(res_resolve.json()["action_taken"], "Test resolution")
        
        # Verify case (will likely be STILL_OPEN because we didn't mock the DB update, but endpoint works)
        res_verify = self.client.post(f"/api/cases/{first_case_id}/verify")
        self.assertEqual(res_verify.status_code, 200)
        self.assertIn("status", res_verify.json())

    def test_case_not_found(self):
        res = self.client.get("/api/cases/INVALID-ID-XYZ")
        self.assertEqual(res.status_code, 404)

    def test_demo_dataset_100_records_reconciliation(self):
        res = self.client.post("/api/reconcile")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["total_cases"], 100)
        self.assertEqual(data["matched_cases"], 85)
        self.assertEqual(data["exceptions_found"], 15)
        self.assertEqual(data["classification_counts"]["amount_mismatch"], 5)
        self.assertEqual(data["classification_counts"]["date_mismatch"], 3)
        self.assertEqual(data["classification_counts"]["timing_issue"], 3)
        self.assertEqual(data["classification_counts"]["missing"], 2)
        self.assertEqual(data["classification_counts"]["duplicate"], 2)

        ds_id = data["dataset_id"]

        # Actionable exceptions only in queue
        res_ex = self.client.get(f"/api/cases?dataset_id={ds_id}&classification=exceptions")
        self.assertEqual(res_ex.status_code, 200)
        data_ex = res_ex.json()
        self.assertEqual(data_ex["total"], 15)
        for item in data_ex["items"]:
            self.assertNotEqual(item["classification"], "matched")

        # Evaluation metrics
        res_eval = self.client.get(f"/api/evaluation/{ds_id}")
        self.assertEqual(res_eval.status_code, 200)
        eval_data = res_eval.json()
        self.assertEqual(eval_data["total_records"], 100)
        self.assertEqual(eval_data["matched_records"], 85)
        self.assertEqual(eval_data["exception_records"], 15)
        self.assertEqual(eval_data["precision"], 100.0)
        self.assertEqual(eval_data["recall"], 100.0)
        self.assertEqual(eval_data["accuracy"], 100.0)
        self.assertEqual(eval_data["f1_score"], 100.0)

if __name__ == "__main__":
    unittest.main()
