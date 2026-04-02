// Batch 3: Fix all missing power specs (209 products across 17 categories)
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://fdfjavyopbrfvwtjaerw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjY0MTcwMCwiZXhwIjoyMDg4MjE3NzAwfQ.eyCmrSFge7BKVj9CYXVeDjjEtVXQVUhpWIIpN1an65w'
)

function patch(p, extra) { return { ...p.specs, ...extra } }

function cuFtFromSpecs(sp) {
  const v = Object.values(sp).find(v => /cu\.?\s*ft/i.test(String(v)))
  return v ? parseFloat(String(v)) : 0
}

async function run() {
  const { data, error } = await sb.from('products').select('id,brand,model,simplified_name,category,specs').limit(2000)
  if (error) { console.error(error.message); return }
  console.log(`Loaded ${data.length} products`)

  const fixes = []

  for (const p of data) {
    const cat  = (p.category || '').toLowerCase()
    const name = (p.simplified_name || p.model || '').toLowerCase()
    const sp   = p.specs || {}
    const inv  = name.includes('inverter') || sp.Inverter === 'Yes'

    // Skip if already has any power spec
    const POWER_KEYS = ['running wattage','running current','power consumption','wattage','power','input power','rated power','energy consumption']
    const hasPower = Object.keys(sp).some(k => POWER_KEYS.includes(k.toLowerCase()))
    if (hasPower) continue

    const extra = {}
    const label = `${p.brand} ${p.model}`

    // ── 1. FREEZERS — all 45 missing Power Consumption ────────────────
    if (cat.includes('freezer')) {
      const cuFt = cuFtFromSpecs(sp)
      let w
      if (inv) {
        w = cuFt > 18 ? 125 : cuFt > 14 ? 105 : cuFt > 10 ? 90 : 75
      } else {
        w = cuFt > 18 ? 185 : cuFt > 14 ? 160 : cuFt > 10 ? 135 : cuFt > 7 ? 110 : 90
      }
      extra['Power Consumption'] = `${w}W (running average)`
      extra['Running Current']   = `${(w / (220 * 0.85)).toFixed(1)}A @ 220V / 50Hz`
    }

    // ── 2. TELEVISIONS — missing Power Consumption ────────────────────
    if ((cat.includes('television') || cat.includes('televisions'))) {
      const inchM = name.match(/(\d{2,3})[""]/) || name.match(/(\d{2,3})\s*(?:inch|")/i)
      const inch  = inchM ? parseInt(inchM[1]) : 43
      const w = inch >= 85 ? 190 : inch >= 75 ? 155 : inch >= 65 ? 120 : inch >= 55 ? 90 : inch >= 43 ? 65 : inch >= 40 ? 55 : 45
      extra['Power Consumption'] = `${w}W`
      extra['Running Current']   = `${(w / (220 * 0.85)).toFixed(1)}A @ 220V / 50Hz`
    }

    // ── 3. KITCHEN APPLIANCES ─────────────────────────────────────────
    if (cat === 'kitchen' || cat === 'kitchen cooking appliances' || cat === 'kitchen blenders & juicers' || cat === 'kitchen food processors' || cat === 'kitchen breakfast & beverages') {
      // Skip non-electric items
      if (name.includes('pizza pan') || name.includes('scale') || name.includes('measuring cup') || name.includes('kitchen tool')) continue

      let w = null

      if (name.includes('kettle'))              w = '1500–1800W'
      else if (name.includes('induction'))      w = '1500–2000W'
      else if (name.includes('espresso') || name.includes('coffee')) w = '800–1000W'
      else if (name.includes('oven toaster') || name.includes('toaster oven') || name.includes('oven with')) w = '1200–2000W'
      else if (name.includes('convection oven') || name.includes('digital oven')) w = '1500–2000W'
      else if (name.includes('electric oven') || name.includes('wf-5160') || name.includes('5160')) w = '1500–2000W'
      else if (name.includes('air fryer'))      w = '1200–1500W'
      else if (name.includes('toaster') && !name.includes('oven')) w = '800–1000W'
      else if (name.includes('rice cooker'))    w = '500–700W'
      else if (name.includes('meat grinder') || name.includes('mincer')) w = '1000–1500W'
      else if (name.includes('food processor')) w = '500–800W'
      else if (name.includes('blender') || name.includes('juicer') || name.includes('kitchen robot') || name.includes('grinder')) w = '300–500W'
      else if (name.includes('hand blender') || name.includes('hand mixer') || name.includes('egg beater') || name.includes('beater')) w = '180–300W'
      else if (name.includes('dough maker') || name.includes('stand mixer') || name.includes('dwms')) w = '300–500W'
      else if (name.includes('roti maker'))     w = '800–1000W'
      else if (name.includes('hot plate'))      w = '1000–1500W'
      else if (name.includes('citrus juicer'))  w = '25–60W'
      else if (name.includes('sandwich'))       w = '700–900W'
      else if (name.includes('wf-2016') || name.includes('wf-2017') || name.includes('air fryer')) w = '1200–1500W'
      else if (name.includes('wf-3079') || name.includes('wf-3075') || name.includes('wf-3080') || name.includes('wf-1064') || name.includes('wf-1065') || name.includes('wf-1070') || name.includes('wf-3069')) w = '1200–2000W'

      if (w) {
        extra['Wattage'] = w
      }
    }

    // ── 4. HOME & HEATING APPLIANCES ──────────────────────────────────
    if (cat.includes('home') && cat.includes('heat')) {
      // Skip gas geysers, kitchen tool sets, measuring cups (non-electric)
      if (name.includes('gas geyser') || name.includes('geyser') || name.includes('kitchen tool') || name.includes('measuring cup')) continue

      if (name.includes('iron') || name.includes('dry iron') || name.includes('steam iron') || name.includes('electric iron')) {
        extra['Wattage'] = '1000–2200W'
      } else if (name.includes('garment steamer') || name.includes('steamer')) {
        extra['Wattage'] = '800–1500W'
      } else if (name.includes('room heater') || name.includes('heater')) {
        extra['Wattage'] = '1500–2500W'
      } else if (name.includes('humidifier')) {
        extra['Wattage'] = '25–40W (ultrasonic)'
      } else if (name.includes('heating blanket') || name.includes('dwhb-475') || name.includes('dwhb 475')) {
        extra['Wattage'] = '475W'
      }
    }

    // ── 5. PERSONAL CARE ──────────────────────────────────────────────
    if (cat.includes('personal care')) {
      // Skip battery-operated scales
      if (name.includes('scale') || name.includes('bath scale') || name.includes('weight scale')) continue

      if (name.includes('hair dryer') || name.includes('hair dyer')) {
        extra['Wattage'] = '1200–2000W'
      } else if (name.includes('hair straightener') || name.includes('straightening brush')) {
        extra['Wattage'] = '90–230W'
      } else if (name.includes('hair clipper') || name.includes('trimmer')) {
        extra['Wattage'] = '10–25W'
      } else if (name.includes('epilator')) {
        extra['Wattage'] = '10–20W'
      } else if (name.includes('foot massager')) {
        extra['Wattage'] = '40–80W'
      } else if (name.includes('sterilizer')) {
        extra['Wattage'] = '400–600W'
      } else if (name.includes('bottle warmer')) {
        extra['Wattage'] = '250–400W'
      } else if (name.includes('facial steamer') || name.includes('steamer')) {
        extra['Wattage'] = '600–1000W'
      } else if (name.includes('insect killer')) {
        extra['Wattage'] = '15–30W'
      }
    }

    // ── 6. CARE CATEGORY ──────────────────────────────────────────────
    if (cat === 'care') {
      // Skip battery-only devices (bath scale, digital scale)
      if (name.includes('scale') || name.includes('trimmer') || name.includes('shaver')) continue

      if (name.includes('hair straightener') || name.includes('straightener')) {
        extra['Wattage'] = '50–80W'
      } else if (name.includes('hair dryer')) {
        extra['Wattage'] = '1200–2000W'
      }
    }

    // ── 7. SMALL APPLIANCES — Vacuum cleaners ─────────────────────────
    if (cat === 'small appliances' || cat === 'vacuum') {
      if (name.includes('drum vacuum')) {
        extra['Wattage'] = '1200–1500W'
        extra['Suction Power'] = sp['Suction Power'] || '14–18 kPa'
      } else if (name.includes('professional') || name.includes('wf-3469')) {
        extra['Wattage'] = '1600–2000W'
        extra['Suction Power'] = sp['Suction Power'] || '20–24 kPa'
      } else if (name.includes('magic broom')) {
        extra['Wattage'] = '400–800W'
      } else if (name.includes('2-in-1') || name.includes('3-in-1')) {
        extra['Wattage'] = '800–1200W'
        extra['Suction Power'] = sp['Suction Power'] || '12–16 kPa'
      } else {
        extra['Wattage'] = '1200–1800W'
        extra['Suction Power'] = sp['Suction Power'] || '14–18 kPa'
      }
    }

    // ── 8. SMALL CATEGORY ─────────────────────────────────────────────
    if (cat === 'small') {
      if (name.includes('iron') || name.includes('dry iron')) {
        extra['Wattage'] = '1000–2200W'
      } else if (name.includes('ceramic fan heater') || name.includes('fan heater')) {
        extra['Wattage'] = '1500–2000W'
      } else if (name.includes('insect killer')) {
        extra['Wattage'] = '25–40W'
      } else if (name.includes('egg boiler')) {
        extra['Wattage'] = '300–500W'
      } else if (name.includes('bottle warmer') || name.includes('baby bottle')) {
        extra['Wattage'] = '250–400W'
      }
    }

    // ── 9. HOOD & HOBS ────────────────────────────────────────────────
    if (cat.includes('hood') || cat.includes('hob')) {
      if (name.includes('range hood') || name.includes('kitchen hood') || (name.includes('hood') && !name.includes('hob'))) {
        extra['Motor Power'] = '100–200W'
        extra['Lighting'] = sp['Lighting'] || '2 × LED bulbs'
      } else if (name.includes('built-in electric oven') || name.includes('dbe-')) {
        extra['Wattage'] = '2000–2500W'
      } else if (name.includes('built-in microwave') || name.includes('dbm-') || name.includes('dbe-208110')) {
        extra['Wattage'] = '900–1200W'
      }
      // Gas hobs: ignition only
      if ((name.includes('gas hob') || name.includes('dhg') || name.includes('dhm') || name.includes('dbg')) && !name.includes('electric') && !name.includes('oven')) {
        extra['Ignition Power'] = '3W (auto-ignition only; runs on gas)'
      }
    }

    // ── 10. CONVECTION & AIR FRYER OVENS ──────────────────────────────
    if (cat.includes('convection') || cat === 'air fryers') {
      const capM = name.match(/(\d{2,3})l\b/) || name.match(/(\d{2,3})\s*(?:l|litre)/i)
      const litre = capM ? parseInt(capM[1]) : 0
      let w
      if (litre >= 45)      w = '2500–3000W'
      else if (litre >= 35) w = '2000–2500W'
      else if (litre >= 20) w = '1400–1800W'
      else                  w = '1200–1600W'
      extra['Wattage'] = w
    }

    // ── 11. AIR FRYER (WF-5254) ───────────────────────────────────────
    if (cat.includes('air fryer') && !extra['Wattage']) {
      extra['Wattage'] = '1200–1500W'
    }

    if (Object.keys(extra).length) {
      fixes.push({ id: p.id, specs: patch(p, extra), label })
    }
  }

  // Deduplicate by id
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
