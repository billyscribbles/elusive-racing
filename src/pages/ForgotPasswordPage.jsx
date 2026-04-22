import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import './AccountPage.css';

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState('');
  const [status, setStatus]   = useState('idle'); // idle | submitting | sent | error
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('submitting');
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/lost-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (res.status === 429) {
        const data = await res.json().catch(() => ({}));
        setStatus('error');
        setErrorMsg(data.error || 'Too many attempts. Please try again later.');
        return;
      }

      setStatus('sent');
    } catch {
      setStatus('error');
      setErrorMsg('Something went wrong. Please try again.');
    }
  }

  if (status === 'sent') {
    return (
      <div className="account-page">
        <div className="account-card">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <CheckCircle2 size={40} color="var(--color-red)" />
          </div>
          <h1 className="account-title">Check your inbox</h1>
          <p className="account-subtitle">
            If an account with that email exists, we&apos;ve sent a password reset link.
            It can take a minute or two to arrive — remember to check your spam folder.
          </p>
          <p className="account-switch">
            <Link to="/login">Back to sign in</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="account-page">
      <div className="account-card">
        <h1 className="account-title">Forgot your password?</h1>
        <p className="account-subtitle">
          Enter the email for your account and we&apos;ll send you a link to reset it.
        </p>

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
              id="email" type="email" name="email"
              value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required autoComplete="email"
            />
          </div>

          <button type="submit" className="account-submit" disabled={status === 'submitting' || !email}>
            {status === 'submitting' ? 'Sending…' : 'Send reset link'}
          </button>
        </form>

        <p className="account-switch" style={{ marginTop: 24 }}>
          <Link to="/login">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
