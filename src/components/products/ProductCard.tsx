import { Link } from 'react-router-dom';
import { ShoppingCart, MessageCircle, Star, CheckCircle } from 'lucide-react';
import type { Product } from '@/lib/types';
import { formatPrice } from '@/lib/api';
import { waProduct } from '@/lib/whatsapp';
import { useCartStore } from '@/store/cartStore';
import toast from 'react-hot-toast';

interface Props { product: Product; }

export default function ProductCard({ product: p }: Props) {
  const addItem = useCartStore(s => s.addItem);

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    addItem(p);
    toast.success(`${p.brand} ${p.model} added to cart`);
  };

  return (
    <Link to={`/products/${p.slug}`} className="product-card group block">
      {/* Image */}
      <div className="relative aspect-square bg-surface-secondary overflow-hidden">
        <img
          src={p.thumbnail || 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80'}
          alt={`${p.brand} ${p.model}`}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        {p.featured && (
          <div className="absolute top-3 left-3 badge-gold">
            <Star className="w-3 h-3 fill-current" /> Featured
          </div>
        )}
        {p.stock_status !== 'In Stock' && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white font-bold text-sm bg-black/60 px-3 py-1 rounded-full">Out of Stock</span>
          </div>
        )}
        <div className="absolute bottom-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button onClick={handleAdd} aria-label={`Add ${p.model} to cart`}
            className="w-9 h-9 rounded-full bg-white shadow-apple-lg flex items-center justify-center text-brand-500 hover:bg-brand-500 hover:text-white transition-colors">
            <ShoppingCart className="w-4 h-4" />
          </button>
          <a href={waProduct(p.brand, p.model)} target="_blank" rel="noreferrer"
            aria-label={`Enquire about ${p.model}`} onClick={e => e.stopPropagation()}
            className="w-9 h-9 rounded-full bg-white shadow-apple-lg flex items-center justify-center"
            style={{ color: '#25d366' }}>
            <MessageCircle className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Details */}
      <div className="p-4">
        <p className="text-xs font-semibold text-brand-500 uppercase tracking-wide mb-0.5">{p.brand}</p>
        <h3 className="font-bold text-gray-900 text-sm leading-snug mb-2 line-clamp-2">{p.model}</h3>

        {/* Price */}
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-lg font-black text-gray-900">PKR {formatPrice(p.price.cash_floor)}</span>
          {p.price.retail > p.price.cash_floor && (
            <span className="text-xs text-gray-400 line-through">PKR {formatPrice(p.price.retail)}</span>
          )}
        </div>

        {/* Installment hint — only show monthly amount, no advance % or markup */}
        <div className="flex items-center gap-1 mb-3">
          <span className="text-xs text-brand-600 font-semibold">
            Or PKR {formatPrice(p.installments['12m'].monthly)}/mo
          </span>
          <span className="text-xs text-gray-400">· 12 months</span>
        </div>

        {/* Warranty badge */}
        <div className="flex items-center gap-1">
          <CheckCircle className="w-3 h-3 text-emerald-500 flex-shrink-0" />
          <p className="text-xs text-gray-400 truncate">{p.warranty}</p>
        </div>
      </div>
    </Link>
  );
}
