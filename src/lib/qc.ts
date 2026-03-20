// ── Quality Control Engine ────────────────────────────────────────────────────
// Scores every product 0–100 and lists specific issues.

import type { Product } from './api';

// ── Required specs per display-category ───────────────────────────────────────
export const REQUIRED_SPECS: Record<string, string[]> = {
  'Air Conditioners': ['Cooling Capacity', 'Power Consumption', 'Inverter', 'Gas Type'],
  'Refrigerators':    ['Capacity', 'Type', 'Compressor', 'Cooling System'],
  'Freezers':         ['Capacity', 'Type', 'Compressor'],
  'Washing Machines': ['Capacity', 'Type', 'RPM'],
  'Televisions':      ['Screen Size', 'Resolution', 'Smart TV', 'Panel Type'],
  'Solar Solutions':  ['Wattage', 'Type', 'Efficiency'],
  'Air Fryers':       ['Capacity', 'Power', 'Temperature Range', 'Timer', 'Basket Type'],
  'Kitchen Appliances':['Capacity', 'Power'],
  'Water Dispensers': ['Type', 'Hot Temperature', 'Cold Temperature'],
  'Vacuum Cleaners':  ['Power', 'Capacity', 'Type'],
  'Small Appliances': ['Power', 'Type'],
};

// ── QC issue codes ────────────────────────────────────────────────────────────
export type QCCode =
  | 'MISSING_IMAGE'
  | 'MISSING_PRIMARY_IMAGE'
  | 'IMAGE_CATEGORY_MISMATCH'
  | 'SPEC_INCOMPLETE'
  | 'NAME_INVALID'
  | 'MISSING_DESC'
  | 'PRICE_RULE_ERROR'
  | 'POSSIBLE_DUPLICATE';

export interface QCIssue {
  code:     QCCode;
  label:    string;
  severity: 'error' | 'warning';
  detail?:  string;
}

export interface QCResult {
  productId:   string;
  score:       number;        // 0 – 100
  issues:      QCIssue[];
  lastChecked: string;        // ISO timestamp
}

// ── Image mismatch flags (manual — stored in localStorage) ────────────────────
const MISMATCH_KEY = 'tajalli_image_mismatch_ids';

export function getImageMismatchFlags(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(MISMATCH_KEY) || '[]')); }
  catch { return new Set(); }
}

export function flagImageMismatch(productId: string): void {
  const flags = getImageMismatchFlags();
  flags.add(productId);
  localStorage.setItem(MISMATCH_KEY, JSON.stringify([...flags]));
}

export function clearImageMismatch(productId: string): void {
  const flags = getImageMismatchFlags();
  flags.delete(productId);
  localStorage.setItem(MISMATCH_KEY, JSON.stringify([...flags]));
}

// ── Scoring weights ────────────────────────────────────────────────────────────
// Image exists        25
// Primary image       10
// Specs complete      25
// Name format         20
// Description         10
// Price valid         10
// Total              100

// ── Helpers ───────────────────────────────────────────────────────────────────

const BANNED_NAME_WORDS = ['product', 'appliance', 'item', 'model', 'device', 'unit', '2023', '2024', '2025'];

function isValidName(name: string | undefined, brand: string): boolean {
  if (!name || name.trim().length < 6) return false;
  const lower = name.toLowerCase();
  if (!lower.startsWith(brand.toLowerCase())) return false;
  if (name.trim().split(/\s+/).length < 3) return false;
  if (BANNED_NAME_WORDS.some(w => lower.includes(w))) return false;
  return true;
}

function isPriceValid(price: Product['price']): boolean {
  const cf = price?.cash_floor;
  if (!cf || cf < 100) return false;
  return cf % 500 === 0;
}

// ── Main scorer ───────────────────────────────────────────────────────────────
export function scoreProduct(p: Product): QCResult {
  const issues: QCIssue[] = [];
  let score = 0;
  const mismatchFlags = getImageMismatchFlags();
  const isMismatched = mismatchFlags.has(p.id);

  // ── Image exists (25) ──────────────────────────────────────────────────────
  const hasAnyImage = p.thumbnail?.startsWith('http') || (p.gallery?.length ?? 0) > 0;

  if (isMismatched) {
    issues.push({
      code: 'IMAGE_CATEGORY_MISMATCH',
      label: 'Image category mismatch',
      severity: 'error',
      detail: 'Image does not match product category — please replace it',
    });
    // Image exists but is wrong — no score credit
  } else if (hasAnyImage) {
    score += 25;
  } else {
    issues.push({
      code: 'MISSING_IMAGE',
      label: 'No image — hidden from website & catalog',
      severity: 'error',
      detail: 'This product is NOT visible on the website or in any catalog until an image is added by the admin.',
    });
  }

  // ── Primary image (10) ────────────────────────────────────────────────────
  if (p.thumbnail?.startsWith('http') && !isMismatched) {
    score += 10;
  } else if (!isMismatched && hasAnyImage) {
    issues.push({ code: 'MISSING_PRIMARY_IMAGE', label: 'Missing primary (thumbnail) image', severity: 'warning',
      detail: 'Gallery images exist but no primary thumbnail is set. Product may display without a cover image.' });
  }

  // ── Specs complete (25) ───────────────────────────────────────────────────
  const reqSpecs  = REQUIRED_SPECS[p.category] ?? [];
  const specKeys  = Object.keys(p.specs || {});
  const hasSpecs  = specKeys.length > 0;

  if (!hasSpecs) {
    issues.push({ code: 'SPEC_INCOMPLETE', label: 'No specifications', severity: 'error' });
  } else if (reqSpecs.length > 0) {
    const missing = reqSpecs.filter(s => !specKeys.some(k => k.toLowerCase() === s.toLowerCase()));
    if (missing.length === 0) {
      score += 25;
    } else {
      const partial = Math.round(25 * (1 - missing.length / reqSpecs.length));
      score += partial;
      issues.push({
        code: 'SPEC_INCOMPLETE', label: 'Incomplete specifications', severity: 'warning',
        detail: `Missing: ${missing.join(', ')}`,
      });
    }
  } else {
    score += 25;
  }

  // ── Name format (20) ──────────────────────────────────────────────────────
  if (isValidName(p.simplified_name, p.brand)) {
    score += 20;
  } else {
    issues.push({
      code: 'NAME_INVALID', label: 'Invalid name format', severity: 'warning',
      detail: p.simplified_name
        ? `"${p.simplified_name}" — expected: ${p.brand} [Size] [Feature] [Category]`
        : 'Name is empty',
    });
  }

  // ── Description (10) ──────────────────────────────────────────────────────
  if (p.description && p.description.trim().length > 40) {
    score += 10;
  } else {
    issues.push({ code: 'MISSING_DESC', label: 'Missing description', severity: 'warning' });
  }

  // ── Price valid (10) ──────────────────────────────────────────────────────
  if (isPriceValid(p.price)) {
    score += 10;
  } else {
    issues.push({
      code: 'PRICE_RULE_ERROR', label: 'Price rule violation', severity: 'warning',
      detail: `Cash floor ${p.price?.cash_floor} is not rounded to 500`,
    });
  }

  return {
    productId: p.id,
    score: Math.max(0, Math.min(100, score)),
    issues,
    lastChecked: new Date().toISOString(),
  };
}

/** Run QC on a list of products and return only those scoring below threshold. */
export function runQC(
  products: Product[],
  threshold = 90,
): (QCResult & { product: Product })[] {
  return products
    .map(p => ({ ...scoreProduct(p), product: p }))
    .filter(r => r.score < threshold)
    .sort((a, b) => a.score - b.score);
}

/** QC summary counts across all products. */
export function qcSummary(products: Product[]) {
  const results = products.map(p => scoreProduct(p));
  const issuesByCode = (code: QCCode) =>
    results.filter(r => r.issues.some(i => i.code === code)).length;

  return {
    total:              products.length,
    qcIssues:           results.filter(r => r.score < 90).length,
    missingImage:       issuesByCode('MISSING_IMAGE'),
    missingPrimary:     issuesByCode('MISSING_PRIMARY_IMAGE'),
    imageMismatch:      issuesByCode('IMAGE_CATEGORY_MISMATCH'),
    missingSpecs:       issuesByCode('SPEC_INCOMPLETE'),
    invalidName:        issuesByCode('NAME_INVALID'),
    missingDesc:        issuesByCode('MISSING_DESC'),
    priceError:         issuesByCode('PRICE_RULE_ERROR'),
  };
}

export const QC_FILTER_OPTIONS: { code: QCCode | 'all'; label: string }[] = [
  { code: 'all',                      label: 'All Issues' },
  { code: 'MISSING_IMAGE',            label: 'No Image' },
  { code: 'MISSING_PRIMARY_IMAGE',    label: 'No Thumbnail' },
  { code: 'IMAGE_CATEGORY_MISMATCH',  label: 'Image Mismatch' },
  { code: 'SPEC_INCOMPLETE',          label: 'Missing Specs' },
  { code: 'NAME_INVALID',             label: 'Invalid Name' },
  { code: 'MISSING_DESC',             label: 'Missing Description' },
  { code: 'PRICE_RULE_ERROR',         label: 'Price Error' },
];
