/**
 * services.ts — Tajalli's structured service catalog
 *
 * Business rules:
 *  - Brand-provided free installations are NOT charged by Tajalli's
 *  - Tajalli-performed installations are charged at Tajalli's rates
 *  - Equipment / materials used in Tajalli installations are charged separately
 *  - Only products/packages above PKR 1,000,000 require site consultation
 *  - All installment sales require advance before verification
 *  - Delivery: 48 hours after advance payment and successful verification
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type ServiceCategory =
  | 'installation'
  | 'maintenance'
  | 'repair'
  | 'consultation'
  | 'delivery'
  | 'gas_refill'
  | 'warranty_support';

export type InstallationProvider =
  | 'brand_free'      // Manufacturer / brand provides free installation — Tajalli does not charge
  | 'tajalli_charged' // Tajalli performs installation — customer is charged Tajalli rates
  | 'third_party';    // Customer arranges own installation

export interface ServiceEntry {
  id:               string;
  name:             string;
  description:      string;
  category:         ServiceCategory;
  appliesTo:        string[];         // normalized_category values this service covers
  price:            ServicePrice;
  installationProvider?: InstallationProvider;
  consultationRequired:  boolean;
  notes:            string;
}

export interface ServicePrice {
  /** How this service is priced */
  type:          'fixed' | 'range' | 'per_unit' | 'free' | 'on_request';
  /** Fixed PKR amount (for type='fixed' or 'free') */
  amount?:       number;
  /** Lower bound PKR (for type='range') */
  min?:          number;
  /** Upper bound PKR (for type='range') */
  max?:          number;
  /** Unit label for per_unit pricing (e.g. 'per AC', 'per meter') */
  unit?:         string;
  /** Human-readable display string */
  display:       string;
}

// ── Service catalog ───────────────────────────────────────────────────────────

export const SERVICES_CATALOG: ServiceEntry[] = [

  // ── Air Conditioners ────────────────────────────────────────────────────────

  {
    id: 'ac-install-tajalli',
    name: 'AC Installation (Tajalli)',
    description: 'Professional split AC installation by Tajalli\'s certified technicians. Includes wall brackets, pipe routing, and electrical connection. Copper pipe and any additional materials are charged separately.',
    category: 'installation',
    appliesTo: ['Air Conditioners'],
    price: { type: 'fixed', amount: 4500, display: 'PKR 4,500 per unit' },
    installationProvider: 'tajalli_charged',
    consultationRequired: false,
    notes: 'Copper pipe (per foot), conduit, and mounting hardware charged separately at cost.',
  },
  {
    id: 'ac-install-brand-free',
    name: 'AC Installation (Brand-Provided)',
    description: 'Some brand partners (Gree, Haier) offer free installation at the time of purchase. This installation is performed by the brand\'s authorized team — Tajalli does not charge for it.',
    category: 'installation',
    appliesTo: ['Air Conditioners'],
    price: { type: 'free', display: 'Free (brand-provided)' },
    installationProvider: 'brand_free',
    consultationRequired: false,
    notes: 'Confirm at time of purchase whether the specific model qualifies for free brand installation.',
  },
  {
    id: 'ac-maintenance',
    name: 'AC Service & Deep Cleaning',
    description: 'Full service: coil cleaning, filter wash, refrigerant top-up check, drain unclog, thermostat check. Includes a service report.',
    category: 'maintenance',
    appliesTo: ['Air Conditioners'],
    price: { type: 'fixed', amount: 2500, display: 'PKR 2,500 per unit' },
    installationProvider: 'tajalli_charged',
    consultationRequired: false,
    notes: 'Gas refill (if needed) is charged separately — see gas-refill service.',
  },
  {
    id: 'ac-gas-refill',
    name: 'AC Gas Refill (R-32 / R-410A)',
    description: 'Gas recharge for split ACs. Price varies by gas type and quantity required.',
    category: 'gas_refill',
    appliesTo: ['Air Conditioners'],
    price: { type: 'range', min: 3000, max: 8000, display: 'PKR 3,000 – 8,000 (depends on gas type and quantity)' },
    installationProvider: 'tajalli_charged',
    consultationRequired: false,
    notes: 'R-32 costs less than R-410A. Older R-22 systems are not supported.',
  },

  // ── Refrigerators & Freezers ─────────────────────────────────────────────────

  {
    id: 'fridge-delivery-placement',
    name: 'Refrigerator / Freezer Delivery & Placement',
    description: 'White-glove delivery: bring appliance to floor, remove packaging, place in position, and test.',
    category: 'delivery',
    appliesTo: ['Refrigerators', 'Deep Freezers'],
    price: { type: 'fixed', amount: 1500, display: 'PKR 1,500' },
    installationProvider: 'tajalli_charged',
    consultationRequired: false,
    notes: 'Included in standard delivery within Karachi. Contact us for outstation delivery pricing.',
  },
  {
    id: 'fridge-maintenance',
    name: 'Refrigerator / Freezer Maintenance',
    description: 'Cooling check, condenser coil clean, door seal inspection, thermostat calibration.',
    category: 'maintenance',
    appliesTo: ['Refrigerators', 'Deep Freezers'],
    price: { type: 'fixed', amount: 2000, display: 'PKR 2,000 per unit' },
    installationProvider: 'tajalli_charged',
    consultationRequired: false,
    notes: 'Gas refill if required is priced separately.',
  },

  // ── Washing Machines ─────────────────────────────────────────────────────────

  {
    id: 'washing-machine-install',
    name: 'Washing Machine Installation',
    description: 'Installation with inlet hose connection, drain routing, and leveling. Customer must have water inlet/drain points ready.',
    category: 'installation',
    appliesTo: ['Washing Machines'],
    price: { type: 'fixed', amount: 1500, display: 'PKR 1,500' },
    installationProvider: 'tajalli_charged',
    consultationRequired: false,
    notes: 'Plumbing extension work is extra — consult for quote.',
  },

  // ── Solar Systems ────────────────────────────────────────────────────────────

  {
    id: 'solar-full-install',
    name: 'Solar System Installation (Tajalli)',
    description: 'Complete solar installation: inverter mounting, battery racking, panel frame & panel mounting, DC/AC wiring, breaker panel work, testing & commissioning. All labor is included in Tajalli\'s solar package price.',
    category: 'installation',
    appliesTo: ['Solar Systems', 'Solar Inverters', 'Solar Panels'],
    price: { type: 'free', display: 'Included in solar package price' },
    installationProvider: 'tajalli_charged',
    consultationRequired: false,
    notes: 'Installation labor is bundled into all-inclusive solar package prices. Elevated frame is a separate optional add-on.',
  },
  {
    id: 'solar-standalone-install',
    name: 'Solar Installation (Components Only)',
    description: 'If customer has purchased individual solar components from us, Tajalli can install them. Price depends on system size.',
    category: 'installation',
    appliesTo: ['Solar Systems', 'Solar Inverters'],
    price: { type: 'range', min: 15000, max: 45000, display: 'PKR 15,000 – 45,000 (depends on system size)' },
    installationProvider: 'tajalli_charged',
    consultationRequired: true,
    notes: 'Site consultation required before quoting. Materials (conduit, cable, breakers) charged separately.',
  },
  {
    id: 'solar-maintenance',
    name: 'Solar System Annual Maintenance',
    description: 'Panel cleaning, connection torque-check, inverter firmware review, battery health check, performance report.',
    category: 'maintenance',
    appliesTo: ['Solar Systems', 'Solar Inverters', 'Solar Panels'],
    price: { type: 'fixed', amount: 5000, display: 'PKR 5,000 per visit' },
    installationProvider: 'tajalli_charged',
    consultationRequired: false,
    notes: 'Recommended annually. Does not include part replacement.',
  },
  {
    id: 'solar-consultation',
    name: 'Solar Site Consultation',
    description: 'Engineer visit to assess roof/site, shadow analysis, load measurement, system sizing recommendation, and written proposal.',
    category: 'consultation',
    appliesTo: ['Solar Systems'],
    price: { type: 'fixed', amount: 0, display: 'Free (included with solar package purchase)' },
    installationProvider: 'tajalli_charged',
    consultationRequired: false,
    notes: 'Free for customers purchasing a Tajalli solar package. For standalone consultation without purchase commitment, contact us.',
  },

  // ── General / Cross-Category ─────────────────────────────────────────────────

  {
    id: 'warranty-support',
    name: 'Warranty Support & Claim Assistance',
    description: 'Tajalli assists in lodging manufacturer warranty claims, arranging pick-up/drop, and liaising with brand service centers.',
    category: 'warranty_support',
    appliesTo: ['Air Conditioners', 'Refrigerators', 'Deep Freezers', 'Washing Machines', 'Televisions', 'Solar Systems'],
    price: { type: 'free', display: 'Free for products purchased from Tajalli' },
    installationProvider: undefined,
    consultationRequired: false,
    notes: 'Valid for products within their warranty period and purchased from Tajalli.',
  },
  {
    id: 'large-item-delivery',
    name: 'Large Appliance Delivery (Karachi)',
    description: 'Door-to-room delivery for large appliances (ACs, refrigerators, washing machines, solar systems). Includes unboxing and basic placement.',
    category: 'delivery',
    appliesTo: ['Air Conditioners', 'Refrigerators', 'Deep Freezers', 'Washing Machines', 'Solar Systems'],
    price: { type: 'free', display: 'Free within Karachi (standard delivery zones)' },
    installationProvider: 'tajalli_charged',
    consultationRequired: false,
    notes: 'Free within standard Karachi delivery zones. Outstation delivery priced on request.',
  },
];

// ── Lookup helpers ─────────────────────────────────────────────────────────────

/** Get all services that apply to a given normalized category */
export function getServicesFor(normalizedCategory: string): ServiceEntry[] {
  return SERVICES_CATALOG.filter(s =>
    s.appliesTo.some(cat =>
      cat.toLowerCase() === normalizedCategory.toLowerCase() ||
      normalizedCategory.toLowerCase().includes(cat.toLowerCase())
    )
  );
}

/** Get all services by category type */
export function getServicesByType(category: ServiceCategory): ServiceEntry[] {
  return SERVICES_CATALOG.filter(s => s.category === category);
}

/** Get services that require a consultation (for checkout consultation gate) */
export function getConsultationRequiredServices(): ServiceEntry[] {
  return SERVICES_CATALOG.filter(s => s.consultationRequired);
}

// ── Pricing governance helpers ────────────────────────────────────────────────

/**
 * Returns true if a product/package at this price requires a site consultation
 * before the sale can proceed.
 * Rule: only products/packages above PKR 1,000,000 require site consultation.
 */
export function requiresSiteConsultation(totalPrice: number): boolean {
  return totalPrice > 1_000_000;
}

/**
 * SERVICE APPLICABILITY MATRIX
 *
 * GOVERNANCE RULE (permanent, enforced 2026-04-03):
 *   - Do NOT show installation messaging for products that do not require installation.
 *   - Refrigerators and deep freezers are delivered and placed — not installed.
 *   - Televisions are placed/wall-mounted, not installed in the electrical sense.
 *   - ACs, washing machines, solar systems DO require installation.
 *   - Small appliances (kettles, blenders, trimmers, etc.) require no installation.
 *   - Do NOT apply a one-size-fits-all installation message across all categories.
 *
 * Usage: call requiresInstallation(normalized_category) before showing install CTAs.
 */
const _INSTALLATION_REQUIRED_CATEGORIES = new Set([
  'air conditioners',
  'washing machines',
  'solar systems',
  'solar inverters',
  'solar panels',
]);

/**
 * Returns true only for product categories that require professional installation.
 * Refrigerators, TVs, small appliances, and similar products return false.
 */
export function requiresInstallation(normalizedCategory: string): boolean {
  return _INSTALLATION_REQUIRED_CATEGORIES.has(normalizedCategory.toLowerCase());
}

/**
 * CROSS-SELL PRODUCT RECOMMENDATIONS BY CATEGORY
 *
 * GOVERNANCE RULE (permanent, enforced 2026-04-03):
 *   - Refrigerators do NOT require installation. Show stand as a cross-sell product instead.
 *   - The refrigerator stand (PKR 3,000) is a stocked product — NOT a service.
 *   - This table drives "often bought with" / "recommended add-on" UI blocks on PDPs.
 *   - Cross-sells must be contextually relevant: do not show random products.
 *   - Each entry is a product slug to look up from the catalog — not a service entry.
 *
 * Key: normalized_category (lowercase). Value: array of product slugs to surface as add-ons.
 */
export const CROSS_SELL_SLUGS: Record<string, string[]> = {
  'refrigerators': ['refrigerator-stand'], // PKR 3,000 — stocked product, not a service
};

/**
 * Returns the delivery window policy description.
 * Rule: delivery is 48 hours after advance payment AND verification succeeds.
 */
export const DELIVERY_POLICY = {
  windowHours: 48,
  condition:   'after advance payment and successful verification',
  display:     '48 hours after advance payment & verification',
} as const;

/**
 * Returns the installment advance requirement.
 * Rule: all installment sales require advance payment before verification.
 */
export const INSTALLMENT_POLICY = {
  advanceRequired:       true,
  advanceRequiredBefore: 'verification',
  display:               'Advance payment required before verification and delivery',
} as const;
