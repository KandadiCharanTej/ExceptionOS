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

if __name__ == "__main__":
    unittest.main()
