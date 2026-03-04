import { useState } from 'react'
import { useCartStore } from '../store/cartStore'
import { fmtPKR, calcAllPlans, submitOrder } from '../lib/api'
import { CheckCircle, Phone } from 'lucide-react'

export default function Checkout() {
  const { items, total, clearCart } = useCartStore()
  const cartTotal = total()
  const [plan, setPlan] = useState('cash')
  const [form, setForm] = useState({ name:'', phone:'', email:'', address:'', city:'', notes:'' })
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [orderId, setOrderId] = useState('')
  const plans = calcAllPlans(cartTotal)
  const selectedPlan = plan !== 'cash' ? plans[plan] : null

  const handleSubmit = async () => {
    if (!form.name || !form.phone || !form.address) return
    setLoading(true)
    try {
      const res = await submitOrder({
        customerName: form.name, customerPhone: form.phone, customerEmail: form.email,
        customerAddress: `${form.address}, ${form.city}`,
        products: items.map(i => ({ id:i.id, model:i.model, brand:i.brand, qty:i.qty, price:i.price?.cash_floor || 0 })),
        totalAmount: cartTotal, paymentMethod: plan,
        installmentPlan: selectedPlan ? plan : '',
        advancePaid: selectedPlan ? selectedPlan.advance : cartTotal,
        monthlyAmount: selectedPlan ? selectedPlan.monthly : 0,
        notes: form.notes,
      })
      setOrderId('ORD-' + Date.now())
      setDone(true); clearCart()
    } catch(e) { alert('Something went wrong. Please try WhatsApp order instead.') }
    setLoading(false)
  }

  if (done) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-5 px-4 text-center">
      <CheckCircle className="w-16 h-16 text-green-500" />
      <h2 className="text-2xl font-bold text-gray-800">Order Placed!</h2>
      <p className="text-gray-500">Order ID: <strong>{orderId}</strong></p>
      <a href="https://wa.me/923702578788" className="bg-green-500 text-white px-8 py-3 rounded-xl font-semibold">💬 Track on WhatsApp</a>
      <a href="/products" className="text-orange-500 hover:underline text-sm">Continue Shopping</a>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-black text-gray-900 mb-8">Checkout</h1>
      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-5">
          <h2 className="font-bold text-gray-800">Delivery Details</h2>
          {[
            {key:'name', label:'Full Name *', type:'text', placeholder:'Your full name'},
            {key:'phone', label:'Phone Number *', type:'tel', placeholder:'+92 3XX XXXXXXX'},
            {key:'email', label:'Email (optional)', type:'email', placeholder:'your@email.com'},
            {key:'address', label:'Delivery Address *', type:'text', placeholder:'Street address'},
            {key:'city', label:'City *', type:'text', placeholder:'Karachi, Lahore...'},
          ].map(f => (
            <div key={f.key}>
              <label className="text-sm font-medium text-gray-700 block mb-1">{f.label}</label>
              <input type={f.type} placeholder={f.placeholder} value={(form as any)[f.key]}
                onChange={e => setForm(p => ({...p, [f.key]: e.target.value}))}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-orange-400 text-sm" />
            </div>
          ))}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Notes</label>
            <textarea rows={3} placeholder="Any special instructions..." value={form.notes}
              onChange={e => setForm(p => ({...p, notes: e.target.value}))}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-orange-400 text-sm resize-none" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-3">Payment Method</label>
            <div className="space-y-2">
              <button onClick={() => setPlan('cash')} className={`w-full p-4 rounded-xl border-2 text-left ${plan==='cash'?'border-orange-500 bg-orange-50':'border-gray-200'}`}>
                <div className="font-semibold text-gray-800">Cash on Delivery</div>
                <div className="text-sm text-gray-500">Full amount: {fmtPKR(cartTotal)}</div>
              </button>
              {Object.entries(plans).map(([key, p]) => (
                <button key={key} onClick={() => setPlan(key)} className={`w-full p-4 rounded-xl border-2 text-left ${plan===key?'border-orange-500 bg-orange-50':'border-gray-200'}`}>
                  <div className="font-semibold text-gray-800">{key} Installment</div>
                  <div className="text-sm text-gray-500">Advance: {fmtPKR(p.advance)} ({Math.round(p.advancePct*100)}%) · Then {fmtPKR(p.monthly)}/mo × {p.monthlyPayments}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div>
          <div className="bg-gray-50 rounded-2xl p-6 sticky top-24">
            <h2 className="font-bold text-gray-800 mb-4">Order Summary</h2>
            <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
              {items.map(i => (
                <div key={i.id} className="flex justify-between text-sm">
                  <span className="text-gray-600">{i.qty}× {(i.simplified_name || i.model).substring(0,30)}…</span>
                  <span className="font-medium">{fmtPKR((i.price?.cash_floor||0)*i.qty)}</span>
                </div>
              ))}
            </div>
            <div className="border-t pt-3 mb-5">
              {selectedPlan ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span>Total (incl. markup)</span><span className="font-semibold">{fmtPKR(selectedPlan.total)}</span></div>
                  <div className="flex justify-between text-orange-700 font-bold"><span>Advance Due Today</span><span>{fmtPKR(selectedPlan.advance)}</span></div>
                  <div className="flex justify-between text-blue-700"><span>{selectedPlan.monthlyPayments}× Monthly</span><span>{fmtPKR(selectedPlan.monthly)}</span></div>
                </div>
              ) : (
                <div className="flex justify-between font-bold text-lg"><span>Total</span><span className="text-orange-600">{fmtPKR(cartTotal)}</span></div>
              )}
            </div>
            <button onClick={handleSubmit} disabled={loading||!form.name||!form.phone||!form.address}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white py-4 rounded-xl font-bold text-lg">
              {loading ? 'Placing Order…' : '✅ Place Order'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
