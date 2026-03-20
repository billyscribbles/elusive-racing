import './FeaturedProducts.css';

// Placeholder product data - will be replaced with Shopify API data
const products = [
  {
    id: 1,
    name: 'K-Tuned Street Clutch Kit',
    brand: 'K-Tuned',
    price: 449.00,
    originalPrice: 499.00,
    image: 'https://elusiveracing.com.au/wp-content/uploads/menu-clutch.jpg',
    href: '/product/k-tuned-street-clutch-kit',
    badge: 'Sale',
    badgeType: 'sale',
  },
  {
    id: 2,
    name: 'AEM Cold Air Intake System',
    brand: 'AEM',
    price: 299.00,
    originalPrice: null,
    image: 'https://elusiveracing.com.au/wp-content/uploads/menu-honda-engine.jpg',
    href: '/product/aem-cold-air-intake',
    badge: 'New',
    badgeType: 'new',
  },
  {
    id: 3,
    name: 'BC Racing BR Series Coilovers',
    brand: 'BC Racing',
    price: 1089.00,
    originalPrice: null,
    image: 'https://elusiveracing.com.au/wp-content/uploads/menu-maintenacne.jpg',
    href: '/product/bc-racing-br-coilovers',
    badge: null,
    badgeType: null,
  },
  {
    id: 4,
    name: 'Hondata FlashPro K-Series',
    brand: 'Hondata',
    price: 799.00,
    originalPrice: null,
    image: 'https://elusiveracing.com.au/wp-content/uploads/menu-honda-drivetrain.jpg',
    href: '/product/hondata-flashpro',
    badge: 'Popular',
    badgeType: 'popular',
  },
  {
    id: 5,
    name: 'Skunk2 Pro Series Cam Gears',
    brand: 'Skunk2',
    price: 189.00,
    originalPrice: 220.00,
    image: 'https://elusiveracing.com.au/wp-content/uploads/menu-lsd.jpg',
    href: '/product/skunk2-pro-cam-gears',
    badge: 'Sale',
    badgeType: 'sale',
  },
  {
    id: 6,
    name: 'Project Mu NS Front Brake Pads',
    brand: 'Project Mu',
    price: 159.00,
    originalPrice: null,
    image: 'https://elusiveracing.com.au/wp-content/uploads/menu-driveshaft.jpg',
    href: '/product/project-mu-ns-pads',
    badge: null,
    badgeType: null,
  },
  {
    id: 7,
    name: 'ARP Head Stud Kit B-Series',
    brand: 'ARP',
    price: 219.00,
    originalPrice: null,
    image: 'https://elusiveracing.com.au/wp-content/uploads/menu-synchros.jpg',
    href: '/product/arp-head-stud-b-series',
    badge: null,
    badgeType: null,
  },
  {
    id: 8,
    name: 'HKS Super SQV4 Blow Off Valve',
    brand: 'HKS',
    price: 349.00,
    originalPrice: 399.00,
    image: 'https://elusiveracing.com.au/wp-content/uploads/menu-honda-body.jpg',
    href: '/product/hks-sqv4-bov',
    badge: 'Sale',
    badgeType: 'sale',
  },
];

function ProductCard({ product }) {
  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : null;

  return (
    <a href={product.href} className="product-card">
      <div className="product-image-wrap">
        <img src={product.image} alt={product.name} loading="lazy" className="product-image" />
        {product.badge && (
          <span className={`product-badge product-badge--${product.badgeType}`}>{product.badge}</span>
        )}
      </div>
      <div className="product-info">
        <span className="product-brand">{product.brand}</span>
        <h3 className="product-name">{product.name}</h3>
        <div className="product-pricing">
          <span className="product-price">${product.price.toFixed(2)}</span>
          {product.originalPrice && (
            <>
              <span className="product-original-price">${product.originalPrice.toFixed(2)}</span>
              <span className="product-discount">-{discount}%</span>
            </>
          )}
        </div>
      </div>
      <div className="product-actions">
        <button className="product-quick-add" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
          Add to Cart
        </button>
      </div>
    </a>
  );
}

export default function FeaturedProducts() {
  return (
    <section className="featured-products-section">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">Featured Products</h2>
          <p className="section-subtitle">Hand-picked performance parts from top brands</p>
        </div>
        <div className="products-grid">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
        <div className="products-cta">
          <a href="/shop" className="btn-primary">View All Products</a>
        </div>
      </div>
    </section>
  );
}
