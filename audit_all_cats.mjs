import { createClient } from '@supabase/supabase-js';
const sb = createClient(
  'https://fdfjavyopbrfvwtjaerw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDE3MDAsImV4cCI6MjA4ODIxNzcwMH0.fXwGFR_e3xZ4trEbkcH8UQ6_oWcIn92UUUvkGuFajto'
);

async function audit(label, orClause) {
  const { data } = await sb.from('products')
    .select('brand, model, simplified_name, category, sub_category, specs')
    .or(orClause).order('brand').order('model');
  console.log(`\n${'='.repeat(60)}\n${label} — ${data.length} products\n${'='.repeat(60)}`);
  const specKeySet = new Set();
  for (const p of data) Object.keys(p.specs||{}).forEach(k => specKeySet.add(k));
  console.log('Spec keys present:', [...specKeySet].sort().join(', '));
  console.log('\nUnique sub_category values:', [...new Set(data.map(p=>p.sub_category||'null'))].sort().join(' | '));

  // Show unique values for key spec fields
  for (const key of ['Capacity','Door Type','Defrost Type','Inverter','Heating','Glass Door','Type','Tonnage','Capacity (Liters)','Net Weight']) {
    const vals = [...new Set(data.map(p=>(p.specs||{})[key]).filter(Boolean))];
    if (vals.length) console.log(`  specs.${key}:`, vals.sort().join(' | '));
  }
  return data;
}

// Fridges
await audit('REFRIGERATORS', 'category.ilike.*refrigerat*');

// Washing
await audit('WASHING MACHINES', 'category.ilike.*washing*');

// Freezers
await audit('FREEZERS', 'category.ilike.*freezer*');

// TVs
await audit('TELEVISIONS', 'category.ilike.*television*,category.ilike.*led*,category.ilike.*smart tv*');

// Microwaves
await audit('MICROWAVES', 'category.ilike.*microwave*');
