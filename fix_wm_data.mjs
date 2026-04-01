import { createClient } from '@supabase/supabase-js';
const sb = createClient(
  'https://fdfjavyopbrfvwtjaerw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDE3MDAsImV4cCI6MjA4ODIxNzcwMH0.fXwGFR_e3xZ4trEbkcH8UQ6_oWcIn92UUUvkGuFajto'
);
await sb.auth.signInWithPassword({ email: 'tajallisautomation@gmail.com', password: 'Hammad123!' });

// ── 1. Fix Haier Spinners (HD series) ────────────────────────────────────────
// HD 60-50 = 6kg Spinner, HD 80-60 = 8kg Spinner
// Currently incorrectly categorized as Front Load — move to Semi-Automatic
const spinners = [
  { id: 'haier-hd-60-50', cap: '6 kg', capKg: 6 },
  { id: 'haier-hd-80-60', cap: '8 kg', capKg: 8 },
];
for (const { id, cap, capKg } of spinners) {
  const newSpecs = {
    'Type': 'Spinner / Spin Dryer',
    'Capacity': cap,
    'Spin Speed': '1350 RPM',
    'Motor': 'Universal Motor',
    'Water Inlet': 'No — load wet laundry directly',
    'Power Supply': '220V / 50Hz',
    'Body': 'Rust-free plastic',
  };
  const { error } = await sb.from('products').update({
    category: 'Semi-Automatic Washing Machines',
    specs: newSpecs,
    simplified_name: `Haier HD ${id.includes('60-50') ? '60-50' : '80-60'} ${cap} Spin Dryer Spinner`,
    tags: 'spinner, spin dryer, dehydrator, semi-automatic, haier spinner',
  }).eq('id', id);
  console.log(`Spinner fix ${id}: ${error?.message || '✓ → Semi-Auto/Spinner'}`);
}

// ── 2. Separate Front Load WMs into their own category ────────────────────────
// Currently mixed with Top Load in "Automatic Washing Machines"
// Move all Front Load models to "Front Load Washing Machines"
const { data: allWMs } = await sb.from('products')
  .select('id,brand,model,category,specs,simplified_name')
  .ilike('category', '%wash%');

const frontLoads = allWMs.filter(p =>
  p.specs?.Type?.toLowerCase().includes('front load') ||
  /front.?load|dwf\s|dwd\s|front.?load/i.test(p.model + ' ' + p.simplified_name)
);

console.log(`\nFront Load WMs found: ${frontLoads.length}`);
for (const p of frontLoads) {
  if (p.category === 'Front Load Washing Machines') { continue; }
  const { error } = await sb.from('products').update({
    category: 'Front Load Washing Machines',
  }).eq('id', p.id);
  console.log(`  ${p.brand} ${p.model}: ${error?.message || '→ Front Load Washing Machines'}`);
}

// ── 3. Rename "Automatic Washing Machines" → "Top Load Washing Machines" ─────
// (Remaining automatic WMs after moving front load are all top load)
const { data: remaining } = await sb.from('products')
  .select('id,brand,model,specs')
  .eq('category', 'Automatic Washing Machines');

const topLoadOnly = remaining?.filter(p => !p.specs?.Type?.toLowerCase().includes('front load'));
console.log(`\nTop Load WMs: ${topLoadOnly?.length || 0}`);
// Keep category as "Automatic Washing Machines" for now — the type filter handles it
// Just ensure the Type spec is correct
for (const p of (topLoadOnly || [])) {
  if (p.specs?.Type !== 'Top Load — Fully Automatic') {
    const { error } = await sb.from('products').update({
      specs: { ...(p.specs || {}), Type: 'Top Load — Fully Automatic' },
    }).eq('id', p.id);
    if (!error) process.stdout.write('.');
  }
}
console.log('');

// ── 4. Verify ──────────────────────────────────────────────────────────────────
console.log('\n── Verification ──');
const { data: after } = await sb.from('products')
  .select('id,brand,model,category,specs')
  .ilike('category', '%wash%')
  .order('category');

const cats = {};
for (const p of after) { if (!cats[p.category]) cats[p.category]=[]; cats[p.category].push(p); }
for (const [cat, ps] of Object.entries(cats)) {
  console.log(`\n[${cat}] (${ps.length})`);
  ps.forEach(p => console.log(`  ${p.brand} ${p.model} | ${p.specs?.Type || '?'}`));
}
