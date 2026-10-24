import React from 'react';
import { Search } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No Data Available',
  description = 'No interval observations found matching the selected date and cutoff filter criteria.'
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-12 text-center max-w-md mx-auto my-12 shadow-xs">
      <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3">
        <Search className="w-6 h-6" />
      </div>
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{description}</p>
    </div>
  );
};
