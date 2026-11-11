import React, { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw, ArrowLeftRight, Filter, X } from 'lucide-react';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';
import StatusBadge from '../components/common/StatusBadge';
import { gatewayService } from '../services/gateway.service';

/**
 * Traffic Explorer – shows raw request logs from the in‑memory request logger.
 * Supports filtering by HTTP status group, route, client, and request‑ID search.
 * Pagination is bounded (server returns total count). The log store is limited
 * and resets when the server restarts – a short notice is displayed.
 */
export default function TrafficExplorer() {
  // Pagination & filters
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [statusFilter, setStatusFilter] = useState(''); // e.g. "2xx", "4xx", "5xx", "429"
  const [routeFilter, setRouteFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [searchId, setSearchId] = useState('');

  // Data & UI state
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  // Derived option sets for filters (populated after first fetch)
  const [availableRoutes, setAvailableRoutes] = useState([]);
  const [availableClients, setAvailableClients] = useState([]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = {
      page,
      limit,
    };
    if (statusFilter) params.status = statusFilter;
    if (routeFilter) params.routeId = routeFilter;
    if (clientFilter) params.clientId = clientFilter;
    if (searchId) params.requestId = searchId;
    const res = await gatewayService.getTrafficLogs(params);
    if (res.ok) {
      setLogs(res.data);
      setTotal(res.total || 0);
      // Populate filter options on first load (or whenever new data arrives)
      const routes = new Set(res.data.map((r) => r.routeId).filter(Boolean));
      const clients = new Set(res.data.map((r) => r.clientId).filter(Boolean));
      setAvailableRoutes(Array.from(routes));
      setAvailableClients(Array.from(clients));
    } else {
      setError(res.error || 'Failed to fetch request logs');
    }
    setLoading(false);
  }, [page, limit, statusFilter, routeFilter, clientFilter, searchId]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalPages = Math.ceil(total / limit) || 1;
  const canPrev = page > 1;
  const canNext = page < totalPages;

  const resetFilters = () => {
    setStatusFilter('');
    setRouteFilter('');
    setClientFilter('');
    setSearchId('');
    setPage(1);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Traffic Explorer</h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            Browse raw request logs. Note: logs are kept in‑memory and reset when the server restarts.
          </p>
        </div>
        <button
          onClick={resetFilters}
          className="inline-flex items-center space-x-1 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium"
        >
          <RefreshCw className="h-3 w-3" />
          <span>Clear Filters</span>
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Status group */}
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="2xx">2xx Success</option>
          <option value="4xx">4xx Client Error</option>
          <option value="5xx">5xx Server Error</option>
          <option value="429">429 Too Many Requests</option>
        </select>
        {/* Route filter */}
        <select
          value={routeFilter}
          onChange={(e) => { setRouteFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none"
        >
          <option value="">All Routes</option>
          {availableRoutes.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        {/* Client filter */}
        <select
          value={clientFilter}
          onChange={(e) => { setClientFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none"
        >
          <option value="">All Clients</option>
          {availableClients.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        {/* Request ID search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search Request ID"
            value={searchId}
            onChange={(e) => { setSearchId(e.target.value); setPage(1); }}
            className="w-full pl-8 pr-3 py-2 rounded bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none"
          />
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
        </div>
      </div>

      {/* Loading / Error */}
      {loading && <LoadingState message="Fetching request logs..." />}
      {error && <ErrorState title="Unable to Load Logs" message={error} onRetry={fetchLogs} />}

      {/* Table */}
      {!loading && !error && (
        <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/30">
          <table className="min-w-full text-left text-xs">
            <thead className="border-b border-slate-800 text-slate-400 font-mono">
              <tr>
                <th className="pb-3 px-3">Timestamp</th>
                <th className="pb-3 px-3">Request ID</th>
                <th className="pb-3 px-3">Client</th>
                <th className="pb-3 px-3">Method</th>
                <th className="pb-3 px-3">Route</th>
                <th className="pb-3 px-3">Status</th>
                <th className="pb-3 px-3">Duration (ms)</th>
                <th className="pb-3 px-3">Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No request logs match the current filters.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <React.Fragment key={log.requestId}>
                    <tr
                      className="hover:bg-slate-800/30 cursor-pointer"
                      onClick={() => setExpandedId(expandedId === log.requestId ? null : log.requestId)}
                    >
                      <td className="py-2 px-3 text-slate-300">{new Date(log.timestamp).toLocaleString()}</td>
                      <td className="py-2 px-3 text-slate-400 break-all">{log.requestId}</td>
                      <td className="py-2 px-3 text-slate-300">{log.clientId}</td>
                      <td className="py-2 px-3 text-slate-300">{log.method}</td>
                      <td className="py-2 px-3 text-slate-300">{log.routeId}</td>
                      <td className="py-2 px-3">
                        <StatusBadge status={log.statusCode} />
                      </td>
                      <td className="py-2 px-3 text-slate-300">{log.durationMs}</td>
                      <td className="py-2 px-3 text-slate-300 capitalize">{log.outcome}</td>
                    </tr>
                    {/* Expanded details */}
                    {expandedId === log.requestId && (
                      <tr className="bg-slate-800/50">
                        <td colSpan={8} className="p-4 text-xs text-slate-200">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {log.reason && (
                              <div>
                                <h4 className="font-medium text-slate-400 mb-1">Rejection Reason</h4>
                                <p>{log.reason}</p>
                              </div>
                            )}
                            {log.upstreamError && (
                              <div>
                                <h4 className="font-medium text-slate-400 mb-1">Upstream Error</h4>
                                <pre className="bg-slate-950/60 p-2 rounded overflow-x-auto">{JSON.stringify(log.upstreamError, null, 2)}</pre>
                              </div>
                            )}
                            <div>
                              <h4 className="font-medium text-slate-400 mb-1">Full Request ID</h4>
                              <code className="break-all">{log.requestId}</code>
                            </div>
                            <div>
                              <h4 className="font-medium text-slate-400 mb-1">Duration</h4>
                              <span>{log.durationMs} ms</span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && total > limit && (
        <div className="flex justify-between items-center mt-4 text-sm text-slate-300">
          <button
            onClick={() => canPrev && setPage(page - 1)}
            disabled={!canPrev}
            className={`px-3 py-1 rounded ${canPrev ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-700 cursor-not-allowed'}`}
          >
            <ArrowLeftRight className="inline-block h-4 w-4 mr-1 align-middle" /> Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => canNext && setPage(page + 1)}
            disabled={!canNext}
            className={`px-3 py-1 rounded ${canNext ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-700 cursor-not-allowed'}`}
          >
            Next <ArrowLeftRight className="inline-block h-4 w-4 ml-1 align-middle" />
          </button>
        </div>
      )}
    </div>
  );
}

