import { useState, useEffect, useRef } from 'react';
import { Search, Loader } from 'lucide-react';
// import { searchProducts as shopifySearch } from '../../lib/shopify'; // TODO: re-enable when Shopify is connected
import DUMMY_PRODUCTS from '../../lib/dummyProducts';
import './SearchBar.css';

function searchProducts(query) {
  const q = query.toLowerCase();
  return Promise.resolve(
    DUMMY_PRODUCTS.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
    ).slice(0, 6)
  );
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
          className="search-input"
          placeholder="Search products..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
          autoComplete="off"
        />
        {loading && <Loader className="search-spinner" size={15} strokeWidth={2} />}
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
