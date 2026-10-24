import pytest
import sqlite3
import os
from app.db.database import init_db
from app.services.forecast_service import ForecastService

@pytest.fixture
def test_db(tmp_path):
    db_file = str(tmp_path / "test_windlens.db")
    init_db(db_file)
    
    with sqlite3.connect(db_file) as conn:
        cursor = conn.cursor()
        
        # Insert delivery interval actuals for 2026-01-05
        # Period 24: 11:30:00Z to 12:00:00Z -> start_time = 2026-01-05T11:30:00Z
        # Period 25: 12:00:00Z to 12:30:00Z -> start_time = 2026-01-05T12:00:00Z
        cursor.execute("""
            INSERT INTO actual_generation (start_time, settlement_date, settlement_period, generation_mw, publish_time)
            VALUES 
            ('2026-01-05T11:30:00Z', '2026-01-05', 24, 10000.0, '2026-01-05T12:00:00Z'),
            ('2026-01-05T12:00:00Z', '2026-01-05', 25, 12000.0, '2026-01-05T12:30:00Z');
        """)
        
        # Insert forecast vintages for 2026-01-05T12:00:00Z delivery
        # Cutoff for Day-Ahead 12:00 will be 2026-01-04T12:00:00Z
        cursor.execute("""
            INSERT INTO forecast_generation (publish_time, start_time, generation_mw)
            VALUES 
            ('2026-01-04T06:00:00Z', '2026-01-05T12:00:00Z', 11000.0), -- Earlier eligible
            ('2026-01-04T11:30:00Z', '2026-01-05T12:00:00Z', 11500.0), -- Latest eligible before 12:00
            ('2026-01-04T12:00:00Z', '2026-01-05T12:00:00Z', 11600.0), -- Exactly at cutoff (eligible)
            ('2026-01-04T14:30:00Z', '2026-01-05T12:00:00Z', 13000.0), -- After cutoff (LOOK-AHEAD BIAS if used)
            ('2026-01-05T08:00:00Z', '2026-01-05T12:00:00Z', 12500.0); -- Intraday (after cutoff)
        """)
        
        conn.commit()

    return db_file

def test_cutoff_parsing():
    # Day ahead 12:00 UK local time
    cutoff = ForecastService.parse_cutoff_to_utc("2026-01-05", cutoff_time_str="12:00", cutoff_type="day_ahead")
    assert cutoff == "2026-01-04T12:00:00Z"
    
    # Same day 08:00 UK local time
    cutoff_sameday = ForecastService.parse_cutoff_to_utc("2026-01-05", cutoff_time_str="08:00", cutoff_type="same_day")
    assert cutoff_sameday == "2026-01-05T08:00:00Z"
    
    # Custom ISO override
    custom = ForecastService.parse_cutoff_to_utc("2026-01-05", cutoff_datetime_str="2026-01-04T17:00:00Z")
    assert custom == "2026-01-04T17:00:00Z"

def test_prevent_lookahead_bias_and_select_latest_eligible(test_db):
    results = ForecastService.get_forecasts_and_actuals(
        start_date="2026-01-05",
        end_date="2026-01-05",
        cutoff_time="12:00",
        cutoff_type="day_ahead",
        db_path=test_db
    )
    
    assert len(results) == 2
    
    # Interval 1: 11:30:00 has NO forecast record -> should be unmatched, NOT replaced with zero!
    int_1 = results[0]
    assert int_1["start_time"] == "2026-01-05T11:30:00Z"
    assert int_1["is_matched"] is False
    assert int_1["forecast_generation_mw"] is None
    assert int_1["error_mw"] is None
    
    # Interval 2: 12:00:00 has forecasts.
    # Cutoff is 2026-01-04T12:00:00Z.
    # Latest eligible published on or before 12:00:00Z is 11600.0 (publish_time 12:00:00Z).
    # 13000.0 and 12500.0 were published AFTER cutoff and MUST NOT be selected.
    int_2 = results[1]
    assert int_2["start_time"] == "2026-01-05T12:00:00Z"
    assert int_2["is_matched"] is True
    assert int_2["forecast_generation_mw"] == 11600.0
    assert int_2["forecast_publish_time"] == "2026-01-04T12:00:00Z"
    # Error: forecast (11600.0) - actual (12000.0) = -400.0 (underforecast)
    assert int_2["error_mw"] == -400.0
    # Shortfall: actual (12000) - forecast (11600) = 400.0
    assert int_2["shortfall_mw"] == 400.0
    assert int_2["surplus_mw"] == 0.0

def test_forecast_evolution(test_db):
    evolution = ForecastService.get_forecast_evolution("2026-01-05T12:00:00Z", db_path=test_db)
    
    assert evolution["start_time"] == "2026-01-05T12:00:00Z"
    assert evolution["actual_generation_mw"] == 12000.0
    assert evolution["total_vintages"] == 5
    
    vintages = evolution["vintages"]
    # Verify vintages are sorted chronologically
    pub_times = [v["publish_time"] for v in vintages]
    assert pub_times == sorted(pub_times)
    
    # Verify first vintage (longest lead time) and last vintage (shortest lead time)
    assert vintages[0]["publish_time"] == "2026-01-04T06:00:00Z"
    assert vintages[0]["forecast_generation_mw"] == 11000.0
    assert vintages[-1]["publish_time"] == "2026-01-05T08:00:00Z"
    assert vintages[-1]["forecast_generation_mw"] == 12500.0
