import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function ErrorState({
  title = 'Failed to Load Data',
  message = 'An unexpected error occurred while communicating with the PulseGate API.',
  onRetry
}) {
  return (
    <div className="p-6 rounded-2xl bg-rose-950/20 border border-rose-900/30 text-center flex flex-col items-center justify-center">
      <div className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
        <AlertCircle className="h-5 w-5" />
      </div>
      <h4 className="mt-3 text-sm font-semibold text-rose-300">{title}</h4>
      <p className="mt-1 text-xs text-rose-400/80 max-w-md">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 inline-flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-medium transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Retry Connection</span>
        </button>
      )}
    </div>
  );
}

