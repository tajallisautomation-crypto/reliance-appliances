/**
 * insert_westpoint_batch2_blenders_juicers.mjs
 * Inserts Westpoint Blender, Juicer Blender, and Hard Juicer listings.
 *
 * Data source: "Market price List -2026 (1).pdf" (Karachi Westpoint, 10-Mar-26)
 * Pricing rule: selling_price = round(MRP × 1.15 / 100) × 100
 *
 * Run:  node insert_westpoint_batch2_blenders_juicers.mjs [--dry-run]
 */

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const SUPABASE_URL      = 'https://fdfjavyopbrfvwtjaerw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDE3MDAsImV4cCI6MjA4ODIxNzcwMH0.fXwGFR_e3xZ4trEbkcH8UQ6_oWcIn92UUUvkGuFajto';
const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || 'tajallisautomation@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Hammad123!';
const DRY_RUN        = process.argv.includes('--dry-run');

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const roundTo100 = n => Math.round(n / 100) * 100;
const price = mrp => roundTo100(mrp * 1.15);

const PRODUCTS = [

  // ── BLENDERS (2-in-1 & 3-in-1) ──────────────────────────────────────────────
  {
    model: 'WF-718', mrp: 6025,
    simplified_name: 'Westpoint Blender & Dry Mill 2-in-1',
    category: 'kitchen', sub_category: 'Blender',
    description: 'The Westpoint WF-718 is a reliable 2-in-1 blender and dry mill featuring a 100% copper motor for long-lasting durability and consistent performance. The sturdy blending jug handles smoothies, shakes, lassi and soups, while the dry mill grinds spices, coffee and grains to a fine powder. Stainless steel blades ensure efficient blending and easy cleaning. A trusted kitchen companion for daily use. Available at Reliance Appliances, Karachi.',
    specs: { Functions: '2-in-1 (Blender + Dry Mill)', Motor: '100% Copper Motor', Blades: 'Stainless Steel', Jug: 'Polycarbonate Blending Jug', 'Dry Mill': 'Spice / Coffee Grinder Included', Controls: 'Multi-Speed Switch', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, WF-718, blender, dry mill, 2 in 1, copper motor, smoothie maker, juicer blender, kitchen appliance, westpoint blender, karachi, installment, reliance appliances',
  },
  {
    model: 'WF-738', mrp: 6600,
    simplified_name: 'Westpoint Blender & Dry Mill 3-in-1',
    category: 'kitchen', sub_category: 'Blender',
    description: 'The Westpoint WF-738 3-in-1 blender adds a chopper jar to the classic blender + dry mill combination. The 100% copper motor drives powerful stainless steel blades through all three jars. Blend smoothies and juices, grind dry spices, and chop onions, vegetables or herbs — all with one appliance. The off-white body and compact footprint suit any kitchen decor. Available at Reliance Appliances, Karachi.',
    specs: { Functions: '3-in-1 (Blender + Dry Mill + Chopper)', Motor: '100% Copper Motor', Blades: 'Stainless Steel', Jug: 'Polycarbonate Blending Jug', 'Dry Mill': 'Spice / Coffee Grinder Included', Chopper: 'Vegetable / Herb Chopper Jar Included', Controls: 'Multi-Speed Switch', Color: 'Off-White', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, WF-738, blender, dry mill, chopper, 3 in 1, copper motor, kitchen appliance, westpoint blender, karachi, installment, reliance appliances',
  },
  {
    model: 'WF-332', mrp: 6600,
    simplified_name: 'Westpoint Blender & Dry Mill 2-in-1',
    category: 'kitchen', sub_category: 'Blender',
    description: 'The Westpoint WF-332 delivers smooth blending and precise dry grinding in a single appliance. Its 2-in-1 design pairs a full-size blending jug with a compact dry mill jar — ideal for making smoothies, lassi and juices, and for grinding spices and herbs. The powerful motor and stainless steel blades ensure consistent results. A practical everyday appliance for Pakistani kitchens. Available at Reliance Appliances, Karachi.',
    specs: { Functions: '2-in-1 (Blender + Dry Mill)', Blades: 'Stainless Steel', Controls: 'Multi-Speed Switch', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, WF-332, blender, dry mill, 2 in 1, kitchen appliance, westpoint blender, karachi, installment, reliance appliances',
  },
  {
    model: 'WF-333', mrp: 7040,
    simplified_name: 'Westpoint Blender & Dry Mill 3-in-1',
    category: 'kitchen', sub_category: 'Blender',
    description: 'The Westpoint WF-333 3-in-1 blender combines a blending jug, dry mill and chopper in one compact unit. Blend smoothies, grind masala and chop vegetables — all with the same powerful motor. The easy-clean jars and stainless steel blades make maintenance simple. An all-rounder for busy Pakistani kitchens. Available at Reliance Appliances, Karachi.',
    specs: { Functions: '3-in-1 (Blender + Dry Mill + Chopper)', Blades: 'Stainless Steel', Controls: 'Multi-Speed Switch', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, WF-333, blender, dry mill, chopper, 3 in 1, kitchen appliance, westpoint blender, karachi, installment, reliance appliances',
  },
  {
    model: 'WF-342', mrp: 8650,
    simplified_name: 'Westpoint Blender & Dry Mill 3-in-1',
    category: 'kitchen', sub_category: 'Blender',
    description: 'The Westpoint WF-342 is a powerful 3-in-1 kitchen appliance that blends, grinds and chops with ease. The robust motor handles everything from icy smoothies and thick batters to whole spices and vegetables. Three separate jars prevent cross-contamination of flavours. Stainless steel blades are built for long-term heavy use. Available at Reliance Appliances, Karachi.',
    specs: { Functions: '3-in-1 (Blender + Dry Mill + Chopper)', Power: 'High-Torque Motor', Blades: 'Stainless Steel Blades', Controls: 'Multi-Speed with Pulse', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, WF-342, blender, dry mill, chopper, 3 in 1, powerful blender, westpoint blender, karachi, installment, reliance appliances',
  },
  {
    model: 'WF-364', mrp: 14150,
    simplified_name: 'Westpoint Blender & Chopper 2-in-1 Steel Body',
    category: 'kitchen', sub_category: 'Blender',
    description: 'The Westpoint WF-364 combines premium stainless steel construction with powerful blending and chopping performance. The steel body is more durable and hygienic than plastic alternatives, resisting stains and odours. The 2-in-1 design pairs a large blending jug with a chopper attachment — perfect for smoothies, soups, sauces and vegetable prep. The high-torque motor handles even tough ingredients with ease. A premium choice for serious home cooks. Available at Reliance Appliances, Karachi.',
    specs: { Functions: '2-in-1 (Blender + Chopper)', Body: 'Stainless Steel Premium Body', Blades: 'Stainless Steel Blades', Jug: 'Large Capacity Blending Jug', Controls: 'Multi-Speed with Pulse Function', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, WF-364, blender, chopper, steel body, 2 in 1, stainless steel blender, premium blender, westpoint blender, karachi, installment, reliance appliances',
  },
  {
    model: 'WF-367', mrp: 17250,
    simplified_name: 'Westpoint Blender Chopper & Grinder 3-in-1 Steel Body',
    category: 'kitchen', sub_category: 'Blender',
    description: 'The Westpoint WF-367 is a high-capacity 3-in-1 kitchen powerhouse in a premium stainless steel body. Blend, chop and grind — the three essential kitchen tasks covered by three dedicated jars and a powerful motor. The steel chassis stands up to years of heavy daily use in a busy kitchen. Ideal for large families who cook fresh meals from scratch every day. Available at Reliance Appliances, Karachi.',
    specs: { Functions: '3-in-1 (Blender + Chopper + Grinder)', Body: 'Stainless Steel Premium Body', Blades: 'Stainless Steel Blades', Controls: 'Multi-Speed with Pulse Function', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, WF-367, blender, chopper, grinder, steel body, 3 in 1, premium blender, westpoint blender, karachi, installment, reliance appliances',
  },

  // ── JUICER BLENDERS (3-in-1 & 4-in-1) ──────────────────────────────────────
  {
    model: 'WF-7201', mrp: 12250,
    simplified_name: 'Westpoint Juicer Blender & Dry Mill 3-in-1',
    category: 'kitchen', sub_category: 'Juicer Blender',
    description: 'The Westpoint WF-7201 is a versatile 3-in-1 juicer, blender and dry mill that covers all your daily food prep needs. Extract fresh juices, blend smoothies and shakes, and grind masala and spices — all with a single compact appliance. The powerful motor and stainless steel blades handle soft and hard ingredients with ease. Available in a fresh blue colour. Available at Reliance Appliances, Karachi.',
    specs: { Functions: '3-in-1 (Juicer + Blender + Dry Mill)', Color: 'Blue', Blades: 'Stainless Steel', Controls: 'Multi-Speed Switch', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, WF-7201, juicer blender, dry mill, 3 in 1, blue, kitchen appliance, westpoint juicer, karachi, installment, reliance appliances',
  },
  {
    model: 'WF-7501', mrp: 12250,
    simplified_name: 'Westpoint Juicer Blender & Dry Mill 3-in-1',
    category: 'kitchen', sub_category: 'Juicer Blender',
    description: 'The Westpoint WF-7501 3-in-1 juicer blender and dry mill is a dependable all-rounder for the Pakistani kitchen. The powerful motor handles everything from fresh juice extraction and smoothie blending to dry spice grinding. Three dedicated jars ensure hygiene and convenience. Easy to assemble, disassemble and clean. Available at Reliance Appliances, Karachi.',
    specs: { Functions: '3-in-1 (Juicer + Blender + Dry Mill)', Blades: 'Stainless Steel', Controls: 'Multi-Speed Switch', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, WF-7501, juicer blender, dry mill, 3 in 1, kitchen appliance, westpoint juicer, karachi, installment, reliance appliances',
  },
  {
    model: 'WF-1833', mrp: 15450,
    simplified_name: 'Westpoint Juicer Blender & Dry Mill 3-in-1',
    category: 'kitchen', sub_category: 'Juicer Blender',
    description: 'The Westpoint WF-1833 is a higher-capacity 3-in-1 juicer blender and dry mill with an upgraded motor for more demanding daily use. Extract fresh juices, blend thick smoothies, and grind whole spices — all in one powerful appliance. The durable construction and easy-clean jars make it a practical choice for larger families. Available at Reliance Appliances, Karachi.',
    specs: { Functions: '3-in-1 (Juicer + Blender + Dry Mill)', Motor: 'Upgraded High-Power Motor', Blades: 'Stainless Steel', Controls: 'Multi-Speed with Pulse', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, WF-1833, juicer blender, dry mill, 3 in 1, high power, kitchen appliance, westpoint juicer, karachi, installment, reliance appliances',
  },
  {
    model: 'WF-1834', mrp: 17150,
    simplified_name: 'Westpoint Juicer Blender & Grinder 3-in-1',
    category: 'kitchen', sub_category: 'Juicer Blender',
    description: 'The Westpoint WF-1834 3-in-1 juicer blender and grinder delivers premium performance across three essential kitchen tasks. The high-power motor handles fruit juice extraction, smoothie blending and whole-spice grinding with equal efficiency. Robust stainless steel blades and easy-clean jars ensure durability and convenience. A step up for households demanding more power and capacity. Available at Reliance Appliances, Karachi.',
    specs: { Functions: '3-in-1 (Juicer + Blender + Grinder)', Motor: 'High-Power Motor', Blades: 'Stainless Steel', Controls: 'Multi-Speed with Pulse', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, WF-1834, juicer blender, grinder, 3 in 1, high power, kitchen appliance, westpoint juicer, karachi, installment, reliance appliances',
  },
  {
    model: 'WF-1845', mrp: 23500,
    simplified_name: 'Westpoint Juicer Blender Dry & Chopper Mill 4-in-1',
    category: 'kitchen', sub_category: 'Juicer Blender',
    description: 'The Westpoint WF-1845 is a comprehensive 4-in-1 kitchen appliance covering juicing, blending, dry grinding and chopping. The powerful motor drives four dedicated attachments, handling everything from fresh fruit juice and protein shakes to spice grinding and vegetable chopping. An excellent all-in-one solution for busy households that cook diverse meals daily. Available at Reliance Appliances, Karachi.',
    specs: { Functions: '4-in-1 (Juicer + Blender + Dry Mill + Chopper)', Motor: 'High-Power Motor', Blades: 'Stainless Steel Blades', Controls: 'Multi-Speed with Pulse', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, WF-1845, juicer blender, dry mill, chopper, 4 in 1, kitchen appliance, westpoint juicer, karachi, installment, reliance appliances',
  },
  {
    model: 'WF-1846', mrp: 25800,
    simplified_name: 'Westpoint Juicer Blender & Grinder LCD 3-in-1',
    category: 'kitchen', sub_category: 'Juicer Blender',
    description: 'The Westpoint WF-1846 elevates the classic juicer blender with an LCD digital display for precise speed and timer control. The 3-in-1 design covers juicing, blending and grinding with separate jars for each task. The digital panel displays operating speed, remaining time and selected function — making it easy to achieve consistent results. Powerful motor, stainless steel blades and easy-clean jars complete the package. Available at Reliance Appliances, Karachi.',
    specs: { Functions: '3-in-1 (Juicer + Blender + Grinder)', Display: 'LCD Digital Display', Motor: 'High-Power Motor', Blades: 'Stainless Steel', Controls: 'Electronic Multi-Speed + Timer', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, WF-1846, juicer blender, LCD, digital, grinder, 3 in 1, digital blender, westpoint juicer, karachi, installment, reliance appliances',
  },
  {
    model: 'WF-8813', mrp: 12800,
    simplified_name: 'Westpoint Juicer Blender 750W Powerful Motor',
    category: 'kitchen', sub_category: 'Juicer Blender',
    description: 'The Westpoint WF-8813 is built around a powerful 750W motor that handles even the toughest blending and juicing tasks. Whether you\'re extracting juice from hard fruits, blending thick frozen smoothies or processing fibrous vegetables, the WF-8813 powers through with ease. Stainless steel blades and a durable polycarbonate jug deliver reliable daily performance. Available at Reliance Appliances, Karachi.',
    specs: { Functions: 'Juicer + Blender', Power: '750 Watts', Motor: 'Powerful 750W Motor', Blades: 'Stainless Steel', Jug: 'Polycarbonate Blending Jug', Controls: 'Multi-Speed Switch', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, WF-8813, juicer blender, 750 watt, powerful motor, kitchen appliance, westpoint juicer, karachi, installment, reliance appliances',
  },
  {
    model: 'WF-8814', mrp: 13850,
    simplified_name: 'Westpoint Juicer Blender Dry & Chopper Mill 4-in-1 750W',
    category: 'kitchen', sub_category: 'Juicer Blender',
    description: 'The Westpoint WF-8814 pairs a powerful 750W motor with a complete 4-in-1 attachment set — juicer, blender, dry mill and chopper. The extra-powerful motor ensures smooth performance across all attachments, even with hard fruits, coarse spices and dense vegetables. A comprehensive kitchen appliance for households that demand versatility and power. Available at Reliance Appliances, Karachi.',
    specs: { Functions: '4-in-1 (Juicer + Blender + Dry Mill + Chopper)', Power: '750 Watts', Motor: 'Powerful 750W Motor', Blades: 'Stainless Steel', Controls: 'Multi-Speed with Pulse', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, WF-8814, juicer blender, dry mill, chopper, 4 in 1, 750 watt, powerful motor, westpoint juicer, karachi, installment, reliance appliances',
  },
  {
    model: 'WF-2409', mrp: 13800,
    simplified_name: 'Westpoint Glass Juicer 2 Blenders & Dry Mill 3-in-1',
    category: 'kitchen', sub_category: 'Juicer Blender',
    description: 'The Westpoint WF-2409 is a premium 3-in-1 juicer blender and dry mill featuring a glass blending jug for a healthier, odour-free blending experience. Glass does not absorb colours or odours from fruits and vegetables, ensuring your smoothies always taste fresh. The set includes two blender jars plus a dry mill, covering juicing, blending and spice grinding. Available at Reliance Appliances, Karachi.',
    specs: { Functions: '3-in-1 (Juicer + 2× Blender + Dry Mill)', 'Blender Jug': 'Premium Glass Jug (Odour-Free, BPA-Free)', Blades: 'Stainless Steel', Controls: 'Multi-Speed Switch', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, WF-2409, glass juicer, blender, dry mill, glass jug, 3 in 1, kitchen appliance, westpoint juicer, karachi, installment, reliance appliances',
  },

  // ── HARD JUICERS (Citrus / Fruit) ────────────────────────────────────────────
  {
    model: 'WF-2405', mrp: 9990,
    simplified_name: 'Westpoint Hard Fruit Juicer',
    category: 'kitchen', sub_category: 'Juicer',
    description: 'The Westpoint WF-2405 Hard Fruit Juicer is built to extract maximum juice from tough, hard fruits like pomegranates, carrots and beetroot. The powerful motor and stainless steel strainer separate pulp cleanly from juice, delivering smooth, fresh juice every time. The anti-drip spout prevents mess, and the wide feed tube accommodates larger fruit pieces. A favourite for health-conscious households in Pakistan. Available at Reliance Appliances, Karachi.',
    specs: { Type: 'Centrifugal / Hard Fruit Juicer', Strainer: 'Stainless Steel Strainer', 'Anti-Drip': 'Anti-Drip Spout', Controls: 'On/Off Switch', 'Feed Tube': 'Wide Feed Tube', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, WF-2405, hard fruit juicer, juicer, centrifugal juicer, pomegranate juicer, carrot juicer, westpoint juicer, karachi, installment, reliance appliances',
  },
  {
    model: 'WF-5160', mrp: 13400,
    simplified_name: 'Westpoint Juicer',
    category: 'kitchen', sub_category: 'Juicer',
    description: 'The Westpoint WF-5160 Juicer delivers fresh, nutritious juice from a wide variety of fruits and vegetables. The powerful motor spins the stainless steel cutting disc at high speed to extract maximum juice in seconds. The large pulp container and anti-drip spout make for clean, uninterrupted juicing sessions. Easy to assemble and dishwasher-safe parts simplify cleanup. Available at Reliance Appliances, Karachi.',
    specs: { Type: 'Centrifugal Juicer', Disc: 'Stainless Steel Cutting Disc', 'Pulp Container': 'Large Capacity', 'Anti-Drip': 'Anti-Drip Spout', Controls: 'Speed Control Switch', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, WF-5160, juicer, fruit juicer, centrifugal juicer, westpoint juicer, fresh juice, karachi, installment, reliance appliances',
  },
  {
    model: 'WF-5161', mrp: 13400,
    simplified_name: 'Westpoint Juicer',
    category: 'kitchen', sub_category: 'Juicer',
    description: 'The Westpoint WF-5161 Juicer extracts fresh juice from fruits and vegetables quickly and efficiently. Its centrifugal mechanism separates juice from pulp cleanly, and the large pulp container lets you juice continuously without interruption. The anti-drip spout keeps your counter clean, and the easy-to-clean stainless steel disc ensures lasting hygiene. Available at Reliance Appliances, Karachi.',
    specs: { Type: 'Centrifugal Juicer', Disc: 'Stainless Steel Cutting Disc', 'Pulp Container': 'Large Capacity', 'Anti-Drip': 'Anti-Drip Spout', Controls: 'Speed Control Switch', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, WF-5161, juicer, fruit juicer, centrifugal juicer, westpoint juicer, fresh juice, karachi, installment, reliance appliances',
  },
  {
    model: 'WF-5165', mrp: 26300,
    simplified_name: 'Westpoint Slow Juicer',
    category: 'kitchen', sub_category: 'Juicer',
    description: 'The Westpoint WF-5165 Slow Juicer uses cold-press masticating technology to extract juice at low speeds, preserving maximum nutrients, enzymes and natural flavour that high-speed centrifugal juicers destroy through heat. The result is richer-tasting, more nutritious juice with a longer shelf life. Ideal for health-conscious households who juice daily. Operates quietly and produces minimal foam. Available at Reliance Appliances, Karachi.',
    specs: { Type: 'Cold Press / Slow Masticating Juicer', Technology: 'Cold Press — Low-Speed Masticating', 'Noise Level': 'Whisper Quiet Operation', 'Juice Quality': 'Maximum Nutrients & Enzymes Preserved', 'Foam': 'Minimal Foam, Extended Shelf Life', Controls: 'On/Off / Reverse Switch', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, WF-5165, slow juicer, cold press, masticating juicer, healthy juice, cold pressed, westpoint juicer, karachi, installment, reliance appliances',
  },
];

function buildSlug(model) {
  return 'westpoint-' + model.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
}

function buildSeoTitle(p, sellPrice) {
  return `Westpoint ${p.simplified_name} (${p.model}) Price in Pakistan — PKR ${sellPrice.toLocaleString('en-PK')} | Reliance Appliances Karachi`;
}

function buildSeoDesc(p) {
  return `Buy the Westpoint ${p.model} at Reliance Appliances, Karachi. ${p.simplified_name}. On easy installments or cash. 1 Year Warranty. Call or WhatsApp for latest price.`;
}

async function main() {
  const { error: authErr } = await supabase.auth.signInWithPassword({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  if (authErr) { console.error('Auth failed:', authErr.message); process.exit(1); }
  console.log('Signed in.\n');

  const { data: existing, error: fetchErr } = await supabase
    .from('products').select('id, model').ilike('brand', 'westpoint');
  if (fetchErr) { console.error('Fetch error:', fetchErr.message); process.exit(1); }

  const existingModels = new Set((existing || []).map(p => p.model.toUpperCase().trim()));
  console.log(`Found ${existingModels.size} existing Westpoint products in DB.\n`);

  let inserted = 0, skipped = 0;

  for (const p of PRODUCTS) {
    const modelKey = p.model.toUpperCase().trim();
    if (existingModels.has(modelKey)) {
      console.log(`  SKIP (exists)  ${p.model}  —  ${p.simplified_name}`);
      skipped++; continue;
    }

    const sellPrice = price(p.mrp);
    const slug      = buildSlug(p.model);
    const seo_title = buildSeoTitle(p, sellPrice);
    const seo_desc  = buildSeoDesc(p);

    console.log(`  ${DRY_RUN ? 'WOULD INSERT' : 'INSERT'}  ${p.model}  →  PKR ${sellPrice.toLocaleString('en-PK')}  (${p.simplified_name})`);

    if (!DRY_RUN) {
      const { error: e } = await supabase.from('products').insert({
        id: randomUUID(), brand: 'Westpoint', model: p.model,
        simplified_name: p.simplified_name,
        category: p.category, sub_category: p.sub_category,
        slug, description: p.description, specs: p.specs, tags: p.tags,
        colors: '', retail_price: sellPrice, cash_floor: sellPrice,
        warranty: '1 Year Westpoint Warranty', stock_status: 'In Stock',
        featured: false, thumbnail_url: null, gallery_urls: [],
        seo_title, seo_desc, seo_keywords: p.tags,
        updated_at: new Date().toISOString(),
      });
      if (e) { console.error(`    ✗  ${e.message}`); continue; }
    }
    inserted++;
  }

  console.log(`\nDone. ${DRY_RUN ? 'DRY RUN — ' : ''}Inserted: ${inserted}  |  Skipped: ${skipped}`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
