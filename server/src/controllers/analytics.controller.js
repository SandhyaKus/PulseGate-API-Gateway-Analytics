const metricsService = require('../services/metrics.service');
const logStore = require('../services/logStore.service');
const redisService = require('../services/redis.service');
const logger = require('../utils/logger');

function getOverview(req, res) {
  const overview = metricsService.getOverview();
  res.json({
    success: true,
    data: overview
  });
}

function getTimeseries(req, res) {
  const timeseries = metricsService.getTimeseries();
  res.json({
    success: true,
    data: timeseries
  });
}

async function resetAnalytics(req, res) {
  try {
    // 1. Reset in-memory telemetry & metrics
    metricsService.reset();

    // 2. Clear traffic logs
    logStore.clear();

    // 3. Clear Redis rate limit keys (safe guard)
    try {
      const client = redisService.getClient();
      if (client && redisService.isConnected) {
        const keys = await client.keys('rate:*');
        if (keys && keys.length > 0) {
          await client.del(keys);
        }
      }
    } catch (redisErr) {
      logger.warn(`Could not clear Redis keys during reset: ${redisErr.message}`);
    }

    logger.info('Manually reset all analytics, logs, and Redis rate-limit tokens.');

    res.json({
      success: true,
      message: 'All metrics, logs, and Redis rate limit token caches cleared successfully.'
    });
  } catch (err) {
    logger.error(`Error during analytics reset: ${err.message}`);
    res.status(500).json({
      error: {
        code: 'RESET_FAILED',
        message: err.message,
        statusCode: 500
      }
    });
  }
}

module.exports = {
  getOverview,
  getTimeseries,
  resetAnalytics
};

