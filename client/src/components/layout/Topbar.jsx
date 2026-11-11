import React from 'react';
import { Menu, RefreshCw, Radio, Database, Shield, Clock } from 'lucide-react';
import HealthIndicator from '../common/HealthIndicator';

export default function Topbar({
  health,
  onToggleSidebar,
  onRefresh,
  isRefreshing,
  lastUpdated
}) {
  const isGatewayHealthy = health?.ok;
  const isRedisConnected = health?.data?.redis?.status === 'connected';

  return (
    <header className="h-16 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6">
      {/* Mobile Toggle & Breadcrumbs */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onToggleSidebar}
          className="md:hidden p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
          aria-label="Toggle Navigation"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center space-x-2">
          <span className="hidden sm:inline-block text-sm font-semibold text-white">
            PulseGate
          </span>
          <span className="hidden sm:inline-block text-slate-600">/</span>
          <span className="text-xs sm:text-sm font-medium text-slate-400">
            Developer Gateway Console
          </span>
        </div>
      </div>

      {/* Status Indicators & Actions */}
      <div className="flex items-center space-x-3">
        {/* Environment Badge */}
        <span className="hidden lg:inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 text-xs font-mono font-medium border border-blue-500/20">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
          <span>Local Demo</span>
        </span>

        {/* Redis Health */}
        <div className="hidden sm:block">
          <HealthIndicator
            status={isRedisConnected ? 'connected' : 'standby'}
            label="Redis"
            subtitle={isRedisConnected ? 'Ready :6379' : 'Standby'}
          />
        </div>

        {/* Gateway Health */}
        <HealthIndicator
          status={isGatewayHealthy ? 'ok' : 'degraded'}
          label="Gateway"
          subtitle={isGatewayHealthy ? ':4000 Online' : 'Offline'}
        />

        {/* Last Refreshed Time */}
        {lastUpdated && (
          <div className="hidden xl:flex items-center space-x-1.5 text-xs font-mono text-slate-400">
            <Clock className="h-3 w-3" />
            <span>{lastUpdated}</span>
          </div>
        )}

        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-all disabled:opacity-50"
          title="Refresh telemetry"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
        </button>
      </div>
    </header>
  );
}

