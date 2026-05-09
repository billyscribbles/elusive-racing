import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import './ShippingPage.css';

const policySections = [
  {
    id: 'overview',
    title: 'Overview',
    content: `We ship parts Australia-wide and internationally. This page explains how we dispatch your order, who carries it, and what to expect on delivery. For questions about a specific order, please get in touch — our team is happy to help.`,
  },
  {
    id: 'processing',
    title: 'Order Processing',
    content: `In-stock items are dispatched within 1 business day of payment clearing. Back-ordered items are dispatched within 1–2 business days, depending on supplier lead time.

You will receive a tracking link by email as soon as your order leaves our warehouse.`,
  },
  {
    id: 'signature',
    title: 'Delivery & Signature',
    content: `All deliveries require a signature on receipt. This protects your order from being left unattended and reduces the risk of loss in transit.

If no one is available to sign, the carrier will leave a card and either reattempt delivery or hold the parcel at a depot for collection.`,
  },
  {
    id: 'authority-to-leave',
    title: 'Authority to Leave',
    content: `If you would prefer the carrier leave your parcel without a signature, please add an Authority to Leave note in the order comments at checkout.

Please note: once a package has been left at your property, Elusive Racing PTY LTD cannot be held responsible for any loss or damage.`,
  },
  {
    id: 'transit-damage',
    title: 'Transit Damage',
    content: `Elusive Racing PTY LTD is not liable for damage that occurs during transit unless delivery insurance has been pre-arranged. If you would like your order insured, contact us before placing the order so we can quote and add cover.

If your parcel arrives damaged, please refuse delivery if possible, photograph the packaging, and contact us within 24 hours of receipt.`,
  },
];

const domesticCarriers = [
  {
    name: 'Australia Post',
    label: 'Transit times',
    href: 'https://auspost.com.au/service-updates/domestic-delivery-times',
  },
  {
    name: 'TNT (Domestic)',
    label: 'Transit times',
    href: 'https://www.tnt.com/express/en_au/site/shipping-tools/transit-times.html',
  },
  {
    name: 'Allied Express',
    label: 'FAQ',
    href: 'https://www.alliedexpress.com.au/faq/',
  },
];

const internationalCarriers = [
  {
    name: 'DHL eCommerce',
    label: 'FAQ',
    href: 'https://www.dhl.com/au-en/home/our-divisions/ecommerce-solutions/customer-service/business-customer-faq.html',
  },
  {
    name: 'UPS',
    label: 'Rates & times',
    href: 'https://www.ups.com/au/en/help-center/shipping-support/rates-and-times.page',
  },
  {
    name: 'FedEx International Economy',
    label: 'International Economy',
    href: 'https://www.fedex.com/en-au/shipping/services/international-economy.html',
  },
  {
    name: 'Interparcel (DHL Express)',
    label: 'DHL Express',
    href: 'https://au.interparcel.com/couriers/dhl/express',
  },
  {
    name: 'TNT International',
    label: 'International services',
    href: 'https://www.tnt.com/express/en_au/site/shipping-services/international.html',
  },
];

function CarrierList({ carriers }) {
  return (
    <ul className="shipping-carrier-list">
      {carriers.map((c) => (
        <li key={c.href} className="shipping-carrier-row">
          <span className="shipping-carrier-name">{c.name}</span>
          <a
            href={c.href}
            target="_blank"
            rel="noopener noreferrer"
            className="shipping-carrier-link"
          >
            {c.label}
            <ExternalLink size={13} strokeWidth={2} aria-hidden="true" />
          </a>
        </li>
      ))}
    </ul>
  );
}

const tocEntries = [
  ...policySections.map((s) => ({ id: s.id, title: s.title })),
  { id: 'domestic', title: 'Domestic Carriers' },
  { id: 'international', title: 'International Carriers' },
];

export default function ShippingPage() {
  return (
    <div className="shipping-page">
      <div className="container">
        <div className="shipping-header">
          <div className="shipping-breadcrumb">
            <Link to="/">Home</Link>
            <span>/</span>
            <span>Shipping</span>
          </div>
          <h1 className="shipping-title">Shipping</h1>
          <p className="shipping-intro">
            How we dispatch your order, the carriers we use, and what to expect on delivery — both within Australia and internationally.
          </p>
        </div>

        <div className="shipping-body">
          <aside className="shipping-toc">
            <h2 className="shipping-toc-title">On this page</h2>
            <nav>
              <ol className="shipping-toc-list">
                {tocEntries.map((e) => (
                  <li key={e.id}>
                    <a href={`#${e.id}`}>{e.title}</a>
                  </li>
                ))}
              </ol>
            </nav>
          </aside>

          <div className="shipping-content">
            {policySections.map((s) => (
              <section key={s.id} id={s.id} className="shipping-section">
                <h2 className="shipping-section-title">{s.title}</h2>
                {s.content.split('\n\n').map((para, i) => (
                  para.startsWith('- ') ? (
                    <ul key={i} className="shipping-list">
                      {para.split('\n').map((line, j) => (
                        <li key={j}>{line.replace(/^- /, '')}</li>
                      ))}
                    </ul>
                  ) : (
                    <p key={i}>{para}</p>
                  )
                ))}
              </section>
            ))}

            <section id="domestic" className="shipping-section">
              <h2 className="shipping-section-title">Domestic Carriers</h2>
              <p>
                Within Australia we ship via the carriers below. Click through for live transit-time and service information from each carrier.
              </p>
              <CarrierList carriers={domesticCarriers} />
            </section>

            <section id="international" className="shipping-section">
              <h2 className="shipping-section-title">International Carriers</h2>
              <p>
                For international orders we use one of the following carriers depending on destination, weight, and dimensions.
              </p>
              <CarrierList carriers={internationalCarriers} />
            </section>
          </div>
        </div>

        <div className="shipping-footer-note">
          <p>
            Questions about shipping?{' '}
            <Link to="/contact">Contact us</Link> or call <a href="tel:+61395741710">03 9574 1710</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
