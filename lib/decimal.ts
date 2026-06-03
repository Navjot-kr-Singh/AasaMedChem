import Decimal from 'decimal.js';

// Configure Decimal for pharmaceutical precision
Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

/**
 * Creates a Decimal instance safely from string, number, or another Decimal.
 */
export function dec(val: string | number | Decimal | null | undefined): Decimal {
  if (val === null || val === undefined) {
    return new Decimal(0);
  }
  return new Decimal(val);
}

/**
 * Formats a Decimal value as a clean string, stripping trailing zeros, up to a maximum number of decimal places.
 */
export function formatDecimal(val: Decimal | string | number, maxDecimals = 10): string {
  const d = dec(val);
  if (d.isZero()) return '0';
  
  // Format with fixed precision, then strip trailing zeros
  const fixed = d.toFixed(maxDecimals);
  // remove trailing zeros after decimal point, and decimal point itself if all zeros
  return fixed.replace(/\.?0+$/, "");
}

/**
 * Formats a currency value as Indian Rupee (INR) conforming to the standard.
 * e.g., ₹1,25,000.00
 */
export function formatINR(val: Decimal | string | number | null | undefined): string {
  if (val === null || val === undefined) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR"
    }).format(0);
  }
  const num = typeof val === 'object' && 'toNumber' in val ? (val as Decimal).toNumber() : Number(val);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR"
  }).format(num);
}
