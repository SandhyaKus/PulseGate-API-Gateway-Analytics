// server/src/services/metrics.js
// High‑level wrapper exposing summary and traffic endpoints.
// Internally re‑uses the existing MetricsService implementation (metrics.service.js)
// which already tracks request counts, latency stats and time‑series buckets.

const metricsService = require('./metrics.service');

/**
 * Returns a concise summary of gateway activity.
 * Fields match the specification:
 *   - totalRequests
 *   - allowedRequests
 *   - rateLimitedRequests (alias for throttledRequests)
 *   - upstreamErrors (alias for errorRequests)
 *   - averageLatencyMs
 *   - p95LatencyMs
 *   - updatedAt (ISO‑8601 timestamp of the request)
 */
function getSummary() {
  const overview = metricsService.getOverview();
  const { avgMs, p95Ms } = overview.latency;
  return {
    ...overview,
    totalRequests: overview.totalRequests,
    allowedRequests: overview.allowedRequests,
    rateLimitedRequests: overview.throttledRequests,
    upstreamErrors: overview.errorRequests,
    averageLatencyMs: avgMs,
    p95LatencyMs: p95Ms,
    updatedAt: new Date().toISOString()
  };
}

/**
 * Returns traffic bucket data for the requested time range.
 * `range` is a simple string like "1h", "30m", "15m".
 * The function converts the range to milliseconds and filters the
 * time‑series buckets produced by MetricsService.
 */
function getTraffic(range = '1h') {
  // Parse range – support hours (h) and minutes (m).
  const match = range.match(/^(\d+)(h|m)$/);
  let ms = 60 * 60 * 1000; // default 1 hour
  if (match) {
    const value = parseInt(match[1], 10);
    const unit = match[2];
    ms = unit === 'h' ? value * 60 * 60 * 1000 : value * 60 * 1000;
  }

  const cutoff = Date.now() - ms;
  const allBuckets = metricsService.getTimeseries();
  // Each bucket includes a ISO timestamp field `timestamp` (bucketKey).
  const filtered = allBuckets.filter((b) => {
    const ts = new Date(b.timestamp).getTime();
    return ts >= cutoff;
  });

  // Ensure the response shape matches the spec and frontend needs.
  return filtered.map((b) => ({
    time: b.time,
    timestamp: b.timestamp,
    total: b.total,
    allowed: b.allowed,
    throttled: b.throttled,
    rejected: b.throttled // rate‑limited requests are considered rejected
  }));
}

module.exports = {
  getSummary,
  getTraffic
};

