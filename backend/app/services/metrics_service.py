import math
from typing import List, Dict, Any, Optional
import numpy as np
import pandas as pd

class MetricsService:
    """Computes procurement-oriented accuracy metrics and error distributions."""

    @classmethod
    def calculate_summary_metrics(cls, records: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Calculate MAE, RMSE, Mean Forecast Error, Coverage %, Shortfall, and Surplus.
        Unmatched records (missing forecast or actual) are strictly excluded from error metrics,
        with coverage reported independently.
        """
        total_intervals = len(records)
        matched_records = [r for r in records if r.get("is_matched") and r.get("error_mw") is not None]
        matched_intervals = len(matched_records)
        unmatched_intervals = total_intervals - matched_intervals
        coverage_pct = round((matched_intervals / total_intervals * 100.0), 2) if total_intervals > 0 else 0.0

        if not matched_records:
            return {
                "total_intervals": total_intervals,
                "matched_intervals": 0,
                "unmatched_intervals": unmatched_intervals,
                "coverage_pct": 0.0,
                "mae_mw": None,
                "rmse_mw": None,
                "mean_error_mw": None,
                "bias_direction": "NONE",
                "total_actual_mwh": 0.0,
                "total_forecast_mwh": 0.0,
                "total_shortfall_mwh": 0.0,
                "total_surplus_mwh": 0.0,
                "overestimation_count": 0,
                "underestimation_count": 0,
                "exact_count": 0
            }

        errors = np.array([r["error_mw"] for r in matched_records], dtype=float)
        actuals = np.array([r["actual_generation_mw"] for r in matched_records], dtype=float)
        forecasts = np.array([r["forecast_generation_mw"] for r in matched_records], dtype=float)
        shortfalls = np.array([r["shortfall_mw"] for r in matched_records], dtype=float)
        surpluses = np.array([r["surplus_mw"] for r in matched_records], dtype=float)

        mae = float(np.mean(np.abs(errors)))
        rmse = float(np.sqrt(np.mean(errors ** 2)))
        mean_error = float(np.mean(errors))

        # 0.5 hours per half-hour interval converts MW to MWh
        # Note: if actual intervals represent 1 hour or 0.5 hour, we check interval delta
        interval_hours = 0.5  # standard settlement period is 30 mins
        total_actual_mwh = float(np.sum(actuals) * interval_hours)
        total_forecast_mwh = float(np.sum(forecasts) * interval_hours)
        total_shortfall_mwh = float(np.sum(shortfalls) * interval_hours)
        total_surplus_mwh = float(np.sum(surpluses) * interval_hours)

        over_count = int(np.sum(errors > 0))
        under_count = int(np.sum(errors < 0))
        exact_count = int(np.sum(errors == 0))

        bias_direction = "OVERESTIMATION" if mean_error > 50 else ("UNDERESTIMATION" if mean_error < -50 else "BALANCED")

        return {
            "total_intervals": total_intervals,
            "matched_intervals": matched_intervals,
            "unmatched_intervals": unmatched_intervals,
            "coverage_pct": coverage_pct,
            "mae_mw": round(mae, 2),
            "rmse_mw": round(rmse, 2),
            "mean_error_mw": round(mean_error, 2),
            "bias_direction": bias_direction,
            "total_actual_mwh": round(total_actual_mwh, 1),
            "total_forecast_mwh": round(total_forecast_mwh, 1),
            "total_shortfall_mwh": round(total_shortfall_mwh, 1),
            "total_surplus_mwh": round(total_surplus_mwh, 1),
            "overestimation_count": over_count,
            "underestimation_count": under_count,
            "exact_count": exact_count
        }

    @classmethod
    def calculate_daily_summary(cls, records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Group records by settlement_date and compute daily metrics."""
        if not records:
            return []

        df = pd.DataFrame(records)
        daily_list = []
        
        for date_str, group in df.groupby("settlement_date"):
            total_int = len(group)
            matched_group = group[group["is_matched"] == True]
            matched_int = len(matched_group)
            coverage = round(matched_int / total_int * 100.0, 1) if total_int > 0 else 0.0

            if matched_int > 0:
                errors = matched_group["error_mw"].values
                actuals = matched_group["actual_generation_mw"].values
                forecasts = matched_group["forecast_generation_mw"].values
                shortfalls = matched_group["shortfall_mw"].values

                mae = round(float(np.mean(np.abs(errors))), 2)
                rmse = round(float(np.sqrt(np.mean(errors ** 2))), 2)
                mean_err = round(float(np.mean(errors)), 2)
                act_mwh = round(float(np.sum(actuals) * 0.5), 1)
                fc_mwh = round(float(np.sum(forecasts) * 0.5), 1)
                shortfall_mwh = round(float(np.sum(shortfalls) * 0.5), 1)
            else:
                mae = None
                rmse = None
                mean_err = None
                act_mwh = round(float(group["actual_generation_mw"].sum() * 0.5), 1)
                fc_mwh = None
                shortfall_mwh = None

            daily_list.append({
                "settlement_date": str(date_str),
                "total_intervals": total_int,
                "matched_intervals": matched_int,
                "coverage_pct": coverage,
                "actual_mwh": act_mwh,
                "forecast_mwh": fc_mwh,
                "mae_mw": mae,
                "rmse_mw": rmse,
                "mean_error_mw": mean_err,
                "shortfall_mwh": shortfall_mwh
            })

        daily_list.sort(key=lambda x: x["settlement_date"])
        return daily_list

    @classmethod
    def calculate_error_distribution(cls, records: List[Dict[str, Any]], bin_width_mw: int = 500) -> List[Dict[str, Any]]:
        """Generate binned error distribution histogram data."""
        matched = [r["error_mw"] for r in records if r.get("is_matched") and r.get("error_mw") is not None]
        if not matched:
            return []

        errors = np.array(matched, dtype=float)
        min_err = float(np.min(errors))
        max_err = float(np.max(errors))

        # Create symmetric bins around 0
        bin_min = int(math.floor(min_err / bin_width_mw) * bin_width_mw)
        bin_max = int(math.ceil(max_err / bin_width_mw) * bin_width_mw)
        
        bins = list(range(bin_min, bin_max + bin_width_mw, bin_width_mw))
        if len(bins) < 2:
            bins = [bin_min, bin_min + bin_width_mw]

        counts, bin_edges = np.histogram(errors, bins=bins)
        
        distribution = []
        for i in range(len(counts)):
            low = int(bin_edges[i])
            high = int(bin_edges[i+1])
            distribution.append({
                "bin_label": f"{low:+d} to {high:+d} MW",
                "bin_min": low,
                "bin_max": high,
                "count": int(counts[i]),
                "percentage": round(float(counts[i] / len(errors) * 100.0), 1)
            })

        return distribution
