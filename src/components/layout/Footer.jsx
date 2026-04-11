import { useState, useEffect } from 'react';
import { Truck, Phone, Mail, MapPin, Clock } from 'lucide-react';
import { FaFacebook, FaFacebookMessenger, FaInstagram, FaYoutube, FaApplePay, FaGooglePay } from 'react-icons/fa6';
import './Footer.css';

// Lazy-load heavy payment icon library (3.2MB) — footer is below the fold
let _PaymentIcon = null;
function usePaymentIcon() {
  const [ready, setReady] = useState(!!_PaymentIcon);
  useEffect(() => {
    if (!_PaymentIcon) {
      import('react-svg-credit-card-payment-icons').then(mod => {
        _PaymentIcon = mod.PaymentIcon;
        setReady(true);
      });
    }
  }, []);
  return ready ? _PaymentIcon : null;
}

const infoStrip = [
  {
    icon: <Truck size={36} strokeWidth={1.5} />,
    title: 'FAST SHIPPING',
    subtitle: 'Worldwide Shipping',
  },
  {
    icon: <Phone size={36} strokeWidth={1.5} />,
    title: 'CALL US',
    subtitle: '03 9574 1710',
    href: 'tel:0395741710',
  },
  {
    icon: <FaFacebookMessenger size={36} />,
    title: 'CHAT WITH US',
    subtitle: 'Live Chat Facebook Messenger',
    href: 'https://m.me/ElusiveRacin',
  },
  {
    icon: <MapPin size={36} strokeWidth={1.5} />,
    title: 'VISIT OUR STORE',
    subtitle: '1/32 Graham Rd\nClayton South VIC 3169',
    href: 'https://maps.google.com/?q=1/32+Graham+Rd+Clayton+South+VIC+3169',
  },
];

const quickLinks = [
  { label: 'Services', href: '/services' },
  { label: 'About Us', href: '/about' },
  { label: 'Contact Us', href: '/contact' },
  { label: 'Wholesale Registration', href: '/wholesale-registration' },
  { label: 'Wholesale Login', href: '/wholesale-login' },
];

const resources = [
  { label: 'My Account', href: '/my-account' },
  { label: 'Track Order', href: '/my-account/orders' },
  { label: 'Create an Account', href: '/my-account/register' },
];

const information = [
  { label: 'Terms and Conditions', href: '/terms' },
  { label: 'Privacy Policy', href: '/terms#privacy' },
  { label: 'Returns Policy', href: '/terms#returns' },
  { label: 'Shipping Policy', href: '/terms#shipping' },
];

export default function Footer() {
  const PaymentIcon = usePaymentIcon();
  return (
    <footer className="footer">

      {/* ── Info strip ── */}
      <div className="footer-info-strip">
        <div className="container footer-info-inner">
          {infoStrip.map((item, i) => (
            <a
              key={i}
              href={item.href || '#'}
              className="footer-info-item"
              target={item.href?.startsWith('http') ? '_blank' : undefined}
              rel={item.href?.startsWith('http') ? 'noopener noreferrer' : undefined}
            >
              <span className="footer-info-icon">{item.icon}</span>
              <span className="footer-info-text">
                <strong>{item.title}</strong>
                <span style={{ whiteSpace: 'pre-line' }}>{item.subtitle}</span>
              </span>
            </a>
          ))}
        </div>
      </div>

      {/* ── Main footer ── */}
      <div className="footer-main">
        <div className="container footer-main-inner">

          {/* Logo + contact details */}
          <div className="footer-brand-col">
            <a href="/">
              <img src="/logo-footer.svg" alt="Elusive Racing" className="footer-logo-img" />
            </a>

            <div className="footer-company-name">Elusive Racing Pty Ltd</div>

            <ul className="footer-contact-list">
              <li>
                <Phone size={14} strokeWidth={2} />
                <a href="tel:0395741710">03 9574 1710</a>
              </li>
              <li>
                <Mail size={14} strokeWidth={2} />
                <a href="mailto:sales@elusiveracing.com.au">sales@elusiveracing.com.au</a>
              </li>
              <li>
                <MapPin size={14} strokeWidth={2} />
                <span>1/32 Graham Road<br />Clayton South VIC 3169</span>
              </li>
              <li>
                <Clock size={14} strokeWidth={2} />
                <span>
                  Mon – Fri / 9:00 AM – 5:00 PM<br />
                  Sat / 9:00 AM – 2:00 PM<br />
                  Sun / Closed<br />&nbsp;
                </span>
              </li>
            </ul>
          </div>

          {/* Quick Links */}
          <div className="footer-col">
            <h3 className="footer-col-title">Quick Links</h3>
            <ul className="footer-col-links">
              {quickLinks.map((l) => (
                <li key={l.href}><a href={l.href} className="footer-col-link">{l.label}</a></li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div className="footer-col">
            <h3 className="footer-col-title">Resources</h3>
            <ul className="footer-col-links">
              {resources.map((l) => (
                <li key={l.href}><a href={l.href} className="footer-col-link">{l.label}</a></li>
              ))}
            </ul>
          </div>

          {/* Information */}
          <div className="footer-col">
            <h3 className="footer-col-title">Information</h3>
            <ul className="footer-col-links">
              {information.map((l) => (
                <li key={l.href}><a href={l.href} className="footer-col-link">{l.label}</a></li>
              ))}
            </ul>
          </div>

        </div>

        {/* Payment icons row */}
        <div className="footer-payments-row">
          <div className="container footer-payments-inner">
            <span className="footer-payments-label">Accepted Payments</span>
            <div className="footer-payments-icons">
              {PaymentIcon && <>
              <span className="payment-chip"><PaymentIcon type="Paypal" format="flatRounded" width={52} /></span>
              <span className="payment-chip"><PaymentIcon type="Visa" format="flatRounded" width={52} /></span>
              <span className="payment-chip"><PaymentIcon type="Mastercard" format="flatRounded" width={52} /></span>
              <span className="payment-chip"><PaymentIcon type="Amex" format="flatRounded" width={52} /></span>
              </>}
              {/* Afterpay — not in library, custom SVG */}
              <span className="payment-chip">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 38" width="52" height="33" role="img" aria-label="Afterpay">
                  <rect width="60" height="38" rx="5" fill="#B2FCE4"/>
                  <text x="30" y="24" textAnchor="middle" fill="#000" fontFamily="Arial,sans-serif" fontWeight="800" fontSize="11">afterpay</text>
                </svg>
              </span>
              {/* Apple Pay */}
              <span className="payment-chip payment-chip--apple">
                <FaApplePay size={30} color="#fff" />
              </span>
              {/* Google Pay */}
              <span className="payment-chip payment-chip--google">
                <FaGooglePay size={30} color="#3c4043" />
              </span>
              {/* Zip */}
              <span className="payment-chip">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 38" width="52" height="33" role="img" aria-label="Zip">
                  <rect width="60" height="38" rx="5" fill="#AA8FFF"/>
                  <text x="30" y="26" textAnchor="middle" fill="#fff" fontFamily="Arial,sans-serif" fontWeight="800" fontSize="16">zip</text>
                </svg>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div className="footer-bottom">
        <div className="container footer-bottom-inner">
          <p className="footer-copyright">
            © {new Date().getFullYear()} Elusive Racing Pty Ltd. All rights reserved.
          </p>
          <div className="footer-social">
            <a href="https://www.facebook.com/ElusiveRacin" target="_blank" rel="noopener noreferrer" className="social-link" aria-label="Facebook">
              <FaFacebook size={18} />
            </a>
            <a href="https://www.instagram.com/elusive_racing/" target="_blank" rel="noopener noreferrer" className="social-link" aria-label="Instagram">
              <FaInstagram size={18} />
            </a>
            <a href="https://www.youtube.com/@elusiveracing" target="_blank" rel="noopener noreferrer" className="social-link" aria-label="YouTube">
              <FaYoutube size={18} />
            </a>
          </div>
        </div>
      </div>

    </footer>
  );
}
