# Adding a New Model — Mikebench

This guide walks through the full process of deploying a new LLM model and making it
available to consumers through the Mikebench APIM gateway.

---

## Phase 1 — Deploy the Model in Microsoft Foundry

1. Go to `ai.azure.com` → open `mikebench-project`
2. In the left menu click **"Models + endpoints"** → **"+ Deploy model"**
3. Select the model from the catalog, choose your deployment name (e.g. `phi-4`), and deploy
4. Once deployed, confirm it appears under **"Models + endpoints"** with status **"Succeeded"**
5. Check that `mikebench-gateway` exposes it — go to **AI Gateway → mikebench-gateway** and
   verify the new model appears in the gateway's model list. If it doesn't, add it to the
   gateway configuration.
6. Note the model's path identifier exactly as Foundry shows it (e.g. `Phi-4` — casing
   matters for the URL rewrite in Phase 5)

---

## Phase 2 — Key Vault (only if new auth key needed)

If the new model goes through the same `mikebench-gateway`, **skip this phase** — the
existing Named Value for the gateway key already covers it.

If the model uses a separate endpoint with its own key:

**Step 1.** Add the key to Key Vault in Cloud Shell:
```bash
az keyvault secret set \
  --vault-name mikebench-kv \
  --name "ai-foundry-<model>-key" \
  --value "<your-key-here>"
```

**Step 2.** Add a Named Value in APIM:
1. Go to `portal.azure.com` → `mikebench-apim` → left menu → **"Named values"**
2. Click **"+ Add"**
3. Fill in:
   - **Name:** `foundry-<model>-key`
   - **Display name:** `Foundry <Model> Key`
   - **Type:** Key Vault
   - **Secret:** select your new secret from `mikebench-kv`
4. Click **Save**

---

## Phase 3 — Register the API Route in APIM

Run these commands in Azure Cloud Shell. Replace `phi4` and `Phi-4` with your actual
model ID and path identifier noted in Phase 1.

```bash
RESOURCE_GROUP="mikebench-rg"
APIM_SERVICE_NAME="mikebench-apim"
AI_GATEWAY_URL="https://mikebench-gateway.eastus.inference.ai.azure.com"

az apim api create \
  --service-name "$APIM_SERVICE_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --api-id "phi4" \
  --display-name "Phi-4 (AI Foundry)" \
  --description "Access to Microsoft Phi-4 via Azure AI Foundry." \
  --path "phi4" \
  --protocols "https" \
  --service-url "$AI_GATEWAY_URL" \
  --subscription-key-header-name "Ocp-Apim-Subscription-Key"

az apim api operation create \
  --service-name "$APIM_SERVICE_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --api-id "phi4" \
  --operation-id "chat-completions" \
  --display-name "Chat Completions" \
  --method "POST" \
  --url-template "/models/Phi-4/chat/completions"
```

---

## Phase 4 — Assign to Products

Decide which Products should include the new model. Consumers subscribing to a Product
can only call APIs assigned to that Product — so this is your access control decision.

| Product | Typical use |
|---|---|
| `gpt4o-access` | Restricted — only include if this model replaces GPT-4o as a focused offering |
| `standard-access` | General availability — most new models go here |
| `full-access` | Always include — full access subscribers get everything |

```bash
# Add to Standard Access
az apim product api add \
  --service-name "$APIM_SERVICE_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --product-id "standard-access" \
  --api-id "phi4"

# Add to Full Access
az apim product api add \
  --service-name "$APIM_SERVICE_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --product-id "full-access" \
  --api-id "phi4"
```

---

## Phase 5 — Create and Apply the API-Level Policy

Create a new file `apim-policies/api-phi4.xml` modelled after `api-mistral.xml`.
Update the model name and Named Value reference to match your deployment.

```xml
<!--
  API Policy: Phi-4 (AI Foundry)
  Applied at: APIs > Phi-4 > All operations
-->
<policies>
  <inbound>
    <base />
    <!-- Remove APIM subscription key before forwarding to backend -->
    <set-header name="Ocp-Apim-Subscription-Key" exists-action="delete" />
    <!-- Inject AI Foundry auth key from Named Value -->
    <set-header name="Authorization" exists-action="override">
      <value>@("Bearer " + context.Variables.GetValueOrDefault<string>("foundry-gateway-key"))</value>
    </set-header>
    <set-header name="Content-Type" exists-action="override">
      <value>application/json</value>
    </set-header>
    <!-- Rewrite to the correct AI Foundry model path -->
    <rewrite-uri template="/models/Phi-4/chat/completions" />
    <set-header name="X-Access-Level" exists-action="override">
      <value>@(context.Product?.Id ?? "unknown")</value>
    </set-header>
  </inbound>
  <backend>
    <base />
  </backend>
  <outbound>
    <base />
    <set-header name="X-Model" exists-action="override">
      <value>Phi-4</value>
    </set-header>
  </outbound>
  <on-error>
    <base />
  </on-error>
</policies>
```

Apply it in the portal:
1. Go to `portal.azure.com` → `mikebench-apim` → left menu → **"APIs"**
2. Click **"Phi-4 (AI Foundry)"** → click **"All operations"**
3. Click the **`</>`** (Policy editor) button
4. Paste the XML above and click **Save**

---

## Phase 6 — Test Before Exposing to Consumers

Use APIM's built-in test console to confirm everything is wired up correctly:

1. Go to `portal.azure.com` → `mikebench-apim` → **"APIs"** → **"Phi-4"**
2. Click the **"Chat Completions"** operation → click the **"Test"** tab
3. Add a header: `Ocp-Apim-Subscription-Key` = your master subscription key
   *(found under APIM → Subscriptions → Built-in all-access subscription → Show keys)*
4. Add a request body:
   ```json
   {
     "model": "Phi-4",
     "messages": [{ "role": "user", "content": "Hello" }]
   }
   ```
5. Click **Send** and confirm you receive a `200` response with a valid completion

Do not proceed to Phase 7 until this test passes.

---

## Phase 7 — Update the Frontend Documentation Page

Open `frontend/src/pages/Documentation.jsx` and add the new model to the `MODELS` array
and endpoint table so consumers can see it in the portal.

The endpoint consumers will call:
```
POST https://mikebench-apim.azure-api.net/phi4/models/Phi-4/chat/completions
```

Example request body (same OpenAI-compatible format as all other models):
```json
{
  "model": "Phi-4",
  "messages": [
    { "role": "system", "content": "You are a helpful assistant." },
    { "role": "user", "content": "Your message here" }
  ]
}
```

---

## Phase 8 — Consumer Access

### Existing subscribers
If you added the model to a Product they already subscribe to, **no action is needed**.
Their existing subscription key works immediately. Optionally send a notification
letting them know a new model is available and pointing them to the Documentation page.

### New subscribers
The standard registration flow applies:
1. Consumer registers on the Mikebench portal
2. Admin approves the request and selects a Product in the Admin panel
3. Backend calls the APIM Management API to create the subscription and return the key
4. Welcome email is sent with the key and a link to the Documentation page

The consumer uses the same key for all models in their Product — they only need to
change the path in their requests (e.g. swap `/gpt4o/...` for `/phi4/...`).

---

## Summary Checklist

| Phase | Step | Required? |
|---|---|---|
| 1 | Deploy model in Foundry, confirm in AI Gateway | Always |
| 2 | Add Key Vault secret + APIM Named Value | Only if new endpoint or key |
| 3 | `az apim api create` + operation | Always |
| 4 | Assign API to Products | Always |
| 5 | Create `api-<model>.xml` and apply in portal | Always |
| 6 | Test in APIM console | Always |
| 7 | Update `Documentation.jsx` | Always |
| 8 | Notify existing subscribers (optional) | If adding to an existing Product |
