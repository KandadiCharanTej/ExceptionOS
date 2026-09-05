from fastapi import APIRouter
from exceptionos.api.schemas import HealthResponse

router = APIRouter()

@router.get("/health", response_model=HealthResponse)
def health_check():
    return HealthResponse(
        status="healthy",
        service="ExceptionOS API"
    )

@router.get("/api/health/ai")
def ai_health_check():
    import os
    provider = os.getenv("AI_PROVIDER", "mock").lower()
    if provider == "mock":
        return {"status": "MOCK_MODE", "message": "Using mock AI provider"}
        
    # Check if key is configured
    if provider == "groq" and not os.getenv("GROQ_API_KEY"):
        return {"status": "UNAVAILABLE", "message": "Groq API key not configured"}
    if provider == "openai" and not os.getenv("AI_API_KEY"):
        return {"status": "UNAVAILABLE", "message": "OpenAI API key not configured"}
        
    return {"status": "AVAILABLE", "message": f"Using {provider.upper()} provider"}
