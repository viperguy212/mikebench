#!/bin/bash
# =============================================================================
# Script 1: Create Resource Group
# =============================================================================
# WHAT THIS DOES:
#   Creates a single Azure Resource Group that will contain ALL resources for
#   this project. Think of a Resource Group as a folder in Azure — it keeps
#   everything organized and makes it easy to delete everything at once later.
#
# BEFORE RUNNING:
#   1. Install Azure CLI: https://learn.microsoft.com/en-us/cli/azure/install-azure-cli
#   2. Open a terminal (PowerShell or bash)
#   3. Run: az login
#      - This opens a browser window — sign in with your Azure account
#   4. Run this script: bash infrastructure/1-setup-resource-group.sh
#
# COST: 💰 Resource Groups themselves are FREE. Costs come from resources inside.
# =============================================================================

set -e  # Stop immediately if any command fails

# -----------------------------------------------
# CONFIGURATION — Edit these values if needed
# -----------------------------------------------
RESOURCE_GROUP="llm-api-hub-rg"
LOCATION="eastus"      # Change this if you want a different region
                       # Other options: westus2, westeurope, eastasia
                       # Full list: az account list-locations --output table

# -----------------------------------------------
# STEP 1: Verify Azure CLI is logged in
# -----------------------------------------------
echo "Checking Azure CLI login status..."
ACCOUNT=$(az account show --query "{name:name, id:id}" -o tsv 2>/dev/null) || {
    echo ""
    echo "ERROR: You are not logged into the Azure CLI."
    echo "Please run: az login"
    echo "Then re-run this script."
    exit 1
}
echo "Logged in. Active subscription: $ACCOUNT"

# -----------------------------------------------
# STEP 2: Create the Resource Group
# -----------------------------------------------
echo ""
echo "Creating Resource Group: $RESOURCE_GROUP in $LOCATION..."

az group create \
    --name "$RESOURCE_GROUP" \
    --location "$LOCATION" \
    --tags "project=llm-api-hub" "environment=production" "created-by=setup-script"

echo ""
echo "✅ SUCCESS: Resource Group '$RESOURCE_GROUP' created in '$LOCATION'"
echo ""
echo "CHECKPOINT — How to verify this worked:"
echo "  Option 1 (Portal): Go to portal.azure.com → Search 'Resource groups' → You should see '$RESOURCE_GROUP' listed"
echo "  Option 2 (CLI):    Run: az group show --name $RESOURCE_GROUP"
echo ""
echo "NEXT STEP: Run infrastructure/2-setup-keyvault.sh"
