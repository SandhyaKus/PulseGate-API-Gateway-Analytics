import { gatewayApi, upstreamApi } from './api';

export const healthService = {
  /**
   * Fetch Gateway /health status
   */
  async getGatewayHealth() {
    const start = performance.now();
    try {
      const response = await gatewayApi.get('/health');
      const latency = Math.round(performance.now() - start);
      return {
        ok: true,
        latencyMs: latency,
        data: response.data,
      };
    } catch (err) {
      const latency = Math.round(performance.now() - start);
      return {
        ok: false,
        latencyMs: latency,
        error: err.response?.data?.error?.message || err.message,
        data: err.response?.data || null,
      };
    }
  },

  /**
   * Fetch Upstream Sample Products
   */
  async getUpstreamProducts() {
    const start = performance.now();
    try {
      const response = await upstreamApi.get('/api/products');
      const latency = Math.round(performance.now() - start);
      return {
        ok: true,
        latencyMs: latency,
        data: response.data,
      };
    } catch (err) {
      const latency = Math.round(performance.now() - start);
      return {
        ok: false,
        latencyMs: latency,
        error: err.response?.data?.error || err.message,
      };
    }
  }
};

