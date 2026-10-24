import React from 'react';
import { Clock, Info } from 'lucide-react';

interface CutoffSelectorProps {
  cutoffTime: string;
  cutoffType: string;
  onCutoffChange: (time: string, type: string) => void;
  showExplanation?: boolean;
}

export const CutoffSelector: React.FC<CutoffSelectorProps> = ({
  cutoffTime,
  cutoffType,
  onCutoffChange,
  showExplanation = true
}) => {
  const cutoffPresets = [
    { label: 'Day-Ahead 12:00 (Default)', time: '12:00', type: 'day_ahead', desc: 'D-1 Noon decision' },
    { label: 'Day-Ahead 17:00', time: '17:00', type: 'day_ahead', desc: 'D-1 Close of Business' },
    { label: 'Same-Day 06:00', time: '06:00', type: 'same_day', desc: 'D-0 Morning update' },
    { label: 'Same-Day 11:00', time: '11:00', type: 'same_day', desc: 'D-0 Intraday balance' },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <Clock className="w-5 h-5 text-teal-600" />
          <div>
            <h2 className="text-sm font-bold text-slate-900">Procurement Decision Cutoff</h2>
            <p className="text-xs text-slate-500">Filters out any forecasts published after this cutoff to prevent look-ahead bias</p>
          </div>
        </div>

        {/* Custom Time Selector */}
        <div className="flex items-center space-x-2">
          <select
            value={`${cutoffType}_${cutoffTime}`}
            onChange={(e) => {
              const [type, time] = e.target.value.split('_');
              onCutoffChange(time, type);
            }}
            className="text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            {cutoffPresets.map((p) => (
              <option key={`${p.type}_${p.time}`} value={`${p.type}_${p.time}`}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {showExplanation && (
        <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3 text-xs text-slate-600 flex items-start space-x-2.5">
          <Info className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong>Decision Deadline Assumption:</strong> The selected forecast represents the latest forecast published by National Grid / Elexon on or before the configured cutoff ({cutoffType === 'day_ahead' ? 'Day-Ahead D-1' : 'Same-Day D-0'} at {cutoffTime} Europe/London time). This illustrates the information state available at the purchasing decision deadline, not necessarily an official wholesale gate closure.
          </div>
        </div>
      )}
    </div>
  );
};
