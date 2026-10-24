from typing import Optional
from fastapi import APIRouter, Query, HTTPException
from app.services.forecast_service import ForecastService
from app.services.metrics_service import MetricsService
from app.schemas.accuracy import AccuracyResponse

router = APIRouter(tags=["Accuracy Analysis"])

@router.get("/accuracy", response_model=AccuracyResponse)
def get_accuracy_analysis(
    start_date: str = Query("2026-01-01", description="Delivery start date YYYY-MM-DD"),
    end_date: str = Query("2026-01-07", description="Delivery end date YYYY-MM-DD"),
    cutoff_time: str = Query("12:00", description="Cutoff time HH:MM UK local time"),
    cutoff_type: str = Query("day_ahead", description="'day_ahead' or 'same_day'"),
    custom_cutoff: Optional[str] = Query(None, description="Explicit UTC cutoff timestamp override"),
    bin_width: int = Query(500, ge=100, le=2000, description="MW bin width for error histogram")
):
    """
    Accuracy Analysis endpoint:
    - MAE (MW), RMSE (MW), Mean Forecast Error (bias)
    - Forecast coverage percentage
    - Error distribution histogram
    - Overestimation vs underestimation counts
    - Detailed half-hourly error table
    """
    if start_date > end_date:
        raise HTTPException(status_code=400, detail="start_date must be less than or equal to end_date")

    intervals = ForecastService.get_forecasts_and_actuals(
        start_date=start_date,
        end_date=end_date,
        cutoff_time=cutoff_time,
        cutoff_type=cutoff_type,
        custom_cutoff=custom_cutoff
    )

    metrics_dict = MetricsService.calculate_summary_metrics(intervals)
    daily_summary = MetricsService.calculate_daily_summary(intervals)
    distribution = MetricsService.calculate_error_distribution(intervals, bin_width_mw=bin_width)

    notes = [
        "Error definition: error_mw = forecast_generation_mw - actual_generation_mw.",
        "Positive error signifies forecast overestimation; negative error signifies underestimation.",
        "Mean Absolute Percentage Error (MAPE) is excluded as a primary metric per specification, as it becomes misleading or undefined during intervals with near-zero wind generation.",
        "Unmatched intervals (e.g. half-hourly intervals where WINDFOR hourly forecast records are absent) are strictly excluded from error calculations and reported via the coverage metric."
    ]

    return AccuracyResponse(
        start_date=start_date,
        end_date=end_date,
        cutoff_time=cutoff_time,
        cutoff_type=cutoff_type,
        metrics=metrics_dict,
        daily_summary=daily_summary,
        distribution=distribution,
        detailed_intervals=intervals,
        notes=notes
    )
