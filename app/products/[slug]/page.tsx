import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase-server'
import { rowToProduct } from '@/lib/api'
import type { Product } from '@/lib/api'
import ProductDetailClient from '@/views/ProductDetail'

// Re-build each product page at most once per hour.
// Vercel serves the stale cached HTML instantly; rebuilds happen in the background.
export const revalidate = 3600

// Pre-build all In Stock and Coming Soon product slugs at deploy time.
// This means Googlebot/Bingbot get fully server-rendered HTML for every product URL.
export async function generateStaticParams() {
  try {
    const supabase = createServerClient()
    const { data } = await supabase
      .from('products')
      .select('slug')
      .in('stock_status', ['In Stock', 'Coming Soon'])
      .not('slug', 'is', null)
    return (data ?? []).map(p => ({ slug: p.slug as string }))
  } catch {
    return []
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RawRow = Record<string, any>

async function fetchProduct(slug: string): Promise<{ raw: RawRow; product: Product } | null> {
  try {
    const supabase = createServerClient()
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('slug', slug)
      .single()
    if (!data) return null
    return { raw: data, product: rowToProduct(data) }
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const result = await fetchProduct(params.slug)
  if (!result) return {}

  const p = result.raw
  const title = p.seo_title || `${p.brand} ${p.model} Price in Pakistan`
  const desc  = p.seo_description || `Buy ${p.brand} ${p.model} at best price in Karachi. Easy installment plans available. Free delivery across Karachi.`
  const image = p.thumbnail_url || undefined

  return {
    title,
    description: desc,
    keywords: p.seo_keywords || `${p.brand} ${p.model} price pakistan karachi buy`,
    openGraph: {
      title,
      description: desc,
      url: `https://reliance.tajallis.com.pk/products/${p.slug}`,
      images: image ? [{ url: image, alt: `${p.brand} ${p.model}` }] : undefined,
      type: 'website',
    },
    twitter: { card: 'summary_large_image', title, description: desc },
    alternates: { canonical: `https://reliance.tajallis.com.pk/products/${p.slug}` },
  }
}

// JSON-LD product schema — rendered server-side into the HTML <head>
function buildProductSchema(p: RawRow) {
  const siteUrl = 'https://reliance.tajallis.com.pk'
  const price = p.cash_floor || p.retail_price || 0
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.simplified_name || p.model,
    description: p.description || `${p.brand} ${p.model} — available at Tajalli's, Karachi.`,
    brand: { '@type': 'Brand', name: p.brand },
    model: p.model,
    sku: p.model,
    mpn: p.model,
    image: [p.thumbnail_url].filter(Boolean),
    url: `${siteUrl}/products/${p.slug}`,
    offers: {
      '@type': 'Offer',
      price,
      priceCurrency: 'PKR',
      availability: p.stock_status === 'In Stock'
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      url: `${siteUrl}/products/${p.slug}`,
      seller: { '@type': 'Organization', name: "Tajalli's", url: siteUrl },
      priceValidUntil: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingRate: { '@type': 'MonetaryAmount', value: 0, currency: 'PKR' },
        shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'PK', addressRegion: 'Sindh' },
      },
    },
  }
}

function buildBreadcrumbSchema(p: RawRow) {
  const siteUrl = 'https://reliance.tajallis.com.pk'
  const categorySlug = p.seo_category_slug || p.normalized_category || 'products'
  const categoryLabel = (p.category || categorySlug).replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home',          item: siteUrl },
      { '@type': 'ListItem', position: 2, name: 'Products',      item: `${siteUrl}/products` },
      { '@type': 'ListItem', position: 3, name: categoryLabel,   item: `${siteUrl}/products/category/${categorySlug}` },
      { '@type': 'ListItem', position: 4, name: p.simplified_name || p.model, item: `${siteUrl}/products/${p.slug}` },
    ],
  }
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const result = await fetchProduct(params.slug)
  if (!result) notFound()

  const schema     = buildProductSchema(result.raw)
  const breadcrumb = buildBreadcrumbSchema(result.raw)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      {/* Pass SSR-fetched product so the client component skips its own initial fetch,
          eliminating the loading spinner on first paint and putting product content in
          the pre-rendered HTML for crawlers. */}
      <ProductDetailClient initialProduct={result.product} />
    </>
  )
}
