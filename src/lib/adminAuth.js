import { useState, useEffect } from 'react';

// The admin session lives in an httpOnly cookie (`er_admin`) that the browser
// sends automatically when `credentials: 'include'` is set on fetch. JS in
// this page CANNOT read that cookie — that's the point: an XSS bug here can't
// steal the admin session.
//
// localStorage holds only the username (display only — the server doesn't
// trust it) and the theme preference. There is no token in localStorage.
const USER_KEY  = 'er_admin_user';
const THEME_KEY = 'er_admin_theme';

export function getAdminUser()   { return localStorage.getItem(USER_KEY); }

export function clearAdminAuth() {
  localStorage.removeItem(USER_KEY);
  // Best-effort cookie clear. If the network is down the cookie just expires
  // on its own after 8h.
  fetch('/api/admin/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
}

export function saveAdminAuth(username) {
  localStorage.setItem(USER_KEY, username);
}

// We can't read the httpOnly cookie from JS, so this is a hint based on the
// last-known-logged-in username. The server is authoritative — adminFetch
// responses with 401 mean the cookie expired and the caller should clear
// state and route back to /admin.
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
  return fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
}
