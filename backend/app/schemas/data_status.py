from typing import List, Optional, Any
from pydantic import BaseModel, Field

class DatasetSourceInfo(BaseModel):
    dataset: str
    description: str
    records_count: int
    date_range: Optional[str] = None
    publication_range: Optional[str] = None

class DataStatusResponse(BaseModel):
    dataset_sources: List[DatasetSourceInfo]
    total_actual_records: int
    total_forecast_records: int
    last_successful_sync: Optional[str]
    is_cached: bool
    data_mode: str
    sync_logs: List[Any]
