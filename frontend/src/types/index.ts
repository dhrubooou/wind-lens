export interface IntervalRecord {
  start_time: string;
  settlement_date: string;
  settlement_period: number;
  actual_generation_mw: number;
  forecast_generation_mw: number | null;
  forecast_publish_time: string | null;
  lead_time_hours: number | null;
  cutoff_timestamp: string;
  error_mw: number | null;
  shortfall_mw: number | null;
  surplus_mw: number | null;
  is_matched: boolean;
}

export interface SummaryMetrics {
  total_intervals: number;
  matched_intervals: number;
  unmatched_intervals: number;
  coverage_pct: number;
  mae_mw: number | null;
  rmse_mw: number | null;
  mean_error_mw: number | null;
  bias_direction: 'OVERESTIMATION' | 'UNDERESTIMATION' | 'BALANCED' | 'NONE';
  total_actual_mwh: number;
  total_forecast_mwh: number;
  total_shortfall_mwh: number;
  total_surplus_mwh: number;
  overestimation_count: number;
  underestimation_count: number;
  exact_count: number;
}

export interface DailySummary {
  settlement_date: string;
  total_intervals: number;
  matched_intervals: number;
  coverage_pct: number;
  actual_mwh: number;
  forecast_mwh: number | null;
  mae_mw: number | null;
  rmse_mw: number | null;
  mean_error_mw: number | null;
  shortfall_mwh: number | null;
}

export interface DashboardResponse {
  start_date: string;
  end_date: string;
  cutoff_time: string;
  cutoff_type: string;
  metrics: SummaryMetrics;
  daily_summary: DailySummary[];
  intervals: IntervalRecord[];
}

export interface ForecastVintage {
  publish_time: string;
  forecast_generation_mw: number;
  lead_time_hours: number;
  actual_generation_mw: number | null;
  error_mw: number | null;
}

export interface ForecastEvolutionResponse {
  start_time: string;
  settlement_date: string;
  settlement_period: number | null;
  actual_generation_mw: number | null;
  total_vintages: number;
  vintages: ForecastVintage[];
}

export interface DecisionTimeForecastResponse {
  delivery_date: string;
  settlement_period: number;
  start_time: string;
  cutoff_time: string;
  cutoff_type: string;
  applied_cutoff_utc: string;
  latest_eligible_forecast_mw: number | null;
  forecast_publish_time: string | null;
  lead_time_hours: number | null;
  actual_generation_mw: number | null;
  error_mw: number | null;
  shortfall_mw: number | null;
  surplus_mw: number | null;
  is_eligible_forecast_found: boolean;
  explanation: string;
}

export interface ErrorDistributionBin {
  bin_label: string;
  bin_min: number;
  bin_max: number;
  count: number;
  percentage: number;
}

export interface AccuracyResponse {
  start_date: string;
  end_date: string;
  cutoff_time: string;
  cutoff_type: string;
  metrics: SummaryMetrics;
  daily_summary: DailySummary[];
  distribution: ErrorDistributionBin[];
  detailed_intervals: IntervalRecord[];
  notes: string[];
}

export interface DatasetSourceInfo {
  dataset: string;
  description: string;
  records_count: number;
  date_range?: string;
  publication_range?: string;
}

export interface DataStatusResponse {
  dataset_sources: DatasetSourceInfo[];
  total_actual_records: number;
  total_forecast_records: number;
  last_successful_sync: string | null;
  is_cached: boolean;
  data_mode: string;
  sync_logs: Array<{
    dataset: string;
    status: string;
    records_count: number;
    synced_at: string;
    error_message: string | null;
  }>;
}

export type PageId = 'dashboard' | 'decision-explorer' | 'evolution' | 'accuracy' | 'data-status';
