import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Zap,
  Layers,
  ArrowRight,
  RefreshCw,
  RotateCcw,
  ExternalLink
} from 'lucide-react';
import { Link } from 'react-router-dom';
import MetricCard from '../components/common/MetricCard';
import LatencyCard from '../components/common/LatencyCard';
import TrafficChart from '../components/charts/TrafficChart';
import StatusDistributionChart from '../components/charts/StatusDistributionChart';
import StatusBadge from '../components/common/StatusBadge';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';
import { gatewayService } from '../services/gateway.service';
import { healthService } from '../services/health.service';

export default function OverviewPage() {
  const [overview, setOverview] = useState(null);
  const [timeseries, setTimeseries] = useState([]);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isResetting, setIsResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      const [overviewRes, trafficRes, healthRes] = await Promise.all([
        gatewayService.getAnalyticsOverview(),
        gatewayService.getAnalyticsTimeseries(),
        healthService.getGatewayHealth()
      ]);

      if (overviewRes.ok && overviewRes.data) {
        setOverview(overviewRes.data);
      }
      if (trafficRes.ok && trafficRes.data) {
        setTimeseries(Array.isArray(trafficRes.data) ? trafficRes.data : []);
      }
      if (healthRes.ok && healthRes.data) {
        setHealth(healthRes.data);
      }
    } catch (err) {
      console.error('Failed to fetch telemetry:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleClearCache = async () => {
    setIsResetting(true);
    setResetMessage(null);
    try {
      const res = await gatewayService.resetAllAnalytics();
      await fetchAnalytics();
      if (res.ok) {
        setResetMessage('Telemetry metrics, logs, and Redis rate limit token caches cleared!');
        setTimeout(() => setResetMessage(null), 4000);
      }
    } catch (err) {
      console.error('Reset error:', err);
    } finally {
      setIsResetting(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    // Poll every 3 seconds for live telemetry
    const timer = setInterval(fetchAnalytics, 3000);
    return () => clearInterval(timer);
  }, [fetchAnalytics]);

  if (loading && !overview) {
    return <LoadingState message="Connecting to PulseGate analytics telemetry..." />;
  }

  if (error && !overview) {
    return <ErrorState title="Analytics Stream Offline" message={error} onRetry={fetchAnalytics} />;
  }

  const total = overview?.totalRequests || 0;
  const allowed = overview?.allowedRequests || 0;
  const throttled = overview?.throttledRequests ?? overview?.rateLimitedRequests ?? 0;
  const successRate = overview?.successRate !== undefined ? overview.successRate : 100;
  const avgLatency = overview?.latency?.avgMs ?? overview?.averageLatencyMs ?? 0;
  const p95Latency = overview?.latency?.p95Ms ?? overview?.p95LatencyMs ?? 0;
  const clients = overview?.clients || [];

  return (
    <div className="space-y-6 pb-12">
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Live Telemetry Overview
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            Real-time sliding-window analytics and token bucket enforcement.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleClearCache}
            disabled={isResetting}
            className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold transition-all shadow-sm disabled:opacity-50"
            title="Clear all metrics, logs, and flush Redis rate limit cache"
          >
            <RotateCcw className={`h-3.5 w-3.5 text-rose-400 ${isResetting ? 'animate-spin' : ''}`} />
            <span>{isResetting ? 'Resetting...' : 'Clear Cache & Metrics'}</span>
          </button>

          <Link
            to="/playground"
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-blue-500/20 transition-all"
          >
            <span>Open API Playground</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Success Notification Banner */}
      {resetMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center justify-between shadow-sm">
          <span>✓ {resetMessage}</span>
          <button onClick={() => setResetMessage(null)} className="text-slate-400 hover:text-white ml-2 text-sm">✕</button>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Gateway Traffic"
          value={total}
          unit="reqs"
          subtext="Sliding window total"
          icon={Activity}
          variant="default"
        />

        <MetricCard
          title="Quota Success Rate"
          value={successRate}
          unit="%"
          subtext={`${allowed.toLocaleString()} allowed`}
          icon={ShieldCheck}
          variant="success"
        />

        <MetricCard
          title="Throttled Requests"
          value={throttled}
          unit="429s"
          subtext={total > 0 ? `${Math.round((throttled / total) * 100)}% quota tripped` : '0%'}
          icon={ShieldAlert}
          variant="danger"
        />

        <MetricCard
          title="p95 Tail Latency"
          value={p95Latency}
          unit="ms"
          subtext={`Mean avg: ${avgLatency}ms`}
          icon={Zap}
          variant="indigo"
        />
      </div>

      {/* Primary Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TrafficChart timeseries={timeseries} />
        </div>
        <div>
          <StatusDistributionChart overview={overview} />
        </div>
      </div>

      {/* Secondary Row: Latency Card & Active Clients */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div>
          <LatencyCard latency={overview?.latency} overview={overview} />
        </div>

        {/* Client Activity Leaderboard */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <Layers className="h-4 w-4 text-blue-400" />
                  <span>Client Quota Utilization</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Real-time activity and rate-limit trip counts by client.
                </p>
              </div>

              <Link
                to="/traffic"
                className="text-xs font-mono text-blue-400 hover:text-blue-300 inline-flex items-center space-x-1"
              >
                <span>View Traffic Logs</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-mono">
                    <th className="pb-3 font-medium">Client ID</th>
                    <th className="pb-3 font-medium">Client Name</th>
                    <th className="pb-3 font-medium text-right">Total Requests</th>
                    <th className="pb-3 font-medium text-right">Allowed (2xx)</th>
                    <th className="pb-3 font-medium text-right">Throttled (429)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {clients.length > 0 ? (
                    clients.map((c) => (
                      <tr key={c.clientId} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 text-white font-semibold flex items-center space-x-2">
                          <StatusBadge type="tier" status={c.clientId.replace('client_', '')} />
                          <span>{c.clientId}</span>
                        </td>
                        <td className="py-3 text-slate-300">{c.name}</td>
                        <td className="py-3 text-right text-slate-200">{c.total.toLocaleString()}</td>
                        <td className="py-3 text-right text-emerald-400">{c.allowed.toLocaleString()}</td>
                        <td className="py-3 text-right text-rose-400 font-bold">
                          {c.throttled.toLocaleString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500 font-mono">
                        No client traffic recorded yet. Fire requests from the Playground!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

