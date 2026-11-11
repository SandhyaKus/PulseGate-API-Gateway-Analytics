import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { Activity } from 'lucide-react';

export default function ThroughputChart({ timeseries = [] }) {
  // If no time data yet, provide friendly fallback
  const hasData = timeseries && timeseries.length > 0;

  return (
    <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <Activity className="h-4 w-4 text-blue-400" />
            <span>Throughput & Traffic Volume</span>
          </h3>
          <p className="text-xs text-slate-400">
            Real-time request throughput vs. rate-limited spikes over time.
          </p>
        </div>

        <div className="flex items-center space-x-4 text-xs font-mono">
          <div className="flex items-center space-x-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
            <span className="text-slate-300">Total</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span className="text-slate-300">Allowed</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
            <span className="text-slate-300">429 Throttled</span>
          </div>
        </div>
      </div>

      <div className="h-64 w-full">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timeseries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="allowedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="throttledGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
              <XAxis
                dataKey="time"
                stroke="#64748B"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#1E293B' }}
              />
              <YAxis
                stroke="#64748B"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#1E293B' }}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0F172A',
                  borderColor: '#1E293B',
                  borderRadius: '0.75rem',
                  fontSize: '12px',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                }}
                labelStyle={{ color: '#94A3B8', fontWeight: 600 }}
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#3B82F6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#totalGrad)"
                name="Total Requests"
              />
              <Area
                type="monotone"
                dataKey="allowed"
                stroke="#10B981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#allowedGrad)"
                name="Allowed (2xx)"
              />
              <Area
                type="monotone"
                dataKey="throttled"
                stroke="#EF4444"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#throttledGrad)"
                name="Throttled (429)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs font-mono border border-dashed border-slate-800 rounded-xl">
            <span>Awaiting gateway traffic...</span>
            <span className="text-[11px] text-slate-600 mt-1">
              Send requests via API Playground to populate live timeseries
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

