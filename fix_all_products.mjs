/**
 * COMPREHENSIVE PRODUCT AUDIT FIX SCRIPT
 * Uses service role key — bypasses RLS
 * Run: node fix_all_products.mjs
 */
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://fdfjavyopbrfvwtjaerw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjY0MTcwMCwiZXhwIjoyMDg4MjE3NzAwfQ.eyCmrSFge7BKVj9CYXVeDjjEtVXQVUhpWIIpN1an65w'
)

let ok = 0, err = 0, skipped = 0

async function fix(slug, update, label) {
  const { data, error } = await sb.from('products').update(update).eq('slug', slug).select('id')
  if (error) { console.log(`❌  ${label}: ${error.message}`); err++ }
  else if (!data?.length) { console.log(`⚠️  ${label}: no row matched slug="${slug}"`); skipped++ }
  else { console.log(`✅  ${label}`); ok++ }
}

async function fixById(id, update, label) {
  const { data, error } = await sb.from('products').update(update).eq('id', id).select('id')
  if (error) { console.log(`❌  ${label}: ${error.message}`); err++ }
  else if (!data?.length) { console.log(`⚠️  ${label}: no row matched id="${id}"`); skipped++ }
  else { console.log(`✅  ${label}`); ok++ }
}

// Helper — fetch specs then merge
async function mergeSpecs(slug, newSpecs, otherFields = {}, label) {
  const { data: p } = await sb.from('products').select('specs').eq('slug', slug).single()
  if (!p) { console.log(`⚠️  ${label}: not found`); skipped++; return }
  await fix(slug, { specs: { ...(p.specs || {}), ...newSpecs }, ...otherFields }, label)
}

// ════════════════════════════════════════════════════════════════
// 1. REFRIGERATORS — Capacity fixes
// ════════════════════════════════════════════════════════════════
console.log('\n── REFRIGERATORS ──────────────────────────────────────────')

// 9191 series: specs said 18 Cu.Ft but actual = 16 Cu.Ft
const r9191 = await sb.from('products').select('slug,specs').ilike('slug','%9191%').eq('category','Large Refrigerators')
for (const p of r9191.data) {
  await fix(p.slug, { specs: { ...p.specs, Capacity: '16 Cu.Ft (453 Litres approx.)' } }, `9191 → 16 Cu.Ft (${p.slug})`)
}

// 9169 series: simplified_name was changed 11→12 (wrong), revert to 11 Cu.Ft
const r9169 = await sb.from('products').select('slug,simplified_name,specs').ilike('slug','%9169%')
for (const p of r9169.data) {
  const newName = p.simplified_name?.replace(/12 Cu\.Ft/g,'11 Cu.Ft').replace(/11 Cu\.Ft.*11 Cu\.Ft/,'11 Cu.Ft')
  await fix(p.slug, {
    simplified_name: newName,
    specs: { ...p.specs, Capacity: '11 Cu.Ft (312 Litres approx.)' }
  }, `9169 → 11 Cu.Ft (${p.slug})`)
}

// 9173 series: simplified_name was changed 12→13 (wrong), revert to 12 Cu.Ft
const r9173 = await sb.from('products').select('slug,simplified_name,specs').ilike('slug','%9173%')
for (const p of r9173.data) {
  const newName = p.simplified_name?.replace(/13 Cu\.Ft/g,'12 Cu.Ft').replace(/12 Cu\.Ft.*12 Cu\.Ft/,'12 Cu.Ft')
  await fix(p.slug, {
    simplified_name: newName,
    specs: { ...p.specs, Capacity: '12 Cu.Ft (340 Litres approx.)' }
  }, `9173 → 12 Cu.Ft (${p.slug})`)
}

// French Door — missing Capacity
await mergeSpecs('dawlance-7650-inv-gd-iot',    { Capacity: '21 Cu.Ft (595 Litres approx.)' },
  { simplified_name: 'Dawlance 21 Cu.Ft Glass Door Inverter Refrigerator 7650 IOT' }, '7650 IOT → 21 Cu.Ft')
await mergeSpecs('dawlance-dfd-900-gd-inv-gd-inv-black-honey-comb', { Capacity: '24 Cu.Ft (679 Litres approx.)' },
  { simplified_name: 'Dawlance 24 Cu.Ft Glass Door Inverter French Door Refrigerator DFD-900' }, 'DFD-900 → 24 Cu.Ft')
await mergeSpecs('dawlance-dmd-7950-inv-gd',     { Capacity: '22 Cu.Ft (623 Litres approx.)' },
  { simplified_name: 'Dawlance 22 Cu.Ft Glass Door Inverter Multi-Door Refrigerator DMD-7950' }, 'DMD-7950 GD → 22 Cu.Ft')
await mergeSpecs('dawlance-dmd-7950-inv-inox',   { Capacity: '22 Cu.Ft (623 Litres approx.)' },
  { simplified_name: 'Dawlance 22 Cu.Ft Inverter Multi-Door Refrigerator DMD-7950 INOX' }, 'DMD-7950 INOX → 22 Cu.Ft')

// Side-by-Side — missing Capacity
await mergeSpecs('dawlance-dss-9055-inv-gd',       { Capacity: '22 Cu.Ft (623 Litres approx.)' },
  { simplified_name: 'Dawlance 22 Cu.Ft Inverter Side-by-Side Glass Door Refrigerator DSS-9055' }, 'DSS-9055 → 22 Cu.Ft')
await mergeSpecs('dawlance-dtm-8365-inv-inox-dawlance', { Capacity: '22 Cu.Ft (623 Litres approx.)' },
  { simplified_name: 'Dawlance 22 Cu.Ft Inverter Side-by-Side Refrigerator DTM-8365 INOX' }, 'DTM-8365 → 22 Cu.Ft')

// 9055 INV: category wrong (Medium → Large) + missing capacity
await mergeSpecs('dawlance-9055-inv-inverter', { Capacity: '22 Cu.Ft (623 Litres approx.)' },
  { category: 'Large Refrigerators', simplified_name: 'Dawlance 22 Cu.Ft Inverter Refrigerator 9055' }, '9055 INV → Large + 22 Cu.Ft')

// MiniBar: category wrong (Medium → Small) + correct capacity 4→3 Cu.Ft
await mergeSpecs('dawlance-dmb-4467-minibar-dawlance',
  { Capacity: '3 Cu.Ft (71 Litres approx.)', Type: 'Single Door', Inverter: 'No', 'Defrost Type': 'Manual' },
  { category: 'Small Refrigerators', simplified_name: 'Dawlance 3 Cu.Ft Mini Bar Refrigerator DMB-4467' }, 'MiniBar → Small + 3 Cu.Ft')

// DSD 4890: category wrong (Medium → Small) + missing capacity
await mergeSpecs('dawlance-ref-dsd-4890-dawlance',
  { Capacity: '6 Cu.Ft (170 Litres approx.)', Type: 'Double Door', Inverter: 'No', 'Defrost Type': 'Manual (Freezer Compartment)' },
  { category: 'Small Refrigerators', simplified_name: 'Dawlance 6 Cu.Ft Refrigerator DSD-4890' }, 'DSD-4890 → Small + 6 Cu.Ft')

// Haier HRF-578TSG: was 22 Cu.Ft + Inverter=No → 17 Cu.Ft + Twin Inverter Yes
await mergeSpecs('haier-hrf-578tsg-tbg',
  { Capacity: '17 Cu.Ft (505 Litres approx.)', Inverter: 'Yes — Twin Inverter', 'Defrost Type': 'Auto / No-Frost (Fan-Forced)' },
  { simplified_name: 'Haier 17 Cu.Ft No Frost French T-Door Twin Inverter Refrigerator HRF-578' }, 'HRF-578 → 17 Cu.Ft Twin Inverter')

// Haier HRF-518 IFB: confirm No-Frost + Inverter, fix capacity
await mergeSpecs('haier-hrf-518-ifb',
  { Capacity: '18 Cu.Ft (518 Litres approx.)', Inverter: 'Yes', 'Defrost Type': 'Auto / No-Frost (Fan-Forced)' },
  { simplified_name: 'Haier 18 Cu.Ft No Frost Inverter Refrigerator HRF-518 IFB' }, 'HRF-518 → 18 Cu.Ft No-Frost')

// Haier HRF-538: name says "20 Cubic Feet" but model=538L → 19 Cu.Ft
const r538 = await sb.from('products').select('slug,simplified_name,specs').ilike('slug','%hrf-538%')
for (const p of r538.data) {
  await fix(p.slug, {
    simplified_name: p.simplified_name?.replace(/20 Cubic Feet/i,'19 Cu.Ft').replace(/22 Cu\.Ft/i,'19 Cu.Ft'),
    specs: { ...p.specs, Capacity: '19 Cu.Ft (538 Litres approx.)' }
  }, `HRF-538 → 19 Cu.Ft (${p.slug})`)
}

// Haier HRF-678 TGG — add French Door to name
await mergeSpecs('haier-hrf-678-tgg', {},
  { simplified_name: 'Haier 24 Cu.Ft Glass Door Inverter French T-Door Refrigerator HRF-678 TGG' }, 'HRF-678 name')

// Haier HRF-622 — add Side-by-Side to names
await fix('haier-hrf-622-ibs', { simplified_name: 'Haier 22 Cu.Ft Side-by-Side Inverter Refrigerator HRF-622 IBS' }, 'HRF-622 IBS name')
await fix('haier-hrf-622-icg', { simplified_name: 'Haier 22 Cu.Ft Glass Door Side-by-Side Inverter Refrigerator HRF-622 ICG' }, 'HRF-622 ICG name')


// ════════════════════════════════════════════════════════════════
// 2. MICROWAVES — Capacities, Powers, Names
// ════════════════════════════════════════════════════════════════
console.log('\n── MICROWAVES ──────────────────────────────────────────────')

const mwFixes = [
  { slug:'dawlance-md-4-black',   cap:'20L', pwr:'700W', name:'Dawlance 20L Solo Microwave Oven MD-4 Black' },
  { slug:'dawlance-md-4-white',   cap:'20L', pwr:'700W', name:'Dawlance 20L Solo Microwave Oven MD-4 White' },
  { slug:'dawlance-md-7',         cap:'20L', pwr:'700W', name:'Dawlance 20L Solo Microwave Oven MD-7' },
  { slug:'dawlance-md-10',        cap:'20L', pwr:'700W', name:'Dawlance 20L Solo Microwave Oven MD-10' },
  { slug:'dawlance-md-15',        cap:'20L', pwr:'700W', name:'Dawlance 20L Solo Microwave Oven MD-15' },
  { slug:'dawlance-md-20-inv',    cap:'20L', pwr:'700W', name:'Dawlance 20L Inverter Microwave Oven MD-20 INV',
    extra: { Technology:'Inverter','Inverter Technology':'Yes — 21% more energy efficient, even cooking' } },
  { slug:'dawlance-dw-210-s-pro',      cap:'20L', pwr:'700W', name:'Dawlance 20L Solo Microwave Oven DW-210 S PRO' },
  { slug:'dawlance-dw-210-solo-white', cap:'20L', pwr:'700W', name:'Dawlance 20L Solo Microwave Oven DW-210 Solo White' },
  { slug:'dawlance-dw-220-s',          cap:'20L', pwr:'700W', name:'Dawlance 20L Solo Microwave Oven DW-220 S' },
  { slug:'dawlance-dw-295',     cap:'20L', pwr:'700W', name:'Dawlance 20L Solo Microwave Oven DW-295' },
  { slug:'dawlance-dw-297-gss', cap:'20L', pwr:'700W', name:'Dawlance 20L Grill Microwave Oven DW-297 GSS' },
  { slug:'dawlance-dw-374-champagne', cap:'23L', pwr:'800W', name:'Dawlance 23L Solo Microwave Oven DW-374 Champagne' },
  { slug:'dawlance-dw-374-silver',    cap:'23L', pwr:'800W', name:'Dawlance 23L Solo Microwave Oven DW-374 Silver' },
  { slug:'dawlance-dw-388',           cap:'23L', pwr:'800W', name:'Dawlance 23L Solo Microwave Oven DW-388' },
  { slug:'dawlance-dw-390-s-dawlance',cap:'23L', pwr:'800W', name:'Dawlance 23L Solo Microwave Oven DW-390 S' },
  { slug:'dawlance-dw-393-g-dawlance',cap:'23L', pwr:'800W', name:'Dawlance 23L Grill Microwave Oven DW-393 G' },
  { slug:'dawlance-dw-393-gss',       cap:'23L', pwr:'800W', name:'Dawlance 23L Grill Microwave Oven DW-393 GSS' },
  { slug:'dawlance-dw-133-rg-dawlance',cap:'33L',pwr:'1000W',name:'Dawlance 33L Grill Microwave Oven DW-133 RG' },
  { slug:'dawlance-dw-128g',    cap:'28L', pwr:'1000W',name:'Dawlance 28L Grill Microwave Oven DW-128G' },
  { slug:'dawlance-dw-132-s-digital-solo',cap:'32L',pwr:'1000W',name:'Dawlance 32L Solo Microwave Oven DW-132 S Digital' },
  { slug:'dawlance-dw-133-g',   cap:'33L', pwr:'1000W',name:'Dawlance 33L Grill Microwave Oven DW-133 G' },
  { slug:'dawlance-dw-136g',    cap:'36L', pwr:'1000W',name:'Dawlance 36L Grill Microwave Oven DW-136G' },
]
for (const f of mwFixes) {
  const { data: p } = await sb.from('products').select('specs').eq('slug',f.slug).single()
  if (!p) { console.log(`⚠️  MW not found: ${f.slug}`); skipped++; continue }
  await fix(f.slug, {
    simplified_name: f.name,
    specs: { ...p.specs, Capacity: f.cap, Power: f.pwr, ...(f.extra||{}) }
  }, `MW ${f.slug}`)
}

// Convection/air fryer microwave names
const convNames = [
  ['dawlance-dw-115-chzp',       'Dawlance 15L Convection Microwave Oven DW-115 CHZP'],
  ['dawlance-dw-131-hp',         'Dawlance 31L Convection Microwave Oven DW-131 HP'],
  ['dawlance-dw-142hzp',         'Dawlance 42L Convection Microwave Oven DW-142 HZP'],
  ['dawlance-dw-162hzp',         'Dawlance 62L Convection Microwave Oven DW-162 HZP'],
  ['dawlance-dw-395-hcg',        'Dawlance 30L Convection Grill Microwave Oven DW-395 HCG'],
  ['dawlance-dw-530-af',         'Dawlance 30L Air Fryer Microwave Oven DW-530 AF'],
  ['dawlance-dw-550-af',         'Dawlance 30L Air Fryer Microwave Oven DW-550 AF'],
  ['dawlance-dw-560-inverter',   'Dawlance 30L Inverter Convection Microwave Oven DW-560'],
  ['dawlance-dwmo-4520-cr',      'Dawlance 45L Convection Microwave Oven DWMO-4520 CR'],
  ['dawlance-dwmo-5222-cr',      'Dawlance 52L Convection Microwave Oven DWMO-5222 CR'],
  ['dawlance-dwmo-4215-cr',      'Dawlance 42L Convection Microwave Oven DWMO-4215 CR'],
  ['dawlance-mini-oven-dwmo-2113-c','Dawlance 21L Convection Mini Oven DWMO-2113 C'],
  ['westpoint-822', 'Westpoint 20L Grill Microwave Oven WF-822'],
  ['westpoint-832', 'Westpoint 20L Grill Microwave Oven WF-832'],
  ['westpoint-853', 'Westpoint 25L Grill Microwave Oven WF-853'],
  ['westpoint-851', 'Westpoint 20L Convection Microwave Oven WF-851'],
  ['westpoint-7500','Westpoint 25L Convection Microwave Oven WF-7500'],
]
for (const [slug, name] of convNames) {
  await fix(slug, { simplified_name: name }, `conv name ${slug}`)
}


// ════════════════════════════════════════════════════════════════
// 3. TELEVISIONS — Screen Size + Resolution
// ════════════════════════════════════════════════════════════════
console.log('\n── TELEVISIONS ─────────────────────────────────────────────')

const tvFixes = [
  { slug:'dawlance-apollo-144hz-qled-google-tv-55', size:'55" (139 cm)', res:'4K Ultra HD (3840 × 2160)', hz:'144 Hz', name:'Dawlance 55" 4K QLED 144Hz Google TV APOLLO', type:'QLED (Quantum Dot)' },
  { slug:'dawlance-apollo-144hz-qled-google-tv-65', size:'65" (165 cm)', res:'4K Ultra HD (3840 × 2160)', hz:'144 Hz', name:'Dawlance 65" 4K QLED 144Hz Google TV APOLLO', type:'QLED (Quantum Dot)' },
  { slug:'dawlance-kore-fhd-google-tv-40',          size:'40" (102 cm)', res:'Full HD (1920 × 1080)', hz:'60 Hz', name:'Dawlance 40" Full HD Google TV KORE', type:'Direct LED' },
  { slug:'dawlance-kore-fhd-google-tv-43',          size:'43" (109 cm)', res:'Full HD (1920 × 1080)', hz:'60 Hz', name:'Dawlance 43" Full HD Google TV KORE', type:'Direct LED' },
  { slug:'dawlance-kore-hd-google-tv-32',           size:'32" (81 cm)',  res:'HD Ready (1366 × 768)', hz:'60 Hz', name:'Dawlance 32" HD Google TV KORE', type:'Direct LED' },
  { slug:'dawlance-prismax-qled-google-tv-50',      size:'50" (127 cm)', res:'4K Ultra HD (3840 × 2160)', hz:'60 Hz', name:'Dawlance 50" 4K QLED Google TV PRISMAX', type:'QLED (Quantum Dot)' },
  { slug:'dawlance-prismax-qled-google-tv-55',      size:'55" (140 cm)', res:'4K Ultra HD (3840 × 2160)', hz:'60 Hz', name:'Dawlance 55" 4K QLED Google TV PRISMAX', type:'QLED (Quantum Dot)' },
  { slug:'dawlance-prismax-qled-google-tv-65',      size:'65" (165 cm)', res:'4K Ultra HD (3840 × 2160)', hz:'60 Hz', name:'Dawlance 65" 4K QLED Google TV PRISMAX', type:'QLED (Quantum Dot)' },
]
for (const f of tvFixes) {
  const { data: p } = await sb.from('products').select('specs').eq('slug',f.slug).single()
  if (!p) { console.log(`⚠️  TV not found: ${f.slug}`); skipped++; continue }
  await fix(f.slug, {
    simplified_name: f.name,
    specs: { ...p.specs, 'Screen Size': f.size, Resolution: f.res, 'Refresh Rate': f.hz, 'Display Type': f.type }
  }, `TV ${f.slug}`)
}


// ════════════════════════════════════════════════════════════════
// 4. WASHING MACHINES — Category corrections
// ════════════════════════════════════════════════════════════════
console.log('\n── WASHING MACHINES ────────────────────────────────────────')

// Haier HD spinners in wrong category (Semi-Auto → Spinners)
await fix('haier-hd-60-50', { category:'Spinners', sub_category:'Spin Dryer' }, 'HD 60-50 → Spinners')
await fix('haier-hd-80-60', { category:'Spinners', sub_category:'Spin Dryer' }, 'HD 80-60 → Spinners')

// EcoStar ESW-PR — missing capacity
await mergeSpecs('ecostar-esw-pr', { Capacity:'14 kg', Type:'Semi-Automatic' },
  { simplified_name:'EcoStar 14kg Semi-Automatic Washing Machine ESW-PR' }, 'EcoStar ESW-PR capacity')


// ════════════════════════════════════════════════════════════════
// 5. FREEZERS — Haier names
// ════════════════════════════════════════════════════════════════
console.log('\n── FREEZERS ────────────────────────────────────────────────')

const { data: haierFreezes } = await sb.from('products').select('slug,model,specs').ilike('brand','%haier%').eq('category','Freezers')
for (const p of haierFreezes) {
  const s = p.specs || {}
  const cap = s.Capacity || ''
  const cuft = cap.match(/[\d.]+\s*Cu\.Ft/i)?.[0] || ''
  if (!cuft) continue
  const inv = s.Inverter === 'Yes'
  const doors = (s.Type||'').includes('Double') ? 'Double Door ' : ''
  const invStr = inv ? 'Inverter ' : ''
  const newName = `Haier ${cuft} ${invStr}${doors}Chest Freezer ${p.model}`
  await fix(p.slug, { simplified_name: newName }, `Freezer name ${p.model}`)
}

// Dawlance VF-1035 names
await fix('dawlance-vf-1035wb-gd',         { simplified_name:'Dawlance 12.7 Cu.Ft Glass Door Vertical Freezer VF-1035' }, 'VF-1035 GD name')
await fix('dawlance-vf-1035wb-gd-cloud-white', { simplified_name:'Dawlance 12.7 Cu.Ft Glass Door Vertical Freezer VF-1035 (Cloud White)' }, 'VF-1035 Cloud White name')
await fix('dawlance-vf-1035wb-gd-avante',  { simplified_name:'Dawlance 12.7 Cu.Ft Glass Door Avante+ Vertical Freezer VF-1035' }, 'VF-1035 Avante+ name')


// ════════════════════════════════════════════════════════════════
// 6. HOME & HEATING APPLIANCES — Type field corrections
// ════════════════════════════════════════════════════════════════
console.log('\n── HOME & HEATING APPLIANCES ───────────────────────────────')

const homeHeatFixes = [
  // Fan Heaters with wrong Type
  { slug:'westpoint-4307', specs:{ Type:'Fan Heater','Power Supply':'220V / 50Hz' } },
  { slug:'westpoint-5147', specs:{ Type:'Fan Heater','Power Supply':'220V / 50Hz' } },
  { slug:'westpoint-6307', specs:{ Type:'Fan Heater','Power Supply':'220V / 50Hz' } },
  { slug:'westpoint-1546', specs:{ Type:'Tower Fan','Power Supply':'220V / 50Hz' } },
  // Garment Steamers
  { slug:'westpoint-1153', specs:{ Type:'Garment Steamer','Power Supply':'220V / 50Hz' } },
  { slug:'westpoint-1154', specs:{ Type:'Garment Steamer','Power Supply':'220V / 50Hz' } },
  { slug:'westpoint-1159', specs:{ Type:'Garment Steamer','Power Supply':'220V / 50Hz' } },
  { slug:'westpoint-1253', specs:{ Type:'Garment Steamer','Power Supply':'220V / 50Hz' } },
  // Humidifiers
  { slug:'westpoint-1098', specs:{ Type:'Ultrasonic Humidifier','Power Supply':'220V / 50Hz' } },
  { slug:'westpoint-1102', specs:{ Type:'Ultrasonic Humidifier','Power Supply':'220V / 50Hz' } },
  { slug:'westpoint-1156', specs:{ Type:'Ultrasonic Humidifier','Power Supply':'220V / 50Hz' } },
  { slug:'westpoint-1201', specs:{ Type:'Ultrasonic Humidifier','Power Supply':'220V / 50Hz' } },
  { slug:'westpoint-1205', specs:{ Type:'Ultrasonic Humidifier','Power Supply':'220V / 50Hz' } },
  { slug:'westpoint-1206', specs:{ Type:'Ultrasonic Humidifier','Power Supply':'220V / 50Hz' } },
  // Bath scale
  { slug:'westpoint-7005', specs:{ Type:'Body Weight Scale','Power Supply':'Battery' } },
  // Dawlance irons
  { slug:'dawlance-dawlance-steam-iron-dwsi-2217-c', specs:{ Type:'Steam Iron','Power Supply':'220V / 50Hz' }, name:'Dawlance Steam Iron DWSI-2217 C' },
  { slug:'dawlance-dawlance-steam-iron-dwsi-2217-t-purplem', specs:{ Type:'Steam Iron','Power Supply':'220V / 50Hz' }, name:'Dawlance Steam Iron DWSI-2217 T (Purple)' },
  { slug:'dawlance-dry-iron-dwdi-1020-black', specs:{ Type:'Dry Iron','Power Supply':'220V / 50Hz' }, name:'Dawlance Dry Iron DWDI-1020 (Black)' },
  { slug:'dawlance-dry-iron-dwdi-1020-white', specs:{ Type:'Dry Iron','Power Supply':'220V / 50Hz' }, name:'Dawlance Dry Iron DWDI-1020 (White)' },
  { slug:'dawlance-steam-iron-dwsi-8000-steam-pro', specs:{ Type:'Steam Iron','Power Supply':'220V / 50Hz' }, name:'Dawlance Steam Pro Iron DWSI-8000' },
  { slug:'dawlance-dwsi-2322-cx', specs:{ Type:'Steam Iron','Power Supply':'220V / 50Hz' }, name:'Dawlance Steam Iron DWSI-2322 CX' },
  { slug:'dawlance-dwsi-3122-pro-press', specs:{ Type:'Steam Iron','Power Supply':'220V / 50Hz' }, name:'Dawlance Pro Press Iron DWSI-3122' },
  { slug:'dawlance-dwsi-3122-t', specs:{ Type:'Steam Iron','Power Supply':'220V / 50Hz' }, name:'Dawlance Steam Iron DWSI-3122 T' },
  // Dawlance heaters
  { slug:'dawlance-dwhj-4002-b', specs:{ Type:'Room Heater','Power Supply':'220V / 50Hz' }, name:'Dawlance Room Heater DWHJ-4002 (Black)' },
  { slug:'dawlance-dwhj-8002-i', specs:{ Type:'Infrared Room Heater','Power Supply':'220V / 50Hz' }, name:'Dawlance Infrared Heater DWHJ-8002' },
  // Garment Steamer
  { slug:'dawlance-dwgs-2316', specs:{ Type:'Garment Steamer','Power Supply':'220V / 50Hz' }, name:'Dawlance Garment Steamer DWGS-2316' },
  // Gas Geysers
  { slug:'dawlance-dwhp-3021-b', name:'Dawlance Gas Geyser DWHP-3021 (Black)' },
  { slug:'dawlance-dwhp-3021-w', name:'Dawlance Gas Geyser DWHP-3021 (White)' },
  { slug:'dawlance-dwhb-475-w',  name:'Dawlance Electric Heating Blanket 475W DWHB-475' },
]
for (const f of homeHeatFixes) {
  const update = {}
  if (f.specs) update.specs = f.specs
  if (f.name)  update.simplified_name = f.name
  await fix(f.slug, update, `home/heat ${f.slug}`)
}


// ════════════════════════════════════════════════════════════════
// 7. DISHWASHERS — Add missing specs
// ════════════════════════════════════════════════════════════════
console.log('\n── DISHWASHERS ─────────────────────────────────────────────')

const dishFixes = [
  { slug:'dawlance-ddw-1470-gb-inv',         name:'Dawlance 14-Place Dishwasher DDW-1470 GB Inverter', cap:'14 Place Settings', inv:'Yes' },
  { slug:'dawlance-ddw-1471-i-inv',          name:'Dawlance 14-Place Dishwasher DDW-1471 I Inverter',  cap:'14 Place Settings', inv:'Yes' },
  { slug:'dawlance-ddw-14952-s-inv',         name:'Dawlance 14-Place Dishwasher DDW-14952 S Inverter', cap:'14 Place Settings', inv:'Yes' },
  { slug:'dawlance-ddw-868-ct-b',            name:'Dawlance 8-Place Countertop Dishwasher DDW-868',    cap:'8 Place Settings',  inv:'No' },
]
for (const d of dishFixes) {
  await mergeSpecs(d.slug, { Capacity:d.cap, Inverter:d.inv, Type:'Dishwasher' }, { simplified_name:d.name }, `dishwasher ${d.slug}`)
}


// ════════════════════════════════════════════════════════════════
// 8. PERSONAL CARE — Type fixes
// ════════════════════════════════════════════════════════════════
console.log('\n── PERSONAL CARE ───────────────────────────────────────────')

const pcFixes = [
  { slug:'westpoint-3870',   type:'Body Massager' },
  { slug:'westpoint-6362',   type:'Epilator' },
  { slug:'westpoint-6713',   type:'Hair Clipper' },
  { slug:'westpoint-6813',   type:'Hair Clipper' },
  { slug:'westpoint-6913',   type:'Hair Clipper' },
  { slug:'dawlance-hair-dryer-dwhd-7081',                    type:'Hair Dryer' },
  { slug:'dawlance-hair-straightener-dwhs-7031-06-in-one-carton', type:'Hair Straightener' },
  { slug:'dawlance-hair-straightener-dwhs-7034',              type:'Hair Straightener' },
  { slug:'dawlance-dwhb-81762-bx',                            type:'Hair Dryer' },
]
for (const f of pcFixes) {
  await mergeSpecs(f.slug, { Type:f.type }, {}, `personal care ${f.slug}`)
}


// ════════════════════════════════════════════════════════════════
// 9. KITCHEN BREAKFAST & BEVERAGES — Type + specs
// ════════════════════════════════════════════════════════════════
console.log('\n── KITCHEN BREAKFAST ───────────────────────────────────────')

await mergeSpecs('dawlance-dwcm-5304-coffee-machine', { Type:'Coffee Maker' }, {}, 'coffee maker type')
await mergeSpecs('dawlance-dwsm-2971-sandwich-maker-black', { Type:'Sandwich Maker' }, {}, 'sandwich maker type')
await mergeSpecs('dawlance-electric-kettle-dwek-7100-local', { Type:'Electric Kettle', Capacity:'1.7L', Wattage:'1500W' },
  { simplified_name:'Dawlance 1.7L Electric Kettle DWEK-7100' }, 'kettle DWEK-7100')
await mergeSpecs('dawlance-electric-kettle-dwek-7200-local', { Type:'Electric Kettle', Capacity:'1.7L', Wattage:'1500W' },
  { simplified_name:'Dawlance 1.7L Electric Kettle DWEK-7200' }, 'kettle DWEK-7200')
await mergeSpecs('dawlance-electric-kettle-dwek-7210', { Type:'Electric Kettle', Capacity:'1.7L', Wattage:'1500W' },
  { simplified_name:'Dawlance 1.7L Electric Kettle DWEK-7210' }, 'kettle DWEK-7210')


// ════════════════════════════════════════════════════════════════
// 10. KITCHEN COOKING — Westpoint category corrections + specs
// ════════════════════════════════════════════════════════════════
console.log('\n── KITCHEN COOKING ─────────────────────────────────────────')

// Wrong-category products
await mergeSpecs('westpoint-364', { Type:'Jug Blender', Capacity:'1.5L', Wattage:'800W' },
  { category:'Kitchen Blenders & Juicers', simplified_name:'Westpoint 1.5L Blender & Grinder WF-364' }, 'WF-364 → Blenders')
await mergeSpecs('westpoint-5161', { Type:'Juicer', Wattage:'500W' },
  { category:'Kitchen Blenders & Juicers', simplified_name:'Westpoint Deluxe Juicer WF-5161' }, 'WF-5161 → Blenders')
await mergeSpecs('westpoint-4981', { Type:'Food Processor', Wattage:'800W' },
  { category:'Kitchen Food Processors', simplified_name:'Westpoint Kitchen Robot WF-4981' }, 'WF-4981 → Food Processors')
await mergeSpecs('westpoint-830', { Type:'Grill Microwave Oven', Capacity:'20L', Wattage:'1050W' },
  { category:'Grill Microwave Ovens', simplified_name:'Westpoint 20L Grill Microwave Oven WF-830 DG' }, 'WF-830 → Grill Microwaves')
await mergeSpecs('westpoint-841', { Type:'Grill Microwave Oven', Wattage:'1450W' },
  { category:'Grill Microwave Ovens', simplified_name:'Westpoint Grill Microwave Oven WF-841 DG' }, 'WF-841 → Grill Microwaves')

// Add Capacity + Wattage to Westpoint ovens/fryers in Kitchen Cooking
const wpCookFixes = [
  { slug:'westpoint-4500', cap:'45L', w:'1800W', type:'Convection Rotisserie Oven', name:'Westpoint 45L Convection Rotisserie Oven WF-4500' },
  { slug:'westpoint-4800', cap:'55L', w:'2200W', type:'Convection Rotisserie Oven', name:'Westpoint 55L Convection Rotisserie Oven WF-4800' },
  { slug:'westpoint-2610', cap:'27L', w:'1500W', type:'Convection Rotisserie Oven', name:'Westpoint 27L Rotisserie Oven WF-2610' },
  { slug:'westpoint-4711', cap:'50L', w:'1800W', type:'Convection Rotisserie Oven', name:'Westpoint 50L Deluxe Convection Rotisserie Oven WF-4711' },
  { slug:'westpoint-5500', cap:'60L', w:'1800W', type:'Convection Rotisserie Oven', name:'Westpoint 60L Professional Rotisserie Oven WF-5500' },
  { slug:'westpoint-6300', cap:'63L', w:'2200W', type:'Convection Rotisserie Oven', name:'Westpoint 63L Convection Rotisserie Oven WF-6300' },
  { slug:'westpoint-5259', cap:'25L', w:'2250W', type:'Air Fryer Rotisserie Oven',  name:'Westpoint 25L Air Fryer Rotisserie Oven WF-5259' },
  { slug:'westpoint-4259', cap:'9L',  w:'2200W', type:'Air Fryer',  name:'Westpoint 9L Deluxe Air Fryer WF-4259' },
  { slug:'westpoint-5253', cap:'6L',  w:'1900W', type:'Air Fryer',  name:'Westpoint 6L Deluxe Air Fryer WF-5253' },
  { slug:'westpoint-5255', cap:'5L',  w:'1500W', type:'Air Fryer',  name:'Westpoint 5L Deluxe Air Fryer WF-5255' },
  { slug:'westpoint-5256', cap:'6L',  w:'1900W', type:'Air Fryer',  name:'Westpoint 6L Air Fryer WF-5256' },
  { slug:'westpoint-5257', cap:'6.5L',w:'1700W', type:'Air Fryer',  name:'Westpoint 6.5L Easy Fryer XL WF-5257' },
  { slug:'westpoint-5258', cap:'22L', w:'1500W', type:'Air Fryer Oven', name:'Westpoint 22L Power Air Fryer Oven WF-5258' },
  { slug:'westpoint-7259', cap:'9L',  w:'2200W', type:'Air Fryer',  name:'Westpoint 9L Deluxe Digital Air Fryer WF-7259' },
  { slug:'westpoint-251',  w:'1500W', type:'Single Hot Plate', name:'Westpoint Single Hot Plate WF-251 (1500W)' },
  { slug:'westpoint-252',  w:'2500W', type:'Double Hot Plate', name:'Westpoint Double Hot Plate WF-252 (2500W)' },
  { slug:'westpoint-261',  w:'1000W', type:'Single Hot Plate', name:'Westpoint Single Hot Plate WF-261 (1000W)' },
  { slug:'westpoint-262',  w:'2500W', type:'Double Hot Plate', name:'Westpoint Double Hot Plate WF-262 (2500W)' },
  { slug:'westpoint-291',  w:'2000W', type:'Single Ceramic Cooker', name:'Westpoint Single Ceramic Cooker WF-291' },
  { slug:'westpoint-292',  w:'3500W', type:'Double Ceramic Cooker', name:'Westpoint Double Ceramic Cooker WF-292' },
  { slug:'westpoint-5350', cap:'2.2L',w:'900W',  type:'Rice Cooker', name:'Westpoint 2.2L Rice Cooker WF-5350' },
]
for (const f of wpCookFixes) {
  const specPatch = { Type:f.type, Wattage:f.w }
  if (f.cap) specPatch.Capacity = f.cap
  await mergeSpecs(f.slug, specPatch, { simplified_name:f.name }, `wp-cook ${f.slug}`)
}

// Dawlance air fryers / ovens in Kitchen Cooking
const dlCookFixes = [
  { slug:'dawlance-air-fryer-dwaf-6322-d', cap:'4L',  w:'1500W', type:'Air Fryer', name:'Dawlance 4L Air Fryer DWAF-6322 D' },
  { slug:'dawlance-dwaf-3374-b',           cap:'3.5L',w:'1500W', type:'Air Fryer', name:'Dawlance 3.5L Air Fryer DWAF-3374 B' },
  { slug:'dawlance-dwaf-6321-l',           cap:'5L',  w:'1800W', type:'Air Fryer', name:'Dawlance 5L Air Fryer DWAF-6321 L' },
  { slug:'dawlance-dwot-2515cr-oven-toaster',cap:'25L',w:'1200W',type:'Oven Toaster', name:'Dawlance 25L Oven Toaster DWOT-2515 CR' },
  { slug:'dawlance-dwtb-520-b',            cap:'52L', w:'2000W', type:'Toaster Oven', name:'Dawlance 52L Toaster Baking Oven DWTB-520 B' },
  { slug:'dawlance-dwtb-590-b',            cap:'59L', w:'2000W', type:'Toaster Oven', name:'Dawlance 59L Toaster Baking Oven DWTB-590 B' },
  { slug:'dawlance-dwtf-510-w-local',      cap:'51L', w:'1800W', type:'Convection Oven', name:'Dawlance 51L Toaster Fan Oven DWTF-510 W' },
  { slug:'dawlance-dwtf-620-i',            cap:'62L', w:'2000W', type:'Convection Oven', name:'Dawlance 62L Toaster Fan Oven DWTF-620 I' },
  { slug:'dawlance-multi-cooker-dwmc-3015',cap:'5L',  w:'700W',  type:'Multi Cooker', name:'Dawlance 5L Multi Cooker DWMC-3015' },
]
for (const f of dlCookFixes) {
  await mergeSpecs(f.slug, { Type:f.type, Capacity:f.cap, Wattage:f.w }, { simplified_name:f.name }, `dl-cook ${f.slug}`)
}


// ════════════════════════════════════════════════════════════════
// 11. KITCHEN BLENDERS — Type fix
// ════════════════════════════════════════════════════════════════
console.log('\n── KITCHEN BLENDERS ────────────────────────────────────────')

await mergeSpecs('dawlance-dwms-6240', { Type:'Stand Mixer' }, {}, 'DWMS-6240 stand mixer type')
await mergeSpecs('westpoint-1090', { Type:'Mini Food Chopper', Capacity:'500ml', Wattage:'400W' }, {}, 'WF-1090 chopper')
await mergeSpecs('westpoint-1097', { Type:'Mini Food Chopper', Capacity:'500ml', Wattage:'400W' }, {}, 'WF-1097 chopper')


// ════════════════════════════════════════════════════════════════
// 12. KITCHEN FOOD PROCESSORS — Type fixes
// ════════════════════════════════════════════════════════════════
console.log('\n── KITCHEN FOOD PROCESSORS ─────────────────────────────────')

await mergeSpecs('dawlance-food-processor-dwfp-5240-w', { Type:'Food Processor' }, {}, 'DWFP-5240 type')
await mergeSpecs('dawlance-food-processor-dwfp-8270-b', { Type:'Food Processor' }, {}, 'DWFP-8270 type')
await mergeSpecs('dawlance-meat-mincer-dwmm-6001-w',    { Type:'Meat Mincer' }, {}, 'DWMM-6001 type')
await mergeSpecs('westpoint-4805', { Type:'Food Processor', Capacity:'1.75L', Wattage:'450W' }, {}, 'WF-4805 specs')


// ════════════════════════════════════════════════════════════════
// 13. SMALL APPLIANCES — Type fixes
// ════════════════════════════════════════════════════════════════
console.log('\n── SMALL APPLIANCES ────────────────────────────────────────')

await mergeSpecs('dawlance-vacuum-dwvc-770-smt-red',  { Type:'Vacuum Cleaner' }, {}, 'DWVC-770 type')
await mergeSpecs('dawlance-vacuum-dwvc-6724-enj-blue',{ Type:'Vacuum Cleaner' }, {}, 'DWVC-6724 type')
await mergeSpecs('dawlance-drum-vacuum-cleaner-dwvc-7500', { Type:'Drum Vacuum Cleaner' }, {}, 'DWVC-7500 type')


// ════════════════════════════════════════════════════════════════
// 14. HOOD & HOBS — Type + name corrections
// ════════════════════════════════════════════════════════════════
console.log('\n── HOOD & HOBS ─────────────────────────────────────────────')

const hobFixes = [
  { slug:'dawlance-built-in-oven-dbe-208110-b-a-series', type:'Built-in Electric Oven', name:'Dawlance Built-in Electric Oven DBE-208110 B (Black)' },
  { slug:'dawlance-built-in-oven-dbe-208110-s-a-series', type:'Built-in Electric Oven', name:'Dawlance Built-in Electric Oven DBE-208110 S (Silver)' },
  { slug:'dawlance-built-in-oven-dbm-208110-m-a-series', type:'Built-in Microwave Oven', name:'Dawlance Built-in Microwave Oven DBM-208110 M' },
  { slug:'dawlance-built-in-oven-dbm-208120-b-a-series', type:'Built-in Microwave Oven', name:'Dawlance Built-in Microwave Oven DBM-208120 B (Black)' },
  { slug:'dawlance-dbm-208120-b-trading-brands',         type:'Built-in Microwave Oven', name:'Dawlance Built-in Microwave Oven DBM-208120 B' },
  { slug:'dawlance-dbm-208110-m-trading-brands',         type:'Built-in Microwave Oven', name:'Dawlance Built-in Microwave Oven DBM-208110 M' },
  { slug:'dawlance-dbmo-25-bg-series', type:'Built-in Gas Oven', name:'Dawlance Built-in Gas Oven DBMO-25 BG' },
  { slug:'dawlance-dbmo-25-ig-series', type:'Built-in Gas Oven', name:'Dawlance Built-in Gas Oven DBMO-25 IG' },
  { slug:'dawlance-dbe-208110-b-trading-brands', type:'Built-in Electric Oven', name:'Dawlance Built-in Electric Oven DBE-208110 B' },
  { slug:'dawlance-dbg-21810-b-trading-brands',  type:'Gas Hob', name:'Dawlance Gas Hob DBG-21810 B (Black)' },
  { slug:'dawlance-dbg-21810-s-trading-brands',  type:'Gas Hob', name:'Dawlance Gas Hob DBG-21810 S (Silver)' },
  { slug:'dawlance-dhg-390-bn-a-series', type:'Gas Hob', name:'Dawlance Gas Hob DHG-390 BN' },
  { slug:'dawlance-dhm-590-si-dawlance', type:'Gas Hob', name:'Dawlance Gas Hob DHM-590 SI' },
  { slug:'dawlance-hobs-dhg-380-bn-a-series', type:'Gas Hob', name:'Dawlance Gas Hob DHG-380 BN' },
  { slug:'dawlance-hobs-dhg-590-bi-a-series', type:'Gas Hob', name:'Dawlance Gas Hob DHG-590 BI' },
  { slug:'dawlance-hobs-dhm-370-sn-a-series', type:'Gas Hob', name:'Dawlance Gas Hob DHM-370 SN' },
  { slug:'dawlance-hobs-dhm-390-sn-a-series', type:'Gas Hob', name:'Dawlance Gas Hob DHM-390 SN' },
  { slug:'dawlance-hobs-dhm-590-si-a-series', type:'Gas Hob', name:'Dawlance Gas Hob DHM-590 SI (A-Series)' },
  { slug:'dawlance-hood-dcb-7530-b', type:'Kitchen Range Hood', name:'Dawlance Kitchen Range Hood DCB-7530 B (75cm, Black)' },
  { slug:'dawlance-hood-dct-9030-s', type:'Kitchen Range Hood', name:'Dawlance Kitchen Range Hood DCT-9030 S (90cm, Silver)' },
  { slug:'dawlance-hoods-dca-9630-bg-a-series', type:'Kitchen Range Hood', name:'Dawlance Kitchen Range Hood DCA-9630 BG (90cm)' },
  { slug:'dawlance-hoods-dcb-7310-s-a-series',  type:'Kitchen Range Hood', name:'Dawlance Kitchen Range Hood DCB-7310 S (73cm, Silver)' },
  { slug:'dawlance-hoods-dcb-9630-b-a-series',  type:'Kitchen Range Hood', name:'Dawlance Kitchen Range Hood DCB-9630 B (90cm, Black)' },
  { slug:'dawlance-hoods-dct-9630-s-a-series',  type:'Kitchen Range Hood', name:'Dawlance Kitchen Range Hood DCT-9630 S (90cm, Silver)' },
]
for (const f of hobFixes) {
  await mergeSpecs(f.slug, { Type:f.type }, { simplified_name:f.name }, `hob ${f.slug}`)
}


// ════════════════════════════════════════════════════════════════
// 15. WATER DISPENSERS — Add Type + Wattage
// ════════════════════════════════════════════════════════════════
console.log('\n── WATER DISPENSERS ────────────────────────────────────────')

const { data: wdProds } = await sb.from('products').select('slug,model,simplified_name,specs').eq('category','Water Dispensers').ilike('brand','%dawlance%')
for (const p of wdProds) {
  const s = p.specs || {}
  if (s.Wattage) continue
  const isBottom = (p.model+p.simplified_name).toLowerCase().includes('bottom')
  await fix(p.slug, { specs: { ...s, Type:isBottom?'Bottom Load Dispenser':'Top Load Dispenser', Wattage:isBottom?'90W':'75W' } }, `dispenser ${p.slug}`)
}


// ════════════════════════════════════════════════════════════════
// 16. ACs — Glamour missing Tonnage
// ════════════════════════════════════════════════════════════════
console.log('\n── AIR CONDITIONERS ────────────────────────────────────────')

await mergeSpecs('dawlance-glamour-inverter-fs', { Tonnage:'1.5 Ton' }, {}, 'Glamour FS Tonnage')


// ════════════════════════════════════════════════════════════════
// 17. MISC NAME IMPROVEMENTS
// ════════════════════════════════════════════════════════════════
console.log('\n── MISCELLANEOUS ───────────────────────────────────────────')

await fix('dawlance-dwmc-8030-zeus-06-in-one-cartons', { simplified_name:'Dawlance Measuring Cup Set DWMC-8030 Zeus' }, 'DWMC-8030 name')
await fix('dawlance-dwmc-9030-zeus-06-in-one-cartons', { simplified_name:'Dawlance Measuring Cup Set DWMC-9030 Zeus' }, 'DWMC-9030 name')
await fix('dawlance-dwmgk-9030-zeus-06-in-one-cartons',{ simplified_name:'Dawlance Kitchen Tool Set DWMGK-9030 Zeus' }, 'DWMGK-9030 name')


// ════════════════════════════════════════════════════════════════
// SUMMARY
// ════════════════════════════════════════════════════════════════
console.log(`\n${'═'.repeat(60)}`)
console.log(`DONE: ${ok} fixed ✅  |  ${skipped} not found ⚠️  |  ${err} errors ❌`)
console.log('═'.repeat(60))
