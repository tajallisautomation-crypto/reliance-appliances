import { createClient } from '@supabase/supabase-js'
const supabase = createClient(
  'https://fdfjavyopbrfvwtjaerw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDE3MDAsImV4cCI6MjA4ODIxNzcwMH0.fXwGFR_e3xZ4trEbkcH8UQ6_oWcIn92UUUvkGuFajto'
)
const { data, error } = await supabase
  .from('products')
  .select('id, brand, model, category, sub_category, simplified_name, specs, cash_floor, retail_price, stock_status')
  .ilike('brand', '%dawlance%')
  .ilike('category', '%microwave%')
  .order('model')

if (error) { console.error(error); process.exit(1) }
console.log(`Dawlance Microwaves: ${data.length}\n`)
data.forEach(p => {
  const { Capacity, Technology, 'Heating Technology': HT, Power, Type } = p.specs || {}
  console.log(`[${p.id}] ${p.model}`)
  console.log(`  name: ${p.simplified_name}`)
  console.log(`  cat: ${p.category} | sub: ${p.sub_category}`)
  console.log(`  Capacity="${Capacity||''}" Tech="${Technology||''}" HT="${HT||''}" Power="${Power||''}" Type="${Type||''}"`)
  console.log(`  price: ${p.cash_floor||p.retail_price} | stock: ${p.stock_status}`)
  console.log()
})
