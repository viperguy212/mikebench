// =============================================================================
// Dashboard Page — Consumer's post-login view
// =============================================================================
// Shows:
// - API key (masked) with reveal/copy/regenerate buttons
// - Today's usage vs quota
// - 7-day usage chart
// - Account info
// =============================================================================

import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export default function Dashboard() {
  const { user, authFetch } = useAuth();

  const [keyData, setKeyData] = useState(null);
  const [usageSummary, setUsageSummary] = useState(null);
  const [usageHistory, setUsageHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [keyVisible, setKeyVisible] = useState(false);
  const [fullKey, setFullKey] = useState('');
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [keyRes, summaryRes, historyRes] = await Promise.all([
        authFetch(`${API_BASE}/api/keys`),
        authFetch(`${API_BASE}/api/usage/summary`),
        authFetch(`${API_BASE}/api/usage/history?days=7`),
      ]);

      if (keyRes.ok) setKeyData(await keyRes.json());
      if (summaryRes.ok) setUsageSummary(await summaryRes.json());
      if (historyRes.ok) {
        const h = await historyRes.json();
        setUsageHistory(h.history || []);
      }
    } catch (err) {
      setError('Failed to load dashboard data. Please refresh.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRevealKey() {
    if (keyVisible) {
      setKeyVisible(false);
      setFullKey('');
      return;
    }
    try {
      const res = await authFetch(`${API_BASE}/api/keys/reveal`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setFullKey(data.apiKey);
        setKeyVisible(true);
      } else {
        setError(data.error?.message || 'Failed to reveal key');
      }
    } catch {
      setError('Network error');
    }
  }

  async function handleCopy() {
    const keyToCopy = keyVisible ? fullKey : keyData?.maskedKey;
    if (!keyToCopy) return;
    try {
      await navigator.clipboard.writeText(keyVisible ? fullKey : '');
      if (!keyVisible) {
        await handleRevealKey();
      }
      await navigator.clipboard.writeText(fullKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Copy failed — please select and copy manually');
    }
  }

  async function handleRegenerate() {
    if (!confirm('⚠️ Your current API key will stop working immediately. All applications using it will need to be updated. Continue?')) {
      return;
    }
    setRegenerating(true);
    setError('');
    try {
      const res = await authFetch(`${API_BASE}/api/keys/regenerate`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg('API key regenerated. Your new key has been sent to your email.');
        setKeyVisible(false);
        setFullKey('');
        await loadData();
        setTimeout(() => setSuccessMsg(''), 5000);
      } else {
        setError(data.error?.message || 'Failed to regenerate key');
      }
    } catch {
      setError('Network error');
    } finally {
      setRegenerating(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  return (
    <div style={{ padding: '40px 0 80px' }}>
      <div className="container">
        {/* Page header */}
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontSize: '1.75rem', marginBottom: 4 }}>
            Welcome back, {user.firstName || user.email.split('@')[0]}
          </h1>
          <p style={{ color: 'var(--color-gray-500)' }}>{user.email}</p>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: 24 }}>
            <span>⚠</span><span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="alert alert-success" style={{ marginBottom: 24 }}>
            <span>✓</span><span>{successMsg}</span>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, marginBottom: 32 }}>

          {/* API Key Card */}
          <div className="card" style={{ gridColumn: '1 / -1' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h3 style={{ marginBottom: 4 }}>Your API Key</h3>
                <p style={{ color: 'var(--color-gray-500)', fontSize: '0.875rem' }}>
                  Use this key in the <code>Ocp-Apim-Subscription-Key</code> header
                </p>
              </div>
              <span className={`badge badge-${keyData?.keyStatus || 'active'}`}>
                {keyData?.keyStatus || 'active'}
              </span>
            </div>

            {/* Key display */}
            <div style={{
              background: 'var(--color-gray-900)',
              borderRadius: 'var(--radius-md)',
              padding: '14px 18px',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.9375rem',
              color: keyVisible ? '#a8ff78' : 'var(--color-gray-400)',
              marginBottom: 16,
              letterSpacing: keyVisible ? 0 : '0.05em',
              wordBreak: 'break-all',
              minHeight: 52,
              display: 'flex',
              alignItems: 'center',
            }}>
              {keyVisible ? fullKey : (keyData?.maskedKey || '••••••••••••••••••••••••••••••••')}
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button className="btn btn-ghost btn-sm" onClick={handleRevealKey}>
                {keyVisible ? '🙈 Hide key' : '👁 Show key'}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={handleCopy}>
                {copied ? '✓ Copied!' : '📋 Copy key'}
              </button>
              <button
                className="btn btn-danger btn-sm"
                onClick={handleRegenerate}
                disabled={regenerating}
              >
                {regenerating ? <><span className="spinner" />Regenerating...</> : '🔄 Regenerate key'}
              </button>
            </div>

            <div style={{
              marginTop: 16,
              padding: '10px 14px',
              background: 'var(--color-warning-bg)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8125rem',
              color: 'var(--color-warning)',
            }}>
              🔐 Keep this key secret. Never commit it to git or expose it in client-side code.
            </div>
          </div>

          {/* Usage Summary Cards */}
          {usageSummary && (
            <>
              <StatCard
                label="Calls today"
                value={usageSummary.today.totalCalls}
                sub={`of ${usageSummary.today.quotaLimit} daily quota`}
                color="var(--color-primary-500)"
              />
              <StatCard
                label="Quota remaining"
                value={usageSummary.today.quotaRemaining}
                sub={`${usageSummary.today.percentUsed}% used today`}
                color={usageSummary.today.percentUsed > 80 ? 'var(--color-warning)' : 'var(--color-success)'}
              />
              <StatCard
                label="Success rate"
                value={`${usageSummary.today.totalCalls > 0
                  ? Math.round((usageSummary.today.successfulCalls / usageSummary.today.totalCalls) * 100)
                  : 100}%`}
                sub={`${usageSummary.today.failedCalls} failed calls`}
                color="var(--color-success)"
              />
            </>
          )}
        </div>

        {/* Quota Bar */}
        {usageSummary && (
          <div className="card" style={{ marginBottom: 32 }}>
            <h4 style={{ marginBottom: 16 }}>Daily quota</h4>
            <div style={{
              background: 'var(--color-gray-100)',
              borderRadius: 100,
              height: 12,
              overflow: 'hidden',
              marginBottom: 8,
            }}>
              <div style={{
                height: '100%',
                width: `${Math.min(usageSummary.today.percentUsed, 100)}%`,
                background: usageSummary.today.percentUsed > 90
                  ? 'var(--color-error)'
                  : usageSummary.today.percentUsed > 70
                  ? 'var(--color-warning)'
                  : 'var(--color-primary-500)',
                borderRadius: 100,
                transition: 'width 0.3s ease',
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: 'var(--color-gray-500)' }}>
              <span>{usageSummary.today.quotaUsed} used</span>
              <span>Resets at midnight UTC</span>
              <span>{usageSummary.today.quotaLimit} total</span>
            </div>
          </div>
        )}

        {/* 7-Day Usage Chart */}
        {usageHistory.length > 0 && (
          <div className="card" style={{ marginBottom: 32 }}>
            <h4 style={{ marginBottom: 24 }}>API calls — last 7 days</h4>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={usageHistory} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-gray-200)" />
                <XAxis
                  dataKey="date"
                  tickFormatter={d => {
                    const parts = d.split('-');
                    return `${parseInt(parts[1])}/${parseInt(parts[2])}`;
                  }}
                  tick={{ fontSize: 12, fill: 'var(--color-gray-500)' }}
                />
                <YAxis tick={{ fontSize: 12, fill: 'var(--color-gray-500)' }} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: '1px solid var(--color-gray-200)' }}
                  labelFormatter={d => `Date: ${d}`}
                />
                <Bar dataKey="calls" fill="var(--color-primary-500)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Quick Start */}
        <div className="card">
          <h4 style={{ marginBottom: 20 }}>Quick start</h4>
          <div style={{ background: '#1e1e1e', borderRadius: 'var(--radius-md)', padding: 20, overflow: 'auto' }}>
            <pre style={{ color: '#d4d4d4', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', lineHeight: 1.7, margin: 0 }}>
              <span style={{ color: '#6a9955' }}># Make a chat completion with GPT-4o{'\n'}</span>
              <span style={{ color: '#569cd6' }}>curl</span>
              {' -X POST \\\n  "'}
              <span style={{ color: '#ce9178' }}>
                {import.meta.env.VITE_APIM_GATEWAY_URL || 'https://your-apim.azure-api.net'}
                /gpt4o/openai/deployments/gpt-4o/chat/completions
              </span>
              {'" \\\n  '}
              <span style={{ color: '#9cdcfe' }}>-H</span>
              {' "Content-Type: application/json" \\\n  '}
              <span style={{ color: '#9cdcfe' }}>-H</span>
              {' "Ocp-Apim-Subscription-Key: '}
              <span style={{ color: '#ce9178' }}>{keyVisible ? fullKey : (keyData?.maskedKey || 'YOUR_API_KEY')}</span>
              {'" \\\n  '}
              <span style={{ color: '#9cdcfe' }}>-d</span>
              {" '{\n    \"messages\": [{\"role\": \"user\", \"content\": \"Hello!\"}],\n    \"max_tokens\": 100\n  }'"}
            </pre>
          </div>
          <p style={{ marginTop: 16, fontSize: '0.875rem', color: 'var(--color-gray-500)' }}>
            See the{' '}
            <a href="/docs">full documentation</a>
            {' '}for Python, JavaScript, and C# examples.
          </p>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color }) {
  return (
    <div className="card">
      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: '2rem', fontWeight: 800, color, marginBottom: 4 }}>
        {value}
      </div>
      <div style={{ fontSize: '0.875rem', color: 'var(--color-gray-500)' }}>
        {sub}
      </div>
    </div>
  );
}
