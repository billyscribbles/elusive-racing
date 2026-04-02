import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, X, Tag, Layers } from 'lucide-react';
import { searchProducts as msSearch } from '../../lib/meilisearch';
import { BRANDS } from '../../data/brands';
import { CATEGORIES_FLAT } from '../../data/categories';
import './SearchBar.css';

function getLocalSuggestions(query) {
  const q = query.toLowerCase().trim();
  if (q.length < 2) return { brands: [], categories: [] };

  const brands = BRANDS
    .filter(b => b.name.toLowerCase().includes(q))
    .slice(0, 4);

  const categories = CATEGORIES_FLAT
    .filter(c => c.name.toLowerCase().includes(q))
    .slice(0, 4);

  return { brands, categories };
}

async function searchProducts(query) {
  return msSearch(query, 6);
}

export default function SearchBar() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [suggestions, setSuggestions] = useState({ brands: [], categories: [] });
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResults([]);
      setSuggestions({ brands: [], categories: [] });
      setOpen(false);
      return;
    }

    // Instant local suggestions — no debounce needed
    const local = getLocalSuggestions(query);
    setSuggestions(local);
    setOpen(true);
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
    }, 150);
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
      navigate(`/search?q=${encodeURIComponent(query)}`);
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
          {/* Brand & category suggestions */}
          {(suggestions.brands.length > 0 || suggestions.categories.length > 0) && (
            <div className="search-suggestions">
              {suggestions.brands.map((b) => (
                <a
                  key={b.id}
                  className="search-suggestion-item"
                  href={`/shop?brands=${encodeURIComponent(b.name)}`}
                  onClick={() => { setOpen(false); setQuery(''); }}
                >
                  <Tag size={13} className="search-suggestion-icon" />
                  <span className="search-suggestion-label">{b.name}</span>
                  <span className="search-suggestion-type">Brand</span>
                </a>
              ))}
              {suggestions.categories.map((c) => (
                <a
                  key={c.id}
                  className="search-suggestion-item"
                  href={`/shop?sub=${encodeURIComponent(c.slug)}`}
                  onClick={() => { setOpen(false); setQuery(''); }}
                >
                  <Layers size={13} className="search-suggestion-icon" />
                  <span className="search-suggestion-label">{c.name}</span>
                  <span className="search-suggestion-type">Category</span>
                </a>
              ))}
            </div>
          )}

          {/* Product results */}
          {results.length > 0 && (
            <>
              <div className="search-section-label">Products</div>
              {results.map((product) => (
                <a
                  key={product.id}
                  href={product.href}
                  className="search-result-item"
                  onClick={() => { setOpen(false); setQuery(''); }}
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
                  </div>
                  <div className="search-result-pricing">
                    <span className="search-result-price">${product.price.toFixed(2)}</span>
                    {product.originalPrice && product.originalPrice > product.price && (
                      <span className="search-result-compare">${product.originalPrice.toFixed(2)}</span>
                    )}
                  </div>
                </a>
              ))}
            </>
          )}

          {/* No results at all */}
          {results.length === 0 && suggestions.brands.length === 0 && suggestions.categories.length === 0 && !loading && (
            <div className="search-no-results">No results for "{query}"</div>
          )}

          {!(results.length === 1 && suggestions.brands.length === 0 && suggestions.categories.length === 0) && (
            <a
              href={`/search?q=${encodeURIComponent(query)}`}
              className="search-view-all"
              onClick={() => setOpen(false)}
            >
              View all results for "{query}"
            </a>
          )}
        </div>
      )}
    </form>
  );
}
