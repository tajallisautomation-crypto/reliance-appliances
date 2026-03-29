/**
 * insert_westpoint_batch1_airfryers.mjs
 * Inserts Westpoint Air Fryer product listings into the DB.
 *
 * Data source: "Market price List -2026 (1).pdf" (Karachi Westpoint, 10-Mar-26)
 * Pricing rule: selling_price = round(MRP × 1.15 / 100) × 100
 *
 * Run:  node insert_westpoint_batch1_airfryers.mjs [--dry-run]
 */

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const SUPABASE_URL      = 'https://fdfjavyopbrfvwtjaerw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDE3MDAsImV4cCI6MjA4ODIxNzcwMH0.fXwGFR_e3xZ4trEbkcH8UQ6_oWcIn92UUUvkGuFajto';
const ADMIN_EMAIL       = process.env.ADMIN_EMAIL    || 'tajallisautomation@gmail.com';
const ADMIN_PASSWORD    = process.env.ADMIN_PASSWORD || 'Hammad123!';
const DRY_RUN           = process.argv.includes('--dry-run');

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const roundTo100 = n => Math.round(n / 100) * 100;
const price = mrp => roundTo100(mrp * 1.15);

// ─── Air Fryer product data ────────────────────────────────────────────────────
// Source: Westpoint Karachi Price List, 10-Mar-26
// All prices are MRP (dealer/trade price). Selling price = MRP × 1.15.

const PRODUCTS = [
  {
    model: 'WF-5253',
    mrp: 23300,
    simplified_name: 'Westpoint Air Fryer 3.5L',
    description: 'The Westpoint WF-5253 Air Fryer uses rapid hot-air circulation technology to fry, grill, bake and roast with up to 80% less oil than traditional frying. With a 3.5-litre basket capacity it handles everyday meals for 2–3 people with ease. The adjustable thermostat and 60-minute timer give you precise control, while the non-stick removable basket makes clean-up effortless. Compact design fits comfortably on any kitchen counter. Available at Reliance Appliances, Karachi — on cash or easy installments.',
    specs: {
      Capacity: '3.5 Litres',
      Power: '1500 Watts',
      'Cooking Method': 'Rapid Hot-Air Circulation (Oil-Free / Low-Oil)',
      'Temperature Range': '80°C – 200°C',
      Timer: 'Up to 60 Minutes with Auto-Shutoff',
      Controls: 'Manual Thermostat & Timer Knobs',
      Functions: 'Air Fry, Grill, Bake, Roast',
      Basket: 'Non-Stick Removable Basket',
      'Power Supply': '220V / 50Hz',
      Warranty: '1 Year Westpoint Warranty',
    },
    sub_category: 'Air Fryer',
    tags: 'westpoint, WF-5253, air fryer, oil free fryer, healthy cooking, kitchen appliance, westpoint air fryer, air fryer karachi, air fryer pakistan, installment, reliance appliances',
  },
  {
    model: 'WF-5254',
    mrp: 23300,
    simplified_name: 'Westpoint Air Fryer 3.5L',
    description: 'The Westpoint WF-5254 Air Fryer delivers crispy, delicious results with up to 80% less oil using rapid hot-air circulation. Its 3.5-litre basket is ideal for small to medium families. Adjustable temperature and timer controls let you cook everything from French fries to grilled chicken with precision. The cool-touch exterior and non-stick basket ensure safe, easy use and cleanup. Available at Reliance Appliances, Karachi — on cash or easy installments.',
    specs: {
      Capacity: '3.5 Litres',
      Power: '1500 Watts',
      'Cooking Method': 'Rapid Hot-Air Circulation (Oil-Free / Low-Oil)',
      'Temperature Range': '80°C – 200°C',
      Timer: 'Up to 60 Minutes with Auto-Shutoff',
      Controls: 'Manual Thermostat & Timer Knobs',
      Functions: 'Air Fry, Grill, Bake, Roast',
      Basket: 'Non-Stick Removable Basket',
      'Power Supply': '220V / 50Hz',
      Warranty: '1 Year Westpoint Warranty',
    },
    sub_category: 'Air Fryer',
    tags: 'westpoint, WF-5254, air fryer, oil free fryer, healthy cooking, kitchen appliance, westpoint air fryer, air fryer karachi, air fryer pakistan, installment, reliance appliances',
  },
  {
    model: 'WF-5255',
    mrp: 23300,
    simplified_name: 'Westpoint Air Fryer 3.5L (New Model)',
    description: 'The Westpoint WF-5255 is an updated air fryer model combining Westpoint\'s trusted rapid hot-air technology with a refreshed design. The 3.5-litre non-stick basket handles everyday frying, baking and grilling for 2–3 people. Simple dial controls make it effortless to set the ideal temperature and cooking time. Enjoy healthier, oil-free meals at home without compromise. Available at Reliance Appliances, Karachi — on cash or easy installments.',
    specs: {
      Capacity: '3.5 Litres',
      Power: '1500 Watts',
      'Cooking Method': 'Rapid Hot-Air Circulation (Oil-Free / Low-Oil)',
      'Temperature Range': '80°C – 200°C',
      Timer: 'Up to 60 Minutes with Auto-Shutoff',
      Controls: 'Manual Thermostat & Timer Knobs',
      Functions: 'Air Fry, Grill, Bake, Roast',
      Basket: 'Non-Stick Removable Basket',
      'Design': 'New Model — Updated Exterior Design',
      'Power Supply': '220V / 50Hz',
      Warranty: '1 Year Westpoint Warranty',
    },
    sub_category: 'Air Fryer',
    tags: 'westpoint, WF-5255, air fryer, new model, oil free fryer, healthy cooking, kitchen appliance, westpoint air fryer, air fryer karachi, air fryer pakistan, installment, reliance appliances',
  },
  {
    model: 'WF-5256',
    mrp: 23300,
    simplified_name: 'Westpoint Air Fryer 3.5L',
    description: 'Cook your favourite foods with up to 80% less oil using the Westpoint WF-5256 Air Fryer. Its rapid hot-air circulation technology ensures a crispy exterior and juicy interior every time. The 3.5-litre basket accommodates meals for 2–3 people, while the intuitive manual controls make temperature and timer adjustments simple. The dishwasher-safe non-stick basket simplifies cleanup. Available at Reliance Appliances, Karachi — on cash or easy installments.',
    specs: {
      Capacity: '3.5 Litres',
      Power: '1500 Watts',
      'Cooking Method': 'Rapid Hot-Air Circulation (Oil-Free / Low-Oil)',
      'Temperature Range': '80°C – 200°C',
      Timer: 'Up to 60 Minutes with Auto-Shutoff',
      Controls: 'Manual Thermostat & Timer Knobs',
      Functions: 'Air Fry, Grill, Bake, Roast',
      Basket: 'Non-Stick Removable Basket',
      'Power Supply': '220V / 50Hz',
      Warranty: '1 Year Westpoint Warranty',
    },
    sub_category: 'Air Fryer',
    tags: 'westpoint, WF-5256, air fryer, oil free fryer, healthy cooking, kitchen appliance, westpoint air fryer, air fryer karachi, air fryer pakistan, installment, reliance appliances',
  },
  {
    model: 'WF-4256',
    mrp: 26000,
    simplified_name: 'Westpoint Air Fryer 4L',
    description: 'The Westpoint WF-4256 Air Fryer offers a 4-litre cooking basket — the perfect size for families of 3–4. Rapid hot-air technology circulates heat evenly around food to deliver restaurant-style results with a fraction of the oil. Set your preferred temperature up to 200°C and let the 60-minute timer manage the rest. The removable non-stick basket and drip tray are easy to clean. A healthier, faster, and more energy-efficient alternative to traditional frying. Available at Reliance Appliances, Karachi.',
    specs: {
      Capacity: '4.0 Litres',
      Power: '1700 Watts',
      'Cooking Method': 'Rapid Hot-Air Circulation (Oil-Free / Low-Oil)',
      'Temperature Range': '80°C – 200°C',
      Timer: 'Up to 60 Minutes with Auto-Shutoff',
      Controls: 'Manual Thermostat & Timer Knobs',
      Functions: 'Air Fry, Grill, Bake, Roast',
      Basket: 'Non-Stick Removable Basket with Drip Tray',
      'Power Supply': '220V / 50Hz',
      Warranty: '1 Year Westpoint Warranty',
    },
    sub_category: 'Air Fryer',
    tags: 'westpoint, WF-4256, air fryer, 4 litre air fryer, oil free fryer, healthy cooking, westpoint air fryer, air fryer karachi, air fryer pakistan, installment, reliance appliances',
  },
  {
    model: 'WF-4257',
    mrp: 28500,
    simplified_name: 'Westpoint Air Fryer 4.5L',
    description: 'The Westpoint WF-4257 Air Fryer features a generous 4.5-litre basket suitable for families of 4–5. Its powerful 1700W heating element and rapid air circulation deliver crispy, evenly cooked results in minutes — from fries and nuggets to samosas and grilled chicken — all with minimal oil. The manual thermostat (80–200°C) and 60-minute timer with auto-shutoff give you complete cooking control. The non-stick, dishwasher-safe basket makes cleanup quick and easy. Available at Reliance Appliances, Karachi.',
    specs: {
      Capacity: '4.5 Litres',
      Power: '1700 Watts',
      'Cooking Method': 'Rapid Hot-Air Circulation (Oil-Free / Low-Oil)',
      'Temperature Range': '80°C – 200°C',
      Timer: 'Up to 60 Minutes with Auto-Shutoff',
      Controls: 'Manual Thermostat & Timer Knobs',
      Functions: 'Air Fry, Grill, Bake, Roast',
      Basket: 'Non-Stick Removable Basket',
      'Cool Touch': 'Cool-Touch Exterior Handle',
      'Power Supply': '220V / 50Hz',
      Warranty: '1 Year Westpoint Warranty',
    },
    sub_category: 'Air Fryer',
    tags: 'westpoint, WF-4257, air fryer, 4.5 litre air fryer, oil free fryer, healthy frying, westpoint air fryer, air fryer karachi, air fryer pakistan, installment, reliance appliances',
  },
  {
    model: 'WF-4259',
    mrp: 29000,
    simplified_name: 'Westpoint Deluxe Air Fryer 4.5L',
    description: 'The Westpoint WF-4259 Deluxe Air Fryer elevates everyday cooking with premium features in a sleek, compact design. The 4.5-litre non-stick basket handles meals for the whole family, while rapid hot-air circulation ensures crispy, golden results with up to 80% less oil. The Deluxe designation brings a refined exterior finish and enhanced heat distribution for consistent performance. Adjustable temperature (80–200°C) and a 60-minute timer with auto-shutoff keep cooking precise and safe. Available at Reliance Appliances, Karachi.',
    specs: {
      Capacity: '4.5 Litres',
      Power: '1700 Watts',
      'Cooking Method': 'Rapid Hot-Air Circulation (Oil-Free / Low-Oil)',
      'Temperature Range': '80°C – 200°C',
      Timer: 'Up to 60 Minutes with Auto-Shutoff',
      Controls: 'Manual Thermostat & Timer Knobs',
      Functions: 'Air Fry, Grill, Bake, Roast',
      Series: 'Deluxe',
      Basket: 'Non-Stick Removable Basket',
      'Power Supply': '220V / 50Hz',
      Warranty: '1 Year Westpoint Warranty',
    },
    sub_category: 'Air Fryer',
    tags: 'westpoint, WF-4259, deluxe air fryer, air fryer, oil free fryer, healthy cooking, westpoint air fryer, air fryer karachi, air fryer pakistan, installment, reliance appliances',
  },
  {
    model: 'WF-4258',
    mrp: 33000,
    simplified_name: 'Westpoint Air Fryer 5.5L',
    description: 'The Westpoint WF-4258 Air Fryer is designed for larger families and bigger appetites. Its spacious 5.5-litre basket accommodates whole chickens, large trays of fries, or multiple servings at once. The 1800W heating element with rapid hot-air technology cooks food evenly and quickly — crispy on the outside, tender on the inside — with up to 80% less oil. Temperature control up to 200°C and a 60-minute timer with auto-shutoff ensure precise cooking. Available at Reliance Appliances, Karachi.',
    specs: {
      Capacity: '5.5 Litres',
      Power: '1800 Watts',
      'Cooking Method': 'Rapid Hot-Air Circulation (Oil-Free / Low-Oil)',
      'Temperature Range': '80°C – 200°C',
      Timer: 'Up to 60 Minutes with Auto-Shutoff',
      Controls: 'Manual Thermostat & Timer Knobs',
      Functions: 'Air Fry, Grill, Bake, Roast',
      Basket: 'Large Non-Stick Removable Basket',
      'Power Supply': '220V / 50Hz',
      Warranty: '1 Year Westpoint Warranty',
    },
    sub_category: 'Air Fryer',
    tags: 'westpoint, WF-4258, air fryer, 5.5 litre air fryer, large air fryer, oil free fryer, westpoint air fryer, air fryer karachi, air fryer pakistan, installment, reliance appliances',
  },
  {
    model: 'WF-5257',
    mrp: 35000,
    simplified_name: 'Westpoint Air Fryer 6L',
    description: 'Cook for the whole family with the Westpoint WF-5257 — a premium 6-litre air fryer built for large households and frequent entertaining. The powerful 2000W heating element combined with rapid hot-air circulation delivers perfectly crispy results on everything from samosas and pakoras to whole roasts and baked goods — all with minimal oil. The spacious basket fits a full tray of wings or a medium-sized chicken. Precise temperature control (80–200°C) and a 60-minute auto-shutoff timer make cooking effortless. Available at Reliance Appliances, Karachi.',
    specs: {
      Capacity: '6.0 Litres',
      Power: '2000 Watts',
      'Cooking Method': 'Rapid Hot-Air Circulation (Oil-Free / Low-Oil)',
      'Temperature Range': '80°C – 200°C',
      Timer: 'Up to 60 Minutes with Auto-Shutoff',
      Controls: 'Manual Thermostat & Timer Knobs',
      Functions: 'Air Fry, Grill, Bake, Roast',
      Basket: 'XL Non-Stick Removable Basket',
      'Viewing Window': 'Yes',
      'Power Supply': '220V / 50Hz',
      Warranty: '1 Year Westpoint Warranty',
    },
    sub_category: 'Air Fryer',
    tags: 'westpoint, WF-5257, air fryer, 6 litre air fryer, large family air fryer, oil free fryer, westpoint air fryer, air fryer karachi, air fryer pakistan, installment, reliance appliances',
  },
  {
    model: 'WF-5258',
    mrp: 36400,
    simplified_name: 'Westpoint Air Fryer Oven',
    description: 'The Westpoint WF-5258 Air Fryer Oven combines the power of an air fryer with the versatility of a full countertop oven. Its large capacity accommodates bigger meals and multiple cooking modes — air fry, bake, grill, toast and roast — all in one appliance. The dual heating elements ensure rapid, even heat distribution throughout the cooking chamber. Ideal for families who want maximum cooking flexibility with minimum oil. The removable crumb tray and non-stick interior simplify cleaning. Available at Reliance Appliances, Karachi.',
    specs: {
      Type: 'Air Fryer Oven (Countertop)',
      Capacity: '10 Litres',
      Power: '2000 Watts',
      'Cooking Method': 'Rapid Hot-Air Circulation + Radiant Heating',
      'Temperature Range': '80°C – 230°C',
      Timer: 'Up to 60 Minutes with Auto-Shutoff',
      Controls: 'Manual Thermostat & Timer Knobs',
      Functions: 'Air Fry, Bake, Grill, Toast, Roast',
      Accessories: 'Wire Rack, Baking Tray, Crumb Tray',
      'Power Supply': '220V / 50Hz',
      Warranty: '1 Year Westpoint Warranty',
    },
    sub_category: 'Air Fryer',
    tags: 'westpoint, WF-5258, air fryer oven, countertop oven, air fryer, convection oven, westpoint oven, oven karachi, oven pakistan, installment, reliance appliances',
  },
  {
    model: 'WF-7259',
    mrp: 36400,
    simplified_name: 'Westpoint Deluxe Air Fryer Double Heater 6L',
    description: 'The Westpoint WF-7259 Deluxe Air Fryer features a dual-heater system that delivers superior cooking performance and faster heat-up times compared to standard single-heater models. The double heating elements ensure more uniform heat circulation inside the 6-litre basket, producing consistently crispy, evenly cooked results on every rack. Ideal for demanding cooks who require higher cooking throughput and premium results. Available at Reliance Appliances, Karachi — on cash or easy installments.',
    specs: {
      Type: 'Deluxe Air Fryer — Double Heater System',
      Capacity: '6.0 Litres',
      Power: '2400 Watts',
      'Heating Elements': 'Dual Heater (Top + Bottom)',
      'Cooking Method': 'Rapid Hot-Air Circulation (Oil-Free / Low-Oil)',
      'Temperature Range': '80°C – 200°C',
      Timer: 'Up to 60 Minutes with Auto-Shutoff',
      Controls: 'Manual Thermostat & Timer Knobs',
      Functions: 'Air Fry, Grill, Bake, Roast',
      Series: 'Deluxe',
      Basket: 'XL Non-Stick Removable Basket',
      'Power Supply': '220V / 50Hz',
      Warranty: '1 Year Westpoint Warranty',
    },
    sub_category: 'Air Fryer',
    tags: 'westpoint, WF-7259, deluxe air fryer, double heater air fryer, dual heater, large air fryer, westpoint deluxe, air fryer karachi, air fryer pakistan, installment, reliance appliances',
  },
  {
    model: 'WF-5259',
    mrp: 40500,
    simplified_name: 'Westpoint Air Fryer with Oven 12L',
    description: 'The Westpoint WF-5259 is the ultimate all-in-one cooking appliance — a full-size air fryer oven with a 12-litre capacity that replaces multiple kitchen gadgets. Air fry a whole chicken, bake a large cake, grill kebabs or toast bread all with a single appliance. The powerful heating system ensures rapid heat-up and consistent temperature throughout the spacious cooking chamber. Multiple cooking functions — Air Fry, Bake, Grill, Rotisserie, Toast, Defrost — give you complete culinary flexibility. Available at Reliance Appliances, Karachi.',
    specs: {
      Type: 'Air Fryer with Oven (Full-Size Countertop)',
      Capacity: '12 Litres',
      Power: '2200 Watts',
      'Cooking Method': 'Rapid Hot-Air Circulation + Convection Heating',
      'Temperature Range': '80°C – 230°C',
      Timer: 'Up to 60 Minutes with Auto-Shutoff',
      Controls: 'Manual Thermostat & Timer Knobs',
      Functions: 'Air Fry, Bake, Grill, Toast, Roast, Defrost',
      Accessories: 'Wire Rack, Baking Tray, Rotisserie Spit, Crumb Tray',
      'Viewing Window': 'Large Tempered Glass Door',
      'Power Supply': '220V / 50Hz',
      Warranty: '1 Year Westpoint Warranty',
    },
    sub_category: 'Air Fryer',
    tags: 'westpoint, WF-5259, air fryer oven, large air fryer, 12 litre, countertop oven, rotisserie, convection oven, westpoint oven, oven karachi, oven pakistan, installment, reliance appliances',
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildSlug(model) {
  return 'westpoint-' + model.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
}

function buildSeoTitle(p, sellPrice) {
  return `Westpoint ${p.simplified_name} (${p.model}) Price in Pakistan — PKR ${sellPrice.toLocaleString('en-PK')} | Reliance Appliances Karachi`;
}

function buildSeoDesc(p) {
  return `Buy the Westpoint ${p.model} ${p.simplified_name} in Karachi at Reliance Appliances. Oil-free air fryer on easy installments or cash. ${p.specs.Capacity ?? ''} capacity, ${p.specs.Power ?? ''}. 1 Year Warranty.`;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const { error: authErr } = await supabase.auth.signInWithPassword({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  if (authErr) { console.error('Auth failed:', authErr.message); process.exit(1); }
  console.log('Signed in.\n');

  // Fetch existing Westpoint products to avoid duplicates
  const { data: existing, error: fetchErr } = await supabase
    .from('products')
    .select('id, model')
    .ilike('brand', 'westpoint');
  if (fetchErr) { console.error('Fetch error:', fetchErr.message); process.exit(1); }

  const existingModels = new Set((existing || []).map(p => p.model.toUpperCase().trim()));
  console.log(`Found ${existingModels.size} existing Westpoint products in DB.\n`);

  let inserted = 0, skipped = 0;

  for (const p of PRODUCTS) {
    const modelKey = p.model.toUpperCase().trim();
    if (existingModels.has(modelKey)) {
      console.log(`  SKIP (exists)  ${p.model}  —  ${p.simplified_name}`);
      skipped++;
      continue;
    }

    const sellPrice = price(p.mrp);
    const slug      = buildSlug(p.model);
    const seo_title = buildSeoTitle(p, sellPrice);
    const seo_desc  = buildSeoDesc(p);

    console.log(`  ${DRY_RUN ? 'WOULD INSERT' : 'INSERT'}  ${p.model}  →  PKR ${sellPrice.toLocaleString('en-PK')}  (${p.simplified_name})`);

    if (!DRY_RUN) {
      const { error: e } = await supabase.from('products').insert({
        id:              randomUUID(),
        brand:           'Westpoint',
        model:           p.model,
        simplified_name: p.simplified_name,
        category:        'kitchen',
        sub_category:    p.sub_category,
        slug,
        description:     p.description,
        specs:           p.specs,
        tags:            p.tags,
        colors:          '',
        retail_price:    sellPrice,
        cash_floor:      sellPrice,
        warranty:        '1 Year Westpoint Warranty',
        stock_status:    'In Stock',
        featured:        false,
        thumbnail_url:   null,
        gallery_urls:    [],
        seo_title,
        seo_desc,
        seo_keywords:    p.tags,
        updated_at:      new Date().toISOString(),
      });
      if (e) { console.error(`    ✗  ${e.message}`); continue; }
    }
    inserted++;
  }

  console.log(`\nDone. ${DRY_RUN ? 'DRY RUN — ' : ''}Inserted: ${inserted}  |  Skipped (already exist): ${skipped}`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
