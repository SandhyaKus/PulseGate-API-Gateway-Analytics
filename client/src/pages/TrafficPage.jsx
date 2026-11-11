// src/pages/TrafficPage.jsx
// Placeholder Traffic Explorer – shows raw traffic logs from the gateway.
// The page fetches logs via gatewayService.getTrafficLogs and displays a simple table.
// It deliberately avoids complex filtering/pagination for the initial implementation;
// the UI can be expanded later.

import React, { useState, useEffect, useCallback } from 'react';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';
import EmptyState from '../components/common/EmptyState';
import { gatewayService } from '../services/gateway.service';

export default function TrafficPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await gatewayService.getTrafficLogs({ limit: 100 }); // reasonable default
    if (res.ok) {
      setLogs(res.data);
    } else {
      setError(res.error || 'Failed to load traffic logs');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  if (loading) return <LoadingState message="Loading traffic logs…" />;
  if (error) return <ErrorState message={error} />;
  if (!logs || logs.length === 0) return <EmptyState message="No traffic logs available" />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-100">Traffic Explorer</h1>
      <div className="overflow-x-auto rounded-lg border border-slate-800/60 bg-slate-900/30">
        <table className="min-w-full divide-y divide-slate-800/60 text-sm">
          <thead className="bg-slate-800/60">
            <tr>
              <th className="px-4 py-2 text-left text-slate-400">Timestamp</th>
              <th className="px-4 py-2 text-left text-slate-400">Client ID</th>
              <th className="px-4 py-2 text-left text-slate-400">Route</th>
              <th className="px-4 py-2 text-left text-slate-400">Status</th>
              <th className="px-4 py-2 text-left text-slate-400">Latency (ms)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40">
            {logs.map((log, idx) => (
              <tr key={log.id ?? idx} className="hover:bg-slate-800/30">
                <td className="px-4 py-2 text-slate-300 whitespace-nowrap">{log.timestamp ?? log.time ?? '--'}</td>
                <td className="px-4 py-2 text-slate-300">{log.clientId ?? '--'}</td>
                <td className="px-4 py-2 text-slate-300">{log.routeId ?? log.path ?? '--'}</td>
                <td className="px-4 py-2 text-slate-300">{log.statusCode ?? log.status ?? log.responseStatus ?? '--'}</td>
                <td className="px-4 py-2 text-slate-300">{log.latencyMs ?? log.latency ?? '--'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

