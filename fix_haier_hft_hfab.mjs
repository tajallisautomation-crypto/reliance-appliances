import { createClient } from '@supabase/supabase-js';
const sb = createClient('https://fdfjavyopbrfvwtjaerw.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDE3MDAsImV4cCI6MjA4ODIxNzcwMH0.fXwGFR_e3xZ4trEbkcH8UQ6_oWcIn92UUUvkGuFajto');
await sb.auth.signInWithPassword({ email: 'tajallisautomation@gmail.com', password: 'Hammad123!' });

// All Haier HFT and HFAB series: Inverter + H&C + T3
const {data} = await sb.from('products').select('id,model,specs,tags,simplified_name')
  .eq('brand','Haier')
  .ilike('category','%air condition%');

let updated = 0;
for (const p of data) {
  const model = p.model || '';
  const isHFT  = /HFT/.test(model);
  const isHFAB = /HFAB/.test(model);
  if (!isHFT && !isHFAB) continue;

  const alreadyHC  = String(p.specs?.Heating||'').startsWith('Yes');
  const alreadyInv = p.specs?.Inverter === 'Yes';
  const alreadyT3  = /t3/i.test(p.tags||'');
  
  const newSpecs = { ...(p.specs||{}), 
    Inverter: 'Yes', 
    Heating: 'Yes — Heat & Cool (works in winter)',
    'T3 Rated': 'Yes — Operates in extreme heat (55°C outdoor)',
  };
  
  let newTags = p.tags || '';
  if (!alreadyT3) newTags += ', t3, heat and cool, heat pump, inverter heat cool';
  
  const {error} = await sb.from('products').update({ specs: newSpecs, tags: newTags }).eq('id', p.id);
  if (error) { console.error(`ERR ${p.model}:`, error.message); }
  else {
    updated++;
    const changes = [];
    if (!alreadyInv) changes.push('Inv');
    if (!alreadyHC) changes.push('H&C');
    if (!alreadyT3) changes.push('T3');
    console.log(`✓ ${p.model}${changes.length ? ' [added: '+changes.join(',')+']' : ' [already set]'}`);
  }
}
console.log(`\n${updated} HFT/HFAB models updated`);
