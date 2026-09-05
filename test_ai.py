import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

from exceptionos.ai.copilot import CopilotOrchestrator
from exceptionos.database import session

db = next(session.get_db())
orchestrator = CopilotOrchestrator(db)

# General Chat
response1 = orchestrator.chat_dataset("What can you do?", None)
print("Response 1:", response1.answer)
print("Facts:", response1.verified_facts)
