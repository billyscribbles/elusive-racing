import useCartStore from '../../store/cartStore';
import DUMMY_PRODUCTS from '../../lib/dummyProducts';
import './FeaturedProducts.css';

// Show first 8 products — will be replaced with Shopify API data
const products = DUMMY_PRODUCTS.slice(0, 8).map((p) => ({
  ...p,
  badge: p.originalPrice ? 'Sale' : p.backorder ? 'Backorder' : null,
  badgeType: p.originalPrice ? 'sale' : p.backorder ? 'backorder' : null,
}));

function ProductCard({ product }) {
  const addItem = useCartStore((s) => s.addItem);
  const openCart = useCartStore((s) => s.openCart);

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
        <button className="product-quick-add" onClick={(e) => { e.preventDefault(); e.stopPropagation(); addItem(product); openCart(); }}>
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
