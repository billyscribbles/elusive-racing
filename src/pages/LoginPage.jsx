import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import './AccountPage.css';

const WC_ACCOUNT_URL = `${import.meta.env.VITE_WC_URL}/my-account`;

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '', remember: false });
  const [showPassword, setShowPassword] = useState(false);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    // Redirect to WooCommerce my-account for authentication
    window.location.href = WC_ACCOUNT_URL;
  }

  return (
    <div className="account-page">
      <div className="account-card">

        <h1 className="account-title">Sign In</h1>
        <p className="account-subtitle">Welcome back — sign in to your account</p>

        <form className="account-form" onSubmit={handleSubmit} noValidate>

          {status === 'error' && (
            <div className="account-error">
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
              {errorMsg}
            </div>
          )}

          <div className="account-field">
            <label htmlFor="email">Email Address <span>*</span></label>
            <input
              id="email"
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </div>

          <div className="account-field">
            <label htmlFor="password">Password <span>*</span></label>
            <div className="account-password-wrap">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="account-password-toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="account-checkbox-row">
            <label className="account-checkbox-label">
              <input
                type="checkbox"
                name="remember"
                checked={form.remember}
                onChange={handleChange}
              />
              Remember me
            </label>
            <a href="/my-account/forgot-password" className="account-forgot">Forgot password?</a>
          </div>

          <button
            type="submit"
            className="account-submit"
            disabled={status === 'submitting'}
          >
            {status === 'submitting' ? 'Signing in…' : 'Sign In'}
          </button>

        </form>

        <div className="account-divider">or</div>

        <p className="account-switch">
          Don't have an account?{' '}
          <Link to="/my-account/register">Create one</Link>
        </p>

      </div>
    </div>
  );
}
