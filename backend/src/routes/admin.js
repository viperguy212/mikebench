// =============================================================================
// Admin Routes — /api/admin/*
// =============================================================================
// WHAT THIS DOES:
//   Provides admin-only endpoints for:
//   - Viewing all pending registrations
//   - Approving a registration (creates APIM user + subscription, sends email)
//   - Rejecting a registration
//   - Viewing all consumers
//   - Suspending/reactivating a consumer's API key
//
// 🔐 SECURITY: All routes here require authMiddleware (JWT) + adminMiddleware (role=admin).
//   Admin emails are set in the ADMIN_EMAILS environment variable.
// =============================================================================

'use strict';

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

const cosmosService = require('../services/cosmos');
const apimService = require('../services/apim');
const emailService = require('../services/email');
const { adminMiddleware } = require('../middleware/auth');
const { createError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

// All routes in this file require admin role
router.use(adminMiddleware);

// =============================================================================
// GET /api/admin/registrations
// Get all registrations (optionally filter by status)
// =============================================================================
router.get('/registrations', async (req, res, next) => {
  try {
    const { status } = req.query; // optional: pending | approved | rejected
    const registrations = await cosmosService.getAllRegistrations(status);

    // Redact sensitive data for the list view
    const sanitized = registrations.map(r => ({
      id: r.id,
      firstName: r.firstName,
      lastName: r.lastName,
      email: r.email,
      organization: r.organization,
      useCase: r.useCase,
      tier: r.tier,
      status: r.status,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      apimSubscriptionId: r.apimSubscriptionId,
    }));

    res.json({ registrations: sanitized, total: sanitized.length });
  } catch (err) {
    next(err);
  }
});

// =============================================================================
// POST /api/admin/registrations/:id/approve
// Approve a registration: creates APIM user + subscription, sends welcome email
// =============================================================================
router.post('/registrations/:id/approve', async (req, res, next) => {
  try {
    const { id } = req.params;
    const registration = await cosmosService.getRegistrationById(id);

    if (!registration) {
      return next(createError('Registration not found', 404, 'NOT_FOUND'));
    }

    if (registration.status === 'approved') {
      return next(createError('Registration is already approved', 409, 'ALREADY_APPROVED'));
    }

    logger.info(`Admin ${req.user.email} approving registration ${id} for ${registration.email}`);

    // -------------------------------------------------------
    // Step 1: Create APIM User
    // -------------------------------------------------------
    const apimUserId = `user-${id.replace(/-/g, '').substring(0, 16)}`;

    await apimService.createApimUser({
      userId: apimUserId,
      email: registration.email,
      firstName: registration.firstName,
      lastName: registration.lastName,
    });

    // -------------------------------------------------------
    // Step 2: Create APIM Subscription (API Key)
    // -------------------------------------------------------
    const apimSubscriptionId = `sub-${uuidv4().replace(/-/g, '').substring(0, 16)}`;

    await apimService.createApimSubscription({
      subscriptionId: apimSubscriptionId,
      userId: apimUserId,
      productId: registration.tier,
      displayName: `${registration.firstName} ${registration.lastName} — ${registration.tier}`,
    });

    // -------------------------------------------------------
    // Step 3: Get the generated API key
    // -------------------------------------------------------
    const { primaryKey: apiKey } = await apimService.getSubscriptionKeys(apimSubscriptionId);

    // -------------------------------------------------------
    // Step 4: Update the registration record in Cosmos DB
    // -------------------------------------------------------
    await cosmosService.updateRegistration(id, registration.email, {
      status: 'approved',
      apimUserId,
      apimSubscriptionId,
      approvedAt: new Date().toISOString(),
      approvedBy: req.user.email,
    });

    // -------------------------------------------------------
    // Step 5: Send welcome email with API key
    // -------------------------------------------------------
    const tierNames = {
      'free-tier': 'Free Tier – GPT-4o',
      'developer-tier': 'Developer – All Models',
      'enterprise-tier': 'Enterprise – All Models',
    };

    await emailService.sendWelcomeEmail({
      toEmail: registration.email,
      firstName: registration.firstName,
      apiKey,
      productName: tierNames[registration.tier] || registration.tier,
      gatewayUrl: process.env.APIM_GATEWAY_URL,
    });

    logger.info(`Registration approved and email sent: ${registration.email}`);

    res.json({
      message: `Registration approved. Welcome email sent to ${registration.email}.`,
      apimSubscriptionId,
      apimUserId,
    });

  } catch (err) {
    // If APIM creation succeeded but email failed, registration is still approved
    // The admin can view the key from the APIM portal manually
    logger.error(`Approval error for ${req.params.id}: ${err.message}`);
    next(err);
  }
});

// =============================================================================
// POST /api/admin/registrations/:id/reject
// Reject a registration with an optional reason
// =============================================================================
router.post('/registrations/:id/reject', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const registration = await cosmosService.getRegistrationById(id);
    if (!registration) {
      return next(createError('Registration not found', 404, 'NOT_FOUND'));
    }

    logger.info(`Admin ${req.user.email} rejecting registration ${id}`);

    await cosmosService.updateRegistration(id, registration.email, {
      status: 'rejected',
      rejectedAt: new Date().toISOString(),
      rejectedBy: req.user.email,
      rejectionReason: reason || null,
    });

    await emailService.sendRejectionEmail({
      toEmail: registration.email,
      firstName: registration.firstName,
      reason,
    });

    res.json({ message: `Registration rejected. Notification sent to ${registration.email}.` });

  } catch (err) {
    next(err);
  }
});

// =============================================================================
// POST /api/admin/consumers/:id/suspend
// Suspend a consumer's API key
// =============================================================================
router.post('/consumers/:id/suspend', async (req, res, next) => {
  try {
    const { id } = req.params;
    const registration = await cosmosService.getRegistrationById(id);

    if (!registration || !registration.apimSubscriptionId) {
      return next(createError('Consumer not found or has no active subscription', 404, 'NOT_FOUND'));
    }

    await apimService.suspendSubscription(registration.apimSubscriptionId);
    await cosmosService.updateRegistration(id, registration.email, {
      keyStatus: 'suspended',
    });

    logger.info(`Admin ${req.user.email} suspended consumer ${id}`);
    res.json({ message: 'Consumer API key suspended.' });

  } catch (err) {
    next(err);
  }
});

// =============================================================================
// POST /api/admin/consumers/:id/activate
// Reactivate a suspended consumer's API key
// =============================================================================
router.post('/consumers/:id/activate', async (req, res, next) => {
  try {
    const { id } = req.params;
    const registration = await cosmosService.getRegistrationById(id);

    if (!registration || !registration.apimSubscriptionId) {
      return next(createError('Consumer not found or has no active subscription', 404, 'NOT_FOUND'));
    }

    await apimService.activateSubscription(registration.apimSubscriptionId);
    await cosmosService.updateRegistration(id, registration.email, {
      keyStatus: 'active',
    });

    logger.info(`Admin ${req.user.email} activated consumer ${id}`);
    res.json({ message: 'Consumer API key reactivated.' });

  } catch (err) {
    next(err);
  }
});

module.exports = router;
