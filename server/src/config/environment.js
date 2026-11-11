const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 4000,
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  upstreamBaseUrl: (process.env.UPSTREAM_BASE_URL || 'http://localhost:4001').replace(/\/+$/, ''),
  demoApiKey: process.env.DEMO_API_KEY || 'replace-with-local-demo-key',
  adminApiKey: process.env.ADMIN_API_KEY || 'replace-with-separate-admin-key',
  requestLogLimit: parseInt(process.env.REQUEST_LOG_LIMIT, 10) || 500,
};

module.exports = config;

