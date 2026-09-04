import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import date
from exceptionos.database.models import Base
from exceptionos.api.services import InvestigationService
from exceptionos.models import Transaction
from exceptionos.pipeline.unified import UnifiedCase
import json
import exceptionos.database.session

@pytest.fixture(scope="function")
def db_service(monkeypatch):
    # Setup isolated test DB
    test_engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    
    # Patch the real session to use the test session
    monkeypatch.setattr("exceptionos.api.services.SessionLocal", TestingSessionLocal)
    
    # We create a new InvestigationService specifically for the test
    service = InvestigationService()
    
    yield service
    
    # Teardown
    Base.metadata.drop_all(bind=test_engine)

def test_database_persistence(db_service):
    # 1. Create a dummy case
    txn1 = Transaction(source="ledger", key="L1", amount="100.00", currency="USD", date=date(2023,1,1), row={})
    txn2 = Transaction(source="gateway", key="G1", amount="100.00", currency="USD", date=date(2023,1,1), row={})
    
    case = UnifiedCase(
        key="test_case_1",
        ledger_txn=txn1,
        gateway_txn=txn2,
        bank_txn=None
    )
    
    # 2. Persist to Dataset
    dataset_id = db_service.create_dataset(
        name="Test Dataset",
        source_type="TEST",
        cases=[case]
    )
    assert dataset_id is not None
    
    # 3. Retrieve Datasets
    datasets = db_service.get_datasets()
    assert len(datasets) == 1
    assert datasets[0].name == "Test Dataset"
    
    # 4. Retrieve Cases
    cases = db_service.get_cases_for_dataset(dataset_id)
    assert len(cases) == 1
    assert cases[0].key == "test_case_1"
    assert cases[0].classification == "missing"
    assert cases[0].ledger_txn.amount == 100.00
    
    # 5. Events check
    events = db_service.get_case_events(cases[0].key, dataset_id=dataset_id)
    assert len(events) == 1
    assert events[0]["event_type"] == "CASE_CREATED"
