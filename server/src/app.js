const express = require('express');
const cors = require('cors');
const config = require('./config/environment');
const requestIdMiddleware = require('./middleware/requestId');
const telemetryMiddleware = require('./middleware/telemetry');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const healthRoutes = require('./routes/health.routes');
const gatewayRoutes = require('./routes/gatewayRoutes');
const adminRoutes = require('./routes/admin.routes');
const logger = require('./utils/logger');

const app = express();

// 1. Request Tracing & Telemetry Middleware
app.use(requestIdMiddleware);
app.use(telemetryMiddleware);

// 2. CORS Configuration - Allow all local origins to prevent browser blocks
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'X-Request-Id']
}));

// 3. Body Parsing Middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// 3b. Disable HTTP caching on all API & Gateway responses so dashboard receives fresh data
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// 4. Request Logging Middleware (Development)
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms [${req.id}]`);
  });
  next();
});

// 5. Core Health Endpoint
app.use(healthRoutes);

// 6. Admin, Analytics & Traffic Explorer API
app.use('/api', adminRoutes);

// 7. PulseGate Protected Reverse Proxy Gateway
app.use('/gateway', gatewayRoutes);

// Root informational endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'PulseGate — API Gateway & Live Analytics',
    version: '1.0.0',
    documentation: '/health',
    status: 'online'
  });
});

// 6. 404 Route Handler
app.use(notFoundHandler);

// 7. Centralized Error Handler
app.use(errorHandler);

module.exports = app;

