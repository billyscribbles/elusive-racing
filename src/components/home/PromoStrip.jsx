import { Truck, ShieldCheck, CreditCard, Headphones } from 'lucide-react';
import './PromoStrip.css';

const promos = [
  {
    icon: <Truck size={28} strokeWidth={1.75} />,
    title: 'Free Shipping',
    subtitle: 'On orders over $150 AUD',
  },
  {
    icon: <ShieldCheck size={28} strokeWidth={1.75} />,
    title: 'Genuine Parts',
    subtitle: '100% authentic products',
  },
  {
    icon: <CreditCard size={28} strokeWidth={1.75} />,
    title: 'Secure Payment',
    subtitle: 'Multiple payment options',
  },
  {
    icon: <Headphones size={28} strokeWidth={1.75} />,
    title: 'Expert Support',
    subtitle: 'Technical advice available',
  },
];

export default function PromoStrip() {
  return (
    <section className="promo-strip">
      <div className="container">
        <div className="promo-grid">
          {promos.map((promo, i) => (
            <div key={i} className="promo-item">
              <div className="promo-icon">{promo.icon}</div>
              <div className="promo-text">
                <strong className="promo-title">{promo.title}</strong>
                <span className="promo-subtitle">{promo.subtitle}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
