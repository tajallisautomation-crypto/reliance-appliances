import { createClient } from '@supabase/supabase-js';
const sb = createClient(
  'https://fdfjavyopbrfvwtjaerw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDE3MDAsImV4cCI6MjA4ODIxNzcwMH0.fXwGFR_e3xZ4trEbkcH8UQ6_oWcIn92UUUvkGuFajto'
);
await sb.auth.signInWithPassword({ email: 'tajallisautomation@gmail.com', password: 'Hammad123!' });

// ── Haier HDF capacity/door/inverter map ─────────────────────────────────────
// Capacity based on model number (liters ≈ model number value)
// Door type from Jan-26 Karachi Branch NTD structure:
//   S.D section: HDF-175, 245, 285, 345, 385, 405, 465 → Single Door
//   DD section: HDF-230, 320 (70% Freezer/30% Fridge), HDF-535, 545 → Double Door
const haierFreezerMap = {
  'haier-hdf-175-inverter':  { liters: 175, cuft: 6.2,  door: 'Single Door',  inv: true,  glass: false },
  'haier-hdf-230-inverter':  { liters: 230, cuft: 8.1,  door: 'Double Door',  inv: true,  glass: false, combo: true },
  'haier-hdf-245inv-ig':     { liters: 245, cuft: 8.7,  door: 'Single Door',  inv: true,  glass: true  },
  'haier-hdf-285-sd':        { liters: 285, cuft: 10.1, door: 'Single Door',  inv: false, glass: false },
  'haier-hdf-285-inv-ig':    { liters: 285, cuft: 10.1, door: 'Single Door',  inv: true,  glass: true  },
  'haier-hdf-320-inverter':  { liters: 320, cuft: 11.3, door: 'Double Door',  inv: true,  glass: false, combo: true },
  'haier-hdf-345-sd':        { liters: 345, cuft: 12.2, door: 'Single Door',  inv: false, glass: false },
  'haier-hdf-345-inv-ig':    { liters: 345, cuft: 12.2, door: 'Single Door',  inv: true,  glass: true  },
  'haier-hdf-385-h':         { liters: 385, cuft: 13.6, door: 'Single Door',  inv: false, glass: false },
  'haier-hdf-385-i':         { liters: 385, cuft: 13.6, door: 'Single Door',  inv: true,  glass: false },
  'haier-hdf-385-ig':        { liters: 385, cuft: 13.6, door: 'Single Door',  inv: true,  glass: true  },
  'haier-hdf-405-i':         { liters: 405, cuft: 14.3, door: 'Single Door',  inv: true,  glass: false },
  'haier-hdf-405-sd':        { liters: 405, cuft: 14.3, door: 'Single Door',  inv: false, glass: false },
  'haier-hdf-405-ig':        { liters: 405, cuft: 14.3, door: 'Single Door',  inv: true,  glass: true  },
  'haier-hdf-465-i':         { liters: 465, cuft: 16.4, door: 'Single Door',  inv: true,  glass: false },
  'haier-hdf-465-ig':        { liters: 465, cuft: 16.4, door: 'Single Door',  inv: true,  glass: true  },
  'haier-hdf-535-i':         { liters: 535, cuft: 18.9, door: 'Double Door',  inv: true,  glass: false },
  'haier-hdf-535-ig':        { liters: 535, cuft: 18.9, door: 'Double Door',  inv: true,  glass: true  },
  'haier-hdf-545-dd':        { liters: 545, cuft: 19.2, door: 'Double Door',  inv: false, glass: false },
  'haier-hdf-545-i':         { liters: 545, cuft: 19.2, door: 'Double Door',  inv: true,  glass: false },
};

// ── Dawlance freezer map ──────────────────────────────────────────────────────
// DF = Deep Freezer (Chest), VF = Vertical Freezer, CF = Convertible Chest Freezer
// SD in name = Single Door, DD in name = Double Door
const dawlanceFreezerMap = {
  // DF-200 series (~200L = ~7 cu.ft) — Single Door Chest
  'dawlance-df-200p-stucco-pcm-arc-p1-white':     { liters: 200, cuft: 7.1, door: 'Single Door', inv: false, type: 'Chest Freezer' },
  'dawlance-df-200-es-gd-wicker-cham':             { liters: 200, cuft: 7.1, door: 'Single Door', inv: false, type: 'Chest Freezer', glass: true },
  'dawlance-df-200-sd-inverter-white':             { liters: 200, cuft: 7.1, door: 'Single Door', inv: true,  type: 'Chest Freezer' },
  'dawlance-df-200-d-solar-line-arc-white':        { liters: 200, cuft: 7.1, door: 'Single Door', inv: false, type: 'Chest Freezer' },
  // DF-300 series (~300L = ~10.6 cu.ft) — Single Door Chest
  'dawlance-df-300p-stucco-pcm-arc-p1-white':     { liters: 300, cuft: 10.6, door: 'Single Door', inv: false, type: 'Chest Freezer' },
  'dawlance-df-300-sd-inverter-grey':              { liters: 300, cuft: 10.6, door: 'Single Door', inv: true,  type: 'Chest Freezer' },
  'dawlance-df-300p-inverter-existing':            { liters: 300, cuft: 10.6, door: 'Single Door', inv: true,  type: 'Chest Freezer' },
  // DF-400 series (~400L = ~14.1 cu.ft) — Single Door Chest
  'dawlance-df-400p-stucco-pcm-arc-p1-white':     { liters: 400, cuft: 14.1, door: 'Single Door', inv: false, type: 'Chest Freezer' },
  'dawlance-df-400-sd-eds-arc-p1-white':           { liters: 400, cuft: 14.1, door: 'Single Door', inv: false, type: 'Chest Freezer' },
  'dawlance-df-400-sd-inverter-grey':              { liters: 400, cuft: 14.1, door: 'Single Door', inv: true,  type: 'Chest Freezer' },
  'dawlance-df-400p-inverter-existing':            { liters: 400, cuft: 14.1, door: 'Single Door', inv: true,  type: 'Chest Freezer' },
  // DF-500 series (~500L = ~17.6 cu.ft) — Double Door
  'dawlance-df-500-dd-stucco-pcm-arc-p1-white':   { liters: 500, cuft: 17.6, door: 'Double Door', inv: false, type: 'Chest Freezer' },
  'dawlance-df-500-commercial':                    { liters: 500, cuft: 17.6, door: 'Double Door', inv: false, type: 'Commercial Chest Freezer' },
  'dawlance-df-500-dd-inverter-white':             { liters: 500, cuft: 17.6, door: 'Double Door', inv: true,  type: 'Chest Freezer' },
  // CF-91997 series (~300L) — Convertible / Chest
  'dawlance-sign-new-outlook-cf-91997-lvs':        { liters: 300, cuft: 10.6, door: 'Single Door', inv: false, type: 'Chest Freezer', convertible: false },
  'dawlance-sig-new-outlook-pcm-for-cf-91997-inverter': { liters: 300, cuft: 10.6, door: 'Single Door', inv: true, type: 'Chest Freezer', convertible: false },
  'dawlance-convertible-cf-91997-lvs':             { liters: 300, cuft: 10.6, door: 'Single Door', inv: false, type: 'Convertible Freezer/Refrigerator', convertible: true },
  // CF-91998 series (~400L) — Convertible / Chest
  'dawlance-sign-new-outlook-cf-91998-lvs':        { liters: 400, cuft: 14.1, door: 'Single Door', inv: false, type: 'Chest Freezer', convertible: false },
  'dawlance-sig-new-outlook-pcm-for-cf-91998-inverter': { liters: 400, cuft: 14.1, door: 'Single Door', inv: true, type: 'Chest Freezer', convertible: false },
  'dawlance-convertible-cf-91998-lvs':             { liters: 400, cuft: 14.1, door: 'Single Door', inv: false, type: 'Convertible Freezer/Refrigerator', convertible: true },
  'dawlance-91998-h-signa-inverter-gd-wicker-cham': { liters: 400, cuft: 14.1, door: 'Single Door', inv: true, type: 'Chest Freezer', glass: true },
  // VF-1035 series (~360L) — Vertical/Upright
  'dawlance-vf-1035wb-gd':           { liters: 360, cuft: 12.7, door: 'Single Door', inv: false, type: 'Vertical / Upright Deep Freezer', glass: true },
  'dawlance-vf-1035wb-gd-avante':    { liters: 360, cuft: 12.7, door: 'Single Door', inv: false, type: 'Vertical / Upright Deep Freezer', glass: true },
  'dawlance-vf-1035wb-gd-cloud-white': { liters: 360, cuft: 12.7, door: 'Single Door', inv: false, type: 'Vertical / Upright Deep Freezer', glass: true },
  // VF-1045 CVT — Convertible Vertical (~370L)
  'dawlance-vf-1045-cvt':            { liters: 370, cuft: 13.1, door: 'Single Door', inv: false, type: 'Convertible Vertical Freezer', convertible: true },
};

function buildSpecs(id, info, isHaier) {
  const isInv = info.inv;
  const litersStr = `${info.liters} Litres`;
  const cuftStr = `${info.cuft} Cu.Ft (${info.liters} Litres)`;

  const base = {
    'Type': info.type || (info.door === 'Double Door' ? 'Double Door Chest Freezer' : 'Single Door Chest Freezer'),
    'Door Type': info.door,
    'Capacity': cuftStr,
    'Inverter': isInv ? 'Yes' : 'No',
    'Compressor': isInv ? 'Inverter Compressor (Variable Speed, Energy Saving)' : 'Conventional Compressor',
    'Refrigerant': 'R600a (Zero Ozone Depletion)',
    'Power Supply': '220V / 50Hz',
    'Climate Class': 'T — Tropical (Designed for Pakistan)',
    'Interior Light': 'LED',
  };
  if (isInv) {
    base['Voltage Tolerance'] = '130V – 260V (No Stabilizer Required)';
    base['Inverter Technology'] = 'Yes — up to 40% energy saving';
  }
  if (info.glass) base['Glass Lid'] = 'Yes — tempered glass lid';
  if (info.combo) base['Configuration'] = '70% Freezer / 30% Refrigerator (Combination Unit)';
  if (info.convertible) base['Convertible'] = 'Yes — can switch between Freezer and Refrigerator mode';
  return base;
}

const allMap = { ...haierFreezerMap, ...dawlanceFreezerMap };
let updated = 0;

for (const [id, info] of Object.entries(allMap)) {
  const isHaier = id.startsWith('haier-');
  const { data: cur } = await sb.from('products').select('specs,simplified_name').eq('id', id).single();
  if (!cur) { console.warn('NOT FOUND:', id); continue; }

  const newSpecs = buildSpecs(id, info, isHaier);
  const { error } = await sb.from('products').update({ specs: newSpecs }).eq('id', id);
  if (error) { console.error(`ERR ${id}:`, error.message); }
  else { updated++; process.stdout.write('.'); }
}

console.log(`\n✓ ${updated} freezers updated\n`);

// ── Verification ──
const { data: after } = await sb.from('products')
  .select('id,brand,model,specs')
  .ilike('category', '%freez%')
  .order('brand');

const byBrand = {};
for (const p of after) { if (!byBrand[p.brand]) byBrand[p.brand]=[]; byBrand[p.brand].push(p); }

for (const [brand, ps] of Object.entries(byBrand)) {
  const noCap = ps.filter(p => !p.specs?.Capacity);
  const noDoor = ps.filter(p => !p.specs?.['Door Type']);
  const inv = ps.filter(p => p.specs?.Inverter === 'Yes').length;
  const sd = ps.filter(p => p.specs?.['Door Type'] === 'Single Door').length;
  const dd = ps.filter(p => p.specs?.['Door Type'] === 'Double Door').length;
  console.log(`${brand}: ${ps.length} total | ${sd} SD | ${dd} DD | ${inv} inverter | ${noCap.length} missing cap | ${noDoor.length} missing door`);
}
