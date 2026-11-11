const app = require('./app');
const config = require('./config/environment');
const redisService = require('./services/redis.service');
const logger = require('./utils/logger');

let server = null;

async function startServer() {
  try {
    logger.info('Starting PulseGate Gateway server...');
    logger.info(`Environment: ${config.env}`);
    logger.info(`Port: ${config.port}`);
    logger.info(`Client Origin: ${config.clientOrigin}`);
    logger.info(`Trusted Upstream: ${config.upstreamBaseUrl}`);

    // Connect to Redis in the background (non-blocking for resilient boot)
    redisService.connect().catch((err) => {
      logger.warn(`Redis connection failed during startup: ${err.message}`);
    });

    server = app.listen(config.port, () => {
      logger.info(`====================================================`);
      logger.info(`🚀 PulseGate Gateway running on http://localhost:${config.port}`);
      logger.info(`🩺 Health Check: http://localhost:${config.port}/health`);
      logger.info(`====================================================`);
    });

    server.on('error', (err) => {
      logger.error(`Server listen error: ${err.message}`);
      process.exit(1);
    });

  } catch (err) {
    logger.error(`Fatal startup failure: ${err.message}`);
    process.exit(1);
  }
}

// Graceful shutdown handler
async function gracefulShutdown(signal) {
  logger.warn(`Received ${signal}. Initiating graceful shutdown...`);

  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed.');
      try {
        await redisService.disconnect();
        logger.info('PulseGate shutdown sequence completed cleanly.');
        process.exit(0);
      } catch (err) {
        logger.error(`Error during Redis disconnection: ${err.message}`);
        process.exit(1);
      }
    });

    // Force close after 10 seconds if lingering connections remain
    setTimeout(() => {
      logger.error('Graceful shutdown timed out. Forcing process exit.');
      process.exit(1);
    }, 10000).unref();
  } else {
    process.exit(0);
  }
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  logger.error(`Unhandled Rejection: ${reason}`);
});

process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.message}`, { stack: err.stack });
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

startServer();

module.exports = server;

