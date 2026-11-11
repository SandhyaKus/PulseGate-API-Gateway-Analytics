import React from 'react';
import { Activity, ShieldCheck, AlertOctagon, Zap, Clock, ShieldAlert } from 'lucide-react';

export default function MetricStats({ overview }) {
  const total = overview?.totalRequests || 0;
  const allowed = overview?.allowedRequests || 0;
  const throttled = overview?.throttledRequests || 0;
  const errors = overview?.errorRequests || 0;
  const successRate = overview?.successRate !== undefined ? overview.successRate : 100;
  const avgLatency = overview?.latency?.avgMs || 0;
  const p95Latency = overview?.latency?.p95Ms || 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      {/* Total Requests */}
      <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Total Gateway Traffic</span>
          <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
            <Activity className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline space-x-2">
          <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
            {total.toLocaleString()}
          </span>
          <span className="text-xs text-blue-400 font-medium">reqs</span>
        </div>
      </div>

      {/* Success Rate */}
      <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Success Rate</span>
          <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <ShieldCheck className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline space-x-2">
          <span className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono">
            {successRate}%
          </span>
          <span className="text-xs text-slate-400 font-mono">({allowed.toLocaleString()})</span>
        </div>
      </div>

      {/* Throttled (429) */}
      <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Rate-Limited (429)</span>
          <div className="h-8 w-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
            <ShieldAlert className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline space-x-2">
          <span className="text-2xl sm:text-3xl font-extrabold text-rose-400 font-mono">
            {throttled.toLocaleString()}
          </span>
          <span className="text-xs text-rose-400/80 font-mono">
            {total > 0 ? `${Math.round((throttled / total) * 100)}%` : '0%'}
          </span>
        </div>
      </div>

      {/* Avg Latency */}
      <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Avg Latency</span>
          <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <Clock className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline space-x-2">
          <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
            {avgLatency}
          </span>
          <span className="text-xs text-slate-400 font-mono">ms</span>
        </div>
      </div>

      {/* p95 Latency */}
      <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-sm relative overflow-hidden col-span-2 lg:col-span-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">p95 Latency</span>
          <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
            <Zap className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline space-x-2">
          <span className="text-2xl sm:text-3xl font-extrabold text-indigo-400 font-mono">
            {p95Latency}
          </span>
          <span className="text-xs text-slate-400 font-mono">ms</span>
        </div>
      </div>
    </div>
  );
}

