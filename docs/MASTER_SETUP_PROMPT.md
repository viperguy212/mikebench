# Master Setup Prompt

Use this prompt to initialize a new Claude instance with full context of your project
so it can assist with continued development, debugging, or extension of the system.

---

## Before Using

Find and replace the following placeholder throughout this file before pasting the prompt
into Claude. Use your editor's Find & Replace (Ctrl+H) for speed.

| Placeholder | Replace with | Example |
|---|---|---|
| `[APP_NAME]` | Your application/project name, lowercase | `contoso` |
| `[App Name]` | Your application name, display form | `Contoso LLM Hub` |
| `[YOUR_REGION]` | Your Azure region | `eastus` |
| `[YOUR_GITHUB_REPO_URL]` | Your GitHub repository URL | `https://github.com/org/repo` |
| `[YOUR_AI_GATEWAY_URL]` | Your AI Gateway endpoint URL | `https://[APP_NAME]-gateway.eastus.inference.ai.azure.com` |

---

## Prompt

```
You are helping me build and maintain [App Name] — a full-stack Azure-hosted LLM API
gateway and consumer portal. Below is everything you need to know about the project.

---

## What [App Name] Is

[App Name] is a managed LLM API distribution platform. It allows an administrator to:
- Deploy LLM models in Microsoft Foundry
- Expose those models through Azure API Management (APIM) with rate limits and auth
- Let consumers register for access through a self-service portal
- Approve registrations and issue APIM subscription keys
- Send welcome emails with credentials via Azure Communication Services

Consumers receive a single subscription key that grants them access to all LLM models
in their assigned Product, called via a standard OpenAI-compatible REST API.

---

## Azure Resources

| Resource | Name | Purpose |
|---|---|---|
| Resource Group | [APP_NAME]-rg | Container for all resources |
| Key Vault | [APP_NAME]-kv | Stores all secrets (API keys, JWT secret, etc.) |
| Cosmos DB Account | [APP_NAME]-cosmos | NoSQL database |
| Cosmos DB Database | [APP_NAME]-db | Contains registrations + usage-logs containers |
| APIM Service | [APP_NAME]-apim | API gateway — validates keys, routes to models |
| Microsoft Foundry | [APP_NAME]-foundry | AI model deployment platform |
| Foundry Project | [APP_NAME]-project | Project within Foundry |
| AI Gateway | [APP_NAME]-gateway | Routes APIM requests to correct Foundry model |
| Communication Services | [APP_NAME]-acs | Sends welcome emails on approval |
| Entra ID App Registration | [App Name] Admin Portal | Auth for the admin portal |

All resources are in region: [YOUR_REGION]

---

## APIM Products (Access Levels)

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

Backend URL for all APIs: [YOUR_AI_GATEWAY_URL]

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

| Script | What it creates |
|---|---|
| 1-setup-resource-group.sh | [APP_NAME]-rg |
| 2-setup-keyvault.sh | [APP_NAME]-kv + placeholder secrets |
| 3-setup-cosmos.sh | [APP_NAME]-cosmos, [APP_NAME]-db, containers |
| 4-setup-apim.sh | [APP_NAME]-apim + Products |
| 5-setup-apim-apis.sh | API routes in APIM, assigned to Products |
| 6-setup-communication-services.sh | [APP_NAME]-acs |
| 7-setup-app-registration.sh | Entra ID app registration |

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
- Access levels are named GPT-4o Access / Standard Access / Full Access

---

## Key Design Decisions

- All model traffic routes through the AI Gateway ([APP_NAME]-gateway), not directly
  to individual model endpoints. All APIM API backend URLs point to the same gateway
  URL, and the API-level policy rewrites the path for each model.
- Key Vault secrets are injected into APIM at request time via Named Values.
  Consumers never see backend credentials.
- The Cosmos DB ([APP_NAME]-db) is managed exclusively by the Node.js backend.
  It is NOT connected to the Foundry project as a data source.
- The Entra ID App Registration ([App Name] Admin Portal) has only localhost:5173
  as a redirect URI for now. The production URL must be added after deployment.
- XML policy comments use only <!-- and --> with no double-dashes (--) inside
  comment bodies, as APIM rejects XML with -- inside comments.

---

## Documentation Files

Located in docs/:
- AZURE_SETUP_GUIDE.md — generic setup guide
- AZURE_SETUP_GUIDE_[APP_NAME].md — project-specific portal walkthrough
- RUNNING_THE_SCRIPTS_[APP_NAME].md — how to run infrastructure scripts via Cloud Shell
- ADDING_A_NEW_MODEL.md — step-by-step guide for onboarding future models
- END_TO_END_TEST.md — manual test checklist for the full consumer flow

---

## GitHub

Repository: [YOUR_GITHUB_REPO_URL]

---

Now that you have full context, please assist me with the following:

[DESCRIBE YOUR TASK HERE]
```
