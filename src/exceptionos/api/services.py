from typing import List, Dict, Optional
from exceptionos.pipeline.unified import UnifiedCase
from exceptionos.resolution.resolution import ResolutionAction

class InvestigationService:
    def __init__(self):
        self.latest_cases: List[UnifiedCase] = []
        self.resolution_actions: Dict[str, ResolutionAction] = {}
        
    def set_cases(self, cases: List[UnifiedCase]):
        self.latest_cases = cases
        
    def get_all_cases(self) -> List[UnifiedCase]:
        return self.latest_cases
        
    def get_case(self, case_id: str) -> Optional[UnifiedCase]:
        for c in self.latest_cases:
            if c.key == case_id:
                return c
        return None
        
    def record_action(self, action: ResolutionAction):
        self.resolution_actions[action.case_id] = action
        
    def get_action(self, case_id: str) -> Optional[ResolutionAction]:
        return self.resolution_actions.get(case_id)

# Singleton instance for the in-memory prototype
investigation_service = InvestigationService()
