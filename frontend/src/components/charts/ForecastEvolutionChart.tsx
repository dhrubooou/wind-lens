import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine
} from 'recharts';
import { ForecastVintage } from '../../types';

interface ForecastEvolutionChartProps {
  vintages: ForecastVintage[];
  actualGeneration: number | null;
  startTime: string;
}

export const ForecastEvolutionChart: React.FC<ForecastEvolutionChartProps> = ({
  vintages,
  actualGeneration,
  startTime
}) => {
  const chartData = vintages.map((v) => {
    const dt = new Date(v.publish_time);
    const pubLabel = `${(dt.getUTCMonth() + 1).toString().padStart(2, '0')}/${dt.getUTCDate().toString().padStart(2, '0')} ${dt.getUTCHours().toString().padStart(2, '0')}:${dt.getUTCMinutes().toString().padStart(2, '0')}`;
    
    return {
      raw_time: v.publish_time,
      pubLabel,
      leadTime: v.lead_time_hours,
      forecast: v.forecast_generation_mw,
      error: v.error_mw,
      actual: actualGeneration
    };
  });

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white p-3 rounded-lg shadow-xl border border-slate-700 text-xs space-y-1.5 z-50">
          <div className="font-semibold text-slate-300 border-b border-slate-700 pb-1">
            Published: {item.pubLabel} UTC ({item.leadTime}h prior to delivery)
          </div>
          <div className="flex justify-between space-x-4">
            <span className="text-teal-400">Forecast Vintage:</span>
            <span className="font-bold text-white">{item.forecast?.toLocaleString()} MW</span>
          </div>
          {item.actual !== null && (
            <div className="flex justify-between space-x-4">
              <span className="text-slate-400">Actual Delivered:</span>
              <span className="font-bold text-slate-300">{item.actual?.toLocaleString()} MW</span>
            </div>
          )}
          {item.error !== null && (
            <div className="flex justify-between space-x-4 pt-1 border-t border-slate-800">
              <span className="text-slate-400">Error:</span>
              <span className={`font-bold ${item.error >= 0 ? 'text-teal-400' : 'text-rose-400'}`}>
                {item.error > 0 ? `+${item.error.toLocaleString()}` : item.error.toLocaleString()} MW
              </span>
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
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">Successive Forecast Vintage Convergence</h2>
          <p className="text-xs text-slate-500">
            Chronological progression of forecasts published for delivery interval {startTime}
          </p>
        </div>
        <div className="flex items-center space-x-4 text-xs">
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-full bg-teal-500 inline-block"></span>
            <span className="text-slate-600 font-medium">Forecast Vintages</span>
          </div>
          {actualGeneration !== null && (
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-0.5 bg-slate-900 inline-block"></span>
              <span className="text-slate-900 font-medium">Delivered Actual ({actualGeneration.toLocaleString()} MW)</span>
            </div>
          )}
        </div>
      </div>

      <div className="h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 15, right: 15, left: -15, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="pubLabel"
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1' }}
              label={{ value: 'Publication Timestamp (UTC)', position: 'insideBottom', offset: -5, fontSize: 10, fill: '#94a3b8' }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1' }}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            
            {actualGeneration !== null && (
              <ReferenceLine
                y={actualGeneration}
                stroke="#1e293b"
                strokeDasharray="4 4"
                strokeWidth={2}
                label={{
                  value: `Delivered Actual: ${actualGeneration.toLocaleString()} MW`,
                  position: 'insideTopRight',
                  fill: '#1e293b',
                  fontSize: 11,
                  fontWeight: 600
                }}
              />
            )}

            <Line
              type="monotone"
              dataKey="forecast"
              stroke="#0d9488"
              strokeWidth={2.5}
              dot={{ r: 4, fill: '#0d9488', stroke: '#fff', strokeWidth: 1.5 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
