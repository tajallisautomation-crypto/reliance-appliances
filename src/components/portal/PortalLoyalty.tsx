import { Star, CheckCircle } from 'lucide-react'
import type { PortalData } from './portalTypes'
import { TIERS, TIER_BENEFITS } from './portalConstants'

const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })

const TYPE_LABELS: Record<string, string> = {
  earn_purchase: 'Purchase',
  earn_referral: 'Referral',
  earn_profile:  'Profile Setup',
  earn_bonus:    'Bonus',
  earn_review:   'Review',
  redeem:        'Redeemed',
}

export default function PortalLoyalty({ profile, loyaltyTxns }: PortalData) {
  const tier     = TIERS[profile?.loyalty_tier ?? 'bronze']
  const pts      = profile?.loyalty_points ?? 0
  const progress = tier.nextMin === Infinity ? 100 : Math.min(100, Math.round(((pts - tier.min) / (tier.nextMin - tier.min)) * 100))
  const ptsToNext = tier.nextMin === Infinity ? 0 : Math.max(0, tier.nextMin - pts)

  const ALL_TIERS = Object.entries(TIERS)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-bold text-gray-900 text-lg">Loyalty & Rewards</h2>
        <p className="text-sm text-gray-500">Earn 1 point for every PKR 100 spent. Tier up for better benefits.</p>
      </div>

      {/* Current tier card */}
      <div className={`rounded-2xl p-6 ${tier.bg}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-gray-600">Current Tier</p>
            <p className={`text-2xl font-black ${tier.color}`}>{tier.emoji} {tier.label}</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-black text-gray-900">{pts.toLocaleString()}</p>
            <p className="text-xs text-gray-500">points</p>
          </div>
        </div>

        {tier.nextMin !== Infinity && (
          <>
            <div className="h-2.5 bg-white/60 rounded-full overflow-hidden mb-2">
              <div className="h-full bg-current rounded-full transition-all duration-500" style={{ width: `${progress}%`, color: 'inherit' }}
                   data-progress={progress} />
            </div>
            <p className="text-xs text-gray-600 font-medium">{ptsToNext.toLocaleString()} more points to reach {tier.nextLabel}</p>
          </>
        )}
        {tier.nextMin === Infinity && (
          <p className="text-sm font-bold text-purple-700">🎉 You've reached the highest tier!</p>
        )}
      </div>

      {/* Tier ladder */}
      <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
        {ALL_TIERS.map(([key, t]) => {
          const isCurrent = key === (profile?.loyalty_tier ?? 'bronze')
          const isAchieved = pts >= t.min
          return (
            <div key={key} className={`p-4 ${isCurrent ? 'bg-brand-50' : ''}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{t.emoji}</span>
                  <div>
                    <span className={`font-bold ${isCurrent ? 'text-brand-700' : 'text-gray-700'}`}>{t.label}</span>
                    {isCurrent && <span className="ml-2 text-xs bg-brand-500 text-white px-2 py-0.5 rounded-full font-semibold">Current</span>}
                  </div>
                </div>
                <span className="text-xs text-gray-400">{t.min.toLocaleString()}+ pts</span>
              </div>
              <ul className="space-y-1 ml-8">
                {TIER_BENEFITS[key].slice(0, isCurrent ? undefined : 2).map(b => (
                  <li key={b} className={`flex items-center gap-1.5 text-xs ${isAchieved ? 'text-gray-700' : 'text-gray-400'}`}>
                    <CheckCircle className={`w-3 h-3 flex-shrink-0 ${isAchieved ? 'text-green-500' : 'text-gray-300'}`} />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>

      {/* How to earn */}
      <div className="bg-gray-50 rounded-2xl p-5">
        <p className="font-bold text-gray-900 text-sm mb-3 flex items-center gap-2"><Star className="w-4 h-4 text-yellow-500" /> How to Earn Points</p>
        <div className="space-y-2 text-sm">
          {[
            ['🛍️', 'Purchase',          '1 pt per PKR 100 spent'],
            ['👥', 'Referral Confirmed', '250 pts per referral'],
            ['🏠', 'Add Appliance',      '50 pts each (first 5)'],
            ['⭐', 'Leave a Review',     '100 pts'],
            ['🎁', 'First Purchase',     '500 bonus pts'],
          ].map(([icon, label, desc]) => (
            <div key={label} className="flex items-center gap-3">
              <span className="text-lg w-7 text-center">{icon}</span>
              <div>
                <span className="font-semibold text-gray-800">{label}</span>
                <span className="text-gray-500 ml-2">{desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Points history */}
      {loyaltyTxns.length > 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <p className="font-bold text-gray-900 text-sm px-5 py-3 border-b border-gray-100">Points History</p>
          <div className="divide-y divide-gray-50">
            {loyaltyTxns.map(t => (
              <div key={t.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm text-gray-800">{t.description || TYPE_LABELS[t.type] || t.type}</p>
                  <p className="text-xs text-gray-400">{fmtDate(t.created_at)}</p>
                </div>
                <span className={`text-sm font-black ${t.points >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {t.points >= 0 ? '+' : ''}{t.points} pts
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-400">
          <Star className="w-9 h-9 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No points yet. Make your first purchase to start earning!</p>
        </div>
      )}
    </div>
  )
}
