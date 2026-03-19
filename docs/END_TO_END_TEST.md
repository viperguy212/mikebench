# End-to-End Test Walkthrough

This guide walks you through testing every part of the system after setup.
Complete these steps in order — each builds on the previous.

## Prerequisites
- All Azure resources created (see AZURE_SETUP_GUIDE.md)
- Backend running locally: `cd backend && npm run dev`
- Frontend running locally: `cd frontend && npm run dev`
- Your .env file is filled in with real values

---

## Test 1: New Consumer Registration

**What we're testing:** The registration form submits and saves to Cosmos DB.

1. Open `http://localhost:5173` in your browser
2. Click **"Request access"**
3. Fill in the registration form:
   - First name: `Test`
   - Last name: `Consumer`
   - Email: `testconsumer@example.com`
   - Organization: `Test Org`
   - Use case: `Testing the LLM API Hub end-to-end flow to verify it works`
4. Click **"Submit request →"**

**Expected result:** You see a success page saying "Registration submitted!"

**Verify in Cosmos DB:**
1. Azure Portal → Cosmos DB → Data Explorer → llm-hub-db → registrations → Items
2. You should see a document for `testconsumer@example.com` with `status: "pending"`

---

## Test 2: Admin Approval

**What we're testing:** The admin can approve registrations, which creates an APIM user and key.

1. Add your admin email to `.env`: `ADMIN_EMAILS=your-real-email@example.com`
2. Restart the backend
3. Go to `http://localhost:5173/register` → click **"Sign In"** tab
4. Enter your admin email → click **"Sign in"**
5. You should be redirected to `/admin`

6. You should see the test registration with status "pending"
7. Click **"✓ Approve"**
8. Confirm the dialog

**Expected result:**
- Row changes to status "approved"
- An email is sent to `testconsumer@example.com` with their API key

**Verify in APIM:**
1. Azure Portal → APIM service → APIs → Subscriptions
2. You should see a new subscription for the test consumer

---

## Test 3: Consumer Dashboard Login

**What we're testing:** The approved consumer can sign in and view their key.

1. Open a new incognito window → go to `http://localhost:5173/register`
2. Click **"Sign In"** tab
3. Enter `testconsumer@example.com` → click **"Sign in"**
4. You should see the Dashboard

**Verify:**
- The API key is shown (masked)
- Click **"Show key"** → the full key appears
- The usage stats show 0 calls today ✅

---

## Test 4: Make an API Call Using the Key

**What we're testing:** The API key actually works to call an LLM.

Replace `YOUR_API_KEY` with the key from the welcome email or dashboard.
Replace `your-apim.azure-api.net` with your actual APIM gateway URL from .env.

```bash
# Test GPT-4o
curl -X POST "https://your-apim.azure-api.net/gpt4o/openai/deployments/gpt-4o/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Ocp-Apim-Subscription-Key: YOUR_API_KEY" \
  -d '{
    "messages": [{"role": "user", "content": "Say exactly: LLMHUB_TEST_OK"}],
    "max_tokens": 20
  }'
```

**Expected result:**
```json
{
  "choices": [{
    "message": {
      "role": "assistant",
      "content": "LLMHUB_TEST_OK"
    },
    "finish_reason": "stop"
  }],
  "usage": { "total_tokens": 25 }
}
```

**Verify in APIM Analytics:**
1. APIM service → **"Analytics"** in the left menu
2. Select timeframe: Last hour
3. You should see 1 successful call ✅
*(Analytics has ~15 minute delay — check again in 15 minutes if nothing shows)*

---

## Test 5: Python API Call

```python
# test_api.py
import requests

API_KEY = "YOUR_API_KEY"
GATEWAY = "https://your-apim.azure-api.net"

response = requests.post(
    f"{GATEWAY}/gpt4o/openai/deployments/gpt-4o/chat/completions",
    headers={
        "Content-Type": "application/json",
        "Ocp-Apim-Subscription-Key": API_KEY,
    },
    json={
        "messages": [{"role": "user", "content": "What is 2+2? Answer in one word."}],
        "max_tokens": 10,
    }
)

print(f"Status: {response.status_code}")
print(f"Response: {response.json()['choices'][0]['message']['content']}")
# Expected: "Status: 200" and "Response: Four" (or similar)
```

Run it:
```bash
pip install requests
python test_api.py
```

---

## Test 6: Rate Limiting

**What we're testing:** Rate limits reject the 11th request in 60 seconds.

```bash
# Run this script — it sends 11 requests rapidly
for i in {1..11}; do
  RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
    -X POST "https://your-apim.azure-api.net/gpt4o/openai/deployments/gpt-4o/chat/completions" \
    -H "Ocp-Apim-Subscription-Key: YOUR_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"messages":[{"role":"user","content":"hi"}],"max_tokens":5}')

  STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
  echo "Request $i: HTTP $STATUS"
done
```

**Expected result:**
- Requests 1-10: `HTTP 200` ✅
- Request 11: `HTTP 429` ✅ (Too Many Requests)

---

## Test 7: Key Regeneration

**What we're testing:** Old key stops working immediately after regeneration.

1. Note your current API key
2. Dashboard → click **"🔄 Regenerate key"** → confirm
3. Check your email for the new key
4. Try the old key:
   ```bash
   curl "https://your-apim.azure-api.net/gpt4o/..." \
     -H "Ocp-Apim-Subscription-Key: OLD_KEY"
   ```
   **Expected: HTTP 401** ✅

5. Try the new key (from email) → **Expected: HTTP 200** ✅

---

## Test 8: Admin Key Suspension

**What we're testing:** Admin can immediately block a consumer's API key.

1. Log in to the admin panel
2. Find the test consumer → click **"⏸ Suspend"**
3. Try making an API call with their key → **Expected: HTTP 401** ✅
4. Admin panel → click **"↑ Activate"** to restore access
5. Try the API call again → **Expected: HTTP 200** ✅

---

## All Tests Passed Checklist

- [ ] Registration form submits and appears in Cosmos DB
- [ ] Admin can approve/reject registrations
- [ ] Welcome email is delivered with API key
- [ ] Consumer can sign in and view masked key
- [ ] API calls succeed with the issued key
- [ ] Python client works
- [ ] Rate limiting returns 429 after limit exceeded
- [ ] Key regeneration invalidates old key immediately
- [ ] Admin suspension blocks key immediately
- [ ] APIM Analytics shows call history

If all boxes are checked — your LLM API Hub is fully operational! 🎉
