import { PriceConfig } from '@/types/database';

export interface PriceCalculationParams {
  pages: number;
  copies: number;
  colorMode: 'bw' | 'color';
  paperSize: string;
  duplex?: boolean;
  priceConfig?: PriceConfig | null;
}

export interface PriceCalculationResult {
  pages: number;
  copies: number;
  impressions: number;
  sheets: number;
  ratePerImpression: number;
  paperExtra: number;
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
  },
  paperSizes: {
    a4: { name: 'A4', extra: 0.0, description: 'Standard 75 GSM' },
    a3: { name: 'A3', extra: 4.0, description: 'Large Sheet' },
    passport: { name: 'Passport (8×)', extra: 30.0, description: 'Glossy Sheet' },
    custom: { name: 'Custom / Legal', extra: 2.0, description: 'Legal/Bond' },
  },
  duplexDiscount: 0,
  taxPercentage: 0,
};

export function calculatePrintPrice(params: PriceCalculationParams): PriceCalculationResult {
  const config = params.priceConfig || DEFAULT_PRICE_CONFIG;
  const pages = Math.max(1, params.pages || 1);
  const copies = Math.max(1, params.copies || 1);
  const colorMode = params.colorMode === 'color' ? 'color' : 'bw';
  const paperSizeKey = (params.paperSize || 'a4').toLowerCase();
  
  const baseRate = config.rates[colorMode] ?? (colorMode === 'color' ? 10.0 : 2.0);
  const paperOption = config.paperSizes[paperSizeKey] || config.paperSizes['a4'] || { extra: 0 };
  const paperExtra = paperOption.extra || 0;
  
  const ratePerImpression = baseRate + paperExtra;
  const impressions = pages * copies;
  const sheets = params.duplex ? Math.ceil(pages / 2) * copies : impressions;

  const subtotal = Math.round(impressions * ratePerImpression * 100) / 100;
  const taxRate = (config.taxPercentage || 0) / 100;
  const tax = Math.round(subtotal * taxRate * 100) / 100;
  const total = Math.max(1, Math.round((subtotal + tax) * 100) / 100);

  const currencySymbol = config.currencySymbol || '₹';
  const formattedTotal = `${currencySymbol}${total.toFixed(2)}`;
  const breakdownText = `${impressions} impressions @ ${currencySymbol}${ratePerImpression.toFixed(2)}`;

  return {
    pages,
    copies,
    impressions,
    sheets,
    ratePerImpression,
    paperExtra,
    subtotal,
    tax,
    total,
    currencySymbol,
    formattedTotal,
    breakdownText,
  };
}
