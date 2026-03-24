import { Link } from 'react-router-dom';
import { Wrench, Gauge, Package, MapPin, Phone, Instagram } from 'lucide-react';
import './AboutPage.css';

const stats = [
  { value: '10+',    label: 'Years in the game' },
  { value: '116',    label: 'Brands stocked' },
  { value: '10,000+', label: 'Parts available' },
  { value: '3',      label: 'In-house services' },
];

const values = [
  {
    icon: <Wrench size={28} />,
    title: 'We Actually Build Cars',
    body: 'We\'re not a warehouse fulfilment centre. Every part we sell is something we\'d fit to our own builds. Our team lives and breathes Honda performance — weekends at the track, late nights in the workshop, deep in forums debating cam specs.',
  },
  {
    icon: <Package size={28} />,
    title: 'Stocked, Not Ordered',
    body: 'We carry serious inventory. Over 10,000 parts from 116 brands — from genuine Honda OEM to the best aftermarket names in the world. If we list it, it\'s because it works. We don\'t stock anything we wouldn\'t run ourselves.',
  },
  {
    icon: <Gauge size={28} />,
    title: 'Full-Service Under One Roof',
    body: 'Parts, labour, and tuning — all done in-house at Clayton South. We tune on our own dyno using Hondata, KTuner, and Link. Your build starts and finishes with us, and we stand behind every job we do.',
  },
];

const milestones = [
  {
    year: 'The Beginning',
    text: 'Elusive Racing started the way most great shops do — out of pure obsession. A workshop, a Honda, and a burning need to make it faster. What began as a personal project quickly turned into something bigger when friends started asking for parts, advice, and eventually, hands-on help.',
  },
  {
    year: 'Building a Name',
    text: 'Word spread through Melbourne\'s Honda community. We earned a reputation for knowing the platform inside out — not just selling parts, but understanding how they work together. B series, K series, F series — we\'ve built them all and helped hundreds of customers do the same.',
  },
  {
    year: 'Clayton South',
    text: 'We found our home at 1/32 Graham Rd, Clayton South — a proper workshop where we could do things right. We invested in an in-house dynamometer, expanded our parts inventory, and built a team that shared the same obsession for Honda performance.',
  },
  {
    year: 'Today',
    text: 'Elusive Racing is Melbourne\'s go-to destination for Honda performance. We serve everyone from first-time owners fitting their first intake to seasoned builders chasing 500+ wheel horsepower. The obsession hasn\'t changed — we\'ve just got better at channelling it.',
  },
];

export default function AboutPage() {
  return (
    <div className="about-page">

      {/* Hero */}
      <section className="ap-hero">
        <div className="ap-hero-bg" />
        <div className="ap-hero-overlay" />
        <div className="container ap-hero-content">
          <span className="ap-hero-label">Our Story</span>
          <h1 className="ap-hero-title">Built on a<br />Honda Obsession</h1>
          <p className="ap-hero-sub">
            Melbourne's premier Honda performance workshop — parts, labour, and tuning under one roof in Clayton South.
          </p>
        </div>
      </section>

      {/* Intro */}
      <section className="ap-intro">
        <div className="container ap-intro-inner">
          <div className="ap-intro-text">
            <span className="ap-section-label">Who We Are</span>
            <h2 className="ap-section-title">More Than Just a Parts Shop</h2>
            <p>
              Elusive Racing isn't your average online retailer. We're a team of Honda enthusiasts who decided to build the shop we always wished existed — one that stocks the right parts, knows the platforms, and can actually fit and tune what we sell.
            </p>
            <p>
              Over more than a decade in the Melbourne performance scene, we've helped build street cars, track weapons, time attack monsters, and everything in between. We've seen what works, what doesn't, and what makes the difference between a car that performs and one that just looks the part.
            </p>
            <p>
              From our workshop in Clayton South, we run a full-service operation: an online store stocking 116 brands and over 10,000 parts, an in-house workshop for fitting and mechanical work, and a dynamometer for proper back-to-back tuning. If it's Honda performance, we do it.
            </p>
          </div>
          <div className="ap-stats-grid">
            {stats.map((s) => (
              <div key={s.label} className="ap-stat">
                <strong>{s.value}</strong>
                <span>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Story timeline */}
      <section className="ap-story">
        <div className="container">
          <span className="ap-section-label">The Journey</span>
          <h2 className="ap-section-title">How We Got Here</h2>
          <div className="ap-timeline">
            {milestones.map((m) => (
              <div key={m.year} className="ap-timeline-item">
                <div className="ap-timeline-marker" />
                <div className="ap-timeline-body">
                  <h3 className="ap-timeline-year">{m.year}</h3>
                  <p className="ap-timeline-text">{m.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="ap-values">
        <div className="container">
          <span className="ap-section-label">What Sets Us Apart</span>
          <h2 className="ap-section-title">Why Elusive Racing</h2>
          <div className="ap-values-grid">
            {values.map((v) => (
              <div key={v.title} className="ap-value-card">
                <div className="ap-value-icon">{v.icon}</div>
                <h3 className="ap-value-title">{v.title}</h3>
                <p className="ap-value-body">{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Workshop */}
      <section className="ap-workshop">
        <div className="container ap-workshop-inner">
          <div className="ap-workshop-text">
            <span className="ap-section-label">The Workshop</span>
            <h2 className="ap-section-title">Come and See Us</h2>
            <p>
              Our Clayton South workshop is where it all happens. Properly equipped, professionally run, and staffed by people who care deeply about getting the result right. We operate by appointment to make sure your car gets the dedicated time it deserves.
            </p>
            <p>
              Whether you're dropping in to pick up parts, booked in for a service, or bringing your car in for a full build — you'll always deal with someone who knows what they're talking about.
            </p>
            <div className="ap-contact-list">
              <div className="ap-contact-item">
                <MapPin size={16} />
                <span>1/32 Graham Rd, Clayton South VIC 3169</span>
              </div>
              <div className="ap-contact-item">
                <Phone size={16} />
                <a href="tel:+61395741710">03 9574 1710</a>
              </div>
              <div className="ap-contact-item">
                <Instagram size={16} />
                <a href="https://www.instagram.com/elusive_racing/" target="_blank" rel="noopener noreferrer">@elusive_racing</a>
              </div>
            </div>
          </div>
          <div className="ap-workshop-img-wrap">
            <img src="/services/MTL03726-scaled.jpg" alt="Elusive Racing Workshop" className="ap-workshop-img" />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="ap-cta">
        <div className="container ap-cta-inner">
          <h2 className="ap-cta-title">Ready to build?</h2>
          <p className="ap-cta-sub">Browse our full range of Honda performance parts or book your car in for a service, upgrade, or tune.</p>
          <div className="ap-cta-btns">
            <Link to="/shop" className="ap-cta-btn ap-cta-btn--primary">Shop Parts</Link>
            <Link to="/book" className="ap-cta-btn ap-cta-btn--outline">Book a Service</Link>
          </div>
        </div>
      </section>

    </div>
  );
}
