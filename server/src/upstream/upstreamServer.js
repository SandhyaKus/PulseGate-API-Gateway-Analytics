const upstreamApp = require('./upstreamApp');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const UPSTREAM_PORT = parseInt(process.env.UPSTREAM_PORT || '4001', 10);

const server = upstreamApp.listen(UPSTREAM_PORT, () => {
  console.log(`[UPSTREAM] Trusted Upstream API listening on port ${UPSTREAM_PORT}`);
  console.log(`[UPSTREAM] Sample Endpoint: http://localhost:${UPSTREAM_PORT}/api/products`);
});

function gracefulShutdown(signal) {
  console.log(`[UPSTREAM] Received ${signal}. Shutting down cleanly...`);
  server.close(() => {
    console.log('[UPSTREAM] Server closed.');
    process.exit(0);
  });
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

module.exports = server;

