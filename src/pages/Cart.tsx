import { Link } from 'react-router-dom'
import { Trash2, Plus, Minus, ShoppingCart, ArrowRight, MessageCircle } from 'lucide-react'
import { useCartStore } from '../store/cartStore'
import { fmtPKR, fixImageUrl, calcAllPlans } from '../lib/api'
import SEO from '../components/ui/SEO'

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
      <Link to="/products" className="bg-brand-500 hover:bg-brand-600 text-white px-8 py-3 rounded-2xl font-semibold transition-colors">
        Browse Products
      </Link>
    </div>
  )

  const waLink = `https://wa.me/923702578788?text=${encodeURIComponent(
    'Hi! I want to order:\n' +
    items.map(i => `• ${i.qty}× ${i.simplified_name || i.model} — ${fmtPKR((i.price?.cash_floor || 0) * i.qty)}`).join('\n') +
    `\n\nTotal: ${fmtPKR(cartTotal)}`
  )}`

  return (
    <>
      {/* Extra bottom padding on mobile so sticky bar doesn't overlap last item */}
      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-10 pb-32 md:pb-10">
        <SEO title="Your Cart — Reliance Appliances" noIndex />
        <h1 className="text-xl sm:text-2xl font-black text-gray-900 mb-5 sm:mb-8">
          Your Cart <span className="text-gray-400 font-medium">({items.length} item{items.length !== 1 ? 's' : ''})</span>
        </h1>
        <div className="grid md:grid-cols-3 gap-5 sm:gap-8">
          <div className="md:col-span-2 space-y-3 sm:space-y-4">
            {items.map(item => (
              <div key={item.id} className="flex gap-3 sm:gap-4 bg-white border border-gray-100 rounded-2xl p-3 sm:p-4 shadow-sm">
                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gray-50 rounded-xl overflow-hidden flex-shrink-0">
                  <img src={item.thumbnail} alt={item.simplified_name || item.model}
                    onError={e => { (e.target as HTMLImageElement).src = '/placeholder-product.svg' }}
                    className="w-full h-full object-contain p-1.5 sm:p-2" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-brand-500 font-bold uppercase tracking-wide">{item.brand}</div>
                  <div className="font-semibold text-gray-800 text-sm leading-snug mb-0.5 line-clamp-2">{item.simplified_name || item.model}</div>
                  <div className="text-[11px] text-gray-400 mb-2 font-mono truncate">{item.model}</div>
                  <div className="font-bold text-gray-900 text-sm">{fmtPKR(item.price.cash_floor * item.qty)}</div>
                  {item.qty > 1 && <div className="text-xs text-gray-400">{fmtPKR(item.price.cash_floor)} each</div>}
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <button onClick={() => removeItem(item.id)}
                    className="w-9 h-9 flex items-center justify-center text-gray-300 hover:text-red-500 active:text-red-600 transition-colors rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                    <button onClick={() => updateQty(item.id, item.qty - 1)}
                      className="w-9 h-9 flex items-center justify-center hover:bg-gray-100 active:bg-gray-200 transition-colors">
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-7 text-center text-sm font-bold">{item.qty}</span>
                    <button onClick={() => updateQty(item.id, item.qty + 1)}
                      className="w-9 h-9 flex items-center justify-center hover:bg-gray-100 active:bg-gray-200 transition-colors">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop order summary — sticky sidebar */}
          <div className="hidden md:block md:col-span-1">
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
                  <span>Total</span><span className="text-brand-600">{fmtPKR(cartTotal)}</span>
                </div>
                {plan12 && <div className="text-xs text-gray-500 mt-1">Or {fmtPKR(plan12.monthly)}/mo on 12-payment plan</div>}
              </div>
              <div className="space-y-2">
                <Link to="/checkout" className="flex items-center justify-center gap-2 w-full bg-brand-500 hover:bg-brand-600 text-white py-3 rounded-xl font-semibold">
                  Proceed to Checkout <ArrowRight className="w-4 h-4" />
                </Link>
                <a href={waLink}
                  className="flex items-center justify-center gap-2 w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-semibold">
                  <MessageCircle className="w-4 h-4" /> Order via WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sticky bottom bar — always visible, replaces scrolling to summary */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-20 bg-white border-t border-gray-200 px-4 pt-3 pb-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] safe-bottom">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-gray-500">{items.reduce((t, i) => t + i.qty, 0)} item{items.reduce((t, i) => t + i.qty, 0) !== 1 ? 's' : ''} · Free delivery</p>
            <p className="text-base font-black text-gray-900 leading-tight">{fmtPKR(cartTotal)}</p>
            {plan12 && <p className="text-[11px] text-gray-400">or {fmtPKR(plan12.monthly)}/mo × 12</p>}
          </div>
          <a href={waLink}
            className="flex items-center justify-center w-12 h-12 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white rounded-xl transition-colors shrink-0">
            <MessageCircle className="w-5 h-5" />
          </a>
          <Link to="/checkout"
            className="flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white px-5 h-12 rounded-xl font-bold text-sm transition-colors shrink-0">
            Checkout <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </>
  )
}
