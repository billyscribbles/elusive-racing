import './ServicesPage.css';

const services = [
  {
    id: 'general-service',
    title: 'General Service',
    image: '/services-general.jpg',
    tagline: 'Keep it running right.',
    description:
      'Regular servicing is the foundation of any reliable build. Our technicians carry out thorough inspections and factory-standard maintenance using quality OEM and aftermarket parts suited to your Honda. Whether you\'re daily driving or tracking your car on weekends, we\'ll keep it in peak condition.',
    includes: [
      'Engine oil & filter changes',
      'Timing belt & water pump replacement',
      'Coolant, brake fluid & gear oil flushes',
      'Spark plug replacement',
      'Brake pad & rotor inspection',
      'Full vehicle health check',
    ],
  },
  {
    id: 'performance-upgrades',
    title: 'Performance Upgrades',
    image: '/services/IMG_7626.jpg',
    tagline: 'Built for more.',
    description:
      'From a simple intake swap to a full engine build, we have the experience and parts to do it right. We work with all Honda and Acura platforms and stock the brands you trust — K-Tuned, Skunk2, Hondata, HKS, Exedy, and more. Every upgrade is fitted and tested in-house before your car leaves our workshop.',
    includes: [
      'Induction & intake systems',
      'Forced induction (turbo & supercharger kits)',
      'Engine builds (B, K, F, D series)',
      'Clutch & flywheel upgrades',
      'Suspension & coilover installation',
      'Brake upgrades',
      'Drivetrain & LSD fitment',
      'Cooling system upgrades',
    ],
  },
  {
    id: 'dyno-tuning',
    title: 'Dyno Tuning',
    image: '/services-tuning.jpg',
    tagline: 'Power, dialled in.',
    description:
      'A proper tune unlocks what your build is actually capable of. We tune on our in-house dynamometer using industry-leading software including Hondata, KTuner, and Link. We tune for your driving conditions — not just peak numbers — ensuring your engine runs safely and efficiently across the entire rev range.',
    includes: [
      'Hondata FlashPro & KManager tuning',
      'KTuner tuning',
      'Link ECU tuning',
      'Naturally aspirated & forced induction',
      'Power & torque runs',
      'Air/fuel ratio & ignition mapping',
      'Boost control & launch mapping',
      'Pre & post-tune health checks',
    ],
  },
];

const faqs = [
  {
    q: 'Do I need to book in advance?',
    a: 'Yes — we operate by appointment to ensure your car gets dedicated workshop time. Contact us to lock in a date.',
  },
  {
    q: 'Do you work on non-Honda vehicles?',
    a: 'Our expertise and parts inventory is focused on Honda and Acura platforms. Get in touch and we\'ll let you know if we can help.',
  },
  {
    q: 'Can I supply my own parts?',
    a: 'We prefer to source parts ourselves so we can stand behind the quality and fitment. In some cases we can work with customer-supplied parts — just ask.',
  },
  {
    q: 'Where are you located?',
    a: 'We\'re based in Clayton, Melbourne. Contact us for our full workshop address and directions.',
  },
];

export default function ServicesPage() {
  return (
    <div className="services-page">

      {/* Hero */}
      <section className="sp-hero">
        <div className="sp-hero-bg" style={{ backgroundImage: 'url(/services-performance.jpg)' }} />
        <div className="sp-hero-overlay" />
        <div className="sp-hero-content">
          <p className="sp-hero-label">Workshop Services</p>
          <h1 className="sp-hero-title">More Than<br />Just Parts</h1>
          <p className="sp-hero-sub">
            Based in Clayton, Melbourne — we build, service, and tune Hondas the right way.
          </p>
          <a href="/book" className="sp-hero-btn">Book a Service</a>
        </div>
      </section>

      {/* Services */}
      <section className="sp-services">
        <div className="container">
          {services.map((s, i) => (
            <div key={s.id} id={s.id} className={`sp-service-row ${i % 2 === 1 ? 'sp-service-row--reverse' : ''}`}>
              <div className="sp-service-img-wrap">
                <img src={s.image} alt={s.title} className="sp-service-img" />
              </div>
              <div className="sp-service-body">
                <p className="sp-service-tagline">{s.tagline}</p>
                <h2 className="sp-service-title">{s.title}</h2>
                <p className="sp-service-desc">{s.description}</p>
                <ul className="sp-service-list">
                  {s.includes.map((item) => (
                    <li key={item} className="sp-service-list-item">
                      <span className="sp-service-tick">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
                <a href="/book" className="sp-service-btn">Book This Service</a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Other brands */}
      <section className="sp-brands">
        <div className="container sp-brands-inner">
          <div className="sp-brands-text">
            <p className="sp-brands-label">Not Just Honda</p>
            <h2 className="sp-brands-title">We Service All Japanese Makes</h2>
            <p className="sp-brands-desc">
              While our specialty is Honda and Acura, our workshop is equipped to service and modify a wide range of Japanese performance vehicles. Bring us your build — whatever badge it wears.
            </p>
          </div>
          <div className="sp-brands-logos">
            {[
              { name: 'Honda',      logo: '/brands/img-brand-logo-honda.png' },
              { name: 'Toyota',     logo: '/brands/img-brand-logo-toyota.png' },
              { name: 'Mazda',      logo: '/brands/img-brand-logo-mazda.png' },
              { name: 'Nissan',     logo: '/brands/img-brand-logo-nissan.png' },
              { name: 'Subaru',     logo: '/brands/img-brand-logo-subaru-1.png' },
              { name: 'Mitsubishi', logo: '/brands/img-brand-logo-mitsubishi.png' },
            ].map((b) => (
              <div key={b.name} className="sp-brand-chip">
                <img src={b.logo} alt={b.name} className="sp-brand-chip-img" />
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
            {faqs.map((faq) => (
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
        <p className="sp-cta-sub">Get in touch and tell us about your build. We'll take it from there.</p>
        <a href="tel:+61395741710" className="sp-cta-btn">Contact Us</a>
      </section>

    </div>
  );
}
