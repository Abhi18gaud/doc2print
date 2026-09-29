/**
 * Gaurprint Real Print Engine & Transform Model
 *
 * Implements authoritative mathematical modeling of:
 * 1. ORIGINAL MEDIA (pixels, aspect ratio, DPI)
 * 2. PRINT CONTENT (mm dimensions, placement X/Y, scale, rotation, crop)
 * 3. PHYSICAL PAPER / PRINT SHEET (mm dimensions, margins, printable area, borderless)
 *
 * Used by:
 * - Print Studio Interactive Canvas & Preview
 * - Kiosk Order Preparation & Validation
 * - PDF Generation (pdf-lib) to ensure 100% WYSIWYG parity
 */

export interface PhysicalDimensions {
  widthMm: number;
  heightMm: number;
  label: string;
}

export interface PrintableArea {
  paperWidthMm: number;
  paperHeightMm: number;
  printableWidthMm: number;
  printableHeightMm: number;
  marginMm: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  borderless: boolean;
}

export interface NormalizedCrop {
  x: number; // 0..1 (fraction of original width)
  y: number; // 0..1 (fraction of original height)
  width: number; // 0..1
  height: number; // 0..1
}

export type FitMode = 'fit' | 'fill' | 'actual' | 'custom';
export type Alignment = 'center' | 'top' | 'bottom' | 'left' | 'right';
export type CropRatioPreset = 'free' | '4:6' | '5:7' | '6:8' | 'passport' | '1:1' | 'a4' | 'original';

export interface ImageAdjustments {
  brightness: number; // -50 to 50
  contrast: number; // -50 to 50
  saturation: number; // -50 to 50
  sharpness: number; // 0 to 100
  autoEnhance: boolean;
}

export const DEFAULT_ADJUSTMENTS: ImageAdjustments = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  sharpness: 0,
  autoEnhance: false,
};

export const DEFAULT_CROP: NormalizedCrop = {
  x: 0,
  y: 0,
  width: 1,
  height: 1,
};

export interface ContentPlacement {
  // Placement on paper in millimeters (origin: top-left of paper)
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  // Scale factor relative to natural fit
  scale: number;
  // Rotation (0, 90, 180, 270)
  rotation: number;
  flipH: boolean;
  flipV: boolean;
  crop: NormalizedCrop;
  fitMode: FitMode;
  alignment: Alignment;
  // Quality metrics
  effectiveDpi: number;
  dpiRating: 'excellent' | 'good' | 'low';
}

export interface SheetCell {
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  index: number;
}

export interface MultiPhotoLayoutResult {
  photosPerSheet: number;
  rows: number;
  cols: number;
  cells: SheetCell[];
  autoRotated: boolean;
}

// -------------------------------------------------------------
// Unit Conversions & Physical Dimension Constants
// -------------------------------------------------------------

export const MM_PER_INCH = 25.4;
export const POINTS_PER_INCH = 72;
export const POINTS_PER_MM = POINTS_PER_INCH / MM_PER_INCH; // ~2.83465

export function mmToPt(mm: number): number {
  return mm * POINTS_PER_MM;
}

export function ptToMm(pt: number): number {
  return pt / POINTS_PER_MM;
}

export function pxToMm(px: number, dpi: number = 300): number {
  return (px / dpi) * MM_PER_INCH;
}

export function mmToPx(mm: number, dpi: number = 300): number {
  return (mm / MM_PER_INCH) * dpi;
}

/**
 * Standard Physical Paper Dimensions in mm (Portrait orientation)
 */
export const PAPER_DIMENSIONS_MM: Record<string, PhysicalDimensions> = {
  a4: { widthMm: 210, heightMm: 297, label: 'A4 (210 × 297 mm)' },
  a3: { widthMm: 297, heightMm: 420, label: 'A3 (297 × 420 mm)' },
  legal: { widthMm: 215.9, heightMm: 355.6, label: 'Legal (216 × 356 mm)' },
  letter: { widthMm: 215.9, heightMm: 279.4, label: 'Letter (216 × 279 mm)' },
  a5: { widthMm: 148, heightMm: 210, label: 'A5 (148 × 210 mm)' },
  '4x6': { widthMm: 101.6, heightMm: 152.4, label: '4 × 6 in (102 × 152 mm)' },
  '5x7': { widthMm: 127.0, heightMm: 177.8, label: '5 × 7 in (127 × 178 mm)' },
  '6x8': { widthMm: 152.4, heightMm: 203.2, label: '6 × 8 in (152 × 203 mm)' },
  passport: { widthMm: 35.0, heightMm: 45.0, label: 'Passport (35 × 45 mm)' },
};

/**
 * Standard Photo Target Sizes in mm
 */
export const PHOTO_TARGET_SIZES_MM: Record<string, PhysicalDimensions> = {
  passport: { widthMm: 35, heightMm: 45, label: 'Passport (35 × 45 mm)' },
  '4x6': { widthMm: 101.6, heightMm: 152.4, label: '4 × 6 in (102 × 152 mm)' },
  '5x7': { widthMm: 127.0, heightMm: 177.8, label: '5 × 7 in (127 × 178 mm)' },
  '6x8': { widthMm: 152.4, heightMm: 203.2, label: '6 × 8 in (152 × 203 mm)' },
  a4_photo: { widthMm: 210, heightMm: 297, label: 'Full A4 Photo (210 × 297 mm)' },
};

// -------------------------------------------------------------
// Physical Paper & Printable Area Calculations
// -------------------------------------------------------------

export function getPaperGeometry(
  paperSizeKey: string,
  orientation: 'portrait' | 'landscape',
  borderless: boolean = false,
  defaultMarginMm: number = 5
): PrintableArea {
  const cleanKey = (paperSizeKey || 'a4').toLowerCase();
  const base = PAPER_DIMENSIONS_MM[cleanKey] || PAPER_DIMENSIONS_MM.a4;

  const isLandscape = orientation === 'landscape';
  const paperWidthMm = isLandscape ? base.heightMm : base.widthMm;
  const paperHeightMm = isLandscape ? base.widthMm : base.heightMm;

  const marginVal = borderless ? 0 : defaultMarginMm;
  const marginMm = {
    top: marginVal,
    bottom: marginVal,
    left: marginVal,
    right: marginVal,
  };

  const printableWidthMm = Math.max(10, paperWidthMm - (marginMm.left + marginMm.right));
  const printableHeightMm = Math.max(10, paperHeightMm - (marginMm.top + marginMm.bottom));

  return {
    paperWidthMm,
    paperHeightMm,
    printableWidthMm,
    printableHeightMm,
    marginMm,
    borderless,
  };
}

// -------------------------------------------------------------
// Effective DPI Calculation & Quality Rating
// -------------------------------------------------------------

export function calculateEffectiveDpi(
  sourcePixelWidth: number,
  sourcePixelHeight: number,
  contentWidthMm: number,
  contentHeightMm: number,
  crop: NormalizedCrop = DEFAULT_CROP
): { dpi: number; rating: 'excellent' | 'good' | 'low' } {
  if (contentWidthMm <= 0 || contentHeightMm <= 0) {
    return { dpi: 300, rating: 'excellent' };
  }

  const croppedPxW = sourcePixelWidth * (crop.width || 1);
  const croppedPxH = sourcePixelHeight * (crop.height || 1);

  const dpiX = croppedPxW / (contentWidthMm / MM_PER_INCH);
  const dpiY = croppedPxH / (contentHeightMm / MM_PER_INCH);

  const dpi = Math.round(Math.min(dpiX, dpiY));

  let rating: 'excellent' | 'good' | 'low' = 'excellent';
  if (dpi < 150) {
    rating = 'low';
  } else if (dpi < 240) {
    rating = 'good';
  }

  return { dpi, rating };
}

// -------------------------------------------------------------
// Content Placement & Layout Calculations (Fit / Fill / Actual / Custom)
// -------------------------------------------------------------

export interface CalculatePlacementParams {
  sourceWidthPx: number;
  sourceHeightPx: number;
  printableArea: PrintableArea;
  fitMode: FitMode;
  alignment: Alignment;
  crop?: NormalizedCrop;
  rotation?: number; // 0, 90, 180, 270
  flipH?: boolean;
  flipV?: boolean;
  userScale?: number; // 1.0 = 100%
  userPanXMm?: number;
  userPanYMm?: number;
  customWidthMm?: number;
  customHeightMm?: number;
  targetPhotoSizeKey?: string; // e.g. '4x6', '5x7', 'passport'
  mode?: 'photo' | 'image' | 'document';
}

export function calculateContentPlacement(params: CalculatePlacementParams): ContentPlacement {
  const {
    sourceWidthPx,
    sourceHeightPx,
    printableArea,
    fitMode,
    alignment,
    crop = DEFAULT_CROP,
    rotation = 0,
    flipH = false,
    flipV = false,
    userScale = 1.0,
    userPanXMm = 0,
    userPanYMm = 0,
    customWidthMm,
    customHeightMm,
    targetPhotoSizeKey,
    mode = 'image',
  } = params;

  const { paperWidthMm, paperHeightMm, printableWidthMm, printableHeightMm, marginMm } = printableArea;

  // 1. Effective Cropped Source Dimensions & Ratio
  const croppedPxW = Math.max(1, sourceWidthPx * (crop.width || 1));
  const croppedPxH = Math.max(1, sourceHeightPx * (crop.height || 1));

  // If rotation is 90° or 270°, swap effective cropped aspect ratio
  const isRotatedQuarter = rotation === 90 || rotation === 270;
  const effectiveAspect = isRotatedQuarter
    ? croppedPxH / croppedPxW
    : croppedPxW / croppedPxH;

  let widthMm = printableWidthMm;
  let heightMm = printableHeightMm;

  // 2. Base Content Sizing according to FitMode / Photo Presets
  if (mode === 'photo' && targetPhotoSizeKey && targetPhotoSizeKey !== 'a4_photo') {
    // Dedicated Photo Size on sheet (e.g. 4x6 on A4, or 5x7)
    const preset = PHOTO_TARGET_SIZES_MM[targetPhotoSizeKey] || PHOTO_TARGET_SIZES_MM['4x6'];
    const isTargetLandscape = effectiveAspect > 1;
    const targetW = isTargetLandscape ? Math.max(preset.widthMm, preset.heightMm) : Math.min(preset.widthMm, preset.heightMm);
    const targetH = isTargetLandscape ? Math.min(preset.widthMm, preset.heightMm) : Math.max(preset.widthMm, preset.heightMm);

    if (fitMode === 'fill') {
      // Fill the photo boundary
      widthMm = targetW;
      heightMm = targetH;
    } else {
      // Fit within the photo boundary
      const targetAspect = targetW / targetH;
      if (effectiveAspect > targetAspect) {
        widthMm = targetW;
        heightMm = targetW / effectiveAspect;
      } else {
        heightMm = targetH;
        widthMm = targetH * effectiveAspect;
      }
    }
  } else if (fitMode === 'custom' && customWidthMm && customHeightMm) {
    // Custom explicit millimeter dimensions
    widthMm = customWidthMm;
    heightMm = customHeightMm;
  } else if (fitMode === 'actual') {
    // 100% Actual Physical Size (assuming 300 DPI baseline for image pixels)
    widthMm = pxToMm(croppedPxW, 300);
    heightMm = pxToMm(croppedPxH, 300);
    if (isRotatedQuarter) {
      const tmp = widthMm;
      widthMm = heightMm;
      heightMm = tmp;
    }
  } else if (fitMode === 'fill') {
    // Fill Entire Printable Area (Cover)
    const printableAspect = printableWidthMm / printableHeightMm;
    if (effectiveAspect > printableAspect) {
      heightMm = printableHeightMm;
      widthMm = printableHeightMm * effectiveAspect;
    } else {
      widthMm = printableWidthMm;
      heightMm = printableWidthMm / effectiveAspect;
    }
  } else {
    // FIT TO PAGE (Contain) - Default
    // Entire image must remain visible, maintain aspect ratio, never crop
    const printableAspect = printableWidthMm / printableHeightMm;
    if (effectiveAspect > printableAspect) {
      widthMm = printableWidthMm;
      heightMm = printableWidthMm / effectiveAspect;
    } else {
      heightMm = printableHeightMm;
      widthMm = printableHeightMm * effectiveAspect;
    }
  }

  // 3. Apply user zoom scale
  widthMm *= userScale;
  heightMm *= userScale;

  // 4. Calculate Position (X, Y in mm) based on Alignment & Printable Area
  let xMm = marginMm.left + (printableWidthMm - widthMm) / 2;
  let yMm = marginMm.top + (printableHeightMm - heightMm) / 2;

  if (alignment === 'top') {
    yMm = marginMm.top;
  } else if (alignment === 'bottom') {
    yMm = marginMm.top + (printableHeightMm - heightMm);
  } else if (alignment === 'left') {
    xMm = marginMm.left;
  } else if (alignment === 'right') {
    xMm = marginMm.left + (printableWidthMm - widthMm);
  }

  // Add manual pan offset
  xMm += userPanXMm;
  yMm += userPanYMm;

  // 5. Calculate Effective DPI
  const { dpi, rating } = calculateEffectiveDpi(sourceWidthPx, sourceHeightPx, widthMm, heightMm, crop);

  return {
    xMm,
    yMm,
    widthMm,
    heightMm,
    scale: userScale,
    rotation: (rotation % 360 + 360) % 360,
    flipH,
    flipV,
    crop,
    fitMode,
    alignment,
    effectiveDpi: dpi,
    dpiRating: rating,
  };
}

// -------------------------------------------------------------
// Multi-Photo Sheet Layout (Passport / Multiple 4x6 on A4)
// -------------------------------------------------------------

export function calculateMultiPhotoLayout(
  printableArea: PrintableArea,
  photoSizeKey: string,
  copiesCount: number = 8,
  spacingMm: number = 3
): MultiPhotoLayoutResult {
  const preset = PHOTO_TARGET_SIZES_MM[photoSizeKey] || PHOTO_TARGET_SIZES_MM.passport;
  const { printableWidthMm, printableHeightMm, marginMm } = printableArea;

  const photoW = preset.widthMm;
  const photoH = preset.heightMm;

  // Option A: Standard orientation
  const colsA = Math.floor((printableWidthMm + spacingMm) / (photoW + spacingMm));
  const rowsA = Math.floor((printableHeightMm + spacingMm) / (photoH + spacingMm));
  const countA = Math.max(1, colsA * rowsA);

  // Option B: Rotated 90°
  const colsB = Math.floor((printableWidthMm + spacingMm) / (photoH + spacingMm));
  const rowsB = Math.floor((printableHeightMm + spacingMm) / (photoW + spacingMm));
  const countB = Math.max(1, colsB * rowsB);

  // Choose the layout that yields optimal paper utilization
  const useRotated = countB > countA;
  const cols = useRotated ? colsB : colsA;
  const rows = useRotated ? rowsB : rowsA;
  const finalW = useRotated ? photoH : photoW;
  const finalH = useRotated ? photoW : photoH;

  const totalGridCapacity = Math.max(1, cols * rows);
  const targetCount = Math.min(totalGridCapacity, Math.max(1, copiesCount));

  // Compute centered grid starting position
  const totalGridWidthMm = cols * finalW + (cols - 1) * spacingMm;
  const totalGridHeightMm = rows * finalH + (rows - 1) * spacingMm;

  const startXMm = marginMm.left + (printableWidthMm - totalGridWidthMm) / 2;
  const startYMm = marginMm.top + (printableHeightMm - totalGridHeightMm) / 2;

  const cells: SheetCell[] = [];

  for (let i = 0; i < targetCount; i++) {
    const colIdx = i % cols;
    const rowIdx = Math.floor(i / cols);

    const xMm = startXMm + colIdx * (finalW + spacingMm);
    const yMm = startYMm + rowIdx * (finalH + spacingMm);

    cells.push({
      xMm,
      yMm,
      widthMm: finalW,
      heightMm: finalH,
      index: i,
    });
  }

  return {
    photosPerSheet: targetCount,
    rows,
    cols,
    cells,
    autoRotated: useRotated,
  };
}

// -------------------------------------------------------------
// Crop Aspect Ratio Helpers
// -------------------------------------------------------------

export function getCropRatioFromPreset(
  preset: CropRatioPreset,
  sourceAspect: number = 1.0,
  paperAspect: number = 1 / 1.414
): number | null {
  switch (preset) {
    case 'free':
      return null; // unconstrained
    case '4:6':
      return 4 / 6; // 0.6667
    case '5:7':
      return 5 / 7; // 0.7143
    case '6:8':
      return 6 / 8; // 0.75
    case 'passport':
      return 35 / 45; // 0.7778
    case '1:1':
      return 1.0;
    case 'a4':
      return paperAspect;
    case 'original':
      return sourceAspect;
    default:
      return null;
  }
}
