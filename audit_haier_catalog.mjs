import { createClient } from '@supabase/supabase-js'
const supabase = createClient(
  'https://fdfjavyopbrfvwtjaerw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDE3MDAsImV4cCI6MjA4ODIxNzcwMH0.fXwGFR_e3xZ4trEbkcH8UQ6_oWcIn92UUUvkGuFajto'
)
const { data, error } = await supabase
  .from('products')
  .select('id, brand, model, category, sub_category, thumbnail_url, cash_floor, retail_price, stock_status, specs')
  .ilike('brand', '%haier%')
  .order('category')

if (error) { console.error(error); process.exit(1) }
console.log(`Total Haier products: ${data.length}\n`)

// Group by category
const bycat = {}
data.forEach(p => {
  const k = p.category || 'UNKNOWN'
  if (!bycat[k]) bycat[k] = []
  bycat[k].push(p)
})

for (const [cat, prods] of Object.entries(bycat).sort()) {
  const withImg = prods.filter(p => p.thumbnail_url)
  const withPrice = prods.filter(p => (p.cash_floor || p.retail_price) > 0)
  const inStock = prods.filter(p => p.stock_status === 'In Stock')
  console.log(`${cat}: ${prods.length} total | ${withImg.length} w/image | ${withPrice.length} w/price | ${inStock.length} in-stock`)
  prods.forEach(p => {
    const flag = (!p.thumbnail_url ? '❌IMG' : '') + (!(p.cash_floor||p.retail_price) ? ' ❌PRICE' : '') + (p.stock_status !== 'In Stock' ? ` [${p.stock_status}]` : '')
    if (flag) console.log(`  ⚠️  ${p.model} | sub="${p.sub_category}" ${flag}`)
  })
}
