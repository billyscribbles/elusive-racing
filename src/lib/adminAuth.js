import { useState, useEffect } from 'react';

// The admin session token is held in an httpOnly cookie (`er_admin`) that the
// browser sends automatically when `credentials: 'include'` is set on fetch.
// JS in this page CANNOT read that cookie — that's the point: an XSS bug here
// can't steal the admin session.
//
// localStorage still holds:
//   - The username (display only — server doesn't trust it)
//   - A copy of the JWT for backward compatibility while admin tabs roll over
//     to the cookie. The server accepts either the cookie OR a Bearer header
//     during the rollout. New tabs only need the cookie; old tabs keep working.
const TOKEN_KEY = 'er_admin_token';
const USER_KEY  = 'er_admin_user';
const THEME_KEY = 'er_admin_theme';

export function getAdminToken()  { return localStorage.getItem(TOKEN_KEY); }
export function getAdminUser()   { return localStorage.getItem(USER_KEY); }

export function clearAdminAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  // Best-effort cookie clear. The server response will fail if the network is
  // down; that's fine — the user re-tries logout, and the cookie will expire
  // on its own after 8h regardless.
  fetch('/api/admin/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
}

export function saveAdminAuth(token, username) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, username);
}

// Authentication is now established by the httpOnly cookie set on /api/admin/login.
// We don't have read access to that cookie from JS, so we treat the presence of
// a username (set on successful login) as a hint. The server is authoritative —
// adminFetch responses with 401 mean the cookie expired; the caller should treat
// that as a sign-out.
export function isAdminAuthenticated() {
  return !!getAdminUser();
}

export function useAdminTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || 'dark');
  useEffect(() => { localStorage.setItem(THEME_KEY, theme); }, [theme]);
  const toggle = () => setTheme(t => t === 'dark' ? 'light' : 'dark');
  return { theme, toggle };
}

export function adminFetch(url, options = {}) {
  const token = getAdminToken();
  return fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      // Bearer header only sent if a token is still in localStorage from a
      // pre-cookie session. Server prefers the cookie when both are present.
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
}
