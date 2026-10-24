from datetime import datetime, timezone
from fastapi import APIRouter
from app.db.database import get_db_connection

router = APIRouter(tags=["Health"])

@router.get("/health")
def get_health():
    """Health check endpoint validating service status and database connectivity."""
    db_ok = False
    counts = {"actuals": 0, "forecasts": 0}
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM actual_generation;")
            counts["actuals"] = cursor.fetchone()[0]
            cursor.execute("SELECT COUNT(*) FROM forecast_generation;")
            counts["forecasts"] = cursor.fetchone()[0]
            db_ok = True
    except Exception as e:
        db_ok = False

    return {
        "status": "healthy" if db_ok else "degraded",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database_connected": db_ok,
        "database_records": counts,
        "version": "1.0.0"
    }
