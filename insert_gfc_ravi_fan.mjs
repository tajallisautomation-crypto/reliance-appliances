/**
 * insert_gfc_ravi_fan.mjs
 * GFC Ravi 56" 30W Inverter Ceiling Fan
 *
 * Run:  node insert_gfc_ravi_fan.mjs [--dry-run]
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL      = 'https://fdfjavyopbrfvwtjaerw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDE3MDAsImV4cCI6MjA4ODIxNzcwMH0.fXwGFR_e3xZ4trEbkcH8UQ6_oWcIn92UUUvkGuFajto';
const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || 'tajallisautomation@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Hammad123!';
const DRY_RUN        = process.argv.includes('--dry-run');

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const product = {
  id:   'gfc-ravi-56-30w',
  slug: 'gfc-ravi-56-inch-30w-inverter-ceiling-fan',

  brand:           'GFC',
  model:           'Ravi 56"',
  simplified_name: 'GFC Ravi 56" 30W Inverter Ceiling Fan',

  category:               'Ceiling Fans',
  original_category:      'Ceiling Fans',
  sub_category:           'Inverter Fans',
  normalized_category:    'Fans',
  normalized_subcategory: 'Inverter Ceiling Fans',
  category_family:        'fan',
  comparison_group:       'ceiling-fan-inverter',
  frontend_browse_group:  'fan',
  seo_category_slug:      'fans',
  seo_subcategory_slug:   'inverter-ceiling-fans',
  taxonomy_status:        'live',

  description: `The GFC Ravi is a 56-inch inverter ceiling fan built for energy-conscious Pakistani homes. Running at just 30W, it delivers 8,200 CFM of airflow at 315 RPM — performance that rivals conventional fans drawing four times the power.

The motor is a Hybrid BLDC (Brushless DC) inverter motor: unlike standard AC fans, a BLDC motor runs directly on DC power, which means it works seamlessly with UPS systems, solar inverters, and battery setups — no converter needed. During load shedding, the fan carries on uninterrupted as long as your backup power is running.

The electrical steel sheet laminations inside the motor are designed for maximum magnetic efficiency, and the windings use 99.9% pure copper wire with Grade-E varnish insulation, which protects against voltage spikes and electric shock and adds durability in high-humidity environments.

Three aerodynamically profiled blades span 56 inches (1400mm) and are set at an optimised pitch to move the most air per watt. Operation is quiet, making it equally suited to bedrooms, living rooms, and offices.

Available in multiple colour finishes to match any interior. Backed by a 5-year brand warranty.`,

  specs: {
    'Blade Span':       '56 Inches (1400mm)',
    'Power':            '30W',
    'Air Delivery':     '8,200 CFM at 30W',
    'Motor Speed':      '315 RPM',
    'Number of Blades': '3',
    'Motor Type':       'Hybrid BLDC (Brushless DC) Inverter Motor',
    'Winding':          '99.9% Pure Copper Wire',
    'Insulation':       'Grade-E Varnish',
    'Compatible With':  'AC Mains, UPS, Solar Inverter, Battery',
    'Frequency':        '50 Hz',
    'Voltage':          '220V AC / DC Compatible',
    'Energy Saving':    'Up to 60% vs conventional fans',
  },

  tags:   'ceiling fan, inverter fan, BLDC fan, solar fan, energy saver fan, 30 watt fan, UPS fan, load shedding fan, GFC fan, GFC Ravi, 56 inch fan',
  colors: 'White, Off-White, Black, Gold, Silver, Brown',

  retail_price: 12500,
  cash_floor:   12500,
  min_price:    12500,

  warranty:     '5 Year Brand Warranty',
  stock_status: 'In Stock',
  featured:     false,

  thumbnail_url: '',
  gallery_urls:  [],

  seo_title:    'GFC Ravi 56" 30W Inverter Ceiling Fan | Reliance',
  seo_desc:     'Buy the GFC Ravi 56-inch 30W BLDC inverter ceiling fan. Delivers 8,200 CFM at just 30W, works on UPS/solar, 5-year warranty. Rs. 12,500.',
  seo_keywords: 'GFC Ravi fan, GFC inverter fan, 30 watt ceiling fan, BLDC ceiling fan pakistan, solar fan, energy saver ceiling fan, GFC 56 inch fan',

  system_role:          'none',
  compatibility_status: 'not_applicable',
  compatibility_notes:  'Inverter-compatible load appliance. Works on AC mains, UPS output, and solar inverter output. Not a solar system component.',
  requires_compatibility_review: false,
};

async function main() {
  if (DRY_RUN) {
    console.log('[DRY RUN] Would upsert:');
    console.log(JSON.stringify(product, null, 2));
    return;
  }

  console.log('Signing in as admin…');
  const { error: authErr } = await supabase.auth.signInWithPassword({
    email: ADMIN_EMAIL, password: ADMIN_PASSWORD,
  });
  if (authErr) { console.error('Auth failed:', authErr.message); process.exit(1); }

  console.log('Upserting GFC Ravi 56" Inverter Fan…');
  const { data, error } = await supabase
    .from('products')
    .upsert(product, { onConflict: 'id' })
    .select('id, brand, model, simplified_name, retail_price, warranty, taxonomy_status');

  if (error) { console.error('Upsert failed:', error.message); process.exit(1); }
  console.log('✅ Done:', data);
}

main().catch(err => { console.error(err); process.exit(1); });
