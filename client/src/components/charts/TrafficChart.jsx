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
import EmptyState from '../common/EmptyState';

export default function TrafficChart({ timeseries = [] }) {
  const hasData = timeseries && timeseries.length > 0;

  // Normalize data and ensure Recharts has at least 2 points to draw visible areas
  const chartData = React.useMemo(() => {
    if (!timeseries || timeseries.length === 0) return [];

    const mapped = timeseries.map((d) => ({
      ...d,
      total: d.total || 0,
      allowed: d.allowed || 0,
      throttled: d.throttled ?? d.rejected ?? 0
    }));

    if (mapped.length === 1) {
      return [
        { time: 'Baseline', total: 0, allowed: 0, throttled: 0 },
        mapped[0]
      ];
    }
    return mapped;
  }, [timeseries]);

  return (
    <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-sm flex flex-col justify-between">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <Activity className="h-4 w-4 text-blue-400" />
            <span>Throughput & Traffic Volume</span>
          </h3>
          <p className="text-xs text-slate-400">
            Real-time request volume vs. rate-limit blocks over time.
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
            <span className="text-slate-300">Throttled (429)</span>
          </div>
        </div>
      </div>

      <div className="h-64 w-full">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                dot={{ r: 3, fill: '#3B82F6' }}
                activeDot={{ r: 5 }}
                fillOpacity={1}
                fill="url(#totalGrad)"
                name="Total Requests"
              />
              <Area
                type="monotone"
                dataKey="allowed"
                stroke="#10B981"
                strokeWidth={2}
                dot={{ r: 3, fill: '#10B981' }}
                activeDot={{ r: 5 }}
                fillOpacity={1}
                fill="url(#allowedGrad)"
                name="Allowed (2xx)"
              />
              <Area
                type="monotone"
                dataKey="throttled"
                stroke="#EF4444"
                strokeWidth={2}
                dot={{ r: 4, fill: '#EF4444' }}
                activeDot={{ r: 6 }}
                fillOpacity={1}
                fill="url(#throttledGrad)"
                name="Throttled (429)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState
            title="Awaiting Gateway Traffic"
            message="Send single or burst requests from the API Playground to populate live timeseries metrics."
          />
        )}
      </div>
    </div>
  );
}

