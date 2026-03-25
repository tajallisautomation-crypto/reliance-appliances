// fix_microwave_remaining.mjs — fix 4 remaining microwaves with spacing issues in model names

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fdfjavyopbrfvwtjaerw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDE3MDAsImV4cCI6MjA4ODIxNzcwMH0.fXwGFR_e3xZ4trEbkcH8UQ6_oWcIn92UUUvkGuFajto';
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const FIXES = [
  { model: 'DW 220 S',           cap: '20L' },
  { model: 'DWMO 4520 CR',       cap: '45L' },
  { model: 'DWMO 5222 CR',       cap: '52L' },
  { model: 'DW - 393 G Dawlance',cap: '33L' },
];

async function main() {
  await sb.auth.signInWithPassword({ email: 'tajallisautomation@gmail.com', password: 'Hammad123!' });

  for (const fix of FIXES) {
    const { data, error } = await sb.from('products').select('id, specs').eq('model', fix.model).single();
    if (error || !data) { console.log(`⚠ Not found: ${fix.model}`); continue; }
    const newSpecs = { ...(data.specs || {}), Capacity: fix.cap };
    const { error: ue } = await sb.from('products').update({ specs: newSpecs }).eq('id', data.id);
    if (ue) console.error(`✗ ${fix.model}: ${ue.message}`);
    else console.log(`✓ ${fix.model} → ${fix.cap}`);
  }
  console.log('Done.');
}

main().catch(console.error);
