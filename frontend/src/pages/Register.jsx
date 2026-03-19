import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export default function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState('register'); // 'register' | 'login'
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', organization: '', useCase: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [loginEmail, setLoginEmail] = useState('');

  function setField(key, value) {
    setForm(f => ({ ...f, [key]: value }));
    setFieldErrors(e => ({ ...e, [key]: '' }));
  }

  async function handleRegister(e) {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    const errors = {};
    if (!form.firstName.trim()) errors.firstName = 'Required';
    if (!form.lastName.trim()) errors.lastName = 'Required';
    if (!form.email.trim()) errors.email = 'Required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Invalid email format';
    if (!form.organization.trim()) errors.organization = 'Required';
    if (!form.useCase.trim()) errors.useCase = 'Required';
    if (form.useCase.trim().length < 20) errors.useCase = 'Please use at least 20 characters';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/registrations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error?.message || 'Submission failed. Please try again.');
        return;
      }
      setSuccess(true);
    } catch {
      setError('Network error — please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    if (!loginEmail.trim()) {
      setError('Please enter your email address');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/registrations/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error?.message || 'Sign in failed. Make sure your access has been approved.');
        return;
      }
      login(data.user, data.token);
      navigate(data.user.role === 'admin' ? '/admin' : '/dashboard');
    } catch {
      setError('Network error — please check your connection.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="container" style={{ maxWidth: 520, padding: '80px 24px' }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>✅</div>
          <h2 style={{ marginBottom: 12 }}>Request submitted</h2>
          <p style={{ color: 'var(--color-gray-600)', marginBottom: 24, lineHeight: 1.6 }}>
            We will review your request and send your API key to{' '}
            <strong>{form.email}</strong> once approved.
          </p>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-gray-500)' }}>
            Already approved?{' '}
            <button className="btn btn-ghost btn-sm" onClick={() => { setSuccess(false); setMode('login'); }}>
              Sign in
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: 560, padding: '60px 24px' }}>
      {/* Tab switcher */}
      <div style={{ display: 'flex', background: 'var(--color-gray-100)', borderRadius: 'var(--radius-lg)', padding: 4, marginBottom: 32, gap: 4 }}>
        {['register', 'login'].map(m => (
          <button key={m} onClick={() => { setMode(m); setError(''); }} style={{
            flex: 1, padding: '10px', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer',
            fontWeight: 600, fontSize: '0.9375rem', transition: 'all 0.15s',
            background: mode === m ? 'white' : 'transparent',
            color: mode === m ? 'var(--color-gray-900)' : 'var(--color-gray-500)',
            boxShadow: mode === m ? 'var(--shadow-sm)' : 'none',
          }}>
            {m === 'register' ? 'Request access' : 'Sign in'}
          </button>
        ))}
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: 24 }}>
          <span>⚠</span><span>{error}</span>
        </div>
      )}

      {mode === 'register' ? (
        <>
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontSize: '1.625rem', marginBottom: 8 }}>Request API access</h1>
            <p style={{ color: 'var(--color-gray-500)' }}>
              Tell us who you are and what you are building. All requests are reviewed manually.
            </p>
          </div>

          <form onSubmit={handleRegister}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="required" htmlFor="firstName">First name</label>
                <input id="firstName" type="text" value={form.firstName} onChange={e => setField('firstName', e.target.value)}
                  className={fieldErrors.firstName ? 'error' : ''} placeholder="Jane" autoComplete="given-name" />
                {fieldErrors.firstName && <span className="field-error">{fieldErrors.firstName}</span>}
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="required" htmlFor="lastName">Last name</label>
                <input id="lastName" type="text" value={form.lastName} onChange={e => setField('lastName', e.target.value)}
                  className={fieldErrors.lastName ? 'error' : ''} placeholder="Smith" autoComplete="family-name" />
                {fieldErrors.lastName && <span className="field-error">{fieldErrors.lastName}</span>}
              </div>
            </div>

            <div className="form-group">
              <label className="required" htmlFor="email">Email</label>
              <input id="email" type="email" value={form.email} onChange={e => setField('email', e.target.value)}
                className={fieldErrors.email ? 'error' : ''} placeholder="jane@company.com" autoComplete="email" />
              {fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}
            </div>

            <div className="form-group">
              <label className="required" htmlFor="organization">Organization</label>
              <input id="organization" type="text" value={form.organization} onChange={e => setField('organization', e.target.value)}
                className={fieldErrors.organization ? 'error' : ''} placeholder="Acme Corp" autoComplete="organization" />
              {fieldErrors.organization && <span className="field-error">{fieldErrors.organization}</span>}
            </div>

            <div className="form-group">
              <label className="required" htmlFor="useCase">What are you building?</label>
              <textarea id="useCase" value={form.useCase} onChange={e => setField('useCase', e.target.value)}
                className={fieldErrors.useCase ? 'error' : ''}
                placeholder="Describe your project or use case — e.g. an internal tool, a prototype, a research workflow..."
                rows={4} />
              <span style={{ fontSize: '0.8125rem', color: 'var(--color-gray-400)' }}>{form.useCase.length}/1000</span>
              {fieldErrors.useCase && <span className="field-error">{fieldErrors.useCase}</span>}
            </div>

            <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
              {loading ? <><span className="spinner" />Submitting...</> : 'Submit request →'}
            </button>

            <p style={{ textAlign: 'center', marginTop: 16, fontSize: '0.875rem', color: 'var(--color-gray-500)' }}>
              Already approved?{' '}
              <button type="button" style={{ background: 'none', border: 'none', color: 'var(--color-primary-500)', cursor: 'pointer', fontWeight: 600 }} onClick={() => setMode('login')}>
                Sign in
              </button>
            </p>
          </form>
        </>
      ) : (
        <>
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontSize: '1.625rem', marginBottom: 8 }}>Sign in</h1>
            <p style={{ color: 'var(--color-gray-500)' }}>
              Enter the email address you registered with. You must be approved to sign in.
            </p>
          </div>

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="loginEmail">Email address</label>
              <input id="loginEmail" type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
                placeholder="jane@company.com" autoComplete="email" autoFocus />
            </div>

            <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginBottom: 16 }}>
              {loading ? <><span className="spinner" />Signing in...</> : 'Sign in →'}
            </button>

            <p style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--color-gray-500)' }}>
              Need access?{' '}
              <button type="button" style={{ background: 'none', border: 'none', color: 'var(--color-primary-500)', cursor: 'pointer', fontWeight: 600 }} onClick={() => setMode('register')}>
                Submit a request
              </button>
            </p>
          </form>
        </>
      )}
    </div>
  );
}
