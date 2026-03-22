import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { brands } from '../data/navigation';
import './BrandsPage.css';

export default function BrandsPage() {
  const [query, setQuery] = useState('');

  const filtered = query.trim()
    ? brands.filter(b => b.name.toLowerCase().includes(query.toLowerCase()))
    : brands;

  return (
    <div className="brands-page">
      <div className="container">
        <div className="brands-page-header">
          <div className="brands-page-breadcrumb">
            <Link to="/">Home</Link>
            <span>/</span>
            <span>Brands</span>
          </div>
          <h1 className="brands-page-title">All Brands</h1>
          <p className="brands-page-subtitle">{brands.length} performance brands — click any to shop their range</p>
          <div className="brands-page-search">
            <Search size={16} className="brands-search-icon" />
            <input
              type="text"
              placeholder="Search brands..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="brands-search-input"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="brands-no-results">No brands found for "{query}"</div>
        ) : (
          <div className="brands-page-grid">
            {filtered.map(brand => (
              <Link key={brand.name} to={brand.href} className="brands-page-card" title={brand.name}>
                <div className="brands-page-logo">
                  <img
                    src={brand.logo}
                    alt={brand.name}
                    loading="lazy"
                    onError={e => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <span className="brands-page-fallback" style={{ display: 'none' }}>{brand.name}</span>
                </div>
                <span className="brands-page-name">{brand.name}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
