import { createClient } from '@supabase/supabase-js';
const sb = createClient(
  'https://fdfjavyopbrfvwtjaerw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDE3MDAsImV4cCI6MjA4ODIxNzcwMH0.fXwGFR_e3xZ4trEbkcH8UQ6_oWcIn92UUUvkGuFajto'
);
const { data } = await sb.from('products')
  .select('brand,model,simplified_name,thumbnail_url')
  .order('brand').order('model');

const missing = data.filter(p => !p.thumbnail_url || !p.thumbnail_url.includes('supabase'));
console.log('PRODUCTS WITHOUT SUPABASE IMAGE:');
missing.forEach(p =>
  console.log(p.brand + ' | ' + p.model + ' | simplified: ' + (p.simplified_name || ''))
);
console.log('\nTOTAL MISSING:', missing.length);
