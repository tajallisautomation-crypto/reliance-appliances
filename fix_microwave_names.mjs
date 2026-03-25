// fix_microwave_names.mjs
// Updates simplified_name for microwaves to include liter size if missing
// Pattern: "Dawlance 25L Microwave Oven DW-295" (mirrors washing machine naming)

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fdfjavyopbrfvwtjaerw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDE3MDAsImV4cCI6MjA4ODIxNzcwMH0.fXwGFR_e3xZ4trEbkcH8UQ6_oWcIn92UUUvkGuFajto';
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

function buildName(brand, model, currentName, capacity, subType) {
  // If name already has a liter value, keep it as is
  if (/\d{2,3}\s*L\b/i.test(currentName)) return null; // already has it

  // Determine sub-type label from current name / model
  let typeLabel = 'Microwave Oven';
  if (/grill|combo/i.test(currentName + ' ' + model)) typeLabel = 'Grill Microwave Oven';
  else if (/solo/i.test(currentName + ' ' + model)) typeLabel = 'Solo Microwave Oven';
  else if (/inverter/i.test(currentName + ' ' + model)) typeLabel = 'Inverter Microwave Oven';
  else if (/air\s*fry|af\b/i.test(currentName + ' ' + model)) typeLabel = 'Air Fryer Microwave Oven';
  else if (/mini\s*oven|oven/i.test(currentName + ' ' + model) && !/microwave/i.test(currentName)) typeLabel = 'Mini Oven';

  // Normalize model display (Westpoint models are stored as just the number e.g. "853")
  const displayModel = brand.toLowerCase() === 'westpoint' && /^\d{3,4}$/.test(model.trim())
    ? `WF-${model.trim()}`
    : model.trim();

  return `${brand} ${capacity} ${typeLabel} ${displayModel}`.replace(/\s+/g, ' ').trim();
}

async function main() {
  await sb.auth.signInWithPassword({ email: 'tajallisautomation@gmail.com', password: 'Hammad123!' });

  const { data: rows, error } = await sb
    .from('products')
    .select('id, brand, model, simplified_name, category, sub_category, specs')
    .ilike('category', '%microwave%');

  if (error) { console.error(error); process.exit(1); }
  console.log(`Found ${rows.length} microwave products\n`);

  let updated = 0, skipped = 0;

  for (const row of rows) {
    const cap = row.specs?.['Capacity'];
    if (!cap) { console.log(`  ⚠ ${row.brand} ${row.model} — no capacity, skip`); skipped++; continue; }

    const newName = buildName(row.brand, row.model, row.simplified_name, cap, row.sub_category);
    if (!newName) {
      console.log(`  → ${row.simplified_name} — already has size`);
      skipped++;
      continue;
    }

    const { error: ue } = await sb.from('products').update({ simplified_name: newName }).eq('id', row.id);
    if (ue) { console.error(`  ✗ ${row.model}: ${ue.message}`); }
    else { console.log(`  ✓ "${row.simplified_name}" → "${newName}"`); updated++; }
  }

  console.log(`\nDone. Updated: ${updated}, Skipped: ${skipped}`);
}

main().catch(console.error);
