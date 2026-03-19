// =============================================================================
// Admin Page — Protected admin panel for approving/rejecting registrations
// =============================================================================
// Only accessible to users whose email is in the ADMIN_EMAILS env variable.
// =============================================================================

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

const STATUS_FILTERS = ['all', 'pending', 'approved', 'rejected'];

export default function Admin() {
  const { user, authFetch } = useAuth();

  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [actionLoading, setActionLoading] = useState({});
  const [rejectModal, setRejectModal] = useState(null); // { id, email }
  const [rejectReason, setRejectReason] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    loadRegistrations();
  }, [statusFilter]);

  async function loadRegistrations() {
    setLoading(true);
    try {
      const params = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
      const res = await authFetch(`${API_BASE}/api/admin/registrations${params}`);
      const data = await res.json();
      if (res.ok) {
        setRegistrations(data.registrations || []);
      } else {
        showMessage(data.error?.message || 'Failed to load registrations', 'error');
      }
    } catch {
      showMessage('Network error loading registrations', 'error');
    } finally {
      setLoading(false);
    }
  }

  function showMessage(text, type = 'success') {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  }

  async function handleApprove(id, email) {
    if (!confirm(`Approve registration for ${email}?\n\nThis will:\n• Create an APIM user and subscription\n• Generate an API key\n• Send a welcome email to ${email}`)) {
      return;
    }

    setActionLoading(a => ({ ...a, [`approve-${id}`]: true }));
    try {
      const res = await authFetch(`${API_BASE}/api/admin/registrations/${id}/approve`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        showMessage(`✓ Registration approved. Welcome email sent to ${email}.`, 'success');
        await loadRegistrations();
      } else {
        showMessage(data.error?.message || 'Approval failed', 'error');
      }
    } catch {
      showMessage('Network error during approval', 'error');
    } finally {
      setActionLoading(a => ({ ...a, [`approve-${id}`]: false }));
    }
  }

  async function handleRejectSubmit() {
    if (!rejectModal) return;

    setActionLoading(a => ({ ...a, [`reject-${rejectModal.id}`]: true }));
    try {
      const res = await authFetch(`${API_BASE}/api/admin/registrations/${rejectModal.id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: rejectReason }),
      });
      const data = await res.json();
      if (res.ok) {
        showMessage(`Registration rejected. Notification sent to ${rejectModal.email}.`, 'success');
        setRejectModal(null);
        setRejectReason('');
        await loadRegistrations();
      } else {
        showMessage(data.error?.message || 'Rejection failed', 'error');
      }
    } catch {
      showMessage('Network error', 'error');
    } finally {
      setActionLoading(a => ({ ...a, [`reject-${rejectModal?.id}`]: false }));
    }
  }

  async function handleSuspend(id, email) {
    if (!confirm(`Suspend ${email}'s API key? Their key will stop working immediately.`)) return;

    setActionLoading(a => ({ ...a, [`suspend-${id}`]: true }));
    try {
      const res = await authFetch(`${API_BASE}/api/admin/consumers/${id}/suspend`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        showMessage(`${email}'s key has been suspended.`, 'success');
        await loadRegistrations();
      } else {
        showMessage(data.error?.message || 'Suspend failed', 'error');
      }
    } catch {
      showMessage('Network error', 'error');
    } finally {
      setActionLoading(a => ({ ...a, [`suspend-${id}`]: false }));
    }
  }

  async function handleActivate(id, email) {
    setActionLoading(a => ({ ...a, [`activate-${id}`]: true }));
    try {
      const res = await authFetch(`${API_BASE}/api/admin/consumers/${id}/activate`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        showMessage(`${email}'s key has been reactivated.`, 'success');
        await loadRegistrations();
      } else {
        showMessage(data.error?.message || 'Activation failed', 'error');
      }
    } catch {
      showMessage('Network error', 'error');
    } finally {
      setActionLoading(a => ({ ...a, [`activate-${id}`]: false }));
    }
  }

  return (
    <div style={{ padding: '40px 0 80px' }}>
      <div className="container">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', marginBottom: 4 }}>Admin Panel</h1>
            <p style={{ color: 'var(--color-gray-500)' }}>
              Signed in as <strong>{user.email}</strong> · Admin
            </p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={loadRegistrations}>
            ↻ Refresh
          </button>
        </div>

        {/* Alert message */}
        {message.text && (
          <div className={`alert alert-${message.type}`} style={{ marginBottom: 24 }}>
            <span>{message.type === 'success' ? '✓' : '⚠'}</span>
            <span>{message.text}</span>
          </div>
        )}

        {/* Status filter tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--color-gray-100)', padding: 4, borderRadius: 'var(--radius-lg)', width: 'fit-content' }}>
          {STATUS_FILTERS.map(f => (
            <button key={f} onClick={() => setStatusFilter(f)} style={{
              padding: '8px 18px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.875rem',
              background: statusFilter === f ? 'white' : 'transparent',
              color: statusFilter === f ? 'var(--color-gray-900)' : 'var(--color-gray-500)',
              boxShadow: statusFilter === f ? 'var(--shadow-sm)' : 'none',
              textTransform: 'capitalize',
              transition: 'all 0.15s',
            }}>
              {f}
            </button>
          ))}
        </div>

        {/* Registrations table */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
            <div className="spinner" style={{ width: 36, height: 36 }} />
          </div>
        ) : registrations.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 48, color: 'var(--color-gray-500)' }}>
            No {statusFilter !== 'all' ? statusFilter : ''} registrations found.
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Organization</th>
                  <th>Use Case</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {registrations.map(reg => (
                  <tr key={reg.id}>
                    <td style={{ fontWeight: 600 }}>{reg.firstName} {reg.lastName}</td>
                    <td style={{ fontSize: '0.875rem' }}>{reg.email}</td>
                    <td style={{ fontSize: '0.875rem' }}>{reg.organization}</td>
                    <td style={{ maxWidth: 200, fontSize: '0.875rem' }}>
                      <span title={reg.useCase} style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {reg.useCase}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${reg.status}`}>{reg.status}</span>
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--color-gray-500)', whiteSpace: 'nowrap' }}>
                      {new Date(reg.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'nowrap' }}>
                        {reg.status === 'pending' && (
                          <>
                            <button
                              className="btn btn-sm"
                              style={{ background: 'var(--color-success)', color: 'white', whiteSpace: 'nowrap' }}
                              onClick={() => handleApprove(reg.id, reg.email)}
                              disabled={actionLoading[`approve-${reg.id}`]}
                            >
                              {actionLoading[`approve-${reg.id}`] ? '...' : '✓ Approve'}
                            </button>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => { setRejectModal({ id: reg.id, email: reg.email }); setRejectReason(''); }}
                            >
                              ✕ Reject
                            </button>
                          </>
                        )}
                        {reg.status === 'approved' && (
                          reg.keyStatus === 'suspended' ? (
                            <button
                              className="btn btn-sm"
                              style={{ background: 'var(--color-success)', color: 'white' }}
                              onClick={() => handleActivate(reg.id, reg.email)}
                              disabled={actionLoading[`activate-${reg.id}`]}
                            >
                              {actionLoading[`activate-${reg.id}`] ? '...' : '↑ Activate'}
                            </button>
                          ) : (
                            <button
                              className="btn btn-sm btn-ghost"
                              onClick={() => handleSuspend(reg.id, reg.email)}
                              disabled={actionLoading[`suspend-${reg.id}`]}
                            >
                              {actionLoading[`suspend-${reg.id}`] ? '...' : '⏸ Suspend'}
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Total count */}
        {!loading && registrations.length > 0 && (
          <p style={{ marginTop: 12, fontSize: '0.875rem', color: 'var(--color-gray-500)' }}>
            Showing {registrations.length} registration{registrations.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Reject Modal */}
      {rejectModal && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000,
          padding: 24,
        }} onClick={() => setRejectModal(null)}>
          <div className="card" style={{ maxWidth: 480, width: '100%' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: 8 }}>Reject registration</h3>
            <p style={{ color: 'var(--color-gray-600)', marginBottom: 20, fontSize: '0.9375rem' }}>
              A rejection notification email will be sent to <strong>{rejectModal.email}</strong>.
            </p>

            <div className="form-group">
              <label htmlFor="rejectReason">Reason (optional — will be included in the email)</label>
              <textarea
                id="rejectReason"
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="e.g. Use case does not align with current access policy."
                rows={3}
              />
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setRejectModal(null)}>Cancel</button>
              <button
                className="btn btn-danger"
                onClick={handleRejectSubmit}
                disabled={actionLoading[`reject-${rejectModal.id}`]}
              >
                {actionLoading[`reject-${rejectModal.id}`] ? '...' : 'Reject registration'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
