"""
ExceptionOS Production Entrypoint for Render and Local Environments.
"""
import os
import sys
from pathlib import Path

# Add 'src' directory to Python path so 'exceptionos' package resolves reliably
src_path = Path(__file__).resolve().parent / "src"
if str(src_path) not in sys.path:
    sys.path.insert(0, str(src_path))

from exceptionos.api.main import app

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=False)
