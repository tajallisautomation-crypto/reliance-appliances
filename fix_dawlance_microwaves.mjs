/**
 * Fix Dawlance microwave data:
 * - Correct capacities (many were wrong)
 * - Fix Power ratings (all were 1000W; actual is 700-800W for most)
 * - Add Technology="Inverter" and "Inverter Technology" to MD 20 INV
 * - Fix simplified_name to match corrected capacity
 */
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://fdfjavyopbrfvwtjaerw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDE3MDAsImV4cCI6MjA4ODIxNzcwMH0.fXwGFR_e3xZ4trEbkcH8UQ6_oWcIn92UUUvkGuFajto'
)

// Corrections: [slug, correctCapacityL, correctPowerW, nameOverride, specOverrides]
const FIXES = [
  // MD series (all 20L, 700W)
  { id: 'dawlance-md-4-black',   cap: '20L', power: '700W',  name: 'Dawlance 20L Solo Microwave Oven MD-4 Black' },
  { id: 'dawlance-md-4-white',   cap: '20L', power: '700W',  name: 'Dawlance 20L Solo Microwave Oven MD-4 White' },
  { id: 'dawlance-md-7',         cap: '20L', power: '700W',  name: 'Dawlance 20L Solo Microwave Oven MD-7' },
  { id: 'dawlance-md-10',        cap: '20L', power: '700W',  name: 'Dawlance 20L Solo Microwave Oven MD-10' },
  { id: 'dawlance-md-15',        cap: '20L', power: '700W',  name: 'Dawlance 20L Solo Microwave Oven MD-15' },
  { id: 'dawlance-md-20-inv',    cap: '20L', power: '700W',  name: 'Dawlance 20L Inverter Microwave Oven MD 20 INV',
    extraSpecs: { Technology: 'Inverter', 'Inverter Technology': 'Yes — 21% more energy efficient, even cooking' } },

  // DW-210/220 series (20L, 700W)
  { id: 'dawlance-dw-210-s-pro',      cap: '20L', power: '700W', name: 'Dawlance 20L Solo Microwave Oven DW-210 S PRO' },
  { id: 'dawlance-dw-210-solo-white', cap: '20L', power: '700W', name: 'Dawlance 20L Solo Microwave Oven DW-210 Solo White' },
  { id: 'dawlance-dw-220-s',          cap: '20L', power: '700W', name: 'Dawlance 20L Solo Microwave Oven DW-220 S' },

  // DW-295 / DW-297 (20L, 700W)
  { id: 'dawlance-dw-295',     cap: '20L', power: '700W', name: 'Dawlance 20L Solo Microwave Oven DW-295' },
  { id: 'dawlance-dw-297-gss', cap: '20L', power: '700W', name: 'Dawlance 20L Grill Microwave Oven DW-297 GSS' },

  // DW-374 (23L, 800W) — solo
  { id: 'dawlance-dw-374-champagne', cap: '23L', power: '800W', name: 'Dawlance 23L Solo Microwave Oven DW-374 Champagne' },
  { id: 'dawlance-dw-374-silver',    cap: '23L', power: '800W', name: 'Dawlance 23L Solo Microwave Oven DW-374 Silver' },

  // DW-388 / DW-390 (23L, 800W) — solo
  { id: 'dawlance-dw-388',           cap: '23L', power: '800W', name: 'Dawlance 23L Solo Microwave Oven DW-388' },
  { id: 'dawlance-dw-390-s-dawlance',cap: '23L', power: '800W', name: 'Dawlance 23L Solo Microwave Oven DW-390 S' },

  // DW-393 series (23L, 800W) — grill
  { id: 'dawlance-dw-393-g-dawlance',  cap: '23L', power: '800W', name: 'Dawlance 23L Grill Microwave Oven DW-393 G' },
  { id: 'dawlance-dw-393-gss',         cap: '23L', power: '800W', name: 'Dawlance 23L Grill Microwave Oven DW-393 GSS' },
  { id: 'dawlance-dw-393-rg-dawlance', cap: '23L', power: '800W', name: 'Dawlance 23L Grill Microwave Oven DW-393 RG' },

  // DW-128G (28L, 1000W) — grill ← already correct capacity, fix power
  { id: 'dawlance-dw-128g',    cap: '28L', power: '1000W', name: 'Dawlance 28L Grill Microwave Oven DW-128G' },

  // DW-132 S (32L, 1000W) — solo ← already correct
  { id: 'dawlance-dw-132-s-digital-solo', cap: '32L', power: '1000W', name: 'Dawlance 32L Solo Microwave Oven DW-132 S Digital' },

  // DW-133 G (33L, 1000W) — grill ← already correct
  { id: 'dawlance-dw-133-g', cap: '33L', power: '1000W', name: 'Dawlance 33L Grill Microwave Oven DW-133 G' },

  // DW-136G (36L, 1000W) — grill ← already correct
  { id: 'dawlance-dw-136g', cap: '36L', power: '1000W', name: 'Dawlance 36L Grill Microwave Oven DW-136G' },
]

let updated = 0, errors = 0

for (const fix of FIXES) {
  // Get current product
  const { data: rows, error: fetchErr } = await supabase
    .from('products')
    .select('id, slug, specs, simplified_name')
    .eq('slug', fix.id)
    .single()

  if (fetchErr || !rows) {
    console.log(`⚠️  Not found: ${fix.id}`)
    errors++
    continue
  }

  const newSpecs = {
    ...rows.specs,
    Capacity: fix.cap,
    Power: fix.power,
    ...(fix.extraSpecs || {}),
  }

  const { error: updateErr } = await supabase
    .from('products')
    .update({
      specs: newSpecs,
      simplified_name: fix.name,
    })
    .eq('id', rows.id)

  if (updateErr) {
    console.log(`❌  ${fix.id}: ${updateErr.message}`)
    errors++
  } else {
    console.log(`✅  ${fix.id}: ${rows.simplified_name} → ${fix.name} (${fix.cap}, ${fix.power})`)
    updated++
  }
}

console.log(`\nDone: ${updated} updated, ${errors} errors`)
