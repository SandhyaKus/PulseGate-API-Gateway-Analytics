const logStore = require('../services/logStore.service');
const metricsService = require('../services/metrics.service');

/**
 * PulseGate Telemetry Middleware
 * Records microsecond latency, status code, outcome, and appends to bounded ring-buffer.
 */
function telemetryMiddleware(req, res, next) {
  const path = req.originalUrl || req.path || '';

  // ONLY record telemetry for actual Gateway traffic (routes under /gateway)
  // Skip internal management routes (/api/analytics, /api/logs, /api/clients, /health, /)
  if (!path.startsWith('/gateway')) {
    return next();
  }

  const startHrTime = process.hrtime.bigint();
  const startTimeMs = Date.now();

  res.on('finish', () => {

    const endHrTime = process.hrtime.bigint();
    const durationMs = Number(endHrTime - startHrTime) / 1e6;
    const latencyMs = Math.round(durationMs * 100) / 100;

    const statusCode = res.statusCode;
    let outcome = 'allowed';

    if (statusCode === 429) {
      outcome = 'rate_limited';
    } else if (statusCode >= 500) {
      outcome = 'error';
    } else if (statusCode >= 400) {
      outcome = 'client_error';
    }

    const clientId = req.client ? req.client.clientId : 'unauthenticated';
    const clientName = req.client ? req.client.name : 'Unauthenticated Consumer';
    const tier = req.client ? req.client.tier : 'none';

    // Route ID
    const routeId = req.path.replace(/^\/gateway/, '').replace(/^\//, '') || 'root';

    // Extract RateLimit headers if set
    const limitHeader = res.getHeader('X-RateLimit-Limit');
    const remainingHeader = res.getHeader('X-RateLimit-Remaining');
    const resetHeader = res.getHeader('X-RateLimit-Reset');
    const retryAfterHeader = res.getHeader('Retry-After');

    const logEntry = {
      id: req.id || 'unknown',
      timestamp: new Date().toISOString(),
      epochMs: startTimeMs,
      clientId,
      clientName,
      tier,
      method: req.method,
      path: req.originalUrl || req.path,
      statusCode,
      latencyMs,
      rateLimit: {
        limit: limitHeader !== undefined ? Number(limitHeader) : null,
        remaining: remainingHeader !== undefined ? Number(remainingHeader) : null,
        reset: resetHeader !== undefined ? Number(resetHeader) : null,
        retryAfter: retryAfterHeader !== undefined ? Number(retryAfterHeader) : null
      },
      outcome,
      ip: req.ip || req.connection?.remoteAddress || '127.0.0.1'
    };

    // Append to bounded ring buffer
    logStore.push(logEntry);

    // Record in metrics aggregator
    metricsService.recordRequest({
      clientId,
      clientName,
      routeId,
      statusCode,
      latencyMs,
      outcome,
      timestamp: startTimeMs
    });
  });

  next();
}

module.exports = telemetryMiddleware;

