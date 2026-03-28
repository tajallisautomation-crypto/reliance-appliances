-- ══════════════════════════════════════════════════════════════
-- MEDIA GALLERY  — 2026-03-27
-- Stores metadata for all photos/videos in the local media/
-- folder after they are uploaded to Supabase Storage (bucket: gallery).
-- Run sync-media.mjs to populate.
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS media_gallery (
  id           text        PRIMARY KEY,           -- SHA-256 of relative file path (dedup key)
  filename     text        NOT NULL,              -- cleaned filename, used for alt text
  storage_path text        NOT NULL,              -- path inside the 'gallery' bucket
  public_url   text        NOT NULL,              -- full HTTPS URL served by Supabase CDN
  category     text        NOT NULL DEFAULT 'installations',
  media_type   text        NOT NULL DEFAULT 'image',   -- 'image' | 'video'
  caption      text        NOT NULL DEFAULT '',         -- editable display caption
  is_featured  boolean     NOT NULL DEFAULT false,      -- appears in homepage/about strips
  sort_order   integer     NOT NULL DEFAULT 0,          -- lower = shown first
  synced_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE media_gallery
  ADD CONSTRAINT media_gallery_category_chk
    CHECK (category IN ('installations','maintenance','solar','commercial','team')),
  ADD CONSTRAINT media_gallery_type_chk
    CHECK (media_type IN ('image','video'));

CREATE INDEX IF NOT EXISTS media_gallery_category_idx  ON media_gallery(category);
CREATE INDEX IF NOT EXISTS media_gallery_featured_idx  ON media_gallery(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS media_gallery_type_idx      ON media_gallery(media_type);
CREATE INDEX IF NOT EXISTS media_gallery_sort_idx      ON media_gallery(sort_order, synced_at DESC);

-- Row-level security
ALTER TABLE media_gallery ENABLE ROW LEVEL SECURITY;

-- Public can read everything
CREATE POLICY "gallery_public_read"
  ON media_gallery FOR SELECT
  TO anon, authenticated
  USING (true);

-- Sync script (uses anon key) can insert/update
CREATE POLICY "gallery_anon_insert"
  ON media_gallery FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "gallery_anon_update"
  ON media_gallery FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- ── Storage bucket + policies ──────────────────────────────────────────────
-- 1. Create the public bucket (run once; idempotent via DO block)
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'gallery', 'gallery', true,
    104857600,   -- 100 MB per file limit
    ARRAY['image/jpeg','image/png','image/webp','video/mp4','video/quicktime','video/webm']
  )
  ON CONFLICT (id) DO UPDATE SET public = true;
END $$;

-- 2. Anyone can read gallery files (public bucket CDN)
CREATE POLICY "gallery_storage_public_read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'gallery');

-- 3. Anon key (used by sync-media.mjs) can upload new files
CREATE POLICY "gallery_storage_anon_insert"
  ON storage.objects FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'gallery');

-- 4. Anon key can overwrite/update existing files (--refetch flag)
CREATE POLICY "gallery_storage_anon_update"
  ON storage.objects FOR UPDATE
  TO anon
  USING (bucket_id = 'gallery');

-- 5. Anon key can delete files (for cleanup scripts)
CREATE POLICY "gallery_storage_anon_delete"
  ON storage.objects FOR DELETE
  TO anon
  USING (bucket_id = 'gallery');
