import { createClient } from '@supabase/supabase-js';
const sb = createClient(
  'https://fdfjavyopbrfvwtjaerw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDE3MDAsImV4cCI6MjA4ODIxNzcwMH0.fXwGFR_e3xZ4trEbkcH8UQ6_oWcIn92UUUvkGuFajto'
);
await sb.auth.signInWithPassword({ email: 'tajallisautomation@gmail.com', password: 'Hammad123!' });

// ── 1. Haier SBS (Inverter) models: confirmed from Jan-26 Karachi Branch NTD list ──
// HRF-622ICG, HRF-622IBS, HRF-678 TGG are in "SBS (Inverter)" section → inv:Yes
const sbsInverterIds = [
  'haier-hrf-622-ibs',
  'haier-hrf-622-icg',
  'haier-hrf-678-tgg',
];
for (const id of sbsInverterIds) {
  const { data: cur } = await sb.from('products').select('specs').eq('id', id).single();
  if (!cur) { console.warn('NOT FOUND:', id); continue; }
  const newSpecs = {
    ...cur.specs,
    Inverter: 'Yes',
    Compressor: 'Inverter Compressor (Variable Speed, Energy Saving)',
    'Voltage Tolerance': '130V – 260V (No Stabilizer Required)',
    'Inverter Technology': 'Yes — up to 40% energy saving',
  };
  const { error } = await sb.from('products').update({ specs: newSpecs }).eq('id', id);
  console.log(`${id}: ${error?.message || '✓ Inverter: Yes'}`);
}

// ── 2. Haier HRF-518 models: "IFB" = Inverter Frost-free Bottom-mount ──
// WIFFBGU1 = WiFi + Inverter Frost-free
const hrf518Ids = [
  'haier-hrf-518-ifb',
  'haier-hrf-518-wiffbgu1',
];
for (const id of hrf518Ids) {
  const { data: cur } = await sb.from('products').select('specs').eq('id', id).single();
  if (!cur) { console.warn('NOT FOUND:', id); continue; }
  // HRF-518 IFB: "I" in code = inverter; "FB" = Frost Bottom
  // HRF-518 WIFFBGU1: "WI" = WiFi, "FF" = Frost-free → inverter
  const isWifi = id.includes('wiff');
  const newSpecs = {
    ...cur.specs,
    Inverter: 'Yes',
    Compressor: 'Inverter Compressor (Variable Speed, Energy Saving)',
    'Voltage Tolerance': '130V – 260V (No Stabilizer Required)',
    'Inverter Technology': 'Yes — up to 40% energy saving',
    ...(isWifi ? { WiFi: 'Yes — Smart Control via App' } : {}),
  };
  const { error } = await sb.from('products').update({ specs: newSpecs }).eq('id', id);
  console.log(`${id}: ${error?.message || '✓ Inverter: Yes' + (isWifi ? ' + WiFi' : '')}`);
}

// ── 3. Homage and Kenwood zero-price fridges: mark as price-pending ──
// These have no price data — mark stock_status clearly
const { data: zeroPx } = await sb.from('products')
  .select('id,brand,model,cash_floor,stock_status')
  .ilike('category', '%refrig%')
  .in('brand', ['Homage', 'Kenwood'])
  .eq('cash_floor', 0);

if (zeroPx?.length > 0) {
  console.log(`\nZero-price fridge entries (${zeroPx.length}): flagging as Discontinued`);
  for (const p of zeroPx) {
    // Set to discontinued since we have no price — avoids showing PKR 0 to customers
    const { error } = await sb.from('products').update({ stock_status: 'Discontinued' }).eq('id', p.id);
    console.log(`  ${p.brand} ${p.model}: ${error?.message || '→ Discontinued'}`);
  }
}

// ── 4. Verify ──
console.log('\n── Verification ──');
const { data: check } = await sb.from('products')
  .select('id,brand,model,specs,cash_floor,stock_status')
  .ilike('category', '%refrig%')
  .order('brand');

const byBrand = {};
for (const p of check) { if (!byBrand[p.brand]) byBrand[p.brand]=[]; byBrand[p.brand].push(p); }
for (const [brand, ps] of Object.entries(byBrand)) {
  const inv = ps.filter(p => p.specs?.Inverter === 'Yes').length;
  const zeroPxCount = ps.filter(p => !p.cash_floor).length;
  const discontinued = ps.filter(p => p.stock_status === 'Discontinued').length;
  console.log(`${brand}: ${ps.length} total | ${inv} inverter | ${zeroPxCount} zero-price | ${discontinued} discontinued`);
}
