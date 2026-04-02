import { supabase } from './supabase';

// ── Types ─────────────────────────────────────────────────────────────────────

export type MediaCategory = 'installations' | 'maintenance' | 'solar' | 'commercial' | 'team';

export interface MediaItem {
  id:           string;
  filename:     string;
  storage_path: string;
  public_url:   string;
  category:     MediaCategory;
  media_type:   'image' | 'video';
  caption:      string;
  is_featured:  boolean;
  sort_order:   number;
  synced_at:    string;
}

export const CATEGORY_LABELS: Record<MediaCategory | 'all', string> = {
  all:           'All Work',
  installations: 'Installations',
  maintenance:   'Maintenance',
  solar:         'Solar',
  commercial:    'Commercial',
  team:          'Our Team',
};

// ── Queries ───────────────────────────────────────────────────────────────────

// ── Deduplication helper ──────────────────────────────────────────────────────
// Ensures the same public_url never appears twice in the same returned set.
// Also normalises URLs (strips query strings added by CDN variants) for comparison.
function _normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    // Strip query params that only affect display size (CDN transformations)
    u.searchParams.delete('w'); u.searchParams.delete('h'); u.searchParams.delete('q');
    u.searchParams.delete('fit'); u.searchParams.delete('auto');
    return u.pathname; // path is the stable identity
  } catch { return url; }
}

function _dedup(items: MediaItem[]): MediaItem[] {
  const seen = new Set<string>();
  return items.filter(item => {
    const key = _normalizeUrl(item.public_url);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── Queries ───────────────────────────────────────────────────────────────────

/** Full gallery, optionally filtered by category. */
export async function getGallery(category?: MediaCategory | 'all'): Promise<MediaItem[]> {
  let q = supabase
    .from('media_gallery')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('synced_at',  { ascending: false });

  if (category && category !== 'all') {
    q = q.eq('category', category);
  }

  const { data, error } = await q;
  if (error) { console.error('[gallery] fetch error:', error.message); return []; }
  return _dedup((data ?? []) as MediaItem[]);
}

/** Images only, marked is_featured=true — used in homepage and about strips. */
export async function getFeaturedImages(limit = 6): Promise<MediaItem[]> {
  // Fetch more than needed to account for dedup losses
  const { data, error } = await supabase
    .from('media_gallery')
    .select('*')
    .eq('media_type', 'image')
    .eq('is_featured', true)
    .order('sort_order', { ascending: true })
    .limit(limit * 2);

  if (error) { console.error('[gallery] featured error:', error.message); return []; }
  return _dedup((data ?? []) as MediaItem[]).slice(0, limit);
}

/** Any images from installations + commercial — used in homepage strip. */
export async function getInstallationImages(limit = 8): Promise<MediaItem[]> {
  const { data, error } = await supabase
    .from('media_gallery')
    .select('*')
    .eq('media_type', 'image')
    .in('category', ['installations', 'commercial'])
    .order('sort_order', { ascending: true })
    .order('synced_at',  { ascending: false })
    .limit(limit * 2);  // over-fetch to survive dedup

  if (error) { console.error('[gallery] strip error:', error.message); return []; }
  return _dedup((data ?? []) as MediaItem[]).slice(0, limit);
}

/** Any images from maintenance — used on Services page. */
export async function getMaintenanceImages(limit = 6): Promise<MediaItem[]> {
  const { data, error } = await supabase
    .from('media_gallery')
    .select('*')
    .eq('media_type', 'image')
    .in('category', ['maintenance', 'installations', 'commercial'])
    .order('sort_order', { ascending: true })
    .order('synced_at',  { ascending: false })
    .limit(limit * 2);

  if (error) return [];
  return _dedup((data ?? []) as MediaItem[]).slice(0, limit);
}
