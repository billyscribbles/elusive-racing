import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import useAuthStore from '../store/authStore';
import useCheckoutStore from '../store/checkoutStore';
import { saveAdminAuth } from '../lib/adminAuth';
import './AccountPage.css';

export default function LoginPage() {
  const navigate   = useNavigate();
  const login      = useAuthStore(s => s.login);
  const isLoggedIn = useAuthStore(s => s.isLoggedIn);
  const setContact = useCheckoutStore(s => s.setContact);
  const setShipping = useCheckoutStore(s => s.setShipping);

  const [loginMode, setLoginMode]     = useState('customer'); // 'customer' | 'admin'
  const [form, setForm]               = useState({ email: '', password: '', remember: false });
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus]           = useState('idle'); // idle | submitting | error
  const [errorMsg, setErrorMsg]       = useState('');

  // Already logged in — go straight to dashboard
  useEffect(() => {
    if (isLoggedIn()) navigate('/my-account/dashboard', { replace: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('submitting');
    setErrorMsg('');

    try {
      if (loginMode === 'admin') {
        // Admin login flow
        const res = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: form.email, password: form.password }),
        });
        const data = await res.json();

        if (!res.ok) {
          setStatus('error');
          setErrorMsg(data.error || 'Invalid username or password.');
          return;
        }

        saveAdminAuth(data.token, data.username || form.email);
        login({ user: { email: form.email, firstName: form.email, lastName: '', role: 'administrator' }, token: data.token });
        navigate('/my-account/dashboard');
      } else {
        // Customer / wholesale login flow
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: form.email, password: form.password }),
        });
        const data = await res.json();

        if (!res.ok) {
          setStatus('error');
          setErrorMsg(data.error || 'Invalid email or password.');
          return;
        }

        login(data);

        // Pre-fill checkout contact + shipping from saved WC address
        if (data.user) {
          setContact({
            email:     data.user.email,
            firstName: data.user.firstName,
            lastName:  data.user.lastName,
          });
          const s = data.user.shipping;
          if (s?.address_1) {
            setShipping({
              address1: s.address_1,
              address2: s.address_2 || '',
              city:     s.city,
              state:    s.state,
              postcode: s.postcode,
              country:  s.country || 'AU',
            });
          }
        }

        navigate('/my-account/dashboard');
      }
    } catch {
      setStatus('error');
      setErrorMsg('Something went wrong. Please try again.');
    }
  }

  return (
    <div className="account-page">
      <div className="account-card">
        <h1 className="account-title">Sign In</h1>
        <p className="account-subtitle">
          {loginMode === 'admin' ? 'Admin portal access' : 'Welcome back — sign in to your account'}
        </p>

        <form className="account-form" onSubmit={handleSubmit} noValidate>
          {status === 'error' && (
            <div className="account-error">
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
              {errorMsg}
            </div>
          )}

          <div className="account-field">
            <label htmlFor="email">{loginMode === 'admin' ? 'Username' : 'Email Address'} <span>*</span></label>
            <input
              id="email" type={loginMode === 'admin' ? 'text' : 'email'} name="email"
              value={form.email} onChange={handleChange}
              placeholder={loginMode === 'admin' ? 'admin' : 'you@example.com'}
              required autoComplete={loginMode === 'admin' ? 'username' : 'email'}
            />
          </div>

          <div className="account-field">
            <label htmlFor="password">Password <span>*</span></label>
            <div className="account-password-wrap">
              <input
                id="password" type={showPassword ? 'text' : 'password'}
                name="password" value={form.password} onChange={handleChange}
                placeholder="••••••••" required autoComplete="current-password"
              />
              <button type="button" className="account-password-toggle"
                onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="account-checkbox-row">
            <label className="account-checkbox-label">
              <input type="checkbox" name="remember" checked={form.remember} onChange={handleChange} />
              Remember me
            </label>
            <Link to="/my-account/lost-password" className="account-forgot">
              Forgot password?
            </Link>
          </div>

          <button type="submit" className="account-submit" disabled={status === 'submitting'}>
            {status === 'submitting' ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <div className="account-divider">or</div>
        <p className="account-switch">
          Don&apos;t have an account?{' '}
          <Link to="/my-account/register">Create one</Link>
        </p>
        <p className="account-switch account-switch--admin">
          <button
            type="button"
            className="account-admin-toggle"
            onClick={() => { setLoginMode(m => m === 'admin' ? 'customer' : 'admin'); setErrorMsg(''); setStatus('idle'); }}
          >
            {loginMode === 'admin' ? 'Back to customer login' : 'Admin login'}
          </button>
        </p>
      </div>
    </div>
  );
}
