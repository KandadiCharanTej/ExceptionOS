from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware

from exceptionos.api.routes import health, reconcile, cases
from exceptionos.database import init_db

# Initialize database
init_db()

app = FastAPI(
    title="ExceptionOS API",
    description="REST API for the deterministic payment reconciliation engine and intelligence layer.",
    version="0.2.0"
)

@app.get("/", tags=["System"])
def root_landing_page():
    return {
        "service": "ExceptionOS API",
        "status": "healthy",
        "version": "1.0.0",
        "frontend": "http://localhost:5173",
        "documentation": "/docs"
    }
# Enable CORS for potential frontend clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", 
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(health.router)
app.include_router(reconcile.router)
app.include_router(cases.router)
