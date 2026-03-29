import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { X, ShoppingCart, MessageCircle, ArrowLeft, Star, GitCompareArrows, Trophy } from 'lucide-react';
import { useCompareStore, MAX_COMPARE_ITEMS } from '@/store/compareStore';
import { getMergedSpecFields, getBestIds, isPositive, isNegative, highlightLabel } from '@/lib/compare';
import { formatPrice, getRelatedProducts } from '@/lib/api';
import type { Product } from '@/lib/types';
import { useCartStore } from '@/store/cartStore';
import { waProduct } from '@/lib/whatsapp';
import ProductCard from '@/components/products/ProductCard';
import SEO from '@/components/ui/SEO';
import toast from 'react-hot-toast';

const COL_W = 'min-w-[200px] max-w-[240px]';

export default function ComparePage() {
  const { items, remove, clear } = useCompareStore();
  const addItem = useCartStore(s => s.addItem);
  const [related, setRelated] = useState<Product[]>([]);

  useEffect(() => {
    if (items.length === 0) { setRelated([]); return; }
    // Load related products for each unique category, then deduplicate
    const cats = [...new Set(items.map(p => p.category))];
    const compareIds = new Set(items.map(p => p.id));
    Promise.all(cats.map(cat => {
      const pivot = items.find(p => p.category === cat)!;
      return getRelatedProducts(pivot.id, cat, 4);
    })).then(results => {
      const seen = new Set<string>();
      const combined: Product[] = [];
      for (const list of results) {
        for (const p of list) {
          if (!compareIds.has(p.id) && !seen.has(p.id)) {
            seen.add(p.id);
            combined.push(p);
          }
        }
      }
      setRelated(combined.slice(0, 8));
    });
  }, [items]);

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <SEO path="/compare" title="Compare Products — Tajallis"
          description="Compare appliances side by side." keywords="compare appliances pakistan" />
        <GitCompareArrows className="w-16 h-16 text-gray-200 mx-auto mb-4" />
        <h1 className="text-2xl font-black text-gray-800 mb-2">No products to compare</h1>
        <p className="text-gray-500 mb-6">
          Add up to {MAX_COMPARE_ITEMS} products using the "Compare" button on any product page.
        </p>
        <Link to="/products" className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-bold px-6 py-3 rounded-xl transition-colors">
          <ArrowLeft className="w-4 h-4" /> Browse Products
        </Link>
      </div>
    );
  }

  const fields  = getMergedSpecFields(items);
  const sameCat = new Set(items.map(p => p.category)).size === 1;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <SEO path="/compare" title="Compare Products — Tajalli's Home Collection"
        description="Compare home appliances side by side." keywords="compare appliances pakistan" />

      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <GitCompareArrows className="w-6 h-6 text-brand-500" />
            Product Comparison
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {items.length} product{items.length !== 1 ? 's' : ''} · {sameCat ? items[0].category : 'Mixed categories'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {items.length < MAX_COMPARE_ITEMS && (
            <Link to="/products"
              className="flex items-center gap-1.5 border border-brand-200 text-brand-600 hover:bg-brand-50 text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
              + Add product
            </Link>
          )}
          <button onClick={clear}
            className="text-sm text-gray-500 hover:text-red-500 font-medium border border-gray-200 px-4 py-2 rounded-xl transition-colors">
            Clear all
          </button>
        </div>
      </div>

      {/* Comparison table */}
      <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-sm bg-white">
        <table className="w-full">
          {/* Product headers */}
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-5 py-4 w-44 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Specification
              </th>
              {items.map(p => (
                <th key={p.id} className={`${COL_W} px-4 py-4 align-top`}>
                  <div className="relative">
                    {/* Remove button */}
                    <button onClick={() => remove(p.id)}
                      className="absolute top-0 right-0 w-6 h-6 bg-gray-100 hover:bg-red-100 hover:text-red-500 rounded-full flex items-center justify-center transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                    {/* Product image */}
                    <Link to={`/products/${p.slug}`}>
                      <div className="w-28 h-28 mx-auto mb-3 rounded-xl overflow-hidden border border-gray-100 bg-gray-50">
                        <img
                          src={p.thumbnail || 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80'}
                          alt={p.model}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                          onError={e => { (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80'; }}
                        />
                      </div>
                      <p className="text-xs font-bold text-brand-500 uppercase tracking-wide mb-0.5">{p.brand}</p>
                      <p className="text-sm font-bold text-gray-900 leading-snug hover:text-brand-600 transition-colors line-clamp-2">
                        {p.simplified_name || p.model}
                      </p>
                      <p className="text-[11px] text-gray-400 font-mono mt-0.5">{p.model}</p>
                    </Link>
                    {p.featured && (
                      <div className="flex items-center gap-1 text-amber-600 text-[10px] font-bold mt-1">
                        <Star className="w-3 h-3 fill-current" /> Featured
                      </div>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {/* Price row */}
            <tr className="border-b border-gray-50 bg-brand-50/40">
              <td className="px-5 py-3 text-xs font-semibold text-gray-500 bg-gray-50">Price</td>
              {items.map(p => {
                const prices = items.map(x => x.price.cash_floor);
                const minPrice = Math.min(...prices);
                const isCheapest = p.price.cash_floor === minPrice;
                return (
                  <td key={p.id} className={`${COL_W} px-4 py-3 text-center`}>
                    <div className="font-black text-lg text-gray-900">
                      PKR {formatPrice(p.price.cash_floor)}
                    </div>
                    {p.price.retail > p.price.cash_floor && (
                      <div className="text-xs text-gray-400 line-through">PKR {formatPrice(p.price.retail)}</div>
                    )}
                    {isCheapest && items.length > 1 && (
                      <div className="inline-flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full mt-1">
                        <Trophy className="w-2.5 h-2.5" /> Best Price
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>

            {/* Installment row */}
            <tr className="border-b border-gray-50">
              <td className="px-5 py-3 text-xs font-semibold text-gray-500 bg-gray-50">Monthly (12 payments)</td>
              {items.map(p => {
                const plan = p.installments?.['12m'] ?? p.installments?.['6m'];
                return (
                  <td key={p.id} className={`${COL_W} px-4 py-3 text-center text-sm text-gray-700`}>
                    {plan ? `PKR ${formatPrice(plan.monthly)}/mo` : <span className="text-gray-300">—</span>}
                  </td>
                );
              })}
            </tr>

            {/* Warranty row */}
            <tr className="border-b border-gray-50">
              <td className="px-5 py-3 text-xs font-semibold text-gray-500 bg-gray-50">Warranty</td>
              {items.map(p => (
                <td key={p.id} className={`${COL_W} px-4 py-3 text-center text-sm text-gray-700`}>
                  {p.warranty || <span className="text-gray-300">—</span>}
                </td>
              ))}
            </tr>

            {/* Dynamic spec rows */}
            {fields.map((field, fi) => {
              const bestIds = getBestIds(items, field);
              const rowValues = items.map(p => p.specs?.[field.key] ?? '');
              const allEmpty = rowValues.every(v => !v);
              if (allEmpty) return null;

              return (
                <tr key={field.key} className={`border-b border-gray-50 ${fi % 2 === 0 ? '' : 'bg-gray-50/40'}`}>
                  <td className="px-5 py-3 text-xs font-semibold text-gray-600 bg-gray-50 whitespace-nowrap">
                    {field.label}
                    {field.unit && <span className="text-gray-400 font-normal ml-1">({field.unit})</span>}
                  </td>
                  {items.map(p => {
                    const val    = p.specs?.[field.key] ?? '';
                    const isBest = bestIds.has(p.id);
                    const pos    = isPositive(val);
                    const neg    = isNegative(val);
                    return (
                      <td key={p.id} className={`${COL_W} px-4 py-3 text-center`}>
                        {!val ? (
                          <span className="text-gray-300 text-sm">—</span>
                        ) : (
                          <div>
                            <span className={`text-sm font-medium ${pos ? 'text-green-700' : neg ? 'text-red-500' : 'text-gray-800'}`}>
                              {pos ? '✓ Yes' : neg ? '✗ No' : val}
                            </span>
                            {isBest && (
                              <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-brand-600 mt-0.5">
                                <Trophy className="w-2.5 h-2.5" />
                                {highlightLabel(field)}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}

            {/* Stock row */}
            <tr className="border-b border-gray-50">
              <td className="px-5 py-3 text-xs font-semibold text-gray-500 bg-gray-50">Availability</td>
              {items.map(p => (
                <td key={p.id} className={`${COL_W} px-4 py-3 text-center`}>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold
                    ${p.stock_status === 'In Stock' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                    {p.stock_status}
                  </span>
                </td>
              ))}
            </tr>

            {/* CTA row */}
            <tr>
              <td className="px-5 py-4 bg-gray-50" />
              {items.map(p => (
                <td key={p.id} className={`${COL_W} px-4 py-4`}>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => { addItem(p); toast.success(`${p.model} added to cart!`); }}
                      disabled={p.stock_status !== 'In Stock'}
                      className="flex items-center justify-center gap-1.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white text-xs font-bold py-2 rounded-lg w-full transition-colors"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" /> Add to Cart
                    </button>
                    <a
                      href={waProduct(p.brand, p.model)}
                      target="_blank" rel="noreferrer"
                      className="flex items-center justify-center gap-1.5 text-xs font-bold py-2 rounded-lg w-full text-white bg-wa hover:bg-wa-hover transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                    </a>
                    <Link to={`/products/${p.slug}`}
                      className="text-center text-xs text-gray-500 hover:text-brand-600 underline underline-offset-2 transition-colors">
                      View Details
                    </Link>
                  </div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Info note for mixed categories */}
      {!sameCat && (
        <p className="text-xs text-amber-600 bg-amber-50 rounded-xl px-4 py-3 mt-4">
          These products are from different categories. Only common specification fields are shown.
        </p>
      )}

      {/* Related / Similar Products */}
      {related.length > 0 && (
        <div className="mt-14">
          <h2 className="text-lg font-extrabold text-gray-900 mb-1">Similar Products</h2>
          <p className="text-sm text-gray-400 mb-5">Customers also compared</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {related.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        </div>
      )}

      {/* Back link */}
      <div className="mt-8 text-center">
        <Link to="/products" className="text-sm text-gray-500 hover:text-brand-600 font-medium transition-colors">
          ← Continue browsing
        </Link>
      </div>
    </div>
  );
}
