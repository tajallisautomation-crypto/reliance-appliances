/**
 * /api/sitemap.xml — RETIRED
 *
 * This endpoint is superseded by app/sitemap.ts (Next.js native MetadataRoute.Sitemap).
 * Permanently redirected to /sitemap.xml so any cached references (old robots.txt,
 * external links, Googlebot recrawl) resolve to the canonical sitemap.
 *
 * Safe to delete once Google Search Console confirms no more traffic to this path.
 */
export default function handler(req, res) {
  res.setHeader('Location', '/sitemap.xml');
  res.status(308).end();
}
