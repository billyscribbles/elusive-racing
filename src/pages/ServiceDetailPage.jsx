import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';
import { pageTitle, SITE_URL, DEFAULT_IMAGE } from '../lib/seo';
import { services } from '../data/services';
import './ServicesPage.css';
import './ServiceDetailPage.css';

export default function ServiceDetailPage() {
  const { slug } = useParams();
  const service = services.find((s) => s.slug === slug);

  if (!service) {
    return (
      <div className="services-page">
        <Helmet>
          <title>{pageTitle('Service not found')}</title>
          <meta name="robots" content="noindex" />
        </Helmet>
        <section className="sd-not-found">
          <div className="container">
            <p className="sp-hero-label">404</p>
            <h1 className="sd-not-found-title">Service not found</h1>
            <p className="sd-not-found-text">
              We couldn&rsquo;t find that service. Have a look at the full list.
            </p>
            <Link to="/services" className="sp-hero-btn">Back to all services</Link>
          </div>
        </section>
      </div>
    );
  }

  const related = services
    .filter((s) => s.category === service.category && s.slug !== service.slug)
    .slice(0, 3);

  const TITLE = `${service.title} — Elusive Racing`;
  const DESC = service.summary;
  const CATEGORY_LABEL = service.category === 'maintenance' ? 'Maintenance' : 'Performance';

  return (
    <div className="services-page service-detail-page">
      <Helmet>
        <title>{pageTitle(TITLE)}</title>
        <meta name="description" content={DESC} />
        <link rel="canonical" href={`${SITE_URL}/services/${service.slug}`} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${SITE_URL}/services/${service.slug}`} />
        <meta property="og:title" content={pageTitle(TITLE)} />
        <meta property="og:description" content={DESC} />
        <meta property="og:image" content={DEFAULT_IMAGE} />
      </Helmet>

      {/* Hero */}
      <section className="sp-hero sd-hero">
        <div className="sp-hero-bg" style={{ backgroundImage: `url(${service.image})` }} />
        <div className="sp-hero-overlay" />
        <div className="sp-hero-content">
          <h1 className="sp-hero-title">{service.title}</h1>
          <div className="sd-hero-actions">
            <Link to="/book" className="sp-hero-btn">Book This Service</Link>
            <a href="tel:+61395741710" className="sd-hero-btn-secondary">Call 03 9574 1710</a>
          </div>
        </div>
      </section>

      {/* Intro */}
      <section className="sd-intro">
        <div className="container">
          <p className="sd-intro-label">{CATEGORY_LABEL} &middot; {service.tagline}</p>
          <p className="sd-intro-text">{service.intro}</p>
        </div>
      </section>

      {/* Inclusions */}
      <section className="sd-inclusions">
        <div className="container">
          <h2 className="sd-section-title">What&rsquo;s included</h2>
          <ul className="sp-service-list sd-inclusions-list">
            {service.inclusions.map((item) => (
              <li key={item} className="sp-service-list-item">
                <span className="sp-service-tick">✓</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Long-form sections */}
      {service.sections?.length > 0 && (
        <section className="sd-sections">
          <div className="container">
            {service.sections.map((sec, i) => (
              <article key={sec.heading} className={`sd-section ${i % 2 === 1 ? 'sd-section--alt' : ''}`}>
                <h2 className="sd-section-title">{sec.heading}</h2>
                <p className="sd-section-body">{sec.body}</p>
                {sec.bullets && (
                  <ul className="sd-section-bullets">
                    {sec.bullets.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Optional cross-links (used by Performance Parts → /shop, /brands) */}
      {service.extraLinks?.length > 0 && (
        <section className="sd-extra">
          <div className="container sd-extra-inner">
            {service.extraLinks.map((link) => (
              <Link key={link.href} to={link.href} className="sd-extra-link">
                {link.label} →
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Related services */}
      {related.length > 0 && (
        <section className="sd-related">
          <div className="container">
            <h2 className="sd-section-title sd-section-title--center">
              More {CATEGORY_LABEL.toLowerCase()} services
            </h2>
            <div className="sd-related-grid">
              {related.map((r) => (
                <Link key={r.slug} to={`/services/${r.slug}`} className="sd-related-card">
                  <img
                    src={r.image}
                    alt={r.title}
                    className="sd-related-img"
                    loading="lazy"
                    width="400"
                    height="240"
                  />
                  <div className="sd-related-body">
                    <h3 className="sd-related-title">{r.title}</h3>
                    <p className="sd-related-sum">{r.summary}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA banner */}
      <section className="sp-cta">
        <h2 className="sp-cta-title">Ready to book?</h2>
        <p className="sp-cta-sub">Tell us what you need and when. We&rsquo;ll lock in a slot.</p>
        <Link to="/book" className="sp-cta-btn">Book Online</Link>
      </section>
    </div>
  );
}
