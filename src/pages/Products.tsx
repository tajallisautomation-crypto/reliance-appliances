import { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { Search, SlidersHorizontal, X, Grid, List } from 'lucide-react';
import { fetchProducts, CATEGORIES, formatPrice, slugifyCategory } from '@/lib/api';
import type { Product, Category } from '@/lib/types';
import ProductCard from '@/components/products/ProductCard';
import SEO from '@/components/ui/SEO';
import Spinner from '@/components/ui/Spinner';

export default function Products() {
  const { categorySlug }  = useParams<{ categorySlug?: string }>();
  const [sp, setSp]       = useSearchParams();
  const q                 = sp.get('q') || '';
  const [all, setAll]     = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort]   = useState('featured');
  const [brands, setBrands]   = useState<string[]>([]);
  const [maxPrice, setMaxPrice] = useState(500000);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [view, setView]   = useState<'grid'|'list'>('grid');

  useEffect(() => { fetchProducts().then(d => { setAll(d); setLoading(false); }); }, []);

  // Derive categories dynamically from loaded products so any category added in
  // Sheets automatically appears — icons fall back to the static CATEGORIES map.
  const liveCategories = useMemo<Category[]>(() => {
    const seen = new Map<string, Category>();
    all.forEach(p => {
      const slug = slugifyCategory(p.category);
      if (!seen.has(slug)) {
        const known = CATEGORIES.find(c => c.slug === slug);
        seen.set(slug, { name: p.category, slug, icon: known?.icon ?? '🏠', subcategories: [] });
      }
    });
    // Preserve the canonical order from CATEGORIES, then append any new ones
    const ordered: Category[] = [];
    CATEGORIES.forEach(c => { if (seen.has(c.slug)) ordered.push(seen.get(c.slug)!); });
    seen.forEach((cat, slug) => { if (!CATEGORIES.find(c => c.slug === slug)) ordered.push(cat); });
    return ordered.length > 0 ? ordered : CATEGORIES;
  }, [all]);

  const activeCat = categorySlug ? liveCategories.find(c => c.slug === categorySlug) : null;
  const allBrands = [...new Set(all.map(p => p.brand))].sort();

  const filtered = useMemo(() => {
    let list = [...all];
    if (categorySlug) list = list.filter(p => slugifyCategory(p.category) === categorySlug);
    if (q) {
      const lq = q.toLowerCase();
      list = list.filter(p => `${p.brand} ${p.model} ${p.tags} ${p.description}`.toLowerCase().includes(lq));
    }
    if (brands.length) list = list.filter(p => brands.includes(p.brand));
    list = list.filter(p => p.price.retail <= maxPrice);
    if (sort === 'featured')   return [...list.filter(p => p.featured), ...list.filter(p => !p.featured)];
    if (sort === 'price-asc')  return [...list].sort((a, b) => a.price.retail - b.price.retail);
    if (sort === 'price-desc') return [...list].sort((a, b) => b.price.retail - a.price.retail);
    if (sort === 'name')       return [...list].sort((a, b) => `${a.brand} ${a.model}`.localeCompare(`${b.brand} ${b.model}`));
    return list;
  }, [all, categorySlug, q, brands, maxPrice, sort]);

  const toggleBrand = (b: string) =>
    setBrands(prev => prev.includes(b) ? prev.filter(x => x !== b) : [...prev, b]);

  const clearAll = () => { setBrands([]); setMaxPrice(500000); setSp({}); };
  const hasFilters = brands.length > 0 || !!q || maxPrice < 500000;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <SEO
        path={categorySlug ? `/products/category/${categorySlug}` : '/products'}
        title={activeCat ? activeCat.name : 'All Products'}
        description={`Buy ${activeCat?.name || 'home appliances'} in Karachi on easy installments. Best prices, warranty backed.`}
        keywords={`${activeCat?.name || 'home appliances'} Karachi, installment ${activeCat?.name || 'appliances'} Pakistan`}
      />

      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-4 flex items-center gap-2">
        <Link to="/" className="hover:text-brand-600">Home</Link> /
        {activeCat
          ? <><Link to="/products" className="hover:text-brand-600">Products</Link> / <span className="text-gray-900 font-medium">{activeCat.name}</span></>
          : <span className="text-gray-900 font-medium">All Products</span>
        }
      </nav>

      {/* Page title */}
      <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
        {activeCat ? `${activeCat.icon} ${activeCat.name}` : 'All Products'}
      </h1>
      <p className="text-gray-500 text-sm mb-6">{filtered.length} products</p>

      {/* Category chips */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Link to="/products"
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${!activeCat ? 'bg-brand-500 text-white border-brand-500' : 'bg-white border-gray-200 text-gray-600 hover:border-brand-300'}`}>
          All
        </Link>
        {liveCategories.map(c => (
          <Link key={c.slug} to={`/products/category/${c.slug}`}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${activeCat?.slug === c.slug ? 'bg-brand-500 text-white border-brand-500' : 'bg-white border-gray-200 text-gray-600 hover:border-brand-300'}`}>
            {c.icon} {c.name}
          </Link>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-40">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input value={q} onChange={e => setSp(e.target.value ? { q: e.target.value } : {})}
            placeholder="Search…" className="pl-9 input-field rounded-full py-2.5" />
        </div>
        <select value={sort} onChange={e => setSort(e.target.value)}
          className="select-field w-auto py-2.5 rounded-full min-w-40">
          <option value="featured">Featured</option>
          <option value="price-asc">Price ↑</option>
          <option value="price-desc">Price ↓</option>
          <option value="name">Name A–Z</option>
        </select>
        <button onClick={() => setFiltersOpen(!filtersOpen)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-full border text-sm font-medium transition-colors ${filtersOpen ? 'bg-brand-500 text-white border-brand-500' : 'bg-white border-gray-200 text-gray-600 hover:border-brand-300'}`}>
          <SlidersHorizontal className="h-4 w-4" /> Filters
          {hasFilters && <span className="w-4 h-4 bg-red-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center">!</span>}
        </button>
        <div className="flex rounded-full border border-gray-200 overflow-hidden">
          <button onClick={() => setView('grid')} className={`px-3 py-2.5 text-sm transition-colors ${view === 'grid' ? 'bg-brand-500 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
            <Grid className="h-4 w-4" />
          </button>
          <button onClick={() => setView('list')} className={`px-3 py-2.5 text-sm transition-colors ${view === 'list' ? 'bg-brand-500 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
            <List className="h-4 w-4" />
          </button>
        </div>
        {hasFilters && (
          <button onClick={clearAll} className="flex items-center gap-1 text-sm text-red-500 hover:text-red-700 px-3 py-2 rounded-full hover:bg-red-50 transition-colors">
            <X className="h-4 w-4" /> Clear
          </button>
        )}
      </div>

      {/* Filter panel */}
      {filtersOpen && (
        <div className="bg-surface-secondary rounded-apple-xl p-5 mb-6 grid md:grid-cols-2 gap-6 border border-gray-100 animate-fade-in">
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-3">Brand</p>
            <div className="flex flex-wrap gap-2">
              {allBrands.map(b => (
                <button key={b} onClick={() => toggleBrand(b)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${brands.includes(b) ? 'bg-brand-500 text-white border-brand-500' : 'bg-white border-gray-200 text-gray-600 hover:border-brand-300'}`}>
                  {b}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Max Price: PKR {maxPrice.toLocaleString()}</p>
            <input type="range" min={0} max={500000} step={5000} value={maxPrice}
              onChange={e => setMaxPrice(+e.target.value)} className="w-full accent-brand-500" />
            <div className="flex justify-between text-xs text-gray-400 mt-1"><span>PKR 0</span><span>PKR 5,00,000</span></div>
          </div>
        </div>
      )}

      {/* Grid */}
      {loading ? <Spinner /> : filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">🔍</p>
          <p className="text-gray-500 font-medium mb-4">No products found</p>
          <button onClick={clearAll} className="btn-primary">Clear Filters</button>
        </div>
      ) : (
        <div className={view === 'grid'
          ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5'
          : 'space-y-4'}>
          {filtered.map((p, i) => (
            <div key={p.id} className="animate-fade-up" style={{ animationDelay: `${Math.min(i * 40, 320)}ms` }}>
              <ProductCard product={p} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
