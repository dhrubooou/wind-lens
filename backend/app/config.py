import os
from pathlib import Path
from typing import List
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseModel):
    PROJECT_NAME: str = "WindLens - UK Wind Forecast Analytics"
    API_PREFIX: str = "/api"
    ELEXON_API_BASE: str = os.getenv("ELEXON_API_BASE", "https://data.elexon.co.uk/bmrs/api/v1")
    DATABASE_PATH: str = os.getenv("DATABASE_PATH", str(BASE_DIR / "data" / "windlens.db"))
    REQUEST_TIMEOUT_SECONDS: float = float(os.getenv("REQUEST_TIMEOUT_SECONDS", "30.0"))
    MAX_RETRIES: int = int(os.getenv("MAX_RETRIES", "3"))
    RETRY_BACKOFF_FACTOR: float = float(os.getenv("RETRY_BACKOFF_FACTOR", "1.5"))
    
    # Procurement default cutoff assumptions (Day-Ahead 12:00 UK time)
    DEFAULT_CUTOFF_HOUR: int = 12
    DEFAULT_CUTOFF_MINUTE: int = 0
    
    # January 2026 delivery bounds
    JANUARY_START: str = "2026-01-01"
    JANUARY_END: str = "2026-01-31"
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "*"
    ]

settings = Settings()
