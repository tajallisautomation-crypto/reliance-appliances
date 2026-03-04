import { X, Plus, Minus, Trash2, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
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

        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-brand-500" />
            <span className="font-bold text-gray-900">Cart ({totalItems})</span>
          </div>
          <button onClick={onClose} aria-label="Close cart"
            className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-500">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <ShoppingBag className="h-12 w-12 text-gray-200 mb-3" />
              <p className="text-gray-500 font-medium">Cart is empty</p>
              <button onClick={onClose} className="mt-4 btn-ghost text-brand-500">Browse Products</button>
            </div>
          ) : items.map(item => (
            <div key={item.id} className="flex gap-3">
              <img src={item.thumbnail} alt={item.model}
                className="w-16 h-16 rounded-apple object-cover flex-shrink-0 bg-surface-secondary"
                onError={e => { (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=80&q=60'; }} />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-brand-500 font-semibold">{item.brand}</p>
                <p className="text-sm font-bold text-gray-900 truncate">{item.simplified_name || item.model}</p>
                <p className="text-xs text-gray-400 mb-2">PKR {formatPrice(item.price.cash_floor)}</p>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 border border-gray-200 rounded-full px-2 py-1">
                    <button onClick={() => updateQty(item.id, item.qty - 1)} aria-label="Decrease"
                      className="text-gray-400 hover:text-gray-700 transition-colors"><Minus className="h-3 w-3" /></button>
                    <span className="text-sm font-medium w-4 text-center">{item.qty}</span>
                    <button onClick={() => updateQty(item.id, item.qty + 1)} aria-label="Increase"
                      className="text-gray-400 hover:text-gray-700 transition-colors"><Plus className="h-3 w-3" /></button>
                  </div>
                  <button onClick={() => removeItem(item.id)} aria-label="Remove"
                    className="text-gray-300 hover:text-red-500 transition-colors ml-auto"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {items.length > 0 && (
          <div className="px-5 py-4 border-t border-gray-100 space-y-3">
            <div className="flex justify-between font-bold text-gray-900">
              <span>Total</span>
              <span>PKR {formatPrice(total())}</span>
            </div>
            <Link to="/checkout" onClick={onClose} className="btn-primary w-full justify-center py-3.5">
              Proceed to Checkout
            </Link>
            <Link to="/cart" onClick={onClose} className="btn-ghost w-full justify-center text-sm">
              View Full Cart
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
