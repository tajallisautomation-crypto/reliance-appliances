import { createClient } from '@supabase/supabase-js'
const supabase = createClient(
  'https://fdfjavyopbrfvwtjaerw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDE3MDAsImV4cCI6MjA4ODIxNzcwMH0.fXwGFR_e3xZ4trEbkcH8UQ6_oWcIn92UUUvkGuFajto'
)
const { data, error } = await supabase
  .from('products')
  .select('brand, model, category, sub_category, simplified_name, tags, specs')
  .or('brand.ilike.%crown%,tags.ilike.%pridor%,simplified_name.ilike.%pridor%,sub_category.ilike.%pridor%')
  .order('model')

if (error) { console.error(error); process.exit(1) }
console.log(`Found: ${data.length}`)
data.forEach(p => {
  console.log(`${p.brand} | ${p.model} | cat="${p.category}" | sub="${p.sub_category}" | name="${p.simplified_name}"`)
  if (p.specs && Object.keys(p.specs).length) console.log('  specs:', JSON.stringify(p.specs))
})
