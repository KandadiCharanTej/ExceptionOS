from fastapi import APIRouter
from exceptionos.api.schemas import HealthResponse

router = APIRouter()

@router.get("/health", response_model=HealthResponse)
def health_check():
    return HealthResponse(
        status="healthy",
        service="ExceptionOS API"
    )
