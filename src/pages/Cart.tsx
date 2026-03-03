import { Link } from 'react-router-dom';
import { ShoppingCart, Trash2, Plus, Minus, ArrowRight, Wrench } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { formatPrice } from '@/lib/api';
import SEO from '@/components/ui/SEO';

export default function Cart() {
  const { items, removeItem, updateQty, setPlan, toggleInstall, subtotal, totalItems } = useCartStore();

  if (items.length === 0) return (
    <div className="max-w-3xl mx-auto px-4 py-20 text-center">
      <SEO title="Your Cart" noIndex />
      <ShoppingCart className="h-16 w-16 text-gray-200 mx-auto mb-4" />
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
      <p className="text-gray-500 mb-6">Browse our products and add items to get started.</p>
      <Link to="/products" className="btn-primary">Browse Products</Link>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <SEO title="Your Cart" noIndex />
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Your Cart ({totalItems()} items)</h1>
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {items.map(item => (
            <div key={item.product.id} className="bg-white rounded-apple-xl shadow-apple p-5 flex gap-4">
              <img src={item.product.thumbnail} alt={item.product.model}
                className="w-20 h-20 rounded-apple object-cover flex-shrink-0 bg-surface-secondary" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-brand-500 font-semibold">{item.product.brand}</p>
                <p className="font-bold text-gray-900 text-sm leading-snug">{item.product.model}</p>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <select value={item.plan} onChange={e => setPlan(item.product.id, e.target.value)}
                    className="text-xs border border-gray-200 rounded-full px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-500">
                    {['cash','2m','3m','6m','12m'].map(p => (
                      <option key={p} value={p}>{p === 'cash' ? 'Cash' : p}</option>
                    ))}
                  </select>
                  <button onClick={() => toggleInstall(item.product.id)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border transition-colors ${item.withInstallation ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-gray-200 text-gray-500 hover:border-blue-200'}`}>
                    <Wrench className="h-3 w-3" />
                    {item.withInstallation ? `Install +PKR ${formatPrice(item.installationCost)}` : '+ Installation'}
                  </button>
                </div>
              </div>
              <div className="flex flex-col items-end gap-3">
                <button onClick={() => removeItem(item.product.id)}
                  className="text-gray-200 hover:text-red-500 transition-colors"><Trash2 className="h-4 w-4" /></button>
                <div className="flex items-center gap-2 border border-gray-200 rounded-full px-3 py-1">
                  <button onClick={() => updateQty(item.product.id, item.qty - 1)}><Minus className="h-3 w-3 text-gray-400" /></button>
                  <span className="text-sm font-medium w-4 text-center">{item.qty}</span>
                  <button onClick={() => updateQty(item.product.id, item.qty + 1)}><Plus className="h-3 w-3 text-gray-400" /></button>
                </div>
                <p className="font-bold text-gray-900 text-sm">
                  PKR {formatPrice((item.plan === 'cash' ? item.product.price.cash_floor : item.product.price.retail) * item.qty + (item.withInstallation ? item.installationCost : 0))}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-apple-xl shadow-apple p-5 h-fit sticky top-24">
          <h3 className="font-bold text-gray-900 mb-4">Summary</h3>
          <div className="flex justify-between font-bold text-gray-900 text-lg pt-2 border-t border-gray-100">
            <span>Total</span><span>PKR {formatPrice(subtotal())}</span>
          </div>
          <Link to="/checkout" className="btn-primary w-full justify-center py-3.5 mt-4 gap-2">
            Checkout <ArrowRight className="h-4 w-4" />
          </Link>
          <Link to="/products" className="btn-ghost w-full justify-center text-sm mt-2">Continue Shopping</Link>
        </div>
      </div>
    </div>
  );
}
