import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell
} from 'recharts';
import { ErrorDistributionBin } from '../../types';

interface ErrorDistributionChartProps {
  distribution: ErrorDistributionBin[];
}

export const ErrorDistributionChart: React.FC<ErrorDistributionChartProps> = ({ distribution }) => {
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white p-3 rounded-lg shadow-xl border border-slate-700 text-xs space-y-1 z-50">
          <div className="font-semibold text-slate-300 border-b border-slate-700 pb-1">
            Range: {item.bin_label}
          </div>
          <div className="flex justify-between space-x-4">
            <span className="text-slate-400">Interval Count:</span>
            <span className="font-bold text-white">{item.count} intervals</span>
          </div>
          <div className="flex justify-between space-x-4">
            <span className="text-teal-400">Share of Observations:</span>
            <span className="font-bold text-teal-300">{item.percentage}%</span>
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
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">Forecast Error Distribution</h2>
          <p className="text-xs text-slate-500">
            Frequency distribution of half-hourly forecast errors (MW bins)
          </p>
        </div>
      </div>

      <div className="h-64 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={distribution} margin={{ top: 10, right: 10, left: -15, bottom: 25 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="bin_label"
              tick={{ fontSize: 10, fill: '#64748b' }}
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1' }}
              interval={0}
              angle={-25}
              textAnchor="end"
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {distribution.map((entry, index) => {
                const isUnder = entry.bin_max <= 0;
                const isExact = entry.bin_min <= 0 && entry.bin_max >= 0;
                let color = '#14b8a6';
                if (isUnder) color = '#f43f5e';
                if (isExact) color = '#0f766e';
                return <Cell key={`dist-cell-${index}`} fill={color} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
