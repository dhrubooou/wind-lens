import React from 'react';
import { 
  Wind, 
  LayoutDashboard, 
  Crosshair, 
  TrendingUp, 
  BarChart3, 
  Database,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { PageId } from '../../types';

interface SidebarProps {
  currentPage: PageId;
  onPageSelect: (page: PageId) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onPageSelect }) => {
  const navItems: Array<{ id: PageId; label: string; icon: React.ReactNode; desc: string }> = [
    {
      id: 'dashboard',
      label: 'Executive Dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
      desc: 'Day-ahead wind & procurement metrics'
    },
    {
      id: 'decision-explorer',
      label: 'Decision Explorer',
      icon: <Crosshair className="w-5 h-5" />,
      desc: 'Cutoff-specific vintage selection'
    },
    {
      id: 'evolution',
      label: 'Forecast Evolution',
      icon: <TrendingUp className="w-5 h-5" />,
      desc: 'Successive vintage convergence'
    },
    {
      id: 'accuracy',
      label: 'Accuracy Analysis',
      icon: <BarChart3 className="w-5 h-5" />,
      desc: 'Error distribution, MAE & RMSE'
    },
    {
      id: 'data-status',
      label: 'Data Quality & Source',
      icon: <Database className="w-5 h-5" />,
      desc: 'BMRS stream & ingestion status'
    }
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col justify-between shrink-0 h-screen sticky top-0 select-none">
      <div>
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800/80 flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400 shadow-inner">
            <Wind className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-lg text-white tracking-tight">WindLens</span>
              <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-teal-500/10 text-teal-400 border border-teal-500/30 rounded">UK</span>
            </div>
            <p className="text-xs text-slate-400">Power Procurement Analytics</p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1">
          <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Analytics & Decision Tools
          </div>
          {navItems.map((item) => {
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onPageSelect(item.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${
                  isActive
                    ? 'bg-teal-600/20 text-teal-300 border border-teal-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }`}
              >
                <span className={isActive ? 'text-teal-400' : 'text-slate-400'}>
                  {item.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="truncate">{item.label}</div>
                  <div className="text-[11px] text-slate-500 truncate font-normal">{item.desc}</div>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* System Footer info */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40 space-y-2">
        <div className="flex items-center space-x-2 text-xs text-slate-400">
          <Clock className="w-3.5 h-3.5 text-teal-400 shrink-0" />
          <span className="truncate">Timezone: <strong>Europe/London (GMT)</strong></span>
        </div>
        <div className="flex items-center space-x-2 text-xs text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="truncate">Elexon BMRS: <strong>FUELHH + WINDFOR</strong></span>
        </div>
        <div className="pt-1 text-[11px] text-slate-500">
          Delivery Scope: January 2026
        </div>
      </div>
    </aside>
  );
};
