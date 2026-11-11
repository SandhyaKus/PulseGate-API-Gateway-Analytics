import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Activity,
  LayoutDashboard,
  PlaySquare,
  ListFilter,
  Shield,
  Zap,
  Server,
  Layers
} from 'lucide-react';

export default function Sidebar({ isOpen, onClose }) {
  const navItems = [
    {
      to: '/',
      label: 'Overview',
      icon: LayoutDashboard,
      description: 'Live analytics & telemetry'
    },
    {
      to: '/playground',
      label: 'API Playground',
      icon: PlaySquare,
      description: 'Single & burst testing'
    },
    {
      to: '/traffic',
      label: 'Traffic Explorer',
      icon: ListFilter,
      description: 'Searchable request logs'
    }
  ];

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-950/90 backdrop-blur-xl border-r border-slate-800/80 flex flex-col justify-between transition-transform duration-300 md:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div>
        {/* Brand / Logo */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-slate-800/80">
          <NavLink to="/" className="flex items-center space-x-3 group">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-base font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-200 to-white">
                  PulseGate
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold">
                  v1.0
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">API Gateway & Analytics</p>
            </div>
          </NavLink>
        </div>

        {/* Navigation Items */}
        <div className="px-3 py-6 space-y-1">
          <span className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Navigation
          </span>

          <div className="mt-2 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `group flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                    }`
                  }
                >
                  <Icon className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110" />
                  <div className="flex flex-col">
                    <span className="leading-tight">{item.label}</span>
                    <span className="text-[10px] text-slate-400/80 font-normal">
                      {item.description}
                    </span>
                  </div>
                </NavLink>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer Info Widget */}
      <div className="p-4 m-3 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2">
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
          <Zap className="h-3.5 w-3.5 text-blue-400" />
          <span>Atomic Token Bucket</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Redis Lua script executed atomically on central server clock with dynamic TTL.
        </p>
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] font-mono text-slate-400">
          <span>Trusted Upstream</span>
          <span className="text-emerald-400">:4001/api</span>
        </div>
      </div>
    </aside>
  );
}

