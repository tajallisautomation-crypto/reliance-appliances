import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Grid3X3, List, SlidersHorizontal, X } from 'lucide-react'
import { getProducts, DEFAULT_CATEGORIES, type Product } from '../lib/api'
import ProductCard from '../components/products/ProductCard'

const BRANDS = ['Haier', 'Dawlance', 'Crown', 'Westpoint']
const SORT_OPTIONS = [
  { value: '', label: 'Featured' },
  { value: 'price_asc', label: 'Price ↑' },
  { value: 'price_desc', label: 'Price ↓' },
  { value: 'name_asc', label: 'Name A–Z' },
]

export default function Products() {
  const [sp, setSp] = useSearchParams()
  const [products, setProducts] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [showFilters, setShowFilters] = useState(false)

  const category = sp.get('category') || ''
  const brand = sp.get('brand') || ''
  const search = sp.get('search') || ''
  const sort = sp.get('sort') || ''

  const fetchProducts = useCallback(() => {
    setLoading(true)
    const params: Record<string, string> = {}
    if (category) params.category = category
    if (brand) params.brand = brand
    if (search) params.search = search
    if (sort) params.sort = sort
    getProducts(params).then(d => { setProducts(d.products); setTotal(d.total); setLoading(false) })
  }, [category, brand, search, sort])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  const setFilter = (key: string, val: string) => {
    const next = new URLSearchParams(sp)
    if (val) next.set(key, val); else next.delete(key)
    setSp(next)
  }
  const clearAll = () => setSp({})
  const hasFilters = !!(category || brand || search)
  const activeCat = DEFAULT_CATEGORIES.find(c => c.id === category || c.slug === category)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
          <div className="text-sm text-gray-500">
            <span className="text-gray-900 font-semibold">{loading ? '…' : total}</span> products
            {activeCat && <span className="ml-1">in <span className="text-orange-600 font-medium">{activeCat.icon} {activeCat.name}</span></span>}
            {search && <span className="ml-1">for "<span className="text-orange-600 font-medium">{search}</span>"</span>}
          </div>
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <div className="hidden md:flex gap-1 overflow-x-auto">
              <button onClick={() => setFilter('category', '')} className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${!category ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-orange-50'}`}>All</button>
              {DEFAULT_CATEGORIES.map(c => (
                <button key={c.id} onClick={() => setFilter('category', c.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap flex items-center gap-1 ${category === c.id ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-orange-50'}`}>
                  {c.icon} {c.name}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <select value={sort} onChange={e => setFilter('sort', e.target.value)} className="text-sm border border-gray-200 rounded-xl px-3 py-1.5 bg-white focus:outline-none focus:border-orange-400">
                {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <button onClick={() => setShowFilters(f => !f)} className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl border ${showFilters ? 'bg-orange-500 text-white border-orange-500' : 'border-gray-200 text-gray-600 hover:border-orange-300'}`}>
                <SlidersHorizontal className="w-3.5 h-3.5" /> Filters
              </button>
              <div className="flex border border-gray-200 rounded-xl overflow-hidden">
                <button onClick={() => setView('grid')} className={`p-1.5 ${view === 'grid' ? 'bg-orange-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}><Grid3X3 className="w-4 h-4" /></button>
                <button onClick={() => setView('list')} className={`p-1.5 ${view === 'list' ? 'bg-orange-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}><List className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        </div>
        {showFilters && (
          <div className="border-t bg-gray-50 px-4 py-4">
            <div className="max-w-7xl mx-auto flex flex-wrap gap-6 items-start">
              <div>
                <div className="text-xs font-semibold text-gray-500 mb-2">BRAND</div>
                <div className="flex gap-2 flex-wrap">
                  {BRANDS.map(b => (
                    <button key={b} onClick={() => setFilter('brand', brand === b.toLowerCase() ? '' : b.toLowerCase())}
                      className={`px-3 py-1.5 rounded-xl text-sm ${brand === b.toLowerCase() ? 'bg-orange-500 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:border-orange-300'}`}>{b}</button>
                  ))}
                </div>
              </div>
              {hasFilters && <button onClick={clearAll} className="flex items-center gap-1 text-sm text-red-500 hover:text-red-700 ml-auto"><X className="w-4 h-4" /> Clear filters</button>}
            </div>
          </div>
        )}
      </div>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className={view === 'grid' ? 'grid sm:grid-cols-2 lg:grid-cols-4 gap-5' : 'space-y-4'}>
            {Array.from({length:12}).map((_,i) => <div key={i} className={`bg-gray-100 rounded-2xl animate-pulse ${view==='grid'?'h-72':'h-28'}`}/>)}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-bold text-gray-700 mb-2">No products found</h3>
            <p className="text-gray-500 mb-6">Try adjusting your filters or search term</p>
            <button onClick={clearAll} className="bg-orange-500 text-white px-6 py-2.5 rounded-xl font-medium">Clear Filters</button>
          </div>
        ) : (
          <div className={view === 'grid' ? 'grid sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-5' : 'space-y-4'}>
            {products.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
    </div>
  )
}
