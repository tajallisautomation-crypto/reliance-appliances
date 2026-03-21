import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams, useParams, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { Grid3X3, List, SlidersHorizontal, X } from 'lucide-react'
import { getProducts, DEFAULT_CATEGORIES, type Product } from '../lib/api'
import ProductCard from '../components/products/ProductCard'
import SEO from '../components/ui/SEO'

const SORT_OPTIONS = [
  { value: '', label: 'Featured' },
  { value: 'price_asc', label: 'Price ↑' },
  { value: 'price_desc', label: 'Price ↓' },
  { value: 'name_asc', label: 'Name A–Z' },
]

export default function Products() {
  const [sp, setSp]           = useSearchParams()
  const { categorySlug }      = useParams<{ categorySlug?: string }>()
  const navigate              = useNavigate()
  const [products, setProducts] = useState<Product[]>([])
  const [total, setTotal]     = useState(0)
  const [loading, setLoading] = useState(true)
  const [view, setView]       = useState<'grid' | 'list'>('grid')
  const [showFilters, setShowFilters] = useState(false)

  // Category comes from URL path param OR ?category= query param.
  // Path param is authoritative; query param is used only on /products (no categorySlug).
  const category = categorySlug || sp.get('category') || ''
  const brand    = sp.get('brand') || ''
  const search   = sp.get('search') || ''
  const sort     = sp.get('sort') || ''

  // Find the active DEFAULT_CATEGORIES entry — handles both id ('ac') and slug ('air-conditioners').
  const activeCat = DEFAULT_CATEGORIES.find(
    c => c.id === category || c.slug === category
  )

  const fetchProducts = useCallback(() => {
    setLoading(true)
    const params: Record<string, string> = {}
    // Always pass the raw value from URL — CAT_TERMS in api.ts handles id/slug/canonical
    if (category) params.category = category
    if (brand)    params.brand    = brand
    if (search)   params.search   = search
    if (sort)     params.sort     = sort
    getProducts(params).then(d => {
      setProducts(d.products)
      setTotal(d.total)
      setLoading(false)
    })
  }, [category, brand, search, sort])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  // Dynamic brand list from loaded products — shows only brands actually in the current view
  const brands = useMemo(
    () => [...new Set(products.map(p => p.brand).filter(Boolean))].sort(),
    [products]
  )

  // Navigate to a category — uses /products/category/:slug URL when a slug is known,
  // otherwise falls back to a ?category= query param.
  function goToCategory(catId: string) {
    if (!catId) { navigate('/products'); return }
    const cat = DEFAULT_CATEGORIES.find(c => c.id === catId || c.slug === catId)
    if (cat) { navigate(`/products/category/${cat.slug}`); return }
    // Unknown category id (e.g. canonical snake_case) — query param fallback
    const next = new URLSearchParams(sp)
    next.set('category', catId)
    setSp(next)
  }

  function setFilter(key: string, val: string) {
    if (key === 'category') { goToCategory(val); return }
    const next = new URLSearchParams(sp)
    if (val) next.set(key, val); else next.delete(key)
    setSp(next)
  }

  function clearAll() {
    // If on a category URL, navigate back to /products
    if (categorySlug) { navigate('/products'); return }
    setSp({})
  }

  const hasFilters = !!(category || brand || search)

  const seoTitle = activeCat
    ? `${activeCat.name} — Buy in Karachi on Installments`
    : search
    ? `Search: "${search}" — Reliance Appliances`
    : 'All Products — Home Appliances Karachi'

  const SITE_URL = import.meta.env.VITE_SITE_URL || 'https://reliance.tajallis.com.pk';
  const pageUrl  = categorySlug ? `/products/category/${categorySlug}` : '/products';

  // ItemList schema — lets Google show individual products in search results
  const itemListSchema = products.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: seoTitle,
    url: `${SITE_URL}${pageUrl}`,
    numberOfItems: products.length,
    itemListElement: products.slice(0, 20).map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${SITE_URL}/products/${p.slug}`,
      name: p.simplified_name || `${p.brand} ${p.model}`,
    })),
  } : null;

  // BreadcrumbList for category pages
  const breadcrumbSchema = activeCat ? {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home',     item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Products', item: `${SITE_URL}/products` },
      { '@type': 'ListItem', position: 3, name: activeCat.name },
    ],
  } : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <SEO
        title={seoTitle}
        description={`Shop ${activeCat?.name || 'home appliances'} in Karachi. Genuine products with easy installments, home delivery & after-sale support. ${total} products available.`}
        path={pageUrl}
      />
      <Helmet>
        {itemListSchema && <script type="application/ld+json">{JSON.stringify(itemListSchema)}</script>}
        {breadcrumbSchema && <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>}
      </Helmet>

      {/* Sticky filter bar */}
      <div className="bg-white border-b sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
          <div className="text-sm text-gray-500">
            <span className="text-gray-900 font-semibold">{loading ? '…' : total}</span> products
            {activeCat && (
              <span className="ml-1">
                in <span className="text-orange-600 font-medium">{activeCat.icon} {activeCat.name}</span>
              </span>
            )}
            {search && (
              <span className="ml-1">
                for "<span className="text-orange-600 font-medium">{search}</span>"
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto flex-wrap">
            {/* Category pill tabs (desktop) */}
            <div className="hidden md:flex gap-1 overflow-x-auto">
              <button
                onClick={() => goToCategory('')}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all
                  ${!category ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-orange-50'}`}>
                All
              </button>
              {DEFAULT_CATEGORIES.map(c => (
                <button
                  key={c.id}
                  onClick={() => goToCategory(c.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap flex items-center gap-1 transition-all
                    ${activeCat?.id === c.id ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-orange-50'}`}>
                  {c.icon} {c.name}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <select
                value={sort}
                onChange={e => setFilter('sort', e.target.value)}
                className="text-sm border border-gray-200 rounded-xl px-3 py-1.5 bg-white focus:outline-none focus:border-orange-400">
                {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <button
                onClick={() => setShowFilters(f => !f)}
                className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl border
                  ${showFilters ? 'bg-orange-500 text-white border-orange-500' : 'border-gray-200 text-gray-600 hover:border-orange-300'}`}>
                <SlidersHorizontal className="w-3.5 h-3.5" /> Filters
              </button>
              <div className="flex border border-gray-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setView('grid')}
                  className={`p-1.5 ${view === 'grid' ? 'bg-orange-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setView('list')}
                  className={`p-1.5 ${view === 'list' ? 'bg-orange-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Extended filters panel */}
        {showFilters && (
          <div className="border-t bg-gray-50 px-4 py-4">
            <div className="max-w-7xl mx-auto flex flex-wrap gap-6 items-start">
              {/* Mobile category row */}
              <div className="md:hidden w-full">
                <div className="text-xs font-semibold text-gray-500 mb-2">CATEGORY</div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => { goToCategory(''); setShowFilters(false); }}
                    className={`px-3 py-1.5 rounded-xl text-sm ${!category ? 'bg-orange-500 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:border-orange-300'}`}>
                    All
                  </button>
                  {DEFAULT_CATEGORIES.map(c => (
                    <button
                      key={c.id}
                      onClick={() => { goToCategory(c.id); setShowFilters(false); }}
                      className={`px-3 py-1.5 rounded-xl text-sm ${activeCat?.id === c.id ? 'bg-orange-500 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:border-orange-300'}`}>
                      {c.icon} {c.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Brand filter — dynamic from loaded products */}
              {brands.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-gray-500 mb-2">BRAND</div>
                  <div className="flex gap-2 flex-wrap">
                    {brands.map(b => (
                      <button
                        key={b}
                        onClick={() => setFilter('brand', brand === b.toLowerCase() ? '' : b.toLowerCase())}
                        className={`px-3 py-1.5 rounded-xl text-sm
                          ${brand === b.toLowerCase() ? 'bg-orange-500 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:border-orange-300'}`}>
                        {b}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {hasFilters && (
                <button
                  onClick={clearAll}
                  className="flex items-center gap-1 text-sm text-red-500 hover:text-red-700 ml-auto">
                  <X className="w-4 h-4" /> Clear filters
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Product grid */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className={view === 'grid' ? 'grid sm:grid-cols-2 lg:grid-cols-4 gap-5' : 'space-y-4'}>
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className={`bg-gray-100 rounded-2xl animate-pulse ${view === 'grid' ? 'h-72' : 'h-28'}`} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-bold text-gray-700 mb-2">No products found</h3>
            <p className="text-gray-500 mb-6">Try adjusting your filters or search term</p>
            <button onClick={clearAll} className="bg-orange-500 text-white px-6 py-2.5 rounded-xl font-medium">
              Clear Filters
            </button>
          </div>
        ) : (
          <div className={view === 'grid'
            ? 'grid sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-5'
            : 'space-y-4'}>
            {products.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
    </div>
  )
}
