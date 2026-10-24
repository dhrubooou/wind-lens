import pytest
import sqlite3
from fastapi.testclient import TestClient
from app.main import app
from app.config import settings
from app.db.database import init_db

@pytest.fixture(autouse=True)
def setup_api_test_db(tmp_path, monkeypatch):
    test_db_file = str(tmp_path / "api_test.db")
    monkeypatch.setattr(settings, "DATABASE_PATH", test_db_file)
    init_db(test_db_file)

    with sqlite3.connect(test_db_file) as conn:
        cursor = conn.cursor()
        # Seed test data for 2026-01-01
        cursor.execute("""
            INSERT INTO actual_generation (start_time, settlement_date, settlement_period, generation_mw, publish_time)
            VALUES 
            ('2026-01-01T12:00:00Z', '2026-01-01', 25, 15000.0, '2026-01-01T12:30:00Z');
        """)
        cursor.execute("""
            INSERT INTO forecast_generation (publish_time, start_time, generation_mw)
            VALUES 
            ('2025-12-31T11:30:00Z', '2026-01-01T12:00:00Z', 14200.0),
            ('2026-01-01T08:00:00Z', '2026-01-01T12:00:00Z', 15100.0);
        """)
        conn.commit()

client = TestClient(app)

def test_health_endpoint():
    resp = client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"
    assert data["database_connected"] is True
    assert data["database_records"]["actuals"] >= 1

def test_dashboard_endpoint():
    resp = client.get("/api/dashboard?start_date=2026-01-01&end_date=2026-01-01&cutoff_time=12:00&cutoff_type=day_ahead")
    assert resp.status_code == 200
    data = resp.json()
    assert data["start_date"] == "2026-01-01"
    assert "metrics" in data
    assert "daily_summary" in data
    assert len(data["intervals"]) == 1
    int_0 = data["intervals"][0]
    assert int_0["start_time"] == "2026-01-01T12:00:00Z"
    assert int_0["forecast_generation_mw"] == 14200.0
    assert int_0["actual_generation_mw"] == 15000.0
    # error = 14200 - 15000 = -800
    assert int_0["error_mw"] == -800.0

def test_dashboard_invalid_dates():
    # start_date > end_date should return 400 Bad Request
    resp = client.get("/api/dashboard?start_date=2026-01-05&end_date=2026-01-01")
    assert resp.status_code == 400

def test_forecast_at_cutoff_endpoint():
    resp = client.get("/api/forecast-at-cutoff?delivery_date=2026-01-01&settlement_period=25&cutoff_time=12:00&cutoff_type=day_ahead")
    assert resp.status_code == 200
    data = resp.json()
    assert data["settlement_period"] == 25
    assert data["latest_eligible_forecast_mw"] == 14200.0
    assert data["actual_generation_mw"] == 15000.0

def test_forecast_evolution_endpoint():
    resp = client.get("/api/forecast-evolution?start_time=2026-01-01T12:00:00Z")
    assert resp.status_code == 200
    data = resp.json()
    assert data["start_time"] == "2026-01-01T12:00:00Z"
    assert data["total_vintages"] == 2
    assert len(data["vintages"]) == 2

def test_accuracy_endpoint():
    resp = client.get("/api/accuracy?start_date=2026-01-01&end_date=2026-01-01&cutoff_time=12:00&cutoff_type=day_ahead")
    assert resp.status_code == 200
    data = resp.json()
    assert "metrics" in data
    assert "distribution" in data
    assert "notes" in data

def test_data_status_endpoint():
    resp = client.get("/api/data-status")
    assert resp.status_code == 200
    data = resp.json()
    assert "dataset_sources" in data
    assert data["total_actual_records"] >= 1
