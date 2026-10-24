from typing import List, Optional
from pydantic import BaseModel, Field

class ForecastVintage(BaseModel):
    publish_time: str = Field(..., description="UTC ISO publication timestamp")
    forecast_generation_mw: float = Field(..., description="Forecast wind generation in MW")
    lead_time_hours: float = Field(..., description="Hours from publication to interval delivery start")
    actual_generation_mw: Optional[float] = Field(None, description="Actual generation in MW if delivered")
    error_mw: Optional[float] = Field(None, description="forecast_mw - actual_mw")

class ForecastEvolutionResponse(BaseModel):
    start_time: str
    settlement_date: str
    settlement_period: Optional[int]
    actual_generation_mw: Optional[float]
    total_vintages: int
    vintages: List[ForecastVintage]

class DecisionTimeForecastResponse(BaseModel):
    delivery_date: str
    settlement_period: int
    start_time: str
    cutoff_time: str
    cutoff_type: str
    applied_cutoff_utc: str
    latest_eligible_forecast_mw: Optional[float]
    forecast_publish_time: Optional[str]
    lead_time_hours: Optional[float]
    actual_generation_mw: Optional[float]
    error_mw: Optional[float]
    shortfall_mw: Optional[float]
    surplus_mw: Optional[float]
    is_eligible_forecast_found: bool
    explanation: str
