/**
 * taxonomy.ts — Two-layer taxonomy architecture
 *
 * Layer 1 (original): supplier/import category stored verbatim in `original_category`
 * Layer 2 (normalized): canonical taxonomy for browse, filters, SEO, comparison
 *
 * Design principles:
 * - Original supplier category is NEVER overwritten or destroyed
 * - Normalized taxonomy is derived from original via the alias registry
 * - Unknown categories are quarantined (taxonomy_status='review') until resolved
 * - All normalized taxonomy values are deterministic and auditable
 */

// ── Normalized taxonomy entry ─────────────────────────────────────────────────

export interface NormalizedTaxonomy {
  /** Canonical normalized category (for browse, SEO, filters) */
  normalized_category:    string;
  /** Canonical normalized sub-category */
  normalized_subcategory: string;
  /** Broad family (Solar, Cooling, Refrigeration, Laundry, Kitchen, TV, Small Appliances) */
  category_family:        string;
  /** Group for cross-brand comparison (must be same product type) */
  comparison_group:       string;
  /** Controls which frontend sections/pages the product appears in */
  frontend_browse_group:  string;
  /** URL slug for the canonical category page */
  seo_category_slug:      string;
  /** URL slug for the canonical sub-category page */
  seo_subcategory_slug:   string;
  /** schema.org product type */
  schema_type:            string;
  /** Whether product can be published (false = needs admin review) */
  publish_allowed:        boolean;
  /** Spec template to use for this category */
  spec_template:          string;
}

// ── Taxonomy registry ─────────────────────────────────────────────────────────

interface TaxonomyEntry extends NormalizedTaxonomy {
  /** Canonical ID (snake_case, stable) */
  id: string;
  /** Human-readable display name */
  display_name: string;
  /** All raw supplier category strings that map to this entry (case-insensitive contains-match) */
  aliases: string[];
  /** Required spec fields for this category */
  required_specs: string[];
}

export const TAXONOMY_REGISTRY: TaxonomyEntry[] = [
  // ── Air Conditioners ──────────────────────────────────────────────────────
  {
    id: 'air_conditioner',
    display_name: 'Air Conditioner',
    aliases: ['air conditioner', 'air conditioning', 'split ac', 'inverter ac', 'window ac', 'dc inverter'],
    normalized_category: 'Air Conditioners',
    normalized_subcategory: 'Split AC',
    category_family: 'Cooling',
    comparison_group: 'air_conditioner',
    frontend_browse_group: 'air-conditioners',
    seo_category_slug: 'air-conditioners',
    seo_subcategory_slug: 'split-air-conditioners',
    schema_type: 'Product',
    publish_allowed: true,
    spec_template: 'air_conditioner',
    required_specs: ['Tonnage', 'Compressor'],
  },

  // ── Refrigerators ────────────────────────────────────────────────────────
  {
    id: 'refrigerator',
    display_name: 'Refrigerator',
    aliases: ['refrigerator', 'inverter fridge', 'side by side', 'no frost', 'double door fridge'],
    normalized_category: 'Refrigerators',
    normalized_subcategory: 'Double Door Refrigerator',
    category_family: 'Refrigeration',
    comparison_group: 'refrigerator',
    frontend_browse_group: 'refrigerators',
    seo_category_slug: 'refrigerators',
    seo_subcategory_slug: 'double-door-refrigerators',
    schema_type: 'Product',
    publish_allowed: true,
    spec_template: 'refrigerator',
    required_specs: ['Capacity', 'Type'],
  },

  // ── Deep Freezers ────────────────────────────────────────────────────────
  {
    id: 'deep_freezer',
    display_name: 'Deep Freezer',
    aliases: ['deep freezer', 'chest freezer', 'vertical freezer'],
    normalized_category: 'Deep Freezers',
    normalized_subcategory: 'Chest Deep Freezer',
    category_family: 'Refrigeration',
    comparison_group: 'deep_freezer',
    frontend_browse_group: 'freezers',
    seo_category_slug: 'freezers',
    seo_subcategory_slug: 'chest-deep-freezers',
    schema_type: 'Product',
    publish_allowed: true,
    spec_template: 'deep_freezer',
    required_specs: ['Capacity', 'Type'],
  },

  // ── Washing Machines ─────────────────────────────────────────────────────
  {
    id: 'washing_machine',
    display_name: 'Washing Machine',
    aliases: ['washing machine', 'front load', 'top load', 'twin tub', 'fully automatic', 'semi automatic'],
    normalized_category: 'Washing Machines',
    normalized_subcategory: 'Fully Automatic',
    category_family: 'Laundry',
    comparison_group: 'washing_machine',
    frontend_browse_group: 'washing-machines',
    seo_category_slug: 'washing-machines',
    seo_subcategory_slug: 'automatic-washing-machines',
    schema_type: 'Product',
    publish_allowed: true,
    spec_template: 'washing_machine',
    required_specs: ['Capacity', 'Type'],
  },

  // ── Televisions ──────────────────────────────────────────────────────────
  {
    id: 'television',
    display_name: 'Television',
    aliases: ['television', 'smart tv', 'led tv', 'qled tv', 'android tv'],
    normalized_category: 'Televisions',
    normalized_subcategory: 'Smart LED TV',
    category_family: 'TV & Display',
    comparison_group: 'television',
    frontend_browse_group: 'televisions',
    seo_category_slug: 'televisions',
    seo_subcategory_slug: 'smart-led-tvs',
    schema_type: 'Product',
    publish_allowed: true,
    spec_template: 'television',
    required_specs: ['Screen Size', 'Resolution'],
  },

  // ── Microwaves ───────────────────────────────────────────────────────────
  {
    id: 'microwave',
    display_name: 'Microwave Oven',
    aliases: ['microwave'],
    normalized_category: 'Kitchen Appliances',
    normalized_subcategory: 'Microwave Oven',
    category_family: 'Kitchen',
    comparison_group: 'microwave',
    frontend_browse_group: 'kitchen-appliances',
    seo_category_slug: 'kitchen-appliances',
    seo_subcategory_slug: 'microwave-ovens',
    schema_type: 'Product',
    publish_allowed: true,
    spec_template: 'microwave',
    required_specs: ['Capacity', 'Power'],
  },

  // ── Solar Inverters (Hybrid) ──────────────────────────────────────────────
  {
    id: 'solar_hybrid_inverter',
    display_name: 'Hybrid Solar Inverter',
    aliases: [
      'hybrid inverter', 'hybrid solar inverter', 'solar hybrid inverter',
      'pv hybrid', 'hybrid pv inverter',
    ],
    normalized_category: 'Solar Inverters',
    normalized_subcategory: 'Hybrid Inverter',
    category_family: 'Solar',
    comparison_group: 'solar_inverter',
    frontend_browse_group: 'solar-inverters',
    seo_category_slug: 'solar-inverters',
    seo_subcategory_slug: 'hybrid-inverters',
    schema_type: 'Product',
    publish_allowed: true,
    spec_template: 'solar_inverter',
    required_specs: ['Rated Power', 'Input Voltage (DC)', 'Output Voltage (AC)'],
  },

  // ── Solar Converters (Grid-Tie) ───────────────────────────────────────────
  {
    id: 'solar_converter',
    display_name: 'Solar Converter',
    aliases: [
      'solar converter', 'grid-tie inverter', 'on-grid inverter', 'on grid inverter',
      'string inverter', 'grid inverter', 'grid tied inverter', 'grid-tied inverter',
      'pv inverter', 'pv solar inverter',
    ],
    normalized_category: 'Solar Inverters',
    normalized_subcategory: 'Grid-Tie / Solar Converter',
    category_family: 'Solar',
    comparison_group: 'solar_inverter',
    frontend_browse_group: 'solar-inverters',
    seo_category_slug: 'solar-inverters',
    seo_subcategory_slug: 'solar-converters',
    schema_type: 'Product',
    publish_allowed: true,
    spec_template: 'solar_inverter',
    required_specs: ['Rated Power', 'Input Voltage (DC)', 'Output Voltage (AC)'],
  },

  // ── Off-Grid Inverters ────────────────────────────────────────────────────
  {
    id: 'solar_offgrid_inverter',
    display_name: 'Off-Grid Solar Inverter',
    aliases: [
      'off-grid inverter', 'off grid inverter', 'offgrid inverter',
      'standalone inverter', 'backup inverter',
    ],
    normalized_category: 'Solar Inverters',
    normalized_subcategory: 'Off-Grid Inverter',
    category_family: 'Solar',
    comparison_group: 'solar_inverter',
    frontend_browse_group: 'solar-inverters',
    seo_category_slug: 'solar-inverters',
    seo_subcategory_slug: 'off-grid-inverters',
    schema_type: 'Product',
    publish_allowed: true,
    spec_template: 'solar_inverter',
    required_specs: ['Rated Power'],
  },

  // ── Solar Panels ──────────────────────────────────────────────────────────
  {
    id: 'solar_panel',
    display_name: 'Solar Panel',
    aliases: ['solar panel', 'pv panel', 'photovoltaic panel', 'solar plate', 'mono perc panel'],
    normalized_category: 'Solar Panels',
    normalized_subcategory: 'Solar Panel',
    category_family: 'Solar',
    comparison_group: 'solar_panel',
    frontend_browse_group: 'solar-panels',
    seo_category_slug: 'solar-panels',
    seo_subcategory_slug: 'monocrystalline-solar-panels',
    schema_type: 'Product',
    publish_allowed: true,
    spec_template: 'solar_panel',
    required_specs: ['Wattage', 'Efficiency'],
  },

  // ── Solar Batteries ───────────────────────────────────────────────────────
  {
    id: 'solar_battery',
    display_name: 'Solar Battery',
    aliases: ['solar battery', 'lithium battery', 'lifepo4 battery', 'storage battery', 'energy storage'],
    normalized_category: 'Solar Batteries',
    normalized_subcategory: 'LiFePO4 Battery',
    category_family: 'Solar',
    comparison_group: 'solar_battery',
    frontend_browse_group: 'solar-batteries',
    seo_category_slug: 'solar-batteries',
    seo_subcategory_slug: 'lithium-solar-batteries',
    schema_type: 'Product',
    publish_allowed: true,
    spec_template: 'battery',
    required_specs: ['Capacity (kWh)', 'Technology'],
  },

  // ── Solar Systems (complete bundles) ──────────────────────────────────────
  {
    id: 'solar_system',
    display_name: 'Solar System',
    aliases: ['solar system', 'solar solution', 'solar kit', 'solar package', 'complete solar system'],
    normalized_category: 'Solar Systems',
    normalized_subcategory: 'Complete Solar System',
    category_family: 'Solar',
    comparison_group: 'solar_system',
    frontend_browse_group: 'solar',
    seo_category_slug: 'solar-solutions',
    seo_subcategory_slug: 'complete-solar-systems',
    schema_type: 'Product',
    publish_allowed: true,
    spec_template: 'solar_system',
    required_specs: ['System Capacity'],
  },

  // ── UPS / Inverter Batteries ───────────────────────────────────────────────
  {
    id: 'battery',
    display_name: 'Battery',
    aliases: ['tubular battery', 'acid battery', 'inverter battery', 'power solution'],
    normalized_category: 'Power Solutions',
    normalized_subcategory: 'Inverter Battery',
    category_family: 'Power',
    comparison_group: 'battery',
    frontend_browse_group: 'power-solutions',
    seo_category_slug: 'power-solutions',
    seo_subcategory_slug: 'inverter-batteries',
    schema_type: 'Product',
    publish_allowed: true,
    spec_template: 'battery',
    required_specs: ['Capacity (AH)', 'Technology'],
  },

  // ── Fans ──────────────────────────────────────────────────────────────────
  {
    id: 'fan',
    display_name: 'Fan',
    aliases: ['ceiling fan', 'pedestal fan', 'stand fan', 'table fan', 'wall fan', 'bracket fan'],
    normalized_category: 'Fans',
    normalized_subcategory: 'Fan',
    category_family: 'Small Appliances',
    comparison_group: 'fan',
    frontend_browse_group: 'fans',
    seo_category_slug: 'fans',
    seo_subcategory_slug: 'fans',
    schema_type: 'Product',
    publish_allowed: true,
    spec_template: 'fan',
    required_specs: ['Type', 'Blade Sweep'],
  },

  // ── Water Dispensers ─────────────────────────────────────────────────────
  {
    id: 'water_dispenser',
    display_name: 'Water Dispenser',
    aliases: ['water dispenser', 'water cooler dispenser', 'hot and cold dispenser'],
    normalized_category: 'Water Dispensers',
    normalized_subcategory: 'Water Dispenser',
    category_family: 'Kitchen',
    comparison_group: 'water_dispenser',
    frontend_browse_group: 'water-dispensers',
    seo_category_slug: 'water-dispensers',
    seo_subcategory_slug: 'water-dispensers',
    schema_type: 'Product',
    publish_allowed: true,
    spec_template: 'water_dispenser',
    required_specs: ['Type'],
  },

  // ── Kitchen Appliances (generic fallback) ─────────────────────────────────
  {
    id: 'kitchen_appliance',
    display_name: 'Kitchen Appliance',
    aliases: ['kitchen appliance', 'kitchen appliances'],
    normalized_category: 'Kitchen Appliances',
    normalized_subcategory: 'Kitchen Appliance',
    category_family: 'Kitchen',
    comparison_group: 'kitchen',
    frontend_browse_group: 'kitchen-appliances',
    seo_category_slug: 'kitchen-appliances',
    seo_subcategory_slug: 'kitchen-appliances',
    schema_type: 'Product',
    publish_allowed: true,
    spec_template: 'small_appliance',
    required_specs: [],
  },

  // ── Small Appliances (generic fallback) ───────────────────────────────────
  {
    id: 'small_appliance',
    display_name: 'Small Appliance',
    aliases: ['small appliance', 'small appliances', 'personal care', 'home & heating'],
    normalized_category: 'Small Appliances',
    normalized_subcategory: 'Small Appliance',
    category_family: 'Small Appliances',
    comparison_group: 'small_appliance',
    frontend_browse_group: 'small-appliances',
    seo_category_slug: 'small-appliances',
    seo_subcategory_slug: 'small-appliances',
    schema_type: 'Product',
    publish_allowed: true,
    spec_template: 'small_appliance',
    required_specs: [],
  },
];

// ── Alias lookup (case-insensitive contains) ──────────────────────────────────

/**
 * Find the taxonomy entry that matches a raw supplier category string.
 * Matching is case-insensitive and uses substring containment.
 * Returns null if no confident match is found.
 */
export function lookupTaxonomy(rawCategory: string): TaxonomyEntry | null {
  const cat = rawCategory.toLowerCase().trim();
  if (!cat) return null;
  // Exact alias match first (higher confidence)
  for (const entry of TAXONOMY_REGISTRY) {
    if (entry.aliases.some(alias => alias === cat)) return entry;
  }
  // Substring match second
  for (const entry of TAXONOMY_REGISTRY) {
    if (entry.aliases.some(alias => cat.includes(alias) || alias.includes(cat))) return entry;
  }
  return null;
}

/**
 * Derive all normalized taxonomy fields for a product.
 * Always call this before inserting/updating a product to populate
 * the normalized taxonomy columns.
 */
export function normalizeTaxonomy(originalCategory: string): {
  taxonomy: NormalizedTaxonomy | null;
  taxonomy_status: 'live' | 'review';
  resolved: boolean;
} {
  const entry = lookupTaxonomy(originalCategory);
  if (!entry) {
    return {
      taxonomy: null,
      taxonomy_status: 'review',
      resolved: false,
    };
  }
  const taxonomy: NormalizedTaxonomy = {
    normalized_category:    entry.normalized_category,
    normalized_subcategory: entry.normalized_subcategory,
    category_family:        entry.category_family,
    comparison_group:       entry.comparison_group,
    frontend_browse_group:  entry.frontend_browse_group,
    seo_category_slug:      entry.seo_category_slug,
    seo_subcategory_slug:   entry.seo_subcategory_slug,
    schema_type:            entry.schema_type,
    publish_allowed:        entry.publish_allowed,
    spec_template:          entry.spec_template,
  };
  return {
    taxonomy,
    taxonomy_status: entry.publish_allowed ? 'live' : 'review',
    resolved: true,
  };
}

// ── Upload validation ─────────────────────────────────────────────────────────

export interface UploadValidationResult {
  valid: boolean;
  taxonomy_status: 'live' | 'review' | 'quarantine';
  issues: string[];
  suggestions: string[];
  normalized: NormalizedTaxonomy | null;
}

/**
 * Validate a product row before inserting it into the database.
 * Returns a detailed result explaining what passed, what failed,
 * and what the admin should do to resolve any issues.
 */
export function validateUpload(row: {
  brand: string;
  model: string;
  category: string;
  price?: number;
}): UploadValidationResult {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let taxonomy_status: 'live' | 'review' | 'quarantine' = 'live';

  // Required field validation
  if (!row.brand?.trim())    { issues.push('Brand is missing');    taxonomy_status = 'quarantine'; }
  if (!row.model?.trim())    { issues.push('Model is missing');    taxonomy_status = 'quarantine'; }
  if (!row.category?.trim()) { issues.push('Category is missing'); taxonomy_status = 'quarantine'; }

  if (taxonomy_status === 'quarantine') {
    return { valid: false, taxonomy_status, issues, suggestions, normalized: null };
  }

  // Taxonomy resolution
  const { taxonomy, resolved } = normalizeTaxonomy(row.category);

  if (!resolved) {
    issues.push(`Category "${row.category}" is not in the taxonomy registry`);
    taxonomy_status = 'review';

    // Suggest likely matches
    const cat = row.category.toLowerCase();
    if (cat.includes('inverter') || cat.includes('solar') || cat.includes('pv')) {
      suggestions.push('This appears to be a solar/inverter product. Suggested normalized category: Solar Inverters');
      suggestions.push('To resolve: ask admin to map this category or add it to taxonomy.ts TAXONOMY_REGISTRY');
    } else if (cat.includes('battery') || cat.includes('ups')) {
      suggestions.push('This appears to be a power-solutions product. Suggested: Power Solutions → Battery');
    } else if (cat.includes('fridge') || cat.includes('refrig')) {
      suggestions.push('Suggested normalized category: Refrigerators');
    } else {
      suggestions.push(`No confident match found. Check taxonomy.ts and add "${row.category}" to the appropriate TAXONOMY_REGISTRY entry's aliases array`);
    }
  }

  // Price validation
  if (row.price !== undefined && row.price <= 0) {
    issues.push('Price is 0 — product will be inserted as a draft');
    // Price=0 is allowed (draft), does not change taxonomy_status
  }

  return {
    valid:           taxonomy_status === 'live',
    taxonomy_status,
    issues,
    suggestions,
    normalized:      taxonomy,
  };
}

// ── Comparison group guard ────────────────────────────────────────────────────

/**
 * Returns true if two products can be compared on the compare page.
 * Products can only be compared within the same comparison_group.
 */
export function canCompare(catA: string, catB: string): boolean {
  const entryA = lookupTaxonomy(catA);
  const entryB = lookupTaxonomy(catB);
  if (!entryA || !entryB) return false;
  return entryA.comparison_group === entryB.comparison_group;
}

// ── Normalized category display names ────────────────────────────────────────

/** Returns all unique normalized_category values for use in navigation/filtering */
export function getAllNormalizedCategories(): string[] {
  return [...new Set(TAXONOMY_REGISTRY.map(e => e.normalized_category))];
}

/** Returns all unique category families */
export function getAllCategoryFamilies(): string[] {
  return [...new Set(TAXONOMY_REGISTRY.map(e => e.category_family))];
}
