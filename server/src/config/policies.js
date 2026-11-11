/**
 * PulseGate Client-Specific & Route-Specific Rate Limit Policies
 *
 * Defines explicit quotas, burst capacities, and refill rates per client and route.
 */

const explicitPolicies = [
  // Example policy specified in requirements
  {
    clientId: 'demo-client-a',
    routeId: 'products-read',
    capacity: 10,
    refillRatePerSecond: 2,
    cost: 1
  },
  // Free tier policies
  {
    clientId: 'client_free',
    routeId: 'products-read',
    capacity: 10,
    refillRatePerSecond: 1,
    cost: 1
  },
  {
    clientId: 'client_free',
    routeId: 'products-detail',
    capacity: 10,
    refillRatePerSecond: 1,
    cost: 1
  },
  // Pro tier policies
  {
    clientId: 'client_pro',
    routeId: 'products-read',
    capacity: 60,
    refillRatePerSecond: 10,
    cost: 1
  },
  {
    clientId: 'client_pro',
    routeId: 'products-detail',
    capacity: 60,
    refillRatePerSecond: 10,
    cost: 1
  },
  // Enterprise tier policies
  {
    clientId: 'client_enterprise',
    routeId: 'products-read',
    capacity: 300,
    refillRatePerSecond: 50,
    cost: 1
  },
  // Default demo client
  {
    clientId: 'client_demo',
    routeId: 'products-read',
    capacity: 20,
    refillRatePerSecond: 2,
    cost: 1
  },
  {
    clientId: 'client_demo',
    routeId: 'products-detail',
    capacity: 20,
    refillRatePerSecond: 2,
    cost: 1
  }
];

/**
 * Route resolution patterns to normalize incoming request paths to clean routeIds
 */
const routePatterns = [
  {
    routeId: 'products-read',
    pattern: /^\/(gateway\/)?(api\/)?products\/?$/,
    methods: ['GET']
  },
  {
    routeId: 'products-detail',
    pattern: /^\/(gateway\/)?(api\/)?products\/[a-zA-Z0-9_-]+\/?$/,
    methods: ['GET']
  },
  {
    routeId: 'health-check',
    pattern: /^\/(gateway\/)?health\/?$/,
    methods: ['GET']
  }
];

/**
 * Resolves an incoming request path & method to a normalized routeId
 *
 * @param {string} pathname
 * @param {string} [method='GET']
 * @returns {string} Normalized routeId (e.g. 'products-read', 'products-detail')
 */
function resolveRouteId(pathname = '/', method = 'GET') {
  const normPath = pathname.split('?')[0];
  const normMethod = (method || 'GET').toUpperCase();

  for (const { routeId, pattern, methods } of routePatterns) {
    if (pattern.test(normPath) && (!methods || methods.includes(normMethod))) {
      return routeId;
    }
  }

  // Fallback: derive from clean path segments (e.g. /api/users -> api-users)
  const sanitized = normPath
    .replace(/^\/(gateway\/)?/, '')
    .replace(/^\//, '')
    .replace(/[^a-zA-Z0-9_-]/g, '-');

  return sanitized || 'default-route';
}

/**
 * Resolves the effective rate-limit policy for an authenticated client and route.
 *
 * Precedence:
 * 1. Explicit client + route policy
 * 2. Client profile default quotas (from req.client)
 * 3. System fallback defaults
 *
 * @param {string} clientId
 * @param {string} routeId
 * @param {Object} [clientProfile]
 * @returns {{ clientId: string, routeId: string, capacity: number, refillRatePerSecond: number, cost: number }}
 */
function resolvePolicy(clientId, routeId, clientProfile = null) {
  // 1. Check explicit client + route policies
  const matched = explicitPolicies.find(
    (p) => p.clientId === clientId && p.routeId === routeId
  );

  if (matched) {
    return { ...matched };
  }

  // 2. Use client profile quotas if provided
  if (clientProfile && clientProfile.capacity && clientProfile.refillRatePerSecond) {
    return {
      clientId,
      routeId,
      capacity: clientProfile.capacity,
      refillRatePerSecond: clientProfile.refillRatePerSecond,
      cost: 1
    };
  }

  // 3. Fallback default policy
  return {
    clientId,
    routeId,
    capacity: 10,
    refillRatePerSecond: 1,
    cost: 1
  };
}

// Load optional override policy for baseline performance tests
let overridePolicy = {};
try {
  const path = require('path');
  const overridePath = path.resolve(__dirname, './overridePolicy.json');
  overridePolicy = require(overridePath);
} catch (_) {
  // No override file – continue with normal policies
}

// If the override provides explicitPolicies, merge them (allows baseline high‑capacity policy)
if (overridePolicy && Array.isArray(overridePolicy.explicitPolicies)) {
  explicitPolicies.push(...overridePolicy.explicitPolicies);
}

module.exports = {
  explicitPolicies,
  resolveRouteId,
  resolvePolicy
};

