/**
 * Whitelisted upstream proxy routes and token consumption costs.
 * Strictly prevents SSRF by disallowing arbitrary target URLs.
 */
const routeRules = [
  {
    path: '/api/products',
    exact: true,
    methods: ['GET'],
    cost: 1,
    description: 'Fetch catalog products (Standard cost: 1 token)'
  },
  {
    path: '/api/products/:id',
    pattern: /^\/api\/products\/[a-zA-Z0-9_-]+$/,
    methods: ['GET'],
    cost: 1,
    description: 'Fetch specific product details (Standard cost: 1 token)'
  },
  {
    path: '/health',
    exact: true,
    methods: ['GET'],
    cost: 1,
    description: 'Upstream microservice health probe'
  }
];

/**
 * Resolves request path to matching route rule
 * @param {string} pathname
 * @param {string} method
 * @returns {{ matched: boolean, rule: Object|null, routeId: string }}
 */
function resolveRouteRule(pathname, method = 'GET') {
  const normalizedPath = (pathname || '/').replace(/\/+$/, '') || '/';
  const normalizedMethod = (method || 'GET').toUpperCase();

  for (const rule of routeRules) {
    let matches = false;

    if (rule.exact) {
      matches = rule.path === normalizedPath;
    } else if (rule.pattern) {
      matches = rule.pattern.test(normalizedPath);
    }

    if (matches) {
      if (rule.methods.includes(normalizedMethod)) {
        // Derive clean routeId for Redis key: e.g. "api_products"
        const routeId = normalizedPath.replace(/^\//, '').replace(/[^a-zA-Z0-9_-]/g, '_');
        return {
          matched: true,
          rule,
          routeId
        };
      }
    }
  }

  return {
    matched: false,
    rule: null,
    routeId: 'unknown'
  };
}

module.exports = {
  routeRules,
  resolveRouteRule
};

