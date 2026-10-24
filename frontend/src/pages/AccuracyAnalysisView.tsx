import React, { useState, useEffect } from 'react';
import { 
  Target, 
  TrendingUp, 
  CheckCircle2, 
  HelpCircle,
  Sliders
} from 'lucide-react';
import { api } from '../services/api';
import { AccuracyResponse } from '../types';
import { MetricCard } from '../components/common/MetricCard';
import { CutoffSelector } from '../components/common/CutoffSelector';
import { ErrorDistributionChart } from '../components/charts/ErrorDistributionChart';
import { IntervalDataTable } from '../components/tables/IntervalDataTable';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { EmptyState } from '../components/common/EmptyState';

interface AccuracyAnalysisViewProps {
  startDate: string;
  endDate: string;
  cutoffTime: string;
  cutoffType: string;
  onCutoffChange: (time: string, type: string) => void;
  refreshKey?: number;
}

export const AccuracyAnalysisView: React.FC<AccuracyAnalysisViewProps> = ({
  startDate,
  endDate,
  cutoffTime,
  cutoffType,
  onCutoffChange,
  refreshKey = 0
}) => {
  const [data, setData] = useState<AccuracyResponse | null>(null);
  const [binWidth, setBinWidth] = useState<number>(500);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAccuracy = async (force = false) => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getAccuracy({
        startDate,
        endDate,
        cutoffTime,
        cutoffType,
        binWidth,
        forceRefresh: force
      });
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch accuracy analysis');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccuracy(refreshKey > 0);
  }, [startDate, endDate, cutoffTime, cutoffType, binWidth, refreshKey]);

  if (loading) return <LoadingState message={`Computing statistical accuracy metrics for ${startDate} to ${endDate}...`} />;
  if (error) return <ErrorState message={error} onRetry={() => fetchAccuracy(true)} />;
  if (!data) return null;

  const { metrics, distribution, detailed_intervals, notes } = data;

  if (detailed_intervals.length === 0) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <CutoffSelector
          cutoffTime={cutoffTime}
          cutoffType={cutoffType}
          onCutoffChange={onCutoffChange}
        />
        <EmptyState
          title="No Accuracy Intervals Found"
          description={`No recorded half-hourly wind generation intervals exist for ${startDate} to ${endDate}. Try selecting recent live dates or the benchmark dataset.`}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Cutoff Selector */}
      <CutoffSelector
        cutoffTime={cutoffTime}
        cutoffType={cutoffType}
        onCutoffChange={onCutoffChange}
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Mean Absolute Error (MAE)"
          value={metrics.mae_mw?.toLocaleString() ?? '—'}
          unit="MW"
          subValue={`RMSE: ${metrics.rmse_mw?.toLocaleString() ?? '—'} MW`}
          badge={{ text: 'Primary Metric', variant: 'info' }}
          tooltip="MAE measures magnitude of forecast variance without direction"
          icon={<Target className="w-5 h-5 text-teal-600" />}
        />

        <MetricCard
          label="Mean Forecast Error (Bias)"
          value={metrics.mean_error_mw !== null ? `${metrics.mean_error_mw > 0 ? '+' : ''}${metrics.mean_error_mw.toLocaleString()}` : '—'}
          unit="MW"
          subValue={`${metrics.bias_direction} direction`}
          badge={{
            text: metrics.bias_direction,
            variant: metrics.bias_direction === 'OVERESTIMATION' ? 'warning' : 'danger'
          }}
          tooltip="Mean error indicates systematic tendency to over- or under-forecast"
          icon={<TrendingUp className="w-5 h-5 text-slate-600" />}
        />

        <MetricCard
          label="Over vs Under Count"
          value={`${metrics.overestimation_count} / ${metrics.underestimation_count}`}
          unit=""
          subValue={`${metrics.exact_count} exact matches`}
          badge={{
            text: `${Math.round((metrics.overestimation_count / (metrics.matched_intervals || 1)) * 100)}% Overforecast`,
            variant: 'neutral'
          }}
          tooltip="Intervals where forecast > actual vs forecast < actual"
          icon={<Sliders className="w-5 h-5 text-slate-600" />}
        />

        <MetricCard
          label="Matched Interval Coverage"
          value={`${metrics.coverage_pct}%`}
          unit=""
          subValue={`${metrics.matched_intervals} of ${metrics.total_intervals} half-hours`}
          badge={{ text: 'Explicit Missing Policy', variant: 'success' }}
          tooltip="Unmatched intervals are strictly excluded from error calculations"
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
        />
      </div>

      {/* Methodology & Policy Alert Box */}
      <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-5 text-xs text-amber-900 space-y-2">
        <div className="flex items-center space-x-2 font-bold text-amber-950">
          <HelpCircle className="w-4 h-4 text-amber-700" />
          <span>Evaluation Methodology & Missing Data Policies</span>
        </div>
        <ul className="list-disc list-inside space-y-1 text-amber-800 leading-relaxed pl-1">
          {notes.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      </div>

      {/* Error Distribution Histogram */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Histogram Binning Control
          </span>
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-600 font-medium">Bin Width:</span>
            {[250, 500, 1000].map((bw) => (
              <button
                key={bw}
                onClick={() => setBinWidth(bw)}
                className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                  binWidth === bw
                    ? 'bg-teal-600 text-white border-teal-600 font-semibold'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                {bw} MW
              </button>
            ))}
          </div>
        </div>
        <ErrorDistributionChart distribution={distribution} />
      </div>

      {/* Granular Interval Error Table */}
      <IntervalDataTable intervals={detailed_intervals} />
    </div>
  );
};
