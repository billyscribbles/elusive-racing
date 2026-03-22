import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail, Clock, Instagram, Facebook, Send, CheckCircle, AlertCircle } from 'lucide-react';
import './ContactUsPage.css';

// ── To activate email delivery:
// 1. Go to https://formspree.io and sign up (free)
// 2. Create a new form and set the destination to your email address
// 3. Replace YOUR_FORM_ID below with the form ID Formspree gives you (e.g. "xpwzabcd")
const FORMSPREE_ID = 'YOUR_FORM_ID';

const contactDetails = [
  {
    icon: <MapPin size={20} />,
    label: 'Workshop',
    value: '1/32 Graham Rd, Clayton South VIC 3169',
    href: 'https://maps.google.com/?q=1/32+Graham+Rd+Clayton+South+VIC+3169',
  },
  {
    icon: <Phone size={20} />,
    label: 'Phone',
    value: '03 9574 1710',
    href: 'tel:+61395741710',
  },
  {
    icon: <Mail size={20} />,
    label: 'Email',
    value: 'sales@elusiveracing.com.au',
    href: 'mailto:sales@elusiveracing.com.au',
  },
  {
    icon: <Clock size={20} />,
    label: 'Hours',
    value: 'Mon – Fri: 9am – 5:30pm\nSat: By appointment',
    href: null,
  },
];

const socials = [
  { icon: <Instagram size={20} />, label: 'Instagram', href: 'https://www.instagram.com/elusive_racing/' },
  { icon: <Facebook size={20} />, label: 'Facebook', href: 'https://www.facebook.com/ElusiveRacin' },
];

const subjects = [
  'General Enquiry',
  'Parts & Orders',
  'Workshop Booking',
  'Wholesale',
  'Other',
];

export default function ContactUsPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [status, setStatus] = useState('idle'); // idle | submitting | success | error

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (FORMSPREE_ID === 'YOUR_FORM_ID') {
      setStatus('success');
      return;
    }
    setStatus('submitting');
    try {
      const res = await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setStatus('success');
        setForm({ name: '', email: '', phone: '', subject: '', message: '' });
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  }

  return (
    <div className="contact-us-page">
      <div className="container">

        {/* Header */}
        <div className="cus-header">
          <div className="cus-breadcrumb">
            <Link to="/">Home</Link>
            <span>/</span>
            <span>Contact Us</span>
          </div>
          <h1 className="cus-title">Get in Touch</h1>
          <p className="cus-subtitle">
            Parts question, build advice, or ready to book? We're here to help.
          </p>
        </div>

        {/* Body */}
        <div className="cus-body">

          {/* Form */}
          <div className="cus-form-wrap">
            {status === 'success' ? (
              <div className="cus-success">
                <CheckCircle size={48} className="cus-success-icon" />
                <h2>Message sent!</h2>
                <p>Thanks for reaching out. We'll get back to you within one business day.</p>
                <button className="cus-reset-btn" onClick={() => setStatus('idle')}>Send another message</button>
              </div>
            ) : (
              <form className="cus-form" onSubmit={handleSubmit} noValidate>
                <div className="cus-form-row">
                  <div className="cus-field">
                    <label htmlFor="name">Full Name <span>*</span></label>
                    <input
                      id="name" name="name" type="text"
                      value={form.name} onChange={handleChange}
                      required placeholder="John Smith"
                    />
                  </div>
                  <div className="cus-field">
                    <label htmlFor="email">Email Address <span>*</span></label>
                    <input
                      id="email" name="email" type="email"
                      value={form.email} onChange={handleChange}
                      required placeholder="john@email.com"
                    />
                  </div>
                </div>
                <div className="cus-form-row">
                  <div className="cus-field">
                    <label htmlFor="phone">Phone Number</label>
                    <input
                      id="phone" name="phone" type="tel"
                      value={form.phone} onChange={handleChange}
                      placeholder="04xx xxx xxx"
                    />
                  </div>
                  <div className="cus-field">
                    <label htmlFor="subject">Subject <span>*</span></label>
                    <div className="cus-select-wrap">
                      <select
                        id="subject" name="subject"
                        value={form.subject} onChange={handleChange}
                        required
                      >
                        <option value="">Select a subject…</option>
                        {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
                <div className="cus-field">
                  <label htmlFor="message">Message <span>*</span></label>
                  <textarea
                    id="message" name="message"
                    value={form.message} onChange={handleChange}
                    required rows={6}
                    placeholder="Tell us about your car, what parts you're after, or what you need help with…"
                  />
                </div>

                {status === 'error' && (
                  <div className="cus-error">
                    <AlertCircle size={16} />
                    Something went wrong. Please try again or call us on 03 9574 1710.
                  </div>
                )}

                <button type="submit" className="cus-submit" disabled={status === 'submitting'}>
                  {status === 'submitting' ? 'Sending…' : <><Send size={15} /> Send Message</>}
                </button>
              </form>
            )}
          </div>

          {/* Sidebar */}
          <aside className="cus-sidebar">
            <div className="cus-info-card">
              <h2 className="cus-info-title">Workshop Info</h2>
              <div className="cus-details">
                {contactDetails.map((d) => (
                  <div key={d.label} className="cus-detail">
                    <div className="cus-detail-icon">{d.icon}</div>
                    <div className="cus-detail-body">
                      <span className="cus-detail-label">{d.label}</span>
                      {d.href ? (
                        <a
                          href={d.href}
                          className="cus-detail-value"
                          target={d.href.startsWith('http') ? '_blank' : undefined}
                          rel="noopener noreferrer"
                        >
                          {d.value}
                        </a>
                      ) : (
                        <span className="cus-detail-value cus-detail-value--multi">{d.value}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="cus-social">
                {socials.map((s) => (
                  <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" className="cus-social-link" aria-label={s.label}>
                    {s.icon}
                  </a>
                ))}
              </div>
            </div>

            <div className="cus-booking-card">
              <h3>Need a Service?</h3>
              <p>Book your car in online and we'll confirm your appointment within 24 hours.</p>
              <Link to="/book" className="cus-booking-btn">Book a Service</Link>
            </div>
          </aside>
        </div>

      </div>
    </div>
  );
}
