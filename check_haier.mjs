import { createClient } from '@supabase/supabase-js';
const sb = createClient('https://fdfjavyopbrfvwtjaerw.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDE3MDAsImV4cCI6MjA4ODIxNzcwMH0.fXwGFR_e3xZ4trEbkcH8UQ6_oWcIn92UUUvkGuFajto');
await sb.auth.signInWithPassword({ email: 'tajallisautomation@gmail.com', password: 'Hammad123!' });
const {data} = await sb.from('products').select('id,model,specs').eq('brand','Haier').ilike('category','%air condition%').order('model');
for (const p of data) {
  const inv = p.specs?.Inverter === 'Yes' ? '✅INV' : '❌FIX';
  const heat = String(p.specs?.Heating||'').startsWith('Yes') ? '✅H&C' : '❌CoolOnly';
  console.log(`${inv} ${heat} ${p.model}`);
}
