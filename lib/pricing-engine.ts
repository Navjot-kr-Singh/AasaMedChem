import Decimal from 'decimal.js';
import { convertToBaseUnit, BASE_UNITS, DimensionType, UnitType } from './conversions';
import { dec } from './decimal';

export interface PricingInput {
  enteredQuantity: string | number | Decimal;
  enteredUnit: UnitType;
  pricePerBaseUnit: string | number | Decimal;
  dimensionType: DimensionType;
}

export interface PricingResult {
  enteredQuantity: string;
  enteredUnit: UnitType;
  convertedQuantity: string;
  internalUnit: UnitType;
  pricePerBaseUnit: string;
  totalPrice: string;
}

/**
 * Calculates pricing for a product order or quotation based on:
 * 1. Converting entered quantity to internal base unit
 * 2. Pricing calculation (convertedQuantity * pricePerBaseUnit)
 */
export function calculatePricing({
  enteredQuantity,
  enteredUnit,
  pricePerBaseUnit,
  dimensionType
}: PricingInput): PricingResult {
  const qty = dec(enteredQuantity);
  const price = dec(pricePerBaseUnit);
  
  // Step 1: Unit Conversion to Base Unit
  const convertedQty = convertToBaseUnit(qty, enteredUnit);
  const baseUnit = BASE_UNITS[dimensionType];
  
  // Step 2: Pricing Calculation
  const total = convertedQty.times(price);
  
  return {
    enteredQuantity: qty.toFixed(10).replace(/\.?0+$/, ""),
    enteredUnit,
    convertedQuantity: convertedQty.toFixed(10).replace(/\.?0+$/, ""),
    internalUnit: baseUnit,
    pricePerBaseUnit: price.toFixed(10).replace(/\.?0+$/, ""),
    totalPrice: total.toFixed(10).replace(/\.?0+$/, "")
  };
}
