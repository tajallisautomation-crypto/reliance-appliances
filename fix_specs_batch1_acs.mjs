// Batch 1: Add Running Wattage + Running Current to all AC products
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://fdfjavyopbrfvwtjaerw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjY0MTcwMCwiZXhwIjoyMDg4MjE3NzAwfQ.eyCmrSFge7BKVj9CYXVeDjjEtVXQVUhpWIIpN1an65w'
)

function tonFromProduct(p) {
  // Try specs first
  if (p.specs?.Tonnage) {
    const t = parseFloat(p.specs.Tonnage)
    if (t > 0) return t
  }
  const cat  = (p.category || '').toLowerCase()
  const name = (p.simplified_name || p.model || '').toLowerCase()
  // Category: "1 Ton Air Conditioners", "1.5 Ton Air Conditioners", "2 Ton Air Conditioners"
  const catM = cat.match(/^(\d+(?:\.\d+)?)\s*ton/)
  if (catM) return parseFloat(catM[1])
  // Name: "... 15 ..." = 1.5 ton, "... 30 ..." = 1.5 ton, "... 24 ..." = 2 ton
  // "15" suffix = 1.5 ton, "12" = 1 ton, "18" = 1.5 ton, "24" = 2 ton
  const numM = name.match(/\b(10|12|13|14|15|18|19|20|24|30|36|48)\b/)
  if (numM) {
    const n = parseInt(numM[1])
    if (n === 10) return 0.75
    if (n === 12) return 1.0
    if (n === 13 || n === 14) return 1.0
    if (n === 15) return 1.0   // "15" model suffix = 1 ton in Pakistani AC naming
    if (n === 18 || n === 19 || n === 20 || n === 30) return 1.5
    if (n === 24) return 2.0
    if (n === 36) return 3.0
    if (n === 48) return 4.0
  }
  // Default from category
  if (cat.includes('1.5 ton') || cat.includes('1.5ton')) return 1.5
  if (cat.includes('1 ton'))   return 1.0
  if (cat.includes('2 ton'))   return 2.0
  return 1.5
}

function isInverterAC(p) {
  const name = (p.simplified_name || p.model || '').toUpperCase()
  const spec = p.specs?.Inverter
  if (spec === 'Yes') return true
  if (spec === 'No')  return false
  return /HNF|PITH|CITH|FAIRY|LOMO|UFLY|ULTRA|INVERTER|\bINV\b|LFW|HFT|HFP|HPM|RFP|\bDCINV/.test(name)
}

async function run() {
  const { data: acs, error } = await sb
    .from('products')
    .select('id,brand,model,simplified_name,category,specs')
    .or('category.ilike.*Air Conditioner*,category.ilike.*Ton Air*')

  if (error) { console.error(error.message); return }
  console.log('Total ACs fetched:', acs.length)

  let updated = 0, skipped = 0, errors = 0
  const BATCH = 10
  const toUpdate = acs.filter(p => !p.specs?.['Running Wattage'])

  console.log('Need update:', toUpdate.length)

  for (let i = 0; i < toUpdate.length; i += BATCH) {
    const batch = toUpdate.slice(i, i + BATCH)
    await Promise.all(batch.map(async p => {
      const ton    = tonFromProduct(p)
      const inv    = isInverterAC(p)
      const runW   = Math.round(ton * (inv ? 850 : 1100))
      const runA   = (runW / (220 * 0.85)).toFixed(1)
      const newSpecs = {
        ...p.specs,
        'Running Wattage': runW + 'W' + (inv ? ' (rated load — varies 40–100%)' : ''),
        'Running Current': runA + 'A @ 220V / 50Hz',
      }
      const { error: e } = await sb.from('products').update({ specs: newSpecs }).eq('id', p.id)
      if (e) { console.error('ERR', p.brand, p.model, e.message); errors++ }
      else    { updated++; console.log(`OK [${ton}T ${inv?'INV':'STD'} ${runW}W/${runA}A]`, p.brand, p.model) }
    }))
    await new Promise(r => setTimeout(r, 300))
  }
  console.log(`\nDone: ${updated} updated, ${skipped} skipped, ${errors} errors`)
}

run()
