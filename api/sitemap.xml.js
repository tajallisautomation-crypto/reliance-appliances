/**
 * /api/sitemap.xml
 *
 * Dynamically generates a complete XML sitemap including every live product
 * page. Called by robots.txt so Google always discovers new products.
 *
 * Cached for 1 hour via Cache-Control so every Googlebot crawl is fast.
 */

import { createClient } from '@supabase/supabase-js';

const SITE = 'https://reliance.tajallis.com.pk';

const STATIC_PAGES = [
  { loc: '/',                     priority: '1.0', changefreq: 'daily'   },
  { loc: '/products',             priority: '0.9', changefreq: 'daily'   },
  { loc: '/solar',                priority: '0.8', changefreq: 'weekly'  },
  { loc: '/solar-calculator',     priority: '0.7', changefreq: 'monthly' },
  { loc: '/services',             priority: '0.7', changefreq: 'monthly' },
  { loc: '/installments',         priority: '0.7', changefreq: 'monthly' },
  { loc: '/about',                priority: '0.6', changefreq: 'monthly' },
  { loc: '/contact',              priority: '0.6', changefreq: 'monthly' },
  { loc: '/partner',              priority: '0.5', changefreq: 'monthly' },
  { loc: '/corporate',            priority: '0.5', changefreq: 'monthly' },
  { loc: '/green-corridor',       priority: '0.5', changefreq: 'monthly' },
  { loc: '/tools',                priority: '0.5', changefreq: 'monthly' },
  { loc: '/policy/terms',         priority: '0.3', changefreq: 'yearly'  },
  { loc: '/policy/privacy',       priority: '0.3', changefreq: 'yearly'  },
  { loc: '/policy/returns',       priority: '0.3', changefreq: 'yearly'  },
  { loc: '/policy/warranty',      priority: '0.3', changefreq: 'yearly'  },
];

const CATEGORY_SLUGS = [
  // Air Conditioners
  '1-ton-air-conditioners', '1-5-ton-air-conditioners', '2-ton-air-conditioners',
  // Refrigerators
  'small-refrigerators', 'medium-refrigerators', 'large-refrigerators',
  'no-frost-refrigerators', 'side-by-side-refrigerators',
  // Washing Machines
  'automatic-washing-machines', 'semi-automatic-washing-machines',
  // Kitchen
  'kitchen-food-processors', 'kitchen-blenders-juicers',
  'kitchen-cooking-appliances', 'kitchen-breakfast-beverages',
  // Small Appliances
  'personal-care-appliances', 'home-heating-appliances',
  // Other major categories
  'freezers', 'water-dispensers', 'televisions',
  // Solar — top-level and sub-categories
  'solar-solutions', 'solar-inverters', 'solar-batteries', 'solar-panels',
  'hybrid-inverters', 'on-grid-inverters', 'off-grid-inverters',
  // Miscellaneous
  'fans', 'microwaves', 'hood-hobs',
];

function escXml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export default async function handler(req, res) {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
  );

  // Fetch all live product slugs + updated_at in one lightweight query
  const { data: products, error } = await supabase
    .from('products')
    .select('slug, updated_at')
    .eq('stock_status', 'In Stock')
    .not('slug', 'is', null);

  if (error) {
    res.status(502).send(`<!-- sitemap error: ${error.message} -->`);
    return;
  }

  const now = new Date().toISOString().split('T')[0];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n\n`;

  // Static pages
  xml += `  <!-- Static pages -->\n`;
  for (const p of STATIC_PAGES) {
    xml += `  <url>\n`;
    xml += `    <loc>${escXml(SITE + p.loc)}</loc>\n`;
    xml += `    <changefreq>${p.changefreq}</changefreq>\n`;
    xml += `    <priority>${p.priority}</priority>\n`;
    xml += `    <lastmod>${now}</lastmod>\n`;
    xml += `  </url>\n`;
  }

  // Category pages
  xml += `\n  <!-- Category pages -->\n`;
  for (const slug of CATEGORY_SLUGS) {
    xml += `  <url>\n`;
    xml += `    <loc>${escXml(SITE + '/products/category/' + slug)}</loc>\n`;
    xml += `    <changefreq>weekly</changefreq>\n`;
    xml += `    <priority>0.8</priority>\n`;
    xml += `    <lastmod>${now}</lastmod>\n`;
    xml += `  </url>\n`;
  }

  // Product pages
  xml += `\n  <!-- Product pages (${products.length} live products) -->\n`;
  for (const p of products) {
    const lastmod = p.updated_at
      ? new Date(p.updated_at).toISOString().split('T')[0]
      : now;
    xml += `  <url>\n`;
    xml += `    <loc>${escXml(SITE + '/products/' + p.slug)}</loc>\n`;
    xml += `    <changefreq>weekly</changefreq>\n`;
    xml += `    <priority>0.7</priority>\n`;
    xml += `    <lastmod>${lastmod}</lastmod>\n`;
    xml += `  </url>\n`;
  }

  xml += `\n</urlset>`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.status(200).send(xml);
}
