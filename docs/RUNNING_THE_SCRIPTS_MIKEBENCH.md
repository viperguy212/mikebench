# Running the Infrastructure Scripts — Mikebench

This guide walks through running the `infrastructure/` scripts on Windows.
If you followed the portal walkthrough in `AZURE_SETUP_GUIDE_MIKEBENCH.md`,
some resources are already created — this guide tells you exactly which scripts
to skip and which to run.

---

## Part 1 — Getting Set Up in Azure Cloud Shell

The infrastructure scripts are bash scripts (`.sh` files). Windows does not run
these natively. The easiest option is **Azure Cloud Shell** — a browser-based
terminal that is already logged into your Azure account and requires no local setup.

### Step 1 — Open Cloud Shell

1. Go to `portal.azure.com`
2. Click the **Cloud Shell** icon in the top toolbar — it looks like `>_`
   *(it sits in the header bar, to the left of the notification bell)*
3. If prompted to create a storage account, click **"Create storage"** — this is a small
   free persistent storage used by Cloud Shell
4. When the terminal opens, click the dropdown at the top of the terminal pane and
   select **"Bash"** if it is not already selected
5. You are now in a bash terminal already logged into Azure — no `az login` needed

---

### Step 2 — Clone your GitHub repository

Since your project is already on GitHub, the cleanest approach is to clone it
directly into Cloud Shell. This also means you can edit files here and push
changes back to GitHub if needed.

Run this in the Cloud Shell terminal:

```bash
git clone https://github.com/viperguy212/mikebench.git
cd mikebench
```

You now have all your project files available in Cloud Shell.

---

### Step 3 — Open the built-in file editor

Cloud Shell has a full graphical file editor (similar to VS Code) built in.
Use it to edit scripts before running them — no typing values into a terminal needed.

1. In the Cloud Shell toolbar, click the **"{ }"** (curly braces) icon — this opens the editor
   *(alternatively type `code .` in the terminal and press Enter)*
2. The editor opens in the upper half of the screen, with a file tree on the left
3. Navigate to the file you want to edit by clicking through the folders in the left panel
4. Make your changes — the editor saves automatically, or press **Ctrl+S**
5. Close the editor by clicking the **X** on the editor tab or clicking the `>_` icon to
   return focus to the terminal

> **Tip:** Keep the editor open while you run scripts in the terminal below.
> You can switch between them freely.
   You should see your subscription name and ID printed.
5. Navigate to the project folder:
   ```bash
   cd /c/Users/Michael/llm-api-hub
   ```

---

## Part 2 — Which Scripts to Skip

If you followed the portal walkthrough in `AZURE_SETUP_GUIDE_MIKEBENCH.md`, you already
created several resources through the portal. Here is the status of each script:

| Script | What it creates | Status |
|---|---|---|
| `1-setup-resource-group.sh` | Resource group `mikebench-rg` | ✅ Already done via portal |
| `2-setup-keyvault.sh` | Key Vault `mikebench-kv` + placeholder secrets | ✅ Already done via portal |
| `3-setup-cosmos.sh` | Cosmos DB account, database, containers | ✅ Already done via portal |
| `4-setup-apim.sh` | APIM service + Products | ⚠️ Partial — APIM service done via portal, Products not yet created |
| `5-setup-apim-apis.sh` | API routes in APIM, assigned to Products | ❌ Not done — run this |
| `6-setup-communication-services.sh` | Azure Communication Services (email) | ❌ Not done — run this |
| `7-setup-app-registration.sh` | Entra ID App Registration | ❌ Not done — run this |

---

## Part 3 — Script 4 (Products only)

Because you already created the APIM service through the portal, running the full
`4-setup-apim.sh` script would fail — it would try to create `mikebench-apim` again
and conflict with the existing resource. Instead, paste the Product creation
commands below directly into the Cloud Shell terminal — no file editing needed.

Copy and paste these commands one block at a time into your terminal.
They will create the three access Products inside your existing `mikebench-apim` instance:

```bash
APIM_SERVICE_NAME="mikebench-apim"
RESOURCE_GROUP="mikebench-rg"
```

**GPT-4o Access product** (GPT-4o only, 100 requests/day):
```bash
az apim product create \
  --service-name "$APIM_SERVICE_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --product-id "gpt4o-access" \
  --product-name "GPT-4o Access" \
  --description "Access to GPT-4o with 100 requests per day." \
  --state "published" \
  --subscription-required true \
  --approval-required true \
  --subscriptions-limit 1
```

**Standard Access product** (all models, 1,000 requests/day):
```bash
az apim product create \
  --service-name "$APIM_SERVICE_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --product-id "standard-access" \
  --product-name "Standard Access – All Models" \
  --description "Access to all models with 1,000 requests per day." \
  --state "published" \
  --subscription-required true \
  --approval-required true \
  --subscriptions-limit 3
```

**Full Access product** (all models, 10,000 requests/day):
```bash
az apim product create \
  --service-name "$APIM_SERVICE_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --product-id "full-access" \
  --product-name "Full Access – All Models" \
  --description "Access to all models with 10,000 requests per day." \
  --state "published" \
  --subscription-required true \
  --approval-required false \
  --subscriptions-limit 10
```

### Checkpoint
1. Go to `portal.azure.com` → `mikebench-apim` → left menu → **"Products"**
2. You should see **GPT-4o Access**, **Standard Access – All Models**, and **Full Access – All Models** ✅

---

## Part 4 — Script 5 (API Routes)

This script creates the three API route definitions in APIM and assigns them to your Products.
Before running it, you need to fill in your resource names and endpoint URLs.

**Step 1.** Open the Cloud Shell editor:
- Click the **"{ }"** icon in the Cloud Shell toolbar (or type `code .` in the terminal)
- In the file tree on the left, click **`infrastructure`** → click **`5-setup-apim-apis.sh`**

**Step 2.** Find and update these lines near the top of the file:

| Line | Find | Replace with |
|---|---|---|
| 20 | `RESOURCE_GROUP="llm-api-hub-rg"` | `RESOURCE_GROUP="mikebench-rg"` |
| 21 | `APIM_SERVICE_NAME="<YOUR_INITIALS_OR_NAME>-llm-hub"` | `APIM_SERVICE_NAME="mikebench-apim"` |
| 25 | `GPT4O_BACKEND_URL="https://<YOUR_OPENAI_RESOURCE>.openai.azure.com"` | Your AI Gateway endpoint URL |
| 26 | `MISTRAL_BACKEND_URL="https://<YOUR_FOUNDRY_ENDPOINT>.services.ai.azure.com"` | Same AI Gateway endpoint URL (or leave if not deployed) |
| 27 | `LLAMA_BACKEND_URL="https://<YOUR_FOUNDRY_ENDPOINT>.services.ai.azure.com"` | Same AI Gateway endpoint URL (or leave if not deployed) |

> **Where to find the AI Gateway endpoint URL:**
> Foundry portal → your `mikebench-project` → **"AI Gateway"** → click `mikebench-gateway` →
> copy the **"Endpoint"** or **"Gateway URL"** shown on the overview screen.
> It will look like: `https://mikebench-gateway.eastus.inference.ai.azure.com`

**Step 3.** Press **Ctrl+S** to save, then click back into the terminal and run:

```bash
bash infrastructure/5-setup-apim-apis.sh
```

### Expected output
```
Creating GPT-4o API...
GPT-4o API created.
Creating Mistral API...
Mistral-Large-3 API created.
Creating Llama API...
Llama API created.
Assigning APIs to Products...
✅ SUCCESS: All APIs created and assigned to Products.
```

### Checkpoint
1. Go to `portal.azure.com` → `mikebench-apim` → left menu → **"APIs"**
2. You should now see **GPT-4o (Azure OpenAI)**, **Mistral-Large-3 (AI Foundry)**, and
   **Meta Llama 3 70B (AI Foundry)** listed alongside the default Echo API ✅

---

## Part 5 — Script 6 (Communication Services / Email)

This script creates Azure Communication Services, which sends welcome emails to consumers
when their registration is approved.

**Step 1.** In the Cloud Shell editor, open **`infrastructure/6-setup-communication-services.sh`**

**Step 2.** Update these lines near the top:

| Find | Replace with |
|---|---|
| `RESOURCE_GROUP="llm-api-hub-rg"` | `RESOURCE_GROUP="mikebench-rg"` |
| `ACS_NAME="<YOUR_INITIALS_OR_NAME>-llm-acs"` | `ACS_NAME="mikebench-acs"` |
| `KEYVAULT_NAME="<YOUR_INITIALS_OR_NAME>-llm-kv"` | `KEYVAULT_NAME="mikebench-kv"` |

**Step 3.** Press **Ctrl+S** to save, click back into the terminal and run:

```bash
bash infrastructure/6-setup-communication-services.sh
```

**Step 4.** After the script finishes, it will print a **connection string**. The script should
store it in Key Vault automatically, but verify:

1. Go to `portal.azure.com` → `mikebench-kv` → **"Secrets"**
2. You should see `acs-connection-string` with a real value (not `PLACEHOLDER_REPLACE_ME`) ✅

---

## Part 6 — Script 7 (App Registration)

This script creates an Azure Entra ID App Registration — the identity that allows your
admin portal to verify who is signing in.

> ⚠️ **Important:** The client secret generated by this script is shown **only once** in
> the terminal output. The script stores it in Key Vault automatically, but copy it
> somewhere safe as a backup before closing your terminal.

**Step 1.** In the Cloud Shell editor, open **`infrastructure/7-setup-app-registration.sh`**

**Step 2.** Update these lines near the top:

| Find | Replace with |
|---|---|
| `KEYVAULT_NAME="<YOUR_INITIALS_OR_NAME>-llm-kv"` | `KEYVAULT_NAME="mikebench-kv"` |
| `REDIRECT_URI_LOCAL="http://localhost:5173"` | Leave as-is for now |

**Step 3.** Press **Ctrl+S** to save, click back into the terminal and run:

```bash
bash infrastructure/7-setup-app-registration.sh
```

**Step 4.** The script will print your **App (client) ID** and **Tenant ID** at the end.
Copy these into your `.env` file:

```
AZURE_AD_CLIENT_ID=<printed by the script>
AZURE_AD_TENANT_ID=<printed by the script>
```

### Checkpoint
1. Go to `portal.azure.com` → search **"App registrations"** → click **"All applications"**
2. You should see a Mikebench app registration in the list ✅
3. Go to `mikebench-kv` → **"Secrets"** → confirm `azure-ad-client-secret` has a real value ✅

---

## All Done — What You Now Have

| Resource | Name | Status |
|---|---|---|
| Resource Group | `mikebench-rg` | ✅ |
| Key Vault | `mikebench-kv` | ✅ |
| Cosmos DB | `mikebench-cosmos` | ✅ |
| APIM Service | `mikebench-apim` | ✅ |
| APIM Products | GPT-4o Access, Standard Access, Full Access | ✅ |
| APIM APIs | GPT-4o, Mistral-Large-3, Llama 3 | ✅ |
| Microsoft Foundry | `mikebench-foundry` / `mikebench-project` | ✅ |
| AI Gateway | `mikebench-gateway` | ✅ |
| Communication Services | `mikebench-acs` | ✅ |
| App Registration | Mikebench (Entra ID) | ✅ |

**Next step:** Return to `AZURE_SETUP_GUIDE_MIKEBENCH.md` Part 7 Step B to apply the APIM policy XML files.
