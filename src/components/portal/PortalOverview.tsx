import { Link } from 'react-router-dom'
import { Bell, CreditCard, Package, ChevronRight, Wrench, MessageCircle } from 'lucide-react'
import { waSales } from '@/lib/whatsapp'
import type { PortalData } from './portalTypes'
import { TIERS, TIER_BENEFITS, SERVICE_INTERVAL, INST_MONTHLY, CATEGORY_ICONS } from './portalConstants'

const fmtPKR  = (n: number) => 'PKR ' + Math.round(n || 0).toLocaleString('en-PK')
const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })

function daysAgo(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
}

export default function PortalOverview({ profile, appliances, loyaltyTxns, orders, referralEarnings }: PortalData) {
  const tier = TIERS[profile?.loyalty_tier ?? 'bronze']
  const pts  = profile?.loyalty_points ?? 0

  // Service due alerts
  const serviceDue = appliances.filter(a => {
    const interval = SERVICE_INTERVAL[a.category]
    if (!interval) return false
    const ref = a.last_serviced_at ?? (a.purchase_year ? `${a.purchase_year}-06-01` : null)
    if (!ref) return false
    return daysAgo(ref) >= interval
  })

  // Upcoming installment payment
  const instOrders = orders.filter(o => INST_MONTHLY[o.payment_method])
  const nextDue = instOrders.flatMap(o => {
    const count = INST_MONTHLY[o.payment_method] ?? 0
    return Array.from({ length: count }, (_, i) => {
      const d = new Date(o.created_at)
      d.setMonth(d.getMonth() + i + 1)
      return { order: o, due: d, amount: o.monthly_amount ?? 0 }
    })
  }).filter(x => x.due >= new Date()).sort((a, b) => a.due.getTime() - b.due.getTime())[0]

  const recentOrders = orders.slice(0, 3)
  const totalReferralEarned = referralEarnings.reduce((s, r) => s + (r.commission_amount ?? 0), 0)

  return (
    <div className="space-y-6">
      {/* Welcome + tier */}
      <div className={`rounded-2xl p-5 flex items-center justify-between ${tier.bg}`}>
        <div>
          <p className="text-sm font-medium text-gray-600">Welcome back</p>
          <p className="text-xl font-black text-gray-900">{profile?.full_name || 'Valued Customer'}</p>
          <div className={`inline-flex items-center gap-1.5 mt-1 text-sm font-bold ${tier.color}`}>
            {tier.emoji} {tier.label} Member
          </div>
        </div>
        <div className="text-right">
          <p className="text-3xl font-black text-gray-900">{pts.toLocaleString()}</p>
          <p className="text-xs text-gray-500">loyalty points</p>
        </div>
      </div>

      {/* Tier benefits quick view */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">{tier.label} Benefits</p>
        <ul className="space-y-1.5">
          {TIER_BENEFITS[profile?.loyalty_tier ?? 'bronze'].map(b => (
            <li key={b} className="flex items-center gap-2 text-sm text-gray-700">
              <span className="text-green-500">✓</span> {b}
            </li>
          ))}
        </ul>
      </div>

      {/* Service due alerts */}
      {serviceDue.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Bell className="w-5 h-5 text-amber-600" />
            <p className="font-bold text-amber-800">Service Reminder{serviceDue.length > 1 ? 's' : ''}</p>
          </div>
          <div className="space-y-2">
            {serviceDue.map(a => (
              <div key={a.id} className="flex items-center justify-between bg-white rounded-xl px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{CATEGORY_ICONS[a.category] ?? '🔧'}</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{a.brand} {a.model}</p>
                    <p className="text-xs text-gray-500">Last serviced: {a.last_serviced_at ? fmtDate(a.last_serviced_at) : 'Not recorded'}</p>
                  </div>
                </div>
                <a href={waSales(`Hi! I'd like to schedule a service visit for my ${a.brand} ${a.model}.`)} target="_blank" rel="noreferrer"
                  className="flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg">
                  <Wrench className="w-3 h-3" /> Book
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next installment due */}
      {nextDue && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CreditCard className="w-6 h-6 text-blue-600 flex-shrink-0" />
            <div>
              <p className="font-bold text-blue-900">Upcoming Installment</p>
              <p className="text-sm text-blue-700">
                {fmtPKR(nextDue.amount)} due {nextDue.due.toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
              </p>
            </div>
          </div>
          <a href={waSales(`Hi! I'd like to pay my installment of ${fmtPKR(nextDue.amount)} due ${fmtDate(nextDue.due.toISOString())}.`)} target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl flex-shrink-0">
            <MessageCircle className="w-4 h-4" /> Pay Now
          </a>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Appliances',      value: appliances.length,                        sub: 'registered'  },
          { label: 'Referral Earned', value: `PKR ${Math.round(totalReferralEarned).toLocaleString()}`, sub: 'total commission' },
          { label: 'Orders',          value: orders.length,                            sub: 'placed with us' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
            <p className="text-xl font-black text-gray-900">{s.value}</p>
            <p className="text-xs font-semibold text-gray-400 mt-0.5">{s.label}</p>
            <p className="text-[10px] text-gray-400">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Recent orders */}
      {recentOrders.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900 flex items-center gap-2"><Package className="w-4 h-4 text-brand-500" /> Recent Orders</h3>
          </div>
          <div className="space-y-3">
            {recentOrders.map(o => (
              <div key={o.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{fmtPKR(o.total_amount)}</p>
                  <p className="text-xs text-gray-400">{fmtDate(o.created_at)} · {o.payment_method.toUpperCase()}</p>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${o.status === 'delivered' ? 'bg-blue-100 text-blue-700' : o.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                  {o.status || 'Processing'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick CTA */}
      <div className="grid grid-cols-2 gap-3">
        <Link to="/products" className="flex items-center justify-between bg-brand-500 hover:bg-brand-600 text-white rounded-2xl px-5 py-4 transition-colors">
          <span className="font-bold text-sm">Shop Products</span>
          <ChevronRight className="w-4 h-4" />
        </Link>
        <Link to="/solar" className="flex items-center justify-between bg-gray-900 hover:bg-gray-800 text-white rounded-2xl px-5 py-4 transition-colors">
          <span className="font-bold text-sm">Solar & Backup</span>
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  )
}
