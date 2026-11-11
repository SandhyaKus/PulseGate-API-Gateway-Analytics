const { createClient } = require('redis');
const config = require('../config/environment');
const logger = require('../utils/logger');

class RedisClientService {
  constructor(url = config.redisUrl) {
    this.url = url;
    this.client = null;
    this.isConnected = false;
    this.isConnecting = false;
    this.lastError = null;
    this.connectionAttempts = 0;
  }

  /**
   * Initializes and connects to Redis
   */
  async connect() {
    if (this.client && this.isConnected) {
      return this.client;
    }

    if (this.isConnecting) {
      return this.client;
    }

    this.isConnecting = true;

    try {
      this.client = createClient({
        url: this.url,
        socket: {
          reconnectStrategy: (retries) => {
            this.connectionAttempts = retries;
            if (retries > 10) {
              logger.warn('Redis reconnection backoff reached max interval (5s)');
              return 5000;
            }
            return Math.min(retries * 200, 3000);
          },
          connectTimeout: 5000,
        }
      });

      this.client.on('connect', () => {
        logger.info(`Redis connecting to ${this.url.replace(/:[^:]*@/, ':****@')}...`);
      });

      this.client.on('ready', () => {
        this.isConnected = true;
        this.isConnecting = false;
        this.lastError = null;
        logger.info('Redis connection ready and active.');
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        this.lastError = err.message;
        logger.error(`Redis client error: ${err.message}`);
      });

      this.client.on('end', () => {
        this.isConnected = false;
        this.isConnecting = false;
        logger.warn('Redis connection closed.');
      });

      this.client.on('reconnecting', () => {
        this.isConnected = false;
        this.isConnecting = true;
        logger.info('Redis attempting to reconnect...');
      });

      await this.client.connect().catch((err) => {
        this.isConnected = false;
        this.isConnecting = false;
        this.lastError = err.message;
        logger.warn(`Initial Redis connection could not be established: ${err.message}`);
      });

      return this.client;
    } catch (err) {
      this.isConnected = false;
      this.isConnecting = false;
      this.lastError = err.message;
      logger.error(`Failed to create Redis client: ${err.message}`);
      return null;
    }
  }

  /**
   * Ping Redis to verify round-trip health
   */
  async ping() {
    if (!this.client || !this.isConnected) {
      return { ok: false, error: this.lastError || 'Redis not connected' };
    }

    const start = process.hrtime.bigint();
    try {
      const reply = await this.client.ping();
      const end = process.hrtime.bigint();
      const latencyMs = Number(end - start) / 1e6;

      return {
        ok: reply === 'PONG',
        reply,
        latencyMs: Math.round(latencyMs * 100) / 100
      };
    } catch (err) {
      this.lastError = err.message;
      return { ok: false, error: err.message };
    }
  }

  /**
   * Health status for probes
   */
  async getStatus() {
    const pingResult = await this.ping();
    return {
      connected: this.isConnected,
      configuredUrl: this.url.replace(/:[^:]*@/, ':****@'),
      latencyMs: pingResult.latencyMs || null,
      lastError: this.isConnected ? null : this.lastError,
      reconnectAttempts: this.connectionAttempts
    };
  }

  /**
   * Returns underlying raw Redis client
   */
  getClient() {
    return this.client;
  }

  /**
   * Disconnect cleanly
   */
  async disconnect() {
    if (this.client && this.isConnected) {
      try {
        await this.client.quit();
        this.isConnected = false;
        logger.info('Redis connection cleanly terminated.');
      } catch (err) {
        logger.error(`Error disconnecting Redis: ${err.message}`);
        await this.client.disconnect().catch(() => {});
      }
    }
  }
}

const defaultRedisService = new RedisClientService();
module.exports = defaultRedisService;
module.exports.RedisClientService = RedisClientService;

