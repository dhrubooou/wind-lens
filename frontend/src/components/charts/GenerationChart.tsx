import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';
import { IntervalRecord } from '../../types';

interface GenerationChartProps {
  data: IntervalRecord[];
  title?: string;
}

export const GenerationChart: React.FC<GenerationChartProps> = ({
  data,
  title = 'Wind Generation: Actual vs Day-Ahead Decision Forecast'
}) => {
  const chartData = data.map((d) => {
    const dt = new Date(d.start_time);
    const dateLabel = `${(dt.getUTCMonth() + 1).toString().padStart(2, '0')}/${dt.getUTCDate().toString().padStart(2, '0')} ${dt.getUTCHours().toString().padStart(2, '0')}:${dt.getUTCMinutes().toString().padStart(2, '0')}`;
    
    return {
      raw_time: d.start_time,
      timeLabel: dateLabel,
      period: d.settlement_period,
      actual: d.actual_generation_mw,
      forecast: d.forecast_generation_mw,
      error: d.error_mw,
      shortfall: d.shortfall_mw,
    };
  });

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white p-3 rounded-lg shadow-xl border border-slate-700 text-xs space-y-1.5 z-50">
          <div className="font-semibold text-slate-300 border-b border-slate-700 pb-1">
            {item.timeLabel} UTC (Period {item.period})
          </div>
          <div className="flex justify-between space-x-4">
            <span className="text-slate-400">Actual Generation:</span>
            <span className="font-bold text-white">{item.actual?.toLocaleString()} MW</span>
          </div>
          <div className="flex justify-between space-x-4">
            <span className="text-teal-400">Decision Forecast:</span>
            <span className="font-bold text-teal-300">
              {item.forecast !== null ? `${item.forecast.toLocaleString()} MW` : 'Missing / Unmatched'}
            </span>
          </div>
          {item.error !== null && (
            <div className="flex justify-between space-x-4 pt-1 border-t border-slate-800">
              <span className="text-slate-400">Forecast Error:</span>
              <span className={`font-bold ${item.error >= 0 ? 'text-teal-300' : 'text-rose-400'}`}>
                {item.error > 0 ? `+${item.error.toLocaleString()}` : item.error.toLocaleString()} MW
              </span>
            </div>
          )}
          {item.shortfall > 0 && (
            <div className="flex justify-between space-x-4 text-rose-300">
              <span>Potential Shortfall:</span>
              <span className="font-bold">+{item.shortfall.toLocaleString()} MW</span>
            </div>
          )}
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
          <p className="text-xs text-slate-500">National UK wind generation (Elexon BMRS FUELHH vs WINDFOR)</p>
        </div>
        <div className="flex items-center space-x-4 text-xs">
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-full bg-slate-700 inline-block"></span>
            <span className="text-slate-600 font-medium">Actual (FUELHH)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-full bg-teal-500 inline-block"></span>
            <span className="text-teal-700 font-medium">Decision Forecast (WINDFOR)</span>
          </div>
        </div>
      </div>

      <div className="h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
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
            
            <Area
              type="monotone"
              dataKey="actual"
              name="Actual Generation (MW)"
              fill="#f1f5f9"
              stroke="#334155"
              strokeWidth={2}
              dot={false}
            />
            
            <Line
              type="monotone"
              dataKey="forecast"
              name="Decision Forecast (MW)"
              stroke="#0d9488"
              strokeWidth={2.5}
              dot={false}
              connectNulls={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
