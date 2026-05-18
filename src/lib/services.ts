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
  | 'warranty_support'
  | 'package';

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
  /** Short "best for" summary shown on package cards */
  bestFor?:         string;
  /** Bullet-point list of what's included in this package */
  packageIncludes?: string[];
  /** Terms / conditions shown on the package card */
  packageTerms?:    string;
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
  /** Unit label for per_unit pricing (e.g. 'per AC', 'per watt') */
  unit?:         string;
  /** Human-readable display string */
  display:       string;
  /** Tiered pricing rows — e.g. [{ label: '1 Ton', amount: 13000 }, ...] */
  tiers?:        Array<{ label: string; amount: number }>;
  /** Sub-options with separate prices on the same card */
  options?:      Array<{ label: string; amount: number }>;
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

  // ── Televisions ──────────────────────────────────────────────────────────────

  {
    id: 'tv-wall-mount',
    name: 'TV Wall Mounting',
    description: 'Professional TV wall mount installation. Includes bracket selection guidance, stud/masonry drilling, cable management, and level alignment.',
    category: 'installation',
    appliesTo: ['Televisions'],
    price: { type: 'range', min: 2000, max: 4000, display: 'PKR 2,000 – 4,000 (bracket not included)' },
    installationProvider: 'tajalli_charged',
    consultationRequired: false,
    notes: 'Wall mounting bracket sold separately. Price varies by wall type and TV size.',
  },

  // ── Microwave / Kitchen Appliances ───────────────────────────────────────────

  {
    id: 'microwave-repair',
    name: 'Microwave Oven Repair',
    description: 'Diagnostics and repair for all microwave types — magnetron, turntable motor, control board, and door switch issues.',
    category: 'repair',
    appliesTo: ['Microwaves', 'Kitchen Appliances'],
    price: { type: 'range', min: 2000, max: 6000, display: 'PKR 2,000 – 6,000 (labour only; parts extra)' },
    installationProvider: 'tajalli_charged',
    consultationRequired: false,
    notes: 'Parts charged separately at cost. Major component failures (magnetron) quoted before work starts.',
  },

  // ── Water Heaters / Geysers ───────────────────────────────────────────────────

  {
    id: 'geyser-install',
    name: 'Water Heater (Geyser) Installation',
    description: 'Electric or gas geyser installation including wall mounting, water connection, and safety pressure valve fitment.',
    category: 'installation',
    appliesTo: ['Water Heaters'],
    price: { type: 'range', min: 2500, max: 5000, display: 'PKR 2,500 – 5,000' },
    installationProvider: 'tajalli_charged',
    consultationRequired: false,
    notes: 'Plumbing extension work priced separately. Gas connection requires certified gas technician.',
  },

  // ── Annual Maintenance Contracts (AMC) ───────────────────────────────────────

  {
    id: 'amc-home',
    name: 'Annual Maintenance Contract — Home',
    description: 'Comprehensive AMC covering all appliances in your home. 2 preventive maintenance visits per appliance per year, priority breakdown response, 20% discount on parts, and a dedicated technician who knows your setup.',
    category: 'maintenance',
    appliesTo: ['Air Conditioners', 'Refrigerators', 'Washing Machines', 'Solar Systems'],
    price: { type: 'range', min: 15000, max: 45000, display: 'PKR 15,000 – 45,000 / year (based on appliance count)' },
    installationProvider: 'tajalli_charged',
    consultationRequired: true,
    notes: 'Quote provided after home visit. Covers up to 5 appliances in base plan. Additional appliances added per unit.',
  },

  // ── Diagnosis / Technician Visit ─────────────────────────────────────────────
  //
  // Repair services (AC, fridge, freezer, dispenser, washing machine, generator,
  // solar inverter, UPS, microwave, LED TV) require on-site diagnosis FIRST.
  // The repair quote is communicated AFTER the technician assesses the unit.
  // If the customer declines the repair after diagnosis, the visit fee applies.

  {
    id: 'repair-visit-standard',
    name: 'Technician Visit / Diagnosis (Standard)',
    description: 'For all repair categories (AC, refrigerator, freezer, dispenser, washing machine, generator, solar inverter, UPS, microwave, LED TV): the technician visits, diagnoses the fault, and provides a repair quote. The actual repair price is only communicated after diagnosis. If the customer declines the repair after diagnosis, this visit charge is retained. Visit charges are collected at the start of the visit.',
    category: 'repair',
    appliesTo: ['Air Conditioners', 'Refrigerators', 'Deep Freezers', 'Water Dispensers', 'Washing Machines', 'Solar Inverters', 'Microwaves', 'Televisions'],
    price: { type: 'fixed', amount: 2000, display: 'PKR 2,000 (collected at visit; retained if customer declines repair)' },
    installationProvider: 'tajalli_charged',
    consultationRequired: false,
    notes: 'Standard visit: within 48 hours. Visit fee is separate from repair labour — if repair proceeds, visit fee may be deducted from total at technician\'s discretion.',
  },
  {
    id: 'repair-visit-urgent',
    name: 'Urgent Same-Day Visit / Diagnosis',
    description: 'Same-day technician visit for urgent repairs. Applies all repair categories. Same diagnosis-first policy — repair price communicated after assessment.',
    category: 'repair',
    appliesTo: ['Air Conditioners', 'Refrigerators', 'Deep Freezers', 'Water Dispensers', 'Washing Machines', 'Solar Inverters', 'Microwaves', 'Televisions'],
    price: { type: 'fixed', amount: 3000, display: 'PKR 3,000 (same-day; collected in advance or at start of visit)' },
    installationProvider: 'tajalli_charged',
    consultationRequired: false,
    notes: 'Urgent visits are subject to technician availability. Request via WhatsApp by 12pm for same-day confirmation.',
  },

  // ── AC Preventive Care ───────────────────────────────────────────────────────

  {
    id: 'ac-basic-care',
    name: 'AC Basic Care Package',
    description: 'Routine preventive maintenance before peak summer. Cleaning, checkup, and condition assessment per AC unit.',
    category: 'maintenance',
    appliesTo: ['Air Conditioners'],
    price: { type: 'fixed', amount: 2500, display: 'PKR 2,500 per AC' },
    installationProvider: 'tajalli_charged',
    consultationRequired: false,
    notes: 'Gas refill, leakage repair, card/coil work and parts are not included. Further repair is quoted separately.',
    bestFor: 'Routine preventive maintenance before peak summer.',
    packageIncludes: ['AC cleaning & checkup', 'Filter cleaning', 'Indoor unit basic cleaning', 'Outdoor unit visual check', 'Cooling performance check', 'Gas pressure check', 'Drainage check', 'Basic wiring & remote check', 'Service recommendation if repair is required'],
    packageTerms: 'Cleaning/checkup package only. Labor/service only. Gas refill, leakage repair, card/coil work and parts are not included. Further repair is quoted separately. Cooling improvement depends on overall unit condition.',
  },
  {
    id: 'ac-master-service-split',
    name: 'AC Master Service – Split AC',
    description: 'Deep cleaning and full service for split ACs. Includes blower, coil, drain line, and outdoor unit washing.',
    category: 'maintenance',
    appliesTo: ['Air Conditioners'],
    price: { type: 'fixed', amount: 4500, display: 'PKR 4,500 per split AC' },
    installationProvider: 'tajalli_charged',
    consultationRequired: false,
    notes: 'Gas, leakage, coil change, card repair, compressor work and parts are not included. Safe access and water/electricity access required.',
    bestFor: 'Reduced cooling, weak airflow, odor, or overdue deep service.',
    packageIncludes: ['Deep indoor cleaning', 'Outdoor unit washing', 'Filter cleaning', 'Drain line cleaning', 'Blower cleaning', 'Coil surface cleaning', 'Gas pressure check', 'Cooling performance check', 'Basic electrical check', 'Final running test'],
    packageTerms: 'Labor/service only. Gas, leakage, coil change, card repair, compressor work and parts are not included. Safe access and water/electricity access required. Hidden faults are quoted separately.',
  },
  {
    id: 'ac-master-service-floor',
    name: 'AC Master Service – Floor Standing',
    description: 'Deep service for floor-standing / cassette ACs used in homes, offices, shops, salons, and commercial spaces.',
    category: 'maintenance',
    appliesTo: ['Air Conditioners'],
    price: { type: 'fixed', amount: 7500, display: 'PKR 7,500 per floor-standing AC' },
    installationProvider: 'tajalli_charged',
    consultationRequired: false,
    notes: 'Gas, leakage repair, coil change, card repair, compressor work, parts, lifting or difficult access are not included.',
    bestFor: 'Homes, offices, shops, salons and commercial spaces using floor-standing ACs.',
    packageIncludes: ['Deep service of indoor unit', 'Outdoor cleaning', 'Cooling check', 'Gas pressure check', 'Drainage check', 'Airflow cleaning', 'Basic electrical inspection', 'Final performance test'],
    packageTerms: 'Labor/service only. Gas, leakage repair, coil change, card repair, compressor work, parts, lifting or difficult access are not included. Commercial-site service may require scheduled timing.',
  },
  {
    id: 'summer-ac-readiness',
    name: 'Summer AC Readiness Package',
    description: 'Prepares 3 split ACs for peak summer. Cleaning, gas check, and a cooling performance report for all three units at one site.',
    category: 'package',
    appliesTo: ['Air Conditioners'],
    price: { type: 'fixed', amount: 7000, display: 'PKR 7,000 for 3 split ACs · PKR 2,250 each additional AC' },
    installationProvider: 'tajalli_charged',
    consultationRequired: false,
    notes: 'Split ACs only. Same-site only. Gas, leakage, parts, card, coil, installation, relocation and lifting are not included.',
    bestFor: 'Families preparing multiple ACs before peak summer.',
    packageIncludes: ['AC cleaning and checkup for 3 split ACs', 'Gas pressure check', 'Cooling performance report', 'Priority quotation for any required repair'],
    packageTerms: 'Labor/service only. Same-site only. Split ACs only. Gas, leakage, parts, card, coil, installation, relocation and lifting are not included.',
  },

  // ── AC Repairs ───────────────────────────────────────────────────────────────

  {
    id: 'ac-leakage-repair-split',
    name: 'AC Leakage Repair – Split AC',
    description: 'Standard gas leakage repair for split ACs that lose refrigerant repeatedly or stop cooling properly.',
    category: 'repair',
    appliesTo: ['Air Conditioners'],
    price: {
      type: 'range', min: 13000, max: 24000,
      display: '1 Ton: PKR 13,000 · 1.5 Ton: PKR 17,000 · 2 Ton: PKR 24,000',
      tiers: [
        { label: '1 Ton', amount: 13000 },
        { label: '1.5 Ton', amount: 17000 },
        { label: '2 Ton', amount: 24000 },
      ],
    },
    installationProvider: 'tajalli_charged',
    consultationRequired: false,
    notes: 'Standard leakage repair only. Major coil damage, multiple leak points, condenser/evaporator replacement, piping replacement, card or compressor issues may need revised quotation.',
    bestFor: 'ACs that lose gas repeatedly or stop cooling properly.',
    packageIncludes: ['Leakage diagnosis', 'Standard leakage repair', 'Gas refill where applicable', 'Pressure testing', 'Cooling test after repair'],
    packageTerms: 'Standard leakage repair only. Major coil damage, multiple leak points, condenser/evaporator replacement, piping replacement, card or compressor issues may need revised quotation. Warranty applies only to the repaired leakage point.',
  },
  {
    id: 'ac-leakage-repair-floor',
    name: 'AC Leakage Repair – Floor Standing',
    description: 'Standard gas leakage repair for commercial and high-capacity floor-standing ACs.',
    category: 'repair',
    appliesTo: ['Air Conditioners'],
    price: {
      type: 'range', min: 29000, max: 45000,
      display: '2 Ton: PKR 29,000 · 4 Ton: PKR 45,000',
      tiers: [
        { label: '2 Ton', amount: 29000 },
        { label: '4 Ton', amount: 45000 },
      ],
    },
    installationProvider: 'tajalli_charged',
    consultationRequired: false,
    notes: 'Standard repairable leakage only. Major coil replacement, compressor work, piping replacement, dismantling, heavy lifting or difficult access may be charged separately.',
    bestFor: 'Commercial and high-capacity floor-standing ACs with gas leakage.',
    packageIncludes: ['Leakage diagnosis', 'Standard leakage repair', 'Gas refill where applicable', 'Pressure testing', 'Cooling test'],
    packageTerms: 'Standard repairable leakage only. Major coil replacement, compressor work, piping replacement, dismantling, heavy lifting or difficult access may be charged separately. Warranty applies only to the repaired leakage point.',
  },
  {
    id: 'ac-coil-change',
    name: 'AC Coil Change Package',
    description: 'Full coil replacement for ACs with damaged or weak coils where reliable leakage repair is not possible.',
    category: 'repair',
    appliesTo: ['Air Conditioners'],
    price: {
      type: 'range', min: 30000, max: 110000,
      display: '1T: PKR 30,000 · 1.5T: PKR 40,000 · 2T: PKR 70,000 · 2T Floor: PKR 80,000 · 4T Floor: PKR 110,000',
      tiers: [
        { label: '1 Ton', amount: 30000 },
        { label: '1.5 Ton', amount: 40000 },
        { label: '2 Ton', amount: 70000 },
        { label: '2 Ton Floor', amount: 80000 },
        { label: '4 Ton Floor', amount: 110000 },
      ],
    },
    installationProvider: 'tajalli_charged',
    consultationRequired: false,
    notes: 'Compressor, card, fan motor and electrical faults are not included. Warranty applies to installed coil and workmanship as agreed.',
    bestFor: 'ACs with damaged or weak coils where reliable leakage repair is not possible.',
    packageIncludes: ['Coil replacement', 'Standard fitting', 'Gas refill where applicable', 'Cooling test', 'Workmanship check'],
    packageTerms: 'Service rates include standard equipment, parts and material charges unless otherwise stated. Compressor, card, fan motor and electrical faults are not included. Warranty applies to installed coil and workmanship as agreed.',
  },

  // ── AC Support & Setup ───────────────────────────────────────────────────────

  {
    id: 'ac-card-repair',
    name: 'AC Card Repair',
    description: 'Repair of faulty AC control card for display errors, power issues, irregular cooling, or remote signal problems.',
    category: 'repair',
    appliesTo: ['Air Conditioners'],
    price: { type: 'fixed', amount: 15000, display: 'PKR 15,000' },
    installationProvider: 'tajalli_charged',
    consultationRequired: false,
    notes: 'Repair is subject to repairability. Voltage fluctuation, water damage, pests, short circuit, or third-party repair void warranty.',
    bestFor: 'Display errors, power issues, irregular cooling, remote signal issues, or card malfunction.',
    packageIncludes: ['Card diagnosis', 'Repair depending on selected service', 'Basic testing after repair', 'Operational check'],
    packageTerms: 'Service rates include standard equipment, parts and material charges unless otherwise stated. Repair is subject to repairability. Voltage fluctuation, water damage, pests, short circuit, or third-party repair void warranty.',
  },
  {
    id: 'ac-card-replacement',
    name: 'AC Card Replacement',
    description: 'Full replacement of faulty AC control card.',
    category: 'repair',
    appliesTo: ['Air Conditioners'],
    price: { type: 'fixed', amount: 25000, display: 'PKR 25,000' },
    installationProvider: 'tajalli_charged',
    consultationRequired: false,
    notes: 'Voltage fluctuation, water damage, pests, short circuit, or third-party repair void warranty.',
    bestFor: 'Card malfunction where repair is not feasible.',
    packageIncludes: ['Card diagnosis', 'Replacement card installation', 'Basic testing after replacement', 'Operational check'],
    packageTerms: 'Service rates include standard equipment, parts and material charges unless otherwise stated. Voltage fluctuation, water damage, pests, short circuit, or third-party repair void warranty.',
  },
  {
    id: 'ac-relocation',
    name: 'AC Relocation (Uninstall & Reinstall)',
    description: 'Complete AC relocation: uninstall from current position, transport within same premises, and reinstall at new location.',
    category: 'installation',
    appliesTo: ['Air Conditioners'],
    price: { type: 'fixed', amount: 7000, display: 'PKR 7,000 labor · PKR 1,000 lifting per item per floor' },
    installationProvider: 'tajalli_charged',
    consultationRequired: false,
    notes: 'Labor-only rate. Copper pipe, drain pipe, bracket, wire, insulation, gas, transport and extra material are not included unless separately quoted.',
    bestFor: 'Customers shifting or repositioning their existing AC units.',
    packageIncludes: ['Indoor unit uninstallation', 'Outdoor unit removal', 'Reinstallation at new location', 'Basic connection', 'Running test'],
    packageTerms: 'Labor-only rates. Copper pipe, drain pipe, bracket, wire, insulation, gas, transport, and extra material are not included unless separately quoted. Additional charges may apply for height work or concealed piping.',
  },
  {
    id: 'ac-lifting',
    name: 'AC Lifting Charge',
    description: 'Charge for lifting AC units above ground floor — per item per floor.',
    category: 'installation',
    appliesTo: ['Air Conditioners'],
    price: { type: 'per_unit', amount: 1000, unit: 'per item per floor', display: 'PKR 1,000 per item per floor' },
    installationProvider: 'tajalli_charged',
    consultationRequired: false,
    notes: 'Applies when AC outdoor or indoor unit must be carried up stairs or requires height work.',
  },

  // ── Home Appliance Repairs ───────────────────────────────────────────────────

  {
    id: 'fridge-leakage-repair',
    name: 'Refrigerator Leakage Repair',
    description: 'Gas leakage diagnosis and repair for refrigerators with cooling loss or leakage symptoms.',
    category: 'repair',
    appliesTo: ['Refrigerators', 'Deep Freezers'],
    price: { type: 'fixed', amount: 10000, display: 'PKR 10,000' },
    installationProvider: 'tajalli_charged',
    consultationRequired: false,
    notes: 'Compressor, thermostat, fan motor, PCB, transport and workshop repair may be quoted separately.',
    bestFor: 'Refrigerators with cooling issues or gas leakage symptoms.',
    packageIncludes: ['Diagnosis', 'Standard repair/replacement as applicable', 'Cooling test', 'Basic performance check'],
    packageTerms: 'Service rates include standard equipment, parts and material charges unless otherwise stated. Compressor, thermostat, fan motor, PCB, transport and workshop repair may be quoted separately.',
  },
  {
    id: 'fridge-relay-replacement',
    name: 'Refrigerator Relay Replacement',
    description: 'Relay fault diagnosis and replacement for refrigerators with relay failures.',
    category: 'repair',
    appliesTo: ['Refrigerators', 'Deep Freezers'],
    price: { type: 'fixed', amount: 7000, display: 'PKR 7,000' },
    installationProvider: 'tajalli_charged',
    consultationRequired: false,
    notes: 'Compressor, thermostat, fan motor, PCB, transport and workshop repair may be quoted separately.',
    bestFor: 'Refrigerators with relay faults causing cooling failure.',
    packageIncludes: ['Diagnosis', 'Relay replacement', 'Cooling test', 'Basic performance check'],
    packageTerms: 'Service rates include standard equipment, parts and material charges unless otherwise stated. Compressor, thermostat, fan motor, PCB, transport and workshop repair may be quoted separately.',
  },
  {
    id: 'dispenser-tap-replacement',
    name: 'Dispenser Tap Replacement',
    description: 'Tap replacement for water dispensers with faulty, leaking, or broken taps.',
    category: 'repair',
    appliesTo: ['Water Dispensers'],
    price: { type: 'fixed', amount: 3000, display: 'PKR 3,000' },
    installationProvider: 'tajalli_charged',
    consultationRequired: false,
    notes: 'Major electrical or cooling-system faults may be quoted separately.',
    bestFor: 'Tap issues in water dispensers.',
    packageIncludes: ['Diagnosis', 'Tap replacement', 'Basic leak test', 'Function check'],
    packageTerms: 'Service rates include standard equipment, parts and material charges unless otherwise stated. Major electrical or cooling-system faults may be quoted separately.',
  },
  {
    id: 'dispenser-leakage-fix',
    name: 'Dispenser Leakage Fix',
    description: 'Leakage diagnosis and repair for water dispensers.',
    category: 'repair',
    appliesTo: ['Water Dispensers'],
    price: { type: 'fixed', amount: 5000, display: 'PKR 5,000' },
    installationProvider: 'tajalli_charged',
    consultationRequired: false,
    notes: 'Major electrical or cooling-system faults may be quoted separately.',
    bestFor: 'Water leakage problems in dispensers.',
    packageIncludes: ['Diagnosis', 'Leakage repair', 'Basic leak test', 'Function check'],
    packageTerms: 'Service rates include standard equipment, parts and material charges unless otherwise stated. Major electrical or cooling-system faults may be quoted separately.',
  },
  {
    id: 'dispenser-tank-repair',
    name: 'Dispenser Tank Repair',
    description: 'Tank repair for water dispensers with tank problems.',
    category: 'repair',
    appliesTo: ['Water Dispensers'],
    price: { type: 'fixed', amount: 3000, display: 'PKR 3,000' },
    installationProvider: 'tajalli_charged',
    consultationRequired: false,
    notes: 'Major electrical or cooling-system faults may be quoted separately.',
    bestFor: 'Tank problems in water dispensers.',
    packageIncludes: ['Diagnosis', 'Tank repair', 'Basic leak test', 'Function check'],
    packageTerms: 'Service rates include standard equipment, parts and material charges unless otherwise stated. Major electrical or cooling-system faults may be quoted separately.',
  },
  {
    id: 'home-appliance-care-package',
    name: 'Home Appliance Care Package',
    description: 'Multi-appliance inspection bundle: 1 AC cleaning, 1 fridge basic diagnosis, and 1 dispenser basic diagnosis — all in a single visit.',
    category: 'package',
    appliesTo: ['Air Conditioners', 'Refrigerators', 'Water Dispensers'],
    price: { type: 'fixed', amount: 5500, display: 'PKR 5,500' },
    installationProvider: 'tajalli_charged',
    consultationRequired: false,
    notes: 'Same-site only. Does not include gas refill, leakage repair, installation or replacement parts unless quoted separately.',
    bestFor: 'Homes with mixed appliances needing a general inspection.',
    packageIncludes: ['1 AC cleaning and checkup', '1 refrigerator basic diagnosis', '1 dispenser basic diagnosis', 'General repair recommendations'],
    packageTerms: 'Inspection/checkup package only. Repairs and parts are charged separately. Same-site only. Does not include gas refill, leakage repair, installation or replacement parts unless quoted.',
  },

  // ── Power Backup & Inverter Solutions ────────────────────────────────────────

  {
    id: 'ups-solar-inverter-service',
    name: 'UPS / Solar Inverter Service',
    description: 'Diagnosis, repair, or service for UPS units, inverters, and solar inverters — priced by wattage.',
    category: 'repair',
    appliesTo: ['Solar Systems', 'Solar Inverters'],
    price: { type: 'per_unit', amount: 8, unit: 'per watt', display: 'PKR 8 per Watt (total depends on inverter size)' },
    installationProvider: 'tajalli_charged',
    consultationRequired: false,
    notes: 'Final cost depends on inverter wattage, fault type, parts required, and repair feasibility.',
    bestFor: 'UPS, inverter, and solar inverter inspection, service, or repair requirements.',
    packageIncludes: ['Diagnosis', 'Repair/service according to inverter size and issue', 'Basic testing'],
    packageTerms: 'Service rates include standard equipment, parts and material charges unless otherwise stated. Final cost depends on inverter wattage, fault type, parts required, and repair feasibility.',
  },
  {
    id: 'solar-inverter-reinstall',
    name: 'Solar Inverter Uninstallation & Reinstallation',
    description: 'Safe removal and reinstallation of a solar inverter — for customers shifting inverter location or correcting an existing installation.',
    category: 'installation',
    appliesTo: ['Solar Systems', 'Solar Inverters'],
    price: { type: 'fixed', amount: 6000, display: 'PKR 6,000' },
    installationProvider: 'tajalli_charged',
    consultationRequired: false,
    notes: 'Labor-only. Wiring, lugs, breakers, transport, and additional material are not included.',
    bestFor: 'Customers shifting inverter location or correcting an existing installation.',
    packageIncludes: ['Safe removal and reinstallation labor', 'Basic connection', 'Basic running test'],
    packageTerms: 'Labor-only. Wiring, lugs, breakers, transport, and additional material are not included.',
  },
  {
    id: 'solar-battery-replacement-labor',
    name: 'Solar Battery Replacement Labor',
    description: 'Labor for removing old battery and placing new one — battery cost is separate.',
    category: 'installation',
    appliesTo: ['Solar Systems'],
    price: { type: 'fixed', amount: 6000, display: 'PKR 6,000 (labor only)' },
    installationProvider: 'tajalli_charged',
    consultationRequired: false,
    notes: 'Labor-only. Battery cost, terminals, connectors, transport, and extra material are not included.',
    bestFor: 'Battery replacement or battery-bank service support.',
    packageIncludes: ['Removal of old battery where applicable', 'New battery placement support', 'Basic reconnection', 'Safety check'],
    packageTerms: 'Labor-only. Battery cost, terminals, connectors, transport, and extra material are not included.',
  },
  {
    id: 'shop-salon-backup-starter',
    name: 'Shop / Salon Backup Starter Package',
    description: 'Backup-power setup support for small shops, salons, clinics, and offices. Includes UPS/inverter inspection or installation support and load review.',
    category: 'package',
    appliesTo: ['Solar Systems', 'Solar Inverters'],
    price: { type: 'range', min: 6000, max: 6000, display: 'Starting from PKR 6,000 (labor only)' },
    installationProvider: 'tajalli_charged',
    consultationRequired: false,
    notes: 'Batteries, inverter, wires, lugs, breakers, DB, transport and additional material are not included. Final price depends on inverter size and battery setup.',
    bestFor: 'Small shops, salons, clinics, and offices needing backup-power setup support.',
    packageIncludes: ['UPS/inverter inspection or installation support', 'Solar battery replacement labor where applicable', 'Load requirement review', 'Backup recommendation', 'Basic safety check'],
    packageTerms: 'Batteries, inverter, wires, lugs, breakers, DB, transport and additional material are not included. Final price depends on inverter size and battery setup.',
  },

  // ── Additional Installations ─────────────────────────────────────────────────

  {
    id: 'fan-installation',
    name: 'Fan Installation',
    description: 'Professional ceiling or pedestal fan installation.',
    category: 'installation',
    appliesTo: ['Fans'],
    price: { type: 'fixed', amount: 1500, display: 'PKR 1,500' },
    installationProvider: 'tajalli_charged',
    consultationRequired: false,
    notes: 'Wiring extension or canopy work quoted separately.',
  },
  {
    id: 'solar-install-per-kw',
    name: 'Solar Panel Installation Labor (per kW)',
    description: 'Installation labor for solar panels — charged per kW of system capacity.',
    category: 'installation',
    appliesTo: ['Solar Systems', 'Solar Panels'],
    price: { type: 'per_unit', amount: 7000, unit: 'per kW', display: 'PKR 7,000 per kW' },
    installationProvider: 'tajalli_charged',
    consultationRequired: false,
    notes: 'Materials (conduit, cable, breakers) charged separately.',
  },
  {
    id: 'solar-elevated-structure',
    name: 'Elevated Solar Structure (Labor + Material + Installation)',
    description: 'Elevated mounting structure for solar panels — includes structure material, fabrication, and installation.',
    category: 'installation',
    appliesTo: ['Solar Systems', 'Solar Panels'],
    price: { type: 'per_unit', amount: 15000, unit: 'per solar plate', display: 'PKR 15,000 per solar plate' },
    installationProvider: 'tajalli_charged',
    consultationRequired: true,
    notes: 'Site survey required. Price includes labor, material, and installation for elevated frame only.',
  },
  {
    id: 'solar-cleaning',
    name: 'Solar Panel Cleaning & Maintenance',
    description: 'Professional solar panel cleaning and system maintenance visit.',
    category: 'maintenance',
    appliesTo: ['Solar Systems', 'Solar Panels'],
    price: { type: 'fixed', amount: 6500, display: 'PKR 6,500 per visit' },
    installationProvider: 'tajalli_charged',
    consultationRequired: false,
    notes: 'Does not include part replacement or inverter service.',
  },
  {
    id: 'led-installation-32',
    name: 'LED TV Installation – 32 inch',
    description: 'Wall mounting installation for 32-inch LED TVs.',
    category: 'installation',
    appliesTo: ['Televisions'],
    price: { type: 'fixed', amount: 1200, display: 'PKR 1,200' },
    installationProvider: 'tajalli_charged',
    consultationRequired: false,
    notes: 'Wall bracket sold separately.',
  },
  {
    id: 'led-installation-40-43',
    name: 'LED TV Installation – 40–43 inch',
    description: 'Wall mounting installation for 40–43-inch LED TVs.',
    category: 'installation',
    appliesTo: ['Televisions'],
    price: { type: 'fixed', amount: 1800, display: 'PKR 1,800' },
    installationProvider: 'tajalli_charged',
    consultationRequired: false,
    notes: 'Wall bracket sold separately.',
  },
  {
    id: 'led-installation-50',
    name: 'LED TV Installation – 50 inch',
    description: 'Wall mounting installation for 50-inch LED TVs.',
    category: 'installation',
    appliesTo: ['Televisions'],
    price: { type: 'fixed', amount: 2500, display: 'PKR 2,500' },
    installationProvider: 'tajalli_charged',
    consultationRequired: false,
    notes: 'Wall bracket sold separately.',
  },
  {
    id: 'led-installation-55-75',
    name: 'LED TV Installation – 55–75 inch',
    description: 'Wall mounting installation for 55–75-inch LED TVs.',
    category: 'installation',
    appliesTo: ['Televisions'],
    price: { type: 'fixed', amount: 7000, display: 'PKR 7,000' },
    installationProvider: 'tajalli_charged',
    consultationRequired: false,
    notes: 'Wall bracket sold separately. Two technicians required.',
  },
  {
    id: 'led-installation-75plus',
    name: 'LED TV Installation – 75 inch+',
    description: 'Wall mounting installation for TVs above 75 inches. Requires site survey before quoting.',
    category: 'installation',
    appliesTo: ['Televisions'],
    price: { type: 'on_request', display: 'Site survey required before installation quote' },
    installationProvider: 'tajalli_charged',
    consultationRequired: true,
    notes: 'Site survey required. Wall structure assessment needed for large screen mounting.',
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

// ── Annual Care Plans ──────────────────────────────────────────────────────────

export interface AnnualCarePlanAppliance {
  num:      string;
  category: string;
  coverage: string;
  startsAt: number;
}

export interface AnnualCarePlan {
  id:         'essential' | 'plus';
  name:       string;
  tagline:    string;
  description: string;
  appliances: AnnualCarePlanAppliance[];
  includes:   string[];
  bestFor:    string;
  terms:      string[];
}

export const ANNUAL_CARE_PLANS: AnnualCarePlan[] = [
  {
    id: 'essential',
    name: 'Essential Annual Care Plan',
    tagline: 'Basic preventive coverage',
    description: 'Basic preventive coverage for homes, offices & businesses',
    appliances: [
      { num: '01', category: 'Air Conditioners',   coverage: 'Cleaning, filter wash, gas pressure & drain check',          startsAt: 7500  },
      { num: '02', category: 'Refrigerators',       coverage: 'Cooling, gasket, leakage & relay check',                      startsAt: 6000  },
      { num: '03', category: 'Freezers',            coverage: 'Cooling efficiency, seal & leakage check',                    startsAt: 6500  },
      { num: '04', category: 'Washing Machines',    coverage: 'Drain, spin, inlet & performance check',                      startsAt: 6000  },
      { num: '05', category: 'Televisions',         coverage: 'Display, ports, sound & mounting check',                      startsAt: 4500  },
      { num: '06', category: 'Solar & UPS',         coverage: 'Cleaning, wiring, inverter & battery health check',           startsAt: 12000 },
      { num: '07', category: 'Kitchen Appliances',  coverage: 'Basic inspection, cleaning & functional test',                startsAt: 3500  },
      { num: '08', category: 'Water Dispensers',    coverage: 'Tap, tank, cooling/heating & leakage check',                  startsAt: 4500  },
      { num: '09', category: 'Small Appliances',    coverage: 'Safety and performance check',                                startsAt: 3000  },
    ],
    includes: [
      '1 scheduled preventive visit per covered product per year',
      'Inspection, external cleaning & basic testing',
      'Service checklist tailored to product type',
      '10% off repair labor',
      'Standard response within 72 hours',
      'WhatsApp support',
    ],
    bestFor: 'Customers who want affordable annual preventive care and basic peace of mind.',
    terms: [
      'Valid for 12 months from activation; starting rates are per unit / set.',
      'Essential covers preventive care only; parts, gas refill, transport and major repairs are charged separately.',
      'Commercial, large-capacity, floor-standing ACs and larger solar systems may require a custom quote.',
      'Damage due to misuse, voltage fluctuation, fire, flooding, pests, rust, theft or accidents is excluded.',
      "Service available in Tajalli's active service areas; out-of-area visits may carry extra charges.",
    ],
  },
  {
    id: 'plus',
    name: 'Plus Annual Care Plan',
    tagline: 'Preventive care + covered parts',
    description: 'Preventive care plus free maintenance & covered parts. No product replacement included.',
    appliances: [
      { num: '01', category: 'Air Conditioners',   coverage: 'Service, cleaning, covered repairs & parts',                  startsAt: 16500 },
      { num: '02', category: 'Refrigerators',       coverage: 'Cooling care, repairs, maintenance & parts',                  startsAt: 13500 },
      { num: '03', category: 'Freezers',            coverage: 'Seal, cooling, repairs, maintenance & parts',                 startsAt: 14500 },
      { num: '04', category: 'Washing Machines',    coverage: 'Routine service, covered repairs & parts',                    startsAt: 13500 },
      { num: '05', category: 'Televisions',         coverage: 'Display, ports, sound repairs & covered parts',               startsAt: 9500  },
      { num: '06', category: 'Solar & UPS',         coverage: 'Cleaning, maintenance, covered repairs & parts',              startsAt: 24000 },
      { num: '07', category: 'Kitchen Appliances',  coverage: 'Maintenance, repairs & covered parts',                        startsAt: 7500  },
      { num: '08', category: 'Water Dispensers',    coverage: 'Cooling/heating care, repairs & parts',                       startsAt: 9500  },
      { num: '09', category: 'Small Appliances',    coverage: 'Routine care, repairs & covered parts',                       startsAt: 6500  },
    ],
    includes: [
      '2 scheduled service visits per covered product per year',
      'Preventive inspection, cleaning & testing',
      'Maintenance labor included',
      'Covered parts included for normal covered faults',
      'Priority response within 48 hours',
      'WhatsApp support + annual service reminders',
    ],
    bestFor: 'Families, offices and businesses that want stronger protection with free maintenance and parts, without paying for replacement-level cover.',
    terms: [
      'Valid for 12 months from activation; starting rates are per unit / set.',
      'Plus includes preventive care, maintenance labor and covered parts for eligible mechanical and electrical faults.',
      'Product replacement is not included in this plan.',
      'Damage due to misuse, power surges, fire, flooding, theft, rust, pests, accessories loss or third-party tampering is excluded.',
      'Large-capacity, floor-standing, commercial and expanded solar systems may require custom pricing or add-on cover.',
    ],
  },
];
