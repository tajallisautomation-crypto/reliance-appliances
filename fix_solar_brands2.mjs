import { createClient } from '@supabase/supabase-js';
const sb = createClient(
  'https://fdfjavyopbrfvwtjaerw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDE3MDAsImV4cCI6MjA4ODIxNzcwMH0.fXwGFR_e3xZ4trEbkcH8UQ6_oWcIn92UUUvkGuFajto'
);
await sb.auth.signInWithPassword({ email: 'tajallisautomation@gmail.com', password: 'Hammad123!' });

// All these are Crown products — revert brand to Crown, fix categories only

// Elektra Boost Lite → Crown, Solar Battery
const r1 = await sb.from('products')
  .update({ brand: 'Crown', category: 'Solar Battery' })
  .in('id', [
    'crown-elektra-boost-lite-5-12kw',
    'elektra-boost-lite-solar-inverter'
  ]);
console.log('Elektra Boost Lite → Crown/Solar Battery:', r1.error || 'OK');

// Elektra Boost Pro → Crown, Solar Battery
const r2 = await sb.from('products')
  .update({ brand: 'Crown', category: 'Solar Battery' })
  .in('id', [
    'crown-elektra-boost-pro-2-4kw', 'crown-elektra-boost-pro-5-12kw',
    'elektra-boost-pro-solar-inverter'
  ]);
console.log('Elektra Boost Pro → Crown/Solar Battery:', r2.error || 'OK');

// Elektra Boost (base) → Crown, Solar Battery
const r3 = await sb.from('products')
  .update({ brand: 'Crown', category: 'Solar Battery' })
  .eq('id', 'elektra-boost-solar-inverter');
console.log('Elektra Boost → Crown/Solar Battery:', r3.error || 'OK');

// Nexus → Crown, Solar Inverter
const r4 = await sb.from('products')
  .update({ brand: 'Crown', category: 'Solar Inverter' })
  .in('id', [
    'crown-nexus-12kw', 'crown-nexus-6kw', 'crown-nexus-8kw',
    'nexus-solar-inverter'
  ]);
console.log('Nexus → Crown/Solar Inverter:', r4.error || 'OK');

// Yorker → Crown, Solar Inverter
const r5 = await sb.from('products')
  .update({ brand: 'Crown', category: 'Solar Inverter' })
  .in('id', [
    'crown-yorker-3-6kw', 'crown-yorker-5kw', 'crown-yorker-6kw',
    'yorker-solar-inverter'
  ]);
console.log('Yorker → Crown/Solar Inverter:', r5.error || 'OK');

// Pridor → Crown, Solar Water Pump
const r6 = await sb.from('products')
  .update({ brand: 'Crown', category: 'Solar Water Pump' })
  .in('id', [
    'crown-pridor-5-5kw', 'crown-pridor-7-11kw', 'crown-pridor-11-15kw',
    'crown-pridor-15-18kw', 'crown-pridor-18-22kw', 'crown-pridor-22-30kw',
    'crown-pridor-30-37kw', 'pridor-solar-pump-inverter-vfd'
  ]);
console.log('Pridor → Crown/Solar Water Pump:', r6.error || 'OK');

// ── Verify ──
console.log('\n── Verification: all Crown products ──');
const { data } = await sb.from('products')
  .select('id,brand,model,category,cash_floor')
  .eq('brand', 'Crown')
  .order('category').order('model');

const byCat = {};
for (const p of data) {
  if (!byCat[p.category]) byCat[p.category] = [];
  byCat[p.category].push(p);
}
for (const [cat, products] of Object.entries(byCat)) {
  console.log(`\n[${cat}] (${products.length}):`);
  products.forEach(p => console.log(`  ${p.model} | cash: ${p.cash_floor?.toLocaleString()}`));
}
console.log(`\nTotal Crown: ${data.length}`);
