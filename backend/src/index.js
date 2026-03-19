// =============================================================================
// LLM API Hub — Backend Entry Point
// =============================================================================
// WHAT THIS FILE DOES:
//   Sets up the Express server with all middleware and routes.
//   This is the single entry point — running "node src/index.js" starts everything.
//
// ARCHITECTURE:
//   - Express handles HTTP routing
//   - helmet() adds security headers automatically
//   - cors() allows the frontend to call this backend
//   - Rate limiting prevents abuse of the backend itself
//   - Routes are separated into modules in src/routes/
// =============================================================================

'use strict';

// Load environment variables from .env file FIRST, before any other imports
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const logger = require('./utils/logger');
const { errorHandler } = require('./middleware/errorHandler');
const { authMiddleware } = require('./middleware/auth');

// Import route modules
const registrationRoutes = require('./routes/registrations');
const keysRoutes = require('./routes/keys');
const adminRoutes = require('./routes/admin');
const usageRoutes = require('./routes/usage');
const healthRoutes = require('./routes/health');

// =============================================================================
// Create Express app
// =============================================================================
const app = express();
const PORT = process.env.PORT || 3001;

// =============================================================================
// Security Middleware
// =============================================================================

// helmet() sets secure HTTP response headers automatically.
// It protects against well-known web vulnerabilities with no configuration needed.
app.use(helmet({
  contentSecurityPolicy: false, // Disabled to allow frontend calls — re-enable in production
}));

// CORS — allow requests from the frontend only
// 🔐 SECURITY: In production, replace the localhost URL with your deployed frontend URL.
//   If you set origin: '*', ANY website can call your backend — never do this in production.
const corsOptions = {
  origin: [
    'http://localhost:5173',        // Local Vite dev server
    'http://localhost:3000',        // Alternative local port
    process.env.FRONTEND_URL,       // Production frontend URL from .env
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
};
app.use(cors(corsOptions));

// Parse JSON request bodies (needed to read req.body in route handlers)
app.use(express.json({ limit: '10kb' })); // 10kb limit prevents large payload attacks

// =============================================================================
// Rate Limiting (protects the backend itself)
// =============================================================================
// This limits how many requests a single IP can make to this backend per minute.
// It's separate from the APIM rate limiting (which protects the LLM endpoints).
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15-minute window
  max: 100,                  // Max 100 requests per window per IP
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP. Please wait 15 minutes.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limit for registration endpoint — prevents spam signups
const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1-hour window
  max: 5,                    // Max 5 registration attempts per hour per IP
  message: {
    error: {
      code: 'REGISTRATION_RATE_LIMIT',
      message: 'Too many registration attempts. Please try again in an hour.',
    },
  },
});

app.use(generalLimiter);

// =============================================================================
// Request Logging Middleware
// =============================================================================
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`, {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
      ip: req.ip,
    });
  });
  next();
});

// =============================================================================
// Routes
// =============================================================================

// Health check — no auth required — used by Azure App Service health probes
app.use('/health', healthRoutes);

// Public routes — no authentication required
// registrationLimiter only applies to new sign-ups (POST /api/registrations), not to status or login
app.post('/api/registrations', registrationLimiter);
app.use('/api/registrations', registrationRoutes);

// Protected routes — require valid JWT (consumer must be logged in)
app.use('/api/keys', authMiddleware, keysRoutes);
app.use('/api/usage', authMiddleware, usageRoutes);

// Admin routes — require JWT + admin role
app.use('/api/admin', authMiddleware, adminRoutes);

// 404 handler — catch any route that doesn't match above
app.use((req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `No route found for ${req.method} ${req.path}`,
      status: 404,
    },
  });
});

// =============================================================================
// Global Error Handler — MUST be last middleware
// =============================================================================
app.use(errorHandler);

// =============================================================================
// Start Server
// =============================================================================
app.listen(PORT, () => {
  logger.info(`LLM API Hub backend running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`CORS allowed origins: ${corsOptions.origin.join(', ')}`);
});

module.exports = app;
