import React, { useState, useEffect } from 'react';
import { 
  TrendingUp
} from 'lucide-react';
import { api } from '../services/api';
import { ForecastEvolutionResponse } from '../types';
import { ForecastEvolutionChart } from '../components/charts/ForecastEvolutionChart';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';

export const ForecastEvolutionView: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState('2026-01-05');
  const [selectedHour, setSelectedHour] = useState('12:00');
  const [data, setData] = useState<ForecastEvolutionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const targetStartTime = `${selectedDate}T${selectedHour}:00Z`;

  const fetchEvolution = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getForecastEvolution(targetStartTime);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch forecast evolution');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvolution();
  }, [selectedDate, selectedHour]);

  const hoursList = [
    '00:00', '01:00', '02:00', '03:00', '04:00', '05:00',
    '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
    '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
    '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-start space-x-3">
          <div className="w-10 h-10 rounded-lg bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Forecast Evolution & Convergence Analysis</h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Track how forecasts published by National Grid / Elexon evolved as newer weather model runs and telemetry became available leading up to delivery.
            </p>
          </div>
        </div>
      </div>

      {/* Target Delivery Interval Selector */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Target Delivery Interval
          </h3>
          <p className="text-xs text-slate-600 mt-0.5">
            Select the specific half-hour interval to inspect all published historical forecast vintages
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
          <div>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <div className="flex items-center space-x-1.5 mt-1 text-[11px]">
              <span className="text-slate-400">Quick:</span>
              <button
                type="button"
                onClick={() => setSelectedDate('2026-10-24')}
                className="text-emerald-700 hover:underline font-medium"
              >
                ⚡ Oct 24
              </button>
              <span className="text-slate-300">•</span>
              <button
                type="button"
                onClick={() => setSelectedDate('2026-10-23')}
                className="text-emerald-700 hover:underline font-medium"
              >
                ⚡ Oct 23
              </button>
              <span className="text-slate-300">•</span>
              <button
                type="button"
                onClick={() => setSelectedDate('2026-01-05')}
                className="text-slate-600 hover:underline font-medium"
              >
                📁 Jan 5
              </button>
            </div>
          </div>
          <div>
            <select
              value={selectedHour}
              onChange={(e) => setSelectedHour(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {hoursList.map((h) => (
                <option key={h} value={h}>
                  {h} UTC
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <LoadingState message="Fetching all historical forecast vintages for interval..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchEvolution} />
      ) : data ? (
        <div className="space-y-6">
          {/* Summary Banner */}
          <div className="bg-slate-900 text-white rounded-xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-semibold text-teal-400 uppercase tracking-wider">
                Target Interval
              </span>
              <div className="text-lg font-bold text-white font-mono mt-0.5">
                {data.start_time} (Period {data.settlement_period ?? '—'})
              </div>
            </div>

            <div className="flex items-center space-x-6 text-xs">
              <div>
                <span className="text-slate-400">Published Vintages:</span>
                <span className="ml-2 font-bold text-teal-300">{data.total_vintages} runs</span>
              </div>
              <div className="border-l border-slate-700 pl-6">
                <span className="text-slate-400">Delivered Actual:</span>
                <span className="ml-2 font-bold text-white">
                  {data.actual_generation_mw !== null ? `${data.actual_generation_mw.toLocaleString()} MW` : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Evolution Chart */}
          <ForecastEvolutionChart
            vintages={data.vintages}
            actualGeneration={data.actual_generation_mw}
            startTime={data.start_time}
          />

          {/* Vintages Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Successive Vintage Table</h2>
                <p className="text-xs text-slate-500">Every published forecast vintage ordered chronologically</p>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                {data.vintages.length} Vintages
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Publication Timestamp (UTC)</th>
                    <th className="py-3 px-4 text-center">Lead Time to Delivery</th>
                    <th className="py-3 px-4 text-right">Forecast Generation (MW)</th>
                    <th className="py-3 px-4 text-right">Actual Delivered (MW)</th>
                    <th className="py-3 px-4 text-right">Reconciled Error (MW)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {data.vintages.map((v) => {
                    const isOver = (v.error_mw || 0) > 0;
                    return (
                      <tr key={v.publish_time} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-2.5 px-4 font-mono font-medium text-slate-900">
                          {v.publish_time}
                        </td>
                        <td className="py-2.5 px-4 text-center font-medium text-slate-600">
                          {v.lead_time_hours} hours prior
                        </td>
                        <td className="py-2.5 px-4 text-right font-semibold text-teal-700">
                          {v.forecast_generation_mw.toLocaleString()} MW
                        </td>
                        <td className="py-2.5 px-4 text-right text-slate-600 font-medium">
                          {v.actual_generation_mw !== null ? `${v.actual_generation_mw.toLocaleString()} MW` : '—'}
                        </td>
                        <td className={`py-2.5 px-4 text-right font-semibold ${isOver ? 'text-teal-600' : 'text-rose-600'}`}>
                          {v.error_mw !== null ? (isOver ? `+${v.error_mw.toLocaleString()} MW` : `${v.error_mw.toLocaleString()} MW`) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
