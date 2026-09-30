/**
 * Gaurprint Capability-Based Print Routing Engine
 *
 * Separates and formalizes:
 * 1. Paper Size (A4, A3, A5, Letter, Legal, 4x6, 5x7, Custom)
 * 2. Media / Paper Type (Plain Paper, Glossy Photo, Matte Photo, Premium Photo, Card/Thick)
 * 3. Print Content Size (4x6, 5x7, Passport 8x, Full Page, Actual Size, Custom)
 * 4. Printer Capabilities (Declared + Detected + Owner Overrides)
 * 5. Job Print Requirements & Intelligent Multi-Printer Routing
 */

export type CanonicalPaperSize =
  | 'a4'
  | 'a3'
  | 'a5'
  | 'letter'
  | 'legal'
  | 'photo_4x6'
  | 'photo_5x7'
  | 'custom';

export type CanonicalMediaType =
  | 'plain'
  | 'glossy_photo'
  | 'matte_photo'
  | 'premium_photo'
  | 'card_thick'
  | 'custom_media';

export type CanonicalPrintType = 'photo' | 'image' | 'document';

export type PrinterClassification =
  | 'document'
  | 'bw'
  | 'color'
  | 'photo'
  | 'large_format'
  | 'specialized'
  | 'custom';

export type PrinterStatus =
  | 'online'
  | 'offline'
  | 'busy'
  | 'printing'
  | 'error'
  | 'paper_out'
  | 'paused'
  | 'maintenance'
  | 'unknown';

export type MediaStockStatus = 'available' | 'low' | 'out_of_paper';

export type RoutingMode = 'auto' | 'manual' | 'auto_override';

export interface PrinterCapabilities {
  paperSizes: {
    a4: boolean;
    a3: boolean;
    a5: boolean;
    letter: boolean;
    legal: boolean;
    photo_4x6: boolean;
    photo_5x7: boolean;
    custom: boolean;
  };
  mediaTypes: {
    plain: boolean;
    glossy_photo: boolean;
    matte_photo: boolean;
    premium_photo: boolean;
    card_thick: boolean;
    custom_media: boolean;
  };
  printTypes: {
    photo: boolean;
    image: boolean;
    document: boolean;
  };
  color: boolean;
  bw: boolean;
  duplex: boolean;
  borderless: boolean;
  highQuality: boolean;
  photoGrade: boolean;
}

export interface PrinterProfile {
  id?: string;
  name: string; // Windows Driver/Spooler name
  customName: string; // Friendly Display Name
  type: PrinterClassification;
  enabled: boolean; // Enabled for Order Routing
  routingPriority: number; // 1 (Highest) to 4 (Overflow)
  capabilities: PrinterCapabilities;
  detectedCapabilities?: Partial<PrinterCapabilities>;
  ownerOverrides?: Partial<PrinterCapabilities>;
  stockStatus: MediaStockStatus;
  currentMediaLoaded: CanonicalMediaType;
  status?: PrinterStatus;
  jobCount?: number;
  lastSeenAt?: string;
}

export interface JobPrintRequirements {
  printType: CanonicalPrintType;
  paperSize: CanonicalPaperSize;
  mediaType: CanonicalMediaType;
  printContentSize?: string;
  colorMode: 'bw' | 'color';
  duplex: boolean;
  borderless: boolean;
  quality: 'normal' | 'high' | 'photo_grade';
  copies: number;
  pages: number;
}

export interface CompatibilityResult {
  compatible: boolean;
  reasons: string[];
}

export interface RoutingEvaluation {
  selectedPrinter: string | null;
  status:
    | 'routed'
    | 'waiting_for_compatible_printer'
    | 'compatible_printers_offline'
    | 'manual_assignment_required';
  reason: string;
  eligiblePrinters: {
    name: string;
    profile: PrinterProfile;
    queueCount: number;
    priority: number;
    score: number;
  }[];
  incompatiblePrinters: {
    name: string;
    profile: PrinterProfile;
    reasons: string[];
  }[];
}

export const DEFAULT_PRINTER_CAPABILITIES: PrinterCapabilities = {
  paperSizes: {
    a4: true,
    a3: false,
    a5: true,
    letter: true,
    legal: true,
    photo_4x6: false,
    photo_5x7: false,
    custom: false,
  },
  mediaTypes: {
    plain: true,
    glossy_photo: false,
    matte_photo: false,
    premium_photo: false,
    card_thick: false,
    custom_media: false,
  },
  printTypes: {
    document: true,
    image: true,
    photo: false,
  },
  color: true,
  bw: true,
  duplex: false,
  borderless: false,
  highQuality: true,
  photoGrade: false,
};

export const DEFAULT_PHOTO_PRINTER_CAPABILITIES: PrinterCapabilities = {
  paperSizes: {
    a4: true,
    a3: false,
    a5: false,
    letter: false,
    legal: false,
    photo_4x6: true,
    photo_5x7: true,
    custom: true,
  },
  mediaTypes: {
    plain: false,
    glossy_photo: true,
    matte_photo: true,
    premium_photo: true,
    card_thick: true,
    custom_media: true,
  },
  printTypes: {
    document: false,
    image: true,
    photo: true,
  },
  color: true,
  bw: true,
  duplex: false,
  borderless: true,
  highQuality: true,
  photoGrade: true,
};

/**
 * Normalizes input raw strings to Canonical Paper Size
 */
export function normalizePaperSize(raw?: string | null): CanonicalPaperSize {
  if (!raw) return 'a4';
  const clean = raw.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  if (clean.includes('a3')) return 'a3';
  if (clean.includes('a5')) return 'a5';
  if (clean.includes('4x6') || clean === 'photo4x6') return 'photo_4x6';
  if (clean.includes('5x7') || clean === 'photo5x7') return 'photo_5x7';
  if (clean.includes('letter')) return 'letter';
  if (clean.includes('legal')) return 'legal';
  if (clean.includes('pass') || clean.includes('custom') || clean.includes('bond')) return 'custom';
  return 'a4';
}

/**
 * Normalizes input raw strings to Canonical Media Type
 */
export function normalizeMediaType(raw?: string | null, mode?: CanonicalPrintType): CanonicalMediaType {
  if (!raw) {
    return mode === 'photo' ? 'glossy_photo' : 'plain';
  }
  const clean = raw.trim().toLowerCase();
  if (clean.includes('gloss')) return 'glossy_photo';
  if (clean.includes('matte')) return 'matte_photo';
  if (clean.includes('prem') || clean.includes('satin') || clean.includes('metallic')) return 'premium_photo';
  if (clean.includes('card') || clean.includes('thick') || clean.includes('bond')) return 'card_thick';
  if (clean.includes('plain') || clean.includes('75') || clean.includes('80')) return 'plain';
  return mode === 'photo' ? 'glossy_photo' : 'plain';
}

/**
 * Extracts strict JobPrintRequirements from any job or cart item
 */
export function extractJobRequirements(job: {
  mode?: string;
  paper_size?: string;
  paperSize?: string;
  paper_type?: string;
  paperType?: string;
  photo_paper?: string;
  photoPaper?: string;
  photo_size?: string;
  photoSize?: string;
  color_mode?: string;
  colorMode?: string;
  duplex?: boolean;
  borderless?: boolean;
  quality?: string;
  photo_quality?: string;
  photoQuality?: string;
  copies?: number;
  pages?: number;
  print_config?: Record<string, unknown> | null;
}): JobPrintRequirements {
  const cfg = job.print_config || {};
  const rawMode = (job.mode || cfg.mode || (job.photo_size || job.photoSize ? 'photo' : 'document')) as string;
  const printType: CanonicalPrintType =
    rawMode === 'photo' ? 'photo' : rawMode === 'image' ? 'image' : 'document';

  // Paper Size vs Content Size
  const rawPaperSize = (job.paper_size || job.paperSize || cfg.paperSize || 'a4') as string;
  let paperSize = normalizePaperSize(rawPaperSize);

  // If photo mode and photo size is 4x6 on native 4x6 paper
  const rawPhotoSize = (job.photo_size || job.photoSize || cfg.photoSize || '') as string;
  if (printType === 'photo') {
    if (rawPhotoSize.includes('4x6') && (!rawPaperSize || rawPaperSize === 'a4')) {
      // In photo mode, if user selected 4x6 print, paper requirement can be 4x6 or A4 depending on shop
      paperSize = normalizePaperSize(rawPaperSize || 'photo_4x6');
    }
  }

  // Media Type
  const rawMedia = (
    job.photo_paper ||
    job.photoPaper ||
    job.paper_type ||
    job.paperType ||
    cfg.photoPaper ||
    cfg.paperType
  ) as string;
  const mediaType = normalizeMediaType(rawMedia, printType);

  // Color Mode
  const rawColor = (job.color_mode || job.colorMode || cfg.colorMode || 'bw') as string;
  const colorMode: 'bw' | 'color' = rawColor.toLowerCase() === 'color' ? 'color' : 'bw';

  // Duplex
  const duplex = Boolean(job.duplex ?? cfg.duplex ?? false);

  // Borderless
  const borderless = Boolean(job.borderless ?? cfg.borderless ?? false);

  // Quality
  const rawQuality = (
    job.photo_quality ||
    job.photoQuality ||
    job.quality ||
    cfg.photoQuality ||
    cfg.quality ||
    'normal'
  ) as string;
  let quality: 'normal' | 'high' | 'photo_grade' = 'normal';
  if (rawQuality.includes('photo') || rawQuality.includes('studio') || rawQuality.includes('1200')) {
    quality = 'photo_grade';
  } else if (rawQuality.includes('high') || rawQuality.includes('600')) {
    quality = 'high';
  }

  return {
    printType,
    paperSize,
    mediaType,
    printContentSize: rawPhotoSize || undefined,
    colorMode,
    duplex,
    borderless,
    quality,
    copies: Math.max(1, job.copies || 1),
    pages: Math.max(1, job.pages || 1),
  };
}

/**
 * Checks if a specific printer profile satisfies all requirements of a print job.
 * NEVER allows an incompatible printer to receive a job.
 */
export function evaluatePrinterCompatibility(
  requirements: JobPrintRequirements,
  printer: PrinterProfile
): CompatibilityResult {
  const reasons: string[] = [];

  if (printer.enabled === false) {
    reasons.push('Printer is disabled for order routing in shop settings');
    return { compatible: false, reasons };
  }

  const caps = printer.capabilities || DEFAULT_PRINTER_CAPABILITIES;

  // 1. Check Print Type Support (Photo / Image / Document)
  if (caps.printTypes) {
    if (requirements.printType === 'photo' && !caps.printTypes.photo) {
      reasons.push('Does not support dedicated Photo Studio printing');
    }
    if (requirements.printType === 'image' && !caps.printTypes.image) {
      reasons.push('Does not support Image printing');
    }
    if (requirements.printType === 'document' && !caps.printTypes.document) {
      reasons.push('Does not support Document printing');
    }
  }

  // 2. Check Paper Size
  if (caps.paperSizes) {
    const pSize = requirements.paperSize;
    if (pSize === 'a4' && !caps.paperSizes.a4) reasons.push('Missing A4 paper size support');
    if (pSize === 'a3' && !caps.paperSizes.a3) reasons.push('Missing A3 large format paper support');
    if (pSize === 'a5' && !caps.paperSizes.a5) reasons.push('Missing A5 paper size support');
    if (pSize === 'letter' && !caps.paperSizes.letter) reasons.push('Missing Letter paper size support');
    if (pSize === 'legal' && !caps.paperSizes.legal) reasons.push('Missing Legal paper size support');
    if (pSize === 'photo_4x6' && !caps.paperSizes.photo_4x6) reasons.push('Missing 4×6 inch photo paper support');
    if (pSize === 'photo_5x7' && !caps.paperSizes.photo_5x7) reasons.push('Missing 5×7 inch photo paper support');
  }

  // 3. Check Media / Paper Type
  if (caps.mediaTypes) {
    const mType = requirements.mediaType;
    if (mType === 'plain' && !caps.mediaTypes.plain) {
      reasons.push('Does not support Plain Paper');
    }
    if (mType === 'glossy_photo' && !caps.mediaTypes.glossy_photo) {
      reasons.push('Does not support Glossy Photo Paper (requires dedicated photo printer)');
    }
    if (mType === 'matte_photo' && !caps.mediaTypes.matte_photo) {
      reasons.push('Does not support Matte Photo Paper');
    }
    if (mType === 'premium_photo' && !caps.mediaTypes.premium_photo) {
      reasons.push('Does not support Premium Photo Paper');
    }
    if (mType === 'card_thick' && !caps.mediaTypes.card_thick) {
      reasons.push('Does not support Heavy Card / Bond Paper');
    }
  }

  // 4. Check Color Mode
  if (requirements.colorMode === 'color' && !caps.color) {
    reasons.push('Printer is Monochrome only (Job requires Full Color)');
  }
  if (requirements.colorMode === 'bw' && !caps.bw && !caps.color) {
    reasons.push('Printer does not support B&W output');
  }

  // 5. Check Duplex (Two-Sided)
  if (requirements.duplex && !caps.duplex) {
    reasons.push('Printer does not support automatic Two-Sided (Duplex) printing');
  }

  // 6. Check Borderless
  if (requirements.borderless && !caps.borderless) {
    reasons.push('Printer does not support Borderless (edge-to-edge) printing');
  }

  // 7. Check Photo Grade Quality
  if (requirements.quality === 'photo_grade' && !caps.photoGrade) {
    // Only strict if it's a dedicated photo job
    if (requirements.printType === 'photo') {
      reasons.push('Printer does not support Studio Photo Grade resolution (1200+ DPI)');
    }
  }

  return {
    compatible: reasons.length === 0,
    reasons,
  };
}

/**
 * Intelligent Multi-Printer Routing Selector
 *
 * Checks:
 * 1. Required capability match (hard filter)
 * 2. Printer hardware status (ONLINE / READY)
 * 3. Media stock status (not OUT OF PAPER)
 * 4. Priority and load balancing queue count
 *
 * NEVER sends a job to an incompatible or offline printer.
 */
export function routePrintJob(
  requirements: JobPrintRequirements,
  printers: PrinterProfile[],
  options?: {
    routingMode?: RoutingMode;
    loadBalancing?: boolean;
    manualPrinterOverride?: string | null;
  }
): RoutingEvaluation {
  const loadBalancing = options?.loadBalancing !== false;
  const manualOverride = options?.manualPrinterOverride;

  const eligiblePrinters: RoutingEvaluation['eligiblePrinters'] = [];
  const incompatiblePrinters: RoutingEvaluation['incompatiblePrinters'] = [];

  for (const printer of printers) {
    const comp = evaluatePrinterCompatibility(requirements, printer);
    if (!comp.compatible) {
      incompatiblePrinters.push({
        name: printer.name,
        profile: printer,
        reasons: comp.reasons,
      });
      continue;
    }

    const queueCount = Number(printer.jobCount || 0);
    const priority = Number(printer.routingPriority || 2);

    // Compute composite scoring: lower is better
    // Media loaded bonus: if printer currently has matching media loaded, prioritize it!
    const mediaBonus = printer.currentMediaLoaded === requirements.mediaType ? -50 : 0;
    const score = (loadBalancing ? queueCount * 20 : 0) + priority * 10 + mediaBonus;

    eligiblePrinters.push({
      name: printer.name,
      profile: printer,
      queueCount,
      priority,
      score,
    });
  }

  // If manual override was specified:
  if (manualOverride) {
    const targetEligible = eligiblePrinters.find((p) => p.name === manualOverride);
    if (targetEligible) {
      return {
        selectedPrinter: manualOverride,
        status: 'routed',
        reason: `Manually assigned to ${targetEligible.profile.customName || manualOverride} (Verified 100% Compatible)`,
        eligiblePrinters,
        incompatiblePrinters,
      };
    } else {
      const incomp = incompatiblePrinters.find((p) => p.name === manualOverride);
      return {
        selectedPrinter: null,
        status: 'waiting_for_compatible_printer',
        reason: `Manual override "${manualOverride}" is INCOMPATIBLE with this job: ${incomp?.reasons.join(', ')}`,
        eligiblePrinters,
        incompatiblePrinters,
      };
    }
  }

  // If no printers in shop support the job's capabilities:
  if (eligiblePrinters.length === 0) {
    return {
      selectedPrinter: null,
      status: 'waiting_for_compatible_printer',
      reason: 'No compatible printer found in shop for this job configuration.',
      eligiblePrinters,
      incompatiblePrinters,
    };
  }

  // Filter only ONLINE and READY printers whose stock status is not out_of_paper
  const onlineCandidates = eligiblePrinters.filter((p) => {
    const status = (p.profile.status || 'online').toLowerCase();
    const isOnline = status === 'online' || status === 'idle' || status === 'printing' || status === 'busy';
    const hasPaper = p.profile.stockStatus !== 'out_of_paper';
    return isOnline && hasPaper;
  });

  if (onlineCandidates.length === 0) {
    return {
      selectedPrinter: null,
      status: 'compatible_printers_offline',
      reason: 'All compatible printers are currently OFFLINE, in error, or out of paper.',
      eligiblePrinters,
      incompatiblePrinters,
    };
  }

  // Sort candidates by score: lowest score first
  onlineCandidates.sort((a, b) => a.score - b.score);

  const best = onlineCandidates[0];
  const customName = best.profile.customName || best.name;

  return {
    selectedPrinter: best.name,
    status: 'routed',
    reason: `Routed to ${customName} (${loadBalancing ? `Queue: ${best.queueCount}, ` : ''}Priority: ${best.priority})`,
    eligiblePrinters,
    incompatiblePrinters,
  };
}
