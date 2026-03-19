import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/');
  }

  function isActive(path) {
    return location.pathname === path;
  }

  return (
    <nav style={{
      background: 'white',
      borderBottom: '1px solid var(--color-gray-200)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: 'var(--shadow-sm)',
    }}>
      <div className="container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 64,
      }}>
        {/* Logo */}
        <Link to="/" style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          color: 'var(--color-gray-900)',
          fontWeight: 700,
          fontSize: '1.25rem',
          textDecoration: 'none',
          letterSpacing: '-0.02em',
        }}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="var(--color-primary-500)" />
            <path d="M8 16L14 10L20 16L14 22L8 16Z" fill="white" opacity="0.8" />
            <path d="M16 8L22 14L28 8L22 2L16 8Z" fill="white" opacity="0.5" />
            <path d="M16 24L22 18L28 24L22 30L16 24Z" fill="white" opacity="0.5" />
          </svg>
          Mikehub
        </Link>

        {/* Desktop nav links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} className="nav-desktop">
          <NavLink to="/" active={isActive('/')}>Home</NavLink>
          <NavLink to="/docs" active={isActive('/docs')}>Docs</NavLink>
          {user && <NavLink to="/dashboard" active={isActive('/dashboard')}>Dashboard</NavLink>}
          {user?.role === 'admin' && <NavLink to="/admin" active={isActive('/admin')}>Admin</NavLink>}
        </div>

        {/* Auth section */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--color-gray-500)', display: 'none' }} className="user-email">
                {user.email}
              </span>
              <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
                Sign out
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <Link to="/register" className="btn btn-secondary btn-sm">Sign in</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Request access</Link>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) { .nav-desktop { display: none !important; } }
        @media (min-width: 640px) { .user-email { display: block !important; } }
      `}</style>
    </nav>
  );
}

function NavLink({ to, active, children }) {
  return (
    <Link to={to} style={{
      padding: '6px 14px',
      borderRadius: 'var(--radius-md)',
      fontSize: '0.9375rem',
      fontWeight: active ? 600 : 500,
      color: active ? 'var(--color-primary-500)' : 'var(--color-gray-600)',
      background: active ? 'var(--color-primary-50)' : 'transparent',
      textDecoration: 'none',
      transition: 'all 0.15s',
    }}>
      {children}
    </Link>
  );
}
