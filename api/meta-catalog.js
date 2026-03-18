/**
 * /api/meta-catalog
 * Serves a Meta-compatible Product Catalog CSV feed.
 * Meta crawls this URL periodically to sync your WhatsApp Business Catalog.
 *
 * Required fields: id, title, description, availability, condition, price, link, image_link, brand
 * Docs: https://www.facebook.com/business/help/120325381656392
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL      = 'https://fdfjavyopbrfvwtjaerw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDE3MDAsImV4cCI6MjA4ODIxNzcwMH0.fXwGFR_e3xZ4trEbkcH8UQ6_oWcIn92UUUvkGuFajto';
const SITE_URL          = 'https://reliance.tajallis.com.pk';

// Meta / Google product category IDs for our categories
const CATEGORY_MAP = {
  'Refrigerators':      'Appliances > Kitchen Appliances > Refrigerators',
  'Freezers':           'Appliances > Kitchen Appliances > Freezers',
  'Washing Machines':   'Appliances > Laundry Appliances > Washing Machines',
  'Air Conditioners':   'Appliances > Climate Control > Air Conditioners',
  'Televisions':        'Electronics > Video > Televisions',
  'Microwaves':         'Appliances > Kitchen Appliances > Microwaves',
  'Dishwashers':        'Appliances > Kitchen Appliances > Dishwashers',
  'Water Dispensers':   'Appliances > Kitchen Appliances > Water Dispensers',
  'Air Fryers':         'Appliances > Kitchen Appliances > Air Fryers',
  'Blenders':           'Appliances > Kitchen Appliances > Blenders',
  'Juicers':            'Appliances > Kitchen Appliances > Juicers',
  'Irons':              'Appliances > Garment Care > Irons',
  'Fans':               'Appliances > Climate Control > Fans',
  'Water Heaters':      'Appliances > Water Heaters',
  'Geysers':            'Appliances > Water Heaters',
};

function csvEscape(str) {
  if (str == null) return '';
  const s = String(str).replace(/\r?\n/g, ' ').trim();
  // Wrap in quotes if contains comma, quote, or newline
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function row(...fields) {
  return fields.map(csvEscape).join(',');
}

export default async function handler(req, res) {
  // Only allow GET
  if (req.method !== 'GET') {
    res.status(405).end('Method Not Allowed');
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const { data: products, error } = await supabase
    .from('products')
    .select('id, brand, model, simplified_name, category, description, retail_price, cash_floor, thumbnail_url, gallery_urls, tags')
    .order('brand', { ascending: true });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  const lines = [];

  // Header row (Meta required + recommended fields)
  lines.push(row(
    'id',
    'title',
    'description',
    'availability',
    'condition',
    'price',
    'link',
    'image_link',
    'additional_image_link',
    'brand',
    'google_product_category',
    'sale_price',
  ));

  for (const p of products) {
    const id          = p.id;
    const title       = p.simplified_name || `${p.brand} ${p.model}`;
    const description = (p.description || title).substring(0, 9999);
    const price       = `${p.retail_price || p.cash_floor || 0} PKR`;
    const link        = `${SITE_URL}/products/${id}`;
    const image       = p.thumbnail_url || '';
    const extraImgs   = Array.isArray(p.gallery_urls)
      ? p.gallery_urls.slice(0, 9).join(',')  // Meta allows up to 10 images
      : '';
    const category    = CATEGORY_MAP[p.category] || 'Appliances';

    lines.push(row(
      id,
      title,
      description,
      'in stock',
      'new',
      price,
      link,
      image,
      extraImgs,
      p.brand || '',
      category,
      '',           // sale_price — leave blank unless on sale
    ));
  }

  const csv = lines.join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=7200');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).send(csv);
}
