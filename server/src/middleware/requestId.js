const { v4: uuidv4 } = require('uuid');

/**
 * Middleware ensuring every request carries a unique tracing ID
 */
function requestIdMiddleware(req, res, next) {
  const incomingId = req.headers['x-request-id'];
  const requestId = incomingId && typeof incomingId === 'string' && incomingId.trim().length > 0
    ? incomingId.trim()
    : uuidv4();

  req.id = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
}

module.exports = requestIdMiddleware;

