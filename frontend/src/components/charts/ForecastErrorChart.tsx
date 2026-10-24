import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell
} from 'recharts';
import { IntervalRecord } from '../../types';

interface ForecastErrorChartProps {
  data: IntervalRecord[];
  title?: string;
}

export const ForecastErrorChart: React.FC<ForecastErrorChartProps> = ({
  data,
  title = 'Forecast Error Profile (forecast_mw - actual_mw)'
}) => {
  const chartData = data
    .filter((d) => d.is_matched && d.error_mw !== null)
    .map((d) => {
      const dt = new Date(d.start_time);
      const dateLabel = `${(dt.getUTCMonth() + 1).toString().padStart(2, '0')}/${dt.getUTCDate().toString().padStart(2, '0')} ${dt.getUTCHours().toString().padStart(2, '0')}:${dt.getUTCMinutes().toString().padStart(2, '0')}`;
      
      return {
        timeLabel: dateLabel,
        period: d.settlement_period,
        error: d.error_mw as number,
        actual: d.actual_generation_mw,
        forecast: d.forecast_generation_mw,
      };
    });

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      const isOver = item.error >= 0;
      return (
        <div className="bg-slate-900 text-white p-3 rounded-lg shadow-xl border border-slate-700 text-xs space-y-1.5 z-50">
          <div className="font-semibold text-slate-300 border-b border-slate-700 pb-1">
            {item.timeLabel} UTC (Period {item.period})
          </div>
          <div className="flex justify-between space-x-4">
            <span className="text-slate-400">Error:</span>
            <span className={`font-bold ${isOver ? 'text-teal-400' : 'text-rose-400'}`}>
              {isOver ? `+${item.error.toLocaleString()}` : item.error.toLocaleString()} MW
            </span>
          </div>
          <div className="text-[11px] text-slate-400">
            {isOver ? 'Overforecast (Surplus generation assumed)' : 'Underforecast (Procurement shortfall risk)'}
          </div>
          <div className="flex justify-between space-x-4 pt-1 border-t border-slate-800 text-slate-300">
            <span>Actual / Forecast:</span>
            <span>{item.actual?.toLocaleString()} / {item.forecast?.toLocaleString()} MW</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-2 border-b border-slate-100 gap-2">
        <div>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">{title}</h2>
          <p className="text-xs text-slate-500">
            Positive = Overestimation (+MW) | Negative = Underestimation (-MW)
          </p>
        </div>
        <div className="flex items-center space-x-4 text-xs">
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-full bg-teal-500 inline-block"></span>
            <span className="text-slate-600 font-medium">Overestimation</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500 inline-block"></span>
            <span className="text-slate-600 font-medium">Underestimation</span>
          </div>
        </div>
      </div>

      <div className="h-64 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="timeLabel"
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1' }}
              interval="preserveStartEnd"
              minTickGap={40}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1' }}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1.5} />
            <Bar dataKey="error" radius={[2, 2, 2, 2]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.error >= 0 ? '#14b8a6' : '#f43f5e'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
