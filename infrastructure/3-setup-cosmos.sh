#!/bin/bash
# =============================================================================
# Script 3: Create Azure Cosmos DB (Serverless)
# =============================================================================
# WHAT THIS DOES:
#   Creates a Cosmos DB account, database, and two containers:
#   1. "registrations" — stores consumer sign-up data and their approval status
#   2. "usage-logs"    — stores per-call usage data (model, tokens, timestamp)
#
#   We use the NoSQL API (formerly Core SQL API) which stores JSON documents.
#   Serverless mode means you pay only per request — perfect for starting out.
#
# 💰 COST: Serverless Cosmos DB charges per Request Unit (RU).
#   Approximate cost: $0.25 per million RUs.
#   For a low-traffic hub with ~10,000 registrations: under $5/month.
# =============================================================================

set -e

RESOURCE_GROUP="mikebench-rg"
LOCATION="eastus"
COSMOS_ACCOUNT_NAME="mikebench-cosmos"   # Must be globally unique, lowercase
DATABASE_NAME="mikebench-db"

echo "Creating Cosmos DB account: $COSMOS_ACCOUNT_NAME..."
echo "(This takes 3-5 minutes — please wait)"

# -----------------------------------------------
# STEP 1: Create the Cosmos DB account
# -----------------------------------------------
az cosmosdb create \
    --name "$COSMOS_ACCOUNT_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --locations regionName="$LOCATION" failoverPriority=0 isZoneRedundant=false \
    --capabilities EnableServerless \
    --default-consistency-level "Session" \
    --tags "project=mikebench"

echo "Cosmos DB account created."

# -----------------------------------------------
# STEP 2: Create the database
# -----------------------------------------------
echo "Creating database: $DATABASE_NAME..."

az cosmosdb sql database create \
    --account-name "$COSMOS_ACCOUNT_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --name "$DATABASE_NAME"

echo "Database created."

# -----------------------------------------------
# STEP 3: Create the registrations container
# Partition key: /email — partitions data by user email for fast lookups
# -----------------------------------------------
echo "Creating 'registrations' container..."

az cosmosdb sql container create \
    --account-name "$COSMOS_ACCOUNT_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --database-name "$DATABASE_NAME" \
    --name "registrations" \
    --partition-key-path "/email" \
    --idx @- << 'EOF'
{
  "indexingMode": "consistent",
  "automatic": true,
  "includedPaths": [{ "path": "/*" }],
  "excludedPaths": [{ "path": "/\"_etag\"/?" }]
}
EOF

echo "'registrations' container created."

# -----------------------------------------------
# STEP 4: Create the usage-logs container
# Partition key: /consumerId — partitions logs by the consumer who made the call
# -----------------------------------------------
echo "Creating 'usage-logs' container..."

az cosmosdb sql container create \
    --account-name "$COSMOS_ACCOUNT_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --database-name "$DATABASE_NAME" \
    --name "usage-logs" \
    --partition-key-path "/consumerId" \
    --idx @- << 'EOF'
{
  "indexingMode": "consistent",
  "automatic": true,
  "includedPaths": [{ "path": "/*" }],
  "excludedPaths": [{ "path": "/\"_etag\"/?" }]
}
EOF

echo "'usage-logs' container created."

# -----------------------------------------------
# STEP 5: Retrieve the connection key and store in Key Vault
# -----------------------------------------------
KEYVAULT_NAME="mikebench-kv"    # Same name from script 2

echo ""
echo "Retrieving Cosmos DB primary key..."
COSMOS_KEY=$(az cosmosdb keys list \
    --name "$COSMOS_ACCOUNT_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --query primaryMasterKey -o tsv)

COSMOS_ENDPOINT=$(az cosmosdb show \
    --name "$COSMOS_ACCOUNT_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --query documentEndpoint -o tsv)

echo "Storing Cosmos DB key in Key Vault..."
az keyvault secret set \
    --vault-name "$KEYVAULT_NAME" \
    --name "cosmos-db-key" \
    --value "$COSMOS_KEY" > /dev/null

echo ""
echo "✅ SUCCESS: Cosmos DB configured."
echo ""
echo "IMPORTANT: Update your .env file with these values:"
echo "  COSMOS_DB_ENDPOINT=$COSMOS_ENDPOINT"
echo "  COSMOS_DB_KEY=<retrieved from Key Vault>"
echo "  COSMOS_DB_DATABASE_NAME=$DATABASE_NAME"
echo ""
echo "CHECKPOINT — How to verify this worked:"
echo "  Portal: Azure Portal → Search 'Azure Cosmos DB' → Click '$COSMOS_ACCOUNT_NAME'"
echo "         → Click 'Data Explorer' → Expand '$DATABASE_NAME'"
echo "         → You should see 'registrations' and 'usage-logs' containers"
echo ""
echo "NEXT STEP: Run infrastructure/4-setup-apim.sh"
