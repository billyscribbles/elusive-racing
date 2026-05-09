import { Link } from 'react-router-dom';
import './TermsPage.css';

const LAST_UPDATED = '23 March 2026';

const sections = [
  {
    id: 'acceptance',
    title: '1. Acceptance of Terms',
    content: `By accessing or using the Elusive Racing website at elusiveracing.com.au ("the Site"), placing an order, or engaging our workshop services, you agree to be bound by these Terms and Conditions ("Terms"). If you do not agree to these Terms, you must not use the Site or our services.

These Terms apply to all visitors, customers, and anyone who accesses or uses our services. We reserve the right to update these Terms at any time. Continued use of the Site after changes are posted constitutes your acceptance of the revised Terms.`,
  },
  {
    id: 'products',
    title: '2. Products & Pricing',
    content: `All prices on the Site are displayed in Australian Dollars (AUD) and include GST unless otherwise stated. Prices are subject to change without notice. We reserve the right to correct pricing errors at any time.

We make every effort to display product descriptions, specifications, and images as accurately as possible. However, we do not warrant that product descriptions or other content on the Site is accurate, complete, reliable, current, or error-free. Product images are for illustration purposes only and may vary from the actual product received.

We reserve the right to limit the quantity of any product we supply, to refuse service to anyone, and to discontinue any product at any time without notice.`,
  },
  {
    id: 'orders',
    title: '3. Orders & Payment',
    content: `By placing an order, you represent that you are of legal age to enter into a binding contract and are authorised to use the payment method provided.

An order confirmation email does not constitute acceptance of your order. We reserve the right to cancel or refuse any order for any reason, including but not limited to product unavailability, errors in pricing or product description, or suspected fraudulent activity. If we cancel an order after payment has been processed, a full refund will be issued.

We accept payment via credit card (Visa, Mastercard), PayPal, Afterpay, and other methods displayed at checkout. All transactions are processed securely. We do not store your full payment card details on our servers.

Where payment is made via Afterpay or similar buy-now-pay-later services, you agree to the terms and conditions of that service provider. Elusive Racing is not responsible for any disputes arising from the use of third-party payment services.`,
  },
  {
    id: 'shipping',
    title: '4. Shipping & Delivery',
    content: `We ship Australia-wide and to selected international destinations. Shipping costs and estimated delivery times are calculated at checkout based on the destination, total weight, and parcel dimensions of the order.

Delivery timeframes are estimates only and are not guaranteed. Elusive Racing is not liable for delays caused by third-party carriers, customs, weather events, or circumstances beyond our control.

Certain items are classified as dangerous goods under Australian and international transport regulations and are restricted to specific freight methods. This includes, without limitation, lithium-battery-powered products such as the Honda Motocompacto, which cannot be carried by air freight and must be sent via approved road or sea services. Where dangerous goods restrictions apply, available shipping methods, transit times, and surcharges may differ from standard parcels, and we will advise you of any limitations before dispatch.

Risk of loss and title for products pass to you upon dispatch from our warehouse. Once goods have been handed to the carrier, we recommend you contact the carrier directly for tracking and delivery enquiries.

For large or heavy items (such as engine components, suspension kits, or full exhausts), freight charges may differ from standard rates. We will contact you if any additional freight charges apply before processing your order.

International customers are responsible for all customs duties, import taxes, and associated fees applicable in their country. Elusive Racing has no control over these charges and cannot predict their amount.`,
  },
  {
    id: 'returns',
    title: '5. Returns & Refunds',
    content: `We want you to be completely satisfied with your purchase. Our returns policy operates in addition to and does not limit your rights under the Australian Consumer Law (ACL).

Change of Mind Returns: We accept change of mind returns within 7 days of delivery, provided the item is unused, in its original packaging, and in re-saleable condition. Return shipping costs for change of mind returns are the responsibility of the customer. A restocking fee of up to 20% will apply to all approved change of mind returns.

The following items are not eligible for return:
- Electrical components, ECUs, or tuning software that has been opened or activated
- Items that have been installed, used, or modified
- Special-order or custom items
- Hazardous materials including oils, fluids, and aerosols
- Items without original packaging

To initiate a return, contact us at sales@elusiveracing.com.au with your order number and reason for return. Do not return items without prior authorisation.

Faulty or Incorrect Items: If you receive a faulty, damaged, or incorrect item, please contact us within 7 days of delivery. We will arrange a replacement, repair, or refund at no cost to you, in accordance with your rights under the ACL.

Refunds will be processed to the original payment method within 5–10 business days of us receiving the returned item and confirming it meets the return criteria.`,
  },
  {
    id: 'consumer-law',
    title: '6. Australian Consumer Law',
    content: `Our goods and services come with guarantees that cannot be excluded under the Australian Consumer Law. For major failures with the service, you are entitled to:
- Cancel your service contract with us; and
- A refund for the unused portion, or to compensation for its reduced value.

You are also entitled to choose a refund or replacement for major failures with goods. If a failure with the goods or a service does not amount to a major failure, you are entitled to have the failure rectified in a reasonable time and, if this is not done, to a refund for the goods and to cancel the contract for the service and obtain a refund of any unused portion. You are also entitled to be compensated for any other reasonably foreseeable loss or damage from a failure in the goods or service.

Nothing in these Terms is intended to exclude, restrict, or modify any rights or remedies you have under the ACL or any other applicable consumer protection law.`,
  },
  {
    id: 'fitment',
    title: '7. Fitment & Compatibility',
    content: `It is the customer's responsibility to verify that any product purchased is compatible with their vehicle before purchasing. While we provide fitment information and vehicle compatibility guides as a convenience, this information is provided in good faith and without warranty.

Vehicle modification and performance parts may not be legal for use on public roads in all states and territories. It is the customer's responsibility to ensure compliance with all applicable laws and regulations, including but not limited to Australian Design Rules (ADRs), state vehicle standards, and any engineering certification requirements.

The installation of performance parts may void your vehicle's manufacturer warranty. We recommend consulting with a qualified mechanic or engineer before installing aftermarket parts.

We strongly recommend that all parts are installed by a qualified professional. Elusive Racing accepts no liability for damage, injury, or loss resulting from improper installation of any products sold on this Site.`,
  },
  {
    id: 'workshop',
    title: '8. Workshop Services',
    content: `Workshop services are provided at our Clayton South facility and are subject to appointment. By booking a service, you authorise Elusive Racing to carry out the agreed work on your vehicle.

Before bringing your vehicle to us, you represent that you are the registered owner of the vehicle or have the authority of the registered owner to authorise work to be carried out.

We will provide a quote for work prior to commencement. Any additional work identified during the service will be communicated to you before proceeding. We will not carry out additional work without your authorisation.

Vehicles left at our workshop must be collected within 5 business days of notification that the work is complete. Storage fees may apply for vehicles left beyond this period.

Elusive Racing takes all reasonable care with vehicles in our custody. However, we are not liable for pre-existing damage, or for damage caused by circumstances beyond our control. We recommend removing all valuables from your vehicle prior to dropping it off.

We tune vehicles to maximise performance within safe limits. Elusive Racing is not responsible for mechanical failures or damage resulting from the use of your vehicle on public roads, racetracks, or drag strips following tuning or modification, as the operation of your vehicle remains your responsibility at all times.`,
  },
  {
    id: 'warranty',
    title: '9. Warranty',
    content: `Many products sold by Elusive Racing are covered by a manufacturer's warranty. Warranty terms vary by product and brand. Please refer to the relevant manufacturer's warranty documentation included with your product.

Warranty claims must be directed to us in the first instance. We will liaise with the manufacturer on your behalf where applicable. Warranty claims require proof of purchase.

Warranty does not cover:
- Damage caused by improper installation
- Damage caused by misuse, abuse, or modification beyond intended use
- Normal wear and tear
- Damage caused by use in applications outside the manufacturer's specifications
- Products with removed or altered serial numbers`,
  },
  {
    id: 'intellectual-property',
    title: '10. Intellectual Property',
    content: `All content on this Site, including but not limited to text, graphics, logos, images, product descriptions, and software, is the property of Elusive Racing or its content suppliers and is protected by Australian and international copyright laws.

You may not reproduce, distribute, modify, create derivative works of, publicly display, publicly perform, republish, download, store, or transmit any content from our Site without our prior written consent, except as follows:
- You may print or download a single copy of a reasonable number of pages for your own personal, non-commercial use
- You may use our product images for editorial review purposes with appropriate attribution

Brand names and logos of third-party manufacturers displayed on this Site remain the property of their respective owners. Their display does not imply any affiliation with or endorsement by those brands beyond standard reseller arrangements.`,
  },
  {
    id: 'liability',
    title: '11. Limitation of Liability',
    content: `11.1 To the fullest extent permitted by law, Elusive Racing's total liability to you for any claim arising out of, or in connection with, the supply of any goods or services is limited to the value of those goods or services. Neither Elusive Racing nor its directors, employees, or agents will be liable for any loss or damage of any kind, however caused or arising — including, without limitation:
- Theft of any kind
- Loss of profit or revenue caused by delays in delivery
- Loss arising from unreasonable use, negligence, or fair wear and tear
- Loss arising from reliance on faulty or third-party-supplied specifications
- Indirect, incidental, special, consequential, or punitive damages
- Loss of data
- Any other commercial or economic loss

11.2 Any warranty referred to in section 9 is limited to the affected product itself. Elusive Racing will not be liable for any consequential damage in connection with a warranty claim, including, without limitation, injury to any person, towage, accommodation, or loss of income. Warranty does not extend to defects or failures arising from:
- Accident or impact damage
- Misuse, abuse, or overloading
- Negligence in installation, operation, or maintenance
- Participation in motor sport or any form of competition
- Use in vehicles modified from the manufacturer's original specifications

11.3 Nothing in these Terms limits or excludes any rights or remedies you may have under the Australian Consumer Law or any other applicable law that cannot lawfully be excluded, including (where applicable) liability for death or personal injury caused by our negligence.`,
  },
  {
    id: 'privacy',
    title: '12. Privacy',
    content: `We collect and handle your personal information in accordance with our Privacy Policy and the Privacy Act 1988 (Cth). By using the Site or placing an order, you consent to the collection and use of your personal information as described in our Privacy Policy.

We collect personal information such as your name, address, email, and phone number for the purpose of processing orders, providing customer support, and communicating with you about your orders and services.

We do not sell, rent, or share your personal information with third parties for marketing purposes. We may share your information with trusted third parties who assist in operating our website, conducting our business, or servicing you, provided those parties agree to keep this information confidential.

You may request access to, or correction of, personal information we hold about you by sending a written request to admin@elusiveracing.com.au. Please include your full name, the email address used on your account, and a description of the information you would like to access or have corrected so we can verify your identity and respond promptly.`,
  },
  {
    id: 'wholesale',
    title: '13. Wholesale & Trade Accounts',
    content: `Wholesale and trade pricing is available to qualifying businesses. Applications must be submitted via our website and are subject to approval. We reserve the right to approve or decline wholesale applications at our discretion.

Approved wholesale customers are bound by these Terms in addition to any separate wholesale agreement in place. Wholesale pricing must not be disclosed to retail customers. Misuse of a wholesale account may result in immediate termination.

Wholesale orders are subject to minimum order quantities and payment terms as agreed at the time of account approval.`,
  },
  {
    id: 'links',
    title: '14. Third-Party Links',
    content: `Our Site may contain links to third-party websites. These links are provided for your convenience only. We have no control over the content of those sites and accept no responsibility for them or for any loss or damage that may arise from your use of them. Linking to a third-party site does not imply endorsement of that site or its contents.`,
  },
  {
    id: 'changes',
    title: '15. Changes to These Terms',
    content: `We reserve the right to modify these Terms at any time. Changes will be effective immediately upon posting to the Site. It is your responsibility to review these Terms periodically. Your continued use of the Site following any changes constitutes your acceptance of the new Terms.`,
  },
  {
    id: 'governing-law',
    title: '16. Governing Law',
    content: `These Terms are governed by the laws of the State of Victoria, Australia. You agree to submit to the exclusive jurisdiction of the courts of Victoria for any disputes arising out of or relating to these Terms or your use of the Site.

If any provision of these Terms is found to be unenforceable, that provision will be modified to the minimum extent necessary to make it enforceable, and the remaining provisions will continue in full force and effect.`,
  },
  {
    id: 'contact',
    title: '17. Contact',
    content: `If you have any questions about these Terms and Conditions, please contact us:

Elusive Racing
1/32 Graham Rd, Clayton South VIC 3169
Phone: 03 9574 1710
Email: sales@elusiveracing.com.au`,
  },
];

export default function TermsPage() {
  return (
    <div className="terms-page">
      <div className="container">
        <div className="terms-header">
          <div className="terms-breadcrumb">
            <Link to="/">Home</Link>
            <span>/</span>
            <span>Terms &amp; Conditions</span>
          </div>
          <h1 className="terms-title">Terms &amp; Conditions</h1>
          <p className="terms-meta">Last updated: {LAST_UPDATED}</p>
          <p className="terms-intro">
            Please read these Terms and Conditions carefully before using the Elusive Racing website or placing an order.
            These Terms govern your use of our website and services. By using our site or purchasing from us,
            you agree to these Terms.
          </p>
        </div>

        <div className="terms-body">
          {/* Table of contents */}
          <aside className="terms-toc">
            <h2 className="terms-toc-title">Contents</h2>
            <nav>
              <ol className="terms-toc-list">
                {sections.map((s) => (
                  <li key={s.id}>
                    <a href={`#${s.id}`}>{s.title}</a>
                  </li>
                ))}
              </ol>
            </nav>
          </aside>

          {/* Content */}
          <div className="terms-content">
            {sections.map((s) => (
              <section key={s.id} id={s.id} className="terms-section">
                <h2 className="terms-section-title">{s.title}</h2>
                {s.content.split('\n\n').map((para, i) => (
                  para.startsWith('- ') ? (
                    <ul key={i} className="terms-list">
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
          </div>
        </div>

        <div className="terms-footer-note">
          <p>
            Questions about our terms?{' '}
            <Link to="/contact">Contact us</Link> and we'll be happy to help.
          </p>
        </div>
      </div>
    </div>
  );
}
