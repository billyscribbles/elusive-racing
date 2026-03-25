import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, CheckCircle, Building2 } from 'lucide-react';
import './WholesalePage.css';

const AU_STATES = ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA'];

const BUSINESS_TYPES = [
  'Retailer',
  'Workshop / Mechanic',
  'Motorsport Team',
  'Distributor',
  'Online Store',
  'Fleet / Corporate',
  'Other',
];

const HEAR_ABOUT = [
  'Google',
  'Instagram',
  'Facebook',
  'YouTube',
  'Word of Mouth',
  'Existing Customer',
  'Trade Show / Event',
  'Other',
];

function passwordStrength(pw) {
  if (!pw) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pw.length >= 8)  score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { score, label: 'Weak',   color: '#e53e3e' };
  if (score <= 3) return { score, label: 'Fair',   color: '#dd6b20' };
  if (score <= 4) return { score, label: 'Good',   color: '#38a169' };
  return              { score, label: 'Strong', color: '#2b6cb0' };
}

export default function WholesalePage() {
  const [form, setForm] = useState({
    businessName: '',
    abn: '',
    businessType: '',
    website: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    suburb: '',
    state: '',
    postcode: '',
    password: '',
    confirmPassword: '',
    hearAbout: '',
    notes: '',
    newsletter: false,
    terms: false,
  });

  const [showPassword, setShowPassword]     = useState(false);
  const [showConfirm,  setShowConfirm]      = useState(false);
  const [status,       setStatus]           = useState('idle'); // idle | submitting | success | error
  const [errorMsg,     setErrorMsg]         = useState('');

  const strength = passwordStrength(form.password);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg('');

    if (!form.terms) {
      setErrorMsg('You must agree to the Terms & Conditions to continue.');
      setStatus('error');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setErrorMsg('Passwords do not match.');
      setStatus('error');
      return;
    }

    if (form.password.length < 8) {
      setErrorMsg('Password must be at least 8 characters.');
      setStatus('error');
      return;
    }

    setStatus('submitting');

    // Wholesale applications are reviewed manually — no live API call yet.
    // Replace this with your backend/WooCommerce wholesale flow when ready.
    await new Promise((r) => setTimeout(r, 1200));
    setStatus('success');
  }

  if (status === 'success') {
    return (
      <div className="wholesale-page">
        <div className="wholesale-hero">
          <div className="container">
            <h1 className="wholesale-hero-title">Wholesale Registration</h1>
          </div>
        </div>
        <div className="container">
          <div className="wholesale-card">
            <div className="wholesale-success">
              <CheckCircle size={52} className="wholesale-success-icon" />
              <h3>Application Received!</h3>
              <p>
                Thank you for applying for a wholesale account with Elusive Racing.
                Our team will review your application and be in touch within 1–2 business days.
              </p>
              <Link to="/" className="wholesale-submit" style={{ display: 'inline-block', textDecoration: 'none', textAlign: 'center', marginTop: 8 }}>
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="wholesale-page">

      <div className="wholesale-hero">
        <div className="container">
          <div className="wholesale-breadcrumb">
            <Link to="/">Home</Link>
            <span>/</span>
            <span>Wholesale Registration</span>
          </div>
          <h1 className="wholesale-hero-title">Wholesale Registration</h1>
          <p className="wholesale-hero-sub">
            Apply for a trade account to access exclusive wholesale pricing, priority stock, and dedicated support.
          </p>
        </div>
      </div>

      <div className="container">
        <div className="wholesale-layout">

          {/* Info panel */}
          <aside className="wholesale-info">
            <div className="wholesale-info-card">
              <Building2 size={28} className="wholesale-info-icon" />
              <h3>Why Go Wholesale?</h3>
              <ul className="wholesale-benefits">
                <li>Exclusive trade pricing on 10,000+ parts</li>
                <li>Priority access to new stock</li>
                <li>Dedicated account manager</li>
                <li>Net-30 payment terms (subject to approval)</li>
                <li>Bulk order discounts</li>
                <li>Early access to promotions</li>
              </ul>
              <div className="wholesale-contact-note">
                <strong>Questions?</strong><br />
                Call us on <a href="tel:+61395741710">03 9574 1710</a> or email{' '}
                <a href="mailto:sales@elusiveracing.com.au">sales@elusiveracing.com.au</a>
              </div>
            </div>
          </aside>

          {/* Form */}
          <div className="wholesale-card">

            <h2 className="wholesale-card-title">Business Details</h2>
            <p className="wholesale-card-sub">All fields marked <span>*</span> are required. Applications are reviewed within 1–2 business days.</p>

            <form className="wholesale-form" onSubmit={handleSubmit} noValidate>

              {status === 'error' && (
                <div className="wholesale-error">
                  <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                  {errorMsg}
                </div>
              )}

              {/* ── Business Information ── */}
              <div className="wholesale-section-label">Business Information</div>

              <div className="wholesale-row">
                <div className="wholesale-field">
                  <label htmlFor="businessName">Business / Company Name <span>*</span></label>
                  <input id="businessName" type="text" name="businessName" value={form.businessName}
                    onChange={handleChange} placeholder="Acme Motorsport Pty Ltd" required autoComplete="organization" />
                </div>
                <div className="wholesale-field">
                  <label htmlFor="abn">ABN <span>*</span></label>
                  <input id="abn" type="text" name="abn" value={form.abn}
                    onChange={handleChange} placeholder="12 345 678 901" required maxLength={14} />
                </div>
              </div>

              <div className="wholesale-row">
                <div className="wholesale-field">
                  <label htmlFor="businessType">Business Type <span>*</span></label>
                  <div className="wholesale-select-wrap">
                    <select id="businessType" name="businessType" value={form.businessType}
                      onChange={handleChange} required>
                      <option value="">Select type…</option>
                      {BUSINESS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div className="wholesale-field">
                  <label htmlFor="website">Website</label>
                  <input id="website" type="url" name="website" value={form.website}
                    onChange={handleChange} placeholder="https://yourbusiness.com.au" />
                </div>
              </div>

              {/* ── Contact Details ── */}
              <div className="wholesale-section-label">Contact Details</div>

              <div className="wholesale-row">
                <div className="wholesale-field">
                  <label htmlFor="firstName">First Name <span>*</span></label>
                  <input id="firstName" type="text" name="firstName" value={form.firstName}
                    onChange={handleChange} placeholder="John" required autoComplete="given-name" />
                </div>
                <div className="wholesale-field">
                  <label htmlFor="lastName">Last Name <span>*</span></label>
                  <input id="lastName" type="text" name="lastName" value={form.lastName}
                    onChange={handleChange} placeholder="Smith" required autoComplete="family-name" />
                </div>
              </div>

              <div className="wholesale-row">
                <div className="wholesale-field">
                  <label htmlFor="email">Email Address <span>*</span></label>
                  <input id="email" type="email" name="email" value={form.email}
                    onChange={handleChange} placeholder="john@yourbusiness.com.au" required autoComplete="email" />
                </div>
                <div className="wholesale-field">
                  <label htmlFor="phone">Phone Number <span>*</span></label>
                  <input id="phone" type="tel" name="phone" value={form.phone}
                    onChange={handleChange} placeholder="03 9000 0000" required autoComplete="tel" />
                </div>
              </div>

              {/* ── Business Address ── */}
              <div className="wholesale-section-label">Business Address</div>

              <div className="wholesale-field">
                <label htmlFor="address">Street Address <span>*</span></label>
                <input id="address" type="text" name="address" value={form.address}
                  onChange={handleChange} placeholder="1/32 Graham Rd" required autoComplete="street-address" />
              </div>

              <div className="wholesale-row wholesale-row--3">
                <div className="wholesale-field">
                  <label htmlFor="suburb">Suburb / City <span>*</span></label>
                  <input id="suburb" type="text" name="suburb" value={form.suburb}
                    onChange={handleChange} placeholder="Clayton South" required autoComplete="address-level2" />
                </div>
                <div className="wholesale-field">
                  <label htmlFor="state">State <span>*</span></label>
                  <div className="wholesale-select-wrap">
                    <select id="state" name="state" value={form.state} onChange={handleChange} required>
                      <option value="">State…</option>
                      {AU_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div className="wholesale-field">
                  <label htmlFor="postcode">Postcode <span>*</span></label>
                  <input id="postcode" type="text" name="postcode" value={form.postcode}
                    onChange={handleChange} placeholder="3169" required maxLength={4} autoComplete="postal-code" />
                </div>
              </div>

              {/* ── Account Password ── */}
              <div className="wholesale-section-label">Account Password</div>

              <div className="wholesale-row">
                <div className="wholesale-field">
                  <label htmlFor="password">Password <span>*</span></label>
                  <div className="wholesale-password-wrap">
                    <input id="password" type={showPassword ? 'text' : 'password'} name="password"
                      value={form.password} onChange={handleChange}
                      placeholder="Min. 8 characters" required autoComplete="new-password" />
                    <button type="button" className="wholesale-pw-toggle"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}>
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {form.password && (
                    <div className="wholesale-strength">
                      <div className="wholesale-strength-bar">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <div key={n} className="wholesale-strength-seg"
                            style={{ background: n <= strength.score ? strength.color : '#e0e0e0' }} />
                        ))}
                      </div>
                      <span className="wholesale-strength-label" style={{ color: strength.color }}>{strength.label}</span>
                    </div>
                  )}
                </div>
                <div className="wholesale-field">
                  <label htmlFor="confirmPassword">Confirm Password <span>*</span></label>
                  <div className="wholesale-password-wrap">
                    <input id="confirmPassword" type={showConfirm ? 'text' : 'password'} name="confirmPassword"
                      value={form.confirmPassword} onChange={handleChange}
                      placeholder="Re-enter password" required autoComplete="new-password" />
                    <button type="button" className="wholesale-pw-toggle"
                      onClick={() => setShowConfirm((v) => !v)}
                      aria-label={showConfirm ? 'Hide password' : 'Show password'}>
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* ── Additional Info ── */}
              <div className="wholesale-section-label">Additional Information</div>

              <div className="wholesale-field">
                <label htmlFor="hearAbout">How did you hear about us?</label>
                <div className="wholesale-select-wrap">
                  <select id="hearAbout" name="hearAbout" value={form.hearAbout} onChange={handleChange}>
                    <option value="">Select…</option>
                    {HEAR_ABOUT.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              </div>

              <div className="wholesale-field">
                <label htmlFor="notes">Additional Notes</label>
                <textarea id="notes" name="notes" value={form.notes} onChange={handleChange}
                  placeholder="Tell us about your business, products you're interested in, or any questions…"
                  rows={4} className="wholesale-textarea" />
              </div>

              {/* ── Agreements ── */}
              <label className="wholesale-check-label">
                <input type="checkbox" name="newsletter" checked={form.newsletter} onChange={handleChange} />
                Subscribe to our newsletter for exclusive deals, new arrivals, and motorsport news.
              </label>

              <label className="wholesale-check-label">
                <input type="checkbox" name="terms" checked={form.terms} onChange={handleChange} required />
                I agree to the <Link to="/terms" target="_blank">Terms &amp; Conditions</Link> and confirm the business details provided are accurate. <span>*</span>
              </label>

              <button type="submit" className="wholesale-submit" disabled={status === 'submitting'}>
                {status === 'submitting' ? 'Submitting Application…' : 'Submit Wholesale Application'}
              </button>

            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
