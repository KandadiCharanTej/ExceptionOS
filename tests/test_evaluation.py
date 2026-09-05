import pytest
from exceptionos.database.session import SessionLocal
from exceptionos.pipeline.evaluation import run_evaluation
from exceptionos.ai.agent import analyze_case_with_agent
from exceptionos.intelligence.priority import calculate_priority

def test_evaluation_run():
    db = SessionLocal()
    try:
        run = run_evaluation(db, num_records=20)
        assert run is not None
        assert run.total_records == 20
        assert run.processing_time_ms > 0
        assert run.throughput > 0
        assert run.precision >= 0
        assert run.recall >= 0
        assert run.f1_score >= 0
    finally:
        db.close()
