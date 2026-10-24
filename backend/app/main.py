from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.config import settings
from app.db.database import init_db
from app.routers import (
    health_router,
    dashboard_router,
    forecasts_router,
    accuracy_router,
    data_status_router
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("windlens")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing WindLens SQLite database...")
    init_db()
    logger.info(f"WindLens database initialized at: {settings.DATABASE_PATH}")
    yield
    logger.info("WindLens application shutdown.")

app = FastAPI(
    title="WindLens — UK Wind Forecast Analytics API",
    description=(
        "Production-quality Day-Ahead procurement analytics platform for UK wind generation. "
        "Integrates Elexon BMRS FUELHH actuals and WINDFOR forecast streams for January 2026."
    ),
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception at {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred.", "type": type(exc).__name__}
    )

# Include Routers under API prefix
app.include_router(health_router, prefix=settings.API_PREFIX)
app.include_router(dashboard_router, prefix=settings.API_PREFIX)
app.include_router(forecasts_router, prefix=settings.API_PREFIX)
app.include_router(accuracy_router, prefix=settings.API_PREFIX)
app.include_router(data_status_router, prefix=settings.API_PREFIX)

@app.get("/")
def root():
    return {
        "app": "WindLens API",
        "status": "online",
        "docs_url": "/docs",
        "health_url": f"{settings.API_PREFIX}/health"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
