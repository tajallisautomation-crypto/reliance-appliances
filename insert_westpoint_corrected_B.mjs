/**
 * insert_westpoint_corrected_B.mjs
 * Food Processors, Choppers, Meat Grinders, Roti Maker, Dough Maker
 * (Verified models only from "Price List Updated (1).pdf")
 *
 * Source: Westpoint Price List (Feb-26)
 * Model format: numeric-only (matching existing Westpoint DB convention)
 * Price: round(W/Price × 1.15 / 100) × 100
 *
 * Run:  node insert_westpoint_corrected_B.mjs [--dry-run]
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
  // ── Kitchen Robots / Food Processors (verified in price list) ─────────────────
  { model: '2146UB', mrp: 9850, sub: 'Food Processor',
    name: 'Westpoint Kitchen Robot Unbreakable',
    desc: 'The Westpoint 2146UB Kitchen Robot is built with an unbreakable jug design for superior durability in daily kitchen use. This compact food processor chops, grinds and mixes with a range of attachments. The unbreakable bowl can withstand accidental drops that would shatter ordinary plastic or glass. A practical, long-lasting kitchen companion. Available at Reliance Appliances, Karachi.',
    specs: { Type: 'Kitchen Robot / Mini Food Processor', Bowl: 'Unbreakable Bowl', Blade: 'Stainless Steel', Controls: 'Multi-Speed', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, 2146UB, kitchen robot, food processor, unbreakable, chopper, westpoint food processor, karachi, installment, reliance appliances' },

  { model: '2150EX', mrp: 14475, sub: 'Food Processor',
    name: 'Westpoint Kitchen Robot',
    desc: 'The Westpoint 2150EX Kitchen Robot is a multi-function food processor designed to cover all your prep needs in one appliance. With multiple bowl sizes and blade options, it handles chopping, slicing, shredding, grating, pureeing and mixing. The powerful motor drives every attachment with consistent speed. Ideal for households that cook complex, multi-ingredient meals from scratch. Available at Reliance Appliances, Karachi.',
    specs: { Type: 'Kitchen Robot / Food Processor', Functions: 'Chop, Slice, Shred, Grate, Puree, Mix', Blade: 'Multiple Stainless Steel Blades & Discs', Controls: 'Multi-Speed', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, 2150EX, kitchen robot, food processor, multi function, westpoint food processor, karachi, installment, reliance appliances' },

  { model: '1041', mrp: 15500, sub: 'Food Processor',
    name: 'Westpoint Food Processor',
    desc: 'The Westpoint 1041 Food Processor is a full-featured appliance that streamlines meal preparation for busy households. The large-capacity bowl and diverse set of blades and discs handle slicing, shredding, chopping, pureeing and dough kneading. The powerful motor maintains consistent speed under load, ensuring uniform results with every use. Available at Reliance Appliances, Karachi.',
    specs: { Type: 'Full Food Processor', Bowl: 'Large Capacity Bowl', Functions: 'Slice, Shred, Chop, Puree, Knead Dough', Blades: 'Multiple Blades & Discs', Controls: 'Multi-Speed + Pulse', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, 1041, food processor, chopper, slicer, dough maker, westpoint food processor, karachi, installment, reliance appliances' },

  { model: '1141', mrp: 14675, sub: 'Food Processor',
    name: 'Westpoint Kitchen Chef 500W',
    desc: 'The Westpoint 1141 Kitchen Chef runs on a 500W motor to power through demanding food prep tasks efficiently. The comprehensive attachment set covers the full range of processing tasks — chopping, slicing, shredding, grating, and mixing. An ideal upgrade for households ready for more cooking efficiency and capacity. Available at Reliance Appliances, Karachi.',
    specs: { Type: 'Kitchen Chef / Food Processor', Power: '500 Watts', Functions: 'Chop, Slice, Shred, Grate, Mix', Blades: 'Multiple Stainless Steel Blades & Discs', Controls: 'Multi-Speed + Pulse', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, 1141, kitchen chef, food processor, 500w, chopper, slicer, westpoint food processor, karachi, installment, reliance appliances' },

  // ── Meat Grinders (verified in price list) ────────────────────────────────────
  { model: '2048', mrp: 16100, sub: 'Meat Grinder',
    name: 'Westpoint Meat Grinder (Mincer)',
    desc: 'The Westpoint 2048 Meat Grinder lets you grind fresh meat at home for keema, burgers, kebabs and sausages — knowing exactly what goes into your food. The powerful motor pushes meat through stainless steel grinding plates quickly and cleanly. Multiple plate sizes let you adjust the grind from coarse to fine. Far more hygienic and economical than buying pre-ground meat. Available at Reliance Appliances, Karachi.',
    specs: { Type: 'Electric Meat Grinder / Mincer', Plates: 'Multiple Stainless Steel Grinding Plates (Fine & Coarse)', Controls: 'On/Off / Reverse Switch', Use: 'Keema, Burgers, Kebabs, Sausages', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, 2048, meat grinder, mincer, keema maker, burger grinder, westpoint meat grinder, karachi, installment, reliance appliances' },

  { model: '2049', mrp: 17700, sub: 'Meat Grinder',
    name: 'Westpoint Meat Grinder with Vegetable Cutters',
    desc: 'The Westpoint 2049 Meat Grinder goes beyond meat processing — it includes vegetable cutter attachments for slicing and shredding vegetables too. One appliance handles keema, kofta preparation and vegetable prep. The powerful motor and stainless steel grinding components ensure efficient, hygienic results. Available at Reliance Appliances, Karachi.',
    specs: { Type: 'Meat Grinder + Vegetable Cutter', Plates: 'Stainless Steel Grinding Plates', Attachments: 'Vegetable Slicing & Shredding Discs', Controls: 'On/Off / Reverse', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, 2049, meat grinder, vegetable cutter, mincer, keema, westpoint meat grinder, karachi, installment, reliance appliances' },

  // ── Roti Maker & Dough Maker (verified in price list) ────────────────────────
  { model: '2029', mrp: 10900, sub: 'Roti Maker',
    name: 'Westpoint Roti Maker',
    desc: 'The Westpoint 2029 Roti Maker makes perfectly round, uniform rotis in seconds without the effort of rolling by hand. The non-stick cooking plates heat evenly and press the dough into a perfect circle every time. The compact design takes up minimal counter space, and the cool-touch handle ensures safe operation. A daily time-saver for Pakistani households. Available at Reliance Appliances, Karachi.',
    specs: { Type: 'Electric Roti Maker', Plates: 'Non-Stick Coated Heating Plates', Handle: 'Cool-Touch Handle', Controls: 'On/Off with Indicator Light', Use: 'Roti, Chapati, Paratha (Small)', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, 2029, roti maker, chapati maker, electric roti maker, westpoint roti maker, karachi, installment, reliance appliances' },

  { model: '2127', mrp: 12500, sub: 'Dough Maker',
    name: 'Westpoint Dough Maker',
    desc: 'The Westpoint 2127 Dough Maker takes the effort out of kneading dough for roti, naan, bread and pizza. The powerful motor kneads even stiff dough thoroughly in a fraction of the time it would take by hand. The large bowl capacity handles enough dough for the whole family in one batch. Consistent, well-kneaded dough every time leads to softer, better-tasting bread. Available at Reliance Appliances, Karachi.',
    specs: { Type: 'Electric Dough Maker', Bowl: 'Large Kneading Bowl', Motor: 'Powerful Kneading Motor', Use: 'Roti, Naan, Bread, Pizza Dough', Controls: 'On/Off with Timer', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, 2127, dough maker, atta maker, roti dough, bread maker, westpoint dough maker, karachi, installment, reliance appliances' },
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
    console.log(`  ${DRY_RUN ? 'WOULD INSERT' : 'INSERT'}  ${p.model}  →  PKR ${sell.toLocaleString('en-PK')}  (${p.name})`);
    if (!DRY_RUN) {
      const { error: e } = await supabase.from('products').insert({
        id: randomUUID(), brand: 'Westpoint', model: p.model,
        simplified_name: p.name, category: 'kitchen', sub_category: p.sub,
        slug: buildSlug(p.model), description: p.desc, specs: p.specs, tags: p.tags,
        colors: '', retail_price: sell, cash_floor: sell,
        warranty: '1 Year Westpoint Warranty', stock_status: 'In Stock',
        featured: false, thumbnail_url: null, gallery_urls: [],
        seo_title: `Westpoint ${p.name} (${p.model}) Price in Pakistan | Reliance Appliances Karachi`,
        seo_desc: `Buy Westpoint ${p.model} at Reliance Appliances Karachi. ${p.name}. Easy installments or cash. 1 Year Warranty.`,
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
