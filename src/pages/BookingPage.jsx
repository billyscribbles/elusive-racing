import { Link } from 'react-router-dom';
import './BookingPage.css';

const BOOKING_URL = 'https://www.mechanicdesk.com.au/online-booking/index.html?token=2b596cc338e4f3e969aab07b9cf924eb618076c9';

export default function BookingPage() {
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

        <div className="booking-frame-wrap">
          <iframe
            src={BOOKING_URL}
            title="Book a Service — Elusive Racing"
            className="booking-frame"
            allow="payment"
            loading="lazy"
          />
        </div>
      </div>
    </div>
  );
}
