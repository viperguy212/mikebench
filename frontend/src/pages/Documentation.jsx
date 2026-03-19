// =============================================================================
// Documentation Page — API usage guide with code examples
// =============================================================================

import React, { useState } from 'react';

const GATEWAY_URL = import.meta.env.VITE_APIM_GATEWAY_URL || 'https://your-apim.azure-api.net';

const MODELS = [
  { id: 'gpt4o',  name: 'GPT-4o',          path: '/gpt4o/openai/deployments/gpt-4o/chat/completions' },
  { id: 'mistral',name: 'Mistral-Large-3',  path: '/mistral/models/Mistral-Large-3/chat/completions' },
  { id: 'llama3', name: 'Llama 3 70B',      path: '/llama3/models/meta-llama-3-70b-instruct/chat/completions' },
];

const EXAMPLES = {
  curl: (model) => `# ${model.name} — cURL example
curl -X POST "${GATEWAY_URL}${model.path}" \\
  -H "Content-Type: application/json" \\
  -H "Ocp-Apim-Subscription-Key: YOUR_API_KEY" \\
  -d '{
    "messages": [
      {"role": "system", "content": "You are a helpful assistant."},
      {"role": "user",   "content": "Explain quantum entanglement in simple terms."}
    ],
    "max_tokens": 500,
    "temperature": 0.7
  }'`,

  python: (model) => `# ${model.name} — Python example
# Install: pip install requests

import requests
import json

API_KEY = "YOUR_API_KEY"   # Load from environment in production: os.getenv("LLM_API_KEY")
ENDPOINT = "${GATEWAY_URL}${model.path}"

headers = {
    "Content-Type": "application/json",
    "Ocp-Apim-Subscription-Key": API_KEY,
}

payload = {
    "messages": [
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user",   "content": "Explain quantum entanglement in simple terms."},
    ],
    "max_tokens": 500,
    "temperature": 0.7,
}

response = requests.post(ENDPOINT, headers=headers, json=payload)
response.raise_for_status()

result = response.json()
print(result["choices"][0]["message"]["content"])`,

  javascript: (model) => `// ${model.name} — JavaScript (Node.js) example
// Works in Node.js 18+ with built-in fetch

const API_KEY = process.env.LLM_API_KEY;  // Set in your .env file
const ENDPOINT = "${GATEWAY_URL}${model.path}";

async function chat(userMessage) {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Ocp-Apim-Subscription-Key": API_KEY,
    },
    body: JSON.stringify({
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user",   content: userMessage },
      ],
      max_tokens: 500,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(\`API error: \${error.error?.message}\`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// Usage:
chat("Explain quantum entanglement in simple terms.")
  .then(console.log)
  .catch(console.error);`,

  csharp: (model) => `// ${model.name} — C# example
// Install: dotnet add package System.Net.Http.Json

using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;

var apiKey = Environment.GetEnvironmentVariable("LLM_API_KEY")
    ?? throw new InvalidOperationException("LLM_API_KEY not set");

var endpoint = "${GATEWAY_URL}${model.path}";

using var client = new HttpClient();
client.DefaultRequestHeaders.Add("Ocp-Apim-Subscription-Key", apiKey);

var requestBody = new {
    messages = new[] {
        new { role = "system", content = "You are a helpful assistant." },
        new { role = "user",   content = "Explain quantum entanglement in simple terms." },
    },
    max_tokens = 500,
    temperature = 0.7,
};

var response = await client.PostAsJsonAsync(endpoint, requestBody);
response.EnsureSuccessStatusCode();

var result = await response.Content.ReadFromJsonAsync<JsonElement>();
var content = result
    .GetProperty("choices")[0]
    .GetProperty("message")
    .GetProperty("content")
    .GetString();

Console.WriteLine(content);`,
};

export default function Documentation() {
  const [activeModel, setActiveModel] = useState('gpt4o');
  const [activeLang, setActiveLang] = useState('curl');
  const [copiedBlock, setCopiedBlock] = useState('');

  const model = MODELS.find(m => m.id === activeModel);

  async function copyCode(code, id) {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedBlock(id);
      setTimeout(() => setCopiedBlock(''), 2000);
    } catch {
      // Clipboard not available
    }
  }

  return (
    <div style={{ padding: '60px 0 80px' }}>
      <div className="container">
        {/* Header */}
        <div style={{ maxWidth: 720, marginBottom: 56 }}>
          <h1 style={{ marginBottom: 16 }}>API Documentation</h1>
          <p style={{ fontSize: '1.125rem', color: 'var(--color-gray-600)', lineHeight: 1.7 }}>
            All models share the same OpenAI-compatible request format. Change the endpoint URL to
            switch between models — no other code changes needed.
          </p>
        </div>

        {/* Quick reference */}
        <div className="card" style={{ marginBottom: 48 }}>
          <h3 style={{ marginBottom: 20 }}>Authentication</h3>
          <p style={{ color: 'var(--color-gray-600)', marginBottom: 16 }}>
            Pass your API key in the <code style={{ background: 'var(--color-gray-100)', padding: '2px 6px', borderRadius: 4 }}>Ocp-Apim-Subscription-Key</code> request header.
            All requests must be made over HTTPS.
          </p>

          <div className="code-block">
            {`# Required header on every request:
Ocp-Apim-Subscription-Key: YOUR_API_KEY`}
          </div>

          <p style={{ marginTop: 16, fontSize: '0.875rem', color: 'var(--color-gray-500)' }}>
            Rate limits and model access are configured per account. Check your dashboard or contact the admin for your specific limits.
          </p>
        </div>

        {/* API Endpoints */}
        <div className="card" style={{ marginBottom: 48 }}>
          <h3 style={{ marginBottom: 20 }}>Endpoints</h3>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Model</th>
                  <th>Endpoint URL</th>
                </tr>
              </thead>
              <tbody>
                {MODELS.map(m => (
                  <tr key={m.id}>
                    <td><strong>{m.name}</strong></td>
                    <td>
                      <code style={{
                        fontSize: '0.8125rem',
                        background: 'var(--color-gray-100)',
                        padding: '2px 6px',
                        borderRadius: 4,
                        wordBreak: 'break-all',
                      }}>
                        {GATEWAY_URL}{m.path}
                      </code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Request / Response format */}
        <div className="card" style={{ marginBottom: 48 }}>
          <h3 style={{ marginBottom: 20 }}>Request format</h3>
          <p style={{ marginBottom: 16, color: 'var(--color-gray-600)' }}>
            All endpoints accept the standard OpenAI chat completions request body:
          </p>
          <div className="code-block">
{`{
  "messages": [
    { "role": "system",    "content": "You are a helpful assistant." },
    { "role": "user",      "content": "Your question here" },
    { "role": "assistant", "content": "Previous response (for multi-turn)" }
  ],
  "max_tokens": 500,          // Required. Max tokens in the response.
  "temperature": 0.7,          // 0.0 = deterministic, 1.0 = creative
  "top_p": 1.0,                // Alternative to temperature (use one, not both)
  "stream": false,             // Set true for streaming responses
  "stop": ["\n\n"]             // Optional: stop sequences
}`}
          </div>

          <h3 style={{ marginBottom: 16, marginTop: 32 }}>Response format</h3>
          <div className="code-block">
{`{
  "id": "chatcmpl-abc123",
  "object": "chat.completion",
  "created": 1715000000,
  "model": "gpt-4o",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "The response text appears here."
      },
      "finish_reason": "stop"  // "stop" | "length" | "content_filter"
    }
  ],
  "usage": {
    "prompt_tokens": 28,
    "completion_tokens": 105,
    "total_tokens": 133
  }
}`}
          </div>
        </div>

        {/* Code examples */}
        <div className="card" style={{ marginBottom: 48 }}>
          <h3 style={{ marginBottom: 20 }}>Code examples</h3>

          {/* Model selector */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontWeight: 600, marginBottom: 10, color: 'var(--color-gray-600)', fontSize: '0.875rem' }}>
              SELECT MODEL:
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {MODELS.map(m => (
                <button key={m.id} onClick={() => setActiveModel(m.id)} className="btn btn-sm" style={{
                  background: activeModel === m.id ? 'var(--color-primary-500)' : 'white',
                  color: activeModel === m.id ? 'white' : 'var(--color-gray-700)',
                  border: `1px solid ${activeModel === m.id ? 'var(--color-primary-500)' : 'var(--color-gray-300)'}`,
                }}>
                  {m.name}
                </button>
              ))}
            </div>
          </div>

          {/* Language selector */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontWeight: 600, marginBottom: 10, color: 'var(--color-gray-600)', fontSize: '0.875rem' }}>
              LANGUAGE:
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['curl', 'python', 'javascript', 'csharp'].map(lang => (
                <button key={lang} onClick={() => setActiveLang(lang)} className="btn btn-sm" style={{
                  background: activeLang === lang ? '#1e1e1e' : 'white',
                  color: activeLang === lang ? '#d4d4d4' : 'var(--color-gray-700)',
                  border: `1px solid ${activeLang === lang ? '#333' : 'var(--color-gray-300)'}`,
                  fontFamily: 'var(--font-mono)',
                }}>
                  {lang === 'csharp' ? 'C#' : lang}
                </button>
              ))}
            </div>
          </div>

          {/* Code block */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => copyCode(EXAMPLES[activeLang](model), `${activeModel}-${activeLang}`)}
              style={{
                position: 'absolute', top: 12, right: 12, zIndex: 1,
                background: 'rgba(255,255,255,0.1)',
                color: '#d4d4d4',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 6,
                padding: '4px 12px',
                cursor: 'pointer',
                fontSize: '0.8125rem',
                fontWeight: 600,
              }}
            >
              {copiedBlock === `${activeModel}-${activeLang}` ? '✓ Copied' : 'Copy'}
            </button>
            <div className="code-block" style={{ paddingTop: 48 }}>
              {EXAMPLES[activeLang](model)}
            </div>
          </div>
        </div>

        {/* Error codes */}
        <div className="card" style={{ marginBottom: 48 }}>
          <h3 style={{ marginBottom: 20 }}>Error responses</h3>
          <p style={{ color: 'var(--color-gray-600)', marginBottom: 16 }}>
            All errors return a consistent JSON format:
          </p>
          <div className="code-block" style={{ marginBottom: 24 }}>
{`{
  "error": {
    "code": "MISSING_SUBSCRIPTION_KEY",
    "message": "A valid subscription key is required...",
    "status": 401
  }
}`}
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>HTTP Status</th>
                  <th>Error Code</th>
                  <th>Meaning / Action</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['401', 'MISSING_SUBSCRIPTION_KEY', 'Your API key is missing from the request header. Add Ocp-Apim-Subscription-Key.'],
                  ['401', 'INVALID_SUBSCRIPTION_KEY', 'Your API key is invalid or has been revoked. Generate a new key from your dashboard.'],
                  ['400', 'TOKEN_LIMIT_EXCEEDED', 'max_tokens exceeds the limit configured for your account. Reduce it or contact the admin.'],
                  ['429', 'Rate Limit Exceeded', 'You have exceeded your per-minute rate limit. Wait and retry. See Retry-After header.'],
                  ['403', 'Quota Exceeded', 'You have used all of your daily quota. Resets at midnight UTC.'],
                  ['503', 'Service Unavailable', 'Backend model is temporarily unavailable. The gateway will retry automatically (up to 3 times).'],
                ].map(([status, code, action]) => (
                  <tr key={code}>
                    <td><code style={{ fontWeight: 700 }}>{status}</code></td>
                    <td><code style={{ fontSize: '0.8125rem', background: 'var(--color-gray-100)', padding: '2px 6px', borderRadius: 4 }}>{code}</code></td>
                    <td style={{ fontSize: '0.875rem', color: 'var(--color-gray-600)' }}>{action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Test with curl — end to end */}
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>End-to-end test script</h3>
          <p style={{ color: 'var(--color-gray-600)', marginBottom: 20 }}>
            Run this after receiving your API key to verify everything is working:
          </p>
          <div className="code-block">
{`#!/bin/bash
# Replace these values:
API_KEY="your-api-key-here"
GATEWAY_URL="${GATEWAY_URL}"

echo "=== Test 1: GPT-4o ==="
curl -s -X POST "$GATEWAY_URL/gpt4o/openai/deployments/gpt-4o/chat/completions" \\
  -H "Content-Type: application/json" \\
  -H "Ocp-Apim-Subscription-Key: $API_KEY" \\
  -d '{"messages":[{"role":"user","content":"Reply with exactly: TEST_OK"}],"max_tokens":20}' \\
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('✅ GPT-4o:', d['choices'][0]['message']['content'])"

echo ""
echo "=== Test 2: Rate limit test (send 11 rapid requests) ==="
echo "If your account has a low per-minute limit, you may see 429 Too Many Requests"
for i in {1..11}; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$GATEWAY_URL/gpt4o/openai/deployments/gpt-4o/chat/completions" \\
    -H "Ocp-Apim-Subscription-Key: $API_KEY" \\
    -H "Content-Type: application/json" \\
    -d '{"messages":[{"role":"user","content":"hi"}],"max_tokens":5}')
  echo "Request $i: HTTP $STATUS"
done`}
          </div>
        </div>
      </div>
    </div>
  );
}
