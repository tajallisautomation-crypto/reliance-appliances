/**
 * enrich_ecostar_acs.mjs
 * Upserts EcoStar air conditioner products into the DB with accurate specs
 * extracted from the official EcoStar AC New Lineup Flyer 2026.
 *
 * Data source: Material/EcoStar AC New Lineup Flyer 2026.pdf
 *
 * Behaviour:
 *  - If a product with brand=EcoStar and model=<model> already exists → UPDATE specs/description
 *  - If it doesn't exist → SKIP (prices unknown; add manually via admin panel)
 *    Use --insert to also insert new products (requires price)
 *
 * Run:  node enrich_ecostar_acs.mjs [--dry-run]
 */

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const SUPABASE_URL      = 'https://fdfjavyopbrfvwtjaerw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDE3MDAsImV4cCI6MjA4ODIxNzcwMH0.fXwGFR_e3xZ4trEbkcH8UQ6_oWcIn92UUUvkGuFajto';
const ADMIN_EMAIL       = process.env.ADMIN_EMAIL    || 'tajallisautomation@gmail.com';
const ADMIN_PASSWORD    = process.env.ADMIN_PASSWORD || 'Hammad123!';
const DRY_RUN           = process.argv.includes('--dry-run');
const INSERT_MISSING    = process.argv.includes('--insert');

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── EcoStar AC Catalogue 2026 ─────────────────────────────────────────────────
// Source: EcoStar AC New Lineup Flyer 2026.pdf
//
// BTU notation: [Max / Rated / Min] for Cooling and Heating
// Power notation: [Max / Rated / Min] Watts

const ECOSTAR_ACS = [

  // ── NOVO MAX Series (Heat & Cool, Inverter) ───────────────────────────────
  {
    model: 'ES-12NV02', series: 'Novo Max', size: '1 Ton', type: 'Heat & Cool',
    refrigerant: 'R410A', inverter: true,
    cooling_btu: '14330 / 11976 / 2730',  cooling_kw: '1.40 / 0.97 / 0.20',
    heating_btu: null,                     heating_kw: null,
    features: ['5th Gen Auto Washing', 'Cleaning Reminder', '4D Airflow', 'Pluggable PCB', 'Gold Fin Evaporator', 'Vitamin C & Carbon Filters', 'WiFi Function', 'IPX5 Waterproof Remote', 'Precise AI Temp Control ±0.1°C', '65Hz Startup', 'Self-Diagnosis Low Refrigerant'],
  },
  {
    model: 'ES-12NV01', series: 'Novo Max', size: '1 Ton', type: 'Heat & Cool',
    refrigerant: 'R410A', inverter: true,
    cooling_btu: '14330 / 12283 / 2730',  cooling_kw: '1.40 / 1.10 / 0.20',
    heating_btu: null,                     heating_kw: null,
    features: ['5th Gen Auto Washing', 'Cleaning Reminder', '4D Airflow', 'Pluggable PCB', 'Gold Fin Evaporator', 'Vitamin C & Carbon Filters', 'WiFi Function', 'IPX5 Waterproof Remote', 'Precise AI Temp Control ±0.1°C', '65Hz Startup'],
  },
  {
    model: 'ES-18NV02', series: 'Novo Max', size: '1.5 Ton', type: 'Heat & Cool',
    refrigerant: 'R410A', inverter: true,
    cooling_btu: '22519 / 18902 / 4436',  cooling_kw: '2.00 / 1.52 / 0.50',
    heating_btu: null,                     heating_kw: null,
    features: ['5th Gen Auto Washing', 'Cleaning Reminder', '4D Airflow', 'Pluggable PCB', 'Gold Fin Evaporator', 'Vitamin C & Carbon Filters', 'WiFi Function', 'IPX5 Waterproof Remote', 'Precise AI Temp Control ±0.1°C', '65Hz Startup'],
  },
  {
    model: 'ES-18NV01', series: 'Novo Max', size: '1.5 Ton', type: 'Heat & Cool',
    refrigerant: 'R410A', inverter: true,
    cooling_btu: '18425 / 17401 / 4436',  cooling_kw: '1.90 / 1.65 / 0.23',
    heating_btu: null,                     heating_kw: null,
    features: ['5th Gen Auto Washing', 'Cleaning Reminder', '4D Airflow', 'Pluggable PCB', 'Gold Fin Evaporator', 'Vitamin C & Carbon Filters', 'WiFi Function', 'IPX5 Waterproof Remote', 'Precise AI Temp Control ±0.1°C'],
  },
  {
    model: 'ES-24NV02', series: 'Novo Max', size: '2 Ton', type: 'Heat & Cool',
    refrigerant: 'R410A', inverter: true,
    cooling_btu: '25249 / 23952 / 6142',  cooling_kw: '2.70 / 1.93 / 0.23',
    heating_btu: null,                     heating_kw: null,
    features: ['5th Gen Auto Washing', 'Cleaning Reminder', '4D Airflow', 'Pluggable PCB', 'Gold Fin Evaporator', 'Vitamin C & Carbon Filters', 'WiFi Function', 'IPX5 Waterproof Remote', 'Precise AI Temp Control ±0.1°C'],
  },
  {
    model: 'ES-24NV01', series: 'Novo Max', size: '2 Ton', type: 'Heat & Cool',
    refrigerant: 'R410A', inverter: true,
    cooling_btu: '24908 / 22007 / 6142',  cooling_kw: '3.40 / 1.78 / 0.23',
    heating_btu: null,                     heating_kw: null,
    features: ['5th Gen Auto Washing', 'Cleaning Reminder', '4D Airflow', 'Pluggable PCB', 'Gold Fin Evaporator', 'Vitamin C & Carbon Filters', 'WiFi Function', 'IPX5 Waterproof Remote'],
  },

  // ── ARIO MAX Series (Heat & Cool, Inverter) ───────────────────────────────
  {
    model: 'ES-12AR02', series: 'Ario Max', size: '1 Ton', type: 'Heat & Cool',
    refrigerant: 'R410A', inverter: true,
    cooling_btu: '14330 / 12113 / 2730',  cooling_kw: '1.41 / 0.88 / 0.20',
    features: ['4D Airflow', 'Pluggable PCB', 'Gold Fin Evaporator', 'Vitamin C & Carbon Filters', 'WiFi Function', 'IPX5 Waterproof Remote', 'Precise AI Temp Control ±0.1°C', '65Hz Startup'],
  },
  {
    model: 'ES-12AR01', series: 'Ario Max', size: '1 Ton', type: 'Heat & Cool',
    refrigerant: 'R410A', inverter: true,
    cooling_btu: '14330 / 12966 / 2730',  cooling_kw: '1.30 / 0.92 / 0.20',
    features: ['4D Airflow', 'Pluggable PCB', 'Gold Fin Evaporator', 'Vitamin C & Carbon Filters', 'WiFi Function', 'IPX5 Waterproof Remote', 'Precise AI Temp Control ±0.1°C'],
  },
  {
    model: 'ES-18AR02', series: 'Ario Max', size: '1.5 Ton', type: 'Heat & Cool',
    refrigerant: 'R410A', inverter: true,
    cooling_btu: '20813 / 18902 / 4436',  cooling_kw: '1.80 / 1.40 / 0.42',
    features: ['4D Airflow', 'Pluggable PCB', 'Gold Fin Evaporator', 'Vitamin C & Carbon Filters', 'WiFi Function', 'IPX5 Waterproof Remote', '65Hz Startup'],
  },
  {
    model: 'ES-18AR01', series: 'Ario Max', size: '1.5 Ton', type: 'Heat & Cool',
    refrigerant: 'R410A', inverter: true,
    cooling_btu: '19448 / 17742 / 4436',  cooling_kw: '1.70 / 1.44 / 0.23',
    features: ['4D Airflow', 'Pluggable PCB', 'Gold Fin Evaporator', 'Vitamin C & Carbon Filters', 'WiFi Function', 'IPX5 Waterproof Remote'],
  },
  {
    model: 'ES-24AR02', series: 'Ario Max', size: '2 Ton', type: 'Heat & Cool',
    refrigerant: 'R410A', inverter: true,
    cooling_btu: '25590 / 24055 / 6142',  cooling_kw: '2.50 / 1.98 / 0.23',
    features: ['4D Airflow', 'Pluggable PCB', 'Gold Fin Evaporator', 'Vitamin C & Carbon Filters', 'WiFi Function', 'IPX5 Waterproof Remote'],
  },
  {
    model: 'ES-24AR01', series: 'Ario Max', size: '2 Ton', type: 'Heat & Cool',
    refrigerant: 'R410A', inverter: true,
    cooling_btu: '24908 / 22007 / 6142',  cooling_kw: '3.30 / 1.75 / 0.23',
    features: ['4D Airflow', 'Pluggable PCB', 'Gold Fin Evaporator', 'Vitamin C & Carbon Filters', 'WiFi Function', 'IPX5 Waterproof Remote'],
  },

  // ── EMPEROR Series (Heat & Cool, R32 Inverter) ────────────────────────────
  {
    model: 'ES-12EM02', series: 'Emperor', size: '1 Ton', type: 'Heat & Cool',
    refrigerant: 'R32', inverter: true,
    cooling_btu: '13648 / 12044 / 2730',  cooling_kw: '1.35 / 1.10 / 0.20',
    heating_btu: '14330 / 12283 / 2730',  heating_kw: '1.35 / 0.98 / 0.20',
    features: ['R32 Refrigerant', 'Self-Cleaning Evaporator', 'Labyrinth Design PCB', 'Environmental Protection Coating', 'Gold Fin Evaporator & Condenser', 'Low Voltage 150-270V', 'WiFi Ready', 'USB Connectivity', 'Solar Compatible', '4D Airflow', 'Self-Diagnosis Low Refrigerant', 'Vitamin C Filter'],
  },
  {
    model: 'ES-18EM02', series: 'Emperor', size: '1.5 Ton', type: 'Heat & Cool',
    refrigerant: 'R32', inverter: true,
    cooling_btu: '19448 / 17401 / 4436',  cooling_kw: '2.10 / 1.66 / 0.29',
    heating_btu: '18766 / 17742 / 4436',  heating_kw: '1.80 / 1.53 / 0.25',
    features: ['R32 Refrigerant', 'Self-Cleaning Evaporator', 'Labyrinth Design PCB', 'Environmental Protection Coating', 'Gold Fin Evaporator & Condenser', 'Low Voltage 150-270V', 'WiFi Ready', 'USB Connectivity', 'Solar Compatible', '4D Airflow', 'Self-Diagnosis Low Refrigerant'],
  },
  {
    model: 'ES-24EM02', series: 'Emperor', size: '2 Ton', type: 'Heat & Cool',
    refrigerant: 'R32', inverter: true,
    cooling_btu: '24566 / 22860 / 5459',  cooling_kw: '2.23 / 2.09 / 0.35',
    heating_btu: '24566 / 22519 / 5459',  heating_kw: '2.50 / 1.95 / 0.35',
    features: ['R32 Refrigerant', 'Self-Cleaning Evaporator', 'Labyrinth Design PCB', 'Environmental Protection Coating', 'Gold Fin Evaporator & Condenser', 'Low Voltage 150-270V', 'WiFi Ready', 'USB Connectivity', 'Solar Compatible', '4D Airflow'],
  },

  // ── EMPEROR Cool-Only ─────────────────────────────────────────────────────
  {
    model: 'ES-10EMC1WS', series: 'Emperor', size: '0.9 Ton', type: 'Cool Only',
    refrigerant: 'R32', inverter: true,
    cooling_btu: '11601 / 9997 / 2047',  cooling_kw: '1.15 / 0.96 / 0.20',
    features: ['R32 Refrigerant', 'Self-Cleaning Evaporator', 'Environmental Protection Coating', 'Gold Fin Evaporator & Condenser', 'Low Voltage 150-270V', 'WiFi Ready', '4D Airflow'],
  },

  // ── DUKE Series (Heat & Cool, R32 Inverter) ───────────────────────────────
  {
    model: 'ES-12DU02', series: 'Duke', size: '1 Ton', type: 'Heat & Cool',
    refrigerant: 'R32', inverter: true,
    cooling_btu: '13648 / 12044 / 2730',  cooling_kw: '1.35 / 1.10 / 0.20',
    heating_btu: '14330 / 12283 / 2730',  heating_kw: '1.35 / 0.98 / 0.20',
    features: ['R32 Refrigerant', 'Self-Cleaning Evaporator', 'Labyrinth Design PCB', 'Environmental Protection Coating', 'Gold Fin Evaporator & Condenser', 'Low Voltage 150-270V', 'WiFi Ready', 'USB Connectivity', '4D Airflow', 'Self-Diagnosis Low Refrigerant'],
  },
  {
    model: 'ES-18DU02', series: 'Duke', size: '1.5 Ton', type: 'Heat & Cool',
    refrigerant: 'R32', inverter: true,
    cooling_btu: '19448 / 17401 / 4436',  cooling_kw: '2.10 / 1.66 / 0.29',
    heating_btu: '18766 / 17742 / 4436',  heating_kw: '1.80 / 1.53 / 0.25',
    features: ['R32 Refrigerant', 'Self-Cleaning Evaporator', 'Labyrinth Design PCB', 'Environmental Protection Coating', 'Gold Fin Evaporator & Condenser', 'Low Voltage 150-270V', 'WiFi Ready', 'USB Connectivity', '4D Airflow'],
  },
  {
    model: 'ES-24DU02', series: 'Duke', size: '2 Ton', type: 'Heat & Cool',
    refrigerant: 'R32', inverter: true,
    cooling_btu: '24566 / 22860 / 5459',  cooling_kw: '2.23 / 2.09 / 0.35',
    heating_btu: '24566 / 22519 / 5459',  heating_kw: '2.50 / 1.95 / 0.35',
    features: ['R32 Refrigerant', 'Self-Cleaning Evaporator', 'Labyrinth Design PCB', 'Environmental Protection Coating', 'Gold Fin Evaporator & Condenser', 'Low Voltage 150-270V', 'WiFi Ready', 'USB Connectivity', '4D Airflow'],
  },

  // ── GLACIER FSU (Floor-Standing Unit) ─────────────────────────────────────
  {
    model: 'EF-24GL02S', series: 'Glacier', size: '2 Ton', type: 'Heat & Cool (Floor Standing)',
    refrigerant: 'R410A', inverter: true,
    cooling_btu: '27638 / 24021 / 3071',  cooling_kw: '3.20 / 2.13 / 0.30',
    heating_btu: '33097 / 31391 / 3071',  heating_kw: '3.40 / 3.16 / 0.26',
    features: ['Floor Standing Unit (FSU)', 'Low Voltage 130-264V', 'Precise AI Temp Control ±0.1°C', 'Gold Fin Evaporator & Condenser', '4D Long Air Throw', 'Power Off Memory', 'E-Heater in IDU', '30-Second Quick Cooling', 'Environmental Protection Coating'],
  },

  // ── ICEBERG FSU (Floor-Standing Unit) ─────────────────────────────────────
  {
    model: 'EF-24IB01W', series: 'Iceberg', size: '2 Ton', type: 'Heat & Cool (Floor Standing)',
    refrigerant: 'R410A', inverter: true,
    cooling_btu: '23891 / 22184 / 6483',  cooling_kw: '2.80 / 2.32 / 0.60',
    heating_btu: '25597 / 22867 / 6143',  heating_kw: '2.85 / 2.32 / 0.55',
    features: ['Floor Standing Unit (FSU)', 'Low Voltage 130-264V', 'Gold Fin Evaporator & Condenser', 'Precise AI Temp Control ±0.1°C', '30-Second Quick Cooling', 'Ampere Control via Remote', 'Environmental Protection Coating', '4D Long Air Throw up to 66ft', 'Power Off Memory'],
  },
  {
    model: 'EF-48IB01W', series: 'Iceberg', size: '4 Ton', type: 'Heat & Cool (Floor Standing)',
    refrigerant: 'R410A', inverter: true,
    cooling_btu: '52886 / 47768 / 22178', cooling_kw: '6.00 / 5.35 / 1.30',
    heating_btu: '54592 / 47768 / 17060', heating_kw: '5.80 / 4.50 / 1.00',
    features: ['Floor Standing Unit (FSU) — High Capacity', 'Low Voltage 130-264V', 'Gold Fin Evaporator & Condenser', 'Precise AI Temp Control ±0.1°C', '30-Second Quick Cooling', 'Ampere Control via Remote', 'Environmental Protection Coating', '4D Long Air Throw up to 66ft', 'Power Off Memory'],
  },
];

// ── Build specs object ────────────────────────────────────────────────────────
function buildSpecs(ac) {
  const specs = {
    Type:             `Split Air Conditioner — ${ac.series} Series`,
    Capacity:         ac.size,
    'AC Type':        ac.type,
    Inverter:         ac.inverter ? 'Yes — Inverter Compressor' : 'Non-Inverter',
    Refrigerant:      ac.refrigerant,
    'Cooling BTU/h':  ac.cooling_btu,
    'Cooling Input':  `${ac.cooling_kw} kW`,
    'Power Supply':   '220V / 50Hz',
    Warranty:         '1 year parts & labour, 5 years compressor',
  };
  if (ac.heating_btu) {
    specs['Heating BTU/h'] = ac.heating_btu;
    specs['Heating Input'] = `${ac.heating_kw} kW`;
  }
  if (ac.features?.length) {
    specs['Key Features'] = ac.features.join(', ');
  }
  return specs;
}

function buildDescription(ac) {
  const heatNote = ac.type.includes('Heat') ? ' Includes both cooling and heating modes for year-round comfort.' : '';
  const r32Note  = ac.refrigerant === 'R32' ? ' Uses R32 refrigerant — more energy-efficient and eco-friendly.' : '';
  return `The EcoStar ${ac.series} ${ac.size} (${ac.model}) is an inverter split air conditioner offering ${ac.cooling_btu.split(' / ')[1]} BTU/h rated cooling power.${heatNote}${r32Note} Key features: ${ac.features.slice(0, 4).join(', ')}. Available at Reliance Appliances, Karachi — on easy installments or cash. Call or WhatsApp for the latest price.`;
}

function buildTags(ac) {
  return [
    'ecostar', 'EcoStar', ac.model, `ecostar ${ac.series.toLowerCase()}`,
    'air conditioner', 'ac', 'split ac', 'inverter ac',
    ac.size, `${ac.size} ac`, `${ac.size} inverter ac`,
    ac.series.toLowerCase(), 'heat and cool', 'ecostar ac',
    'karachi', 'pakistan', 'reliance appliances', 'installment',
    'easy installments', 'ac price pakistan', 'ac karachi',
  ].join(', ');
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const { error: authErr } = await supabase.auth.signInWithPassword({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  if (authErr) { console.error('Auth failed:', authErr.message); process.exit(1); }
  console.log('Signed in.\n');

  const { data: existing, error } = await supabase
    .from('products')
    .select('id, brand, model, simplified_name')
    .ilike('brand', 'ecostar');

  if (error) { console.error('Fetch error:', error.message); process.exit(1); }
  console.log(`Found ${existing?.length ?? 0} existing EcoStar products in DB.\n`);

  const existingMap = new Map(
    (existing || []).map(p => [p.model.toUpperCase().trim(), p])
  );

  let updated = 0, missing = 0;

  for (const ac of ECOSTAR_ACS) {
    const dbProd = existingMap.get(ac.model.toUpperCase()) ||
                   [...existingMap.values()].find(p =>
                     p.model.toUpperCase().includes(ac.model.toUpperCase()));

    if (!dbProd) {
      if (!INSERT_MISSING) {
        console.log(`  NOT IN DB  ${ac.model}  (${ac.series} ${ac.size}) — run with --insert to create`);
        missing++;
        continue;
      }

      // Insert new product
      const specs       = buildSpecs(ac);
      const description = buildDescription(ac);
      const tags        = buildTags(ac);
      const name        = `EcoStar ${ac.series} ${ac.size} AC ${ac.model}`;
      const slug        = `ecostar-${ac.model.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
      const seo_title   = `${name} Price in Pakistan | Buy on Installments — Reliance Appliances Karachi`;
      const seo_desc    = `Buy the ${name} in Karachi. ${ac.size} Inverter AC. ${ac.refrigerant} refrigerant. Easy installments at Reliance Appliances.`;

      console.log(`  ${DRY_RUN ? 'WOULD INSERT' : 'INSERT'}  ${ac.model}  (${ac.series} ${ac.size})`);

      if (!DRY_RUN) {
        const { error: e } = await supabase.from('products').insert({
          id: randomUUID(),
          brand: 'EcoStar', model: ac.model, simplified_name: name,
          category: 'Air Conditioners', sub_category: 'Split AC',
          slug, specs, description, tags, seo_title, seo_desc,
          retail_price: 0, cash_floor: 0,
          stock_status: 'In Stock',
          thumbnail_url: null, gallery_urls: [],
          updated_at: new Date().toISOString(),
        });
        if (e) { console.error(`    ✗ ${e.message}`); continue; }
      }
      updated++;
      continue;
    }

    const specs       = buildSpecs(ac);
    const description = buildDescription(ac);
    const tags        = buildTags(ac);
    const name        = `EcoStar ${ac.series} ${ac.size} AC ${ac.model}`;
    const seo_title   = `${name} Price in Pakistan | Buy on Installments — Reliance Appliances Karachi`;
    const seo_desc    = `Buy the ${name} in Karachi. ${ac.size} Inverter AC — ${ac.type}. ${ac.refrigerant} refrigerant. Easy installments at Reliance Appliances.`;

    console.log(`  ${DRY_RUN ? 'WOULD UPDATE' : 'UPDATE'}  ${ac.model}  →  ${ac.series} ${ac.size}`);

    if (!DRY_RUN) {
      const { error: e } = await supabase.from('products').update({
        simplified_name: name,
        category: 'Air Conditioners',
        sub_category: 'Split AC',
        specs, description, tags, seo_title, seo_desc,
        updated_at: new Date().toISOString(),
      }).eq('id', dbProd.id);
      if (e) { console.error(`    ✗ ${e.message}`); continue; }
    }
    updated++;
  }

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`Updated : ${updated}`);
  console.log(`Not in DB: ${missing} (total catalogue models not found in database)`);
  console.log(`\nTo add missing EcoStar models: use Admin Panel → Import or add manually.`);
  if (DRY_RUN) console.log('\n(Dry run — run without --dry-run to apply)');
  console.log();
}

main().catch(err => { console.error(err); process.exit(1); });
