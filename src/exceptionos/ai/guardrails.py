from exceptionos.ai.schemas import CopilotResponse
import json

class GuardrailException(Exception):
    pass

def validate_response(response_json: str) -> CopilotResponse:
    """
    Validates that the LLM response is valid JSON and matches the required schema.
    Also ensures no blatant hallucinated fields are present outside the schema.
    """
    try:
        data = json.loads(response_json)
    except json.JSONDecodeError:
        # Sometimes LLMs wrap JSON in markdown blocks
        if "```json" in response_json:
            clean_json = response_json.split("```json")[1].split("```")[0].strip()
            try:
                data = json.loads(clean_json)
            except json.JSONDecodeError:
                raise GuardrailException("AI response was not valid JSON.")
        else:
            raise GuardrailException("AI response was not valid JSON.")
            
    # Pydantic will validate the schema
    try:
        response = CopilotResponse(**data)
        return response
    except Exception as e:
        raise GuardrailException(f"AI response failed schema validation: {e}")
