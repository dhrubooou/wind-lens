import sqlite3
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from typing import List, Dict, Any, Optional, Tuple
import logging
from app.config import settings
from app.db.database import get_db_connection

logger = logging.getLogger(__name__)
UK_TZ = ZoneInfo("Europe/London")

class ForecastService:
    """Service implementing critical forecast vintage selection and evolution tracking."""

    @staticmethod
    def parse_cutoff_to_utc(
        delivery_date_str: str,
        cutoff_time_str: Optional[str] = None,
        cutoff_datetime_str: Optional[str] = None,
        cutoff_type: str = "day_ahead"
    ) -> str:
        """
        Derive the exact UTC cutoff timestamp based on configuration:
        - cutoff_datetime_str: Explicit timestamp (e.g. '2026-01-14T12:00:00Z')
        - cutoff_type == 'day_ahead': Delivery date D minus 1 day at cutoff_time_str (default 12:00) in UK local time.
        - cutoff_type == 'same_day': Delivery date D at cutoff_time_str in UK local time.
        Returns standard UTC ISO-8601 string: YYYY-MM-DDTHH:MM:SSZ
        """
        if cutoff_datetime_str:
            clean = cutoff_datetime_str.strip().replace("Z", "+00:00")
            dt = datetime.fromisoformat(clean)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=UK_TZ)
            return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

        # Parse delivery date YYYY-MM-DD
        d_year, d_month, d_day = [int(p) for p in delivery_date_str.split("-")]
        delivery_dt = datetime(d_year, d_month, d_day, tzinfo=UK_TZ)

        hour = settings.DEFAULT_CUTOFF_HOUR
        minute = settings.DEFAULT_CUTOFF_MINUTE
        if cutoff_time_str:
            parts = cutoff_time_str.split(":")
            hour = int(parts[0])
            minute = int(parts[1]) if len(parts) > 1 else 0

        if cutoff_type == "day_ahead":
            # D-1 at configured time in UK local time
            cutoff_local = (delivery_dt - timedelta(days=1)).replace(hour=hour, minute=minute, second=0, microsecond=0)
        else:
            # Same day at configured time
            cutoff_local = delivery_dt.replace(hour=hour, minute=minute, second=0, microsecond=0)

        cutoff_utc = cutoff_local.astimezone(timezone.utc)
        return cutoff_utc.strftime("%Y-%m-%dT%H:%M:%SZ")

    @classmethod
    def get_forecasts_and_actuals(
        cls,
        start_date: str,
        end_date: str,
        cutoff_time: str = "12:00",
        cutoff_type: str = "day_ahead",
        custom_cutoff: Optional[str] = None,
        db_path: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Select the latest eligible forecast published before cutoff for each delivery interval,
        and match with actual generation for that interval.
        
        Strictly prevents look-ahead bias: publish_time <= applicable_cutoff.
        Error = forecast_mw - actual_mw (positive = overforecast, negative = underforecast).
        """
        with get_db_connection(db_path) as conn:
            cursor = conn.cursor()
            
            # Fetch actuals for the date range
            cursor.execute("""
                SELECT start_time, settlement_date, settlement_period, generation_mw, publish_time
                FROM actual_generation
                WHERE settlement_date >= ? AND settlement_date <= ?
                ORDER BY start_time ASC;
            """, (start_date, end_date))
            actual_rows = cursor.fetchall()
            
            if not actual_rows:
                # If no actual records in DB yet
                return []

            results = []
            
            # Fetch all candidate forecasts for intervals in range
            # Range start time and end time
            min_start = actual_rows[0]["start_time"]
            max_start = actual_rows[-1]["start_time"]

            for row in actual_rows:
                interval_start = row["start_time"]
                settlement_date = row["settlement_date"]
                period = row["settlement_period"]
                actual_mw = row["generation_mw"]
                
                # Compute cutoff for this specific delivery interval
                if custom_cutoff:
                    cutoff_utc_str = cls.parse_cutoff_to_utc(settlement_date, cutoff_datetime_str=custom_cutoff)
                else:
                    cutoff_utc_str = cls.parse_cutoff_to_utc(settlement_date, cutoff_time_str=cutoff_time, cutoff_type=cutoff_type)

                # Query latest forecast published ON OR BEFORE the cutoff
                cursor.execute("""
                    SELECT publish_time, generation_mw
                    FROM forecast_generation
                    WHERE start_time = ? AND publish_time <= ?
                    ORDER BY publish_time DESC
                    LIMIT 1;
                """, (interval_start, cutoff_utc_str))
                
                fc_row = cursor.fetchone()
                
                if fc_row:
                    fc_mw = fc_row["generation_mw"]
                    fc_pub = fc_row["publish_time"]
                    
                    # Calculate lead time in hours
                    dt_interval = datetime.fromisoformat(interval_start.replace("Z", "+00:00"))
                    dt_pub = datetime.fromisoformat(fc_pub.replace("Z", "+00:00"))
                    lead_hours = round((dt_interval - dt_pub).total_seconds() / 3600.0, 2)
                    
                    error_mw = round(fc_mw - actual_mw, 2)
                    shortfall_mw = max(round(actual_mw - fc_mw, 2), 0.0)
                    surplus_mw = max(round(fc_mw - actual_mw, 2), 0.0)
                    matched = True
                else:
                    fc_mw = None
                    fc_pub = None
                    lead_hours = None
                    error_mw = None
                    shortfall_mw = None
                    surplus_mw = None
                    matched = False

                results.append({
                    "start_time": interval_start,
                    "settlement_date": settlement_date,
                    "settlement_period": period,
                    "actual_generation_mw": actual_mw,
                    "forecast_generation_mw": fc_mw,
                    "forecast_publish_time": fc_pub,
                    "lead_time_hours": lead_hours,
                    "cutoff_timestamp": cutoff_utc_str,
                    "error_mw": error_mw,
                    "shortfall_mw": shortfall_mw,
                    "surplus_mw": surplus_mw,
                    "is_matched": matched
                })

            return results

    @classmethod
    def get_forecast_evolution(
        cls,
        target_start_time: str,
        db_path: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Retrieve all forecast vintages published for a specific delivery interval,
        ordered by publish_time ASC (tracking evolution from long lead time to short lead time).
        """
        with get_db_connection(db_path) as conn:
            cursor = conn.cursor()
            
            # 1. Fetch actual generation for this delivery interval if available
            cursor.execute("""
                SELECT settlement_date, settlement_period, generation_mw, publish_time
                FROM actual_generation
                WHERE start_time = ?;
            """, (target_start_time,))
            actual_row = cursor.fetchone()
            
            actual_mw = actual_row["generation_mw"] if actual_row else None
            settlement_date = actual_row["settlement_date"] if actual_row else target_start_time[:10]
            period = actual_row["settlement_period"] if actual_row else None

            # 2. Fetch all forecast vintages
            cursor.execute("""
                SELECT publish_time, generation_mw
                FROM forecast_generation
                WHERE start_time = ?
                ORDER BY publish_time ASC;
            """, (target_start_time,))
            vintages = cursor.fetchall()
            
            dt_interval = datetime.fromisoformat(target_start_time.replace("Z", "+00:00"))
            
            evolution_points = []
            for v in vintages:
                pub_time = v["publish_time"]
                fc_mw = v["generation_mw"]
                dt_pub = datetime.fromisoformat(pub_time.replace("Z", "+00:00"))
                lead_hours = round((dt_interval - dt_pub).total_seconds() / 3600.0, 2)
                
                error_mw = round(fc_mw - actual_mw, 2) if actual_mw is not None else None
                
                evolution_points.append({
                    "publish_time": pub_time,
                    "forecast_generation_mw": fc_mw,
                    "lead_time_hours": lead_hours,
                    "actual_generation_mw": actual_mw,
                    "error_mw": error_mw
                })

            return {
                "start_time": target_start_time,
                "settlement_date": settlement_date,
                "settlement_period": period,
                "actual_generation_mw": actual_mw,
                "total_vintages": len(evolution_points),
                "vintages": evolution_points
            }
