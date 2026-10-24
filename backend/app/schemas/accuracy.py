from typing import List, Optional
from pydantic import BaseModel, Field
from app.schemas.dashboard import SummaryMetrics, DailySummary, IntervalRecord

class ErrorDistributionBin(BaseModel):
    bin_label: str
    bin_min: int
    bin_max: int
    count: int
    percentage: float

class AccuracyResponse(BaseModel):
    start_date: str
    end_date: str
    cutoff_time: str
    cutoff_type: str
    metrics: SummaryMetrics
    daily_summary: List[DailySummary]
    distribution: List[ErrorDistributionBin]
    detailed_intervals: List[IntervalRecord]
    notes: List[str]
