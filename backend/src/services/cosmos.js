// =============================================================================
// Cosmos DB Service
// =============================================================================
// Falls back to an in-memory store automatically when COSMOS_DB_ENDPOINT is
// not set — useful for local development and testing without Azure.
// =============================================================================

'use strict';

const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

// =============================================================================
// In-memory store (used when COSMOS_DB_ENDPOINT is not set)
// =============================================================================
const memStore = {
  registrations: [],
  usageLogs: [],
};

const USE_MEMORY = !process.env.COSMOS_DB_ENDPOINT || process.env.COSMOS_DB_ENDPOINT.includes('REPLACE_THIS');

if (USE_MEMORY) {
  logger.warn('COSMOS_DB_ENDPOINT not set — using in-memory store. Data will be lost on restart.');
}

// =============================================================================
// Cosmos client (lazy-initialized, only when USE_MEMORY is false)
// =============================================================================
let _registrationsContainer;
let _usageContainer;

async function getRegistrationsContainer() {
  if (_registrationsContainer) return _registrationsContainer;
  const { CosmosClient } = require('@azure/cosmos');
  const client = new CosmosClient({ endpoint: process.env.COSMOS_DB_ENDPOINT, key: process.env.COSMOS_DB_KEY });
  const { database } = await client.databases.createIfNotExists({ id: process.env.COSMOS_DB_DATABASE_NAME || 'llm-hub-db' });
  const { container } = await database.containers.createIfNotExists({ id: 'registrations', partitionKey: { paths: ['/email'] } });
  _registrationsContainer = container;
  return container;
}

async function getUsageContainer() {
  if (_usageContainer) return _usageContainer;
  const { CosmosClient } = require('@azure/cosmos');
  const client = new CosmosClient({ endpoint: process.env.COSMOS_DB_ENDPOINT, key: process.env.COSMOS_DB_KEY });
  const { database } = await client.databases.createIfNotExists({ id: process.env.COSMOS_DB_DATABASE_NAME || 'llm-hub-db' });
  const { container } = await database.containers.createIfNotExists({ id: 'usage-logs', partitionKey: { paths: ['/consumerId'] } });
  _usageContainer = container;
  return container;
}

// =============================================================================
// Registration Operations
// =============================================================================

async function createRegistration(registration) {
  const doc = {
    ...registration,
    id: registration.id || uuidv4(),
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    apimSubscriptionId: null,
    apimUserId: null,
  };

  if (USE_MEMORY) {
    memStore.registrations.push(doc);
    logger.info(`[mem] Registration created: ${doc.id} for ${doc.email}`);
    return doc;
  }

  const container = await getRegistrationsContainer();
  const { resource } = await container.items.create(doc);
  logger.info(`Registration created: ${doc.id} for ${doc.email}`);
  return resource;
}

async function getRegistrationByEmail(email) {
  if (USE_MEMORY) {
    return memStore.registrations.find(r => r.email === email) || null;
  }
  const container = await getRegistrationsContainer();
  const { resources } = await container.items.query({
    query: 'SELECT * FROM c WHERE c.email = @email',
    parameters: [{ name: '@email', value: email }],
  }, { partitionKey: email }).fetchAll();
  return resources[0] || null;
}

async function getRegistrationById(id) {
  if (USE_MEMORY) {
    return memStore.registrations.find(r => r.id === id) || null;
  }
  const container = await getRegistrationsContainer();
  const { resources } = await container.items.query({
    query: 'SELECT * FROM c WHERE c.id = @id',
    parameters: [{ name: '@id', value: id }],
  }).fetchAll();
  return resources[0] || null;
}

async function updateRegistration(id, email, updates) {
  if (USE_MEMORY) {
    const idx = memStore.registrations.findIndex(r => r.id === id);
    if (idx === -1) throw new Error(`Registration ${id} not found`);
    memStore.registrations[idx] = { ...memStore.registrations[idx], ...updates, updatedAt: new Date().toISOString() };
    return memStore.registrations[idx];
  }
  const container = await getRegistrationsContainer();
  const { resource: existing } = await container.item(id, email).read();
  if (!existing) throw new Error(`Registration ${id} not found`);
  const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
  const { resource } = await container.item(id, email).replace(updated);
  return resource;
}

async function getAllRegistrations(status = null) {
  if (USE_MEMORY) {
    const list = status ? memStore.registrations.filter(r => r.status === status) : [...memStore.registrations];
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  const container = await getRegistrationsContainer();
  const query = status
    ? { query: 'SELECT * FROM c WHERE c.status = @status ORDER BY c.createdAt DESC', parameters: [{ name: '@status', value: status }] }
    : { query: 'SELECT * FROM c ORDER BY c.createdAt DESC' };
  const { resources } = await container.items.query(query).fetchAll();
  return resources;
}

// =============================================================================
// Usage Log Operations
// =============================================================================

async function logUsage(entry) {
  const doc = { id: uuidv4(), ...entry, timestamp: new Date().toISOString() };
  if (USE_MEMORY) { memStore.usageLogs.push(doc); return; }
  const container = await getUsageContainer();
  await container.items.create(doc);
}

async function getUsageForConsumer(consumerId, days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  if (USE_MEMORY) {
    return memStore.usageLogs
      .filter(l => l.consumerId === consumerId && l.timestamp >= since)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }
  const container = await getUsageContainer();
  const { resources } = await container.items.query({
    query: 'SELECT * FROM c WHERE c.consumerId = @consumerId AND c.timestamp >= @since ORDER BY c.timestamp DESC',
    parameters: [{ name: '@consumerId', value: consumerId }, { name: '@since', value: since }],
  }, { partitionKey: consumerId }).fetchAll();
  return resources;
}

async function getUsageSummaryForConsumer(consumerId) {
  if (USE_MEMORY) {
    const todayStart = new Date(); todayStart.setUTCHours(0, 0, 0, 0);
    const todayLogs = memStore.usageLogs.filter(l => l.consumerId === consumerId && l.timestamp >= todayStart.toISOString());
    const byModel = {};
    for (const l of todayLogs) {
      if (!byModel[l.model]) byModel[l.model] = { model: l.model, totalCalls: 0, totalTokens: 0 };
      byModel[l.model].totalCalls++;
      byModel[l.model].totalTokens += l.tokensUsed || 0;
    }
    return Object.values(byModel);
  }
  const container = await getUsageContainer();
  const todayStart = new Date(); todayStart.setUTCHours(0, 0, 0, 0);
  const { resources } = await container.items.query({
    query: 'SELECT COUNT(1) AS totalCalls, SUM(c.tokensUsed) AS totalTokens, c.model AS model FROM c WHERE c.consumerId = @consumerId AND c.timestamp >= @todayStart GROUP BY c.model',
    parameters: [{ name: '@consumerId', value: consumerId }, { name: '@todayStart', value: todayStart.toISOString() }],
  }, { partitionKey: consumerId }).fetchAll();
  return resources;
}

module.exports = {
  createRegistration,
  getRegistrationByEmail,
  getRegistrationById,
  updateRegistration,
  getAllRegistrations,
  logUsage,
  getUsageForConsumer,
  getUsageSummaryForConsumer,
};
