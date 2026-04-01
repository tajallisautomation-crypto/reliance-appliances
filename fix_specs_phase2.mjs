import { createClient } from '@supabase/supabase-js';
const sb = createClient(
  'https://fdfjavyopbrfvwtjaerw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDE3MDAsImV4cCI6MjA4ODIxNzcwMH0.fXwGFR_e3xZ4trEbkcH8UQ6_oWcIn92UUUvkGuFajto'
);

let ok = 0, fail = 0;
function log(label, err) {
  if (err) { console.error(`FAIL  [${label}]: ${err.message}`); fail++; }
  else      { console.log(`OK    ${label}`); ok++; }
}

// ── 1. Westpoint WF-841 — add 40L to name + specs ────────────────────────────
{
  const { data: rows } = await sb.from('products')
    .select('id, simplified_name, specs')
    .eq('brand', 'Westpoint')
    .ilike('model', '%841%')
    .neq('stock_status', 'Discontinued');

  for (const p of (rows || [])) {
    const name = p.simplified_name || '';
    const newName = /\d+\s*(L|litre|liter)/i.test(name)
      ? name
      : name.replace(/\bMicrowave\b/i, '40L Microwave').replace(/\s{2,}/g, ' ').trim();
    const newSpecs = { ...(p.specs || {}), 'Capacity': '40L' };
    const { error } = await sb.from('products')
      .update({ simplified_name: newName, specs: newSpecs })
      .eq('id', p.id);
    log(`WF-841 [${p.id}] name → "${newName}"`, error);
  }
}

// ── 2. Dawlance Freezers — add Running Wattage to specs ──────────────────────
{
  const { data: rows } = await sb.from('products')
    .select('id, model, simplified_name, specs')
    .eq('brand', 'Dawlance')
    .ilike('category', '%freezer%')
    .neq('stock_status', 'Discontinued');

  for (const p of (rows || [])) {
    const m = (p.model || '').toUpperCase();
    const name = (p.simplified_name || '').toLowerCase();

    // Already has wattage?
    const existingWatt = Object.entries(p.specs || {}).find(([k]) => k.toLowerCase().includes('watt') || k.toLowerCase().includes('power'));
    if (existingWatt) continue;

    let wattage = null;

    // Inverter Signature (CF-91997, CF-91998) — NOT LVS variant
    if ((m.includes('CF-91997') || m.includes('CF-91998')) && !m.includes('LVS') && !name.includes('lvs')) {
      wattage = '~60W – 90W (Inverter, variable-speed compressor)';
    }
    // LVS Convertible / Non-Inverter
    else if (m.includes('LVS') || name.includes('lvs')) {
      wattage = '~140W – 185W (Non-inverter, fixed-speed compressor)';
    }
    // Vertical Freezers (VF series)
    else if (m.startsWith('VF-') || name.includes('vertical')) {
      wattage = '~115W – 130W';
    }
    // DF series inverter
    else if (name.includes('inverter')) {
      wattage = '~60W – 90W (Inverter, variable-speed compressor)';
    }
    // DF series non-inverter (standard chest)
    else if (m.startsWith('DF-')) {
      wattage = '~140W – 185W';
    }

    if (!wattage) continue;

    const newSpecs = { ...(p.specs || {}), 'Running Wattage': wattage };
    const { error } = await sb.from('products')
      .update({ specs: newSpecs })
      .eq('id', p.id);
    log(`Freezer wattage: ${p.model || p.id}`, error);
  }
}

// ── 3. TV Specs by Brand ──────────────────────────────────────────────────────

const TV_BRANDS = {
  Samsung: {
    smart_os: 'Tizen™ Smart TV (Version 7.0/8.0)',
    warranty:  '1 Year Parts & Panel',
  },
  Haier: {
    smart_os: 'Google TV (Latest certified version)',
    warranty:  '2 Years Panel / 1 Year Parts & Service',
  },
  Dawlance: {
    smart_os: 'Google TV / Android 11.0 (varies by model)',
    warranty:  '1 Year Comprehensive (Parts, Panel & Service)',
  },
  TCL: {
    smart_os: 'Google TV',
    warranty:  '2 Years Panel & Parts',
  },
};

for (const [brand, info] of Object.entries(TV_BRANDS)) {
  const { data: rows } = await sb.from('products')
    .select('id, specs, warranty')
    .eq('brand', brand)
    .or('category.ilike.%television%,category.ilike.% led%,category.ilike.%smart tv%,category.ilike.%qled%')
    .neq('stock_status', 'Discontinued');

  for (const p of (rows || [])) {
    const specs = p.specs || {};
    const hasOS = Object.entries(specs).some(([k]) => k.toLowerCase().includes('smart') || k.toLowerCase().includes(' os') || k.toLowerCase().includes('platform') || k.toLowerCase().includes('android') || k.toLowerCase().includes('google'));
    const hasWarranty = Object.entries(specs).some(([k]) => k.toLowerCase().includes('warranty'));
    const needsWarrantyField = !p.warranty || !p.warranty.toLowerCase().includes('year');

    if (hasOS && hasWarranty && !needsWarrantyField) continue;

    const newSpecs = { ...specs };
    if (!hasOS)      newSpecs['Smart OS'] = info.smart_os;
    if (!hasWarranty) newSpecs['Warranty'] = info.warranty;

    const patch = { specs: newSpecs };
    if (needsWarrantyField) patch.warranty = info.warranty;

    const { error } = await sb.from('products').update(patch).eq('id', p.id);
    log(`${brand} TV [${p.id}]`, error);
  }
}

console.log(`\nDone. ${ok} updated, ${fail} failed.\n`);
