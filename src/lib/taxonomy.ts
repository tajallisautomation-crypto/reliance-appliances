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

  // ──────────────────────────────────────────────────────────────────────────
  // AIR CONDITIONERS
  // Order: Floor Standing → Commercial → generic Split AC (catch-all last)
  // Air Curtains classified separately as Commercial Equipment — not here
  // ──────────────────────────────────────────────────────────────────────────

  {
    id: 'floor_standing_ac',
    display_name: 'Floor Standing Air Conditioner',
    aliases: [
      'floor standing ac', 'floor standing air conditioner', 'floor standing split',
      'floor standing inverter', 'cassette ac', 'ducted ac',
      'gree floor standing', 'ecostar floor standing', 'haier floor standing',
      'midea floor standing', 'dawlance floor standing',
    ],
    normalized_category: 'Air Conditioners',
    normalized_subcategory: 'Floor Standing AC',
    category_family: 'Cooling',
    comparison_group: 'air_conditioner',
    frontend_browse_group: 'air-conditioners',
    seo_category_slug: 'air-conditioners',
    seo_subcategory_slug: 'floor-standing-air-conditioners',
    schema_type: 'Product',
    publish_allowed: true,
    spec_template: 'air_conditioner',
    required_specs: ['Tonnage', 'Compressor'],
  },

  {
    id: 'commercial_ac',
    display_name: 'Commercial Air Conditioner',
    aliases: [
      'commercial ac', 'commercial air conditioner', 'industrial ac',
      'commercial split', 'haier commercial ac', 'commercial inverter ac',
      'commercial cooling', 'vrf', 'vrv',
    ],
    normalized_category: 'Air Conditioners',
    normalized_subcategory: 'Commercial AC',
    category_family: 'Cooling',
    comparison_group: 'air_conditioner',
    frontend_browse_group: 'air-conditioners',
    seo_category_slug: 'air-conditioners',
    seo_subcategory_slug: 'commercial-air-conditioners',
    schema_type: 'Product',
    publish_allowed: true,
    spec_template: 'air_conditioner',
    required_specs: ['Tonnage', 'Compressor'],
  },

  // Generic split AC — catch-all for all remaining AC types
  {
    id: 'air_conditioner',
    display_name: 'Air Conditioner',
    aliases: [
      'air conditioner', 'air conditioning', 'split ac', 'inverter ac',
      'window ac', 'dc inverter', 'dc inverter ac', 'inverter split ac',
      'non inverter ac', 'conventional ac', 'wall mounted ac',
      't3 ac', 't3 air conditioner', 'heat and cool ac', 'heat & cool ac',
      'cool only ac',
      // Midea
      'midea wall mounted', 'midea inverter', 'midea dc inverter',
      'midea conventional', 'midea cool only', 'midea non inverter',
      // EcoStar
      'ecostar ac', 'ecostar cool only', 'ecostar split', 'ecostar inverter',
      'ecostar duke', 'ecostar emperor', 'ecostar prince', 'ecostar ario', 'ecostar nova',
      'ecostar prince t3', 'ecostar ario t3', 'ecostar nova t3',
      // Gree
      'gree ac', 'gree split', 'gree inverter', 'gree cool only', 'gree heat cool',
      'gree pular', 'gree charmo', 'gree fairy', 'gree airy', 'gree zeno',
      'gree pular t3', 'gree airy t3', 'gree zeno t3',
      // Dawlance
      'dawlance ac', 'dawlance split', 'dawlance inverter', 'dawlance aeromax',
      'dawlance mega t3', 'dawlance chillex', 'dawlance cruise', 'dawlance elegance',
      'dawlance megaflex', 'dawlance prima', 'dawlance powercon',
      // Haier
      'haier ac', 'haier thunder', 'haier pearl', 'haier super inverter',
      'haier non inverter', 'haier inverter', 'haier hsu', 'haier gs', 'haier es',
    ],
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

  // ──────────────────────────────────────────────────────────────────────────
  // AIR CURTAINS — must NOT appear in AC browse or filters
  // ──────────────────────────────────────────────────────────────────────────

  {
    id: 'air_curtain',
    display_name: 'Air Curtain',
    aliases: [
      'air curtain', 'air door', 'air barrier', 'air curtain machine',
    ],
    normalized_category: 'Commercial Equipment',
    normalized_subcategory: 'Air Curtain',
    category_family: 'Commercial Equipment',
    comparison_group: 'air_curtain',
    frontend_browse_group: 'commercial-equipment',
    seo_category_slug: 'commercial-equipment',
    seo_subcategory_slug: 'air-curtains',
    schema_type: 'Product',
    publish_allowed: true,
    spec_template: 'small_appliance',
    required_specs: ['Size'],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // REFRIGERATORS
  // Order: specific sub-types first, generic Double Door last
  // Do NOT include freezers here
  // ──────────────────────────────────────────────────────────────────────────

  {
    id: 'side_by_side_refrigerator',
    display_name: 'Side-by-Side Refrigerator',
    aliases: [
      'side by side refrigerator', 'side-by-side refrigerator', 'sbs refrigerator',
      'side by side fridge', 'american fridge', 'american style refrigerator',
    ],
    normalized_category: 'Refrigerators',
    normalized_subcategory: 'Side-by-Side Refrigerator',
    category_family: 'Refrigeration',
    comparison_group: 'refrigerator',
    frontend_browse_group: 'refrigerators',
    seo_category_slug: 'refrigerators',
    seo_subcategory_slug: 'side-by-side-refrigerators',
    schema_type: 'Product',
    publish_allowed: true,
    spec_template: 'refrigerator',
    required_specs: ['Capacity', 'Type'],
  },

  {
    id: 'french_door_refrigerator',
    display_name: 'French Door / T-Door Refrigerator',
    aliases: [
      'french door refrigerator', 'french-door refrigerator', 't-door refrigerator',
      'tdoor refrigerator', 'four door refrigerator', 'multi-door refrigerator',
    ],
    normalized_category: 'Refrigerators',
    normalized_subcategory: 'French Door Refrigerator',
    category_family: 'Refrigeration',
    comparison_group: 'refrigerator',
    frontend_browse_group: 'refrigerators',
    seo_category_slug: 'refrigerators',
    seo_subcategory_slug: 'french-door-refrigerators',
    schema_type: 'Product',
    publish_allowed: true,
    spec_template: 'refrigerator',
    required_specs: ['Capacity', 'Type'],
  },

  {
    id: 'glass_door_refrigerator',
    display_name: 'Glass Door Refrigerator',
    aliases: [
      'glass door refrigerator', 'glass-door refrigerator', 'glass top refrigerator',
      'glass door fridge', 'glass front refrigerator',
    ],
    normalized_category: 'Refrigerators',
    normalized_subcategory: 'Glass Door Refrigerator',
    category_family: 'Refrigeration',
    comparison_group: 'refrigerator',
    frontend_browse_group: 'refrigerators',
    seo_category_slug: 'refrigerators',
    seo_subcategory_slug: 'glass-door-refrigerators',
    schema_type: 'Product',
    publish_allowed: true,
    spec_template: 'refrigerator',
    required_specs: ['Capacity', 'Type'],
  },

  {
    id: 'no_frost_refrigerator',
    display_name: 'No Frost Refrigerator',
    aliases: [
      'no frost refrigerator', 'no-frost refrigerator', 'frost free refrigerator',
      'nofrost refrigerator', 'no frost fridge',
    ],
    normalized_category: 'Refrigerators',
    normalized_subcategory: 'No Frost Refrigerator',
    category_family: 'Refrigeration',
    comparison_group: 'refrigerator',
    frontend_browse_group: 'refrigerators',
    seo_category_slug: 'refrigerators',
    seo_subcategory_slug: 'no-frost-refrigerators',
    schema_type: 'Product',
    publish_allowed: true,
    spec_template: 'refrigerator',
    required_specs: ['Capacity', 'Type'],
  },

  {
    id: 'single_door_refrigerator',
    display_name: 'Single Door Refrigerator',
    aliases: [
      'single door refrigerator', 'single-door refrigerator', 'mini fridge',
      'bar fridge', 'compact refrigerator', 'table top refrigerator',
    ],
    normalized_category: 'Refrigerators',
    normalized_subcategory: 'Single Door Refrigerator',
    category_family: 'Refrigeration',
    comparison_group: 'refrigerator',
    frontend_browse_group: 'refrigerators',
    seo_category_slug: 'refrigerators',
    seo_subcategory_slug: 'single-door-refrigerators',
    schema_type: 'Product',
    publish_allowed: true,
    spec_template: 'refrigerator',
    required_specs: ['Capacity', 'Type'],
  },

  {
    id: 'convertible_refrigerator',
    display_name: 'Convertible Refrigerator-Freezer',
    aliases: [
      'convertible refrigerator', 'refrigerator freezer combo', 'fridge freezer combo',
      'convertible fridge', 'all in one refrigerator',
    ],
    normalized_category: 'Refrigerators',
    normalized_subcategory: 'Convertible Refrigerator-Freezer',
    category_family: 'Refrigeration',
    comparison_group: 'refrigerator',
    frontend_browse_group: 'refrigerators',
    seo_category_slug: 'refrigerators',
    seo_subcategory_slug: 'convertible-refrigerators',
    schema_type: 'Product',
    publish_allowed: true,
    spec_template: 'refrigerator',
    required_specs: ['Capacity', 'Type'],
  },

  // Generic double-door refrigerator — catch-all fallback
  {
    id: 'refrigerator',
    display_name: 'Double Door Refrigerator',
    aliases: [
      'refrigerator', 'double door refrigerator', 'inverter fridge',
      'double door fridge', 'two door refrigerator',
    ],
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

  // ──────────────────────────────────────────────────────────────────────────
  // FREEZERS
  // normalized_category = 'Freezers' (NOT 'Deep Freezers')
  // Do NOT mix refrigerators here
  // ──────────────────────────────────────────────────────────────────────────

  {
    id: 'vertical_freezer',
    display_name: 'Vertical Freezer',
    aliases: [
      'vertical freezer', 'upright freezer', 'vf freezer', 'vertical deep freezer',
      'stand up freezer', 'standing freezer', 'dawlance vf', 'haier vertical freezer',
    ],
    normalized_category: 'Freezers',
    normalized_subcategory: 'Vertical Freezer',
    category_family: 'Refrigeration',
    comparison_group: 'deep_freezer',
    frontend_browse_group: 'freezers',
    seo_category_slug: 'freezers',
    seo_subcategory_slug: 'vertical-freezers',
    schema_type: 'Product',
    publish_allowed: true,
    spec_template: 'deep_freezer',
    required_specs: ['Capacity', 'Type'],
  },

  {
    id: 'inverter_freezer',
    display_name: 'Inverter Freezer',
    aliases: [
      'inverter freezer', 'inverter deep freezer', 'inverter chest freezer',
    ],
    normalized_category: 'Freezers',
    normalized_subcategory: 'Inverter Freezer',
    category_family: 'Refrigeration',
    comparison_group: 'deep_freezer',
    frontend_browse_group: 'freezers',
    seo_category_slug: 'freezers',
    seo_subcategory_slug: 'inverter-freezers',
    schema_type: 'Product',
    publish_allowed: true,
    spec_template: 'deep_freezer',
    required_specs: ['Capacity', 'Type'],
  },

  // Generic chest/deep freezer — catch-all
  {
    id: 'deep_freezer',
    display_name: 'Chest Freezer',
    aliases: [
      'deep freezer', 'chest freezer', 'freezer', 'hdf freezer',
      'haier freezer', 'dawlance freezer', 'df freezer',
    ],
    normalized_category: 'Freezers',
    normalized_subcategory: 'Chest Freezer',
    category_family: 'Refrigeration',
    comparison_group: 'deep_freezer',
    frontend_browse_group: 'freezers',
    seo_category_slug: 'freezers',
    seo_subcategory_slug: 'chest-freezers',
    schema_type: 'Product',
    publish_allowed: true,
    spec_template: 'deep_freezer',
    required_specs: ['Capacity', 'Type'],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // WASHING MACHINES
  // Order: specific load types first, generic fallback last
  // Samsung, Haier, Dawlance all classified here — brand-agnostic
  // ──────────────────────────────────────────────────────────────────────────

  {
    id: 'front_load_washer',
    display_name: 'Front Load Washing Machine',
    aliases: [
      'front load washing machine', 'front-load washing machine', 'frontload washing machine',
      'front loader', 'front load washer', 'front loading washing machine',
      'samsung ww', 'haier hwd', 'dawlance front load', 'samsung front load',
    ],
    normalized_category: 'Washing Machines',
    normalized_subcategory: 'Front Load Washing Machine',
    category_family: 'Laundry',
    comparison_group: 'washing_machine',
    frontend_browse_group: 'washing-machines',
    seo_category_slug: 'washing-machines',
    seo_subcategory_slug: 'front-load-washing-machines',
    schema_type: 'Product',
    publish_allowed: true,
    spec_template: 'washing_machine',
    required_specs: ['Capacity', 'Type'],
  },

  {
    id: 'top_load_washer',
    display_name: 'Top Load Washing Machine',
    aliases: [
      'top load washing machine', 'top-load washing machine', 'fully automatic top load',
      'top loader', 'top load washer', 'automatic top load',
      'samsung wa', 'samsung top load', 'dawlance top load', 'haier hwm top load',
    ],
    normalized_category: 'Washing Machines',
    normalized_subcategory: 'Top Load Washing Machine',
    category_family: 'Laundry',
    comparison_group: 'washing_machine',
    frontend_browse_group: 'washing-machines',
    seo_category_slug: 'washing-machines',
    seo_subcategory_slug: 'top-load-washing-machines',
    schema_type: 'Product',
    publish_allowed: true,
    spec_template: 'washing_machine',
    required_specs: ['Capacity', 'Type'],
  },

  {
    id: 'twin_tub_washer',
    display_name: 'Twin Tub Washing Machine',
    aliases: [
      'twin tub washing machine', 'twin-tub washing machine', 'double tub washing machine',
      'twin tub washer', 'haier twin tub', 'dawlance twin tub',
    ],
    normalized_category: 'Washing Machines',
    normalized_subcategory: 'Twin Tub Washing Machine',
    category_family: 'Laundry',
    comparison_group: 'washing_machine',
    frontend_browse_group: 'washing-machines',
    seo_category_slug: 'washing-machines',
    seo_subcategory_slug: 'twin-tub-washing-machines',
    schema_type: 'Product',
    publish_allowed: true,
    spec_template: 'washing_machine',
    required_specs: ['Capacity', 'Type'],
  },

  {
    id: 'semi_auto_washer',
    display_name: 'Semi-Automatic Washing Machine',
    aliases: [
      'semi automatic washing machine', 'semi-automatic washing machine',
      'semi auto washing machine', 'semi automatic washer',
      'haier semi automatic', 'dawlance semi automatic',
    ],
    normalized_category: 'Washing Machines',
    normalized_subcategory: 'Semi-Automatic Washing Machine',
    category_family: 'Laundry',
    comparison_group: 'washing_machine',
    frontend_browse_group: 'washing-machines',
    seo_category_slug: 'washing-machines',
    seo_subcategory_slug: 'semi-automatic-washing-machines',
    schema_type: 'Product',
    publish_allowed: true,
    spec_template: 'washing_machine',
    required_specs: ['Capacity', 'Type'],
  },

  {
    id: 'spinner',
    display_name: 'Spinner / Spin Dryer',
    aliases: [
      'spinner', 'spin dryer', 'spin-dryer', 'laundry spinner',
      'haier spinner', 'dawlance spinner',
    ],
    normalized_category: 'Washing Machines',
    normalized_subcategory: 'Spinner',
    category_family: 'Laundry',
    comparison_group: 'washing_machine',
    frontend_browse_group: 'washing-machines',
    seo_category_slug: 'washing-machines',
    seo_subcategory_slug: 'spinners',
    schema_type: 'Product',
    publish_allowed: true,
    spec_template: 'washing_machine',
    required_specs: ['Capacity'],
  },

  {
    id: 'single_tub_washer',
    display_name: 'Single Tub Washer',
    aliases: [
      'single tub washing machine', 'single-tub washing machine',
      'single tub washer', 'haier single tub',
      'single tub / washer', 'single tub/washer', 'single-tub washer',
    ],
    normalized_category: 'Washing Machines',
    normalized_subcategory: 'Single Tub Washer',
    category_family: 'Laundry',
    comparison_group: 'washing_machine',
    frontend_browse_group: 'washing-machines',
    seo_category_slug: 'washing-machines',
    seo_subcategory_slug: 'single-tub-washers',
    schema_type: 'Product',
    publish_allowed: true,
    spec_template: 'washing_machine',
    required_specs: ['Capacity'],
  },

  // Generic washing machine — catch-all
  {
    id: 'washing_machine',
    display_name: 'Washing Machine',
    aliases: [
      'washing machine', 'fully automatic washing machine', 'automatic washing machine',
      'washing machines',
    ],
    normalized_category: 'Washing Machines',
    normalized_subcategory: 'Top Load Washing Machine',
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

  // ──────────────────────────────────────────────────────────────────────────
  // TELEVISIONS
  // Brand-agnostic: Samsung, TCL, Dawlance, Haier all map here
  // Use attributes for screen size, resolution, panel type
  // ──────────────────────────────────────────────────────────────────────────

  {
    id: 'qled_tv',
    display_name: 'QLED TV',
    aliases: [
      'qled tv', 'qled', 'neo qled', 'neo-qled', 'qned tv',
      'samsung qled', 'samsung neo qled', 'tcl qled',
    ],
    normalized_category: 'Televisions',
    normalized_subcategory: 'QLED TV',
    category_family: 'TV & Display',
    comparison_group: 'television',
    frontend_browse_group: 'televisions',
    seo_category_slug: 'televisions',
    seo_subcategory_slug: 'qled-tvs',
    schema_type: 'Product',
    publish_allowed: true,
    spec_template: 'television',
    required_specs: ['Screen Size', 'Resolution'],
  },

  {
    id: 'google_tv',
    display_name: 'Google TV / Android TV',
    aliases: [
      'google tv', 'android tv', 'android smart tv', 'google android tv',
    ],
    normalized_category: 'Televisions',
    normalized_subcategory: 'Google TV',
    category_family: 'TV & Display',
    comparison_group: 'television',
    frontend_browse_group: 'televisions',
    seo_category_slug: 'televisions',
    seo_subcategory_slug: 'google-tvs',
    schema_type: 'Product',
    publish_allowed: true,
    spec_template: 'television',
    required_specs: ['Screen Size', 'Resolution'],
  },

  // Generic smart LED TV — catch-all for televisions
  {
    id: 'television',
    display_name: 'Smart LED TV',
    aliases: [
      'television', 'smart tv', 'led tv', 'smart led tv', 'led television',
      '4k tv', 'fhd tv', 'uhd tv', 'oled tv',
      // Samsung
      'samsung led', 'samsung tv', 'samsung smart tv', 'samsung uhd', 'samsung oled',
      'samsung lifestyle', 'samsung frame', 'samsung terrace',
      // TCL
      'tcl tv', 'tcl led', 'tcl smart tv', 'tcl 4k',
      // Other brands
      'dawlance led', 'dawlance tv', 'haier tv',
    ],
    normalized_category: 'Televisions',
    normalized_subcategory: 'Smart TV',
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

  // ──────────────────────────────────────────────────────────────────────────
  // KITCHEN APPLIANCES
  // Specific subcategories first; generic fallback last
  // Kitchen-prep and cooking appliances belong here — NOT in Small Appliances
  // ──────────────────────────────────────────────────────────────────────────

  // Microwave types (most specific first)
  {
    id: 'convection_microwave',
    display_name: 'Convection Microwave / Air Fryer Oven',
    aliases: [
      'convection microwave', 'convection & air fryer', 'air fryer oven',
      'air fryer microwave', 'convection oven microwave', 'convection microwave oven',
    ],
    normalized_category: 'Kitchen Appliances',
    normalized_subcategory: 'Convection Microwave Oven',
    category_family: 'Kitchen',
    comparison_group: 'microwave',
    frontend_browse_group: 'kitchen-appliances',
    seo_category_slug: 'kitchen-appliances',
    seo_subcategory_slug: 'convection-microwave-ovens',
    schema_type: 'Product',
    publish_allowed: true,
    spec_template: 'microwave',
    required_specs: ['Capacity', 'Power'],
  },

  {
    id: 'grill_microwave',
    display_name: 'Grill Microwave Oven',
    aliases: [
      'grill microwave', 'grill microwave oven', 'microwave grill',
      'microwave with grill',
    ],
    normalized_category: 'Kitchen Appliances',
    normalized_subcategory: 'Grill Microwave Oven',
    category_family: 'Kitchen',
    comparison_group: 'microwave',
    frontend_browse_group: 'kitchen-appliances',
    seo_category_slug: 'kitchen-appliances',
    seo_subcategory_slug: 'grill-microwave-ovens',
    schema_type: 'Product',
    publish_allowed: true,
    spec_template: 'microwave',
    required_specs: ['Capacity', 'Power'],
  },

  {
    id: 'built_in_microwave',
    display_name: 'Built-In Microwave',
    aliases: [
      'built-in microwave', 'built in microwave', 'integrated microwave',
      'built-in microwave oven',
    ],
    normalized_category: 'Kitchen Appliances',
    normalized_subcategory: 'Built-In Microwave',
    category_family: 'Kitchen',
    comparison_group: 'microwave',
    frontend_browse_group: 'kitchen-appliances',
    seo_category_slug: 'kitchen-appliances',
    seo_subcategory_slug: 'built-in-microwaves',
    schema_type: 'Product',
    publish_allowed: true,
    spec_template: 'microwave',
    required_specs: ['Capacity', 'Power'],
  },

  // Generic solo microwave
  {
    id: 'microwave',
    display_name: 'Microwave Oven',
    aliases: [
      'microwave', 'solo microwave', 'microwave oven', 'solo microwave oven',
      'haier microwave', 'dawlance microwave', 'samsung microwave',
    ],
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

  // Ovens
  {
    id: 'built_in_oven',
    display_name: 'Built-In Oven',
    aliases: [
      'built-in oven', 'built in oven', 'integrated oven', 'wall oven',
      'electric oven built in',
    ],
    normalized_category: 'Kitchen Appliances',
    normalized_subcategory: 'Built-In Oven',
    category_family: 'Kitchen',
    comparison_group: 'kitchen',
    frontend_browse_group: 'kitchen-appliances',
    seo_category_slug: 'kitchen-appliances',
    seo_subcategory_slug: 'built-in-ovens',
    schema_type: 'Product',
    publish_allowed: true,
    spec_template: 'small_appliance',
    required_specs: ['Capacity', 'Power'],
  },

  {
    id: 'oven_toaster',
    display_name: 'Oven Toaster / Mini Oven',
    aliases: [
      'oven toaster', 'mini oven', 'toaster oven', 'rotisserie oven',
      'electric oven', 'countertop oven', 'small oven', 'table top oven',
    ],
    normalized_category: 'Kitchen Appliances',
    normalized_subcategory: 'Oven Toaster',
    category_family: 'Kitchen',
    comparison_group: 'kitchen',
    frontend_browse_group: 'kitchen-appliances',
    seo_category_slug: 'kitchen-appliances',
    seo_subcategory_slug: 'oven-toasters',
    schema_type: 'Product',
    publish_allowed: true,
    spec_template: 'small_appliance',
    required_specs: ['Capacity', 'Power'],
  },

  // Air Fryer
  {
    id: 'air_fryer',
    display_name: 'Air Fryer',
    aliases: [
      'air fryer', 'air-fryer', 'airfryer', 'digital air fryer',
      'westpoint air fryer',
    ],
    normalized_category: 'Kitchen Appliances',
    normalized_subcategory: 'Air Fryer',
    category_family: 'Kitchen',
    comparison_group: 'kitchen',
    frontend_browse_group: 'kitchen-appliances',
    seo_category_slug: 'kitchen-appliances',
    seo_subcategory_slug: 'air-fryers',
    schema_type: 'Product',
    publish_allowed: true,
    spec_template: 'small_appliance',
    required_specs: ['Capacity', 'Power'],
  },

  // Blenders & Juicers
  {
    id: 'juicer_blender',
    display_name: 'Juicer Blender',
    aliases: [
      'juicer blender', 'blender juicer', 'hard juicer', 'fruit juicer',
      'juice extractor',
    ],
    normalized_category: 'Kitchen Appliances',
    normalized_subcategory: 'Juicer Blender',
    category_family: 'Kitchen',
    comparison_group: 'kitchen',
    frontend_browse_group: 'kitchen-appliances',
    seo_category_slug: 'kitchen-appliances',
    seo_subcategory_slug: 'juicer-blenders',
    schema_type: 'Product',
    publish_allowed: true,
    spec_template: 'small_appliance',
    required_specs: ['Power'],
  },

  {
    id: 'citrus_juicer',
    display_name: 'Citrus Juicer / Slow Juicer',
    aliases: [
      'citrus juicer', 'slow juicer', 'cold press juicer', 'orange juicer',
      'masticating juicer',
    ],
    normalized_category: 'Kitchen Appliances',
    normalized_subcategory: 'Citrus Juicer',
    category_family: 'Kitchen',
    comparison_group: 'kitchen',
    frontend_browse_group: 'kitchen-appliances',
    seo_category_slug: 'kitchen-appliances',
    seo_subcategory_slug: 'citrus-juicers',
    schema_type: 'Product',
    publish_allowed: true,
    spec_template: 'small_appliance',
    required_specs: ['Power'],
  },

  {
    id: 'blender',
    display_name: 'Blender',
    aliases: [
      'blender', 'electric blender', 'jug blender', 'stand blender',
    ],
    normalized_category: 'Kitchen Appliances',
    normalized_subcategory: 'Blender',
    category_family: 'Kitchen',
    comparison_group: 'kitchen',
    frontend_browse_group: 'kitchen-appliances',
    seo_category_slug: 'kitchen-appliances',
    seo_subcategory_slug: 'blenders',
    schema_type: 'Product',
    publish_allowed: true,
    spec_template: 'small_appliance',
    required_specs: ['Power'],
  },

  {
    id: 'chopper',
    display_name: 'Chopper',
    aliases: [
      'chopper', 'food chopper', 'electric chopper', 'mini chopper',
      'vegetable chopper',
    ],
    normalized_category: 'Kitchen Appliances',
    normalized_subcategory: 'Chopper',
    category_family: 'Kitchen',
    comparison_group: 'kitchen',
    frontend_browse_group: 'kitchen-appliances',
    seo_category_slug: 'kitchen-appliances',
    seo_subcategory_slug: 'choppers',
    schema_type: 'Product',
    publish_allowed: true,
    spec_template: 'small_appliance',
    required_specs: ['Power'],
  },

  {
    id: 'hand_blender',
    display_name: 'Hand Blender',
    aliases: [
      'hand blender', 'stick blender', 'immersion blender', 'handheld blender',
      'hand blender set',
    ],
    normalized_category: 'Kitchen Appliances',
    normalized_subcategory: 'Hand Blender',
    category_family: 'Kitchen',
    comparison_group: 'kitchen',
    frontend_browse_group: 'kitchen-appliances',
    seo_category_slug: 'kitchen-appliances',
    seo_subcategory_slug: 'hand-blenders',
    schema_type: 'Product',
    publish_allowed: true,
    spec_template: 'small_appliance',
    required_specs: ['Power'],
  },

  {
    id: 'hand_mixer',
    display_name: 'Hand Mixer',
    aliases: [
      'hand mixer', 'electric hand mixer', 'beater mixer', 'egg beater',
    ],
    normalized_category: 'Kitchen Appliances',
    normalized_subcategory: 'Hand Mixer',
    category_family: 'Kitchen',
    comparison_group: 'kitchen',
    frontend_browse_group: 'kitchen-appliances',
    seo_category_slug: 'kitchen-appliances',
    seo_subcategory_slug: 'hand-mixers',
    schema_type: 'Product',
    publish_allowed: true,
    spec_template: 'small_appliance',
    required_specs: ['Power'],
  },

  {
    id: 'food_processor',
    display_name: 'Food Processor / Kitchen Robot',
    aliases: [
      'food processor', 'kitchen robot', 'kitchen chef', 'food factory',
      'multi-function food processor', 'stand mixer food processor',
    ],
    normalized_category: 'Kitchen Appliances',
    normalized_subcategory: 'Food Processor',
    category_family: 'Kitchen',
    comparison_group: 'kitchen',
    frontend_browse_group: 'kitchen-appliances',
    seo_category_slug: 'kitchen-appliances',
    seo_subcategory_slug: 'food-processors',
    schema_type: 'Product',
    publish_allowed: true,
    spec_template: 'small_appliance',
    required_specs: ['Power'],
  },

  // Breakfast & Beverages
  {
    id: 'electric_kettle',
    display_name: 'Electric Kettle',
    aliases: [
      'electric kettle', 'kettle', 'cordless kettle', 'glass kettle',
      'westpoint kettle',
    ],
    normalized_category: 'Kitchen Appliances',
    normalized_subcategory: 'Electric Kettle',
    category_family: 'Kitchen',
    comparison_group: 'kitchen',
    frontend_browse_group: 'kitchen-appliances',
    seo_category_slug: 'kitchen-appliances',
    seo_subcategory_slug: 'electric-kettles',
    schema_type: 'Product',
    publish_allowed: true,
    spec_template: 'small_appliance',
    required_specs: ['Capacity', 'Power'],
  },

  {
    id: 'sandwich_maker',
    display_name: 'Sandwich Maker / Pop-Up Toaster',
    aliases: [
      'sandwich maker', 'sandwich toaster', 'sandwich grill', 'pop up toaster',
      'pop-up toaster', 'bread toaster', 'toaster',
      'westpoint sandwich maker', 'westpoint toaster',
    ],
    normalized_category: 'Kitchen Appliances',
    normalized_subcategory: 'Sandwich Maker',
    category_family: 'Kitchen',
    comparison_group: 'kitchen',
    frontend_browse_group: 'kitchen-appliances',
    seo_category_slug: 'kitchen-appliances',
    seo_subcategory_slug: 'sandwich-makers',
    schema_type: 'Product',
    publish_allowed: true,
    spec_template: 'small_appliance',
    required_specs: ['Power'],
  },

  {
    id: 'coffee_maker',
    display_name: 'Coffee Maker / Grinder',
    aliases: [
      'coffee maker', 'coffee machine', 'drip coffee maker', 'coffee grinder',
      'espresso machine', 'french press',
    ],
    normalized_category: 'Kitchen Appliances',
    normalized_subcategory: 'Coffee Maker',
    category_family: 'Kitchen',
    comparison_group: 'kitchen',
    frontend_browse_group: 'kitchen-appliances',
    seo_category_slug: 'kitchen-appliances',
    seo_subcategory_slug: 'coffee-makers',
    schema_type: 'Product',
    publish_allowed: true,
    spec_template: 'small_appliance',
    required_specs: ['Power'],
  },

  // Cooking appliances
  {
    id: 'rice_cooker',
    display_name: 'Rice Cooker',
    aliases: [
      'rice cooker', 'electric rice cooker', 'digital rice cooker',
      'rice cooker steamer',
    ],
    normalized_category: 'Kitchen Appliances',
    normalized_subcategory: 'Rice Cooker',
    category_family: 'Kitchen',
    comparison_group: 'kitchen',
    frontend_browse_group: 'kitchen-appliances',
    seo_category_slug: 'kitchen-appliances',
    seo_subcategory_slug: 'rice-cookers',
    schema_type: 'Product',
    publish_allowed: true,
    spec_template: 'small_appliance',
    required_specs: ['Capacity', 'Power'],
  },

  {
    id: 'roti_maker',
    display_name: 'Roti Maker',
    aliases: [
      'roti maker', 'chapati maker', 'electric roti maker', 'roti machine',
    ],
    normalized_category: 'Kitchen Appliances',
    normalized_subcategory: 'Roti Maker',
    category_family: 'Kitchen',
    comparison_group: 'kitchen',
    frontend_browse_group: 'kitchen-appliances',
    seo_category_slug: 'kitchen-appliances',
    seo_subcategory_slug: 'roti-makers',
    schema_type: 'Product',
    publish_allowed: true,
    spec_template: 'small_appliance',
    required_specs: ['Power'],
  },

  {
    id: 'induction_cooker',
    display_name: 'Induction Cooker / Hot Plate',
    aliases: [
      'induction cooker', 'induction hob', 'induction cooktop', 'hot plate',
      'electric hot plate', 'electric cooker',
    ],
    normalized_category: 'Kitchen Appliances',
    normalized_subcategory: 'Induction Cooker',
    category_family: 'Kitchen',
    comparison_group: 'kitchen',
    frontend_browse_group: 'kitchen-appliances',
    seo_category_slug: 'kitchen-appliances',
    seo_subcategory_slug: 'induction-cookers',
    schema_type: 'Product',
    publish_allowed: true,
    spec_template: 'small_appliance',
    required_specs: ['Power'],
  },

  // Built-in / structural kitchen
  {
    id: 'kitchen_hob',
    display_name: 'Hob / Gas Cooktop',
    aliases: [
      'hob', 'gas hob', 'gas cooktop', 'cooking hob', 'built-in hob',
      'gas stove built in',
    ],
    normalized_category: 'Kitchen Appliances',
    normalized_subcategory: 'Hob',
    category_family: 'Kitchen',
    comparison_group: 'kitchen',
    frontend_browse_group: 'kitchen-appliances',
    seo_category_slug: 'kitchen-appliances',
    seo_subcategory_slug: 'hobs',
    schema_type: 'Product',
    publish_allowed: true,
    spec_template: 'small_appliance',
    required_specs: ['Burners'],
  },

  {
    id: 'kitchen_hood',
    display_name: 'Kitchen Hood / Range Hood',
    aliases: [
      'hood', 'range hood', 'kitchen hood', 'chimney hood', 'exhaust hood',
      'cooker hood', 'ventilation hood',
    ],
    normalized_category: 'Kitchen Appliances',
    normalized_subcategory: 'Hood',
    category_family: 'Kitchen',
    comparison_group: 'kitchen',
    frontend_browse_group: 'kitchen-appliances',
    seo_category_slug: 'kitchen-appliances',
    seo_subcategory_slug: 'hoods',
    schema_type: 'Product',
    publish_allowed: true,
    spec_template: 'small_appliance',
    required_specs: ['Size'],
  },

  {
    id: 'dishwasher',
    display_name: 'Dishwasher',
    aliases: [
      'dishwasher', 'built-in dishwasher', 'freestanding dishwasher',
    ],
    normalized_category: 'Kitchen Appliances',
    normalized_subcategory: 'Dishwasher',
    category_family: 'Kitchen',
    comparison_group: 'kitchen',
    frontend_browse_group: 'kitchen-appliances',
    seo_category_slug: 'kitchen-appliances',
    seo_subcategory_slug: 'dishwashers',
    schema_type: 'Product',
    publish_allowed: true,
    spec_template: 'small_appliance',
    required_specs: ['Capacity'],
  },

  // Generic kitchen fallback
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

  // ──────────────────────────────────────────────────────────────────────────
  // WATER DISPENSERS
  // ──────────────────────────────────────────────────────────────────────────

  {
    id: 'bottom_load_dispenser',
    display_name: 'Bottom Load Water Dispenser',
    aliases: [
      'bottom load water dispenser', 'bottom-load water dispenser', 'bottom loading dispenser',
    ],
    normalized_category: 'Water Dispensers',
    normalized_subcategory: 'Bottom Load Water Dispenser',
    category_family: 'Kitchen',
    comparison_group: 'water_dispenser',
    frontend_browse_group: 'water-dispensers',
    seo_category_slug: 'water-dispensers',
    seo_subcategory_slug: 'bottom-load-water-dispensers',
    schema_type: 'Product',
    publish_allowed: true,
    spec_template: 'water_dispenser',
    required_specs: ['Type'],
  },

  {
    id: 'cabinet_dispenser',
    display_name: 'Cabinet Water Dispenser',
    aliases: [
      'cabinet water dispenser', 'water dispenser with cabinet', 'dispenser with refrigerator',
      'water cooler cabinet',
    ],
    normalized_category: 'Water Dispensers',
    normalized_subcategory: 'Cabinet Water Dispenser',
    category_family: 'Kitchen',
    comparison_group: 'water_dispenser',
    frontend_browse_group: 'water-dispensers',
    seo_category_slug: 'water-dispensers',
    seo_subcategory_slug: 'cabinet-water-dispensers',
    schema_type: 'Product',
    publish_allowed: true,
    spec_template: 'water_dispenser',
    required_specs: ['Type'],
  },

  // Electric Water Cooler — NG brand uses this raw category string
  {
    id: 'electric_water_cooler',
    display_name: 'Electric Water Cooler',
    aliases: [
      'electric water cooler', 'water cooler', 'ng water cooler',
      'nasgas water cooler', 'drinking water cooler', 'room cooler dispenser',
    ],
    normalized_category: 'Water Dispensers',
    normalized_subcategory: 'Water Cooler',
    category_family: 'Kitchen',
    comparison_group: 'water_dispenser',
    frontend_browse_group: 'water-dispensers',
    seo_category_slug: 'water-dispensers',
    seo_subcategory_slug: 'water-coolers',
    schema_type: 'Product',
    publish_allowed: true,
    spec_template: 'water_dispenser',
    required_specs: ['Capacity', 'Type'],
  },

  // Generic water dispenser catch-all
  {
    id: 'water_dispenser',
    display_name: 'Water Dispenser',
    aliases: [
      'water dispenser', 'water cooler dispenser', 'hot and cold dispenser',
      'top load water dispenser', 'top-load water dispenser',
      'dawlance water dispenser', 'haier water dispenser',
    ],
    normalized_category: 'Water Dispensers',
    normalized_subcategory: 'Top Load Water Dispenser',
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

  // AC Accessory / Wi-Fi module — EcoStar ES-WI-FI and similar accessories
  {
    id: 'ac_accessory',
    display_name: 'AC Accessory / Wi-Fi Module',
    aliases: [
      'ac accessory', 'ac accessories', 'wi-fi module', 'wifi module',
      'ac wifi module', 'smart ac adapter', 'ecostar wi-fi',
    ],
    normalized_category: 'Small Appliances',
    normalized_subcategory: 'AC Accessory',
    category_family: 'Small Appliances',
    comparison_group: 'small_appliance',
    frontend_browse_group: 'small-appliances',
    seo_category_slug: 'small-appliances',
    seo_subcategory_slug: 'ac-accessories',
    schema_type: 'Product',
    publish_allowed: true,
    spec_template: 'small_appliance',
    required_specs: [],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // SOLAR
  // CRITICAL: keep all solar subcategories strictly separate
  // Pump inverters ≠ hybrid inverters ≠ batteries ≠ panels
  // Tubular ≠ Lithium ≠ Deep Cycle
  // ──────────────────────────────────────────────────────────────────────────

  // Solar Pump Inverter / VFD — must be separate from household inverters
  {
    id: 'solar_pump_inverter',
    display_name: 'Solar Pump Inverter / VFD',
    aliases: [
      'solar pump inverter', 'pump inverter', 'solar water pump inverter',
      'vfd inverter', 'vfd', 'variable frequency drive', 'solar vfd',
      'crown pridor', 'pridor vfd', 'solar pump drive',
    ],
    normalized_category: 'Solar',
    normalized_subcategory: 'Solar Pump Inverter',
    category_family: 'Solar',
    comparison_group: 'solar_pump_inverter',
    frontend_browse_group: 'solar',
    seo_category_slug: 'solar',
    seo_subcategory_slug: 'solar-pump-inverters',
    schema_type: 'Product',
    publish_allowed: true,
    spec_template: 'solar_inverter',
    required_specs: ['Rated Power', 'Input Voltage (DC)'],
  },

  // Hybrid Solar Inverters
  {
    id: 'solar_hybrid_inverter',
    display_name: 'Hybrid Solar Inverter',
    aliases: [
      'hybrid inverter', 'hybrid solar inverter', 'solar hybrid inverter',
      'pv hybrid', 'hybrid pv inverter',
      // Crown / Nexus
      'crown yorker', 'yorker inverter', 'nexus inverter', 'nexus ip66',
      // Ziewnic
      'ziewnic hybrid', 'ziewnic inverter', 'ziewnic pv', 'ziewnic solar',
    ],
    normalized_category: 'Solar',
    normalized_subcategory: 'Solar Inverter',
    category_family: 'Solar',
    comparison_group: 'solar_inverter',
    frontend_browse_group: 'solar',
    seo_category_slug: 'solar',
    seo_subcategory_slug: 'solar-inverters',
    schema_type: 'Product',
    publish_allowed: true,
    spec_template: 'solar_inverter',
    required_specs: ['Rated Power', 'Input Voltage (DC)', 'Output Voltage (AC)'],
  },

  // Grid-Tie / On-Grid Solar Inverters
  {
    id: 'solar_converter',
    display_name: 'Grid-Tie / On-Grid Solar Inverter',
    aliases: [
      'solar converter', 'grid-tie inverter', 'on-grid inverter', 'on grid inverter',
      'string inverter', 'grid inverter', 'grid tied inverter', 'grid-tied inverter',
      'pv inverter', 'pv solar inverter',
    ],
    normalized_category: 'Solar',
    normalized_subcategory: 'Solar Inverter',
    category_family: 'Solar',
    comparison_group: 'solar_inverter',
    frontend_browse_group: 'solar',
    seo_category_slug: 'solar',
    seo_subcategory_slug: 'solar-inverters',
    schema_type: 'Product',
    publish_allowed: true,
    spec_template: 'solar_inverter',
    required_specs: ['Rated Power', 'Input Voltage (DC)', 'Output Voltage (AC)'],
  },

  // Off-Grid Solar Inverters
  {
    id: 'solar_offgrid_inverter',
    display_name: 'Off-Grid Solar Inverter',
    aliases: [
      'off-grid inverter', 'off grid inverter', 'offgrid inverter',
      'standalone inverter', 'backup inverter',
    ],
    normalized_category: 'Solar',
    normalized_subcategory: 'Solar Inverter',
    category_family: 'Solar',
    comparison_group: 'solar_inverter',
    frontend_browse_group: 'solar',
    seo_category_slug: 'solar',
    seo_subcategory_slug: 'solar-inverters',
    schema_type: 'Product',
    publish_allowed: true,
    spec_template: 'solar_inverter',
    required_specs: ['Rated Power'],
  },

  // Tubular Batteries — must NOT be confused with lithium or deep-cycle
  {
    id: 'tubular_battery',
    display_name: 'Tubular Battery',
    aliases: [
      'tubular battery', 'tubular cell', 'tubular lead acid', 'tall tubular battery',
      'agm tubular', 'solar tubular battery',
    ],
    normalized_category: 'Solar',
    normalized_subcategory: 'Tubular Battery',
    category_family: 'Solar',
    comparison_group: 'tubular_battery',
    frontend_browse_group: 'solar',
    seo_category_slug: 'solar',
    seo_subcategory_slug: 'tubular-batteries',
    schema_type: 'Product',
    publish_allowed: true,
    spec_template: 'battery',
    required_specs: ['Capacity (AH)', 'Voltage'],
  },

  // Deep Cycle Batteries — distinct from tubular and lithium
  {
    id: 'deep_cycle_battery',
    display_name: 'Deep Cycle Battery',
    aliases: [
      'deep cycle battery', 'deep-cycle battery', 'vrla battery', 'gel battery',
      'agm battery', 'sealed lead acid battery', 'ups battery', 'acid battery',
      'inverter battery', 'power solution',
    ],
    normalized_category: 'Solar',
    normalized_subcategory: 'Deep Cycle Battery',
    category_family: 'Solar',
    comparison_group: 'deep_cycle_battery',
    frontend_browse_group: 'solar',
    seo_category_slug: 'solar',
    seo_subcategory_slug: 'deep-cycle-batteries',
    schema_type: 'Product',
    publish_allowed: true,
    spec_template: 'battery',
    required_specs: ['Capacity (AH)', 'Technology'],
  },

  // Lithium / LiFePO4 Solar Batteries
  {
    id: 'solar_battery',
    display_name: 'Lithium Solar Battery',
    aliases: [
      'solar battery', 'lithium battery', 'lifepo4 battery', 'storage battery',
      'energy storage', 'li-ion battery', 'lithium ion battery',
      // Elektra / Ziewnic
      'elektra boost', 'boost battery', 'lithium wall battery',
      'ziewnic battery', 'ziewnic lithium', 'ziewnic li-wall',
    ],
    normalized_category: 'Solar',
    normalized_subcategory: 'Lithium Battery',
    category_family: 'Solar',
    comparison_group: 'solar_battery',
    frontend_browse_group: 'solar',
    seo_category_slug: 'solar',
    seo_subcategory_slug: 'solar-batteries',
    schema_type: 'Product',
    publish_allowed: true,
    spec_template: 'battery',
    required_specs: ['Capacity (kWh)', 'Technology'],
  },

  // Solar Panels
  {
    id: 'solar_panel',
    display_name: 'Solar Panel',
    aliases: [
      'solar panel', 'pv panel', 'photovoltaic panel', 'solar plate', 'mono perc panel',
      'monocrystalline panel', 'polycrystalline panel', 'half-cut panel',
    ],
    normalized_category: 'Solar',
    normalized_subcategory: 'Solar Panel',
    category_family: 'Solar',
    comparison_group: 'solar_panel',
    frontend_browse_group: 'solar',
    seo_category_slug: 'solar',
    seo_subcategory_slug: 'solar-panels',
    schema_type: 'Product',
    publish_allowed: true,
    spec_template: 'solar_panel',
    required_specs: ['Wattage', 'Efficiency'],
  },

  // Complete Solar Systems
  {
    id: 'solar_system',
    display_name: 'Complete Solar System',
    aliases: [
      'solar system', 'solar solution', 'solar kit', 'solar package',
      'complete solar system', 'solar bundle',
    ],
    normalized_category: 'Solar',
    normalized_subcategory: 'Solar System',
    category_family: 'Solar',
    comparison_group: 'solar_system',
    frontend_browse_group: 'solar',
    seo_category_slug: 'solar',
    seo_subcategory_slug: 'solar-systems',
    schema_type: 'Product',
    publish_allowed: true,
    spec_template: 'solar_system',
    required_specs: ['System Capacity'],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // SMALL APPLIANCES
  // Specific subcategories first; generic catch-all last
  // Personal care, garment care, home comfort, utility, baby care
  // Do NOT put kitchen-prep items here — those belong in Kitchen Appliances
  // ──────────────────────────────────────────────────────────────────────────

  {
    id: 'vacuum_cleaner',
    display_name: 'Vacuum Cleaner',
    aliases: [
      'vacuum cleaner', 'vacuum', 'hoover', 'upright vacuum', 'canister vacuum',
      'cordless vacuum', 'robot vacuum',
    ],
    normalized_category: 'Small Appliances',
    normalized_subcategory: 'Cleaning Appliances',
    category_family: 'Small Appliances',
    comparison_group: 'small_appliance',
    frontend_browse_group: 'small-appliances',
    seo_category_slug: 'small-appliances',
    seo_subcategory_slug: 'vacuum-cleaners',
    schema_type: 'Product',
    publish_allowed: true,
    spec_template: 'small_appliance',
    required_specs: ['Power'],
  },

  {
    id: 'iron',
    display_name: 'Iron / Garment Care',
    aliases: [
      'iron', 'steam iron', 'dry iron', 'electric iron', 'garment steamer',
      'garment care', 'clothes iron', 'press iron',
    ],
    normalized_category: 'Small Appliances',
    normalized_subcategory: 'Irons & Garment Care',
    category_family: 'Small Appliances',
    comparison_group: 'small_appliance',
    frontend_browse_group: 'small-appliances',
    seo_category_slug: 'small-appliances',
    seo_subcategory_slug: 'irons-garment-care',
    schema_type: 'Product',
    publish_allowed: true,
    spec_template: 'small_appliance',
    required_specs: ['Power'],
  },

  {
    id: 'heater',
    display_name: 'Heater',
    aliases: [
      'heater', 'room heater', 'electric heater', 'fan heater', 'oil heater',
      'infrared heater', 'halogen heater', 'quartz heater',
    ],
    normalized_category: 'Small Appliances',
    normalized_subcategory: 'Heaters',
    category_family: 'Small Appliances',
    comparison_group: 'small_appliance',
    frontend_browse_group: 'small-appliances',
    seo_category_slug: 'small-appliances',
    seo_subcategory_slug: 'heaters',
    schema_type: 'Product',
    publish_allowed: true,
    spec_template: 'small_appliance',
    required_specs: ['Power'],
  },

  {
    id: 'insect_killer',
    display_name: 'Insect Killer',
    aliases: [
      'insect killer', 'bug zapper', 'mosquito killer', 'fly killer',
      'electric insect killer', 'uv insect trap',
    ],
    normalized_category: 'Small Appliances',
    normalized_subcategory: 'Insect Killers',
    category_family: 'Small Appliances',
    comparison_group: 'small_appliance',
    frontend_browse_group: 'small-appliances',
    seo_category_slug: 'small-appliances',
    seo_subcategory_slug: 'insect-killers',
    schema_type: 'Product',
    publish_allowed: true,
    spec_template: 'small_appliance',
    required_specs: ['Power'],
  },

  {
    id: 'personal_care',
    display_name: 'Personal Care',
    aliases: [
      'personal care', 'hair dryer', 'hair straightener', 'hair care',
      'trimmer', 'epilator', 'shaver', 'beard trimmer', 'hair removal',
      'hair curler', 'hair tongs',
    ],
    normalized_category: 'Small Appliances',
    normalized_subcategory: 'Personal Care',
    category_family: 'Small Appliances',
    comparison_group: 'small_appliance',
    frontend_browse_group: 'small-appliances',
    seo_category_slug: 'small-appliances',
    seo_subcategory_slug: 'personal-care',
    schema_type: 'Product',
    publish_allowed: true,
    spec_template: 'small_appliance',
    required_specs: [],
  },

  {
    id: 'weight_scale',
    display_name: 'Weight Scale',
    aliases: [
      'weight scale', 'weighing scale', 'digital scale', 'bathroom scale',
      'body weight scale', 'kitchen scale',
    ],
    normalized_category: 'Small Appliances',
    normalized_subcategory: 'Weight Scales',
    category_family: 'Small Appliances',
    comparison_group: 'small_appliance',
    frontend_browse_group: 'small-appliances',
    seo_category_slug: 'small-appliances',
    seo_subcategory_slug: 'weight-scales',
    schema_type: 'Product',
    publish_allowed: true,
    spec_template: 'small_appliance',
    required_specs: [],
  },

  {
    id: 'air_treatment',
    display_name: 'Air Treatment / Humidifier',
    aliases: [
      'humidifier', 'air purifier', 'air treatment', 'air quality',
      'dehumidifier', 'air sterilizer', 'room purifier',
    ],
    normalized_category: 'Small Appliances',
    normalized_subcategory: 'Air Treatment',
    category_family: 'Small Appliances',
    comparison_group: 'small_appliance',
    frontend_browse_group: 'small-appliances',
    seo_category_slug: 'small-appliances',
    seo_subcategory_slug: 'air-treatment',
    schema_type: 'Product',
    publish_allowed: true,
    spec_template: 'small_appliance',
    required_specs: [],
  },

  {
    id: 'baby_care',
    display_name: 'Baby Care Appliance',
    aliases: [
      'baby care', 'bottle warmer', 'sterilizer', 'baby sterilizer',
      'baby food maker', 'baby monitor',
    ],
    normalized_category: 'Small Appliances',
    normalized_subcategory: 'Baby Care Appliances',
    category_family: 'Small Appliances',
    comparison_group: 'small_appliance',
    frontend_browse_group: 'small-appliances',
    seo_category_slug: 'small-appliances',
    seo_subcategory_slug: 'baby-care',
    schema_type: 'Product',
    publish_allowed: true,
    spec_template: 'small_appliance',
    required_specs: [],
  },

  {
    id: 'beauty_appliance',
    display_name: 'Beauty Appliance',
    aliases: [
      'face steamer', 'facial steamer', 'foot massager', 'face massager',
      'beauty device', 'skin care device',
    ],
    normalized_category: 'Small Appliances',
    normalized_subcategory: 'Beauty Appliances',
    category_family: 'Small Appliances',
    comparison_group: 'small_appliance',
    frontend_browse_group: 'small-appliances',
    seo_category_slug: 'small-appliances',
    seo_subcategory_slug: 'beauty-appliances',
    schema_type: 'Product',
    publish_allowed: true,
    spec_template: 'small_appliance',
    required_specs: [],
  },

  // Generic small appliance catch-all
  {
    id: 'small_appliance',
    display_name: 'Small Appliance',
    aliases: [
      'small appliance', 'small appliances', 'home & heating',
      'utility appliance', 'home appliance',
    ],
    normalized_category: 'Small Appliances',
    normalized_subcategory: 'Utility Appliances',
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

  // ──────────────────────────────────────────────────────────────────────────
  // FANS (standalone — not inside Small Appliances)
  // ──────────────────────────────────────────────────────────────────────────

  {
    id: 'fan',
    display_name: 'Fan',
    aliases: [
      'ceiling fan', 'pedestal fan', 'stand fan', 'table fan', 'wall fan',
      'bracket fan', 'tower fan',
    ],
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
