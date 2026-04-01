import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  'https://fdfjavyopbrfvwtjaerw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDE3MDAsImV4cCI6MjA4ODIxNzcwMH0.fXwGFR_e3xZ4trEbkcH8UQ6_oWcIn92UUUvkGuFajto'
);

async function run() {
  const results = [];

  // ── 1. Delete EcoStar zero-price NV/AR duplicates ──────────────
  const ecostarDupeIds = [
    '46e71994-f1ed-487f-a442-288072d5d399', // ES-24AR01
    '1d0a65e8-e350-4c42-9233-229a1cbbfe03', // ES-18NV01
    '56cc44a1-7253-49c8-9c42-1c1ceeeddf96', // ES-12NV01
    '48c42338-d15f-4fc3-ae75-4c448b1fa0ea', // ES-12AR02
    '15a217c9-b2a0-4fad-a10e-29eaa3eff067', // ES-24AR02
    'b9cfc978-774a-41a1-9279-d1ee2ca3680e', // ES-18AR02
    '8eba40d7-c19b-4d70-9d0b-2ea4490ed4b2', // ES-12AR01
    '6144fcbf-a241-4719-b674-91ae4f052c3b', // ES-12NV02
    '86a87a7f-d0a1-4744-afde-18c0240c651a', // ES-24NV02
    'e7204f2a-d3dd-4d01-a465-c44bec001cab', // ES-18NV02
    '933ea4aa-93d7-4cd6-b06b-2975b7b29cb6', // ES-24NV01
    '567396ad-a4a1-420c-9df7-6c676bc0b826', // ES-18AR01
  ];
  const r1 = await sb.from('products').delete().in('id', ecostarDupeIds);
  results.push(`EcoStar zero-price dupes deleted: ${r1.error ? 'ERROR: '+r1.error.message : (r1.count ?? 'ok')}`);

  // ── 2. Delete Haier HSU-12CFP/CM duplicate (keep 12CFCM at 102k) ──
  const r2 = await sb.from('products').delete().eq('id', 'haier-hsu-12cfp-cm');
  results.push(`HSU-12CFP/CM deleted: ${r2.error ? 'ERROR: '+r2.error.message : 'ok'}`);

  // ── 3. Fix GS-PIT10W models — set Inverter = Yes ──────────────
  const pitIds = ['gree-gs-18pit10w', 'gree-gs-12pit10w', 'gree-gs-24pit10w'];
  for (const id of pitIds) {
    const { data: prod } = await sb.from('products').select('specs').eq('id', id).single();
    if (prod) {
      const specs = { ...prod.specs, 'Inverter': 'Yes — DC Inverter (Variable Speed Compressor)' };
      const r = await sb.from('products').update({ specs }).eq('id', id);
      results.push(`${id} Inverter fixed: ${r.error ? 'ERROR: '+r.error.message : 'ok'}`);
    }
  }

  // ── 4. Haier 13HF series — add t3 to tags ──────────────────────
  const hfIds = [
    'haier-hsu-13hfs', 'haier-hsu-13hfs-w', 'haier-hsu-13hfs-g-s',
    'haier-hsu-13hfab', 'haier-hsu-13hfc', 'haier-hsu-13hfp',
  ];
  for (const id of hfIds) {
    const { data: prod } = await sb.from('products').select('tags').eq('id', id).single();
    if (prod && !prod.tags?.includes('t3')) {
      const newTags = (prod.tags || '') + ', t3, t3 ac, tropical rated';
      const r = await sb.from('products').update({ tags: newTags }).eq('id', id);
      results.push(`${id} T3 tag added: ${r.error ? 'ERROR: '+r.error.message : 'ok'}`);
    } else if (prod) {
      results.push(`${id} already has t3 tag`);
    }
  }

  // ── 5. Haier HSU-14HFTEX — also ensure T3 tag ─────────────────
  const { data: hftex } = await sb.from('products').select('tags').eq('id', 'haier-hsu-14hftex').single();
  if (hftex && !hftex.tags?.includes('t3')) {
    await sb.from('products').update({ tags: hftex.tags + ', t3, t3 ac, tropical rated' }).eq('id', 'haier-hsu-14hftex');
    results.push('haier-hsu-14hftex T3 tag added');
  }

  // ── 6. Dawlance REF 9106 capacity: fix to 6 Cu.Ft ─────────────
  const { data: ref9106 } = await sb.from('products').select('id,specs,simplified_name').eq('id', 'dawlance-ref-9106-sd-r-nd-silver-black').single();
  if (ref9106) {
    const specs9106 = { ...ref9106.specs, 'Capacity': '6 Cu.Ft (170 Litres approx.)' };
    const r = await sb.from('products').update({
      specs: specs9106,
      simplified_name: ref9106.simplified_name?.replace('4 Cu.Ft', '6 Cu.Ft')
    }).eq('id', 'dawlance-ref-9106-sd-r-nd-silver-black');
    results.push(`REF 9106 capacity fixed to 6 Cu.Ft: ${r.error ? 'ERROR: '+r.error.message : 'ok'}`);
  } else {
    results.push('REF 9106 not found');
  }

  // ── 7. Sprinter/Powercon deduplication ─────────────────────────
  // Delete the lower-priced/poorly-named duplicates, keep best-named entries
  const sprintPowerDupeIds = [
    'dawlance-sprinter-x-inverter-15',          // 118k dup of Sprinter X 15 (122k)
    'dawlance-sprinter-x-15-t3',                // 122k dup of SPRINTER T3 INVERTER 15 (124.5k)
    'dawlance-powercon-x-inverter-15',          // 118k dup of Powercon X 15 (122k)
    'dawlance-powercon-x-15-t3',                // 122k dup of POWERCON T3 INVERTER 15 (124.5k)
    'dawlance-split-ac-sprinter-x-inverter-30-t3', // 149k dup of SPRINTER T3 INVERTER 30 (152k)
    'dawlance-split-ac-powercon-series-30',     // 145.5k dup of POWERCON X INVERTER 30 (149k)
    'dawlance-powercon-x-inverter-30-t3-dawlance', // 149k dup of POWERCON T3 INVERTER 30 (152k)
  ];
  const r7 = await sb.from('products').delete().in('id', sprintPowerDupeIds);
  results.push(`Sprinter/Powercon dupes deleted: ${r7.error ? 'ERROR: '+r7.error.message : (r7.count ?? 'ok')}`);

  // ── 8. Update HSU-12CFCM simplified name (now it's the merged entry) ──
  const { data: cf } = await sb.from('products').select('simplified_name').eq('id', 'haier-hsu-12cfcm').single();
  if (cf) {
    results.push(`HSU-12CFCM current name: ${cf.simplified_name}`);
  }

  console.log('\n=== RESULTS ===');
  results.forEach(r => console.log(r));
}

run().catch(console.error);
