/**
 * Sales Catalog utilities — for internal salesperson use.
 * Groups products by fine-grained spec for WhatsApp sharing and print cards.
 */

import type { Product } from './api';
import { COMPANY } from './config';

// ── Spec extractors ────────────────────────────────────────────────────────────

/** Extract exact Cu.Ft value from text, rounded to nearest integer. */
function parseCuFt(text: string): number | null {
  const m = text.match(/(\d{1,2}(?:\.\d)?)\s*(?:cu\.?\s*ft|cft)/i);
  return m ? Math.round(parseFloat(m[1])) : null;
}

// ── AC grouping — tonnage × function × technology ─────────────────────────────

function extractACGroup(p: Product): string {
  const text = `${p.simplified_name} ${p.category} ${p.sub_category} ${p.tags}`.toLowerCase();

  // Tonnage
  let tonnage = '';
  if (/2\.5\s*ton/.test(text))     tonnage = '2.5 Ton';
  else if (/2\s*ton/.test(text))   tonnage = '2 Ton';
  else if (/1\.8\s*ton/.test(text))tonnage = '1.8 Ton';
  else if (/1\.5\s*ton/.test(text))tonnage = '1.5 Ton';
  else if (/1\s*ton/.test(text))   tonnage = '1 Ton';
  else                             tonnage = 'Other';

  // Cooling function
  const isHeatCool = /heat|heating|h&c|heat.cool|hc\b|dual|dc inverter.*heat|heat.*cool/i.test(text);
  const func       = isHeatCool ? 'Heat & Cool' : 'Cool Only';

  // Technology
  const isInverter = text.includes('inverter');
  const isT3       = /t3\b|tropical|t3ac/i.test(text);

  let tech = '';
  if (isInverter && isT3) tech = 'Inverter T3';
  else if (isInverter)    tech = 'Inverter';
  else                    tech = 'Fixed Speed';

  return `${tonnage} ${func} ${tech}`;
}

const AC_GROUP_ORDER = [
  '1 Ton Cool Only Inverter',   '1 Ton Cool Only Inverter T3',   '1 Ton Cool Only Fixed Speed',
  '1 Ton Heat & Cool Inverter', '1 Ton Heat & Cool Inverter T3', '1 Ton Heat & Cool Fixed Speed',
  '1.5 Ton Cool Only Inverter', '1.5 Ton Cool Only Inverter T3', '1.5 Ton Cool Only Fixed Speed',
  '1.5 Ton Heat & Cool Inverter','1.5 Ton Heat & Cool Inverter T3','1.5 Ton Heat & Cool Fixed Speed',
  '1.8 Ton Cool Only Inverter', '1.8 Ton Heat & Cool Inverter',
  '2 Ton Cool Only Inverter',   '2 Ton Cool Only Inverter T3',   '2 Ton Cool Only Fixed Speed',
  '2 Ton Heat & Cool Inverter', '2 Ton Heat & Cool Inverter T3',
  '2.5 Ton Cool Only Inverter', '2.5 Ton Heat & Cool Inverter',
  'Other Cool Only Inverter',   'Other Heat & Cool Inverter',    'Other',
];

// ── Fridge grouping — Cu.Ft × glass door × inverter × IoT ────────────────────

function extractFridgeGroup(p: Product): string {
  const text = `${p.simplified_name} ${p.specs?.['Capacity'] || ''} ${p.tags} ${p.sub_category}`;
  const cf   = parseCuFt(text);
  const t    = text.toLowerCase();

  const sizeLabel = cf !== null ? `${cf} Cu.Ft` : 'Other';
  const hasGlass   = t.includes('glass');
  const hasInverter = t.includes('inverter');
  const hasIoT     = /iot|smart|wi-?fi|connected/i.test(t);

  let feat = '';
  if (hasGlass)   feat += ' Glass Door';
  if (hasInverter) feat += ' Inverter';
  if (hasIoT)     feat += ' IoT';

  return `${sizeLabel}${feat}`.trim();
}

// ── Freezer grouping — type × capacity ───────────────────────────────────────

function extractFreezerGroup(p: Product): string {
  const text = `${p.simplified_name} ${p.category} ${p.sub_category}`.toLowerCase();
  const specs = `${p.specs?.['Capacity'] || ''} ${p.simplified_name}`;
  const liters = (() => {
    const m = specs.match(/(\d{2,3})\s*[Ll]/);
    return m ? parseInt(m[1]) : null;
  })();

  const type = text.includes('upright') || text.includes('vertical') ? 'Upright'
    : text.includes('chest') ? 'Chest'
    : 'Deep';

  const cap = liters !== null ? ` ${liters}L` : '';
  return `${type} Freezer${cap}`;
}

// ── Washing grouping — type × kg ─────────────────────────────────────────────

function extractWashingGroup(p: Product): string {
  const s    = `${p.simplified_name} ${p.category} ${p.sub_category}`.toLowerCase();
  const kgM  = `${p.simplified_name} ${p.tags}`.match(/(\d{1,2}(?:\.\d)?)\s*kg/i);
  const kg   = kgM ? `${parseFloat(kgM[1])}kg` : '';

  const type =
    s.includes('spinner') || s.includes('spin dryer')    ? 'Spinner / Spin Dryer' :
    s.includes('front load') || s.includes('front-load') ? `Front Load${kg ? ' ' + kg : ''}` :
    s.includes('top load') || s.includes('top-load')     ? `Top Load${kg ? ' ' + kg : ''}` :
    s.includes('fully') || s.includes('automatic')       ? `Fully Automatic${kg ? ' ' + kg : ''}` :
    s.includes('semi') || s.includes('twin tub')         ? `Semi-Automatic${kg ? ' ' + kg : ''}` :
    `Washing Machine${kg ? ' ' + kg : ''}`;

  return type;
}

// ── TV grouping — screen size × tech ─────────────────────────────────────────

function extractTVGroup(p: Product): string {
  const text = `${p.simplified_name} ${p.tags} ${p.specs?.['Screen Size'] || ''}`;
  const sizeM = text.match(/(\d{2,3})\s*(?:"|inch|"|\bin\b)/i);
  const size  = sizeM ? parseInt(sizeM[1]) : 0;
  const t     = text.toLowerCase();

  const sizeLabel = size > 0 ? `${size}"` : 'Other';
  const tech  =
    t.includes('qled')   ? 'QLED' :
    t.includes('oled')   ? 'OLED' :
    t.includes('4k') || t.includes('uhd') ? '4K Smart LED' :
    t.includes('fhd') || t.includes('full hd') ? 'FHD Smart LED' :
    t.includes('hd')     ? 'HD LED' :
    t.includes('smart')  ? 'Smart LED' :
    'LED';

  return `${sizeLabel} ${tech}`;
}

const TV_GROUP_ORDER_FN = (keys: string[]) => {
  // Sort by screen size numerically then by tech
  return [...keys].sort((a, b) => {
    const sa = parseInt(a) || 999;
    const sb = parseInt(b) || 999;
    return sa - sb;
  });
};

// ── Microwave grouping — litres × grill/convection ───────────────────────────

function extractMicrowaveGroup(p: Product): string {
  const text = `${p.specs?.['Capacity'] || ''} ${p.simplified_name}`;
  const m    = text.match(/(\d{2,3})\s*[Ll]/);
  const liters = m ? parseInt(m[1]) : 0;

  const t = `${p.simplified_name} ${p.tags}`.toLowerCase();
  const hasGrill = t.includes('grill');
  const hasConv  = t.includes('convection') || t.includes('conv');

  let type = '';
  if (hasConv && hasGrill) type = ' Grill + Convection';
  else if (hasGrill)       type = ' with Grill';
  else if (hasConv)        type = ' Convection';

  const cap = liters > 0 ? `${liters}L` : 'Other';
  return `${cap}${type}`;
}

// ── Solar grouping — system type ─────────────────────────────────────────────

function extractSolarGroup(p: Product): string {
  const s = `${p.simplified_name} ${p.category} ${p.tags}`.toLowerCase();
  if (s.includes('battery') || s.includes('lithium'))          return 'Battery / Storage';
  if (s.includes('off-grid') || s.includes('off grid'))        return 'Off-Grid System';
  if (s.includes('hybrid'))                                    return 'On-Grid / Hybrid';
  if (s.includes('on-grid') || s.includes('on grid'))          return 'On-Grid System';
  if (s.includes('panel') || s.includes('plate'))              return 'Solar Panels';
  if (s.includes('inverter'))                                  return 'Solar Inverter';
  return 'Solar Products';
}

// ── Kitchen grouping — by sub-category ───────────────────────────────────────

function extractKitchenGroup(p: Product): string {
  const sc = p.sub_category || '';
  if (sc) return sc;
  const t = p.simplified_name.toLowerCase();
  if (t.includes('blender') || t.includes('juicer')) return 'Blenders & Juicers';
  if (t.includes('processor') || t.includes('chopper')) return 'Food Processors';
  if (t.includes('kettle')) return 'Electric Kettles';
  if (t.includes('toaster') || t.includes('sandwich')) return 'Toasters & Sandwich Makers';
  if (t.includes('air fry')) return 'Air Fryers';
  if (t.includes('iron')) return 'Steam Irons';
  if (t.includes('mixer') || t.includes('hand blend')) return 'Mixers & Hand Blenders';
  if (t.includes('rice')) return 'Rice Cookers';
  return p.category;
}

// ── Category config ───────────────────────────────────────────────────────────

export interface CatalogCategory {
  id:          string;
  label:       string;
  emoji:       string;
  catParam:    string;
  groupFn:     (p: Product) => string;
  groupOrder?: string[];
  sortGroupsFn?: (keys: string[]) => string[];
}

export const CATALOG_CATEGORIES: CatalogCategory[] = [
  {
    id: 'ac', label: 'Air Conditioners', emoji: '❄️', catParam: 'ac',
    groupFn: extractACGroup,
    groupOrder: AC_GROUP_ORDER,
  },
  {
    id: 'fridge', label: 'Refrigerators', emoji: '🧊', catParam: 'fridge',
    groupFn: extractFridgeGroup,
    sortGroupsFn: (keys) => [...keys].sort((a, b) => {
      const na = parseInt(a) || 999;
      const nb = parseInt(b) || 999;
      return na !== nb ? na - nb : a.localeCompare(b);
    }),
  },
  {
    id: 'freezer', label: 'Freezers', emoji: '🥶', catParam: 'freezer',
    groupFn: extractFreezerGroup,
    sortGroupsFn: (keys) => [...keys].sort(),
  },
  {
    id: 'washing', label: 'Washing Machines', emoji: '👕', catParam: 'washing',
    groupFn: extractWashingGroup,
    groupOrder: ['Fully Automatic', 'Top Load', 'Front Load', 'Semi-Automatic', 'Spinner / Spin Dryer'],
    sortGroupsFn: (keys) => [...keys].sort((a, b) => {
      // group by type first, then by kg within type
      const typeOrder = ['Fully Automatic', 'Top Load', 'Front Load', 'Semi-Automatic', 'Spinner'];
      const ta = typeOrder.findIndex(t => a.startsWith(t));
      const tb = typeOrder.findIndex(t => b.startsWith(t));
      if (ta !== tb) return (ta === -1 ? 99 : ta) - (tb === -1 ? 99 : tb);
      return a.localeCompare(b);
    }),
  },
  {
    id: 'tv', label: 'Televisions', emoji: '📺', catParam: 'tv',
    groupFn: extractTVGroup,
    sortGroupsFn: TV_GROUP_ORDER_FN,
  },
  {
    id: 'microwave', label: 'Microwave Ovens', emoji: '📡', catParam: 'microwave',
    groupFn: extractMicrowaveGroup,
    sortGroupsFn: (keys) => [...keys].sort((a, b) => {
      const na = parseInt(a) || 999;
      const nb = parseInt(b) || 999;
      return na !== nb ? na - nb : a.localeCompare(b);
    }),
  },
  {
    id: 'solar', label: 'Solar Solutions', emoji: '☀️', catParam: 'solar',
    groupFn: extractSolarGroup,
    groupOrder: ['On-Grid / Hybrid', 'On-Grid System', 'Off-Grid System', 'Battery / Storage', 'Solar Panels', 'Solar Inverter', 'Solar Products'],
  },
  {
    id: 'kitchen', label: 'Kitchen Appliances', emoji: '🍳', catParam: 'kitchen',
    groupFn: extractKitchenGroup,
    sortGroupsFn: (keys) => [...keys].sort(),
  },
];

// ── Grouping ──────────────────────────────────────────────────────────────────

export function groupBySpec(products: Product[], cat: CatalogCategory): Map<string, Product[]> {
  const map = new Map<string, Product[]>();
  for (const p of products) {
    const key = cat.groupFn(p) || 'Other';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(p);
  }

  // Determine order
  let keys: string[];
  if (cat.groupOrder) {
    // Preset order first, then any remaining keys
    const preset = cat.groupOrder.filter(k => map.has(k));
    const rest   = [...map.keys()].filter(k => !cat.groupOrder!.includes(k)).sort();
    keys = [...preset, ...rest];
  } else if (cat.sortGroupsFn) {
    keys = cat.sortGroupsFn([...map.keys()]);
  } else {
    keys = [...map.keys()].sort();
  }

  const ordered = new Map<string, Product[]>();
  for (const k of keys) { if (map.has(k)) ordered.set(k, map.get(k)!); }
  // Catch any keys not in order list
  for (const [k, v] of map) { if (!ordered.has(k)) ordered.set(k, v); }
  return ordered;
}

// ── Key spec extraction ───────────────────────────────────────────────────────

/** Returns 2–3 most relevant spec values for the given category. */
export function getKeySpecs(p: Product, catId: string): string[] {
  const s = p.specs || {};
  const pick = (...keys: string[]) =>
    keys.map(k => s[k]).filter(Boolean) as string[];

  switch (catId) {
    case 'ac':
      return pick('Cooling Capacity', 'Energy Efficiency', 'Refrigerant').slice(0, 3);
    case 'fridge':
      return pick('Capacity', 'Energy Rating', 'Compressor Warranty').slice(0, 3);
    case 'freezer':
      return pick('Capacity', 'Energy Rating').slice(0, 2);
    case 'washing':
      return pick('Capacity', 'Spin Speed', 'Motor Type').slice(0, 3);
    case 'tv':
      return pick('Screen Size', 'Resolution', 'Display Technology').slice(0, 3);
    case 'microwave':
      return pick('Capacity', 'Power Output', 'Grill').slice(0, 3);
    case 'solar':
      return pick('Power Output', 'Capacity', 'Battery Type').slice(0, 3);
    default: {
      // Generic: first 2 non-empty, short spec values
      return Object.values(s).filter(v => v && v.length < 35).slice(0, 2) as string[];
    }
  }
}

// ── Message builders ──────────────────────────────────────────────────────────

function fmt(n: number) { return Math.round(n || 0).toLocaleString('en-PK'); }

export function buildCategoryWAMessage(cat: CatalogCategory, grouped: Map<string, Product[]>): string {
  const lines = [
    `*${cat.emoji} ${cat.label} — ${COMPANY}*`,
    `_Karachi's trusted appliance partner since 2015_`,
    '',
  ];
  for (const [group, products] of grouped) {
    if (!products.length) continue;
    lines.push(`*── ${group} ──*`);
    for (const p of products.slice(0, 10)) {
      const price  = p.price.cash_floor || p.price.retail;
      const plan3m = p.installments?.['3m'];
      const inst   = plan3m ? ` | 3m: ${fmt(plan3m.monthly)}/mo` : '';
      const specs  = getKeySpecs(p, cat.id).join(' · ');
      const specStr = specs ? `\n   _${specs}_` : '';
      lines.push(`• *${p.model}* — ${p.simplified_name}${specStr}`);
      lines.push(`   💰 PKR ${fmt(price)}${inst}${p.warranty ? ` | ${p.warranty}` : ''}`);
    }
    if (products.length > 10) lines.push(`  _(+${products.length - 10} more models)_`);
    lines.push('');
  }
  lines.push(`📞 0370-2578788  |  0335-4266238`);
  lines.push(`✅ Free delivery Karachi  ·  Genuine warranty  ·  Easy installments`);
  return lines.join('\n');
}

export function buildMegaWAMessage(allData: { cat: CatalogCategory; products: Product[] }[]): string {
  const lines = [
    `*📋 Full Catalogue — ${COMPANY}*`,
    `_Karachi's trusted home appliance partner since 2015_`,
    '',
  ];
  for (const { cat, products } of allData) {
    lines.push(`${cat.emoji} *${cat.label}* — ${products.length} products`);
  }
  lines.push('');
  lines.push(`Ask for any category list with full specs, prices & installment plans!`);
  lines.push(`📞 0370-2578788  |  wa.me/923702578788`);
  lines.push(`✅ Free delivery  ·  Genuine  ·  Easy installments`);
  return lines.join('\n');
}

// ── Print HTML builder ────────────────────────────────────────────────────────

export function buildPrintHTML(cat: CatalogCategory, grouped: Map<string, Product[]>): string {
  let groupHTML = '';
  for (const [group, products] of grouped) {
    if (!products.length) continue;
    const rows = products.map(p => {
      const price   = p.price.cash_floor || p.price.retail;
      const plan3m  = p.installments?.['3m'];
      const monthly = plan3m ? `PKR ${fmt(plan3m.monthly)}` : '—';
      const specs   = getKeySpecs(p, cat.id).join(' · ') || '—';
      return `<tr>
        <td><strong>${p.model}</strong><br><span style="color:#555">${p.brand}</span></td>
        <td>${p.simplified_name}</td>
        <td style="font-size:10px;color:#555">${specs}</td>
        <td style="white-space:nowrap">PKR ${fmt(price)}</td>
        <td style="white-space:nowrap">${monthly}</td>
        <td style="font-size:10px">${p.warranty || '—'}</td>
      </tr>`;
    }).join('');
    groupHTML += `
      <div class="group">
        <div class="group-title">${group}</div>
        <table>
          <thead><tr>
            <th>Model</th><th>Description</th><th>Key Specs</th>
            <th>Cash Price</th><th>3m Monthly</th><th>Warranty</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  const total = [...grouped.values()].reduce((n, arr) => n + arr.length, 0);
  const date  = new Date().toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' });

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${cat.label} — Reliance by Tajallis</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #1a1a1a; max-width: 1050px; margin: 0 auto; padding: 20px; }
  .header { display: flex; align-items: flex-start; justify-content: space-between; border-bottom: 3px solid #f97316; padding-bottom: 12px; margin-bottom: 18px; }
  .brand-name { font-size: 20px; font-weight: 900; color: #111; line-height: 1; }
  .brand-sub  { font-size: 10px; color: #888; margin-top: 2px; }
  .cat-badge  { background: #1e3a5f; color: white; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 700; }
  .meta       { font-size: 10px; color: #999; margin-top: 4px; text-align: right; }
  .group      { margin-bottom: 18px; page-break-inside: avoid; }
  .group-title{ font-size: 11px; font-weight: 700; background: #f3f4f6; border-left: 3px solid #f97316; padding: 5px 10px; margin-bottom: 4px; }
  table       { width: 100%; border-collapse: collapse; }
  thead       { background: #1e3a5f; color: white; }
  th          { padding: 4px 7px; text-align: left; font-size: 10px; font-weight: 600; }
  td          { padding: 4px 7px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
  tr:nth-child(even) td { background: #f9fafb; }
  .footer     { margin-top: 16px; padding-top: 10px; border-top: 2px solid #f97316; display: flex; justify-content: space-between; font-size: 10px; color: #555; }
  .footer strong { color: #f97316; }
  @media print { body { padding: 8px; } }
</style>
</head>
<body>
<div class="header">
  <div>
    <div class="brand-name">Reliance <span style="font-size:13px;font-weight:400;color:#888">by Tajallis</span></div>
    <div class="brand-sub">Karachi's trusted home appliance partner since 2015 · 14,000+ happy customers</div>
  </div>
  <div style="text-align:right">
    <div class="cat-badge">${cat.emoji} ${cat.label}</div>
    <div class="meta">${total} models · Generated ${date}</div>
  </div>
</div>
${groupHTML}
<div class="footer">
  <div>📞 <strong>0370-2578788</strong> &nbsp;|&nbsp; 0335-4266238 &nbsp;|&nbsp; sales@tajallis.com.pk</div>
  <div>✅ Free delivery Karachi &nbsp;·&nbsp; Genuine warranty &nbsp;·&nbsp; Easy installments &nbsp;·&nbsp; tajallis.com.pk</div>
</div>
</body>
</html>`;
}
