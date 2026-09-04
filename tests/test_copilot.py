import pytest
from fastapi.testclient import TestClient
from exceptionos.api.main import app
from exceptionos.database import get_db, init_db
from exceptionos.database.models import Dataset, CaseRecord, AIInteraction
from unittest.mock import patch
import os

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_db():
    init_db()
    
@pytest.fixture
def test_dataset():
    db = next(get_db())
    dataset = Dataset(id="test-dataset-ai", name="Test AI Dataset", source_type="TEST")
    db.add(dataset)
    db.commit()
    
    case = CaseRecord(
        id="case-1",
        dataset_id=dataset.id,
        key="test-key",
        classification="amount_mismatch"
    )
    db.add(case)
    db.commit()
    
    yield dataset
    
    # Cleanup
    db.query(AIInteraction).delete()
    db.query(CaseRecord).filter(CaseRecord.dataset_id == dataset.id).delete()
    db.query(Dataset).filter(Dataset.id == dataset.id).delete()
    db.commit()
    db.close()

def test_copilot_chat(test_dataset):
    # Ensure it uses MockAIProvider
    os.environ["AI_PROVIDER"] = "mock"
    
    response = client.post("/api/copilot/chat", json={
        "message": "What is wrong here?",
        "dataset_id": test_dataset.id
    })
    
    assert response.status_code == 200
    data = response.json()
    assert "answer" in data
    assert "verified_facts" in data
    assert data["confidence"] == "high"
    
    # Verify interaction was logged
    db = next(get_db())
    interactions = db.query(AIInteraction).filter(AIInteraction.dataset_id == test_dataset.id).all()
    assert len(interactions) == 1
    assert interactions[0].user_message == "What is wrong here?"

def test_explain_case(test_dataset):
    os.environ["AI_PROVIDER"] = "mock"
    
    response = client.post("/api/copilot/case/case-1")
    assert response.status_code == 200
    data = response.json()
    assert "answer" in data

def test_prioritize(test_dataset):
    os.environ["AI_PROVIDER"] = "mock"
    
    response = client.post("/api/copilot/prioritize", json={
        "dataset_id": test_dataset.id
    })
    assert response.status_code == 200
    data = response.json()
    assert "answer" in data
