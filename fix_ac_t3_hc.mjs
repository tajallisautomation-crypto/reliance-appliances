import { createClient } from '@supabase/supabase-js';
const sb = createClient('https://fdfjavyopbrfvwtjaerw.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDE3MDAsImV4cCI6MjA4ODIxNzcwMH0.fXwGFR_e3xZ4trEbkcH8UQ6_oWcIn92UUUvkGuFajto');
await sb.auth.signInWithPassword({ email: 'tajallisautomation@gmail.com', password: 'Hammad123!' });

const {data} = await sb.from('products').select('id,brand,model,specs,tags,simplified_name').ilike('category','%air condition%');

const HC_SPEC = 'Yes — Heat & Cool (works in winter)';
const HC_TAG_ADD = ', heat and cool, heat pump, inverter heat cool';

let updated = 0;
const issues = [];

for (const p of data) {
  const model = p.model || '';
  const isT3 = /\bT3\b/i.test(model);
  const isHFC_HFAB = /\b(HFC|HFAB)\b/.test(model) && p.brand === 'Haier';
  const alreadyHC = String(p.specs?.Heating || '').startsWith('Yes');
  const alreadyInv = p.specs?.Inverter === 'Yes';
  
  let needsHC = false;
  let needsInv = false;
  
  if (isT3 && !alreadyHC) { needsHC = true; }
  if (isT3 && !alreadyInv) { needsInv = true; }
  if (isHFC_HFAB && !alreadyHC) { needsHC = true; }
  
  if (!needsHC && !needsInv) continue;
  
  const newSpecs = { ...(p.specs || {}) };
  if (needsHC) newSpecs['Heating'] = HC_SPEC;
  if (needsInv) newSpecs['Inverter'] = 'Yes';
  
  const tagsHasHeat = /heat/i.test(p.tags || '');
  const newTags = tagsHasHeat ? p.tags : (p.tags || '') + HC_TAG_ADD;
  
  const newName = p.simplified_name && !/heat/i.test(p.simplified_name)
    ? p.simplified_name.replace(/(inverter)?/i, 'Heat & Cool Inverter')
    : p.simplified_name;
  
  const { error } = await sb.from('products').update({
    specs: newSpecs,
    tags: newTags,
  }).eq('id', p.id);
  
  if (error) {
    console.error(`ERR ${p.brand} ${p.model}:`, error.message);
  } else {
    updated++;
    issues.push(`${needsInv ? '🔧INV ' : ''}${needsHC ? '🌡️HC ' : ''}${p.brand} ${p.model}`);
  }
}

console.log(`✓ ${updated} ACs updated\n`);
issues.forEach(i => console.log(' ', i));

// Verify
const {data: after} = await sb.from('products').select('id,brand,model,specs').ilike('category','%air condition%').ilike('model','%T3%');
const t3hc = after.filter(p => String(p.specs?.Heating||'').startsWith('Yes'));
const t3inv = after.filter(p => p.specs?.Inverter === 'Yes');
console.log(`\nT3 ACs: ${after.length} total | ${t3hc.length} H&C | ${t3inv.length} inverter`);
