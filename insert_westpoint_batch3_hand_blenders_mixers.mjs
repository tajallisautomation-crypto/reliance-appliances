/**
 * insert_westpoint_batch3_hand_blenders_mixers.mjs
 * Hand Blenders, Hand Mixers, Stand Mixers, Egg Beaters
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

const supabase   = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const p100       = n => Math.round(n * 1.15 / 100) * 100;

const PRODUCTS = [
  // ── Hand Blenders ────────────────────────────────────────────────────────────
  {
    model: 'WF-9150', mrp: 5500,
    simplified_name: 'Westpoint Hand Blender',
    sub_category: 'Hand Blender',
    description: 'The Westpoint WF-9150 Hand Blender is a compact, lightweight immersion blender for everyday blending tasks. Blend soups directly in the pot, make smoothies in a cup, or puree baby food in seconds. The detachable stainless steel shaft is easy to clean and hygienic. Simple single-speed operation makes it effortless to use. Available at Reliance Appliances, Karachi.',
    specs: { Type: 'Immersion Hand Blender', Shaft: 'Detachable Stainless Steel Shaft', Controls: 'Single-Speed Button', Use: 'Soups, Smoothies, Purees, Baby Food', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, WF-9150, hand blender, immersion blender, stick blender, soup blender, westpoint hand blender, karachi, installment, reliance appliances',
  },
  {
    model: 'WF-9151', mrp: 6250,
    simplified_name: 'Westpoint Hand Blender with Beater',
    sub_category: 'Hand Blender',
    description: 'The Westpoint WF-9151 Hand Blender with Beater gives you two appliances in one. Use the blending shaft for soups, smoothies and purees, then switch to the beater attachment for whipping cream, beating eggs or making cake batter. The variable speed control adapts to different tasks. Lightweight and easy to store. Available at Reliance Appliances, Karachi.',
    specs: { Type: 'Hand Blender with Beater Attachment', Attachments: 'Blending Shaft + Beater Whisk', Shaft: 'Detachable Stainless Steel', Controls: 'Variable Speed', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, WF-9151, hand blender, beater, whisk, 2 in 1, westpoint hand blender, karachi, installment, reliance appliances',
  },
  {
    model: 'WF-9152', mrp: 7050,
    simplified_name: 'Westpoint Hand Blender Beater & Chopper 3-in-1',
    sub_category: 'Hand Blender',
    description: 'The Westpoint WF-9152 is a complete 3-in-1 hand blender set with blending shaft, beater and chopper attachments. Blend soups and smoothies, beat eggs and cream, and chop onions and herbs — all with one compact device. The variable speed motor with turbo boost handles everything from delicate whipping to heavy chopping. Available at Reliance Appliances, Karachi.',
    specs: { Type: '3-in-1 Hand Blender', Attachments: 'Blending Shaft + Beater Whisk + Chopper Bowl', Controls: 'Variable Speed + Turbo Boost', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, WF-9152, hand blender, beater, chopper, 3 in 1, westpoint hand blender, karachi, installment, reliance appliances',
  },
  {
    model: 'WF-9155', mrp: 9950,
    simplified_name: 'Westpoint Hand Blender Beater Chopper & Vegetable Cutter 4-in-1',
    sub_category: 'Hand Blender',
    description: 'The Westpoint WF-9155 is a versatile 4-in-1 hand appliance set. Blend, beat, chop and slice — all with dedicated attachments. The vegetable cutter attachment lets you slice and shred vegetables directly into a bowl, saving significant prep time. Ideal for households that cook fresh every day. Available at Reliance Appliances, Karachi.',
    specs: { Type: '4-in-1 Hand Blender Set', Attachments: 'Blending Shaft + Beater + Chopper + Vegetable Cutter', Controls: 'Variable Speed + Turbo', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, WF-9155, hand blender, beater, chopper, vegetable cutter, 4 in 1, westpoint hand blender, karachi, installment, reliance appliances',
  },
  {
    model: 'WF-9801', mrp: 6750,
    simplified_name: 'Westpoint Hand Blender 500W Titanium Blade',
    sub_category: 'Hand Blender',
    description: 'The Westpoint WF-9801 Hand Blender features a 500W AC motor and titanium-coated blade for superior blending performance and durability. The titanium blade is significantly harder and more corrosion-resistant than standard stainless steel, maintaining sharpness over years of use. Ideal for blending fibrous vegetables, ice and thick mixtures that would wear out weaker blenders. Available at Reliance Appliances, Karachi.',
    specs: { Type: 'Immersion Hand Blender', Power: '500 Watts', 'Motor Type': 'AC Motor', Blade: 'Titanium-Coated Blade', Controls: 'Variable Speed', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, WF-9801, hand blender, titanium blade, 500w, AC motor, powerful hand blender, westpoint hand blender, karachi, installment, reliance appliances',
  },
  {
    model: 'WF-9802', mrp: 7750,
    simplified_name: 'Westpoint Hand Blender & Beater 500W Titanium Blade',
    sub_category: 'Hand Blender',
    description: 'The Westpoint WF-9802 combines a 500W AC motor, titanium blade and beater attachment for a powerful 2-in-1 hand kitchen set. The titanium blade ensures exceptional blending durability, while the beater whisk makes light work of whipping cream and beating eggs. A step up in performance for those who use hand blenders daily. Available at Reliance Appliances, Karachi.',
    specs: { Type: '2-in-1 Hand Blender + Beater', Power: '500 Watts', 'Motor Type': 'AC Motor', Blade: 'Titanium-Coated Blade', Attachments: 'Blending Shaft + Beater Whisk', Controls: 'Variable Speed', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, WF-9802, hand blender, beater, titanium blade, 500w, 2 in 1, westpoint hand blender, karachi, installment, reliance appliances',
  },
  {
    model: 'WF-9806', mrp: 7700,
    simplified_name: 'Westpoint Hand Blender 1000W Titanium Blade DC Motor',
    sub_category: 'Hand Blender',
    description: 'The Westpoint WF-9806 elevates hand blender performance with a powerful 1000W DC motor and titanium blade combination. The DC motor delivers higher torque for smoother blending of tough ingredients like frozen fruit, dense vegetables and fibrous roots. Titanium blade maintains sharpness far longer than standard blades. The result is consistent, restaurant-quality blending in your own kitchen. Available at Reliance Appliances, Karachi.',
    specs: { Type: 'Immersion Hand Blender', Power: '1000 Watts', 'Motor Type': 'DC Motor (High Torque)', Blade: 'Titanium Blade', Controls: 'Variable Speed', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, WF-9806, hand blender, titanium blade, 1000w, DC motor, high power, westpoint hand blender, karachi, installment, reliance appliances',
  },
  {
    model: 'WF-9807', mrp: 8650,
    simplified_name: 'Westpoint Hand Blender Beater & Milk Frother 1000W DC Motor',
    sub_category: 'Hand Blender',
    description: 'The Westpoint WF-9807 is a premium 3-attachment set — hand blender, beater and milk frother — powered by a 1000W DC motor with titanium blade. The milk frother attachment creates thick, creamy foam for cappuccinos, lattes and chai in seconds. The powerful DC motor handles both delicate frothing and demanding blending with equal ease. A complete hand kitchen set for those who appreciate quality. Available at Reliance Appliances, Karachi.',
    specs: { Type: '3-in-1 Hand Blender', Power: '1000 Watts', 'Motor Type': 'DC Motor', Blade: 'Titanium Blade', Attachments: 'Blending Shaft + Beater + Milk Frother', Controls: 'Variable Speed', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, WF-9807, hand blender, beater, milk frother, 1000w, DC motor, cappuccino, latte frother, westpoint hand blender, karachi, installment, reliance appliances',
  },

  // ── Hand Mixers ──────────────────────────────────────────────────────────────
  {
    model: 'WF-9250', mrp: 6800,
    simplified_name: 'Westpoint Hand Mixer',
    sub_category: 'Hand Mixer',
    description: 'The Westpoint WF-9250 Hand Mixer is a lightweight, easy-to-use electric mixer for everyday baking and cooking tasks. Beat eggs, whip cream, mix cake batter and knead light dough with the stainless steel beater attachments. The multi-speed settings let you start slow and increase speed gradually for mess-free mixing. Ergonomic handle and compact size make it easy to use for extended periods. Available at Reliance Appliances, Karachi.',
    specs: { Type: 'Electric Hand Mixer', Attachments: 'Stainless Steel Beater Whisks (×2)', Controls: 'Multi-Speed Settings', Features: 'Eject Button for Easy Cleaning', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, WF-9250, hand mixer, electric mixer, cake mixer, baking, westpoint mixer, karachi, installment, reliance appliances',
  },
  {
    model: 'WF-9253', mrp: 8650,
    simplified_name: 'Westpoint Hand Mixer & Blender',
    sub_category: 'Hand Mixer',
    description: 'The Westpoint WF-9253 combines an electric hand mixer with an immersion blender in one unit. Switch between beater attachments for mixing and the blending shaft for pureeing — covering both tasks with a single motor unit. Variable speed control and turbo boost handle everything from gentle folding to high-speed whipping. Available at Reliance Appliances, Karachi.',
    specs: { Type: 'Hand Mixer + Hand Blender Combo', Attachments: 'Beater Whisks + Blending Shaft', Controls: 'Variable Speed + Turbo', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, WF-9253, hand mixer, blender, combo, 2 in 1, westpoint mixer, karachi, installment, reliance appliances',
  },

  // ── Egg Beater ───────────────────────────────────────────────────────────────
  {
    model: 'WF-9271', mrp: 6800,
    simplified_name: 'Westpoint Egg Beater',
    sub_category: 'Hand Mixer',
    description: 'The Westpoint WF-9271 Egg Beater is a purpose-built electric beater for whipping eggs, cream, butter and cake batters to perfection. The two rotating stainless steel beaters incorporate air quickly for light, fluffy results. Multiple speed settings let you control the mixing intensity precisely. Compact, lightweight and easy to clean — an essential baking tool. Available at Reliance Appliances, Karachi.',
    specs: { Type: 'Electric Egg Beater', Beaters: 'Dual Stainless Steel Beaters', Controls: 'Multi-Speed', Features: 'Eject Button', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, WF-9271, egg beater, electric beater, cake mixer, baking, westpoint beater, karachi, installment, reliance appliances',
  },

  // ── Stand Mixers ─────────────────────────────────────────────────────────────
  {
    model: 'WF-3700', mrp: 22500,
    simplified_name: 'Westpoint Stand Mixer 5L 1000W',
    sub_category: 'Stand Mixer',
    description: 'The Westpoint WF-3700 Stand Mixer is a professional-grade countertop mixer ideal for serious bakers. The 1000W motor and 5-litre stainless steel bowl handle large batches of dough, cake batter, meringue and cream with ease. The planetary mixing action ensures the beater reaches every part of the bowl for thorough, lump-free results. Includes a dough hook, flat beater and wire whisk. Available at Reliance Appliances, Karachi.',
    specs: { Type: 'Stand Mixer (Countertop)', Power: '1000 Watts', Bowl: '5 Litre Stainless Steel Bowl', 'Mixing Action': 'Planetary Mixing', Attachments: 'Dough Hook + Flat Beater + Wire Whisk', Controls: 'Multi-Speed with Pulse', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, WF-3700, stand mixer, kitchen mixer, dough mixer, cake mixer, 5 litre, 1000w, westpoint stand mixer, karachi, installment, reliance appliances',
  },
  {
    model: 'WF-3701', mrp: 26000,
    simplified_name: 'Westpoint Stand Mixer 7L 1200W',
    sub_category: 'Stand Mixer',
    description: 'The Westpoint WF-3701 Stand Mixer is built for heavy-duty baking with a powerful 1200W motor and a generous 7-litre stainless steel bowl. Handle large batches of bread dough, whip cream in seconds, and mix party-sized cake batters — all without straining the motor. Planetary mixing action, multi-speed control, and three attachments (dough hook, flat beater, wire whisk) make this a complete baking station. Available at Reliance Appliances, Karachi.',
    specs: { Type: 'Stand Mixer (Countertop)', Power: '1200 Watts', Bowl: '7 Litre Stainless Steel Bowl', 'Mixing Action': 'Planetary Mixing', Attachments: 'Dough Hook + Flat Beater + Wire Whisk', Controls: 'Multi-Speed with Pulse', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, WF-3701, stand mixer, large stand mixer, 7 litre, 1200w, dough mixer, cake mixer, westpoint stand mixer, karachi, installment, reliance appliances',
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
        simplified_name: p.simplified_name, category: 'kitchen',
        sub_category: p.sub_category, slug: buildSlug(p.model),
        description: p.description, specs: p.specs, tags: p.tags,
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
