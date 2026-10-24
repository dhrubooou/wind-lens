import React from 'react';
import { Calendar, Zap, RefreshCw, Radio, ArrowLeft } from 'lucide-react';
import { PageId } from '../../types';

interface HeaderProps {
  currentPage: PageId;
  startDate: string;
  endDate: string;
  cutoffTime: string;
  cutoffType: string;
  onDatePresetSelect: (start: string, end: string) => void;
  onRefreshLive?: () => void;
  isSyncing?: boolean;
  onBack?: () => void;
  canGoBack?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentPage,
  startDate,
  endDate,
  cutoffTime,
  cutoffType,
  onDatePresetSelect,
  onRefreshLive,
  isSyncing = false,
  onBack,
  canGoBack = false
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
    { label: '⚡ Oct 20–24 (Live)', start: '2026-10-20', end: '2026-10-24', isLive: true },
    { label: '⚡ Oct 24 (Realtime)', start: '2026-10-24', end: '2026-10-24', isLive: true },
    { label: 'Jan 1–7 (W1)', start: '2026-01-01', end: '2026-01-07', isLive: false },
    { label: 'Jan 8–14 (W2)', start: '2026-01-08', end: '2026-01-14', isLive: false },
    { label: 'Jan 15–21 (W3)', start: '2026-01-15', end: '2026-01-21', isLive: false },
    { label: 'Jan 22–31 (W4)', start: '2026-01-22', end: '2026-01-31', isLive: false },
    { label: 'Full Jan 2026', start: '2026-01-01', end: '2026-01-31', isLive: false },
  ];

  const isCurrentRangeLive = startDate.startsWith('2026-10') || endDate.startsWith('2026-10');

  const handleStartDateChange = (newStart: string) => {
    if (newStart > endDate) {
      onDatePresetSelect(newStart, newStart);
    } else {
      onDatePresetSelect(newStart, endDate);
    }
  };

  const handleEndDateChange = (newEnd: string) => {
    if (newEnd < startDate) {
      onDatePresetSelect(newEnd, newEnd);
    } else {
      onDatePresetSelect(startDate, newEnd);
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 sticky top-0 z-20 shadow-xs">
      <div className="flex items-center space-x-3">
        {canGoBack && onBack && (
          <button
            onClick={onBack}
            className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-teal-800 border border-slate-200 hover:border-teal-300 rounded-lg text-xs font-semibold transition-all shadow-2xs group shrink-0"
            title="Go back to previous page"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-500 group-hover:text-teal-600 transition-transform group-hover:-translate-x-0.5" />
            <span>Back</span>
          </button>
        )}
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {currentInfo.title}
            </h1>
            {isCurrentRangeLive ? (
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Live BMRS Connected</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                <Radio className="w-3 h-3 text-slate-400" />
                <span>Jan 2026 Benchmark</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{currentInfo.subtitle}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Custom Date Pickers */}
        <div className="flex items-center space-x-2 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs">
          <Calendar className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-slate-500 font-medium">From:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => handleStartDateChange(e.target.value)}
            className="bg-transparent font-medium text-slate-800 focus:outline-none cursor-pointer"
          />
          <span className="text-slate-400 font-medium">To:</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => handleEndDateChange(e.target.value)}
            className="bg-transparent font-medium text-slate-800 focus:outline-none cursor-pointer"
          />
        </div>

        {/* Quick Date Presets */}
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs overflow-x-auto">
          {presets.map((p) => {
            const isSelected = startDate === p.start && endDate === p.end;
            return (
              <button
                key={p.label}
                onClick={() => onDatePresetSelect(p.start, p.end)}
                className={`px-2 py-1 rounded font-medium whitespace-nowrap transition-colors ${
                  isSelected
                    ? p.isLive
                      ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                      : 'bg-white text-slate-900 shadow-xs font-semibold'
                    : p.isLive
                    ? 'text-emerald-700 hover:bg-emerald-100/70'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Live Refresh / Sync Button */}
        {onRefreshLive && (
          <button
            onClick={onRefreshLive}
            disabled={isSyncing}
            title="Force refresh real-time observations from Elexon BMRS API"
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Live'}</span>
          </button>
        )}

        {/* Cutoff Mode Badge */}
        <div className="flex items-center space-x-2 px-3 py-1.5 bg-teal-50 border border-teal-200 text-teal-800 rounded-lg text-xs font-medium">
          <Zap className="w-3.5 h-3.5 text-teal-600" />
          <span>Cutoff: <strong>{cutoffType === 'day_ahead' ? 'D-1' : 'D-0'} {cutoffTime} UK</strong></span>
        </div>
      </div>
    </header>
  );
};
