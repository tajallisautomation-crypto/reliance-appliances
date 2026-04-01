import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  'https://fdfjavyopbrfvwtjaerw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDE3MDAsImV4cCI6MjA4ODIxNzcwMH0.fXwGFR_e3xZ4trEbkcH8UQ6_oWcIn92UUUvkGuFajto'
);

// Efficiency hierarchy (user-confirmed):
// HSU-14HFTEX > HFS variants > HFP > LF
//
// HFS = ~720W, 5-Star Inverter  (most efficient 1-ton)
// HFP = 850W,  5-Star Inverter  (mid tier — already correct)
// LF  = ~980W, 4-Star Inverter  (entry inverter — least efficient)
// 10LF = 0.9 ton, tags fix only

async function run() {

  // ── 1. HFS tier: fix 1100W → 720W, 3-Star → 5-Star Inverter ─────────
  const hfsTier = [
    { id: 'haier-hsu-13hfs',     name: 'Haier 1.0 Ton Inverter Air Conditioner' },
    { id: 'haier-hsu-13hfs-w',   name: 'Haier 1.0 Ton Inverter Air Conditioner' },
    { id: 'haier-hsu-13hfs-g-s', name: 'Haier 1.0 Ton Inverter Air Conditioner' },
    { id: 'haier-hsu-13hfc',     name: 'Haier 1.0 Ton Heat & Cool Inverter Air Conditioner' },
    { id: 'haier-hsu-13hfab',    name: 'Haier 1.0 Ton Heat & Cool Inverter Air Conditioner' },
  ];

  for (const { id, name } of hfsTier) {
    const { data: prod } = await sb.from('products').select('specs,simplified_name').eq('id', id).single();
    if (!prod) { console.log(`${id}: NOT FOUND`); continue; }

    const specs = {
      ...prod.specs,
      'Power Consumption': '720W',
      'Energy Rating': '5-Star Inverter',
    };
    const r = await sb.from('products').update({ specs, simplified_name: name }).eq('id', id);
    console.log(`${id}: Power 1100W→720W, Energy 3-Star→5-Star ${r.error ? 'ERROR: '+r.error.message : 'OK'}`);
  }

  // ── 2. LF tier: fix 850W → 980W, 5-Star → 4-Star Inverter ───────────
  {
    const id = 'haier-hsu-13lf';
    const { data: prod } = await sb.from('products').select('specs').eq('id', id).single();
    if (prod) {
      const specs = {
        ...prod.specs,
        'Power Consumption': '980W',
        'Energy Rating': '4-Star Inverter',
      };
      const r = await sb.from('products').update({ specs }).eq('id', id);
      console.log(`${id}: Power 850W→980W, Energy 5-Star→4-Star ${r.error ? 'ERROR: '+r.error.message : 'OK'}`);
    }
  }

  // ── 3. HSU-10LF: fix tags "1 ton" → "0.9 ton" ───────────────────────
  {
    const id = 'haier-hsu-10lf';
    const { data: prod } = await sb.from('products').select('tags,specs').eq('id', id).single();
    if (prod) {
      // Replace "1 ton air conditioners" with "0.9 ton air conditioner"
      const newTags = (prod.tags || '')
        .replace(/\b1 ton air conditioners\b/gi, '0.9 ton air conditioner')
        .replace(/\b1\.0 ton\b/gi, '0.9 ton');

      const specs = {
        ...prod.specs,
        'Tonnage':  '0.9 Ton',
        'Power Consumption': '765W',
      };
      const r = await sb.from('products').update({ tags: newTags, specs }).eq('id', id);
      console.log(`${id}: tags "1 ton"→"0.9 ton" ${r.error ? 'ERROR: '+r.error.message : 'OK'}`);
      console.log(`  new tags preview: ${newTags.slice(0, 100)}`);
    }
  }

  // ── 4. Verify HSU-14HFTEX is correctly set (most efficient T3) ───────
  {
    const { data: prod } = await sb.from('products').select('model,specs,cash_floor').eq('id','haier-hsu-14hftex').single();
    if (prod) {
      console.log(`\nHSU-14HFTEX verification:`);
      console.log(`  BTU: ${prod.specs?.['Cooling Capacity']}`);
      console.log(`  Power: ${prod.specs?.['Power Consumption']}`);
      console.log(`  Tonnage: ${prod.specs?.['Tonnage']}`);
      console.log(`  Energy: ${prod.specs?.['Energy Rating']}`);
      console.log(`  T3: ${prod.specs?.['T3 Rating']}`);
      console.log(`  Price: PKR ${prod.cash_floor?.toLocaleString()}`);
    }
  }

  console.log('\nAll done.');
}

run().catch(console.error);
