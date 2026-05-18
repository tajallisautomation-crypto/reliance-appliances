import { useState } from 'react'
import { Link } from 'react-router-dom'
import { LogIn, UserPlus, Star, Zap, Gift, Bell, Search, Package, MessageCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { waSales } from '@/lib/whatsapp'

interface Props {
  onLogin:  () => void
  onSignup: () => void
}

const FEATURES = [
  { icon: Star,  title: 'Loyalty Points',        desc: 'Earn 1 pt per PKR 100 spent. Redeem for discounts and services.' },
  { icon: Zap,   title: 'Smart Recommendations', desc: 'Get a personalised solar & energy plan based on your appliances.' },
  { icon: Gift,  title: 'Refer & Earn',           desc: 'Share your code. Earn 2% on every confirmed referral.' },
  { icon: Bell,  title: 'Service Reminders',      desc: 'Never miss an AC or appliance service — we remind you automatically.' },
]

export default function PortalAuth({ onLogin, onSignup }: Props) {
  const [phone, setPhone]   = useState('')
  const [orderId, setOrderId] = useState('')
  const [searching, setSearching] = useState(false)
  const [orders, setOrders] = useState<any[]>([])
  const [searched, setSearched] = useState(false)
  const [searchErr, setSearchErr] = useState('')

  const fmtPKR  = (n: number) => 'PKR ' + Math.round(n || 0).toLocaleString('en-PK')
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phone.trim() || !orderId.trim()) {
      setSearchErr('Please enter both your phone number and order ID to look up your order.')
      return
    }
    setSearching(true); setSearchErr(''); setOrders([])
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_phone', phone.trim())
        .eq('id', orderId.trim())
        .order('created_at', { ascending: false })
        .limit(5)
      if (error) throw error
      setOrders(data || [])
      setSearched(true)
    } catch {
      setSearchErr('Unable to look up orders. Please WhatsApp us for help.')
    } finally { setSearching(false) }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-brand-600 to-brand-800 text-white py-14 px-4 text-center">
        <div className="max-w-lg mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full text-sm font-semibold mb-5">
            👤 My Tajalli's Account
          </div>
          <h1 className="text-3xl font-black mb-3">Your Personal Portal</h1>
          <p className="text-brand-200 mb-8">Track appliances, earn loyalty points, manage installments and more — all in one place.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={onLogin}
              className="flex items-center justify-center gap-2 bg-white text-brand-700 font-bold px-7 py-3.5 rounded-xl hover:bg-brand-50 transition-colors">
              <LogIn className="w-4 h-4" /> Sign In
            </button>
            <button onClick={onSignup}
              className="flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-400 border border-white/30 text-white font-bold px-7 py-3.5 rounded-xl transition-colors">
              <UserPlus className="w-4 h-4" /> Create Account — It's Free
            </button>
          </div>
        </div>
      </div>

      {/* Feature grid */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <p className="text-center text-sm font-semibold text-gray-400 uppercase tracking-widest mb-7">What you get with a free account</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-14">
          {FEATURES.map(f => (
            <div key={f.title} className="bg-white rounded-2xl border border-gray-100 p-5 text-center hover:border-brand-200 hover:shadow-sm transition-all">
              <div className="w-11 h-11 bg-brand-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                <f.icon className="w-5 h-5 text-brand-500" />
              </div>
              <p className="font-bold text-gray-900 text-sm mb-1">{f.title}</p>
              <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Anonymous order lookup */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-bold text-gray-900 text-lg mb-1 flex items-center gap-2">
            <Search className="w-5 h-5 text-brand-500" /> Track an Order Without Signing In
          </h2>
          <p className="text-sm text-gray-500 mb-5">Enter both your phone number and order ID to look up your order status.</p>
          <form onSubmit={handleSearch} className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Phone Number *</label>
                <input value={phone} onChange={e => { setPhone(e.target.value); setSearchErr('') }} placeholder="+92 3XX XXXXXXX" type="tel"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-400" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Order ID *</label>
                <input value={orderId} onChange={e => { setOrderId(e.target.value); setSearchErr('') }} placeholder="Provided at checkout"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-400" />
              </div>
            </div>
            <button type="submit" disabled={searching || !phone.trim() || !orderId.trim()}
              className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-colors">
              <Search className="w-4 h-4" /> {searching ? 'Searching…' : 'Find My Order'}
            </button>
          </form>

          {searchErr && <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">{searchErr}</div>}

          {searched && !searchErr && (
            <div className="mt-5">
              {orders.length === 0 ? (
                <div className="text-center py-6 text-gray-400">
                  <Package className="w-9 h-9 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No orders found. <a href={waSales()} target="_blank" rel="noreferrer" className="text-brand-500 hover:underline">WhatsApp us</a> for help.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map((o: any) => (
                    <div key={o.id} className="border border-gray-100 rounded-xl p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{o.customer_name}</p>
                          <p className="text-xs text-gray-400">{fmtDate(o.created_at)}</p>
                        </div>
                        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${o.status === 'delivered' ? 'bg-blue-100 text-blue-700' : o.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                          {o.status || 'Processing'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <p className="font-bold text-brand-600 text-sm">{fmtPKR(o.total_amount)}</p>
                        <a href={waSales(`Hi! Enquiring about my order. Name: ${o.customer_name}`)} target="_blank" rel="noreferrer"
                          className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold px-4 py-1.5 rounded-lg">
                          <MessageCircle className="w-3 h-3" /> Ask about this order
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-3 gap-3 mt-6">
          {[['Browse Products', '/products', '🛍️'], ['Installment Plans', '/installments', '💳'], ['Solar Calculator', '/solar-calculator', '☀️']].map(([label, href, emoji]) => (
            <Link key={href} to={href}
              className="flex flex-col items-center gap-2 bg-white rounded-2xl border border-gray-100 hover:border-brand-200 p-4 text-center transition-all">
              <span className="text-2xl">{emoji}</span>
              <span className="text-xs font-medium text-gray-600">{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
