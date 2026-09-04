"""
Phase 11 comprehensive backend tests.
Tests: pagination, search, filters, sorting, annotations,
       case deletion, bulk deletion, CSV/JSON export, dataset deletion cascade.
"""
import unittest
import json
import csv
import io
from fastapi.testclient import TestClient
from exceptionos.api.main import app


class TestPhase11(unittest.TestCase):
    """Tests require a reconciliation run to populate data."""

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        # Run reconciliation to populate a dataset with cases
        res = cls.client.post("/api/reconcile")
        assert res.status_code == 200, f"Reconcile failed: {res.text}"
        cls.reconcile_data = res.json()
        cls.dataset_id = cls.reconcile_data["dataset_id"]

    # ─────────────────────────────────────────────────────
    # PAGINATION
    # ─────────────────────────────────────────────────────

    def test_pagination_defaults(self):
        """GET /api/cases returns paginated results with total_pages."""
        res = self.client.get(f"/api/cases?dataset_id={self.dataset_id}")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("items", data)
        self.assertIn("total", data)
        self.assertIn("page", data)
        self.assertIn("limit", data)
        self.assertIn("total_pages", data)
        self.assertEqual(data["page"], 1)
        self.assertEqual(data["limit"], 20)

    def test_pagination_custom_page_limit(self):
        """Custom page and limit parameters work."""
        res = self.client.get(f"/api/cases?dataset_id={self.dataset_id}&page=1&limit=5")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertLessEqual(len(data["items"]), 5)
        self.assertEqual(data["limit"], 5)

    def test_pagination_total_pages_calculation(self):
        """total_pages = ceil(total / limit)."""
        res = self.client.get(f"/api/cases?dataset_id={self.dataset_id}&limit=3")
        data = res.json()
        import math
        expected_pages = math.ceil(data["total"] / 3)
        self.assertEqual(data["total_pages"], expected_pages)

    def test_pagination_beyond_last_page(self):
        """Requesting a page beyond the last returns empty items."""
        res = self.client.get(f"/api/cases?dataset_id={self.dataset_id}&page=999&limit=10")
        data = res.json()
        self.assertEqual(len(data["items"]), 0)

    # ─────────────────────────────────────────────────────
    # SEARCH
    # ─────────────────────────────────────────────────────

    def test_search_by_case_id(self):
        """Search filters results by case_id substring."""
        # First get a real case_id
        res = self.client.get(f"/api/cases?dataset_id={self.dataset_id}&limit=1")
        items = res.json()["items"]
        if not items:
            self.skipTest("No cases available")
        case_id = items[0]["case_id"]
        # Search by partial key
        search_term = case_id[:5]
        res2 = self.client.get(f"/api/cases?dataset_id={self.dataset_id}&search={search_term}")
        data = res2.json()
        for item in data["items"]:
            self.assertIn(search_term.lower(), item["case_id"].lower())

    def test_search_no_results(self):
        """Search with non-matching term returns empty."""
        res = self.client.get(f"/api/cases?dataset_id={self.dataset_id}&search=ZZZZNONEXISTENT")
        data = res.json()
        self.assertEqual(len(data["items"]), 0)
        self.assertEqual(data["total"], 0)

    # ─────────────────────────────────────────────────────
    # FILTERS
    # ─────────────────────────────────────────────────────

    def test_classification_filter(self):
        """Classification filter returns only matching cases."""
        # Find a classification that exists
        res = self.client.get(f"/api/cases?dataset_id={self.dataset_id}&limit=100")
        items = res.json()["items"]
        if not items:
            self.skipTest("No cases")
        classifications = set(i["classification"] for i in items)
        target = list(classifications)[0]
        
        res2 = self.client.get(f"/api/cases?dataset_id={self.dataset_id}&classification={target}&limit=100")
        data = res2.json()
        for item in data["items"]:
            self.assertEqual(item["classification"], target)

    def test_dataset_filter(self):
        """dataset_id filter scopes to specific dataset."""
        res = self.client.get(f"/api/cases?dataset_id={self.dataset_id}")
        self.assertEqual(res.status_code, 200)
        self.assertGreater(res.json()["total"], 0)

    def test_nonexistent_dataset(self):
        """Non-existent dataset returns empty."""
        res = self.client.get("/api/cases?dataset_id=fake-dataset-id")
        data = res.json()
        self.assertEqual(data["total"], 0)

    # ─────────────────────────────────────────────────────
    # SORTING
    # ─────────────────────────────────────────────────────

    def test_sort_by_case_id_asc(self):
        """Sorting by case_id ascending."""
        res = self.client.get(f"/api/cases?dataset_id={self.dataset_id}&sort_by=case_id&sort_order=asc&limit=100")
        data = res.json()
        ids = [i["case_id"] for i in data["items"]]
        self.assertEqual(ids, sorted(ids))

    def test_sort_by_case_id_desc(self):
        """Sorting by case_id descending."""
        res = self.client.get(f"/api/cases?dataset_id={self.dataset_id}&sort_by=case_id&sort_order=desc&limit=100")
        data = res.json()
        ids = [i["case_id"] for i in data["items"]]
        self.assertEqual(ids, sorted(ids, reverse=True))

    def test_sort_by_confidence(self):
        """Sorting by confidence_score descending."""
        res = self.client.get(f"/api/cases?dataset_id={self.dataset_id}&sort_by=confidence_score&sort_order=desc&limit=100")
        data = res.json()
        scores = [i["confidence_score"] or 0 for i in data["items"]]
        self.assertEqual(scores, sorted(scores, reverse=True))

    # ─────────────────────────────────────────────────────
    # ANNOTATIONS
    # ─────────────────────────────────────────────────────

    def test_patch_annotations(self):
        """PATCH /api/cases/{case_id}/annotations updates analyst fields."""
        res = self.client.get(f"/api/cases?dataset_id={self.dataset_id}&limit=1")
        items = res.json()["items"]
        if not items:
            self.skipTest("No cases")
        case_id = items[0]["case_id"]

        patch_res = self.client.patch(
            f"/api/cases/{case_id}/annotations?dataset_id={self.dataset_id}",
            json={
                "analyst_classification": "confirmed_exception",
                "notes": "Reviewed by analyst",
                "tags": ["high-priority", "finance"]
            }
        )
        self.assertEqual(patch_res.status_code, 200)
        data = patch_res.json()
        self.assertEqual(data["analyst_classification"], "confirmed_exception")
        self.assertEqual(data["notes"], "Reviewed by analyst")
        self.assertIn("high-priority", data["tags"])

    def test_annotation_creates_audit_event(self):
        """Annotation update creates ANALYST_ANNOTATION_UPDATED event."""
        res = self.client.get(f"/api/cases?dataset_id={self.dataset_id}&limit=1")
        items = res.json()["items"]
        if not items:
            self.skipTest("No cases")
        case_id = items[0]["case_id"]

        # Patch annotations
        self.client.patch(
            f"/api/cases/{case_id}/annotations?dataset_id={self.dataset_id}",
            json={"notes": "Audit event test"}
        )
        
        # Check history
        hist = self.client.get(f"/api/cases/{case_id}/history?dataset_id={self.dataset_id}")
        events = hist.json()["events"]
        event_types = [e["event_type"] for e in events]
        self.assertIn("ANALYST_ANNOTATION_UPDATED", event_types)

    def test_annotation_not_found(self):
        """PATCH on non-existent case returns 404."""
        res = self.client.patch(
            "/api/cases/NONEXISTENT-CASE/annotations",
            json={"notes": "test"}
        )
        self.assertEqual(res.status_code, 404)

    # ─────────────────────────────────────────────────────
    # SINGLE CASE DELETION
    # ─────────────────────────────────────────────────────

    def test_delete_case(self):
        """DELETE /api/cases/{case_id} removes the case."""
        # Create a fresh dataset for deletion test
        rec = self.client.post("/api/reconcile")
        ds_id = rec.json()["dataset_id"]
        
        res = self.client.get(f"/api/cases?dataset_id={ds_id}&limit=1")
        items = res.json()["items"]
        if not items:
            self.skipTest("No cases")
        case_id = items[0]["case_id"]
        
        del_res = self.client.delete(f"/api/cases/{case_id}?dataset_id={ds_id}")
        self.assertEqual(del_res.status_code, 204)
        
        # Verify case is gone
        get_res = self.client.get(f"/api/cases/{case_id}?dataset_id={ds_id}")
        self.assertEqual(get_res.status_code, 404)

    def test_delete_nonexistent_case(self):
        """DELETE non-existent case returns 404."""
        res = self.client.delete("/api/cases/FAKE-CASE-ID")
        self.assertEqual(res.status_code, 404)

    # ─────────────────────────────────────────────────────
    # BULK DELETION
    # ─────────────────────────────────────────────────────

    def test_bulk_delete(self):
        """POST /api/cases/bulk-delete removes multiple cases."""
        rec = self.client.post("/api/reconcile")
        ds_id = rec.json()["dataset_id"]
        
        res = self.client.get(f"/api/cases?dataset_id={ds_id}&limit=3")
        items = res.json()["items"]
        if len(items) < 2:
            self.skipTest("Need at least 2 cases")
        
        ids_to_delete = [i["case_id"] for i in items[:2]]
        
        del_res = self.client.post("/api/cases/bulk-delete", json={
            "case_ids": ids_to_delete,
            "dataset_id": ds_id
        })
        self.assertEqual(del_res.status_code, 200)
        data = del_res.json()
        self.assertGreaterEqual(data["deleted_count"], 2)

    def test_bulk_delete_empty_list(self):
        """Bulk delete with empty list returns 400."""
        res = self.client.post("/api/cases/bulk-delete", json={"case_ids": []})
        self.assertEqual(res.status_code, 400)

    # ─────────────────────────────────────────────────────
    # CSV EXPORT
    # ─────────────────────────────────────────────────────

    def test_export_csv(self):
        """GET /api/cases/export?format=csv returns valid CSV."""
        res = self.client.get(f"/api/cases/export?format=csv&dataset_id={self.dataset_id}")
        self.assertEqual(res.status_code, 200)
        self.assertIn("text/csv", res.headers.get("content-type", ""))
        
        reader = csv.reader(io.StringIO(res.text))
        header = next(reader)
        self.assertIn("case_id", header)
        self.assertIn("classification", header)
        rows = list(reader)
        self.assertGreater(len(rows), 0)

    def test_export_csv_with_filter(self):
        """CSV export respects classification filter."""
        # Get a classification
        cases_res = self.client.get(f"/api/cases?dataset_id={self.dataset_id}&limit=100")
        items = cases_res.json()["items"]
        if not items:
            self.skipTest("No cases")
        target_class = items[0]["classification"]
        
        res = self.client.get(f"/api/cases/export?format=csv&dataset_id={self.dataset_id}&classification={target_class}")
        self.assertEqual(res.status_code, 200)
        reader = csv.reader(io.StringIO(res.text))
        header = next(reader)
        class_idx = header.index("classification")
        for row in reader:
            self.assertEqual(row[class_idx], target_class)

    # ─────────────────────────────────────────────────────
    # JSON EXPORT
    # ─────────────────────────────────────────────────────

    def test_export_json(self):
        """GET /api/cases/export?format=json returns valid JSON array."""
        res = self.client.get(f"/api/cases/export?format=json&dataset_id={self.dataset_id}")
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.text)
        self.assertIsInstance(data, list)
        self.assertGreater(len(data), 0)
        self.assertIn("case_id", data[0])

    # ─────────────────────────────────────────────────────
    # DATASET DELETION CASCADE
    # ─────────────────────────────────────────────────────

    def test_delete_dataset_cascade(self):
        """DELETE /api/datasets/{id} removes dataset and all cases."""
        rec = self.client.post("/api/reconcile")
        ds_id = rec.json()["dataset_id"]
        
        # Verify cases exist
        cases_res = self.client.get(f"/api/cases?dataset_id={ds_id}")
        self.assertGreater(cases_res.json()["total"], 0)
        
        # Delete dataset
        del_res = self.client.delete(f"/api/datasets/{ds_id}")
        self.assertEqual(del_res.status_code, 204)
        
        # Verify dataset gone
        get_res = self.client.get(f"/api/datasets/{ds_id}")
        self.assertEqual(get_res.status_code, 404)
        
        # Verify cases gone
        cases_res2 = self.client.get(f"/api/cases?dataset_id={ds_id}")
        self.assertEqual(cases_res2.json()["total"], 0)

    def test_delete_nonexistent_dataset(self):
        """DELETE non-existent dataset returns 404."""
        res = self.client.delete("/api/datasets/nonexistent-id")
        self.assertEqual(res.status_code, 404)


if __name__ == "__main__":
    unittest.main()
