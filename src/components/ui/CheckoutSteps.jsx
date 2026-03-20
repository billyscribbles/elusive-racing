import { Check } from 'lucide-react';
import './CheckoutSteps.css';

const STEPS = [
  { label: 'Cart',            desc: 'Review items',     href: '/checkout'         },
  { label: 'Contact Details', desc: 'Shipping address', href: '/checkout/contact' },
  { label: 'Payment',         desc: 'Secure payment',   href: '/checkout/payment' },
];

export default function CheckoutSteps({ current }) {
  return (
    <div className="co-steps">
      {STEPS.map((step, i) => {
        const done   = i < current;
        const active = i === current;
        return (
          <div key={step.label} className={`co-step${done ? ' done' : active ? ' active' : ' pending'}`}>
            {done ? (
              <a href={step.href} className="co-step-bubble" aria-label={`Go back to ${step.label}`}>
                <Check size={13} strokeWidth={3} />
              </a>
            ) : (
              <div className="co-step-bubble"><span>{i + 1}</span></div>
            )}
            <div className="co-step-text">
              <span className="co-step-label">{step.label}</span>
              <span className="co-step-desc">{step.desc}</span>
            </div>
            {i < STEPS.length - 1 && <div className="co-step-line" />}
          </div>
        );
      })}
    </div>
  );
}
