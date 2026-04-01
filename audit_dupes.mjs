import { createClient } from '@supabase/supabase-js';
const sb = createClient(
  'https://fdfjavyopbrfvwtjaerw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDE3MDAsImV4cCI6MjA4ODIxNzcwMH0.fXwGFR_e3xZ4trEbkcH8UQ6_oWcIn92UUUvkGuFajto'
);
await sb.auth.signInWithPassword({ email: 'tajallisautomation@gmail.com', password: 'Hammad123!' });

const { data, error } = await sb.from('products')
  .select('id,brand,model,category,slug,stock_status,featured')
  .order('brand').order('model');

if (error) { console.error(error); process.exit(1); }

// Find exact model duplicates (same brand + model)
const seen = new Map();
const dupes = [];
for (const p of data) {
  const key = `${(p.brand||'').toLowerCase()}|${(p.model||'').toLowerCase().trim()}`;
  if (seen.has(key)) { dupes.push({ dup: p, orig: seen.get(key) }); }
  else seen.set(key, p);
}

console.log(`Total products: ${data.length}`);
console.log(`Duplicate models: ${dupes.length}`);
if (dupes.length) {
  console.log('\nDUPLICATES (id to delete | brand model):');
  dupes.forEach(d => console.log(`  DEL [${d.dup.id}] ${d.dup.brand} ${d.dup.model}  vs KEEP [${d.orig.id}]`));
}

// Brands
const brands = [...new Set(data.map(p=>p.brand))].sort();
console.log('\nAll brands:', brands.join(', '));

// Category counts
console.log('\nCategory counts:');
const cats = {};
data.forEach(p => { cats[p.category||'null'] = (cats[p.category||'null']||0)+1; });
Object.entries(cats).sort((a,b)=>b[1]-a[1]).forEach(([c,n])=>console.log(`  ${String(n).padStart(3)}  ${c}`));
