import logging
import time
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from typing import List, Dict, Any, Optional
import httpx
from app.config import settings

logger = logging.getLogger(__name__)
UK_TZ = ZoneInfo("Europe/London")

class ElexonAPIError(Exception):
    """Custom exception raised when Elexon BMRS API returns an error."""
    pass

class ElexonClient:
    """Client for Elexon BMRS Insights API with retries, timeout, and timezone normalization."""

    def __init__(self, base_url: Optional[str] = None, timeout: Optional[float] = None):
        self.base_url = (base_url or settings.ELEXON_API_BASE).rstrip("/")
        self.timeout = timeout or settings.REQUEST_TIMEOUT_SECONDS
        self.max_retries = settings.MAX_RETRIES
        self.backoff_factor = settings.RETRY_BACKOFF_FACTOR

    @staticmethod
    def normalize_to_utc_iso(timestamp_str: str) -> str:
        """
        Normalize any ISO8601 string or UK local timestamp into standard UTC ISO-8601 representation:
        YYYY-MM-DDTHH:MM:SSZ
        """
        clean_str = timestamp_str.strip()
        # If ends with Z
        if clean_str.endswith("Z"):
            dt = datetime.fromisoformat(clean_str[:-1] + "+00:00")
        elif "+" in clean_str or "-" in clean_str[-6:]:
            dt = datetime.fromisoformat(clean_str)
        else:
            # Assume UTC if naive, or parse in Europe/London if requested
            dt = datetime.fromisoformat(clean_str).replace(tzinfo=timezone.utc)
        
        utc_dt = dt.astimezone(timezone.utc)
        return utc_dt.strftime("%Y-%m-%dT%H:%M:%SZ")

    @staticmethod
    def to_uk_local(utc_iso_str: str) -> datetime:
        """Convert a UTC ISO string to a Europe/London timezone-aware datetime."""
        clean_str = utc_iso_str.replace("Z", "+00:00")
        dt_utc = datetime.fromisoformat(clean_str)
        return dt_utc.astimezone(UK_TZ)

    def _execute_request(self, endpoint: str, params: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Execute HTTP GET with exponential backoff retry mechanism."""
        url = f"{self.base_url}/{endpoint}"
        headers = {
            "User-Agent": "WindLens-Analytics/1.0",
            "Accept": "application/json"
        }

        last_error = None
        for attempt in range(1, self.max_retries + 1):
            try:
                logger.info(f"Querying Elexon API: {url} attempt={attempt} params={params}")
                with httpx.Client(timeout=self.timeout) as client:
                    resp = client.get(url, params=params, headers=headers)
                    
                    if resp.status_code == 200:
                        data = resp.json()
                        # Stream endpoint returns a list directly; some endpoints wrap in {'data': [...]}
                        if isinstance(data, list):
                            return data
                        elif isinstance(data, dict) and "data" in data:
                            return data["data"]
                        return []
                    elif resp.status_code == 404:
                        logger.warning(f"Elexon resource not found: {url} {params}")
                        return []
                    elif resp.status_code == 429:
                        wait_sec = self.backoff_factor ** attempt
                        logger.warning(f"Rate limited (429) by Elexon API. Backing off for {wait_sec:.1f}s...")
                        time.sleep(wait_sec)
                        continue
                    else:
                        resp.raise_for_status()
            except httpx.HTTPStatusError as e:
                last_error = e
                logger.error(f"HTTP error {e.response.status_code} fetching {url}: {e.response.text[:200]}")
            except (httpx.RequestError, httpx.TimeoutException) as e:
                last_error = e
                wait_sec = self.backoff_factor ** attempt
                logger.warning(f"Network error on attempt {attempt}/{self.max_retries}: {e}. Retrying in {wait_sec:.1f}s...")
                time.sleep(wait_sec)

        raise ElexonAPIError(f"Failed to fetch from Elexon after {self.max_retries} attempts: {last_error}")

    def fetch_fuelhh_stream(self, publish_from: str, publish_to: str) -> List[Dict[str, Any]]:
        """
        Fetch FUELHH stream from Elexon.
        publish_from and publish_to should be ISO8601 UTC strings, e.g. '2026-01-01T00:00:00Z'.
        """
        params = {
            "publishDateTimeFrom": publish_from,
            "publishDateTimeTo": publish_to
        }
        return self._execute_request("datasets/FUELHH/stream", params)

    def fetch_wind_actuals(self, publish_from: str, publish_to: str) -> List[Dict[str, Any]]:
        """
        Fetch actual wind generation by filtering FUELHH dataset where fuelType == 'WIND'.
        Returns normalized records:
        [
            {
                "start_time": "2026-01-01T00:00:00Z",
                "publish_time": "2026-01-01T00:30:00Z",
                "settlement_date": "2026-01-01",
                "settlement_period": 1,
                "generation_mw": 14250.0
            },
            ...
        ]
        """
        raw_records = self.fetch_fuelhh_stream(publish_from, publish_to)
        wind_records = []
        
        for item in raw_records:
            if item.get("fuelType") == "WIND":
                try:
                    start_time = self.normalize_to_utc_iso(item["startTime"])
                    publish_time = self.normalize_to_utc_iso(item.get("publishTime", item["startTime"]))
                    gen_mw = float(item.get("generation", 0.0))
                    settlement_date = item.get("settlementDate")
                    if not settlement_date:
                        settlement_date = start_time[:10]
                    settlement_period = int(item.get("settlementPeriod", 0))

                    wind_records.append({
                        "start_time": start_time,
                        "publish_time": publish_time,
                        "settlement_date": settlement_date,
                        "settlement_period": settlement_period,
                        "generation_mw": gen_mw
                    })
                except (KeyError, ValueError, TypeError) as e:
                    logger.warning(f"Skipping malformed FUELHH wind record {item}: {e}")
                    continue

        return wind_records

    def fetch_windfor_stream(self, publish_from: str, publish_to: str) -> List[Dict[str, Any]]:
        """
        Fetch WINDFOR stream from Elexon.
        Returns normalized forecast records:
        [
            {
                "publish_time": "2025-12-31T11:30:00Z",
                "start_time": "2026-01-01T12:00:00Z",
                "generation_mw": 18450.0
            },
            ...
        ]
        """
        params = {
            "publishDateTimeFrom": publish_from,
            "publishDateTimeTo": publish_to
        }
        raw_records = self._execute_request("datasets/WINDFOR/stream", params)
        forecast_records = []
        
        for item in raw_records:
            try:
                publish_time = self.normalize_to_utc_iso(item["publishTime"])
                start_time = self.normalize_to_utc_iso(item["startTime"])
                gen_mw = float(item.get("generation", 0.0))

                forecast_records.append({
                    "publish_time": publish_time,
                    "start_time": start_time,
                    "generation_mw": gen_mw
                })
            except (KeyError, ValueError, TypeError) as e:
                logger.warning(f"Skipping malformed WINDFOR record {item}: {e}")
                continue

        return forecast_records
