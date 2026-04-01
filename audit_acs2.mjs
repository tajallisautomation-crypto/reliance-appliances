import { createClient } from '@supabase/supabase-js';
const sb = createClient('https://fdfjavyopbrfvwtjaerw.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDE3MDAsImV4cCI6MjA4ODIxNzcwMH0.fXwGFR_e3xZ4trEbkcH8UQ6_oWcIn92UUUvkGuFajto');
await sb.auth.signInWithPassword({ email: 'tajallisautomation@gmail.com', password: 'Hammad123!' });
const {data} = await sb.from('products').select('id,brand,model,specs,tags,cash_floor,stock_status').ilike('category','%air condition%').order('brand').order('model');

let issues = 0;
for (const p of data) {
  const inv = p.specs?.Inverter === 'Yes' || /inverter/i.test(p.model);
  const heat = String(p.specs?.Heating || '').startsWith('Yes');
  const priceLbl = p.cash_floor > 0 ? p.cash_floor.toLocaleString() : 'ZERO PRICE';
  const disc = p.stock_status === 'Discontinued' ? '[DISC]' : '';
  
  let flag = '';
  // Flag: inverter in name but spec says no inverter
  if (/inverter|invertor/i.test(p.model) && p.specs?.Inverter !== 'Yes') flag += ' ⚠️INVERTER_MISMATCH';
  // Flag: zero price (will be hidden from catalog after fix)
  if (p.cash_floor <= 0) flag += ' ⚠️NO_PRICE';
  // Flag: discontinued with price 
  if (disc && p.cash_floor > 0) flag += ' ⚠️DISC_WITH_PRICE';
  // Flag: T3 in model but not Heat&Cool
  if (/\bT3\b/i.test(p.model) && !heat) flag += ' ⚠️T3_NOT_HC';
  // Flag: H&C in model name but not in specs
  if (/heat.*cool|h&c/i.test(p.model) && !heat) flag += ' ⚠️HC_NAME_MISMATCH';

  if (flag) {
    console.log(`${p.brand} ${p.model} [${p.cash_floor}]${disc}${flag}`);
    issues++;
  }
}
console.log(`\n${issues} issues found`);

// Count summary
const zero = data.filter(p => p.cash_floor <= 0);
const disc = data.filter(p => p.stock_status === 'Discontinued');
const hc = data.filter(p => String(p.specs?.Heating || '').startsWith('Yes'));
const inv = data.filter(p => p.specs?.Inverter === 'Yes');
console.log(`\nSummary: ${data.length} total | ${hc.length} H&C | ${inv.length} inverter | ${zero.length} zero-price | ${disc.length} discontinued`);
