import { createClient } from '@supabase/supabase-js';
const sb = createClient(
  'https://fdfjavyopbrfvwtjaerw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDE3MDAsImV4cCI6MjA4ODIxNzcwMH0.fXwGFR_e3xZ4trEbkcH8UQ6_oWcIn92UUUvkGuFajto'
);
await sb.auth.signInWithPassword({ email: 'tajallisautomation@gmail.com', password: 'Hammad123!' });

// Get in-stock products that have thumbnail images, spread across key categories
const { data: all } = await sb.from('products')
  .select('id,brand,model,category,thumbnail_url,cash_floor,stock_status')
  .eq('stock_status', 'In Stock')
  .not('thumbnail_url', 'is', null)
  .neq('thumbnail_url', '')
  .order('cash_floor', { ascending: false });

console.log(`Products with thumbnails: ${all.length}`);

// Pick best representative products: 2 ACs, 2 fridges, 1 washing, 1 TV, 1 solar, 1 freezer
// Strategy: highest-priced per category with thumbnails (flagship products)
const picks = [];
const categories = [
  { match: /1\.5 Ton|2 Ton/, label: 'AC 1.5-2T', count: 3 },
  { match: /1 Ton Air/,       label: 'AC 1T',     count: 1 },
  { match: /Large Refrig/,    label: 'Fridge',    count: 2 },
  { match: /Washing/,         label: 'Washing',   count: 1 },
  { match: /Television/,      label: 'TV',        count: 1 },
  { match: /Solar/,           label: 'Solar',     count: 1 },
  { match: /Freezer/,         label: 'Freezer',   count: 1 },
  { match: /Microwave/,       label: 'Microwave', count: 1 },
];

for (const { match, label, count } of categories) {
  const found = all.filter(p => match.test(p.category))
    .sort((a, b) => b.cash_floor - a.cash_floor)
    .slice(0, count);
  console.log(`  ${label}: picked ${found.map(p => p.brand + ' ' + p.model).join(', ')}`);
  picks.push(...found);
}

const ids = [...new Set(picks.map(p => p.id))];
console.log(`\nMarking ${ids.length} products as featured...`);

const { error } = await sb.from('products').update({ featured: true }).in('id', ids);
if (error) console.error('Error:', error);
else console.log(`✓ ${ids.length} products marked as featured`);
