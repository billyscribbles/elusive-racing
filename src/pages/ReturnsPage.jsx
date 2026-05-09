import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import './ReturnsPage.css';

const policySections = [
  {
    id: 'overview',
    title: 'Overview',
    content: `At Elusive Racing we want you to be completely happy with your purchase. This policy sets out how returns, refunds, and warranty claims are handled. It operates in addition to — and does not limit — your rights under the Australian Consumer Law (ACL).`,
  },
  {
    id: 'change-of-mind',
    title: 'Change of Mind',
    content: `We accept change-of-mind returns within 14 days of delivery, provided the item is unused, uninstalled, and returned in its original packaging and re-saleable condition.

A restocking fee of up to 20% may apply. Return shipping costs are the responsibility of the customer. Any item that has been test-fitted or installed is not eligible for a change-of-mind return.`,
  },
  {
    id: 'faulty',
    title: 'Faulty or Incorrectly Supplied Items',
    content: `If your item arrives faulty, damaged, or is not what you ordered, please contact us within 7 days of delivery. We will arrange a replacement, repair, or refund in accordance with your rights under the Australian Consumer Law. Return shipping for faulty or incorrectly supplied items is at our cost.`,
  },
  {
    id: 'warranty',
    title: 'Warranty Claims',
    content: `Many products we sell carry a manufacturer's warranty. Warranty terms vary by brand and product. To lodge a claim, submit the form below with your order number and a description of the fault.

All parts must be fitted by a qualified, licensed mechanic. Any product installed by an unlicensed workshop or individual is not eligible for warranty or return, and a copy of the installing workshop's tax invoice must be supplied when a claim is lodged.

Where a fault is reported on an electronic component such as a sensor or ECU, an assessment may be required to determine the nature and extent of the defect. We will notify you of the outcome once the assessment is complete.

Warranty does not cover:
- Damage caused by improper installation or use outside the manufacturer's guidelines
- Damage resulting from the use of an incorrect grade, or an insufficient quantity, of lubricant — including, without limitation, on supercharger and turbocharger applications
- Accident, misuse, or modification damage
- Normal wear and tear
- Products dismantled or repaired by unauthorised parties`,
  },
  {
    id: 'performance-parts',
    title: 'Performance Parts',
    content: `Performance and motorsport-intended parts are supplied without manufacturer warranty against failure under competition use, accelerated wear, or loss of performance over time. These items are sold on the understanding that they operate beyond standard road-vehicle specifications. This exclusion does not affect your rights under the Australian Consumer Law in respect of major failures.`,
  },
  {
    id: 'non-returnable',
    title: 'Non-Returnable Items',
    content: `The following items cannot be returned:
- Special-order or custom items
- Electrical components, ECUs, or tuning software once opened or activated
- Hazardous goods including oils, fluids, and aerosols
- Items without original packaging`,
  },
  {
    id: 'process',
    title: 'How to Lodge a Return',
    content: `Fill out the form below with your order details and a description of the issue. Our team will review your request and respond within 2 business days with next steps, including a return authorisation number if approved.

Do not ship items back without an authorisation number — unauthorised returns may be refused.`,
  },
  {
    id: 'refunds',
    title: 'Refund Processing',
    content: `Once we receive and inspect your returned item, your refund is issued to the original payment method. Approved refunds are typically processed within the following timeframes:
- Visa, Mastercard, and American Express: 14–28 business days
- PayPal: 14–28 business days
- Afterpay and Zip Money: 14–28 business days
- Bank transfer (BACS): 3–5 business days

Once a refund has been initiated, the final processing time is governed by the relevant card issuer or third-party provider and is outside our control.`,
  },
  {
    id: 'refund-deductions',
    title: 'Refund Amount and Deductions',
    content: `Refunds are calculated as the purchase price of the returned item, less:
- Original return shipping costs
- Non-refundable payment processing fees retained by the third-party provider, where applicable: Afterpay 7%, Zip Money 7%, Visa 3%, Mastercard 3%, American Express 3%
- A restocking fee of up to 20%, where applicable

These amounts reflect transaction and handling costs that are not recovered when an order is reversed, and are deducted before the balance is returned to your original payment method.`,
  },
];

const REQUEST_TYPES = [
  'Return for Refund',
  'Return for Store Credit',
  'Warranty Claim',
];

const AU_PHONE_RE = /^(\+?61|0)[2-478]\d{8}$/;

const initialForm = {
  name: '',
  email: '',
  phone: '',
  orderNumber: '',
  requestType: '',
  partNumbers: '',
  purchaseDate: '',
  description: '',
};

export default function ReturnsPage() {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) {
      setErrors((e) => {
        const n = { ...e };
        delete n[key];
        return n;
      });
    }
  }

  function validate() {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email';
    if (!form.phone.trim()) e.phone = 'Contact number is required';
    else {
      const digits = form.phone.replace(/[\s\-().]/g, '');
      if (!AU_PHONE_RE.test(digits)) e.phone = 'Enter a valid Australian phone number (e.g. 0412 345 678)';
    }
    if (!form.orderNumber.trim()) e.orderNumber = 'Order / invoice number is required';
    if (!form.requestType) e.requestType = 'Please select a request type';
    if (!form.partNumbers.trim()) e.partNumbers = 'Part number(s) are required';
    if (!form.purchaseDate) e.purchaseDate = 'Date of purchase is required';
    else {
      const picked = new Date(form.purchaseDate);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (picked > today) e.purchaseDate = 'Date of purchase cannot be in the future';
    }
    const desc = form.description.trim();
    if (!desc) e.description = 'Please describe the issue';
    else if (desc.length < 10) e.description = 'Please provide at least 10 characters';
    else if (desc.length > 1000) e.description = 'Please keep under 1000 characters';
    return e;
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    if (submitting) return;
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setSubmitting(true);
    // TODO: wire up to /api/returns endpoint once email backend is added.
    await new Promise((r) => setTimeout(r, 600));
    setSubmitting(false);
    setSubmitted(true);
  }

  const todayIso = new Date().toISOString().slice(0, 10);

  return (
    <div className="returns-page">
      <div className="container">
        <div className="returns-header">
          <div className="returns-breadcrumb">
            <Link to="/">Home</Link>
            <span>/</span>
            <span>Returns &amp; Warranty</span>
          </div>
          <h1 className="returns-title">Returns &amp; Warranty</h1>
          <p className="returns-intro">
            Need to return an item or lodge a warranty claim? Review our policy below and complete the request form.
            Our team will get back to you within 2 business days.
          </p>
        </div>

        <div className="returns-body">
          <aside className="returns-toc">
            <h2 className="returns-toc-title">Policy</h2>
            <nav>
              <ol className="returns-toc-list">
                {policySections.map((s) => (
                  <li key={s.id}>
                    <a href={`#${s.id}`}>{s.title}</a>
                  </li>
                ))}
                <li><a href="#form">Request Form</a></li>
              </ol>
            </nav>
          </aside>

          <div className="returns-content">
            {policySections.map((s) => (
              <section key={s.id} id={s.id} className="returns-section">
                <h2 className="returns-section-title">{s.title}</h2>
                {s.content.split('\n\n').map((para, i) => (
                  para.startsWith('- ') ? (
                    <ul key={i} className="returns-list">
                      {para.split('\n').map((line, j) => (
                        <li key={j}>{line.replace(/^- /, '')}</li>
                      ))}
                    </ul>
                  ) : (
                    <p key={i}>{para}</p>
                  )
                ))}
              </section>
            ))}

            <section id="form" className="returns-section returns-form-section">
              <h2 className="returns-section-title">Returns Request Form</h2>

              {submitted ? (
                <div className="returns-success" role="status" aria-live="polite">
                  <CheckCircle2 size={32} />
                  <h3>Request received</h3>
                  <p>
                    Thanks {form.name.split(' ')[0] || 'there'}, we&apos;ve received your request. Our team will contact you on{' '}
                    <strong>{form.email}</strong> within 2 business days with next steps.
                  </p>
                </div>
              ) : (
                <form className="returns-form" onSubmit={handleSubmit} noValidate>
                  <div className="returns-row-2">
                    <div className={`returns-field${errors.name ? ' returns-field--error' : ''}`}>
                      <label htmlFor="rf-name">Name<span className="returns-required">*</span></label>
                      <input
                        id="rf-name"
                        type="text"
                        autoComplete="name"
                        value={form.name}
                        onChange={(e) => update('name', e.target.value)}
                      />
                      {errors.name && <span className="returns-error">{errors.name}</span>}
                    </div>

                    <div className={`returns-field${errors.email ? ' returns-field--error' : ''}`}>
                      <label htmlFor="rf-email">Email<span className="returns-required">*</span></label>
                      <input
                        id="rf-email"
                        type="email"
                        autoComplete="email"
                        value={form.email}
                        onChange={(e) => update('email', e.target.value)}
                      />
                      {errors.email && <span className="returns-error">{errors.email}</span>}
                    </div>
                  </div>

                  <div className="returns-row-2">
                    <div className={`returns-field${errors.phone ? ' returns-field--error' : ''}`}>
                      <label htmlFor="rf-phone">Contact Number<span className="returns-required">*</span></label>
                      <input
                        id="rf-phone"
                        type="tel"
                        autoComplete="tel"
                        placeholder="04xx xxx xxx"
                        value={form.phone}
                        onChange={(e) => update('phone', e.target.value)}
                      />
                      {errors.phone && <span className="returns-error">{errors.phone}</span>}
                    </div>

                    <div className={`returns-field${errors.orderNumber ? ' returns-field--error' : ''}`}>
                      <label htmlFor="rf-order">Order / Invoice Number<span className="returns-required">*</span></label>
                      <input
                        id="rf-order"
                        type="text"
                        value={form.orderNumber}
                        onChange={(e) => update('orderNumber', e.target.value)}
                      />
                      {errors.orderNumber && <span className="returns-error">{errors.orderNumber}</span>}
                    </div>
                  </div>

                  <div className="returns-row-2">
                    <div className={`returns-field${errors.requestType ? ' returns-field--error' : ''}`}>
                      <label htmlFor="rf-type">Request Type<span className="returns-required">*</span></label>
                      <select
                        id="rf-type"
                        value={form.requestType}
                        onChange={(e) => update('requestType', e.target.value)}
                      >
                        <option value="">Select…</option>
                        {REQUEST_TYPES.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                      {errors.requestType && <span className="returns-error">{errors.requestType}</span>}
                    </div>

                    <div className={`returns-field${errors.purchaseDate ? ' returns-field--error' : ''}`}>
                      <label htmlFor="rf-date">Date of Purchase<span className="returns-required">*</span></label>
                      <input
                        id="rf-date"
                        type="date"
                        max={todayIso}
                        value={form.purchaseDate}
                        onChange={(e) => update('purchaseDate', e.target.value)}
                      />
                      {errors.purchaseDate && <span className="returns-error">{errors.purchaseDate}</span>}
                    </div>
                  </div>

                  <div className={`returns-field${errors.partNumbers ? ' returns-field--error' : ''}`}>
                    <label htmlFor="rf-parts">Part Number(s)<span className="returns-required">*</span></label>
                    <input
                      id="rf-parts"
                      type="text"
                      placeholder="e.g. HR-1234-ABC, HR-5678"
                      value={form.partNumbers}
                      onChange={(e) => update('partNumbers', e.target.value)}
                    />
                    {errors.partNumbers && <span className="returns-error">{errors.partNumbers}</span>}
                  </div>

                  <div className={`returns-field${errors.description ? ' returns-field--error' : ''}`}>
                    <label htmlFor="rf-desc">Describe the Issue<span className="returns-required">*</span></label>
                    <textarea
                      id="rf-desc"
                      rows={6}
                      maxLength={1000}
                      value={form.description}
                      onChange={(e) => update('description', e.target.value)}
                    />
                    <div className="returns-char-count">{form.description.length} / 1000</div>
                    {errors.description && <span className="returns-error">{errors.description}</span>}
                  </div>

                  <button
                    type="submit"
                    className="returns-submit"
                    disabled={submitting}
                    aria-busy={submitting}
                  >
                    {submitting ? 'Submitting…' : 'Submit Request'}
                  </button>
                </form>
              )}
            </section>
          </div>
        </div>

        <div className="returns-footer-note">
          <p>
            Questions about a return?{' '}
            <Link to="/contact">Contact us</Link> or call <a href="tel:+61395741710">03 9574 1710</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
