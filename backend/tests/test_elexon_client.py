import pytest
from app.client.elexon import ElexonClient

def test_normalize_to_utc_iso():
    # UTC with Z
    assert ElexonClient.normalize_to_utc_iso("2026-01-01T12:00:00Z") == "2026-01-01T12:00:00Z"
    
    # UTC with +00:00 offset
    assert ElexonClient.normalize_to_utc_iso("2026-01-01T12:00:00+00:00") == "2026-01-01T12:00:00Z"
    
    # Positive offset +01:00 (e.g. BST)
    assert ElexonClient.normalize_to_utc_iso("2026-06-01T13:00:00+01:00") == "2026-06-01T12:00:00Z"
    
    # Naive timestamp
    assert ElexonClient.normalize_to_utc_iso("2026-01-01T12:00:00") == "2026-01-01T12:00:00Z"

def test_fetch_wind_actuals_filtering(monkeypatch):
    sample_fuelhh = [
        {"dataset": "FUELHH", "startTime": "2026-01-01T00:00:00Z", "publishTime": "2026-01-01T00:30:00Z", "settlementDate": "2026-01-01", "settlementPeriod": 1, "fuelType": "BIOMASS", "generation": 1200},
        {"dataset": "FUELHH", "startTime": "2026-01-01T00:00:00Z", "publishTime": "2026-01-01T00:30:00Z", "settlementDate": "2026-01-01", "settlementPeriod": 1, "fuelType": "WIND", "generation": 14500},
        {"dataset": "FUELHH", "startTime": "2026-01-01T00:00:00Z", "publishTime": "2026-01-01T00:30:00Z", "settlementDate": "2026-01-01", "settlementPeriod": 1, "fuelType": "CCGT", "generation": 8000},
        {"dataset": "FUELHH", "startTime": "2026-01-01T00:30:00Z", "publishTime": "2026-01-01T01:00:00Z", "settlementDate": "2026-01-01", "settlementPeriod": 2, "fuelType": "WIND", "generation": 14950}
    ]
    
    client = ElexonClient()
    monkeypatch.setattr(client, "fetch_fuelhh_stream", lambda f, t: sample_fuelhh)
    
    records = client.fetch_wind_actuals("2026-01-01T00:00:00Z", "2026-01-01T01:00:00Z")
    
    assert len(records) == 2
    assert all(r["settlement_date"] == "2026-01-01" for r in records)
    assert records[0]["generation_mw"] == 14500.0
    assert records[0]["settlement_period"] == 1
    assert records[1]["generation_mw"] == 14950.0
    assert records[1]["settlement_period"] == 2
