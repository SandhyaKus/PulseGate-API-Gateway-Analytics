import React, { useState, useEffect } from 'react';
import {
  PlaySquare,
  Zap,
  RotateCcw,
  Send,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Key,
  Shield,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';
import StatusBadge from '../components/common/StatusBadge';
import { gatewayService } from '../services/gateway.service';

export default function Playground() {
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState('client_demo');
  const [apiKey, setApiKey] = useState('');
  const [selectedRoute, setSelectedRoute] = useState('/gateway/products');
  const [customParam, setCustomParam] = useState('');

  // Mode: 'single' or 'burst'
  const [mode, setMode] = useState('single');
  const [burstCount, setBurstCount] = useState(15);

  // States
  const [isSending, setIsSending] = useState(false);
  const [singleResult, setSingleResult] = useState(null);
  const [burstResult, setBurstResult] = useState(null);
  const [resetMessage, setResetMessage] = useState(null);

  // Fetch client catalog on mount
  useEffect(() => {
    gatewayService.getClients().then((res) => {
      if (res.ok && res.data) {
        setClients(res.data);
        const demoClient = res.data.find((c) => c.clientId === 'client_demo') || res.data[0];
        if (demoClient) {
          setSelectedClientId(demoClient.clientId);
          setApiKey(demoClient.apiKey || '');
        }
      }
    });
  }, []);

  const handleClientChange = (cId) => {
    setSelectedClientId(cId);
    const client = clients.find((c) => c.clientId === cId);
    if (client) {
      setApiKey(client.apiKey || '');
    }
  };

  const handleSendSingle = async () => {
    setIsSending(true);
    setBurstResult(null);
    setResetMessage(null);

    const path = customParam ? `${selectedRoute}?${customParam}` : selectedRoute;
    const result = await gatewayService.sendGatewayRequest({
      path,
      apiKey,
      method: 'GET'
    });

    setSingleResult(result);
    setIsSending(false);
  };

  const handleSendBurst = async () => {
    setIsSending(true);
    setSingleResult(null);
    setResetMessage(null);

    const result = await gatewayService.sendBurst({
      count: burstCount,
      path: selectedRoute,
      apiKey
    });

    setBurstResult(result);
    setIsSending(false);
  };

  const handleResetBucket = async () => {
    const res = await gatewayService.resetClientBucket(selectedClientId, 'products-read');
    if (res.ok) {
      setResetMessage(`Bucket quota for ${selectedClientId} has been refilled to full capacity in Redis!`);
      setTimeout(() => setResetMessage(null), 4000);
    }
  };

  const activeClientObj = clients.find((c) => c.clientId === selectedClientId);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center space-x-2">
            <PlaySquare className="h-7 w-7 text-blue-500" />
            <span>API Gateway Playground</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            Interactive HTTP testing console for token bucket rate limiting and burst handling.
          </p>
        </div>

        {/* Reset Bucket Button */}
        <button
          onClick={handleResetBucket}
          className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-mono font-medium transition-all shadow-sm"
          title="Reset client tokens back to full capacity in Redis"
        >
          <RotateCcw className="h-3.5 w-3.5 text-blue-400" />
          <span>Refill {selectedClientId} Quota</span>
        </button>
      </div>

      {resetMessage && (
        <div className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-500/30 text-blue-300 text-xs font-mono flex items-center space-x-2">
          <CheckCircle2 className="h-4 w-4 text-blue-400 shrink-0" />
          <span>{resetMessage}</span>
        </div>
      )}

      {/* Main Grid: Request Builder (Left) & Response Inspector (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Request Builder Column (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-sm space-y-5">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <Sliders className="h-4 w-4 text-blue-400" />
              <span>Request Configuration</span>
            </h3>

            {/* Client Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                <span>Select Client Profile</span>
                {activeClientObj && (
                  <span className="text-[11px] font-mono text-slate-400">
                    Capacity: {activeClientObj.capacity} • {activeClientObj.refillRatePerSecond} t/s
                  </span>
                )}
              </label>
              <select
                value={selectedClientId}
                onChange={(e) => handleClientChange(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
              >
                {clients.map((c) => (
                  <option key={c.clientId} value={c.clientId}>
                    {c.name} ({c.tier.toUpperCase()} - {c.capacity} burst)
                  </option>
                ))}
              </select>
            </div>

            {/* API Key Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 flex items-center space-x-1.5">
                <Key className="h-3.5 w-3.5 text-blue-400" />
                <span>X-API-Key Header Value</span>
              </label>
              <input
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter client API key..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            {/* Route Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Target Gateway Route</label>
              <select
                value={selectedRoute}
                onChange={(e) => setSelectedRoute(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
              >
                <option value="/gateway/products">GET /gateway/products (All Products)</option>
                <option value="/gateway/products/prod_01J8F9">GET /gateway/products/prod_01J8F9 (Shield Pro)</option>
                <option value="/gateway/products/prod_02K3M1">GET /gateway/products/prod_02K3M1 (Redis Cluster)</option>
                <option value="/gateway/api/products">GET /gateway/api/products (Alternative alias)</option>
              </select>
            </div>

            {/* Optional Query Params */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Query Parameters (Optional)</label>
              <input
                type="text"
                value={customParam}
                onChange={(e) => setCustomParam(e.target.value)}
                placeholder="category=Security&limit=2"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            {/* Mode Switch Tabs */}
            <div className="pt-2 border-t border-slate-800/80">
              <label className="text-xs font-medium text-slate-300 mb-2 block">Execution Mode</label>
              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-950/60 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setMode('single')}
                  className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                    mode === 'single'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Single Request
                </button>
                <button
                  type="button"
                  onClick={() => setMode('burst')}
                  className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                    mode === 'burst'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Concurrent Burst Tester
                </button>
              </div>
            </div>

            {/* Burst Mode Controls */}
            {mode === 'burst' && (
              <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-slate-300">Concurrent Requests</span>
                  <span className="text-blue-400 font-mono font-bold text-sm">{burstCount} reqs</span>
                </div>

                <input
                  type="range"
                  min="2"
                  max="50"
                  step="1"
                  value={burstCount}
                  onChange={(e) => setBurstCount(parseInt(e.target.value, 10))}
                  className="w-full accent-blue-500 cursor-pointer"
                />

                <div className="flex justify-between gap-1.5 pt-1">
                  {[5, 10, 15, 25, 50].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setBurstCount(num)}
                      className={`flex-1 py-1 text-[11px] font-mono rounded border transition-colors ${
                        burstCount === num
                          ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Dispatch Action Button */}
            <div className="pt-2">
              {mode === 'single' ? (
                <button
                  onClick={handleSendSingle}
                  disabled={isSending}
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-lg shadow-blue-500/30 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
                >
                  <Send className={`h-4 w-4 ${isSending ? 'animate-spin' : ''}`} />
                  <span>{isSending ? 'Sending Request...' : 'Send Request'}</span>
                </button>
              ) : (
                <button
                  onClick={handleSendBurst}
                  disabled={isSending}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-semibold shadow-lg shadow-blue-500/30 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
                >
                  <Zap className={`h-4 w-4 ${isSending ? 'animate-bounce' : ''}`} />
                  <span>{isSending ? 'Firing Burst...' : `Fire ${burstCount} Concurrent Requests`}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Response Inspector Column (7 Cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Burst Mode Results View */}
          {burstResult && (
            <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-sm space-y-5 animate-in fade-in duration-300">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center space-x-2">
                    <Zap className="h-4 w-4 text-blue-400" />
                    <span>Concurrent Burst Execution Report</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Dispatched {burstResult.total} simultaneous requests against {selectedClientId}.
                  </p>
                </div>
                <span className="text-xs font-mono px-2.5 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  Total: {burstResult.durationMs}ms
                </span>
              </div>

              {/* Triad Outcome Summary Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                  <span className="text-[11px] font-mono text-emerald-400 uppercase font-semibold">Allowed (2xx)</span>
                  <p className="mt-1 text-2xl font-extrabold text-white font-mono">{burstResult.allowedCount}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-center">
                  <span className="text-[11px] font-mono text-rose-400 uppercase font-semibold">Throttled (429)</span>
                  <p className="mt-1 text-2xl font-extrabold text-white font-mono">{burstResult.throttledCount}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-center">
                  <span className="text-[11px] font-mono text-slate-400 uppercase font-semibold">Total Dispatched</span>
                  <p className="mt-1 text-2xl font-extrabold text-slate-200 font-mono">{burstResult.total}</p>
                </div>
              </div>

              {/* Visual Token Exhaustion Progress Bar */}
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between text-xs font-mono text-slate-400">
                  <span>Quota Breakdown:</span>
                  <span>{burstResult.allowedCount} allowed • {burstResult.throttledCount} rejected</span>
                </div>
                <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden flex">
                  <div
                    style={{ width: `${(burstResult.allowedCount / burstResult.total) * 100}%` }}
                    className="bg-emerald-500 transition-all duration-500"
                  />
                  <div
                    style={{ width: `${(burstResult.throttledCount / burstResult.total) * 100}%` }}
                    className="bg-rose-500 transition-all duration-500"
                  />
                </div>
              </div>

              {/* Sample Response Stream */}
              <div className="space-y-2 pt-2">
                <span className="text-xs font-medium text-slate-400">Request Trace Log (Top 10)</span>
                <div className="space-y-1.5 max-h-48 overflow-y-auto font-mono text-xs pr-1">
                  {burstResult.results.slice(0, 10).map((r, i) => (
                    <div
                      key={i}
                      className="p-2 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-slate-500">#{i + 1}</span>
                        <StatusBadge status={r.status} />
                        <span className="text-slate-400">{r.latencyMs}ms</span>
                      </div>
                      <div className="flex items-center space-x-2 text-[11px]">
                        <span className="text-slate-400">rem: {r.rateLimit?.remaining !== null ? r.rateLimit?.remaining : 0}</span>
                        {r.rateLimit?.retryAfter && (
                          <span className="text-rose-400 font-semibold">retry: {r.rateLimit.retryAfter}s</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Single Request Result View */}
          {singleResult && (
            <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-sm space-y-5 animate-in fade-in duration-300">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div className="flex items-center space-x-2.5">
                  <StatusBadge status={singleResult.status} />
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">{singleResult.latencyMs}ms</span>
                </div>
                <span className="text-xs font-mono text-slate-400">ID: {singleResult.requestId}</span>
              </div>

              {/* Rate Limit Diagnostic Gauges */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
                  <span className="text-[10px] font-mono text-slate-400 uppercase">Limit</span>
                  <p className="mt-0.5 text-lg font-bold font-mono text-white">
                    {singleResult.rateLimit?.limit !== null && singleResult.rateLimit?.limit !== undefined
                      ? singleResult.rateLimit.limit
                      : '—'}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
                  <span className="text-[10px] font-mono text-slate-400 uppercase">Remaining</span>
                  <p className={`mt-0.5 text-lg font-bold font-mono ${
                    singleResult.rateLimit?.remaining === 0 ? 'text-rose-400' : 'text-emerald-400'
                  }`}>\
                    {singleResult.rateLimit?.remaining !== null && singleResult.rateLimit?.remaining !== undefined
                      ? singleResult.rateLimit.remaining
                      : '—'}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
                  <span className="text-[10px] font-mono text-slate-400 uppercase">
                    {singleResult.status === 429 ? 'Retry After' : 'Full Reset'}
                  </span>
                  <p className="mt-0.5 text-lg font-bold font-mono text-white">
                    {singleResult.rateLimit?.retryAfter
                      ? `${singleResult.rateLimit.retryAfter}s`
                      : singleResult.rateLimit?.reset
                      ? `${singleResult.rateLimit.reset}s`
                      : '0s'}
                  </p>
                </div>
              </div>

              {/* Response Body JSON */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-400">Response Payload</span>
                <pre className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 text-xs font-mono text-emerald-400 overflow-x-auto max-h-72">
                  {JSON.stringify(singleResult.data, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Idle Empty State */}
          {!singleResult && !burstResult && (
            <div className="min-h-[420px] rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 flex flex-col items-center justify-center p-8 text-center space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-slate-200">Playground Ready</h3>
              <p className="text-xs text-slate-400 max-w-sm">
                Select a client tier, choose an endpoint, and click <strong>Send Request</strong> or test a burst to inspect live rate limiting.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

