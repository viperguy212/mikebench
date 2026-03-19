// =============================================================================
// Email Service — Azure Communication Services
// =============================================================================
// WHAT THIS DOES:
//   Sends transactional emails to consumers:
//   - Welcome email with their API key when approved
//   - Rejection notification with reason
//   - Key regeneration notification
//
// HOW IT WORKS:
//   Uses the @azure/communication-email SDK to send through
//   Azure Communication Services (ACS). ACS handles delivery,
//   retries, and bounce tracking.
// =============================================================================

'use strict';

const logger = require('../utils/logger');

const USE_MOCK_EMAIL = !process.env.ACS_CONNECTION_STRING || process.env.ACS_CONNECTION_STRING.includes('REPLACE_THIS');

if (USE_MOCK_EMAIL) {
  logger.warn('ACS_CONNECTION_STRING not set — emails will be logged to console only.');
}

let emailClient;

function getEmailClient() {
  if (USE_MOCK_EMAIL) return null;
  if (!emailClient) {
    const { EmailClient } = require('@azure/communication-email');
    emailClient = new EmailClient(process.env.ACS_CONNECTION_STRING);
  }
  return emailClient;
}

const SENDER_ADDRESS = process.env.ACS_SENDER_ADDRESS || 'donotreply@example.com';
const APP_NAME = process.env.VITE_APP_NAME || 'LLM API Hub';
const PORTAL_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// =============================================================================
// Email Templates
// =============================================================================

/**
 * Send welcome email with API key to a newly approved consumer.
 *
 * @param {Object} params - { toEmail, firstName, apiKey, productName, gatewayUrl }
 */
async function sendWelcomeEmail({ toEmail, firstName, apiKey, productName, gatewayUrl }) {
  const client = getEmailClient();

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your API Key — ${APP_NAME}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: #0078d4; color: white; padding: 32px 40px; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
    .body { padding: 40px; }
    .key-box { background: #f0f4ff; border: 2px solid #0078d4; border-radius: 6px; padding: 20px; margin: 24px 0; font-family: monospace; font-size: 14px; word-break: break-all; }
    .key-label { font-size: 12px; text-transform: uppercase; color: #666; font-weight: 600; margin-bottom: 8px; }
    .btn { display: inline-block; background: #0078d4; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 16px; }
    .code-block { background: #1e1e1e; color: #d4d4d4; padding: 16px; border-radius: 6px; font-family: monospace; font-size: 13px; overflow-x: auto; margin: 12px 0; }
    .footer { padding: 24px 40px; background: #f9f9f9; font-size: 12px; color: #666; }
    .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px 16px; border-radius: 4px; margin: 16px 0; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Welcome to ${APP_NAME}</h1>
    </div>
    <div class="body">
      <p>Hi ${firstName},</p>
      <p>Your registration has been approved! You now have access to the <strong>${productName}</strong> tier.</p>

      <div class="warning">
        ⚠️ <strong>Keep this key secret.</strong> Do not share it, commit it to git, or expose it in client-side code. If it's ever compromised, regenerate it from your dashboard immediately.
      </div>

      <div class="key-box">
        <div class="key-label">Your API Key</div>
        ${apiKey}
      </div>

      <h3>Quick Start — Make your first API call</h3>
      <p>Use your API key in the <code>Ocp-Apim-Subscription-Key</code> header:</p>

      <div class="code-block">curl -X POST "${gatewayUrl}/gpt4o/openai/deployments/gpt-4o/chat/completions" \\
  -H "Content-Type: application/json" \\
  -H "Ocp-Apim-Subscription-Key: ${apiKey}" \\
  -d '{
    "messages": [{"role": "user", "content": "Hello!"}],
    "max_tokens": 100
  }'</div>

      <a class="btn" href="${PORTAL_URL}/dashboard">Go to Your Dashboard</a>

      <p style="margin-top: 24px;">Your dashboard shows real-time usage, remaining quota, and lets you regenerate your key at any time.</p>
    </div>
    <div class="footer">
      <p>If you did not request this, please ignore this email or contact support.</p>
      <p>${APP_NAME} | <a href="${PORTAL_URL}">${PORTAL_URL}</a></p>
    </div>
  </div>
</body>
</html>`;

  const textContent = `Welcome to ${APP_NAME}!

Hi ${firstName},

Your registration has been approved. You now have access to: ${productName}

YOUR API KEY (keep this secret!):
${apiKey}

Quick start:
curl -X POST "${gatewayUrl}/gpt4o/openai/deployments/gpt-4o/chat/completions" \\
  -H "Ocp-Apim-Subscription-Key: ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"messages": [{"role": "user", "content": "Hello!"}], "max_tokens": 100}'

View your dashboard: ${PORTAL_URL}/dashboard
`;

  const message = {
    senderAddress: SENDER_ADDRESS,
    recipients: {
      to: [{ address: toEmail, displayName: firstName }],
    },
    content: {
      subject: `Your ${APP_NAME} API key is ready`,
      plainText: textContent,
      html: htmlContent,
    },
  };

  await sendEmail(client, message, `welcome email to ${toEmail}`);
}

/**
 * Send rejection notification email.
 *
 * @param {Object} params - { toEmail, firstName, reason }
 */
async function sendRejectionEmail({ toEmail, firstName, reason }) {
  const client = getEmailClient();

  const message = {
    senderAddress: SENDER_ADDRESS,
    recipients: {
      to: [{ address: toEmail, displayName: firstName }],
    },
    content: {
      subject: `Update on your ${APP_NAME} registration`,
      plainText: `Hi ${firstName},\n\nWe reviewed your registration and are unable to approve it at this time.\n\nReason: ${reason || 'No reason provided.'}\n\nIf you believe this is an error, please contact support.\n\n${APP_NAME}`,
      html: `<p>Hi ${firstName},</p><p>We reviewed your registration and are unable to approve it at this time.</p><p><strong>Reason:</strong> ${reason || 'No reason provided.'}</p><p>If you believe this is an error, please contact support.</p>`,
    },
  };

  await sendEmail(client, message, `rejection email to ${toEmail}`);
}

/**
 * Send key regeneration notification.
 *
 * @param {Object} params - { toEmail, firstName, newApiKey }
 */
async function sendKeyRegeneratedEmail({ toEmail, firstName, newApiKey }) {
  const client = getEmailClient();

  const message = {
    senderAddress: SENDER_ADDRESS,
    recipients: {
      to: [{ address: toEmail, displayName: firstName }],
    },
    content: {
      subject: `Your ${APP_NAME} API key has been regenerated`,
      plainText: `Hi ${firstName},\n\nYour API key has been regenerated. Your old key no longer works.\n\nNew API Key:\n${newApiKey}\n\nUpdate any applications that were using your old key immediately.\n\n${APP_NAME}`,
      html: `<p>Hi ${firstName},</p><p>Your API key has been regenerated. Your old key no longer works.</p><p><strong>New API Key:</strong><br><code style="background:#f0f0f0;padding:8px;display:block;margin:8px 0;">${newApiKey}</code></p><p>Update any applications using your old key immediately.</p>`,
    },
  };

  await sendEmail(client, message, `key regeneration email to ${toEmail}`);
}

// =============================================================================
// Internal helper — handles the ACS send + polling (or mock log)
// =============================================================================
async function sendEmail(client, message, description) {
  if (USE_MOCK_EMAIL) {
    logger.info(`[MOCK EMAIL] ${description}`);
    logger.info(`[MOCK EMAIL] To: ${message.recipients.to.map(r => r.address).join(', ')}`);
    logger.info(`[MOCK EMAIL] Subject: ${message.content.subject}`);
    // Print the plain text body so devs can see the API key in the terminal
    logger.info(`[MOCK EMAIL] Body:\n${message.content.plainText}`);
    return;
  }
  try {
    logger.info(`Sending ${description}`);
    const poller = await client.beginSend(message);
    const result = await poller.pollUntilDone();

    if (result.status === 'Succeeded') {
      logger.info(`Email sent successfully: ${description}`);
    } else {
      logger.warn(`Email send result: ${result.status} for ${description}`);
    }
  } catch (err) {
    // Email failures should not crash the approval flow — log and continue
    logger.error(`Failed to send ${description}: ${err.message}`);
  }
}

module.exports = {
  sendWelcomeEmail,
  sendRejectionEmail,
  sendKeyRegeneratedEmail,
};
