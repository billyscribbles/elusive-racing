import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X, ChevronDown, ChevronRight, Search, Tag, ChevronLeft, ShoppingBag } from 'lucide-react';
import useCartStore from '../store/cartStore';
import { getProducts, getCollections, getBrands } from '../lib/woocommerce';
import './ShopPage.css';

// ── Data ─────────────────────────────────────────────────────────────────────


function mapProduct(node) {
  const variant = node.variants?.[0];
  const price = parseFloat(node.priceRange.minVariantPrice.amount) || 0;
  const compareAt = parseFloat(node.compareAtPriceRange?.minVariantPrice?.amount ?? 0);
  const isBackorder = node.stockStatus === 'onbackorder' ||
    (node.tags ?? []).some((t) => t.toLowerCase().includes('backorder'));
  return {
    id: node.id,
    name: node.title,
    brand: node.vendor || '',
    sku: node.sku || '',
    price,
    originalPrice: compareAt > price ? compareAt : null,
    image: node.featuredImage?.url ?? null,
    href: `/products/${node.handle}`,
    description: node.description || '',
    categories: node.categories ?? [],
    tags: node.tags ?? [],
    backorder: isBackorder,
    dateCreated: node.dateCreated || '',
    variantId: variant?.id ?? null,
  };
}

const SORT_OPTIONS = [
  { label: 'Best Selling',    value: 'best-selling' },
  { label: 'Newest',          value: 'newest'       },
  { label: 'Price: Low–High', value: 'price-asc'    },
  { label: 'Price: High–Low', value: 'price-desc'   },
  { label: 'A–Z',             value: 'a-z'          },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseList(str) {
  return str ? str.split(',').map((s) => s.trim()).filter(Boolean) : [];
}


// ── Sub-components ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="shop-product-card shop-product-card--skeleton">
      <div className="shop-product-image-wrap">
        <div className="skeleton-block skeleton-image" />
      </div>
      <div className="shop-product-info">
        <div className="skeleton-block skeleton-brand" />
        <div className="skeleton-block skeleton-name-1" />
        <div className="skeleton-block skeleton-name-2" />
        <div className="skeleton-block skeleton-price" />
      </div>
      <div className="shop-product-actions">
        <div className="skeleton-block skeleton-btn" />
      </div>
    </div>
  );
}

function buildPageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, current, current - 1, current + 1].filter((n) => n >= 1 && n <= total));
  return Array.from(pages).sort((a, b) => a - b).reduce((acc, n, i, arr) => {
    if (i > 0 && n - arr[i - 1] > 1) acc.push('...');
    acc.push(n);
    return acc;
  }, []);
}

function Dropdown({ value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = options.find((o) => String(o.value) === String(value));

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="dd" ref={ref}>
      <button className="dd-trigger" onClick={() => setOpen((o) => !o)}>
        <span>{selected?.label ?? value}</span>
        <ChevronDown size={12} className={`dd-chevron${open ? ' dd-chevron--open' : ''}`} />
      </button>
      {open && (
        <div className="dd-menu">
          {options.map((o) => (
            <button
              key={o.value}
              className={`dd-item${String(o.value) === String(value) ? ' dd-item--active' : ''}`}
              onClick={() => { onChange(o.value); setOpen(false); }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CollapsibleSection({ title, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="shop-filter-section">
      <button className="shop-filter-section-header" onClick={() => setOpen((o) => !o)}>
        <span className="shop-filter-title">{title}</span>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>
      {open && <div className="shop-filter-section-body">{children}</div>}
    </div>
  );
}

function ProductCard({ product, index = 0 }) {
  const { addItem, openCart } = useCartStore();
  const [added, setAdded] = useState(false);

  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : null;

  function handleAddToCart(e) {
    e.preventDefault();
    e.stopPropagation();
    addItem(product);
    openCart();
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <a href={product.href} className="shop-product-card shop-product-card--loaded" style={{ animationDelay: `${Math.min(index, 11) * 40}ms` }}>
      <div className="shop-product-image-wrap">
        {product.image
          ? <img src={product.image} alt={product.name} loading="lazy" className="shop-product-image" />
          : <div className="shop-product-no-image" />
        }
        {product.originalPrice && (
          <span className="shop-product-badge shop-product-badge--sale">Sale</span>
        )}
        {product.backorder && (
          <span className="shop-product-badge shop-product-badge--backorder">Backorder</span>
        )}
      </div>
      <div className="shop-product-info">
        <span className="shop-product-brand">{product.brand}</span>
        <h3 className="shop-product-name">{product.name}</h3>
        <p className="shop-product-backorder">
          {product.backorder ? 'Available on backorder' : ''}
        </p>
        <div className="shop-product-pricing">
          <span className="shop-product-price">${product.price.toFixed(2)}</span>
          {product.originalPrice && (
            <>
              <span className="shop-product-original">${product.originalPrice.toFixed(2)}</span>
              <span className="shop-product-discount">-{discount}%</span>
            </>
          )}
        </div>
      </div>
      <div className="shop-product-actions">
        <button
          className={`shop-quick-add${added ? ' shop-quick-add--added' : ''}`}
          onClick={handleAddToCart}
        >
          {added ? <>&#10003; Added</> : <><ShoppingBag size={13} /> Add to Cart</>}
        </button>
      </div>
    </a>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const qParam         = searchParams.get('q')         ?? '';
  const brandsParam    = searchParams.get('brands')    ?? '';
  const subParam       = searchParams.get('sub')       ?? '';
  const saleParam      = searchParams.get('sale')      ?? '';
  const instockParam   = searchParams.get('instock')   ?? '';
  const backorderParam = searchParams.get('backorder') ?? '';
  const sortParam      = searchParams.get('sort')      ?? 'best-selling';
  const minParam       = searchParams.get('min_price') ?? '';
  const maxParam       = searchParams.get('max_price') ?? '';
  const pageParam      = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const perPageParam   = parseInt(searchParams.get('per_page') ?? '12', 10);

  const activeBrands   = parseList(brandsParam);

  const [products, setProducts]     = useState([]);
  const [categories, setCategories] = useState([]);
  const [allBrands, setAllBrands]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [totalProducts, setTotalProducts] = useState(0);
  const [apiTotalPages, setApiTotalPages] = useState(1);

  // Fetch categories and brands once on mount
  useEffect(() => {
    getCollections(100).then(setCategories).catch(() => {});
    getBrands().then(setAllBrands).catch(() => {});
  }, []);

  // Refetch products whenever any filter/sort/page changes
  useEffect(() => {
    setLoading(true);
    const catObj = categories.find((c) => c.handle === subParam);
    getProducts({
      query:    qParam,
      count:    perPageParam,
      page:     pageParam,
      category: catObj?.id ?? '',
      sort:     sortParam,
      onSale:   saleParam === '1',
      inStock:  instockParam === '1',
      minPrice: minParam,
      maxPrice: maxParam,
    })
      .then((data) => {
        const mapped = (data.edges ?? []).map(({ node }) => mapProduct(node));
        setProducts(mapped);
        setTotalProducts(data.total ?? 0);
        setApiTotalPages(data.totalPages ?? 1);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [qParam, subParam, saleParam, instockParam, minParam, maxParam, sortParam, pageParam, perPageParam, categories.length]);

  // Brand filter is client-side (WC has no native brand API param)
  const filtered = useMemo(
    () => activeBrands.length
      ? products.filter((p) => activeBrands.includes(p.brand))
      : products,
    [products, brandsParam]
  );

  const vendors = allBrands.length
    ? allBrands
    : [...new Set(products.map((p) => p.brand).filter(Boolean))].sort();

  const totalPages  = activeBrands.length ? Math.max(1, Math.ceil(filtered.length / perPageParam)) : apiTotalPages;
  const currentPage = pageParam;
  const paginated   = activeBrands.length
    ? filtered.slice((currentPage - 1) * perPageParam, currentPage * perPageParam)
    : filtered;

  // Uncontrolled ref for search — avoids re-rendering on every keystroke
  const searchInputRef = useRef(null);
  const [localMin,    setLocalMin]    = useState(minParam);
  const [localMax,    setLocalMax]    = useState(maxParam);
  const [drawerOpen,  setDrawerOpen]  = useState(false);

  useEffect(() => {
    if (searchInputRef.current) searchInputRef.current.value = qParam;
  }, [qParam]);
  useEffect(() => { setLocalMin(minParam); setLocalMax(maxParam); }, [minParam, maxParam]);

  function setParam(key, value) {
    const p = Object.fromEntries(searchParams.entries());
    if (value) p[key] = value; else delete p[key];
    delete p.page; // reset to page 1 on any filter change
    setSearchParams(p);
  }

  function goToPage(n) {
    const p = Object.fromEntries(searchParams.entries());
    if (n === 1) delete p.page; else p.page = String(n);
    setSearchParams(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function setPerPage(n) {
    const p = Object.fromEntries(searchParams.entries());
    p.per_page = String(n);
    delete p.page;
    setSearchParams(p);
  }

  function toggleBrand(brand) {
    const next = activeBrands.includes(brand)
      ? activeBrands.filter((b) => b !== brand)
      : [...activeBrands, brand];
    setParam('brands', next.join(','));
  }

  function toggleParam(key) {
    const p = Object.fromEntries(searchParams.entries());
    if (p[key]) delete p[key]; else p[key] = '1';
    delete p.page;
    setSearchParams(p);
  }


  function applySearch() {
    const val = searchInputRef.current?.value.trim() ?? '';
    setParam('q', val);
    setDrawerOpen(false);
  }

  function applyPrice() {
    const p = Object.fromEntries(searchParams.entries());
    if (localMin) p.min_price = localMin; else delete p.min_price;
    if (localMax) p.max_price = localMax; else delete p.max_price;
    setSearchParams(p);
  }

  function clearFilters() {
    if (searchInputRef.current) searchInputRef.current.value = '';
    setLocalMin('');
    setLocalMax('');
    setSearchParams({});
    setDrawerOpen(false);
  }

  function setSort(value) {
    const params = Object.fromEntries(searchParams.entries());
    if (value === 'best-selling') delete params.sort; else params.sort = value;
    setSearchParams(params);
  }

  function removeChip(key, value) {
    const params = Object.fromEntries(searchParams.entries());
    if (key === 'brands') {
      const next = parseList(params.brands).filter((b) => b !== value);
      if (next.length) params.brands = next.join(','); else delete params.brands;
    } else {
      delete params[key];
    }
    setSearchParams(params);
  }

  const totalActiveFilters =
    activeBrands.length +
    [subParam, minParam || maxParam, saleParam, backorderParam, qParam].filter(Boolean).length;

  const FilterPanel = () => (
    <div className="shop-filter-panel">

      {/* Search */}
      <CollapsibleSection title="Search" defaultOpen>
        <div className="shop-filter-search">
          <Search size={14} />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Products, brands, SKUs..."
            defaultValue={qParam}
            onKeyDown={(e) => e.key === 'Enter' && applySearch()}
            className="shop-filter-search-input"
          />
        </div>
        <button className="shop-filter-search-btn" onClick={applySearch}>Search</button>
      </CollapsibleSection>

      {/* Availability */}
      <CollapsibleSection title="Availability" defaultOpen>
        <label className="shop-filter-toggle-row">
          <span>On Sale Only</span>
          <div className={`shop-toggle${saleParam === '1' ? ' active' : ''}`} onClick={() => toggleParam('sale')}>
            <div className="shop-toggle-thumb" />
          </div>
        </label>
        <label className="shop-filter-toggle-row" style={{ marginTop: '12px' }}>
          <span>Available on Backorder</span>
          <div className={`shop-toggle${backorderParam === '1' ? ' active' : ''}`} onClick={() => toggleParam('backorder')}>
            <div className="shop-toggle-thumb" />
          </div>
        </label>
      </CollapsibleSection>

      {/* Categories */}
      {categories.length > 0 && (
        <CollapsibleSection title="Categories">
          <div className="shop-filter-check-list">
            <label className="shop-filter-check">
              <input type="radio" name="cat" checked={!subParam} onChange={() => setParam('sub', '')} />
              <span>All Categories</span>
              <span className="shop-filter-count">({products.length})</span>
            </label>
            {categories.map((cat) => {
              const count = products.filter((p) => p.categories.some((c) => c.handle === cat.handle)).length;
              if (count === 0) return null;
              return (
                <label key={cat.id} className="shop-filter-check">
                  <input
                    type="radio"
                    name="cat"
                    checked={subParam === cat.handle}
                    onChange={() => setParam('sub', subParam === cat.handle ? '' : cat.handle)}
                  />
                  <span>{cat.title}</span>
                  <span className="shop-filter-count">({count})</span>
                </label>
              );
            })}
          </div>
        </CollapsibleSection>
      )}

      {/* Brand */}
      {vendors.length > 0 && (
        <CollapsibleSection title="Brand">
          <div className="shop-filter-check-list">
            {vendors.map((v) => (
              <label key={v} className="shop-filter-check">
                <input
                  type="checkbox"
                  checked={activeBrands.includes(v)}
                  onChange={() => toggleBrand(v)}
                />
                <span>{v}</span>
                <span className="shop-filter-count">
                  ({products.filter((p) => p.brand === v).length})
                </span>
              </label>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Price */}
      <CollapsibleSection title="Price Range" defaultOpen={false}>
        <div className="shop-filter-price">
          <input
            type="number" placeholder="Min $" value={localMin} min="0"
            onChange={(e) => setLocalMin(e.target.value)}
            onBlur={applyPrice}
            onKeyDown={(e) => e.key === 'Enter' && applyPrice()}
            className="shop-filter-price-input"
          />
          <span className="shop-filter-price-sep">–</span>
          <input
            type="number" placeholder="Max $" value={localMax} min="0"
            onChange={(e) => setLocalMax(e.target.value)}
            onBlur={applyPrice}
            onKeyDown={(e) => e.key === 'Enter' && applyPrice()}
            className="shop-filter-price-input"
          />
        </div>
        <div className="shop-price-presets">
          {[['Under $100', '', '100'], ['$100–$500', '100', '500'], ['$500–$1000', '500', '1000'], ['Over $1000', '1000', '']].map(([label, mn, mx]) => (
            <button
              key={label}
              className={`shop-price-preset${minParam === mn && maxParam === mx ? ' active' : ''}`}
              onClick={() => { const p = Object.fromEntries(searchParams.entries()); if (mn) p.min_price = mn; else delete p.min_price; if (mx) p.max_price = mx; else delete p.max_price; setSearchParams(p); }}
            >
              {label}
            </button>
          ))}
        </div>
      </CollapsibleSection>

      {/* Actions */}
      {totalActiveFilters > 0 && (
        <div className="shop-filter-actions">
          <button className="shop-filter-clear" onClick={clearFilters}>Clear Filters</button>
        </div>
      )}
    </div>
  );

  const pageTitle = qParam
    ? `Search: "${qParam}"`
    : subParam
    ? (categories.find((c) => c.handle === subParam)?.title ?? subParam)
    : activeBrands.length === 1
    ? activeBrands[0]
    : 'Shop All Products';

  return (
    <div className="shop-page">

      <div className="shop-page-header">
        <div className="container">
          <h1 className="shop-page-title">{pageTitle}</h1>
          <p className="shop-page-count">
            {activeBrands.length ? filtered.length : totalProducts} product{totalProducts !== 1 ? 's' : ''}
            {totalPages > 1 && ` — page ${currentPage} of ${totalPages}`}
          </p>
        </div>
      </div>

      <div className="container shop-layout">

        <aside className="shop-sidebar">
          <FilterPanel />
        </aside>

        <div className="shop-main">

          {/* Toolbar */}
          <div className="shop-toolbar">
            <div className="shop-toolbar-left">
              <button className="shop-filter-toggle" onClick={() => setDrawerOpen(true)}>
                <SlidersHorizontal size={15} />
                Filters
                {totalActiveFilters > 0 && <span className="shop-filter-badge">{totalActiveFilters}</span>}
              </button>
              <div className="shop-active-filters">
                {qParam && (
                  <span className="shop-chip">
                    <Search size={10} />"{qParam}"
                    <button onClick={() => removeChip('q')}><X size={10} /></button>
                  </span>
                )}
                {subParam && (
                  <span className="shop-chip">
                    {subParam}
                    <button onClick={() => removeChip('sub')}><X size={10} /></button>
                  </span>
                )}
                {activeBrands.map((b) => (
                  <span key={b} className="shop-chip">
                    {b}
                    <button onClick={() => removeChip('brands', b)}><X size={10} /></button>
                  </span>
                ))}
                {(minParam || maxParam) && (
                  <span className="shop-chip">
                    ${minParam || '0'} – ${maxParam || '∞'}
                    <button onClick={() => { const p = Object.fromEntries(searchParams.entries()); delete p.min_price; delete p.max_price; setSearchParams(p); }}><X size={10} /></button>
                  </span>
                )}
                {saleParam && (
                  <span className="shop-chip shop-chip--sale">
                    <Tag size={10} /> Sale
                    <button onClick={() => removeChip('sale')}><X size={10} /></button>
                  </span>
                )}
                {backorderParam && (
                  <span className="shop-chip">
                    Backorder
                    <button onClick={() => removeChip('backorder')}><X size={10} /></button>
                  </span>
                )}
              </div>
            </div>

            <div className="shop-toolbar-right">
              <div className="shop-toolbar-control">
                <span className="shop-toolbar-label">Show</span>
                <Dropdown
                  value={perPageParam}
                  options={[8, 12, 24, 48].map((n) => ({ value: n, label: String(n) }))}
                  onChange={(v) => setPerPage(Number(v))}
                />
              </div>
              <div className="shop-toolbar-divider" />
              <div className="shop-toolbar-control">
                <span className="shop-toolbar-label">Sort</span>
                <Dropdown
                  value={sortParam}
                  options={SORT_OPTIONS}
                  onChange={(v) => setSort(v)}
                />
              </div>
            </div>
          </div>

          <div className="shop-product-grid">
            {loading
              ? Array.from({ length: perPageParam }).map((_, i) => <SkeletonCard key={i} />)
              : paginated.length === 0
              ? <p className="shop-no-results">No products found. Try adjusting your filters.</p>
              : paginated.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)
            }
          </div>

          {totalPages > 1 && (
            <div className="shop-pagination">
              <button
                className="shop-page-btn shop-page-btn--nav"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft size={15} />
              </button>

              {buildPageNumbers(currentPage, totalPages).map((item, i) =>
                item === '...'
                  ? <span key={`ellipsis-${i}`} className="shop-page-ellipsis">…</span>
                  : <button
                      key={item}
                      className={`shop-page-btn${currentPage === item ? ' active' : ''}`}
                      onClick={() => goToPage(item)}
                    >
                      {item}
                    </button>
              )}

              <button
                className="shop-page-btn shop-page-btn--nav"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <ChevronDown size={15} style={{ transform: 'rotate(-90deg)' }} />
              </button>
            </div>
          )}
        </div>
      </div>

      {drawerOpen && (
        <div className="shop-drawer-overlay" onClick={() => setDrawerOpen(false)}>
          <div className="shop-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="shop-drawer-header">
              <span>Filters {totalActiveFilters > 0 && `(${totalActiveFilters})`}</span>
              <button onClick={() => setDrawerOpen(false)}><X size={20} /></button>
            </div>
            <div className="shop-drawer-body"><FilterPanel /></div>
          </div>
        </div>
      )}

    </div>
  );
}

