import { createClient } from '@supabase/supabase-js';
const sb = createClient('https://fdfjavyopbrfvwtjaerw.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDE3MDAsImV4cCI6MjA4ODIxNzcwMH0.fXwGFR_e3xZ4trEbkcH8UQ6_oWcIn92UUUvkGuFajto');
await sb.auth.signInWithPassword({ email: 'tajallisautomation@gmail.com', password: 'Hammad123!' });
const {data} = await sb.from('products').select('id,model,specs,tags').eq('brand','Haier').ilike('model','%HPU-24HE%');
for (const p of data) {
  const { error } = await sb.from('products').update({
    specs: { ...(p.specs || {}), Inverter: 'Yes' }
  }).eq('id', p.id);
  console.log(`${p.model}: ${error?.message || '✓ Inverter:Yes'}`);
}
