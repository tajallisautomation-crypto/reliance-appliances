import { createClient } from '@supabase/supabase-js'
const sb = createClient(
  'https://fdfjavyopbrfvwtjaerw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDE3MDAsImV4cCI6MjA4ODIxNzcwMH0.fXwGFR_e3xZ4trEbkcH8UQ6_oWcIn92UUUvkGuFajto'
)

// Check fridge specs
const { data: fridges } = await sb.from('products').select('id,model,category,sub_category,specs,simplified_name')
  .ilike('brand','%haier%').or('category.ilike.*refrigerat*,category.ilike.*fridge*').order('category')

console.log(`Haier fridges: ${fridges.length}`)
fridges.forEach(p => {
  const { Capacity, Type, Inverter, 'Inverter Technology': IT } = p.specs || {}
  const hasCapacity = !!Capacity
  const hasType = !!Type
  const capNum = Capacity?.match(/(\d{1,2}(?:\.\d)?)\s*cu\.?\s*ft/i)?.[1] || 'NO CUFT'
  console.log(`${p.model} | cat="${p.category}" | sub="${p.sub_category}"`)
  console.log(`  Capacity="${Capacity||'MISSING'}" Type="${Type||'MISSING'}" Inv="${Inverter||''}" IT="${IT||''}"`)
  if (!hasCapacity || !hasType) console.log(`  ⚠️  MISSING SPEC FIELDS`)
})

// Check freezer specs
const { data: freezers } = await sb.from('products').select('id,model,category,sub_category,specs')
  .ilike('brand','%haier%').ilike('category','%freez%').order('model')

console.log(`\nHaier freezers: ${freezers.length}`)
freezers.slice(0, 5).forEach(p => {
  const { Capacity, Type } = p.specs || {}
  console.log(`${p.model} | sub="${p.sub_category}" | Type="${Type||'MISSING'}" Cap="${Capacity||'MISSING'}"`)
})

// Check washing machine specs
const { data: wms } = await sb.from('products').select('id,model,category,sub_category,specs')
  .ilike('brand','%haier%').ilike('category','%washing%').order('model')

console.log(`\nHaier washing machines: ${wms.length}`)
wms.slice(0, 5).forEach(p => {
  const { Type, Capacity } = p.specs || {}
  console.log(`${p.model} | sub="${p.sub_category}" | Type="${Type||'MISSING'}" Cap="${Capacity||'MISSING'}"`)
})
