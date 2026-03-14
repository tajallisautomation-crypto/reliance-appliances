import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Phone, Search, CheckCircle, Clock, Package, MessageCircle, ShieldCheck, Wrench, CreditCard } from 'lucide-react'
import SEO from '@/components/ui/SEO'
import { supabase } from '@/lib/supabase'
import { waSales } from '@/lib/whatsapp'

interface OrderResult {
  id: string
  customer_name: string
  customer_phone: string
  products: Array<{ model: string; brand: string; qty: number; price: number }>
  total_amount: number
  payment_method: string
  created_at: string
  status?: string
}

const SERVICES = [
  { icon: ShieldCheck, title: 'Warranty Claim',  desc: 'Report a product issue covered under warranty.',   wa: 'warranty' },
  { icon: Wrench,      title: 'Service Request', desc: 'Schedule a maintenance or repair visit.',           wa: 'service' },
  { icon: CreditCard,  title: 'Installment Help', desc: 'Questions about your installment plan.',           wa: 'installment' },
  { icon: Package,     title: 'Track Order',     desc: 'Get an update on your current order.',             wa: 'order' },
]

function buildWaMsg(type: string) {
  const msgs: Record<string, string> = {
    warranty:    'Hi Reliance! I need to make a warranty claim for my product.',
    service:     'Hi Reliance! I would like to schedule a service/repair visit.',
    installment: 'Hi Reliance! I have a question about my installment plan.',
    order:       'Hi Reliance! I would like an update on my order.',
  }
  return `https://wa.me/923702578788?text=${encodeURIComponent(msgs[type] || 'Hi Reliance!')}`
}

export default function Portal() {
  const [phone, setPhone] = useState('')
  const [orderId, setOrderId] = useState('')
  const [searching, setSearching] = useState(false)
  const [orders, setOrders] = useState<OrderResult[]>([])
  const [searched, setSearched] = useState(false)
  const [searchErr, setSearchErr] = useState('')

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phone.trim() && !orderId.trim()) return
    setSearching(true)
    setSearchErr('')
    setOrders([])
    try {
      let q = supabase.from('orders').select('*')
      if (orderId.trim()) {
        q = q.eq('id', orderId.trim())
      } else {
        q = q.eq('customer_phone', phone.trim())
      }
      const { data, error } = await q.order('created_at', { ascending: false }).limit(10)
      if (error) throw error
      setOrders((data || []) as OrderResult[])
      setSearched(true)
    } catch (err: any) {
      setSearchErr('Unable to look up orders. Please WhatsApp us for order status.')
      console.error('[Portal]', err)
    } finally {
      setSearching(false)
    }
  }

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-PK', { day:'numeric', month:'short', year:'numeric' })
  const fmtPKR  = (n: number) => 'PKR\u00A0' + Math.round(n || 0).toLocaleString('en-PK')

  return (
    <div className="min-h-screen bg-gray-50">
      <SEO
        title="Customer Portal — Reliance Appliances"
        description="Track your Reliance Appliances orders, request service, or get help with your installment plan. No account needed — just your phone number."
        noIndex
      />

      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-10 text-center">
          <div className="inline-flex items-center gap-2 bg-orange-50 text-orange-600 px-4 py-2 rounded-full text-sm font-semibold mb-5">
            👤 Customer Portal
          </div>
          <h1 className="text-3xl font-black text-gray-900 mb-2">How Can We Help?</h1>
          <p className="text-gray-500">Track your order, request support, or get help with your plan.</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">

        {/* Order lookup */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-bold text-gray-900 text-lg mb-1 flex items-center gap-2">
            <Search className="w-5 h-5 text-orange-500" /> Look Up Your Order
          </h2>
          <p className="text-sm text-gray-500 mb-5">Enter your phone number or order ID to see your orders.</p>
          <form onSubmit={handleSearch} className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Phone Number</label>
                <input value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="+92 3XX XXXXXXX" type="tel"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Or Order ID</label>
                <input value={orderId} onChange={e => setOrderId(e.target.value)}
                  placeholder="e.g. ORD-1234567890"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400" />
              </div>
            </div>
            <button type="submit" disabled={searching || (!phone.trim() && !orderId.trim())}
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold px-6 py-3 rounded-xl transition-colors">
              <Search className="w-4 h-4" /> {searching ? 'Searching…' : 'Find My Orders'}
            </button>
          </form>

          {searchErr && (
            <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">{searchErr}</div>
          )}

          {searched && !searchErr && (
            <div className="mt-6">
              {orders.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No orders found</p>
                  <p className="text-sm mt-1">Try a different phone number, or <a href={waSales()} target="_blank" rel="noreferrer" className="text-orange-500 hover:underline">WhatsApp us</a> for help.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500">{orders.length} order{orders.length !== 1 ? 's' : ''} found</p>
                  {orders.map(order => (
                    <div key={order.id} className="border border-gray-100 rounded-xl p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{order.customer_name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{fmtDate(order.created_at)}</p>
                        </div>
                        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                          order.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                          order.status === 'delivered' ? 'bg-blue-100 text-blue-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {order.status || 'Processing'}
                        </span>
                      </div>
                      {Array.isArray(order.products) && order.products.length > 0 && (
                        <div className="space-y-1">
                          {order.products.map((p, i) => (
                            <div key={i} className="flex justify-between text-sm text-gray-600">
                              <span>{p.qty}× {p.brand} {p.model}</span>
                              <span className="font-medium">{fmtPKR(p.price * p.qty)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <div>
                          <span className="text-xs text-gray-400">Total · {order.payment_method}</span>
                          <p className="font-bold text-orange-600">{fmtPKR(order.total_amount)}</p>
                        </div>
                        <a href={`https://wa.me/923702578788?text=${encodeURIComponent(`Hi! I'm enquiring about my order. Customer: ${order.customer_name}, Phone: ${order.customer_phone}`)}`}
                          target="_blank" rel="noreferrer"
                          className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold px-4 py-2 rounded-xl">
                          <MessageCircle className="w-3.5 h-3.5" /> Ask about this order
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Service options */}
        <div>
          <h2 className="font-bold text-gray-900 text-lg mb-4">Request Support</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {SERVICES.map(s => (
              <a key={s.title} href={buildWaMsg(s.wa)} target="_blank" rel="noreferrer"
                className="flex items-start gap-4 bg-white rounded-2xl border border-gray-100 hover:border-orange-300 hover:shadow-sm p-5 transition-all group">
                <div className="w-11 h-11 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-orange-100">
                  <s.icon className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 group-hover:text-orange-700">{s.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.desc}</p>
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* Direct contact */}
        <div className="bg-gray-900 rounded-2xl p-6 text-white flex flex-col sm:flex-row items-center justify-between gap-5">
          <div>
            <h3 className="font-bold text-lg">Need immediate help?</h3>
            <p className="text-gray-400 text-sm mt-1">Our team responds within minutes during business hours.</p>
          </div>
          <div className="flex gap-3 flex-shrink-0">
            <a href="tel:+923702578788"
              className="flex items-center gap-2 border border-white/30 text-white px-5 py-3 rounded-xl font-medium hover:bg-white/10 text-sm">
              <Phone className="w-4 h-4" /> Call Us
            </a>
            <a href={waSales()} target="_blank" rel="noreferrer"
              className="flex items-center gap-2 text-white font-semibold px-5 py-3 rounded-xl text-sm"
              style={{ background: '#25d366' }}>
              <MessageCircle className="w-4 h-4" /> WhatsApp
            </a>
          </div>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Browse Products', href: '/products', emoji: '🛍️' },
            { label: 'Installment Plans', href: '/installments', emoji: '💳' },
            { label: 'Solar Calculator', href: '/solar-calculator', emoji: '☀️' },
          ].map(l => (
            <Link key={l.href} to={l.href}
              className="flex flex-col items-center gap-2 bg-white rounded-2xl border border-gray-100 hover:border-orange-300 p-4 text-center transition-all group">
              <span className="text-2xl">{l.emoji}</span>
              <span className="text-xs font-medium text-gray-600 group-hover:text-orange-700">{l.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
