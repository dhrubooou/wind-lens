import { useState } from 'react';
import { PageId } from './types';
import { AppLayout } from './components/layout/AppLayout';
import { ExecutiveDashboard } from './pages/ExecutiveDashboard';
import { DecisionTimeExplorer } from './pages/DecisionTimeExplorer';
import { ForecastEvolutionView } from './pages/ForecastEvolutionView';
import { AccuracyAnalysisView } from './pages/AccuracyAnalysisView';
import { DataStatusView } from './pages/DataStatusView';

export function App() {
  const [currentPage, setCurrentPage] = useState<PageId>('dashboard');
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2026-01-07');
  const [cutoffTime, setCutoffTime] = useState('12:00');
  const [cutoffType, setCutoffType] = useState('day_ahead');

  const handleDatePresetSelect = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
  };

  const handleCutoffChange = (time: string, type: string) => {
    setCutoffTime(time);
    setCutoffType(type);
  };

  return (
    <AppLayout
      currentPage={currentPage}
      onPageSelect={setCurrentPage}
      startDate={startDate}
      endDate={endDate}
      cutoffTime={cutoffTime}
      cutoffType={cutoffType}
      onDatePresetSelect={handleDatePresetSelect}
    >
      {currentPage === 'dashboard' && (
        <ExecutiveDashboard
          startDate={startDate}
          endDate={endDate}
          cutoffTime={cutoffTime}
          cutoffType={cutoffType}
          onCutoffChange={handleCutoffChange}
        />
      )}

      {currentPage === 'decision-explorer' && (
        <DecisionTimeExplorer />
      )}

      {currentPage === 'evolution' && (
        <ForecastEvolutionView />
      )}

      {currentPage === 'accuracy' && (
        <AccuracyAnalysisView
          startDate={startDate}
          endDate={endDate}
          cutoffTime={cutoffTime}
          cutoffType={cutoffType}
          onCutoffChange={handleCutoffChange}
        />
      )}

      {currentPage === 'data-status' && (
        <DataStatusView />
      )}
    </AppLayout>
  );
}

export default App;
