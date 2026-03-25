// fix_vacuums.mjs — Find vacuums and check/fix their categories
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fdfjavyopbrfvwtjaerw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDE3MDAsImV4cCI6MjA4ODIxNzcwMH0.fXwGFR_e3xZ4trEbkcH8UQ6_oWcIn92UUUvkGuFajto';
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  await sb.auth.signInWithPassword({ email: 'tajallisautomation@gmail.com', password: 'Hammad123!' });

  // Find all vacuum-related products
  const { data: rows, error } = await sb.from('products')
    .select('id, brand, model, simplified_name, category, sub_category, tags, stock_status')
    .or('simplified_name.ilike.*vacuum*,tags.ilike.*vacuum*,category.ilike.*vacuum*');

  if (error) { console.error(error); process.exit(1); }
  console.log(`Found ${rows.length} vacuum-related products:`);
  rows.forEach(r => console.log(`  [${r.id}] ${r.brand} ${r.model} | cat: "${r.category}" | tags: "${r.tags}"`));

  // Find products that need category fix (not in 'Small Appliances' or similar)
  const needsFix = rows.filter(r => !r.category.toLowerCase().includes('small appli') && !r.category.toLowerCase().includes('personal care') && !r.category.toLowerCase().includes('vacuum'));

  if (needsFix.length === 0) {
    console.log('\nAll vacuums have correct categories or are already in small appliances.');
  } else {
    console.log(`\n${needsFix.length} vacuums need category fix:`);
    needsFix.forEach(r => console.log(`  ${r.brand} ${r.model}: "${r.category}"`));

    // Fix them
    for (const r of needsFix) {
      const { error: ue } = await sb.from('products').update({
        category: 'Small Appliances',
        sub_category: 'Vacuum Cleaners',
      }).eq('id', r.id);
      if (ue) console.error(`  ✗ ${r.model}: ${ue.message}`);
      else console.log(`  ✓ ${r.brand} ${r.model} → Small Appliances / Vacuum Cleaners`);
    }
  }
}

main().catch(console.error);
