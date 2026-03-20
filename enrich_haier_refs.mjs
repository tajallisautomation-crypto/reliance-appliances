/**
 * enrich_haier_refs.mjs
 * Enriches Haier refrigerator products in the DB with the most detailed specs
 * extracted from the official Haier REF Catalogue 2025.
 *
 * Data source: Material/REF Catalogue 2025.pdf
 *
 * Updates: series, capacity, dimensions, defrost_type, inverter_type,
 *          door_type, all key technologies (per series), warranty, energy,
 *          descriptions, tags, SEO fields
 *
 * Preserves: id, brand, model, prices, installments, images, created_at
 *
 * Run:  node enrich_haier_refs.mjs [--dry-run]
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL      = 'https://fdfjavyopbrfvwtjaerw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDE3MDAsImV4cCI6MjA4ODIxNzcwMH0.fXwGFR_e3xZ4trEbkcH8UQ6_oWcIn92UUUvkGuFajto';
const ADMIN_EMAIL       = process.env.ADMIN_EMAIL    || 'tajallisautomation@gmail.com';
const ADMIN_PASSWORD    = process.env.ADMIN_PASSWORD || 'Hammad123!';
const DRY_RUN           = process.argv.includes('--dry-run');

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─────────────────────────────────────────────────────────────────────────────
// Technology bundles per series (from Haier REF Catalogue 2025)
// ─────────────────────────────────────────────────────────────────────────────
const TECH = {
  SUPER_INV_TDOOR: {
    inverter_tech:      'Twin Inverter Technology',
    connectivity:       'IOT / Smart WiFi Ready',
    cooling_system:     'No Frost — Fully Automatic',
    humidity_control:   'HCS (Humidity Control System) — 90% Humidity in Vegetable Box',
    bacteria_control:   'T-ABT Technology — 99.99% Bacterial Growth Prevention',
    door_design:        'T-Door Premium Design',
    energy_per_day:     'Approx. 1 Unit per Day (Inverter Efficiency)',
    voltage_range:      '170V – 264V',
    compressor_warranty:'5 Years',
    parts_warranty:     '2 Years',
  },
  SUPER_INV_SBS: {
    inverter_tech:      'Twin Inverter Technology',
    cooling_system:     'No Frost — Fully Automatic',
    odour_control:      'Deo Freshness Technology — Odour Neutralisation',
    display:            'Integrated Digital Display (Temperature Control)',
    door_design:        'Side-by-Side Premium Design',
    energy_per_day:     'Approx. 1 Unit per Day (Inverter Efficiency)',
    voltage_range:      '170V – 264V',
    compressor_warranty:'5 Years',
    parts_warranty:     '2 Years',
  },
  SUPER_INV_FF: {
    inverter_tech:      'Twin Inverter Technology',
    cooling_system:     'No Frost — Fully Automatic',
    zone_management:    'Double Magic Zone (Independent Temperature Zones)',
    odour_control:      'Deo Freshness Technology',
    connectivity:       'IOT / Smart WiFi Ready',
    energy_per_day:     'Approx. 1 Unit per Day (Inverter Efficiency)',
    voltage_range:      '170V – 264V',
    compressor_warranty:'5 Years',
    parts_warranty:     '2 Years',
  },
  IOT_INV: {
    inverter_tech:      'Twin Inverter × Dual Fan Technology',
    cooling_system:     'No Frost — Fully Automatic',
    temperature_sensors:'4 Independent Temperature Sensors with Color Digital Control',
    connectivity:       'IOT / Smart WiFi Ready',
    humidity_control:   'HCS (Humidity Control System) — 90% Humidity in Vegetable Box',
    bacteria_control:   'A.SPE Technology — 99.99% Bacteria Elimination',
    solar_ready:        'Solar-Adaptive Technology',
    energy_per_day:     'Approx. 1 Unit per Day',
    voltage_range:      '150V – 264V',
    compressor_warranty:'5 Years',
    parts_warranty:     '2 Years',
  },
  DIG_INV_FRESH: {
    inverter_tech:      'Twin Inverter × Dual Fan Technology',
    cooling_system:     'Digital Inverter Defrost',
    temperature_sensors:'4 Independent Temperature Sensors with Color Digital Control',
    humidity_control:   'HCS (Humidity Control System) — 90% Humidity in Vegetable Box',
    bacteria_control:   'A.SPE Technology — 99.99% Bacteria Elimination',
    solar_ready:        'Solar-Adaptive Technology',
    energy_per_day:     '1 Unit per Day (Certified)',
    voltage_range:      '150V – 264V',
    compressor_warranty:'5 Years',
    parts_warranty:     '2 Years',
  },
  DIG_INV_ABPLUS: {
    inverter_tech:      'FD (Full DC) Inverter Technology',
    cooling_system:     'Digital Inverter Defrost',
    temperature_sensors:'Color Digital Control with 4 Temperature Sensors',
    bacteria_control:   'A.SPE Technology — 99.99% Bacteria Elimination',
    turbo_fan:          'Turbo Fan — Faster, Uniform Cooling',
    solar_ready:        'Solar-Adaptive Technology',
    energy_per_day:     '1 Unit per Day (Certified)',
    voltage_range:      '150V – 264V',
    compressor_warranty:'5 Years',
    parts_warranty:     '2 Years',
  },
  DIG_INV_PLUS: {
    inverter_tech:      'FD (Full DC) Inverter Technology',
    cooling_system:     'Digital Inverter Defrost',
    temperature_sensors:'Color Digital Control with 4 Temperature Sensors',
    bacteria_control:   'A.SPE Technology — 99.99% Bacteria Elimination',
    turbo_fan:          'Turbo Fan — Faster, Uniform Cooling',
    solar_ready:        'Solar-Adaptive Technology',
    voltage_range:      '150V – 264V',
    compressor_warranty:'5 Years',
    parts_warranty:     '2 Years',
  },
  SMART_INV: {
    inverter_tech:      'Smart Inverter Technology',
    cooling_system:     'Smart Inverter Defrost',
    bacteria_control:   'A.SPE Technology — 99.99% Bacteria Elimination',
    turbo_fan:          'Turbo Fan — Faster, Uniform Cooling',
    deep_freeze:        'Deep Freezing with 5-Way Evaporator (-25°C)',
    ice_making:         '1HIT — Ice Formation Within 1 Hour',
    touch_control:      'Touch Control Panel',
    energy_per_day:     '1 Unit per Day (Certified)',
    voltage_range:      '150V – 264V',
    compressor_warranty:'5 Years',
    parts_warranty:     '2 Years',
  },
  ENERGY_STAR_GLASS: {
    cooling_system:     'Auto Defrost',
    odour_control:      'Deo Freshness Technology — Odour Neutralisation',
    deep_freeze:        'Deep Freezing with 5-Way Evaporator (-25°C)',
    ice_making:         '1HIT — Ice Formation Within 1 Hour',
    voltage_range:      'Wide Voltage Range',
    cooling_technology: 'Smart Cooling System',
    door_finish:        'Premium Glass Door',
    compressor_warranty:'5 Years',
    parts_warranty:     '2 Years',
  },
  ENERGY_STAR_METAL: {
    cooling_system:     'Auto Defrost',
    odour_control:      'Deo Freshness Technology — Odour Neutralisation',
    deep_freeze:        'Deep Freezing with 5-Way Evaporator (-25°C)',
    ice_making:         '1HIT — Ice Formation Within 1 Hour',
    antibacterial:      'Antibacterial Panel',
    cooling_technology: 'Smart Cooling System',
    door_finish:        'Metal Door',
    compressor_warranty:'5 Years',
    parts_warranty:     '2 Years',
  },
  SINGLE_DOOR: {
    cooling_system:     'Auto Defrost',
    door_design:        'Reversible Door (Left / Right Hinge)',
    handle_design:      'Sleek Recessed Handle',
    compressor_warranty:'5 Years',
    parts_warranty:     '2 Years',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Approximate cu ft conversion (1 cu ft ≈ 28.3L)
// ─────────────────────────────────────────────────────────────────────────────
function toCuFt(l) { return `${Math.round(l / 28.3)} cu ft (approx. — ${l}L)`; }

// ─────────────────────────────────────────────────────────────────────────────
// Full Haier Catalogue 2025 — per model data
// ─────────────────────────────────────────────────────────────────────────────
const HAIER_CATALOG = [

  // ════════════════════════════════════════════════════
  // SUPER INVERTER T-DOOR SERIES
  // ════════════════════════════════════════════════════
  {
    tokens: ['HRF-578 TBG', 'HRF-578TSG', 'HRF-578TBG'],
    series: 'Super Inverter T-Door', capacity_L: 456, doors: 2,
    defrost: 'No Frost', inverter: 'Twin Inverter', finish: 'Glass Door',
    door_type: 'Double Door (Top Mount)', h: 1804, w: 833, d: 650,
    tech_bundle: 'SUPER_INV_TDOOR',
    extra_specs: {
      'Haier T-Door Design': 'Yes — Premium T-Shape Door with Integrated Handle',
    },
  },
  {
    tokens: ['HRF-578 TBGU1', 'HRF-578TBGU1', 'HRF-578 TGGU1', 'HRF-578TGGU1'],
    series: 'Super Inverter T-Door', capacity_L: 456, doors: 2,
    defrost: 'No Frost', inverter: 'Twin Inverter', finish: 'Glass Door',
    door_type: 'Double Door (Top Mount)', h: 1804, w: 833, d: 650,
    tech_bundle: 'SUPER_INV_TDOOR',
    extra_specs: {
      'Haier T-Door Design': 'Yes — Upgraded U1 Edition',
    },
  },
  {
    tokens: ['HRF-678 TGG', 'HRF-678TGG'],
    series: 'Super Inverter T-Door', capacity_L: 540, doors: 2,
    defrost: 'No Frost', inverter: 'Twin Inverter', finish: 'Glass Door',
    door_type: 'Double Door (Top Mount)', h: 1900, w: 908, d: 648,
    tech_bundle: 'SUPER_INV_TDOOR',
    extra_specs: {
      'Haier T-Door Design': 'Yes — Large Capacity Premium T-Door',
    },
  },

  // ════════════════════════════════════════════════════
  // SUPER INVERTER SIDE BY SIDE
  // ════════════════════════════════════════════════════
  {
    tokens: ['HRF-622 IBG', 'HRF-622IBG', 'HRF-622 ICG', 'HRF-622ICG'],
    series: 'Super Inverter Side by Side', capacity_L: 564, doors: 2,
    defrost: 'No Frost', inverter: 'Twin Inverter', finish: 'Glass Door',
    door_type: 'Side-by-Side', h: 1775, w: 908, d: 647,
    tech_bundle: 'SUPER_INV_SBS',
    extra_specs: {
      'Side-by-Side Configuration': 'Freezer Left | Fridge Right',
      'Door Finish': 'Premium Glass Door',
    },
  },
  {
    tokens: ['HRF-622 IBS', 'HRF-622IBS'],
    series: 'Super Inverter Side by Side', capacity_L: 564, doors: 2,
    defrost: 'No Frost', inverter: 'Twin Inverter', finish: 'Metal Door',
    door_type: 'Side-by-Side', h: 1775, w: 908, d: 647,
    tech_bundle: 'SUPER_INV_SBS',
    extra_specs: {
      'Side-by-Side Configuration': 'Freezer Left | Fridge Right',
      'Door Finish': 'Stainless Steel / Metal Door',
    },
  },

  // ════════════════════════════════════════════════════
  // SUPER INVERTER FROST FREE (SUPER TM SERIES)
  // ════════════════════════════════════════════════════
  {
    tokens: ['HRF-488 IFFB', 'HRF-488IFFB'],
    series: 'Super Inverter Frost Free', capacity_L: 455, doors: 1,
    defrost: 'No Frost', inverter: 'Twin Inverter', finish: 'Glass Door',
    door_type: 'Single Door (Large)', h: 1775, w: 700, d: 695,
    tech_bundle: 'SUPER_INV_FF',
    extra_specs: {
      'Magic Zone': 'Double Magic Zone — Independent Temperature Zones',
    },
  },
  {
    tokens: ['HRF-518 IFFB', 'HRF-518IFFB'],
    series: 'Super Inverter Frost Free', capacity_L: 480, doors: 1,
    defrost: 'No Frost', inverter: 'Twin Inverter', finish: 'Glass Door',
    door_type: 'Single Door (Large)', h: 1850, w: 700, d: 695,
    tech_bundle: 'SUPER_INV_FF',
    extra_specs: {
      'Magic Zone': 'Double Magic Zone — Independent Temperature Zones',
    },
  },
  {
    tokens: ['HRF-518 WIFFBGU1', 'HRF-518WIFFBGU1'],
    series: 'Super Inverter Frost Free', capacity_L: 480, doors: 1,
    defrost: 'No Frost', inverter: 'Twin Inverter', finish: 'Glass Door',
    door_type: 'Single Door (Large)', h: 1850, w: 700, d: 695,
    tech_bundle: 'SUPER_INV_FF',
    extra_specs: {
      'Magic Zone': 'Double Magic Zone — Independent Temperature Zones',
      'Edition': 'Upgraded GU1 Edition',
    },
  },

  // ════════════════════════════════════════════════════
  // IOT INVERTER SERIES
  // ════════════════════════════════════════════════════
  {
    tokens: ['HRF-518 IOT', 'HRF-518IOT'],
    series: 'IOT Inverter', capacity_L: 508, doors: 2,
    defrost: 'No Frost', inverter: 'Twin Inverter × Dual Fan', finish: 'Glass Door',
    door_type: 'Double Door (Top Mount)', h: 1775, w: 760, d: 630,
    tech_bundle: 'IOT_INV',
    extra_specs: {
      'Smart App Control': 'Yes — Control via Haier Smart App',
      'Food Expiry Alert': 'Yes — IOT Food Management Notifications',
    },
  },

  // ════════════════════════════════════════════════════
  // DIGITAL INVERTER FRESHNESS SERIES
  // ════════════════════════════════════════════════════
  {
    tokens: ['HRF-518 TIF', 'HRF-518TIF'],
    series: 'Digital Inverter Freshness', capacity_L: 508, doors: 2,
    defrost: 'Inverter Defrost', inverter: 'Twin Inverter × Dual Fan', finish: 'Glass Door',
    door_type: 'Double Door (Top Mount)', h: 1775, w: 760, d: 630,
    tech_bundle: 'DIG_INV_FRESH',
    extra_specs: {
      'Series': 'Twin Inverter Freshness — Top of Digital Inverter Range',
    },
  },
  {
    tokens: ['HRF-318 IF', 'HRF-318IF'],
    series: 'Digital Inverter Freshness', capacity_L: 408, doors: 2,
    defrost: 'Inverter Defrost', inverter: 'Digital Inverter', finish: 'Glass Door',
    door_type: 'Double Door (Top Mount)', h: 1775, w: 660, d: 610,
    tech_bundle: 'DIG_INV_FRESH', extra_specs: {},
  },
  {
    tokens: ['HRF-198 IF', 'HRF-198IF'],
    series: 'Digital Inverter Freshness', capacity_L: 368, doors: 2,
    defrost: 'Inverter Defrost', inverter: 'Digital Inverter', finish: 'Glass Door',
    door_type: 'Double Door (Top Mount)', h: 1675, w: 660, d: 610,
    tech_bundle: 'DIG_INV_FRESH', extra_specs: {},
  },
  {
    tokens: ['HRF-168 IF', 'HRF-168IF'],
    series: 'Digital Inverter Freshness', capacity_L: 338, doors: 2,
    defrost: 'Inverter Defrost', inverter: 'Digital Inverter', finish: 'Glass Door',
    door_type: 'Double Door (Top Mount)', h: 1575, w: 660, d: 610,
    tech_bundle: 'DIG_INV_FRESH', extra_specs: {},
  },
  {
    tokens: ['HRF-136 IF', 'HRF-136IF'],
    series: 'Digital Inverter Freshness', capacity_L: 306, doors: 2,
    defrost: 'Inverter Defrost', inverter: 'Digital Inverter', finish: 'Glass Door',
    door_type: 'Double Door (Top Mount)', h: 1650, w: 595, d: 605,
    tech_bundle: 'DIG_INV_FRESH', extra_specs: {},
  },
  {
    tokens: ['HRF-146 IF', 'HRF-146IF'],
    series: 'Digital Inverter Freshness', capacity_L: 276, doors: 2,
    defrost: 'Inverter Defrost', inverter: 'Digital Inverter', finish: 'Glass Door',
    door_type: 'Double Door (Top Mount)', h: 1515, w: 595, d: 605,
    tech_bundle: 'DIG_INV_FRESH', extra_specs: {},
  },

  // ════════════════════════════════════════════════════
  // DIGITAL INVERTER ANTI-BACTERIAL+ SERIES
  // ════════════════════════════════════════════════════
  {
    tokens: ['HRF-518 IA+', 'HRF-518IA+', 'HRF-518IA'],
    series: 'Digital Inverter Anti-Bacterial+', capacity_L: 508, doors: 2,
    defrost: 'Inverter Defrost', inverter: 'FD Inverter', finish: 'Glass Door',
    door_type: 'Double Door (Top Mount)', h: 1775, w: 760, d: 630,
    tech_bundle: 'DIG_INV_ABPLUS', extra_specs: {},
  },
  {
    tokens: ['HRF-318 IA+', 'HRF-318IA+', 'HRF-318IA'],
    series: 'Digital Inverter Anti-Bacterial+', capacity_L: 408, doors: 2,
    defrost: 'Inverter Defrost', inverter: 'FD Inverter', finish: 'Glass Door',
    door_type: 'Double Door (Top Mount)', h: 1775, w: 660, d: 610,
    tech_bundle: 'DIG_INV_ABPLUS', extra_specs: {},
  },
  {
    tokens: ['HRF-198 IA+', 'HRF-198IA+', 'HRF-198IA'],
    series: 'Digital Inverter Anti-Bacterial+', capacity_L: 368, doors: 2,
    defrost: 'Inverter Defrost', inverter: 'FD Inverter', finish: 'Glass Door',
    door_type: 'Double Door (Top Mount)', h: 1675, w: 660, d: 610,
    tech_bundle: 'DIG_INV_ABPLUS', extra_specs: {},
  },
  {
    tokens: ['HRF-168 IA+', 'HRF-168IA+', 'HRF-168IA'],
    series: 'Digital Inverter Anti-Bacterial+', capacity_L: 338, doors: 2,
    defrost: 'Inverter Defrost', inverter: 'FD Inverter', finish: 'Glass Door',
    door_type: 'Double Door (Top Mount)', h: 1575, w: 660, d: 610,
    tech_bundle: 'DIG_INV_ABPLUS', extra_specs: {},
  },
  {
    tokens: ['HRF-136 IA+', 'HRF-136IA+', 'HRF-136IA'],
    series: 'Digital Inverter Anti-Bacterial+', capacity_L: 306, doors: 2,
    defrost: 'Inverter Defrost', inverter: 'FD Inverter', finish: 'Glass Door',
    door_type: 'Double Door (Top Mount)', h: 1650, w: 595, d: 605,
    tech_bundle: 'DIG_INV_ABPLUS', extra_specs: {},
  },
  {
    tokens: ['HRF-146 IA+', 'HRF-146IA+', 'HRF-146IA'],
    series: 'Digital Inverter Anti-Bacterial+', capacity_L: 276, doors: 2,
    defrost: 'Inverter Defrost', inverter: 'FD Inverter', finish: 'Glass Door',
    door_type: 'Double Door (Top Mount)', h: 1515, w: 595, d: 605,
    tech_bundle: 'DIG_INV_ABPLUS', extra_specs: {},
  },

  // ════════════════════════════════════════════════════
  // DIGITAL INVERTER+ SERIES
  // ════════════════════════════════════════════════════
  {
    tokens: ['HRF-518 ID+', 'HRF-518ID+', 'HRF-518ID'],
    series: 'Digital Inverter+', capacity_L: 508, doors: 2,
    defrost: 'Inverter Defrost', inverter: 'FD Inverter', finish: 'Glass Door',
    door_type: 'Double Door (Top Mount)', h: 1775, w: 760, d: 630,
    tech_bundle: 'DIG_INV_PLUS', extra_specs: {},
  },
  {
    tokens: ['HRF-318 ID+', 'HRF-318ID+', 'HRF-318ID'],
    series: 'Digital Inverter+', capacity_L: 408, doors: 2,
    defrost: 'Inverter Defrost', inverter: 'FD Inverter', finish: 'Glass Door',
    door_type: 'Double Door (Top Mount)', h: 1775, w: 660, d: 610,
    tech_bundle: 'DIG_INV_PLUS', extra_specs: {},
  },
  {
    tokens: ['HRF-198 ID+', 'HRF-198ID+', 'HRF-198ID'],
    series: 'Digital Inverter+', capacity_L: 368, doors: 2,
    defrost: 'Inverter Defrost', inverter: 'FD Inverter', finish: 'Glass Door',
    door_type: 'Double Door (Top Mount)', h: 1675, w: 660, d: 610,
    tech_bundle: 'DIG_INV_PLUS', extra_specs: {},
  },
  {
    tokens: ['HRF-168 ID+', 'HRF-168ID+', 'HRF-168ID'],
    series: 'Digital Inverter+', capacity_L: 338, doors: 2,
    defrost: 'Inverter Defrost', inverter: 'FD Inverter', finish: 'Glass Door',
    door_type: 'Double Door (Top Mount)', h: 1575, w: 660, d: 610,
    tech_bundle: 'DIG_INV_PLUS', extra_specs: {},
  },
  {
    tokens: ['HRF-136 ID+', 'HRF-136ID+', 'HRF-136ID'],
    series: 'Digital Inverter+', capacity_L: 306, doors: 2,
    defrost: 'Inverter Defrost', inverter: 'FD Inverter', finish: 'Glass Door',
    door_type: 'Double Door (Top Mount)', h: 1650, w: 595, d: 605,
    tech_bundle: 'DIG_INV_PLUS', extra_specs: {},
  },
  {
    tokens: ['HRF-146 ID+', 'HRF-146ID+', 'HRF-146ID'],
    series: 'Digital Inverter+', capacity_L: 276, doors: 2,
    defrost: 'Inverter Defrost', inverter: 'FD Inverter', finish: 'Glass Door',
    door_type: 'Double Door (Top Mount)', h: 1515, w: 595, d: 605,
    tech_bundle: 'DIG_INV_PLUS', extra_specs: {},
  },

  // ════════════════════════════════════════════════════
  // SMART INVERTER SERIES
  // ════════════════════════════════════════════════════
  {
    tokens: ['HRF-136 IP', 'HRF-136IP'],
    series: 'Smart Inverter', capacity_L: 306, doors: 2,
    defrost: 'Inverter Defrost', inverter: 'Smart Inverter', finish: 'Glass Door',
    door_type: 'Double Door (Top Mount)', h: 1650, w: 595, d: 605,
    tech_bundle: 'SMART_INV', extra_specs: {},
  },
  {
    tokens: ['HRF-146 IP', 'HRF-146IP'],
    series: 'Smart Inverter', capacity_L: 276, doors: 2,
    defrost: 'Inverter Defrost', inverter: 'Smart Inverter', finish: 'Glass Door',
    door_type: 'Double Door (Top Mount)', h: 1515, w: 595, d: 605,
    tech_bundle: 'SMART_INV', extra_specs: {},
  },
  {
    tokens: ['HRF-276 IP', 'HRF-276IP'],
    series: 'Smart Inverter', capacity_L: 246, doors: 2,
    defrost: 'Inverter Defrost', inverter: 'Smart Inverter', finish: 'Glass Door',
    door_type: 'Double Door (Top Mount)', h: 1515, w: 550, d: 560,
    tech_bundle: 'SMART_INV', extra_specs: {},
  },
  {
    tokens: ['HRF-236 IP', 'HRF-236IP'],
    series: 'Smart Inverter', capacity_L: 216, doors: 2,
    defrost: 'Inverter Defrost', inverter: 'Smart Inverter', finish: 'Glass Door',
    door_type: 'Double Door (Top Mount)', h: 1420, w: 550, d: 560,
    tech_bundle: 'SMART_INV', extra_specs: {},
  },

  // ════════════════════════════════════════════════════
  // ENERGY STAR — GLASS DOOR SERIES
  // ════════════════════════════════════════════════════
  {
    tokens: ['HRF-538 EP', 'HRF-538EP'],
    series: 'Energy Star', capacity_L: 508, doors: 1,
    defrost: 'Auto Defrost', inverter: 'Non-Inverter', finish: 'Glass Door',
    door_type: 'Single Door', h: 1775, w: 760, d: 630,
    tech_bundle: 'ENERGY_STAR_GLASS', extra_specs: {},
  },
  {
    tokens: ['HRF-438 EP', 'HRF-438EP'],
    series: 'Energy Star', capacity_L: 408, doors: 1,
    defrost: 'Auto Defrost', inverter: 'Non-Inverter', finish: 'Glass Door',
    door_type: 'Single Door', h: 1775, w: 660, d: 610,
    tech_bundle: 'ENERGY_STAR_GLASS', extra_specs: {},
  },
  {
    tokens: ['HRF-398 EP', 'HRF-398EP'],
    series: 'Energy Star', capacity_L: 368, doors: 1,
    defrost: 'Auto Defrost', inverter: 'Non-Inverter', finish: 'Glass Door',
    door_type: 'Single Door', h: 1675, w: 660, d: 610,
    tech_bundle: 'ENERGY_STAR_GLASS', extra_specs: {},
  },
  {
    tokens: ['HRF-168 EP', 'HRF-168EP'],
    series: 'Energy Star', capacity_L: 338, doors: 1,
    defrost: 'Auto Defrost', inverter: 'Non-Inverter', finish: 'Glass Door',
    door_type: 'Single Door', h: 1575, w: 660, d: 610,
    tech_bundle: 'ENERGY_STAR_GLASS', extra_specs: {},
  },
  {
    tokens: ['HRF-136 EP', 'HRF-136EP'],
    series: 'Energy Star', capacity_L: 306, doors: 1,
    defrost: 'Auto Defrost', inverter: 'Non-Inverter', finish: 'Glass Door',
    door_type: 'Single Door', h: 1650, w: 595, d: 605,
    tech_bundle: 'ENERGY_STAR_GLASS', extra_specs: {},
  },
  {
    tokens: ['HRF-146 EP', 'HRF-146EP'],
    series: 'Energy Star', capacity_L: 276, doors: 1,
    defrost: 'Auto Defrost', inverter: 'Non-Inverter', finish: 'Glass Door',
    door_type: 'Single Door', h: 1515, w: 595, d: 605,
    tech_bundle: 'ENERGY_STAR_GLASS', extra_specs: {},
  },
  {
    tokens: ['HRF-276 EP', 'HRF-276EP'],
    series: 'Energy Star', capacity_L: 246, doors: 1,
    defrost: 'Auto Defrost', inverter: 'Non-Inverter', finish: 'Glass Door',
    door_type: 'Single Door', h: 1515, w: 550, d: 560,
    tech_bundle: 'ENERGY_STAR_GLASS', extra_specs: {},
  },
  {
    tokens: ['HRF-236 EP', 'HRF-236EP'],
    series: 'Energy Star', capacity_L: 216, doors: 1,
    defrost: 'Auto Defrost', inverter: 'Non-Inverter', finish: 'Glass Door',
    door_type: 'Single Door', h: 1420, w: 550, d: 560,
    tech_bundle: 'ENERGY_STAR_GLASS', extra_specs: {},
  },
  {
    tokens: ['HRF-246 EP', 'HRF-246EP'],
    series: 'Energy Star', capacity_L: 186, doors: 1,
    defrost: 'Auto Defrost', inverter: 'Non-Inverter', finish: 'Glass Door',
    door_type: 'Single Door', h: 1270, w: 550, d: 560,
    tech_bundle: 'ENERGY_STAR_GLASS', extra_specs: {},
  },

  // ════════════════════════════════════════════════════
  // ENERGY STAR — METAL DOOR SERIES
  // ════════════════════════════════════════════════════
  {
    tokens: ['HRF-276 EB', 'HRF-276EB'],
    series: 'Energy Star', capacity_L: 246, doors: 1,
    defrost: 'Auto Defrost', inverter: 'Non-Inverter', finish: 'Metal Door',
    door_type: 'Single Door', h: 1515, w: 550, d: 560,
    tech_bundle: 'ENERGY_STAR_METAL', extra_specs: {},
  },
  {
    tokens: ['HRF-246 EB', 'HRF-246EB'],
    series: 'Energy Star', capacity_L: 216, doors: 1,
    defrost: 'Auto Defrost', inverter: 'Non-Inverter', finish: 'Metal Door',
    door_type: 'Single Door', h: 1420, w: 550, d: 560,
    tech_bundle: 'ENERGY_STAR_METAL', extra_specs: {},
  },
  {
    tokens: ['HRF-216 EB', 'HRF-216EB'],
    series: 'Energy Star', capacity_L: 186, doors: 1,
    defrost: 'Auto Defrost', inverter: 'Non-Inverter', finish: 'Metal Door',
    door_type: 'Single Door', h: 1270, w: 550, d: 560,
    tech_bundle: 'ENERGY_STAR_METAL', extra_specs: {},
  },
  {
    tokens: ['HRF-186 EB', 'HRF-186EB'],
    series: 'Energy Star', capacity_L: 156, doors: 1,
    defrost: 'Auto Defrost', inverter: 'Non-Inverter', finish: 'Metal Door',
    door_type: 'Single Door', h: 1268, w: 475, d: 440,
    tech_bundle: 'ENERGY_STAR_METAL', extra_specs: {},
  },

  // ════════════════════════════════════════════════════
  // SINGLE DOOR SERIES
  // ════════════════════════════════════════════════════
  {
    tokens: ['HR-416 EB', 'HR-416EB'],
    series: 'Single Door', capacity_L: 90, doors: 1,
    defrost: 'Auto Defrost', inverter: 'Non-Inverter', finish: 'Metal Door',
    door_type: 'Single Door (Small / Office)', h: 875, w: 445, d: 475,
    tech_bundle: 'SINGLE_DOOR',
    extra_specs: {
      'Use Case': 'Ideal for office or secondary room use',
    },
  },
  {
    tokens: ['HR-66 EB', 'HR-66EB'],
    series: 'Single Door', capacity_L: 42, doors: 1,
    defrost: 'Auto Defrost', inverter: 'Non-Inverter', finish: 'Metal Door',
    door_type: 'Single Door (Mini / Compact)', h: 510, w: 445, d: 475,
    tech_bundle: 'SINGLE_DOOR',
    extra_specs: {
      'Use Case': 'Mini / compact refrigerator — ideal for offices, bedrooms, or countertop use',
    },
  },

  // ════════════════════════════════════════════════════
  // PAKISTAN-MARKET VARIANTS
  // Suffix guide:
  //   IFGA / IFRA / IFPA / IFB  → Digital Inverter Freshness
  //   IPRA / IPGA               → Smart Inverter
  //   EPB / EPR / EPCG          → Energy Star (Auto Defrost)
  //   IOT                       → IOT Inverter (No Frost)
  // Model number encodes capacity in litres (HRF-368 → ~368L)
  // Dimensions estimated from catalogue reference models
  // ════════════════════════════════════════════════════

  // ── Smart Inverter Pakistan variants (IPRA / IPGA) ────────────────────────
  {
    tokens: ['HRF-246 IPRA', 'HRF-246IPRA', 'HRF-246 IPGA', 'HRF-246IPGA'],
    series: 'Smart Inverter', capacity_L: 186, doors: 1,
    defrost: 'Auto Defrost', inverter: 'Smart Inverter', finish: 'Glass Door',
    door_type: 'Single Door', h: 1270, w: 550, d: 560,
    tech_bundle: 'SMART_INV',
    extra_specs: { 'Variant': 'Pakistan Market — IPRA / IPGA' },
  },
  {
    tokens: ['HRF-276 IPRA', 'HRF-276IPRA', 'HRF-276 IPGA', 'HRF-276IPGA'],
    series: 'Smart Inverter', capacity_L: 246, doors: 2,
    defrost: 'Inverter Defrost', inverter: 'Smart Inverter', finish: 'Glass Door',
    door_type: 'Double Door (Top Mount)', h: 1515, w: 550, d: 560,
    tech_bundle: 'SMART_INV',
    extra_specs: { 'Variant': 'Pakistan Market — IPRA / IPGA' },
  },
  {
    tokens: ['HRF-316 IPRA', 'HRF-316IPRA', 'HRF-316 IPGA', 'HRF-316IPGA'],
    series: 'Smart Inverter', capacity_L: 286, doors: 2,
    defrost: 'Inverter Defrost', inverter: 'Smart Inverter', finish: 'Glass Door',
    door_type: 'Double Door (Top Mount)', h: 1580, w: 580, d: 580,
    tech_bundle: 'SMART_INV',
    extra_specs: { 'Variant': 'Pakistan Market — IPRA / IPGA' },
  },
  {
    tokens: ['HRF-346 IPRA', 'HRF-346IPRA', 'HRF-346 IPGA', 'HRF-346IPGA'],
    series: 'Smart Inverter', capacity_L: 316, doors: 2,
    defrost: 'Inverter Defrost', inverter: 'Smart Inverter', finish: 'Glass Door',
    door_type: 'Double Door (Top Mount)', h: 1630, w: 595, d: 595,
    tech_bundle: 'SMART_INV',
    extra_specs: { 'Variant': 'Pakistan Market — IPRA / IPGA' },
  },
  {
    tokens: ['HRF-418 IPRA', 'HRF-418IPRA', 'HRF-418 IPGA', 'HRF-418IPGA'],
    series: 'Smart Inverter', capacity_L: 388, doors: 2,
    defrost: 'Inverter Defrost', inverter: 'Smart Inverter', finish: 'Glass Door',
    door_type: 'Double Door (Top Mount)', h: 1700, w: 630, d: 610,
    tech_bundle: 'SMART_INV',
    extra_specs: { 'Variant': 'Pakistan Market — IPRA / IPGA' },
  },
  {
    tokens: ['HRF-458 IPRA', 'HRF-458IPRA', 'HRF-458 IPGA', 'HRF-458IPGA'],
    series: 'Smart Inverter', capacity_L: 428, doors: 2,
    defrost: 'Inverter Defrost', inverter: 'Smart Inverter', finish: 'Glass Door',
    door_type: 'Double Door (Top Mount)', h: 1750, w: 660, d: 610,
    tech_bundle: 'SMART_INV',
    extra_specs: { 'Variant': 'Pakistan Market — IPRA / IPGA' },
  },

  // ── Digital Inverter Freshness Pakistan variants (IFGA / IFRA / IFPA / IFB) ─
  {
    tokens: ['HRF-316 IFGA', 'HRF-316IFGA', 'HRF-316 IFRA', 'HRF-316IFRA', 'HRF-316 IFPA', 'HRF-316IFPA'],
    series: 'Digital Inverter Freshness', capacity_L: 286, doors: 2,
    defrost: 'Inverter Defrost', inverter: 'Digital Inverter', finish: 'Glass Door',
    door_type: 'Double Door (Top Mount)', h: 1580, w: 580, d: 580,
    tech_bundle: 'DIG_INV_FRESH',
    extra_specs: { 'Variant': 'Pakistan Market — IFGA / IFRA / IFPA' },
  },
  {
    tokens: ['HRF-346 IFGA', 'HRF-346IFGA', 'HRF-346 IFRA', 'HRF-346IFRA'],
    series: 'Digital Inverter Freshness', capacity_L: 316, doors: 2,
    defrost: 'Inverter Defrost', inverter: 'Digital Inverter', finish: 'Glass Door',
    door_type: 'Double Door (Top Mount)', h: 1630, w: 595, d: 595,
    tech_bundle: 'DIG_INV_FRESH',
    extra_specs: { 'Variant': 'Pakistan Market — IFGA / IFRA' },
  },
  {
    tokens: ['HRF-368 IFGA', 'HRF-368IFGA', 'HRF-368 IFRA', 'HRF-368IFRA', 'HRF-368 IFPA', 'HRF-368IFPA'],
    series: 'Digital Inverter Freshness', capacity_L: 338, doors: 2,
    defrost: 'Inverter Defrost', inverter: 'Digital Inverter', finish: 'Glass Door',
    door_type: 'Double Door (Top Mount)', h: 1575, w: 660, d: 610,
    tech_bundle: 'DIG_INV_FRESH',
    extra_specs: { 'Variant': 'Pakistan Market — IFGA / IFRA / IFPA' },
  },
  {
    tokens: ['HRF-398 IFGA', 'HRF-398IFGA', 'HRF-398 IFRA', 'HRF-398IFRA', 'HRF-398 IFPA', 'HRF-398IFPA'],
    series: 'Digital Inverter Freshness', capacity_L: 368, doors: 2,
    defrost: 'Inverter Defrost', inverter: 'Digital Inverter', finish: 'Glass Door',
    door_type: 'Double Door (Top Mount)', h: 1675, w: 660, d: 610,
    tech_bundle: 'DIG_INV_FRESH',
    extra_specs: { 'Variant': 'Pakistan Market — IFGA / IFRA / IFPA' },
  },
  {
    tokens: ['HRF-418 IFGA', 'HRF-418IFGA', 'HRF-418 IFRA', 'HRF-418IFRA', 'HRF-418 IFPA', 'HRF-418IFPA'],
    series: 'Digital Inverter Freshness', capacity_L: 388, doors: 2,
    defrost: 'Inverter Defrost', inverter: 'Digital Inverter', finish: 'Glass Door',
    door_type: 'Double Door (Top Mount)', h: 1700, w: 660, d: 610,
    tech_bundle: 'DIG_INV_FRESH',
    extra_specs: { 'Variant': 'Pakistan Market — IFGA / IFRA / IFPA' },
  },
  {
    tokens: ['HRF-438 IFGA', 'HRF-438IFGA', 'HRF-438 IFRA', 'HRF-438IFRA', 'HRF-438 IFPA', 'HRF-438IFPA'],
    series: 'Digital Inverter Freshness', capacity_L: 408, doors: 2,
    defrost: 'Inverter Defrost', inverter: 'Digital Inverter', finish: 'Glass Door',
    door_type: 'Double Door (Top Mount)', h: 1775, w: 660, d: 610,
    tech_bundle: 'DIG_INV_FRESH',
    extra_specs: { 'Variant': 'Pakistan Market — IFGA / IFRA / IFPA' },
  },
  {
    tokens: ['HRF-458 IFGA', 'HRF-458IFGA', 'HRF-458 IFRA', 'HRF-458IFRA', 'HRF-458 IFPA', 'HRF-458IFPA'],
    series: 'Digital Inverter Freshness', capacity_L: 428, doors: 2,
    defrost: 'Inverter Defrost', inverter: 'Digital Inverter', finish: 'Glass Door',
    door_type: 'Double Door (Top Mount)', h: 1750, w: 700, d: 620,
    tech_bundle: 'DIG_INV_FRESH',
    extra_specs: { 'Variant': 'Pakistan Market — IFGA / IFRA / IFPA' },
  },
  {
    tokens: ['HRF-538 IFGA', 'HRF-538IFGA', 'HRF-538 IFRA', 'HRF-538IFRA', 'HRF-538 IFPA', 'HRF-538IFPA'],
    series: 'Digital Inverter Freshness', capacity_L: 508, doors: 2,
    defrost: 'Inverter Defrost', inverter: 'Digital Inverter', finish: 'Glass Door',
    door_type: 'Double Door (Top Mount)', h: 1775, w: 760, d: 630,
    tech_bundle: 'DIG_INV_FRESH',
    extra_specs: { 'Variant': 'Pakistan Market — IFGA / IFRA / IFPA' },
  },
  {
    tokens: ['HRF-488 IFB', 'HRF-488IFB'],
    series: 'Digital Inverter Freshness', capacity_L: 455, doors: 1,
    defrost: 'Inverter Defrost', inverter: 'Digital Inverter', finish: 'Glass Door',
    door_type: 'Single Door (Large)', h: 1775, w: 700, d: 695,
    tech_bundle: 'DIG_INV_FRESH',
    extra_specs: { 'Variant': 'Pakistan Market — IFB' },
  },
  {
    tokens: ['HRF-518 IFB', 'HRF-518IFB'],
    series: 'Digital Inverter Freshness', capacity_L: 480, doors: 1,
    defrost: 'Inverter Defrost', inverter: 'Digital Inverter', finish: 'Glass Door',
    door_type: 'Single Door (Large)', h: 1850, w: 700, d: 695,
    tech_bundle: 'DIG_INV_FRESH',
    extra_specs: { 'Variant': 'Pakistan Market — IFB' },
  },

  // ── Energy Star Pakistan variants (EPB / EPR / EPCG) ─────────────────────
  {
    tokens: ['HRF-216 EPB', 'HRF-216EPB', 'HRF-216 EPR', 'HRF-216EPR', 'HRF-216 EPCG', 'HRF-216EPCG'],
    series: 'Energy Star', capacity_L: 186, doors: 1,
    defrost: 'Auto Defrost', inverter: 'Non-Inverter', finish: 'Metal Door',
    door_type: 'Single Door', h: 1270, w: 550, d: 560,
    tech_bundle: 'ENERGY_STAR_METAL',
    extra_specs: { 'Variant': 'Pakistan Market — EPB / EPR / EPCG' },
  },
  {
    tokens: ['HRF-246 EPB', 'HRF-246EPB', 'HRF-246 EPR', 'HRF-246EPR', 'HRF-246 EPCG', 'HRF-246EPCG'],
    series: 'Energy Star', capacity_L: 216, doors: 1,
    defrost: 'Auto Defrost', inverter: 'Non-Inverter', finish: 'Metal Door',
    door_type: 'Single Door', h: 1420, w: 550, d: 560,
    tech_bundle: 'ENERGY_STAR_METAL',
    extra_specs: { 'Variant': 'Pakistan Market — EPB / EPR / EPCG' },
  },
  {
    tokens: ['HRF-276 EPB', 'HRF-276EPB', 'HRF-276 EPR', 'HRF-276EPR', 'HRF-276 EPCG', 'HRF-276EPCG'],
    series: 'Energy Star', capacity_L: 246, doors: 1,
    defrost: 'Auto Defrost', inverter: 'Non-Inverter', finish: 'Metal Door',
    door_type: 'Single Door', h: 1515, w: 550, d: 560,
    tech_bundle: 'ENERGY_STAR_METAL',
    extra_specs: { 'Variant': 'Pakistan Market — EPB / EPR / EPCG' },
  },
  {
    tokens: ['HRF-316 EPB', 'HRF-316EPB', 'HRF-316 EPR', 'HRF-316EPR', 'HRF-316 EPCG', 'HRF-316EPCG'],
    series: 'Energy Star', capacity_L: 286, doors: 1,
    defrost: 'Auto Defrost', inverter: 'Non-Inverter', finish: 'Metal Door',
    door_type: 'Single Door', h: 1580, w: 580, d: 580,
    tech_bundle: 'ENERGY_STAR_METAL',
    extra_specs: { 'Variant': 'Pakistan Market — EPB / EPR / EPCG' },
  },
  {
    tokens: ['HRF-346 EPB', 'HRF-346EPB', 'HRF-346 EPR', 'HRF-346EPR', 'HRF-346 EPCG', 'HRF-346EPCG'],
    series: 'Energy Star', capacity_L: 316, doors: 1,
    defrost: 'Auto Defrost', inverter: 'Non-Inverter', finish: 'Metal Door',
    door_type: 'Single Door', h: 1630, w: 595, d: 595,
    tech_bundle: 'ENERGY_STAR_METAL',
    extra_specs: { 'Variant': 'Pakistan Market — EPB / EPR / EPCG' },
  },

  // ── IOT Inverter Pakistan variants ────────────────────────────────────────
  {
    tokens: ['HRF-418 IOT', 'HRF-418IOT'],
    series: 'IOT Inverter', capacity_L: 388, doors: 2,
    defrost: 'No Frost', inverter: 'Twin Inverter × Dual Fan', finish: 'Glass Door',
    door_type: 'Double Door (Top Mount)', h: 1700, w: 660, d: 620,
    tech_bundle: 'IOT_INV',
    extra_specs: { 'Smart App Control': 'Yes — Haier Smart App', 'Variant': 'Pakistan Market' },
  },
  {
    tokens: ['HRF-458 IOT', 'HRF-458IOT'],
    series: 'IOT Inverter', capacity_L: 428, doors: 2,
    defrost: 'No Frost', inverter: 'Twin Inverter × Dual Fan', finish: 'Glass Door',
    door_type: 'Double Door (Top Mount)', h: 1750, w: 700, d: 625,
    tech_bundle: 'IOT_INV',
    extra_specs: { 'Smart App Control': 'Yes — Haier Smart App', 'Variant': 'Pakistan Market' },
  },
  {
    tokens: ['HRF-538 IOT', 'HRF-538IOT'],
    series: 'IOT Inverter', capacity_L: 508, doors: 2,
    defrost: 'No Frost', inverter: 'Twin Inverter × Dual Fan', finish: 'Glass Door',
    door_type: 'Double Door (Top Mount)', h: 1800, w: 760, d: 640,
    tech_bundle: 'IOT_INV',
    extra_specs: { 'Smart App Control': 'Yes — Haier Smart App', 'Variant': 'Pakistan Market' },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Match DB product to catalogue entry
// ─────────────────────────────────────────────────────────────────────────────
function matchCatalog(model) {
  const UP = model.toUpperCase().replace(/\s+/g, ' ').trim();
  for (const entry of HAIER_CATALOG) {
    for (const token of entry.tokens) {
      if (UP.includes(token.toUpperCase().replace(/[-\s]/g, match => match))) return entry;
    }
  }
  // Fallback: loose token search
  for (const entry of HAIER_CATALOG) {
    for (const token of entry.tokens) {
      const t = token.toUpperCase().replace(/\s+/g, '');
      const u = UP.replace(/\s+/g, '');
      if (u.includes(t) || t.includes(u.substring(0, Math.min(u.length, 10)))) return entry;
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Build comprehensive specs object
// ─────────────────────────────────────────────────────────────────────────────
function buildSpecs(entry, model) {
  const bundle = TECH[entry.tech_bundle] || {};
  const isNoFrost = entry.defrost === 'No Frost';

  const specs = {
    'Type':                   `Refrigerator — ${entry.series} Series`,
    'Series':                 entry.series,
    'Capacity':               toCuFt(entry.capacity_L),
    'Net Capacity (Litres)':  `${entry.capacity_L} L`,
    'Door Configuration':     entry.door_type,
    'Number of Doors':        `${entry.doors}`,
    'Door Finish':            entry.finish,
    'Defrost Type':           entry.defrost,
    'Inverter Technology':    entry.inverter,
    'Height':                 `${entry.h} mm`,
    'Width':                  `${entry.w} mm`,
    'Depth':                  `${entry.d} mm`,
    'Dimensions (H×W×D)':    `${entry.h} × ${entry.w} × ${entry.d} mm`,
    'Refrigerant':            'R600a (Eco-Friendly / Isobutane)',
    'Power Supply':           '220V / 50Hz',
    ...bundle,
    ...entry.extra_specs,
    'Compressor Warranty':    bundle.compressor_warranty || '5 Years',
    'Parts & Labour Warranty':bundle.parts_warranty || '2 Years',
    'Brand Heritage':         'Haier — Global No.1 Refrigerator Brand (17 Consecutive Years)',
  };

  if (isNoFrost) {
    specs['Frost Management']   = 'Fully Automatic No Frost — Zero Manual Defrosting';
    specs['Karachi Load Shedding Note'] = 'No Frost models lose cold air faster than Defrost models during prolonged power cuts — consider your area\'s load shedding frequency';
  } else {
    specs['Frost Management'] = 'Auto / Manual Defrost — Retains Cold Air Better During Power Cuts';
  }

  return specs;
}

// ─────────────────────────────────────────────────────────────────────────────
// Build description
// ─────────────────────────────────────────────────────────────────────────────
function buildDescription(entry, model, name) {
  const displayName = name || model;
  const capStr    = `${entry.capacity_L}L (${Math.round(entry.capacity_L / 28.3)} cu ft)`;
  const noFrost   = entry.defrost === 'No Frost';
  const isLarge   = entry.capacity_L >= 450;
  const isMedium  = entry.capacity_L >= 250 && entry.capacity_L < 450;
  const bundle    = TECH[entry.tech_bundle] || {};

  const sizeNote = isLarge
    ? `With a generous ${capStr} capacity, it's ideal for large families or commercial use.`
    : isMedium
    ? `${capStr} capacity — perfect for medium-sized Pakistani households.`
    : `Compact ${capStr} capacity — great for smaller homes, bedrooms, or offices.`;

  const defrostNote = noFrost
    ? 'Features fully automatic No Frost technology — no manual defrosting ever needed, keeps food fresh longer.'
    : 'Features efficient auto defrost technology — retains cooling better during Karachi load shedding.';

  const invNote = entry.inverter !== 'Non-Inverter'
    ? ` The ${entry.inverter} compressor reduces electricity bills significantly.`
    : '';

  const techHighlights = Object.entries(bundle)
    .filter(([k]) => !k.toLowerCase().includes('warranty'))
    .slice(0, 3)
    .map(([, v]) => v)
    .join(', ');

  return `The ${displayName} by Haier is part of the ${entry.series} series — engineered for Pakistani homes. ${sizeNote} ${defrostNote}${invNote}${techHighlights ? ` Key technologies: ${techHighlights}.` : ''} Dimensions: H${entry.h}mm × W${entry.w}mm × D${entry.d}mm. ${entry.inverter !== 'Non-Inverter' ? `Inverter compressor — 5 year warranty.` : `5 year compressor warranty.`} Available at Reliance Appliances, Karachi — on easy installments or cash. Call or WhatsApp for the latest price.`;
}

function buildTags(entry, model, name) {
  const base = name || model;
  const cuft = Math.round(entry.capacity_L / 28.3);
  return [
    'haier', 'Haier', model, base.toLowerCase(),
    'refrigerator', 'fridge', entry.series.toLowerCase(),
    entry.defrost.toLowerCase().replace(' ', '-'),
    entry.inverter.toLowerCase(),
    `${entry.capacity_L}l`, `${entry.capacity_L} litre`,
    `${cuft} cu ft`, `${cuft}cuft`,
    'haier refrigerator', 'haier fridge', 'haier ref',
    entry.doors === 2 ? 'double door fridge' : 'single door fridge',
    entry.finish.toLowerCase(),
    'karachi', 'pakistan', 'reliance appliances',
    'installment', 'easy installments',
    'fridge price pakistan', 'refrigerator karachi',
  ].filter(Boolean).join(', ');
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  const { error: authErr } = await supabase.auth.signInWithPassword({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  if (authErr) { console.error('Auth failed:', authErr.message); process.exit(1); }
  console.log('Signed in.\n');

  const { data: products, error } = await supabase
    .from('products')
    .select('id, brand, model, simplified_name, category, specs')
    .ilike('brand', 'haier');

  if (error) { console.error('Fetch error:', error.message); process.exit(1); }

  const refs = products.filter(p =>
    (p.category || '').toLowerCase().includes('refrig') ||
    (p.model || '').toUpperCase().startsWith('HRF') ||
    (p.model || '').toUpperCase().startsWith('HR-') ||
    (p.model || '').toUpperCase().match(/^HR[F]?-/)
  );

  console.log(`Found ${products.length} Haier products, ${refs.length} refrigerators.\n`);

  let updated = 0, noMatch = 0;

  for (const p of refs) {
    const entry = matchCatalog(p.model);
    if (!entry) {
      console.log(`  NO MATCH  ${p.model} (not found in REF Catalogue 2025 data)`);
      noMatch++;
      continue;
    }

    const specs       = buildSpecs(entry, p.model);
    const description = buildDescription(entry, p.model, p.simplified_name);
    const tags        = buildTags(entry, p.model, p.simplified_name);
    const seo_title   = `${p.simplified_name || p.model} Price in Pakistan | Buy on Installments — Reliance Appliances Karachi`;
    const seo_desc    = `Buy the ${p.simplified_name || p.model} in Karachi. ${entry.capacity_L}L ${entry.defrost} refrigerator — ${entry.series} series. ${entry.inverter}. Easy installments at Reliance Appliances. 5-year compressor warranty.`;

    console.log(`  ${DRY_RUN ? 'WOULD UPDATE' : 'UPDATE'}  ${p.model}  →  ${entry.series} | ${entry.capacity_L}L | ${entry.defrost} | ${entry.door_type}`);

    if (!DRY_RUN) {
      const { error: e } = await supabase.from('products').update({
        specs, description, tags, seo_title, seo_desc,
        updated_at: new Date().toISOString(),
      }).eq('id', p.id);
      if (e) { console.error(`    ✗ ${e.message}`); continue; }
    }
    updated++;
  }

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`Updated : ${updated}`);
  console.log(`No match: ${noMatch} (model not in REF Catalogue 2025 data)`);
  if (DRY_RUN) console.log('\n(Dry run — run without --dry-run to apply)');
  console.log();
}

main().catch(err => { console.error(err); process.exit(1); });
