#!/bin/bash
# =============================================================================
# Script 6: Azure Communication Services (Email)
# =============================================================================
# WHAT THIS DOES:
#   Creates Azure Communication Services which powers the welcome email
#   that consumers receive when their registration is approved.
#   The email contains their API key and getting-started instructions.
#
# 💰 COST: First 100 emails/month are FREE.
#   After that: $0.00025 per email (~$0.25 per 1,000 emails).
# =============================================================================

set -e

RESOURCE_GROUP="mikebench-rg"
LOCATION="eastus"
ACS_NAME="mikebench-acs"
KEYVAULT_NAME="mikebench-kv"

# -----------------------------------------------
# STEP 1: Create the Communication Services resource
# -----------------------------------------------
echo "Creating Azure Communication Services: $ACS_NAME..."

az communication create \
    --name "$ACS_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --location "global" \
    --data-location "United States" \
    --tags "project=mikebench"

echo "ACS resource created."

# -----------------------------------------------
# STEP 2: Get the connection string and store in Key Vault
# -----------------------------------------------
echo "Retrieving connection string..."

ACS_CONNECTION=$(az communication list-key \
    --name "$ACS_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --query primaryConnectionString -o tsv)

echo "Storing connection string in Key Vault..."
az keyvault secret set \
    --vault-name "$KEYVAULT_NAME" \
    --name "acs-connection-string" \
    --value "$ACS_CONNECTION" > /dev/null

echo ""
echo "✅ SUCCESS: Azure Communication Services created."
echo ""
echo "IMPORTANT — You must verify an email domain before sending emails."
echo ""
echo "Steps to add and verify a custom email domain:"
echo "  1. Go to portal.azure.com → Search 'Communication Services'"
echo "  2. Click your resource: $ACS_NAME"
echo "  3. In the left menu, click 'Email' → 'Domains'"
echo "  4. Click '+ Add domain' → Choose either:"
echo "     Option A: 'Azure managed domain' — instant, free, but address looks like:"
echo "               donotreply@<id>.azurecomm.net"
echo "     Option B: 'Custom domain' — use your own domain (e.g., noreply@yourcompany.com)"
echo "               Requires adding DNS TXT/CNAME records to your domain"
echo "  5. Copy the sender email address and add to your .env:"
echo "     ACS_SENDER_ADDRESS=donotreply@<your-domain>.azurecomm.net"
echo ""
echo "NEXT STEP: Run infrastructure/7-setup-app-registration.sh"
