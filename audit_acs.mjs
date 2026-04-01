import { createClient } from '@supabase/supabase-js';
const sb = createClient('https://fdfjavyopbrfvwtjaerw.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDE3MDAsImV4cCI6MjA4ODIxNzcwMH0.fXwGFR_e3xZ4trEbkcH8UQ6_oWcIn92UUUvkGuFajto');
await sb.auth.signInWithPassword({ email: 'tajallisautomation@gmail.com', password: 'Hammad123!' });
const {data,error} = await sb.from('products').select('id,brand,model,category,specs,simplified_name,tags,cash_floor,stock_status').ilike('category','%air condition%').order('brand').order('model');
if (error) { console.log('err:', error.message); process.exit(1); }
console.log(`Total ACs: ${data.length}`);
const byBrand = {};
for (const p of data) {
  if (!byBrand[p.brand]) byBrand[p.brand] = [];
  byBrand[p.brand].push(p);
}
for (const [brand, ps] of Object.entries(byBrand)) {
  console.log(`\n=== ${brand} (${ps.length}) ===`);
  for (const p of ps) {
    const inv = p.specs?.Inverter === 'Yes' ? 'INV' : 'FIX';
    const heat = p.specs?.Heating === 'Yes' ? 'H&C' : 'Cool';
    const t3 = /t3/i.test(p.tags + p.simplified_name) ? 'T3' : '';
    const priceLbl = p.cash_floor > 0 ? p.cash_floor.toLocaleString() : 'ZERO';
    const status = p.stock_status !== 'In Stock' ? `[${p.stock_status}]` : '';
    console.log(`  [${inv}][${heat}]${t3?'['+t3+']':''} ${p.brand} ${p.model} | ${p.category} | ${priceLbl} ${status}`);
  }
}
