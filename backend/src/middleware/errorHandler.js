// =============================================================================
// Global Error Handler Middleware
// =============================================================================
// WHAT THIS DOES:
//   Catches any unhandled errors thrown in route handlers and formats them
//   as consistent JSON responses. Without this, Express returns HTML error
//   pages which are not useful to API consumers.
//
// HOW IT WORKS:
//   When you call next(error) in any route handler, Express skips all normal
//   middleware and jumps to this handler (it has 4 parameters — that's how
//   Express identifies error handlers).
// =============================================================================

'use strict';

const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  // Log the full error for debugging
  logger.error('Unhandled error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Determine status code
  const statusCode = err.statusCode || err.status || 500;

  // Never expose internal error details in production
  const message = process.env.NODE_ENV === 'production' && statusCode === 500
    ? 'An internal server error occurred.'
    : err.message;

  res.status(statusCode).json({
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message,
      status: statusCode,
    },
  });
}

// Helper to create structured errors with status codes
function createError(message, statusCode = 500, code = 'ERROR') {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  return err;
}

module.exports = { errorHandler, createError };
