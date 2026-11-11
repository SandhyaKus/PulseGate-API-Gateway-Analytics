const express = require('express');
const router = express.Router();

const analyticsController = require('../controllers/analytics.controller');
const logsController = require('../controllers/logs.controller');
const clientsController = require('../controllers/clients.controller');
const metricsService = require('../services/metrics');

// Analytics Endpoints
router.get('/analytics/overview', analyticsController.getOverview);
router.get('/analytics/timeseries', analyticsController.getTimeseries);
router.post('/analytics/reset', analyticsController.resetAnalytics);

// Metrics Endpoints (delegated to separate router)
const metricsRoutes = require('../routes/metricsRoutes');
router.use('/metrics', metricsRoutes);

// Traffic Explorer Logs Endpoints
router.get('/logs', logsController.getLogs);
router.get('/logs/stats', logsController.getLogStats);
router.delete('/logs', logsController.clearLogs);

// Request Logs (delegated to separate router)
const requestRoutes = require('../routes/requestRoutes');
router.use('/requests', requestRoutes);

// Client Management Endpoints
router.get('/clients', clientsController.getClients);
router.post('/clients/:id/reset', clientsController.resetClientBucket);

module.exports = router;

