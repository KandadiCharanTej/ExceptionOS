import os
import json
from abc import ABC, abstractmethod
from typing import Optional

class AIProvider(ABC):
    @abstractmethod
    def generate(self, system_prompt: str, user_prompt: str) -> str:
        pass

class MockAIProvider(AIProvider):
    def generate(self, system_prompt: str, user_prompt: str) -> str:
        # Returns a valid JSON string matching CopilotResponse schema for tests/fallbacks
        mock_response = {
            "answer": "This is a mock AI response because no real AI provider was configured or available. The dataset contains several exceptions.",
            "verified_facts": [
                "The dataset has a specific number of missing and duplicate transactions."
            ],
            "recommendations": [
                "Configure a real AI provider using environment variables.",
                "Investigate the unresolved cases manually."
            ],
            "confidence": "high",
            "sources": [{"type": "dataset", "id": "mock-dataset"}],
            "disclaimer": "This analysis is based on deterministic system data. AI recommendations should be verified by a human analyst."
        }
        return json.dumps(mock_response)

class OpenAIAIProvider(AIProvider):
    def __init__(self, api_key: str, model: str = "gpt-4-turbo-preview"):
        self.api_key = api_key
        self.model = model
        try:
            import openai
            self.client = openai.OpenAI(api_key=api_key)
        except ImportError:
            raise ImportError("Please install openai package: pip install openai")
            
    def generate(self, system_prompt: str, user_prompt: str) -> str:
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            response_format={"type": "json_object"}
        )
        return response.choices[0].message.content

class GroqAIProvider(AIProvider):
    def __init__(self, api_key: str, model: str = "llama3-70b-8192"):
        self.api_key = api_key
        self.model = model
        try:
            import openai
            # Groq provides an OpenAI compatible API
            self.client = openai.OpenAI(
                api_key=api_key,
                base_url="https://api.groq.com/openai/v1"
            )
        except ImportError:
            raise ImportError("Please install openai package: pip install openai")
            
    def generate(self, system_prompt: str, user_prompt: str) -> str:
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                response_format={"type": "json_object"}
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"Groq API Error: {e}")
            raise

def get_ai_provider() -> AIProvider:
    import dotenv
    dotenv.load_dotenv()
    
    provider_name = os.getenv("AI_PROVIDER", "mock").lower()
    
    if provider_name == "groq":
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            print("WARNING: GROQ_API_KEY not set. Falling back to MockAIProvider.")
            return MockAIProvider()
        model = os.getenv("GROQ_MODEL", "llama3-70b-8192")
        return GroqAIProvider(api_key=api_key, model=model)
        
    if provider_name == "openai":
        api_key = os.getenv("AI_API_KEY")
        if not api_key:
            print("WARNING: AI_API_KEY not set. Falling back to MockAIProvider.")
            return MockAIProvider()
        return OpenAIAIProvider(api_key=api_key)
    
    return MockAIProvider()

