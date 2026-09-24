import { PriceConfig } from '@/types/database';

export interface PriceCalculationParams {
  pages: number;
  copies: number;
  colorMode: 'bw' | 'color';
  paperSize: string;
  duplex?: boolean;
  binding?: boolean;
  stapling?: boolean;
  priceConfig?: PriceConfig | null;
}

export interface PriceCalculationResult {
  pages: number;
  copies: number;
  impressions: number;
  sheets: number;
  ratePerImpression: number;
  paperExtra: number;
  finishingCost: number;
  subtotal: number;
  tax: number;
  total: number;
  currencySymbol: string;
  formattedTotal: string;
  breakdownText: string;
}

export const DEFAULT_PRICE_CONFIG: PriceConfig = {
  currency: 'INR',
  currencySymbol: '₹',
  rates: {
    bw: 2.0,
    color: 10.0,
    bw_double: 3.0,
    color_double: 18.0,
  },
  rateBwSingle: 2.0,
  rateBwDouble: 3.0,
  rateColorSingle: 10.0,
  rateColorDouble: 18.0,
  rateSpiralBinding: 30.0,
  rateStapling: 2.0,
  paperSizes: {
    a4: { name: 'A4', extra: 0.0, description: 'Standard 75 GSM' },
    a3: { name: 'A3', extra: 4.0, description: 'Large Sheet' },
    passport: { name: 'Passport (8×)', extra: 30.0, description: 'Glossy Sheet' },
    custom: { name: 'Custom / Legal', extra: 2.0, description: 'Legal/Bond' },
  },
  duplexDiscount: 0,
  taxPercentage: 0,
};

/**
 * Shared Authoritative Pricing Calculation Engine
 * Used consistently across QuickPrint Desktop, Customer Web App, and Backend API validation.
 */
export function calculatePrintPrice(params: PriceCalculationParams): PriceCalculationResult {
  const config = params.priceConfig || DEFAULT_PRICE_CONFIG;
  const pages = Math.max(1, params.pages || 1);
  const copies = Math.max(1, params.copies || 1);
  const isColor = params.colorMode === 'color';
  const paperSizeKey = (params.paperSize || 'a4').toLowerCase();

  // 1. Resolve Single & Double sided base rates
  // Support both new rates.* and flat rateBwSingle/Double fields saved by desktop
  const singleRate = isColor
    ? (config.rateColorSingle ?? config.rates?.color_single ?? config.rates?.color ?? 10.0)
    : (config.rateBwSingle ?? config.rates?.bw_single ?? config.rates?.bw ?? 2.0);

  const doubleRate = isColor
    ? (config.rateColorDouble ?? config.rates?.color_double ?? (singleRate * 1.8))
    : (config.rateBwDouble ?? config.rates?.bw_double ?? (singleRate * 1.5));

  // 2. Paper size extra fee per physical sheet
  const paperOption = config.paperSizes?.[paperSizeKey] || config.paperSizes?.['a4'] || { extra: 0 };
  const paperExtraPerSheet = Number(paperOption.extra || 0);

  // 3. Physical sheets and print cost per copy
  let physicalSheetsPerCopy = pages;
  let printCostPerCopy = 0;

  if (params.duplex && pages > 1) {
    const fullDoubleSheets = Math.floor(pages / 2);
    const oddPages = pages % 2;
    physicalSheetsPerCopy = Math.ceil(pages / 2);
    printCostPerCopy = (fullDoubleSheets * doubleRate) + (oddPages * singleRate);
  } else {
    // Single sided (or duplex with single page)
    physicalSheetsPerCopy = pages;
    printCostPerCopy = pages * singleRate;
  }

  // 4. Multiply by copies
  const totalPhysicalSheets = physicalSheetsPerCopy * copies;
  const totalImpressions = pages * copies;
  const totalPaperExtra = totalPhysicalSheets * paperExtraPerSheet;

  // 5. Finishing fees
  let finishingCost = 0;
  if (params.binding) {
    finishingCost += Number(config.rateSpiralBinding ?? 30.0);
  }
  if (params.stapling) {
    finishingCost += Number(config.rateStapling ?? 2.0);
  }

  // 6. Subtotal & Tax
  const rawSubtotal = (printCostPerCopy * copies) + totalPaperExtra + finishingCost;
  const subtotal = Math.round(rawSubtotal * 100) / 100;
  const taxRate = Number(config.taxPercentage || 0) / 100;
  const tax = Math.round(subtotal * taxRate * 100) / 100;
  const total = Math.max(1, Math.round((subtotal + tax) * 100) / 100);

  const currencySymbol = config.currencySymbol || '₹';
  const formattedTotal = `${currencySymbol}${total.toFixed(2)}`;

  let breakdownText = `${totalPhysicalSheets} ${totalPhysicalSheets === 1 ? 'sheet' : 'sheets'}`;
  if (params.duplex && pages > 1) {
    breakdownText += ` (Duplex)`;
  } else {
    breakdownText += ` (Single)`;
  }
  if (paperSizeKey !== 'a4' && paperOption.name) {
    breakdownText += ` • ${paperOption.name}`;
  }
  if (params.binding) {
    breakdownText += ` • Spiral Binding`;
  } else if (params.stapling) {
    breakdownText += ` • Corner Staple`;
  }
  breakdownText += ` • ${copies} ${copies === 1 ? 'copy' : 'copies'}`;

  return {
    pages,
    copies,
    impressions: totalImpressions,
    sheets: totalPhysicalSheets,
    ratePerImpression: singleRate,
    paperExtra: totalPaperExtra,
    finishingCost,
    subtotal,
    tax,
    total,
    currencySymbol,
    formattedTotal,
    breakdownText,
  };
}
