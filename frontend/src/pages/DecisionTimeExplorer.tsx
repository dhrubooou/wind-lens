import React, { useState, useEffect } from 'react';
import { 
  Crosshair, 
  ShieldCheck
} from 'lucide-react';
import { api } from '../services/api';
import { DecisionTimeForecastResponse } from '../types';
import { MetricCard } from '../components/common/MetricCard';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';

export const DecisionTimeExplorer: React.FC = () => {
  const [deliveryDate, setDeliveryDate] = useState('2026-01-05');
  const [period, setPeriod] = useState<number>(25); // Period 25 = 12:00-12:30
  const [cutoffTime, setCutoffTime] = useState('12:00');
  const [cutoffType, setCutoffType] = useState('day_ahead');
  const [customCutoff, setCustomCutoff] = useState('');
  const [data, setData] = useState<DecisionTimeForecastResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchForecast = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getDecisionTimeForecast({
        deliveryDate,
        settlementPeriod: period,
        cutoffTime,
        cutoffType,
        customCutoff: customCutoff ? customCutoff : undefined
      });
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch decision-time forecast');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForecast();
  }, [deliveryDate, period, cutoffTime, cutoffType, customCutoff]);

  const getNominalIntervalTime = (p: number) => {
    const totalMinutes = (p - 1) * 30;
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    const endMinutes = totalMinutes + 30;
    const eh = Math.floor(endMinutes / 60);
    const em = endMinutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} – ${eh.toString().padStart(2, '0')}:${em.toString().padStart(2, '0')} UTC`;
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-start space-x-3">
          <div className="w-10 h-10 rounded-lg bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center shrink-0">
            <Crosshair className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Decision-Time Forecast Explorer</h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Examine exactly which wind forecast vintage was available to the procurement team prior to the decision cutoff.
              Inspect publication lead times, avoid look-ahead bias, and review post-delivery reconciliation.
            </p>
          </div>
        </div>
      </div>

      {/* Control Panel: Date, Interval, Cutoff */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Inspection Parameters
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Delivery Date Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              1. Delivery Date (January 2026)
            </label>
            <input
              type="date"
              min="2026-01-01"
              max="2026-01-31"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Settlement Period Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              2. Settlement Period (1 to 48)
            </label>
            <select
              value={period}
              onChange={(e) => setPeriod(parseInt(e.target.value))}
              className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {Array.from({ length: 48 }, (_, i) => i + 1).map((p) => (
                <option key={p} value={p}>
                  Period {p} ({getNominalIntervalTime(p)})
                </option>
              ))}
            </select>
          </div>

          {/* Decision Cutoff Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              3. Procurement Decision Cutoff
            </label>
            <select
              value={`${cutoffType}_${cutoffTime}`}
              onChange={(e) => {
                const [type, time] = e.target.value.split('_');
                setCutoffType(type);
                setCutoffTime(time);
                setCustomCutoff('');
              }}
              className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="day_ahead_12:00">Day-Ahead D-1 12:00 (Default Assumption)</option>
              <option value="day_ahead_17:00">Day-Ahead D-1 17:00 (Close of Business)</option>
              <option value="same_day_06:00">Same-Day D-0 06:00 (Intraday Morning)</option>
              <option value="same_day_10:00">Same-Day D-0 10:00 (Mid-day Review)</option>
            </select>
          </div>
        </div>

        {/* Custom Override Option */}
        <div className="pt-2 border-t border-slate-100 flex items-center space-x-3 text-xs text-slate-600">
          <span className="font-semibold text-slate-700">Custom Cutoff ISO Override:</span>
          <input
            type="text"
            placeholder="e.g. 2026-01-04T12:00:00Z"
            value={customCutoff}
            onChange={(e) => setCustomCutoff(e.target.value)}
            className="flex-1 max-w-xs text-xs font-mono bg-slate-50 border border-slate-200 rounded px-2.5 py-1 text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
          {customCutoff && (
            <button
              onClick={() => setCustomCutoff('')}
              className="text-[11px] text-slate-400 hover:text-slate-600 underline"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Results Section */}
      {loading ? (
        <LoadingState message="Looking up eligible forecast vintage..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchForecast} />
      ) : data ? (
        <div className="space-y-6">
          {/* Prominent Publication Timestamp Banner */}
          <div className="bg-slate-900 text-white rounded-xl p-6 shadow-md border border-slate-800">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-4">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-teal-400">
                  Target Settlement Interval
                </span>
                <div className="text-xl font-bold text-white mt-0.5">
                  {deliveryDate} — Period {period} ({getNominalIntervalTime(period)})
                </div>
                <div className="text-xs text-slate-400 font-mono mt-0.5">
                  Interval Start: {data.start_time}
                </div>
              </div>

              <div className="text-left md:text-right">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Configured Cutoff Boundary
                </span>
                <div className="text-sm font-semibold text-teal-300 font-mono mt-0.5">
                  {data.applied_cutoff_utc}
                </div>
                <div className="text-xs text-slate-400">
                  {cutoffType === 'day_ahead' ? 'Day-Ahead D-1' : 'Same-Day D-0'} at {cutoffTime} Europe/London
                </div>
              </div>
            </div>

            {/* Explanation & Lead Time Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="bg-slate-800/80 p-3.5 rounded-lg border border-slate-700">
                <div className="text-slate-400 font-medium">Forecast Publication Time</div>
                <div className="text-base font-bold text-white mt-1 font-mono">
                  {data.forecast_publish_time || 'None Before Cutoff'}
                </div>
                <div className="text-[11px] text-teal-400 mt-1">
                  {data.lead_time_hours !== null ? `${data.lead_time_hours} hours prior to delivery` : 'N/A'}
                </div>
              </div>

              <div className="bg-slate-800/80 p-3.5 rounded-lg border border-slate-700">
                <div className="text-slate-400 font-medium">Eligible Forecast Volume</div>
                <div className="text-base font-bold text-teal-300 mt-1">
                  {data.latest_eligible_forecast_mw !== null ? `${data.latest_eligible_forecast_mw.toLocaleString()} MW` : 'No Match'}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Selected latest vintage with publishTime ≤ cutoff
                </div>
              </div>

              <div className="bg-slate-800/80 p-3.5 rounded-lg border border-slate-700">
                <div className="text-slate-400 font-medium">Delivered Actual Generation</div>
                <div className="text-base font-bold text-white mt-1">
                  {data.actual_generation_mw !== null ? `${data.actual_generation_mw.toLocaleString()} MW` : 'Pending'}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Elexon BMRS FUELHH Wind Actual
                </div>
              </div>
            </div>

            {/* Verification explanation banner */}
            <div className="mt-4 pt-3 border-t border-slate-800/80 text-xs text-slate-300 flex items-start space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>Selection Audit:</strong> {data.explanation}
              </span>
            </div>
          </div>

          {/* Variance Metrics */}
          {data.is_eligible_forecast_found && data.actual_generation_mw !== null && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <MetricCard
                label="Forecast Error (MW)"
                value={data.error_mw !== null ? (data.error_mw > 0 ? `+${data.error_mw.toLocaleString()}` : data.error_mw.toLocaleString()) : '—'}
                unit="MW"
                subValue={data.error_mw && data.error_mw > 0 ? 'Overestimation' : 'Underestimation'}
                badge={{
                  text: (data.error_mw || 0) >= 0 ? 'Overforecast' : 'Underforecast',
                  variant: (data.error_mw || 0) >= 0 ? 'warning' : 'danger'
                }}
                tooltip="forecast_generation_mw - actual_generation_mw"
              />

              <MetricCard
                label="Procurement Shortfall"
                value={data.shortfall_mw !== null ? `+${data.shortfall_mw.toLocaleString()}` : '0'}
                unit="MW"
                subValue="max(actual - forecast, 0)"
                badge={{
                  text: (data.shortfall_mw || 0) > 0 ? 'Exposure' : 'Zero Shortfall',
                  variant: (data.shortfall_mw || 0) > 0 ? 'danger' : 'success'
                }}
                tooltip="Positive shortfall means wind was lower than purchased volume"
              />

              <MetricCard
                label="Surplus Generation"
                value={data.surplus_mw !== null ? `+${data.surplus_mw.toLocaleString()}` : '0'}
                unit="MW"
                subValue="max(forecast - actual, 0)"
                badge={{
                  text: (data.surplus_mw || 0) > 0 ? 'Surplus' : 'None',
                  variant: 'info'
                }}
                tooltip="Positive surplus means wind exceeded procurement forecast"
              />
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};
