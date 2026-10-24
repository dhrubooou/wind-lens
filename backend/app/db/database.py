import sqlite3
import os
from pathlib import Path
from contextlib import contextmanager
from typing import Generator
from app.config import settings

def init_db(db_path: str = None) -> None:
    """Initialize the SQLite database schema if not present."""
    path = db_path or settings.DATABASE_PATH
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    
    with sqlite3.connect(path) as conn:
        cursor = conn.cursor()
        
        # Actual wind generation table (from FUELHH stream, filtered to WIND)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS actual_generation (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            start_time TEXT NOT NULL UNIQUE,
            settlement_date TEXT NOT NULL,
            settlement_period INTEGER NOT NULL,
            generation_mw REAL NOT NULL,
            publish_time TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)
        
        # Wind forecasts table (from WINDFOR stream)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS forecast_generation (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            publish_time TEXT NOT NULL,
            start_time TEXT NOT NULL,
            generation_mw REAL NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(publish_time, start_time)
        );
        """)
        
        # Ingestion & Sync log table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS sync_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            dataset TEXT NOT NULL,
            date_range_start TEXT NOT NULL,
            date_range_end TEXT NOT NULL,
            records_count INTEGER NOT NULL,
            status TEXT NOT NULL,
            error_message TEXT,
            synced_at TEXT NOT NULL
        );
        """)
        
        # Optimize with indexes
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_actual_start ON actual_generation(start_time);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_actual_date ON actual_generation(settlement_date);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_forecast_start ON forecast_generation(start_time);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_forecast_pub ON forecast_generation(publish_time);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_forecast_start_pub ON forecast_generation(start_time, publish_time);")
        
        conn.commit()

@contextmanager
def get_db_connection(db_path: str = None) -> Generator[sqlite3.Connection, None, None]:
    """Context manager for SQLite database connections."""
    path = db_path or settings.DATABASE_PATH
    conn = sqlite3.connect(path, timeout=30.0)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()
