from fastapi import APIRouter, HTTPException, Response

from exceptionos.api.services import investigation_service

router = APIRouter()

@router.delete("/api/datasets/{dataset_id}", status_code=204)
def delete_dataset(dataset_id: str):
    """Hard delete a dataset and cascade delete related records.
    Returns 204 No Content on success, 404 if dataset not found.
    """
    success = investigation_service.delete_dataset(dataset_id)
    if not success:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return Response(status_code=204)
