import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCartStore } from '../store/cartStore'
import { fmtPKR, calcAllPlans, submitOrder } from '../lib/api'
import { waSales } from '../lib/whatsapp'
import { CheckCircle, AlertCircle, Copy, Banknote, Upload, ArrowRight } from 'lucide-react'
import SEO from '../components/ui/SEO'

const PLAN_LABELS: Record<string, string> = {
  '2m': '2 Payments', '3m': '3 Payments', '6m': '6 Payments', '12m': '12 Payments',
}

const BANK_DETAILS = [
  {
    bank:    'Meezan Bank',
    account: '01060101874794',
    iban:    'PK33MEZN0001060101874794',
    branch:  'F.B Area Branch, Karachi',
    title:   "Tajalli's Home Collection",
    qr:      '/meezan-qr.jpeg',
  },
  { bank: 'JazzCash',  account: '03702578788', iban: '', branch: '', title: 'Reliance by Tajallis', qr: '' },
  { bank: 'EasyPaisa', account: '03702578788', iban: '', branch: '', title: 'Reliance by Tajallis', qr: '' },
]

export default function Checkout() {
  const { items, total, clearCart } = useCartStore()
  const cartTotal = total()
  const [plan, setPlan] = useState('cash')
  const [form, setForm] = useState({ name:'', phone:'', email:'', address:'', city:'', notes:'' })
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [orderId, setOrderId] = useState('')
  const [error, setError] = useState('')
  const [transferFile, setTransferFile] = useState<File | null>(null)
  const [copiedBank, setCopiedBank] = useState('')
  const plans = calcAllPlans(cartTotal)
  const selectedPlan = plan !== 'cash' ? plans[plan] : null

  if (items.length === 0 && !done) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center px-4">
      <SEO title="Checkout — Reliance by Tajallis" noIndex />
      <div className="text-5xl">🛒</div>
      <h2 className="text-xl font-bold text-gray-700">Your cart is empty</h2>
      <Link to="/products" className="bg-brand-500 text-white px-6 py-2.5 rounded-xl font-medium">Browse Products</Link>
    </div>
  )

  const phoneValid = /^(\+92|0)3\d{9}$/.test(form.phone.trim())
  const canSubmit = !loading && form.name.trim() && phoneValid && form.address.trim() && form.city.trim()

  // Build a human-readable list of what's still missing for the disabled button hint
  const missingFields = [
    !form.name.trim()    && 'Full Name',
    !form.phone.trim()   && 'Phone Number',
    form.phone.trim() && !phoneValid && 'valid phone format',
    !form.address.trim() && 'Delivery Address',
    !form.city.trim()    && 'City',
  ].filter(Boolean) as string[]

  const handleSubmit = async () => {
    if (!canSubmit) return
    setLoading(true)
    setError('')
    try {
      const result = await submitOrder({
        customer_name: form.name, customer_phone: form.phone, customer_email: form.email,
        customer_address: `${form.address}, ${form.city}`,
        products: items.map(i => ({ id:i.id, model:i.model, brand:i.brand, qty:i.qty, price:i.price?.cash_floor || 0 })),
        total_amount: cartTotal, payment_method: plan,
        installment_plan: selectedPlan ? plan : '',
        advance_paid: selectedPlan ? selectedPlan.advance : cartTotal,
        monthly_amount: selectedPlan ? selectedPlan.monthly : 0,
        notes: form.notes,
      })
      if (result.error) throw new Error(result.error)
      setOrderId(result.id ? `ORD-${result.id.toString().slice(0, 8).toUpperCase()}` : 'ORD-' + Date.now())
      setDone(true)
      clearCart()
    } catch (e: any) {
      setError('Order could not be submitted. Please try WhatsApp instead.')
    } finally {
      setLoading(false)
    }
  }

  if (done) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-5 px-4 text-center max-w-sm mx-auto py-16">
      <SEO title="Order Confirmed — Reliance by Tajallis" noIndex />
      <CheckCircle className="w-16 h-16 text-green-500" />
      <h2 className="text-2xl font-bold text-gray-800">Order Placed!</h2>
      <p className="text-gray-500">Reference: <strong>{orderId}</strong></p>
      <p className="text-sm text-gray-400">Our team will call you shortly to confirm.</p>
      {transferFile && (
        <div className="w-full bg-amber-50 border border-amber-200 rounded-2xl p-4 text-left">
          <div className="flex items-center gap-2 mb-2">
            <Upload className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <p className="text-sm font-bold text-amber-900">Send your transfer proof</p>
          </div>
          <p className="text-xs text-amber-700 mb-3">You selected <strong>{transferFile.name}</strong> — please send it via WhatsApp so we can apply your 1% discount.</p>
          <a href={waSales(`Order ref: ${orderId} — attaching transfer proof`)} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-2 bg-green-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold w-full justify-center">
            💬 Send Screenshot on WhatsApp
          </a>
        </div>
      )}
      <a href={waSales(`Order ref: ${orderId}`)} target="_blank" rel="noreferrer"
        className="bg-green-500 text-white px-8 py-3 rounded-xl font-semibold w-full">
        💬 Track on WhatsApp
      </a>
      <Link to="/products" className="text-brand-500 hover:underline text-sm">Continue Shopping</Link>
    </div>
  )

  return (
    <>
    {/* Extra bottom padding on mobile so sticky bar doesn't cover the Place Order button */}
    <div className="max-w-4xl mx-auto px-4 py-10 pb-32 md:pb-10">
      <SEO title="Checkout — Reliance by Tajallis" noIndex />
      <h1 className="text-2xl font-black text-gray-900 mb-8">Checkout</h1>
      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-5">
          <h2 className="font-bold text-gray-800">Delivery Details</h2>

          {/* Name */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Full Name *</label>
            <input type="text" placeholder="e.g. Ahmed Khan" value={form.name}
              onChange={e => setForm(p => ({...p, name: e.target.value}))}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-brand-400 text-sm" />
          </div>

          {/* Phone */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Phone Number *</label>
            <input type="tel" placeholder="03XX-XXXXXXX or +92 3XX XXXXXXX" value={form.phone}
              onChange={e => setForm(p => ({...p, phone: e.target.value}))}
              className={`w-full border rounded-xl px-4 py-3 focus:outline-none text-sm ${
                form.phone && !phoneValid
                  ? 'border-red-300 focus:border-red-400 bg-red-50'
                  : form.phone && phoneValid
                    ? 'border-green-300 focus:border-green-400'
                    : 'border-gray-200 focus:border-brand-400'
              }`} />
            {form.phone && !phoneValid && (
              <p className="text-xs text-red-500 mt-1">Enter a valid Pakistani mobile number (03XX XXXXXXX)</p>
            )}
            {form.phone && phoneValid && (
              <p className="text-xs text-green-600 mt-1">✓ Looks good — we'll call this number to confirm</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Email <span className="text-gray-400 font-normal">(optional)</span></label>
            <input type="email" placeholder="your@email.com" value={form.email}
              onChange={e => setForm(p => ({...p, email: e.target.value}))}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-brand-400 text-sm" />
          </div>

          {/* Address */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Delivery Address *</label>
            <input type="text" placeholder="e.g. House 12, Block B, F.B. Area" value={form.address}
              onChange={e => setForm(p => ({...p, address: e.target.value}))}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-brand-400 text-sm" />
            <p className="text-xs text-gray-400 mt-1">Include street name, house/flat no., and area / neighbourhood</p>
          </div>

          {/* City */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">City *</label>
            <input type="text" placeholder="e.g. Karachi" value={form.city}
              onChange={e => setForm(p => ({...p, city: e.target.value}))}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-brand-400 text-sm" />
            <p className="text-xs text-gray-400 mt-1">We deliver across Karachi, Lahore, Islamabad & major cities</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Notes</label>
            <textarea rows={3} placeholder="Any special instructions..." value={form.notes}
              onChange={e => setForm(p => ({...p, notes: e.target.value}))}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-brand-400 text-sm resize-none" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-3">Payment Method</label>
            <div className="space-y-2">
              <button onClick={() => setPlan('cash')} className={`w-full p-4 rounded-xl border-2 text-left ${plan==='cash'?'border-brand-500 bg-brand-50':'border-gray-200'}`}>
                <div className="font-semibold text-gray-800">Cash on Delivery</div>
                <div className="text-sm text-gray-500">Full amount: {fmtPKR(cartTotal)}</div>
              </button>
              {Object.entries(plans).map(([key, p]) => (
                <button key={key} onClick={() => setPlan(key)} className={`w-full p-4 rounded-xl border-2 text-left ${plan===key?'border-brand-500 bg-brand-50':'border-gray-200'}`}>
                  <div className="font-semibold text-gray-800">{PLAN_LABELS[key] || key} Installment Plan</div>
                  <div className="text-sm text-gray-500">Advance: {fmtPKR(p.advance)} · Then {fmtPKR(p.monthly)}/mo × {p.monthlyPayments}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Bank transfer discount — optional */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Banknote className="w-5 h-5 text-amber-600" />
              <p className="font-bold text-amber-900 text-sm">Get 1% off with bank transfer</p>
              <span className="ml-auto text-[10px] font-bold uppercase tracking-wider bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full">Optional</span>
            </div>
            <p className="text-xs text-amber-700 mb-3">Skip this if paying cash on delivery. Transfer the advance or full amount to save 1%.</p>
            <div className="space-y-2">
              {BANK_DETAILS.map(b => (
                <div key={b.bank} className="bg-white rounded-xl px-4 py-3 border border-amber-100">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-800">{b.bank}</p>
                      <p className="text-xs text-gray-500 font-mono truncate">{b.account} · {b.title}</p>
                      {b.iban   && <p className="text-[10px] text-gray-400 font-mono mt-0.5">IBAN: {b.iban}</p>}
                      {b.branch && <p className="text-[10px] text-gray-400 mt-0.5">{b.branch}</p>}
                    </div>
                    <button
                      onClick={async () => {
                        await navigator.clipboard.writeText(b.iban || b.account)
                        setCopiedBank(b.bank)
                        setTimeout(() => setCopiedBank(''), 2000)
                      }}
                      className="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1 shrink-0">
                      <Copy className="w-3 h-3" />
                      {copiedBank === b.bank ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  {b.qr && (
                    <div className="mt-3 flex items-center gap-3">
                      <img src={b.qr} alt="Meezan Bank payment QR"
                        className="w-24 h-24 rounded-xl border border-gray-200 object-contain" />
                      <p className="text-[11px] text-gray-500 leading-relaxed">
                        Scan with your <strong>Meezan Bank app</strong> or any UPI-compatible app to pay instantly.
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4">
              <label className="text-xs font-medium text-amber-800 block mb-1.5">
                Attach transfer screenshot <span className="font-normal text-amber-600">(max 5 MB — jpg, png, pdf)</span>
              </label>
              <input
                type="file" accept="image/*,application/pdf"
                onChange={e => setTransferFile(e.target.files?.[0] || null)}
                className="w-full text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-amber-100 file:text-amber-700 file:font-medium hover:file:bg-amber-200 cursor-pointer"
              />
              {transferFile && <p className="text-xs text-green-600 mt-1">✓ {transferFile.name}</p>}
              <p className="text-xs text-amber-600 mt-1.5">Or send the screenshot via WhatsApp to <strong>+92 370 2578788</strong>.</p>
            </div>
          </div>
        </div>

        {/* Desktop order summary — sticky sidebar */}
        <div className="hidden md:block">
          <div className="bg-gray-50 rounded-2xl p-6 sticky top-24">
            <h2 className="font-bold text-gray-800 mb-4">Order Summary</h2>
            <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
              {items.map(i => (
                <div key={i.id} className="flex justify-between text-sm">
                  <span className="text-gray-600">{i.qty}× {(i.simplified_name || i.model).substring(0,30)}</span>
                  <span className="font-medium">{fmtPKR((i.price?.cash_floor||0)*i.qty)}</span>
                </div>
              ))}
            </div>
            <div className="border-t pt-3 mb-5">
              {selectedPlan ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-brand-700 font-bold"><span>Advance Due Today</span><span>{fmtPKR(selectedPlan.advance)}</span></div>
                  <div className="flex justify-between text-blue-700"><span>{selectedPlan.monthlyPayments}× Monthly</span><span>{fmtPKR(selectedPlan.monthly)}</span></div>
                  <div className="flex justify-between text-gray-500 text-xs border-t pt-2"><span>Plan total</span><span>{fmtPKR(selectedPlan.total)}</span></div>
                </div>
              ) : (
                <div className="flex justify-between font-bold text-lg"><span>Total</span><span className="text-brand-600">{fmtPKR(cartTotal)}</span></div>
              )}
            </div>
            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl p-3 mb-3 text-sm text-red-700">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> {error}
              </div>
            )}
            <button onClick={handleSubmit} disabled={!canSubmit}
              className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-xl font-bold text-lg transition-colors">
              {loading ? 'Placing Order…' : '✅ Place Order'}
            </button>
            {missingFields.length > 0 && (
              <p className="text-xs text-gray-400 text-center mt-2">
                Still needed: {missingFields.join(', ')}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>

    {/* Mobile sticky bottom checkout bar */}
    <div className="md:hidden fixed bottom-0 inset-x-0 z-20 bg-white border-t border-gray-200 px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          {selectedPlan ? (
            <>
              <p className="text-xs text-gray-500">Advance due today</p>
              <p className="text-lg font-black text-brand-600">{fmtPKR(selectedPlan.advance)}</p>
              <p className="text-xs text-gray-400">then {fmtPKR(selectedPlan.monthly)}/mo × {selectedPlan.monthlyPayments}</p>
            </>
          ) : (
            <>
              <p className="text-xs text-gray-500">Total · Free delivery</p>
              <p className="text-lg font-black text-gray-900">{fmtPKR(cartTotal)}</p>
            </>
          )}
        </div>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 h-12 rounded-xl font-bold text-sm transition-colors shrink-0"
        >
          {loading ? 'Placing…' : <><span>Place Order</span> <ArrowRight className="w-4 h-4" /></>}
        </button>
      </div>
      {missingFields.length > 0 && (
        <p className="text-[11px] text-gray-400 mt-1.5 text-center">
          Still needed: {missingFields.join(', ')}
        </p>
      )}
      {error && (
        <p className="text-xs text-red-600 mt-1.5 text-center">{error}</p>
      )}
    </div>
    </>
  )
}
