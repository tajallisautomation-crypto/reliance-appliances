/**
 * enrich_ac_tonnage_series.mjs
 * Fixes missing AC tonnage specs and enriches sub_category with
 * official series names from catalogs (EcoStar, Gree, Haier, Dawlance).
 */
import { createClient } from '@supabase/supabase-js';
const sb = createClient(
  'https://fdfjavyopbrfvwtjaerw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDE3MDAsImV4cCI6MjA4ODIxNzcwMH0.fXwGFR_e3xZ4trEbkcH8UQ6_oWcIn92UUUvkGuFajto'
);
await sb.auth.signInWithPassword({ email: 'tajallisautomation@gmail.com', password: 'Hammad123!' });

const { data: acs } = await sb.from('products')
  .select('id,brand,model,category,sub_category,specs')
  .or('category.ilike.*air condition*,category.ilike.*ton air*');

console.log(`Fetched ${acs.length} AC products`);

// ── Tonnage derivation from model + category ────────────────────────────────
function deriveTonnage(model, category, current) {
  // Only fix if missing/unknown
  if (current && current !== '?' && current.includes('Ton')) return null;

  const m = model.toUpperCase();
  const c = (category || '').toUpperCase();

  // EcoStar: ES-10=0.9T, ES-12=1T, ES-18=1.5T, ES-24=2T, EF-24=2T, EF-48=4T
  const esM = m.match(/^E[SF]-(\d+)/);
  if (esM) {
    const n = parseInt(esM[1]);
    if (n === 10) return '0.9 Ton';
    if (n === 12) return '1.0 Ton';
    if (n === 18) return '1.5 Ton';
    if (n === 24) return '2.0 Ton';
    if (n === 48) return '4.0 Ton';
  }

  // Gree: GF-24=2T, GF-36=3T, GF-48=4T, GF-60=5T; GS-12=1T, GS-18=1.5T, GS-24=2T
  const grM = m.match(/^G[SF]-(\d+)/);
  if (grM) {
    const n = parseInt(grM[1]);
    if (n === 12) return '1.0 Ton';
    if (n === 18) return '1.5 Ton';
    if (n === 24) return '2.0 Ton';
    if (n === 36) return '3.0 Ton';
    if (n === 48) return '4.0 Ton';
    if (n === 60) return '5.0 Ton';
  }

  // Haier split: HSU-10=0.9T, 12/13=1T, 14=1.2T, 18/19=1.5T, 20=1.7T, 24=2T
  const haM = m.match(/^HSU-(\d+)/);
  if (haM) {
    const n = parseInt(haM[1]);
    if (n === 10) return '0.9 Ton';
    if (n === 12 || n === 13) return '1.0 Ton';
    if (n === 14) return '1.2 Ton';
    if (n === 18 || n === 19) return '1.5 Ton';
    if (n === 20) return '1.7 Ton';
    if (n === 24) return '2.0 Ton';
  }

  // Haier commercial: HPU-24=2T, HPU-48=4T, HPU-96=8T
  const hpM = m.match(/^HPU-(\d+)/);
  if (hpM) {
    const n = parseInt(hpM[1]);
    if (n === 24) return '2.0 Ton';
    if (n === 48) return '4.0 Ton';
    if (n === 96) return '8.0 Ton';
  }

  // Gree CHARMO (stored without GS prefix): 12CM=1T, 18CM=1.5T, 24CM=2T
  const cmM = m.match(/^(\d+)CM/);
  if (cmM) {
    const n = parseInt(cmM[1]);
    if (n === 12) return '1.0 Ton';
    if (n === 18) return '1.5 Ton';
    if (n === 24) return '2.0 Ton';
  }

  // Dawlance floor standing (45 suffix = 3.5 ton class)
  if (/\b45\b/.test(m) && (m.includes('FS') || m.includes('GALLANT') || m.includes('GLAMOUR') || m.includes('CHROME'))) {
    return '3.5 Ton';
  }

  // Dawlance FROST INVERTER 20 = 1.5 Ton
  if (/FROST.*\b20\b/.test(m) || (/\b20\b/.test(m) && c.includes('1.5'))) return '1.5 Ton';

  return null;
}

// ── Series name derivation ─────────────────────────────────────────────────
function deriveSeries(brand, model, currentSub) {
  const b = (brand || '').toLowerCase();
  const m = model.toUpperCase();

  if (b === 'ecostar') {
    if (/EMC/.test(m))                          return 'Cool Only';
    if (/^ES-\d+PR/.test(m))                    return 'Prince T3';
    if (/^ES-\d+NV/.test(m) && /02/.test(m))    return 'Nova Max T3';
    if (/^ES-\d+AR/.test(m) && /02/.test(m))    return 'Ario Max T3';
    if (/^ES-\d+NV/.test(m))                    return 'Nova T3';
    if (/^ES-\d+AR/.test(m))                    return 'Ario T3';
    if (/^ES-\d+EM/.test(m))                    return 'Emperor';
    if (/^ES-\d+DU/.test(m))                    return 'Duke';
    if (/^EF-\d+GL/.test(m))                    return 'Glacier FSU';
    if (/^EF-\d+IB/.test(m))                    return 'Iceberg FSU';
    return currentSub;
  }

  if (b === 'gree') {
    if (/ZITH/.test(m))                         return 'Ultra T3';
    if (/AITH/.test(m))                         return 'Amy T3';
    if (/PITH1[5678]/.test(m))                  return 'Polar T3';
    if (/PITH1[14]/.test(m))                    return 'Polar';
    if (/PIT10/.test(m))                        return 'Pular';
    if (/^(\d+CM|GS-\d+CM)/.test(m))           return 'Charmo';
    if (/TFIH|VTFI/.test(m))                    return 'Floor Standing T3';
    if (/^GF-/.test(m))                         return 'Floor Standing';
    return currentSub;
  }

  if (b === 'haier') {
    if (/HSU-\d+LF/.test(m))                   return 'Aurelia LF - Cool Only Inverter';
    if (/HSU-\d+CF/.test(m))                   return 'CF - Cool Only';
    if (/HFTCA|HFTCD/.test(m))                 return 'HFT - Cool Only Inverter';
    if (/HFTEX/.test(m))                       return 'Extreme - Heat & Cool Inverter';
    if (/HSU-\d+HFP/.test(m))                 return 'HFP - Cool Only Inverter';
    if (/HSU-\d+HFS/.test(m))                 return 'HFS - Cool Only';
    if (/HSU-\d+HFC/.test(m))                 return 'HFC - Heat & Cool';
    if (/HSU-\d+HFAB/.test(m))               return 'HFAB - Heat & Cool';
    if (/^HPU-/.test(m))                       return 'Commercial AC';
    return currentSub;
  }

  if (b === 'dawlance') {
    const UP = m;
    if (/FROST/.test(UP) && !/T3/.test(UP))    return 'Frost - Cool Only Inverter';
    if (/ATMOS.*T3/.test(UP))                  return 'Atmos T3';
    if (/ENERCON.*T3/.test(UP))               return 'Enercon T3';
    if (/HYPER.*T3/.test(UP))                 return 'Hyper T3';
    if (/INSPIRE.*T3/.test(UP))              return 'Inspire Pro T3';
    if (/MAGNA.*T3/.test(UP))               return 'Magna T3';
    if (/MEGA.*T3.*PRO/.test(UP))           return 'Mega T3 Pro';
    if (/MEGA.*T3/.test(UP))               return 'Mega T3';
    if (/POWERCON.*T3/.test(UP) && /INVERTER/.test(UP)) return 'Powercon T3';
    if (/SPRINTER.*T3/.test(UP) || (/SPLIT.*SPRINTER.*T3/.test(UP))) return 'Sprinter T3';
    if (/POWERCON.*X.*\bT3\b/.test(UP))   return 'Powercon X T3';
    if (/SPRINTER.*X.*\bT3\b/.test(UP))   return 'Sprinter X T3';
    if (/CRUISE PLUS/.test(UP))            return 'Cruise Plus';
    if (/ELEGANCE PRO/.test(UP))           return 'Elegance Pro';
    if (/ELEGANCE X/.test(UP))            return 'Elegance X';
    if (/ELEGANCE/.test(UP))             return 'Elegance';
    if (/ECONO\+ X|ECONO\+X/.test(UP))  return 'Econo+ X';
    if (/AURA X/.test(UP))               return 'Aura X';
    if (/AVANTE/.test(UP))               return 'Avante';
    if (/CHILLEX/.test(UP))              return 'Chillex';
    if (/PRIMA/.test(UP))               return 'Prima PurSense';
    if (/EXCEL/.test(UP))               return 'Excel';
    if (/MAGNA/.test(UP))               return 'Magna';
    if (/MEGA FLEX/.test(UP))           return 'Mega Flex';
    if (/MEGA T[+-]/.test(UP))          return 'Mega T';
    if (/POWERCON X/.test(UP))          return 'Powercon X';
    if (/SPRINTER X/.test(UP))          return 'Sprinter X';
    if (/SUAVE/.test(UP))               return 'Suave+';
    if (/CHROME/.test(UP))              return 'Chrome+';
    if (/GALLANT.*FS/.test(UP))         return 'Gallant Floor Standing';
    if (/GLAMOUR.*FS|GLAMOUR.*\b45\b/.test(UP)) return 'Glamour Floor Standing';
    if (/INFINITY PRO/.test(UP))        return 'Infinity Pro';
    if (/AEROMAX/.test(UP))            return 'Aeromax';
    if (/EXTREME/.test(UP))            return 'Extreme';
    if (/SPLIT AC POWERCON/.test(UP))  return 'Powercon';
    if (/ECONO/.test(UP))              return 'Econo';
    return currentSub;
  }

  return currentSub;
}

let tonCount = 0, subCount = 0, errCount = 0;

for (const p of acs) {
  const s = p.specs || {};
  const update = {};
  let changed = false;

  // Tonnage fix
  const newTon = deriveTonnage(p.model, p.category, s['Tonnage']);
  if (newTon) {
    update.specs = { ...s, Tonnage: newTon };
    tonCount++;
    changed = true;
  }

  // Sub-category series
  const newSub = deriveSeries(p.brand, p.model, p.sub_category);
  if (newSub && newSub !== p.sub_category) {
    update.sub_category = newSub;
    subCount++;
    changed = true;
  }

  if (!changed) continue;

  const { error } = await sb.from('products').update(update).eq('id', p.id);
  if (error) { console.error(`FAIL ${p.brand} ${p.model}: ${error.message}`); errCount++; }
  else {
    const parts = [];
    if (newTon) parts.push(`Ton:${s['Tonnage']||'?'}=>${newTon}`);
    if (newSub && newSub !== p.sub_category) parts.push(`Series:${(p.sub_category||'null').slice(0,20)}=>${newSub}`);
    console.log(`  ✓ ${p.brand.padEnd(10)} ${p.model.padEnd(42)} ${parts.join(' | ')}`);
  }
}

console.log(`\nTonnage fixed: ${tonCount} | Series updated: ${subCount} | Errors: ${errCount}`);
