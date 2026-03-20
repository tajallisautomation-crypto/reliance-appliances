import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, MessageCircle, Star, CheckCircle } from 'lucide-react';
import type { Product } from '@/lib/types';
import { formatPrice } from '@/lib/api';
import { waProduct } from '@/lib/whatsapp';
import { useCartStore } from '@/store/cartStore';
import CompareButton from '@/components/CompareButton';
import toast from 'react-hot-toast';

interface Props { product: Product; }

export default function ProductCard({ product: p }: Props) {
  const addItem  = useCartStore(s => s.addItem);
  const [added, setAdded] = useState(false);

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    addItem(p);
    setAdded(true);
    toast.success(`${p.brand} ${p.model} added to cart`);
    setTimeout(() => setAdded(false), 1500);
  };

  const savingsPct = p.price.retail > p.price.cash_floor
    ? Math.round((1 - p.price.cash_floor / p.price.retail) * 100)
    : 0;

  const bestPlan = p.installments['12m'] ?? p.installments['6m'] ?? p.installments['3m'];

  return (
    <Link to={`/products/${p.slug}`} className="group block bg-white rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-apple-lg transition-all duration-300 overflow-hidden">

      {/* Image */}
      <div className="relative aspect-square bg-gray-50 overflow-hidden">
        {p.thumbnail ? (
          <img
            src={p.thumbnail}
            alt={`${p.brand} ${p.model}`}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-out"
            loading="lazy"
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <span className="text-xs text-gray-300 font-medium">No image</span>
          </div>
        )}

        {/* Badges — top */}
        <div className="absolute top-2.5 left-2.5 flex gap-1.5">
          {p.featured && (
            <span className="inline-flex items-center gap-1 bg-amber-400 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
              <Star className="w-2.5 h-2.5 fill-current" /> Featured
            </span>
          )}
          {savingsPct >= 5 && (
            <span className="inline-flex items-center bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              {savingsPct}% off
            </span>
          )}
        </div>

        {/* Out of stock overlay */}
        {p.stock_status !== 'In Stock' && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center">
            <span className="text-white font-bold text-xs bg-black/50 px-3 py-1.5 rounded-full tracking-wide">Out of Stock</span>
          </div>
        )}

        {/* Hover actions */}
        <div className="absolute bottom-2.5 right-2.5 flex gap-1.5 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-200">
          <button onClick={handleAdd} aria-label={`Add ${p.model} to cart`}
            className={`w-9 h-9 rounded-full shadow-apple-lg flex items-center justify-center transition-all duration-200 ${added ? 'bg-emerald-500 text-white scale-110' : 'bg-white text-brand-500 hover:bg-brand-500 hover:text-white'}`}>
            {added
              ? <CheckCircle className="w-4 h-4" />
              : <ShoppingCart className="w-4 h-4" />}
          </button>
          <CompareButton product={p} variant="icon" />
          <a href={waProduct(p.brand, p.model)} target="_blank" rel="noreferrer"
            aria-label={`Enquire about ${p.model}`} onClick={e => e.stopPropagation()}
            className="w-9 h-9 rounded-full bg-white shadow-apple-lg flex items-center justify-center transition-colors hover:bg-[#25d366] hover:text-white"
            style={{ color: '#25d366' }}>
            <MessageCircle className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Details */}
      <div className="p-4">
        <p className="text-[10px] font-bold text-brand-500 uppercase tracking-widest mb-1">{p.brand}</p>
        <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-0.5 line-clamp-2">
          {p.simplified_name || p.model}
        </h3>
        {p.simplified_name && (
          <p className="text-[11px] text-gray-400 font-mono truncate mb-2">{p.model}</p>
        )}

        {/* Price row */}
        <div className="flex items-baseline gap-2 mb-1.5">
          <span className="text-base font-black text-gray-900">PKR {formatPrice(p.price.cash_floor)}</span>
          {p.price.retail > p.price.cash_floor && (
            <span className="text-xs text-gray-400 line-through">PKR {formatPrice(p.price.retail)}</span>
          )}
        </div>

        {/* Installment hint */}
        {bestPlan ? (
          <p className="text-xs text-brand-500 font-semibold mb-2">
            or <span className="font-black">PKR {formatPrice(bestPlan.monthly)}</span>/mo · {bestPlan.months} months
          </p>
        ) : <div className="mb-2" />}

        {/* Warranty */}
        {p.warranty && (
          <div className="flex items-center gap-1 pt-2.5 border-t border-gray-50">
            <CheckCircle className="w-3 h-3 text-emerald-500 flex-shrink-0" />
            <p className="text-[11px] text-gray-400 truncate">{p.warranty}</p>
          </div>
        )}
      </div>
    </Link>
  );
}
