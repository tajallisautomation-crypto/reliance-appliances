/**
 * insert_westpoint_batch4_food_processors_choppers.mjs
 * Food Processors, Kitchen Robots, Choppers, Meat Grinders
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
  // ── Choppers ─────────────────────────────────────────────────────────────────
  {
    model: 'WF-1004', mrp: 6300,
    simplified_name: 'Westpoint Mini Electric Chopper',
    sub_category: 'Chopper',
    description: 'The Westpoint WF-1004 Mini Electric Chopper makes quick work of onions, herbs, garlic and small vegetables. The compact pull-cord or button mechanism delivers controlled, even chopping without over-processing. The removable stainless steel bowl is easy to clean. A must-have time-saver for daily meal prep. Available at Reliance Appliances, Karachi.',
    specs: { Type: 'Mini Electric Chopper', Bowl: 'Stainless Steel Chopping Bowl', Blade: 'Stainless Steel Blade', Controls: 'Push-Button / Pull-Cord Operation', Use: 'Onions, Herbs, Garlic, Small Vegetables', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, WF-1004, chopper, mini chopper, electric chopper, vegetable chopper, onion chopper, westpoint chopper, karachi, installment, reliance appliances',
  },
  {
    model: 'WF-1010', mrp: 9550,
    simplified_name: 'Westpoint Chopper 500W',
    sub_category: 'Chopper',
    description: 'The Westpoint WF-1010 is a powerful 500W electric chopper designed for frequent, heavy-duty chopping tasks. The high-capacity bowl and sharp stainless steel blades handle large quantities of onions, tomatoes, herbs and vegetables in seconds. The 500W motor powers through dense ingredients without stalling. Easy to disassemble for cleaning. Available at Reliance Appliances, Karachi.',
    specs: { Type: 'Electric Chopper', Power: '500 Watts', Bowl: 'Large Stainless Steel Bowl', Blade: 'Sharp Stainless Steel Blades', Controls: 'Pulse Button', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, WF-1010, chopper, 500w, powerful chopper, vegetable chopper, westpoint chopper, karachi, installment, reliance appliances',
  },
  {
    model: 'WF-1011', mrp: 11275,
    simplified_name: 'Westpoint Big Chopper with Vegetable Cutter',
    sub_category: 'Chopper',
    description: 'The Westpoint WF-1011 Big Chopper with Vegetable Cutter is a comprehensive prep tool for large families. The oversize bowl handles bulk chopping, while the vegetable cutter attachment slices and shreds vegetables into uniform pieces — perfect for salads, curries and stir-fries. Stainless steel blades and a robust motor handle daily heavy-duty use. Available at Reliance Appliances, Karachi.',
    specs: { Type: 'Big Chopper + Vegetable Cutter', Bowl: 'Large Capacity Chopping Bowl', Blade: 'Stainless Steel Multi-Blade', 'Vegetable Cutter': 'Slicing & Shredding Disc Included', Controls: 'Pulse Button', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, WF-1011, big chopper, vegetable cutter, chopper, slicer, westpoint chopper, karachi, installment, reliance appliances',
  },
  {
    model: 'WF-1013', mrp: 11825,
    simplified_name: 'Westpoint Big Chopper with Extra Bowl',
    sub_category: 'Chopper',
    description: 'The Westpoint WF-1013 Big Chopper comes with an extra bowl — meaning you can prep two different ingredients without washing up in between. Chop onions in one bowl and marinate meat in the other. The powerful motor and sharp stainless steel blades handle everything from soft tomatoes to hard nuts. Available at Reliance Appliances, Karachi.',
    specs: { Type: 'Big Chopper with Extra Bowl', Bowls: '2× Stainless Steel Bowls', Blade: 'Stainless Steel Multi-Blade', Controls: 'Pulse Button', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, WF-1013, chopper, extra bowl, big chopper, dual bowl, westpoint chopper, karachi, installment, reliance appliances',
  },

  // ── Kitchen Robots / Food Processors ─────────────────────────────────────────
  {
    model: 'WF-2146UB', mrp: 9850,
    simplified_name: 'Westpoint Kitchen Robot Unbreakable',
    sub_category: 'Food Processor',
    description: 'The Westpoint WF-2146UB Kitchen Robot is built with an unbreakable jug design for superior durability in daily kitchen use. This compact food processor chops, grinds and mixes with a range of attachments. The unbreakable bowl can withstand accidental drops that would shatter ordinary plastic or glass. A practical, long-lasting kitchen companion. Available at Reliance Appliances, Karachi.',
    specs: { Type: 'Kitchen Robot / Mini Food Processor', Bowl: 'Unbreakable Bowl', Blade: 'Stainless Steel', Controls: 'Multi-Speed', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, WF-2146UB, kitchen robot, food processor, unbreakable, chopper, westpoint food processor, karachi, installment, reliance appliances',
  },
  {
    model: 'WF-2150EX', mrp: 14475,
    simplified_name: 'Westpoint Kitchen Robot',
    sub_category: 'Food Processor',
    description: 'The Westpoint WF-2150EX Kitchen Robot is a multi-function food processor designed to cover all your prep needs in one appliance. With multiple bowl sizes and blade options, it handles chopping, slicing, shredding, grating, pureeing and mixing. The powerful motor drives every attachment with consistent speed. Ideal for households that cook complex, multi-ingredient meals from scratch. Available at Reliance Appliances, Karachi.',
    specs: { Type: 'Kitchen Robot / Food Processor', Functions: 'Chop, Slice, Shred, Grate, Puree, Mix', Blade: 'Multiple Stainless Steel Blades & Discs', Controls: 'Multi-Speed', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, WF-2150EX, kitchen robot, food processor, multi function, chopper, westpoint food processor, karachi, installment, reliance appliances',
  },
  {
    model: 'WF-1041', mrp: 15500,
    simplified_name: 'Westpoint Food Processor',
    sub_category: 'Food Processor',
    description: 'The Westpoint WF-1041 Food Processor is a full-featured appliance that streamlines meal preparation for busy households. The large-capacity bowl and diverse set of blades and discs handle slicing, shredding, chopping, pureeing and dough kneading. The powerful motor maintains consistent speed under load, ensuring uniform results with every use. Available at Reliance Appliances, Karachi.',
    specs: { Type: 'Full Food Processor', Bowl: 'Large Capacity Bowl', Functions: 'Slice, Shred, Chop, Puree, Knead Dough', Blades: 'Multiple Blades & Discs', Controls: 'Multi-Speed + Pulse', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, WF-1041, food processor, chopper, slicer, dough maker, westpoint food processor, karachi, installment, reliance appliances',
  },
  {
    model: 'WF-1141', mrp: 14675,
    simplified_name: 'Westpoint Kitchen Chef 500W',
    sub_category: 'Food Processor',
    description: 'The Westpoint WF-1141 Kitchen Chef runs on a 500W motor to power through demanding food prep tasks efficiently. The comprehensive attachment set covers the full range of processing tasks — chopping, slicing, shredding, grating, and mixing. An ideal upgrade for households ready for more cooking efficiency and capacity. Available at Reliance Appliances, Karachi.',
    specs: { Type: 'Kitchen Chef / Food Processor', Power: '500 Watts', Functions: 'Chop, Slice, Shred, Grate, Mix', Blades: 'Multiple Stainless Steel Blades & Discs', Controls: 'Multi-Speed + Pulse', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, WF-1141, kitchen chef, food processor, 500w, chopper, slicer, westpoint food processor, karachi, installment, reliance appliances',
  },
  {
    model: 'WF-3150', mrp: 16850,
    simplified_name: 'Westpoint Kitchen Robot 700W',
    sub_category: 'Food Processor',
    description: 'The Westpoint WF-3150 Kitchen Robot runs on a powerful 700W motor — enough to handle the toughest food prep tasks without overheating. Equipped with multiple blades and processing discs, it slices, shreds, chops, purees and kneads dough in minutes. The large-capacity bowl handles family-sized portions in one batch. A serious kitchen tool for serious cooks. Available at Reliance Appliances, Karachi.',
    specs: { Type: 'Kitchen Robot / Food Processor', Power: '700 Watts', Functions: 'Slice, Shred, Chop, Puree, Knead', Bowl: 'Large Capacity', Blades: 'Multiple Stainless Steel Blades & Discs', Controls: 'Multi-Speed + Pulse', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, WF-3150, kitchen robot, food processor, 700w, chopper, slicer, westpoint food processor, karachi, installment, reliance appliances',
  },
  {
    model: 'WF-3156', mrp: 22000,
    simplified_name: 'Westpoint Food Processor Premium',
    sub_category: 'Food Processor',
    description: 'The Westpoint WF-3156 is Westpoint\'s premium-tier food processor, delivering professional-level food prep performance at home. The high-power motor, large bowl and comprehensive blade set cover every task from delicate herb chopping to heavy bread-dough kneading. Premium build quality with durable plastic and stainless steel components designed for years of intensive use. Available at Reliance Appliances, Karachi.',
    specs: { Type: 'Premium Food Processor', Functions: 'Slice, Shred, Chop, Puree, Knead, Grate', Bowl: 'Extra-Large Capacity Bowl', Blades: 'Full Blade & Disc Set', Controls: 'Electronic Multi-Speed + Pulse', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, WF-3156, food processor, premium, large food processor, westpoint food processor, karachi, installment, reliance appliances',
  },

  // ── Meat Grinders ────────────────────────────────────────────────────────────
  {
    model: 'WF-2048', mrp: 16100,
    simplified_name: 'Westpoint Meat Grinder (Mincer)',
    sub_category: 'Meat Grinder',
    description: 'The Westpoint WF-2048 Meat Grinder lets you grind fresh meat at home for keema, burgers, kebabs and sausages — knowing exactly what goes into your food. The powerful motor pushes meat through stainless steel grinding plates quickly and cleanly. Multiple plate sizes let you adjust the grind from coarse to fine. Far more hygienic and economical than buying pre-ground meat. Available at Reliance Appliances, Karachi.',
    specs: { Type: 'Electric Meat Grinder / Mincer', Plates: 'Multiple Stainless Steel Grinding Plates (Fine & Coarse)', Controls: 'On/Off / Reverse Switch', Use: 'Keema, Burgers, Kebabs, Sausages', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, WF-2048, meat grinder, mincer, keema maker, burger grinder, westpoint meat grinder, karachi, installment, reliance appliances',
  },
  {
    model: 'WF-2049', mrp: 17700,
    simplified_name: 'Westpoint Meat Grinder with Vegetable Cutters',
    sub_category: 'Meat Grinder',
    description: 'The Westpoint WF-2049 Meat Grinder goes beyond meat processing — it includes vegetable cutter attachments for slicing and shredding vegetables too. One appliance handles keema, kofta preparation and vegetable prep. The powerful motor and stainless steel grinding components ensure efficient, hygienic results. Available at Reliance Appliances, Karachi.',
    specs: { Type: 'Meat Grinder + Vegetable Cutter', Plates: 'Stainless Steel Grinding Plates', Attachments: 'Vegetable Slicing & Shredding Discs', Controls: 'On/Off / Reverse', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, WF-2049, meat grinder, vegetable cutter, mincer, keema, westpoint meat grinder, karachi, installment, reliance appliances',
  },

  // ── Roti Maker & Dough Maker ──────────────────────────────────────────────────
  {
    model: 'WF-2029', mrp: 10900,
    simplified_name: 'Westpoint Roti Maker',
    sub_category: 'Roti Maker',
    description: 'The Westpoint WF-2029 Roti Maker makes perfectly round, uniform rotis in seconds without the effort of rolling by hand. The non-stick cooking plates heat evenly and press the dough into a perfect circle every time. The compact design takes up minimal counter space, and the cool-touch handle ensures safe operation. A daily time-saver for Pakistani households. Available at Reliance Appliances, Karachi.',
    specs: { Type: 'Electric Roti Maker', Plates: 'Non-Stick Coated Heating Plates', 'Handle': 'Cool-Touch Handle', Controls: 'On/Off with Indicator Light', Use: 'Roti, Chapati, Paratha (Small)', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, WF-2029, roti maker, chapati maker, electric roti maker, westpoint roti maker, karachi, installment, reliance appliances',
  },
  {
    model: 'WF-2127', mrp: 12500,
    simplified_name: 'Westpoint Dough Maker',
    sub_category: 'Dough Maker',
    description: 'The Westpoint WF-2127 Dough Maker takes the effort out of kneading dough for roti, naan, bread and pizza. The powerful motor kneads even stiff dough thoroughly in a fraction of the time it would take by hand. The large bowl capacity handles enough dough for the whole family in one batch. Consistent, well-kneaded dough every time leads to softer, better-tasting bread. Available at Reliance Appliances, Karachi.',
    specs: { Type: 'Electric Dough Maker', Bowl: 'Large Kneading Bowl', Motor: 'Powerful Kneading Motor', Use: 'Roti, Naan, Bread, Pizza Dough', Controls: 'On/Off with Timer', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, WF-2127, dough maker, atta maker, roti dough, bread maker, westpoint dough maker, karachi, installment, reliance appliances',
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
        simplified_name: p.simplified_name, category: 'kitchen', sub_category: p.sub_category,
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
