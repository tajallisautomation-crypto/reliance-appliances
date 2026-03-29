/**
 * insert_westpoint_batch7_personal_care_misc.mjs
 * Hair Dryers, Straighteners, Trimmers, Pop-Up Toasters, Citrus Juicers,
 * Coffee Makers, Insect Killers, Baby Bottle Warmers, Egg Boilers, Bath Scales
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
  // ── Hair Dryers ───────────────────────────────────────────────────────────────
  { model: 'WF-7001', mrp: 3575, cat: 'care', sub: 'Hair Dryer',
    simplified_name: 'Westpoint Hair Dryer 1200W',
    description: 'The Westpoint WF-7001 Hair Dryer delivers 1200W of drying power for quick, efficient hair drying at home. The lightweight body and ergonomic handle reduce hand fatigue during use. Cold-shot and multiple heat settings let you style as well as dry. Available at Reliance Appliances, Karachi.',
    specs: { Type: 'Hair Dryer', Power: '1200 Watts', Settings: 'Multiple Heat + Cool Shot', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, WF-7001, hair dryer, 1200w, salon dryer, westpoint hair dryer, karachi, installment, reliance appliances' },

  { model: 'WF-7002', mrp: 3775, cat: 'care', sub: 'Hair Dryer',
    simplified_name: 'Westpoint Hair Dryer 1600W',
    description: 'The Westpoint WF-7002 Hair Dryer runs at 1600W for faster drying of thick or long hair. Multiple heat and speed settings give you the control to dry gently or blast through wet hair quickly. The concentrator nozzle focuses airflow for precise styling. Available at Reliance Appliances, Karachi.',
    specs: { Type: 'Hair Dryer', Power: '1600 Watts', Settings: 'Multiple Heat & Speed + Cool Shot', Accessories: 'Concentrator Nozzle', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, WF-7002, hair dryer, 1600w, hair dryer, westpoint hair dryer, karachi, installment, reliance appliances' },

  { model: 'WF-7007', mrp: 4850, cat: 'care', sub: 'Hair Dryer',
    simplified_name: 'Westpoint Hair Dryer with Ionic 2200W',
    description: 'The Westpoint WF-7007 Ionic Hair Dryer uses negative ion technology to break down water molecules faster, reducing drying time by up to 50% while leaving hair smoother, shinier and frizz-free. The 2200W motor delivers powerful airflow, and the ionic technology counteracts static electricity for salon-quality results at home. Available at Reliance Appliances, Karachi.',
    specs: { Type: 'Ionic Hair Dryer', Power: '2200 Watts', Technology: 'Negative Ion Technology (Frizz Control)', Settings: 'Multiple Heat & Speed + Cool Shot', Accessories: 'Concentrator Nozzle + Diffuser', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, WF-7007, ionic hair dryer, 2200w, frizz control, salon dryer, westpoint hair dryer, karachi, installment, reliance appliances' },

  { model: 'WF-7025', mrp: 5250, cat: 'care', sub: 'Hair Dryer',
    simplified_name: 'Westpoint Hair Dryer 2000W',
    description: 'The Westpoint WF-7025 Hair Dryer packs a powerful 2000W motor into a sleek, ergonomic body for fast, professional-quality drying. Variable heat and speed settings, a cool-shot button and a removable filter for easy cleaning make this a practical daily-use dryer. Available at Reliance Appliances, Karachi.',
    specs: { Type: 'Hair Dryer', Power: '2000 Watts', Settings: 'Variable Heat & Speed + Cool Shot', Filter: 'Removable Filter (Easy Clean)', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, WF-7025, hair dryer, 2000w, powerful dryer, westpoint hair dryer, karachi, installment, reliance appliances' },

  // ── Hair Straighteners ────────────────────────────────────────────────────────
  { model: 'WF-7031', mrp: 3775, cat: 'care', sub: 'Hair Straightener',
    simplified_name: 'Westpoint Hair Straightener',
    description: 'The Westpoint WF-7031 Hair Straightener delivers sleek, smooth results with floating ceramic plates that adjust to your hair thickness for even heat contact. Quick heat-up time and an adjustable temperature dial suit all hair types from fine to coarse. Available at Reliance Appliances, Karachi.',
    specs: { Type: 'Hair Straightener', Plates: 'Floating Ceramic Plates', Controls: 'Adjustable Temperature Dial', 'Heat-Up': 'Quick Heat-Up', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, WF-7031, hair straightener, straightener, ceramic plates, westpoint hair, karachi, installment, reliance appliances' },

  { model: 'WF-7038', mrp: 5300, cat: 'care', sub: 'Hair Straightener',
    simplified_name: 'Westpoint Hair Straightener Curler & Crimper 3-in-1',
    description: 'The Westpoint WF-7038 is a versatile 3-in-1 styling tool that straightens, curls and crimps hair with interchangeable plates. Switch from sleek straight hair to defined curls or textured crimped waves — all with one device. Ceramic-coated plates glide smoothly and distribute heat evenly for consistent styling. Available at Reliance Appliances, Karachi.',
    specs: { Type: '3-in-1 Hair Styler', Functions: 'Straighten + Curl + Crimp', Plates: 'Interchangeable Ceramic-Coated Plates', Controls: 'Adjustable Temperature', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, WF-7038, hair straightener, curler, crimper, 3 in 1, hair styler, westpoint hair, karachi, installment, reliance appliances' },

  { model: 'WF-7139', mrp: 4600, cat: 'care', sub: 'Hair Straightener',
    simplified_name: 'Westpoint Hair Straightener with Ionic Function',
    description: 'The Westpoint WF-7139 Hair Straightener with Ionic Function combines ceramic plate straightening with negative ion technology for smoother, shinier, frizz-free results. The ionic function seals the hair cuticle to lock in moisture and add lustre. Adjustable temperature suits all hair types. Available at Reliance Appliances, Karachi.',
    specs: { Type: 'Ionic Hair Straightener', Plates: 'Ceramic Plates with Ionic Function', Technology: 'Negative Ion Technology', Controls: 'Adjustable Temperature', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, WF-7139, ionic straightener, hair straightener, ceramic, frizz control, westpoint hair, karachi, installment, reliance appliances' },

  // ── Trimmers ──────────────────────────────────────────────────────────────────
  { model: 'WF-7061', mrp: 2550, cat: 'care', sub: 'Trimmer',
    simplified_name: 'Westpoint Trimmer',
    description: 'The Westpoint WF-7061 Trimmer is a compact, corded trimmer for maintaining beard, moustache and sideburns with precision. The stainless steel blade cuts cleanly without pulling. Multiple comb attachments let you choose your preferred length. Lightweight and easy to manoeuvre for daily grooming. Available at Reliance Appliances, Karachi.',
    specs: { Type: 'Electric Trimmer', Blade: 'Stainless Steel Blade', Attachments: 'Length-Setting Combs', Controls: 'On/Off Switch', Operation: 'Corded', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, WF-7061, trimmer, beard trimmer, hair trimmer, grooming, westpoint trimmer, karachi, installment, reliance appliances' },

  { model: 'WF-7068', mrp: 3600, cat: 'care', sub: 'Trimmer',
    simplified_name: 'Westpoint Hair Trimmer Nose Trimmer & Shaver 3-in-1',
    description: 'The Westpoint WF-7068 is a complete 3-in-1 grooming kit combining a hair trimmer, nose & ear trimmer and shaver in one device with interchangeable heads. Cover all your grooming needs from one compact appliance. Stainless steel blades, multiple length settings and a compact design make it ideal for daily use and travel. Available at Reliance Appliances, Karachi.',
    specs: { Type: '3-in-1 Grooming Kit', Functions: 'Hair Trimmer + Nose/Ear Trimmer + Shaver', Blades: 'Stainless Steel Interchangeable Heads', Controls: 'On/Off Switch', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, WF-7068, trimmer, nose trimmer, shaver, 3 in 1, grooming, westpoint trimmer, karachi, installment, reliance appliances' },

  // ── Pop-Up Toasters ───────────────────────────────────────────────────────────
  { model: 'WF-3004', mrp: 6100, cat: 'kitchen', sub: 'Toaster',
    simplified_name: 'Westpoint 2 Slice Toaster',
    description: 'The Westpoint WF-3004 2-Slice Pop-Up Toaster toasts bread, roti, buns and bagels evenly and quickly. The adjustable browning control lets you set your preferred level from lightly golden to deep brown. The auto-pop mechanism ejects toast at the end of the cycle, and the cancel button stops toasting instantly. The slide-out crumb tray keeps your counter clean. Available at Reliance Appliances, Karachi.',
    specs: { Type: '2-Slice Pop-Up Toaster', Slots: '2 Wide Slots', Controls: 'Adjustable Browning Control', Functions: 'Toast, Reheat, Defrost, Cancel', 'Crumb Tray': 'Slide-Out Crumb Tray', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, WF-3004, toaster, 2 slice toaster, bread toaster, pop up toaster, westpoint toaster, karachi, installment, reliance appliances' },

  { model: 'WF-3005', mrp: 8875, cat: 'kitchen', sub: 'Toaster',
    simplified_name: 'Westpoint 4 Slice Toaster Full Stainless Steel',
    description: 'The Westpoint WF-3005 4-Slice Full Stainless Steel Toaster handles four slices simultaneously — ideal for larger families or busy mornings. The full stainless steel body is durable, easy to clean and gives a premium kitchen aesthetic. Wide slots accommodate thick-cut bread, bagels and artisan loaves. Adjustable browning, reheat, defrost and cancel functions. Available at Reliance Appliances, Karachi.',
    specs: { Type: '4-Slice Pop-Up Toaster', Slots: '4 Wide Slots', Body: 'Full Stainless Steel', Controls: 'Adjustable Browning + Reheat/Defrost/Cancel', 'Crumb Tray': 'Slide-Out Crumb Tray', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, WF-3005, 4 slice toaster, stainless steel toaster, bread toaster, westpoint toaster, karachi, installment, reliance appliances' },

  { model: 'WF-3009', mrp: 9800, cat: 'kitchen', sub: 'Toaster',
    simplified_name: 'Westpoint 4 Slice Toaster',
    description: 'The Westpoint WF-3009 4-Slice Pop-Up Toaster toasts four slices at once with even, consistent browning. Perfect for families who want breakfast on the table quickly. Wide slots, adjustable browning control, cancel button and a removable crumb tray for easy cleaning. Available at Reliance Appliances, Karachi.',
    specs: { Type: '4-Slice Pop-Up Toaster', Slots: '4 Wide Slots', Controls: 'Adjustable Browning + Reheat/Defrost/Cancel', 'Crumb Tray': 'Removable Crumb Tray', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, WF-3009, 4 slice toaster, bread toaster, pop up toaster, westpoint toaster, karachi, installment, reliance appliances' },

  // ── Citrus Juicers ────────────────────────────────────────────────────────────
  { model: 'WF-2054', mrp: 4500, cat: 'kitchen', sub: 'Citrus Juicer',
    simplified_name: 'Westpoint Citrus Juicer 40W',
    description: 'The Westpoint WF-2054 Citrus Juicer extracts fresh orange, lemon, grapefruit and lime juice effortlessly. Simply halve the citrus fruit, press it onto the rotating cone and fresh juice flows into the collector jug through the built-in strainer. The 40W motor handles continuous juicing without overheating. The anti-drip spout keeps your counter clean. Available at Reliance Appliances, Karachi.',
    specs: { Type: 'Electric Citrus Juicer', Power: '40 Watts', Cone: 'Universal Citrus Cone', Strainer: 'Built-In Pulp Strainer', 'Anti-Drip': 'Anti-Drip Spout', Jug: 'Juice Collector Jug with Measurement Scale', Controls: 'Auto-Reverse Motor on Pressing', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, WF-2054, citrus juicer, orange juicer, lemon juicer, electric juicer, westpoint juicer, karachi, installment, reliance appliances' },

  { model: 'WF-2158', mrp: 6900, cat: 'kitchen', sub: 'Citrus Juicer',
    simplified_name: 'Westpoint Citrus Juicer Deluxe',
    description: 'The Westpoint WF-2158 Deluxe Citrus Juicer offers a premium juicing experience with a larger capacity jug, quieter motor and an enhanced strainer that separates pulp more effectively. The two interchangeable cone sizes handle everything from small limes to large grapefruits. Available at Reliance Appliances, Karachi.',
    specs: { Type: 'Deluxe Electric Citrus Juicer', Cones: 'Two Interchangeable Cone Sizes (Small & Large)', Strainer: 'Fine-Mesh Pulp Strainer', Jug: 'Large Capacity Collector Jug', 'Anti-Drip': 'Anti-Drip Spout', Controls: 'Auto-Reverse Motor', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, WF-2158, citrus juicer, deluxe, orange juicer, grapefruit juicer, westpoint juicer, karachi, installment, reliance appliances' },

  // ── Coffee Makers ─────────────────────────────────────────────────────────────
  { model: 'WF-0811', mrp: 8500, cat: 'kitchen', sub: 'Coffee Maker',
    simplified_name: 'Westpoint Coffee Maker',
    description: 'The Westpoint WF-0811 Drip Coffee Maker brews fresh, aromatic coffee in minutes. The pause-and-pour function lets you pour a cup mid-brew without mess. The keep-warm plate maintains your coffee at the perfect drinking temperature. Compatible with ground coffee and paper filters. Ideal for households that start their day with freshly brewed coffee. Available at Reliance Appliances, Karachi.',
    specs: { Type: 'Drip Coffee Maker', Functions: 'Brew + Keep Warm', 'Pause & Pour': 'Yes', Plate: 'Keep-Warm Heating Plate', Filter: 'Reusable Filter Basket', Controls: 'On/Off Switch', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, WF-0811, coffee maker, drip coffee, coffee machine, westpoint coffee, karachi, installment, reliance appliances' },

  { model: 'WF-0825', mrp: 17850, cat: 'kitchen', sub: 'Coffee Maker',
    simplified_name: 'Westpoint Espresso Coffee Maker',
    description: 'The Westpoint WF-0825 Espresso Machine brews rich, barista-style espresso at home using high-pressure extraction. The steam wand froths milk for cappuccinos and lattes. The stainless steel body and professional styling make it a statement appliance in any kitchen. Compatible with ground espresso coffee. Available at Reliance Appliances, Karachi.',
    specs: { Type: 'Espresso Machine', Pressure: 'High-Pressure Extraction', 'Steam Wand': 'Milk Frother / Steam Wand', Body: 'Stainless Steel', Filter: 'Portafilter Basket', Controls: 'Pressure / On-Off Switch', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, WF-0825, espresso machine, coffee maker, cappuccino, latte, steam wand, westpoint coffee, karachi, installment, reliance appliances' },

  // ── Insect Killers ────────────────────────────────────────────────────────────
  { model: 'WF-1086', mrp: 8750, cat: 'small', sub: 'Insect Killer',
    simplified_name: 'Westpoint Insect Killer',
    description: 'The Westpoint WF-1086 Electric Insect Killer uses UV light to attract mosquitoes, flies and other flying insects, then eliminates them with a high-voltage electric grid — no chemicals, no sprays. The removable collection tray is easy to clean. Safe and effective for homes, offices and outdoor areas. Available at Reliance Appliances, Karachi.',
    specs: { Type: 'Electric Insect Killer (UV Light Trap)', Mechanism: 'UV Attraction + High-Voltage Electric Grid', Coverage: 'Indoor Use', 'Collection Tray': 'Removable & Washable', Safety: 'Protective Safety Cage', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, WF-1086, insect killer, mosquito killer, fly killer, bug zapper, westpoint insect killer, karachi, installment, reliance appliances' },

  { model: 'WF-1089', mrp: 11900, cat: 'small', sub: 'Insect Killer',
    simplified_name: 'Westpoint Insect Killer Large',
    description: 'The Westpoint WF-1089 Large Electric Insect Killer covers a larger area with higher-power UV tubes that attract insects from a greater distance. The heavy-duty electric grid eliminates insects instantly. The reinforced safety cage and stable base make it suitable for restaurants, large rooms and covered outdoor spaces. Available at Reliance Appliances, Karachi.',
    specs: { Type: 'Electric Insect Killer (Large)', Mechanism: 'High-Power UV Attraction + Electric Grid', Coverage: 'Large Area — Indoor / Covered Outdoor', 'Collection Tray': 'Removable & Washable', Safety: 'Heavy-Duty Protective Cage', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, WF-1089, insect killer, large insect killer, mosquito killer, fly killer, restaurant, westpoint insect killer, karachi, installment, reliance appliances' },

  // ── Baby Care ─────────────────────────────────────────────────────────────────
  { model: 'WF-0732', mrp: 3925, cat: 'small', sub: 'Baby Care',
    simplified_name: 'Westpoint Baby Bottle Warmer',
    description: 'The Westpoint WF-0732 Baby Bottle Warmer gently and evenly warms infant formula and breast milk to a safe, consistent temperature. Unlike microwave heating, the warmer heats gradually from outside to prevent dangerous hot spots in the milk. Compatible with most standard and wide-neck bottles. An essential appliance for new parents. Available at Reliance Appliances, Karachi.',
    specs: { Type: 'Baby Bottle Warmer', Heating: 'Gentle Water-Bath Warming (No Hot Spots)', Compatibility: 'Standard & Wide-Neck Bottles', Controls: 'Thermostat Temperature Control', Indicator: 'Ready Indicator Light', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, WF-0732, baby bottle warmer, bottle warmer, baby, infant, milk warmer, westpoint baby, karachi, installment, reliance appliances' },

  { model: 'WF-0775', mrp: 5100, cat: 'small', sub: 'Baby Care',
    simplified_name: 'Westpoint Egg Boiler',
    description: 'The Westpoint WF-0775 Egg Boiler cooks perfectly boiled eggs every time — soft, medium or hard — with just the right amount of water and the built-in timer. The auto-shutoff activates as soon as cooking is complete, preventing overboiling. Holds up to 7 eggs at once for family use. A quick, energy-efficient alternative to boiling eggs on a stove. Available at Reliance Appliances, Karachi.',
    specs: { Type: 'Electric Egg Boiler', Capacity: 'Up to 7 Eggs', Settings: 'Soft / Medium / Hard Boil', 'Auto-Shutoff': 'Yes — Auto-Shutoff When Done', Accessories: 'Measuring Cup with Pin', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, WF-0775, egg boiler, electric egg boiler, egg cooker, westpoint egg boiler, karachi, installment, reliance appliances' },

  // ── Bath Scales ────────────────────────────────────────────────────────────────
  { model: 'WF-8026', mrp: 3850, cat: 'care', sub: 'Bath Scale',
    simplified_name: 'Westpoint Digital Bath Scale',
    description: 'The Westpoint WF-8026 Digital Bath Scale provides accurate, instant weight readings on a clear LCD display. The tempered glass platform is sleek, durable and easy to clean. Auto-on and auto-off functions conserve battery. A simple, reliable health monitoring tool for the bathroom. Available at Reliance Appliances, Karachi.',
    specs: { Type: 'Digital Bath Scale', Display: 'Large LCD Display', Platform: 'Tempered Glass', 'Auto On/Off': 'Yes', Capacity: 'Up to 150 kg', 'Unit Selection': 'kg / lb', Battery: 'Included', 'Power Supply': 'Battery-Operated', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, WF-8026, digital scale, bathroom scale, weight scale, health scale, westpoint scale, karachi, installment, reliance appliances' },
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
        simplified_name: p.simplified_name, category: p.cat, sub_category: p.sub,
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
