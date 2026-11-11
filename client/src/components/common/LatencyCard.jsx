import React from 'react';
import { Clock, Zap, Gauge } from 'lucide-react';

export default function LatencyCard({ latency = {}, overview = {} }) {
  const avg = latency?.avgMs ?? overview?.averageLatencyMs ?? 0;
  const p95 = latency?.p95Ms ?? overview?.p95LatencyMs ?? 0;
  const min = latency?.minMs ?? 0;
  const max = latency?.maxMs ?? 0;

  return (
    <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <Gauge className="h-4 w-4 text-indigo-400" />
            <span>Latency Distribution</span>
          </h3>
          <span className="text-xs font-mono text-slate-400">Microsecond timer</span>
        </div>
        <p className="mt-1 text-xs text-slate-400">
          Reverse proxy round-trip latency including Lua evaluation.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
        {/* Average */}
        <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-800">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Avg (Mean)</span>
          <div className="mt-1 flex items-baseline space-x-1">
            <span className="text-xl font-bold font-mono text-white">{avg}</span>
            <span className="text-xs text-slate-400">ms</span>
          </div>
        </div>

        {/* p95 */}
        <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-800">
          <span className="text-[11px] font-semibold text-indigo-400 uppercase">p95 Tail</span>
          <div className="mt-1 flex items-baseline space-x-1">
            <span className="text-xl font-bold font-mono text-indigo-400">{p95}</span>
            <span className="text-xs text-slate-400">ms</span>
          </div>
        </div>

        {/* Min */}
        <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-800">
          <span className="text-[11px] font-semibold text-emerald-400 uppercase">Min</span>
          <div className="mt-1 flex items-baseline space-x-1">
            <span className="text-xl font-bold font-mono text-emerald-400">{min}</span>
            <span className="text-xs text-slate-400">ms</span>
          </div>
        </div>

        {/* Max */}
        <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-800">
          <span className="text-[11px] font-semibold text-amber-400 uppercase">Max</span>
          <div className="mt-1 flex items-baseline space-x-1">
            <span className="text-xl font-bold font-mono text-amber-400">{max}</span>
            <span className="text-xs text-slate-400">ms</span>
          </div>
        </div>
      </div>

      <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
        <span>Target Upstream: http://localhost:4001</span>
        <span className="text-emerald-400 font-mono">Fast Path Active</span>
      </div>
    </div>
  );
}

