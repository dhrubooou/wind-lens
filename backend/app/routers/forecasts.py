from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Query, HTTPException
from datetime import datetime, timedelta
from app.services.forecast_service import ForecastService
from app.schemas.forecast import ForecastEvolutionResponse, DecisionTimeForecastResponse
from app.db.database import get_db_connection

router = APIRouter(tags=["Forecasts"])

@router.get("/forecast-at-cutoff", response_model=DecisionTimeForecastResponse)
def get_forecast_at_cutoff(
    delivery_date: str = Query("2026-01-01", description="Delivery date YYYY-MM-DD"),
    settlement_period: int = Query(24, ge=1, le=50, description="UK Settlement Period (1-48, or 50 on clock change)"),
    cutoff_time: str = Query("12:00", description="Cutoff time HH:MM UK local time"),
    cutoff_type: str = Query("day_ahead", description="'day_ahead' (D-1) or 'same_day' (D-0)"),
    custom_cutoff: Optional[str] = Query(None, description="Explicit UTC cutoff timestamp override")
):
    """
    Decision-Time Forecast Explorer endpoint:
    Returns the latest eligible forecast published before the configured decision cutoff
    for the selected half-hourly delivery interval, along with actual generation and error.
    """
    # Auto-fetch if delivery date not yet cached
    ForecastService.ensure_date_range_cached(delivery_date, delivery_date)

    # 1. Look up actual generation record for this interval
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT start_time, settlement_date, settlement_period, generation_mw, publish_time
            FROM actual_generation
            WHERE settlement_date = ? AND settlement_period = ?;
        """, (delivery_date, settlement_period))
        actual_row = cursor.fetchone()

    if not actual_row:
        # Fallback to calculate nominal start time if record missing
        # Settlement period 1 starts at 00:00:00, 2 at 00:30:00, etc.
        minutes_offset = (settlement_period - 1) * 30
        nominal_dt = datetime.fromisoformat(f"{delivery_date}T00:00:00") + timedelta(minutes=minutes_offset)
        target_start_time = nominal_dt.strftime("%Y-%m-%dT%H:%M:%SZ")
        actual_mw = None
    else:
        target_start_time = actual_row["start_time"]
        actual_mw = actual_row["generation_mw"]

    # 2. Determine cutoff timestamp
    if custom_cutoff:
        applied_cutoff_utc = ForecastService.parse_cutoff_to_utc(delivery_date, cutoff_datetime_str=custom_cutoff)
    else:
        applied_cutoff_utc = ForecastService.parse_cutoff_to_utc(delivery_date, cutoff_time_str=cutoff_time, cutoff_type=cutoff_type)

    # 3. Find latest forecast published on or before cutoff
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT publish_time, generation_mw
            FROM forecast_generation
            WHERE start_time = ? AND publish_time <= ?
            ORDER BY publish_time DESC
            LIMIT 1;
        """, (target_start_time, applied_cutoff_utc))
        fc_row = cursor.fetchone()

    if fc_row:
        fc_mw = fc_row["generation_mw"]
        fc_pub = fc_row["publish_time"]
        dt_interval = datetime.fromisoformat(target_start_time.replace("Z", "+00:00"))
        dt_pub = datetime.fromisoformat(fc_pub.replace("Z", "+00:00"))
        lead_hours = round((dt_interval - dt_pub).total_seconds() / 3600.0, 2)
        
        error_mw = round(fc_mw - actual_mw, 2) if actual_mw is not None else None
        shortfall_mw = max(round(actual_mw - fc_mw, 2), 0.0) if actual_mw is not None else None
        surplus_mw = max(round(fc_mw - actual_mw, 2), 0.0) if actual_mw is not None else None
        found = True
        explanation = (
            f"Eligible forecast of {fc_mw:.1f} MW published at {fc_pub} "
            f"({lead_hours:.1f}h prior to delivery). Respects decision cutoff of {applied_cutoff_utc}."
        )
    else:
        fc_mw = None
        fc_pub = None
        lead_hours = None
        error_mw = None
        shortfall_mw = None
        surplus_mw = None
        found = False
        explanation = (
            f"No forecast vintage found for interval {target_start_time} published before cutoff {applied_cutoff_utc}. "
            "Note: Elexon WINDFOR forecasts are published at hourly intervals."
        )

    return DecisionTimeForecastResponse(
        delivery_date=delivery_date,
        settlement_period=settlement_period,
        start_time=target_start_time,
        cutoff_time=cutoff_time,
        cutoff_type=cutoff_type,
        applied_cutoff_utc=applied_cutoff_utc,
        latest_eligible_forecast_mw=fc_mw,
        forecast_publish_time=fc_pub,
        lead_time_hours=lead_hours,
        actual_generation_mw=actual_mw,
        error_mw=error_mw,
        shortfall_mw=shortfall_mw,
        surplus_mw=surplus_mw,
        is_eligible_forecast_found=found,
        explanation=explanation
    )

@router.get("/forecast-evolution", response_model=ForecastEvolutionResponse)
def get_forecast_evolution(
    start_time: str = Query("2026-01-01T12:00:00Z", description="Target delivery interval UTC timestamp (e.g. 2026-01-01T12:00:00Z)")
):
    """
    Forecast Evolution endpoint:
    Returns all historical forecast vintages published for a specific delivery interval,
    ordered chronologically to show how forecasts converged as delivery time approached.
    """
    clean_start_time = ForecastService.parse_cutoff_to_utc("2026-01-01", cutoff_datetime_str=start_time)
    data = ForecastService.get_forecast_evolution(clean_start_time)
    return ForecastEvolutionResponse(**data)

@router.get("/actuals")
def get_actuals(
    start_date: str = Query("2026-01-01"),
    end_date: str = Query("2026-01-07")
) -> List[Dict[str, Any]]:
    """Raw actual wind generation records from FUELHH for date range."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT start_time, settlement_date, settlement_period, generation_mw, publish_time
            FROM actual_generation
            WHERE settlement_date >= ? AND settlement_date <= ?
            ORDER BY start_time ASC;
        """, (start_date, end_date))
        return [dict(r) for r in cursor.fetchall()]

@router.get("/forecasts")
def get_forecasts(
    start_date: str = Query("2026-01-01"),
    end_date: str = Query("2026-01-07")
) -> List[Dict[str, Any]]:
    """Raw forecast records from WINDFOR for delivery dates in range."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT publish_time, start_time, generation_mw
            FROM forecast_generation
            WHERE start_time >= ? AND start_time <= ?
            ORDER BY start_time ASC, publish_time ASC;
        """, (f"{start_date}T00:00:00Z", f"{end_date}T23:59:59Z"))
        return [dict(r) for r in cursor.fetchall()]
