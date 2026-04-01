import { createClient } from '@supabase/supabase-js';
const sb = createClient(
  'https://fdfjavyopbrfvwtjaerw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDE3MDAsImV4cCI6MjA4ODIxNzcwMH0.fXwGFR_e3xZ4trEbkcH8UQ6_oWcIn92UUUvkGuFajto'
);
await sb.auth.signInWithPassword({ email: 'tajallisautomation@gmail.com', password: 'Hammad123!' });

// ── Helper: update a product's specs field (merges into existing JSON) ────────
async function fixSpecs(id, updates) {
  const { data: cur } = await sb.from('products').select('specs,simplified_name,tags').eq('id', id).single();
  if (!cur) { console.warn('  NOT FOUND:', id); return; }
  const newSpecs = { ...(cur.specs || {}), ...updates };

  // Also update simplified_name and tags to include "heat" so frontend filter works
  let sn = cur.simplified_name || '';
  let tags = cur.tags || '';
  if (updates.Heating?.startsWith('Yes')) {
    if (!/heat/i.test(sn)) sn = sn.replace(/air conditioner/i, 'Heat & Cool Air Conditioner').replace(/\bAC\b/, 'Heat & Cool AC');
    if (!/heat/i.test(tags)) tags = tags + (tags ? ', ' : '') + 'heat and cool, heating';
  }

  const { error } = await sb.from('products').update({ specs: newSpecs, simplified_name: sn, tags }).eq('id', id);
  if (error) console.error('  ERR', id, error.message);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. DAWLANCE — Heat & Cool Inverter models
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('\n── Dawlance H&C Inverter fixes ──');

const dawlanceHC = [
  // Mega T+ / Mega T3 / Mega T-Pro
  'dawlance-mega-t-15-dawlance', 'dawlance-mega-t-30-dawlance',
  'dawlance-mega-t3-inverter-30',
  'dawlance-mega-t3-pro-inverter-15', 'dawlance-mega-t3-pro-inverter-30',
  'dawlance-mega-t-pro-15-dawlance', 'dawlance-mega-t-pro-30-dawlance',
  // Elegance
  'dawlance-elegance-inverter-15-whit', 'dawlance-elegance-inverter-30',
  'dawlance-elegance-pro-inverter-15', 'dawlance-elegance-pro-inverter-30',
  'dawlance-elegance-x-inverter-15', 'dawlance-elegance-x-inverter-30',
  'dawlance-split-elegance-pro-inverter-15', 'dawlance-split-elegance-pro-inverter-30',
  'dawlance-split-elegance-x-inverter-15', 'dawlance-split-elegance-x-inverter-30',
  // Econo+ X
  'dawlance-econo-x-inverter-15', 'dawlance-econo-x-inverter-30',
  'dawlance-split-econo-x-inverter-15', 'dawlance-split-econo-x-inverter-30',
  // Aura X
  'dawlance-aura-x-inverter-15', 'dawlance-aura-x-inverter-30',
  'dawlance-split-aura-x-inverter-15', 'dawlance-split-aura-x-inverter-30',
  // Cruise Plus
  'dawlance-cruise-plus-inverter-15', 'dawlance-cruise-plus-inverter-30',
  'dawlance-cruise-plus-invertor-15', 'dawlance-cruise-plus-invertor-30',
  // Sprinter X / T3
  'dawlance-sprinter-x-15', 'dawlance-sprinter-x-15-t3',
  'dawlance-sprinter-x-inverter-15', 'dawlance-sprinter-x-inverter-30',
  'dawlance-sprinter-t3-inverter-15', 'dawlance-sprinter-t3-inverter-30',
  'dawlance-split-ac-sprinter-x-inverter-30-t3',
  // Mega Flex
  'dawlance-mega-flex-inverter-15', 'dawlance-mega-flex-inverter-15-dawlance',
  'dawlance-mega-flex-inverter-30', 'dawlance-mega-flex-inverter-30-dawlance',
  // Chillex
  'dawlance-chillex-inverter-15', 'dawlance-chillex-inverter-30',
  // PowerCon X / T3
  'dawlance-powercon-x-15', 'dawlance-powercon-x-15-t3',
  'dawlance-powercon-x-inverter-15', 'dawlance-powercon-x-inverter-30',
  'dawlance-powercon-x-inverter-30-t3-dawlance',
  'dawlance-powercon-t3-inverter-15', 'dawlance-powercon-t3-inverter-30',
  'dawlance-split-ac-powercon-series-30',
];

for (const id of dawlanceHC) {
  await fixSpecs(id, {
    Heating: 'Yes — Heat & Cool (works in winter)',
    Inverter: 'Yes',
  });
  process.stdout.write('.');
}
console.log(` (${dawlanceHC.length} updated)`);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. DAWLANCE — Frost series = Cool Only Inverter
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('\n── Dawlance Frost (Cool Only Inverter) ──');
const { data: frostModels } = await sb.from('products')
  .select('id').eq('brand', 'Dawlance').ilike('model', '%frost%');
for (const p of (frostModels || [])) {
  await fixSpecs(p.id, { Heating: 'No (cooling only)', Inverter: 'Yes' });
  process.stdout.write('.');
}
console.log(` (${frostModels?.length || 0} updated)`);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. HAIER — Non-CF models should be Inverter: Yes
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('\n── Haier non-CF → Inverter: Yes ──');
// HFC / HFAB are H&C Inverters (confirmed by user for HSU-13HFC, HSU-13HFAB)
const haierHCInv = [
  'haier-hsu-13hfc', 'haier-hsu-13hfab',
  'haier-hsu-19hfc', 'haier-hsu-19hfab',
  'haier-hsu-24hfc', 'haier-hsu-24hfab',
];
for (const id of haierHCInv) {
  await fixSpecs(id, { Inverter: 'Yes', Heating: 'Yes — Heat & Cool (works in winter)' });
  process.stdout.write('.');
}
console.log(` HC+Inv`);

// HFS series = Cool Only Inverter (non-CF, non-HC)
const haierCoolInv = [
  'haier-hsu-13hfs', 'haier-hsu-13hfs-g-s', 'haier-hsu-13hfs-w',
  'haier-hsu-13hfp',
  'haier-hsu-19hfs', 'haier-hsu-19hfs-g-s', 'haier-hsu-19hfs-w', 'haier-hsu-19hfsw',
  'haier-hsu-19hfp',
  'haier-hsu-24cfcm', // NOT CF despite name? Actually HSU-24CFCM has CF — keep as non-inverter
];
// Only fix the ones that are truly non-CF inverters:
const haierNonCFInv = [
  'haier-hsu-13hfs', 'haier-hsu-13hfs-g-s', 'haier-hsu-13hfs-w', 'haier-hsu-13hfp',
  'haier-hsu-19hfs', 'haier-hsu-19hfs-g-s', 'haier-hsu-19hfs-w', 'haier-hsu-19hfsw', 'haier-hsu-19hfp',
];
for (const id of haierNonCFInv) {
  await fixSpecs(id, { Inverter: 'Yes' });
  process.stdout.write('.');
}
console.log(` Cool Inv`);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4. CROWN — Fix generic model names for Solar Battery entries
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('\n── Crown Solar model name fixes ──');
const crownFixes = [
  { id: 'elektra-boost-solar-inverter',     model: 'Elektra Boost 2.4KW',       simplified_name: 'Crown Elektra Boost 2.4KW Solar Battery' },
  { id: 'elektra-boost-lite-solar-inverter',model: 'Elektra Boost Lite 5.12KW', simplified_name: 'Crown Elektra Boost Lite 5.12KW Solar Battery' },
  { id: 'elektra-boost-pro-solar-inverter', model: 'Elektra Boost Pro 5.12KW',  simplified_name: 'Crown Elektra Boost Pro 5.12KW Solar Battery' },
];
for (const { id, model, simplified_name } of crownFixes) {
  const { error } = await sb.from('products').update({ model, simplified_name }).eq('id', id);
  console.log(`  ${model}:`, error?.message || 'OK');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 5. Verify Dawlance H&C count
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('\n── Verification ──');
const { data: dCheck } = await sb.from('products')
  .select('id,model,specs')
  .eq('brand', 'Dawlance')
  .ilike('category', '%ton%');
const dHC   = dCheck.filter(p => p.specs?.Heating?.startsWith('Yes'));
const dInv  = dCheck.filter(p => p.specs?.Inverter === 'Yes');
const dFrost = dCheck.filter(p => /frost/i.test(p.model));
console.log(`Dawlance ACs: ${dCheck.length} total | ${dInv.length} inverter | ${dHC.length} H&C | ${dFrost.length} Frost`);

const { data: hCheck } = await sb.from('products')
  .select('id,model,specs')
  .eq('brand', 'Haier')
  .ilike('category', '%ton%');
const hInv = hCheck.filter(p => p.specs?.Inverter === 'Yes');
const hHC  = hCheck.filter(p => p.specs?.Heating?.startsWith('Yes'));
const hCF  = hCheck.filter(p => /\bCF\b/.test(p.model));
console.log(`Haier ACs: ${hCheck.length} total | ${hInv.length} inverter | ${hHC.length} H&C | ${hCF.length} CF (fixed speed)`);
