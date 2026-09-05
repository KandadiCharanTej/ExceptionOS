from pathlib import Path
from fastapi import FastAPI
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from exceptionos.api.routes import health, reconcile, cases, datasets, copilot, evaluation, agent
from exceptionos.database import init_db

# Initialize database
init_db()

app = FastAPI(
    title="ExceptionOS API",
    description="REST API for the deterministic payment reconciliation engine and intelligence layer.",
    version="0.2.0"
)

# Enable CORS for frontend clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(health.router)
app.include_router(reconcile.router)
app.include_router(cases.router)
app.include_router(datasets.router)
app.include_router(copilot.router)
app.include_router(evaluation.router)
app.include_router(agent.router)

# Mount frontend/dist if built, enabling full app access directly on port 8000
dist_dir = Path(__file__).resolve().parent.parent.parent.parent / "frontend" / "dist"
if dist_dir.exists() and (dist_dir / "index.html").exists():
    assets_dir = dist_dir / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa_app(full_path: str):
        target = dist_dir / full_path
        if full_path and target.exists() and target.is_file():
            return FileResponse(target)
        return FileResponse(dist_dir / "index.html")
else:
    @app.get("/", tags=["System"])
    def root_landing_page():
        return {
            "service": "ExceptionOS API",
            "status": "healthy",
            "version": "1.0.0",
            "frontend": "http://localhost:5173",
            "documentation": "/docs"
        }
