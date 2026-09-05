from sqlalchemy.orm import Session
from exceptionos.ai.schemas import CopilotResponse
from exceptionos.ai.prompts import SYSTEM_PROMPT, DATASET_ANALYSIS_PROMPT, CASE_EXPLANATION_PROMPT, PRIORITIZATION_PROMPT
from exceptionos.ai.context_builder import build_dataset_context, build_case_context, build_priority_context
from exceptionos.ai.provider import get_ai_provider
from exceptionos.ai.guardrails import validate_response, create_safe_copilot_response
from exceptionos.database.models import AIInteraction, CaseRecord

class CopilotOrchestrator:
    def __init__(self, db: Session):
        self.db = db
        self.provider = get_ai_provider()

    def _log_interaction(self, dataset_id: str, case_id: str, user_message: str, context: str, response: CopilotResponse):
        interaction = AIInteraction(
            dataset_id=dataset_id,
            case_id=case_id,
            user_message=user_message,
            context_summary=context[:1000],
            ai_response=response.model_dump(),
            provider=self.provider.__class__.__name__,
            model_name=getattr(self.provider, 'model', 'mock-model')
        )
        self.db.add(interaction)
        self.db.commit()

    def chat_dataset(self, message: str, dataset_id: str = None) -> CopilotResponse:
        if not dataset_id:
            # General Chat Mode
            prompt = f"Answer the user's general question: {message}"
            raw_response = self.provider.generate(SYSTEM_PROMPT, prompt)
            validated = validate_response(raw_response, expected_mode="general")
            self._log_interaction(None, None, message, "General Mode", validated)
            return validated
            
        context = build_dataset_context(self.db, dataset_id)
        if not context:
            validated = create_safe_copilot_response(
                "There is insufficient verified data to answer this reliably.",
                [
                    "Upload reconciliation data.",
                    "Select a case for investigation."
                ],
                "insufficient_data"
            )
            self._log_interaction(dataset_id, None, message, "Insufficient Data", validated)
            return validated
            
        prompt = DATASET_ANALYSIS_PROMPT.format(question=message, context=context)
        
        raw_response = self.provider.generate(SYSTEM_PROMPT, prompt)
        validated = validate_response(raw_response, expected_mode="dataset_analysis")
        
        self._log_interaction(dataset_id, None, message, context, validated)
        return validated

    def explain_case(self, case_id: str) -> CopilotResponse:
        case = self.db.query(CaseRecord).filter(CaseRecord.id == case_id).first()
        dataset_id = case.dataset_id if case else None
        
        context = build_case_context(self.db, case_id)
        if not context:
            validated = create_safe_copilot_response(
                "There is insufficient verified data to answer this reliably.",
                [
                    "Upload reconciliation data.",
                    "Select a case for investigation."
                ],
                "insufficient_data"
            )
            self._log_interaction(dataset_id, case_id, "Explain this case", "Insufficient Data", validated)
            return validated
            
        prompt = CASE_EXPLANATION_PROMPT.format(context=context)
        
        raw_response = self.provider.generate(SYSTEM_PROMPT, prompt)
        validated = validate_response(raw_response, expected_mode="case_analysis")
        
        self._log_interaction(dataset_id, case_id, "Explain this case", context, validated)
        return validated

    def prioritize(self, dataset_id: str) -> CopilotResponse:
        cases = self.db.query(CaseRecord).filter(CaseRecord.dataset_id == dataset_id).all()
        
        scored_cases = []
        for case in cases:
            score = 0
            if not case.resolutions or case.resolutions[-1].status != "RESOLVED":
                score += 50
            if case.classification in ["missing", "amount_mismatch"]:
                score += 30
            if case.is_duplicate:
                score += 20
            scored_cases.append((score, case))
            
        scored_cases.sort(key=lambda x: x[0], reverse=True)
        top_cases = [c for _, c in scored_cases[:5]]
        
        context = build_priority_context(self.db, dataset_id, top_cases)
        prompt = PRIORITIZATION_PROMPT.format(context=context)
        
        raw_response = self.provider.generate(SYSTEM_PROMPT, prompt)
        validated = validate_response(raw_response, expected_mode="dataset_analysis")
        
        self._log_interaction(dataset_id, None, "Prioritize cases", context, validated)
        return validated
