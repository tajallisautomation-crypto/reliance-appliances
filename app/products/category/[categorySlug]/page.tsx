import type { Metadata } from 'next'
import { Suspense } from 'react'
import ProductsClient from '@/views/Products'

const SITE_URL = 'https://reliance.tajallis.com.pk'

const CATEGORY_META: Record<string, {
  label: string
  description: string
  intro: string
  defaultSub?: string   // pre-applies a DEEP_SUBCATEGORIES filter on load
}> = {
  'air-conditioners': {
    label: 'Air Conditioners',
    description: "Buy air conditioners on easy installments in Karachi. Inverter ACs, T3-rated, 1 ton to 2 ton. Haier, Gree, EcoStar, Dawlance. Free delivery & professional installation.",
    intro: "Browse inverter, heat-and-cool, and T3-rated air conditioners from Pakistan's top brands. All ACs come with manufacturer warranty, professional installation, and Karachi-wide delivery.",
  },
  'refrigerators': {
    label: 'Refrigerators',
    description: "Buy refrigerators in Karachi on installments. Single door, double door, glass door, inverter fridges. Haier, Dawlance, PEL. Free delivery & official warranty.",
    intro: "Find single-door, double-door, and glass-door refrigerators from Haier, Dawlance, and PEL. All products are genuine with full manufacturer warranty and fast Karachi delivery.",
  },
  'washing-machines': {
    label: 'Washing Machines',
    description: "Buy washing machines in Karachi on installments. Automatic, semi-automatic, top-load, front-load. Haier, Dawlance, Westpoint. Free delivery & installation.",
    intro: "Fully automatic, semi-automatic, top-load, and front-load washing machines from trusted brands. Delivered and installed anywhere in Karachi.",
  },
  'freezers': {
    label: 'Freezers',
    description: "Buy chest freezers and deep freezers in Karachi. Single-door and double-door options. Dawlance, Haier, PEL. Commercial and home freezers available.",
    intro: "Chest freezers and deep freezers for homes, shops, and businesses. All models are genuine with official warranty and Karachi-wide delivery.",
  },
  'televisions': {
    label: 'Televisions',
    description: "Buy smart TVs in Karachi on easy installments. 4K, LED, Smart Android TVs from TCL, Samsung, EcoStar, Haier. Free delivery, genuine warranty.",
    intro: "Smart LED and 4K TVs from TCL, Samsung, EcoStar, and Haier. Wide selection of screen sizes with official warranty and fast delivery across Karachi.",
  },
  'kitchen-appliances': {
    label: 'Kitchen Appliances',
    description: "Buy kitchen appliances in Karachi. Microwaves, air fryers, blenders, sandwich makers, electric kettles from Westpoint, Dawlance. Easy installments.",
    intro: "Microwaves, air fryers, electric kettles, sandwich makers, and more. Genuine Westpoint, Dawlance, and other brand kitchen appliances with official warranty.",
  },
  'water-dispensers': {
    label: 'Water Dispensers',
    description: "Buy water dispensers in Karachi. Floor-standing, countertop, hot & cold dispensers. Genuine brands with warranty and fast delivery.",
    intro: "Hot & cold and countertop water dispensers for homes and offices. All models come with official warranty and Karachi-wide delivery.",
  },
  'small-appliances': {
    label: 'Small Appliances',
    description: "Buy small home appliances in Karachi. Fans, irons, heaters, room coolers. Genuine products with warranty and fast Karachi delivery.",
    intro: "Fans, irons, room heaters, and other small home appliances from trusted brands. All products are genuine with official warranty.",
  },
  'solar': {
    label: 'Solar & UPS Solutions',
    description: "Buy solar panels, inverters, and UPS battery backup systems in Karachi. On-grid, off-grid, hybrid solar systems. Crown, Ziewnic, Hanco.",
    intro: "Solar systems, inverters, and UPS battery backup solutions for homes and businesses. We handle design, supply, and installation across Karachi.",
  },

  // ── Deep SEO subcategory landing pages ────────────────────────────────────
  '1-ton-inverter-ac': {
    label: '1 Ton Inverter Air Conditioners',
    description: "Buy 1 ton inverter AC in Karachi on installments. Ideal for bedrooms up to 130 sq.ft. Save 40–60% on electricity vs non-inverter. Haier, Gree, Dawlance, EcoStar. Free installation.",
    intro: "A 1 ton inverter AC is the perfect match for bedrooms and small rooms up to 130 sq.ft. Inverter technology keeps electricity bills low by adjusting compressor speed rather than cycling on/off. Genuine brands, manufacturer warranty, and free professional installation across Karachi.",
    defaultSub: '1-ton-inverter',
  },
  '1-5-ton-inverter-ac': {
    label: '1.5 Ton Inverter Air Conditioners',
    description: "Buy 1.5 ton inverter AC in Karachi on installments. Best for living rooms & master bedrooms up to 200 sq.ft. Haier, Gree, EcoStar. Free delivery & installation.",
    intro: "The 1.5 ton inverter AC is Pakistan's most popular size — ideal for living rooms, dining areas, and master bedrooms up to 200 sq.ft. All models include inverter compressor technology for 40–60% electricity savings versus conventional ACs. Available on 3, 6, and 12-month installments.",
    defaultSub: '1-5-ton-inverter',
  },
  't3-inverter-ac': {
    label: 'T3 Rated Air Conditioners (High Ambient)',
    description: "Buy T3-rated ACs in Karachi. Engineered for 52°C ambient temperature — built for Pakistan's extreme summers. Haier, Gree. Works when standard ACs trip. Free installation.",
    intro: "T3-rated ACs are engineered to operate reliably at ambient temperatures up to 52°C — critical for Karachi and Sindh summers where standard ACs trip under peak heat. Look for the T3 badge on Haier HSU and Gree HFT/HFAB series. All T3 models are inverter-based for lower running costs.",
    defaultSub: 't3-air-conditioners',
  },
  'inverter-refrigerators': {
    label: 'Inverter Refrigerators',
    description: "Buy inverter compressor refrigerators in Karachi. Save 30–40% on electricity. No-frost, glass door, double door options. Haier, Dawlance, PEL. Easy installments, free delivery.",
    intro: "Inverter compressor refrigerators maintain precise temperatures while consuming significantly less electricity than fixed-speed models. The compressor runs continuously at variable speed instead of cycling on/off — extending food freshness and reducing noise. Available in single-door, double-door, and glass-door configurations from Haier, Dawlance, and PEL.",
    defaultSub: 'inverter-fridge',
  },
  'front-load-washing-machines': {
    label: 'Front Load Washing Machines',
    description: "Buy front load washing machines in Karachi on installments. Gentler on clothes, uses less water. 7kg, 8kg, 10kg options. Haier, Dawlance. Free delivery & professional installation.",
    intro: "Front load washing machines use a tumbling action that is gentler on fabrics and uses 40% less water than top-load machines. They also spin faster, leaving clothes drier before the drying cycle. Ideal for families that do frequent laundry or own delicate fabrics. Available in 7 kg to 10 kg capacity with free installation.",
    defaultSub: 'front-load',
  },
  'chest-freezers': {
    label: 'Chest Freezers & Deep Freezers',
    description: "Buy chest freezers & deep freezers in Karachi. For homes, shops, restaurants & bakeries. 5 to 20+ Cu.Ft. Dawlance, Haier, PEL. Fast delivery, official warranty.",
    intro: "Chest freezers (deep freezers) provide the most efficient and affordable bulk cold storage — essential for large families, caterers, butcher shops, and bakeries in Karachi. Single-door chest models are the most energy-efficient design due to top-opening lids that trap cold air. Available from 5 Cu.Ft compact units to 20+ Cu.Ft commercial-grade freezers.",
    defaultSub: 'single-door-freezer',
  },
  '5kw-solar-system': {
    label: '5 kW Solar Inverter Systems',
    description: "Buy 5kW solar inverter systems in Karachi. Covers most homes. Eliminate electricity bills. Hybrid, on-grid, off-grid options. Crown, Ziewnic, Hanco. Professional installation.",
    intro: "A 5 kW solar inverter system is the most popular choice for Karachi households — sufficient to run 2 ACs, refrigerator, washing machine, and general lighting simultaneously. Hybrid models store excess solar energy in batteries for night use. Crown, Ziewnic, and Hanco inverters come with 5-year warranty and professional installation by our certified team.",
    defaultSub: 'up-to-5kw',
  },
  'ups-backup-system': {
    label: 'UPS & Solar Inverter Backup Systems',
    description: "Buy UPS & solar inverter backup systems in Karachi. 24/7 power backup for homes & offices. 1kW to 10kW. Crown, Ziewnic. Battery backup options. Free site survey.",
    intro: "UPS and solar inverter systems provide uninterrupted power during load-shedding — from simple single-room backup to whole-home solar systems. Pair with lithium or AGM batteries for 4–12 hours of backup. Our team will assess your power needs and recommend the right size for your home or business, with installation across Karachi.",
    defaultSub: 'solar-inverters',
  },
}

function getCategory(slug: string) {
  return CATEGORY_META[slug] ?? {
    label: slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    description: `Buy ${slug.replace(/-/g, ' ')} in Karachi on easy installments. Genuine products, free delivery, after-sale support.`,
    intro: `Browse our full range of ${slug.replace(/-/g, ' ')} — all genuine products with official warranty and Karachi-wide delivery.`,
  }
}

export async function generateMetadata({ params }: { params: { categorySlug: string } }): Promise<Metadata> {
  const cat = getCategory(params.categorySlug)
  return {
    title: `${cat.label} in Karachi — Tajalli's`,
    description: cat.description,
    alternates: { canonical: `${SITE_URL}/products/category/${params.categorySlug}` },
  }
}

export function generateStaticParams() {
  return Object.keys(CATEGORY_META).map(slug => ({ categorySlug: slug }))
}

export const revalidate = 3600

export default function CategoryPage({ params }: { params: { categorySlug: string } }) {
  const cat = getCategory(params.categorySlug)
  const canonicalUrl = `${SITE_URL}/products/category/${params.categorySlug}`

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home',     item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Products', item: `${SITE_URL}/products` },
      { '@type': 'ListItem', position: 3, name: cat.label,  item: canonicalUrl },
    ],
  }

  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${cat.label} in Karachi`,
    description: cat.description,
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

      {/* SEO header — visible intro for crawlers and customers */}
      <div className="bg-gradient-to-b from-brand-50/40 to-white border-b border-brand-100/50 px-4 py-6">
        <div className="max-w-7xl mx-auto">
          {/* Breadcrumb nav */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
            <a href="/" className="hover:text-brand-600 transition-colors">Home</a>
            <span>/</span>
            <a href="/products" className="hover:text-brand-600 transition-colors">Products</a>
            <span>/</span>
            <span className="text-gray-600 font-medium">{cat.label}</span>
          </nav>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mb-1">{cat.label} in Karachi</h1>
          <p className="text-sm text-gray-500 max-w-2xl">{cat.intro}</p>
        </div>
      </div>

      <Suspense>
        <ProductsClient defaultSub={cat.defaultSub} />
      </Suspense>
    </>
  )
}
