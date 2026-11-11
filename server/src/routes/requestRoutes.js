// server/src/routes/requestRoutes.js
// Endpoint for retrieving raw request logs with filtering & pagination.

const express = require('express');
const router = express.Router();
const logStore = require('../services/logStore.service');

/**
 * GET /api/requests
 * Query params: clientId, status, outcome, search, limit, offset
 */
router.get('/', (req, res) => {
  const { clientId, status, outcome, search, limit, offset } = req.query;
  const result = logStore.query({
    clientId,
    status,
    outcome,
    search,
    limit: limit ? parseInt(limit, 10) : 50,
    offset: offset ? parseInt(offset, 10) : 0
  });
  res.json({ success: true, ...result });
});

module.exports = router;

