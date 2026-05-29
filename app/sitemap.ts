import { MetadataRoute } from 'next'
import { getProducts } from '@/lib/api'

const SITE = 'https://reliance.tajallis.com.pk'

const STATIC_ROUTES: { url: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }[] = [
  { url: '/',                   priority: 1.0, changeFrequency: 'daily'   },
  { url: '/products',           priority: 0.9, changeFrequency: 'daily'   },
  { url: '/solar',              priority: 0.9, changeFrequency: 'weekly'  },
  { url: '/green-corridor',     priority: 0.8, changeFrequency: 'weekly'  },
  { url: '/services',           priority: 0.8, changeFrequency: 'weekly'  },
  { url: '/installments',       priority: 0.8, changeFrequency: 'weekly'  },
  { url: '/build-your-package', priority: 0.7, changeFrequency: 'weekly'  },
  { url: '/bundles',            priority: 0.7, changeFrequency: 'weekly'  },
  { url: '/corporate',          priority: 0.7, changeFrequency: 'monthly' },
  { url: '/about',              priority: 0.6, changeFrequency: 'monthly' },
  { url: '/contact',            priority: 0.6, changeFrequency: 'monthly' },
  { url: '/gallery',            priority: 0.6, changeFrequency: 'weekly'  },
  { url: '/solar-calculator',   priority: 0.6, changeFrequency: 'monthly' },
  { url: '/solar/off-grid',     priority: 0.6, changeFrequency: 'monthly' },
  { url: '/tools',              priority: 0.5, changeFrequency: 'monthly' },
  { url: '/buying-guide',       priority: 0.5, changeFrequency: 'monthly' },
  { url: '/support',            priority: 0.5, changeFrequency: 'monthly' },
  { url: '/referral',           priority: 0.4, changeFrequency: 'monthly' },
  { url: '/partner',            priority: 0.4, changeFrequency: 'monthly' },
]

const BRAND_SLUGS = [
  'haier', 'dawlance', 'gree', 'ecostar', 'crown', 'westpoint', 'pel', 'tcl',
]

const CATEGORY_SLUGS = [
  'air-conditioners',
  'refrigerators',
  'freezers',
  'washing-machines',
  'televisions',
  'kitchen-appliances',
  'water-dispensers',
  'small-appliances',
  'solar-ups-backup',
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map(r => ({
    url: `${SITE}${r.url}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }))

  const categoryEntries: MetadataRoute.Sitemap = CATEGORY_SLUGS.map(slug => ({
    url: `${SITE}/products/category/${slug}`,
    lastModified: now,
    changeFrequency: 'daily',
    priority: 0.85,
  }))

  const brandEntries: MetadataRoute.Sitemap = BRAND_SLUGS.map(slug => ({
    url: `${SITE}/brands/${slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  let productEntries: MetadataRoute.Sitemap = []
  try {
    const { products } = await getProducts()
    productEntries = products
      .filter(p => p.slug)
      .map(p => ({
        url: `${SITE}/products/${p.slug}`,
        lastModified: p.updated_at ? new Date(p.updated_at) : now,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }))
  } catch {
    // Sitemap generation continues without products if API fails
  }

  return [...staticEntries, ...categoryEntries, ...brandEntries, ...productEntries]
}
