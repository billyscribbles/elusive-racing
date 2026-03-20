import './CategoryGrid.css';

const categories = [
  {
    title: 'Cooling',
    image: 'https://elusiveracing.com.au/wp-content/uploads/home-category-cooling.jpg',
    href: '/category/cooling',
  },
  {
    title: 'Induction',
    image: 'https://elusiveracing.com.au/wp-content/uploads/home-category-induction.jpg',
    href: '/category/engine/induction',
  },
  {
    title: 'Electronics',
    image: 'https://elusiveracing.com.au/wp-content/uploads/home-category-electronic.jpg',
    href: '/category/electronics',
  },
  {
    title: 'Lighting',
    image: 'https://elusiveracing.com.au/wp-content/uploads/home-category-lighting.jpg',
    href: '/category/lighting',
  },
  {
    title: 'Exhaust',
    image: 'https://elusiveracing.com.au/wp-content/uploads/home-category-exhaust.jpg',
    href: '/category/engine/exhaust',
  },
  {
    title: 'Suspension',
    image: 'https://elusiveracing.com.au/wp-content/uploads/home-category-suspension.jpg',
    href: '/category/suspension',
  },
  {
    title: 'Brakes',
    image: 'https://elusiveracing.com.au/wp-content/uploads/home-category-brake.jpg',
    href: '/category/brakes',
  },
];

export default function CategoryGrid() {
  return (
    <section className="category-section">
      <div className="container">
        <div className="category-grid">
          {categories.map((cat) => (
            <a key={cat.href} href={cat.href} className="cat-card">
              <div className="cat-card-img-wrap">
                <img src={cat.image} alt={cat.title} loading="lazy" className="cat-card-img" />
                <div className="cat-card-overlay" />
              </div>
              <div className="cat-card-label">
                <span>{cat.title}</span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
