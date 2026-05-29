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
}

export default nextConfig
