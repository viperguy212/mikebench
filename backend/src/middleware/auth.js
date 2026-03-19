// =============================================================================
// Authentication Middleware
// =============================================================================
// WHAT THIS DOES:
//   Validates JWT tokens on protected routes.
//   Tokens are issued by this backend after a user logs in via Azure Entra ID.
//   The middleware reads the token from the Authorization header,
//   verifies its signature, and attaches the user data to req.user.
//
// HOW JWT TOKENS WORK:
//   1. User logs in → backend creates a signed JWT with their email and role
//   2. Frontend stores the JWT in memory (not localStorage — safer)
//   3. Frontend sends JWT in every request: Authorization: Bearer <token>
//   4. This middleware verifies the signature and expiry on each request
//
// 🔐 SECURITY: JWTs are signed with the JWT_SECRET from your .env file.
//   If someone steals your JWT_SECRET, they can forge tokens.
//   Keep it in Key Vault in production.
// =============================================================================

'use strict';

const jwt = require('jsonwebtoken');
const { createError } = require('./errorHandler');

function authMiddleware(req, res, next) {
  // Extract token from Authorization header
  // Expected format: "Authorization: Bearer eyJhbGci..."
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(createError(
      'Authentication required. Include your token in the Authorization header: Bearer <token>',
      401,
      'MISSING_TOKEN'
    ));
  }

  const token = authHeader.split(' ')[1];

  try {
    // Verify the token signature and expiry
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],  // Only accept HS256 — reject other algorithms
      issuer: 'llm-api-hub',
    });

    // Attach user info to request for use in route handlers
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,      // 'admin' or 'consumer'
      consumerId: decoded.consumerId,
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(createError('Your session has expired. Please log in again.', 401, 'TOKEN_EXPIRED'));
    }
    return next(createError('Invalid authentication token.', 401, 'INVALID_TOKEN'));
  }
}

// Middleware that additionally requires the admin role
function adminMiddleware(req, res, next) {
  if (req.user?.role !== 'admin') {
    return next(createError(
      'Admin access required.',
      403,
      'FORBIDDEN'
    ));
  }
  next();
}

// Helper to create a JWT for a user
function createToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      consumerId: user.consumerId,
      iss: 'llm-api-hub',
    },
    process.env.JWT_SECRET,
    {
      algorithm: 'HS256',
      expiresIn: '8h',   // Token expires after 8 hours
    }
  );
}

module.exports = { authMiddleware, adminMiddleware, createToken };
