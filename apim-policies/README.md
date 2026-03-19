# APIM Policies — How to Apply

## What are APIM Policies?

Policies are XML snippets that APIM executes on every API request.
Think of them as middleware — they run before your request hits the backend
and before the response reaches the consumer.

Each policy has four sections:
- `<inbound>` — runs when a request arrives at APIM (auth, routing, header injection)
- `<backend>` — runs just before forwarding to the backend (credential injection)
- `<outbound>` — runs when the response comes back (add/remove headers)
- `<on-error>` — runs if anything fails (error formatting)

## How to Apply These Policies in the Azure Portal

### Apply the Global Policy (applies to ALL APIs)
1. Go to `portal.azure.com`
2. Navigate to your APIM service
3. In the left menu, click **APIs**
4. At the very top of the API list, click **All APIs**
5. Click the **Design** tab
6. In the "Inbound processing" section, click the `</>` (code editor) button
7. Delete all existing content
8. Paste the contents of `global-policy.xml`
9. Click **Save**

### Apply a Product Policy (rate limits per product)
1. In the left menu, click **Products**
2. Click the product name (e.g., "GPT-4o Access")
3. Click **Policies** in the left submenu
4. Click the `</>` (code editor) button
5. Paste the corresponding product policy XML
6. Click **Save**

### Apply an API-Level Policy (credential injection per model)
1. In the left menu, click **APIs**
2. Click the API name (e.g., "GPT-4o (Azure OpenAI)")
3. Click the **Design** tab
4. In the "All operations" row, click the `</>` in "Inbound processing"
5. Paste the corresponding API policy XML
6. Click **Save**

## Named Values (Secrets from Key Vault)

Before applying policies, create Named Values that reference your Key Vault secrets:

1. In APIM, click **APIs** → **Named values** (in the left menu)
2. Click **+ Add**
3. For each secret:

| Display name | Name | Type | Key Vault secret name |
|---|---|---|---|
| Foundry GPT4o Key | ai-foundry-gpt4o-key | Key Vault | ai-foundry-gpt4o-key |
| Foundry Mistral Key | ai-foundry-mistral-key | Key Vault | ai-foundry-mistral-key |
| Foundry Llama Key | ai-foundry-llama-key | Key Vault | ai-foundry-llama-key |

4. For each: Select Key Vault → pick your Key Vault → pick the secret → Save

The policies reference these as `{{ai-foundry-gpt4o-key}}` — APIM resolves them at runtime.
