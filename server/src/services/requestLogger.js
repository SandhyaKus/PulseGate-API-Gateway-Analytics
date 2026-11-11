// server/src/services/requestLogger.js
// Centralized helper to record a request in both the bounded log store and the metrics aggregator.
// This can be used by middleware (e.g., telemetry) or any other point where a request outcome is known.

const logStore = require('../services/logStore.service');
const metricsService = require('./metrics.service');

/**
 * Log a request entry.
 * @param {Object} entry - The request log entry matching the schema used by logStore.
 *   Expected fields: id, timestamp, epochMs, clientId, clientName, tier, method, path,
 *   statusCode, latencyMs, outcome, ip, optionally rateLimit object.
 * @param {Object} [metricsInfo] - Optional subset for metricsService.recordRequest.
 */
function logRequest(entry, metricsInfo) {
  // Store in bounded FIFO ring buffer (does not exceed REQUEST_LOG_LIMIT).
  logStore.push(entry);

  // Record aggregated metrics if provided.
  if (metricsInfo) {
    const {
      clientId = entry.clientId,
      clientName = entry.clientName,
      routeId = entry.path.replace(/^\/gateway/, '').replace(/^\//, '') || 'root',
      statusCode = entry.statusCode,
      latencyMs = entry.latencyMs,
      outcome = entry.outcome,
      timestamp = Date.now()
    } = metricsInfo;
    metricsService.recordRequest({
      clientId,
      clientName,
      routeId,
      statusCode,
      latencyMs,
      outcome,
      timestamp
    });
  }
}

module.exports = {
  logRequest
};

