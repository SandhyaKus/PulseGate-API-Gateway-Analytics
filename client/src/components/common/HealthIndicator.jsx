import React from 'react';

export default function HealthIndicator({ status, label, subtitle }) {
  const isOk = status === 'ok' || status === 'connected' || status === true;
  const isStandby = status === 'standby' || status === 'degraded';

  return (
    <div className="flex items-center space-x-2 px-2.5 py-1 rounded-lg bg-slate-900/60 border border-slate-800 text-xs">
      <span className="relative flex h-2 w-2">
        {isOk && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        )}
        <span
          className={`relative inline-flex rounded-full h-2 w-2 ${
            isOk ? 'bg-emerald-500' : isStandby ? 'bg-amber-500' : 'bg-rose-500'
          }`}
        />
      </span>
      <div className="flex flex-col">
        <span className="font-medium text-slate-300 leading-tight">{label}</span>
        {subtitle && <span className="text-[10px] text-slate-500 font-mono">{subtitle}</span>}
      </div>
    </div>
  );
}

