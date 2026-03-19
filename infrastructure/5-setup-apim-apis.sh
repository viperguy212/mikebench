#!/bin/bash
# =============================================================================
# Script 5: Create APIM APIs for each LLM Model
# =============================================================================
# WHAT THIS DOES:
#   Creates three APIs inside APIM — one per LLM model:
#   1. /gpt4o/*     → routes to Azure OpenAI GPT-4o endpoint
#   2. /mistral/*   → routes to AI Foundry Mistral endpoint
#   3. /llama/*     → routes to AI Foundry Llama 3 endpoint
#
#   Then assigns each API to the appropriate Products created in script 4.
#
# BEFORE RUNNING:
#   - Complete scripts 1-4 first
#   - Deploy your models in Azure AI Foundry and fill in the endpoint URLs below
# =============================================================================

set -e

RESOURCE_GROUP="llm-api-hub-rg"
APIM_SERVICE_NAME="<YOUR_INITIALS_OR_NAME>-llm-hub"

# Replace these with your actual AI Foundry endpoint URLs
# Found in: AI Foundry Portal → Your Project → Deployments → Click model → Endpoint
GPT4O_BACKEND_URL="https://<YOUR_OPENAI_RESOURCE>.openai.azure.com"
MISTRAL_BACKEND_URL="https://<YOUR_FOUNDRY_ENDPOINT>.services.ai.azure.com"
LLAMA_BACKEND_URL="https://<YOUR_FOUNDRY_ENDPOINT>.services.ai.azure.com"

# -----------------------------------------------
# STEP 1: Create GPT-4o API
# -----------------------------------------------
echo "Creating GPT-4o API..."

az apim api create \
    --service-name "$APIM_SERVICE_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --api-id "gpt4o" \
    --display-name "GPT-4o (Azure OpenAI)" \
    --description "Access to OpenAI GPT-4o via Azure OpenAI Service. Compatible with OpenAI chat completions API." \
    --path "gpt4o" \
    --protocols "https" \
    --service-url "$GPT4O_BACKEND_URL" \
    --subscription-key-header-name "Ocp-Apim-Subscription-Key" \
    --subscription-key-query-param-name "subscription-key"

# Add a POST operation for chat completions
az apim api operation create \
    --service-name "$APIM_SERVICE_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --api-id "gpt4o" \
    --operation-id "chat-completions" \
    --display-name "Chat Completions" \
    --method "POST" \
    --url-template "/openai/deployments/gpt-4o/chat/completions" \
    --description "Create a chat completion using GPT-4o"

echo "GPT-4o API created."

# -----------------------------------------------
# STEP 2: Create Mistral API
# -----------------------------------------------
echo "Creating Mistral API..."

az apim api create \
    --service-name "$APIM_SERVICE_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --api-id "mistral" \
    --display-name "Mistral-Large-3 (AI Foundry)" \
    --description "Access to Mistral-Large-3 via Azure AI Foundry. OpenAI-compatible chat completions endpoint." \
    --path "mistral" \
    --protocols "https" \
    --service-url "$MISTRAL_BACKEND_URL" \
    --subscription-key-header-name "Ocp-Apim-Subscription-Key"

az apim api operation create \
    --service-name "$APIM_SERVICE_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --api-id "mistral" \
    --operation-id "chat-completions" \
    --display-name "Chat Completions" \
    --method "POST" \
    --url-template "/models/Mistral-Large-3/chat/completions"

echo "Mistral API created."

# -----------------------------------------------
# STEP 3: Create Llama API
# -----------------------------------------------
echo "Creating Llama API..."

az apim api create \
    --service-name "$APIM_SERVICE_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --api-id "llama3" \
    --display-name "Meta Llama 3 70B (AI Foundry)" \
    --description "Access to Meta Llama 3 70B Instruct via Azure AI Foundry." \
    --path "llama3" \
    --protocols "https" \
    --service-url "$LLAMA_BACKEND_URL" \
    --subscription-key-header-name "Ocp-Apim-Subscription-Key"

az apim api operation create \
    --service-name "$APIM_SERVICE_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --api-id "llama3" \
    --operation-id "chat-completions" \
    --display-name "Chat Completions" \
    --method "POST" \
    --url-template "/models/meta-llama-3-70b-instruct/chat/completions"

echo "Llama API created."

# -----------------------------------------------
# STEP 4: Assign APIs to Products
# -----------------------------------------------
echo ""
echo "Assigning APIs to Products..."

# GPT-4o Access — GPT-4o only
az apim product api add \
    --service-name "$APIM_SERVICE_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --product-id "gpt4o-access" \
    --api-id "gpt4o"

# Standard Access — all models
az apim product api add \
    --service-name "$APIM_SERVICE_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --product-id "standard-access" \
    --api-id "gpt4o"

az apim product api add \
    --service-name "$APIM_SERVICE_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --product-id "standard-access" \
    --api-id "mistral"

az apim product api add \
    --service-name "$APIM_SERVICE_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --product-id "standard-access" \
    --api-id "llama3"

# Full Access — all models
az apim product api add \
    --service-name "$APIM_SERVICE_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --product-id "full-access" \
    --api-id "gpt4o"

az apim product api add \
    --service-name "$APIM_SERVICE_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --product-id "full-access" \
    --api-id "mistral"

az apim product api add \
    --service-name "$APIM_SERVICE_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --product-id "full-access" \
    --api-id "llama3"

echo ""
echo "✅ SUCCESS: All APIs created and assigned to Products."
echo ""
echo "CHECKPOINT — How to verify this worked:"
echo "  1. Go to portal.azure.com → Your APIM service: $APIM_SERVICE_NAME"
echo "  2. Click 'APIs' in the left menu"
echo "  3. You should see three APIs: GPT-4o, Mistral, Llama 3"
echo "  4. Click 'Products' in the left menu"
echo "  5. Click each Product → click 'APIs' tab → verify correct APIs are listed"
echo ""
echo "NEXT STEP: Apply APIM policies from apim-policies/ directory"
echo "  See apim-policies/README.md for instructions"
