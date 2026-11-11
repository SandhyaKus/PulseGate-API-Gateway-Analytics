const express = require('express');
const cors = require('cors');
const sampleProducts = require('./products.data');

const upstreamApp = express();

upstreamApp.use(cors());
upstreamApp.use(express.json());

// Upstream Health
upstreamApp.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'PulseGate Trusted Upstream Mock API',
    port: process.env.PORT || 4001,
    timestamp: new Date().toISOString()
  });
});

// Fixed trusted endpoint: GET /api/products
upstreamApp.get('/api/products', (req, res) => {
  const { category, limit } = req.query;
  let products = [...sampleProducts];

  if (category) {
    products = products.filter(p => p.category.toLowerCase() === category.toLowerCase());
  }

  if (limit) {
    const parsedLimit = parseInt(limit, 10);
    if (!isNaN(parsedLimit) && parsedLimit > 0) {
      products = products.slice(0, parsedLimit);
    }
  }

  res.json({
    success: true,
    count: products.length,
    total: sampleProducts.length,
    data: products
  });
});

// Upstream specific product by ID
upstreamApp.get('/api/products/:id', (req, res) => {
  const product = sampleProducts.find(p => p.id === req.params.id || p.slug === req.params.id);
  if (!product) {
    return res.status(404).json({
      success: false,
      error: `Product not found: ${req.params.id}`
    });
  }
  res.json({ success: true, data: product });
});

module.exports = upstreamApp;

