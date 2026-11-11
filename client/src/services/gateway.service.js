import { gatewayApi } from './api';

export const gatewayService = {
  /**
   * Fetch aggregated analytics overview
   */
  async getAnalyticsOverview() {
    try {
      const res = await gatewayApi.get('/api/analytics/overview');
      return { ok: true, data: res.data?.data || res.data };
    } catch (err) {
      return { ok: false, error: err.response?.data?.error?.message || err.message };
    }
  },

  /**
   * Reset all analytics, logs, and Redis rate limit token cache
   */
  async resetAllAnalytics() {
    try {
      const res = await gatewayApi.post('/api/analytics/reset');
      return { ok: true, data: res.data?.data || res.data };
    } catch (err) {
      return { ok: false, error: err.response?.data?.error?.message || err.message };
    }
  },

  /**
   * Fetch timeseries data for throughput chart
   */
  async getAnalyticsTimeseries() {
    try {
      const res = await gatewayApi.get('/api/analytics/timeseries');
      return { ok: true, data: res.data?.data || res.data };
    } catch (err) {
      return { ok: false, error: err.response?.data?.error?.message || err.message };
    }
  },

  /**
   * Fetch metrics summary
   */
  async getMetricsSummary() {
    try {
      const res = await gatewayApi.get('/api/metrics/summary');
      return { ok: true, data: res.data.data };
    } catch (err) {
      return { ok: false, error: err.response?.data?.error?.message || err.message };
    }
  },

   /**
    * Fetch metrics traffic timeseries (range param optional)
    */
   async getMetricsTraffic(range = '1h') {
     try {
       const res = await gatewayApi.get('/api/metrics/traffic', { params: { range } });
       return { ok: true, data: res.data.data };
     } catch (err) {
       return { ok: false, error: err.response?.data?.error?.message || err.message };
     }
   },


  /**
   * Fetch traffic logs with filtering
   */
  async getTrafficLogs(params = {}) {
    try {
      const res = await gatewayApi.get('/api/logs', { params });
      return { ok: true, total: res.data.total, data: res.data.data };
    } catch (err) {
      return { ok: false, error: err.response?.data?.error?.message || err.message, data: [] };
    }
  },

  /**
   * Fetch log store capacity stats
   */
  async getLogStats() {
    try {
      const res = await gatewayApi.get('/api/logs/stats');
      return { ok: true, data: res.data.data };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },

  /**
   * Clear all traffic logs
   */
  async clearLogs() {
    try {
      const res = await gatewayApi.delete('/api/logs');
      return { ok: true, message: res.data.message };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },

  /**
   * Fetch public demo clients catalog
   */
  async getClients() {
    try {
      const res = await gatewayApi.get('/api/clients');
      return { ok: true, data: res.data.data || res.data.clients || [] };
    } catch (err) {
      return { ok: false, error: err.message, data: [] };
    }
  },

  /**
   * Reset rate limit bucket in Redis
   */
  async resetClientBucket(clientId, routeId = 'products-read') {
    try {
      const res = await gatewayApi.post(`/api/clients/${clientId}/reset`, { routeId });
      return { ok: true, data: res.data };
    } catch (err) {
      return { ok: false, error: err.response?.data?.error?.message || err.message };
    }
  },

  /**
   * Execute single gateway request
   */
  async sendGatewayRequest({ path = '/gateway/products', apiKey = '', method = 'GET', params = {} }) {
    const start = performance.now();
    try {
      const res = await gatewayApi({
        method,
        url: path,
        params,
        headers: {
          'X-API-Key': apiKey,
        },
        validateStatus: () => true // capture 429 and error responses without throwing
      });

      const latencyMs = Math.round(performance.now() - start);

      return {
        ok: res.status >= 200 && res.status < 300,
        status: res.status,
        statusText: res.statusText,
        data: res.data,
        headers: res.headers,
        latencyMs,
        rateLimit: {
          limit: res.headers['x-ratelimit-limit'] ? Number(res.headers['x-ratelimit-limit']) : null,
          remaining: res.headers['x-ratelimit-remaining'] ? Number(res.headers['x-ratelimit-remaining']) : null,
          reset: res.headers['x-ratelimit-reset'] ? Number(res.headers['x-ratelimit-reset']) : null,
          retryAfter: res.headers['retry-after'] ? Number(res.headers['retry-after']) : null
        },
        requestId: res.headers['x-request-id'] || 'unknown',
        clientId: res.headers['x-client-id'] || null
      };
    } catch (err) {
      const latencyMs = Math.round(performance.now() - start);
      return {
        ok: false,
        status: err.response?.status || 500,
        statusText: 'Network Error',
        data: err.response?.data || { error: { message: err.message } },
        headers: err.response?.headers || {},
        latencyMs,
        rateLimit: {},
        requestId: 'unknown',
        clientId: null
      };
    }
  },

  /**
   * Execute concurrent burst requests
   */
  async sendBurst({ count = 10, path = '/gateway/products', apiKey = '' }) {
    const start = performance.now();

    const promises = Array.from({ length: count }).map((_, index) =>
      this.sendGatewayRequest({ path, apiKey, method: 'GET' })
    );

    const results = await Promise.all(promises);
    const totalDurationMs = Math.round(performance.now() - start);

    const allowed = results.filter((r) => r.status >= 200 && r.status < 300);
    const throttled = results.filter((r) => r.status === 429);
    const errors = results.filter((r) => r.status >= 500);

    return {
      total: count,
      durationMs: totalDurationMs,
      allowedCount: allowed.length,
      throttledCount: throttled.length,
      errorCount: errors.length,
      results
    };
  }
};

