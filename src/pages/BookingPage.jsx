import { useState } from 'react';
import { Link } from 'react-router-dom';
import './BookingPage.css';

const BOOKING_URL = 'https://www.mechanicdesk.com.au/online-booking/index.html?token=2b596cc338e4f3e969aab07b9cf924eb618076c9';

export default function BookingPage() {
  const [agreed, setAgreed] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="booking-page">
      <div className="container">
        <div className="booking-header">
          <div className="booking-breadcrumb">
            <Link to="/">Home</Link>
            <span>/</span>
            <Link to="/services">Services</Link>
            <span>/</span>
            <span>Book a Service</span>
          </div>
          <h1 className="booking-title">Book a Service</h1>
          <p className="booking-subtitle">
            Clayton South workshop — 1/32 Graham Rd, Clayton South VIC 3169 &nbsp;&middot;&nbsp;
            <a href="tel:+61395741710">03 9574 1710</a>
          </p>
        </div>

        {!accepted ? (
          <div className="booking-agreement">
            <h2 className="booking-agreement-title">Before you book</h2>
            <p className="booking-agreement-intro">
              Workshop services are provided subject to our{' '}
              <Link to="/terms#workshop">Workshop Service Terms</Link>. Please read the
              key points below and confirm before proceeding to the booking form.
            </p>
            <ul className="booking-agreement-list">
              <li>
                You are the registered owner of the vehicle, or you have the registered
                owner's authority to authorise work to be carried out.
              </li>
              <li>
                A quote will be provided before any work begins. Any additional work
                identified during the service will not proceed without your authorisation.
              </li>
              <li>
                Vehicles must be collected within 5 business days of notification that the
                work is complete. Storage fees may apply for vehicles left beyond this period.
              </li>
              <li>
                Elusive Racing accepts no responsibility for pre-existing damage or for
                damage caused by circumstances beyond our control. Please remove all
                valuables from your vehicle prior to drop-off.
              </li>
              <li>
                Following any tuning or modification, the safe operation of your vehicle on
                public roads, racetracks, or drag strips remains your responsibility at
                all times.
              </li>
            </ul>
            <label className="booking-agreement-check">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
              />
              <span>
                I have read and agree to the Workshop Service Terms set out in
                {' '}<Link to="/terms#workshop">Section 8 of the Terms &amp; Conditions</Link>.
              </span>
            </label>
            <button
              type="button"
              className="booking-agreement-btn"
              disabled={!agreed}
              onClick={() => setAccepted(true)}
            >
              Continue to booking
            </button>
          </div>
        ) : (
          <div className="booking-frame-wrap">
            {!loaded && (
              <div className="booking-skeleton">
                <div className="booking-skeleton-spinner" />
                <p className="booking-skeleton-text">Loading booking form…</p>
              </div>
            )}
            <iframe
              src={BOOKING_URL}
              title="Book a Service — Elusive Racing"
              className={`booking-frame${loaded ? '' : ' booking-frame--hidden'}`}
              allow="payment"
              onLoad={() => setLoaded(true)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
