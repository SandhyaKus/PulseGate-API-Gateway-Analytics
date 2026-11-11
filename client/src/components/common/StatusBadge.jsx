import React from 'react';

/**
 * Renders consistent status and category badges across the dashboard.
 */
export default function StatusBadge({ status, type = 'status', label }) {
  if (type === 'status') {
    const code = Number(status);
    if (code >= 200 && code < 300) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 mr-1.5" />
          {label || `${code} OK`}
        </span>
      );
    }
    if (code === 429) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-400 mr-1.5" />
          {label || '429 Throttled'}
        </span>
      );
    }
    if (code >= 400 && code < 500) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 mr-1.5" />
          {label || `${code} Client Error`}
        </span>
      );
    }
    if (code >= 500) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
          <span className="h-1.5 w-1.5 rounded-full bg-purple-400 mr-1.5" />
          {label || `${code} Upstream Error`}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-medium bg-slate-800 text-slate-300 border border-slate-700">
        {label || status || 'Unknown'}
      </span>
    );
  }

  // Tier Badges
  if (type === 'tier') {
    const tier = String(status || '').toLowerCase();
    if (tier === 'enterprise') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
          ENTERPRISE
        </span>
      );
    }
    if (tier === 'pro') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
          PRO
        </span>
      );
    }
    if (tier === 'free') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
          FREE
        </span>
      );
    }
    if (tier === 'disabled') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
          SUSPENDED
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-semibold bg-slate-800 text-slate-300 border border-slate-700">
        DEMO
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono bg-slate-800 text-slate-300 border border-slate-700">
      {label || status}
    </span>
  );
}

