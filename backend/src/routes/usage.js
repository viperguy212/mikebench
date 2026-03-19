// =============================================================================
// Usage Routes — /api/usage/*
// =============================================================================
// WHAT THIS DOES:
//   Returns usage statistics for the authenticated consumer's dashboard.
//   Data is pulled from APIM Analytics (near real-time, ~15 min delay).
//
// ENDPOINTS:
//   GET /api/usage/summary  — Today's call count, tokens used, quota remaining
//   GET /api/usage/history  — Call history for the last N days
// =============================================================================

'use strict';

const express = require('express');
const router = express.Router();

const cosmosService = require('../services/cosmos');
const apimService = require('../services/apim');
const { createError } = require('../middleware/errorHandler');

// Quota limits per tier (must match APIM product policies)
const DAILY_QUOTAS = {
  'free-tier': 100,
  'developer-tier': 1000,
  'enterprise-tier': 10000,
};

// =============================================================================
// GET /api/usage/summary
// Returns today's usage summary for the dashboard widgets
// =============================================================================
router.get('/summary', async (req, res, next) => {
  try {
    const registration = await cosmosService.getRegistrationByEmail(req.user.email);

    if (!registration?.apimSubscriptionId) {
      return next(createError('No active subscription found', 404, 'NOT_FOUND'));
    }

    // Get usage from APIM analytics
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setUTCHours(0, 0, 0, 0);

    const usageData = await apimService.getSubscriptionUsage(
      registration.apimSubscriptionId,
      startOfToday,
      now
    );

    // Aggregate the data
    let totalCallsToday = 0;
    let successfulCalls = 0;
    let failedCalls = 0;

    for (const entry of usageData) {
      totalCallsToday += entry.callCountTotal || 0;
      successfulCalls += entry.callCountSuccess || 0;
      failedCalls += (entry.callCountTotal || 0) - (entry.callCountSuccess || 0);
    }

    const dailyQuota = DAILY_QUOTAS[registration.tier] || 100;
    const quotaRemaining = Math.max(0, dailyQuota - totalCallsToday);

    res.json({
      tier: registration.tier,
      today: {
        totalCalls: totalCallsToday,
        successfulCalls,
        failedCalls,
        quotaUsed: totalCallsToday,
        quotaLimit: dailyQuota,
        quotaRemaining,
        percentUsed: Math.round((totalCallsToday / dailyQuota) * 100),
      },
      quotaResetAt: new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000).toISOString(),
    });

  } catch (err) {
    next(err);
  }
});

// =============================================================================
// GET /api/usage/history?days=7
// Returns daily call counts for the last N days (for usage chart)
// =============================================================================
router.get('/history', async (req, res, next) => {
  try {
    const days = Math.min(parseInt(req.query.days) || 7, 30); // Max 30 days
    const registration = await cosmosService.getRegistrationByEmail(req.user.email);

    if (!registration?.apimSubscriptionId) {
      return next(createError('No active subscription found', 404, 'NOT_FOUND'));
    }

    const now = new Date();
    const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const usageData = await apimService.getSubscriptionUsage(
      registration.apimSubscriptionId,
      from,
      now
    );

    // Build a map of date → call count
    const byDate = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(from.getTime() + i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split('T')[0];
      byDate[key] = { date: key, calls: 0, successRate: 100 };
    }

    for (const entry of usageData) {
      const date = (entry.timestamp || '').split('T')[0];
      if (byDate[date]) {
        byDate[date].calls += entry.callCountTotal || 0;
        const successRate = entry.callCountTotal > 0
          ? Math.round((entry.callCountSuccess / entry.callCountTotal) * 100)
          : 100;
        byDate[date].successRate = successRate;
      }
    }

    res.json({
      history: Object.values(byDate),
      periodDays: days,
    });

  } catch (err) {
    next(err);
  }
});

module.exports = router;
