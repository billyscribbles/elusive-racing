import { Link } from 'react-router-dom';
import { featuredBrands } from '../../data/navigation';
import './BrandsSection.css';

export default function BrandsSection() {
  const displayBrands = featuredBrands;

  return (
    <section className="brands-section">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">Featured Brands</h2>
          <p className="section-subtitle">Partnered with the world's best performance manufacturers</p>
        </div>
        <div className="brands-showcase">
          {displayBrands.map((brand) => (
            <Link key={brand.name} to={brand.href} className="brand-showcase-item" title={brand.name}>
              <img
                src={brand.logo}
                alt={brand.name}
                loading="lazy"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'block';
                }}
              />
              <span className="brand-name-fallback" style={{ display: 'none' }}>{brand.name}</span>
            </Link>
          ))}
        </div>
        <div className="brands-cta">
          <Link to="/brands" className="btn-outline">View All Brands</Link>
        </div>
      </div>
    </section>
  );
}
