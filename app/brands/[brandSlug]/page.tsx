import type { Metadata } from 'next'
import { Suspense } from 'react'
import ProductsClient from '@/views/Products'

const SITE_URL = 'https://reliance.tajallis.com.pk'

const BRAND_META: Record<string, {
  name:        string
  tagline:     string
  description: string
  intro:       string
  color:       string
}> = {
  haier: {
    name:        'Haier',
    tagline:     'Karachi\'s #1 selling brand for ACs, refrigerators & washing machines',
    description: 'Buy genuine Haier appliances in Karachi on easy installments. Inverter ACs, refrigerators, washing machines & more. Official warranty, free delivery, professional installation.',
    intro:       'Haier is Pakistan\'s best-selling appliance brand — covering inverter ACs, no-frost refrigerators, automatic washing machines and more. All Haier products at Tajalli\'s come with official manufacturer warranty, free Karachi delivery, and professional installation.',
    color:       '#e31837',
  },
  dawlance: {
    name:        'Dawlance',
    tagline:     'Pakistan\'s trusted refrigerator & freezer brand since 1980',
    description: 'Buy genuine Dawlance refrigerators, freezers and washing machines in Karachi on installments. Official warranty, free delivery and after-sale support.',
    intro:       'Dawlance has been Pakistan\'s household refrigerator brand for over four decades. Shop single-door, double-door, and glass-door fridges, chest freezers, and washing machines — all with official warranty and Karachi-wide delivery from Tajalli\'s.',
    color:       '#003087',
  },
  gree: {
    name:        'Gree',
    tagline:     'World\'s largest AC manufacturer — premium inverter cooling for Karachi',
    description: 'Buy Gree inverter ACs in Karachi on easy installments. 1 ton, 1.5 ton, 2 ton split ACs. T3-rated for Pakistan climate. Official warranty & professional installation.',
    intro:       'Gree is the world\'s largest air conditioner manufacturer, known for premium inverter technology and T3-rated models built for Pakistan\'s hot climate. Buy Gree ACs in Karachi with free delivery and professional installation from Tajalli\'s certified team.',
    color:       '#006940',
  },
  ecostar: {
    name:        'EcoStar',
    tagline:     'Pakistani brand — ACs, TVs and refrigerators made for local conditions',
    description: 'Buy EcoStar ACs, Smart TVs and refrigerators in Karachi on installments. Made for Pakistan\'s climate. Official warranty, free delivery, installation included.',
    intro:       'EcoStar is a proudly Pakistani brand offering inverter ACs, Smart LEDs, and refrigerators designed for local conditions. Tajalli\'s stocks EcoStar\'s full range with official warranty, fast Karachi delivery, and professional installation.',
    color:       '#1a9e4c',
  },
  crown: {
    name:        'Crown',
    tagline:     'Karachi\'s go-to brand for solar inverters, batteries & UPS solutions',
    description: 'Buy Crown solar inverters, lithium batteries and UPS systems in Karachi. Complete energy solutions for homes and businesses. Expert installation included.',
    intro:       'Crown is the leading brand for solar inverters, lithium-ion batteries, and UPS backup systems in Pakistan. Tajalli\'s is an authorised Crown dealer in Karachi, providing complete solar and backup energy solutions with professional installation and after-sale support.',
    color:       '#1a1a2e',
  },
  westpoint: {
    name:        'Westpoint',
    tagline:     'Trusted kitchen & home appliances across Pakistan',
    description: 'Buy Westpoint kitchen appliances in Karachi — microwaves, air fryers, blenders, sandwich makers, electric kettles. Genuine products with official warranty.',
    intro:       'Westpoint offers a wide range of kitchen and small home appliances including air fryers, microwave ovens, electric kettles, sandwich makers, blenders, and more. All products at Tajalli\'s are genuine with official warranty and fast Karachi delivery.',
    color:       '#2563eb',
  },
  pel: {
    name:        'PEL',
    tagline:     'Pakistan\'s own appliance manufacturer — refrigerators & ACs',
    description: 'Buy PEL refrigerators and air conditioners in Karachi on installments. Official warranty, free delivery and installation. Genuine PEL products.',
    intro:       'PEL (Pak Elektron Limited) is one of Pakistan\'s oldest home appliance brands, trusted for refrigerators and air conditioners. Shop genuine PEL products with official warranty and fast delivery across Karachi from Tajalli\'s.',
    color:       '#c0392b',
  },
  tcl: {
    name:        'TCL',
    tagline:     'Smart TVs & ACs at competitive prices',
    description: 'Buy TCL Smart TVs and air conditioners in Karachi on easy installments. 4K, QLED, Android TVs & inverter ACs. Official warranty, free delivery.',
    intro:       'TCL offers feature-rich Smart TVs and inverter air conditioners at competitive prices. Shop QLED, 4K Android TVs and TCL inverter ACs at Tajalli\'s — all with official warranty and free delivery across Karachi.',
    color:       '#d4001a',
  },
}

function getBrand(slug: string) {
  const key = slug.toLowerCase()
  return BRAND_META[key] ?? {
    name:        slug.charAt(0).toUpperCase() + slug.slice(1),
    tagline:     `Genuine ${slug} products in Karachi`,
    description: `Buy genuine ${slug} appliances in Karachi on easy installments. Official warranty, free delivery and after-sale support from Tajalli's.`,
    intro:       `Browse our full range of genuine ${slug} products — all come with official manufacturer warranty and fast delivery across Karachi.`,
    color:       '#0F2D52',
  }
}

export async function generateMetadata({ params }: { params: { brandSlug: string } }): Promise<Metadata> {
  const brand = getBrand(params.brandSlug)
  return {
    title: `${brand.name} Appliances in Karachi — Tajalli's`,
    description: brand.description,
    alternates: { canonical: `${SITE_URL}/brands/${params.brandSlug}` },
  }
}

export function generateStaticParams() {
  return Object.keys(BRAND_META).map(slug => ({ brandSlug: slug }))
}

export const revalidate = 3600

export default function BrandPage({ params }: { params: { brandSlug: string } }) {
  const brand = getBrand(params.brandSlug)
  const canonicalUrl = `${SITE_URL}/brands/${params.brandSlug}`

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home',     item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Products', item: `${SITE_URL}/products` },
      { '@type': 'ListItem', position: 3, name: brand.name, item: canonicalUrl },
    ],
  }

  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${brand.name} Appliances in Karachi`,
    description: brand.description,
    url: canonicalUrl,
    breadcrumb: breadcrumbSchema,
    provider: {
      '@type': 'Organization',
      name: "Tajalli's Home & Commercial Solutions",
      url: SITE_URL,
    },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }} />

      {/* Brand hero header */}
      <div className="bg-gradient-to-b from-brand-50/40 to-white border-b border-brand-100/50 px-4 py-6">
        <div className="max-w-7xl mx-auto">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
            <a href="/" className="hover:text-brand-600 transition-colors">Home</a>
            <span>/</span>
            <a href="/products" className="hover:text-brand-600 transition-colors">Products</a>
            <span>/</span>
            <span className="text-gray-600 font-medium">{brand.name}</span>
          </nav>

          <div className="flex items-center gap-4 mb-3">
            {/* Brand colour swatch */}
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-xl flex-shrink-0 shadow-sm"
              style={{ backgroundColor: brand.color }}
              aria-hidden="true"
            >
              {brand.name[0]}
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 leading-tight">
                {brand.name} Appliances in Karachi
              </h1>
              <p className="text-sm text-brand-600 font-semibold mt-0.5">{brand.tagline}</p>
            </div>
          </div>

          <p className="text-sm text-gray-500 max-w-2xl">{brand.intro}</p>
        </div>
      </div>

      <Suspense>
        <ProductsClient />
      </Suspense>
    </>
  )
}
