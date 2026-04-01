import { createClient } from '@supabase/supabase-js';
const sb = createClient(
  'https://fdfjavyopbrfvwtjaerw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDE3MDAsImV4cCI6MjA4ODIxNzcwMH0.fXwGFR_e3xZ4trEbkcH8UQ6_oWcIn92UUUvkGuFajto'
);
await sb.auth.signInWithPassword({ email: 'tajallisautomation@gmail.com', password: 'Hammad123!' });

// ── Explicit model → new category map ──────────────────────────────────────

// Side-by-Side
const SBS = [
  'haier-hrf-518-wiffbgu1',      // Haier WiFi SBS
  'haier-hrf-622-ibs',           // Haier SBS
  'haier-hrf-622-icg',           // Haier SBS
  'dawlance-dss-9055-inv-gd',    // Dawlance SBS
  'dawlance-dtm-8365-inv-inox-dawlance', // Dawlance multi-door SBS
];

// French Door / T-Door
const FRENCH = [
  'haier-hrf-578tsg-tbg',        // Haier T-Door
  'haier-hrf-678-tgg',           // Haier T-Door
  'dawlance-dfd-900-gd-inv',     // Dawlance French Door
  'dawlance-dmd-7950-inv-gd',    // Dawlance Multi-Door
  'dawlance-dmd-7950-inv-inox',  // Dawlance Multi-Door
  'dawlance-7650-inv-gd-iot',    // Dawlance IOT French
];

// No-Frost (Haier IF* series — Inverter Frost-free)
const NOFROST = [
  'haier-hrf-316-ifga-ifra',
  'haier-hrf-368-ifga-ifra-ifpa',
  'haier-hrf-398-ifga',
  'haier-hrf-418-iot',
  'haier-hrf-438-ifga',
  'haier-hrf-458-ifga-ifra-ifpa',
  'haier-hrf-518-ifb',
  'haier-hrf-538-ifga',
  'haier-hrf-538-iot',
];

async function update(ids, category, typeLabel) {
  let ok = 0;
  for (const id of ids) {
    const { data: cur } = await sb.from('products').select('id,specs').eq('id', id).single();
    if (!cur) { console.warn(`  NOT FOUND: ${id}`); continue; }
    const { error } = await sb.from('products').update({
      category,
      specs: { ...(cur.specs || {}), Type: typeLabel },
    }).eq('id', id);
    if (error) console.error(`  ERR ${id}:`, error.message);
    else { ok++; console.log(`  ✓ ${id} → ${category}`); }
  }
  return ok;
}

console.log('\n── Side-by-Side Refrigerators ──');
const n1 = await update(SBS, 'Side-by-Side Refrigerators', 'Side-by-Side (No-Frost)');

console.log('\n── French Door Refrigerators ──');
const n2 = await update(FRENCH, 'French Door Refrigerators', 'French Door / T-Door');

console.log('\n── No-Frost Refrigerators ──');
const n3 = await update(NOFROST, 'No-Frost Refrigerators', 'No-Frost (Auto Defrost)');

console.log(`\n✓ Total updated: ${n1 + n2 + n3}`);

// Verify
const { data: after } = await sb.from('products').select('category').ilike('category', '%refrigerat%');
const cats = {};
for (const p of after) cats[p.category] = (cats[p.category] || 0) + 1;
console.log('\nFinal ref category counts:');
for (const [cat, n] of Object.entries(cats).sort()) console.log(`  ${cat}: ${n}`);
