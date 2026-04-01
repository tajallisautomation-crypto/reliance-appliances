import { createClient } from '@supabase/supabase-js';
const sb = createClient(
  'https://fdfjavyopbrfvwtjaerw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDE3MDAsImV4cCI6MjA4ODIxNzcwMH0.fXwGFR_e3xZ4trEbkcH8UQ6_oWcIn92UUUvkGuFajto'
);
const { data } = await sb.from('products')
  .select('id,brand,model,simplified_name,featured,thumbnail_url,stock_status')
  .eq('featured', true).limit(20);
console.log(`Featured products: ${data?.length}`);
data?.forEach(p => console.log(`  [${p.id}] ${p.brand} ${p.model} | thumb: ${p.thumbnail_url ? 'YES' : 'NULL'} | status: ${p.stock_status}`));
