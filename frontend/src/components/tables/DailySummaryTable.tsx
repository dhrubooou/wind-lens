import React from 'react';
import { DailySummary } from '../../types';

interface DailySummaryTableProps {
  data: DailySummary[];
}

export const DailySummaryTable: React.FC<DailySummaryTableProps> = ({ data }) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">Daily Performance Summary</h2>
          <p className="text-xs text-slate-500">Aggregated energy volumes and procurement error metrics by settlement date</p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md">
          {data.length} Days
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50/75 text-slate-600 font-semibold border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">Settlement Date</th>
              <th className="py-3 px-4 text-center">Intervals Matched</th>
              <th className="py-3 px-4 text-center">Coverage</th>
              <th className="py-3 px-4 text-right">Actual Energy</th>
              <th className="py-3 px-4 text-right">Forecast Energy</th>
              <th className="py-3 px-4 text-right">MAE (MW)</th>
              <th className="py-3 px-4 text-right">RMSE (MW)</th>
              <th className="py-3 px-4 text-right">Mean Error (MW)</th>
              <th className="py-3 px-4 text-right">Shortfall (MWh)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {data.map((row) => {
              const isOver = (row.mean_error_mw || 0) > 0;
              return (
                <tr key={row.settlement_date} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 px-4 font-semibold text-slate-900">{row.settlement_date}</td>
                  <td className="py-3 px-4 text-center text-slate-600">
                    {row.matched_intervals} / {row.total_intervals}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700">
                      {row.coverage_pct}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-medium">
                    {row.actual_mwh.toLocaleString()} MWh
                  </td>
                  <td className="py-3 px-4 text-right font-medium text-teal-700">
                    {row.forecast_mwh !== null ? `${row.forecast_mwh.toLocaleString()} MWh` : '—'}
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-slate-900">
                    {row.mae_mw !== null ? `${row.mae_mw.toLocaleString()} MW` : '—'}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-600">
                    {row.rmse_mw !== null ? `${row.rmse_mw.toLocaleString()} MW` : '—'}
                  </td>
                  <td className={`py-3 px-4 text-right font-medium ${isOver ? 'text-teal-600' : 'text-rose-600'}`}>
                    {row.mean_error_mw !== null ? (
                      isOver ? `+${row.mean_error_mw.toLocaleString()} MW` : `${row.mean_error_mw.toLocaleString()} MW`
                    ) : '—'}
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-rose-600">
                    {row.shortfall_mwh !== null ? `${row.shortfall_mwh.toLocaleString()} MWh` : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
