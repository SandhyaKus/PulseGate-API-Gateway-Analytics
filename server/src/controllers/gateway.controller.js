const axios = require('axios');
const config = require('../config/environment');
const logger = require('../utils/logger');

/**
 * Fixed Upstream Reverse Proxy Controller
 * Strictly forwards allowed requests to trusted UPSTREAM_BASE_URL.
 * Immune to SSRF: Never accepts user-supplied destination hosts.
 */
async function proxyToUpstream(req, res) {
  // Construct destination URL strictly targeting trusted upstream base
  const targetPath = req.path;
  const targetUrl = `${config.upstreamBaseUrl}${targetPath}`;

  // Filter sensitive headers
  const forwardedHeaders = { ...req.headers };
  delete forwardedHeaders['host'];
  delete forwardedHeaders['x-api-key']; // Never leak client API key to upstream microservice
  delete forwardedHeaders['authorization'];

  // Inject gateway tracing headers
  forwardedHeaders['x-request-id'] = req.id;
  forwardedHeaders['x-client-id'] = req.client ? req.client.id : 'unknown';
  forwardedHeaders['x-forwarded-for'] = req.ip || req.connection.remoteAddress;
  forwardedHeaders['x-forwarded-host'] = req.get('host') || 'pulsegate';

  try {
    const upstreamResponse = await axios({
      method: req.method,
      url: targetUrl,
      params: req.query,
      data: req.body && Object.keys(req.body).length > 0 ? req.body : undefined,
      headers: forwardedHeaders,
      timeout: 8000,
      validateStatus: () => true // Allow all status codes from upstream to pass through
    });

    // Forward upstream status code and headers
    res.status(upstreamResponse.status);

    // Forward safe upstream headers (content-type, etag, cache-control)
    const headersToForward = ['content-type', 'etag', 'cache-control'];
    headersToForward.forEach((h) => {
      if (upstreamResponse.headers[h]) {
        res.setHeader(h, upstreamResponse.headers[h]);
      }
    });

    return res.send(upstreamResponse.data);
  } catch (err) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
      logger.error(`Upstream service unavailable at ${config.upstreamBaseUrl}: ${err.message}`);
      return res.status(502).json({
        error: {
          code: 'BAD_GATEWAY',
          message: 'The trusted upstream microservice is currently unreachable.',
          statusCode: 502,
          requestId: req.id,
          targetUrl
        }
      });
    }

    if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
      logger.error(`Upstream request timed out at ${targetUrl}`);
      return res.status(504).json({
        error: {
          code: 'GATEWAY_TIMEOUT',
          message: 'The trusted upstream microservice failed to respond within timeout limit.',
          statusCode: 504,
          requestId: req.id
        }
      });
    }

    logger.error(`Gateway forwarding error: ${err.message}`);
    return res.status(500).json({
      error: {
        code: 'GATEWAY_PROXY_ERROR',
        message: 'An unexpected proxy error occurred.',
        statusCode: 500,
        requestId: req.id
      }
    });
  }
}

module.exports = {
  proxyToUpstream
};

