import { createClient } from '@supabase/supabase-js';
const sb = createClient('https://fdfjavyopbrfvwtjaerw.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDE3MDAsImV4cCI6MjA4ODIxNzcwMH0.fXwGFR_e3xZ4trEbkcH8UQ6_oWcIn92UUUvkGuFajto');
await sb.auth.signInWithPassword({ email: 'tajallisautomation@gmail.com', password: 'Hammad123!' });

const {data} = await sb.from('products').select('id,model,specs,tags')
  .eq('brand','Haier').ilike('category','%air condition%');

let updated = 0;
for (const p of data) {
  const m = p.model || '';
  // HFS (and variants /W, /G/S, W standalone), HFP — all H&C Inverter
  // LF series → already Cool Only Inverter (correct, skip)
  // CF series → Fixed Speed Cool Only (correct, skip)
  // HFAB/HFT → already fixed
  const isHFS  = /HFS/.test(m);
  const isHFP  = /HFP/.test(m);
  if (!isHFS && !isHFP) continue;

  const alreadyHC = String(p.specs?.Heating||'').startsWith('Yes');
  if (alreadyHC) { console.log(`  already H&C: ${m}`); continue; }

  const newSpecs = { ...(p.specs||{}), Heating: 'Yes — Heat & Cool (works in winter)' };
  let newTags = p.tags || '';
  if (!/heat/i.test(newTags)) newTags += ', heat and cool, heat pump, inverter heat cool';

  const {error} = await sb.from('products').update({ specs: newSpecs, tags: newTags }).eq('id', p.id);
  if (error) console.error(`ERR ${m}:`, error.message);
  else { updated++; console.log(`✓ ${m}`); }
}
console.log(`\n${updated} HFS/HFP models → H&C`);
