import { createClient } from '@supabase/supabase-js';
const sb = createClient(
  'https://fdfjavyopbrfvwtjaerw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDE3MDAsImV4cCI6MjA4ODIxNzcwMH0.fXwGFR_e3xZ4trEbkcH8UQ6_oWcIn92UUUvkGuFajto'
);
await sb.auth.signInWithPassword({ email: 'tajallisautomation@gmail.com', password: 'Hammad123!' });

// ── 1. Fix Crown products that belong to other brands ──────────────────────
// Elektra Boost Lite → Solar Battery
const r1 = await sb.from('products')
  .update({ brand: 'Elektra Boost Lite', category: 'Solar Battery' })
  .in('id', ['crown-elektra-boost-lite-5-12kw']);
console.log('Elektra Boost Lite fix:', r1.error || 'OK');

// Elektra Boost Pro → Solar Battery
const r2 = await sb.from('products')
  .update({ brand: 'Elektra Boost Pro', category: 'Solar Battery' })
  .in('id', ['crown-elektra-boost-pro-2-4kw', 'crown-elektra-boost-pro-5-12kw']);
console.log('Elektra Boost Pro fix:', r2.error || 'OK');

// Crown Nexus → Nexus (Inverter)
const r3 = await sb.from('products')
  .update({ brand: 'Nexus', category: 'Solar Inverter' })
  .in('id', ['crown-nexus-12kw', 'crown-nexus-6kw', 'crown-nexus-8kw']);
console.log('Nexus fix:', r3.error || 'OK');

// Crown Pridor → Pridor (Solar Water Pump)
const r4 = await sb.from('products')
  .update({ brand: 'Pridor', category: 'Solar Water Pump' })
  .in('id', [
    'crown-pridor-5-5kw', 'crown-pridor-7-11kw', 'crown-pridor-11-15kw',
    'crown-pridor-15-18kw', 'crown-pridor-18-22kw', 'crown-pridor-22-30kw',
    'crown-pridor-30-37kw'
  ]);
console.log('Pridor fix:', r4.error || 'OK');

// Crown Yorker → Yorker (Inverter)
const r5 = await sb.from('products')
  .update({ brand: 'Yorker', category: 'Solar Inverter' })
  .in('id', ['crown-yorker-3-6kw', 'crown-yorker-5kw', 'crown-yorker-6kw']);
console.log('Yorker fix:', r5.error || 'OK');

// ── 2. Fix standalone Elektra Boost* categories ────────────────────────────
const r6 = await sb.from('products')
  .update({ category: 'Solar Battery' })
  .in('id', [
    'elektra-boost-solar-inverter',
    'elektra-boost-lite-solar-inverter',
    'elektra-boost-pro-solar-inverter'
  ]);
console.log('Standalone Elektra Boost* category fix:', r6.error || 'OK');

// ── 3. Fix standalone Nexus and Yorker categories ─────────────────────────
const r7 = await sb.from('products')
  .update({ category: 'Solar Inverter' })
  .in('id', ['nexus-solar-inverter', 'yorker-solar-inverter']);
console.log('Standalone Nexus/Yorker category fix:', r7.error || 'OK');

// ── 4. Fix standalone Pridor category ─────────────────────────────────────
const r8 = await sb.from('products')
  .update({ brand: 'Pridor', category: 'Solar Water Pump' })
  .eq('id', 'pridor-solar-pump-inverter-vfd');
console.log('Standalone Pridor category fix:', r8.error || 'OK');

// ── 5. Verify result ───────────────────────────────────────────────────────
console.log('\n── Verification ──');
const { data } = await sb.from('products')
  .select('id,brand,model,category,cash_floor')
  .in('brand', ['Crown', 'Elektra Boost', 'Elektra Boost Lite', 'Elektra Boost Pro', 'Nexus', 'Yorker', 'Pridor'])
  .order('brand').order('model');

const byBrand = {};
for (const p of data) {
  if (!byBrand[p.brand]) byBrand[p.brand] = [];
  byBrand[p.brand].push(p);
}
for (const [brand, products] of Object.entries(byBrand)) {
  console.log(`\n${brand} (${products.length}):`);
  products.forEach(p => console.log(`  [${p.id}] ${p.model} | ${p.category} | cash: ${p.cash_floor?.toLocaleString()}`));
}
