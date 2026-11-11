import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { PieChart as PieIcon } from 'lucide-react';
import EmptyState from '../common/EmptyState';

export default function StatusDistributionChart({ overview }) {
  const allowed = overview?.allowedRequests || 0;
  const throttled = overview?.throttledRequests || 0;
  const errors = overview?.errorRequests || 0;
  const total = overview?.totalRequests || 0;

  const data = [
    { name: '2xx Allowed', value: allowed, color: '#10B981' },
    { name: '429 Rate Limited', value: throttled, color: '#EF4444' },
    { name: '5xx Errors', value: errors, color: '#8B5CF6' }
  ].filter((d) => d.value > 0);

  return (
    <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-sm flex flex-col justify-between">
      <div>
        <h3 className="text-base font-bold text-white flex items-center space-x-2">
          <PieIcon className="h-4 w-4 text-emerald-400" />
          <span>Status Code Distribution</span>
        </h3>
        <p className="text-xs text-slate-400">
          Proportion of successful passes vs. rate-limit blocks.
        </p>
      </div>

      <div className="h-52 w-full my-2">
        {total > 0 && data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={4}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="#0B0F19" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0F172A',
                  borderColor: '#1E293B',
                  borderRadius: '0.75rem',
                  fontSize: '12px'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState
            title="No Traffic Recorded"
            message="No status breakdown data available yet."
          />
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-800/80 text-xs">
        <div className="text-center">
          <div className="flex items-center justify-center space-x-1 text-emerald-400 font-mono">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span>2xx OK</span>
          </div>
          <p className="mt-1 font-bold text-white font-mono">{allowed.toLocaleString()}</p>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center space-x-1 text-rose-400 font-mono">
            <span className="h-2 w-2 rounded-full bg-rose-400" />
            <span>429 Blocked</span>
          </div>
          <p className="mt-1 font-bold text-white font-mono">{throttled.toLocaleString()}</p>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center space-x-1 text-purple-400 font-mono">
            <span className="h-2 w-2 rounded-full bg-purple-400" />
            <span>5xx Error</span>
          </div>
          <p className="mt-1 font-bold text-white font-mono">{errors.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}

