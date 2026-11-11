const logStore = require('../services/logStore.service');

function getLogs(req, res) {
  const { clientId, status, outcome, search, limit, offset } = req.query;

  const result = logStore.query({
    clientId,
    status,
    outcome,
    search,
    limit: limit ? parseInt(limit, 10) : 50,
    offset: offset ? parseInt(offset, 10) : 0
  });

  res.json({
    success: true,
    ...result
  });
}

function getLogStats(req, res) {
  const stats = logStore.getStats();
  res.json({
    success: true,
    data: stats
  });
}

function clearLogs(req, res) {
  logStore.clear();
  res.json({
    success: true,
    message: 'Traffic logs cleared successfully.'
  });
}

module.exports = {
  getLogs,
  getLogStats,
  clearLogs
};

