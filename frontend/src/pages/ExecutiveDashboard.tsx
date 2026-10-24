import React, { useEffect, useState } from 'react';
import { 
  Activity, 
  Target, 
  TrendingUp, 
  CheckCircle2, 
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  Info
} from 'lucide-react';
import { api } from '../services/api';
import { DashboardResponse } from '../types';
import { MetricCard } from '../components/common/MetricCard';
import { CutoffSelector } from '../components/common/CutoffSelector';
import { GenerationChart } from '../components/charts/GenerationChart';
import { ForecastErrorChart } from '../components/charts/ForecastErrorChart';
import { DailySummaryTable } from '../components/tables/DailySummaryTable';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';

interface ExecutiveDashboardProps {
  startDate: string;
  endDate: string;
  cutoffTime: string;
  cutoffType: string;
  onCutoffChange: (time: string, type: string) => void;
}

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({
  startDate,
  endDate,
  cutoffTime,
  cutoffType,
  onCutoffChange,
}) => {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getDashboard({
        startDate,
        endDate,
        cutoffTime,
        cutoffType
      });
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch executive dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate, cutoffTime, cutoffType]);

  if (loading) return <LoadingState message="Calculating procurement error metrics and time-series..." />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;
  if (!data) return null;

  const { metrics, daily_summary, intervals } = data;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Controls: Cutoff Selector */}
      <CutoffSelector
        cutoffTime={cutoffTime}
        cutoffType={cutoffType}
        onCutoffChange={onCutoffChange}
      />

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Mean Absolute Error (MAE)"
          value={metrics.mae_mw?.toLocaleString() ?? '—'}
          unit="MW"
          subValue={`RMSE: ${metrics.rmse_mw?.toLocaleString() ?? '—'} MW`}
          badge={{
            text: 'Average Variance',
            variant: 'info'
          }}
          tooltip="Average absolute difference between decision-time forecast and actual generation"
          icon={<Target className="w-5 h-5 text-teal-600" />}
        />

        <MetricCard
          label="Forecast Bias (Mean Error)"
          value={metrics.mean_error_mw !== null ? `${metrics.mean_error_mw > 0 ? '+' : ''}${metrics.mean_error_mw.toLocaleString()}` : '—'}
          unit="MW"
          subValue={`Over: ${metrics.overestimation_count} | Under: ${metrics.underestimation_count}`}
          badge={{
            text: metrics.bias_direction,
            variant: metrics.bias_direction === 'OVERESTIMATION' ? 'warning' : (metrics.bias_direction === 'UNDERESTIMATION' ? 'danger' : 'success')
          }}
          tooltip="Positive means forecast systematically overestimated actual generation; negative means underestimated"
          icon={<TrendingUp className="w-5 h-5 text-slate-600" />}
        />

        <MetricCard
          label="Forecast Coverage"
          value={`${metrics.coverage_pct}%`}
          unit=""
          subValue={`${metrics.matched_intervals} of ${metrics.total_intervals} half-hours`}
          badge={{
            text: 'Hourly WINDFOR Match',
            variant: metrics.coverage_pct >= 50 ? 'success' : 'warning'
          }}
          tooltip="Matched intervals divided by expected settlement half-hours. Hourly forecast stream yields 50% coverage for 48 half-hourly periods"
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
        />

        <MetricCard
          label="Potential Wind Shortfall"
          value={metrics.total_shortfall_mwh.toLocaleString()}
          unit="MWh"
          subValue={`Surplus Volume: ${metrics.total_surplus_mwh.toLocaleString()} MWh`}
          badge={{
            text: metrics.total_shortfall_mwh > 0 ? 'Procurement Exposure' : 'Zero Shortfall',
            variant: metrics.total_shortfall_mwh > 0 ? 'danger' : 'neutral'
          }}
          tooltip="Total volume where actual generation fell short of the decision-time forecast"
          icon={<ShieldAlert className="w-5 h-5 text-rose-600" />}
        />
      </div>

      {/* Procurement Insights Panel */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl p-6 shadow-sm border border-slate-700/80">
        <div className="flex items-start space-x-3">
          <div className="w-9 h-9 rounded-lg bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400 shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div className="space-y-3">
            <div>
              <h2 className="text-base font-bold tracking-tight text-white flex items-center space-x-2">
                <span>Procurement-Relevant Exposure & Volume Analysis</span>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 bg-teal-500/20 text-teal-300 border border-teal-500/30 rounded">
                  Analytical Insight
                </span>
              </h2>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Retrospective quantification of generation divergence based on forecasts locked at the decision deadline ({cutoffType === 'day_ahead' ? 'Day-Ahead D-1' : 'Same-Day D-0'} at {cutoffTime} UK local time).
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div className="bg-slate-800/80 border border-slate-700 rounded-lg p-3.5">
                <div className="text-xs font-semibold text-rose-300 flex items-center space-x-1.5">
                  <ArrowDownRight className="w-4 h-4" />
                  <span>Wind Shortfall Exposure (Undergeneration)</span>
                </div>
                <div className="text-xl font-bold text-white mt-1">
                  {metrics.total_shortfall_mwh.toLocaleString()} <span className="text-xs font-normal text-slate-400">MWh total across {metrics.underestimation_count} intervals</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  When actual wind generation is lower than forecast, the utility is exposed to cash-out imbalance charges or must dispatch expensive peaking reserves in the intraday market.
                </p>
              </div>

              <div className="bg-slate-800/80 border border-slate-700 rounded-lg p-3.5">
                <div className="text-xs font-semibold text-teal-300 flex items-center space-x-1.5">
                  <ArrowUpRight className="w-4 h-4" />
                  <span>Wind Surplus Volume (Overgeneration)</span>
                </div>
                <div className="text-xl font-bold text-white mt-1">
                  {metrics.total_surplus_mwh.toLocaleString()} <span className="text-xs font-normal text-slate-400">MWh total across {metrics.overestimation_count} intervals</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  When actual generation exceeds day-ahead procurement, the utility holds excess position, which may be sold into the intraday market or settled at the system sell price.
                </p>
              </div>
            </div>

            {/* Regulatory Disclaimer */}
            <div className="text-[11px] text-slate-400 bg-slate-950/40 p-2.5 rounded border border-slate-700/60 flex items-start space-x-2">
              <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <span>
                <strong>Methodological Disclaimer:</strong> This panel provides retrospective volume comparison between National Grid forecasts and delivered actuals. It does not represent a complete procurement strategy or trading recommendation, as consumer demand, wholesale contract prices, thermal/hydro generation stacks, and reserve margins are outside this dataset's scope.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Chart: Generation Profile */}
      <GenerationChart data={intervals} />

      {/* Secondary Chart: Error Bar Profile */}
      <ForecastErrorChart data={intervals} />

      {/* Daily Summary Table */}
      <DailySummaryTable data={daily_summary} />
    </div>
  );
};
