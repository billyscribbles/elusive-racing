import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatPrice } from './formatPrice';

function formatAddress(addr) {
  if (!addr) return '';
  return [addr.address1, addr.address2, addr.city, addr.state, addr.postcode, addr.country].filter(Boolean).join(', ');
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch { return iso; }
}

export function generateReceiptPdf(order) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  // ── Business header ──
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('Elusive Racing', margin, y);
  y += 7;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text('1/32 Graham Rd, Clayton South VIC 3169', margin, y);
  y += 4.5;
  doc.text('Phone: (03) 9574 1710  |  elusiveracing.com.au', margin, y);
  y += 8;

  // ── Divider ──
  doc.setDrawColor(220);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // ── Order Receipt title ──
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text('ORDER RECEIPT', margin, y);
  y += 8;

  // ── Order meta ──
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Order #${order.orderId}`, margin, y);
  doc.text(`Date: ${formatDate(order.orderDate)}`, pageWidth - margin, y, { align: 'right' });
  y += 5;
  doc.text(`Payment: ${order.paymentMethodLabel}`, margin, y);
  y += 8;

  // ── Divider ──
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // ── Customer + Delivery (two columns) ──
  const colMid = margin + contentWidth / 2;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Customer', margin, y);
  doc.text(order.fulfillment === 'collect' ? 'Click & Collect' : 'Delivery Address', colMid, y);
  y += 5.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`${order.customer.firstName} ${order.customer.lastName}`, margin, y);
  if (order.fulfillment === 'collect') {
    doc.text('1/32 Graham Rd, Clayton South VIC 3169', colMid, y);
  } else {
    const addrStr = formatAddress(order.shippingAddress);
    const addrLines = doc.splitTextToSize(addrStr, contentWidth / 2 - 5);
    doc.text(addrLines, colMid, y);
  }
  y += 5;

  doc.text(order.customer.email, margin, y);
  y += 5;
  if (order.customer.phone) {
    doc.text(order.customer.phone, margin, y);
    y += 5;
  }
  y += 5;

  // ── Divider ──
  doc.line(margin, y, pageWidth - margin, y);
  y += 3;

  // ── Items table ──
  const tableRows = order.items.map(item => [
    item.brand ? `${item.brand} — ${item.name}` : item.name,
    String(item.quantity),
    formatPrice(item.price),
    formatPrice(item.price * item.quantity),
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Item', 'Qty', 'Price', 'Total']],
    body: tableRows,
    theme: 'plain',
    headStyles: {
      fillColor: [245, 245, 245],
      textColor: [60, 60, 60],
      fontStyle: 'bold',
      fontSize: 9,
      cellPadding: 3,
    },
    bodyStyles: {
      fontSize: 9,
      cellPadding: 3,
      textColor: [30, 30, 30],
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { halign: 'center', cellWidth: 18 },
      2: { halign: 'right',  cellWidth: 25 },
      3: { halign: 'right',  cellWidth: 25 },
    },
    didDrawPage: () => {},
  });

  y = doc.lastAutoTable.finalY + 5;

  // ── Totals ──
  const totalsX = pageWidth - margin;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal:', totalsX - 40, y);
  doc.text(formatPrice(order.subtotal), totalsX, y, { align: 'right' });
  y += 5.5;

  doc.text(`${order.shippingLabel}:`, totalsX - 40, y);
  doc.text(order.shippingCost === 0 ? 'Free' : formatPrice(order.shippingCost), totalsX, y, { align: 'right' });
  y += 6;

  doc.setDrawColor(180);
  doc.line(totalsX - 55, y, totalsX, y);
  y += 5;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Total:', totalsX - 40, y);
  doc.text(`${formatPrice(order.total)} AUD`, totalsX, y, { align: 'right' });
  y += 10;

  // ── BACS note ──
  if (order.paymentMethod === 'bacs') {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text('Bank Transfer Details:', margin, y);
    y += 5;
    doc.text('Commonwealth Bank of Australia', margin, y); y += 4;
    doc.text('Account Name: Elusive Racing Pty Ltd', margin, y); y += 4;
    doc.text('BSB: 063-000  |  Account: 1234 5678', margin, y); y += 4;
    doc.text(`Reference: #${order.orderId}`, margin, y);
    y += 10;
  }

  // ── Footer ──
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.setFont('helvetica', 'normal');
  doc.text('Thank you for shopping with Elusive Racing!', pageWidth / 2, y, { align: 'center' });

  doc.save(`ElusiveRacing-Order-${order.orderId}.pdf`);
}
