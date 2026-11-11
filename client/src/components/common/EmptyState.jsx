import React from 'react';
import { Inbox } from 'lucide-react';

export default function EmptyState({
  title = 'No Records Found',
  message = 'There is currently no activity matching your criteria.',
  icon: Icon = Inbox,
  action
}) {
  return (
    <div className="min-h-[220px] w-full flex flex-col items-center justify-center p-8 rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 text-center">
      <div className="h-12 w-12 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center text-slate-400">
        <Icon className="h-6 w-6" />
      </div>
      <h4 className="mt-3 text-sm font-semibold text-slate-200">{title}</h4>
      <p className="mt-1 text-xs text-slate-400 max-w-sm">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

