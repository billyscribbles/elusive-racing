import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X, ChevronDown, ChevronRight, Search, Tag, ChevronLeft, ShoppingBag } from 'lucide-react';
import useCartStore from '../store/cartStore';
import { getProducts } from '../lib/woocommerce';
import './ShopPage.css';

// ── Data ─────────────────────────────────────────────────────────────────────

const CATEGORY_TREE = [
  {
    label: 'Engine',
    sub: ['Chains, Belts & Tensioners', 'Gaskets', 'Mounts', 'Oil & Water Pumps', 'Accessories'],
  },
  {
    label: 'Drivetrain',
    sub: ['Mounts', 'Bearings & Seals', 'Gears & Final Drive', 'Synchros', 'Accessories'],
  },
  {
    label: 'Body & Accessories',
    sub: ['Exterior', 'Interior', 'Engine Bay', 'Accessories'],
  },
];

const VEHICLE_MODELS = [
  'Civic EK (96–00)',
  'Civic EG (92–95)',
  'Civic FD2/FN2 (06–11)',
  'Integra DC2 (94–01)',
  'Integra DC5 (02–06)',
  'Accord CL9 (03–07)',
  'S2000 AP1/AP2',
];


function mapProduct(node) {
  const variant = node.variants?.[0];
  const price = parseFloat(node.priceRange.minVariantPrice.amount);
  const compareAt = parseFloat(node.compareAtPriceRange?.minVariantPrice?.amount ?? 0);
  const isBackorder = (node.tags ?? []).some((t) =>
    t.toLowerCase().includes('backorder')
  );
  return {
    id: node.id,
    name: node.title,
    brand: node.vendor,
    sku: node.sku || variant?.sku || '',
    price,
    originalPrice: compareAt > price ? compareAt : null,
    image: node.featuredImage?.url ?? null,
    href: `/products/${node.handle}`,
    description: node.description || '',
    category: 'General',
    subcategory: null,
    vehicles: [],
    tags: node.tags ?? [],
    backorder: isBackorder,
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

function filterAndSort(products, { q, brands, sub, vehicles, model, minPrice, maxPrice, sale, backorder, sort }) {
  let result = [...products];

  if (q) {
    const lower = q.toLowerCase();
    result = result.filter((p) =>
      p.name.toLowerCase().includes(lower) ||
      p.brand.toLowerCase().includes(lower) ||
      p.sku.toLowerCase().includes(lower) ||
      p.description.toLowerCase().includes(lower) ||
      p.tags.some((t) => t.toLowerCase().includes(lower))
    );
  }
  if (brands.length)   result = result.filter((p) => brands.includes(p.brand));
  if (sub)             result = result.filter((p) => p.subcategory === sub);
  if (vehicles.length) result = result.filter((p) => p.vehicles.some((v) => vehicles.includes(v)));
  if (model)           result = result.filter((p) => p.vehicles.some((v) => v.toLowerCase() === model.toLowerCase()));
  if (sale)            result = result.filter((p) => p.originalPrice !== null);
  if (backorder)       result = result.filter((p) => p.backorder === true);
  if (minPrice)        result = result.filter((p) => p.price >= parseFloat(minPrice));
  if (maxPrice)        result = result.filter((p) => p.price <= parseFloat(maxPrice));

  if (sort === 'price-asc')  result.sort((a, b) => a.price - b.price);
  if (sort === 'price-desc') result.sort((a, b) => b.price - a.price);
  if (sort === 'a-z')        result.sort((a, b) => a.name.localeCompare(b.name));

  return result;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function buildPageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, current, current - 1, current + 1].filter((n) => n >= 1 && n <= total));
  return Array.from(pages).sort((a, b) => a - b).reduce((acc, n, i, arr) => {
    if (i > 0 && n - arr[i - 1] > 1) acc.push('...');
    acc.push(n);
    return acc;
  }, []);
}

function CollapsibleSection({ title, defaultOpen = true, children }) {
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

function ProductCard({ product }) {
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
    <a href={product.href} className="shop-product-card">
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

  const qParam        = searchParams.get('q')         ?? '';
  const brandsParam   = searchParams.get('brands')    ?? '';
  const subParam      = searchParams.get('sub')       ?? '';
  const vehiclesParam = searchParams.get('vehicles')  ?? '';
  const makeParam     = searchParams.get('make')      ?? '';
  const modelParam    = searchParams.get('model')     ?? '';
  const yearParam     = searchParams.get('year')      ?? '';
  const saleParam      = searchParams.get('sale')      ?? '';
  const backorderParam = searchParams.get('backorder') ?? '';
  const sortParam      = searchParams.get('sort')      ?? 'best-selling';
  const minParam       = searchParams.get('min_price') ?? '';
  const maxParam       = searchParams.get('max_price') ?? '';
  const pageParam      = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const perPageParam   = parseInt(searchParams.get('per_page') ?? '12', 10);

  const activeBrands   = parseList(brandsParam);
  const activeVehicles = parseList(vehiclesParam);

  const [products, setProducts] = useState([]);

  useEffect(() => {
    getProducts({ count: 100 })
      .then((data) => {
        const mapped = (data.edges ?? []).map(({ node }) => mapProduct(node));
        setProducts(mapped);
      })
      .catch(() => {});
  }, []);

  const vendors = useMemo(() => [...new Set(products.map((p) => p.brand))].sort(), [products]);

  // Uncontrolled ref for search — avoids re-rendering ShopPage on every keystroke
  const searchInputRef = useRef(null);
  const [localMin,    setLocalMin]    = useState(minParam);
  const [localMax,    setLocalMax]    = useState(maxParam);
  const [drawerOpen,  setDrawerOpen]  = useState(false);

  // Sync input value when URL changes (e.g. clear all, navigate with ?q=)
  useEffect(() => {
    if (searchInputRef.current) searchInputRef.current.value = qParam;
  }, [qParam]);
  useEffect(() => { setLocalMin(minParam); setLocalMax(maxParam); }, [minParam, maxParam]);

  const filtered = useMemo(
    () => filterAndSort(products, {
      q: qParam,
      brands: activeBrands,
      sub: subParam,
      vehicles: activeVehicles,
      model: modelParam,
      minPrice: minParam,
      maxPrice: maxParam,
      sale: saleParam === '1',
      backorder: backorderParam === '1',
      sort: sortParam,
    }),
    [products, qParam, brandsParam, subParam, vehiclesParam, modelParam, minParam, maxParam, saleParam, backorderParam, sortParam]
  );

  const totalPages  = Math.max(1, Math.ceil(filtered.length / perPageParam));
  const currentPage = Math.min(pageParam, totalPages);
  const paginated   = filtered.slice((currentPage - 1) * perPageParam, currentPage * perPageParam);

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

  function toggleVehicle(v) {
    const next = activeVehicles.includes(v)
      ? activeVehicles.filter((x) => x !== v)
      : [...activeVehicles, v];
    setParam('vehicles', next.join(','));
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
    } else if (key === 'vehicles') {
      const next = parseList(params.vehicles).filter((v) => v !== value);
      if (next.length) params.vehicles = next.join(','); else delete params.vehicles;
    } else {
      delete params[key];
    }
    setSearchParams(params);
  }

  const totalActiveFilters =
    activeBrands.length + activeVehicles.length +
    [subParam, minParam || maxParam, saleParam, backorderParam, qParam, makeParam, modelParam, yearParam].filter(Boolean).length;

  // Count products per subcategory for badges
  function subCount(sub) {
    return products.filter((p) => p.subcategory === sub).length;
  }

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
      <CollapsibleSection title="Categories" defaultOpen>
        <div className="shop-cat-tree">
          {CATEGORY_TREE.map((cat) => (
            <CategoryNode
              key={cat.label}
              cat={cat}
              activeSub={subParam}
              onSelect={(val) => setParam('sub', val)}
              subCount={subCount}
            />
          ))}
        </div>
      </CollapsibleSection>

      {/* Brand */}
      <CollapsibleSection title="Brand" defaultOpen>
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

      {/* Vehicle */}
      <CollapsibleSection title="Vehicle Model" defaultOpen={false}>
        <div className="shop-filter-check-list">
          {VEHICLE_MODELS.map((v) => {
            const count = products.filter((p) => p.vehicles.includes(v)).length;
            return (
              <label key={v} className="shop-filter-check">
                <input
                  type="checkbox"
                  checked={activeVehicles.includes(v)}
                  onChange={() => toggleVehicle(v)}
                />
                <span>{v}</span>
                <span className="shop-filter-count">({count})</span>
              </label>
            );
          })}
        </div>
      </CollapsibleSection>

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
    : subParam || activeBrands.length === 1
    ? subParam || activeBrands[0]
    : 'Shop All Products';

  return (
    <div className="shop-page">

      <div className="shop-page-header">
        <div className="container">
          <h1 className="shop-page-title">{pageTitle}</h1>
          <p className="shop-page-count">
            {filtered.length} product{filtered.length !== 1 ? 's' : ''}
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
            <button className="shop-filter-toggle" onClick={() => setDrawerOpen(true)}>
              <SlidersHorizontal size={15} />
              Filters
              {totalActiveFilters > 0 && <span className="shop-filter-badge">{totalActiveFilters}</span>}
            </button>

            {totalPages > 1 && (
              <div className="shop-toolbar-pagination">
                <button
                  className="shop-page-btn shop-page-btn--nav"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft size={15} />
                </button>

                {buildPageNumbers(currentPage, totalPages).map((item, i) =>
                  item === '...'
                    ? <span key={`ellipsis-top-${i}`} className="shop-page-ellipsis">…</span>
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

            <div className="shop-active-filters">
              {qParam && (
                <span className="shop-chip">
                  <Search size={11} />"{qParam}"
                  <button onClick={() => removeChip('q')}><X size={11} /></button>
                </span>
              )}
              {subParam && (
                <span className="shop-chip">
                  {subParam}
                  <button onClick={() => removeChip('sub')}><X size={11} /></button>
                </span>
              )}
              {activeBrands.map((b) => (
                <span key={b} className="shop-chip">
                  {b}
                  <button onClick={() => removeChip('brands', b)}><X size={11} /></button>
                </span>
              ))}
              {activeVehicles.map((v) => (
                <span key={v} className="shop-chip">
                  {v}
                  <button onClick={() => removeChip('vehicles', v)}><X size={11} /></button>
                </span>
              ))}
              {makeParam && (
                <span className="shop-chip shop-chip--vehicle">
                  {makeParam}
                  <button onClick={() => removeChip('make')}><X size={11} /></button>
                </span>
              )}
              {modelParam && (
                <span className="shop-chip shop-chip--vehicle">
                  {modelParam}
                  <button onClick={() => removeChip('model')}><X size={11} /></button>
                </span>
              )}
              {yearParam && (
                <span className="shop-chip shop-chip--vehicle">
                  {yearParam}
                  <button onClick={() => removeChip('year')}><X size={11} /></button>
                </span>
              )}
              {(minParam || maxParam) && (
                <span className="shop-chip">
                  ${minParam || '0'} – ${maxParam || '∞'}
                  <button onClick={() => { removeChip('min_price'); removeChip('max_price'); const p = Object.fromEntries(searchParams.entries()); delete p.min_price; delete p.max_price; setSearchParams(p); }}><X size={11} /></button>
                </span>
              )}
              {saleParam && (
                <span className="shop-chip shop-chip--sale">
                  <Tag size={11} /> On Sale
                  <button onClick={() => removeChip('sale')}><X size={11} /></button>
                </span>
              )}
              {backorderParam && (
                <span className="shop-chip shop-chip--backorder">
                  Backorder
                  <button onClick={() => removeChip('backorder')}><X size={11} /></button>
                </span>
              )}
            </div>

            <div className="shop-per-page">
              <div className="shop-sort-select-wrap">
                <select value={perPageParam} onChange={(e) => setPerPage(Number(e.target.value))} className="shop-sort-select">
                  {[8, 12, 24, 48].map((n) => <option key={n} value={n}>{n} per page</option>)}
                </select>
                <ChevronDown size={14} className="shop-sort-chevron" />
              </div>
            </div>

            <div className="shop-sort">
              <div className="shop-sort-select-wrap">
                <select value={sortParam} onChange={(e) => setSort(e.target.value)} className="shop-sort-select">
                  {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <ChevronDown size={14} className="shop-sort-chevron" />
              </div>
            </div>
          </div>

          <div className="shop-product-grid">
            {filtered.length === 0
              ? <p className="shop-no-results">No products found. Try adjusting your filters.</p>
              : paginated.map((p) => <ProductCard key={p.id} product={p} />)
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

function CategoryNode({ cat, activeSub, onSelect, subCount }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="shop-cat-node">
      <button className="shop-cat-parent" onClick={() => setOpen((o) => !o)}>
        {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        <span>{cat.label}</span>
      </button>
      {open && (
        <ul className="shop-cat-children">
          {cat.sub.map((s) => (
            <li key={s}>
              <button
                className={`shop-cat-child${activeSub === s ? ' active' : ''}`}
                onClick={() => onSelect(activeSub === s ? '' : s)}
              >
                <span>{s}</span>
                <span className="shop-cat-count">{subCount(s)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
