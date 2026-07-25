import { createContext, useCallback, useContext, useState } from 'react';
import { CONFIG } from '../config/config';

// Admin mode. The password is NEVER known to this bundle: it is typed by the
// admin, sent to the relay Worker over HTTPS, and checked there against a
// Worker secret. The client only remembers, for the lifetime of the tab
// (sessionStorage), that a password was accepted — and keeps that password in
// order to authenticate the actual /admin/save calls.
const AdminContext = createContext(null);

const SESSION_KEY = 'book_admin_session';

function readSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AdminProvider({ children }) {
  const [session, setSession] = useState(readSession);

  const login = useCallback(async (password) => {
    let res;
    try {
      res = await fetch(`${CONFIG.RELAY_URL}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
        signal: AbortSignal.timeout(20000),
      });
    } catch {
      throw new Error('Connexion impossible. Vérifiez votre connexion internet.');
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      throw new Error(data.error || 'Mot de passe incorrect.');
    }
    const next = { password };
    setSession(next);
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(next)); } catch { /* private mode */ }
  }, []);

  const logout = useCallback(() => {
    setSession(null);
    try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
  }, []);

  const saveLesson = useCallback(async (path, lesson) => {
    if (!session) throw new Error('Session administrateur expirée.');
    let res;
    try {
      res = await fetch(`${CONFIG.RELAY_URL}/admin/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: session.password, path, lesson }),
        signal: AbortSignal.timeout(45000),
      });
    } catch {
      throw new Error('Connexion impossible. Vérifiez votre connexion internet.');
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      throw new Error(data.error || 'La publication a échoué.');
    }
    return data;
  }, [session]);

  return (
    <AdminContext.Provider value={{ isAdmin: !!session, login, logout, saveLesson }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  // Pages render outside the provider in tests; degrade to "not admin".
  return ctx || { isAdmin: false, login: async () => {}, logout: () => {}, saveLesson: async () => {} };
}
