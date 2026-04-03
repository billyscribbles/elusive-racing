import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAdminAuthenticated, saveAdminAuth } from '../../lib/adminAuth';
import './AdminLogin.css';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [form, setForm]     = useState({ username: '', password: '' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAdminAuthenticated()) navigate('/admin/products', { replace: true });
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Login failed.'); return; }
      saveAdminAuth(data.token, data.username);
      navigate('/admin/products', { replace: true });
    } catch {
      setError('Could not connect to server.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="al-page">
      <div className="al-box">
        <div className="al-logo">
          <img src="/logo-main.svg" alt="Elusive Racing" className="al-logo-img" />
        </div>
        <h1 className="al-title">Admin Portal</h1>
        <form className="al-form" onSubmit={handleSubmit}>
          {error && <p className="al-error">{error}</p>}
          <div className="al-field">
            <label className="al-label">Username</label>
            <input
              className="al-input"
              type="text"
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              autoComplete="username"
              required
            />
          </div>
          <div className="al-field">
            <label className="al-label">Password</label>
            <input
              className="al-input"
              type="password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              autoComplete="current-password"
              required
            />
          </div>
          <button className="al-btn" type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
