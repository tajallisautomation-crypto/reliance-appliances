import { createClient } from '@supabase/supabase-js';
const sb = createClient(
  'https://fdfjavyopbrfvwtjaerw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDE3MDAsImV4cCI6MjA4ODIxNzcwMH0.fXwGFR_e3xZ4trEbkcH8UQ6_oWcIn92UUUvkGuFajto'
);
await sb.auth.signInWithPassword({ email: 'tajallisautomation@gmail.com', password: 'Hammad123!' });

// ─── Classification rules ───────────────────────────────────────────────────
// Returns the correct category + heating technology type for a microwave
function classify(id, model, specs) {
  const m = (model || '').toUpperCase();
  const existingType = (specs?.['Heating Technology'] || specs?.Type || '').toLowerCase();

  // Air Fryer
  if (/\bAF\b/.test(m) || /air.?fry/i.test(existingType)) {
    return { cat: 'Convection & Air Fryer Ovens', tech: 'Microwave + Convection + Air Fryer', tag: 'convection, air fryer, airfryer' };
  }
  // Convection Rotisserie (DWMO CR, MINI OVEN, large HZP/HCG models)
  if (/DWMO|MINI OVEN|CHZP|HZP|HCG|\bCR\b|\bHP\b/.test(m)) {
    return { cat: 'Convection & Air Fryer Ovens', tech: 'Microwave + Convection + Rotisserie', tag: 'convection, rotisserie, large oven' };
  }
  // Inverter (premium)
  if (/INVERTER|INV/.test(m) && !existingType.includes('grill')) {
    return { cat: 'Convection & Air Fryer Ovens', tech: 'Microwave + Convection (Inverter)', tag: 'convection, inverter microwave' };
  }
  // Grill models — "G" suffix, "GSS", "RG"
  if (/\bG\b|\bGSS\b|\bRG\b/.test(m) || existingType.includes('grill')) {
    // Check it's actually grill not just "G" somewhere random
    if (/\bG\b|\bGSS\b|\bRG\b/.test(m)) {
      return { cat: 'Grill Microwave Ovens', tech: 'Microwave + Grill', tag: 'grill microwave, grill combo' };
    }
  }
  // Explicit Solo
  if (/SOLO|\bMD-?[0-9]|\bMD\s|\bDW.?21[0-9]\s*S\b/.test(m)) {
    return { cat: 'Solo Microwave Ovens', tech: 'Solo Microwave (No Grill)', tag: 'solo microwave, basic microwave' };
  }
  // DW-374 and DW-297 GSS are grill models
  if (/374|297/.test(m)) {
    return { cat: 'Grill Microwave Ovens', tech: 'Microwave + Grill', tag: 'grill microwave' };
  }
  // Westpoint models — classify by model number
  if (/^(82[0-9]|83[0-9]|85[0-9])$/.test(m.trim())) {
    return { cat: 'Grill Microwave Ovens', tech: 'Microwave + Grill', tag: 'grill microwave' };
  }
  // DW-132 S Digital Solo
  if (/132.*SOLO|132.*S.*DIGITAL|132.*DIGITAL.*SOLO/i.test(m)) {
    return { cat: 'Solo Microwave Ovens', tech: 'Solo Microwave (No Grill)', tag: 'solo microwave' };
  }
  // Remaining small DW models (DW-295, DW-388, DW-390 S, DW 220 S, DW-210) → Solo
  if (/^DW[- ]?(2[0-9]{2}|3[0-9]{2}|388|390)/.test(m) && !/\bG\b|\bGSS\b|\bRG\b|AF|CHZP|HZP|HCG|HP/.test(m)) {
    return { cat: 'Solo Microwave Ovens', tech: 'Solo Microwave (No Grill)', tag: 'solo microwave' };
  }
  // Default fallback → Grill (most combo microwaves)
  return { cat: 'Grill Microwave Ovens', tech: 'Microwave + Grill', tag: 'grill microwave' };
}

// Specific overrides for models that need manual correction
const overrides = {
  'dawlance-dw-132-s-digital-solo':    { cat: 'Solo Microwave Ovens',           tech: 'Solo Microwave (No Grill)',           tag: 'solo microwave, digital display' },
  'dawlance-dw-210-s-pro':             { cat: 'Solo Microwave Ovens',           tech: 'Solo Microwave (No Grill)',           tag: 'solo microwave' },
  'dawlance-dw-210-solo-white':        { cat: 'Solo Microwave Ovens',           tech: 'Solo Microwave (No Grill)',           tag: 'solo microwave' },
  'dawlance-dw-295':                   { cat: 'Solo Microwave Ovens',           tech: 'Solo Microwave (No Grill)',           tag: 'solo microwave' },
  'dawlance-dw-388':                   { cat: 'Solo Microwave Ovens',           tech: 'Solo Microwave (No Grill)',           tag: 'solo microwave' },
  'dawlance-dw-390-s-dawlance':        { cat: 'Solo Microwave Ovens',           tech: 'Solo Microwave (No Grill)',           tag: 'solo microwave' },
  'dawlance-dw-220-s':                 { cat: 'Solo Microwave Ovens',           tech: 'Solo Microwave (No Grill)',           tag: 'solo microwave' },
  'dawlance-dw-115-chzp':              { cat: 'Convection & Air Fryer Ovens',   tech: 'Microwave + Convection + Hot Plate',  tag: 'convection microwave, hot plate' },
  'dawlance-dw-131-hp':                { cat: 'Convection & Air Fryer Ovens',   tech: 'Microwave + Convection + Hot Plate',  tag: 'convection microwave, hot plate' },
  'dawlance-dw-142hzp':                { cat: 'Convection & Air Fryer Ovens',   tech: 'Microwave + Convection',             tag: 'convection microwave, large capacity' },
  'dawlance-dw-162hzp':                { cat: 'Convection & Air Fryer Ovens',   tech: 'Microwave + Convection',             tag: 'convection microwave, extra large, commercial' },
  'dawlance-dw-395-hcg':               { cat: 'Convection & Air Fryer Ovens',   tech: 'Microwave + Convection + Grill',     tag: 'convection, hot plate, grill, combo' },
  'dawlance-dw-560-inverter':          { cat: 'Convection & Air Fryer Ovens',   tech: 'Microwave + Convection (Inverter)',   tag: 'convection, inverter, premium microwave' },
  'dawlance-dw-530-af':                { cat: 'Convection & Air Fryer Ovens',   tech: 'Microwave + Convection + Air Fryer',  tag: 'air fryer, convection, airfryer microwave' },
  'dawlance-dw-550-af':                { cat: 'Convection & Air Fryer Ovens',   tech: 'Microwave + Convection + Air Fryer',  tag: 'air fryer, convection, airfryer microwave' },
  'dawlance-dwmo-4215-cr':             { cat: 'Convection & Air Fryer Ovens',   tech: 'Convection Rotisserie Oven',          tag: 'convection oven, rotisserie, large oven' },
  'dawlance-dwmo-4520-cr':             { cat: 'Convection & Air Fryer Ovens',   tech: 'Convection Rotisserie Oven',          tag: 'convection oven, rotisserie, large oven' },
  'dawlance-dwmo-5222-cr':             { cat: 'Convection & Air Fryer Ovens',   tech: 'Convection Rotisserie Oven',          tag: 'convection oven, rotisserie, large oven' },
  'dawlance-mini-oven-dwmo-2113-c':    { cat: 'Convection & Air Fryer Ovens',   tech: 'Convection Mini Oven',               tag: 'convection oven, mini oven, small oven' },
  // Westpoint 7500 — likely large oven, not a standard microwave
  'westpoint-7500':                    { cat: 'Convection & Air Fryer Ovens',   tech: 'Convection Rotisserie Oven',          tag: 'convection oven, rotisserie, large oven, westpoint' },
  'westpoint-851':                     { cat: 'Convection & Air Fryer Ovens',   tech: 'Microwave + Convection',             tag: 'convection microwave, westpoint' },
};

// ─── Fetch and update ────────────────────────────────────────────────────────
const { data: mwos } = await sb.from('products')
  .select('id,brand,model,category,specs,simplified_name,tags')
  .ilike('category', '%microwave%');

const results = { solo: [], grill: [], convection: [], unknown: [] };
let updated = 0;

for (const p of mwos) {
  const override = overrides[p.id];
  const { cat, tech, tag } = override || classify(p.id, p.model, p.specs);

  const newSpecs = {
    ...(p.specs || {}),
    'Heating Technology': tech,
    Type: cat === 'Solo Microwave Ovens' ? 'Solo Microwave Oven'
        : cat === 'Grill Microwave Ovens' ? 'Grill Microwave Oven'
        : 'Convection / Air Fryer Oven',
  };

  const { error } = await sb.from('products').update({
    category: cat,
    specs: newSpecs,
    tags: tag + (p.tags ? ', ' + p.tags : ''),
  }).eq('id', p.id);

  if (error) { console.error(`ERR ${p.id}:`, error.message); }
  else {
    updated++;
    if (cat === 'Solo Microwave Ovens') results.solo.push(p.model);
    else if (cat === 'Grill Microwave Ovens') results.grill.push(p.model);
    else results.convection.push(p.model);
  }
}

console.log(`✓ ${updated} microwaves updated\n`);
console.log(`Solo (${results.solo.length}): ${results.solo.join(', ')}`);
console.log(`\nGrill (${results.grill.length}): ${results.grill.join(', ')}`);
console.log(`\nConvection/AF (${results.convection.length}): ${results.convection.join(', ')}`);

// Verify
const { data: after } = await sb.from('products').select('id,brand,model,category,specs').ilike('category', '%microwave%').ilike('category', 'Solo%');
const {data:after2} = await sb.from('products').select('id').ilike('category', 'Grill%').ilike('category', '%microwave%');
const {data:after3} = await sb.from('products').select('id').ilike('category', 'Convection%');
console.log(`\nVerification — Solo: ${after?.length || '?'}, Grill: ${after2?.length || '?'}, Convection: ${after3?.length || '?'}`);
