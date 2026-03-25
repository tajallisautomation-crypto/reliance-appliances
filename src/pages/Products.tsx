import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams, useParams, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { Grid3X3, List, SlidersHorizontal, X, ChevronDown, ChevronUp } from 'lucide-react'
import { getProducts, DEFAULT_CATEGORIES, formatPrice, type Product } from '../lib/api'
import ProductCard from '../components/products/ProductCard'
import SEO from '../components/ui/SEO'

const SORT_OPTIONS = [
  { value: '',           label: 'Featured'   },
  { value: 'newest',     label: 'Newest'     },
  { value: 'price_asc',  label: 'Price ↑'   },
  { value: 'price_desc', label: 'Price ↓'   },
  { value: 'name_asc',   label: 'Name A–Z'  },
]

const BUDGET_RANGES = [
  { label: 'Under 20k',      min: 0,       max: 20000   },
  { label: '20k – 50k',      min: 20000,   max: 50000   },
  { label: '50k – 1 Lac',    min: 50000,   max: 100000  },
  { label: '1 – 2 Lac',      min: 100000,  max: 200000  },
  { label: 'Above 2 Lac',    min: 200000,  max: 9999999 },
]

// Category-specific spec filters — applied client-side
type SpecFilter = { key: string; label: string; options: { value: string; label: string; match: (p: Product) => boolean }[] }

const SPEC_FILTERS: Record<string, SpecFilter[]> = {
  ac: [
    {
      key: 'tonnage', label: 'Tonnage',
      options: [
        { value: '1t',   label: '1 Ton',   match: p => p.category.includes('1 Ton') && !p.category.includes('1.5') && !p.category.includes('2') },
        { value: '1.5t', label: '1.5 Ton', match: p => p.category.includes('1.5 Ton') },
        { value: '2t',   label: '2 Ton',   match: p => p.category.includes('2 Ton') },
      ],
    },
    {
      key: 'tech', label: 'Technology',
      options: [
        { value: 'inverter',     label: 'Inverter',     match: p => /inverter/i.test(p.tags + ' ' + p.simplified_name) },
        { value: 'non-inverter', label: 'Non-Inverter', match: p => !/inverter/i.test(p.tags + ' ' + p.simplified_name) },
      ],
    },
  ],
  fridge: [
    {
      key: 'fridgesize', label: 'Size',
      options: [
        { value: 'small',  label: 'Small (≤10 Cu.Ft)',   match: p => p.category.toLowerCase().includes('small') },
        { value: 'medium', label: 'Medium (11–16 Cu.Ft)', match: p => p.category.toLowerCase().includes('medium') },
        { value: 'large',  label: 'Large (17+ Cu.Ft)',   match: p => p.category.toLowerCase().includes('large') },
      ],
    },
    {
      key: 'fridgetech', label: 'Technology',
      options: [
        { value: 'inverter', label: 'Inverter', match: p => /inverter/i.test(p.simplified_name + ' ' + p.tags) },
      ],
    },
  ],
  washing: [
    {
      key: 'washtype', label: 'Type',
      options: [
        { value: 'auto',    label: 'Fully Automatic', match: p => p.category.toLowerCase().includes('automatic washing') && !p.category.toLowerCase().includes('semi') },
        { value: 'semi',    label: 'Semi-Automatic',  match: p => p.category.toLowerCase().includes('semi-automatic') },
        { value: 'spinner', label: 'Spinner / Spin Dryer', match: p => /spinner|spin dryer/i.test(p.category + ' ' + p.tags) },
      ],
    },
    {
      key: 'loadtype', label: 'Load',
      options: [
        { value: 'front', label: 'Front Load', match: p => /front.?load|front-load/i.test(p.tags + ' ' + p.simplified_name) },
        { value: 'top',   label: 'Top Load',   match: p => /top.?load|top-load/i.test(p.tags + ' ' + p.simplified_name) },
      ],
    },
    {
      key: 'blanket', label: 'Capacity',
      options: [
        { value: 'blanket', label: '≥12kg (Blanket Washable)', match: p => (p.tags || '').includes('blanket-washable') },
      ],
    },
    {
      key: 'washinverter', label: 'Technology',
      options: [
        { value: 'inverter', label: 'Inverter Motor', match: p => /inverter/i.test(p.simplified_name + ' ' + p.tags) },
      ],
    },
  ],
  kitchen: [
    {
      key: 'kitchentype', label: 'Sub-Category',
      options: [
        { value: 'cooking',   label: 'Cooking & Ovens',     match: p => p.category.toLowerCase().includes('cooking') },
        { value: 'blenders',  label: 'Blenders & Juicers',  match: p => p.category.toLowerCase().includes('blender') },
        { value: 'processors',label: 'Food Processors',     match: p => p.category.toLowerCase().includes('food proc') },
        { value: 'breakfast', label: 'Breakfast & Beverages',match: p => p.category.toLowerCase().includes('breakfast') },
      ],
    },
  ],
  microwave: [
    {
      key: 'mwtype', label: 'Type',
      options: [
        { value: 'grill',  label: 'Grill / Combo', match: p => /grill|combo/i.test(p.simplified_name + ' ' + (p.specs?.['Heating Technology'] || '')) },
        { value: 'solo',   label: 'Solo',          match: p => /solo/i.test(p.simplified_name) },
        { value: 'inverter', label: 'Inverter',    match: p => /inverter/i.test(p.simplified_name) },
        { value: 'airfryer', label: 'Air Fryer Combo', match: p => /\baf\b/i.test(p.model) },
      ],
    },
  ],
  small: [
    {
      key: 'smalltype', label: 'Type',
      options: [
        { value: 'iron',    label: 'Irons & Steamers', match: p => /iron|steamer/i.test(p.simplified_name) },
        { value: 'heater',  label: 'Heaters & Fans',   match: p => /heater|fan/i.test(p.simplified_name) },
        { value: 'vacuum',  label: 'Vacuum Cleaners',  match: p => /vacuum/i.test(p.simplified_name) },
        { value: 'kettle',  label: 'Kettles',          match: p => /kettle/i.test(p.simplified_name) },
      ],
    },
  ],
}

// Which SPEC_FILTERS key maps to a category slug
function getSpecKey(catId: string): string {
  if (catId === 'ac')        return 'ac'
  if (catId === 'fridge')    return 'fridge'
  if (catId === 'washing')   return 'washing'
  if (catId === 'kitchen')   return 'kitchen'
  if (catId === 'microwave') return 'microwave'
  if (catId === 'small')     return 'small'
  return ''
}

export default function Products() {
  const [sp, setSp]             = useSearchParams()
  const { categorySlug }        = useParams<{ categorySlug?: string }>()
  const navigate                = useNavigate()
  const [products, setProducts] = useState<Product[]>([])
  const [total, setTotal]       = useState(0)
  const [loading, setLoading]   = useState(true)
  const [view, setView]         = useState<'grid' | 'list'>('grid')
  const [showFilters, setShowFilters] = useState(false)
  const [specFilters, setSpecFilters] = useState<Record<string, string>>({})
  const [budgetIdx, setBudgetIdx] = useState<number | null>(null)
  const [inStockOnly, setInStockOnly] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    budget: true, brand: true, specs: true, stock: true,
  })

  const category = categorySlug || sp.get('category') || ''
  const brand    = sp.get('brand') || ''
  const search   = sp.get('search') || ''
  const sort     = sp.get('sort') || ''

  const activeCat = DEFAULT_CATEGORIES.find(c => c.id === category || c.slug === category)
  const specKey   = getSpecKey(activeCat?.id || category)
  const catSpecFilters = SPEC_FILTERS[specKey] || []

  const fetchProducts = useCallback(() => {
    setLoading(true)
    const params: Record<string, string> = {}
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

  // Reset client-side filters when category changes
  useEffect(() => { setSpecFilters({}); setBudgetIdx(null); setInStockOnly(false) }, [category])

  const brands = useMemo(
    () => [...new Set(products.map(p => p.brand).filter(Boolean))].sort(),
    [products]
  )

  // Client-side filtering (budget, spec filters, in-stock)
  const filteredProducts = useMemo(() => {
    let list = products
    if (budgetIdx !== null) {
      const { min, max } = BUDGET_RANGES[budgetIdx]
      list = list.filter(p => p.price.cash_floor >= min && p.price.cash_floor <= max)
    }
    if (inStockOnly) {
      list = list.filter(p => p.stock_status === 'In Stock')
    }
    for (const [key, val] of Object.entries(specFilters)) {
      if (!val) continue
      const filterGroup = catSpecFilters.find(f => f.key === key)
      const option = filterGroup?.options.find(o => o.value === val)
      if (option) list = list.filter(option.match)
    }
    return list
  }, [products, budgetIdx, inStockOnly, specFilters, catSpecFilters])

  function goToCategory(catId: string) {
    setSpecFilters({}); setBudgetIdx(null); setInStockOnly(false)
    if (!catId) { navigate('/products'); return }
    const cat = DEFAULT_CATEGORIES.find(c => c.id === catId || c.slug === catId)
    if (cat) { navigate(`/products/category/${cat.slug}`); return }
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
    setSpecFilters({}); setBudgetIdx(null); setInStockOnly(false)
    if (categorySlug) { navigate('/products'); return }
    setSp({})
  }

  function toggleSection(key: string) {
    setExpandedSections(s => ({ ...s, [key]: !s[key] }))
  }

  const hasFilters = !!(category || brand || search || budgetIdx !== null || inStockOnly || Object.values(specFilters).some(Boolean))
  const activeFilterCount = [
    brand, budgetIdx !== null ? 'b' : '', inStockOnly ? 's' : '',
    ...Object.values(specFilters).filter(Boolean)
  ].filter(Boolean).length

  const seoTitle = activeCat
    ? `${activeCat.name} — Buy in Karachi on Installments`
    : search
    ? `Search: "${search}" — Reliance Appliances`
    : 'All Products — Home Appliances Karachi'

  const SITE_URL = import.meta.env.VITE_SITE_URL || 'https://reliance.tajallis.com.pk'
  const pageUrl  = categorySlug ? `/products/category/${categorySlug}` : '/products'

  const itemListSchema = filteredProducts.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: seoTitle,
    url: `${SITE_URL}${pageUrl}`,
    numberOfItems: filteredProducts.length,
    itemListElement: filteredProducts.slice(0, 20).map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${SITE_URL}/products/${p.slug}`,
      name: p.simplified_name || `${p.brand} ${p.model}`,
    })),
  } : null

  const breadcrumbSchema = activeCat ? {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home',     item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Products', item: `${SITE_URL}/products` },
      { '@type': 'ListItem', position: 3, name: activeCat.name },
    ],
  } : null

  return (
    <div className="min-h-screen bg-gray-50">
      <SEO
        title={seoTitle}
        description={`Shop ${activeCat?.name || 'home appliances'} in Karachi. Genuine products with easy installments, home delivery & after-sale support. ${filteredProducts.length} products available.`}
        path={pageUrl}
      />
      <Helmet>
        {itemListSchema && <script type="application/ld+json">{JSON.stringify(itemListSchema)}</script>}
        {breadcrumbSchema && <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>}
      </Helmet>

      {/* ── Top bar ── */}
      <div className="bg-white border-b sticky top-16 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">

          {/* Result count */}
          <div className="text-sm text-gray-500 min-w-0">
            <span className="text-gray-900 font-semibold">{loading ? '…' : filteredProducts.length}</span>
            {!loading && filteredProducts.length !== total && (
              <span className="text-gray-400"> of {total}</span>
            )}
            <span className="ml-1">products</span>
            {activeCat && (
              <span className="ml-1 hidden sm:inline">
                in <span className="text-orange-600 font-medium">{activeCat.icon} {activeCat.name}</span>
              </span>
            )}
            {search && (
              <span className="ml-1">for "<span className="text-orange-600 font-medium">{search}</span>"</span>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto flex-wrap">
            {/* Category tabs — desktop */}
            <div className="hidden lg:flex gap-1 overflow-x-auto max-w-2xl">
              <button onClick={() => goToCategory('')}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all
                  ${!category ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-orange-50'}`}>
                All
              </button>
              {DEFAULT_CATEGORIES.map(c => (
                <button key={c.id} onClick={() => goToCategory(c.id)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap flex items-center gap-1 transition-all
                    ${activeCat?.id === c.id ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-orange-50'}`}>
                  {c.icon} {c.name}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {/* Sort */}
              <select value={sort} onChange={e => setFilter('sort', e.target.value)}
                className="text-xs border border-gray-200 rounded-xl px-3 py-1.5 bg-white focus:outline-none focus:border-orange-400 cursor-pointer">
                {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>

              {/* Filter toggle */}
              <button onClick={() => setShowFilters(f => !f)}
                className={`relative flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border transition-all
                  ${showFilters ? 'bg-orange-500 text-white border-orange-500' : 'border-gray-200 text-gray-600 hover:border-orange-300'}`}>
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Filters
                {activeFilterCount > 0 && (
                  <span className={`ml-0.5 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center
                    ${showFilters ? 'bg-white text-orange-500' : 'bg-orange-500 text-white'}`}>
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {/* View toggle */}
              <div className="flex border border-gray-200 rounded-xl overflow-hidden">
                <button onClick={() => setView('grid')}
                  className={`p-1.5 transition-colors ${view === 'grid' ? 'bg-orange-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button onClick={() => setView('list')}
                  className={`p-1.5 transition-colors ${view === 'list' ? 'bg-orange-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Filter Panel ── */}
        {showFilters && (
          <div className="border-t bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 py-5">
              {/* Mobile category picker */}
              <div className="lg:hidden mb-5">
                <FilterSection label="Category" expanded={expandedSections.cat} onToggle={() => toggleSection('cat')}>
                  <div className="flex gap-2 flex-wrap">
                    <Pill active={!category} onClick={() => { goToCategory(''); setShowFilters(false) }}>All</Pill>
                    {DEFAULT_CATEGORIES.map(c => (
                      <Pill key={c.id} active={activeCat?.id === c.id} onClick={() => { goToCategory(c.id); setShowFilters(false) }}>
                        {c.icon} {c.name}
                      </Pill>
                    ))}
                  </div>
                </FilterSection>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

                {/* Budget */}
                <FilterSection label="Budget" expanded={expandedSections.budget} onToggle={() => toggleSection('budget')}>
                  <div className="space-y-1.5">
                    {BUDGET_RANGES.map((r, i) => (
                      <label key={i} className="flex items-center gap-2.5 cursor-pointer group">
                        <input type="radio" name="budget" checked={budgetIdx === i}
                          onChange={() => setBudgetIdx(budgetIdx === i ? null : i)}
                          className="accent-orange-500 w-3.5 h-3.5 cursor-pointer" />
                        <span className={`text-sm transition-colors ${budgetIdx === i ? 'text-orange-600 font-semibold' : 'text-gray-600 group-hover:text-gray-900'}`}>
                          {r.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </FilterSection>

                {/* Brand */}
                {brands.length > 0 && (
                  <FilterSection label="Brand" expanded={expandedSections.brand} onToggle={() => toggleSection('brand')}>
                    <div className="flex gap-2 flex-wrap">
                      {brands.map(b => (
                        <Pill key={b} active={brand === b.toLowerCase()}
                          onClick={() => setFilter('brand', brand === b.toLowerCase() ? '' : b.toLowerCase())}>
                          {b}
                        </Pill>
                      ))}
                    </div>
                  </FilterSection>
                )}

                {/* Category-specific spec filters */}
                {catSpecFilters.map(sf => (
                  <FilterSection key={sf.key} label={sf.label} expanded={expandedSections[sf.key] !== false} onToggle={() => toggleSection(sf.key)}>
                    <div className="space-y-1.5">
                      {sf.options.map(opt => (
                        <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer group">
                          <input type="checkbox" checked={specFilters[sf.key] === opt.value}
                            onChange={() => setSpecFilters(prev => ({ ...prev, [sf.key]: prev[sf.key] === opt.value ? '' : opt.value }))}
                            className="accent-orange-500 w-3.5 h-3.5 cursor-pointer rounded" />
                          <span className={`text-sm transition-colors ${specFilters[sf.key] === opt.value ? 'text-orange-600 font-semibold' : 'text-gray-600 group-hover:text-gray-900'}`}>
                            {opt.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </FilterSection>
                ))}

                {/* In Stock */}
                <FilterSection label="Availability" expanded={expandedSections.stock} onToggle={() => toggleSection('stock')}>
                  <label className="flex items-center gap-2.5 cursor-pointer group">
                    <input type="checkbox" checked={inStockOnly}
                      onChange={() => setInStockOnly(v => !v)}
                      className="accent-orange-500 w-3.5 h-3.5 cursor-pointer rounded" />
                    <span className={`text-sm ${inStockOnly ? 'text-orange-600 font-semibold' : 'text-gray-600 group-hover:text-gray-900'}`}>
                      In Stock only
                    </span>
                  </label>
                </FilterSection>
              </div>

              {/* Active filter chips + clear */}
              {hasFilters && (
                <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-gray-200">
                  <span className="text-xs text-gray-400 font-medium">Active:</span>
                  {activeCat && <FilterChip label={`${activeCat.icon} ${activeCat.name}`} onRemove={() => goToCategory('')} />}
                  {brand && <FilterChip label={`Brand: ${brand}`} onRemove={() => setFilter('brand', '')} />}
                  {budgetIdx !== null && <FilterChip label={`Budget: ${BUDGET_RANGES[budgetIdx].label}`} onRemove={() => setBudgetIdx(null)} />}
                  {inStockOnly && <FilterChip label="In Stock" onRemove={() => setInStockOnly(false)} />}
                  {Object.entries(specFilters).filter(([,v]) => v).map(([k, v]) => {
                    const sf = catSpecFilters.find(f => f.key === k)
                    const opt = sf?.options.find(o => o.value === v)
                    return opt ? <FilterChip key={k} label={opt.label} onRemove={() => setSpecFilters(prev => ({ ...prev, [k]: '' }))} /> : null
                  })}
                  <button onClick={clearAll} className="ml-auto text-xs text-red-500 hover:text-red-700 flex items-center gap-1 font-medium">
                    <X className="w-3.5 h-3.5" /> Clear all
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Product Grid ── */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className={view === 'grid' ? 'grid sm:grid-cols-2 lg:grid-cols-4 gap-5' : 'space-y-4'}>
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className={`bg-gray-100 rounded-2xl animate-pulse ${view === 'grid' ? 'h-72' : 'h-28'}`} />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-bold text-gray-700 mb-2">No products found</h3>
            <p className="text-gray-500 mb-6">Try adjusting your filters or search term</p>
            <button onClick={clearAll} className="bg-orange-500 text-white px-6 py-2.5 rounded-xl font-medium">
              Clear Filters
            </button>
          </div>
        ) : (
          <>
            <div className={view === 'grid'
              ? 'grid sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-5'
              : 'space-y-4'}>
              {filteredProducts.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
            {filteredProducts.length >= 40 && (
              <p className="text-center text-xs text-gray-400 mt-8">
                Showing {filteredProducts.length} products · Use filters to narrow results
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── Small helper components ───────────────────────────────────────────────────

function FilterSection({ label, expanded, onToggle, children }: {
  label: string; expanded: boolean; onToggle: () => void; children: React.ReactNode
}) {
  return (
    <div>
      <button onClick={onToggle}
        className="w-full flex items-center justify-between mb-2.5 group">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider group-hover:text-gray-700 transition-colors">
          {label}
        </span>
        {expanded
          ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
          : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
      </button>
      {expanded && children}
    </div>
  )
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all
        ${active ? 'bg-orange-500 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-700 hover:border-orange-300 hover:text-orange-600'}`}>
      {children}
    </button>
  )
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-50 border border-orange-200 text-orange-700 rounded-full text-xs font-medium">
      {label}
      <button onClick={onRemove} className="hover:text-red-500 transition-colors ml-0.5">
        <X className="w-3 h-3" />
      </button>
    </span>
  )
}
