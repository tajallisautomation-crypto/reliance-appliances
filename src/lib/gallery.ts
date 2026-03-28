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
  return (data ?? []) as MediaItem[];
}

/** Images only, marked is_featured=true — used in homepage and about strips. */
export async function getFeaturedImages(limit = 6): Promise<MediaItem[]> {
  const { data, error } = await supabase
    .from('media_gallery')
    .select('*')
    .eq('media_type', 'image')
    .eq('is_featured', true)
    .order('sort_order', { ascending: true })
    .limit(limit);

  if (error) { console.error('[gallery] featured error:', error.message); return []; }
  return (data ?? []) as MediaItem[];
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
    .limit(limit);

  if (error) { console.error('[gallery] strip error:', error.message); return []; }
  return (data ?? []) as MediaItem[];
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
    .limit(limit);

  if (error) return [];
  return (data ?? []) as MediaItem[];
}
