const crypto = require('crypto');
const maskApiKey = require('../utils/maskKey');

/**
 * Computes a SHA-256 cryptographic hash of a raw API key.
 * PulseGate stores hashes in memory and configs to prevent secret leakage.
 *
 * @param {string} rawKey
 * @returns {string} Hex encoded sha256 hash
 */
function hashApiKey(rawKey) {
  if (!rawKey || typeof rawKey !== 'string') return '';
  return crypto.createHash('sha256').update(rawKey.trim()).digest('hex');
}

// Configured raw demo keys loaded from environment variables (with safe local fallbacks)
const RAW_KEYS = {
  free: process.env.DEMO_FREE_API_KEY || 'pg_free_8f7b2c9a',
  pro: process.env.DEMO_PRO_API_KEY || 'pg_pro_4d1e9a3b',
  enterprise: process.env.DEMO_ENT_API_KEY || 'pg_ent_5a2c8e1f',
  demo: process.env.DEMO_API_KEY || 'pg_demo_key_9f83a21b4e',
  disabled: process.env.DEMO_DISABLED_API_KEY || 'pg_disabled_revoked_key_99'
};

/**
 * Pre-configured client definitions with SHA-256 hashes and route policies
 */
const clients = [
  {
    clientId: 'client_free',
    name: 'Starter Developer (Free Tier)',
    apiKeyHash: hashApiKey(RAW_KEYS.free),
    enabled: true,
    tier: 'free',
    capacity: 10,
    refillRatePerSecond: 1, // 1 token/sec, burst 10
    policies: {
      allowedRoutes: ['/api/products', '/api/products/:id', '/health'],
      costMultiplier: 1.0
    },
    description: 'Standard free quota for development and evaluation.'
  },
  {
    clientId: 'client_pro',
    name: 'Scale Engineer (Pro Tier)',
    apiKeyHash: hashApiKey(RAW_KEYS.pro),
    enabled: true,
    tier: 'pro',
    capacity: 60,
    refillRatePerSecond: 10, // 10 tokens/sec, burst 60
    policies: {
      allowedRoutes: ['*'],
      costMultiplier: 1.0
    },
    description: 'High-throughput quota for production microservices.'
  },
  {
    clientId: 'client_enterprise',
    name: 'Global Enterprise (Enterprise Tier)',
    apiKeyHash: hashApiKey(RAW_KEYS.enterprise),
    enabled: true,
    tier: 'enterprise',
    capacity: 300,
    refillRatePerSecond: 50, // 50 tokens/sec, burst 300
    policies: {
      allowedRoutes: ['*'],
      costMultiplier: 0.8
    },
    description: 'Ultra-high concurrency for mission-critical operations.'
  },
  {
    clientId: 'client_demo',
    name: 'Default Demo Developer',
    apiKeyHash: hashApiKey(RAW_KEYS.demo),
    enabled: true,
    tier: 'demo',
    capacity: 20,
    refillRatePerSecond: 2, // 2 tokens/sec, burst 20
    policies: {
      allowedRoutes: ['*'],
      costMultiplier: 1.0
    },
    description: 'Default sandbox client for playground exploration.'
  },
  {
    clientId: 'client_disabled',
    name: 'Suspended Account (Disabled Client)',
    apiKeyHash: hashApiKey(RAW_KEYS.disabled),
    enabled: false,
    tier: 'disabled',
    capacity: 0,
    refillRatePerSecond: 0,
    policies: {
      allowedRoutes: []
    },
    description: 'Suspended client used to test 403 access revocation.'
  }
];

/**
 * Constant-time comparison between two hex hash strings to protect against timing attacks.
 *
 * @param {string} a - Candidate hash
 * @param {string} b - Target stored hash
 * @returns {boolean}
 */
function safeCompareHashes(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');

  if (bufA.length !== bufB.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Finds a client by raw API key using timing-safe hash comparison.
 *
 * @param {string} rawApiKey
 * @returns {Object|null} Matching client or null
 */
function findClientByRawApiKey(rawApiKey) {
  if (!rawApiKey || typeof rawApiKey !== 'string') return null;

  const candidateHash = hashApiKey(rawApiKey);

  for (const client of clients) {
    if (safeCompareHashes(candidateHash, client.apiKeyHash)) {
      return client;
    }
  }

  return null;
}

/**
 * Sanitizes client object so apiKeyHash is NEVER exposed to consumers or responses.
 *
 * @param {Object} client
 * @returns {Object}
 */
function sanitizeClient(client) {
  if (!client) return null;
  const { apiKeyHash, ...safeClient } = client;
  return safeClient;
}

/**
 * Public catalog for the dashboard/playground UI showing demo keys and quotas
 */
function getPublicClientCatalog() {
  return [
    {
      clientId: 'client_free',
      name: 'Starter Developer (Free Tier)',
      apiKey: RAW_KEYS.free,
      maskedKey: maskApiKey(RAW_KEYS.free),
      tier: 'free',
      capacity: 10,
      refillRatePerSecond: 1,
      enabled: true
    },
    {
      clientId: 'client_pro',
      name: 'Scale Engineer (Pro Tier)',
      apiKey: RAW_KEYS.pro,
      maskedKey: maskApiKey(RAW_KEYS.pro),
      tier: 'pro',
      capacity: 60,
      refillRatePerSecond: 10,
      enabled: true
    },
    {
      clientId: 'client_enterprise',
      name: 'Global Enterprise (Enterprise Tier)',
      apiKey: RAW_KEYS.enterprise,
      maskedKey: maskApiKey(RAW_KEYS.enterprise),
      tier: 'enterprise',
      capacity: 300,
      refillRatePerSecond: 50,
      enabled: true
    },
    {
      clientId: 'client_demo',
      name: 'Default Demo Developer',
      apiKey: RAW_KEYS.demo,
      maskedKey: maskApiKey(RAW_KEYS.demo),
      tier: 'demo',
      capacity: 20,
      refillRatePerSecond: 2,
      enabled: true
    },
    {
      clientId: 'client_disabled',
      name: 'Suspended Account (Disabled)',
      apiKey: RAW_KEYS.disabled,
      maskedKey: maskApiKey(RAW_KEYS.disabled),
      tier: 'disabled',
      capacity: 0,
      refillRatePerSecond: 0,
      enabled: false
    }
  ];
}

module.exports = {
  clients,
  RAW_KEYS,
  hashApiKey,
  findClientByRawApiKey,
  sanitizeClient,
  getPublicClientCatalog
};
