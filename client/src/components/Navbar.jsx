import React from 'react';
import { Activity, ShieldCheck, Database, Layers, Radio } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export default function Navbar({ health }) {
  const location = useLocation();

  const isGatewayHealthy = health?.ok && health.data?.status === 'ok';
  const isRedisConnected = health?.data?.redis?.status === 'connected';

  return (
    <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-300 to-white">
                  PulseGate
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-mono border border-blue-500/20">
                  v1.0
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                API Gateway & Live Analytics
              </p>
            </div>
          </Link>

          {/* Nav links */}
          <nav className="hidden md:flex items-center space-x-1">
            <Link
              to="/"
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === '/'
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              System Foundation
            </Link>
          </nav>

          {/* Live Status Indicators */}
          <div className="flex items-center space-x-3">
            {/* Redis Status */}
            <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/60 text-xs">
              <Database className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-slate-400">Redis:</span>
              <span className="flex items-center space-x-1 font-mono">
                <span
                  className={`h-2 w-2 rounded-full ${
                    isRedisConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                  }`}
                />
                <span className={isRedisConnected ? 'text-emerald-400' : 'text-amber-400'}>
                  {isRedisConnected ? 'Ready' : 'Standby'}
                </span>
              </span>
            </div>

            {/* Gateway Status */}
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/60 text-xs">
              <Radio className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-slate-400">Gateway:</span>
              <span className="flex items-center space-x-1 font-mono">
                <span
                  className={`h-2 w-2 rounded-full ${
                    health?.ok ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                  }`}
                />
                <span className={health?.ok ? 'text-emerald-400' : 'text-rose-400'}>
                  {health?.ok ? 'Online (4000)' : 'Offline'}
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

