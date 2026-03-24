import './ServicesStrip.css';

const services = [
  {
    title: 'General Service',
    description:
      'Keep your Honda running at its best. We handle oil changes, timing belt replacements, fluid flushes, brake inspections, and full workshop servicing — using quality parts matched to your build.',
    image: '/services/MTL03182.jpg',
    href: '/services',
  },
  {
    title: 'Performance Upgrades',
    description:
      'From bolt-on modifications to full engine builds, our team has the expertise to take your Honda further. Induction, fuelling, forced induction, drivetrain — we do it all in-house.',
    image: '/services/IMG_7626.jpg',
    href: '/services',
  },
  {
    title: 'Dyno Tuning',
    description:
      'Maximise power, drivability, and reliability on our in-house dyno. Whether you\'re running stock internals or a built motor, we tune to your goals — not just peak numbers.',
    image: '/services/MTL04308.jpg',
    href: '/services',
  },
];

export default function ServicesStrip() {
  return (
    <section className="services-strip">
      <div className="services-strip-header">
        <p className="services-strip-label">What We Do</p>
        <h2 className="services-strip-title">More Than Just Parts</h2>
        <p className="services-strip-sub">
          Based in Clayton, Melbourne — our workshop handles everything from routine maintenance to full performance builds.
        </p>
      </div>

      <div className="services-strip-grid">
        {services.map((s) => (
          <a key={s.title} href={s.href} className="service-card">
            <div className="service-card-img-wrap">
              <img src={s.image} alt={s.title} className="service-card-img" loading="lazy" />
              <div className="service-card-overlay" />
            </div>
            <div className="service-card-body">
              <h3 className="service-card-title">{s.title}</h3>
              <p className="service-card-desc">{s.description}</p>
              <span className="service-card-cta">Learn More →</span>
            </div>
          </a>
        ))}
      </div>

      <div className="services-strip-footer">
        <a href="/services" className="services-btn">
          View All Services
        </a>
      </div>
    </section>
  );
}
