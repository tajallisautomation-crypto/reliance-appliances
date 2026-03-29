/**
 * insert_national_batch1_small_appliances.mjs
 * National brand small appliances from "Price List Updated (1).pdf" (Feb-26)
 *
 * BRAND NOTE: This price list uses numeric model numbers with Y/Price (dealer)
 * and W/Price (market/retail). Selling price = round(W/Price × 1.15 / 100) × 100
 *
 * ⚠ UPDATE brand name if confirmed (currently set to 'National')
 *
 * Run:  node insert_national_batch1_small_appliances.mjs [--dry-run]
 */
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const SUPABASE_URL      = 'https://fdfjavyopbrfvwtjaerw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDE3MDAsImV4cCI6MjA4ODIxNzcwMH0.fXwGFR_e3xZ4trEbkcH8UQ6_oWcIn92UUUvkGuFajto';
const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || 'tajallisautomation@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Hammad123!';
const DRY_RUN        = process.argv.includes('--dry-run');
// Pass --brand="Boss" etc. to override
const BRAND_ARG      = process.argv.find(a => a.startsWith('--brand='));
const BRAND          = BRAND_ARG ? BRAND_ARG.split('=')[1] : 'National';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const p100 = wPrice => Math.round(wPrice * 1.15 / 100) * 100;

// W/Price = market retail price from price list. Our price = W/Price × 1.15
const PRODUCTS = [
  // ── Hand Blenders ─────────────────────────────────────────────────────────────
  { model: '121', wPrice: 7450, cat: 'kitchen', sub: 'Hand Blender',
    simplified_name: `${BRAND} Hand Blender`,
    description: `The ${BRAND} Model 121 Hand Blender is a lightweight immersion blender for everyday blending tasks — soups, smoothies, sauces and purees. The stainless steel shaft is detachable for easy cleaning. Simple operation with a sturdy ergonomic grip. Available at Reliance Appliances, Karachi.`,
    specs: { Type: 'Immersion Hand Blender', Shaft: 'Detachable Stainless Steel Shaft', Controls: 'Single-Speed Button', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Warranty' },
    tags: `${BRAND.toLowerCase()}, model 121, hand blender, immersion blender, stick blender, karachi, installment, reliance appliances` },

  { model: '126', wPrice: 8025, cat: 'kitchen', sub: 'Hand Blender',
    simplified_name: `${BRAND} Hand Blender with Beater`,
    description: `The ${BRAND} Model 126 Hand Blender with Beater gives you two attachments — an immersion blending shaft for soups and smoothies, and a beater for whipping cream and cake batter. Variable speed control adapts to different tasks. Available at Reliance Appliances, Karachi.`,
    specs: { Type: 'Hand Blender + Beater', Attachments: 'Blending Shaft + Beater Whisk', Controls: 'Variable Speed', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Warranty' },
    tags: `${BRAND.toLowerCase()}, model 126, hand blender, beater, 2 in 1, karachi, installment, reliance appliances` },

  { model: '130', wPrice: 12175, cat: 'kitchen', sub: 'Hand Blender',
    simplified_name: `${BRAND} Hand Blender Beater Chopper & Vegetable Cutter 4-in-1`,
    description: `The ${BRAND} Model 130 is a complete 4-in-1 hand kitchen set: immersion blender, beater, chopper and vegetable cutter — all powered by one motor unit. Cover all daily prep tasks with one compact device. Available at Reliance Appliances, Karachi.`,
    specs: { Type: '4-in-1 Hand Blender Set', Attachments: 'Blending Shaft + Beater + Chopper + Vegetable Cutter', Controls: 'Variable Speed + Turbo', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Warranty' },
    tags: `${BRAND.toLowerCase()}, model 130, hand blender, beater, chopper, vegetable cutter, 4 in 1, karachi, installment, reliance appliances` },

  { model: '141', wPrice: 6350, cat: 'kitchen', sub: 'Hand Blender',
    simplified_name: `${BRAND} Hand Blender 500W Titanium Blade`,
    description: `The ${BRAND} Model 141 Hand Blender features a 500W AC motor with a titanium-coated blade for superior performance and longevity. Titanium blades stay sharper longer and handle fibrous, tough ingredients with ease. Available at Reliance Appliances, Karachi.`,
    specs: { Type: 'Hand Blender', Power: '500 Watts', 'Motor Type': 'AC Motor', Blade: 'Titanium-Coated Blade', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Warranty' },
    tags: `${BRAND.toLowerCase()}, model 141, hand blender, titanium blade, 500w, AC motor, karachi, installment, reliance appliances` },

  { model: '145', wPrice: 7200, cat: 'kitchen', sub: 'Hand Blender',
    simplified_name: `${BRAND} Hand Blender 1000W Titanium Blade DC Motor`,
    description: `The ${BRAND} Model 145 Hand Blender uses a 1000W DC motor for high torque and smooth blending of even the toughest ingredients. The titanium blade maintains its edge for years of daily use. Available at Reliance Appliances, Karachi.`,
    specs: { Type: 'Hand Blender', Power: '1000 Watts', 'Motor Type': 'DC Motor', Blade: 'Titanium Blade', Controls: 'Variable Speed', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Warranty' },
    tags: `${BRAND.toLowerCase()}, model 145, hand blender, 1000w, DC motor, titanium, karachi, installment, reliance appliances` },

  // ── Hand Mixers & Egg Beaters ─────────────────────────────────────────────────
  { model: '390 EX', wPrice: 6625, cat: 'kitchen', sub: 'Hand Mixer',
    simplified_name: `${BRAND} Egg Beater`,
    description: `The ${BRAND} Model 390 EX Egg Beater whips eggs, cream and batters to perfection with dual rotating stainless steel beaters. Multi-speed settings give precise control for every mixing task. Available at Reliance Appliances, Karachi.`,
    specs: { Type: 'Electric Egg Beater', Beaters: 'Dual Stainless Steel Beaters', Controls: 'Multi-Speed', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Warranty' },
    tags: `${BRAND.toLowerCase()}, model 390 EX, egg beater, hand mixer, baking, karachi, installment, reliance appliances` },

  { model: '392', wPrice: 6725, cat: 'kitchen', sub: 'Hand Mixer',
    simplified_name: `${BRAND} Hand Mixer`,
    description: `The ${BRAND} Model 392 Hand Mixer is a reliable electric mixer for cake batters, cream whipping and bread dough. Multiple speed settings and stainless steel beater attachments handle a range of mixing tasks. Available at Reliance Appliances, Karachi.`,
    specs: { Type: 'Electric Hand Mixer', Attachments: 'Stainless Steel Beaters', Controls: 'Multi-Speed', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Warranty' },
    tags: `${BRAND.toLowerCase()}, model 392, hand mixer, electric mixer, baking, karachi, installment, reliance appliances` },

  // ── Blenders & Grinders ───────────────────────────────────────────────────────
  { model: '644', wPrice: 7000, cat: 'kitchen', sub: 'Blender',
    simplified_name: `${BRAND} Grinder Wet & Dry`,
    description: `The ${BRAND} Model 644 Wet & Dry Grinder handles both wet grinding (chutneys, batters) and dry grinding (spices, coffee). The powerful motor and durable stainless steel blades process a wide range of ingredients efficiently. Available at Reliance Appliances, Karachi.`,
    specs: { Type: 'Wet & Dry Grinder', Blades: 'Stainless Steel', Functions: 'Wet Grinding + Dry Grinding', Controls: 'Multi-Speed', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Warranty' },
    tags: `${BRAND.toLowerCase()}, model 644, grinder, wet dry grinder, spice grinder, blender, karachi, installment, reliance appliances` },

  { model: '690 UB', wPrice: 6325, cat: 'kitchen', sub: 'Blender',
    simplified_name: `${BRAND} Blender & Grinder 2-in-1 Unbreakable 300W`,
    description: `The ${BRAND} Model 690 UB is a 2-in-1 blender and grinder with an unbreakable jar — resistant to accidental drops that would shatter ordinary plastic or glass. The 300W motor handles everyday blending and grinding tasks. Available at Reliance Appliances, Karachi.`,
    specs: { Type: '2-in-1 Blender + Grinder', Power: '300 Watts', Jar: 'Unbreakable Jar', Functions: 'Blend + Grind', Controls: 'Multi-Speed', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Warranty' },
    tags: `${BRAND.toLowerCase()}, model 690 UB, blender, grinder, unbreakable, 2 in 1, 300w, karachi, installment, reliance appliances` },

  { model: '695 UB', wPrice: 7000, cat: 'kitchen', sub: 'Blender',
    simplified_name: `${BRAND} Blender & Grinder 3-in-1 Unbreakable 300W`,
    description: `The ${BRAND} Model 695 UB adds a chopper to the 2-in-1 blender and grinder for a 3-in-1 unbreakable jar set. Blend, grind and chop with one motor unit and three durable unbreakable jars. Available at Reliance Appliances, Karachi.`,
    specs: { Type: '3-in-1 Blender + Grinder + Chopper', Power: '300 Watts', Jars: 'Unbreakable Jars', Functions: 'Blend + Grind + Chop', Controls: 'Multi-Speed', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Warranty' },
    tags: `${BRAND.toLowerCase()}, model 695 UB, blender, grinder, chopper, unbreakable, 3 in 1, 300w, karachi, installment, reliance appliances` },

  { model: '6130', wPrice: 9050, cat: 'kitchen', sub: 'Blender',
    simplified_name: `${BRAND} Blender & Grinder 2-in-1 SS Body Glass Jug`,
    description: `The ${BRAND} Model 6130 is a premium 2-in-1 blender and grinder with a stainless steel body and glass blending jug. The glass jug is odour-free and does not absorb colours from fruits and vegetables. The SS body is durable and hygienic. Available at Reliance Appliances, Karachi.`,
    specs: { Type: '2-in-1 Blender + Grinder', Body: 'Stainless Steel', 'Blending Jug': 'Premium Glass Jug', Functions: 'Blend + Grind', Controls: 'Multi-Speed', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Warranty' },
    tags: `${BRAND.toLowerCase()}, model 6130, blender, grinder, glass jug, stainless steel, karachi, installment, reliance appliances` },

  // ── Juicers ───────────────────────────────────────────────────────────────────
  { model: '76', wPrice: 10450, cat: 'kitchen', sub: 'Juicer',
    simplified_name: `${BRAND} Juicer 600W`,
    description: `The ${BRAND} Model 76 Juicer extracts fresh juice from a variety of fruits and vegetables with a powerful 600W motor. The stainless steel strainer cleanly separates juice from pulp, and the anti-drip spout prevents mess. Available at Reliance Appliances, Karachi.`,
    specs: { Type: 'Centrifugal Juicer', Power: '600 Watts', Strainer: 'Stainless Steel Strainer', 'Anti-Drip': 'Anti-Drip Spout', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Warranty' },
    tags: `${BRAND.toLowerCase()}, model 76, juicer, 600w, fruit juicer, centrifugal, karachi, installment, reliance appliances` },

  { model: '91', wPrice: 14300, cat: 'kitchen', sub: 'Juicer',
    simplified_name: `${BRAND} Juicer 600W Stainless Steel Body`,
    description: `The ${BRAND} Model 91 Juicer features a 600W motor and a premium stainless steel body for enhanced durability and a sleek kitchen aesthetic. The SS body resists corrosion and is easier to maintain than plastic. Available at Reliance Appliances, Karachi.`,
    specs: { Type: 'Centrifugal Juicer', Power: '600 Watts', Body: 'Stainless Steel', Strainer: 'Stainless Steel Strainer', 'Anti-Drip': 'Anti-Drip Spout', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Warranty' },
    tags: `${BRAND.toLowerCase()}, model 91, juicer, 600w, stainless steel, karachi, installment, reliance appliances` },

  // ── Air Fryers ────────────────────────────────────────────────────────────────
  { model: '2016', wPrice: 23650, cat: 'kitchen', sub: 'Air Fryer',
    simplified_name: `${BRAND} Air Fryer`,
    description: `The ${BRAND} Model 2016 Air Fryer uses rapid hot-air circulation for crispy, oil-free cooking. The non-stick basket and adjustable temperature controls handle a wide range of dishes from fries to grilled meats. Available at Reliance Appliances, Karachi.`,
    specs: { Type: 'Air Fryer', 'Cooking Method': 'Rapid Hot-Air Circulation', Controls: 'Adjustable Temperature + Timer', Basket: 'Non-Stick Removable Basket', Functions: 'Air Fry, Grill, Bake, Roast', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Warranty' },
    tags: `${BRAND.toLowerCase()}, model 2016, air fryer, oil free fryer, healthy cooking, karachi, installment, reliance appliances` },

  { model: '2017', wPrice: 29875, cat: 'kitchen', sub: 'Air Fryer',
    simplified_name: `${BRAND} Air Fryer`,
    description: `The ${BRAND} Model 2017 Air Fryer delivers powerful hot-air circulation for restaurant-quality results at home. The large non-stick basket accommodates family-sized portions. Adjustable temperature and timer controls make cooking precise and effortless. Available at Reliance Appliances, Karachi.`,
    specs: { Type: 'Air Fryer', 'Cooking Method': 'Rapid Hot-Air Circulation', Controls: 'Adjustable Temperature + 60-Min Timer', Basket: 'Large Non-Stick Basket', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Warranty' },
    tags: `${BRAND.toLowerCase()}, model 2017, air fryer, oil free, healthy, karachi, installment, reliance appliances` },

  { model: '2024', wPrice: 33350, cat: 'kitchen', sub: 'Air Fryer',
    simplified_name: `${BRAND} Air Fryer Large`,
    description: `The ${BRAND} Model 2024 Air Fryer is a large-capacity model for bigger families and more demanding cooking. Hot-air circulation technology delivers crispy, evenly cooked results with minimal oil. Available at Reliance Appliances, Karachi.`,
    specs: { Type: 'Air Fryer (Large)', 'Cooking Method': 'Rapid Hot-Air Circulation', Controls: 'Adjustable Temperature + Timer', Basket: 'XL Non-Stick Basket', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Warranty' },
    tags: `${BRAND.toLowerCase()}, model 2024, air fryer, large, family, karachi, installment, reliance appliances` },

  // ── Sandwich Makers ───────────────────────────────────────────────────────────
  { model: '1035', wPrice: 5850, cat: 'kitchen', sub: 'Sandwich Maker',
    simplified_name: `${BRAND} Sandwich Maker 750W`,
    description: `The ${BRAND} Model 1035 Sandwich Maker toasts and seals sandwiches in minutes with its non-stick triangular plates. The 750W heating element heats up quickly for fast results. Ideal for quick snacks, grilled cheese and toasted sandwiches. Available at Reliance Appliances, Karachi.`,
    specs: { Type: 'Sandwich Maker', Power: '750 Watts', Plates: 'Non-Stick Triangular Sandwich Plates', Controls: 'Ready Indicator Light', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Warranty' },
    tags: `${BRAND.toLowerCase()}, model 1035, sandwich maker, sandwich toaster, toastie, 750w, karachi, installment, reliance appliances` },

  { model: '1039C', wPrice: 10000, cat: 'kitchen', sub: 'Sandwich Maker',
    simplified_name: `${BRAND} Sandwich Waffle & Grill 3-in-1 750W`,
    description: `The ${BRAND} Model 1039C is a 3-in-1 cooking appliance with interchangeable plates for sandwiches, waffles and grilling. The 750W heating element and non-stick plates make cooking and cleanup easy. Switch between plate types to make crispy sandwiches, Belgian waffles or grilled meats. Available at Reliance Appliances, Karachi.`,
    specs: { Type: '3-in-1 Sandwich Maker / Waffle Iron / Grill', Power: '750 Watts', Plates: 'Interchangeable Non-Stick Plates (Sandwich + Waffle + Grill)', Functions: 'Sandwich, Waffle, Grill', Controls: 'Ready Indicator Light', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Warranty' },
    tags: `${BRAND.toLowerCase()}, model 1039C, sandwich maker, waffle maker, grill, 3 in 1, 750w, karachi, installment, reliance appliances` },

  // ── Deep Fryers ───────────────────────────────────────────────────────────────
  { model: '2012', wPrice: 16775, cat: 'kitchen', sub: 'Deep Fryer',
    simplified_name: `${BRAND} Deep Fryer 1800W`,
    description: `The ${BRAND} Model 2012 Deep Fryer delivers perfectly fried food with a powerful 1800W heating element that maintains consistent oil temperature for crispy, evenly cooked results. The large oil capacity handles generous portions, and the basket with cool-touch handle makes safe, drip-free oil removal easy. Available at Reliance Appliances, Karachi.`,
    specs: { Type: 'Deep Fryer', Power: '1800 Watts', Heating: 'Immersion Heating Element', Basket: 'Stainless Steel Basket with Cool-Touch Handle', 'Oil Capacity': 'Large Capacity', Controls: 'Adjustable Thermostat', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Warranty' },
    tags: `${BRAND.toLowerCase()}, model 2012, deep fryer, oil fryer, 1800w, karachi, installment, reliance appliances` },

  // ── Irons ─────────────────────────────────────────────────────────────────────
  { model: '1022', wPrice: 7250, cat: 'small', sub: 'Steam Iron',
    simplified_name: `${BRAND} Steam Iron 2200W`,
    description: `The ${BRAND} Model 1022 Steam Iron delivers powerful 2200W steam for fast, effective wrinkle removal. The stainless steel soleplate glides smoothly over all fabric types, and the variable steam control handles delicate and heavy fabrics alike. Available at Reliance Appliances, Karachi.`,
    specs: { Type: 'Steam Iron', Power: '2200 Watts', Soleplate: 'Stainless Steel', 'Steam Function': 'Continuous Steam + Spray', Controls: 'Variable Temperature + Steam', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Warranty' },
    tags: `${BRAND.toLowerCase()}, model 1022, steam iron, iron, 2200w, stainless steel, karachi, installment, reliance appliances` },

  { model: '2074', wPrice: 5025, cat: 'small', sub: 'Dry Iron',
    simplified_name: `${BRAND} Dry Iron`,
    description: `The ${BRAND} Model 2074 Dry Iron is a reliable everyday iron with a smooth non-stick soleplate and fabric thermostat. Lightweight and easy to use for daily ironing of all fabric types. Available at Reliance Appliances, Karachi.`,
    specs: { Type: 'Dry Iron', Soleplate: 'Non-Stick Soleplate', Controls: 'Variable Thermostat', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Warranty' },
    tags: `${BRAND.toLowerCase()}, model 2074, dry iron, clothes iron, karachi, installment, reliance appliances` },

  // ── Kettles ───────────────────────────────────────────────────────────────────
  { model: '4027', wPrice: 6300, cat: 'kitchen', sub: 'Kettle',
    simplified_name: `${BRAND} Kettle 1.7L Concealed Element`,
    description: `The ${BRAND} Model 4027 Electric Kettle has a 1.7-litre capacity and a concealed heating element for easy cleaning and a cleaner boil. Auto-shutoff and boil-dry protection ensure safe, worry-free operation. Available at Reliance Appliances, Karachi.`,
    specs: { Type: 'Electric Kettle', Capacity: '1.7 Litres', Element: 'Concealed Heating Element', 'Auto-Shutoff': 'Yes', 'Boil-Dry Protection': 'Yes', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Warranty' },
    tags: `${BRAND.toLowerCase()}, model 4027, kettle, electric kettle, 1.7 litre, concealed element, karachi, installment, reliance appliances` },

  { model: '4046', wPrice: 8300, cat: 'kitchen', sub: 'Kettle',
    simplified_name: `${BRAND} Steel Kettle 1.7L`,
    description: `The ${BRAND} Model 4046 Steel Electric Kettle combines a full stainless steel body with the convenience of an electric kettle. The 1.7-litre capacity boils quickly with auto-shutoff for safety. The steel body is durable and hygienic. Available at Reliance Appliances, Karachi.`,
    specs: { Type: 'Electric Kettle', Capacity: '1.7 Litres', Body: 'Stainless Steel Body', 'Auto-Shutoff': 'Yes', 'Boil-Dry Protection': 'Yes', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Warranty' },
    tags: `${BRAND.toLowerCase()}, model 4046, steel kettle, electric kettle, stainless steel, karachi, installment, reliance appliances` },
];

function buildSlug(brand, model) {
  return brand.toLowerCase() + '-' + model.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
}

async function main() {
  const { error: ae } = await supabase.auth.signInWithPassword({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  if (ae) { console.error('Auth failed:', ae.message); process.exit(1); }
  console.log(`Signed in. Using brand: "${BRAND}"\n`);

  const { data: existing } = await supabase.from('products').select('id, model').ilike('brand', BRAND);
  const existingModels = new Set((existing || []).map(p => p.model.toUpperCase().trim()));
  console.log(`Found ${existingModels.size} existing ${BRAND} products in DB.\n`);

  let inserted = 0, skipped = 0;
  for (const p of PRODUCTS) {
    if (existingModels.has(p.model.toUpperCase())) { console.log(`  SKIP  ${p.model}`); skipped++; continue; }
    const sell = p100(p.wPrice);
    console.log(`  ${DRY_RUN ? 'WOULD INSERT' : 'INSERT'}  ${BRAND} ${p.model}  →  PKR ${sell.toLocaleString('en-PK')}  (${p.simplified_name})`);
    if (!DRY_RUN) {
      const { error: e } = await supabase.from('products').insert({
        id: randomUUID(), brand: BRAND, model: p.model,
        simplified_name: p.simplified_name.replace(/\$\{BRAND\}/g, BRAND),
        category: p.cat, sub_category: p.sub,
        slug: buildSlug(BRAND, p.model),
        description: p.description, specs: p.specs, tags: p.tags,
        colors: '', retail_price: sell, cash_floor: sell,
        warranty: '1 Year Warranty', stock_status: 'In Stock',
        featured: false, thumbnail_url: null, gallery_urls: [],
        seo_title: `${BRAND} ${p.simplified_name} (Model ${p.model}) Price in Pakistan | Reliance Appliances Karachi`,
        seo_desc: `Buy ${BRAND} Model ${p.model} at Reliance Appliances Karachi. ${p.simplified_name}. Easy installments or cash. 1 Year Warranty.`,
        seo_keywords: p.tags, updated_at: new Date().toISOString(),
      });
      if (e) { console.error(`    ✗  ${e.message}`); continue; }
    }
    inserted++;
  }
  console.log(`\nDone. ${DRY_RUN ? 'DRY RUN — ' : ''}Inserted: ${inserted}  |  Skipped: ${skipped}`);
  console.log(`\n⚠  If brand name is wrong, re-run with: --brand="CorrectName"`);
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
