from typing import Optional
from fastapi import APIRouter, Query, BackgroundTasks
from app.services.ingestion import IngestionService
from app.schemas.data_status import DataStatusResponse

router = APIRouter(tags=["Data Quality & Status"])

@router.get("/data-status", response_model=DataStatusResponse)
def get_data_status():
    """
    Data Quality & Status panel endpoint:
    Returns dataset sources, observation counts, date boundaries, sync logs, and cache mode.
    """
    service = IngestionService()
    status_data = service.get_data_status()
    return DataStatusResponse(**status_data)

@router.post("/data/sync")
def trigger_data_sync(
    background_tasks: BackgroundTasks,
    start_date: str = Query("2026-01-01", description="Actuals start date YYYY-MM-DD"),
    end_date: str = Query("2026-01-31", description="Actuals end date YYYY-MM-DD"),
    publish_start_date: str = Query("2025-12-30", description="Forecast publish start date YYYY-MM-DD"),
    publish_end_date: str = Query("2026-01-31", description="Forecast publish end date YYYY-MM-DD"),
    sync_now: bool = Query(False, description="Run synchronously if True, else in background")
):
    """
    Trigger sync from Elexon BMRS API for FUELHH (actuals) and WINDFOR (forecasts).
    """
    service = IngestionService()

    def do_sync():
        service.ingest_actuals(start_date, end_date)
        service.ingest_forecasts(publish_start_date, publish_end_date)

    if sync_now:
        do_sync()
        return {"status": "completed", "message": f"Synchronized data from Elexon for {start_date} to {end_date}."}
    else:
        background_tasks.add_task(do_sync)
        return {"status": "queued", "message": f"Sync job initiated in background for {start_date} to {end_date}."}
