from typing import List, Optional
from pydantic import BaseModel, Field

class IntervalRecord(BaseModel):
    start_time: str = Field(..., description="UTC ISO timestamp of the delivery interval start")
    settlement_date: str = Field(..., description="UK settlement date YYYY-MM-DD")
    settlement_period: int = Field(..., description="UK settlement period 1-48")
    actual_generation_mw: float = Field(..., description="Actual wind generation in MW")
    forecast_generation_mw: Optional[float] = Field(None, description="Selected forecast in MW or None if missing")
    forecast_publish_time: Optional[str] = Field(None, description="UTC ISO timestamp when forecast was published")
    lead_time_hours: Optional[float] = Field(None, description="Hours between publish time and delivery start")
    cutoff_timestamp: str = Field(..., description="The applied decision cutoff timestamp")
    error_mw: Optional[float] = Field(None, description="forecast_generation_mw - actual_generation_mw")
    shortfall_mw: Optional[float] = Field(None, description="max(actual - forecast, 0)")
    surplus_mw: Optional[float] = Field(None, description="max(forecast - actual, 0)")
    is_matched: bool = Field(..., description="True if both actual and eligible forecast exist")

class SummaryMetrics(BaseModel):
    total_intervals: int
    matched_intervals: int
    unmatched_intervals: int
    coverage_pct: float
    mae_mw: Optional[float]
    rmse_mw: Optional[float]
    mean_error_mw: Optional[float]
    bias_direction: str
    total_actual_mwh: float
    total_forecast_mwh: float
    total_shortfall_mwh: float
    total_surplus_mwh: float
    overestimation_count: int
    underestimation_count: int
    exact_count: int

class DailySummary(BaseModel):
    settlement_date: str
    total_intervals: int
    matched_intervals: int
    coverage_pct: float
    actual_mwh: float
    forecast_mwh: Optional[float]
    mae_mw: Optional[float]
    rmse_mw: Optional[float]
    mean_error_mw: Optional[float]
    shortfall_mwh: Optional[float]

class DashboardResponse(BaseModel):
    start_date: str
    end_date: str
    cutoff_time: str
    cutoff_type: str
    metrics: SummaryMetrics
    daily_summary: List[DailySummary]
    intervals: List[IntervalRecord]
