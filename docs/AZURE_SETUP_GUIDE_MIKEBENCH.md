# Azure Setup Guide — Mikebench — Step-by-Step Portal Walkthrough

This guide walks you through every Azure resource you need to create for Mikebench,
one screen at a time. No Azure experience required.

## What you will create

| Resource | Purpose | Approx. Cost |
|---|---|---|
| Resource Group | Container for all Mikebench resources | Free |
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
If you ever want to delete Mikebench, you delete the Resource Group and everything inside disappears at once.

**Step 1.** Open a browser and go to `portal.azure.com`. Sign in with your Microsoft account.

**Step 2.** Click the search bar at the very top of the page (it says "Search resources, services, and docs").

**Step 3.** Type `Resource groups` and click the result labeled **"Resource groups"** (with the blue folder icon).

**Step 4.** Click the blue **"+ Create"** button in the top-left area.

**Step 5.** You will see a form with these fields. Fill them in exactly:

| Field | Value to enter |
|---|---|
| Subscription | Click the dropdown — select your Azure subscription name |
| Resource group | `mikebench-rg` |
| Region | `(US) East US` |

**Step 6.** Click the blue **"Review + create"** button at the bottom.

**Step 7.** You will see a green checkmark and "Validation passed". Click the blue **"Create"** button.

**Step 8.** Wait about 5 seconds. You will see a notification saying "Resource group created".

### Checkpoint: How to verify this worked
1. Click the search bar again → type `Resource groups` → click the result
2. You should see `mikebench-rg` in the list
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
| Resource group | `mikebench-rg` |
| Key vault name | `mikebench-kv` (must be globally unique, 3-24 chars — add a suffix if taken, e.g. `mikebench-kv-01`) |
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

Cosmos DB stores Mikebench consumer registration data — who registered, their approval status, and their APIM subscription ID.

**Step 1.** Search bar → `Azure Cosmos DB` → click the result.

**Step 2.** Click **"+ Create"**.

**Step 3.** On the "Select API option" screen, click **"Azure Cosmos DB for NoSQL"** → click **"Create"**.

**Step 4.** Fill in the form:

| Field | Value |
|---|---|
| Subscription | Your subscription |
| Resource Group | `mikebench-rg` |
| Account Name | `mikebench-cosmos` (globally unique — add a suffix if taken, e.g. `mikebench-cosmos-01`) |
| Location | `(US) East US` |
| Capacity mode | **Serverless** (very important — this is the cheapest option) |

**Step 5.** Click **"Review + create"** → **"Create"**.
*(This takes 3-5 minutes. Get a coffee.)*

**Step 6.** Click **"Go to resource"** when done.

**Step 7.** Create the database and containers:
- In the left menu, click **"Data Explorer"**
- Click **"New Container"**
- Database id: Select **"Create new"**, type `mikebench-db`
- Check **"Share throughput across containers"** → leave RU/s as 400
- Container id: `registrations`
- Partition key: `/email`
- Click **"OK"**

**Step 8.** Create the second container:
- Click **"New Container"** again
- Database id: Select **"Use existing"** → `mikebench-db`
- Container id: `usage-logs`
- Partition key: `/consumerId`
- Click **"OK"**

**Step 9.** Get your Cosmos DB connection key:
- In the left menu, click **"Keys"**
- Copy the **"PRIMARY KEY"** value
- You will add this to Key Vault in the next step

**Step 10.** Add the Cosmos DB key to Key Vault:
1. Open a new browser tab → go to `portal.azure.com`
2. Search bar → type `Key vaults` → click your Key Vault (`mikebench-kv`)
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
2. Expand `mikebench-db` → you should see `registrations` and `usage-logs`
3. Click `registrations` → "Items" → the container is empty (no data yet) ✅

> **Do NOT connect this Cosmos DB to your Microsoft Foundry project.**
> In the Foundry project admin panel there is a "choose a source" option that lists Cosmos DB as a connection type.
> That feature is for AI-native use cases like RAG (Retrieval Augmented Generation) and vector search —
> it is used to ground model responses against your own data. It has nothing to do with this architecture.
> The `mikebench-db` database stores user registrations and usage logs, and it is managed entirely
> by the Mikebench backend. Foundry does not need access to it. Leave them separate.

---

## Part 4: Create Azure API Management (APIM)

⚠️ **This step takes 30-45 minutes.** APIM provisioning is slow. Start it and take a break.

**Step 1.** Search bar → `API Management services` → click the result.

**Step 2.** Click **"+ Create"**.

**Step 3.** Fill in the form:

| Field | Value |
|---|---|
| Subscription | Your subscription |
| Resource Group | `mikebench-rg` |
| Region | `East US` |
| Resource name | `mikebench-apim` (becomes your gateway URL — must be globally unique) |
| Organization name | Mikebench |
| Administrator email | Your email address |
| Pricing tier | **Developer (No SLA)** |

**Step 4.** Click **"Review + create"** → **"Create"**.

**Step 5.** Wait. This takes 30-45 minutes. You can monitor the progress:
- Click the bell icon (notifications) at the top right → "Deployment in progress"
- Or search "Deployments" in your Resource Group and watch the status

**Step 6.** When complete, click **"Go to resource"**.

**Step 7.** Your APIM Overview page shows:
- **Gateway URL**: `https://mikebench-apim.azure-api.net` — copy this for your .env file
- **Developer portal URL**: `https://mikebench-apim.developer.azure-api.net`

**Step 8.** Get the master subscription key:
- Left menu → **"APIs"** → **"Subscriptions"**
- Find **"Built-in all-access subscription"**
- Click the **"..."** menu at the right → **"Show/hide keys"**
- Click the copy icon next to **"Primary key"**
- Now add this key to Key Vault:
  1. Open a new browser tab → go to `portal.azure.com`
  2. Search bar → type `Key vaults` → click your Key Vault (`mikebench-kv`)
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
1. Open a browser → go to `https://mikebench-apim.developer.azure-api.net`
2. You should see the default APIM Developer Portal page ✅
3. In the portal: APIM service → Overview → Status shows **"Online"** ✅

---

## Part 5: Create Microsoft Foundry and Deploy Models

Microsoft Foundry is where your LLM models live. You deploy the models here,
and APIM routes Mikebench consumer requests to these endpoints.

**Step 1.** Search bar → `Microsoft Foundry` → click the result.

**Step 2.** Click **"+ Create"**.

**Step 3.** Fill in the form:

| Field | Value |
|---|---|
| Name | `mikebench-foundry` (must be globally unique — add a suffix if taken, e.g. `mikebench-foundry-01`) |
| Region | `East US` |
| Default project name | `mikebench-project` |

> The subscription and resource group fields may appear on this screen or the next — set them to your subscription and `mikebench-rg`.

**Step 4.** Click **"Review + create"** → **"Create"**.
*(Takes 1-3 minutes.)*

**Step 5.** Click **"Go to resource"**, then click **"Launch"** (or **"Open Foundry portal"**) to open the Foundry studio in a new tab. You will land inside the `mikebench-project` project you named above.

**Step 6.** Deploy GPT-4o:
- In the left menu, click **"Models + endpoints"** (or **"Deployments"**)
- Click **"+ Deploy model"** → **"Deploy base model"**
- Search for `gpt-4o` → select it → click **"Confirm"**
- Deployment name: `gpt-4o` *(use exactly this — the APIM policy references this name)*
- Leave all other settings as defaults
- Click **"Deploy"**

**Step 7.** Enable AI Gateway for your project:

AI Gateway adds a managed rate-limiting and observability layer in front of your model deployments.
Enabling it means APIM will point to the AI Gateway endpoint rather than directly to the model — giving you
two independent layers of protection (APIM for consumer key auth, AI Gateway for model-level guardrails).

- In the left menu of the Foundry portal, click **"AI Gateway"**
- Click **"Create"** (or **"Enable"** if prompted)
- Fill in the form:

  | Field | Value |
  |---|---|
  | Gateway name | `mikebench-gateway` |
  | Region | `East US` (match your project region) |

- Click **"Create"** and wait for it to provision (about 30 seconds)
- Once created, click on `mikebench-gateway` to open it
- Click **"+ Add deployment"** (or **"Add target"**) to link your GPT-4o model:
  - Select the `gpt-4o` deployment you created in Step 6
  - Leave weight/priority at defaults (only one deployment, so routing is straightforward)
  - Click **"Add"** / **"Save"**
- You will now see a **Gateway Endpoint URL** on the overview screen
  (it will look like `https://mikebench-gateway.eastus.inference.ai.azure.com` or similar)
- **Copy this Gateway Endpoint URL** — you will use this in APIM instead of the raw deployment URL

> If you deploy Mistral or Llama later (Steps 9–10), return here and add those deployments
> to `mikebench-gateway` the same way.

**Step 8.** Get the GPT-4o key:
- In the left menu, click **"Models + endpoints"** → click the `gpt-4o` deployment
- Copy the **"Key"**
  *(The key comes from the model deployment itself — the AI Gateway inherits it automatically.
  You still need to store it in Key Vault so APIM can inject it into backend requests.)*
- Now add this key to Key Vault:
  1. Open a new browser tab → go to `portal.azure.com`
  2. Search bar → type `Key vaults` → click your Key Vault (`mikebench-kv`)
  3. In the left menu, click **"Secrets"**
  4. Click **"+ Generate/Import"**
  5. Fill in the form:
     - Upload options: `Manual`
     - Name: `ai-foundry-gpt4o-key`
     - Secret value: paste the Key you copied
     - Leave all other fields as defaults
  6. Click **"Create"**
  7. You should see `ai-foundry-gpt4o-key` appear in the secrets list ✅

**Step 9.** Deploy Mistral-Large-3 (optional):
- **"+ Deploy model"** → **"Deploy base model"** → search `Mistral-Large-3` → Confirm
- Deployment name: `Mistral-Large-3`
- When the deployment finishes, click on `Mistral-Large-3` in the deployments list
- Copy the **"Key"**
- Add it to Key Vault:
  1. Open a new browser tab → go to `portal.azure.com`
  2. Search bar → type `Key vaults` → click your Key Vault (`mikebench-kv`)
  3. In the left menu, click **"Secrets"**
  4. Click **"+ Generate/Import"**
  5. Fill in the form:
     - Upload options: `Manual`
     - Name: `ai-foundry-mistral-key`
     - Secret value: paste the Key you copied
     - Leave all other fields as defaults
  6. Click **"Create"**
  7. You should see `ai-foundry-mistral-key` appear in the secrets list ✅

**Step 10.** Deploy Meta Llama 3 70B (optional):
- **"+ Deploy model"** → **"Deploy base model"** → search `Meta-Llama-3-70B-Instruct` → Confirm
- Deployment name: `meta-llama-3-70b-instruct`
- When the deployment finishes, click on `meta-llama-3-70b-instruct` in the deployments list
- Copy the **"Key"**
- Add it to Key Vault:
  1. Open a new browser tab → go to `portal.azure.com`
  2. Search bar → type `Key vaults` → click your Key Vault (`mikebench-kv`)
  3. In the left menu, click **"Secrets"**
  4. Click **"+ Generate/Import"**
  5. Fill in the form:
     - Upload options: `Manual`
     - Name: `ai-foundry-llama-key`
     - Secret value: paste the Key you copied
     - Leave all other fields as defaults
  6. Click **"Create"**
  7. You should see `ai-foundry-llama-key` appear in the secrets list ✅

**Step 11.** Enable Foundry AI Search:

Foundry AI Search gives your project semantic search capabilities — useful for grounding model responses
against documents, internal knowledge bases, or any structured content you want models to reason over.
It is available as a tool you connect directly inside the Foundry project.

1. In the Foundry portal, make sure you are inside your `mikebench-project`
2. In the left menu, click **"Tools"** (you may also see it listed under **"Connected resources"** or **"Settings"** depending on your portal version)
3. Find **"AI Search"** in the tools list and click it (or click **"+ Add tool"** and select **"AI Search"** from the options)
4. You will be prompted to connect an AI Search resource. Click **"Create new Azure AI Search resource"**
5. Fill in the form:

   | Field | Value |
   |---|---|
   | Subscription | Your subscription |
   | Resource group | `mikebench-rg` |
   | Service name | `mikebench-search` (globally unique — add a suffix if taken) |
   | Location | `East US` |
   | Pricing tier | `Basic` (sufficient for most use cases; upgrade to Standard for production scale) |

6. Click **"Review + create"** → **"Create"**
   *(Takes about 1-2 minutes to provision.)*
7. Once provisioned, click **"Connect"** (or **"Select"**) to link `mikebench-search` to your Foundry project
8. Click **"Save"** or **"Apply"** to confirm the connection

You should now see AI Search listed as a connected tool in your project. ✅

> **What this enables:** Once connected, you can create search indexes from your own documents or data sources
> and use them to ground model responses — the model will search your index before answering, giving it
> access to your specific content rather than relying only on its training data.
> This is optional for the core Mikebench API key distribution flow but available whenever you are ready to use it.

**Step 12.** Update the APIM API script with your real resource names and endpoint URLs:

1. Open VS Code and open the file `infrastructure/5-setup-apim-apis.sh`

2. On **line 20**, find:
   ```
   RESOURCE_GROUP="llm-api-hub-rg"
   ```
   Replace with:
   ```
   RESOURCE_GROUP="mikebench-rg"
   ```

3. On **line 21**, find:
   ```
   APIM_SERVICE_NAME="<YOUR_INITIALS_OR_NAME>-llm-hub"
   ```
   Replace with:
   ```
   APIM_SERVICE_NAME="mikebench-apim"
   ```

4. On **line 25**, find:
   ```
   GPT4O_BACKEND_URL="https://<YOUR_OPENAI_RESOURCE>.openai.azure.com"
   ```
   Replace the URL with the **AI Gateway endpoint URL** you copied in Step 7.
   It will look something like:
   ```
   GPT4O_BACKEND_URL="https://mikebench-gateway.eastus.inference.ai.azure.com"
   ```
   > Use the AI Gateway endpoint here — **not** the raw `gpt-4o` deployment URL.
   > All traffic should flow through AI Gateway before reaching the model.

5. On **line 26**, find:
   ```
   MISTRAL_BACKEND_URL="https://<YOUR_FOUNDRY_ENDPOINT>.services.ai.azure.com"
   ```
   If you deployed Mistral and added it to `mikebench-gateway`, use the same AI Gateway endpoint URL.
   If you did not deploy Mistral, leave this line as-is — the script will still run and you can skip the Mistral product assignment.

6. On **line 27**, same as above for:
   ```
   LLAMA_BACKEND_URL="https://<YOUR_FOUNDRY_ENDPOINT>.services.ai.azure.com"
   ```

7. Save the file (`Ctrl+S`).

8. Run the script from your terminal:
   ```bash
   bash infrastructure/5-setup-apim-apis.sh
   ```

### Checkpoint: How to verify this worked
1. In Foundry portal → your project → **"Models + endpoints"**
2. You should see your deployed models with status **"Succeeded"**
3. Click a deployment → use the **"Test"** or **"Chat"** tab to send a test message
4. If you get a response, the model endpoint is working ✅

---

## Part 6: Configure APIM Named Values (Key Vault references)

Before applying policies, you must create Named Values that link to your Key Vault secrets.
This is how APIM securely injects your Foundry keys into Mikebench requests at runtime.

**Step 1.** Go to your APIM service (`mikebench-apim`) → left menu → **"APIs"** → **"Named values"**.

**Step 2.** For each entry in the table below:
- Click **"+ Add"**
- Display name and Name: as shown
- Type: **"Key vault"**
- Click **"Select"** → choose `mikebench-kv` → choose the secret name
- Click **"Save"**

| Display name | Name | Key Vault secret |
|---|---|---|
| Foundry GPT4o Key | ai-foundry-gpt4o-key | ai-foundry-gpt4o-key |
| Foundry Mistral Key | ai-foundry-mistral-key | ai-foundry-mistral-key |
| Foundry Llama Key | ai-foundry-llama-key | ai-foundry-llama-key |

**Step 3.** Grant APIM access to Key Vault:
- Key Vault (`mikebench-kv`) → **"Access control (IAM)"** → **"+ Add"** → **"Add role assignment"**
- Role: **"Key Vault Secrets User"**
- Members: click **"+ Select members"** → search for `mikebench-apim` → select it
- Click **"Review + assign"** twice

### Checkpoint: How to verify this worked
1. APIM → Named values → click one of the entries you created
2. Click the eye icon to reveal the value
3. It should show the actual secret value from Key Vault ✅

---

## Part 7: Create APIM Products and APIs, Then Apply Policies

> **Why you only see "Echo API":** The Echo API is a default demo that ships with every new APIM instance.
> Before you can apply policies, you first need to create the Mikebench Products (which control access levels)
> and APIs (which define the routes to each model). The two infrastructure scripts below do this automatically.
> Once they finish, the APIs and Products will appear in the portal and you can paste in the policy XML files.
>
> **If you enabled AI Gateway in Foundry and see an active APIM subscription for your Foundry project:**
> That subscription is normal — Foundry created it automatically so AI Gateway can authenticate with APIM.
> Leave it alone. It is a service-to-service credential, not a consumer key.
> AI Gateway connecting to APIM does **not** automatically register your API route definitions.
> You still need to run both scripts below to create the API routes and Products.

---

### Step A — Run the infrastructure scripts

See **`docs/RUNNING_THE_SCRIPTS_MIKEBENCH.md`** for the full step-by-step guide to running these scripts on Windows, including how to open Azure Cloud Shell and which scripts to skip if you followed the portal walkthrough.

In summary, since you already created the APIM service via the portal:
- **Do not run** `4-setup-apim.sh` in full — the APIM service already exists and it would conflict. Instead, follow the guide in `RUNNING_THE_SCRIPTS_MIKEBENCH.md` Part 3 which gives you the individual product creation commands to paste directly.
- **Run** `5-setup-apim-apis.sh` in full after filling in your resource names and AI Gateway endpoint URL.

When both are done, verify in the Azure portal:
1. Go to `portal.azure.com` → `mikebench-apim` → left menu → **"APIs"** — you should see **GPT-4o**, **Mistral-Large-3**, and **Llama 3** listed alongside the default Echo API
2. Left menu → **"Products"** — you should see **GPT-4o Access**, **Standard Access – All Models**, and **Full Access – All Models** ✅

---

### Step B — Apply the policy XML files

Now that the APIs and Products exist, paste in the policy files from the `apim-policies/` directory.
Apply them in this order:

**1. Global policy (applies to all APIs):**
- In the left menu, click **"APIs"**
- At the very top of the API list, click **"All APIs"**
- Click the **"Design"** tab
- In the "Inbound processing" box, click the **`</>`** (code editor) button
- Select all existing content and delete it
- Paste the full contents of `apim-policies/global-policy.xml`
- Click **"Save"**

**2. Product policies (rate limits per access level):**

For each product, the steps are the same — only the product name and XML file change:

- In the left menu, click **"Products"**
- Click the product name
- In the product's left submenu, click **"Policies"**
- Click the **`</>`** (code editor) button
- Paste the corresponding XML file contents
- Click **"Save"**

| Product name | XML file to paste |
|---|---|
| GPT-4o Access | `apim-policies/product-gpt4o-access.xml` |
| Standard Access | `apim-policies/product-standard-access.xml` |
| Full Access | `apim-policies/product-full-access.xml` |

**3. API-level policies (credential injection per model):**

For each API, the steps are the same — only the API name and XML file change:

- In the left menu, click **"APIs"**
- Click the API name
- Click the **"Design"** tab
- In the **"All operations"** row, click the **`</>`** in the "Inbound processing" box
- Paste the corresponding XML file contents
- Click **"Save"**

| API name | XML file to paste |
|---|---|
| GPT-4o (Azure OpenAI) | `apim-policies/api-gpt4o.xml` |
| Mistral-Large-3 (AI Foundry) | `apim-policies/api-mistral.xml` *(if deployed)* |
| Meta Llama 3 70B (AI Foundry) | `apim-policies/api-llama3.xml` *(if deployed)* |

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
# Navigate to the Mikebench project directory
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
You should see the Mikebench landing page. ✅
