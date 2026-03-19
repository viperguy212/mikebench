// =============================================================================
// Registrations Route — POST /api/registrations
// =============================================================================
// WHAT THIS DOES:
//   Handles new consumer sign-up submissions from the registration form.
//   Validates the input, checks for duplicates, saves to Cosmos DB,
//   and notifies admins.
//
// ENDPOINTS:
//   POST /api/registrations        — Submit a new registration
//   GET  /api/registrations/status — Check registration status by email
//   POST /api/registrations/login  — Exchange Entra ID token for app JWT
// =============================================================================

'use strict';

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

const cosmosService = require('../services/cosmos');
const { createToken } = require('../middleware/auth');
const { createError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

// =============================================================================
// POST /api/registrations
// Submit a new registration
// =============================================================================
router.post('/', async (req, res, next) => {
  try {
    const { firstName, lastName, email, organization, useCase, tier } = req.body;

    // -------------------------------------------------------
    // Input Validation
    // -------------------------------------------------------
    const errors = [];

    if (!firstName?.trim()) errors.push('First name is required');
    if (!lastName?.trim()) errors.push('Last name is required');
    if (!email?.trim()) errors.push('Email is required');
    if (!organization?.trim()) errors.push('Organization is required');
    if (!useCase?.trim()) errors.push('Use case description is required');
    if (!tier) errors.push('Tier selection is required');

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email)) {
      errors.push('Invalid email address format');
    }

    // Validate tier
    const validTiers = ['free-tier', 'developer-tier', 'enterprise-tier'];
    if (tier && !validTiers.includes(tier)) {
      errors.push(`Invalid tier. Must be one of: ${validTiers.join(', ')}`);
    }

    // Sanitize: limit field lengths
    if (firstName?.length > 100) errors.push('First name too long (max 100 chars)');
    if (lastName?.length > 100) errors.push('Last name too long (max 100 chars)');
    if (organization?.length > 200) errors.push('Organization name too long (max 200 chars)');
    if (useCase?.length > 1000) errors.push('Use case description too long (max 1000 chars)');

    if (errors.length > 0) {
      return next(createError(`Validation failed: ${errors.join('; ')}`, 400, 'VALIDATION_ERROR'));
    }

    // -------------------------------------------------------
    // Check for duplicate registration
    // -------------------------------------------------------
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await cosmosService.getRegistrationByEmail(normalizedEmail);

    if (existing) {
      if (existing.status === 'pending') {
        return res.status(409).json({
          error: {
            code: 'ALREADY_REGISTERED',
            message: 'A registration for this email is already pending review. You will receive an email when it is processed.',
            status: 409,
          },
        });
      }
      if (existing.status === 'approved') {
        return res.status(409).json({
          error: {
            code: 'ALREADY_APPROVED',
            message: 'This email address already has an active registration. Log in to view your API key.',
            status: 409,
          },
        });
      }
      // If rejected, allow re-registration
    }

    // -------------------------------------------------------
    // Create registration record
    // -------------------------------------------------------
    const registration = await cosmosService.createRegistration({
      id: uuidv4(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: normalizedEmail,
      organization: organization.trim(),
      useCase: useCase.trim(),
      tier,
    });

    logger.info(`New registration submitted: ${normalizedEmail} for ${tier}`);

    res.status(201).json({
      message: 'Registration submitted successfully. You will receive an email once your request is reviewed.',
      registrationId: registration.id,
    });

  } catch (err) {
    next(err);
  }
});

// =============================================================================
// GET /api/registrations/status?email=xxx
// Check the status of a registration
// =============================================================================
router.get('/status', async (req, res, next) => {
  try {
    const { email } = req.query;

    if (!email) {
      return next(createError('Email parameter is required', 400, 'MISSING_PARAM'));
    }

    const registration = await cosmosService.getRegistrationByEmail(email.toLowerCase().trim());

    if (!registration) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'No registration found for this email address.',
          status: 404,
        },
      });
    }

    // Return status but not sensitive data (APIM key is sent via email, not this endpoint)
    res.json({
      status: registration.status,
      tier: registration.tier,
      createdAt: registration.createdAt,
      updatedAt: registration.updatedAt,
    });

  } catch (err) {
    next(err);
  }
});

// =============================================================================
// POST /api/registrations/login
// Exchange user credentials for an app JWT
// Consumer flow:
//   1. User enters email on login page
//   2. Backend checks if they have an approved registration
//   3. If yes, issues a JWT they can use to access /api/keys and /api/usage
// =============================================================================
router.post('/login', async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email?.trim()) {
      return next(createError('Email is required', 400, 'MISSING_EMAIL'));
    }

    const normalizedEmail = email.trim().toLowerCase();
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase());
    const isAdmin = adminEmails.includes(normalizedEmail);

    const registration = await cosmosService.getRegistrationByEmail(normalizedEmail);

    // Admin emails can log in even without a registration record (bootstrap case)
    if (!isAdmin && (!registration || registration.status !== 'approved')) {
      return res.status(401).json({
        error: {
          code: 'NOT_APPROVED',
          message: 'No approved registration found for this email. Please register first or wait for approval.',
          status: 401,
        },
      });
    }

    const role = isAdmin ? 'admin' : 'consumer';
    const userId = registration?.id || `admin-${normalizedEmail.replace(/[^a-z0-9]/g, '')}`;

    const token = createToken({
      id: userId,
      email: normalizedEmail,
      role,
      consumerId: userId,
    });

    res.json({
      token,
      user: {
        email: normalizedEmail,
        firstName: registration?.firstName || 'Admin',
        lastName: registration?.lastName || '',
        role,
        tier: registration?.tier || 'enterprise-tier',
      },
    });

  } catch (err) {
    next(err);
  }
});

module.exports = router;
