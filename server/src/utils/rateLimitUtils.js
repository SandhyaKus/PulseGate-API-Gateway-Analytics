/**
 * PulseGate Rate Limiter Utilities
 * Provides input validation, floating-point stabilization, and retry calculations.
 */

/**
 * Validates Token Bucket configuration parameters.
 * Throws an Error with descriptive message if any value is invalid.
 *
 * @param {Object} config
 * @param {number} config.capacity - Maximum token capacity (must be positive finite number)
 * @param {number} config.refillRatePerSecond - Refill rate in tokens per second (must be positive finite number)
 * @param {number} [config.requestCost] - Cost of request in tokens (must be positive finite number, defaults to 1)
 */
function validateTokenBucketConfig({ capacity, refillRatePerSecond, requestCost = 1 }) {
  if (typeof capacity !== 'number' || isNaN(capacity) || !isFinite(capacity) || capacity <= 0) {
    throw new TypeError(`Invalid capacity: ${capacity}. Capacity must be a positive finite number.`);
  }

  if (typeof refillRatePerSecond !== 'number' || isNaN(refillRatePerSecond) || !isFinite(refillRatePerSecond) || refillRatePerSecond <= 0) {
    throw new TypeError(
      `Invalid refillRatePerSecond: ${refillRatePerSecond}. Refill rate must be a positive finite number.`
    );
  }

  if (requestCost !== undefined) {
    validateRequestCost(requestCost);
  }
}

/**
 * Validates request cost parameter
 * @param {number} cost
 */
function validateRequestCost(cost) {
  if (typeof cost !== 'number' || isNaN(cost) || !isFinite(cost) || cost <= 0) {
    throw new TypeError(`Invalid request cost: ${cost}. Cost must be a positive finite number.`);
  }
}

/**
 * Rounds floating-point numbers to fixed precision to prevent IEEE-754 drift.
 * (e.g. 0.1 + 0.2 = 0.30000000000000004 -> 0.3)
 *
 * @param {number} value
 * @param {number} precision - decimal places (default 6)
 * @returns {number}
 */
function roundTokens(value, precision = 6) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

/**
 * Calculates seconds required until sufficient tokens exist to satisfy cost.
 *
 * @param {number} tokensDeficit - Tokens required minus currently available
 * @param {number} refillRatePerSecond - Refill rate in tokens per second
 * @returns {number} Integer seconds (minimum 1 second when deficit > 0)
 */
function calculateRetryAfterSeconds(tokensDeficit, refillRatePerSecond) {
  if (tokensDeficit <= 0) {
    return 0;
  }
  const seconds = tokensDeficit / refillRatePerSecond;
  return Math.max(1, Math.ceil(seconds));
}

module.exports = {
  validateTokenBucketConfig,
  validateRequestCost,
  roundTokens,
  calculateRetryAfterSeconds,
};

