import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X, ChevronDown, ChevronRight, Search, Tag, ChevronLeft, ShoppingBag } from 'lucide-react';
import useCartStore from '../store/cartStore';
import { prefetchProduct } from '../lib/woocommerce';
import { queryProducts } from '../lib/meilisearch';
import { CATEGORIES, CATEGORIES_FLAT, getCategoryBySlug } from '../data/categories';
import { BRAND_NAMES } from '../data/brands';
import './ShopPage.css';

// ── Data ─────────────────────────────────────────────────────────────────────


function mapProduct(h) {
  const isBackorder = h.stockStatus === 'onbackorder' ||
    (h.tags ?? []).some((t) => t.toLowerCase().includes('backorder'));
  return {
    id: h.id,
    name: h.title,
    brand: h.vendor || '',
    sku: h.sku || '',
    price: h.price || 0,
    originalPrice: h.regularPrice > h.price ? h.regularPrice : null,
    image: h.imageUrl || null,
    slug: h.handle,
    href: `/products/${h.handle}`,
    description: h.description || '',
    categories: h.categories ?? [],
    tags: h.tags ?? [],
    backorder: isBackorder,
    dateCreated: h.dateCreated || '',
    variantId: h.hasVariants ? null : h.id,
    hasVariants: h.hasVariants || false,
  };
}

const SORT_OPTIONS = [
  { label: 'Best Selling',    value: 'best-selling' },
  { label: 'Newest',          value: 'newest'       },
  { label: 'Top Rated',       value: 'rating'       },
  { label: 'Price: Low–High', value: 'price-asc'    },
  { label: 'Price: High–Low', value: 'price-desc'   },
  { label: 'A–Z',             value: 'a-z'          },
  { label: 'Z–A',             value: 'z-a'          },
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
    <a href={product.href} className="shop-product-card shop-product-card--loaded" style={{ animationDelay: `${Math.min(index, 11) * 40}ms` }} onMouseEnter={() => prefetchProduct(product.slug)}>
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
        {product.hasVariants ? (
          <span className="shop-quick-add shop-quick-add--variants">
            Select Variant
          </span>
        ) : (
          <button
            className={`shop-quick-add${added ? ' shop-quick-add--added' : ''}`}
            onClick={handleAddToCart}
          >
            {added ? <>&#10003; Added</> : <><ShoppingBag size={13} /> Add to Cart</>}
          </button>
        )}
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
  const [loading, setLoading]       = useState(true);
  const [totalProducts, setTotalProducts] = useState(0);
  const [apiTotalPages, setApiTotalPages] = useState(1);

  // Refetch products whenever any filter/sort/page changes
  useEffect(() => {
    setLoading(true);
    queryProducts({
      query:     qParam,
      page:      pageParam,
      perPage:   perPageParam,
      brands:    activeBrands,
      categories: subParam ? [subParam] : [],
      onSale:    saleParam === '1',
      backorder: backorderParam === '1',
      minPrice:  minParam ? parseFloat(minParam) : null,
      maxPrice:  maxParam ? parseFloat(maxParam) : null,
      sort:      sortParam,
    })
      .then(({ hits, totalHits, totalPages }) => {
        setProducts(hits.map(mapProduct));
        setTotalProducts(totalHits);
        setApiTotalPages(totalPages);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [qParam, subParam, brandsParam, saleParam, backorderParam, minParam, maxParam, sortParam, pageParam, perPageParam]);

  const filtered = useMemo(() => products, [products]);

  const vendors = BRAND_NAMES;

  const totalPages  = apiTotalPages;
  const currentPage = pageParam;
  const paginated   = filtered;

  // Uncontrolled ref for search — avoids re-rendering on every keystroke
  const searchInputRef = useRef(null);
  const [localMin,    setLocalMin]    = useState(minParam);
  const [localMax,    setLocalMax]    = useState(maxParam);
  const [drawerOpen,  setDrawerOpen]  = useState(false);
  const [catSearch,    setCatSearch]    = useState('');
  const [brandSearch,  setBrandSearch]  = useState('');

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

  const catSearchTerm = catSearch.toLowerCase().trim();
  const visibleCategories = catSearchTerm
    ? CATEGORIES.reduce((acc, top) => {
        const topMatch = top.name.toLowerCase().includes(catSearchTerm);
        const filteredMids = (top.children ?? []).reduce((macc, mid) => {
          const midMatch = mid.name.toLowerCase().includes(catSearchTerm);
          const filteredLeaves = (mid.children ?? []).filter(l => l.name.toLowerCase().includes(catSearchTerm));
          if (midMatch || filteredLeaves.length > 0) {
            macc.push({ ...mid, children: midMatch ? mid.children : filteredLeaves });
          }
          return macc;
        }, []);
        if (topMatch || filteredMids.length > 0) {
          acc.push({ ...top, children: topMatch ? top.children : filteredMids });
        }
        return acc;
      }, [])
    : CATEGORIES;

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

      {/* Categories — hierarchical tree */}
      <CollapsibleSection title="Categories" defaultOpen={!!subParam}>
        <div className="shop-cat-search-wrap">
          <Search size={13} className="shop-cat-search-icon" />
          <input
            type="text"
            className="shop-cat-search-input"
            placeholder="Search categories..."
            value={catSearch}
            onChange={(e) => setCatSearch(e.target.value)}
          />
          {catSearch && (
            <button className="shop-cat-search-clear" onClick={() => setCatSearch('')} aria-label="Clear">
              <X size={11} strokeWidth={2.5} />
            </button>
          )}
        </div>
        <div className="shop-filter-check-list">
          {!catSearchTerm && (
            <label className="shop-filter-check">
              <input type="radio" name="cat" checked={!subParam} onChange={() => setParam('sub', '')} />
              <span>All Categories</span>
            </label>
          )}
          {visibleCategories.length === 0 && (
            <p className="shop-cat-no-results">No categories found</p>
          )}
          {visibleCategories.map((top) => {
            const topActive = catSearchTerm || subParam === top.slug || (top.children ?? []).some(
              c => c.slug === subParam || (c.children ?? []).some(l => l.slug === subParam)
            );
            return (
              <div key={top.id} className="shop-filter-cat-group">
                <label className="shop-filter-check shop-filter-check--top">
                  <input
                    type="radio"
                    name="cat"
                    checked={subParam === top.slug}
                    onChange={() => setParam('sub', subParam === top.slug ? '' : top.slug)}
                  />
                  <span>{top.name}</span>
                </label>
                {topActive && top.children?.length > 0 && (
                  <div className="shop-filter-children">
                    {top.children.map((mid) => {
                      const midActive = catSearchTerm || subParam === mid.slug || (mid.children ?? []).some(l => l.slug === subParam);
                      return (
                        <div key={mid.id}>
                          <label className="shop-filter-check shop-filter-check--mid">
                            <input
                              type="radio"
                              name="cat"
                              checked={subParam === mid.slug}
                              onChange={() => setParam('sub', subParam === mid.slug ? top.slug : mid.slug)}
                            />
                            <span>{mid.name}</span>
                          </label>
                          {midActive && mid.children?.length > 0 && (
                            <div className="shop-filter-children shop-filter-children--leaf">
                              {mid.children.map((leaf) => (
                                <label key={leaf.id} className="shop-filter-check shop-filter-check--leaf">
                                  <input
                                    type="radio"
                                    name="cat"
                                    checked={subParam === leaf.slug}
                                    onChange={() => setParam('sub', subParam === leaf.slug ? mid.slug : leaf.slug)}
                                  />
                                  <span>{leaf.name}</span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CollapsibleSection>

      {/* Brand */}
      {vendors.length > 0 && (
        <CollapsibleSection title="Brand" defaultOpen={!!activeBrands.length}>
          <div className="shop-cat-search-wrap">
            <Search size={13} className="shop-cat-search-icon" />
            <input
              type="text"
              className="shop-cat-search-input"
              placeholder="Search brands..."
              value={brandSearch}
              onChange={(e) => setBrandSearch(e.target.value)}
            />
            {brandSearch && (
              <button className="shop-cat-search-clear" onClick={() => setBrandSearch('')} aria-label="Clear">
                <X size={11} strokeWidth={2.5} />
              </button>
            )}
          </div>
          <div className="shop-filter-check-list shop-filter-check-list--scroll">
            {vendors
              .filter(v => !brandSearch || v.toLowerCase().includes(brandSearch.toLowerCase()))
              .map((v) => (
                <label key={v} className="shop-filter-check">
                  <input
                    type="checkbox"
                    checked={activeBrands.includes(v)}
                    onChange={() => toggleBrand(v)}
                  />
                  <span>{v}</span>
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
    ? (getCategoryBySlug(subParam)?.name ?? subParam)
    : activeBrands.length === 1
    ? activeBrands[0]
    : 'Shop All Products';

  return (
    <div className="shop-page">

      <div className="shop-page-header">
        <div className="container">
          <h1 className="shop-page-title">{pageTitle}</h1>
          {!loading && (
            <p className="shop-page-count">
              {totalProducts} product{totalProducts !== 1 ? 's' : ''}
              {totalPages > 1 && ` — page ${currentPage} of ${totalPages}`}
            </p>
          )}
        </div>
      </div>

      <div className="container shop-layout">

        <aside className="shop-sidebar">
          {FilterPanel()}
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
            <div className="shop-drawer-body">{FilterPanel()}</div>
          </div>
        </div>
      )}

    </div>
  );
}

