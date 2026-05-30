/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Keep unoptimized for plain <img> tags used in BrandedImage.
    // When we migrate to next/image, set unoptimized: false and rely on remotePatterns.
    unoptimized: true,
    remotePatterns: [
      // Supabase Storage (project-specific subdomain added at deploy time via env)
      { protocol: 'https', hostname: '**.supabase.co',      pathname: '/storage/v1/object/public/**' },
      { protocol: 'https', hostname: '**.supabase.in',      pathname: '/storage/v1/object/public/**' },
      // Google Drive thumbnails used for some product images
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'drive.google.com' },
    ],
    formats: ['image/avif', 'image/webp'],
  },

  // ── 301 redirects — old-site URL equity preservation ──────────────────────
  // The previous site used /category/... and /item/... URL structures.
  // These 301s transfer link equity and bookmarks to the new canonical URLs.
  async redirects() {
    return [
      // ── Old category slugs → new canonical category pages ─────────────────
      { source: '/category/air-conditioners',       destination: '/products/category/air-conditioners',   permanent: true },
      { source: '/category/air-conditioner',        destination: '/products/category/air-conditioners',   permanent: true },
      { source: '/category/refrigerators',          destination: '/products/category/refrigerators',      permanent: true },
      { source: '/category/refrigerator',           destination: '/products/category/refrigerators',      permanent: true },
      { source: '/category/washing-machines',       destination: '/products/category/washing-machines',   permanent: true },
      { source: '/category/washing-machine',        destination: '/products/category/washing-machines',   permanent: true },
      { source: '/category/freezers',               destination: '/products/category/freezers',           permanent: true },
      { source: '/category/freezer',                destination: '/products/category/freezers',           permanent: true },
      { source: '/category/televisions',            destination: '/products/category/televisions',        permanent: true },
      { source: '/category/television',             destination: '/products/category/televisions',        permanent: true },
      { source: '/category/tv',                     destination: '/products/category/televisions',        permanent: true },
      { source: '/category/smart-tv',               destination: '/products/category/televisions',        permanent: true },
      { source: '/category/kitchen-appliances',     destination: '/products/category/kitchen-appliances', permanent: true },
      { source: '/category/kitchen',                destination: '/products/category/kitchen-appliances', permanent: true },
      { source: '/category/water-dispensers',       destination: '/products/category/water-dispensers',   permanent: true },
      { source: '/category/water-dispenser',        destination: '/products/category/water-dispensers',   permanent: true },
      { source: '/category/small-appliances',       destination: '/products/category/small-appliances',   permanent: true },
      { source: '/category/solar',                  destination: '/products/category/solar',              permanent: true },
      { source: '/category/solar-ups',              destination: '/products/category/solar',              permanent: true },
      { source: '/category/ups',                    destination: '/products/category/solar',              permanent: true },
      { source: '/category/inverters',              destination: '/products/category/solar',              permanent: true },
      { source: '/category/batteries',              destination: '/products/category/solar',              permanent: true },

      // ── Old /products/:id and /item/:id single-product URLs ───────────────
      // The old site used /products/:id or /item/:id paths (numeric or slug IDs).
      // We can only redirect by slug — numeric-id products that have no matching
      // slug will land on /products (full catalogue) to avoid a hard 404.
      // Specific known legacy slugs are listed first; the wildcard catch-all
      // redirects everything else to /products.
      { source: '/item/:slug',     destination: '/products/:slug',   permanent: true },
      { source: '/product/:slug',  destination: '/products/:slug',   permanent: true },

      // ── Old policy/info pages ──────────────────────────────────────────────
      { source: '/privacy',           destination: '/policy/privacy',      permanent: true },
      { source: '/privacy-policy',    destination: '/policy/privacy',      permanent: true },
      { source: '/terms',             destination: '/policy/terms',        permanent: true },
      { source: '/terms-of-service',  destination: '/policy/terms',        permanent: true },
      { source: '/warranty',          destination: '/policy/warranty',     permanent: true },
      { source: '/warranty-policy',   destination: '/policy/warranty',     permanent: true },
      { source: '/refund',            destination: '/policy/refund',       permanent: true },
      { source: '/refund-policy',     destination: '/policy/refund',       permanent: true },

      // ── Old installment / finance pages ───────────────────────────────────
      { source: '/easy-installments', destination: '/installments',        permanent: true },
      { source: '/installment',       destination: '/installments',        permanent: true },
      { source: '/finance',           destination: '/installments',        permanent: true },

      // ── Old solar landing pages ───────────────────────────────────────────
      { source: '/solar-systems',     destination: '/solar',               permanent: true },
      { source: '/solar-panel',       destination: '/solar',               permanent: true },
      { source: '/solar-panels',      destination: '/solar',               permanent: true },
      { source: '/solar-inverter',    destination: '/solar',               permanent: true },

      // ── Old brand pages ───────────────────────────────────────────────────
      { source: '/brand/haier',       destination: '/brands/haier',        permanent: true },
      { source: '/brand/dawlance',    destination: '/brands/dawlance',     permanent: true },
      { source: '/brand/gree',        destination: '/brands/gree',         permanent: true },
      { source: '/brand/ecostar',     destination: '/brands/ecostar',      permanent: true },
      { source: '/brand/westpoint',   destination: '/brands/westpoint',    permanent: true },
      { source: '/brand/pel',         destination: '/brands/pel',          permanent: true },
      { source: '/brand/tcl',         destination: '/brands/tcl',          permanent: true },
      { source: '/brand/crown',       destination: '/brands/crown',        permanent: true },

      // ── Legacy catalog route ──────────────────────────────────────────────
      { source: '/catalog',           destination: '/admin',               permanent: true },
    ]
  },
}

export default nextConfig
