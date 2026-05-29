'use client'

import Link from 'next/link'
import { Sun, Battery, Zap, TrendingDown, ChevronRight, MessageCircle, ChevronLeft } from 'lucide-react'
import { waSales } from '@/lib/whatsapp'
import type { PortalData } from './portalTypes'
import { LOAD_WATTS, APPLIANCE_CATEGORIES } from './portalConstants'

const CURRENT_YEAR = new Date().getFullYear()
const OLD_AC_THRESHOLD = 6

// Energy source categories — these are sources, not loads
const ENERGY_SOURCE_CATS = new Set(['solar', 'ups-inverters'])

function parseCap(notes: string | null): { system_kw?: number | null; battery_kwh?: number | null } {
  try { return notes ? JSON.parse(notes) : {} } catch { return {} }
}

function solarPackageLabel(kw: number): { size: string; pkg: string; href: string; price: string } {
  if (kw < 1.5)  return { size: '1.2 kW',  pkg: 'Starter UPS Package',   href: '/solar',          price: 'from PKR 140,000'   }
  if (kw < 3.5)  return { size: '3.6 kW',  pkg: 'Home Solar Package',    href: '/solar',          price: 'from PKR 490,000'   }
  if (kw < 5.5)  return { size: '5 kW',    pkg: 'Premium Solar Package', href: '/solar',          price: 'from PKR 750,000'   }
  return          { size: '10 kW+',         pkg: 'Green Corridor',        href: '/green-corridor', price: 'from PKR 1,400,000' }
}

export default function PortalRecommendations({ appliances, profile, navigateTo }: PortalData) {
  // Separate loads from energy systems
  const loadAppliances = appliances.filter(a => !ENERGY_SOURCE_CATS.has(a.category))
  const energySystems  = appliances.filter(a => ENERGY_SOURCE_CATS.has(a.category))
  const solarSystems   = appliances.filter(a => a.category === 'solar')
  const upsSystems     = appliances.filter(a => a.category === 'ups-inverters')

  if (appliances.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <span className="text-5xl block mb-3">💡</span>
        <p className="font-semibold text-gray-700">No appliances registered yet</p>
        <p className="text-sm mt-1">Add your appliances to get personalised solar and energy recommendations.</p>
      </div>
    )
  }

  // Load calculation — energy sources excluded
  const totalW  = loadAppliances.reduce((s, a) => s + (LOAD_WATTS[a.category] ?? 150), 0)
  const totalKW = Math.round(totalW / 100) / 10

  // Installed solar capacity
  const installedSolarKW  = solarSystems.reduce((s, a) => s + (parseCap(a.notes).system_kw ?? 0), 0)
  const installedBatteryKWh = energySystems.reduce((s, a) => s + (parseCap(a.notes).battery_kwh ?? 0), 0)
  const hasSolar      = installedSolarKW > 0
  const hasBattery    = installedBatteryKWh > 0
  const hasAnyBackup  = energySystems.length > 0

  const { size: recSize, pkg: recPkg, href: recHref, price: recPrice } = solarPackageLabel(totalKW)
  const addressType = profile?.address_type ?? 'residence'

  // Upgrade intelligence
  const solarCoversLoad = hasSolar && installedSolarKW >= totalKW
  const solarGapKW      = hasSolar ? Math.max(0, totalKW - installedSolarKW) : 0
  const dayBackupHours  = hasBattery && totalW > 0 ? Math.round((installedBatteryKWh * 0.85 * 10) / totalW) / 10 : 0
  const targetBatteryKWh = Math.ceil(totalKW * 4)  // 4 hours evening backup target

  const oldACs  = loadAppliances.filter(a => a.category === 'air-conditioners' && a.purchase_year && (CURRENT_YEAR - a.purchase_year) >= OLD_AC_THRESHOLD)
  const highLoad = loadAppliances.filter(a => (LOAD_WATTS[a.category] ?? 0) >= 1000)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        {navigateTo && (
          <button onClick={() => navigateTo('overview')} className="text-gray-400 hover:text-gray-600 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        <div>
          <h2 className="font-bold text-gray-900 text-lg">Smart Recommendations</h2>
          <p className="text-sm text-gray-500">Based on {appliances.length} appliance{appliances.length !== 1 ? 's' : ''} in your {addressType}.</p>
        </div>
      </div>

      {/* Load summary — energy sources separated */}
      <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <Zap className="w-6 h-6 text-yellow-600" />
          <div>
            <p className="font-bold text-gray-900">Estimated Load: {totalKW} kW</p>
            <p className="text-sm text-gray-500">
              {loadAppliances.length} load appliance{loadAppliances.length !== 1 ? 's' : ''}
              {energySystems.length > 0 ? ` · ${energySystems.length} energy source${energySystems.length !== 1 ? 's' : ''} (excluded from load)` : ''}
            </p>
          </div>
        </div>
        <div className="space-y-1.5">
          {loadAppliances.map(a => {
            const w = LOAD_WATTS[a.category] ?? 150
            const label = APPLIANCE_CATEGORIES.find(c => c.value === a.category)?.label ?? a.category
            const pct = totalW > 0 ? Math.round((w / totalW) * 100) : 0
            return (
              <div key={a.id} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-28 truncate">{a.brand || label}</span>
                <div className="flex-1 h-2 bg-yellow-100 rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs font-medium text-gray-600 w-14 text-right">{w >= 1000 ? `${w/1000}kW` : `${w}W`}</span>
              </div>
            )
          })}
        </div>

        {/* Installed energy sources summary */}
        {energySystems.length > 0 && (
          <div className="mt-4 pt-4 border-t border-yellow-200">
            <p className="text-xs font-semibold text-yellow-800 mb-2">Your Installed Energy Systems</p>
            <div className="flex flex-wrap gap-2">
              {energySystems.map(a => {
                const cap = parseCap(a.notes)
                const parts = []
                if (cap.system_kw) parts.push(`${cap.system_kw}kW`)
                if (cap.battery_kwh) parts.push(`${cap.battery_kwh}kWh`)
                return (
                  <span key={a.id} className="text-xs bg-white border border-yellow-200 px-2.5 py-1 rounded-full text-gray-700">
                    {a.category === 'solar' ? '☀️' : '🔋'} {a.brand} {a.model}
                    {parts.length > 0 && ` · ${parts.join(' + ')}`}
                  </span>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* SECTION: If user has solar — show capacity analysis & upgrades */}
      {hasSolar && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Sun className="w-5 h-5 text-yellow-500" />
            <p className="font-bold text-gray-900">Your Solar System Analysis</p>
          </div>

          {/* Coverage status */}
          <div className={`rounded-xl p-3 text-sm ${solarCoversLoad ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-800'}`}>
            {solarCoversLoad ? (
              <>✅ Your {installedSolarKW}kW system fully covers your {totalKW}kW load during peak sun hours.</>
            ) : (
              <>⚡ Your {installedSolarKW}kW system covers ~{Math.round((installedSolarKW / totalKW) * 100)}% of your {totalKW}kW load. {solarGapKW.toFixed(1)}kW additional capacity recommended.</>
            )}
          </div>

          {/* Battery analysis */}
          {hasBattery ? (
            <div className={`rounded-xl p-3 text-sm ${dayBackupHours >= 3 ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-800'}`}>
              🔋 Your {installedBatteryKWh}kWh battery provides approximately {dayBackupHours}h of backup at current load.
              {dayBackupHours < 3 && ` Upgrading to ${targetBatteryKWh}kWh would give you 4h of evening backup.`}
            </div>
          ) : (
            <div className="rounded-xl p-3 text-sm bg-blue-50 text-blue-800">
              🌙 No battery recorded. Adding storage lets you use solar energy after sunset — typically {targetBatteryKWh}kWh covers {addressType === 'office' ? 'after-hours essentials' : 'your evening load'}.
            </div>
          )}

          {/* Upgrade CTAs */}
          <div className="flex flex-wrap gap-2 pt-1">
            {!solarCoversLoad && (
              <a href={waSales(`Hi! I have a ${installedSolarKW}kW solar system and would like to add more panels to cover my ${totalKW}kW load.`)} target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-bold px-4 py-2 rounded-xl">
                <Sun className="w-4 h-4" /> Expand System
              </a>
            )}
            {(!hasBattery || dayBackupHours < 3) && (
              <a href={waSales(`Hi! I'd like to add/upgrade battery storage to my ${installedSolarKW}kW solar system.`)} target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2 rounded-xl">
                <Battery className="w-4 h-4" /> {hasBattery ? 'Upgrade Battery' : 'Add Battery'}
              </a>
            )}
            <a href={waSales(`Hi! I'd like a professional review of my ${installedSolarKW}kW solar system.`)} target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 border border-gray-200 text-gray-700 text-sm font-semibold px-4 py-2 rounded-xl hover:bg-gray-50">
              <MessageCircle className="w-4 h-4" /> Get Assessment
            </a>
          </div>
        </div>
      )}

      {/* SECTION: If UPS only (no solar) — recommend pairing with solar */}
      {upsSystems.length > 0 && solarSystems.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5 flex items-start gap-3">
          <Sun className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-yellow-900">Add Solar to Your UPS</p>
            <p className="text-sm text-yellow-800 mt-1">
              You have a UPS/inverter — pairing it with solar panels eliminates electricity costs during daylight hours and charges your batteries for free. For your {totalKW}kW load, a {recSize} system is ideal.
            </p>
            <div className="flex gap-2 mt-3">
              <Link href={recHref} className="flex items-center gap-1.5 bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-bold px-4 py-2 rounded-xl">
                <Sun className="w-4 h-4" /> View {recPkg}
              </Link>
              <a href={waSales(`Hi! I have a UPS and want to add solar panels. My load is ${totalKW}kW.`)} target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 border border-yellow-300 text-yellow-800 text-sm font-semibold px-4 py-2 rounded-xl hover:bg-yellow-100">
                <MessageCircle className="w-4 h-4" /> Get Quote
              </a>
            </div>
          </div>
        </div>
      )}

      {/* SECTION: No backup at all — recommend solar */}
      {!hasAnyBackup && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <Sun className="w-5 h-5 text-brand-500" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-gray-900">Recommended: {recSize} Solar System</p>
              <p className="text-sm text-gray-500 mt-1">
                {addressType === 'office'
                  ? `For your office load of ${totalKW}kW, a ${recSize} system covers daytime operations and cuts electricity bills.`
                  : `For your home load of ${totalKW}kW, a ${recSize} system covers most of your daily usage.`}
              </p>
              <p className="text-sm font-semibold text-brand-600 mt-2">{recPrice}</p>
              <p className="text-xs text-gray-400 mt-1">Estimate based on registered appliance load. Actual sizing may vary after on-site assessment.</p>
              <div className="flex gap-2 mt-3">
                <Link href={recHref} className="flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold px-4 py-2 rounded-xl">
                  <ChevronRight className="w-4 h-4" /> View {recPkg}
                </Link>
                <a href={waSales(`Hi! I'd like a solar consultation. My home load is about ${totalKW}kW.`)} target="_blank" rel="noreferrer"
                  className="flex items-center gap-1.5 border border-gray-200 text-gray-700 text-sm font-semibold px-4 py-2 rounded-xl hover:bg-gray-50">
                  <MessageCircle className="w-4 h-4" /> Get Advice
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* No backup — UPS alert */}
      {!hasAnyBackup && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 flex items-start gap-3">
          <Battery className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-blue-900">No Backup Power Detected</p>
            <p className="text-sm text-blue-700 mt-1">
              During load-shedding your {loadAppliances.length} appliance{loadAppliances.length > 1 ? 's are' : ' is'} unprotected. A UPS or inverter keeps essentials running.
            </p>
            <Link href="/solar" className="inline-flex items-center gap-1 mt-2 text-sm font-bold text-blue-700 hover:underline">
              View UPS & Inverter options <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Old AC upgrade */}
      {oldACs.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-5 flex items-start gap-3">
          <TrendingDown className="w-6 h-6 text-green-700 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-green-900">Energy Upgrade Opportunity</p>
            <p className="text-sm text-green-700 mt-1">
              {oldACs.map(a => `${a.brand}${a.model ? ' ' + a.model : ''} (${a.purchase_year})`).join(', ')} — {oldACs.length > 1 ? 'these are' : 'this is'} over {OLD_AC_THRESHOLD} years old. Older ACs consume 30–50% more electricity than modern inverter models.
            </p>
            <Link href="/products?category=air-conditioners" className="inline-flex items-center gap-1 mt-2 text-sm font-bold text-green-700 hover:underline">
              Browse inverter ACs <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* High-load notice */}
      {highLoad.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-start gap-3">
          <Zap className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-gray-900">High-Load Appliances</p>
            <p className="text-sm text-gray-500 mt-1">
              {highLoad.map(a => a.brand + (a.model ? ' ' + a.model : '')).join(', ')} draw significant power. Ensure your wiring and circuit breakers are correctly rated. Our technicians can do a free assessment.
            </p>
            <a href={waSales("Hi! I'd like a home electrical assessment.")} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1 mt-2 text-sm font-bold text-brand-600 hover:underline">
              Request assessment <ChevronRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 text-center pb-2">
        Recommendations are indicative estimates based on registered appliance data. On-site assessment may vary actual sizing.
      </p>
    </div>
  )
}
