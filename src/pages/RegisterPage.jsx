import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import useAuthStore from '../store/authStore';
import useCheckoutStore from '../store/checkoutStore';
import './AccountPage.css';

export default function RegisterPage() {
  const navigate   = useNavigate();
  const login      = useAuthStore(s => s.login);
  const isLoggedIn = useAuthStore(s => s.isLoggedIn);
  const setContact = useCheckoutStore(s => s.setContact);

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', password: '', confirmPassword: '', newsletter: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm,  setShowConfirm]  = useState(false);
  const [status,   setStatus]   = useState('idle'); // idle | submitting | success | error
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isLoggedIn()) navigate('/my-account/dashboard', { replace: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg('');

    if (form.password !== form.confirmPassword) {
      setStatus('error');
      setErrorMsg('Passwords do not match.');
      return;
    }
    if (form.password.length < 6) {
      setStatus('error');
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setStatus('submitting');
    try {
      const res  = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email:     form.email,
          password:  form.password,
          firstName: form.firstName,
          lastName:  form.lastName,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setStatus('error');
        setErrorMsg(data.error || 'Could not create account.');
        return;
      }

      // Auto-login after registration
      if (data.token) {
        login(data);
        setContact({ email: data.user.email, firstName: data.user.firstName, lastName: data.user.lastName });
        navigate('/my-account/dashboard');
      } else {
        // JWT plugin not available — account created, redirect to login
        setStatus('success');
      }
    } catch {
      setStatus('error');
      setErrorMsg('Something went wrong. Please try again.');
    }
  }

  if (status === 'success') {
    return (
      <div className="account-page">
        <div className="account-card">
          <div className="account-success">
            <CheckCircle size={48} className="account-success-icon" />
            <h3>Account Created!</h3>
            <p>Welcome to Elusive Racing. Sign in to access your account.</p>
            <Link to="/my-account" className="account-submit" style={{ display: 'block', marginTop: 8, textAlign: 'center', textDecoration: 'none' }}>
              Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="account-page">
      <div className="account-card">
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
              <input id="firstName" type="text" name="firstName" value={form.firstName}
                onChange={handleChange} placeholder="John" required autoComplete="given-name" />
            </div>
            <div className="account-field">
              <label htmlFor="lastName">Last Name <span>*</span></label>
              <input id="lastName" type="text" name="lastName" value={form.lastName}
                onChange={handleChange} placeholder="Smith" required autoComplete="family-name" />
            </div>
          </div>

          <div className="account-field">
            <label htmlFor="email">Email Address <span>*</span></label>
            <input id="email" type="email" name="email" value={form.email}
              onChange={handleChange} placeholder="you@example.com" required autoComplete="email" />
          </div>

          <div className="account-field">
            <label htmlFor="password">Password <span>*</span></label>
            <div className="account-password-wrap">
              <input id="password" type={showPassword ? 'text' : 'password'}
                name="password" value={form.password} onChange={handleChange}
                placeholder="Min. 6 characters" required autoComplete="new-password" />
              <button type="button" className="account-password-toggle"
                onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="account-field">
            <label htmlFor="confirmPassword">Confirm Password <span>*</span></label>
            <div className="account-password-wrap">
              <input id="confirmPassword" type={showConfirm ? 'text' : 'password'}
                name="confirmPassword" value={form.confirmPassword} onChange={handleChange}
                placeholder="Re-enter password" required autoComplete="new-password" />
              <button type="button" className="account-password-toggle"
                onClick={() => setShowConfirm(v => !v)}
                aria-label={showConfirm ? 'Hide password' : 'Show password'}>
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <label className="account-newsletter-label">
            <input type="checkbox" name="newsletter" checked={form.newsletter} onChange={handleChange} />
            Subscribe to our newsletter for exclusive deals, new arrivals, and motorsport news.
          </label>

          <button type="submit" className="account-submit" disabled={status === 'submitting'}>
            {status === 'submitting' ? 'Creating Account…' : 'Create Account'}
          </button>

          <p className="account-password-hint" style={{ textAlign: 'center', marginTop: 0 }}>
            By creating an account you agree to our{' '}
            <Link to="/terms" style={{ color: 'var(--color-red)' }}>Terms &amp; Conditions</Link>.
          </p>
        </form>

        <div className="account-divider">or</div>
        <p className="account-switch">
          Already have an account? <Link to="/my-account">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
