import json
from typing import List, Optional, Literal, Any
from exceptionos.ai.schemas import CopilotResponse

class GuardrailException(Exception):
    pass

def create_safe_copilot_response(
    message: str,
    recommendations: Optional[List[str]] = None,
    mode: Literal["general", "case_analysis", "dataset_analysis", "insufficient_data"] = "insufficient_data"
) -> CopilotResponse:
    return CopilotResponse(
        response_mode=mode,
        answer=message,
        verified_facts=[],
        recommendations=recommendations or [],
        confidence=0.0,
        sources=[]
    )

def normalize_ai_response(raw_response: Any) -> dict:
    if isinstance(raw_response, str):
        cleaned = raw_response.strip()

        if cleaned.startswith("```"):
            cleaned = cleaned.replace("```json", "").replace("```", "").strip()

        try:
            raw_response = json.loads(cleaned)
        except Exception:
            return {
                "response_mode": "general",
                "answer": cleaned,
                "verified_facts": [],
                "recommendations": [],
                "confidence": 0.3,
                "sources": [],
            }

    if not isinstance(raw_response, dict):
        return {
            "response_mode": "insufficient_data",
            "answer": "The AI returned an unsupported response format.",
            "verified_facts": [],
            "recommendations": ["Please try asking your question again."],
            "confidence": 0.0,
            "sources": []
        }

    if "error" in raw_response:
        error_message = str(raw_response.get("error", ""))
        return {
            "response_mode": "insufficient_data",
            "answer": error_message or "There is not enough verified information to provide a reliable answer.",
            "verified_facts": [],
            "recommendations": [
                "Try asking a general question.",
                "Or select a dataset or investigation case for evidence-based analysis."
            ],
            "confidence": 0.0,
            "sources": []
        }

    return {
        "response_mode": raw_response.get("response_mode", "insufficient_data" if "verified_facts" not in raw_response else "general"),
        "answer": str(raw_response.get("answer", "The AI could not generate a complete answer.")),
        "verified_facts": raw_response.get("verified_facts", []) or [],
        "recommendations": raw_response.get("recommendations", []) or [],
        "confidence": float(raw_response.get("confidence", 0.0)),
        "sources": raw_response.get("sources", []) or [],
    }

def validate_response(response_json: Any, expected_mode: str = "general") -> CopilotResponse:
    """
    Validates that the LLM response is valid JSON and matches the required schema.
    Also ensures no blatant hallucinated fields are present outside the schema.
    """
    data = normalize_ai_response(response_json)
    if "response_mode" not in data or data["response_mode"] not in ["general", "case_analysis", "dataset_analysis", "insufficient_data"]:
        data["response_mode"] = expected_mode
            
    try:
        response = CopilotResponse(**data)
        return response
    except Exception as e:
        raise GuardrailException(f"AI response failed schema validation: {e}")
