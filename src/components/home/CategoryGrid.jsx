import './CategoryGrid.css';

const categories = [
  {
    title: 'Cooling',
    image: 'https://elusiveracing.com.au/wp-content/uploads/menu-radiator.jpg',
    href: '/category/cooling',
  },
  {
    title: 'Induction',
    image: 'https://elusiveracing.com.au/wp-content/uploads/menu-induction.jpg',
    href: '/category/engine/induction',
  },
  {
    title: 'Electronics',
    image: 'https://elusiveracing.com.au/wp-content/uploads/menu-ecu.jpg',
    href: '/category/electronics',
  },
  {
    title: 'Lighting',
    image: 'https://elusiveracing.com.au/wp-content/uploads/menu-led.jpg',
    href: '/category/lighting',
  },
  {
    title: 'Exhaust',
    image: 'https://elusiveracing.com.au/wp-content/uploads/menu-headers.jpg',
    href: '/category/engine/exhaust',
  },
  {
    title: 'Suspension',
    image: 'https://elusiveracing.com.au/wp-content/uploads/menu-coilovers.jpg',
    href: '/category/suspension',
  },
  {
    title: 'Brakes',
    image: 'https://elusiveracing.com.au/wp-content/uploads/menu-rotors.jpg',
    href: '/category/brakes',
  },
  {
    title: 'Drivetrain',
    image: 'https://elusiveracing.com.au/wp-content/uploads/menu-clutch.jpg',
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
