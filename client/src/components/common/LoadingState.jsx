import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingState({ message = 'Loading live telemetry...' }) {
  return (
    <div className="min-h-[240px] w-full flex flex-col items-center justify-center p-8 rounded-2xl bg-slate-900/40 border border-slate-800">
      <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
      <span className="mt-3 text-xs font-mono text-slate-400">{message}</span>
    </div>
  );
}

