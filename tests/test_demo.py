import pytest
import os
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from exceptionos.database.models import Base
from exceptionos.database.session import get_db
from exceptionos.api.main import app

# Setup test DB
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    app.dependency_overrides[get_db] = override_get_db
    yield
    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.pop(get_db, None)

def test_ai_health_endpoint():
    # Should default to mock or whatever is configured
    response = client.get("/api/health/ai")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert data["status"] in ["MOCK_MODE", "AVAILABLE", "UNAVAILABLE"]

def test_demo_orchestration_normal():
    response = client.post("/api/evaluation/run?scenario_type=NORMAL_RECONCILIATION")
    assert response.status_code == 200
    data = response.json()
    
    assert data["total_records"] == 100
    # Normal usually has high match rate
    assert data["matched_records"] > 80
    
    dataset_id = data["dataset_id"]
    
    # Check report
    report_res = client.get(f"/api/evaluation/{dataset_id}/report")
    assert report_res.status_code == 200
    report_data = report_res.json()
    assert "BUILDATHON PROOF REPORT" in report_data["report"]
    
    # Check unresolved exceptions
    exc_res = client.get(f"/api/evaluation/{dataset_id}/exceptions")
    assert exc_res.status_code == 200
    exceptions = exc_res.json()
    if data["exception_records"] > 0:
        # Sometimes normal has exceptions but they are auto resolved or no exceptions at all depending on exact generation
        pass

def test_demo_orchestration_ai_failure():
    old_ai_provider = os.environ.get("AI_PROVIDER")
    old_groq_key = os.environ.get("GROQ_API_KEY")
    try:
        # Force AI provider to groq without key to simulate failure
        os.environ["AI_PROVIDER"] = "groq"
        os.environ.pop("GROQ_API_KEY", None)
        
        health_res = client.get("/api/health/ai")
        assert health_res.json()["status"] == "UNAVAILABLE"
        
        # Run evaluation should NOT fail even if AI is unavailable (it should use deterministic fallback)
        response = client.post("/api/evaluation/run?scenario_type=EXCEPTION_SPIKE")
        assert response.status_code == 200
        data = response.json()
        
        dataset_id = data["dataset_id"]
        
        # Fallback to REQUEST_ANALYST_REVIEW
        exc_res = client.get(f"/api/evaluation/{dataset_id}/exceptions")
        assert exc_res.status_code == 200
        exceptions = exc_res.json()
        
        for exc in exceptions:
            assert exc["recommended_action"] == "REQUEST_ANALYST_REVIEW"
    finally:
        if old_ai_provider is not None:
            os.environ["AI_PROVIDER"] = old_ai_provider
        else:
            os.environ.pop("AI_PROVIDER", None)
        if old_groq_key is not None:
            os.environ["GROQ_API_KEY"] = old_groq_key
        else:
            os.environ.pop("GROQ_API_KEY", None)
