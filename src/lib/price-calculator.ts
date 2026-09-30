import { PriceConfig } from '@/types/database';

export interface PriceCalculationParams {
  mode?: 'document' | 'photo' | 'image';
  pages: number;
  copies: number;
  colorMode: 'bw' | 'color';
  paperSize: string;
  paperType?: string;
  quality?: string;
  orientation?: 'portrait' | 'landscape' | 'auto';
  duplex?: boolean;
  photoSize?: string;
  photoPaper?: string;
  photoQuality?: string;
  binding?: boolean;
  stapling?: boolean;
  priceConfig?: PriceConfig | null;
}

export interface PriceBreakdownItem {
  label: string;
  amount: number;
  note?: string;
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
  items: PriceBreakdownItem[];
}

export const DEFAULT_PRICE_CONFIG: PriceConfig = {
  currency: 'INR',
  currencySymbol: '₹',
  rates: {
    bw: 2.0,
    color: 10.0,
    bw_single: 2.0,
    bw_double: 3.0,
    color_single: 10.0,
    color_double: 18.0,
  },
  rateBwSingle: 2.0,
  rateBwDouble: 3.0,
  rateColorSingle: 10.0,
  rateColorDouble: 18.0,
  rateSpiralBinding: 30.0,
  rateStapling: 2.0,
  paperSizes: {
    a4: { name: 'A4', extra: 0.0, enabled: true, description: 'Standard 75 GSM' },
    a3: { name: 'A3', extra: 4.0, enabled: true, description: 'Large Poster' },
    a5: { name: 'A5', extra: 0.0, enabled: true, description: 'Compact Booklet' },
    legal: { name: 'Legal', extra: 2.0, enabled: true, description: 'Govt Stamp / Court' },
    letter: { name: 'Letter', extra: 0.0, enabled: true, description: '8.5 × 11 in' },
    custom: { name: 'Custom / Bond', extra: 2.0, enabled: true, description: 'Executive Bond' },
  },
  paperTypes: {
    plain: { name: 'Plain Paper (75 GSM)', extra: 0.0, enabled: true, description: 'Standard xerox' },
    bond: { name: 'Bond Paper (85 GSM)', extra: 2.0, enabled: true, description: 'Official letters' },
    glossy: { name: 'Glossy Paper', extra: 10.0, enabled: true, description: 'Color flyers' },
    matte: { name: 'Matte Coated Paper', extra: 8.0, enabled: true, description: 'Presentation' },
  },
  qualities: {
    normal: { name: 'Normal', extra: 0.0, enabled: true },
    high: { name: 'High Quality', extra: 2.0, enabled: true },
    photo: { name: 'Photo Grade', extra: 6.0, enabled: true },
  },
  photoSizes: {
    '4x6': { name: '4 × 6 inch (Standard Photo)', price: 15.0, enabled: true, aspectRatio: '4/6' },
    '5x7': { name: '5 × 7 inch (Cabinet Photo)', price: 25.0, enabled: true, aspectRatio: '5/7' },
    '6x8': { name: '6 × 8 inch (Large Photo)', price: 40.0, enabled: true, aspectRatio: '6/8' },
    passport: { name: 'Passport Photo (8 Sheets Sheet)', price: 35.0, enabled: true, aspectRatio: '1/1' },
    a4_photo: { name: 'A4 Full Photo (8.3 × 11.7 in)', price: 50.0, enabled: true, aspectRatio: '1/1.414' },
  },
  photoPapers: {
    glossy: { name: 'Glossy Photo Paper (210 GSM)', extra: 0.0, enabled: true },
    matte: { name: 'Matte Photo Paper (230 GSM)', extra: 5.0, enabled: true },
    premium: { name: 'Premium Metallic / Satin Paper', extra: 15.0, enabled: true },
  },
  photoQualities: {
    standard: { name: 'Standard Photo Quality', extra: 0.0, enabled: true },
    high: { name: 'High Resolution (600 DPI)', extra: 5.0, enabled: true },
    photo_grade: { name: 'Studio Ultra HD (1200 DPI)', extra: 10.0, enabled: true },
  },
  payment_methods: {
    enable_upi: true,
    enable_cash: true,
  },
  is_accepting_orders: true,
  orders_paused: false,
  duplexDiscount: 0,
  taxPercentage: 0,
};

/**
 * Shared Authoritative Pricing Engine
 * Computes exact price and human-readable breakdown for both Documents and Photos.
 */
export function calculatePrintPrice(params: PriceCalculationParams): PriceCalculationResult {
  const config = params.priceConfig || DEFAULT_PRICE_CONFIG;
  const currencySymbol = config.currencySymbol || '₹';
  const copies = Math.max(1, params.copies || 1);
  const items: PriceBreakdownItem[] = [];

  const isPhotoMode = params.mode === 'photo' || (!params.mode && Boolean(params.photoSize));
  if (isPhotoMode) {
    const photoSizeKey = (params.photoSize || '4x6').toLowerCase();
    const photoSizesMap = config.photoSizes || DEFAULT_PRICE_CONFIG.photoSizes || {};
    const photoSizeObj = photoSizesMap[photoSizeKey] || photoSizesMap['4x6'] || { name: '4 × 6 inch', price: 15.0 };

    const basePhotoPrice = Number(photoSizeObj.price || 15.0);
    items.push({
      label: `Base Photo (${photoSizeObj.name || photoSizeKey})`,
      amount: basePhotoPrice,
    });

    // Photo Paper Extra
    const photoPaperKey = (params.photoPaper || 'glossy').toLowerCase();
    const photoPapersMap = config.photoPapers || DEFAULT_PRICE_CONFIG.photoPapers || {};
    const photoPaperObj = photoPapersMap[photoPaperKey];
    const photoPaperExtra = Number(photoPaperObj?.extra || 0);
    if (photoPaperExtra > 0) {
      items.push({
        label: `Photo Paper (${photoPaperObj?.name || photoPaperKey})`,
        amount: photoPaperExtra,
      });
    }

    // Photo Quality Extra
    const qualityKey = (params.photoQuality || params.quality || 'standard').toLowerCase();
    const photoQualitiesMap = config.photoQualities || DEFAULT_PRICE_CONFIG.photoQualities || {};
    const qualityObj = photoQualitiesMap[qualityKey];
    const qualityExtra = Number(qualityObj?.extra || 0);
    if (qualityExtra > 0) {
      items.push({
        label: `Quality (${qualityObj?.name || qualityKey})`,
        amount: qualityExtra,
      });
    }

    const perCopyCost = basePhotoPrice + photoPaperExtra + qualityExtra;
    const subtotal = Math.round(perCopyCost * copies * 100) / 100;
    const taxRate = Number(config.taxPercentage || 0) / 100;
    const tax = Math.round(subtotal * taxRate * 100) / 100;
    const total = Math.max(1, Math.round((subtotal + tax) * 100) / 100);

    return {
      pages: 1,
      copies,
      impressions: copies,
      sheets: copies,
      ratePerImpression: perCopyCost,
      paperExtra: photoPaperExtra * copies,
      finishingCost: 0,
      subtotal,
      tax,
      total,
      currencySymbol,
      formattedTotal: `${currencySymbol}${total.toFixed(2)}`,
      breakdownText: `${photoSizeObj.name} • ${copies} ${copies === 1 ? 'copy' : 'copies'}`,
      items,
    };
  }

  // ==========================================
  // CASE B: DOCUMENT PRINTING MODE
  // ==========================================
  const pages = Math.max(1, params.pages || 1);
  const isColor = params.colorMode === 'color';
  const isDuplex = Boolean(params.duplex && pages > 1);

  // 1. Resolve Single & Double sided rates
  const singleRate = isColor
    ? Number(config.rateColorSingle ?? config.rates?.color_single ?? config.rates?.color ?? 10.0)
    : Number(config.rateBwSingle ?? config.rates?.bw_single ?? config.rates?.bw ?? 2.0);

  const doubleRate = isColor
    ? Number(config.rateColorDouble ?? config.rates?.color_double ?? (singleRate * 1.8))
    : Number(config.rateBwDouble ?? config.rates?.bw_double ?? (singleRate * 1.5));

  // 2. Physical sheets and print cost per copy
  let physicalSheetsPerCopy = pages;
  let printCostPerCopy = 0;

  if (isDuplex) {
    const fullDoubleSheets = Math.floor(pages / 2);
    const oddPages = pages % 2;
    physicalSheetsPerCopy = Math.ceil(pages / 2);
    printCostPerCopy = (fullDoubleSheets * doubleRate) + (oddPages * singleRate);

    items.push({
      label: `Base Print (${pages} Pages Duplex / 2-Sided)`,
      amount: printCostPerCopy,
      note: `${fullDoubleSheets} duplex @ ₹${doubleRate.toFixed(2)}` + (oddPages > 0 ? ` + 1 single @ ₹${singleRate.toFixed(2)}` : ''),
    });
  } else {
    physicalSheetsPerCopy = pages;
    printCostPerCopy = pages * singleRate;

    items.push({
      label: `Base Print (${pages} Pages @ ${currencySymbol}${singleRate.toFixed(2)}/pg)`,
      amount: printCostPerCopy,
      note: isColor ? 'Full Color' : 'Black & White',
    });
  }

  // 3. Paper Size Extra per physical sheet
  const paperSizeKey = (params.paperSize || 'a4').toLowerCase();
  const paperSizesMap = config.paperSizes || DEFAULT_PRICE_CONFIG.paperSizes || {};
  const paperSizeObj = paperSizesMap[paperSizeKey] || paperSizesMap['a4'] || { name: 'A4', extra: 0 };
  const paperSizeExtraPerSheet = Number(paperSizeObj.extra || 0);

  if (paperSizeExtraPerSheet > 0) {
    const totalSizeExtra = physicalSheetsPerCopy * paperSizeExtraPerSheet;
    items.push({
      label: `Paper Size Extra (${paperSizeObj.name || paperSizeKey.toUpperCase()})`,
      amount: totalSizeExtra,
      note: `${physicalSheetsPerCopy} sheets × ${currencySymbol}${paperSizeExtraPerSheet.toFixed(2)}`,
    });
  }

  // 4. Paper Type Extra per physical sheet
  const paperTypeKey = (params.paperType || 'plain').toLowerCase();
  const paperTypesMap = config.paperTypes || DEFAULT_PRICE_CONFIG.paperTypes || {};
  const paperTypeObj = paperTypesMap[paperTypeKey];
  const paperTypeExtraPerSheet = Number(paperTypeObj?.extra || 0);

  if (paperTypeExtraPerSheet > 0) {
    const totalTypeExtra = physicalSheetsPerCopy * paperTypeExtraPerSheet;
    items.push({
      label: `Paper Type (${paperTypeObj?.name || paperTypeKey})`,
      amount: totalTypeExtra,
      note: `${physicalSheetsPerCopy} sheets × ${currencySymbol}${paperTypeExtraPerSheet.toFixed(2)}`,
    });
  }

  // 5. Quality Extra per physical sheet
  const qualityKey = (params.quality || 'normal').toLowerCase();
  const qualitiesMap = config.qualities || DEFAULT_PRICE_CONFIG.qualities || {};
  const qualityObj = qualitiesMap[qualityKey];
  const qualityExtraPerSheet = Number(qualityObj?.extra || 0);

  if (qualityExtraPerSheet > 0) {
    const totalQualityExtra = physicalSheetsPerCopy * qualityExtraPerSheet;
    items.push({
      label: `Print Quality (${qualityObj?.name || qualityKey})`,
      amount: totalQualityExtra,
      note: `${physicalSheetsPerCopy} sheets × ${currencySymbol}${qualityExtraPerSheet.toFixed(2)}`,
    });
  }

  const perCopySheetExtras = (paperSizeExtraPerSheet + paperTypeExtraPerSheet + qualityExtraPerSheet) * physicalSheetsPerCopy;
  const singleCopyTotal = printCostPerCopy + perCopySheetExtras;

  // 6. Finishing Add-ons
  let finishingCost = 0;
  if (params.binding) {
    const spiralRate = Number(config.rateSpiralBinding ?? 30.0);
    finishingCost += spiralRate;
    items.push({
      label: 'Spiral Binding (Per booklet)',
      amount: spiralRate,
    });
  }
  if (params.stapling) {
    const stapleRate = Number(config.rateStapling ?? 2.0);
    finishingCost += stapleRate;
    items.push({
      label: 'Corner Stapling',
      amount: stapleRate,
    });
  }

  // 7. Multiply copies
  const totalPhysicalSheets = physicalSheetsPerCopy * copies;
  const totalImpressions = pages * copies;
  const rawSubtotal = (singleCopyTotal * copies) + finishingCost;
  const subtotal = Math.round(rawSubtotal * 100) / 100;
  const taxRate = Number(config.taxPercentage || 0) / 100;
  const tax = Math.round(subtotal * taxRate * 100) / 100;
  const total = Math.max(1, Math.round((subtotal + tax) * 100) / 100);

  let breakdownText = `${totalPhysicalSheets} ${totalPhysicalSheets === 1 ? 'sheet' : 'sheets'}`;
  if (isDuplex) {
    breakdownText += ` (Duplex)`;
  } else {
    breakdownText += ` (Single)`;
  }
  if (paperSizeObj?.name) {
    breakdownText += ` • ${paperSizeObj.name}`;
  }
  if (copies > 1) {
    breakdownText += ` • ${copies} copies`;
  }

  return {
    pages,
    copies,
    impressions: totalImpressions,
    sheets: totalPhysicalSheets,
    ratePerImpression: singleRate,
    paperExtra: perCopySheetExtras * copies,
    finishingCost,
    subtotal,
    tax,
    total,
    currencySymbol,
    formattedTotal: `${currencySymbol}${total.toFixed(2)}`,
    breakdownText,
    items,
  };
}
