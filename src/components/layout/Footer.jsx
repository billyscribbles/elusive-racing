import { lazy, Suspense } from 'react';
import { Truck, Phone, Mail, MapPin, Clock } from 'lucide-react';
import './Footer.css';

const FaFacebook = ({ size = 18 }) => <svg width={size} height={size} viewBox="0 0 512 512" fill="currentColor"><path d="M512 256C512 114.6 397.4 0 256 0S0 114.6 0 256c0 120 82.7 220.8 194.2 248.5V334.2h-56.6V256h56.6v-33.7c0-105.1 46.4-152.3 149.4-152.3 19.4 0 52.8 3.8 66.5 7.6V148s-30.2-3.2-55.7-3.2c-56 0-77.8 21.2-77.8 76.4V256h89.6l-15.4 78.2H276.6v176.3C402.5 493.6 512 385.2 512 256z"/></svg>;
const FaFacebookMessenger = ({ size = 18 }) => <svg width={size} height={size} viewBox="0 0 512 512" fill="currentColor"><path d="M256.6 8C116.5 8 8 110.3 8 248.6c0 72.3 29.7 134.8 78.1 177.9 3.4 2.9 5.6 7.2 5.8 11.9l1.1 37.9c.4 12.5 13.5 20.3 24.7 14.5l42.2-18.6c3.6-1.6 7.6-1.9 11.4-.9 24.4 6.5 50.5 10 77.4 10 140.1 0 248.6-102.3 248.6-240.6S396.7 8 256.6 8zm149.2 185.1l-73 115.6c-11.6 18.4-36.9 22.9-54.1 9.7l-58.1-43.5c-4.4-3.3-10.4-3.3-14.8 0l-78.4 59.5c-10.5 7.9-24.2-4.6-17.1-15.7l73-115.6c11.6-18.4 36.9-22.9 54.1-9.7l58.1 43.5c4.4 3.3 10.4 3.3 14.8 0l78.4-59.5c10.4-8 24.1 4.5 17.1 15.7z"/></svg>;
const FaInstagram = ({ size = 18 }) => <svg width={size} height={size} viewBox="0 0 448 512" fill="currentColor"><path d="M224.1 141c-63.6 0-114.9 51.3-114.9 114.9S160.5 370.9 224.1 370.9 339 319.5 339 255.9 287.7 141 224.1 141zm0 189.6c-41.1 0-74.7-33.5-74.7-74.7s33.5-74.7 74.7-74.7 74.7 33.5 74.7 74.7-33.6 74.7-74.7 74.7zm146.4-194.3c0 14.9-12 26.8-26.8 26.8-14.9 0-26.8-12-26.8-26.8s12-26.8 26.8-26.8 26.8 12 26.8 26.8zm76.1 27.2c-1.7-35.9-9.9-67.7-36.2-93.9-26.2-26.2-58-34.4-93.9-36.2-37-2.1-147.9-2.1-184.9 0-35.8 1.7-67.6 9.9-93.9 36.1s-34.4 58-36.2 93.9c-2.1 37-2.1 147.9 0 184.9 1.7 35.9 9.9 67.7 36.2 93.9s58 34.4 93.9 36.2c37 2.1 147.9 2.1 184.9 0 35.9-1.7 67.7-9.9 93.9-36.2 26.2-26.2 34.4-58 36.2-93.9 2.1-37 2.1-147.8 0-184.8zM398.8 388c-7.8 19.6-22.9 34.7-42.6 42.6-29.5 11.7-99.5 9-132.1 9s-102.7 2.6-132.1-9c-19.6-7.8-34.7-22.9-42.6-42.6-11.7-29.5-9-99.5-9-132.1s-2.6-102.7 9-132.1c7.8-19.6 22.9-34.7 42.6-42.6 29.5-11.7 99.5-9 132.1-9s102.7-2.6 132.1 9c19.6 7.8 34.7 22.9 42.6 42.6 11.7 29.5 9 99.5 9 132.1s2.7 102.7-9 132.1z"/></svg>;
const FaYoutube = ({ size = 18 }) => <svg width={size} height={size} viewBox="0 0 576 512" fill="currentColor"><path d="M549.7 124.1c-6.3-23.7-24.8-42.3-48.3-48.6C458.8 64 288 64 288 64S117.2 64 74.6 75.5c-23.5 6.3-42 24.9-48.3 48.6C14.9 167 14.9 256.4 14.9 256.4s0 89.4 11.4 132.3c6.3 23.7 24.8 41.5 48.3 47.8C117.2 448 288 448 288 448s170.8 0 213.4-11.5c23.5-6.3 42-24.2 48.3-47.8 11.4-42.9 11.4-132.3 11.4-132.3s0-89.4-11.4-132.3z"/></svg>;
const FaApplePay = ({ size = 30, color = '#fff' }) => <svg width={size} height={size} viewBox="0 0 640 512" fill={color}><path d="M116.9 158.5c-7.5 10.6-19.8 18.9-32.1 18.7-1.5-12.4 4.5-25.6 11.6-33.8 7.5-10.9 20.6-18.5 31.2-19 1.3 12.8-3.7 25.4-10.7 34.1zM167.5 198c-1.8-25.4 20.7-37.6 21.6-38.2-11.8-17.2-30.1-19.6-36.6-19.9-15.6-1.6-30.4 9.2-38.4 9.2s-20-9-33.1-8.7c-17 .3-32.7 9.9-41.5 25.1-17.7 30.7-4.5 76.3 12.7 101.2 8.5 12.2 18.6 25.9 31.8 25.4 12.8-.5 17.6-8.3 33.1-8.3s19.8 8.3 33.3 8c13.7-.3 22.4-12.5 30.8-24.7 9.7-14.2 13.7-27.9 14-28.6-.3-.1-26.8-10.3-27.1-40.9-.3-25.6 20.9-37.8 21.9-38.6zM337.5 131.5v259h-31.2V311c0-35.5-26.8-58.3-61.3-58.3-34.1 0-60 23.1-60 58.9v79h-31.2V256.5c0-63.2 42.8-99.8 91.3-99.8 48.7 0 92.4 37.1 92.4 100.8v-126h31.2-31.2zm33.1 141.8c0-36.2 24-62.2 58.6-62.2 34.5 0 58.8 25.7 58.8 62.2 0 36.3-24.3 62.2-58.8 62.2-34.6 0-58.6-25.9-58.6-62.2zm87.8 0c0-23.8-10.3-39.8-29.5-39.8s-29.5 16-29.5 39.8 10.3 39.6 29.5 39.6 29.5-15.8 29.5-39.6zM640 313.4c0-38.6-28.6-63.3-63.3-63.3-38.6 0-67 26.3-67 64.8s28 63.3 65.5 63.3c19.5 0 37.1-6.6 49.3-19.8l-18.3-14.7c-8.3 8.6-18.3 13.1-30.5 13.1-17.3 0-29.5-9.5-32.6-28.3h86.5c.1-2.1.4-7 .4-10.1v-5zm-87.8-9.8c2.1-15.8 13.3-27.3 29-27.3 16.6 0 27.3 11.1 28.3 27.3h-57.3z"/></svg>;
const FaGooglePay = ({ size = 30, color = '#3c4043' }) => <svg width={size} height={size} viewBox="0 0 640 512" fill={color}><path d="M105.72 215v41.25h57.1a49.66 49.66 0 01-21.14 32.6c-9.54 6.45-21.8 10.28-36 10.28-27.68 0-51.09-18.7-59.48-43.89a65.16 65.16 0 010-41.28c8.39-25.19 31.8-43.89 59.48-43.89 15.41 0 29.4 5.28 40.36 15.56l29.04-29.04C153.16 136.36 126.68 124.7 95.31 124.7c-46.54 0-86.62 26.69-106.4 65.72a125.91 125.91 0 000 114.84c19.78 39.03 59.86 65.72 106.4 65.72 31.37 0 57.85-10.37 77.14-28.15 23.71-21.74 37.47-53.82 37.47-91.79a120.8 120.8 0 00-1.73-20.91zm196.3-21.4c-16.47 0-32.98 6.5-44.93 19.55l23.72 23.72c7.32-8.13 17.35-11.88 26.38-11.88 15.3 0 30.63 10.5 30.63 27.83v3.57c-8.67-4.95-20.04-8.3-33.39-8.3-30.66 0-61.78 16.87-61.78 48.38 0 28.73 25.1 47.22 53.2 47.22 21.51 0 33.43-9.67 40.78-20.97h1.1v16.59h32.54V256.78c0-37.41-28.1-63.18-68.25-63.18zm-4.06 119.35c-10.5 0-25.13-5.28-25.13-18.3 0-16.59 18.3-22.95 34.11-22.95 14.16 0 20.83 3.06 29.4 7.16-2.53 19.67-20.91 34.09-38.38 34.09zm175.71-113.4L432 289.21l-41.74-89.66h-36l60.24 137.1-34.37 76.35h34.71L523.9 199.55zM302.36 384.44h33.33V137.32h-33.33z"/></svg>;

const PaymentIcons = lazy(() => import('./PaymentIcons'));

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
              <Suspense fallback={null}><PaymentIcons /></Suspense>
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
