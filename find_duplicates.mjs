import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fdfjavyopbrfvwtjaerw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDE3MDAsImV4cCI6MjA4ODIxNzcwMH0.fXwGFR_e3xZ4trEbkcH8UQ6_oWcIn92UUUvkGuFajto';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function normalize(str) {
  if (!str) return '';
  return str.trim().toLowerCase().replace(/\s+/g, ' ');
}

async function fetchAllFreezerFridgeProducts() {
  let allProducts = [];
  let from = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('products')
      .select('id, simplified_name, model_number, category, stock_status')
      .or('category.ilike.%freezer%,category.ilike.%refrigerat%')
      .range(from, from + pageSize - 1);

    if (error) {
      console.error('Error fetching products:', error.message);
      process.exit(1);
    }

    if (!data || data.length === 0) break;

    allProducts = allProducts.concat(data);

    if (data.length < pageSize) break;
    from += pageSize;
  }

  return allProducts;
}

function groupBy(products, keyFn, label) {
  const groups = {};
  for (const p of products) {
    const key = keyFn(p);
    if (!key) continue;
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  }

  const duplicates = Object.entries(groups).filter(([, items]) => items.length >= 2);
  return duplicates;
}

function printDuplicates(label, duplicates) {
  if (duplicates.length === 0) {
    console.log(`  No duplicates found by ${label}.\n`);
    return;
  }

  console.log(`  Found ${duplicates.length} duplicate group(s) by ${label}:\n`);

  for (const [key, items] of duplicates) {
    console.log(`  [${label}] "${key}"  (${items.length} products)`);
    for (const p of items) {
      console.log(`    - ID: ${p.id}`);
      console.log(`      simplified_name : ${p.simplified_name || '(null)'}`);
      console.log(`      model_number    : ${p.model_number || '(null)'}`);
      console.log(`      category        : ${p.category || '(null)'}`);
      console.log(`      stock_status    : ${p.stock_status || '(null)'}`);
    }
    console.log();
  }
}

async function main() {
  console.log('Fetching all freezer/refrigerator products from Supabase...\n');

  const products = await fetchAllFreezerFridgeProducts();
  console.log(`Total products fetched: ${products.length}\n`);

  if (products.length === 0) {
    console.log('No products found matching the category filter.');
    return;
  }

  // --- Duplicates by model_number ---
  console.log('='.repeat(60));
  console.log('DUPLICATES BY MODEL NUMBER');
  console.log('='.repeat(60));

  const byModel = groupBy(
    products,
    (p) => normalize(p.model_number),
    'model_number'
  );
  printDuplicates('model_number', byModel);

  // --- Duplicates by simplified_name ---
  console.log('='.repeat(60));
  console.log('DUPLICATES BY SIMPLIFIED NAME');
  console.log('='.repeat(60));

  const byName = groupBy(
    products,
    (p) => normalize(p.simplified_name),
    'simplified_name'
  );
  printDuplicates('simplified_name', byName);

  // --- Summary ---
  console.log('='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`  Total products scanned   : ${products.length}`);
  console.log(`  Duplicate groups (model) : ${byModel.length}`);
  console.log(`  Duplicate groups (name)  : ${byName.length}`);

  const dupIdsByModel = new Set(byModel.flatMap(([, items]) => items.map(p => p.id)));
  const dupIdsByName  = new Set(byName.flatMap(([, items])  => items.map(p => p.id)));
  const allDupIds = new Set([...dupIdsByModel, ...dupIdsByName]);

  console.log(`  Products involved (model): ${dupIdsByModel.size}`);
  console.log(`  Products involved (name) : ${dupIdsByName.size}`);
  console.log(`  Products involved (total unique): ${allDupIds.size}`);
  console.log();
}

main();
