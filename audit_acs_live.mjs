// Audit AC data in Supabase — shows what spec fields actually contain
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://fdfjavyopbrfvwtjaerw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDE3MDAsImV4cCI6MjA4ODIxNzcwMH0.fXwGFR_e3xZ4trEbkcH8UQ6_oWcIn92UUUvkGuFajto'
)

const { data, error } = await supabase
  .from('products')
  .select('brand, model, sub_category, specs')
  .ilike('category', '%air condition%')
  .order('brand')

if (error) { console.error(error); process.exit(1) }

console.log(`Total ACs: ${data.length}\n`)

// Show unique sub_category values
const subCats = [...new Set(data.map(r => r.sub_category || 'EMPTY'))]
console.log('=== sub_category values ===')
subCats.sort().forEach(s => {
  const count = data.filter(r => (r.sub_category || 'EMPTY') === s).length
  console.log(`  ${count}x  "${s}"`)
})

// Show unique Tonnage spec values
const tonnageVals = [...new Set(data.map(r => (r.specs?.Tonnage || 'MISSING')))]
console.log('\n=== specs.Tonnage values ===')
tonnageVals.sort().forEach(t => {
  const count = data.filter(r => (r.specs?.Tonnage || 'MISSING') === t).length
  console.log(`  ${count}x  "${t}"`)
})

// Show unique Heating spec values
const heatingVals = [...new Set(data.map(r => (r.specs?.Heating || 'MISSING')))]
console.log('\n=== specs.Heating values ===')
heatingVals.sort().forEach(h => {
  const count = data.filter(r => (r.specs?.Heating || 'MISSING') === h).length
  console.log(`  ${count}x  "${h}"`)
})

// Show unique Inverter spec values
const invVals = [...new Set(data.map(r => (r.specs?.Inverter || 'MISSING')))]
console.log('\n=== specs.Inverter values ===')
invVals.sort().forEach(v => {
  const count = data.filter(r => (r.specs?.Inverter || 'MISSING') === v).length
  console.log(`  ${count}x  "${v}"`)
})

// Show a sample of 5 products per brand with their raw specs
const brands = [...new Set(data.map(r => r.brand))]
console.log('\n=== Sample per brand (first 3) ===')
for (const brand of brands.sort()) {
  const bps = data.filter(r => r.brand === brand).slice(0, 3)
  console.log(`\n${brand} (${data.filter(r => r.brand === brand).length} total):`)
  bps.forEach(p => {
    const { Tonnage, Heating, Inverter, 'Cooling Capacity': cc } = p.specs || {}
    console.log(`  ${p.model} | sub_cat="${p.sub_category}" | Tonnage="${Tonnage || ''}" | Heating="${Heating || ''}" | Inverter="${Inverter || ''}" | CC="${cc || ''}"`)
  })
}
