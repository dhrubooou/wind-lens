import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { PageId } from '../../types';

interface AppLayoutProps {
  currentPage: PageId;
  onPageSelect: (page: PageId) => void;
  startDate: string;
  endDate: string;
  cutoffTime: string;
  cutoffType: string;
  onDatePresetSelect: (start: string, end: string) => void;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  currentPage,
  onPageSelect,
  startDate,
  endDate,
  cutoffTime,
  cutoffType,
  onDatePresetSelect,
  children
}) => {
  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800 antialiased font-sans">
      <Sidebar currentPage={currentPage} onPageSelect={onPageSelect} />
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header
          currentPage={currentPage}
          startDate={startDate}
          endDate={endDate}
          cutoffTime={cutoffTime}
          cutoffType={cutoffType}
          onDatePresetSelect={onDatePresetSelect}
        />
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
};
