import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import './AccountPage.css';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const key   = searchParams.get('key')   || '';
  const login = searchParams.get('login') || '';

  const [form, setForm] = useState({ password: '', confirm: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | submitting | success | error
  const [errorMsg, setErrorMsg] = useState('');

  // Missing key/login → broken reset link.
  const linkOk = Boolean(key && login);

  useEffect(() => {
    if (status !== 'success') return;
    const t = setTimeout(() => navigate('/login'), 2500);
    return () => clearTimeout(t);
  }, [status, navigate]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg('');

    if (form.password.length < 8) {
      setStatus('error');
      setErrorMsg('Password must be at least 8 characters.');
      return;
    }
    if (form.password !== form.confirm) {
      setStatus('error');
      setErrorMsg("Passwords don't match.");
      return;
    }

    setStatus('submitting');
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, login, password: form.password }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setStatus('error');
        setErrorMsg(data.error || 'Could not reset password. Please request a new link.');
        return;
      }

      setStatus('success');
    } catch {
      setStatus('error');
      setErrorMsg('Something went wrong. Please try again.');
    }
  }

  if (!linkOk) {
    return (
      <div className="account-page">
        <div className="account-card">
          <h1 className="account-title">Reset link is invalid</h1>
          <p className="account-subtitle">
            This password reset link is missing information or has expired.
            Please request a new one.
          </p>
          <p className="account-switch">
            <Link to="/my-account/lost-password">Request a new reset link</Link>
          </p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="account-page">
        <div className="account-card">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <CheckCircle2 size={40} color="var(--color-red)" />
          </div>
          <h1 className="account-title">Password updated</h1>
          <p className="account-subtitle">
            Your password has been reset. Redirecting you to sign in…
          </p>
          <p className="account-switch">
            <Link to="/login">Sign in now</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="account-page">
      <div className="account-card">
        <h1 className="account-title">Choose a new password</h1>
        <p className="account-subtitle">
          Resetting password for <strong>{login}</strong>
        </p>

        <form className="account-form" onSubmit={handleSubmit} noValidate>
          {status === 'error' && (
            <div className="account-error">
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
              {errorMsg}
            </div>
          )}

          <div className="account-field">
            <label htmlFor="password">New password <span>*</span></label>
            <div className="account-password-wrap">
              <input
                id="password" type={showPassword ? 'text' : 'password'}
                name="password" value={form.password} onChange={handleChange}
                placeholder="At least 8 characters" required autoComplete="new-password"
                minLength={8}
              />
              <button type="button" className="account-password-toggle"
                onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="account-field">
            <label htmlFor="confirm">Confirm new password <span>*</span></label>
            <div className="account-password-wrap">
              <input
                id="confirm" type={showPassword ? 'text' : 'password'}
                name="confirm" value={form.confirm} onChange={handleChange}
                placeholder="Re-enter new password" required autoComplete="new-password"
                minLength={8}
              />
            </div>
          </div>

          <button type="submit" className="account-submit" disabled={status === 'submitting'}>
            {status === 'submitting' ? 'Updating…' : 'Update password'}
          </button>
        </form>

        <p className="account-switch" style={{ marginTop: 24 }}>
          <Link to="/login">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
