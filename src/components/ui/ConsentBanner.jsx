import CookieConsent from 'react-cookie-consent';
import { Link } from 'react-router-dom';
import { setConsent, CONSENT_COOKIE_KEY } from '../../lib/consent';

export default function ConsentBanner() {
  return (
    <CookieConsent
      location="bottom"
      cookieName={CONSENT_COOKIE_KEY}
      expires={365}
      buttonText="Accept"
      declineButtonText="Decline"
      enableDeclineButton
      onAccept={() => setConsent(true)}
      onDecline={() => setConsent(false)}
      style={{
        background: '#111',
        color: '#eee',
        alignItems: 'center',
        padding: '12px 16px',
        fontSize: '14px',
        lineHeight: '1.5',
        borderTop: '1px solid #2a2a2a',
        zIndex: 9999,
      }}
      contentStyle={{ flex: '1 1 auto', margin: '0 16px 0 0' }}
      buttonStyle={{
        background: '#d94040',
        color: '#fff',
        fontWeight: 700,
        fontSize: '13px',
        padding: '10px 22px',
        border: 'none',
        borderRadius: '3px',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        cursor: 'pointer',
      }}
      declineButtonStyle={{
        background: 'transparent',
        color: '#bbb',
        fontSize: '13px',
        padding: '10px 18px',
        border: '1px solid #444',
        borderRadius: '3px',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        cursor: 'pointer',
        marginRight: '10px',
      }}
    >
      We use cookies to keep your cart, remember your vehicle, and (once enabled)
      measure how the site is used. See our{' '}
      <Link to="/terms#privacy" style={{ color: '#f5a97f', textDecoration: 'underline' }}>
        Privacy Policy
      </Link>{' '}
      for details.
    </CookieConsent>
  );
}
