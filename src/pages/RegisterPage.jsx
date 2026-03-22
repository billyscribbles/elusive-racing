import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { customerCreate, customerAccessTokenCreate } from '../lib/shopify';
import './AccountPage.css';

const TOKEN_KEY = 'shopify_customer_token';

export default function RegisterPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    newsletter: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | submitting | success | error
  const [errorMsg, setErrorMsg] = useState('');

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg('');

    if (form.password !== form.confirmPassword) {
      setErrorMsg('Passwords do not match.');
      setStatus('error');
      return;
    }

    if (form.password.length < 5) {
      setErrorMsg('Password must be at least 5 characters.');
      setStatus('error');
      return;
    }

    setStatus('submitting');

    try {
      const result = await customerCreate({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
        acceptsMarketing: form.newsletter,
      });

      if (result.customerUserErrors?.length) {
        setErrorMsg(result.customerUserErrors[0].message);
        setStatus('error');
        return;
      }

      // Auto-login after registration
      const loginResult = await customerAccessTokenCreate({ email: form.email, password: form.password });
      if (loginResult.customerAccessToken) {
        const { accessToken, expiresAt } = loginResult.customerAccessToken;
        localStorage.setItem(TOKEN_KEY, accessToken);
        localStorage.setItem(`${TOKEN_KEY}_expires`, expiresAt);
      }

      setStatus('success');
    } catch {
      setErrorMsg('Something went wrong. Please try again.');
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <div className="account-page">
        <div className="account-card">
          <div className="account-logo">
            <a href="/"><img src="/logo-footer.svg" alt="Elusive Racing" /></a>
          </div>
          <div className="account-success">
            <CheckCircle size={48} className="account-success-icon" />
            <h3>Account Created!</h3>
            <p>Welcome to Elusive Racing. Your account is ready to go.</p>
            <button
              className="account-submit"
              style={{ marginTop: 8 }}
              onClick={() => navigate('/my-account/dashboard')}
            >
              Go to My Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="account-page">
      <div className="account-card">

        <div className="account-logo">
          <a href="/">
            <img src="/logo-footer.svg" alt="Elusive Racing" />
          </a>
        </div>

        <h1 className="account-title">Create Account</h1>
        <p className="account-subtitle">Join Elusive Racing for faster checkout and order tracking</p>

        <form className="account-form" onSubmit={handleSubmit} noValidate>

          {status === 'error' && (
            <div className="account-error">
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
              {errorMsg}
            </div>
          )}

          <div className="account-form-row">
            <div className="account-field">
              <label htmlFor="firstName">First Name <span>*</span></label>
              <input
                id="firstName"
                type="text"
                name="firstName"
                value={form.firstName}
                onChange={handleChange}
                placeholder="John"
                required
                autoComplete="given-name"
              />
            </div>
            <div className="account-field">
              <label htmlFor="lastName">Last Name <span>*</span></label>
              <input
                id="lastName"
                type="text"
                name="lastName"
                value={form.lastName}
                onChange={handleChange}
                placeholder="Smith"
                required
                autoComplete="family-name"
              />
            </div>
          </div>

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
                placeholder="Min. 5 characters"
                required
                autoComplete="new-password"
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

          <div className="account-field">
            <label htmlFor="confirmPassword">Confirm Password <span>*</span></label>
            <div className="account-password-wrap">
              <input
                id="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Re-enter password"
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                className="account-password-toggle"
                onClick={() => setShowConfirm((v) => !v)}
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <label className="account-newsletter-label">
            <input
              type="checkbox"
              name="newsletter"
              checked={form.newsletter}
              onChange={handleChange}
            />
            Subscribe to our newsletter for exclusive deals, new arrivals, and motorsport news.
          </label>

          <button
            type="submit"
            className="account-submit"
            disabled={status === 'submitting'}
          >
            {status === 'submitting' ? 'Creating Account…' : 'Create Account'}
          </button>

          <p className="account-password-hint" style={{ textAlign: 'center', marginTop: 0 }}>
            By creating an account you agree to our{' '}
            <Link to="/terms" style={{ color: 'var(--color-red)' }}>Terms &amp; Conditions</Link>.
          </p>

        </form>

        <div className="account-divider">or</div>

        <p className="account-switch">
          Already have an account?{' '}
          <Link to="/my-account">Sign in</Link>
        </p>

      </div>
    </div>
  );
}
