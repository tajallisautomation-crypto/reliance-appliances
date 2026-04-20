import { createClient } from '@supabase/supabase-js'
const sb = createClient(
  process.env.SUPABASE_URL || 'https://fdfjavyopbrfvwtjaerw.supabase.co',
  process.env.SUPABASE_SERVICE_KEY
)

// ============================================================
// CONFIRMED CAPACITIES — sourced from Pakistani retail listings
// (surmawala, cityelectronics, haqelectronics, daraz, alfatah,
//  urbanelectronics, friendshome, mns, subhan, newglacier, ays)
// Previous scripts mis-derived kg from model numbers — now fixed.
// ============================================================
//
// SEMI-AUTO SINGLE TUB (DW series, single drum):
//   DW-6100        → 8 kg   (surmawala, cityelectronics, ays)
//   DW-7200 (C/W FL) → 10 kg (mns.com.pk, nomantraders)
//   DW-9100        → 9 kg   (haqelectronics spec sheet)
//   DW-9200        → 12 kg  (friendshome, dawlanceshop)
//
// SEMI-AUTO TWIN TUB (DW series, two drums):
//   DW-6550        → 8 kg   (cityelectronics, friendshome)
//   DW-6580        → 8 kg   (daraz listing)
//   DW-7500        → 12 kg  (urbanelectronics)
//   DW-8550 CB FL  → 7.5 kg (selectronics)
//   DW-10500       → 14 kg  (urbanelectronics)
//   DW-10600       → 12 kg  (daraz, onestopmall, ays)
//
// FULLY AUTO TOP LOAD (DWT series):
//   DWT-255        → 8.5 kg (daraz, subhan, newglacier)
//   DWT-260        → 10 kg  (haqelectronics, newaftabcenter)
//   DWT-270        → 12 kg  (daraz, pakref, subhan)
//   DWT-9060-EZ    → 9 kg   (friendshome, subhan, electromart)
//   DWT-9540/9560  → 9 kg   (model-series pattern; 9XXX = 9 kg)
//   DWT-1006/1016  → 10 kg
//   DWT-1165/1166/1167/11467/11671 → 11 kg (haqelectronics, surmawala, daraz)
//   DWT-1470/14711/14470   → 14 kg (alfatah, telemart, daraz)
//   DWT-1580       → 15 kg
//   DWT-1775/1776  → 17 kg  (surmawala)
// ============================================================

const SINGLE_TUB_TYPE  = 'Semi-Automatic (Single Tub)'
const TWIN_TUB_TYPE    = 'Semi-Automatic (Twin Tub)'
const FULLY_AUTO_TYPE  = 'Fully Automatic (Top Load)'
const FRONT_LOAD_TYPE  = 'Fully Automatic (Front Load)'

function recFor(kg) {
  if (kg <= 5)  return '2–3 persons'
  if (kg <= 8)  return '4–6 persons'
  if (kg <= 10) return '6–8 persons'
  if (kg <= 12) return '8–10 persons'
  if (kg <= 14) return '10–12 persons'
  if (kg <= 17) return '12–15 persons'
  return '15+ persons'
}

// id → { kg, type, simplifiedName (optional) }
const FIXES = [
  // ─── SEMI-AUTO SINGLE TUB: DW-6100 (8 kg) ──────────────────────
  { id: 'dawlance-dw-6100-white',                         kg: 8,    type: SINGLE_TUB_TYPE, name: 'Dawlance DW-6100 8 kg Semi-Automatic Washing Machine (White)' },
  { id: 'dawlance-wm-dw-6100-washer-clear-lid-white',     kg: 8,    type: SINGLE_TUB_TYPE, name: 'Dawlance DW-6100 8 kg Semi-Automatic Washing Machine (Clear Lid)' },
  { id: '969267d7-ce1e-4767-9f57-74ea65bfc267',           kg: 8,    type: SINGLE_TUB_TYPE, name: 'Dawlance DW-6100 8 kg Semi-Automatic Washing Machine (Chrome Body)' },
  { id: '99fe4b2f-35b4-4e92-94a7-9b319c5de719',           kg: 8,    type: SINGLE_TUB_TYPE, name: 'Dawlance DW-6100 8 kg Semi-Automatic Washing Machine (White)' },

  // ─── SEMI-AUTO SINGLE TUB: DW-7200 (10 kg) ─────────────────────
  { id: 'dawlance-dw-7200-c-fl-dawlance',                 kg: 10,   type: SINGLE_TUB_TYPE, name: 'Dawlance DW-7200 10 kg Semi-Automatic Washing Machine (Clear Full Lid)' },
  { id: 'dawlance-dw-7200-w-fl-dawlance',                 kg: 10,   type: SINGLE_TUB_TYPE, name: 'Dawlance DW-7200 10 kg Semi-Automatic Washing Machine (White Full Lid)' },

  // ─── SEMI-AUTO SINGLE TUB: DW-9100 (9 kg) ──────────────────────
  { id: 'dawlance-wm-dw-9100-glass-lid-black-grey',       kg: 9,    type: SINGLE_TUB_TYPE, name: 'Dawlance DW-9100 9 kg Semi-Automatic Washing Machine (Glass Lid)' },
  { id: 'dawlance-wm-dw-9100-washer-clear-lid-white',     kg: 9,    type: SINGLE_TUB_TYPE, name: 'Dawlance DW-9100 9 kg Semi-Automatic Washing Machine (Clear Lid)' },
  { id: '5f965d85-d2ea-4b98-9c5c-d829b918fb3c',           kg: 9,    type: SINGLE_TUB_TYPE, name: 'Dawlance DW-9100 9 kg Semi-Automatic Washing Machine (Glass Door)' },
  { id: 'd73ab5ca-42ef-4afd-b0de-eb561c5c3cae',           kg: 9,    type: SINGLE_TUB_TYPE, name: 'Dawlance DW-9100 9 kg Semi-Automatic Washing Machine' },

  // ─── SEMI-AUTO SINGLE TUB: DW-9200 (12 kg) ─────────────────────
  { id: '969d4a97-fc12-44ac-a0c2-e5747fa34663',           kg: 12,   type: SINGLE_TUB_TYPE, name: 'Dawlance DW-9200 12 kg Semi-Automatic Washing Machine (White Full Lid)' },
  { id: '26459d05-0762-48e9-8eb2-3272a8caa42a',           kg: 12,   type: SINGLE_TUB_TYPE, name: 'Dawlance DW-9200 12 kg Semi-Automatic Washing Machine (CFL)' },

  // ─── SEMI-AUTO TWIN TUB: DW-6550 (8 kg) ────────────────────────
  { id: 'dawlance-wm-dw-6550-twin-tub-clear-lid-white-advanco', kg: 8, type: TWIN_TUB_TYPE, name: 'Dawlance DW-6550 8 kg Twin-Tub Washing Machine (Clear Lid)' },
  { id: 'dawlance-wm-dw-6550-twin-tub-glass-lid-black-grey',    kg: 8, type: TWIN_TUB_TYPE, name: 'Dawlance DW-6550 8 kg Twin-Tub Washing Machine (Glass Lid)' },
  { id: 'dawlance-wm-dw-6550-twin-tub-white-lid-white',         kg: 8, type: TWIN_TUB_TYPE, name: 'Dawlance DW-6550 8 kg Twin-Tub Washing Machine (White Lid)' },
  { id: 'b5aa6047-8fe5-4879-bf3e-8a048f05019b',                 kg: 8, type: TWIN_TUB_TYPE, name: 'Dawlance DW-6550 8 kg Twin-Tub Washing Machine (White)' },
  { id: '2cabd4bf-0da1-4478-bd5d-7674cead00cb',                 kg: 8, type: TWIN_TUB_TYPE, name: 'Dawlance DW-6550 8 kg Twin-Tub Washing Machine' },

  // ─── SEMI-AUTO TWIN TUB: DW-6580 (8 kg) ────────────────────────
  { id: 'dawlance-dw-6580-c-fl-dawlance',                 kg: 8,    type: TWIN_TUB_TYPE, name: 'Dawlance DW-6580 8 kg Twin-Tub Washing Machine (Chrome Full Lid)' },
  { id: 'dawlance-dw-6580-w-fl-dawlance',                 kg: 8,    type: TWIN_TUB_TYPE, name: 'Dawlance DW-6580 8 kg Twin-Tub Washing Machine (White Full Lid)' },

  // ─── SEMI-AUTO TWIN TUB: DW-7500 (12 kg) ───────────────────────
  { id: 'dawlance-wm-dw-7500-twin-tub-clear-lid-white',   kg: 12,   type: TWIN_TUB_TYPE, name: 'Dawlance DW-7500 12 kg Twin-Tub Washing Machine (Clear Lid)' },
  { id: 'dawlance-wm-dw-7500-twin-tub-glass-lid-black-grey', kg: 12, type: TWIN_TUB_TYPE, name: 'Dawlance DW-7500 12 kg Twin-Tub Washing Machine (Glass Lid)' },
  { id: '93b1c219-bbd1-4ba1-b71f-694ed4de6239',           kg: 12,   type: TWIN_TUB_TYPE, name: 'Dawlance DW-7500 12 kg Twin-Tub Washing Machine (Glass Lid)' },
  { id: '4bfb395a-b17c-4b6b-bd36-173ee53e1378',           kg: 12,   type: TWIN_TUB_TYPE, name: 'Dawlance DW-7500 12 kg Twin-Tub Washing Machine' },

  // ─── SEMI-AUTO TWIN TUB: DW-8550 (7.5 kg) ──────────────────────
  { id: 'dawlance-dw-8550-cb-fl-dawlance',                kg: 7.5,  type: TWIN_TUB_TYPE, name: 'Dawlance DW-8550 7.5 kg Twin-Tub Washing Machine (Chrome Body)' },

  // ─── SEMI-AUTO TWIN TUB: DW-10500 (14 kg) ──────────────────────
  { id: 'dawlance-dw-10500',                              kg: 14,   type: TWIN_TUB_TYPE, name: 'Dawlance DW-10500 14 kg Twin-Tub Washing Machine' },
  { id: 'e04d6e1e-8ad6-46bf-9bf0-2a037a301b4b',           kg: 14,   type: TWIN_TUB_TYPE, name: 'Dawlance DW-10500 14 kg Twin-Tub Washing Machine (Chrome Body)' },

  // ─── SEMI-AUTO TWIN TUB: DW-10600 (12 kg) ──────────────────────
  { id: 'dawlance-dw-10600-c-fl',                         kg: 12,   type: TWIN_TUB_TYPE, name: 'Dawlance DW-10600 12 kg Twin-Tub Washing Machine (Chrome Full Lid)' },
  { id: 'dawlance-dw-10600-w-fl',                         kg: 12,   type: TWIN_TUB_TYPE, name: 'Dawlance DW-10600 12 kg Twin-Tub Washing Machine (White Full Lid)' },

  // ─── FULLY AUTO TOP LOAD: DWT-255 (8.5 kg) ─────────────────────
  { id: 'dawlance-awm-dwt-255-clear-lid-white',           kg: 8.5,  type: FULLY_AUTO_TYPE, name: 'Dawlance DWT-255 8.5 kg Top-Load Fully Automatic Washing Machine (Clear Lid)' },
  { id: 'dawlance-awm-dwt-255-es-white',                  kg: 8.5,  type: FULLY_AUTO_TYPE, name: 'Dawlance DWT-255 8.5 kg Top-Load Fully Automatic Washing Machine (ES White)' },
  { id: '51fc7b8f-51ce-4bc0-b9d5-f790be458e50',           kg: 8.5,  type: FULLY_AUTO_TYPE, name: 'Dawlance DWT-255 8.5 kg Top-Load Fully Automatic Washing Machine (ES)' },

  // ─── FULLY AUTO TOP LOAD: DWT-260 (10 kg) ──────────────────────
  { id: 'dawlance-dwt-260-c-lvs',                         kg: 10,   type: FULLY_AUTO_TYPE, name: 'Dawlance DWT-260 10 kg Top-Load Fully Automatic Washing Machine (C LVS+)' },
  { id: 'dawlance-dwt-260-s-lvs',                         kg: 10,   type: FULLY_AUTO_TYPE, name: 'Dawlance DWT-260 10 kg Top-Load Fully Automatic Washing Machine (S LVS+)' },
  { id: 'dawlance-awm-dwt-260-es-white',                  kg: 10,   type: FULLY_AUTO_TYPE, name: 'Dawlance DWT-260 10 kg Top-Load Fully Automatic Washing Machine (ES White)' },
  { id: '449b8ac4-df8f-429e-94c3-b390aafd2f29',           kg: 10,   type: FULLY_AUTO_TYPE, name: 'Dawlance DWT-260 10 kg Top-Load Fully Automatic Washing Machine (ES)' },

  // ─── FULLY AUTO TOP LOAD: DWT-270 (12 kg) ──────────────────────
  { id: 'dawlance-dwt-270-s-lvs',                         kg: 12,   type: FULLY_AUTO_TYPE, name: 'Dawlance DWT-270 12 kg Top-Load Fully Automatic Washing Machine (S LVS+)' },
  { id: 'dawlance-dwt-270-c-lvs',                         kg: 12,   type: FULLY_AUTO_TYPE, name: 'Dawlance DWT-270 12 kg Top-Load Fully Automatic Washing Machine (C LVS+)' },
  { id: '319e45f7-4ca5-4365-98ab-85de3f2895f1',           kg: 12,   type: FULLY_AUTO_TYPE, name: 'Dawlance DWT-270 12 kg Top-Load Fully Automatic Washing Machine (ES)' },

  // ─── FULLY AUTO TOP LOAD: DWT-9060-EZ (9 kg) ───────────────────
  { id: 'dawlance-awm-dwt-9060-ez',                       kg: 9,    type: FULLY_AUTO_TYPE, name: 'Dawlance DWT-9060 EZ 9 kg Top-Load Fully Automatic Washing Machine' },
  { id: '2ab06de9-aae1-4c2b-988f-9c5cb815f276',           kg: 9,    type: FULLY_AUTO_TYPE, name: 'Dawlance DWT-9060 EZ 9 kg Top-Load Fully Automatic Washing Machine' },

  // ─── FULLY AUTO TOP LOAD: DWT-9540 / DWT-9560 (9 kg) ───────────
  { id: 'dawlance-dwt-9540',                              kg: 9,    type: FULLY_AUTO_TYPE, name: 'Dawlance DWT-9540 9 kg Top-Load Fully Automatic Washing Machine' },
  { id: 'dawlance-dwt-9560',                              kg: 9,    type: FULLY_AUTO_TYPE, name: 'Dawlance DWT-9560 9 kg Top-Load Fully Automatic Washing Machine' },

  // ─── FULLY AUTO TOP LOAD: DWT-1006 / DWT-1016 (10 kg) ──────────
  { id: 'dawlance-dwt-1006',                              kg: 10,   type: FULLY_AUTO_TYPE, name: 'Dawlance DWT-1006 10 kg Top-Load Fully Automatic Washing Machine' },
  { id: 'dawlance-dwt-1016',                              kg: 10,   type: FULLY_AUTO_TYPE, name: 'Dawlance DWT-1016 10 kg Top-Load Fully Automatic Washing Machine' },

  // ─── FULLY AUTO TOP LOAD: 11 kg series ─────────────────────────
  { id: 'dawlance-awm-dwt-1165-pl',                       kg: 11,   type: FULLY_AUTO_TYPE, name: 'Dawlance DWT-1165 PL 11 kg Top-Load Fully Automatic Washing Machine' },
  { id: 'dawlance-dwt-1166-ads',                          kg: 11,   type: FULLY_AUTO_TYPE, name: 'Dawlance DWT-1166 ADS 11 kg Top-Load Fully Automatic Washing Machine' },
  { id: 'dawlance-dwt-1167-flt',                          kg: 11,   type: FULLY_AUTO_TYPE, name: 'Dawlance DWT-1167 FLT 11 kg Top-Load Fully Automatic Washing Machine' },
  { id: 'dawlance-dwt-11671-flt',                         kg: 11,   type: FULLY_AUTO_TYPE, name: 'Dawlance DWT-11671 FLT 11 kg Top-Load Fully Automatic Washing Machine' },
  { id: 'dawlance-dwt-11467-es',                          kg: 11,   type: FULLY_AUTO_TYPE, name: 'Dawlance DWT-11467 ES 11 kg Top-Load Fully Automatic Washing Machine' },
  { id: 'ec1152ed-ea41-4ea8-89eb-1e40f1b1db9e',           kg: 11,   type: FULLY_AUTO_TYPE, name: 'Dawlance 11 kg Top-Load Fully Automatic Washing Machine' },

  // ─── FULLY AUTO TOP LOAD: 14 kg series ─────────────────────────
  { id: 'dawlance-awm-dwt-14711-flt',                     kg: 14,   type: FULLY_AUTO_TYPE, name: 'Dawlance DWT-14711 FLT 14 kg Top-Load Fully Automatic Washing Machine' },
  { id: 'dawlance-dwt-14711-flt',                         kg: 14,   type: FULLY_AUTO_TYPE, name: 'Dawlance DWT-14711 FLT 14 kg Top-Load Fully Automatic Washing Machine' },
  { id: 'dawlance-awm-dwt-1470-pl',                       kg: 14,   type: FULLY_AUTO_TYPE, name: 'Dawlance DWT-1470 PL 14 kg Top-Load Fully Automatic Washing Machine' },
  { id: 'dawlance-awm-dwt-14470-new-color-12-kg-exclusive', kg: 14, type: FULLY_AUTO_TYPE, name: 'Dawlance DWT-14470 14 kg Top-Load Fully Automatic Washing Machine' },
  { id: '90cff907-c7b1-4524-86de-1dd9e185d040',           kg: 14,   type: FULLY_AUTO_TYPE, name: 'Dawlance 14 kg Top-Load Fully Automatic Washing Machine' },

  // ─── FULLY AUTO TOP LOAD: DWT-1580 (15 kg) ─────────────────────
  { id: 'dawlance-dwt-1580-inv-c-glow-new-model',         kg: 15,   type: FULLY_AUTO_TYPE, name: 'Dawlance DWT-1580 INV 15 kg Top-Load Fully Automatic Washing Machine (C-Glow)' },

  // ─── FULLY AUTO TOP LOAD: 17 kg series ─────────────────────────
  { id: 'dawlance-dwt-1776-flt-c-glow-dawlance-new-model', kg: 17,  type: FULLY_AUTO_TYPE, name: 'Dawlance DWT-1776 FLT 17 kg Top-Load Fully Automatic Washing Machine (C-Glow)' },
  { id: 'dawlance-dwt-1775',                              kg: 17,   type: FULLY_AUTO_TYPE, name: 'Dawlance DWT-1775 17 kg Top-Load Fully Automatic Washing Machine' },
  { id: 'dawlance-awm-dwt-1775-pl',                       kg: 17,   type: FULLY_AUTO_TYPE, name: 'Dawlance DWT-1775 PL 17 kg Top-Load Fully Automatic Washing Machine' },

  // ─── FULLY AUTO TOP LOAD: 12 kg ─────────────────────────────────
  { id: 'dawlance-awm-dwt-14470-new-color-12-kg-exclusive', kg: 14, type: FULLY_AUTO_TYPE, name: 'Dawlance DWT-14470 14 kg Top-Load Fully Automatic Washing Machine' },
]

// Deduplicate by id
const seen = new Set()
const DEDUPED = FIXES.filter(f => {
  if (seen.has(f.id)) return false
  seen.add(f.id)
  return true
})

let ok = 0, fail = 0, skipped = 0

for (const f of DEDUPED) {
  const { data: existing, error: fetchErr } = await sb
    .from('products')
    .select('specs, simplified_name')
    .eq('id', f.id)
    .single()

  if (fetchErr) {
    console.warn(`SKIP ${f.id}: not found or error (${fetchErr.message})`)
    skipped++
    continue
  }

  const kapacityStr  = `${f.kg} kg`
  const clothCapStr  = `${f.kg} kg dry laundry per cycle`
  const recStr       = recFor(f.kg)

  const mergedSpecs = {
    ...(existing?.specs || {}),
    Capacity:             kapacityStr,
    'Cloth Capacity':     clothCapStr,
    'Recommended For':    recStr,
    Type:                 f.type,
  }

  const patch = { specs: mergedSpecs }
  if (f.name) patch.simplified_name = f.name

  const { data: updated, error } = await sb.from('products').update(patch).eq('id', f.id).select('id')

  if (error) {
    console.error(`FAIL  ${f.id}: ${error.message}`)
    fail++
  } else if (!updated?.length) {
    console.warn(`NOOP  ${f.id}: update ran but 0 rows changed (RLS?)`)
    fail++
  } else {
    console.log(`OK    ${kapacityStr.padEnd(8)} | ${f.type.padEnd(32)} | ${f.name || existing?.simplified_name}`)
    ok++
  }
}

console.log(`\nDone: ${ok} updated, ${skipped} skipped (not found), ${fail} failed`)
