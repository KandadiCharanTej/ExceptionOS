from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from exceptionos.api.routes import health, reconcile, cases

app = FastAPI(
    title="ExceptionOS API",
    description="REST API for the deterministic payment reconciliation engine and intelligence layer.",
    version="0.2.0"
)

# Enable CORS for potential frontend clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(health.router)
app.include_router(reconcile.router)
app.include_router(cases.router)
