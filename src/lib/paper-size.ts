/**
 * QuickPrint Canonical Paper Size System
 *
 * Ensures 100% consistency across:
 * Customer Web App -> Order -> Payment -> Job -> Supabase DB -> Desktop Counter OS -> Spooler
 *
 * Database check constraint `jobs_paper_size_check` strictly allows:
 *   ['A4', 'a4', 'A3', 'a3', 'legal', 'passport', 'custom']
 *
 * Any other value (e.g. 'A4 (plain)', 'Legal', 'Photo 4x6 (Glossy)') violates the constraint.
 */

export type CanonicalPaperSize = 'A4' | 'A3' | 'legal' | 'passport' | 'custom';

export const ALLOWED_DB_PAPER_SIZES: readonly CanonicalPaperSize[] = [
  'A4',
  'A3',
  'legal',
  'passport',
  'custom',
] as const;

/**
 * Normalizes any frontend, catalog, or kiosk input into a valid database canonical paper size.
 */
export function toCanonicalPaperSize(
  rawSize?: string | null,
  mode?: string | null
): CanonicalPaperSize {
  if (mode === 'photo') {
    const cleanPhoto = (rawSize || '').trim().toLowerCase();
    if (cleanPhoto === 'passport') return 'passport';
    if (cleanPhoto === 'a4_photo' || cleanPhoto === 'a4') return 'A4';
    // 4x6, 5x7, 6x8, 8x10, etc.
    return 'custom';
  }

  if (!rawSize) return 'A4';

  const clean = rawSize.trim().toLowerCase();

  // Strip extraneous annotations if previously appended (e.g. "a4 (plain)", "a3 + spiral")
  const base = clean.split('(')[0].split('+')[0].trim();

  switch (base) {
    case 'a4':
      return 'A4';
    case 'a3':
      return 'A3';
    case 'legal':
      return 'legal';
    case 'passport':
      return 'passport';
    case 'custom':
    case 'bond':
    case 'letter':
    case 'a5':
    case '4x6':
    case '5x7':
    case '6x8':
    case '8x10':
      return 'custom';
    default:
      if (base.includes('a3')) return 'A3';
      if (base.includes('legal')) return 'legal';
      if (base.includes('pass')) return 'passport';
      if (base.includes('bond') || base.includes('custom')) return 'custom';
      return 'A4';
  }
}

/**
 * Friendly display name for UI presentation in Counter OS and Web App
 */
export function getPaperSizeDisplayName(size?: string | null): string {
  if (!size) return 'A4';
  const clean = size.trim().toLowerCase();
  switch (clean) {
    case 'a4':
      return 'A4';
    case 'a3':
      return 'A3';
    case 'legal':
      return 'Legal';
    case 'passport':
      return 'Passport (8×)';
    case 'custom':
      return 'Custom / Bond';
    default:
      return size.toUpperCase();
  }
}

/**
 * Windows / PDF-to-printer physical paper size string mapping
 */
export function getSpoolerPaperSize(canonicalSize: CanonicalPaperSize): string {
  switch (canonicalSize) {
    case 'A4':
      return 'A4';
    case 'A3':
      return 'A3';
    case 'legal':
      return 'Legal';
    case 'passport':
    case 'custom':
      return 'A4'; // Photo/custom sheets cut on standard carrier or A4 feed
    default:
      return 'A4';
  }
}
