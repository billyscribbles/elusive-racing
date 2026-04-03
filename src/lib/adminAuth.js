import { useState, useEffect } from 'react';

const TOKEN_KEY = 'er_admin_token';
const USER_KEY  = 'er_admin_user';
const THEME_KEY = 'er_admin_theme';

export function getAdminToken()  { return localStorage.getItem(TOKEN_KEY); }
export function getAdminUser()   { return localStorage.getItem(USER_KEY); }
export function clearAdminAuth() { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); }

export function saveAdminAuth(token, username) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, username);
}

export function isAdminAuthenticated() {
  return !!getAdminToken();
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
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
}
