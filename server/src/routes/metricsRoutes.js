// server/src/routes/metricsRoutes.js
// Exposes metrics summary and traffic time‑bucket endpoints.

const express = require('express');
const router = express.Router();
const metricsService = require('../services/metrics');

// GET /api/metrics/summary
router.get('/summary', (req, res) => {
  const data = metricsService.getSummary();
  res.json({ success: true, data });
});

// GET /api/metrics/traffic?range=1h
router.get('/traffic', (req, res) => {
  const range = req.query.range || '1h';
  const data = metricsService.getTraffic(range);
  res.json({ success: true, data });
});

module.exports = router;

