/**
 * insert_westpoint_batch5_irons_steamers.mjs
 * Dry Irons, Steam Irons, Garment Steamers
 * Source: Westpoint Karachi Price List 10-Mar-26
 * Price = round(MRP × 1.15 / 100) × 100
 */
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const SUPABASE_URL      = 'https://fdfjavyopbrfvwtjaerw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDE3MDAsImV4cCI6MjA4ODIxNzcwMH0.fXwGFR_e3xZ4trEbkcH8UQ6_oWcIn92UUUvkGuFajto';
const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || 'tajallisautomation@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Hammad123!';
const DRY_RUN        = process.argv.includes('--dry-run');

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const p100 = n => Math.round(n * 1.15 / 100) * 100;

const PRODUCTS = [
  // ── Dry Irons ────────────────────────────────────────────────────────────────
  {
    model: 'WF-729', mrp: 3050,
    simplified_name: 'Westpoint Dry Iron',
    sub_category: 'Dry Iron',
    description: 'The Westpoint WF-729 Dry Iron delivers reliable, everyday ironing performance at an accessible price. The heated soleplate glides smoothly over fabrics, removing wrinkles efficiently. The variable thermostat covers all common fabric types from delicate synthetics to heavy cotton and linen. Lightweight and easy to handle for quick daily ironing. Available at Reliance Appliances, Karachi.',
    specs: { Type: 'Dry Iron', Soleplate: 'Non-Stick Coated Soleplate', Controls: 'Variable Thermostat (Fabric Settings)', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, WF-729, dry iron, iron, clothes iron, westpoint iron, karachi, installment, reliance appliances',
  },
  {
    model: 'WF-729A', mrp: 3500,
    simplified_name: 'Westpoint Dry Iron',
    sub_category: 'Dry Iron',
    description: 'The Westpoint WF-729A Dry Iron is a dependable everyday iron with a smooth non-stick soleplate and fabric thermostat. The ergonomic handle reduces hand fatigue during extended ironing sessions. Simple and effective — everything you need for crisp, wrinkle-free clothes. Available at Reliance Appliances, Karachi.',
    specs: { Type: 'Dry Iron', Soleplate: 'Non-Stick Soleplate', Handle: 'Ergonomic Cool-Touch Handle', Controls: 'Variable Thermostat', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, WF-729A, dry iron, iron, clothes iron, westpoint iron, karachi, installment, reliance appliances',
  },
  {
    model: 'WF-729EX', mrp: 4500,
    simplified_name: 'Westpoint Dry Iron EX',
    sub_category: 'Dry Iron',
    description: 'The Westpoint WF-729EX Dry Iron EX features an enhanced non-stick soleplate that glides even more smoothly over all fabric types. The improved heat distribution ensures even ironing without hot spots, protecting delicate fabrics. A step up in quality and performance from the standard range. Available at Reliance Appliances, Karachi.',
    specs: { Type: 'Dry Iron — EX Series', Soleplate: 'Enhanced Non-Stick Soleplate', 'Heat Distribution': 'Even Heat Distribution Technology', Controls: 'Variable Thermostat', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, WF-729EX, dry iron, iron, EX series, westpoint iron, karachi, installment, reliance appliances',
  },
  {
    model: 'WF-716', mrp: 5500,
    simplified_name: 'Westpoint Dry Iron 1000W',
    sub_category: 'Dry Iron',
    description: 'The Westpoint WF-716 Dry Iron packs a powerful 1000W heating element for faster heat-up and more effective wrinkle removal, even in heavy fabrics like jeans and linen. The durable non-stick soleplate slides effortlessly across all fabric types, and the variable thermostat lets you match the heat precisely to the fabric. Available at Reliance Appliances, Karachi.',
    specs: { Type: 'Dry Iron', Power: '1000 Watts', Soleplate: 'Durable Non-Stick Soleplate', Controls: 'Variable Thermostat (Fabric Settings)', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, WF-716, dry iron, 1000w, powerful iron, clothes iron, westpoint iron, karachi, installment, reliance appliances',
  },

  // ── Steam Irons ───────────────────────────────────────────────────────────────
  {
    model: 'WF-735', mrp: 6500,
    simplified_name: 'Westpoint Steam Iron 2200W',
    sub_category: 'Steam Iron',
    description: 'The Westpoint WF-735 Steam Iron combines powerful 2200W heating with continuous steam to tackle even the most stubborn wrinkles. Steam penetrates deep into fabric fibres, relaxing them quickly for smooth, professional results. The variable steam control and spray function handle delicate fabrics and heavily creased garments with equal ease. The stainless steel soleplate glides smoothly and resists scratches. Available at Reliance Appliances, Karachi.',
    specs: { Type: 'Steam Iron', Power: '2200 Watts', Soleplate: 'Stainless Steel Soleplate', 'Steam Function': 'Continuous Steam + Burst of Steam', 'Spray': 'Water Spray Function', 'Water Tank': 'Removable Water Tank', Controls: 'Variable Temperature + Steam Control', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, WF-735, steam iron, iron, 2200w, stainless steel soleplate, westpoint steam iron, karachi, installment, reliance appliances',
  },
  {
    model: 'WF-735EX', mrp: 7200,
    simplified_name: 'Westpoint Steam Iron 2200W EX',
    sub_category: 'Steam Iron',
    description: 'The Westpoint WF-735EX Steam Iron EX delivers superior 2200W steam ironing performance with an enhanced soleplate and improved steam distribution. The EX series features more steam holes for wider steam coverage and faster wrinkle removal. The precision thermostat and anti-drip system protect delicate fabrics from water spots. Available at Reliance Appliances, Karachi.',
    specs: { Type: 'Steam Iron — EX Series', Power: '2200 Watts', Soleplate: 'Enhanced Non-Stick Soleplate', 'Steam Distribution': 'Wide Multi-Hole Steam Distribution', 'Anti-Drip': 'Anti-Drip System', 'Steam Function': 'Continuous Steam + Vertical Steam', Controls: 'Variable Temperature + Steam', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, WF-735EX, steam iron, 2200w, EX series, anti-drip, westpoint steam iron, karachi, installment, reliance appliances',
  },
  {
    model: 'WF-735T', mrp: 8100,
    simplified_name: 'Westpoint Steam Iron 2400W Titanium',
    sub_category: 'Steam Iron',
    description: 'The Westpoint WF-735T Steam Iron features a titanium-coated soleplate — the hardest and most scratch-resistant soleplate material available. The 2400W heating element delivers powerful, rapid steam for fast, effective ironing. Titanium soleplates also distribute heat more evenly for streak-free results on all fabrics, from silk to denim. Available at Reliance Appliances, Karachi.',
    specs: { Type: 'Steam Iron — Titanium Series', Power: '2400 Watts', Soleplate: 'Titanium-Coated Soleplate (Ultra Scratch-Resistant)', 'Steam Function': 'High-Pressure Steam + Vertical Steam', 'Anti-Drip': 'Anti-Drip System', Controls: 'Variable Temperature + Steam Control', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, WF-735T, steam iron, titanium soleplate, 2400w, premium iron, westpoint steam iron, karachi, installment, reliance appliances',
  },

  // ── Garment Steamers ──────────────────────────────────────────────────────────
  {
    model: 'WF-938', mrp: 7650,
    simplified_name: 'Westpoint Handy Garment Steamer 1600W',
    sub_category: 'Garment Steamer',
    description: 'The Westpoint WF-938 Handy Garment Steamer freshens and de-wrinkles clothes in seconds — no ironing board required. Simply hang your garment and glide the steamer head over it for instant, crease-free results. The 1600W heating element produces continuous steam quickly after a short heat-up time. Gentle enough for delicate fabrics like silk and chiffon. Ideal for suits, formal wear and curtains. Available at Reliance Appliances, Karachi.',
    specs: { Type: 'Handy Garment Steamer', Power: '1600 Watts', 'Heat-Up Time': 'Approx. 40 Seconds', 'Steam Output': 'Continuous Steam', 'Water Tank': 'Detachable Water Tank', Use: 'All Fabrics — Suits, Silk, Chiffon, Curtains', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, WF-938, garment steamer, clothes steamer, handy steamer, 1600w, fabric steamer, westpoint steamer, karachi, installment, reliance appliances',
  },
  {
    model: 'WF-938EX', mrp: 8900,
    simplified_name: 'Westpoint Handy Garment Steamer 2100W',
    sub_category: 'Garment Steamer',
    description: 'The Westpoint WF-938EX Handy Garment Steamer is the more powerful version of the WF-938, running at 2100W for faster heat-up and more intense continuous steam output. The higher steam pressure penetrates fabrics more effectively, making it ideal for thicker materials like wool, denim and blazers. Ready to use in under 30 seconds. Available at Reliance Appliances, Karachi.',
    specs: { Type: 'Handy Garment Steamer', Power: '2100 Watts', 'Heat-Up Time': 'Under 30 Seconds', 'Steam Output': 'High-Pressure Continuous Steam', 'Water Tank': 'Detachable Water Tank', Use: 'All Fabrics Including Heavy Materials', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, WF-938EX, garment steamer, clothes steamer, 2100w, handy steamer, westpoint steamer, karachi, installment, reliance appliances',
  },
  {
    model: 'WF-939', mrp: 18450,
    simplified_name: 'Westpoint Upright Garment Steamer',
    sub_category: 'Garment Steamer',
    description: 'The Westpoint WF-939 Upright Garment Steamer is a floor-standing professional steamer for de-wrinkling and refreshing entire wardrobes quickly. The large water tank provides extended continuous steaming sessions without refilling. The tall garment hanger holds clothes at the perfect height for efficient top-to-bottom steaming. Ideal for boutiques, tailoring shops and households with large ironing needs. Available at Reliance Appliances, Karachi.',
    specs: { Type: 'Upright / Floor Standing Garment Steamer', 'Water Tank': 'Large Capacity Tank (Extended Sessions)', 'Garment Hanger': 'Built-In Tall Garment Hanger', 'Steam Output': 'Continuous High-Pressure Steam', Use: 'All Fabrics, Curtains, Suits, Formal Wear', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, WF-939, upright garment steamer, floor steamer, professional steamer, clothes steamer, westpoint steamer, karachi, installment, reliance appliances',
  },
];

function buildSlug(model) {
  return 'westpoint-' + model.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
}

async function main() {
  const { error: ae } = await supabase.auth.signInWithPassword({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  if (ae) { console.error('Auth failed:', ae.message); process.exit(1); }
  console.log('Signed in.\n');

  const { data: existing } = await supabase.from('products').select('id, model').ilike('brand', 'westpoint');
  const existingModels = new Set((existing || []).map(p => p.model.toUpperCase().trim()));
  console.log(`Found ${existingModels.size} existing Westpoint products in DB.\n`);

  let inserted = 0, skipped = 0;
  for (const p of PRODUCTS) {
    if (existingModels.has(p.model.toUpperCase())) { console.log(`  SKIP  ${p.model}`); skipped++; continue; }
    const sell = p100(p.mrp);
    console.log(`  ${DRY_RUN ? 'WOULD INSERT' : 'INSERT'}  ${p.model}  →  PKR ${sell.toLocaleString('en-PK')}  (${p.simplified_name})`);
    if (!DRY_RUN) {
      const { error: e } = await supabase.from('products').insert({
        id: randomUUID(), brand: 'Westpoint', model: p.model,
        simplified_name: p.simplified_name, category: 'small', sub_category: p.sub_category,
        slug: buildSlug(p.model), description: p.description, specs: p.specs, tags: p.tags,
        colors: '', retail_price: sell, cash_floor: sell,
        warranty: '1 Year Westpoint Warranty', stock_status: 'In Stock',
        featured: false, thumbnail_url: null, gallery_urls: [],
        seo_title: `Westpoint ${p.simplified_name} (${p.model}) Price in Pakistan | Reliance Appliances Karachi`,
        seo_desc: `Buy the Westpoint ${p.model} at Reliance Appliances Karachi. ${p.simplified_name}. Easy installments or cash. 1 Year Warranty.`,
        seo_keywords: p.tags, updated_at: new Date().toISOString(),
      });
      if (e) { console.error(`    ✗  ${e.message}`); continue; }
    }
    inserted++;
  }
  console.log(`\nDone. ${DRY_RUN ? 'DRY RUN — ' : ''}Inserted: ${inserted}  |  Skipped: ${skipped}`);
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
