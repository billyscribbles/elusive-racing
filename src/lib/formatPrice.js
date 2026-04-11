/**
 * Format a number as AUD price with comma thousands separator.
 * e.g. 1234.5 → "$1,234.50", 9.9 → "$9.90"
 */
export function formatPrice(amount) {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '$0.00';
  return '$' + num.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
