const { getPublicClientCatalog } = require('../config/clients');
const rateLimiter = require('../services/rateLimiter');
const logger = require('../utils/logger');

function getClients(req, res) {
  const catalog = getPublicClientCatalog();
  res.json({
    success: true,
    data: catalog,
    clients: catalog
  });
}

async function resetClientBucket(req, res) {
  const { id: clientId } = req.params;
  const { routeId = 'products' } = req.body || {};

  try {
    await rateLimiter.resetBucket(clientId, routeId);
    logger.info(`Manually reset bucket for client [${clientId}] on route [${routeId}]`);

    res.json({
      success: true,
      message: `Rate limit bucket for client "${clientId}" on route "${routeId}" has been reset.`,
      clientId,
      routeId
    });
  } catch (err) {
    logger.error(`Error resetting bucket for ${clientId}: ${err.message}`);
    res.status(500).json({
      error: {
        code: 'RESET_FAILED',
        message: 'Failed to reset rate limit bucket.',
        statusCode: 500,
        requestId: req.id
      }
    });
  }
}

module.exports = {
  getClients,
  resetClientBucket
};

