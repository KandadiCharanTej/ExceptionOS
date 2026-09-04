from fastapi import APIRouter, HTTPException
from collections import Counter

from exceptionos.loaders import load_csv
from exceptionos.pipeline.unified import run_pipeline
from exceptionos.api.schemas import PipelineRunResponse
from exceptionos.api.services import investigation_service

router = APIRouter()

@router.post("/api/reconcile", response_model=PipelineRunResponse)
def run_reconciliation():
    try:
        # For prototype, load the train dataset
        from pathlib import Path
        base_dir = Path(__file__).resolve().parents[4]
        l = load_csv(str(base_dir / "data" / "train" / "ledger.csv"))
        g = load_csv(str(base_dir / "data" / "train" / "gateway.csv"))
        b = load_csv(str(base_dir / "data" / "train" / "bank.csv"))
        
        # Run pipeline
        cases = run_pipeline(l, g, b, amount_tolerance="15.00")
        
        # Store in service
        investigation_service.set_cases(cases)
        
        # Compute stats
        total = len(cases)
        classifications = [c.classification for c in cases]
        counts = dict(Counter(classifications))
        
        matched = counts.pop("matched", 0)
        exceptions = total - matched
        
        return PipelineRunResponse(
            total_cases=total,
            matched_cases=matched,
            exceptions_found=exceptions,
            classification_counts=counts
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
