// =============================================================================
// Azure APIM Management Service
// =============================================================================
// WHAT THIS DOES:
//   Provides functions to programmatically manage APIM resources:
//   - Create users (when a registration is approved)
//   - Create subscriptions (generates the API key the consumer uses)
//   - Get subscription keys for a user
//   - Revoke/regenerate keys
//
// HOW THIS WORKS:
//   Azure APIM exposes a REST Management API at:
//   https://management.azure.com/subscriptions/{sub}/resourceGroups/{rg}/
//     providers/Microsoft.ApiManagement/service/{serviceName}/...
//
//   We authenticate with Azure Identity (the service's Managed Identity in
//   production, or your logged-in az CLI credentials in development).
// =============================================================================

'use strict';

const axios = require('axios');
const logger = require('../utils/logger');

// =============================================================================
// Mock mode — active when APIM_SERVICE_NAME is not configured
// Generates fake-but-realistic keys so the full flow can be tested locally.
// =============================================================================
const USE_MOCK_APIM = !process.env.APIM_SERVICE_NAME || process.env.APIM_SERVICE_NAME.includes('REPLACE_THIS');
const mockKeyStore = {}; // subscriptionId → { primaryKey, secondaryKey, state }

if (USE_MOCK_APIM) {
  logger.warn('APIM_SERVICE_NAME not set — using mock APIM. Keys are fake and will not work against any LLM endpoint.');
}

function mockKey() {
  // Generate a 32-char hex string that looks like a real APIM subscription key
  return [...Array(32)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
}

// APIM Management API base URL
function getApimBaseUrl() {
  const sub = process.env.AZURE_SUBSCRIPTION_ID;
  const rg = process.env.AZURE_RESOURCE_GROUP;
  const service = process.env.APIM_SERVICE_NAME;

  if (!sub || !rg || !service) {
    throw new Error('AZURE_SUBSCRIPTION_ID, AZURE_RESOURCE_GROUP, and APIM_SERVICE_NAME must be set in .env');
  }

  return `https://management.azure.com/subscriptions/${sub}/resourceGroups/${rg}/providers/Microsoft.ApiManagement/service/${service}`;
}

// Get Azure access token for management API calls
// In development: uses your local `az login` credentials
// In production: uses the App Service's Managed Identity (no keys needed!)
async function getAccessToken() {
  const credential = new DefaultAzureCredential();
  const tokenResponse = await credential.getToken('https://management.azure.com/.default');
  return tokenResponse.token;
}

// Create an authenticated axios instance for APIM management calls
async function getApimClient() {
  const token = await getAccessToken();
  return axios.create({
    baseURL: getApimBaseUrl(),
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    params: {
      'api-version': '2023-05-01-preview',
    },
  });
}

// =============================================================================
// User Management
// =============================================================================

/**
 * Create an APIM user for a newly approved consumer.
 * This is separate from their subscription (API key) — the user represents
 * the person, the subscription represents their access credential.
 *
 * @param {Object} params - { userId, email, firstName, lastName }
 * @returns {Object} The created APIM user resource
 */
async function createApimUser({ userId, email, firstName, lastName }) {
  if (USE_MOCK_APIM) {
    logger.info(`[mock] APIM user created: ${userId} (${email})`);
    return { id: userId, properties: { email, firstName, lastName, state: 'active' } };
  }
  const client = await getApimClient();
  logger.info(`Creating APIM user for: ${email}`);
  const response = await client.put(`/users/${userId}`, {
    properties: { email, firstName, lastName, state: 'active', note: `Created by LLM API Hub on ${new Date().toISOString()}` },
  });
  logger.info(`APIM user created: ${userId}`);
  return response.data;
}

// =============================================================================
// Subscription (API Key) Management
// =============================================================================

/**
 * Create an APIM subscription for a user.
 * This generates the actual API key the consumer will use.
 *
 * @param {Object} params - { subscriptionId, userId, productId, displayName }
 *   productId: 'free-tier' | 'developer-tier' | 'enterprise-tier'
 * @returns {Object} The created subscription with primaryKey and secondaryKey
 */
async function createApimSubscription({ subscriptionId, userId, productId, displayName }) {
  if (USE_MOCK_APIM) {
    const primary = mockKey();
    const secondary = mockKey();
    mockKeyStore[subscriptionId] = { primaryKey: primary, secondaryKey: secondary, state: 'active' };
    logger.info(`[mock] APIM subscription created: ${subscriptionId} → primaryKey: ${primary}`);
    return { name: subscriptionId, properties: { state: 'active' } };
  }
  const client = await getApimClient();
  const sub = process.env.AZURE_SUBSCRIPTION_ID;
  const rg = process.env.AZURE_RESOURCE_GROUP;
  const service = process.env.APIM_SERVICE_NAME;
  logger.info(`Creating APIM subscription: ${subscriptionId} for user ${userId} on product ${productId}`);
  const productScope = `/subscriptions/${sub}/resourceGroups/${rg}/providers/Microsoft.ApiManagement/service/${service}/products/${productId}`;
  const response = await client.put(`/subscriptions/${subscriptionId}`, {
    properties: { displayName: displayName || `Subscription for ${userId}`, scope: productScope, ownerId: `/users/${userId}`, state: 'active' },
  });
  logger.info(`APIM subscription created: ${subscriptionId}`);
  return response.data;
}

/**
 * Get the subscription keys (primary and secondary) for a subscription.
 * These are the actual API keys the consumer uses in their requests.
 *
 * @param {string} subscriptionId
 * @returns {{ primaryKey: string, secondaryKey: string }}
 */
async function getSubscriptionKeys(subscriptionId) {
  if (USE_MOCK_APIM) {
    const entry = mockKeyStore[subscriptionId];
    if (!entry) throw new Error(`[mock] No keys found for subscription ${subscriptionId}`);
    return { primaryKey: entry.primaryKey, secondaryKey: entry.secondaryKey };
  }
  const client = await getApimClient();
  const response = await client.post(`/subscriptions/${subscriptionId}/listSecrets`);
  return { primaryKey: response.data.primaryKey, secondaryKey: response.data.secondaryKey };
}

/**
 * Regenerate the primary key for a subscription.
 * The old key immediately stops working. Use this if a key is compromised.
 *
 * @param {string} subscriptionId
 * @returns {{ primaryKey: string }}
 */
async function regeneratePrimaryKey(subscriptionId) {
  if (USE_MOCK_APIM) {
    if (!mockKeyStore[subscriptionId]) throw new Error(`[mock] Subscription not found: ${subscriptionId}`);
    mockKeyStore[subscriptionId].primaryKey = mockKey();
    logger.info(`[mock] Regenerated primary key for: ${subscriptionId}`);
    return { primaryKey: mockKeyStore[subscriptionId].primaryKey };
  }
  const client = await getApimClient();
  await client.post(`/subscriptions/${subscriptionId}/regeneratePrimaryKey`);
  logger.info(`Regenerated primary key for subscription: ${subscriptionId}`);
  const keys = await getSubscriptionKeys(subscriptionId);
  return { primaryKey: keys.primaryKey };
}

/**
 * Suspend a subscription (blocks the consumer's API key immediately).
 * The subscription still exists and can be re-activated.
 *
 * @param {string} subscriptionId
 */
async function suspendSubscription(subscriptionId) {
  if (USE_MOCK_APIM) {
    if (mockKeyStore[subscriptionId]) mockKeyStore[subscriptionId].state = 'suspended';
    logger.info(`[mock] Suspended subscription: ${subscriptionId}`);
    return;
  }
  const client = await getApimClient();
  await client.patch(`/subscriptions/${subscriptionId}`, { properties: { state: 'suspended' } });
  logger.info(`Suspended subscription: ${subscriptionId}`);
}

async function activateSubscription(subscriptionId) {
  if (USE_MOCK_APIM) {
    if (mockKeyStore[subscriptionId]) mockKeyStore[subscriptionId].state = 'active';
    logger.info(`[mock] Activated subscription: ${subscriptionId}`);
    return;
  }
  const client = await getApimClient();
  await client.patch(`/subscriptions/${subscriptionId}`, { properties: { state: 'active' } });
  logger.info(`Activated subscription: ${subscriptionId}`);
}

async function getSubscriptionUsage(subscriptionId, from, to) {
  if (USE_MOCK_APIM) {
    // Return plausible fake usage data for the dashboard
    const days = Math.ceil((to - from) / (1000 * 60 * 60 * 24));
    return Array.from({ length: Math.min(days, 7) }, (_, i) => {
      const total = Math.floor(Math.random() * 20);
      const success = Math.floor(total * (0.9 + Math.random() * 0.1)); // 90-100% success rate
      return {
        timestamp: new Date(from.getTime() + i * 86400000).toISOString(),
        callCountTotal: total,
        callCountSuccess: success,
        subscriptionId,
      };
    });
  }
  const client = await getApimClient();
  const fromStr = from.toISOString().split('T')[0] + 'T00:00:00Z';
  const toStr = to.toISOString().split('T')[0] + 'T23:59:59Z';
  const response = await client.get('/reports/bySubscription', {
    params: { $filter: `subscriptionId eq '${subscriptionId}' and timestamp ge datetime'${fromStr}' and timestamp le datetime'${toStr}'` },
  });
  return response.data.value || [];
}

module.exports = {
  createApimUser,
  createApimSubscription,
  getSubscriptionKeys,
  regeneratePrimaryKey,
  suspendSubscription,
  activateSubscription,
  getSubscriptionUsage,
};
