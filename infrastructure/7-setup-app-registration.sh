#!/bin/bash
# =============================================================================
# Script 7: Azure Entra ID App Registration
# =============================================================================
# WHAT THIS DOES:
#   Creates an App Registration in Azure Entra ID (formerly Azure AD).
#   This is the identity of your application — it lets your admin portal
#   authenticate users via Microsoft login ("Sign in with Microsoft").
#   Only users you designate as admins can access the /admin page.
#
# 🔐 SECURITY NOTE: The client secret generated here is shown ONCE.
#   It will be stored in Key Vault. If you lose it, you must regenerate it.
# =============================================================================

set -e

KEYVAULT_NAME="mikebench-kv"

# Your frontend URL — change to your production URL after deployment
REDIRECT_URI_LOCAL="http://localhost:5173"
REDIRECT_URI_PROD="https://<YOUR_STATIC_WEB_APP_URL>"   # ← Replace after deployment

# -----------------------------------------------
# STEP 1: Create the App Registration
# -----------------------------------------------
echo "Creating App Registration..."

APP_ID=$(az ad app create \
    --display-name "Mikebench Admin Portal" \
    --sign-in-audience "AzureADMyOrg" \
    --web-redirect-uris "$REDIRECT_URI_LOCAL" "$REDIRECT_URI_PROD" \
    --query appId -o tsv)

echo "App Registration created. App (Client) ID: $APP_ID"

# -----------------------------------------------
# STEP 2: Create a Service Principal
# A service principal is the "instance" of the app in your tenant
# -----------------------------------------------
echo "Creating Service Principal..."
az ad sp create --id "$APP_ID" > /dev/null
echo "Service Principal created."

# -----------------------------------------------
# STEP 3: Create a client secret
# -----------------------------------------------
echo "Creating client secret (valid for 2 years)..."

CLIENT_SECRET=$(az ad app credential reset \
    --id "$APP_ID" \
    --years 2 \
    --query password -o tsv)

echo "Client secret created."

# -----------------------------------------------
# STEP 4: Store the secret in Key Vault
# -----------------------------------------------
echo "Storing client secret in Key Vault..."
az keyvault secret set \
    --vault-name "$KEYVAULT_NAME" \
    --name "azure-ad-client-secret" \
    --value "$CLIENT_SECRET" > /dev/null

# -----------------------------------------------
# STEP 5: Get the Tenant ID
# -----------------------------------------------
TENANT_ID=$(az account show --query tenantId -o tsv)

echo ""
echo "✅ SUCCESS: App Registration created."
echo ""
echo "IMPORTANT — Update your .env file with these values:"
echo "  AZURE_AD_CLIENT_ID=$APP_ID"
echo "  AZURE_AD_CLIENT_SECRET=<retrieve from Key Vault: az keyvault secret show --vault-name $KEYVAULT_NAME --name azure-ad-client-secret --query value -o tsv>"
echo "  AZURE_TENANT_ID=$TENANT_ID"
echo ""
echo "  VITE_AZURE_AD_CLIENT_ID=$APP_ID"
echo "  VITE_AZURE_AD_TENANT_ID=$TENANT_ID"
echo ""
echo "CHECKPOINT — How to verify this worked:"
echo "  1. Go to portal.azure.com"
echo "  2. Search 'App registrations'"
echo "  3. Click 'Mikebench Admin Portal'"
echo "  4. The 'Application (client) ID' should match: $APP_ID"
echo "  5. Click 'Certificates & secrets' → you should see an active secret"
echo ""
echo "NEXT STEP: Set up the backend and frontend code"
