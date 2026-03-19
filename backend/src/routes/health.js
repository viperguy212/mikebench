// =============================================================================
// Health Check Route — GET /health
// =============================================================================
// WHAT THIS DOES:
//   Returns a simple 200 OK response.
//   Azure App Service calls this endpoint every 30 seconds to verify the
//   backend is running. If it stops returning 200, Azure restarts the app.
// =============================================================================

'use strict';

const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
  });
});

module.exports = router;
