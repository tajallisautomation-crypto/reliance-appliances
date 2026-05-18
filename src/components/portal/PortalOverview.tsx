import { Link } from 'react-router-dom'
import { Bell, CreditCard, Package, ChevronRight, Wrench, Calendar } from 'lucide-react'
import { waSales } from '@/lib/whatsapp'
import type { PortalData } from './portalTypes'
import { TIERS, TIER_BENEFITS, SERVICE_INTERVAL, INST_MONTHLY, CATEGORY_ICONS } from './portalConstants'

const fmtPKR  = (n: number) => 'PKR ' + Math.round(n || 0).toLocaleString('en-PK')
const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })

function daysAgo(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
}

function customerSince(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-PK', { month: 'long', year: 'numeric' })
}

export default function PortalOverview({ profile, appliances, loyaltyTxns, orders, referralEarnings, navigateTo }: PortalData) {
  const tier = TIERS[profile?.loyalty_tier ?? 'bronze']
  const pts  = profile?.loyalty_points ?? 0

  const serviceDue = appliances.filter(a => {
    const interval = SERVICE_INTERVAL[a.category]
    if (!interval) return false
    const ref = a.last_serviced_at ?? (a.purchase_year ? `${a.purchase_year}-06-01` : null)
    if (!ref) return false
    return daysAgo(ref) >= interval
  })

  const instOrders = orders.filter(o => INST_MONTHLY[o.payment_method])
  const nextDue = instOrders.flatMap(o => {
    const count = INST_MONTHLY[o.payment_method] ?? 0
    return Array.from({ length: count }, (_, i) => {
      const d = new Date(o.created_at)
      d.setMonth(d.getMonth() + i + 1)
      return { due: d, amount: o.monthly_amount ?? 0 }
    })
  }).filter(x => x.due >= new Date()).sort((a, b) => a.due.getTime() - b.due.getTime())[0]

  const recentOrders = orders.slice(0, 3)
  const totalReferralEarned = referralEarnings.reduce((s, r) => s + (r.commission_amount ?? 0), 0)
  const pendingReferrals = referralEarnings.filter(r => r.status === 'pending').length

  const warrantyExpiringSoon = appliances.filter(a => {
    if (!a.warranty_end_date) return false
    const end = new Date(a.warranty_end_date)
    const diffMs = end.getTime() - Date.now()
    return diffMs > 0 && diffMs < 60 * 24 * 60 * 60 * 1000
  })

  return (
    <div className="space-y-5">
      {/* Welcome + tier */}
      <div className={`rounded-2xl p-5 ${tier.bg}`}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Welcome back</p>
            <p className="text-xl font-black text-gray-900">{profile?.full_name || 'Valued Customer'}</p>
            <div className={`inline-flex items-center gap-1.5 mt-1 text-sm font-bold ${tier.color}`}>
              {tier.emoji} {tier.label} Member
            </div>
            {profile?.created_at && (
              <p className="text-xs text-gray-500 flex items-center gap-1 mt-1.5">
                <Calendar className="w-3 h-3" /> Customer since {customerSince(profile.created_at)}
              </p>
            )}
          </div>
          <div className="text-right flex-shrink-0 ml-4">
            <p className="text-3xl font-black text-gray-900">{pts.toLocaleString()}</p>
            <p className="text-xs text-gray-500">loyalty points</p>
          </div>
        </div>
      </div>

      {/* Service due alerts */}
      {serviceDue.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
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

      {/* Warranty expiring soon */}
      {warrantyExpiringSoon.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-start gap-3">
          <span className="text-xl">📋</span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-orange-800 text-sm">Warranty Expiring Soon</p>
            <p className="text-xs text-orange-700 mt-0.5 truncate">
              {warrantyExpiringSoon.map(a => `${a.brand} ${a.model}`).join(', ')} — ends within 60 days
            </p>
          </div>
          <button onClick={() => navigateTo?.('appliances')} className="text-xs font-bold text-orange-700 hover:underline flex-shrink-0">
            View →
          </button>
        </div>
      )}

      {/* Next installment due */}
      {nextDue && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CreditCard className="w-6 h-6 text-blue-600 flex-shrink-0" />
            <div>
              <p className="font-bold text-blue-900">Upcoming Installment</p>
              <p className="text-sm text-blue-700">
                {fmtPKR(nextDue.amount)} due {nextDue.due.toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
              </p>
            </div>
          </div>
          <button onClick={() => navigateTo?.('payments')}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl flex-shrink-0">
            <CreditCard className="w-4 h-4" /> Pay
          </button>
        </div>
      )}

      {/* Secondary module cards */}
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">My Modules</p>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => navigateTo?.('appliances')}
            className="bg-white rounded-2xl border border-gray-100 hover:border-brand-200 hover:shadow-sm p-4 text-left transition-all group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">📦</span>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-brand-400" />
            </div>
            <p className="font-bold text-gray-900 text-sm">Appliances</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {appliances.length} registered{serviceDue.length > 0 ? ` · ${serviceDue.length} service due` : ''}
            </p>
          </button>

          <button onClick={() => navigateTo?.('loyalty')}
            className="bg-white rounded-2xl border border-gray-100 hover:border-brand-200 hover:shadow-sm p-4 text-left transition-all group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">⭐</span>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-brand-400" />
            </div>
            <p className="font-bold text-gray-900 text-sm">Loyalty</p>
            <p className="text-xs text-gray-500 mt-0.5">{pts.toLocaleString()} pts · {tier.label}</p>
          </button>

          <button onClick={() => navigateTo?.('recommendations')}
            className="bg-white rounded-2xl border border-gray-100 hover:border-brand-200 hover:shadow-sm p-4 text-left transition-all group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">💡</span>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-brand-400" />
            </div>
            <p className="font-bold text-gray-900 text-sm">Recommendations</p>
            <p className="text-xs text-gray-500 mt-0.5">Solar, UPS & energy tips</p>
          </button>

          <button onClick={() => navigateTo?.('referrals')}
            className="bg-white rounded-2xl border border-gray-100 hover:border-brand-200 hover:shadow-sm p-4 text-left transition-all group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">🎁</span>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-brand-400" />
            </div>
            <p className="font-bold text-gray-900 text-sm">Referrals</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {totalReferralEarned > 0 ? `PKR ${Math.round(totalReferralEarned).toLocaleString()} earned` : 'Earn 2% per referral'}
              {pendingReferrals > 0 ? ` · ${pendingReferrals} pending` : ''}
            </p>
          </button>
        </div>
      </div>

      {/* Tier benefits */}
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

      {/* Recent orders */}
      {recentOrders.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <Package className="w-4 h-4 text-brand-500" /> Recent Orders
            </h3>
            <button onClick={() => navigateTo?.('orders')} className="text-xs font-bold text-brand-500 hover:underline">
              View all
            </button>
          </div>
          <div className="space-y-3">
            {recentOrders.map(o => (
              <div key={o.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{fmtPKR(o.total_amount)}</p>
                  <p className="text-xs text-gray-400">{fmtDate(o.created_at)} · {o.payment_method.toUpperCase()}</p>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  o.status === 'delivered' ? 'bg-blue-100 text-blue-700' :
                  o.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                  'bg-amber-100 text-amber-700'
                }`}>
                  {o.status || 'Processing'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Shop CTAs */}
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
