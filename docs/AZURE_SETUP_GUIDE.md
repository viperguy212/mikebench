# Azure Setup Guide — Step-by-Step Portal Walkthrough

This guide walks you through every Azure resource you need to create,
one screen at a time. No Azure experience required.

## What you will create

| Resource | Purpose | Approx. Cost |
|---|---|---|
| Resource Group | Container for all resources | Free |
| Key Vault | Secure secret storage | ~$0/month |
| Cosmos DB (Serverless) | Consumer registration database | ~$1-5/month |
| API Management (Developer) | LLM gateway | ~$50/month |
| Microsoft Foundry | LLM model endpoints | Pay per token |
| Communication Services | Welcome emails | Free for <100/month |
| App Registration (Entra ID) | Admin portal auth | Free |
| App Service (B1) | Backend hosting | ~$13/month |
| Static Web App (Free) | Frontend hosting | Free |

**Minimum monthly cost (low traffic): ~$65-75/month**

---

## Part 1: Create a Resource Group

A Resource Group is like a folder — it keeps all your Azure resources organized.
If you ever want to delete this project, you delete the Resource Group and everything inside disappears at once.

**Step 1.** Open a browser and go to `portal.azure.com`. Sign in with your Microsoft account.

**Step 2.** Click the search bar at the very top of the page (it says "Search resources, services, and docs").

**Step 3.** Type `Resource groups` and click the result labeled **"Resource groups"** (with the blue folder icon).

**Step 4.** Click the blue **"+ Create"** button in the top-left area.

**Step 5.** You will see a form with these fields. Fill them in exactly:

| Field | Value to enter |
|---|---|
| Subscription | Click the dropdown — select your Azure subscription name |
| Resource group | `llm-api-hub-rg` |
| Region | `(US) East US` |

**Step 6.** Click the blue **"Review + create"** button at the bottom.

**Step 7.** You will see a green checkmark and "Validation passed". Click the blue **"Create"** button.

**Step 8.** Wait about 5 seconds. You will see a notification saying "Resource group created".

### Checkpoint: How to verify this worked
1. Click the search bar again → type `Resource groups` → click the result
2. You should see `llm-api-hub-rg` in the list
3. Click on it — it should be empty (no resources yet) ✅

---

## Part 2: Create Azure Key Vault

Key Vault is where you will store all your secrets (API keys, passwords) securely.
Your application code will read them from Key Vault at runtime — they never appear in your code files.

**Step 1.** Click the search bar at the top → type `Key vaults` → click **"Key vaults"**.

**Step 2.** Click **"+ Create"**.

**Step 3.** Fill in the form:

| Field | Value to enter |
|---|---|
| Subscription | Your subscription |
| Resource group | `llm-api-hub-rg` |
| Key vault name | `yourname-llm-kv` (replace "yourname" — must be globally unique, 3-24 chars) |
| Region | `East US` |
| Pricing tier | `Standard` |

**Step 4.** Click **"Next: Access configuration"**.

**Step 5.** Under "Permission model", select **"Azure role-based access control (RBAC)"**.
*(This is more secure than the older "Vault access policy" option.)*

**Step 6.** Click **"Review + create"** → **"Create"**.

**Step 7.** Wait about 30 seconds. Click **"Go to resource"** when the deployment completes.

**Step 8.** Grant yourself access to read/write secrets:
- In the left menu, click **"Access control (IAM)"**
- Click **"+ Add"** → **"Add role assignment"**
- In the Role tab: search for `Key Vault Administrator` → select it → click **"Next"**
- In the Members tab: click **"+ Select members"** → search your name/email → click **"Select"** → **"Review + assign"** → **"Review + assign"** again

### Checkpoint: How to verify this worked
1. Go to Key Vault → click **"Secrets"** in the left menu
2. Click **"+ Generate/Import"**
3. Name: `test-secret`, Value: `hello`, click **"Create"**
4. You should see `test-secret` in the list ✅
5. Click on it → click the version → you should see the value "hello"

---

## Part 3: Create Azure Cosmos DB

Cosmos DB stores consumer registration data — who registered, their approval status, and their APIM subscription ID.

**Step 1.** Search bar → `Azure Cosmos DB` → click the result.

**Step 2.** Click **"+ Create"**.

**Step 3.** On the "Select API option" screen, click **"Azure Cosmos DB for NoSQL"** → click **"Create"**.

**Step 4.** Fill in the form:

| Field | Value |
|---|---|
| Subscription | Your subscription |
| Resource Group | `llm-api-hub-rg` |
| Account Name | `yourname-llm-cosmos` (globally unique) |
| Location | `(US) East US` |
| Capacity mode | **Serverless** (very important — this is the cheapest option) |

**Step 5.** Click **"Review + create"** → **"Create"**.
*(This takes 3-5 minutes. Get a coffee.)*

**Step 6.** Click **"Go to resource"** when done.

**Step 7.** Create the database and containers:
- In the left menu, click **"Data Explorer"**
- Click **"New Container"**
- Database id: Select **"Create new"**, type `llm-hub-db`
- Check **"Share throughput across containers"** → leave RU/s as 400
- Container id: `registrations`
- Partition key: `/email`
- Click **"OK"**

**Step 8.** Create the second container:
- Click **"New Container"** again
- Database id: Select **"Use existing"** → `llm-hub-db`
- Container id: `usage-logs`
- Partition key: `/consumerId`
- Click **"OK"**

**Step 9.** Get your Cosmos DB connection key:
- In the left menu, click **"Keys"**
- Copy the **"PRIMARY KEY"** value
- You will add this to Key Vault in the next step

**Step 10.** Add the Cosmos DB key to Key Vault:
1. Open a new browser tab → go to `portal.azure.com`
2. Search bar → type `Key vaults` → click your Key Vault (`yourname-llm-kv`)
3. In the left menu, click **"Secrets"**
4. Click **"+ Generate/Import"** at the top
5. Fill in the form:
   - Upload options: `Manual`
   - Name: `cosmos-db-key`
   - Secret value: paste the PRIMARY KEY you copied in Step 9
   - Leave all other fields as defaults
6. Click **"Create"**
7. You should see `cosmos-db-key` appear in the secrets list ✅

### Checkpoint: How to verify this worked
1. Go to Cosmos DB → Data Explorer
2. Expand `llm-hub-db` → you should see `registrations` and `usage-logs`
3. Click `registrations` → "Items" → the container is empty (no data yet) ✅

---

## Part 4: Create Azure API Management (APIM)

⚠️ **This step takes 30-45 minutes.** APIM provisioning is slow. Start it and take a break.

**Step 1.** Search bar → `API Management services` → click the result.

**Step 2.** Click **"+ Create"**.

**Step 3.** Fill in the form:

| Field | Value |
|---|---|
| Subscription | Your subscription |
| Resource Group | `llm-api-hub-rg` |
| Region | `East US` |
| Resource name | `yourname-llm-hub` (becomes your gateway URL) |
| Organization name | Your company or personal name |
| Administrator email | Your email address |
| Pricing tier | **Developer (No SLA)** |

**Step 4.** Click **"Review + create"** → **"Create"**.

**Step 5.** Wait. This takes 30-45 minutes. You can monitor the progress:
- Click the bell icon (notifications) at the top right → "Deployment in progress"
- Or search "Deployments" in your Resource Group and watch the status

**Step 6.** When complete, click **"Go to resource"**.

**Step 7.** Your APIM Overview page shows:
- **Gateway URL**: `https://yourname-llm-hub.azure-api.net` — copy this for your .env file
- **Developer portal URL**: `https://yourname-llm-hub.developer.azure-api.net`

**Step 8.** Get the master subscription key:
- Left menu → **"APIs"** → **"Subscriptions"**
- Find **"Built-in all-access subscription"**
- Click the **"..."** menu at the right → **"Show/hide keys"**
- Click the copy icon next to **"Primary key"**
- Now add this key to Key Vault:
  1. Open a new browser tab → go to `portal.azure.com`
  2. Search bar → type `Key vaults` → click your Key Vault (`yourname-llm-kv`)
  3. In the left menu, click **"Secrets"**
  4. Click **"+ Generate/Import"**
  5. Fill in the form:
     - Upload options: `Manual`
     - Name: `apim-master-subscription-key`
     - Secret value: paste the Primary key you copied
     - Leave all other fields as defaults
  6. Click **"Create"**
  7. You should see `apim-master-subscription-key` appear in the secrets list ✅

### Checkpoint: How to verify this worked
1. Open a browser → go to `https://yourname-llm-hub.developer.azure-api.net`
2. You should see the default APIM Developer Portal page ✅
3. In the portal: APIM service → Overview → Status shows **"Online"** ✅

---

## Part 5: Create Microsoft Foundry and Deploy Models

Microsoft Foundry is where your LLM models live. You deploy the models here,
and APIM routes consumer requests to these endpoints.

**Step 1.** Search bar → `Microsoft Foundry` → click the result.

**Step 2.** Click **"+ Create"**.

**Step 3.** Fill in the form:

| Field | Value |
|---|---|
| Name | `llm-api-hub-foundry` (must be globally unique) |
| Region | `East US` |
| Default project name | `llm-hub-project` |

> The subscription and resource group fields may appear on this screen or the next — set them to your subscription and `llm-api-hub-rg`.

**Step 4.** Click **"Review + create"** → **"Create"**.
*(Takes 1-3 minutes.)*

**Step 5.** Click **"Go to resource"**, then click **"Launch"** (or **"Open Foundry portal"**) to open the Foundry studio in a new tab. You will land inside the `llm-hub-project` project you named above.

**Step 6.** Deploy GPT-4o:
- In the left menu, click **"Models + endpoints"** (or **"Deployments"**)
- Click **"+ Deploy model"** → **"Deploy base model"**
- Search for `gpt-4o` → select it → click **"Confirm"**
- Deployment name: `gpt-4o` *(use exactly this — the APIM policy references this name)*
- Leave all other settings as defaults
- Click **"Deploy"**

**Step 7.** Get the GPT-4o endpoint and key:
- When the deployment finishes, click on `gpt-4o` in the deployments list
- Copy the **"Endpoint"** URL (e.g., `https://llm-api-hub-foundry.openai.azure.com`)
- Copy the **"Key"**
- Now add this key to Key Vault:
  1. Open a new browser tab → go to `portal.azure.com`
  2. Search bar → type `Key vaults` → click your Key Vault (`yourname-llm-kv`)
  3. In the left menu, click **"Secrets"**
  4. Click **"+ Generate/Import"**
  5. Fill in the form:
     - Upload options: `Manual`
     - Name: `ai-foundry-gpt4o-key`
     - Secret value: paste the Key you copied
     - Leave all other fields as defaults
  6. Click **"Create"**
  7. You should see `ai-foundry-gpt4o-key` appear in the secrets list ✅

**Step 8.** Deploy Mistral-Large-3 (optional):
- **"+ Deploy model"** → **"Deploy base model"** → search `Mistral-Large-3` → Confirm
- Deployment name: `Mistral-Large-3`
- When the deployment finishes, click on `Mistral-Large-3` in the deployments list
- Copy the **"Key"**
- Add it to Key Vault:
  1. Open a new browser tab → go to `portal.azure.com`
  2. Search bar → type `Key vaults` → click your Key Vault (`yourname-llm-kv`)
  3. In the left menu, click **"Secrets"**
  4. Click **"+ Generate/Import"**
  5. Fill in the form:
     - Upload options: `Manual`
     - Name: `ai-foundry-mistral-key`
     - Secret value: paste the Key you copied
     - Leave all other fields as defaults
  6. Click **"Create"**
  7. You should see `ai-foundry-mistral-key` appear in the secrets list ✅

**Step 9.** Deploy Meta Llama 3 70B (optional):
- **"+ Deploy model"** → **"Deploy base model"** → search `Meta-Llama-3-70B-Instruct` → Confirm
- Deployment name: `meta-llama-3-70b-instruct`
- When the deployment finishes, click on `meta-llama-3-70b-instruct` in the deployments list
- Copy the **"Key"**
- Add it to Key Vault:
  1. Open a new browser tab → go to `portal.azure.com`
  2. Search bar → type `Key vaults` → click your Key Vault (`yourname-llm-kv`)
  3. In the left menu, click **"Secrets"**
  4. Click **"+ Generate/Import"**
  5. Fill in the form:
     - Upload options: `Manual`
     - Name: `ai-foundry-llama-key`
     - Secret value: paste the Key you copied
     - Leave all other fields as defaults
  6. Click **"Create"**
  7. You should see `ai-foundry-llama-key` appear in the secrets list ✅

**Step 10.** Update APIM backend URLs:
- Now that you have the actual endpoint URLs, update the backend URL placeholders in
  `infrastructure/5-setup-apim-apis.sh` with your real Microsoft Foundry endpoint before running it.

### Checkpoint: How to verify this worked
1. In Foundry portal → your project → **"Models + endpoints"**
2. You should see your deployed models with status **"Succeeded"**
3. Click a deployment → use the **"Test"** or **"Chat"** tab to send a test message
4. If you get a response, the model endpoint is working ✅

---

## Part 6: Configure APIM Named Values (Key Vault references)

Before applying policies, you must create Named Values that link to your Key Vault secrets.
This is how APIM securely injects your AI Foundry keys at runtime.

**Step 1.** Go to your APIM service → left menu → **"APIs"** → **"Named values"**.

**Step 2.** For each entry in the table below:
- Click **"+ Add"**
- Display name and Name: as shown
- Type: **"Key vault"**
- Click **"Select"** → choose your Key Vault → choose the secret name
- Click **"Save"**

| Display name | Name | Key Vault secret |
|---|---|---|
| Foundry GPT4o Key | ai-foundry-gpt4o-key | ai-foundry-gpt4o-key |
| Foundry Mistral Key | ai-foundry-mistral-key | ai-foundry-mistral-key |
| Foundry Llama Key | ai-foundry-llama-key | ai-foundry-llama-key |

**Step 3.** Grant APIM access to Key Vault:
- Key Vault → **"Access control (IAM)"** → **"+ Add"** → **"Add role assignment"**
- Role: **"Key Vault Secrets User"**
- Members: click **"+ Select members"** → search for your APIM service name → select it
- Click **"Review + assign"** twice

### Checkpoint: How to verify this worked
1. APIM → Named values → click one of the entries you created
2. Click the eye icon to reveal the value
3. It should show the actual secret value from Key Vault ✅

---

## Part 7: Apply APIM Policies

Now apply the policies from the `apim-policies/` directory.
See `apim-policies/README.md` for step-by-step instructions on pasting each XML file.

Order to apply:
1. `global-policy.xml` → All APIs
2. `product-gpt4o-access.xml` → GPT-4o Access product
3. `product-standard-access.xml` → Standard Access product
4. `product-full-access.xml` → Full Access product
5. `api-gpt4o.xml` → GPT-4o API
6. `api-mistral.xml` → Mistral API (if deployed)
7. `api-llama3.xml` → Llama API (if deployed)

### Checkpoint: How to verify this worked
1. APIM → **"Test"** tab on any API → Send a test request
2. A request without a subscription key should return `401 MISSING_SUBSCRIPTION_KEY`
3. A request with a valid key should return a response from the AI model ✅

---

## Part 8: Set Up Local Development Environment

**Step 1.** Install VS Code:
1. Go to `code.visualstudio.com`
2. Click the big blue download button for your OS
3. Run the installer with all default settings

**Step 2.** Install Node.js 20 LTS:
1. Go to `nodejs.org`
2. Click the **"20.x.x LTS"** button (the one labeled "Recommended For Most Users")
3. Run the installer with all default settings
4. Open a new terminal (in VS Code: Terminal → New Terminal)
5. Verify: `node --version` should print `v20.x.x`

**Step 3.** Install Azure CLI:
1. Go to `learn.microsoft.com/cli/azure/install-azure-cli`
2. Follow the instructions for your OS
3. After installation, run: `az login`
4. A browser will open — sign in with your Azure account
5. Verify: `az account show` should print your subscription details

**Step 4.** Set up the project:
```bash
# Navigate to the project directory
cd C:/Users/Michael/llm-api-hub

# Copy the environment template
cp .env.example .env

# Open .env in VS Code and fill in all values
code .env
```

**Step 5.** Install dependencies:
```bash
# Install backend dependencies
cd backend
npm install
cd ..

# Install frontend dependencies
cd frontend
npm install
cd ..
```

**Step 6.** Start local development:
```bash
# Terminal 1: Start the backend
cd backend
npm run dev
# You should see: "LLM API Hub backend running on port 3001"

# Terminal 2: Start the frontend
cd frontend
npm run dev
# You should see: "Local: http://localhost:5173/"
```

**Step 7.** Open `http://localhost:5173` in your browser.
You should see the LLM API Hub landing page. ✅
