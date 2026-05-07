/**
 * Sales Catalog utilities — for internal salesperson use.
 * All grouping uses direct DB spec fields (not text regex) for accuracy.
 */

import type { Product } from './api';
import { COMPANY } from './config';

// ── Shared helpers ─────────────────────────────────────────────────────────────

function s(p: Product, key: string): string {
  return String((p.specs || {})[key] || '').trim();
}

// ── AC grouping ────────────────────────────────────────────────────────────────
// Uses specs.Heating and specs.Inverter — both are exact string fields in DB.
// T3: appended ONLY when the model name explicitly contains "T3" (e.g. HSU-12LFCA1T3).

function extractACGroup(p: Product): string {
  // Tonnage — DB stores as "1.0 Ton", "1.5 Ton", "2.0 Ton", etc.
  // Parse numerically so "1.0 Ton" and "1 Ton" both work.
  const tonSpec = s(p, 'Tonnage');
  const tonNum  = parseFloat(tonSpec);  // "1.0 Ton" → 1.0, "1.5 Ton" → 1.5
  let tonnage = 'Other';
  if (!isNaN(tonNum)) {
    if      (tonNum >= 3.8) tonnage = '4 Ton';
    else if (tonNum >= 3.3) tonnage = '3.5 Ton';
    else if (tonNum >= 2.8) tonnage = '3 Ton';
    else if (tonNum >= 2.3) tonnage = '2.5 Ton';
    else if (tonNum >= 1.9) tonnage = '2 Ton';
    else if (tonNum >= 1.3) tonnage = '1.5 Ton';  // 1.5, 1.7, 1.8
    else                    tonnage = '1 Ton';     // 0.9, 1.0, 1.2
  }

  // Heating: DB value is "No (cooling only)" or "Yes — Heat & Cool (works in winter)"
  const heating    = s(p, 'Heating');
  const isHeatCool = heating.toLowerCase().startsWith('yes');
  const func = isHeatCool ? 'Heat & Cool' : 'Cool Only';

  // Inverter: DB value is "Yes" or "No"
  const inv        = s(p, 'Inverter');
  const isInverter = inv.toLowerCase() === 'yes';

  // T3: check model name, sub_category, or specs.T3 flag (set via admin bulk action)
  const isT3 = /\bT3\b|WT3/i.test(p.model) || /T3/i.test(p.sub_category || '') || s(p, 'T3') === 'Yes';

  const tech = isInverter
    ? (isT3 ? 'Inverter T3' : 'Inverter')
    : 'Fixed Speed';

  return `${tonnage} ${func} ${tech}`;
}

const AC_GROUP_ORDER = [
  '1 Ton Cool Only Inverter T3',     '1 Ton Cool Only Inverter',    '1 Ton Cool Only Fixed Speed',
  '1 Ton Heat & Cool Inverter T3',   '1 Ton Heat & Cool Inverter',  '1 Ton Heat & Cool Fixed Speed',
  '1.5 Ton Cool Only Inverter T3',   '1.5 Ton Cool Only Inverter',  '1.5 Ton Cool Only Fixed Speed',
  '1.5 Ton Heat & Cool Inverter T3', '1.5 Ton Heat & Cool Inverter','1.5 Ton Heat & Cool Fixed Speed',
  '2 Ton Cool Only Inverter T3',     '2 Ton Cool Only Inverter',    '2 Ton Cool Only Fixed Speed',
  '2 Ton Heat & Cool Inverter T3',   '2 Ton Heat & Cool Inverter',  '2 Ton Heat & Cool Fixed Speed',
  '2.5 Ton Cool Only Inverter T3',   '2.5 Ton Cool Only Inverter',
  '2.5 Ton Heat & Cool Inverter T3', '2.5 Ton Heat & Cool Inverter',
  '3 Ton Cool Only Inverter T3',     '3 Ton Cool Only Inverter',    '3 Ton Cool Only Fixed Speed',
  '3 Ton Heat & Cool Inverter T3',   '3 Ton Heat & Cool Inverter',  '3 Ton Heat & Cool Fixed Speed',
  '3.5 Ton Cool Only Inverter T3',   '3.5 Ton Cool Only Inverter',
  '3.5 Ton Heat & Cool Inverter T3', '3.5 Ton Heat & Cool Inverter',
  '4 Ton Cool Only Inverter T3',     '4 Ton Cool Only Inverter',
  '4 Ton Heat & Cool Inverter T3',   '4 Ton Heat & Cool Inverter',
];

// ── Fridge grouping ────────────────────────────────────────────────────────────
// specs.Capacity = "10 Cu.Ft (283 Litres approx.)"
// specs.Type     = "Double Door" | "Glass Door" | "Side-by-Side (No-Frost)"
// specs.Inverter = "Yes" | "No"

function extractFridgeGroup(p: Product): string {
  // Extract Cu.Ft number from specs.Capacity
  const capStr = s(p, 'Capacity');
  const cfM = capStr.match(/(\d{1,2}(?:\.\d)?)\s*cu\.?\s*ft/i);
  const cf = cfM ? Math.round(parseFloat(cfM[1])) : null;
  const sizeLabel = cf !== null ? `${cf} Cu.Ft` : 'Other';

  // Door type
  const typeStr = s(p, 'Type').toLowerCase();
  const sc = (p.sub_category || '').toLowerCase();
  const isGlass      = typeStr.includes('glass') || sc.includes('glass');
  const isSideBySide = typeStr.includes('side') || sc.includes('side') ||
                       typeStr.includes('french') || sc.includes('french');

  // Inverter
  const isInverter = s(p, 'Inverter').toLowerCase() === 'yes' ||
                     sc.includes('inverter');

  if (isSideBySide)  return `Side-by-Side / French Door`;
  if (isGlass)       return `${sizeLabel} Glass Door${isInverter ? ' Inverter' : ''}`;
  return `${sizeLabel} Double Door${isInverter ? ' Inverter' : ''}`;
}

// ── Freezer grouping ──────────────────────────────────────────────────────────
// specs.Type = "Freezers" (chest/deep) | "Vertical / Upright Deep Freezer"
// All freezers in DB have Inverter=No

function extractFreezerGroup(p: Product): string {
  const typeStr = s(p, 'Type').toLowerCase();
  const sc      = (p.sub_category || '').toLowerCase();

  if (typeStr.includes('vertical') || typeStr.includes('upright') || sc.includes('vertical'))
    return 'Upright / Vertical Freezer';
  return 'Chest / Deep Freezer';
}

// ── Washing machine grouping ──────────────────────────────────────────────────
// specs.Type     = "Front Load — Fully Automatic" | "Top Load — Fully Automatic" | "Semi-Automatic"
// sub_category   = Front Load | Semi-Automatic | Top Load | Top-Load Fully Automatic | Twin-Tub
// specs.Capacity = "8 kg"

function extractWashingGroup(p: Product): string {
  const typeStr = s(p, 'Type').toLowerCase();
  const sc      = (p.sub_category || '').toLowerCase();
  const cap     = s(p, 'Capacity') || s(p, 'Cloth Capacity');
  const kg      = cap.match(/(\d{1,2}(?:\.\d)?)\s*kg/i)?.[1];
  const kgLabel = kg ? ` ${kg}kg` : '';

  if (sc.includes('twin') || typeStr.includes('twin'))      return 'Twin-Tub Semi-Automatic';
  if (sc.includes('semi') || typeStr.includes('semi'))      return `Semi-Automatic${kgLabel}`;
  if (sc.includes('front') || typeStr.includes('front'))    return `Front Load${kgLabel}`;
  if (sc.includes('top') || typeStr.includes('top load'))   return `Top Load${kgLabel}`;
  return `Washing Machine${kgLabel}`;
}

const WASHING_SORT = (keys: string[]) => [...keys].sort((a, b) => {
  const order = ['Front Load', 'Top Load', 'Semi-Automatic', 'Twin-Tub'];
  const ta = order.findIndex(o => a.startsWith(o));
  const tb = order.findIndex(o => b.startsWith(o));
  if (ta !== tb) return (ta === -1 ? 99 : ta) - (tb === -1 ? 99 : tb);
  // Within same type, sort by kg numerically
  const na = parseFloat(a.match(/(\d+(?:\.\d)?)\s*kg/)?.[1] || '99');
  const nb = parseFloat(b.match(/(\d+(?:\.\d)?)\s*kg/)?.[1] || '99');
  return na - nb;
});

// ── TV grouping ───────────────────────────────────────────────────────────────
// sub_category = "4K Smart TV" | "QLED TV" | "Smart TV"
// Screen size extracted from simplified_name / specs['Screen Size']

function extractTVGroup(p: Product): string {
  // Try specs['Screen Size'] first ("43 Inch", "55\"", etc.), then name
  const sizeField = s(p, 'Screen Size');
  const sizeText  = sizeField || p.simplified_name;
  const m = sizeText.match(/(\d{2,3})\s*(?:"|inch|")/i);
  const size = m ? parseInt(m[1]) : 0;
  const sizeLabel = size > 0 ? `${size}"` : 'Other';

  // Type from sub_category (most reliable)
  const sc = (p.sub_category || '').trim();
  const tier = sc === 'QLED TV'     ? 'QLED'      :
               sc === '4K Smart TV' ? '4K Smart'  :
               sc === 'Smart TV'    ? 'Smart LED'  :
               'LED';

  return `${sizeLabel} ${tier}`;
}

const TV_SORT = (keys: string[]) => [...keys].sort((a, b) => {
  const sa = parseInt(a) || 999;
  const sb = parseInt(b) || 999;
  if (sa !== sb) return sa - sb;
  return a.localeCompare(b);
});

// ── Microwave grouping ────────────────────────────────────────────────────────
// specs.Capacity = "25L" (exact, already in litres)
// Filter: only sub_category="Microwave Oven" — other values (Juicer, Deep Fryer)
//         are miscategorised products and should not appear.

function extractMicrowaveGroup(p: Product): string {
  // Exclude non-microwaves silently
  if (p.sub_category && !p.sub_category.toLowerCase().includes('microwave')) return '__skip__';

  const cap = s(p, 'Capacity');
  const liters = parseInt(cap.replace(/[^0-9]/g, '')) || 0;

  // Check for grill / convection in Technology or Heating Technology spec
  const tech = (s(p, 'Technology') + ' ' + s(p, 'Heating Technology')).toLowerCase();
  const hasGrill = tech.includes('grill');
  const hasConv  = tech.includes('convection');

  let suffix = '';
  if (hasGrill && hasConv) suffix = ' Grill + Convection';
  else if (hasGrill)       suffix = ' with Grill';
  else if (hasConv)        suffix = ' Convection';

  const capLabel = liters > 0 ? `${liters}L` : cap || 'Other';
  return `${capLabel}${suffix}`;
}

const MICROWAVE_SORT = (keys: string[]) => [...keys]
  .filter(k => k !== '__skip__')
  .sort((a, b) => {
    const na = parseInt(a) || 999;
    const nb = parseInt(b) || 999;
    return na !== nb ? na - nb : a.localeCompare(b);
  });

// ── Solar grouping ────────────────────────────────────────────────────────────

function extractSolarGroup(p: Product): string {
  const t = `${p.simplified_name} ${p.category} ${p.tags}`.toLowerCase();
  if (t.includes('battery') || t.includes('lithium'))   return 'Battery / Storage';
  if (t.includes('off-grid') || t.includes('off grid')) return 'Off-Grid System';
  if (t.includes('hybrid'))                             return 'On-Grid / Hybrid';
  if (t.includes('on-grid') || t.includes('on grid'))   return 'On-Grid System';
  if (t.includes('panel') || t.includes('plate'))       return 'Solar Panels';
  if (t.includes('inverter'))                           return 'Solar Inverter';
  return 'Solar Products';
}

// ── Pridor (Solar Pump Inverter / VFD) grouping ───────────────────────────────
// Crown Pridor models: "Pridor 5/5KW", "Pridor 7/11KW", etc.
// The second number (output KW) determines the motor it can drive.

function extractPridorGroup(p: Product): string {
  const m = p.model.match(/\/(\d+)\s*KW/i) || p.simplified_name.match(/\/(\d+)\s*KW/i);
  const kw = m ? parseInt(m[1]) : null;
  if (kw === null) return 'Solar Pump Inverter (VFD)';
  if (kw <= 7)  return 'Up to 7KW';
  if (kw <= 15) return '8 – 15KW';
  if (kw <= 22) return '16 – 22KW';
  return '30KW +';
}

// ── Kitchen grouping ──────────────────────────────────────────────────────────

function extractKitchenGroup(p: Product): string {
  if (p.sub_category) return p.sub_category;
  const t = p.simplified_name.toLowerCase();
  if (t.includes('blender') || t.includes('juicer'))    return 'Blenders & Juicers';
  if (t.includes('processor') || t.includes('chopper')) return 'Food Processors';
  if (t.includes('kettle'))                             return 'Electric Kettles';
  if (t.includes('toaster') || t.includes('sandwich'))  return 'Toasters & Sandwich Makers';
  if (t.includes('air fry'))                            return 'Air Fryers';
  if (t.includes('mixer') || t.includes('hand blend'))  return 'Mixers & Hand Blenders';
  if (t.includes('rice'))                               return 'Rice Cookers';
  return p.category;
}

// ── Category config ───────────────────────────────────────────────────────────

export interface CatalogCategory {
  id:           string;
  label:        string;
  emoji:        string;
  catParam:     string;
  groupFn:      (p: Product) => string;
  groupOrder?:  string[];
  sortGroupsFn?:(keys: string[]) => string[];
}

export const CATALOG_CATEGORIES: CatalogCategory[] = [
  {
    id: 'ac', label: 'Air Conditioners', emoji: '❄️', catParam: 'ac',
    groupFn: extractACGroup, groupOrder: AC_GROUP_ORDER,
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
    groupOrder: ['Chest / Deep Freezer', 'Upright / Vertical Freezer'],
  },
  {
    id: 'washing', label: 'Washing Machines', emoji: '👕', catParam: 'washing',
    groupFn: extractWashingGroup,
    sortGroupsFn: WASHING_SORT,
  },
  {
    id: 'tv', label: 'Televisions', emoji: '📺', catParam: 'tv',
    groupFn: extractTVGroup, sortGroupsFn: TV_SORT,
  },
  {
    id: 'microwave', label: 'Microwave Ovens', emoji: '📡', catParam: 'microwave',
    groupFn: extractMicrowaveGroup, sortGroupsFn: MICROWAVE_SORT,
  },
  {
    id: 'solar', label: 'Solar Solutions', emoji: '☀️', catParam: 'solar',
    groupFn: extractSolarGroup,
    groupOrder: ['On-Grid / Hybrid','On-Grid System','Off-Grid System','Battery / Storage','Solar Panels','Solar Inverter','Solar Products'],
  },
  {
    id: 'kitchen', label: 'Kitchen Appliances', emoji: '🍳', catParam: 'kitchen',
    groupFn: extractKitchenGroup,
    sortGroupsFn: (keys) => [...keys].sort(),
  },
  {
    id: 'pridor', label: 'Crown Pridor — Solar Pump VFD', emoji: '💧', catParam: 'solar-pump',
    groupFn: extractPridorGroup,
    groupOrder: ['Up to 7KW', '8 – 15KW', '16 – 22KW', '30KW +', 'Solar Pump Inverter (VFD)'],
  },
];

// ── Grouping ──────────────────────────────────────────────────────────────────

export function groupBySpec(products: Product[], cat: CatalogCategory): Map<string, Product[]> {
  const map = new Map<string, Product[]>();
  for (const p of products) {
    const key = cat.groupFn(p) || 'Other';
    if (key === '__skip__') continue;              // filtered out (e.g. non-microwave in microwave query)
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(p);
  }

  let keys: string[];
  if (cat.groupOrder) {
    const preset = cat.groupOrder.filter(k => map.has(k));
    const rest   = [...map.keys()].filter(k => !cat.groupOrder!.includes(k)).sort();
    keys = [...preset, ...rest];
  } else if (cat.sortGroupsFn) {
    keys = cat.sortGroupsFn([...map.keys()]);
  } else {
    keys = [...map.keys()].sort();
  }

  const ordered = new Map<string, Product[]>();
  for (const k of keys)     { if (map.has(k)) ordered.set(k, map.get(k)!); }
  for (const [k, v] of map) { if (!ordered.has(k)) ordered.set(k, v); }
  return ordered;
}

// ── Key specs per category ────────────────────────────────────────────────────

export function getKeySpecs(p: Product, catId: string): string[] {
  const pick = (...keys: string[]) =>
    keys.map(k => (p.specs || {})[k]).filter(Boolean) as string[];

  switch (catId) {
    case 'ac':        return pick('Cooling Capacity', 'Energy Rating', 'Refrigerant').slice(0, 3);
    case 'fridge':    return pick('Capacity', 'Defrost', 'Inverter Technology').slice(0, 3);
    case 'freezer':   return pick('Capacity', 'Temperature Range').slice(0, 2);
    case 'washing':   return pick('Capacity', 'RPM', 'Inverter').slice(0, 3);
    case 'tv':        return pick('Screen Size', 'Resolution', 'OS').slice(0, 3);
    case 'microwave': return pick('Capacity', 'Power', 'Technology').slice(0, 3);
    case 'solar':     return pick('Power Output', 'Capacity', 'Battery Type').slice(0, 3);
    case 'pridor':    return pick('Wattage', 'Power Supply', 'Type').slice(0, 3);
    default: return Object.values(p.specs || {}).filter(v => v && String(v).length < 35).slice(0, 2) as string[];
  }
}

// ── WhatsApp message builders ─────────────────────────────────────────────────

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
      lines.push(`• *${p.model}* — ${p.simplified_name}`);
      if (specs) lines.push(`   _${specs}_`);
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
    `_Karachi's trusted appliance partner since 2015_`,
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

// ── Print HTML ────────────────────────────────────────────────────────────────

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
        <td><strong>${p.model}</strong><br><span style="color:#777;font-size:10px">${p.brand}</span></td>
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
          <thead><tr><th>Model</th><th>Description</th><th>Key Specs</th><th>Cash Price</th><th>3m Monthly</th><th>Warranty</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  const total = [...grouped.values()].reduce((n, arr) => n + arr.length, 0);
  const date  = new Date().toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' });

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8">
<title>${cat.label} — Tajalli's</title>
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:Arial,Helvetica,sans-serif; font-size:11px; color:#1a1a1a; max-width:1050px; margin:0 auto; padding:20px; }
  .header { display:flex; align-items:flex-start; justify-content:space-between; border-bottom:3px solid #f97316; padding-bottom:12px; margin-bottom:18px; }
  .brand-name { font-size:20px; font-weight:900; color:#111; line-height:1; }
  .cat-badge { background:#1e3a5f; color:white; padding:6px 14px; border-radius:20px; font-size:13px; font-weight:700; }
  .meta { font-size:10px; color:#999; margin-top:4px; text-align:right; }
  .group { margin-bottom:18px; page-break-inside:avoid; }
  .group-title { font-size:11px; font-weight:700; background:#f3f4f6; border-left:3px solid #f97316; padding:5px 10px; margin-bottom:4px; }
  table { width:100%; border-collapse:collapse; }
  thead { background:#1e3a5f; color:white; }
  th { padding:4px 7px; text-align:left; font-size:10px; font-weight:600; }
  td { padding:4px 7px; border-bottom:1px solid #e5e7eb; vertical-align:top; }
  tr:nth-child(even) td { background:#f9fafb; }
  .footer { margin-top:16px; padding-top:10px; border-top:2px solid #f97316; display:flex; justify-content:space-between; font-size:10px; color:#555; }
  @media print { body { padding:8px; } }
</style>
</head>
<body>
<div class="header">
  <div>
    <div class="brand-name">Tajalli's</div>
    <div style="font-size:10px;color:#888;margin-top:2px">Karachi's trusted appliance partner since 2015 · 14,400+ clients</div>
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
