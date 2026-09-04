import unittest
from fastapi.testclient import TestClient
from exceptionos.api.main import app

class TestAPIUpload(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        
    def test_upload_success(self):
        # We'll use the existing train datasets as dummy uploads
        with open("data/train/ledger.csv", "rb") as l:
            with open("data/train/gateway.csv", "rb") as g:
                with open("data/train/bank.csv", "rb") as b:
                    response = self.client.post(
                        "/api/reconcile/upload",
                        files={
                            "ledger": ("ledger.csv", l, "text/csv"),
                            "gateway": ("gateway.csv", g, "text/csv"),
                            "bank": ("bank.csv", b, "text/csv"),
                        }
                    )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("total_cases", data)
        self.assertTrue(data["total_cases"] > 0)
        
    def test_upload_missing_file(self):
        with open("data/train/ledger.csv", "rb") as l:
            with open("data/train/gateway.csv", "rb") as g:
                response = self.client.post(
                    "/api/reconcile/upload",
                    files={
                        "ledger": ("ledger.csv", l, "text/csv"),
                        "gateway": ("gateway.csv", g, "text/csv"),
                        # missing bank
                    }
                )
        self.assertEqual(response.status_code, 422) # FastAPI validation error
        
    def test_upload_invalid_type(self):
        with open("data/train/ledger.csv", "rb") as l:
            with open("data/train/gateway.csv", "rb") as g:
                response = self.client.post(
                    "/api/reconcile/upload",
                    files={
                        "ledger": ("ledger.csv", l, "text/csv"),
                        "gateway": ("gateway.csv", g, "text/csv"),
                        "bank": ("bank.txt", b"hello world", "text/plain"),
                    }
                )
        self.assertEqual(response.status_code, 400)
        self.assertIn("must be a CSV", response.json()["detail"])

if __name__ == "__main__":
    unittest.main()
