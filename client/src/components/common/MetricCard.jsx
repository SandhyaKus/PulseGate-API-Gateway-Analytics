import React from 'react';

export default function MetricCard({
  title,
  value,
  unit,
  subtext,
  icon: Icon,
  variant = 'default',
  badge
}) {
  const variantStyles = {
    default: {
      border: 'border-slate-800',
      iconBg: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      valueColor: 'text-white'
    },
    success: {
      border: 'border-emerald-900/30',
      iconBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      valueColor: 'text-emerald-400'
    },
    danger: {
      border: 'border-rose-900/30',
      iconBg: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      valueColor: 'text-rose-400'
    },
    warning: {
      border: 'border-amber-900/30',
      iconBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      valueColor: 'text-amber-400'
    },
    indigo: {
      border: 'border-indigo-900/30',
      iconBg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
      valueColor: 'text-indigo-400'
    }
  };

  const style = variantStyles[variant] || variantStyles.default;

  return (
    <div
      className={`p-5 rounded-2xl bg-slate-900/70 border ${style.border} shadow-sm flex flex-col justify-between transition-all hover:border-slate-700/80`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-400 tracking-wide uppercase">
          {title}
        </span>
        {Icon && (
          <div className={`h-8 w-8 rounded-xl border flex items-center justify-center ${style.iconBg}`}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>

      <div className="mt-4">
        <div className="flex items-baseline space-x-2">
          <span className={`text-2xl sm:text-3xl font-extrabold font-mono tracking-tight ${style.valueColor}`}>
            {value !== undefined && value !== null ? value.toLocaleString() : '—'}
          </span>
          {unit && <span className="text-xs text-slate-400 font-mono">{unit}</span>}
        </div>

        {(subtext || badge) && (
          <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
            {subtext && <span>{subtext}</span>}
            {badge && <span>{badge}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

