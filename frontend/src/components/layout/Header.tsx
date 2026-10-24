import React from 'react';
import { Calendar, Zap } from 'lucide-react';
import { PageId } from '../../types';

interface HeaderProps {
  currentPage: PageId;
  startDate: string;
  endDate: string;
  cutoffTime: string;
  cutoffType: string;
  onDatePresetSelect: (start: string, end: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentPage,
  startDate,
  endDate,
  cutoffTime,
  cutoffType,
  onDatePresetSelect
}) => {
  const titles: Record<PageId, { title: string; subtitle: string }> = {
    dashboard: {
      title: 'Executive Procurement Dashboard',
      subtitle: 'Day-ahead wind forecast performance, volume exposures, and error metrics'
    },
    'decision-explorer': {
      title: 'Decision-Time Forecast Explorer',
      subtitle: 'Inspect eligible forecast vintages available prior to specific procurement cutoffs'
    },
    evolution: {
      title: 'Forecast Evolution Analysis',
      subtitle: 'Track convergence of forecast vintages for specific settlement intervals approaching delivery'
    },
    accuracy: {
      title: 'Forecast Accuracy & Error Distribution',
      subtitle: 'Comprehensive error metrics (MAE, RMSE, bias), histogram spread, and interval breakdown'
    },
    'data-status': {
      title: 'Data Quality & Source Provenance',
      subtitle: 'Elexon BMRS API integration telemetry, observation counts, and sync status'
    }
  };

  const currentInfo = titles[currentPage] || { title: 'WindLens Analytics', subtitle: '' };

  const presets = [
    { label: 'Jan 1–7 (W1)', start: '2026-01-01', end: '2026-01-07' },
    { label: 'Jan 8–14 (W2)', start: '2026-01-08', end: '2026-01-14' },
    { label: 'Jan 15–21 (W3)', start: '2026-01-15', end: '2026-01-21' },
    { label: 'Jan 22–31 (W4)', start: '2026-01-22', end: '2026-01-31' },
    { label: 'Full Month', start: '2026-01-01', end: '2026-01-31' },
  ];

  return (
    <header className="bg-white border-b border-slate-200 px-8 py-4.5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 sticky top-0 z-20 shadow-xs">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
          <span>{currentInfo.title}</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">{currentInfo.subtitle}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Preset date buttons */}
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
          <Calendar className="w-3.5 h-3.5 text-slate-500 ml-1.5 mr-0.5" />
          {presets.map((p) => {
            const isSelected = startDate === p.start && endDate === p.end;
            return (
              <button
                key={p.label}
                onClick={() => onDatePresetSelect(p.start, p.end)}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  isSelected
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Cutoff Mode Badge */}
        <div className="flex items-center space-x-2 px-3 py-1.5 bg-teal-50 border border-teal-200 text-teal-800 rounded-lg text-xs font-medium">
          <Zap className="w-3.5 h-3.5 text-teal-600" />
          <span>Cutoff: <strong>{cutoffType === 'day_ahead' ? 'D-1' : 'D-0'} {cutoffTime} UK</strong></span>
        </div>
      </div>
    </header>
  );
};
