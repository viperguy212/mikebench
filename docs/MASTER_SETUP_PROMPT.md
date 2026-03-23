# Master Setup Prompt — Mikebench

Use this prompt to initialize a new Claude instance with full context of the Mikebench
project so it can assist with continued development, debugging, or extension of the system.

---

## Prompt

```
You are helping me build and maintain Mikebench — a full-stack Azure-hosted LLM API
gateway and consumer portal. Below is everything you need to know about the project.

---

## What Mikebench Is

Mikebench is a managed LLM API distribution platform. It allows an administrator to:
- Deploy LLM models in Microsoft Foundry
- Expose those models through Azure API Management (APIM) with rate limits and auth
- Let consumers register for access through a self-service portal
- Approve registrations and issue APIM subscription keys
- Send welcome emails with credentials via Azure Communication Services

Consumers receive a single subscription key that grants them access to all LLM models
in their assigned Product tier, called via a standard OpenAI-compatible REST API.

---

## Azure Resources

| Resource | Name | Purpose |
|---|---|---|
| Resource Group | mikebench-rg | Container for all resources |
| Key Vault | mikebench-kv | Stores all secrets (API keys, JWT secret, etc.) |
| Cosmos DB Account | mikebench-cosmos | NoSQL database |
| Cosmos DB Database | mikebench-db | Contains registrations + usage-logs containers |
| APIM Service | mikebench-apim | API gateway — validates keys, routes to models |
| Microsoft Foundry | mikebench-foundry | AI model deployment platform |
| Foundry Project | mikebench-project | Project within Foundry |
| AI Gateway | mikebench-gateway | Routes APIM requests to correct Foundry model |
| Communication Services | mikebench-acs | Sends welcome emails on approval |
| Entra ID App Registration | Mikebench Admin Portal | Auth for the admin portal |

All resources are in region: eastus

---

## APIM Products (Access Tiers)

There are three Products in APIM. Consumers subscribe to one Product and receive a
single key that grants access to all APIs assigned to that Product.

| Product ID | Display Name | Models | Daily Limit | Approval |
|---|---|---|---|---|
| gpt4o-access | GPT-4o Access | GPT-4o only | 100 req/day | Required |
| standard-access | Standard Access – All Models | All models | 1,000 req/day | Required |
| full-access | Full Access – All Models | All models | 10,000 req/day | Auto |

---

## APIM APIs (Model Routes)

Each model has its own API definition in APIM. All backend URLs point to the AI Gateway.

| API ID | Display Name | Consumer Path | Model Path (rewritten) |
|---|---|---|---|
| gpt4o | GPT-4o (Azure OpenAI) | /gpt4o/* | /openai/deployments/gpt-4o/chat/completions |
| mistral | Mistral-Large-3 (AI Foundry) | /mistral/* | /models/Mistral-Large-3/chat/completions |
| llama3 | Meta Llama 3 70B (AI Foundry) | /llama3/* | /models/meta-llama-3-70b-instruct/chat/completions |

Backend URL for all APIs: https://mikebench-gateway.eastus.inference.ai.azure.com

---

## APIM Policy Files

Located in apim-policies/. Each file is pasted into the APIM portal policy editor.

| File | Applied at | Purpose |
|---|---|---|
| global-policy.xml | All APIs, all operations | CORS, subscription key validation, request ID, security headers, error handling |
| product-gpt4o-access.xml | GPT-4o Access product | Rate limit (10/min), quota (100/day), token cap (2000) |
| product-standard-access.xml | Standard Access product | Rate limit (30/min), quota (1000/day), token cap (4000) |
| product-full-access.xml | Full Access product | Rate limit (100/min), quota (10000/day), token cap (8000) |
| api-gpt4o.xml | GPT-4o API, all operations | Remove sub key, inject api-key header, add api-version param, rewrite URL |
| api-mistral.xml | Mistral API, all operations | Remove sub key, inject Authorization: Bearer header, rewrite URL |
| api-llama3.xml | Llama3 API, all operations | Remove sub key, inject Authorization: Bearer header, rewrite URL |

Key Vault secrets are referenced in APIM via Named Values:
- foundry-gpt4o-key → Key Vault secret: ai-foundry-gpt4o-key
- foundry-mistral-key → Key Vault secret: ai-foundry-mistral-key
- foundry-llama-key → Key Vault secret: ai-foundry-llama-key

---

## Key Vault Secrets

| Secret Name | Contents |
|---|---|
| ai-foundry-gpt4o-key | API key for GPT-4o via AI Gateway |
| ai-foundry-mistral-key | API key for Mistral via AI Gateway |
| ai-foundry-llama-key | API key for Llama via AI Gateway |
| apim-master-subscription-key | APIM built-in all-access subscription key |
| cosmos-db-key | Cosmos DB primary key |
| jwt-secret | Secret used to sign JWTs for admin portal sessions |
| azure-ad-client-secret | Entra ID app registration client secret |
| acs-connection-string | Azure Communication Services connection string |

---

## Infrastructure Scripts

Located in infrastructure/. Run in Azure Cloud Shell after cloning the repo.
All resource names and values are pre-filled. Only two values require manual input:
- Script 4: PUBLISHER_EMAIL — your email address
- Script 5: AI_GATEWAY_URL — your AI Gateway endpoint URL

| Script | What it creates | Status |
|---|---|---|
| 1-setup-resource-group.sh | mikebench-rg | Run if not already created |
| 2-setup-keyvault.sh | mikebench-kv + placeholder secrets | Run if not already created |
| 3-setup-cosmos.sh | mikebench-cosmos, mikebench-db, containers | Run if not already created |
| 4-setup-apim.sh | mikebench-apim + Products | Run if not already created |
| 5-setup-apim-apis.sh | API routes in APIM, assigned to Products | Run this |
| 6-setup-communication-services.sh | mikebench-acs | Run this |
| 7-setup-app-registration.sh | Entra ID app registration | Run this |

---

## Application Stack

### Backend — Node.js + Express
- Located in: backend/
- Runs in mock mode locally (no Azure credentials needed)
- Endpoints: consumer registration, admin approval, APIM subscription management,
  usage stats, Cosmos DB read/write, email dispatch via ACS
- Auth: Azure Entra ID (MSAL) for admin routes, JWT for consumer sessions
- Key env vars: COSMOS_DB_ENDPOINT, COSMOS_DB_KEY, AZURE_KEY_VAULT_NAME,
  APIM_SERVICE_NAME, APIM_GATEWAY_URL, APIM_MASTER_SUBSCRIPTION_KEY,
  AZURE_AD_CLIENT_ID, AZURE_AD_TENANT_ID, ACS_CONNECTION_STRING, ACS_SENDER_ADDRESS

### Frontend — React + Vite
- Located in: frontend/
- Pages: Landing, Register, Dashboard (consumer), Admin, Documentation
- Key env vars: VITE_API_URL, VITE_AZURE_AD_CLIENT_ID, VITE_AZURE_AD_TENANT_ID
- No tier concepts — access levels are named GPT-4o Access / Standard Access / Full Access

---

## Key Design Decisions

- No "tiers" — the old free/developer/enterprise tier concept was removed entirely.
  Products are named by access level (GPT-4o Access, Standard Access, Full Access).
- All model traffic routes through the AI Gateway (mikebench-gateway), not directly
  to individual model endpoints. This means all APIM API backend URLs point to the
  same gateway URL, and the API-level policy rewrites the path for each model.
- Key Vault secrets are injected into APIM at request time via Named Values.
  Consumers never see backend credentials.
- The Cosmos DB (mikebench-db) is managed exclusively by the Node.js backend.
  It is NOT connected to the Foundry project as a data source.
- The Entra ID App Registration (Mikebench Admin Portal) has only localhost:5173
  as a redirect URI for now. The production URL must be added after deployment.
- XML policy comments use only <!-- and --> with no double-dashes (--) inside
  comment bodies, as APIM rejects XML with -- inside comments.

---

## Documentation Files

Located in docs/:
- AZURE_SETUP_GUIDE.md — generic setup guide (non-branded)
- AZURE_SETUP_GUIDE_MIKEBENCH.md — Mikebench-specific portal walkthrough
- RUNNING_THE_SCRIPTS_MIKEBENCH.md — how to run infrastructure scripts via Cloud Shell
- ADDING_A_NEW_MODEL.md — step-by-step guide for onboarding future models
- END_TO_END_TEST.md — manual test checklist for the full consumer flow

---

## GitHub

Repository: https://github.com/viperguy212/mikebench

---

Now that you have full context, please assist me with the following:

[DESCRIBE YOUR TASK HERE]
```
