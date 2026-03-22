import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { customerAccessTokenCreate } from '../lib/shopify';
import './AccountPage.css';

const TOKEN_KEY = 'shopify_customer_token';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const redirect = new URLSearchParams(location.search).get('redirect') || '/my-account/dashboard';

  const [form, setForm] = useState({ email: '', password: '', remember: false });
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | submitting | error
  const [errorMsg, setErrorMsg] = useState('');

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('submitting');
    setErrorMsg('');

    try {
      const result = await customerAccessTokenCreate({ email: form.email, password: form.password });

      if (result.customerUserErrors?.length) {
        setErrorMsg(result.customerUserErrors[0].message);
        setStatus('error');
        return;
      }

      const { accessToken, expiresAt } = result.customerAccessToken;
      const storage = form.remember ? localStorage : sessionStorage;
      storage.setItem(TOKEN_KEY, accessToken);
      storage.setItem(`${TOKEN_KEY}_expires`, expiresAt);

      navigate(redirect);
    } catch {
      setErrorMsg('Something went wrong. Please try again.');
      setStatus('error');
    }
  }

  return (
    <div className="account-page">
      <div className="account-card">

        <div className="account-logo">
          <a href="/">
            <img src="/logo-footer.svg" alt="Elusive Racing" />
          </a>
        </div>

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
