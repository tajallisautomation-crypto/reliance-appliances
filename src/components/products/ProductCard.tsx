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
  const [imgError, setImgError] = useState(false);

  const isAvailable = p.stock_status === 'In Stock';

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isAvailable) return;
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
    <Link to={`/products/${p.slug}`} className="group block bg-white rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-apple-lg active:scale-[0.99] transition-all duration-200 overflow-hidden">

      {/* Image */}
      <div className="relative aspect-square bg-gray-50 overflow-hidden">
        {p.thumbnail && !imgError ? (
          <img
            src={p.thumbnail}
            alt={`${p.brand} ${p.model}`}
            className="w-full h-full object-contain p-5 group-hover:scale-[1.03] transition-transform duration-500 ease-out"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <span className="text-xs text-gray-300 font-medium">No image</span>
          </div>
        )}

        {/* Badges — top */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 max-w-[calc(100%-1rem)]">
          {p.stock_status === 'Discontinued' && (
            <span className="inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-300 tracking-wide">
              Discontinued
            </span>
          )}
          {p.featured && (
            <span className="inline-flex items-center gap-0.5 bg-gold-500 text-brand-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
              <Star className="w-2 h-2 fill-current" /> Featured
            </span>
          )}
          {savingsPct >= 5 && (
            <span className="inline-flex items-center bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
              {savingsPct}% off
            </span>
          )}
        </div>
        {p.stock_status !== 'In Stock' && p.stock_status !== 'Discontinued' && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center">
            <span className="text-white font-bold text-xs bg-black/50 px-3 py-1.5 rounded-full tracking-wide">Out of Stock</span>
          </div>
        )}

        {/* Quick actions — always visible on mobile, hover-reveal on desktop */}
        <div className="absolute bottom-2 right-2 flex gap-1.5 sm:translate-y-2 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100 transition-all duration-200">
          {isAvailable && (
            <button onClick={handleAdd} aria-label={`Add ${p.model} to cart`}
              className={`w-10 h-10 rounded-full shadow-apple-lg flex items-center justify-center transition-all duration-200 ${added ? 'bg-emerald-500 text-white scale-110' : 'bg-white text-brand-500 active:bg-brand-500 active:text-white hover:bg-brand-500 hover:text-white'}`}>
              {added
                ? <CheckCircle className="w-4 h-4" />
                : <ShoppingCart className="w-4 h-4" />}
            </button>
          )}
          <CompareButton product={p} variant="icon" />
          <a href={waProduct(p.brand, p.model)} target="_blank" rel="noreferrer"
            aria-label={`Enquire about ${p.model}`} onClick={e => e.stopPropagation()}
            className="w-10 h-10 rounded-full bg-white shadow-apple-lg flex items-center justify-center transition-colors text-green-500 active:bg-green-500 active:text-white hover:bg-green-500 hover:text-white">
            <MessageCircle className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Details */}
      <div className="p-3 sm:p-4">
        <p className="text-[10px] font-bold text-brand-500 uppercase tracking-widest mb-0.5">{p.brand}</p>
        <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-0.5 line-clamp-2">
          {p.simplified_name || p.model}
        </h3>
        {p.simplified_name && (
          <p className="text-[10px] text-gray-400 font-mono truncate mb-1.5">{p.model}</p>
        )}

        {/* Price row */}
        <div className="flex items-baseline gap-1.5 mb-1">
          <span className="text-sm font-black text-gray-900">PKR {formatPrice(p.price.cash_floor)}</span>
          {p.price.retail > p.price.cash_floor && (
            <span className="text-[11px] text-gray-400 line-through">PKR {formatPrice(p.price.retail)}</span>
          )}
        </div>

        {/* Installment hint */}
        {bestPlan ? (
          <p className="text-xs text-brand-600 font-semibold mb-2">
            or <span className="font-black">PKR {formatPrice(bestPlan.monthly)}</span>/mo
          </p>
        ) : <div className="mb-2" />}

        {/* Warranty */}
        {p.warranty && (
          <div className="flex items-center gap-1 pt-2 border-t border-gray-50">
            <CheckCircle className="w-3 h-3 text-emerald-500 flex-shrink-0" />
            <p className="text-[10px] text-gray-400 line-clamp-2 leading-snug">{p.warranty}</p>
          </div>
        )}
      </div>
    </Link>
  );
}
