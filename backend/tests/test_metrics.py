import pytest
import math
from app.services.metrics_service import MetricsService

def test_summary_metrics_calculation():
    # Synthetic records:
    # 1: error = +200 (overestimation)
    # 2: error = -100 (underestimation)
    # 3: error = +300 (overestimation)
    # 4: unmatched (missing forecast)
    records = [
        {
            "start_time": "2026-01-01T00:00:00Z",
            "settlement_date": "2026-01-01",
            "actual_generation_mw": 1000.0,
            "forecast_generation_mw": 1200.0,
            "error_mw": 200.0,
            "shortfall_mw": 0.0,
            "surplus_mw": 200.0,
            "is_matched": True
        },
        {
            "start_time": "2026-01-01T00:30:00Z",
            "settlement_date": "2026-01-01",
            "actual_generation_mw": 1500.0,
            "forecast_generation_mw": 1400.0,
            "error_mw": -100.0,
            "shortfall_mw": 100.0,
            "surplus_mw": 0.0,
            "is_matched": True
        },
        {
            "start_time": "2026-01-01T01:00:00Z",
            "settlement_date": "2026-01-01",
            "actual_generation_mw": 2000.0,
            "forecast_generation_mw": 2300.0,
            "error_mw": 300.0,
            "shortfall_mw": 0.0,
            "surplus_mw": 300.0,
            "is_matched": True
        },
        {
            "start_time": "2026-01-01T01:30:00Z",
            "settlement_date": "2026-01-01",
            "actual_generation_mw": 1800.0,
            "forecast_generation_mw": None,
            "error_mw": None,
            "shortfall_mw": None,
            "surplus_mw": None,
            "is_matched": False
        }
    ]

    metrics = MetricsService.calculate_summary_metrics(records)

    assert metrics["total_intervals"] == 4
    assert metrics["matched_intervals"] == 3
    assert metrics["unmatched_intervals"] == 1
    assert metrics["coverage_pct"] == 75.0

    # MAE = (|200| + |-100| + |300|) / 3 = 600 / 3 = 200.0 MW
    assert metrics["mae_mw"] == 200.0

    # RMSE = sqrt((200^2 + (-100)^2 + 300^2) / 3) = sqrt((40000 + 10000 + 90000) / 3) = sqrt(140000 / 3) = 216.02 MW
    expected_rmse = round(math.sqrt(140000 / 3), 2)
    assert metrics["rmse_mw"] == expected_rmse

    # Mean error = (200 - 100 + 300) / 3 = 400 / 3 = 133.33 MW
    assert metrics["mean_error_mw"] == round(400 / 3, 2)

    # Counts
    assert metrics["overestimation_count"] == 2
    assert metrics["underestimation_count"] == 1
    assert metrics["exact_count"] == 0

    # MWh calculation: 0.5h * sum
    assert metrics["total_actual_mwh"] == (1000 + 1500 + 2000) * 0.5
    assert metrics["total_forecast_mwh"] == (1200 + 1400 + 2300) * 0.5
    assert metrics["total_shortfall_mwh"] == (0 + 100 + 0) * 0.5
    assert metrics["total_surplus_mwh"] == (200 + 0 + 300) * 0.5

def test_empty_dataset_handling():
    metrics = MetricsService.calculate_summary_metrics([])
    assert metrics["total_intervals"] == 0
    assert metrics["matched_intervals"] == 0
    assert metrics["coverage_pct"] == 0.0
    assert metrics["mae_mw"] is None
    assert metrics["rmse_mw"] is None

def test_daily_summary_and_error_distribution():
    records = [
        {"start_time": "2026-01-01T00:00:00Z", "settlement_date": "2026-01-01", "actual_generation_mw": 1000.0, "forecast_generation_mw": 1200.0, "error_mw": 200.0, "shortfall_mw": 0.0, "is_matched": True},
        {"start_time": "2026-01-01T01:00:00Z", "settlement_date": "2026-01-01", "actual_generation_mw": 2000.0, "forecast_generation_mw": 1800.0, "error_mw": -200.0, "shortfall_mw": 200.0, "is_matched": True},
        {"start_time": "2026-01-02T00:00:00Z", "settlement_date": "2026-01-02", "actual_generation_mw": 3000.0, "forecast_generation_mw": 3100.0, "error_mw": 100.0, "shortfall_mw": 0.0, "is_matched": True}
    ]
    daily = MetricsService.calculate_daily_summary(records)
    assert len(daily) == 2
    assert daily[0]["settlement_date"] == "2026-01-01"
    assert daily[0]["mae_mw"] == 200.0
    assert daily[1]["settlement_date"] == "2026-01-02"
    assert daily[1]["mae_mw"] == 100.0

    dist = MetricsService.calculate_error_distribution(records, bin_width_mw=200)
    assert len(dist) > 0
    assert sum(d["count"] for d in dist) == 3
