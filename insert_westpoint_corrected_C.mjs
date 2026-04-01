/**
 * insert_westpoint_corrected_C.mjs
 * Oven Toasters, Microwaves, Hot Plates, Induction Cooker,
 * Rice Cookers, Vacuum Cleaners, Fan Heaters
 *
 * Source: Westpoint Price List (Feb-26 / Mar-26)
 * Model format: numeric-only (matching existing Westpoint DB convention)
 * Price: round(MRP × 1.15 / 100) × 100
 *
 * Run:  node insert_westpoint_corrected_C.mjs [--dry-run]
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
  // ── Oven Toasters ─────────────────────────────────────────────────────────────
  { model: '1064EX', mrp: 12350, cat: 'kitchen', sub: 'Oven Toaster',
    name: 'Westpoint Oven Toaster',
    desc: 'The Westpoint 1064EX Oven Toaster is a compact countertop oven for toasting, baking and grilling. The adjustable thermostat and timer let you bake bread, toast sandwiches, grill vegetables or warm meals with precision. The removable crumb tray makes cleanup simple. An affordable, space-saving alternative to a full-size oven for small households. Available at Reliance Appliances, Karachi.',
    specs: { Type: 'Oven Toaster', Functions: 'Toast, Bake, Grill, Warm', Controls: 'Adjustable Thermostat + 60-Minute Timer', Accessories: 'Wire Rack + Baking Tray + Crumb Tray', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, 1064EX, oven toaster, countertop oven, toaster oven, westpoint oven, karachi, installment, reliance appliances' },

  { model: '1065EX', mrp: 13275, cat: 'kitchen', sub: 'Oven Toaster',
    name: 'Westpoint Oven Toaster with BBQ Grill',
    desc: 'The Westpoint 1065EX Oven Toaster with BBQ Grill adds a grilling function to the standard toaster oven, letting you prepare grilled meats, vegetables and kebabs at home. The rotisserie-style grill element browns food evenly on all sides. Multiple functions — toast, bake, grill — in one compact appliance. Available at Reliance Appliances, Karachi.',
    specs: { Type: 'Oven Toaster with BBQ Grill', Functions: 'Toast, Bake, Grill, BBQ', Controls: 'Thermostat + Timer', Accessories: 'Grill Rack + Baking Tray + Crumb Tray', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, 1065EX, oven toaster, BBQ grill, countertop oven, westpoint oven, karachi, installment, reliance appliances' },

  { model: '1070', mrp: 18250, cat: 'kitchen', sub: 'Oven Toaster',
    name: 'Westpoint Oven Toaster with BBQ Grill 22L',
    desc: 'The Westpoint 1070 is a large 22-litre oven toaster with a full BBQ grill function. The spacious interior accommodates a whole chicken, a large pizza or multiple racks of baked goods. The dual heating elements (top and bottom) ensure even heat distribution throughout the cooking chamber. A versatile full-function countertop oven for larger families. Available at Reliance Appliances, Karachi.',
    specs: { Type: 'Oven Toaster with BBQ Grill', Capacity: '22 Litres', Functions: 'Toast, Bake, Grill, BBQ, Roast', Heating: 'Dual Top & Bottom Heating Elements', Controls: 'Thermostat + 60-Minute Timer', Accessories: 'Wire Rack, Baking Tray, Crumb Tray', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, 1070, oven toaster, 22 litre, BBQ grill, large oven, westpoint oven, karachi, installment, reliance appliances' },

  { model: '3069TT', mrp: 19150, cat: 'kitchen', sub: 'Oven Toaster',
    name: 'Westpoint Convection Oven with BBQ Grill',
    desc: 'The Westpoint 3069TT Convection Oven with BBQ Grill adds a fan-forced convection system to accelerate cooking and ensure perfectly even results throughout the oven. Convection baking reduces cooking times by up to 25% and eliminates hot spots for consistently golden results. The BBQ grill element adds grilling capability. Available at Reliance Appliances, Karachi.',
    specs: { Type: 'Convection Oven with BBQ Grill', Functions: 'Convection Bake, Toast, Grill, BBQ', Heating: 'Fan-Forced Convection + Dual Elements', Controls: 'Thermostat + Timer', Accessories: 'Wire Rack, Baking Tray, Crumb Tray', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, 3069TT, convection oven, BBQ grill, countertop oven, westpoint oven, karachi, installment, reliance appliances' },

  { model: '3075', mrp: 22600, cat: 'kitchen', sub: 'Oven Toaster',
    name: 'Westpoint Digital Oven with Fan & BBQ Grill',
    desc: 'The Westpoint 3075 Digital Oven combines fan-forced convection, a digital display and BBQ grill for a premium countertop cooking experience. The digital panel allows precise temperature setting and displays the remaining cooking time accurately. Fan-forced heat circulation ensures evenly cooked results on every rack level. Available at Reliance Appliances, Karachi.',
    specs: { Type: 'Digital Convection Oven with BBQ Grill', Display: 'Digital LED Display', Functions: 'Convection Bake, Grill, BBQ, Toast', Heating: 'Fan-Forced Convection + Top/Bottom Elements', Controls: 'Electronic Thermostat + Digital Timer', Accessories: 'Wire Rack, Baking Tray, Crumb Tray', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, 3075, digital oven, convection oven, BBQ grill, fan oven, westpoint oven, karachi, installment, reliance appliances' },

  { model: '3079', mrp: 27600, cat: 'kitchen', sub: 'Oven Toaster',
    name: 'Westpoint Oven Toaster BBQ Grill Rotisserie',
    desc: 'The Westpoint 3079 is a full-featured countertop oven with a rotisserie function that self-bastes whole chickens, roasts and kebab skewers as they rotate. The BBQ grill element adds an authentic chargrilled finish. Multiple cooking functions and a large capacity make this an all-in-one cooking solution. Available at Reliance Appliances, Karachi.',
    specs: { Type: 'Oven Toaster with Rotisserie & BBQ Grill', Functions: 'Bake, Grill, BBQ, Rotisserie, Toast', Accessories: 'Rotisserie Spit + Wire Rack + Baking Tray + Crumb Tray', Controls: 'Thermostat + Timer', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, 3079, oven toaster, rotisserie, BBQ grill, chicken roaster, westpoint oven, karachi, installment, reliance appliances' },

  { model: '3080', mrp: 29000, cat: 'kitchen', sub: 'Oven Toaster',
    name: 'Westpoint Digital Oven Fan & BBQ Grill Rotisserie',
    desc: "The Westpoint 3080 is Westpoint's flagship countertop oven — combining digital precision, fan-forced convection, BBQ grill and a rotisserie function in one premium appliance. The digital display provides accurate temperature and timer control. Fan convection ensures even heat distribution, while the rotisserie delivers self-basting whole-bird roasting. Available at Reliance Appliances, Karachi.",
    specs: { Type: 'Digital Convection Oven with Rotisserie & BBQ Grill', Display: 'Digital Control Panel', Functions: 'Convection Bake, Grill, BBQ, Rotisserie, Toast', Heating: 'Fan-Forced Convection + Dual Heating Elements', Controls: 'Electronic Thermostat + Digital Timer', Accessories: 'Rotisserie Spit, Wire Rack, Baking Tray, Crumb Tray', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, 3080, digital oven, rotisserie, convection, BBQ grill, premium oven, westpoint oven, karachi, installment, reliance appliances' },

  // ── Microwaves ────────────────────────────────────────────────────────────────
  { model: '9028', mrp: 18300, cat: 'microwave-solo', sub: 'Solo Microwave',
    name: 'Westpoint Microwave Oven 20L Manual',
    desc: 'The Westpoint 9028 is a 20-litre manual microwave oven for everyday heating, defrosting and basic cooking tasks. The simple rotary knob controls make it easy to set cooking time and power level without the complexity of digital menus. Compact dimensions suit apartments and smaller kitchens. Available at Reliance Appliances, Karachi.',
    specs: { Type: 'Solo Microwave Oven', Capacity: '20 Litres', Controls: 'Manual Rotary Knobs', Functions: 'Heat, Defrost, Cook', Turntable: 'Rotating Glass Turntable', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, 9028, microwave, microwave oven, solo microwave, 20 litre, manual microwave, westpoint microwave, karachi, installment, reliance appliances' },

  { model: '9029', mrp: 18350, cat: 'microwave-solo', sub: 'Solo Microwave',
    name: 'Westpoint Microwave Oven 20L',
    desc: 'The Westpoint 9029 Microwave Oven provides reliable everyday microwave cooking in a compact 20-litre capacity. Heat leftovers, defrost frozen food and cook simple meals with ease. The rotating glass turntable ensures even heating throughout the food, eliminating cold spots. Available at Reliance Appliances, Karachi.',
    specs: { Type: 'Solo Microwave Oven', Capacity: '20 Litres', Controls: 'Rotary Knobs', Functions: 'Heat, Defrost, Cook', Turntable: 'Rotating Glass Turntable', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, 9029, microwave, microwave oven, solo microwave, 20 litre, westpoint microwave, karachi, installment, reliance appliances' },

  { model: '9031', mrp: 27650, cat: 'microwave-solo', sub: 'Solo Microwave',
    name: 'Westpoint Microwave Oven 25L Digital',
    desc: 'The Westpoint 9031 Digital Microwave Oven offers precise cooking control through a digital display and touch controls. The 25-litre capacity accommodates larger dishes and casseroles. Multiple power levels, auto-cook programs and a digital timer make cooking convenient and consistent. The child-lock function adds safety in family homes. Available at Reliance Appliances, Karachi.',
    specs: { Type: 'Solo Microwave Oven — Digital', Capacity: '25 Litres', Display: 'Digital LED Display', Controls: 'Touch Pad Controls', Functions: 'Heat, Defrost, Auto-Cook Programs', 'Child Lock': 'Yes', Turntable: 'Rotating Glass Turntable', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, 9031, microwave, digital microwave, 25 litre, solo microwave, westpoint microwave, karachi, installment, reliance appliances' },

  { model: '9039', mrp: 31050, cat: 'microwave-convection', sub: 'Microwave with Oven',
    name: 'Westpoint Microwave with Oven 30L Digital',
    desc: 'The Westpoint 9039 is a 30-litre combination microwave and oven that handles both microwave heating and convection baking. Use microwave mode for fast reheating and defrosting, oven mode for baking cakes and grilling, or combine both for faster cooking with better browning. The digital display and preset programs make operation intuitive. A true all-in-one cooking appliance. Available at Reliance Appliances, Karachi.',
    specs: { Type: 'Microwave + Convection Oven (Combination)', Capacity: '30 Litres', Display: 'Digital Display', Controls: 'Touch Pad + Rotary Dial', Functions: 'Microwave, Convection Bake, Grill, Combination', Accessories: 'Wire Rack + Glass Turntable', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, 9039, microwave with oven, combination microwave, convection microwave, 30 litre, westpoint microwave, karachi, installment, reliance appliances' },

  // ── Hot Plates & Induction ────────────────────────────────────────────────────
  { model: '2061', mrp: 6700, cat: 'kitchen', sub: 'Hot Plate',
    name: 'Westpoint Hot Plate Single 1500W',
    desc: 'The Westpoint 2061 Single Hot Plate is a portable electric cooking surface for homes with limited space, outdoor use, or as an extra cooking ring. The 1500W coil element heats up quickly and provides consistent, adjustable heat for all types of cooking vessels. Simple dial control. Available at Reliance Appliances, Karachi.',
    specs: { Type: 'Single Electric Hot Plate', Power: '1500 Watts', Elements: 'Single Coil Heating Element', Controls: 'Variable Heat Dial', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, 2061, hot plate, electric stove, single burner, portable cooker, westpoint hot plate, karachi, installment, reliance appliances' },

  { model: '2062', mrp: 9650, cat: 'kitchen', sub: 'Hot Plate',
    name: 'Westpoint Hot Plate Double',
    desc: 'The Westpoint 2062 Double Hot Plate provides two independent cooking elements for simultaneous cooking — perfect for preparing rice and curry at the same time. Each element has its own heat control dial. Sturdy, portable and easy to use as a primary or secondary cooking solution. Available at Reliance Appliances, Karachi.',
    specs: { Type: 'Double Electric Hot Plate', Elements: 'Two Independent Coil Heating Elements', Controls: 'Individual Variable Heat Dials', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, 2062, hot plate, double burner, electric stove, two burner, westpoint hot plate, karachi, installment, reliance appliances' },

  { model: '2174', mrp: 11200, cat: 'kitchen', sub: 'Induction Cooker',
    name: 'Westpoint Induction Cooker',
    desc: 'The Westpoint 2174 Induction Cooker uses electromagnetic technology to heat only the cooking vessel — not the surface — making it significantly more energy-efficient and safer than conventional hot plates. The glass-ceramic surface stays cool to the touch during cooking, reducing the risk of burns. Precise digital temperature control and a timer function make cooking accurate and consistent. Requires induction-compatible cookware. Available at Reliance Appliances, Karachi.',
    specs: { Type: 'Induction Cooker', Technology: 'Electromagnetic Induction Heating', Surface: 'Cool-Touch Glass-Ceramic Surface', Display: 'Digital Display', Controls: 'Electronic Touch Controls + Timer', Cookware: 'Requires Induction-Compatible (Magnetic) Cookware', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, 2174, induction cooker, induction stove, electric cooker, energy saving, westpoint induction, karachi, installment, reliance appliances' },

  // ── Rice Cookers ──────────────────────────────────────────────────────────────
  { model: '2021', mrp: 6800, cat: 'kitchen', sub: 'Rice Cooker',
    name: 'Westpoint Rice Cooker 1.8L',
    desc: 'The Westpoint 2021 Rice Cooker takes the guesswork out of cooking perfect rice every time. The automatic cook-and-keep-warm function switches to warming mode as soon as the rice is done, so your meal is always ready when you are. The 1.8-litre non-stick inner pot is easy to clean, and the tempered glass lid lets you monitor cooking without lifting the lid. Available at Reliance Appliances, Karachi.',
    specs: { Type: 'Electric Rice Cooker', Capacity: '1.8 Litres', 'Inner Pot': 'Non-Stick Coated Inner Pot', Lid: 'Tempered Glass Lid', Functions: 'Cook + Auto Keep Warm', Controls: 'Single-Switch Operation', Accessories: 'Measuring Cup + Rice Spatula', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, 2021, rice cooker, electric rice cooker, 1.8 litre, auto warm, westpoint rice cooker, karachi, installment, reliance appliances' },

  { model: '2023', mrp: 7250, cat: 'kitchen', sub: 'Rice Cooker',
    name: 'Westpoint Rice Cooker with Steamer 2.2L',
    desc: 'The Westpoint 2023 Rice Cooker with Steamer adds a steam tray above the rice pot, letting you steam vegetables, fish or dumplings while rice cooks below — a complete one-pot meal solution. The 2.2-litre capacity is ideal for families of 4–5. Auto keep-warm keeps food at the perfect temperature until mealtime. Available at Reliance Appliances, Karachi.',
    specs: { Type: 'Rice Cooker with Steamer Tray', Capacity: '2.2 Litres', 'Inner Pot': 'Non-Stick Coated Inner Pot', 'Steam Tray': 'Included for Vegetables & Fish', Functions: 'Cook, Steam, Auto Keep Warm', Controls: 'Single-Switch Operation', Accessories: 'Steam Tray + Measuring Cup + Spatula', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, 2023, rice cooker, steamer, 2.2 litre, rice cooker with steamer, westpoint rice cooker, karachi, installment, reliance appliances' },

  // ── Vacuum Cleaners ───────────────────────────────────────────────────────────
  { model: '2093', mrp: 18900, cat: 'vacuum', sub: 'Vacuum Cleaner',
    name: 'Westpoint Vacuum Cleaner',
    desc: 'The Westpoint 2093 Vacuum Cleaner provides powerful suction for thorough cleaning of carpets, rugs, tiled floors and upholstery. Multiple suction settings and a set of attachments handle different surfaces and hard-to-reach areas. Compact and easy to manoeuvre around furniture. Available at Reliance Appliances, Karachi.',
    specs: { Type: 'Vacuum Cleaner', Suction: 'Powerful Motor Suction', Attachments: 'Floor Nozzle, Upholstery Tool, Crevice Tool', Controls: 'Variable Suction Control', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, 2093, vacuum cleaner, hoover, dust cleaner, carpet cleaner, westpoint vacuum, karachi, installment, reliance appliances' },

  { model: '2097', mrp: 19850, cat: 'vacuum', sub: 'Vacuum Cleaner',
    name: 'Westpoint Vacuum Cleaner 2-in-1',
    desc: 'The Westpoint 2097 2-in-1 Vacuum Cleaner converts between a floor vacuum and a handheld unit, giving you flexibility to clean floors, upholstery, car interiors and stairs. The detachable handheld section is lightweight and powerful for targeted cleaning. Available at Reliance Appliances, Karachi.',
    specs: { Type: '2-in-1 Vacuum Cleaner (Floor + Handheld)', Functions: 'Upright Floor Vacuum + Detachable Handheld', Suction: 'Powerful Motor', Attachments: 'Multiple Cleaning Attachments', Controls: 'Variable Suction', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, 2097, vacuum cleaner, 2 in 1, handheld vacuum, floor vacuum, westpoint vacuum, karachi, installment, reliance appliances' },

  { model: '2099', mrp: 25950, cat: 'vacuum', sub: 'Vacuum Cleaner',
    name: 'Westpoint Vacuum Cleaner 3-in-1',
    desc: 'The Westpoint 2099 3-in-1 Vacuum Cleaner is a comprehensive cleaning system covering floors, handheld cleaning and blowing functions in a single device. The blower function is ideal for removing dust from keyboards, electronics and garden furniture. Powerful suction and a full attachment set make this the most versatile Westpoint vacuum. Available at Reliance Appliances, Karachi.',
    specs: { Type: '3-in-1 Vacuum Cleaner (Vacuum + Handheld + Blower)', Functions: 'Floor Vacuum, Handheld, Blower Mode', Suction: 'High-Power Motor', Attachments: 'Full Attachment Set', Controls: 'Variable Suction + Function Switch', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, 2099, vacuum cleaner, 3 in 1, blower, handheld, westpoint vacuum, karachi, installment, reliance appliances' },

  // ── Fan Heaters ───────────────────────────────────────────────────────────────
  { model: '5014', mrp: 8200, cat: 'small', sub: 'Fan Heater',
    name: 'Westpoint Ceramic Fan Heater',
    desc: 'The Westpoint 5014 Ceramic Fan Heater quickly warms small to medium rooms using efficient PTC ceramic heating technology. Ceramic heaters warm up faster and maintain a more stable temperature than traditional coil heaters. The built-in fan distributes warm air evenly throughout the room. Available at Reliance Appliances, Karachi.',
    specs: { Type: 'Ceramic Fan Heater', Technology: 'PTC Ceramic Heating Element', Fan: 'Built-In Fan for Heat Distribution', Settings: '2 Heat Settings', 'Overheat Protection': 'Built-In Thermal Cutoff', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, 5014, fan heater, ceramic heater, room heater, electric heater, westpoint heater, karachi, installment, reliance appliances' },

  { model: '5015', mrp: 12400, cat: 'small', sub: 'Fan Heater',
    name: 'Westpoint Ceramic Fan Heater Deluxe',
    desc: 'The Westpoint 5015 Deluxe Ceramic Fan Heater adds extra power and a larger fan for heating bigger rooms faster. The PTC ceramic element ensures energy-efficient, consistent warmth, and the built-in overheat protection provides safety during extended use. The thermostat maintains your preferred room temperature automatically. Available at Reliance Appliances, Karachi.',
    specs: { Type: 'Ceramic Fan Heater — Deluxe', Technology: 'PTC Ceramic Heating Element', Fan: 'High-Output Fan', Settings: 'Multiple Heat Settings + Thermostat', 'Overheat Protection': 'Built-In Thermal Cutoff', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, 5015, fan heater, ceramic heater, deluxe, room heater, thermostat, westpoint heater, karachi, installment, reliance appliances' },

  { model: '5017', mrp: 11000, cat: 'small', sub: 'Fan Heater',
    name: 'Westpoint Ceramic Fan Heater with Remote',
    desc: 'The Westpoint 5017 Ceramic Fan Heater with Remote Control lets you adjust heat settings and power the unit on or off from across the room. PTC ceramic technology delivers fast, efficient heating with built-in safety cutoffs. Ideal for bedrooms where you want to control the heater from bed. Available at Reliance Appliances, Karachi.',
    specs: { Type: 'Ceramic Fan Heater with Remote', Technology: 'PTC Ceramic Heating Element', Control: 'Remote Control Included', Fan: 'Built-In Fan', Settings: 'Multiple Heat Settings + Thermostat', 'Overheat Protection': 'Built-In Thermal Cutoff', 'Power Supply': '220V / 50Hz', Warranty: '1 Year Westpoint Warranty' },
    tags: 'westpoint, 5017, fan heater, ceramic heater, remote control, room heater, westpoint heater, karachi, installment, reliance appliances' },
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
        simplified_name: p.name, category: p.cat, sub_category: p.sub,
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
