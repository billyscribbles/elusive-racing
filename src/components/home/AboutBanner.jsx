import { Link } from 'react-router-dom';
import './AboutBanner.css';

export default function AboutBanner() {
  return (
    <section className="about-banner">
      <div className="about-banner-bg" />
      <div className="about-banner-overlay" />
      <div className="container about-banner-content">
        <div className="about-text">
          <span className="about-tag">Melbourne, Australia</span>
          <h2 className="about-title">Your Trusted Honda<br />Performance Specialist</h2>
          <p className="about-desc">
            Elusive Racing is Melbourne's premier destination for Honda performance parts and tuning.
            With over a decade of experience, we stock an extensive range of genuine and aftermarket
            parts from the world's leading manufacturers — from daily drivers to full race builds.
          </p>
          <div className="about-stats">
            <div className="about-stat">
              <strong>150+</strong>
              <span>Brands</span>
            </div>
            <div className="about-stat">
              <strong>10,000+</strong>
              <span>Products</span>
            </div>
            <div className="about-stat">
              <strong>10+</strong>
              <span>Years Experience</span>
            </div>
          </div>
          <Link to="/about" className="about-cta">About Elusive Racing</Link>
        </div>
      </div>
    </section>
  );
}
