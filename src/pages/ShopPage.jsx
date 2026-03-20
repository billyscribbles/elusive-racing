import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X, ChevronDown, ChevronRight, Search, Tag, ChevronLeft, ShoppingBag } from 'lucide-react';
import useCartStore from '../store/cartStore';
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

const DUMMY_PRODUCTS = [
  {
    id: '1',
    name: "Hardrace K Swap Engine Mount Kit (Civic EK '96–'00)",
    brand: 'Hardrace',
    sku: 'HR-Q0752',
    price: 1052.00,
    originalPrice: null,
    image: 'https://elusiveracing.com.au/wp-content/uploads/HR-Q0752.png',
    href: '/products/hardrace-k-swap-mount-kit-ek',
    description: 'Six-piece mount kit for K-series swaps into Civic EK chassis. 5mm thick steel alloy brackets with CNC aluminium mounts and reinforced rubber bushings.',
    category: 'Engine',
    subcategory: 'Mounts',
    vehicles: ['Civic EK (96–00)'],
    tags: ['engine mount', 'k-swap', 'civic', 'ek'],
    backorder: true,
  },
  {
    id: '2',
    name: "Hardrace K Swap Engine Mount Kit (Accord Euro CL9 '03–'07)",
    brand: 'Hardrace',
    sku: 'HR-Q1096',
    price: 1052.00,
    originalPrice: null,
    image: 'https://elusiveracing.com.au/wp-content/uploads/HR-Q1096.png',
    href: '/products/hardrace-k-swap-mount-kit-cl9',
    description: "Six-piece set compatible with Accord Euro TSX CL9 '03–'07 manual gearbox. Superior strength with steel alloy brackets and solid rubber bushings.",
    category: 'Engine',
    subcategory: 'Mounts',
    vehicles: ['Accord CL9 (03–07)'],
    tags: ['engine mount', 'k-swap', 'accord', 'cl9'],
  },
  {
    id: '3',
    name: "Hardrace K Swap Engine Mount Kit (EG/DC2 '92–'01)",
    brand: 'Hardrace',
    sku: 'HR-Q1095',
    price: 1052.00,
    originalPrice: 1150.00,
    image: 'https://elusiveracing.com.au/wp-content/uploads/HR-Q1095.png',
    href: '/products/hardrace-k-swap-mount-kit-eg-dc2',
    description: 'Five-piece mount assembly for EG Civic and Integra DC2 platforms. Eliminates unwanted vibrations with reinforced bushings and aluminium mounts.',
    category: 'Engine',
    subcategory: 'Mounts',
    vehicles: ['Civic EG (92–95)', 'Integra DC2 (94–01)'],
    tags: ['engine mount', 'k-swap', 'integra', 'dc2', 'eg'],
  },
  {
    id: '4',
    name: "Hardrace K Swap Engine Mount Kit (EG/EH '92–'95, DC2 '94–'01)",
    brand: 'Hardrace',
    sku: 'HR-Q0751',
    price: 999.00,
    originalPrice: null,
    image: 'https://elusiveracing.com.au/wp-content/uploads/HR-Q0751.png',
    href: '/products/hardrace-k-swap-mount-kit-eg-eh',
    description: 'Five-piece kit for older EG/EH Civic and early DC2 Integra. Compatible with DC5/EP3 manual gearboxes with steel alloy construction.',
    category: 'Engine',
    subcategory: 'Mounts',
    vehicles: ['Civic EG (92–95)', 'Integra DC2 (94–01)'],
    tags: ['engine mount', 'k-swap', 'civic', 'eg', 'eh'],
  },
  {
    id: '5',
    name: 'Honda OEM K24 CL9 Vehicle Speed Sensor Washer',
    brand: 'Honda OEM',
    sku: '90401-RAS-000',
    price: 10.00,
    originalPrice: null,
    image: 'https://elusiveracing.com.au/wp-content/uploads/90401-RAS-000.png',
    href: '/products/honda-oem-vss-washer-k24',
    description: 'Genuine Honda OEM sealing washer for the Vehicle Speed Sensor (VSS) on K24 engines in the Accord Euro CL9. Prevents oil leaks around the sensor housing.',
    category: 'Drivetrain',
    subcategory: 'Accessories',
    vehicles: ['Accord CL9 (03–07)'],
    tags: ['oem', 'sensor', 'k24', 'accord', 'cl9'],
  },
  {
    id: '6',
    name: '4 Piston Ultra High Polish Timing Chain (K20/K24)',
    brand: '4 Piston',
    sku: '4P-HPTC',
    price: 785.00,
    originalPrice: 870.00,
    image: 'https://elusiveracing.com.au/wp-content/uploads/4P-HPTC-K20-K24.png',
    href: '/products/4-piston-timing-chain-k20-k24',
    description: 'Ultra-high polish finish timing chain for K20 and K24 engines. Pins have less friction making them last longer and stretch less when paired with PEEK chain guides.',
    category: 'Engine',
    subcategory: 'Chains, Belts & Tensioners',
    vehicles: ['Civic EK (96–00)', 'Civic EG (92–95)', 'Integra DC2 (94–01)', 'Integra DC5 (02–06)'],
    tags: ['timing chain', 'k20', 'k24', 'engine'],
    backorder: true,
  },
  {
    id: '7',
    name: '4 Piston Timing Chain Tensioner (K20/K24)',
    brand: '4 Piston',
    sku: '4P-TCTEN-K20-K24',
    price: 700.00,
    originalPrice: null,
    image: 'https://elusiveracing.com.au/wp-content/uploads/4P-TCTEN-K20-K24.png',
    href: '/products/4-piston-timing-chain-tensioner-k20-k24',
    description: 'Hydraulic tensioner with internal mechanical safety stop for motorsport applications. Compatible with both K20 and K24 engines.',
    category: 'Engine',
    subcategory: 'Chains, Belts & Tensioners',
    vehicles: ['Civic EK (96–00)', 'Civic EG (92–95)', 'Integra DC2 (94–01)', 'Integra DC5 (02–06)'],
    tags: ['timing chain', 'tensioner', 'k20', 'k24', 'engine'],
  },
  {
    id: '8',
    name: 'Hasport Billet Performance Rear Mount (Civic FD2/FN2)',
    brand: 'Hasport',
    sku: 'FDRR',
    price: 265.00,
    originalPrice: 310.00,
    image: 'https://elusiveracing.com.au/wp-content/uploads/FDRR.png',
    href: '/products/hasport-rear-mount-fd2-fn2',
    description: 'Billet aluminium performance rear engine mount for 2006–2011 Honda Civic Si FD2/FN2. Available in four stiffness options from street to full race.',
    category: 'Engine',
    subcategory: 'Mounts',
    vehicles: ['Civic FD2/FN2 (06–11)'],
    tags: ['engine mount', 'civic', 'fd2', 'fn2', 'billet'],
  },
  {
    id: '9',
    name: 'Honda OEM Civic EK Roof Moulding – Left',
    brand: 'Honda OEM',
    sku: '74316-S03-003',
    price: 217.00,
    originalPrice: null,
    image: 'https://elusiveracing.com.au/wp-content/uploads/74306-S03-003-1.png',
    href: '/products/honda-oem-ek-roof-moulding-left',
    description: "Genuine Honda OEM roof moulding strip for the Civic EK – driver's side (left). Replaces faded or missing OEM trim for a factory-fresh finish.",
    category: 'Body & Accessories',
    subcategory: 'Exterior',
    vehicles: ['Civic EK (96–00)'],
    tags: ['oem', 'body', 'civic', 'ek', 'exterior'],
  },
  {
    id: '10',
    name: 'Honda OEM Civic EK Roof Moulding – Right',
    brand: 'Honda OEM',
    sku: '74306-S03-003',
    price: 217.00,
    originalPrice: null,
    image: 'https://elusiveracing.com.au/wp-content/uploads/74306-S03-003.png',
    href: '/products/honda-oem-ek-roof-moulding-right',
    description: 'Genuine Honda OEM roof moulding strip for the Civic EK – passenger side (right). Direct OEM replacement for a clean, factory-correct exterior.',
    category: 'Body & Accessories',
    subcategory: 'Exterior',
    vehicles: ['Civic EK (96–00)'],
    tags: ['oem', 'body', 'civic', 'ek', 'exterior'],
  },
  {
    id: '11',
    name: 'Honda OEM Integra DC5 Roof Moulding – Left',
    brand: 'Honda OEM',
    sku: '74316-S6M-003',
    price: 260.00,
    originalPrice: null,
    image: 'https://elusiveracing.com.au/wp-content/uploads/74316-S6M-003.png',
    href: '/products/honda-oem-dc5-roof-moulding-left',
    description: "Genuine Honda OEM roof moulding for the Integra DC5 – driver's side (left). Exact factory fitment with OEM-grade adhesive backing.",
    category: 'Body & Accessories',
    subcategory: 'Exterior',
    vehicles: ['Integra DC5 (02–06)'],
    tags: ['oem', 'body', 'integra', 'dc5', 'exterior'],
  },
  {
    id: '12',
    name: 'Honda OEM Integra DC5 Roof Moulding – Right',
    brand: 'Honda OEM',
    sku: '74306-S6M-003',
    price: 260.00,
    originalPrice: null,
    image: 'https://elusiveracing.com.au/wp-content/uploads/74306-S6M-003.png',
    href: '/products/honda-oem-dc5-roof-moulding-right',
    description: 'Genuine Honda OEM roof moulding for the Integra DC5 – passenger side (right). Replaces cracked or missing factory trim with an exact OEM part.',
    category: 'Body & Accessories',
    subcategory: 'Exterior',
    vehicles: ['Integra DC5 (02–06)'],
    tags: ['oem', 'body', 'integra', 'dc5', 'exterior'],
    backorder: true,
  },
  {
    id: '13',
    name: 'Honda OEM F20C Oil Pump Chain Guide',
    brand: 'Honda OEM',
    sku: '13460-PCX-003',
    price: 44.00,
    originalPrice: null,
    image: 'https://elusiveracing.com.au/wp-content/uploads/13460PCX003.png',
    href: '/products/honda-oem-f20c-oil-pump-chain-guide',
    description: 'Genuine Honda OEM oil pump chain guide for the F20C engine found in the S2000. Keeps the oil pump chain aligned and prevents premature wear.',
    category: 'Engine',
    subcategory: 'Chains, Belts & Tensioners',
    vehicles: ['S2000 AP1/AP2'],
    tags: ['oem', 'chain guide', 'f20c', 's2000'],
  },
  {
    id: '14',
    name: 'Honda OEM F-Series Coilpack',
    brand: 'Honda OEM',
    sku: '30520-PCX-007',
    price: 223.00,
    originalPrice: null,
    image: 'https://elusiveracing.com.au/wp-content/uploads/30520-pcx-007-1.png',
    href: '/products/honda-oem-f-series-coilpack',
    description: 'Genuine Honda OEM ignition coilpack for F-series engines including the S2000 F20C. Direct OEM replacement for misfires or worn coils.',
    category: 'Engine',
    subcategory: 'Accessories',
    vehicles: ['S2000 AP1/AP2'],
    tags: ['oem', 'coilpack', 'ignition', 'f20c', 's2000'],
    backorder: true,
  },
  {
    id: '15',
    name: 'Honda OEM K20 Transmission 4th Gear Counter Shaft',
    brand: 'Honda OEM',
    sku: '23481-PNT-000',
    price: 214.00,
    originalPrice: null,
    image: 'https://elusiveracing.com.au/wp-content/uploads/23481-PNT-000.png',
    href: '/products/honda-oem-k20-4th-gear-counter-shaft',
    description: 'Genuine Honda OEM 4th gear counter shaft for K20 transmissions. OEM replacement for worn or damaged gears during gearbox rebuilds.',
    category: 'Drivetrain',
    subcategory: 'Gears & Final Drive',
    vehicles: ['Civic EK (96–00)', 'Integra DC2 (94–01)', 'Integra DC5 (02–06)'],
    tags: ['oem', 'gearbox', 'k20', 'transmission', '4th gear'],
  },
  {
    id: '16',
    name: 'Honda OEM K20 Transmission 3rd Gear Counter Shaft',
    brand: 'Honda OEM',
    sku: '23471-PNS-000',
    price: 239.00,
    originalPrice: 265.00,
    image: 'https://elusiveracing.com.au/wp-content/uploads/23471-PNS-000-1.png',
    href: '/products/honda-oem-k20-3rd-gear-counter-shaft',
    description: 'Genuine Honda OEM 3rd gear counter shaft for K20 transmissions. Essential for gearbox rebuilds where synchro or gear teeth are worn.',
    category: 'Drivetrain',
    subcategory: 'Gears & Final Drive',
    vehicles: ['Civic EK (96–00)', 'Integra DC2 (94–01)', 'Integra DC5 (02–06)'],
    tags: ['oem', 'gearbox', 'k20', 'transmission', '3rd gear'],
  },
  {
    id: '17',
    name: 'Honda OEM Idle Air Control Valve O-Ring Seal (B-Series)',
    brand: 'Honda OEM',
    sku: '36455-PT3-A01',
    price: 17.00,
    originalPrice: null,
    image: 'https://elusiveracing.com.au/wp-content/uploads/36455-PT3-A01.jpg',
    href: '/products/honda-oem-iacv-o-ring-b-series',
    description: 'Genuine Honda OEM O-ring seal for the Idle Air Control Valve on B-series engines. Stops vacuum leaks causing rough idle or erratic RPM.',
    category: 'Engine',
    subcategory: 'Gaskets',
    vehicles: ['Civic EK (96–00)', 'Civic EG (92–95)', 'Integra DC2 (94–01)'],
    tags: ['oem', 'o-ring', 'iacv', 'b-series', 'gasket'],
  },
  {
    id: '18',
    name: 'Honda OEM Civic EK Indicators (Pair)',
    brand: 'Honda OEM',
    sku: '33851-S2H-KIT',
    price: 176.00,
    originalPrice: 210.00,
    image: 'https://elusiveracing.com.au/wp-content/uploads/33851-S2H-SET.png',
    href: '/products/honda-oem-ek-indicators-pair',
    description: 'Genuine Honda OEM front indicator set for the Civic EK. Includes both driver and passenger side. Factory-correct fitment and lens clarity.',
    category: 'Body & Accessories',
    subcategory: 'Exterior',
    vehicles: ['Civic EK (96–00)'],
    tags: ['oem', 'indicators', 'lights', 'civic', 'ek', 'exterior'],
  },
  {
    id: '19',
    name: 'Honda OEM Civic FN2R Tailgate Boot Strut',
    brand: 'Honda OEM',
    sku: '74820-SMT-E02',
    price: 160.00,
    originalPrice: null,
    image: 'https://elusiveracing.com.au/wp-content/uploads/74820-SMT-E02.png',
    href: '/products/honda-oem-fn2r-tailgate-strut',
    description: 'Genuine Honda OEM tailgate boot strut for the Civic FN2R hatchback. Replaces weak or failed gas struts that no longer hold the boot open.',
    category: 'Body & Accessories',
    subcategory: 'Accessories',
    vehicles: ['Civic FD2/FN2 (06–11)'],
    tags: ['oem', 'tailgate', 'boot strut', 'civic', 'fn2'],
  },
  {
    id: '20',
    name: 'Honda OEM K-Series VTEC Oil Control Valve O-Ring',
    brand: 'Honda OEM',
    sku: '15832-PNA-023',
    price: 12.00,
    originalPrice: null,
    image: 'https://elusiveracing.com.au/wp-content/uploads/honda-15832-pna-023-image-1.jpg',
    href: '/products/honda-oem-k-series-vtec-ocv-o-ring',
    description: 'Genuine Honda OEM O-ring for the VTEC Oil Control Valve on K-series engines. A common source of oil leaks around the OCV — cheap fix before it becomes a big mess.',
    category: 'Engine',
    subcategory: 'Gaskets',
    vehicles: ['Civic EK (96–00)', 'Integra DC2 (94–01)', 'Integra DC5 (02–06)', 'Accord CL9 (03–07)'],
    tags: ['oem', 'o-ring', 'vtec', 'ocv', 'k-series', 'gasket'],
  },
  {
    id: '21',
    name: 'Circuit Hero Lower Timing Chain Guide Type-II (K20/K24)',
    brand: 'Circuit Hero',
    sku: 'CH-LTCG-K',
    price: 95.00,
    originalPrice: null,
    image: 'https://elusiveracing.com.au/wp-content/uploads/f16cc36a-f7e9-469f-9044-083a13da0456.webp',
    href: '/products/circuit-hero-timing-chain-guide-k20-k24',
    description: 'Circuit Hero Type-II lower timing chain guide for K20 and K24 engines. Upgraded billet design prevents chain walk at high RPM. A must for high-revving K-swaps.',
    category: 'Engine',
    subcategory: 'Chains, Belts & Tensioners',
    vehicles: ['Civic EK (96–00)', 'Civic EG (92–95)', 'Integra DC2 (94–01)', 'Integra DC5 (02–06)'],
    tags: ['chain guide', 'k20', 'k24', 'timing', 'circuit hero'],
  },
  {
    id: '22',
    name: 'Hybrid Racing K-Series Serpentine Belt',
    brand: 'Hybrid Racing',
    sku: 'HYB-BLT-00-01',
    price: 55.00,
    originalPrice: 68.00,
    image: 'https://elusiveracing.com.au/wp-content/uploads/HYB-BLT-00-01-image-1.webp',
    href: '/products/hybrid-racing-k-series-serpentine-belt',
    description: 'Hybrid Racing replacement serpentine belt for K-series engine swaps. Correct length and tooth pitch for K20/K24 accessory drive setups in EG, EK, and DC2 chassis.',
    category: 'Engine',
    subcategory: 'Chains, Belts & Tensioners',
    vehicles: ['Civic EK (96–00)', 'Civic EG (92–95)', 'Integra DC2 (94–01)'],
    tags: ['belt', 'serpentine', 'k-series', 'k20', 'k24', 'hybrid racing'],
  },
];

const VENDORS = [...new Set(DUMMY_PRODUCTS.map((p) => p.brand))].sort();

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

function filterAndSort(products, { q, brands, sub, vehicles, minPrice, maxPrice, sale, backorder, sort }) {
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
  const saleParam      = searchParams.get('sale')      ?? '';
  const backorderParam = searchParams.get('backorder') ?? '';
  const sortParam      = searchParams.get('sort')      ?? 'best-selling';
  const minParam       = searchParams.get('min_price') ?? '';
  const maxParam       = searchParams.get('max_price') ?? '';
  const pageParam      = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const perPageParam   = parseInt(searchParams.get('per_page') ?? '12', 10);

  const activeBrands   = parseList(brandsParam);
  const activeVehicles = parseList(vehiclesParam);

  // Local state only for inputs that need typing before applying
  const [searchInput, setSearchInput] = useState(qParam);
  const [localMin,    setLocalMin]    = useState(minParam);
  const [localMax,    setLocalMax]    = useState(maxParam);
  const [drawerOpen,  setDrawerOpen]  = useState(false);

  // Keep local inputs in sync when URL changes (e.g. clear all)
  useEffect(() => { setSearchInput(qParam); }, [qParam]);
  useEffect(() => { setLocalMin(minParam); setLocalMax(maxParam); }, [minParam, maxParam]);

  const filtered = useMemo(
    () => filterAndSort(DUMMY_PRODUCTS, {
      q: qParam,
      brands: activeBrands,
      sub: subParam,
      vehicles: activeVehicles,
      minPrice: minParam,
      maxPrice: maxParam,
      sale: saleParam === '1',
      backorder: backorderParam === '1',
      sort: sortParam,
    }),
    [qParam, brandsParam, subParam, vehiclesParam, minParam, maxParam, saleParam, backorderParam, sortParam]
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
    setParam('q', searchInput.trim());
    setDrawerOpen(false);
  }

  function applyPrice() {
    const p = Object.fromEntries(searchParams.entries());
    if (localMin) p.min_price = localMin; else delete p.min_price;
    if (localMax) p.max_price = localMax; else delete p.max_price;
    setSearchParams(p);
  }

  function clearFilters() {
    setSearchInput('');
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
    [subParam, minParam || maxParam, saleParam, backorderParam, qParam].filter(Boolean).length;

  // Count products per subcategory for badges
  function subCount(sub) {
    return DUMMY_PRODUCTS.filter((p) => p.subcategory === sub).length;
  }

  const FilterPanel = () => (
    <div className="shop-filter-panel">

      {/* Search */}
      <CollapsibleSection title="Search" defaultOpen>
        <div className="shop-filter-search">
          <Search size={14} />
          <input
            type="text"
            placeholder="Products, brands, SKUs..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applySearch()}
            className="shop-filter-search-input"
          />
        </div>
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
          {VENDORS.map((v) => (
            <label key={v} className="shop-filter-check">
              <input
                type="checkbox"
                checked={activeBrands.includes(v)}
                onChange={() => toggleBrand(v)}
              />
              <span>{v}</span>
              <span className="shop-filter-count">
                ({DUMMY_PRODUCTS.filter((p) => p.brand === v).length})
              </span>
            </label>
          ))}
        </div>
      </CollapsibleSection>

      {/* Vehicle */}
      <CollapsibleSection title="Vehicle Model" defaultOpen={false}>
        <div className="shop-filter-check-list">
          {VEHICLE_MODELS.map((v) => {
            const count = DUMMY_PRODUCTS.filter((p) => p.vehicles.includes(v)).length;
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
