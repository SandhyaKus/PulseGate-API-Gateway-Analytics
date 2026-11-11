const logger = require('../utils/logger');

/**
 * Centralized application error handling middleware
 */
function errorHandler(err, req, res, next) {
  const statusCode = err.status || err.statusCode || 500;
  const requestId = req.id || 'unknown';

  logger.error(`[${requestId}] ${req.method} ${req.originalUrl} - ${statusCode} ${err.message}`, {
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });

  res.status(statusCode).json({
    error: {
      message: err.message || 'Internal Server Error',
      statusCode,
      requestId,
      code: err.code || 'INTERNAL_ERROR',
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === 'development' && { details: err.stack })
    }
  });
}

/**
 * 404 Route Not Found handler
 */
function notFoundHandler(req, res, next) {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.status = 404;
  error.code = 'NOT_FOUND';
  next(error);
}

module.exports = {
  errorHandler,
  notFoundHandler
};

