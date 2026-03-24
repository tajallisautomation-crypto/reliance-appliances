// ── SearchResults.tsx — Full search results page ──────────────────────────────

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, SlidersHorizontal, X, ChevronDown, ChevronUp, Loader2, AlertCircle } from 'lucide-react';
import { getProducts, formatPrice, type Product } from '@/lib/api';
import { buildSearchIndex, search, type SearchIndex } from '@/lib/search';
import ProductCard from '@/components/products/ProductCard';
import SearchBar from '@/components/SearchBar';
import SEO from '@/components/ui/SEO';

// ── Price range presets ───────────────────────────────────────────────────────

const PRICE_RANGES = [
  { label: 'Under 20k',      min: 0,      max: 20000  },
  { label: '20k – 50k',      min: 20000,  max: 50000  },
  { label: '50k – 100k',     min: 50000,  max: 100000 },
  { label: '100k – 200k',    min: 100000, max: 200000 },
  { label: 'Over 200k',      min: 200000, max: Infinity },
];

// ── Filter sidebar section ────────────────────────────────────────────────────

function FilterSection({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-gray-100 pb-4 mb-4">
      <button onClick={() => setOpen(o => !o)} className="flex items-center justify-between w-full mb-3">
        <span className="text-sm font-bold text-gray-800">{title}</span>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && children}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SearchResults() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawQuery = searchParams.get('q') || '';

  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [index,       setIndex]       = useState<SearchIndex | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [loadError,   setLoadError]   = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Active filters
  const [filterBrands,    setFilterBrands]    = useState<Set<string>>(new Set());
  const [filterCategories,setFilterCategories]= useState<Set<string>>(new Set());
  const [filterPriceMin,  setFilterPriceMin]  = useState<number | undefined>();
  const [filterPriceMax,  setFilterPriceMax]  = useState<number | undefined>();

  // Load all products + build index
  useEffect(() => {
    setLoading(true);
    setLoadError(false);
    getProducts()
      .then(({ products }) => {
        setAllProducts(products);
        setIndex(buildSearchIndex(products));
        setLoading(false);
      })
      .catch(() => {
        setLoadError(true);
        setLoading(false);
      });
  }, []);

  // Reset filters when query changes
  useEffect(() => {
    setFilterBrands(new Set());
    setFilterCategories(new Set());
    setFilterPriceMin(undefined);
    setFilterPriceMax(undefined);
  }, [rawQuery]);

  // Run search
  const results = useMemo(() => {
    if (!index || !rawQuery.trim()) return allProducts.map(p => ({ product: p, score: 0 }));
    return search(index, rawQuery, { limit: 120 });
  }, [index, rawQuery, allProducts]);

  // Apply sidebar filters
  const filtered = useMemo(() => {
    return results.filter(r => {
      const p = r.product;
      if (filterBrands.size    && !filterBrands.has(p.brand))            return false;
      if (filterCategories.size && !filterCategories.has(p.category))     return false;
      if (filterPriceMin !== undefined && p.price.cash_floor < filterPriceMin) return false;
      if (filterPriceMax !== undefined && p.price.cash_floor > filterPriceMax) return false;
      return true;
    });
  }, [results, filterBrands, filterCategories, filterPriceMin, filterPriceMax]);

  // Available facets (from search results, not all products)
  const facetBrands     = useMemo(() => [...new Set(results.map(r => r.product.brand))].sort(), [results]);
  const facetCategories = useMemo(() => [...new Set(results.map(r => r.product.category))].sort(), [results]);

  function toggleSet<T>(set: Set<T>, val: T): Set<T> {
    const next = new Set(set);
    next.has(val) ? next.delete(val) : next.add(val);
    return next;
  }

  function setPriceRange(min: number, max: number) {
    setFilterPriceMin(min === 0 ? undefined : min);
    setFilterPriceMax(max === Infinity ? undefined : max);
  }

  function clearAll() {
    setFilterBrands(new Set()); setFilterCategories(new Set());
    setFilterPriceMin(undefined); setFilterPriceMax(undefined);
  }

  const hasActiveFilters = filterBrands.size > 0 || filterCategories.size > 0 || filterPriceMin !== undefined || filterPriceMax !== undefined;
  const activePriceRange = PRICE_RANGES.find(r => r.min === (filterPriceMin ?? 0) && r.max === (filterPriceMax ?? Infinity));

  return (
    <div className="min-h-screen bg-gray-50">
      <SEO
        title={rawQuery ? `"${rawQuery}" — Search Results | Reliance Appliances` : 'Search Products — Reliance Appliances'}
        description="Search Reliance Appliances for air conditioners, refrigerators, washing machines, and more. Filter by brand, category, and price."
        noIndex
      />
      {/* ── Search header ── */}
      <div className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="max-w-7xl mx-auto">
          <SearchBar
            defaultValue={rawQuery}
            className="max-w-2xl"
            inputClass="bg-gray-50"
            onSearch={q => setSearchParams({ q })}
          />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* ── Results header ── */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            {loading ? (
              <span className="text-sm text-gray-500 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Searching…
              </span>
            ) : (
              <p className="text-sm text-gray-600">
                <span className="font-bold text-gray-900">{filtered.length.toLocaleString()}</span>
                {rawQuery ? <> results for <span className="font-bold text-orange-600">"{rawQuery}"</span></> : ' products'}
              </p>
            )}
          </div>

          {/* Active filter chips */}
          <div className="flex flex-wrap items-center gap-2">
            {[...filterBrands].map(b => (
              <button key={b} onClick={() => setFilterBrands(s => toggleSet(s, b))}
                className="flex items-center gap-1 text-xs bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full font-medium">
                {b} <X className="w-3 h-3" />
              </button>
            ))}
            {[...filterCategories].map(c => (
              <button key={c} onClick={() => setFilterCategories(s => toggleSet(s, c))}
                className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-medium">
                {c} <X className="w-3 h-3" />
              </button>
            ))}
            {activePriceRange && (
              <button onClick={() => { setFilterPriceMin(undefined); setFilterPriceMax(undefined); }}
                className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium">
                {activePriceRange.label} <X className="w-3 h-3" />
              </button>
            )}
            {hasActiveFilters && (
              <button onClick={clearAll} className="text-xs text-gray-400 hover:text-gray-700 px-2">Clear all</button>
            )}
            {/* Mobile filter toggle */}
            <button onClick={() => setShowFilters(f => !f)}
              className="md:hidden flex items-center gap-1.5 text-sm font-medium bg-white border border-gray-200 px-3 py-1.5 rounded-lg">
              <SlidersHorizontal className="w-3.5 h-3.5" /> Filters
            </button>
          </div>
        </div>

        <div className="flex gap-6">
          {/* ── Filters sidebar ── */}
          <aside className={`w-56 shrink-0 ${showFilters ? 'block' : 'hidden'} md:block`}>
            <div className="bg-white rounded-2xl border border-gray-100 p-4 sticky top-20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4" /> Filters
                </h3>
                {hasActiveFilters && (
                  <button onClick={clearAll} className="text-xs text-orange-500 hover:text-orange-700">Clear</button>
                )}
              </div>

              {/* Category */}
              {facetCategories.length > 0 && (
                <FilterSection title="Category">
                  <div className="space-y-1.5">
                    {facetCategories.map(cat => (
                      <label key={cat} className="flex items-center gap-2 cursor-pointer group">
                        <input type="checkbox" checked={filterCategories.has(cat)}
                          onChange={() => setFilterCategories(s => toggleSet(s, cat))}
                          className="accent-orange-500 w-3.5 h-3.5" />
                        <span className="text-xs text-gray-700 group-hover:text-gray-900 flex-1">{cat}</span>
                        <span className="text-[10px] text-gray-400">
                          {results.filter(r => r.product.category === cat).length}
                        </span>
                      </label>
                    ))}
                  </div>
                </FilterSection>
              )}

              {/* Brand */}
              {facetBrands.length > 0 && (
                <FilterSection title="Brand">
                  <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                    {facetBrands.map(brand => (
                      <label key={brand} className="flex items-center gap-2 cursor-pointer group">
                        <input type="checkbox" checked={filterBrands.has(brand)}
                          onChange={() => setFilterBrands(s => toggleSet(s, brand))}
                          className="accent-orange-500 w-3.5 h-3.5" />
                        <span className="text-xs text-gray-700 group-hover:text-gray-900 flex-1">{brand}</span>
                        <span className="text-[10px] text-gray-400">
                          {results.filter(r => r.product.brand === brand).length}
                        </span>
                      </label>
                    ))}
                  </div>
                </FilterSection>
              )}

              {/* Price range */}
              <FilterSection title="Price Range">
                <div className="space-y-1.5">
                  {PRICE_RANGES.map(r => {
                    const active = (filterPriceMin ?? 0) === r.min && (filterPriceMax ?? Infinity) === r.max;
                    return (
                      <button key={r.label} onClick={() => active ? setPriceRange(0, Infinity) : setPriceRange(r.min, r.max)}
                        className={`w-full text-left text-xs px-2.5 py-1.5 rounded-lg transition-colors ${
                          active ? 'bg-orange-100 text-orange-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
                        }`}>
                        {r.label}
                      </button>
                    );
                  })}
                </div>

                {/* Custom range inputs */}
                <div className="flex gap-2 mt-3">
                  <input type="number" placeholder="Min" value={filterPriceMin ?? ''}
                    onChange={e => setFilterPriceMin(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-orange-400" />
                  <input type="number" placeholder="Max" value={filterPriceMax ?? ''}
                    onChange={e => setFilterPriceMax(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-orange-400" />
                </div>
              </FilterSection>

              {/* Installments filter */}
              <div>
                <button
                  onClick={() => {
                    // Filter to products eligible for installments (cash_floor >= 10000)
                    if (filterPriceMin === 10000 && filterPriceMax === undefined) {
                      setFilterPriceMin(undefined);
                    } else {
                      setFilterPriceMin(10000);
                    }
                  }}
                  className={`w-full text-left text-xs px-2.5 py-2 rounded-lg border transition-colors ${
                    filterPriceMin === 10000
                      ? 'border-orange-300 bg-orange-50 text-orange-700 font-medium'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}>
                  💳 Installment Eligible
                </button>
              </div>
            </div>
          </aside>

          {/* ── Results grid ── */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="flex items-center justify-center py-32">
                <Loader2 className="w-8 h-8 animate-spin text-orange-400" />
              </div>
            ) : loadError ? (
              <div className="text-center py-32">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-300" />
                <h3 className="font-bold text-gray-900 text-lg mb-1">Couldn't load products</h3>
                <p className="text-gray-500 text-sm mb-4">Check your connection and try again.</p>
                <button onClick={() => window.location.reload()}
                  className="px-5 py-2 bg-gray-900 text-white rounded-xl text-sm font-semibold">
                  Retry
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-32">
                <Search className="w-12 h-12 mx-auto mb-4 text-gray-200" />
                <h3 className="font-bold text-gray-900 text-lg mb-1">No results found</h3>
                <p className="text-gray-500 text-sm mb-6">
                  {rawQuery ? <>No products match "<strong>{rawQuery}</strong>".</> : 'Try searching for a product.'}
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {['Air Conditioners','Refrigerators','Washing Machines','Kitchen Appliances'].map(cat => (
                    <Link key={cat} to={`/search?q=${encodeURIComponent(cat)}`}
                      className="text-sm px-3 py-1.5 bg-orange-100 text-orange-700 rounded-full font-medium hover:bg-orange-200 transition-colors">
                      {cat}
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {filtered.map(r => (
                  <ProductCard key={r.product.id} product={r.product} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
