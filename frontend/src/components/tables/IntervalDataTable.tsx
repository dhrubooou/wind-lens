import React, { useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';
import { IntervalRecord } from '../../types';

interface IntervalDataTableProps {
  intervals: IntervalRecord[];
}

export const IntervalDataTable: React.FC<IntervalDataTableProps> = ({ intervals }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<keyof IntervalRecord>('start_time');
  const [sortAsc, setSortAsc] = useState(true);
  const pageSize = 20;

  // Filtered & Sorted items
  const processedIntervals = useMemo(() => {
    let list = intervals.filter((item) => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        item.start_time.toLowerCase().includes(term) ||
        item.settlement_date.toLowerCase().includes(term) ||
        item.settlement_period.toString().includes(term)
      );
    });

    list.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (valA === null || valA === undefined) return sortAsc ? 1 : -1;
      if (valB === null || valB === undefined) return sortAsc ? -1 : 1;
      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });

    return list;
  }, [intervals, searchTerm, sortField, sortAsc]);

  const totalPages = Math.ceil(processedIntervals.length / pageSize) || 1;
  const paginatedItems = processedIntervals.slice((page - 1) * pageSize, page * pageSize);

  const toggleSort = (field: keyof IntervalRecord) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">Granular Interval Error Log</h2>
          <p className="text-xs text-slate-500">Half-hourly settlement records matched with eligible forecast vintages</p>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search date or period..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 w-full sm:w-64"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
            <tr>
              <th className="py-3 px-4 cursor-pointer hover:bg-slate-100" onClick={() => toggleSort('start_time')}>
                <div className="flex items-center space-x-1">
                  <span>Interval Start (UTC)</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-3 text-center cursor-pointer hover:bg-slate-100" onClick={() => toggleSort('settlement_period')}>
                <div className="flex items-center justify-center space-x-1">
                  <span>Period</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100" onClick={() => toggleSort('actual_generation_mw')}>
                <div className="flex items-center justify-end space-x-1">
                  <span>Actual (MW)</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100" onClick={() => toggleSort('forecast_generation_mw')}>
                <div className="flex items-center justify-end space-x-1">
                  <span>Forecast (MW)</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-4 text-center">Lead Time</th>
              <th className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100" onClick={() => toggleSort('error_mw')}>
                <div className="flex items-center justify-end space-x-1">
                  <span>Error (MW)</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-4 text-right">Shortfall (MW)</th>
              <th className="py-3 px-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {paginatedItems.map((item) => {
              const isOver = (item.error_mw || 0) > 0;
              return (
                <tr key={item.start_time} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-2.5 px-4 font-mono font-medium text-slate-900">{item.start_time}</td>
                  <td className="py-2.5 px-3 text-center font-semibold text-slate-600">{item.settlement_period}</td>
                  <td className="py-2.5 px-4 text-right font-medium">{item.actual_generation_mw.toLocaleString()}</td>
                  <td className="py-2.5 px-4 text-right font-medium text-teal-700">
                    {item.forecast_generation_mw !== null ? item.forecast_generation_mw.toLocaleString() : '—'}
                  </td>
                  <td className="py-2.5 px-4 text-center text-slate-500">
                    {item.lead_time_hours !== null ? `${item.lead_time_hours}h` : '—'}
                  </td>
                  <td className={`py-2.5 px-4 text-right font-semibold ${item.error_mw === null ? 'text-slate-400' : isOver ? 'text-teal-600' : 'text-rose-600'}`}>
                    {item.error_mw !== null ? (isOver ? `+${item.error_mw.toLocaleString()}` : item.error_mw.toLocaleString()) : '—'}
                  </td>
                  <td className="py-2.5 px-4 text-right font-medium text-rose-600">
                    {item.shortfall_mw && item.shortfall_mw > 0 ? `+${item.shortfall_mw.toLocaleString()}` : '0'}
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    {item.is_matched ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Matched
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200" title="Missing from hourly WINDFOR stream">
                        Unmatched (:30)
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <div>
          Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, processedIntervals.length)} of {processedIntervals.length} intervals
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
            disabled={page === 1}
            className="p-1.5 rounded-md border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-semibold text-slate-700">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
            disabled={page === totalPages}
            className="p-1.5 rounded-md border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
