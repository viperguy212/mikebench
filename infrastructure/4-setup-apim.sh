#!/bin/bash
# =============================================================================
# Script 4: Create Azure API Management (APIM)
# =============================================================================
# WHAT THIS DOES:
#   Creates the APIM service — the central gateway that:
#   - Receives all API calls from consumers
#   - Validates their subscription keys
#   - Enforces rate limits and quotas
#   - Routes requests to the correct AI Foundry model
#   - Injects the real backend credentials (from Key Vault) so consumers never see them
#
# 💰 COST: APIM Developer SKU = ~$50/month. NOT for production.
#   For production, use Basic (~$150/month) or Standard (~$700/month).
#   The Developer SKU has NO SLA and should never be used for real customers.
#   We start with Developer SKU here to minimize cost while building.
#
# ⚠️  WARNING: APIM provisioning takes 30-45 MINUTES. This is normal.
#   Do not close your terminal. The script will wait and confirm when done.
# =============================================================================

set -e

RESOURCE_GROUP="llm-api-hub-rg"
LOCATION="eastus"

# APIM name must be globally unique — becomes part of your gateway URL
# Example: if name is "contoso-llm-hub", URL is https://contoso-llm-hub.azure-api.net
APIM_SERVICE_NAME="<YOUR_INITIALS_OR_NAME>-llm-hub"

# Publisher details — shown in the Developer Portal
PUBLISHER_EMAIL="<YOUR_EMAIL_ADDRESS>"
PUBLISHER_NAME="<YOUR_ORGANIZATION_NAME>"

echo "Creating APIM instance: $APIM_SERVICE_NAME"
echo "This will take approximately 30-45 minutes. Please wait..."
echo ""

# -----------------------------------------------
# STEP 1: Create the APIM service
# -----------------------------------------------
az apim create \
    --name "$APIM_SERVICE_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --location "$LOCATION" \
    --publisher-email "$PUBLISHER_EMAIL" \
    --publisher-name "$PUBLISHER_NAME" \
    --sku-name "Developer" \
    --sku-capacity 1 \
    --enable-client-certificate false \
    --tags "project=llm-api-hub"

echo ""
echo "APIM instance created. Now creating Products..."

# -----------------------------------------------
# STEP 2: Create APIM Products
# A Product groups one or more APIs and defines quotas/rate limits.
# Consumers subscribe to a Product and receive a key that grants them access.
# -----------------------------------------------

# GPT-4o Access Product — GPT-4o only, 100 calls/day
az apim product create \
    --service-name "$APIM_SERVICE_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --product-id "gpt4o-access" \
    --product-name "GPT-4o Access" \
    --description "Access to GPT-4o with 100 requests per day." \
    --state "published" \
    --subscription-required true \
    --approval-required true \
    --subscriptions-limit 1

echo "Created Product: GPT-4o Access"

# Standard Access Product — All models, 1000 calls/day
az apim product create \
    --service-name "$APIM_SERVICE_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --product-id "standard-access" \
    --product-name "Standard Access – All Models" \
    --description "Access to all models (GPT-4o, Mistral-Large-3, Llama 3) with 1,000 requests per day." \
    --state "published" \
    --subscription-required true \
    --approval-required true \
    --subscriptions-limit 3

echo "Created Product: Standard Access"

# Full Access Product — All models, 10000 calls/day
az apim product create \
    --service-name "$APIM_SERVICE_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --product-id "full-access" \
    --product-name "Full Access – All Models" \
    --description "Access to all models with 10,000 requests per day." \
    --state "published" \
    --subscription-required true \
    --approval-required false \
    --subscriptions-limit 10

echo "Created Product: Full Access"

# -----------------------------------------------
# STEP 3: Get the Master Subscription Key and store in Key Vault
# This key lets the backend create users and subscriptions via the APIM Management API
# -----------------------------------------------
KEYVAULT_NAME="<YOUR_INITIALS_OR_NAME>-llm-kv"

echo ""
echo "Retrieving APIM master subscription key..."
APIM_MASTER_KEY=$(az apim show \
    --name "$APIM_SERVICE_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --query "subscriptionKeyParameterNames" -o tsv 2>/dev/null || echo "RETRIEVE_FROM_PORTAL")

# The master key must be retrieved from the portal:
# APIM → Security → Subscriptions → "Built-in all-access subscription" → Show keys

echo ""
echo "✅ SUCCESS: APIM '$APIM_SERVICE_NAME' is provisioned."
echo ""
echo "GATEWAY URL:     https://$APIM_SERVICE_NAME.azure-api.net"
echo "MANAGEMENT URL:  https://$APIM_SERVICE_NAME.management.azure-api.net"
echo "DEVELOPER PORTAL: https://$APIM_SERVICE_NAME.developer.azure-api.net"
echo ""
echo "IMPORTANT — Update your .env file:"
echo "  APIM_SERVICE_NAME=$APIM_SERVICE_NAME"
echo "  APIM_GATEWAY_URL=https://$APIM_SERVICE_NAME.azure-api.net"
echo ""
echo "IMPORTANT — Get your APIM Master Key:"
echo "  1. Go to portal.azure.com"
echo "  2. Navigate to your APIM service: $APIM_SERVICE_NAME"
echo "  3. In the left menu, click 'APIs' → 'Subscriptions'"
echo "  4. Find 'Built-in all-access subscription'"
echo "  5. Click the '...' menu → 'Show/hide keys'"
echo "  6. Copy the Primary key"
echo "  7. Run: az keyvault secret set --vault-name $KEYVAULT_NAME --name 'apim-master-subscription-key' --value '<your-key>'"
echo "  8. Also set APIM_MASTER_SUBSCRIPTION_KEY in your .env file"
echo ""
echo "CHECKPOINT — How to verify this worked:"
echo "  Portal: Go to portal.azure.com → Search 'API Management services'"
echo "         → Click '$APIM_SERVICE_NAME' → The Overview page should show Status: Online"
echo "  Browser: Navigate to https://$APIM_SERVICE_NAME.developer.azure-api.net"
echo "           You should see the default Developer Portal"
echo ""
echo "NEXT STEP: Run infrastructure/5-setup-apim-apis.sh"
