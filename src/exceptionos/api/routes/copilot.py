from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from exceptionos.database import get_db
from exceptionos.ai.copilot import CopilotOrchestrator
from exceptionos.ai.schemas import CopilotChatRequest, CopilotPrioritizeRequest, CopilotResponse
from exceptionos.ai.guardrails import GuardrailException
from exceptionos.ai.provider import ProviderException

router = APIRouter(prefix="/api/copilot", tags=["AI Copilot"])

def get_orchestrator(db: Session = Depends(get_db)):
    return CopilotOrchestrator(db)

@router.post("/chat", response_model=CopilotResponse)
def chat_with_copilot(request: CopilotChatRequest, orchestrator: CopilotOrchestrator = Depends(get_orchestrator)):
    try:
        return orchestrator.chat_dataset(request.message, request.dataset_id)
    except GuardrailException as e:
        raise HTTPException(status_code=400, detail=f"AI Output Validation Failed: {str(e)}")
    except ProviderException as e:
        raise HTTPException(status_code=503, detail="AI provider is temporarily unavailable. Please try again later.")
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error occurred.")

@router.post("/case/{case_id}", response_model=CopilotResponse)
def explain_case(case_id: str, orchestrator: CopilotOrchestrator = Depends(get_orchestrator)):
    try:
        return orchestrator.explain_case(case_id)
    except GuardrailException as e:
        raise HTTPException(status_code=400, detail=f"AI Output Validation Failed: {str(e)}")
    except ProviderException as e:
        raise HTTPException(status_code=503, detail="AI provider is temporarily unavailable. Please try again later.")
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error occurred.")

@router.post("/prioritize", response_model=CopilotResponse)
def prioritize_cases(request: CopilotPrioritizeRequest, orchestrator: CopilotOrchestrator = Depends(get_orchestrator)):
    try:
        return orchestrator.prioritize(request.dataset_id)
    except GuardrailException as e:
        raise HTTPException(status_code=400, detail=f"AI Output Validation Failed: {str(e)}")
    except ProviderException as e:
        raise HTTPException(status_code=503, detail="AI provider is temporarily unavailable. Please try again later.")
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error occurred.")
