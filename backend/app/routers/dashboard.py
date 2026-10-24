from typing import Optional
from fastapi import APIRouter, Query, HTTPException
from app.services.forecast_service import ForecastService
from app.services.metrics_service import MetricsService
from app.schemas.dashboard import DashboardResponse
from app.config import settings

router = APIRouter(tags=["Executive Dashboard"])

@router.get("/dashboard", response_model=DashboardResponse)
def get_dashboard_data(
    start_date: str = Query("2026-01-01", description="Delivery start date YYYY-MM-DD"),
    end_date: str = Query("2026-01-07", description="Delivery end date YYYY-MM-DD"),
    cutoff_time: str = Query("12:00", description="Cutoff time HH:MM UK local time"),
    cutoff_type: str = Query("day_ahead", description="'day_ahead' (D-1) or 'same_day' (D-0)"),
    custom_cutoff: Optional[str] = Query(None, description="Explicit UTC cutoff timestamp override"),
    force_refresh: bool = Query(False, description="Force real-time re-fetch from Elexon BMRS")
):
    """
    Executive Dashboard endpoint returning:
    - Summary procurement & accuracy metrics (MAE, RMSE, bias, shortfall MWh, surplus MWh)
    - Daily summary aggregation
    - Granular interval series (actual vs decision-time forecast)
    """
    # Validation
    if start_date > end_date:
        raise HTTPException(status_code=400, detail="start_date must be less than or equal to end_date")

    if force_refresh:
        ForecastService.ensure_date_range_cached(start_date, end_date, force_refresh=True)

    intervals = ForecastService.get_forecasts_and_actuals(
        start_date=start_date,
        end_date=end_date,
        cutoff_time=cutoff_time,
        cutoff_type=cutoff_type,
        custom_cutoff=custom_cutoff
    )

    metrics_dict = MetricsService.calculate_summary_metrics(intervals)
    daily_summary = MetricsService.calculate_daily_summary(intervals)

    return DashboardResponse(
        start_date=start_date,
        end_date=end_date,
        cutoff_time=cutoff_time,
        cutoff_type=cutoff_type,
        metrics=metrics_dict,
        daily_summary=daily_summary,
        intervals=intervals
    )
