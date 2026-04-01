import { createClient } from '@supabase/supabase-js';
const sb = createClient('https://fdfjavyopbrfvwtjaerw.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDE3MDAsImV4cCI6MjA4ODIxNzcwMH0.fXwGFR_e3xZ4trEbkcH8UQ6_oWcIn92UUUvkGuFajto');
await sb.auth.signInWithPassword({ email: 'tajallisautomation@gmail.com', password: 'Hammad123!' });
const {data, error} = await sb.from('products').select('id,brand,model,category,cash_floor,thumbnail_url,stock_status')
  .eq('brand','Haier').ilike('category','%refrig%').order('model');
if (error) { console.log('err:', error.message); process.exit(1); }
console.log(`Haier refs in DB: ${data.length}\n`);
for (const p of data) {
  const hasImg = p.thumbnail_url ? '📷' : '❌NoImg';
  const price = p.cash_floor > 0 ? p.cash_floor.toLocaleString() : '❌NoPx';
  const status = p.stock_status !== 'In Stock' ? `[${p.stock_status}]` : '';
  console.log(`${hasImg} ${price} ${status} ${p.model}`);
}
