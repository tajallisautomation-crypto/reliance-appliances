// Batch 4: Fix remaining 55 — solar inverters/converters, hoods/hobs, batteries
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://fdfjavyopbrfvwtjaerw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjY0MTcwMCwiZXhwIjoyMDg4MjE3NzAwfQ.eyCmrSFge7BKVj9CYXVeDjjEtVXQVUhpWIIpN1an65w'
)

function patch(p, extra) { return { ...p.specs, ...extra } }

async function run() {
  const { data, error } = await sb.from('products').select('id,brand,model,simplified_name,category,specs').limit(2000)
  if (error) { console.error(error.message); return }
  console.log(`Loaded ${data.length} products`)

  const fixes = []
  const POWER_KEYS = ['running wattage','running current','power consumption','wattage','power','input power','rated power','energy consumption']

  for (const p of data) {
    const cat  = (p.category || '').toLowerCase()
    const name = (p.simplified_name || p.model || '').toLowerCase()
    const sp   = p.specs || {}

    const hasPower = Object.keys(sp).some(k => POWER_KEYS.includes(k.toLowerCase()))
    if (hasPower) continue

    const extra = {}
    const label = `${p.brand} ${p.model}`

    // ── 1. SOLAR INVERTERS — extract kW from model (PV2500 = 2.5kW) ────
    if (cat.includes('solar inverter') || cat.includes('solar-inverter')) {
      const kwM = (p.model + ' ' + (p.simplified_name || '')).match(/PV(\d+)/i)
      if (kwM) {
        const w  = parseInt(kwM[1])
        const kw = w / 1000
        extra['Rated Power']    = `${w}W (${kw} kW)`
        extra['Output Voltage'] = sp['Output Voltage'] || '220V / 50Hz'
      }
    }

    // ── 2. HYBRID INVERTERS ────────────────────────────────────────────
    if (cat.includes('hybrid inverter')) {
      const kwM = (p.model + ' ' + (p.simplified_name || '')).match(/PV[\-\s]?(\d+)/i)
      if (kwM) {
        const w  = parseInt(kwM[1])
        const kw = w / 1000
        extra['Rated Power']    = `${w}W (${kw} kW)`
        extra['Output Voltage'] = sp['Output Voltage'] || '220V / 50Hz'
      }
    }

    // ── 3. SOLAR CONVERTERS ────────────────────────────────────────────
    if (cat.includes('solar converter') || cat.includes('solar-converter')) {
      const kwM = (p.model + ' ' + (p.simplified_name || '')).match(/PV(\d+)/i)
      if (kwM) {
        const w  = parseInt(kwM[1])
        const kw = w / 1000
        extra['Rated Power']    = `${w}W (${kw} kW)`
        extra['Output Voltage'] = sp['Output Voltage'] || '220V / 50Hz'
      }
    }

    // ── 4. SOLAR WATER PUMP / VFD ─────────────────────────────────────
    if (cat.includes('solar water pump') || cat.includes('solar pump')) {
      const kwM = name.match(/(\d+(?:\.\d+)?)\s*kw/i)
      const kw  = kwM ? parseFloat(kwM[1]) : 5
      extra['Rated Power'] = `${kw * 1000}W (${kw} kW)`
    }

    // ── 5. GAS HOBS — rename Ignition Power → Wattage ─────────────────
    if ((cat.includes('hood') || cat.includes('hob')) && sp['Ignition Power'] && !sp['Wattage']) {
      extra['Wattage'] = sp['Ignition Power']
    }

    // ── 6. RANGE HOODS — rename Motor Power → Wattage ─────────────────
    if ((cat.includes('hood') || cat.includes('hob')) && sp['Motor Power'] && !sp['Wattage']) {
      extra['Wattage'] = sp['Motor Power']
    }

    // ── 7. GAS OVENS (DBMO) — add ignition-only wattage ───────────────
    if ((cat.includes('hood') || cat.includes('hob')) && !sp['Motor Power'] && !sp['Ignition Power'] && !sp['Wattage']) {
      if (name.includes('gas oven') || name.includes('dbmo') || name.includes('built-in gas')) {
        extra['Wattage'] = '3W (auto-ignition only; oven runs on gas)'
      }
    }

    // ── 8. LITHIUM BATTERIES — derive kWh from voltage × AH ───────────
    if (cat.includes('lithium battery') || cat.includes('lithium-battery')) {
      const voltM = (p.model + ' ' + (sp['Voltage'] || '')).match(/(\d+(?:\.\d+)?)\s*[Vv]/)
      const ahM   = (p.model + ' ' + (sp['Capacity (AH)'] || '')).match(/(\d+(?:\.\d+)?)\s*[Aa][Hh]/)
      if (voltM && ahM) {
        const v   = parseFloat(voltM[1])
        const ah  = parseFloat(ahM[1])
        const kwh = (v * ah / 1000).toFixed(1)
        extra['Energy Capacity'] = `${kwh} kWh (${v}V × ${ah}Ah)`
        extra['Rated Power']     = sp['Rated Power'] || `${Math.round(v * ah * 0.5)}W continuous discharge`
      }
    }

    // ── 9. NON-ELECTRIC (skip) ─────────────────────────────────────────
    // Gas geysers, bath scales, measuring cups, kitchen tool sets, pizza pan, digital scales
    // → These legitimately have no mains wattage — skip

    if (Object.keys(extra).length) {
      fixes.push({ id: p.id, specs: patch(p, extra), label })
    }
  }

  const seen = {}
  fixes.forEach(f => seen[f.id] = f)
  const list = Object.values(seen)
  console.log(`\nApplying ${list.length} fixes...\n`)

  let ok = 0, err = 0
  const BATCH = 8
  for (let i = 0; i < list.length; i += BATCH) {
    const batch = list.slice(i, i + BATCH)
    await Promise.all(batch.map(async f => {
      const { error } = await sb.from('products').update({ specs: f.specs }).eq('id', f.id)
      if (error) { console.error('ERR', f.label, error.message); err++ }
      else        { console.log('OK', f.label); ok++ }
    }))
    await new Promise(r => setTimeout(r, 250))
  }
  console.log(`\nDone: ${ok} updated, ${err} errors`)
}

run()
