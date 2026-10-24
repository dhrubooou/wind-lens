import React from 'react';

interface MetricCardProps {
  label: string;
  value: string | number | null;
  unit?: string;
  subValue?: string;
  badge?: {
    text: string;
    variant: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
  };
  tooltip?: string;
  icon?: React.ReactNode;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  unit,
  subValue,
  badge,
  tooltip,
  icon
}) => {
  const badgeClasses = {
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    info: 'bg-teal-50 text-teal-700 border-teal-200',
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs hover:border-slate-300 transition-all">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider" title={tooltip}>
          {label}
        </span>
        {icon && <span className="text-slate-400">{icon}</span>}
      </div>

      <div className="flex items-baseline space-x-2">
        <span className="text-2xl font-bold text-slate-900 tracking-tight">
          {value !== null && value !== undefined ? value : '—'}
        </span>
        {unit && <span className="text-sm font-semibold text-slate-500">{unit}</span>}
      </div>

      {(subValue || badge) && (
        <div className="mt-3 flex items-center justify-between text-xs">
          {subValue && <span className="text-slate-500">{subValue}</span>}
          {badge && (
            <span className={`px-2 py-0.5 rounded-full border text-[11px] font-medium ml-auto ${badgeClasses[badge.variant]}`}>
              {badge.text}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
