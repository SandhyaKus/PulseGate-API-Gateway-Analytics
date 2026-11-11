class MetricsService {
  constructor(bucketWindowMinutes = 30) {
    this.bucketWindowMinutes = bucketWindowMinutes;
    this.reset();
  }

  reset() {
    this.totalRequests = 0;
    this.allowedRequests = 0;
    this.throttledRequests = 0;
    this.errorRequests = 0;
    this.otherRequests = 0;
    this.latencies = []; // Circular or bounded array of recent latencies (max 1000)
    this.clientStats = new Map();
    this.routeStats = new Map();
    this.timeseries = new Map(); // bucketKey -> { timestamp, total, allowed, throttled, errors, totalLatency }
  }

  /**
   * Generates a 1-minute time bucket key (e.g. "2026-11-10T23:55:00.000Z")
   */
  getBucketKey(epochMs) {
    const d = new Date(epochMs);
    d.setSeconds(0, 0);
    return d.toISOString();
  }

  /**
   * Records a completed request outcome
   */
  recordRequest({
    clientId = 'anonymous',
    clientName = 'Anonymous',
    routeId = 'root',
    statusCode = 200,
    latencyMs = 0,
    outcome = 'allowed',
    timestamp = Date.now()
  }) {
    this.totalRequests++;

    const is2xx = statusCode >= 200 && statusCode < 300;
    const is429 = statusCode === 429;
    const is5xx = statusCode >= 500;

    if (is2xx) this.allowedRequests++;
    else if (is429) this.throttledRequests++;
    else if (is5xx) this.errorRequests++;
    else this.otherRequests++;

    // Bounded latency tracking (keep last 1000)
    if (this.latencies.length >= 1000) {
      this.latencies.shift();
    }
    this.latencies.push(latencyMs);

    // Client Breakdown
    if (!this.clientStats.has(clientId)) {
      this.clientStats.set(clientId, {
        clientId,
        name: clientName,
        total: 0,
        allowed: 0,
        throttled: 0,
        errors: 0
      });
    }
    const cStat = this.clientStats.get(clientId);
    cStat.total++;
    if (is2xx) cStat.allowed++;
    if (is429) cStat.throttled++;
    if (is5xx) cStat.errors++;

    // Route Breakdown
    if (!this.routeStats.has(routeId)) {
      this.routeStats.set(routeId, {
        routeId,
        total: 0,
        allowed: 0,
        throttled: 0,
        totalLatency: 0
      });
    }
    const rStat = this.routeStats.get(routeId);
    rStat.total++;
    rStat.totalLatency += latencyMs;
    if (is2xx) rStat.allowed++;
    if (is429) rStat.throttled++;

    // Time-series bucketing
    const bucketKey = this.getBucketKey(timestamp);
    if (!this.timeseries.has(bucketKey)) {
      this.timeseries.set(bucketKey, {
        bucketKey,
        time: new Date(bucketKey).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        total: 0,
        allowed: 0,
        throttled: 0,
        errors: 0,
        totalLatency: 0
      });
    }
    const bStat = this.timeseries.get(bucketKey);
    bStat.total++;
    bStat.totalLatency += latencyMs;
    if (is2xx) bStat.allowed++;
    if (is429) bStat.throttled++;
    if (is5xx) bStat.errors++;

    // Prune buckets older than bucketWindowMinutes
    const cutoff = Date.now() - this.bucketWindowMinutes * 60 * 1000;
    for (const [key] of this.timeseries) {
      if (new Date(key).getTime() < cutoff) {
        this.timeseries.delete(key);
      }
    }
  }

  /**
   * Computes p95 and average latencies
   */
  getLatencyMetrics() {
    if (this.latencies.length === 0) {
      return { avgMs: 0, minMs: 0, maxMs: 0, p95Ms: 0 };
    }

    const sorted = [...this.latencies].sort((a, b) => a - b);
    const sum = sorted.reduce((acc, val) => acc + val, 0);
    const avgMs = Math.round((sum / sorted.length) * 100) / 100;
    const minMs = sorted[0];
    const maxMs = sorted[sorted.length - 1];

    const p95Index = Math.floor(sorted.length * 0.95);
    const p95Ms = sorted[Math.min(p95Index, sorted.length - 1)];

    return { avgMs, minMs, maxMs, p95Ms };
  }

  /**
   * Returns comprehensive analytics overview for dashboard cards
   */
  getOverview() {
    const { avgMs, minMs, maxMs, p95Ms } = this.getLatencyMetrics();
    const successRate =
      this.totalRequests > 0
        ? Math.round((this.allowedRequests / this.totalRequests) * 1000) / 10
        : 100;

    return {
      totalRequests: this.totalRequests,
      allowedRequests: this.allowedRequests,
      throttledRequests: this.throttledRequests,
      errorRequests: this.errorRequests,
      otherRequests: this.otherRequests,
      successRate,
      latency: {
        avgMs,
        minMs,
        maxMs,
        p95Ms
      },
      clients: Array.from(this.clientStats.values()),
      routes: Array.from(this.routeStats.values()).map((r) => ({
        ...r,
        avgLatencyMs: r.total > 0 ? Math.round(r.totalLatency / r.total) : 0
      }))
    };
  }

  /**
   * Returns time-series data formatted for Recharts
   */
  getTimeseries() {
    return Array.from(this.timeseries.values())
      .sort((a, b) => new Date(a.bucketKey) - new Date(b.bucketKey))
      .map((b) => ({
        time: b.time,
        timestamp: b.bucketKey,
        total: b.total,
        allowed: b.allowed,
        throttled: b.throttled,
        errors: b.errors,
        avgLatency: b.total > 0 ? Math.round(b.totalLatency / b.total) : 0
      }));
  }
}

const defaultMetricsService = new MetricsService();
module.exports = defaultMetricsService;
module.exports.MetricsService = MetricsService;

