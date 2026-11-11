import React, { useState, useEffect } from 'react';
import {
  Server,
  Database,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Cpu,
  Layers,
  ArrowRight,
  ExternalLink,
  Zap,
  Package
} from 'lucide-react';
import { healthService } from '../services/health.service';

export default function HomePage({ health, refreshHealth, loadingHealth }) {
  const [productsData, setProductsData] = useState(null);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchProducts = async () => {
    setLoadingProducts(true);
    const result = await healthService.getUpstreamProducts();
    setProductsData(result);
    setLoadingProducts(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const isGatewayOk = health?.ok;
  const isRedisOk = health?.data?.redis?.status === 'connected';
  const isUpstreamOk = productsData?.ok;

  return (
    <div className="space-y-8 pb-16">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-blue-950/40 via-slate-900/60 to-slate-900/30 border border-blue-900/30 p-8 sm:p-10">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-mono mb-4">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-ping" />
            <span>DAY 1 FOUNDATION COMPLETE</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
            PulseGate — API Gateway & Live Observability
          </h1>
          <p className="mt-3 text-base sm:text-lg text-slate-300">
            A high-performance reverse proxy and rate limiting gateway powered by Express,
            Redis Lua atomic token buckets, and real-time developer telemetry.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={refreshHealth}
              disabled={loadingHealth}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-lg shadow-blue-600/30 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loadingHealth ? 'animate-spin' : ''}`} />
              <span>Verify Gateway Health</span>
            </button>

            <button
              onClick={fetchProducts}
              disabled={loadingProducts}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-medium transition-all"
            >
              <Package className={`h-4 w-4 ${loadingProducts ? 'animate-spin' : ''}`} />
              <span>Query Trusted Upstream API</span>
            </button>
          </div>
        </div>
      </div>

      {/* Triad Service Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Gateway Card */}
        <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Server className="h-5 w-5" />
              </div>
              <span
                className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium ${
                  isGatewayOk
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}
              >
                {isGatewayOk ? '200 OK' : 'OFFLINE'}
              </span>
            </div>
            <h3 className="mt-4 text-base font-semibold text-white">Express Gateway</h3>
            <p className="mt-1 text-xs text-slate-400">
              Edge reverse proxy, CORS, centralized errors & tracing.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/80 space-y-2 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Port:</span>
              <span className="font-mono text-slate-200">4000</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Health Endpoint:</span>
              <a
                href="http://localhost:4000/health"
                target="_blank"
                rel="noreferrer"
                className="font-mono text-blue-400 hover:underline inline-flex items-center space-x-1"
              >
                <span>/health</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Round-Trip Latency:</span>
              <span className="font-mono text-slate-200">
                {health?.latencyMs !== undefined ? `${health.latencyMs}ms` : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Redis Card */}
        <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Database className="h-5 w-5" />
              </div>
              <span
                className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium ${
                  isRedisOk
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}
              >
                {isRedisOk ? 'CONNECTED' : 'STANDBY'}
              </span>
            </div>
            <h3 className="mt-4 text-base font-semibold text-white">Redis Cache & Token Engine</h3>
            <p className="mt-1 text-xs text-slate-400">
              Distributed state, Lua token bucket scripts & metrics storage.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/80 space-y-2 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Default Port:</span>
              <span className="font-mono text-slate-200">6379</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Client Library:</span>
              <span className="font-mono text-slate-200">redis v4 (official)</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Connection Status:</span>
              <span className="font-mono text-slate-200">
                {health?.data?.redis?.status || 'disconnected'}
              </span>
            </div>
          </div>
        </div>

        {/* Upstream Mock API Card */}
        <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Cpu className="h-5 w-5" />
              </div>
              <span
                className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium ${
                  isUpstreamOk
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}
              >
                {isUpstreamOk ? 'ACTIVE' : 'OFFLINE'}
              </span>
            </div>
            <h3 className="mt-4 text-base font-semibold text-white">Sample Trusted Upstream</h3>
            <p className="mt-1 text-xs text-slate-400">
              Strictly fixed destination preventing SSRF and arbitrary proxying.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/80 space-y-2 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Port:</span>
              <span className="font-mono text-slate-200">4001</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Trusted Endpoint:</span>
              <a
                href="http://localhost:4001/api/products"
                target="_blank"
                rel="noreferrer"
                className="font-mono text-blue-400 hover:underline inline-flex items-center space-x-1"
              >
                <span>/api/products</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Products Available:</span>
              <span className="font-mono text-slate-200">
                {productsData?.data?.data?.length || 0} items
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Upstream Products Live Sample Display */}
      <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <Package className="h-5 w-5 text-emerald-400" />
              <span>Sample Upstream Microservice Data (GET /api/products)</span>
            </h2>
            <p className="text-xs text-slate-400">
              Live payload received from the trusted upstream service on port 4001.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono px-2.5 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700">
              Target: http://localhost:4001/api/products
            </span>
          </div>
        </div>

        {productsData?.ok && productsData?.data?.data ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {productsData.data.data.map((product) => (
              <div
                key={product.id}
                className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60 hover:border-slate-600 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    {product.category}
                  </span>
                  <span className="text-sm font-semibold text-emerald-400 font-mono">
                    ${product.price.toFixed(2)}
                  </span>
                </div>
                <h4 className="mt-2 text-sm font-bold text-white">{product.name}</h4>
                <p className="mt-1 text-xs text-slate-400 line-clamp-2">{product.description}</p>
                <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 font-mono pt-2 border-t border-slate-700/50">
                  <span>ID: {product.id}</span>
                  <span>Stock: {product.stock}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center rounded-xl bg-slate-800/30 border border-dashed border-slate-700">
            {loadingProducts ? (
              <div className="flex flex-col items-center justify-center space-y-2 text-slate-400">
                <RefreshCw className="h-6 w-6 animate-spin text-blue-400" />
                <span className="text-xs font-mono">Querying Upstream Service...</span>
              </div>
            ) : (
              <div className="space-y-2">
                <AlertTriangle className="h-8 w-8 text-amber-400 mx-auto" />
                <p className="text-sm text-slate-300">Upstream API not reached on port 4001</p>
                <p className="text-xs text-slate-500">
                  Ensure the upstream server is running using <code className="text-slate-300 font-mono">npm run start:upstream</code>
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Raw Health JSON Response */}
      <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
            <Zap className="h-4 w-4 text-blue-400" />
            <span>Gateway Diagnostic JSON (/health)</span>
          </h3>
          <span className="text-xs font-mono text-slate-400">
            {health?.latencyMs !== undefined ? `Response in ${health.latencyMs}ms` : ''}
          </span>
        </div>

        <pre className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 font-mono text-xs text-emerald-400 overflow-x-auto">
          {health?.data
            ? JSON.stringify(health.data, null, 2)
            : JSON.stringify({ error: health?.error || 'Unable to connect to Gateway' }, null, 2)}
        </pre>
      </div>
    </div>
  );
}

