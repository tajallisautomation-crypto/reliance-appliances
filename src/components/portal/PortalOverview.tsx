import { Link } from 'react-router-dom'
import { Bell, CreditCard, Package, ChevronRight, Wrench, Calendar, Shield, Zap, RefreshCw, Star, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { waSales } from '@/lib/whatsapp'
import type { PortalData } from './portalTypes'
import { TIERS, TIER_BENEFITS, SERVICE_INTERVAL, INST_MONTHLY, CATEGORY_ICONS, CATEGORY_TO_PLAN_CATEGORY } from './portalConstants'

const fmtPKR  = (n: number) => 'PKR ' + Math.round(n || 0).toLocaleString('en-PK')
const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })
const fmtDateShort = (d: Date) => d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })

function daysAgo(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
}

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000)
}

function customerSince(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-PK', { month: 'long', year: 'numeric' })
}

interface Action {
  priority: number
  icon: React.ReactNode
  label: string
  detail: string
  cta: string
  ctaHref?: string
  ctaOnClick?: () => void
  color: string
  bg: string
  border: string
}

export default function PortalOverview({ profile, appliances, loyaltyTxns, orders, referralEarnings, carePlans, accountVerification, navigateTo }: PortalData) {
  const tier = TIERS[profile?.loyalty_tier ?? 'bronze']
  const pts  = profile?.loyalty_points ?? 0

  const serviceDue = appliances.filter(a => {
    const interval = SERVICE_INTERVAL[a.category]
    if (!interval) return false
    const ref = a.last_serviced_at ?? (a.purchase_year ? `${a.purchase_year}-06-01` : null)
    if (!ref) return false
    return daysAgo(ref) >= interval
  })

  // ── Installment status — read from authoritative DB ledger ────────────────
  // accountVerification is computed in Portal.tsx from installment_schedules.
  // Only fall back to order-estimation if no installment invoices exist in the ledger.
  const hasLedgerData = accountVerification.totalMonthlySlots > 0
  const fmtDue = (d: string) => new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })

  // Legacy estimation (from online orders table) — used only when no ledger data
  const instOrders = orders.filter(o => INST_MONTHLY[o.payment_method])
  const legacyNextDue = !hasLedgerData ? instOrders.flatMap(o => {
    const count = INST_MONTHLY[o.payment_method] ?? 0
    return Array.from({ length: count }, (_, i) => {
      const d = new Date(o.created_at)
      d.setMonth(d.getMonth() + i + 1)
      return { due: d, amount: o.monthly_amount ?? 0 }
    })
  }).filter(x => x.due >= new Date()).sort((a, b) => a.due.getTime() - b.due.getTime())[0] : undefined

  const legacyOverdue = !hasLedgerData ? instOrders.flatMap(o => {
    const count = INST_MONTHLY[o.payment_method] ?? 0
    return Array.from({ length: count }, (_, i) => {
      const d = new Date(o.created_at)
      d.setMonth(d.getMonth() + i + 1)
      return { due: d, amount: o.monthly_amount ?? 0 }
    })
  }).filter(x => x.due < new Date())[0] : undefined

  // Resolved values — prefer ledger, fall back to estimation
  const isOverdue = hasLedgerData
    ? accountVerification.isDefaulter
    : !!legacyOverdue
  const overdueAmount = hasLedgerData
    ? accountVerification.totalOverdueAmount
    : (legacyOverdue?.amount ?? 0)
  const overdueDue = hasLedgerData
    ? (accountVerification.installmentSlots.find(s =>
        s.status === 'overdue' ||
        (s.status === 'pending' && s.installment_no > 0 && new Date(s.due_date) < new Date())
      )?.due_date ?? null)
    : null
  const nextDueDate = hasLedgerData ? accountVerification.nextDueDate : (legacyNextDue ? legacyNextDue.due.toISOString().slice(0,10) : null)
  const nextDueAmt  = hasLedgerData ? accountVerification.nextDueAmount : (legacyNextDue?.amount ?? null)

  const warrantyExpiringSoon = appliances.filter(a => {
    if (!a.warranty_end_date) return false
    const days = daysUntil(a.warranty_end_date)
    return days > 0 && days <= 60
  })

  const warrantyExpired = appliances.filter(a => {
    if (!a.warranty_end_date) return false
    return daysUntil(a.warranty_end_date) <= 0
  })

  const expiringCarePlans = carePlans.filter(cp =>
    cp.status === 'expiring_soon' || (cp.expires_at && daysUntil(cp.expires_at) <= 30 && daysUntil(cp.expires_at) > 0)
  )

  const appliancesWithoutPlan = appliances.filter(a => {
    const planCat = CATEGORY_TO_PLAN_CATEGORY[a.category]
    if (!planCat) return false
    return !carePlans.some(cp => cp.appliance_id === a.id && ['active', 'expiring_soon', 'pending_inspection'].includes(cp.status))
  })

  const recentOrders = orders.slice(0, 3)
  const totalReferralEarned = referralEarnings.reduce((s, r) => s + (r.commission_amount ?? 0), 0)
  const pendingReferrals = referralEarnings.filter(r => r.status === 'pending').length

  // Build prioritized next actions
  const actions: Action[] = []

  if (isOverdue) {
    actions.push({
      priority: 1,
      icon: <CreditCard className="w-4 h-4" />,
      label: `Payment Overdue${accountVerification.overdueCount > 1 ? ` (${accountVerification.overdueCount} missed)` : ''}`,
      detail: `${fmtPKR(overdueAmount)} outstanding${overdueDue ? ` — was due ${fmtDue(overdueDue)}` : ''}. Clear immediately to avoid service suspension.`,
      cta: 'Pay Now',
      ctaOnClick: () => navigateTo?.('payments'),
      color: 'text-red-700',
      bg: 'bg-red-50',
      border: 'border-red-200',
    })
  }

  if (warrantyExpiringSoon.length > 0) {
    const a = warrantyExpiringSoon[0]
    const days = daysUntil(a.warranty_end_date!)
    actions.push({
      priority: 2,
      icon: <Shield className="w-4 h-4" />,
      label: 'Warranty Expiring Soon',
      detail: `${a.brand} ${a.model} warranty ends in ${days} day${days !== 1 ? 's' : ''}. Claim support or add a care plan before expiry.`,
      cta: 'Claim Warranty',
      ctaHref: waSales(`Hi! I'd like to claim warranty for my ${a.brand} ${a.model} before it expires. Serial: ${a.serial_no || 'N/A'}`),
      color: 'text-amber-700',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
    })
  }

  if (nextDueDate && nextDueAmt != null && !isOverdue) {
    const daysLeft = Math.ceil((new Date(nextDueDate).getTime() - Date.now()) / 86_400_000)
    if (daysLeft <= 10) {
      actions.push({
        priority: 3,
        icon: <CreditCard className="w-4 h-4" />,
        label: 'Installment Due Soon',
        detail: `${fmtPKR(nextDueAmt)} due on ${fmtDue(nextDueDate)} — ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left.`,
        cta: 'Pay Now',
        ctaOnClick: () => navigateTo?.('payments'),
        color: 'text-blue-700',
        bg: 'bg-blue-50',
        border: 'border-blue-200',
      })
    }
  }

  if (serviceDue.length > 0) {
    const a = serviceDue[0]
    actions.push({
      priority: 4,
      icon: <Wrench className="w-4 h-4" />,
      label: 'Service Due',
      detail: `${a.brand} ${a.model || a.category} is due for its annual service. Book now to avoid higher repair costs.`,
      cta: 'Book Service',
      ctaHref: waSales(`Hi! I'd like to book a service visit for my ${a.brand} ${a.model}.`),
      color: 'text-orange-700',
      bg: 'bg-orange-50',
      border: 'border-orange-200',
    })
  }

  if (expiringCarePlans.length > 0) {
    const cp = expiringCarePlans[0]
    const days = cp.expires_at ? daysUntil(cp.expires_at) : 0
    actions.push({
      priority: 5,
      icon: <RefreshCw className="w-4 h-4" />,
      label: 'Care Plan Expiring',
      detail: `Your ${cp.plan_tier.charAt(0).toUpperCase() + cp.plan_tier.slice(1)} Care plan expires in ${days} days. Renew to keep your protection active.`,
      cta: 'Renew Plan',
      ctaOnClick: () => navigateTo?.('care-plans'),
      color: 'text-purple-700',
      bg: 'bg-purple-50',
      border: 'border-purple-200',
    })
  }

  if (appliancesWithoutPlan.length > 0 && actions.length < 3) {
    actions.push({
      priority: 6,
      icon: <Shield className="w-4 h-4" />,
      label: 'Appliances Without Coverage',
      detail: `${appliancesWithoutPlan.length} of your registered appliance${appliancesWithoutPlan.length > 1 ? 's have' : ' has'} no care plan. Protect them with Essential, Plus, or Elite cover.`,
      cta: 'View Care Plans',
      ctaOnClick: () => navigateTo?.('care-plans'),
      color: 'text-brand-700',
      bg: 'bg-brand-50',
      border: 'border-brand-200',
    })
  }

  if (warrantyExpired.length > 0 && actions.length < 4) {
    const a = warrantyExpired[0]
    actions.push({
      priority: 7,
      icon: <Shield className="w-4 h-4" />,
      label: 'Warranty Expired',
      detail: `${a.brand} ${a.model} warranty has expired. Protect it from unexpected repair costs with an Annual Care Plan.`,
      cta: 'Add Care Plan',
      ctaOnClick: () => navigateTo?.('care-plans'),
      color: 'text-gray-700',
      bg: 'bg-gray-50',
      border: 'border-gray-200',
    })
  }

  const topActions = actions.sort((a, b) => a.priority - b.priority).slice(0, 4)

  return (
    <div className="space-y-5">

      {/* ── Account Standing Banner — shown whenever installment history exists ── */}
      {hasLedgerData && (
        accountVerification.isDefaulter ? (
          <div className="rounded-2xl border-2 border-red-300 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4 text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-red-800 text-sm">Account Alert — Overdue Payments</p>
                <p className="text-xs text-red-700 mt-0.5 leading-relaxed">
                  {accountVerification.overdueCount} payment{accountVerification.overdueCount > 1 ? 's' : ''} totalling{' '}
                  <span className="font-bold">{fmtPKR(accountVerification.totalOverdueAmount)}</span> are past due.
                  Services may be suspended until cleared.
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <a
                    href={waSales(`Hi! I want to clear my overdue installment payment(s). Outstanding: PKR ${Math.round(accountVerification.totalOverdueAmount).toLocaleString('en-PK')}. Name: ${profile?.full_name || 'Customer'}.`)}
                    target="_blank" rel="noreferrer"
                    className="text-xs font-bold px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors"
                  >
                    Contact Us to Pay
                  </a>
                  <button
                    onClick={() => navigateTo?.('orders')}
                    className="text-xs font-bold px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl transition-colors"
                  >
                    View Schedule
                  </button>
                </div>
              </div>
            </div>
            {/* Payment track mini-ledger */}
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              {[
                { label: 'Paid', value: accountVerification.paidCount, color: 'text-green-700 bg-green-50' },
                { label: 'Overdue', value: accountVerification.overdueCount, color: 'text-red-700 bg-red-100' },
                { label: 'Remaining', value: accountVerification.totalMonthlySlots - accountVerification.paidCount - accountVerification.overdueCount, color: 'text-gray-600 bg-gray-100' },
              ].map(s => (
                <div key={s.label} className={`rounded-xl py-2 px-1 ${s.color}`}>
                  <p className="text-lg font-black">{s.value}</p>
                  <p className="text-[10px] font-semibold">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-3.5 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-green-800">Account in Good Standing</p>
              <p className="text-xs text-green-600 mt-0.5">
                {accountVerification.paidCount > 0
                  ? `${accountVerification.paidCount} of ${accountVerification.totalMonthlySlots} installments paid on time.`
                  : 'All installments current.'}
                {accountVerification.nextDueDate && (
                  <> Next payment <span className="font-semibold">{fmtDue(accountVerification.nextDueDate)}</span>.</>
                )}
              </p>
            </div>
          </div>
        )
      )}

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

      {/* Next Best Actions */}
      {topActions.length > 0 && (
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Zap className="w-3.5 h-3.5" /> Your next best actions
          </p>
          <div className="space-y-2.5">
            {topActions.map((action, i) => (
              <div key={i} className={`rounded-2xl border p-4 ${action.bg} ${action.border}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${action.color} bg-white/60`}>
                      {action.icon}
                    </div>
                    <div className="min-w-0">
                      <p className={`font-bold text-sm ${action.color}`}>{action.label}</p>
                      <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{action.detail}</p>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {action.ctaHref ? (
                      <a href={action.ctaHref} target="_blank" rel="noreferrer"
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg bg-white/80 hover:bg-white transition-colors whitespace-nowrap ${action.color}`}>
                        {action.cta}
                      </a>
                    ) : (
                      <button onClick={action.ctaOnClick}
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg bg-white/80 hover:bg-white transition-colors whitespace-nowrap ${action.color}`}>
                        {action.cta}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Module cards */}
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

          <button onClick={() => navigateTo?.('care-plans')}
            className="bg-white rounded-2xl border border-gray-100 hover:border-brand-200 hover:shadow-sm p-4 text-left transition-all group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">🛡️</span>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-brand-400" />
            </div>
            <p className="font-bold text-gray-900 text-sm">Care Plans</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {carePlans.filter(cp => cp.status === 'active').length > 0
                ? `${carePlans.filter(cp => cp.status === 'active').length} active plan${carePlans.filter(cp => cp.status === 'active').length > 1 ? 's' : ''}`
                : appliancesWithoutPlan.length > 0
                  ? `${appliancesWithoutPlan.length} appliance${appliancesWithoutPlan.length > 1 ? 's' : ''} unprotected`
                  : 'Essential · Plus · Elite'}
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

          <button onClick={() => navigateTo?.('support')}
            className="bg-white rounded-2xl border border-gray-100 hover:border-brand-200 hover:shadow-sm p-4 text-left transition-all group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">🎫</span>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-brand-400" />
            </div>
            <p className="font-bold text-gray-900 text-sm">Support</p>
            <p className="text-xs text-gray-500 mt-0.5">Warranty claims & service tickets</p>
          </button>
        </div>
      </div>

      {/* Tier benefits */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
          <Star className="w-3.5 h-3.5 text-yellow-500" /> {tier.label} Benefits
        </p>
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

      {/* Service bell alerts (kept for quick reference below actions) */}
      {serviceDue.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Bell className="w-5 h-5 text-amber-600" />
            <p className="font-bold text-amber-800">Service Due — Quick Book</p>
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
    </div>
  )
}
