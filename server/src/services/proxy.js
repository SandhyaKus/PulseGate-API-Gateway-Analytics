const axios = require('axios');
const config = require('../config/environment');
const logger = require('../utils/logger');

/**
 * PulseGate Trusted Reverse Proxy Service
 *
 * Enforces strict routing to pre-configured trusted upstream destinations.
 * Immune to Server-Side Request Forgery (SSRF):
 * Never accepts user-supplied destination URLs from parameters, headers, or request bodies.
 */
class ProxyService {
  /**
   * @param {Object} [options]
   * @param {string} [options.upstreamBaseUrl] - Fixed base URL of trusted upstream microservice
   * @param {number} [options.timeoutMs=5000] - Request timeout limit in milliseconds
   */
  constructor({
    upstreamBaseUrl = config.upstreamBaseUrl,
    timeoutMs = 5000
  } = {}) {
    this.upstreamBaseUrl = (upstreamBaseUrl || 'http://localhost:4001').replace(/\/+$/, '');
    this.timeoutMs = timeoutMs;
  }

  /**
   * Safely forwards an incoming client request to a fixed trusted upstream path.
   *
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @param {string} targetPath - Fixed upstream endpoint (e.g. '/api/products')
   * @param {Object} [options]
   * @param {number} [options.timeout] - Override timeout in ms
   */
  async forward(req, res, targetPath, options = {}) {
    const requestId = req.id || 'unknown';
    const startHrTime = process.hrtime.bigint();

    // 1. Strictly construct target URL targeting fixed upstream only
    const targetUrl = `${this.upstreamBaseUrl}${targetPath}`;

    // 2. Filter sensitive headers to prevent credential leakage
    const forwardedHeaders = { ...req.headers };
    delete forwardedHeaders['host'];
    delete forwardedHeaders['x-api-key']; // Never forward client API key to upstream microservice
    delete forwardedHeaders['authorization'];

    // 3. Inject tracing and proxy headers
    forwardedHeaders['x-request-id'] = requestId;
    forwardedHeaders['x-client-id'] = req.client ? req.client.clientId : 'anonymous';
    forwardedHeaders['x-forwarded-for'] = req.ip || req.connection?.remoteAddress || '127.0.0.1';
    forwardedHeaders['x-forwarded-host'] = req.get('host') || 'pulsegate';

    const timeout = options.timeout || this.timeoutMs;

    try {
      // 4. Dispatch HTTP request strictly to trusted upstream
      const upstreamResponse = await axios({
        method: req.method,
        url: targetUrl,
        params: req.query, // Forward query parameters safely
        data: req.body && Object.keys(req.body).length > 0 ? req.body : undefined,
        headers: forwardedHeaders,
        timeout,
        validateStatus: () => true // Allow upstream HTTP status codes to pass through safely
      });

      const endHrTime = process.hrtime.bigint();
      const durationMs = Math.round((Number(endHrTime - startHrTime) / 1e6) * 100) / 100;

      // 5. Record telemetry context
      res.locals.upstreamStatus = upstreamResponse.status;
      res.locals.upstreamDurationMs = durationMs;

      logger.info(
        `Upstream proxy: ${req.method} ${targetUrl} [${upstreamResponse.status}] in ${durationMs}ms [${requestId}]`
      );

      // 6. Forward safe HTTP headers from upstream
      const safeHeaders = ['content-type', 'etag', 'cache-control'];
      safeHeaders.forEach((header) => {
        if (upstreamResponse.headers[header]) {
          res.setHeader(header, upstreamResponse.headers[header]);
        }
      });

      // 7. Pipe response status and JSON body
      return res.status(upstreamResponse.status).send(upstreamResponse.data);
    } catch (err) {
      const endHrTime = process.hrtime.bigint();
      const durationMs = Math.round((Number(endHrTime - startHrTime) / 1e6) * 100) / 100;

      // Controlled 504 Gateway Timeout
      if (err.code === 'ECONNABORTED' || err.message.includes('timeout') || err.message.includes('TIMEDOUT')) {
        logger.error(`Upstream timeout after ${durationMs}ms at ${targetUrl} [${requestId}]`);
        return res.status(504).json({
          error: {
            code: 'GATEWAY_TIMEOUT',
            message: 'Upstream service request timed out.',
            statusCode: 504,
            requestId,
            durationMs
          }
        });
      }

      // Controlled 502 Bad Gateway (connection refused or DNS failure)
      if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.code === 'EHOSTUNREACH') {
        logger.error(`Upstream connection failure at ${this.upstreamBaseUrl}: ${err.message} [${requestId}]`);
        return res.status(502).json({
          error: {
            code: 'BAD_GATEWAY',
            message: 'Upstream service is unavailable.',
            statusCode: 502,
            requestId,
            targetUrl
          }
        });
      }

      // Unexpected errors passed to next error handler
      logger.error(`Unexpected upstream proxy error: ${err.message} [${requestId}]`);
      return res.status(502).json({
        error: {
          code: 'BAD_GATEWAY',
          message: 'Upstream service failed to respond cleanly.',
          statusCode: 502,
          requestId
        }
      });
    }
  }
}

const defaultProxyService = new ProxyService();
module.exports = defaultProxyService;
module.exports.ProxyService = ProxyService;

