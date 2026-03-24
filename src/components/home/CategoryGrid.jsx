import './CategoryGrid.css';

const categories = [
  {
    title: 'Cooling',
    image: '/menu/menu-radiator.jpg',
    href: '/category/cooling',
  },
  {
    title: 'Induction',
    image: '/menu/menu-induction.jpg',
    href: '/category/engine/induction',
  },
  {
    title: 'Electronics',
    image: '/menu/menu-ecu.jpg',
    href: '/category/electronics',
  },
  {
    title: 'Lighting',
    image: '/menu/menu-led.jpg',
    href: '/category/lighting',
  },
  {
    title: 'Exhaust',
    image: '/menu/menu-headers.jpg',
    href: '/category/engine/exhaust',
  },
  {
    title: 'Suspension',
    image: '/menu/menu-coilovers.jpg',
    href: '/category/suspension',
  },
  {
    title: 'Brakes',
    image: '/menu/menu-rotors.jpg',
    href: '/category/brakes',
  },
  {
    title: 'Drivetrain',
    image: '/menu/menu-clutch.jpg',
    href: '/category/drivetrain',
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
              <img src={cat.image} alt={cat.title} loading="lazy" className="cat-card-img" />
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
