/**
 * Sales Catalog utilities — for internal salesperson use.
 * Groups products by spec for WhatsApp sharing and print cards.
 */

import type { Product } from './api';
import { COMPANY } from './config';

// ── Spec extractors ────────────────────────────────────────────────────────────

function extractTonnage(p: Product): string {
  const text = `${p.simplified_name} ${p.tags} ${p.specs?.['Cooling Capacity'] || ''}`.toLowerCase();
  if (/2\.5\s*ton/.test(text)) return '2.5 Ton';
  if (/2\s*ton/.test(text))    return '2 Ton';
  if (/1\.8\s*ton/.test(text)) return '1.8 Ton';
  if (/1\.5\s*ton/.test(text)) return '1.5 Ton';
  if (/1\s*ton/.test(text))    return '1 Ton';
  return 'Other';
}

function extractTVSize(p: Product): string {
  const text = `${p.simplified_name} ${p.tags}`;
  const m = text.match(/(\d{2,3})\s*(?:"|inch|"|\bin\b)/i);
  if (!m) return 'Other';
  const n = parseInt(m[1]);
  if (n <= 32)        return '32" & Below';
  if (n <= 43)        return '40"–43"';
  if (n <= 55)        return '50"–55"';
  if (n <= 65)        return '58"–65"';
  return '70"+';
}

function extractFridgeSize(p: Product): string {
  const text = `${p.simplified_name} ${p.specs?.['Capacity'] || ''} ${p.tags}`;
  const m = text.match(/(\d{1,2}(?:\.\d)?)\s*(?:cu\.?\s*ft|cft)/i);
  if (m) {
    const n = parseFloat(m[1]);
    if (n < 9)  return 'Small (< 9 Cu.Ft)';
    if (n < 13) return 'Medium (9–12 Cu.Ft)';
    if (n < 17) return 'Large (13–16 Cu.Ft)';
    if (n < 22) return 'XL (17–21 Cu.Ft)';
    return 'XXL (22+ Cu.Ft)';
  }
  return 'Other';
}

function extractFreezerType(p: Product): string {
  const s = `${p.simplified_name} ${p.category} ${p.sub_category}`.toLowerCase();
  if (s.includes('upright') || s.includes('vertical')) return 'Upright Freezer';
  if (s.includes('chest'))                             return 'Chest Freezer';
  return 'Deep Freezer';
}

function extractWashingType(p: Product): string {
  const s = `${p.simplified_name} ${p.category} ${p.sub_category}`.toLowerCase();
  if (s.includes('spinner') || s.includes('spin dryer'))   return 'Spinner / Spin Dryer';
  if (s.includes('front load') || s.includes('front-load')) return 'Front Load';
  if (s.includes('top load') || s.includes('top-load'))     return 'Top Load';
  if (s.includes('fully') || s.includes('automatic'))       return 'Fully Automatic';
  if (s.includes('semi') || s.includes('twin tub'))         return 'Semi-Automatic';
  return 'Other';
}

function extractMicrowaveSize(p: Product): string {
  const text = `${p.specs?.['Capacity'] || ''} ${p.simplified_name}`;
  const m = text.match(/(\d{2,3})\s*[Ll]/);
  if (!m) return 'Other';
  const n = parseInt(m[1]);
  if (n < 20)  return 'Small (< 20L)';
  if (n <= 25) return 'Standard (20–25L)';
  if (n <= 30) return 'Large (26–30L)';
  return 'XL (31L+)';
}

function extractSolarType(p: Product): string {
  const s = `${p.simplified_name} ${p.category} ${p.tags}`.toLowerCase();
  if (s.includes('battery') || s.includes('lithium'))            return 'Battery / Storage';
  if (s.includes('off-grid') || s.includes('off grid'))          return 'Off-Grid System';
  if (s.includes('hybrid') || s.includes('on-grid'))             return 'On-Grid / Hybrid';
  if (s.includes('panel'))                                        return 'Solar Panels';
  return 'Solar Products';
}

// ── Category config ───────────────────────────────────────────────────────────

export interface CatalogCategory {
  id:         string;
  label:      string;
  emoji:      string;
  catParam:   string;   // passed to getProducts({ category })
  groupFn:    (p: Product) => string;
  groupOrder?: string[];
}

export const CATALOG_CATEGORIES: CatalogCategory[] = [
  {
    id: 'ac', label: 'Air Conditioners', emoji: '❄️', catParam: 'ac',
    groupFn: extractTonnage,
    groupOrder: ['1 Ton', '1.5 Ton', '1.8 Ton', '2 Ton', '2.5 Ton', 'Other'],
  },
  {
    id: 'fridge', label: 'Refrigerators', emoji: '🧊', catParam: 'fridge',
    groupFn: extractFridgeSize,
    groupOrder: ['Small (< 9 Cu.Ft)', 'Medium (9–12 Cu.Ft)', 'Large (13–16 Cu.Ft)', 'XL (17–21 Cu.Ft)', 'XXL (22+ Cu.Ft)', 'Other'],
  },
  {
    id: 'freezer', label: 'Freezers', emoji: '🥶', catParam: 'freezer',
    groupFn: extractFreezerType,
    groupOrder: ['Chest Freezer', 'Deep Freezer', 'Upright Freezer'],
  },
  {
    id: 'washing', label: 'Washing Machines', emoji: '👕', catParam: 'washing',
    groupFn: extractWashingType,
    groupOrder: ['Fully Automatic', 'Top Load', 'Front Load', 'Semi-Automatic', 'Spinner / Spin Dryer', 'Other'],
  },
  {
    id: 'tv', label: 'Televisions', emoji: '📺', catParam: 'tv',
    groupFn: extractTVSize,
    groupOrder: ['32" & Below', '40"–43"', '50"–55"', '58"–65"', '70"+', 'Other'],
  },
  {
    id: 'microwave', label: 'Microwave Ovens', emoji: '📡', catParam: 'microwave',
    groupFn: extractMicrowaveSize,
    groupOrder: ['Small (< 20L)', 'Standard (20–25L)', 'Large (26–30L)', 'XL (31L+)', 'Other'],
  },
  {
    id: 'solar', label: 'Solar Solutions', emoji: '☀️', catParam: 'solar',
    groupFn: extractSolarType,
    groupOrder: ['On-Grid / Hybrid', 'Off-Grid System', 'Battery / Storage', 'Solar Panels', 'Solar Products'],
  },
  {
    id: 'kitchen', label: 'Kitchen Appliances', emoji: '🍳', catParam: 'kitchen',
    groupFn: (p) => p.sub_category || p.category,
  },
];

// ── Grouping ──────────────────────────────────────────────────────────────────

export function groupBySpec(products: Product[], cat: CatalogCategory): Map<string, Product[]> {
  const map = new Map<string, Product[]>();
  for (const p of products) {
    const key = cat.groupFn(p);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(p);
  }
  if (!cat.groupOrder) return map;
  const ordered = new Map<string, Product[]>();
  for (const k of cat.groupOrder) {
    if (map.has(k)) ordered.set(k, map.get(k)!);
  }
  for (const [k, v] of map) {
    if (!ordered.has(k)) ordered.set(k, v);
  }
  return ordered;
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
    for (const p of products.slice(0, 12)) {
      const price  = p.price.cash_floor || p.price.retail;
      const plan3m = p.installments?.['3m'];
      const inst   = plan3m ? ` | 3m: ${fmt(plan3m.monthly)}/mo` : '';
      lines.push(`• ${p.simplified_name}  —  PKR ${fmt(price)}${inst}`);
    }
    if (products.length > 12) lines.push(`  _(+${products.length - 12} more)_`);
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
  lines.push(`Ask for any category list with prices & installment plans!`);
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
      const price  = p.price.cash_floor || p.price.retail;
      const plan3m = p.installments?.['3m'];
      const monthly = plan3m ? `PKR ${fmt(plan3m.monthly)}` : '—';
      return `<tr>
        <td>${p.simplified_name}</td>
        <td style="white-space:nowrap">PKR ${fmt(price)}</td>
        <td style="white-space:nowrap">${monthly}</td>
        <td>${p.warranty || '—'}</td>
      </tr>`;
    }).join('');
    groupHTML += `
      <div class="group">
        <div class="group-title">${group}</div>
        <table>
          <thead><tr><th>Product</th><th>Cash Price</th><th>3m Monthly</th><th>Warranty</th></tr></thead>
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
  body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #1a1a1a; max-width: 900px; margin: 0 auto; padding: 20px; }
  .header { display: flex; align-items: flex-start; justify-content: space-between; border-bottom: 3px solid #f97316; padding-bottom: 12px; margin-bottom: 18px; }
  .brand-name { font-size: 20px; font-weight: 900; color: #111; line-height: 1; }
  .brand-sub  { font-size: 10px; color: #888; margin-top: 2px; }
  .cat-badge  { background: #1e3a5f; color: white; padding: 6px 14px; border-radius: 20px; font-size: 14px; font-weight: 700; }
  .meta       { font-size: 10px; color: #999; margin-top: 4px; text-align: right; }
  .group      { margin-bottom: 18px; page-break-inside: avoid; }
  .group-title{ font-size: 12px; font-weight: 700; background: #f3f4f6; border-left: 3px solid #f97316; padding: 5px 10px; margin-bottom: 4px; }
  table       { width: 100%; border-collapse: collapse; }
  thead       { background: #1e3a5f; color: white; }
  th          { padding: 5px 8px; text-align: left; font-size: 11px; font-weight: 600; }
  td          { padding: 4px 8px; border-bottom: 1px solid #e5e7eb; font-size: 11px; }
  tr:nth-child(even) td { background: #f9fafb; }
  .footer     { margin-top: 16px; padding-top: 10px; border-top: 2px solid #f97316; display: flex; justify-content: space-between; font-size: 10px; color: #555; }
  .footer strong { color: #f97316; }
  @media print { body { padding: 8px; } }
</style>
</head>
<body>
<div class="header">
  <div>
    <div class="brand-name">Reliance</div>
    <div class="brand-sub">by Tajallis · Karachi's trusted appliance partner since 2015</div>
  </div>
  <div style="text-align:right">
    <div class="cat-badge">${cat.emoji} ${cat.label}</div>
    <div class="meta">${total} products · Generated ${date}</div>
  </div>
</div>
${groupHTML}
<div class="footer">
  <div>📞 <strong>0370-2578788</strong> &nbsp;|&nbsp; 0335-4266238 &nbsp;|&nbsp; sales@tajallis.com.pk</div>
  <div>✅ Free delivery Karachi &nbsp;·&nbsp; Genuine warranty &nbsp;·&nbsp; Easy installments</div>
</div>
</body>
</html>`;
}
