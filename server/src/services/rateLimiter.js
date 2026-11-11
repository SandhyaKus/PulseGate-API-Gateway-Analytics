const fs = require('fs');
const path = require('path');
const defaultRedis = require('./redis');
const TokenBucket = require('./tokenBucket');
const logger = require('../utils/logger');
const {
  validateTokenBucketConfig,
  validateRequestCost
} = require('../utils/rateLimitUtils');

// Load Lua script from server/src/scripts/tokenBucket.lua
const LUA_SCRIPT_PATH = path.resolve(__dirname, '../scripts/tokenBucket.lua');
let cachedLuaScript = null;

function loadLuaScript() {
  if (!cachedLuaScript) {
    cachedLuaScript = fs.readFileSync(LUA_SCRIPT_PATH, 'utf8');
  }
  return cachedLuaScript;
}

class RedisRateLimiter {
  /**
   * @param {Object} [options]
   * @param {Object} [options.redisService] - Redis service instance (defaults to singleton)
   * @param {boolean} [options.fallbackToMemory=true] - Fall back to in-memory token bucket if Redis fails
   */
  constructor({ redisService = defaultRedis, fallbackToMemory = true } = {}) {
    this.redisService = redisService;
    this.fallbackToMemory = fallbackToMemory;
    this.luaScript = loadLuaScript();
    this.inMemoryBuckets = new Map(); // Fallback storage if Redis is down
  }

  /**
   * Generates a safe Redis key following: rate:{clientId}:{routeId}
   * Never stores or uses raw API keys.
   *
   * @param {string} clientId
   * @param {string} routeId
   * @returns {string}
   */
  getRateLimitKey(clientId, routeId) {
    const safeClient = String(clientId || 'anon').replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeRoute = String(routeId || 'default').replace(/[^a-zA-Z0-9_-]/g, '_');
    return `rate:${safeClient}:${safeRoute}`;
  }

  /**
   * Calculates an appropriate TTL (seconds) based on capacity and refill rate.
   * Ensures the key expires only after the bucket has refilled completely to capacity and remained idle.
   *
   * @param {number} capacity
   * @param {number} refillRatePerSecond
   * @returns {number}
   */
  calculateTTL(capacity, refillRatePerSecond) {
    const refillDurationSecs = Math.ceil(capacity / refillRatePerSecond);
    // Double the refill duration + minimum 60s buffer
    return Math.max(60, refillDurationSecs * 2);
  }

  /**
   * Atomically evaluates and consumes quota using the Redis Lua script.
   *
   * @param {Object} params
   * @param {string} params.clientId - Distinct client or tenant identifier (NOT raw API key)
   * @param {string} params.routeId - Route or action identifier
   * @param {number} params.capacity - Bucket maximum token capacity
   * @param {number} params.refillRatePerSecond - Token regeneration rate per second
   * @param {number} [params.cost=1] - Tokens consumed for this request
   * @param {number} [params.nowTimestampSecs] - Optional float timestamp in seconds (0 = use Redis TIME)
   * @returns {Promise<{ allowed: boolean, limit: number, remaining: number, retryAfterSeconds: number, source: string }>}
   */
  async consume({
    clientId,
    routeId,
    capacity,
    refillRatePerSecond,
    cost = 1,
    nowTimestampSecs = 0
  }) {
    validateTokenBucketConfig({ capacity, refillRatePerSecond, requestCost: cost });

    const key = this.getRateLimitKey(clientId, routeId);
    const ttlSeconds = this.calculateTTL(capacity, refillRatePerSecond);

    const client = this.redisService.getClient();

    // Check Redis connectivity
    if (client && this.redisService.isConnected) {
      try {
        // Execute atomic Lua script
        const result = await client.eval(this.luaScript, {
          keys: [key],
          arguments: [
            String(capacity),
            String(refillRatePerSecond),
            String(cost),
            String(nowTimestampSecs || 0),
            String(ttlSeconds)
          ]
        });

        // Lua returns [allowed (1/0), integer_remaining, retry_after, precise_float_str]
        const allowed = Number(result[0]) === 1;
        const remaining = Number(result[1]);
        const retryAfterSeconds = Number(result[2]);

        return {
          allowed,
          limit: capacity,
          remaining: Math.max(0, remaining),
          retryAfterSeconds,
          key,
          source: 'redis-lua'
        };
      } catch (err) {
        logger.error(`Redis Lua rate limit execution error on key "${key}": ${err.message}`);
        if (!this.fallbackToMemory) {
          throw err;
        }
      }
    }

    // Fallback: If Redis is unavailable and fallbackToMemory is enabled
    if (this.fallbackToMemory) {
      logger.warn(`Redis unavailable. Falling back to in-memory Token Bucket for key: ${key}`);
      let bucket = this.inMemoryBuckets.get(key);
      if (!bucket) {
        bucket = new TokenBucket({ capacity, refillRatePerSecond });
        this.inMemoryBuckets.set(key, bucket);
      }

      const result = bucket.consume(cost);
      return {
        ...result,
        key,
        source: 'in-memory-fallback'
      };
    }

    throw new Error('Redis rate limiter unavailable and fallback is disabled.');
  }

  /**
   * Resets rate limit for a client and route (deletes Redis key)
   *
   * @param {string} clientId
   * @param {string} routeId
   */
  async resetBucket(clientId, routeId) {
    const key = this.getRateLimitKey(clientId, routeId);
    this.inMemoryBuckets.delete(key);

    const client = this.redisService.getClient();
    if (client && this.redisService.isConnected) {
      try {
        await client.del(key);
        return true;
      } catch (err) {
        logger.error(`Failed to reset Redis key ${key}: ${err.message}`);
        return false;
      }
    }
    return true;
  }

  /**
   * Fetches raw state from Redis for diagnostics and tests
   *
   * @param {string} clientId
   * @param {string} routeId
   */
  async getBucketState(clientId, routeId) {
    const key = this.getRateLimitKey(clientId, routeId);
    const client = this.redisService.getClient();
    if (client && this.redisService.isConnected) {
      const data = await client.hGetAll(key);
      const ttl = await client.ttl(key);
      return {
        key,
        tokens: data.tokens ? parseFloat(data.tokens) : null,
        lastRefillTimestamp: data.lastRefillTimestamp ? parseFloat(data.lastRefillTimestamp) : null,
        ttl
      };
    }
    return null;
  }
}

const defaultRateLimiter = new RedisRateLimiter({ fallbackToMemory: false });
module.exports = defaultRateLimiter;
module.exports.RedisRateLimiter = RedisRateLimiter;

