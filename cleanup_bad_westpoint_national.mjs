/**
 * cleanup_bad_westpoint_national.mjs
 * Deletes:
 *   1. All products with brand = 'National'  (wrong brand — these are Westpoint)
 *   2. All products with brand = 'Westpoint' AND model LIKE 'WF-%'  (wrong model format)
 *
 * After this runs, re-insert everything using the corrected_A/B/C/D scripts.
 *
 * Run:  node cleanup_bad_westpoint_national.mjs [--dry-run]
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL      = 'https://fdfjavyopbrfvwtjaerw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDE3MDAsImV4cCI6MjA4ODIxNzcwMH0.fXwGFR_e3xZ4trEbkcH8UQ6_oWcIn92UUUvkGuFajto';
const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || 'tajallisautomation@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Hammad123!';
const DRY_RUN        = process.argv.includes('--dry-run');

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
  const { error: ae } = await supabase.auth.signInWithPassword({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  if (ae) { console.error('Auth failed:', ae.message); process.exit(1); }
  console.log('Signed in.\n');

  // --- 1. List National brand products ---
  const { data: natProducts, error: ne } = await supabase
    .from('products').select('id, brand, model, simplified_name')
    .eq('brand', 'National');
  if (ne) { console.error('Error fetching National products:', ne.message); process.exit(1); }
  console.log(`Found ${(natProducts || []).length} National brand products:`);
  (natProducts || []).forEach(p => console.log(`  • ${p.brand} | ${p.model} | ${p.simplified_name}`));

  // --- 2. List WF-prefixed Westpoint products ---
  const { data: wfProducts, error: we } = await supabase
    .from('products').select('id, brand, model, simplified_name')
    .eq('brand', 'Westpoint').like('model', 'WF-%');
  if (we) { console.error('Error fetching WF products:', we.message); process.exit(1); }
  console.log(`\nFound ${(wfProducts || []).length} WF-prefixed Westpoint products:`);
  (wfProducts || []).forEach(p => console.log(`  • ${p.model} | ${p.simplified_name}`));

  const total = (natProducts || []).length + (wfProducts || []).length;
  console.log(`\nTotal to delete: ${total}`);

  if (DRY_RUN) {
    console.log('\n-- DRY RUN -- Nothing deleted. Remove --dry-run to execute.');
    process.exit(0);
  }

  // --- 3. Delete National products ---
  if ((natProducts || []).length > 0) {
    const { error: de1 } = await supabase.from('products').delete().eq('brand', 'National');
    if (de1) { console.error('Error deleting National products:', de1.message); process.exit(1); }
    console.log(`\n✓ Deleted ${natProducts.length} National brand products.`);
  }

  // --- 4. Delete WF-prefixed Westpoint products ---
  if ((wfProducts || []).length > 0) {
    const { error: de2 } = await supabase.from('products').delete()
      .eq('brand', 'Westpoint').like('model', 'WF-%');
    if (de2) { console.error('Error deleting WF products:', de2.message); process.exit(1); }
    console.log(`✓ Deleted ${wfProducts.length} WF-prefixed Westpoint products.`);
  }

  console.log('\nCleanup complete. Now run the corrected_A/B/C/D insertion scripts.');
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
