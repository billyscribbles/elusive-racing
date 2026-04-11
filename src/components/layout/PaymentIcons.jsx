import { PaymentIcon } from 'react-svg-credit-card-payment-icons';

export default function PaymentIcons() {
  return (
    <>
      <span className="payment-chip"><PaymentIcon type="Paypal" format="flatRounded" width={52} /></span>
      <span className="payment-chip"><PaymentIcon type="Visa" format="flatRounded" width={52} /></span>
      <span className="payment-chip"><PaymentIcon type="Mastercard" format="flatRounded" width={52} /></span>
      <span className="payment-chip"><PaymentIcon type="Amex" format="flatRounded" width={52} /></span>
    </>
  );
}
