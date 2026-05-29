// ── Quality Control Engine ────────────────────────────────────────────────────
// Scores every product 0–100 and lists specific issues.
// Weights:
//   Image exists        20
//   Primary image       10
//   Gallery ≥ 2 images   5
//   Specs complete      25
//   Name format         15
//   Description         10
//   Price valid         10
//   Warranty present     5
//   Total              100

import { supabase } from './supabase';
import type { Product } from './api';

// ── Required specs per display-category ───────────────────────────────────────
export const REQUIRED_SPECS: Record<string, string[]> = {
  'Air Conditioners': ['Cooling Capacity', 'Power Consumption', 'Inverter', 'Gas Type'],
  'Refrigerators':    ['Capacity', 'Type', 'Compressor', 'Cooling System', 'Power Consumption'],
  'Freezers':         ['Capacity', 'Type', 'Compressor', 'Power Consumption'],
  'Washing Machines': ['Capacity', 'Type', 'RPM', 'Power Consumption'],
  'Televisions':      ['Screen Size', 'Resolution', 'Smart TV', 'Panel Type'],
  'Solar Solutions':  ['Wattage', 'Type', 'Efficiency'],
  'Air Fryers':       ['Capacity', 'Power', 'Temperature Range', 'Timer', 'Basket Type'],
  'Kitchen Appliances': ['Capacity', 'Power'],
  'Water Dispensers': ['Type', 'Hot Temperature', 'Cold Temperature'],
  'Vacuum Cleaners':  ['Power', 'Capacity', 'Type'],
  'Small Appliances': ['Power', 'Type'],
};

// ── QC issue codes ─────────────────────────────────────────────────────────────
export type QCCode =
  | 'MISSING_IMAGE'
  | 'MISSING_PRIMARY_IMAGE'
  | 'LOW_IMAGE_COUNT'
  | 'IMAGE_CATEGORY_MISMATCH'
  | 'SPEC_INCOMPLETE'
  | 'NAME_INVALID'
  | 'MISSING_DESC'
  | 'PRICE_RULE_ERROR'
  | 'MISSING_WARRANTY'
  | 'POSSIBLE_DUPLICATE';

export interface QCIssue {
  code:     QCCode;
  label:    string;
  severity: 'error' | 'warning';
  detail?:  string;
}

export interface QCResult {
  productId:   string;
  score:       number;      // 0 – 100
  issues:      QCIssue[];
  lastChecked: string;      // ISO timestamp
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

// ── Helpers ────────────────────────────────────────────────────────────────────

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

// ── Main scorer ────────────────────────────────────────────────────────────────
export function scoreProduct(p: Product): QCResult {
  const issues: QCIssue[] = [];
  let score = 0;
  const mismatchFlags = getImageMismatchFlags();
  const isMismatched  = mismatchFlags.has(p.id);

  // ── Image exists (20) ──────────────────────────────────────────────────────
  const hasThumb  = p.thumbnail?.startsWith('http');
  const galleryN  = p.gallery?.length ?? 0;
  const hasAnyImg = hasThumb || galleryN > 0;

  if (isMismatched) {
    issues.push({
      code: 'IMAGE_CATEGORY_MISMATCH',
      label: 'Image category mismatch',
      severity: 'error',
      detail: 'Image does not match product category — please replace it',
    });
  } else if (hasAnyImg) {
    score += 20;
  } else {
    issues.push({
      code: 'MISSING_IMAGE',
      label: 'No image — hidden from website & catalog',
      severity: 'error',
      detail: 'Product is NOT visible on the website until an image is added.',
    });
  }

  // ── Primary image (10) ────────────────────────────────────────────────────
  if (hasThumb && !isMismatched) {
    score += 10;
  } else if (!isMismatched && hasAnyImg) {
    issues.push({
      code: 'MISSING_PRIMARY_IMAGE',
      label: 'No primary thumbnail',
      severity: 'warning',
      detail: 'Gallery images exist but no thumbnail is set. Product may display without a cover image.',
    });
  }

  // ── Gallery ≥ 2 images (5) ────────────────────────────────────────────────
  const totalImages = (hasThumb ? 1 : 0) + galleryN;
  if (totalImages >= 2) {
    score += 5;
  } else if (hasAnyImg && !isMismatched) {
    issues.push({
      code: 'LOW_IMAGE_COUNT',
      label: 'Only 1 image',
      severity: 'warning',
      detail: 'Products with 2+ images convert better. Add at least one gallery image.',
    });
  }

  // ── Specs complete (25) ───────────────────────────────────────────────────
  const reqSpecs = REQUIRED_SPECS[p.category] ?? [];
  const specKeys = Object.keys(p.specs || {});
  const hasSpecs = specKeys.length > 0;

  if (!hasSpecs) {
    issues.push({ code: 'SPEC_INCOMPLETE', label: 'No specifications', severity: 'error' });
  } else if (reqSpecs.length > 0) {
    const missing = reqSpecs.filter(s => !specKeys.some(k => k.toLowerCase() === s.toLowerCase()));
    if (missing.length === 0) {
      score += 25;
    } else {
      score += Math.round(25 * (1 - missing.length / reqSpecs.length));
      issues.push({
        code: 'SPEC_INCOMPLETE', label: 'Incomplete specifications', severity: 'warning',
        detail: `Missing: ${missing.join(', ')}`,
      });
    }
  } else {
    score += 25;
  }

  // ── Solar-specific structured fields ─────────────────────────────────────
  // These are DB columns, not spec keys — checked separately after spec scoring.
  if (p.system_role === 'inverter' && !p.inverter_power_kw) {
    issues.push({
      code: 'SPEC_INCOMPLETE',
      label: 'Inverter power (kW) not set',
      severity: 'error',
      detail: 'inverter_power_kw is required for solar recommendations and compatibility checks.',
    });
  }
  if (p.system_role === 'battery' && !p.battery_voltage) {
    issues.push({
      code: 'SPEC_INCOMPLETE',
      label: 'Battery voltage not set',
      severity: 'error',
      detail: 'battery_voltage (24V or 48V) is required for solar compatibility.',
    });
  }

  // ── Name format (15) ──────────────────────────────────────────────────────
  if (isValidName(p.simplified_name, p.brand)) {
    score += 15;
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

  // ── Warranty present (5) ──────────────────────────────────────────────────
  if (p.warranty && p.warranty.trim().length > 3) {
    score += 5;
  } else {
    issues.push({
      code: 'MISSING_WARRANTY', label: 'No warranty info', severity: 'warning',
      detail: 'Warranty information helps customers buy with confidence.',
    });
  }

  return {
    productId:   p.id,
    score:       Math.max(0, Math.min(100, score)),
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
  const results      = products.map(p => scoreProduct(p));
  const issuesByCode = (code: QCCode) =>
    results.filter(r => r.issues.some(i => i.code === code)).length;

  return {
    total:           products.length,
    qcIssues:        results.filter(r => r.score < 90).length,
    missingImage:    issuesByCode('MISSING_IMAGE'),
    missingPrimary:  issuesByCode('MISSING_PRIMARY_IMAGE'),
    lowImageCount:   issuesByCode('LOW_IMAGE_COUNT'),
    imageMismatch:   issuesByCode('IMAGE_CATEGORY_MISMATCH'),
    missingSpecs:    issuesByCode('SPEC_INCOMPLETE'),
    invalidName:     issuesByCode('NAME_INVALID'),
    missingDesc:     issuesByCode('MISSING_DESC'),
    priceError:      issuesByCode('PRICE_RULE_ERROR'),
    missingWarranty: issuesByCode('MISSING_WARRANTY'),
  };
}

/**
 * Persist all QC scores to the database in a single RPC call.
 * Requires the update_quality_scores() function from migration 20260527_data_quality.sql.
 */
export async function persistQCScores(results: QCResult[]): Promise<void> {
  if (results.length === 0) return;
  const payload = results.map(r => ({
    id:          r.productId,
    score:       r.score,
    checked_at:  r.lastChecked,
  }));
  const { error } = await supabase.rpc('update_quality_scores', {
    score_data: payload,
  });
  if (error) throw new Error(error.message);
}

export const QC_FILTER_OPTIONS: { code: QCCode | 'all'; label: string }[] = [
  { code: 'all',                     label: 'All Issues' },
  { code: 'MISSING_IMAGE',           label: 'No Image' },
  { code: 'MISSING_PRIMARY_IMAGE',   label: 'No Thumbnail' },
  { code: 'LOW_IMAGE_COUNT',         label: 'Low Image Count' },
  { code: 'IMAGE_CATEGORY_MISMATCH', label: 'Image Mismatch' },
  { code: 'SPEC_INCOMPLETE',         label: 'Missing Specs' },
  { code: 'NAME_INVALID',            label: 'Invalid Name' },
  { code: 'MISSING_DESC',            label: 'Missing Description' },
  { code: 'PRICE_RULE_ERROR',        label: 'Price Error' },
  { code: 'MISSING_WARRANTY',        label: 'No Warranty' },
];
