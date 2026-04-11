import './CategoryGrid.css';

const categories = [
  {
    title: 'Cooling',
    image: '/menu/menu-radiator.jpg',
    href: '/shop?q=cooling',
  },
  {
    title: 'Induction',
    image: '/menu/menu-induction.jpg',
    href: '/shop?q=induction',
  },
  {
    title: 'Electronics',
    image: '/menu/menu-ecu.jpg',
    href: '/shop?q=electronics',
  },
  {
    title: 'Lighting',
    image: '/menu/menu-led.jpg',
    href: '/shop?q=lighting',
  },
  {
    title: 'Exhaust',
    image: '/menu/menu-headers.jpg',
    href: '/shop?q=exhaust',
  },
  {
    title: 'Suspension',
    image: '/menu/menu-coilovers.jpg',
    href: '/shop?q=suspension',
  },
  {
    title: 'Brakes',
    image: '/menu/menu-rotors.jpg',
    href: '/shop?q=brakes',
  },
  {
    title: 'Drivetrain',
    image: '/menu/menu-clutch.jpg',
    href: '/shop?q=drivetrain',
  },
];

export default function CategoryGrid() {
  return (
    <section className="category-section">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">Categories</h2>
          <p className="section-subtitle">Browse our full range of performance parts</p>
        </div>
        <div className="category-grid">
          {categories.map((cat) => (
            <a key={cat.href} href={cat.href} className="cat-card">
              <img src={cat.image} alt={cat.title} loading="lazy" className="cat-card-img" width={400} height={300} />
              <div className="cat-card-overlay" />
              <div className="cat-card-label">
                <span className="cat-card-name">{cat.title}</span>
                <span className="cat-card-cta">Shop Now</span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
