import { Link } from 'react-router-dom'
import { Trash2, Plus, Minus, ShoppingCart, ArrowRight } from 'lucide-react'
import { useCartStore } from '../store/cartStore'
import { fmtPKR, fixImageUrl, calcAllPlans } from '../lib/api'

export default function Cart() {
  const { items, removeItem, updateQty, total } = useCartStore()
  const cartTotal = total()
  const plans = calcAllPlans(cartTotal)
  const plan12 = plans['12m']

  if (items.length === 0) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-5 px-4">
      <ShoppingCart className="w-16 h-16 text-gray-200" />
      <h2 className="text-2xl font-bold text-gray-700">Your cart is empty</h2>
      <p className="text-gray-400">Add some products to get started</p>
      <Link to="/products" className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-2xl font-semibold transition-colors">
        Browse Products
      </Link>
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-black text-gray-900 mb-8">Your Cart ({items.length} item{items.length !== 1 ? 's' : ''})</h1>
      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-4">
          {items.map(item => (
            <div key={item.id} className="flex gap-4 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
              <div className="w-24 h-24 bg-gray-50 rounded-xl overflow-hidden flex-shrink-0">
                <img src={item.thumbnail} alt={item.simplified_name || item.model}
                  onError={e => { (e.target as HTMLImageElement).src = '/placeholder-product.svg' }}
                  className="w-full h-full object-contain p-2" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-orange-500 font-semibold">{item.brand}</div>
                <div className="font-semibold text-gray-800 text-sm leading-snug mb-1 line-clamp-2">{item.simplified_name || item.model}</div>
                <div className="text-xs text-gray-400 mb-2">{item.model}</div>
                <div className="font-bold text-gray-900">{fmtPKR(item.price.cash_floor * item.qty)}</div>
                {item.qty > 1 && <div className="text-xs text-gray-400">{fmtPKR(item.price.cash_floor)} each</div>}
              </div>
              <div className="flex flex-col items-end gap-3">
                <button onClick={() => removeItem(item.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-2 border border-gray-200 rounded-xl overflow-hidden">
                  <button onClick={() => updateQty(item.id, item.qty - 1)} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100">
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-6 text-center text-sm font-semibold">{item.qty}</span>
                  <button onClick={() => updateQty(item.id, item.qty + 1)} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100">
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="md:col-span-1">
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm sticky top-24">
            <h2 className="font-bold text-gray-900 mb-4">Order Summary</h2>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal ({items.reduce((t, i) => t + i.qty, 0)} items)</span>
                <span>{fmtPKR(cartTotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Delivery</span><span className="text-green-600 font-medium">Free</span>
              </div>
            </div>
            <div className="border-t pt-3 mb-5">
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span><span className="text-orange-600">{fmtPKR(cartTotal)}</span>
              </div>
              {plan12 && <div className="text-xs text-gray-500 mt-1">Or {fmtPKR(plan12.monthly)}/mo on 12-month plan</div>}
            </div>
            <div className="space-y-2">
              <Link to="/checkout" className="flex items-center justify-center gap-2 w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-semibold">
                Proceed to Checkout <ArrowRight className="w-4 h-4" />
              </Link>
              <a href={`https://wa.me/923702578788?text=${encodeURIComponent('Hi! I want to order:\n' + items.map(i => `• ${i.qty}× ${i.simplified_name || i.model} — ${fmtPKR((i.price?.cash_floor || 0) * i.qty)}`).join('\n') + `\n\nTotal: ${fmtPKR(cartTotal)}`)}`}
                className="flex items-center justify-center gap-2 w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-semibold">
                💬 Order via WhatsApp
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
