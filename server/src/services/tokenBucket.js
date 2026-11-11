const {
  validateTokenBucketConfig,
  validateRequestCost,
  roundTokens,
  calculateRetryAfterSeconds
} = require('../utils/rateLimitUtils');

/**
 * PulseGate Token Bucket Implementation
 *
 * Implements an independently testable, in-memory Token Bucket rate limiter
 * supporting burst capacity, continuous replenishment, fractional refill,
 * configurable request weights, and an injectable clock for deterministic testing.
 */
class TokenBucket {
  /**
   * @param {Object} options
   * @param {number} options.capacity - Maximum tokens the bucket can hold (burst limit)
   * @param {number} options.refillRatePerSecond - Continuous token regeneration rate
   * @param {number} [options.initialTokens] - Starting token balance (defaults to capacity)
   * @param {number} [options.defaultCost] - Default tokens consumed per request (defaults to 1)
   * @param {Function} [options.clock] - Function returning current time in milliseconds (defaults to Date.now)
   */
  constructor({
    capacity,
    refillRatePerSecond,
    initialTokens,
    defaultCost = 1,
    clock = () => Date.now()
  } = {}) {
    validateTokenBucketConfig({ capacity, refillRatePerSecond, requestCost: defaultCost });

    if (typeof clock !== 'function') {
      throw new TypeError('Clock must be an executable function returning a timestamp in milliseconds.');
    }

    this.capacity = capacity;
    this.refillRatePerSecond = refillRatePerSecond;
    this.defaultCost = defaultCost;
    this.clock = clock;

    // Initialize timestamps and tokens
    const now = this.clock();
    this.lastRefillTimestamp = now;

    if (initialTokens !== undefined) {
      if (typeof initialTokens !== 'number' || isNaN(initialTokens) || initialTokens < 0) {
        throw new TypeError('initialTokens must be a non-negative finite number.');
      }
      this.currentTokens = roundTokens(Math.min(capacity, initialTokens));
    } else {
      this.currentTokens = capacity;
    }
  }

  /**
   * Evaluates and consumes tokens for a request.
   *
   * @param {number} [cost=this.defaultCost] - Number of tokens to consume for this request
   * @param {number} [now] - Optional deterministic timestamp in milliseconds
   * @returns {{ allowed: boolean, limit: number, remaining: number, retryAfterSeconds: number }}
   */
  consume(cost = this.defaultCost, now) {
    validateRequestCost(cost);

    const currentTime = now !== undefined ? now : this.clock();

    if (typeof currentTime !== 'number' || isNaN(currentTime) || currentTime < 0) {
      throw new TypeError(`Invalid timestamp: ${currentTime}. Timestamp must be a non-negative number.`);
    }

    // 1. Calculate elapsed time in seconds (protect against backwards clock drift)
    const elapsedMs = Math.max(0, currentTime - this.lastRefillTimestamp);
    const elapsedSeconds = elapsedMs / 1000;

    // 2. Refill tokens based on elapsed time (never exceeding capacity)
    const refilledTokens = roundTokens(
      Math.min(this.capacity, this.currentTokens + elapsedSeconds * this.refillRatePerSecond)
    );

    // 3. Update internal timestamp to current request time
    this.lastRefillTimestamp = currentTime;

    // 4. Check if sufficient tokens exist
    if (refilledTokens >= cost) {
      // Allow request
      this.currentTokens = roundTokens(refilledTokens - cost);

      return {
        allowed: true,
        limit: this.capacity,
        remaining: Math.floor(this.currentTokens),
        retryAfterSeconds: 0
      };
    }

    // 5. Reject request (insufficient quota)
    this.currentTokens = refilledTokens;
    const tokensDeficit = roundTokens(cost - refilledTokens);
    const retryAfterSeconds = calculateRetryAfterSeconds(tokensDeficit, this.refillRatePerSecond);

    return {
      allowed: false,
      limit: this.capacity,
      remaining: Math.floor(this.currentTokens),
      retryAfterSeconds
    };
  }

  /**
   * Returns current internal state snapshot
   */
  getState() {
    return {
      capacity: this.capacity,
      refillRatePerSecond: this.refillRatePerSecond,
      currentTokens: this.currentTokens,
      lastRefillTimestamp: this.lastRefillTimestamp
    };
  }

  /**
   * Resets bucket back to full capacity or given balance
   * @param {number} [tokens=this.capacity]
   * @param {number} [timestamp]
   */
  reset(tokens = this.capacity, timestamp) {
    const now = timestamp !== undefined ? timestamp : this.clock();
    this.currentTokens = roundTokens(Math.min(this.capacity, Math.max(0, tokens)));
    this.lastRefillTimestamp = now;
  }
}

module.exports = TokenBucket;

