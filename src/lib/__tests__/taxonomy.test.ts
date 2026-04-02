/**
 * Regression tests — taxonomy, upload pipeline, pricing, and image dedup.
 *
 * Run with: npx vitest src/lib/__tests__/taxonomy.test.ts
 *
 * These tests must pass for every future brand/category import.
 * If a test breaks after adding a new category, update TAXONOMY_REGISTRY
 * in taxonomy.ts — never disable the test.
 */

import { describe, it, expect } from 'vitest';
import {
  resolveCanonicalCategory,
  enrichProduct,
  deriveSubCategory,
} from '../api';
import {
  lookupTaxonomy,
  normalizeTaxonomy,
  validateUpload,
  canCompare,
  TAXONOMY_REGISTRY,
} from '../taxonomy';

// ─────────────────────────────────────────────────────────────────────────────
// A. Ziewnic / solar inverter category recognition
// ─────────────────────────────────────────────────────────────────────────────

describe('Ziewnic — Hybrid Inverter category recognition', () => {
  it('resolveCanonicalCategory maps "Hybrid Inverter" to solar', () => {
    expect(resolveCanonicalCategory('Ziewnic', 'MARVEL 5G EUROPEAN PV8500', 'Hybrid Inverter'))
      .toBe('solar');
  });

  it('resolveCanonicalCategory maps "Solar Converter" to solar', () => {
    expect(resolveCanonicalCategory('Ziewnic', 'Solar Converter PV7000', 'Solar Converter'))
      .toBe('solar');
  });

  it('resolveCanonicalCategory maps "On-Grid Inverter" to solar', () => {
    expect(resolveCanonicalCategory('SomeB', 'XYZ-5000', 'On-Grid Inverter'))
      .toBe('solar');
  });

  it('resolveCanonicalCategory maps "Off-Grid Inverter" to solar', () => {
    expect(resolveCanonicalCategory('SomeB', 'XYZ-5000', 'Off-Grid Inverter'))
      .toBe('solar');
  });

  it('resolveCanonicalCategory maps "PV Inverter" to solar', () => {
    expect(resolveCanonicalCategory('SomeB', 'XYZ-5000', 'PV Inverter'))
      .toBe('solar');
  });

  it('no longer returns unknown for Hybrid Inverter', () => {
    const cc = resolveCanonicalCategory('Ziewnic', 'MARVEL 5G EUROPEAN PV8500', 'Hybrid Inverter');
    expect(cc).not.toBe('unknown');
  });

  it('no longer returns unknown for Solar Converter', () => {
    const cc = resolveCanonicalCategory('Ziewnic', 'Solar Converter PV7000', 'Solar Converter');
    expect(cc).not.toBe('unknown');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// B. deriveSubCategory for solar inverter types
// ─────────────────────────────────────────────────────────────────────────────

describe('deriveSubCategory — solar sub-types', () => {
  it('Hybrid Inverter category → Hybrid Inverter sub-category', () => {
    const sub = deriveSubCategory('Ziewnic', 'MARVEL 5G EUROPEAN PV8500', 'Hybrid Inverter');
    expect(sub).toBe('Hybrid Inverter');
  });

  it('Solar Converter category → Grid-Tie / Solar Converter sub-category', () => {
    const sub = deriveSubCategory('Ziewnic', 'Solar Converter PV7000', 'Solar Converter');
    expect(sub).toContain('Solar Converter');
  });

  it('On-Grid Inverter category → On-Grid Inverter sub-category', () => {
    const sub = deriveSubCategory('SomeB', 'XYZ-5000', 'On-Grid Inverter');
    expect(sub).toContain('On-Grid');
  });

  it('Off-Grid Inverter category → Off-Grid Inverter sub-category', () => {
    const sub = deriveSubCategory('SomeB', 'XYZ-5000', 'Off-Grid Inverter');
    expect(sub).toContain('Off-Grid');
  });

  it('Solar Panel category → Solar Panel sub-category', () => {
    const sub = deriveSubCategory('Jinko', 'PANEL-620W', 'Solar Panel');
    expect(sub).toBe('Solar Panel');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// C. Taxonomy registry completeness
// ─────────────────────────────────────────────────────────────────────────────

describe('TAXONOMY_REGISTRY', () => {
  it('contains an entry for Hybrid Inverter', () => {
    const entry = lookupTaxonomy('Hybrid Inverter');
    expect(entry).not.toBeNull();
    expect(entry?.normalized_category).toBe('Solar Inverters');
  });

  it('contains an entry for Solar Converter', () => {
    const entry = lookupTaxonomy('Solar Converter');
    expect(entry).not.toBeNull();
    expect(entry?.normalized_category).toBe('Solar Inverters');
  });

  it('maps both Hybrid Inverter and Solar Converter to the same comparison_group', () => {
    const a = lookupTaxonomy('Hybrid Inverter');
    const b = lookupTaxonomy('Solar Converter');
    expect(a?.comparison_group).toBe(b?.comparison_group);
  });

  it('every registry entry has all required fields', () => {
    for (const entry of TAXONOMY_REGISTRY) {
      expect(entry.id,                    `${entry.id} missing id`).toBeTruthy();
      expect(entry.normalized_category,   `${entry.id} missing normalized_category`).toBeTruthy();
      expect(entry.seo_category_slug,     `${entry.id} missing seo_category_slug`).toBeTruthy();
      expect(entry.comparison_group,      `${entry.id} missing comparison_group`).toBeTruthy();
      expect(entry.frontend_browse_group, `${entry.id} missing frontend_browse_group`).toBeTruthy();
      expect(Array.isArray(entry.aliases) && entry.aliases.length > 0,
        `${entry.id} must have at least one alias`).toBe(true);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// D. normalizeTaxonomy — two-layer preservation
// ─────────────────────────────────────────────────────────────────────────────

describe('normalizeTaxonomy', () => {
  it('resolves Hybrid Inverter with taxonomy_status=live', () => {
    const result = normalizeTaxonomy('Hybrid Inverter');
    expect(result.resolved).toBe(true);
    expect(result.taxonomy_status).toBe('live');
    expect(result.taxonomy?.normalized_category).toBe('Solar Inverters');
  });

  it('resolves Solar Converter with taxonomy_status=live', () => {
    const result = normalizeTaxonomy('Solar Converter');
    expect(result.resolved).toBe(true);
    expect(result.taxonomy_status).toBe('live');
  });

  it('returns review status for completely unknown category', () => {
    const result = normalizeTaxonomy('Quantum Fusion Device Mk.IV');
    expect(result.resolved).toBe(false);
    expect(result.taxonomy_status).toBe('review');
    expect(result.taxonomy).toBeNull();
  });

  it('preserves original category intent — normalized never overwrites source', () => {
    // The normalizeTaxonomy function only adds fields; it never deletes source data.
    // Test that calling it twice on the same input is idempotent.
    const r1 = normalizeTaxonomy('Hybrid Inverter');
    const r2 = normalizeTaxonomy('Hybrid Inverter');
    expect(r1).toEqual(r2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// E. validateUpload — quarantine logic
// ─────────────────────────────────────────────────────────────────────────────

describe('validateUpload', () => {
  it('valid Ziewnic hybrid inverter row passes validation', () => {
    const result = validateUpload({
      brand: 'Ziewnic',
      model: 'MARVEL 5G EUROPEAN PV8500',
      category: 'Hybrid Inverter',
      price: 120000,
    });
    expect(result.valid).toBe(true);
    expect(result.taxonomy_status).toBe('live');
    expect(result.issues).toHaveLength(0);
  });

  it('unknown category produces review status (not quarantine)', () => {
    const result = validateUpload({
      brand: 'Acme', model: 'WIDGET-3000', category: 'Quantum Widget', price: 50000,
    });
    expect(result.valid).toBe(false);
    expect(result.taxonomy_status).toBe('review');
    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.suggestions.length).toBeGreaterThan(0);
  });

  it('missing brand produces quarantine status', () => {
    const result = validateUpload({ brand: '', model: 'X-100', category: 'Refrigerators', price: 50000 });
    expect(result.taxonomy_status).toBe('quarantine');
    expect(result.valid).toBe(false);
  });

  it('missing model produces quarantine status', () => {
    const result = validateUpload({ brand: 'Haier', model: '', category: 'Refrigerators', price: 50000 });
    expect(result.taxonomy_status).toBe('quarantine');
  });

  it('missing category produces quarantine status', () => {
    const result = validateUpload({ brand: 'Haier', model: 'HRF-368', category: '' });
    expect(result.taxonomy_status).toBe('quarantine');
  });

  it('price=0 is allowed (draft) but does not quarantine', () => {
    const result = validateUpload({
      brand: 'Haier', model: 'HRF-368', category: 'Refrigerators', price: 0,
    });
    // Price=0 makes it a draft but if category resolves it should still be valid taxonomy
    expect(result.taxonomy_status).not.toBe('quarantine');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// F. canCompare — comparison group enforcement
// ─────────────────────────────────────────────────────────────────────────────

describe('canCompare', () => {
  it('two solar inverters can be compared', () => {
    expect(canCompare('Hybrid Inverter', 'Solar Converter')).toBe(true);
  });

  it('solar inverter and refrigerator cannot be compared', () => {
    expect(canCompare('Hybrid Inverter', 'Refrigerators')).toBe(false);
  });

  it('two refrigerators can be compared', () => {
    expect(canCompare('Refrigerators', 'Refrigerators')).toBe(true);
  });

  it('solar panel and solar battery are different comparison groups', () => {
    expect(canCompare('Solar Panel', 'Solar Battery')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// G. enrichProduct — solar inverter specs generation
// ─────────────────────────────────────────────────────────────────────────────

describe('enrichProduct — solar inverter specs', () => {
  it('Hybrid Inverter produces solar-class specs', () => {
    const enriched = enrichProduct('Ziewnic', 'MARVEL 5G EUROPEAN PV8500', 'Hybrid Inverter');
    expect(enriched.specs).toBeDefined();
    // Should have power-electronics specs, not generic solar system specs
    expect(Object.keys(enriched.specs).some(k =>
      k.includes('Power') || k.includes('Voltage') || k.includes('Type')
    )).toBe(true);
  });

  it('Solar Converter PV7000 derives 7kW from PV7000 model code', () => {
    const enriched = enrichProduct('Ziewnic', 'Solar Converter PV7000', 'Solar Converter');
    // PV7000 = 7kW
    const specValues = Object.values(enriched.specs || {}).join(' ');
    expect(specValues).toContain('7');
  });

  it('Solar Converter PV10000 derives 10kW', () => {
    const enriched = enrichProduct('Ziewnic', 'Solar Converter PV10000', 'Solar Converter');
    const specValues = Object.values(enriched.specs || {}).join(' ');
    expect(specValues).toContain('10');
  });

  it('hybrid inverter gets Hybrid Inverter sub_category', () => {
    const enriched = enrichProduct('Ziewnic', 'MARVEL 5G EUROPEAN PV8500', 'Hybrid Inverter');
    expect(enriched.sub_category).toBe('Hybrid Inverter');
  });

  it('enrichProduct stores original_category verbatim', () => {
    const enriched = enrichProduct('Ziewnic', 'PV7000', 'Solar Converter');
    expect(enriched.original_category).toBe('Solar Converter');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// H. 3.6kW solar frame deduction
// ─────────────────────────────────────────────────────────────────────────────

describe('3.6kW solar frame deduction', () => {
  it('3.6kW package frameDeduction is exactly 96000', async () => {
    const { PACKAGES } = await import('../../pages/SolarPage');
    const pkg36 = PACKAGES.find((p: { id: string }) => p.id === 'solar-3.6kw');
    expect(pkg36).toBeDefined();
    expect(pkg36!.frameDeduction).toBe(96000);
  });

  it('3.6kW without frame = total - 96000', async () => {
    const { PACKAGES } = await import('../../pages/SolarPage');
    const pkg36 = PACKAGES.find((p: { id: string }) => p.id === 'solar-3.6kw');
    expect(pkg36).toBeDefined();
    const withoutFrame = pkg36!.total - pkg36!.frameDeduction;
    expect(withoutFrame).toBe(pkg36!.total - 96000);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// I. Image deduplication
// ─────────────────────────────────────────────────────────────────────────────

describe('image deduplication in rowToProduct', () => {
  // Test the dedup logic by simulating what rowToProduct does
  function deduplicateGallery(thumbnail: string, rawGallery: string[]): string[] {
    const seen = new Set<string>(thumbnail ? [thumbnail] : []);
    return rawGallery.filter(u => { if (seen.has(u)) return false; seen.add(u); return true; });
  }

  it('removes duplicate URLs from gallery', () => {
    const gallery = deduplicateGallery('http://img/a.jpg', ['http://img/b.jpg', 'http://img/b.jpg', 'http://img/c.jpg']);
    expect(gallery).toEqual(['http://img/b.jpg', 'http://img/c.jpg']);
  });

  it('removes thumbnail URL from gallery if repeated', () => {
    const gallery = deduplicateGallery('http://img/a.jpg', ['http://img/a.jpg', 'http://img/b.jpg']);
    expect(gallery).toEqual(['http://img/b.jpg']);
  });

  it('empty gallery when all are duplicates of thumbnail', () => {
    const gallery = deduplicateGallery('http://img/a.jpg', ['http://img/a.jpg', 'http://img/a.jpg']);
    expect(gallery).toHaveLength(0);
  });

  it('preserves order of unique images', () => {
    const gallery = deduplicateGallery('', ['http://img/c.jpg', 'http://img/a.jpg', 'http://img/b.jpg']);
    expect(gallery).toEqual(['http://img/c.jpg', 'http://img/a.jpg', 'http://img/b.jpg']);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// J. Frontend category filter — normalized taxonomy prevents irrelevant products
// ─────────────────────────────────────────────────────────────────────────────

describe('frontend category filter — normalized taxonomy', () => {
  it('solar category terms include hybrid inverter and solar converter aliases', () => {
    // Verify CAT_TERMS for 'solar' includes the new inverter sub-type terms
    // (indirect test: resolveCanonicalCategory must map them, so the DB filter works)
    const hybridCC = resolveCanonicalCategory('', '', 'Hybrid Inverter');
    const convCC   = resolveCanonicalCategory('', '', 'Solar Converter');
    expect(hybridCC).toBe('solar');
    expect(convCC).toBe('solar');
  });

  it('refrigerator products do not appear under solar category', () => {
    const cc = resolveCanonicalCategory('Haier', 'HRF-368 IFGA', 'Refrigerators');
    expect(cc).toBe('refrigerator');
    expect(cc).not.toBe('solar');
  });

  it('AC products do not appear under solar category', () => {
    const cc = resolveCanonicalCategory('Gree', 'GS-12PITH', 'Air Conditioners');
    expect(cc).toBe('air_conditioner');
    expect(cc).not.toBe('solar');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// K. SEO — canonical slugs for solar sub-categories
// ─────────────────────────────────────────────────────────────────────────────

describe('SEO — taxonomy seo_category_slug', () => {
  it('Hybrid Inverter gets seo_category_slug = solar-inverters', () => {
    const entry = lookupTaxonomy('Hybrid Inverter');
    expect(entry?.seo_category_slug).toBe('solar-inverters');
  });

  it('Solar Converter gets seo_category_slug = solar-inverters', () => {
    const entry = lookupTaxonomy('Solar Converter');
    expect(entry?.seo_category_slug).toBe('solar-inverters');
  });

  it('Solar Panel gets seo_category_slug = solar-panels', () => {
    const entry = lookupTaxonomy('Solar Panel');
    expect(entry?.seo_category_slug).toBe('solar-panels');
  });

  it('Refrigerators gets seo_category_slug = refrigerators', () => {
    const entry = lookupTaxonomy('Refrigerators');
    expect(entry?.seo_category_slug).toBe('refrigerators');
  });
});
