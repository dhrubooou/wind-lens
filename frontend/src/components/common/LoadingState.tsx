import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ message = 'Loading analytics data...' }) => {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
      <Loader2 className="w-10 h-10 text-teal-600 animate-spin mb-4" />
      <h3 className="text-sm font-semibold text-slate-800">{message}</h3>
      <p className="text-xs text-slate-500 mt-1">Processing Elexon BMRS settlement intervals</p>
    </div>
  );
};
