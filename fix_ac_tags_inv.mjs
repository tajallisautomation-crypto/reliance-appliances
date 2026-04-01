import { createClient } from '@supabase/supabase-js';
const sb = createClient(
  'https://fdfjavyopbrfvwtjaerw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDE3MDAsImV4cCI6MjA4ODIxNzcwMH0.fXwGFR_e3xZ4trEbkcH8UQ6_oWcIn92UUUvkGuFajto'
);
await sb.auth.signInWithPassword({ email: 'tajallisautomation@gmail.com', password: 'Hammad123!' });

// Fetch all ACs
const { data: allACs } = await sb.from('products')
  .select('id,brand,model,specs,simplified_name,tags')
  .ilike('category', '%ton%');

let updated = 0;

for (const p of allACs) {
  const specs = p.specs || {};
  const isHC  = specs.Heating?.startsWith('Yes');
  const isInv = specs.Inverter === 'Yes';
  const name  = (p.model || '').toLowerCase();
  const sn    = p.simplified_name || '';
  const tags  = p.tags || '';

  const heatInTag = /heat/i.test(tags + ' ' + sn);
  const invInName = /inverter|invertor/i.test(p.model);

  let newSpecs = { ...specs };
  let newTags  = tags;
  let newSN    = sn;
  let changed  = false;

  // 1. "Invertor/Inverter" in model name but marked as Fixed Speed → fix to Inverter
  if (invInName && !isInv) {
    newSpecs = { ...newSpecs, Inverter: 'Yes' };
    changed = true;
  }

  // 2. H&C product missing heat in tags/simplified_name → add heat tags
  if (isHC && !heatInTag) {
    newTags = (tags ? tags + ', ' : '') + 'heat and cool, heating, heat & cool';
    // Also update simplified_name to mention H&C if it doesn't
    if (!/heat/i.test(sn)) {
      newSN = sn
        .replace(/\bair conditioner\b/i, 'Heat & Cool Air Conditioner')
        .replace(/\bsplit ac\b/i, 'Heat & Cool Split AC')
        .replace(/\bac\b(?!\s*\d)/i, 'Heat & Cool AC');
      // If no replacement happened (no matching pattern), just append
      if (newSN === sn) newSN = sn ? sn + ' Heat & Cool' : sn;
    }
    changed = true;
  }

  if (changed) {
    const { error } = await sb.from('products').update({
      specs: newSpecs,
      tags: newTags,
      simplified_name: newSN,
    }).eq('id', p.id);
    if (error) {
      console.error(`  ERR ${p.id}: ${error.message}`);
    } else {
      updated++;
      if (invInName && !(specs.Inverter === 'Yes')) {
        console.log(`  [INV fixed] ${p.brand} ${p.model}`);
      }
    }
  }
}

console.log(`\n✓ ${updated} AC products updated (Inverter flag + Heat tags)`);

// Final verification
const { data: after } = await sb.from('products')
  .select('id,brand,model,specs,tags,simplified_name')
  .ilike('category', '%ton%');

const hcNoTag = after.filter(p =>
  p.specs?.Heating?.startsWith('Yes') &&
  !/heat/i.test((p.tags||'') + (p.simplified_name||''))
);
const invNameFix = after.filter(p =>
  /inverter|invertor/i.test(p.model) && p.specs?.Inverter !== 'Yes'
);
const zeroPx = after.filter(p => !p.specs?.cash_floor && /* check via parent */ false); // prices checked separately

console.log(`\nRemaining issues:`);
console.log(`  H&C missing heat tag: ${hcNoTag.length}`);
if (hcNoTag.length > 0) hcNoTag.forEach(p => console.log(`    ${p.brand} ${p.model} (${p.id})`));
console.log(`  Inverter in name but FIX: ${invNameFix.length}`);
if (invNameFix.length > 0) invNameFix.forEach(p => console.log(`    ${p.brand} ${p.model} (${p.id})`));
