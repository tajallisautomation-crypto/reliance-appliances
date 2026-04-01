import { createClient } from '@supabase/supabase-js';
const sb = createClient(
  'https://fdfjavyopbrfvwtjaerw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDE3MDAsImV4cCI6MjA4ODIxNzcwMH0.fXwGFR_e3xZ4trEbkcH8UQ6_oWcIn92UUUvkGuFajto'
);

const { data } = await sb.from('products')
  .select('id,brand,model,category,simplified_name,cash_floor,retail_price,stock_status')
  .in('brand', ['Crown', 'Elektra Boost', 'Elektra Boost Lite', 'Elektra Boost Pro', 'Nexus', 'Yorker', 'Pridor'])
  .order('brand').order('model');

const byBrand = {};
for (const p of data) {
  if (!byBrand[p.brand]) byBrand[p.brand] = [];
  byBrand[p.brand].push(p);
}

for (const [brand, products] of Object.entries(byBrand)) {
  console.log(`\n=== ${brand} (${products.length}) ===`);
  products.forEach(p => console.log(`  [${p.id}] ${p.model} | cat: ${p.category} | cash: ${p.cash_floor?.toLocaleString()}`));
}
