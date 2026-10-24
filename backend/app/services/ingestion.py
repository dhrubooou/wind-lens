import logging
import sqlite3
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Optional
from app.client.elexon import ElexonClient, ElexonAPIError
from app.db.database import get_db_connection
from app.config import settings

logger = logging.getLogger(__name__)

class IngestionService:
    """Service to ingest and cache historical actuals and forecast vintages into SQLite."""

    def __init__(self, client: Optional[ElexonClient] = None, db_path: Optional[str] = None):
        self.client = client or ElexonClient()
        self.db_path = db_path or settings.DATABASE_PATH

    def ingest_actuals(self, start_date: str, end_date: str) -> Dict[str, Any]:
        """
        Ingest actual wind generation from FUELHH stream.
        Date format: YYYY-MM-DD.
        Queries in daily / multi-day windows to manage memory and API payloads.
        """
        dt_start = datetime.fromisoformat(start_date).replace(tzinfo=timezone.utc)
        dt_end = datetime.fromisoformat(end_date).replace(tzinfo=timezone.utc) + timedelta(days=1)
        
        current = dt_start
        total_inserted = 0
        status = "SUCCESS"
        err_msg = None

        while current < dt_end:
            chunk_end = min(current + timedelta(days=5), dt_end)
            from_str = current.strftime("%Y-%m-%dT00:00:00Z")
            to_str = chunk_end.strftime("%Y-%m-%dT00:00:00Z")
            
            logger.info(f"Ingesting FUELHH actuals from {from_str} to {to_str}...")
            try:
                records = self.client.fetch_wind_actuals(from_str, to_str)
                if records:
                    with get_db_connection(self.db_path) as conn:
                        cursor = conn.cursor()
                        cursor.executemany("""
                            INSERT INTO actual_generation (start_time, settlement_date, settlement_period, generation_mw, publish_time)
                            VALUES (:start_time, :settlement_date, :settlement_period, :generation_mw, :publish_time)
                            ON CONFLICT(start_time) DO UPDATE SET
                                generation_mw = excluded.generation_mw,
                                publish_time = excluded.publish_time;
                        """, records)
                        conn.commit()
                        total_inserted += len(records)
            except Exception as e:
                logger.error(f"Error ingesting actuals chunk {from_str} to {to_str}: {e}")
                status = "FAILED"
                err_msg = str(e)
                break

            current = chunk_end

        # Log sync event
        with get_db_connection(self.db_path) as conn:
            conn.execute("""
                INSERT INTO sync_log (dataset, date_range_start, date_range_end, records_count, status, error_message, synced_at)
                VALUES (?, ?, ?, ?, ?, ?, ?);
            """, ("FUELHH", start_date, end_date, total_inserted, status, err_msg, datetime.now(timezone.utc).isoformat()))
            conn.commit()

        return {
            "dataset": "FUELHH",
            "inserted_count": total_inserted,
            "status": status,
            "error": err_msg
        }

    def ingest_forecasts(self, publish_start_date: str, publish_end_date: str) -> Dict[str, Any]:
        """
        Ingest WINDFOR stream forecasts published between publish_start_date and publish_end_date.
        For delivery in January 2026, publish dates should include 2025-12-30 to 2026-01-31.
        """
        dt_start = datetime.fromisoformat(publish_start_date).replace(tzinfo=timezone.utc)
        dt_end = datetime.fromisoformat(publish_end_date).replace(tzinfo=timezone.utc) + timedelta(days=1)

        current = dt_start
        total_inserted = 0
        status = "SUCCESS"
        err_msg = None

        while current < dt_end:
            chunk_end = min(current + timedelta(days=3), dt_end)
            from_str = current.strftime("%Y-%m-%dT00:00:00Z")
            to_str = chunk_end.strftime("%Y-%m-%dT00:00:00Z")

            logger.info(f"Ingesting WINDFOR forecasts published from {from_str} to {to_str}...")
            try:
                records = self.client.fetch_windfor_stream(from_str, to_str)
                if records:
                    with get_db_connection(self.db_path) as conn:
                        cursor = conn.cursor()
                        cursor.executemany("""
                            INSERT OR IGNORE INTO forecast_generation (publish_time, start_time, generation_mw)
                            VALUES (:publish_time, :start_time, :generation_mw);
                        """, records)
                        conn.commit()
                        total_inserted += len(records)
            except Exception as e:
                logger.error(f"Error ingesting forecasts chunk {from_str} to {to_str}: {e}")
                status = "FAILED"
                err_msg = str(e)
                break

            current = chunk_end

        # Log sync event
        with get_db_connection(self.db_path) as conn:
            conn.execute("""
                INSERT INTO sync_log (dataset, date_range_start, date_range_end, records_count, status, error_message, synced_at)
                VALUES (?, ?, ?, ?, ?, ?, ?);
            """, ("WINDFOR", publish_start_date, publish_end_date, total_inserted, status, err_msg, datetime.now(timezone.utc).isoformat()))
            conn.commit()

        return {
            "dataset": "WINDFOR",
            "inserted_count": total_inserted,
            "status": status,
            "error": err_msg
        }

    def get_data_status(self) -> Dict[str, Any]:
        """Return system data status, record counts, and last sync timestamps."""
        with get_db_connection(self.db_path) as conn:
            cursor = conn.cursor()
            
            cursor.execute("SELECT COUNT(*), MIN(start_time), MAX(start_time) FROM actual_generation;")
            act_count, min_act, max_act = cursor.fetchone()
            
            cursor.execute("SELECT COUNT(*), MIN(publish_time), MAX(publish_time) FROM forecast_generation;")
            fc_count, min_fc, max_fc = cursor.fetchone()

            cursor.execute("""
                SELECT dataset, status, records_count, synced_at, error_message
                FROM sync_log
                ORDER BY id DESC
                LIMIT 10;
            """)
            logs = [dict(row) for row in cursor.fetchall()]

            last_sync = logs[0]["synced_at"] if logs else None

        return {
            "dataset_sources": [
                {
                    "dataset": "FUELHH",
                    "description": "Half-Hourly Actual Wind Generation (Elexon BMRS)",
                    "records_count": act_count,
                    "date_range": f"{min_act[:10] if min_act else 'N/A'} to {max_act[:10] if max_act else 'N/A'}"
                },
                {
                    "dataset": "WINDFOR",
                    "description": "Wind Generation Forecast Vintages (Elexon BMRS)",
                    "records_count": fc_count,
                    "publication_range": f"{min_fc[:10] if min_fc else 'N/A'} to {max_fc[:10] if max_fc else 'N/A'}"
                }
            ],
            "total_actual_records": act_count,
            "total_forecast_records": fc_count,
            "last_successful_sync": last_sync,
            "is_cached": act_count > 0 and fc_count > 0,
            "data_mode": "LIVE_ELEXON_HISTORICAL_CACHE" if act_count > 0 else "EMPTY_WAITING_SYNC",
            "sync_logs": logs
        }
