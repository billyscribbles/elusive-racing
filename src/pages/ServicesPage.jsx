import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { pageTitle, SITE_URL, DEFAULT_IMAGE } from '../lib/seo';
import { services, servicesFaqs } from '../data/services';
import './ServicesPage.css';

const TITLE = 'Workshop Services — Servicing, Tuning, Builds, Fabrication';
const DESC =
  'Honda and JDM workshop services in Clayton South, Melbourne. General, major and logbook servicing; brakes, suspension, tyres and wheel alignment, drivetrain and transmission; engine builds, tuning, exhaust fabrication, performance parts and race track support.';

const OTHER_BRANDS = [
  { name: 'Honda',      logo: '/brands/img-brand-logo-honda.png' },
  { name: 'Toyota',     logo: '/brands/img-brand-logo-toyota.png' },
  { name: 'Mazda',      logo: '/brands/img-brand-logo-mazda.png' },
  { name: 'Nissan',     logo: '/brands/img-brand-logo-nissan.png' },
  { name: 'Subaru',     logo: '/brands/img-brand-logo-subaru-1.png' },
  { name: 'Mitsubishi', logo: '/brands/img-brand-logo-mitsubishi.png' },
];

export default function ServicesPage() {
  return (
    <div className="services-page">
      <Helmet>
        <title>{pageTitle(TITLE)}</title>
        <meta name="description" content={DESC} />
        <link rel="canonical" href={`${SITE_URL}/services`} />
        <meta property="og:type"        content="website" />
        <meta property="og:url"         content={`${SITE_URL}/services`} />
        <meta property="og:title"       content={pageTitle(TITLE)} />
        <meta property="og:description" content={DESC} />
        <meta property="og:image"       content={DEFAULT_IMAGE} />
      </Helmet>

      {/* Hero */}
      <section className="sp-hero">
        <div className="sp-hero-bg" style={{ backgroundImage: 'url(/services-performance.jpg)' }} />
        <div className="sp-hero-overlay" />
        <div className="sp-hero-content">
          <p className="sp-hero-label">Workshop Services</p>
          <h1 className="sp-hero-title">Built, Serviced<br />and Tuned in House</h1>
          <p className="sp-hero-sub">
            Routine servicing, performance builds, custom fabrication and dyno tuning &mdash; all under one roof in Clayton South, Melbourne.
          </p>
          <Link to="/book" className="sp-hero-btn">Book a Service</Link>
        </div>
      </section>

      {/* Services grid */}
      <section className="sp-services">
        <div className="container">
          <div className="sp-services-header">
            <h2 className="sp-section-heading">All Services</h2>
            <p className="sp-section-sub">
              Thirteen services across maintenance and performance. Click any one for the full breakdown of what&rsquo;s included and how the work is done.
            </p>
          </div>
          <div className="sp-services-grid">
            {services.map((s) => (
              <article key={s.slug} className="sp-service-card">
                <Link to={`/services/${s.slug}`} className="sp-service-card-img-link" aria-label={s.title}>
                  <img
                    src={s.image}
                    alt={s.title}
                    className="sp-service-card-img"
                    loading="lazy"
                    width="640"
                    height="400"
                  />
                </Link>
                <div className="sp-service-card-body">
                  <p className="sp-service-card-cat">
                    {s.category === 'maintenance' ? 'Maintenance' : 'Performance'}
                  </p>
                  <h3 className="sp-service-card-title">
                    <Link to={`/services/${s.slug}`} className="sp-service-card-title-link">
                      {s.title}
                    </Link>
                  </h3>
                  <p className="sp-service-card-summary">{s.summary}</p>
                  <ul className="sp-service-card-list">
                    {s.inclusions.slice(0, 4).map((item) => (
                      <li key={item}>
                        <span className="sp-service-tick">✓</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                  <div className="sp-service-card-actions">
                    <Link to={`/services/${s.slug}`} className="sp-service-card-link">
                      Learn more →
                    </Link>
                    <Link to="/book" className="sp-service-card-btn">Book</Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Other brands */}
      <section className="sp-brands">
        <div className="container sp-brands-inner">
          <div className="sp-brands-text">
            <p className="sp-brands-label">Not Just Honda</p>
            <h2 className="sp-brands-title">We Service All Japanese Makes</h2>
            <p className="sp-brands-desc">
              Our depth is on Honda and Acura, but the workshop is set up to service and modify a wide range of Japanese performance vehicles. Bring us your build &mdash; whatever badge it wears.
            </p>
          </div>
          <div className="sp-brands-logos">
            {OTHER_BRANDS.map((b) => (
              <div key={b.name} className="sp-brand-chip">
                <img src={b.logo} alt={b.name} className="sp-brand-chip-img" loading="lazy" />
                <span className="sp-brand-chip-name">{b.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="sp-faq">
        <div className="container sp-faq-inner">
          <h2 className="sp-faq-title">Common Questions</h2>
          <div className="sp-faq-grid">
            {servicesFaqs.map((faq) => (
              <div key={faq.q} className="sp-faq-item">
                <h3 className="sp-faq-q">{faq.q}</h3>
                <p className="sp-faq-a">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA banner */}
      <section className="sp-cta">
        <h2 className="sp-cta-title">Ready to get started?</h2>
        <p className="sp-cta-sub">Get in touch and tell us about your build. We&rsquo;ll take it from there.</p>
        <a href="tel:+61395741710" className="sp-cta-btn">Contact Us</a>
      </section>

    </div>
  );
}
