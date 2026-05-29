'use client'

import { useState, useEffect, useCallback } from 'react'
import { Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react'
import SEO from '@/components/ui/SEO'
import Spinner from '@/components/ui/Spinner'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { updatePassword } from '@/lib/auth'
import AuthModal from '@/components/AuthModal'
import PortalAuth from '@/components/portal/PortalAuth'
import PortalOverview from '@/components/portal/PortalOverview'
import PortalOrders from '@/components/portal/PortalOrders'
import PortalAppliances from '@/components/portal/PortalAppliances'
import PortalSupport from '@/components/portal/PortalSupport'
import PortalRecommendations from '@/components/portal/PortalRecommendations'
import PortalPayments from '@/components/portal/PortalPayments'
import PortalReferrals from '@/components/portal/PortalReferrals'
import PortalLoyalty from '@/components/portal/PortalLoyalty'
import PortalAccount from '@/components/portal/PortalAccount'
import PortalCarePlans from '@/components/portal/PortalCarePlans'
import PortalTimeline from '@/components/portal/PortalTimeline'
import PortalInstallments from '@/components/portal/PortalInstallments'
import type { CustomerProfile, CustomerAppliance, CustomerCarePlan, LoyaltyTransaction, ReferralEarning, PortalOrder, PortalData, InvoicePurchase, InstallmentSlot, AccountVerification } from '@/components/portal/portalTypes'
import toast from 'react-hot-toast'

type Tab = 'overview' | 'orders' | 'appliances' | 'support' | 'payments' | 'recommendations' | 'referrals' | 'loyalty' | 'account' | 'care-plans' | 'timeline' | 'installments'

const PRIMARY_TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: 'overview',      label: 'Overview',      emoji: '🏠' },
  { id: 'care-plans',    label: 'Care Plans',    emoji: '🛡️' },
  { id: 'orders',        label: 'Orders',        emoji: '📋' },
  { id: 'payments',      label: 'Payments',      emoji: '💳' },
  { id: 'installments',  label: 'Installments',  emoji: '📝' },
  { id: 'timeline',      label: 'Timeline',      emoji: '🕐' },
  { id: 'support',       label: 'Support',       emoji: '🎫' },
  { id: 'account',       label: 'Account',       emoji: '⚙️' },
]

// ── Password recovery view (shown after clicking reset email link) ──────────
function SetNewPasswordView() {
  const { setRecovery } = useAuthStore()
  const [pw, setPw]       = useState('')
  const [confirm, setConf] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone]   = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pw.length < 8)   { setError('Password must be at least 8 characters.'); return }
    if (pw !== confirm)  { setError('Passwords do not match.'); return }
    setLoading(true); setError('')
    try {
      await updatePassword(pw)
      setDone(true)
      setRecovery(false)
      toast.success('Password updated! You are now signed in.')
    } catch (err: any) {
      setError(err.message || 'Could not update password.')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-lg w-full max-w-md p-8">
        <h1 className="text-2xl font-black text-gray-900 mb-1">Set New Password</h1>
        <p className="text-sm text-gray-500 mb-7">Choose a new password for your account.</p>

        {done ? (
          <div className="flex flex-col items-center gap-4 py-6">
            <CheckCircle className="w-12 h-12 text-green-500" />
            <p className="font-bold text-gray-900">Password updated!</p>
            <p className="text-sm text-gray-500">You're now signed in to your account.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{error}</div>}
            {[
              { label: 'New Password',     key: 'pw',      value: pw,      set: setPw  },
              { label: 'Confirm Password', key: 'confirm', value: confirm, set: setConf },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs font-semibold text-gray-600 block mb-1.5">{f.label}</label>
                <div className="relative border border-gray-200 rounded-xl focus-within:border-brand-400">
                  <input type={showPw ? 'text' : 'password'} value={f.value} onChange={e => f.set(e.target.value)}
                    required minLength={8} placeholder="••••••••"
                    className="w-full px-4 py-3 pr-10 text-sm focus:outline-none rounded-xl" />
                  {f.key === 'pw' && (
                    <button type="button" onClick={() => setShowPw(s => !s)}
                      className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600">
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>
            ))}
            <button type="submit" disabled={loading}
              className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Updating…' : 'Set New Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

function parseWarrantyMonths(text: string | null): number {
  if (!text) return 12
  const yr = text.match(/(\d+)\s*year/i)
  if (yr) return parseInt(yr[1]) * 12
  const mo = text.match(/(\d+)\s*month/i)
  if (mo) return parseInt(mo[1])
  return 12
}

// ── Authenticated dashboard ────────────────────────────────────────────────
function DashboardView({ email }: { email: string }) {
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [loading, setLoading]     = useState(true)
  const [profile, setProfile]     = useState<CustomerProfile | null>(null)
  const [appliances, setAppliances]             = useState<CustomerAppliance[]>([])
  const [loyaltyTxns, setLoyaltyTxns]           = useState<LoyaltyTransaction[]>([])
  const [referralEarnings, setReferralEarnings] = useState<ReferralEarning[]>([])
  const [orders, setOrders]               = useState<PortalOrder[]>([])
  const [carePlans, setCarePlans]         = useState<CustomerCarePlan[]>([])
  const [invoicePurchases, setInvoicePurchases] = useState<InvoicePurchase[]>([])
  const EMPTY_VERIFICATION: AccountVerification = {
    isDefaulter: false, overdueCount: 0, totalOverdueAmount: 0,
    paidCount: 0, totalMonthlySlots: 0,
    nextDueDate: null, nextDueAmount: null, installmentSlots: [],
  }
  const [accountVerification, setAccountVerification] = useState<AccountVerification>(EMPTY_VERIFICATION)

  const fetchAll = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const uid = user.id
    setLoading(true)
    try {
      // Fetch profile first so we can build an order filter that includes phone.
      // Email is optional in checkout, so phone-only orders would be invisible
      // if we filtered solely by customer_email.
      let profileData: CustomerProfile | null = null
      const pRes = await supabase.from('customer_profiles').select('*').eq('user_id', uid).single()
      if (pRes.data) {
        profileData = pRes.data
        setProfile(pRes.data)
      } else {
        const { data: np } = await supabase
          .from('customer_profiles')
          .upsert({ user_id: uid, full_name: user.user_metadata?.full_name || '' }, { onConflict: 'user_id' })
          .select().single()
        if (np) { profileData = np; setProfile(np) }
      }

      // Build order filter: match by auth email AND/OR profile phone
      const profilePhone = profileData?.phone?.replace(/\D/g, '') || ''
      const orderFilter = profilePhone
        ? `customer_email.eq.${email},customer_phone.eq.${profilePhone}`
        : `customer_email.eq.${email}`

      const [aRes, lRes, rRes, oRes, cpRes, invRes] = await Promise.all([
        supabase.from('customer_appliances').select('*').eq('user_id', uid).eq('is_active', true).order('created_at', { ascending: false }),
        supabase.from('loyalty_transactions').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(50),
        supabase.from('referral_earnings').select('*').eq('referrer_user_id', uid).order('created_at', { ascending: false }),
        supabase.from('orders').select('*').or(orderFilter).order('created_at', { ascending: false }).limit(20),
        supabase.from('customer_care_plans').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
        supabase
          .from('invoices')
          .select('id,ref_number,doc_type,created_at,grand_total,payment_status,sale_type,inst_months,inst_advance_amt,inst_monthly_amt,notes,portal_user_id,invoice_lines(name,model,category,qty,unit_price,warranty,product_id)')
          .or(`portal_user_id.eq.${uid},customer_email.eq.${email}`)
          .in('doc_type', ['invoice', 'installment-invoice'])
          .order('created_at', { ascending: false })
          .limit(30),
      ])

      const currentAppliances: CustomerAppliance[] = aRes.data || []
      setAppliances(currentAppliances)
      setLoyaltyTxns(lRes.data || [])
      setReferralEarnings(rRes.data || [])
      setOrders(oRes.data || [])
      setCarePlans(cpRes.data || [])

      // ── Invoice purchases ─────────────────────────────────────────────────
      const rawInvoices = (invRes.data ?? []) as any[]
      const purchases: InvoicePurchase[] = rawInvoices.map(inv => ({
        id:               inv.id,
        ref_number:       inv.ref_number,
        doc_type:         inv.doc_type,
        created_at:       inv.created_at,
        grand_total:      inv.grand_total ?? 0,
        payment_status:   inv.payment_status,
        sale_type:        inv.sale_type,
        inst_months:      inv.inst_months,
        inst_advance_amt: inv.inst_advance_amt,
        inst_monthly_amt: inv.inst_monthly_amt,
        notes:            inv.notes,
        lines:            (inv.invoice_lines ?? []).map((l: any) => ({
          name: l.name, model: l.model, category: l.category,
          qty: l.qty, unit_price: l.unit_price, warranty: l.warranty, product_id: l.product_id,
        })),
      }))
      setInvoicePurchases(purchases)

      // ── Installment payment verification (authoritative from admin ledger) ─
      const installmentInvoiceIds = rawInvoices
        .filter(inv => inv.doc_type === 'installment-invoice')
        .map(inv => inv.id)

      if (installmentInvoiceIds.length > 0) {
        const { data: slotData } = await supabase
          .from('installment_schedules')
          .select('id,invoice_id,installment_no,due_date,amount_due,amount_paid,status,paid_at')
          .in('invoice_id', installmentInvoiceIds)
          .order('due_date', { ascending: true })

        const slots = (slotData ?? []) as InstallmentSlot[]
        const today = new Date()

        // Monthly slots only (installment_no > 0 excludes the advance row)
        const monthly = slots.filter(s => s.installment_no > 0)

        // Overdue = explicitly marked overdue OR pending but past due date
        const overdueSlots = monthly.filter(s =>
          s.status === 'overdue' ||
          (s.status === 'pending' && new Date(s.due_date) < today)
        )
        const upcomingSlots = monthly
          .filter(s => s.status === 'pending' && new Date(s.due_date) >= today)

        const totalOverdueAmount = overdueSlots.reduce(
          (sum, s) => sum + Math.max(0, (s.amount_due ?? 0) - (s.amount_paid ?? 0)), 0
        )

        setAccountVerification({
          isDefaulter:        overdueSlots.length > 0,
          overdueCount:       overdueSlots.length,
          totalOverdueAmount,
          paidCount:          monthly.filter(s => s.status === 'paid').length,
          totalMonthlySlots:  monthly.length,
          nextDueDate:        upcomingSlots[0]?.due_date ?? null,
          nextDueAmount:      upcomingSlots[0]?.amount_due ?? null,
          installmentSlots:   slots,
        })
      } else {
        setAccountVerification(EMPTY_VERIFICATION)
      }

      // ── Auto-populate appliances from admin-linked invoices ───────────────
      // Only runs for invoices where admin explicitly linked this user account.
      const linkedInvoices = rawInvoices.filter(inv => inv.portal_user_id === uid)
      if (linkedInvoices.length > 0) {
        const existingSerials = new Set(currentAppliances.map(a => a.serial_no).filter(Boolean))
        const newAppliances: CustomerAppliance[] = []

        for (const inv of linkedInvoices) {
          for (const line of (inv.invoice_lines ?? []) as any[]) {
            if (!line.model) continue
            const serial = `${inv.ref_number}-${line.model.replace(/\s+/g, '')}`
            if (existingSerials.has(serial)) continue

            const warrantyMonths = parseWarrantyMonths(line.warranty)
            const purchaseDate = new Date(inv.created_at)
            const warrantyEnd = new Date(purchaseDate)
            warrantyEnd.setMonth(warrantyEnd.getMonth() + warrantyMonths)
            const brandGuess = (line.name ?? '').split(' ')[0] || 'Unknown'

            const { data: created } = await supabase
              .from('customer_appliances')
              .upsert({
                user_id:             uid,
                brand:               brandGuess,
                model:               line.model,
                category:            line.category || 'Appliance',
                purchase_year:       purchaseDate.getFullYear(),
                purchase_source:     'tajallis',
                warranty_start_date: purchaseDate.toISOString().slice(0, 10),
                warranty_end_date:   warrantyEnd.toISOString().slice(0, 10),
                serial_no:           serial,
                notes:               `Invoice ${inv.ref_number}${line.warranty ? ` · ${line.warranty}` : ''}`,
                is_active:           true,
              }, { onConflict: 'user_id,serial_no' })
              .select()
              .single()

            if (created) {
              newAppliances.push(created as CustomerAppliance)
              existingSerials.add(serial)
            }
          }
        }
        if (newAppliances.length > 0) {
          setAppliances(prev => [...newAppliances, ...prev])
        }
      }
    } catch (err) {
      if (process.env.NODE_ENV === "development") console.error('[Portal]', err)
    } finally { setLoading(false) }
  }, [email])

  useEffect(() => { fetchAll() }, [fetchAll])

  const portalData: PortalData = {
    profile, appliances, loyaltyTxns, referralEarnings, orders, carePlans,
    invoicePurchases, accountVerification,
    reload: fetchAll,
    navigateTo: (tab: string) => setActiveTab(tab as Tab),
  }

  const TAB_VIEWS: Record<Tab, React.ReactNode> = {
    overview:        <PortalOverview        {...portalData} />,
    'care-plans':    <PortalCarePlans       {...portalData} />,
    orders:          <PortalOrders          {...portalData} />,
    appliances:      <PortalAppliances      {...portalData} />,
    support:         <PortalSupport         {...portalData} />,
    payments:        <PortalPayments        {...portalData} />,
    recommendations: <PortalRecommendations {...portalData} />,
    referrals:       <PortalReferrals       {...portalData} />,
    loyalty:         <PortalLoyalty         {...portalData} />,
    account:         <PortalAccount         {...portalData} />,
    timeline:        <PortalTimeline        {...portalData} />,
    installments:    <PortalInstallments    {...portalData} />,
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-brand-600 text-white">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm flex-shrink-0">
            {profile?.full_name?.charAt(0).toUpperCase() || email.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm leading-none">{profile?.full_name || 'My Account'}</p>
            <p className="text-brand-200 text-xs mt-0.5 truncate">{email}</p>
          </div>
          <div className="ml-auto flex-shrink-0">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full bg-white/15`}>
              {profile?.loyalty_tier ? profile.loyalty_tier.charAt(0).toUpperCase() + profile.loyalty_tier.slice(1) : 'Bronze'} · {(profile?.loyalty_points ?? 0).toLocaleString()} pts
            </span>
          </div>
        </div>

        {/* Tab bar — primary tabs only; secondary modules accessed via Overview */}
        <div className="border-t border-brand-500/50 overflow-x-auto no-scrollbar">
          <nav className="flex px-4 min-w-max">
            {PRIMARY_TABS.map(t => {
              const isActive = activeTab === t.id ||
                (t.id === 'overview' && ['appliances','recommendations','referrals','loyalty'].includes(activeTab as string))
              return (
                <button key={t.id} onClick={() => setActiveTab(t.id)}
                  className={`flex items-center gap-1.5 px-3 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                    isActive
                      ? 'border-white text-white'
                      : 'border-transparent text-brand-200 hover:text-white'
                  }`}>
                  <span>{t.emoji}</span> {t.label}
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Spinner /></div>
        ) : (
          TAB_VIEWS[activeTab]
        )}
      </div>
    </div>
  )
}

// ── Main Portal component ──────────────────────────────────────────────────
export default function Portal() {
  const { session, isLoggedIn, loading: authLoading, isRecovery } = useAuthStore()
  const [authOpen, setAuthOpen]   = useState(false)
  const [authMode, setAuthMode]   = useState<'login' | 'signup'>('login')

  const openLogin  = () => { setAuthMode('login');  setAuthOpen(true) }
  const openSignup = () => { setAuthMode('signup'); setAuthOpen(true) }

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center"><Spinner /></div>
  )

  if (isRecovery) return <SetNewPasswordView />

  return (
    <>
      <SEO title="My Account — Tajalli's" description="Manage your Tajalli's account, appliances, loyalty points, and installments." noIndex />

      {isLoggedIn && session?.user ? (
        <DashboardView email={session.user.email ?? ''} />
      ) : (
        <PortalAuth onLogin={openLogin} onSignup={openSignup} />
      )}

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        defaultMode={authMode}
      />
    </>
  )
}
