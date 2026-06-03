import Decimal from 'decimal.js';
import { dec } from './decimal';

export type DimensionType = 'weight' | 'volume' | 'count';
export type UnitType = 'g' | 'kg' | 'mL' | 'L' | 'item';

export const DIMENSION_UNITS: Record<DimensionType, UnitType[]> = {
  weight: ['g', 'kg'],
  volume: ['mL', 'L'],
  count: ['item'],
};

export const BASE_UNITS: Record<DimensionType, UnitType> = {
  weight: 'g',
  volume: 'mL',
  count: 'item',
};

/**
 * Converts user entered quantity to the internal base unit.
 * Weight: converts kg -> g (multiply by 1000)
 * Volume: converts L -> mL (multiply by 1000)
 * Count: item -> item (no change)
 */
export function convertToBaseUnit(quantity: Decimal | string | number, fromUnit: UnitType): Decimal {
  const q = dec(quantity);
  switch (fromUnit) {
    case 'kg':
      return q.times(1000);
    case 'L':
      return q.times(1000);
    case 'g':
    case 'mL':
    case 'item':
      return q;
    default:
      throw new Error(`Unsupported unit conversion for unit: ${fromUnit}`);
  }
}

/**
 * Converts internal base unit quantity to user-facing unit.
 * Weight: converts g -> kg (divide by 1000)
 * Volume: converts mL -> L (divide by 1000)
 * Count: item -> item (no change)
 */
export function convertFromBaseUnit(quantity: Decimal | string | number, toUnit: UnitType): Decimal {
  const q = dec(quantity);
  switch (toUnit) {
    case 'kg':
      return q.dividedBy(1000);
    case 'L':
      return q.dividedBy(1000);
    case 'g':
    case 'mL':
    case 'item':
      return q;
    default:
      throw new Error(`Unsupported unit conversion for unit: ${toUnit}`);
  }
}

/**
 * Formats a quantity with its unit for user display.
 */
export function formatQuantity(quantity: Decimal | string | number, unit: UnitType): string {
  const q = dec(quantity);
  // Using 10 decimals maximum
  const fixed = q.toFixed(10).replace(/\.?0+$/, "");
  return `${fixed} ${unit}`;
}
