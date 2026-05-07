/**
 * Inserts the Hanco HEG-50L 50L Solar-Compatible Electric Water Heater
 * into the Supabase products table.
 *
 * Run: node scripts/add_hanco_water_heater.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL      = 'https://fdfjavyopbrfvwtjaerw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDE3MDAsImV4cCI6MjA4ODIxNzcwMH0.fXwGFR_e3xZ4trEbkcH8UQ6_oWcIn92UUUvkGuFajto';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const product = {
  id:   'hanco-heg-50l',
  slug: 'hanco-heg-50l-solar-electric-water-heater',

  // ── Identity ────────────────────────────────────────────────────────────────
  brand:           'Hanco',
  model:           'HEG-50L',
  simplified_name: 'Hanco 50L Solar Electric Water Heater',

  // ── Taxonomy ────────────────────────────────────────────────────────────────
  category:               'Electric Water Heaters',
  original_category:      'Electric Water Heaters',
  sub_category:           'Geysers',
  normalized_category:    'Small Appliances',
  normalized_subcategory: 'Home & Heating Appliances',
  category_family:        'small',
  comparison_group:       'electric-water-heaters',
  frontend_browse_group:  'small',
  seo_category_slug:      'small-appliances',
  seo_subcategory_slug:   'electric-water-heaters',
  taxonomy_status:        'live',

  // ── Description ─────────────────────────────────────────────────────────────
  description: `The Hanco HEG-50L is a 50-litre semi-instant electric water heater built for Pakistani households dealing with load shedding and rising electricity costs. Its defining feature is solar compatibility: connect it directly to your existing solar inverter and run it on clean energy during daylight hours — no additional hardware required.

Adjustable Wattage Control lets you choose between three power settings (800W, 1200W, or 2000W) to match whatever energy source is available. Use 800W on a smaller inverter or during peak solar hours, and step up to 2000W on the grid for fast heating when you need it quickly.

The tank uses an Incoloy 840 nickel-chromium alloy heating element that resists oxidation, corrosion, and limescale far better than the standard copper elements found in cheaper units, extending service life significantly. High-density insulation surrounds the tank to retain heat for long periods, cutting down on reheating cycles and saving energy.

Rated IPX4 splash-proof with a 0.8 MPa (8 bar) pressure rating, this unit handles the high water pressures common in high-rise buildings and multi-storey homes without issue.

Four safety systems are built in: dry-heat cutoff protects the element if the tank runs empty, an over-pressure relief valve prevents tank rupture, an overheat cutoff engages if the thermostat fails, and Class I grounded enclosure guards against electric shock.

Available in Silver and White. Backed by a 2-year leakage warranty from Hanco.`,

  // ── Specifications ──────────────────────────────────────────────────────────
  specs: {
    'Capacity':        '50 Litres',
    'Power Settings':  '800W / 1200W / 2000W (Adjustable)',
    'Voltage':         '220–240V AC',
    'Frequency':       '50 Hz',
    'Pressure Rating': '0.8 MPa (8 Bar)',
    'Waterproof Grade':'IPX4',
    'Heating Element': 'Incoloy 840 (Nickel-Chromium Alloy)',
    'Solar Compatible':'Yes',
    'Safety Features': 'Dry Heat Protection, Over-Pressure Relief, Overheat Cutoff, Class I Electric Shock Protection',
    'Colors':          'Silver, White',
  },

  // ── Discovery ───────────────────────────────────────────────────────────────
  tags:   'water heater, geyser, electric geyser, solar geyser, solar compatible water heater, 50 litre geyser, hanco, heg-50l, load shedding, energy saving',
  colors: 'Silver, White',

  // ── Pricing (PKR) ───────────────────────────────────────────────────────────
  retail_price: 27150,
  cash_floor:   27150,
  min_price:    27150,

  // ── Warranty & Stock ────────────────────────────────────────────────────────
  warranty:     '2 Year Leakage Warranty',
  stock_status: 'In Stock',
  featured:     false,

  // ── Images ──────────────────────────────────────────────────────────────────
  thumbnail_url: '',
  gallery_urls:  [],

  // ── SEO ─────────────────────────────────────────────────────────────────────
  seo_title:    'Hanco HEG-50L 50L Solar-Compatible Electric Water Heater | Reliance',
  seo_desc:     'Buy the Hanco HEG-50L 50L electric geyser with adjustable 800W/1200W/2000W wattage, solar inverter compatibility, Incoloy 840 element, and IPX4 rating. 2-year leakage warranty. Rs. 27,150.',
  seo_keywords: 'hanco electric water heater, hanco geyser, heg-50l, 50 litre geyser, solar geyser pakistan, solar compatible electric geyser, hanco solar water heater',

  // ── Solar compatibility fields (appliance — not a solar system component) ───
  system_role:          'none',
  compatibility_status: 'not_applicable',
  compatibility_notes:  'Solar-compatible appliance. Designed to run off a solar inverter output directly. Not a solar system component.',
  requires_compatibility_review: false,
};

async function run() {
  console.log('Upserting Hanco HEG-50L …');

  const { data, error } = await supabase
    .from('products')
    .upsert(product, { onConflict: 'id' })
    .select('id, brand, model, simplified_name, retail_price, warranty, stock_status');

  if (error) {
    console.error('ERROR:', error.message);
    console.error(error);
    process.exit(1);
  }

  console.log('Success:', data);
}

run();
