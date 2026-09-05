from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Literal

class Source(BaseModel):
    type: str = Field(..., description="'dataset' or 'case'")
    id: str = Field(..., description="The ID of the dataset or case")

class CopilotResponse(BaseModel):
    response_mode: Literal["general", "case_analysis", "dataset_analysis", "insufficient_data"] = Field(
        default="general",
        description="The mode of the response returned by the AI."
    )
    answer: str
    verified_facts: List[str]
    recommendations: List[str]
    confidence: float = Field(..., description="0.0 to 1.0 confidence score")
    sources: List[Source]
    disclaimer: str = "This analysis is based on deterministic system data. AI recommendations should be verified by a human analyst."

class CopilotChatRequest(BaseModel):
    message: str
    dataset_id: Optional[str] = None

class CopilotPrioritizeRequest(BaseModel):
    dataset_id: str
