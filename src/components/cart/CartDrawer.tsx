'use client'

import { X, Plus, Minus, Trash2, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { useCartStore } from '@/store/cartStore';
import { formatPrice } from '@/lib/api';

interface Props { open: boolean; onClose: () => void; }

export default function CartDrawer({ open, onClose }: Props) {
  const { items, removeItem, updateQty, total } = useCartStore();
  const totalItems = items.reduce((n, i) => n + i.qty, 0);

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={onClose} />}

      <div className={`fixed top-0 right-0 h-full w-full max-w-sm bg-white z-50 flex flex-col
        shadow-apple-xl transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}>

        <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-brand-500" />
            <span className="font-bold text-gray-900">Cart ({totalItems})</span>
          </div>
          <button onClick={onClose} aria-label="Close cart"
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors text-gray-500">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <ShoppingBag className="h-12 w-12 text-gray-200 mb-3" />
              <p className="text-gray-500 font-medium">Cart is empty</p>
              <button onClick={onClose} className="mt-4 text-brand-500 font-semibold text-sm">Browse Products</button>
            </div>
          ) : items.map(item => (
            <div key={item.id} className="flex gap-3">
              <img src={item.thumbnail} alt={item.model}
                className="w-16 h-16 rounded-xl object-contain p-1 flex-shrink-0 bg-gray-50 border border-gray-100"
                onError={e => { (e.currentTarget as HTMLImageElement).src = '/placeholder-product.svg'; }} />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-brand-500 font-bold uppercase tracking-wide">{item.brand}</p>
                <p className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2">{item.simplified_name || item.model}</p>
                <p className="text-xs text-gray-500 font-medium mt-0.5">PKR {formatPrice(item.price.cash_floor)}</p>
                <div className="flex items-center gap-2 mt-2">
                  {/* Qty stepper with 44px touch targets */}
                  <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                    <button onClick={() => updateQty(item.id, item.qty - 1)} aria-label="Decrease"
                      className="w-9 h-9 flex items-center justify-center text-gray-500 hover:bg-gray-100 active:bg-gray-200 transition-colors">
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="text-sm font-bold text-gray-900 w-6 text-center">{item.qty}</span>
                    <button onClick={() => updateQty(item.id, item.qty + 1)} aria-label="Increase"
                      className="w-9 h-9 flex items-center justify-center text-gray-500 hover:bg-gray-100 active:bg-gray-200 transition-colors">
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <button onClick={() => removeItem(item.id)} aria-label="Remove"
                    className="w-9 h-9 flex items-center justify-center text-gray-300 hover:text-red-500 active:text-red-600 transition-colors ml-auto rounded-lg">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {items.length > 0 && (
          <div className="px-4 py-4 border-t border-gray-100 space-y-2.5 safe-bottom">
            <div className="flex justify-between font-bold text-gray-900 text-sm">
              <span>Total</span>
              <span className="text-brand-600">PKR {formatPrice(total())}</span>
            </div>
            <Link href="/checkout" onClick={onClose}
              className="flex items-center justify-center gap-2 w-full bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white py-3.5 rounded-xl font-bold text-sm transition-colors">
              Proceed to Checkout
            </Link>
            <Link href="/cart" onClick={onClose}
              className="flex items-center justify-center w-full text-sm text-gray-500 hover:text-gray-800 py-2.5 font-medium transition-colors">
              View Full Cart
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
