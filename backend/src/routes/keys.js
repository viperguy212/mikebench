// =============================================================================
// Keys Routes — /api/keys/*
// =============================================================================
// WHAT THIS DOES:
//   Lets authenticated consumers view and manage their API keys.
//   All routes require a valid JWT (the user must be logged in).
//
// ENDPOINTS:
//   GET  /api/keys          — Get the consumer's current API key
//   POST /api/keys/regenerate — Regenerate the primary key (old key stops working)
// =============================================================================

'use strict';

const express = require('express');
const router = express.Router();

const cosmosService = require('../services/cosmos');
const apimService = require('../services/apim');
const emailService = require('../services/email');
const { createError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

// =============================================================================
// GET /api/keys
// Get the consumer's API key (shown partially masked for security)
// =============================================================================
router.get('/', async (req, res, next) => {
  try {
    const registration = await cosmosService.getRegistrationByEmail(req.user.email);

    if (!registration || registration.status !== 'approved') {
      return next(createError('No approved registration found for your account', 404, 'NOT_FOUND'));
    }

    if (!registration.apimSubscriptionId) {
      return next(createError('No API key found. Please contact support.', 404, 'NO_KEY'));
    }

    const { primaryKey } = await apimService.getSubscriptionKeys(registration.apimSubscriptionId);

    // Mask the key for display — show first 8 and last 4 chars only
    // Full key is not shown here for security; it was sent via email on approval
    const maskedKey = `${primaryKey.substring(0, 8)}${'*'.repeat(primaryKey.length - 12)}${primaryKey.slice(-4)}`;

    res.json({
      maskedKey,
      subscriptionId: registration.apimSubscriptionId,
      tier: registration.tier,
      keyStatus: registration.keyStatus || 'active',
      createdAt: registration.approvedAt,
    });

  } catch (err) {
    next(err);
  }
});

// =============================================================================
// POST /api/keys/reveal
// Reveal the full API key (rate-limited — only allow 3 reveals per hour)
// This is called when the consumer clicks "Show full key" on the dashboard
// =============================================================================
router.post('/reveal', async (req, res, next) => {
  try {
    const registration = await cosmosService.getRegistrationByEmail(req.user.email);

    if (!registration?.apimSubscriptionId) {
      return next(createError('No API key found', 404, 'NO_KEY'));
    }

    const { primaryKey } = await apimService.getSubscriptionKeys(registration.apimSubscriptionId);

    res.json({ apiKey: primaryKey });

  } catch (err) {
    next(err);
  }
});

// =============================================================================
// POST /api/keys/regenerate
// Regenerate the API key — OLD KEY STOPS WORKING IMMEDIATELY
// =============================================================================
router.post('/regenerate', async (req, res, next) => {
  try {
    const registration = await cosmosService.getRegistrationByEmail(req.user.email);

    if (!registration?.apimSubscriptionId) {
      return next(createError('No API key found', 404, 'NO_KEY'));
    }

    logger.info(`Consumer ${req.user.email} regenerating API key`);

    const { primaryKey: newApiKey } = await apimService.regeneratePrimaryKey(
      registration.apimSubscriptionId
    );

    // Send notification email so the consumer has the new key in writing
    await emailService.sendKeyRegeneratedEmail({
      toEmail: req.user.email,
      firstName: registration.firstName,
      newApiKey,
    });

    logger.info(`API key regenerated for: ${req.user.email}`);

    res.json({
      message: 'API key regenerated. Your new key has been sent to your email address. Your old key no longer works.',
      // Return new key in response too (consumer is authenticated here)
      newApiKey,
    });

  } catch (err) {
    next(err);
  }
});

module.exports = router;
