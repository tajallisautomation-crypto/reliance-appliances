/**
 * /api/catalog-refresh
 *
 * Triggered by Vercel Cron (see vercel.json → "crons") every 6 hours.
 * Can also be called manually from the Admin → Catalog panel.
 *
 * What it does:
 *   1. Queries Supabase for the most recently updated product's updated_at.
 *   2. Compares to last_catalog_refresh stored in the site_meta table.
 *   3. If products changed since last refresh — triggers a Meta feed upload
 *      so WhatsApp / Facebook catalog shows the new data within minutes.
 *   4. Regardless, calls /api/meta-sets-sync logic to keep product sets current.
 *
 * Required Vercel env vars:
 *   SUPABASE_URL             — Supabase project URL
 *   SUPABASE_ANON_KEY        — Supabase anon key
 *   META_ACCESS_TOKEN        — long-lived System User token (Meta Business Suite)
 *   META_CATALOG_ID          — numeric catalog ID (Commerce Manager)
 *   META_FEED_ID             — numeric product feed ID (the scheduled feed)
 *   CRON_SECRET              — secret header sent by Vercel, validated here
 *
 * Vercel cron path: GET /api/catalog-refresh
 * Manual trigger:   POST /api/catalog-refresh  (Admin panel)
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL      = process.env.SUPABASE_URL      || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const META_API          = 'https://graph.facebook.com/v21.0';
const CATALOG_FEED_URL  = 'https://reliance.tajallis.com.pk/api/meta-catalog';
const CRON_SECRET       = process.env.CRON_SECRET || '';

export default async function handler(req, res) {
  // ── Auth: Vercel sends Authorization: Bearer <CRON_SECRET> on cron requests
  if (CRON_SECRET) {
    const auth = req.headers['authorization'] || '';
    if (auth !== `Bearer ${CRON_SECRET}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const supabase  = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const accessTok = process.env.META_ACCESS_TOKEN;
  const feedId    = process.env.META_FEED_ID;
  const log       = [];

  // ── Step 1: Check if any products changed recently ───────────────────────────
  let productsChangedSince = null;
  try {
    // Get the most recently updated product timestamp
    const { data: latest } = await supabase
      .from('products')
      .select('updated_at')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    // Get last catalog refresh timestamp from site_meta (best-effort)
    const { data: meta } = await supabase
      .from('site_meta')
      .select('value')
      .eq('key', 'catalog_last_refreshed')
      .single();

    const lastRefresh    = meta?.value ? new Date(meta.value) : new Date(0);
    const latestProduct  = latest?.updated_at ? new Date(latest.updated_at) : new Date(0);

    productsChangedSince = latestProduct > lastRefresh;

    log.push({
      step: 'staleness_check',
      last_refresh:     lastRefresh.toISOString(),
      latest_product:   latestProduct.toISOString(),
      products_changed: productsChangedSince,
    });
  } catch (e) {
    log.push({ step: 'staleness_check', error: e.message });
    productsChangedSince = true; // default: assume stale, trigger refresh
  }

  const results = { triggered: false, feed_upload: null, sets_sync: null, log };

  // ── Step 2: Trigger Meta feed upload if stale ────────────────────────────────
  if (productsChangedSince && feedId && accessTok) {
    try {
      const uploadRes = await fetch(`${META_API}/${feedId}/uploads`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url:          CATALOG_FEED_URL,
          access_token: accessTok,
        }),
      });
      const uploadJson = await uploadRes.json();
      results.triggered    = true;
      results.feed_upload  = uploadJson;
      log.push({ step: 'feed_upload', status: uploadRes.status, body: uploadJson });
    } catch (e) {
      log.push({ step: 'feed_upload', error: e.message });
    }
  } else if (!productsChangedSince) {
    log.push({ step: 'feed_upload', skipped: 'No product changes detected' });
  } else {
    log.push({ step: 'feed_upload', skipped: 'META_FEED_ID or META_ACCESS_TOKEN not set' });
  }

  // ── Step 3: Record refresh timestamp in site_meta ─────────────────────────────
  if (productsChangedSince) {
    try {
      await supabase
        .from('site_meta')
        .upsert({ key: 'catalog_last_refreshed', value: new Date().toISOString() }, { onConflict: 'key' });
      log.push({ step: 'timestamp_saved' });
    } catch (e) {
      log.push({ step: 'timestamp_saved', error: e.message });
    }
  }

  // ── Step 4: Sync Meta product sets (runs always — handles new categories) ─────
  if (accessTok && process.env.META_CATALOG_ID) {
    try {
      const setsRes = await fetch(
        `https://${req.headers.host}/api/meta-sets-sync`,
        {
          method:  'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${CRON_SECRET}`,
          },
        },
      );
      const setsJson = setsRes.ok ? await setsRes.json() : { status: setsRes.status };
      results.sets_sync = setsJson;
      log.push({ step: 'sets_sync', result: setsJson });
    } catch (e) {
      log.push({ step: 'sets_sync', error: e.message });
    }
  } else {
    log.push({ step: 'sets_sync', skipped: 'META_ACCESS_TOKEN or META_CATALOG_ID not set' });
  }

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    ok:        true,
    triggered: results.triggered,
    feed_upload: results.feed_upload,
    sets_sync:   results.sets_sync,
    log,
  });
}
