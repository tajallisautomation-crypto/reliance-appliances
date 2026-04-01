import { createClient } from '@supabase/supabase-js'
const sb = createClient(
  'https://fdfjavyopbrfvwtjaerw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDE3MDAsImV4cCI6MjA4ODIxNzcwMH0.fXwGFR_e3xZ4trEbkcH8UQ6_oWcIn92UUUvkGuFajto'
)

// Official Dawlance catalogue (WASHING-MACHINE.pdf / products.txt) capacities
// Model numbers do NOT encode kg — they are product codes
// Catalogue confirms: DW 6100=15kg, DW 9100=18kg, DW 9200=18kg
//                     DW 6550 twin=12kg, DW 7500 twin=15kg, DW 10500 twin=22kg
// Uncatalogued models (DW 7200, 6580, 8550, 10600) estimated from price ladder analysis

const FIXES = [
  // ── CONFIRMED FROM OFFICIAL CATALOGUE ─────────────────────────────
  {
    id: 'dawlance-dw-6100-white',
    kg: 15,
    name: 'Dawlance 15 kg Semi-Automatic Washing Machine',
    type: 'Single Tub',
    for: '9–11 persons',
    clothCap: '15 kg dry laundry per cycle',
    note: 'confirmed: official Dawlance catalogue'
  },
  {
    id: 'dawlance-wm-dw-9100-glass-lid-black-grey',
    kg: 18,
    name: 'Dawlance 18 kg Semi-Automatic Washing Machine (Glass Lid)',
    type: 'Single Tub',
    for: '12–14 persons',
    clothCap: '18 kg dry laundry per cycle',
    note: 'confirmed: official Dawlance catalogue'
  },
  {
    id: '26459d05-0762-48e9-8eb2-3272a8caa42a', // DW 9200 CFL
    kg: 18,
    name: 'Dawlance 18 kg Semi-Automatic Washing Machine (CFL)',
    type: 'Single Tub',
    for: '12–14 persons',
    clothCap: '18 kg dry laundry per cycle',
    note: 'confirmed: official Dawlance catalogue'
  },
  {
    id: 'dawlance-wm-dw-6550-twin-tub-clear-lid-white-advanco',
    kg: 12,
    name: 'Dawlance 12 kg Twin-Tub Washing Machine',
    type: 'Twin Tub',
    for: '7–9 persons',
    clothCap: '12 kg per wash cycle',
    note: 'confirmed: official Dawlance catalogue'
  },
  {
    id: 'dawlance-wm-dw-7500-twin-tub-clear-lid-white',
    kg: 15,
    name: 'Dawlance 15 kg Twin-Tub Washing Machine',
    type: 'Twin Tub',
    for: '10–12 persons',
    clothCap: '15 kg per wash cycle',
    note: 'confirmed: official Dawlance catalogue'
  },
  {
    id: 'dawlance-dw-10500',
    kg: 22,
    name: 'Dawlance 22 kg Twin-Tub Washing Machine',
    type: 'Twin Tub',
    for: '15–18 persons / commercial',
    clothCap: '22 kg per wash cycle',
    note: 'confirmed: official Dawlance catalogue'
  },
  // ── ESTIMATED FROM PRICE-LADDER ANALYSIS (uncatalogued FL models) ─
  {
    id: 'dawlance-dw-7200-w-fl-dawlance',
    kg: 15,
    name: 'Dawlance 15 kg Semi-Automatic Washing Machine (White)',
    type: 'Single Tub',
    for: '9–11 persons',
    clothCap: '15 kg dry laundry per cycle',
    note: 'estimated: price-bracket analysis (same tier as DW 6100)'
  },
  {
    id: 'dawlance-dw-6580-w-fl-dawlance',
    kg: 18,
    name: 'Dawlance 18 kg Semi-Automatic Washing Machine (Full Lid)',
    type: 'Single Tub',
    for: '12–14 persons',
    clothCap: '18 kg dry laundry per cycle',
    note: 'estimated: price-bracket analysis (same tier as DW 9100, premium lid)'
  },
  {
    id: 'dawlance-dw-8550-cb-fl-dawlance',
    kg: 18,
    name: 'Dawlance 18 kg Semi-Automatic Washing Machine (Chrome Body)',
    type: 'Single Tub',
    for: '12–14 persons',
    clothCap: '18 kg dry laundry per cycle',
    note: 'estimated: price-bracket analysis (18 kg chrome body premium model)'
  },
  {
    id: 'dawlance-dw-10600-c-fl',
    kg: 22,
    name: 'Dawlance 22 kg Twin-Tub Washing Machine (Full Lid)',
    type: 'Twin Tub',
    for: '15–18 persons / commercial',
    clothCap: '22 kg per wash cycle',
    note: 'estimated: same capacity tier as DW 10500, premium lid variant'
  },
]

let ok = 0, fail = 0
for (const f of FIXES) {
  const specsPatch = {
    Capacity: `${f.kg} kg`,
    'Cloth Capacity': f.clothCap,
    'Recommended For': f.for,
    Type: `Semi-Automatic (${f.type})`,
  }
  // Fetch existing specs first to merge
  const { data: existing } = await sb.from('products').select('specs').eq('id', f.id).single()
  const mergedSpecs = { ...(existing?.specs || {}), ...specsPatch }

  const { error } = await sb.from('products').update({
    simplified_name: f.name,
    specs: mergedSpecs,
  }).eq('id', f.id)

  if (error) {
    console.error(`FAIL ${f.id}: ${error.message}`)
    fail++
  } else {
    console.log(`OK   ${f.kg}kg | ${f.name} | ${f.note}`)
    ok++
  }
}
console.log(`\nDone: ${ok} updated, ${fail} failed`)
