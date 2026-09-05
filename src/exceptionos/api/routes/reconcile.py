from fastapi import APIRouter, HTTPException, UploadFile, File
from collections import Counter
import tempfile
import os
import shutil

from exceptionos.loaders import load_csv
from exceptionos.pipeline.unified import run_pipeline
from exceptionos.api.schemas import PipelineRunResponse
from exceptionos.api.services import investigation_service

router = APIRouter()

@router.post("/api/reconcile/upload", response_model=PipelineRunResponse)
def run_upload_reconciliation(
    ledger: UploadFile = File(...),
    gateway: UploadFile = File(...),
    bank: UploadFile = File(...)
):
    temp_dir = tempfile.mkdtemp()
    
    try:
        paths = {}
        for name, file in [("ledger", ledger), ("gateway", gateway), ("bank", bank)]:
            if not file.filename.lower().endswith('.csv') and file.content_type != 'text/csv':
                raise HTTPException(status_code=400, detail=f"{name.title()} file must be a CSV.")
            
            file_path = os.path.join(temp_dir, f"{name}.csv")
            paths[name] = file_path
            
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
        
        try:
            l = load_csv(paths["ledger"])
            g = load_csv(paths["gateway"])
            b = load_csv(paths["bank"])
        except ValueError as e:
            raise HTTPException(status_code=400, detail=f"CSV Validation Error: {str(e)}")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Error parsing CSV files: {str(e)}")

        cases = run_pipeline(l, g, b, amount_tolerance="15.00")
        
        dataset_id = investigation_service.create_dataset(
            name="Upload Dataset",
            source_type="UPLOAD",
            cases=cases
        )
        
        total = len(cases)
        classifications = [c.classification for c in cases]
        counts = dict(Counter(classifications))
        
        matched = counts.pop("matched", 0)
        exceptions = total - matched
        
        return PipelineRunResponse(
            dataset_id=dataset_id,
            total_cases=total,
            matched_cases=matched,
            exceptions_found=exceptions,
            classification_counts=counts
        )
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


@router.post("/api/reconcile", response_model=PipelineRunResponse)
def run_reconciliation():
    try:
        from pathlib import Path
        base_dir = Path(__file__).resolve().parents[4]
        demo_dir = base_dir / "data" / "demo"
        train_dir = base_dir / "data" / "train"
        data_dir = demo_dir if (demo_dir / "ledger.csv").exists() else train_dir
        dataset_title = "ExceptionOS Demo Dataset" if data_dir == demo_dir else "Demo Training Dataset"
        source_type = "DEMO" if data_dir == demo_dir else "TRAINING"
        
        l = load_csv(str(data_dir / "ledger.csv"))
        g = load_csv(str(data_dir / "gateway.csv"))
        b = load_csv(str(data_dir / "bank.csv"))
        
        # Run pipeline
        cases = run_pipeline(l, g, b, amount_tolerance="15.00")
        
        # Store in database
        dataset_id = investigation_service.create_dataset(
            name=dataset_title,
            source_type=source_type,
            cases=cases
        )
        
        # Compute stats
        total = len(cases)
        classifications = [c.classification for c in cases]
        counts = dict(Counter(classifications))
        
        matched = counts.pop("matched", 0)
        exceptions = total - matched
        
        return PipelineRunResponse(
            dataset_id=dataset_id,
            total_cases=total,
            matched_cases=matched,
            exceptions_found=exceptions,
            classification_counts=counts
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
