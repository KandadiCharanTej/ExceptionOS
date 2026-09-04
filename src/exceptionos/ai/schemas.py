from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class Source(BaseModel):
    type: str = Field(..., description="'dataset' or 'case'")
    id: str = Field(..., description="The ID of the dataset or case")

class CopilotResponse(BaseModel):
    answer: str
    verified_facts: List[str]
    recommendations: List[str]
    confidence: str = Field(..., description="'high', 'medium', or 'low'")
    sources: List[Source]
    disclaimer: str = "This analysis is based on deterministic system data. AI recommendations should be verified by a human analyst."

class CopilotChatRequest(BaseModel):
    message: str
    dataset_id: Optional[str] = None

class CopilotPrioritizeRequest(BaseModel):
    dataset_id: str
