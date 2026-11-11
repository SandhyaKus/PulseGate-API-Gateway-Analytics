const config = require('../config/environment');

/**
 * High-performance bounded in-memory FIFO ring-buffer for request logs.
 * Guarantees constant memory consumption (never exceeds maxCapacity).
 */
class BoundedLogStore {
  constructor(maxCapacity = config.requestLogLimit || 500) {
    this.maxCapacity = Math.max(1, maxCapacity);
    this.logs = [];
  }

  /**
   * Appends a new request log, evicting the oldest if capacity is reached.
   *
   * @param {Object} log
   */
  push(log) {
    if (this.logs.length >= this.maxCapacity) {
      this.logs.shift(); // Evict oldest
    }
    this.logs.push(log);
  }

  /**
   * Retrieves filtered and paginated logs.
   *
   * @param {Object} options
   * @param {string} [options.clientId]
   * @param {string|number} [options.status]
   * @param {string} [options.outcome] - 'allowed' | 'rate_limited' | 'error'
   * @param {string} [options.search] - Search in path or requestId
   * @param {number} [options.limit=50]
   * @param {number} [options.offset=0]
   */
  query({ clientId, status, outcome, search, limit = 50, offset = 0 } = {}) {
    let filtered = [...this.logs];

    // Filter by client
    if (clientId && clientId !== 'all') {
      filtered = filtered.filter((l) => l.clientId === clientId);
    }

    // Filter by status code (e.g., 200, 429, or 4xx, 5xx)
    if (status && status !== 'all') {
      if (status === '2xx') {
        filtered = filtered.filter((l) => l.statusCode >= 200 && l.statusCode < 300);
      } else if (status === '429') {
        filtered = filtered.filter((l) => l.statusCode === 429);
      } else if (status === '4xx') {
        filtered = filtered.filter((l) => l.statusCode >= 400 && l.statusCode < 500);
      } else if (status === '5xx') {
        filtered = filtered.filter((l) => l.statusCode >= 500);
      } else {
        const statusCodeNum = parseInt(status, 10);
        if (!isNaN(statusCodeNum)) {
          filtered = filtered.filter((l) => l.statusCode === statusCodeNum);
        }
      }
    }

    // Filter by outcome
    if (outcome && outcome !== 'all') {
      filtered = filtered.filter((l) => l.outcome === outcome);
    }

    // Search query in requestId or path
    if (search && search.trim().length > 0) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(
        (l) =>
          (l.id && l.id.toLowerCase().includes(q)) ||
          (l.path && l.path.toLowerCase().includes(q)) ||
          (l.clientName && l.clientName.toLowerCase().includes(q))
      );
    }

    const total = filtered.length;
    // Return newest first (reverse chronological)
    const reversed = filtered.reverse();
    const paginated = reversed.slice(offset, offset + limit);

    return {
      total,
      limit,
      offset,
      data: paginated
    };
  }

  /**
   * Returns current log store metrics
   */
  getStats() {
    return {
      currentCount: this.logs.length,
      maxCapacity: this.maxCapacity,
      utilizationPercentage: Math.round((this.logs.length / this.maxCapacity) * 100)
    };
  }

  /**
   * Clears all logs (useful for tests and manual reset)
   */
  clear() {
    this.logs = [];
  }
}

const defaultLogStore = new BoundedLogStore();
module.exports = defaultLogStore;
module.exports.BoundedLogStore = BoundedLogStore;

