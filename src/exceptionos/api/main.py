import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from exceptionos.api.routes import health, reconcile, cases, datasets, copilot, evaluation, agent
from exceptionos.database import init_db

# Initialize database
init_db()

from contextlib import asynccontextmanager

def seed_demo_dataset_if_empty():
    """Preloads the official 100-record Synthetic Demo Dataset on initial deployment boot if DB has no datasets."""
    try:
        from exceptionos.database.session import SessionLocal, get_repo_root
        from exceptionos.database.models import Dataset
        db = SessionLocal()
        try:
            if db.query(Dataset).count() == 0:
                base_dir = get_repo_root()
                demo_dir = base_dir / "data" / "demo"
                if (demo_dir / "ledger.csv").exists():
                    from exceptionos.loaders import load_csv
                    from exceptionos.pipeline.unified import run_pipeline
                    from exceptionos.api.services import investigation_service
                    
                    l = load_csv(str(demo_dir / "ledger.csv"))
                    g = load_csv(str(demo_dir / "gateway.csv"))
                    b = load_csv(str(demo_dir / "bank.csv"))
                    cases = run_pipeline(l, g, b, amount_tolerance="15.00")
                    investigation_service.create_dataset(
                        name="Synthetic Demo Dataset",
                        source_type="DEMO",
                        cases=cases
                    )
        finally:
            db.close()
    except Exception as e:
        print(f"Demo auto-seed notice: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    seed_demo_dataset_if_empty()
    yield

app = FastAPI(
    title="ExceptionOS API",
    description="REST API for the deterministic payment reconciliation engine and intelligence layer.",
    version="0.2.0",
    lifespan=lifespan
)

# Enable CORS for frontend clients (Localhost, Vercel deployments, custom domains)
cors_env = os.getenv("CORS_ORIGINS", "").strip()
custom_origins = [o.strip() for o in cors_env.split(",") if o.strip()]

default_origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:8000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:8000",
]

if "*" in custom_origins or cors_env == "*":
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    allowed_origins = list(set(default_origins + custom_origins))
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_origin_regex=r"https://.*\.vercel\.app",
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
from exceptionos.database.session import get_repo_root
dist_dir = get_repo_root() / "frontend" / "dist"
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
            "version": "0.2.0",
            "documentation": "/docs",
            "health": "/health"
        }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("exceptionos.api.main:app", host="0.0.0.0", port=port)
