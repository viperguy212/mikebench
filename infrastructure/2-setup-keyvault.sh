#!/bin/bash
# =============================================================================
# Script 2: Create Azure Key Vault
# =============================================================================
# WHAT THIS DOES:
#   Creates an Azure Key Vault — a secure, encrypted store for secrets like
#   API keys and passwords. Your application code reads secrets FROM Key Vault
#   at runtime instead of storing them in code or config files.
#
# 🔐 SECURITY NOTE: Key Vault is the most important security layer in this
#   architecture. If Key Vault is misconfigured, your AI Foundry keys could
#   be exposed. This script configures it with the principle of least privilege.
#
# BEFORE RUNNING:
#   - Complete script 1 first
#   - Replace <YOUR_INITIALS_OR_NAME> in KEYVAULT_NAME with something unique
#     Key Vault names must be globally unique (like domain names)
#
# 💰 COST: Azure Key Vault is ~$0.03 per 10,000 operations. For this project
#   that's essentially free (under $1/month).
# =============================================================================

set -e

# -----------------------------------------------
# CONFIGURATION — EDIT THESE VALUES
# -----------------------------------------------
RESOURCE_GROUP="llm-api-hub-rg"
LOCATION="eastus"

# Key Vault name MUST be 3-24 chars, globally unique, only letters/numbers/hyphens
# EXAMPLE: if your name is "John Smith" use "johnsmith-llm-kv"
KEYVAULT_NAME="<YOUR_INITIALS_OR_NAME>-llm-kv"

# -----------------------------------------------
# Get your current user's Object ID (needed to grant yourself access)
# -----------------------------------------------
echo "Getting your Azure user identity..."
USER_OBJECT_ID=$(az ad signed-in-user show --query id -o tsv)
echo "Your user Object ID: $USER_OBJECT_ID"

# -----------------------------------------------
# STEP 1: Create the Key Vault
# -----------------------------------------------
echo ""
echo "Creating Key Vault: $KEYVAULT_NAME..."

az keyvault create \
    --name "$KEYVAULT_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --location "$LOCATION" \
    --sku "standard" \
    --enable-rbac-authorization true \
    --tags "project=llm-api-hub"

echo "Key Vault created."

# -----------------------------------------------
# STEP 2: Grant yourself the Key Vault Administrator role
# This allows you to add and read secrets
# -----------------------------------------------
echo ""
echo "Granting your account Key Vault Administrator access..."

KV_ID=$(az keyvault show --name "$KEYVAULT_NAME" --resource-group "$RESOURCE_GROUP" --query id -o tsv)

az role assignment create \
    --role "Key Vault Administrator" \
    --assignee "$USER_OBJECT_ID" \
    --scope "$KV_ID"

echo "Access granted."

# -----------------------------------------------
# STEP 3: Store placeholder secrets
# You will replace these with real values after creating each Azure resource
# -----------------------------------------------
echo ""
echo "Creating placeholder secrets (you will update these with real values)..."

# AI Foundry keys — replace with real values from AI Foundry portal
az keyvault secret set --vault-name "$KEYVAULT_NAME" --name "ai-foundry-gpt4o-key" --value "PLACEHOLDER_REPLACE_ME" > /dev/null
az keyvault secret set --vault-name "$KEYVAULT_NAME" --name "ai-foundry-mistral-key" --value "PLACEHOLDER_REPLACE_ME" > /dev/null
az keyvault secret set --vault-name "$KEYVAULT_NAME" --name "ai-foundry-llama-key" --value "PLACEHOLDER_REPLACE_ME" > /dev/null

# APIM master key — replace after APIM is created
az keyvault secret set --vault-name "$KEYVAULT_NAME" --name "apim-master-subscription-key" --value "PLACEHOLDER_REPLACE_ME" > /dev/null

# Cosmos DB key — replace after Cosmos is created
az keyvault secret set --vault-name "$KEYVAULT_NAME" --name "cosmos-db-key" --value "PLACEHOLDER_REPLACE_ME" > /dev/null

# JWT secret — generate a random one now
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))" 2>/dev/null || openssl rand -hex 64)
az keyvault secret set --vault-name "$KEYVAULT_NAME" --name "jwt-secret" --value "$JWT_SECRET" > /dev/null

# Azure AD client secret — replace after App Registration
az keyvault secret set --vault-name "$KEYVAULT_NAME" --name "azure-ad-client-secret" --value "PLACEHOLDER_REPLACE_ME" > /dev/null

# ACS connection string — replace after ACS is created
az keyvault secret set --vault-name "$KEYVAULT_NAME" --name "acs-connection-string" --value "PLACEHOLDER_REPLACE_ME" > /dev/null

echo ""
echo "✅ SUCCESS: Key Vault '$KEYVAULT_NAME' created with placeholder secrets."
echo ""
echo "IMPORTANT: Update your .env file:"
echo "  AZURE_KEY_VAULT_NAME=$KEYVAULT_NAME"
echo "  AZURE_KEY_VAULT_URL=https://$KEYVAULT_NAME.vault.azure.net/"
echo ""
echo "CHECKPOINT — How to verify this worked:"
echo "  Portal: Go to portal.azure.com → Search 'Key vaults' → Click '$KEYVAULT_NAME' → Click 'Secrets'"
echo "  CLI:    Run: az keyvault secret list --vault-name $KEYVAULT_NAME --query '[].name'"
echo ""
echo "HOW TO UPDATE A SECRET with a real value:"
echo "  az keyvault secret set --vault-name $KEYVAULT_NAME --name 'ai-foundry-gpt4o-key' --value 'your-real-key-here'"
echo ""
echo "NEXT STEP: Run infrastructure/3-setup-cosmos.sh"
