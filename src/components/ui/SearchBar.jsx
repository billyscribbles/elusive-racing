import { useState, useEffect, useRef } from 'react';
import { Search, Loader2, X } from 'lucide-react';
import { searchProducts as wcSearch } from '../../lib/woocommerce';
import './SearchBar.css';

function mapResult(p) {
  const price = parseFloat(p.priceRange?.minVariantPrice?.amount) || 0;
  const compareAt = parseFloat(p.compareAtPriceRange?.minVariantPrice?.amount) || 0;
  return {
    id: p.id,
    name: p.title,
    brand: p.vendor || '',
    price,
    originalPrice: compareAt > price ? compareAt : null,
    image: p.featuredImage?.url ?? null,
    href: `/products/${p.handle}`,
  };
}

async function searchProducts(query) {
  const results = await wcSearch(query, 6);
  return results.map(mapResult);
}

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchProducts(query.trim(), 6);
        setResults(data);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      setOpen(false);
      window.location.href = `/search?q=${encodeURIComponent(query)}`;
    }
  };

  return (
    <form className="search-form" onSubmit={handleSubmit} ref={wrapperRef}>
      <div className="search-wrapper">
        <Search className="search-icon" size={18} strokeWidth={2} />
        <input
          type="search"
          className={`search-input${loading ? ' search-input--loading' : ''}`}
          placeholder="Search products..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
          autoComplete="off"
        />
        {loading && <Loader2 className="search-spinner" size={17} strokeWidth={2} />}
        {!loading && query.length > 0 && (
          <button
            type="button"
            className="search-clear"
            onClick={() => { setQuery(''); setResults([]); setOpen(false); }}
            aria-label="Clear search"
            tabIndex={-1}
          >
            <X size={14} strokeWidth={2.5} />
          </button>
        )}
      </div>

      {open && (
        <div className="search-dropdown">
          {results.length === 0 ? (
            <div className="search-no-results">No results for "{query}"</div>
          ) : (
            <>
              {results.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    className="search-result-item"
                    onClick={() => { setOpen(false); setQuery(''); window.location.href = product.href; }}
                  >
                    <div className="search-result-image">
                      {product.image ? (
                        <img src={product.image} alt={product.name} />
                      ) : (
                        <div className="search-result-no-image" />
                      )}
                    </div>
                    <div className="search-result-info">
                      <span className="search-result-brand">{product.brand}</span>
                      <span className="search-result-name">{product.name}</span>
                      <div className="search-result-pricing">
                        <span className="search-result-price">${product.price.toFixed(2)}</span>
                        {product.originalPrice && product.originalPrice > product.price && (
                          <span className="search-result-compare">${product.originalPrice.toFixed(2)}</span>
                        )}
                      </div>
                    </div>
                  </button>
              ))}
              <a
                href={`/search?q=${encodeURIComponent(query)}`}
                className="search-view-all"
                onClick={() => setOpen(false)}
              >
                View all results for "{query}"
              </a>
            </>
          )}
        </div>
      )}
    </form>
  );
}
