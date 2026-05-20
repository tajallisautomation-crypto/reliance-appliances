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
import type { CustomerProfile, CustomerAppliance, CustomerCarePlan, LoyaltyTransaction, ReferralEarning, PortalOrder, PortalData } from '@/components/portal/portalTypes'
import toast from 'react-hot-toast'

type Tab = 'overview' | 'orders' | 'appliances' | 'support' | 'payments' | 'recommendations' | 'referrals' | 'loyalty' | 'account' | 'care-plans'

const PRIMARY_TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: 'overview',    label: 'Overview',    emoji: '🏠' },
  { id: 'care-plans',  label: 'Care Plans',  emoji: '🛡️' },
  { id: 'orders',      label: 'Orders',      emoji: '📋' },
  { id: 'payments',    label: 'Payments',    emoji: '💳' },
  { id: 'support',     label: 'Support',     emoji: '🎫' },
  { id: 'account',     label: 'Account',     emoji: '⚙️' },
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

// ── Authenticated dashboard ────────────────────────────────────────────────
function DashboardView({ email }: { email: string }) {
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [loading, setLoading]     = useState(true)
  const [profile, setProfile]     = useState<CustomerProfile | null>(null)
  const [appliances, setAppliances]             = useState<CustomerAppliance[]>([])
  const [loyaltyTxns, setLoyaltyTxns]           = useState<LoyaltyTransaction[]>([])
  const [referralEarnings, setReferralEarnings] = useState<ReferralEarning[]>([])
  const [orders, setOrders]       = useState<PortalOrder[]>([])
  const [carePlans, setCarePlans] = useState<CustomerCarePlan[]>([])

  const fetchAll = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const uid = user.id
    setLoading(true)
    try {
      const [pRes, aRes, lRes, rRes, oRes, cpRes] = await Promise.all([
        supabase.from('customer_profiles').select('*').eq('user_id', uid).single(),
        supabase.from('customer_appliances').select('*').eq('user_id', uid).eq('is_active', true).order('created_at', { ascending: false }),
        supabase.from('loyalty_transactions').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(50),
        supabase.from('referral_earnings').select('*').eq('referrer_user_id', uid).order('created_at', { ascending: false }),
        supabase.from('orders').select('*').eq('customer_email', email).order('created_at', { ascending: false }).limit(20),
        supabase.from('customer_care_plans').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
      ])
      if (pRes.data) {
        setProfile(pRes.data)
      } else {
        // First login — create profile row
        const { data: np } = await supabase
          .from('customer_profiles')
          .upsert({ user_id: uid, full_name: user.user_metadata?.full_name || '' }, { onConflict: 'user_id' })
          .select().single()
        if (np) setProfile(np)
      }
      setAppliances(aRes.data || [])
      setLoyaltyTxns(lRes.data || [])
      setReferralEarnings(rRes.data || [])
      setOrders(oRes.data || [])
      setCarePlans(cpRes.data || [])
    } catch (err) {
      if (import.meta.env.DEV) console.error('[Portal]', err)
    } finally { setLoading(false) }
  }, [email])

  useEffect(() => { fetchAll() }, [fetchAll])

  const portalData: PortalData = {
    profile, appliances, loyaltyTxns, referralEarnings, orders, carePlans,
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
                (t.id === 'overview' && ['appliances','recommendations','referrals','loyalty'].includes(activeTab))
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
