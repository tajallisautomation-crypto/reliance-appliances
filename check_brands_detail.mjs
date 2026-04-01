import { createClient } from '@supabase/supabase-js';
const sb = createClient(
  'https://fdfjavyopbrfvwtjaerw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDE3MDAsImV4cCI6MjA4ODIxNzcwMH0.fXwGFR_e3xZ4trEbkcH8UQ6_oWcIn92UUUvkGuFajto'
);
await sb.auth.signInWithPassword({ email: 'tajallisautomation@gmail.com', password: 'Hammad123!' });

const { data } = await sb.from('products')
  .select('id,brand,model,simplified_name,category,cash_floor,retail_price,stock_status')
  .order('brand').order('model');

// Samsung TVs
const samsungTVs = data.filter(p => p.brand === 'Samsung' && p.category.toLowerCase().includes('telev'));
console.log(`\n=== Samsung TVs (${samsungTVs.length}) ===`);
samsungTVs.slice(0,10).forEach(p => console.log(`  [${p.id}] ${p.model} | ${p.simplified_name?.slice(0,60)} | cash: ${p.cash_floor}`));

// Samsung WMs
const samsungWMs = data.filter(p => p.brand === 'Samsung' && /wash/i.test(p.category));
console.log(`\n=== Samsung WMs (${samsungWMs.length}) ===`);
samsungWMs.forEach(p => console.log(`  [${p.id}] ${p.model} | cash: ${p.cash_floor}`));

// All TV brands
const tvs = data.filter(p => /telev|LED|smart tv/i.test(p.category));
const tvBrands = [...new Set(tvs.map(p=>p.brand))].sort();
console.log(`\n=== All TV brands (${tvs.length} total): ${tvBrands.join(', ')} ===`);

// Gree ACs with current prices
const greeACs = data.filter(p => p.brand === 'Gree' && p.category.toLowerCase().includes('ton'));
console.log(`\n=== Gree ACs (${greeACs.length}) ===`);
greeACs.forEach(p => console.log(`  [${p.id}] ${p.model.padEnd(30)} cash: ${p.cash_floor?.toLocaleString()}`));

// EcoStar ACs
const ecostar = data.filter(p => p.brand === 'EcoStar' && p.category.toLowerCase().includes('ton'));
console.log(`\n=== EcoStar ACs (${ecostar.length}) ===`);
ecostar.forEach(p => console.log(`  [${p.id}] ${p.model.padEnd(30)} cash: ${p.cash_floor?.toLocaleString()}`));

// Dawlance ACs
const dawlanceACs = data.filter(p => p.brand === 'Dawlance' && p.category.toLowerCase().includes('ton'));
console.log(`\n=== Dawlance ACs (${dawlanceACs.length}) ===`);
dawlanceACs.forEach(p => console.log(`  [${p.id}] ${p.model.padEnd(40)} cash: ${p.cash_floor?.toLocaleString()}`));

// Haier ACs
const haierACs = data.filter(p => p.brand === 'Haier' && p.category.toLowerCase().includes('ton'));
console.log(`\n=== Haier ACs (${haierACs.length}) ===`);
haierACs.forEach(p => console.log(`  [${p.id}] ${p.model.padEnd(30)} cash: ${p.cash_floor?.toLocaleString()}`));

// Crown Solar
const crown = data.filter(p => p.brand === 'Crown');
console.log(`\n=== Crown Solar (${crown.length}) ===`);
crown.slice(0,5).forEach(p => console.log(`  [${p.id}] ${p.model} | cash: ${p.cash_floor}`));
