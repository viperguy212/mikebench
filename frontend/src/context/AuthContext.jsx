// =============================================================================
// AuthContext — Global authentication state
// =============================================================================
// WHAT THIS DOES:
//   Provides login state (user, token) to any component in the app.
//   Stores the JWT in sessionStorage (clears on browser close — safer than localStorage).
//   Any component can call useAuth() to get the current user.
//
// USAGE IN A COMPONENT:
//   import { useAuth } from '../context/AuthContext';
//   const { user, login, logout } = useAuth();
// =============================================================================

import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const SESSION_KEY = 'llm_hub_session';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true); // true while checking stored session

  // On mount, restore session from sessionStorage
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      if (stored) {
        const session = JSON.parse(stored);
        // Check if token is still valid (basic expiry check)
        const payload = JSON.parse(atob(session.token.split('.')[1]));
        if (payload.exp * 1000 > Date.now()) {
          setUser(session.user);
          setToken(session.token);
        } else {
          // Token expired — clear session
          sessionStorage.removeItem(SESSION_KEY);
        }
      }
    } catch {
      sessionStorage.removeItem(SESSION_KEY);
    } finally {
      setLoading(false);
    }
  }, []);

  function login(userData, jwtToken) {
    setUser(userData);
    setToken(jwtToken);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ user: userData, token: jwtToken }));
  }

  function logout() {
    setUser(null);
    setToken(null);
    sessionStorage.removeItem(SESSION_KEY);
  }

  // authFetch — wrapper around fetch that automatically adds the Authorization header
  // Use this instead of fetch() for any authenticated API calls
  async function authFetch(url, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };
    return fetch(url, { ...options, headers });
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, authFetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider');
  }
  return context;
}
