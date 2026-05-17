import { Link } from 'react-router-dom'
import { Sun, Battery, Zap, TrendingDown, ChevronRight, MessageCircle } from 'lucide-react'
import { waSales } from '@/lib/whatsapp'
import type { PortalData } from './portalTypes'
import { LOAD_WATTS, APPLIANCE_CATEGORIES } from './portalConstants'

const CURRENT_YEAR = new Date().getFullYear()
const OLD_AC_THRESHOLD = 6  // years before recommending inverter upgrade

function solarPackageLabel(kw: number): { size: string; pkg: string; href: string; price: string } {
  if (kw < 1.5)  return { size: '1.2 kW',  pkg: 'Starter UPS Package',  href: '/solar',        price: 'from PKR 140,000' }
  if (kw < 3.5)  return { size: '3.6 kW',  pkg: 'Home Solar Package',   href: '/solar',        price: 'from PKR 490,000' }
  if (kw < 5.5)  return { size: '5 kW',    pkg: 'Premium Solar Package', href: '/solar',        price: 'from PKR 750,000' }
  return          { size: '10 kW+',         pkg: 'Green Corridor',        href: '/green-corridor', price: 'from PKR 1,400,000' }
}

export default function PortalRecommendations({ appliances, profile }: PortalData) {
  if (appliances.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <span className="text-5xl block mb-3">💡</span>
        <p className="font-semibold text-gray-700">No appliances registered yet</p>
        <p className="text-sm mt-1 text-gray-400">Add your appliances first to get personalised solar and energy recommendations.</p>
      </div>
    )
  }

  // Load calculation
  const totalW  = appliances.reduce((s, a) => s + (LOAD_WATTS[a.category] ?? 150), 0)
  const totalKW = Math.round(totalW / 100) / 10
  const { size, pkg, href, price } = solarPackageLabel(totalKW)

  // UPS check
  const hasBackup = appliances.some(a => ['solar', 'ups-inverters'].includes(a.category))

  // Old ACs (non-inverter risk)
  const oldACs = appliances.filter(a => a.category === 'air-conditioners' && a.purchase_year && (CURRENT_YEAR - a.purchase_year) >= OLD_AC_THRESHOLD)

  // High-load appliances
  const highLoad = appliances.filter(a => (LOAD_WATTS[a.category] ?? 0) >= 1000 && !['solar', 'ups-inverters'].includes(a.category))

  const addressType = profile?.address_type ?? 'residence'

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-bold text-gray-900 text-lg">Smart Recommendations</h2>
        <p className="text-sm text-gray-500">Based on {appliances.length} appliance{appliances.length !== 1 ? 's' : ''} in your {addressType}.</p>
      </div>

      {/* Load summary */}
      <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <Sun className="w-6 h-6 text-yellow-600" />
          <div>
            <p className="font-bold text-gray-900">Estimated Load: {totalKW} kW</p>
            <p className="text-sm text-gray-500">Combined running load of your appliances</p>
          </div>
        </div>
        <div className="space-y-1.5">
          {appliances.map(a => {
            const w = LOAD_WATTS[a.category] ?? 150
            const label = APPLIANCE_CATEGORIES.find(c => c.value === a.category)?.label ?? a.category
            const pct = Math.round((w / totalW) * 100)
            return (
              <div key={a.id} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-28 truncate">{a.brand || label}</span>
                <div className="flex-1 h-2 bg-yellow-100 rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs font-medium text-gray-600 w-12 text-right">{w}W</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Solar recommendation */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <Sun className="w-5 h-5 text-brand-500" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-gray-900">Recommended: {size} Solar System</p>
            <p className="text-sm text-gray-500 mt-1">
              {addressType === 'office'
                ? `For your office load of ${totalKW}kW, a ${size} system covers daytime operations and reduces electricity costs.`
                : `For your home load of ${totalKW}kW, a ${size} system covers most of your daily usage.`}
            </p>
            <p className="text-sm font-semibold text-brand-600 mt-2">{price}</p>
            <div className="flex gap-2 mt-3">
              <Link to={href} className="flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold px-4 py-2 rounded-xl">
                <ChevronRight className="w-4 h-4" /> View {pkg}
              </Link>
              <a href={waSales(`Hi! I'd like a solar consultation. My home load is about ${totalKW}kW.`)} target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 border border-gray-200 text-gray-700 text-sm font-semibold px-4 py-2 rounded-xl hover:bg-gray-50">
                <MessageCircle className="w-4 h-4" /> Get Advice
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* UPS / backup alert */}
      {!hasBackup && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 flex items-start gap-3">
          <Battery className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-blue-900">No Backup Power Detected</p>
            <p className="text-sm text-blue-700 mt-1">You have no UPS or inverter registered. During load-shedding your {appliances.length} appliance{appliances.length > 1 ? 's are' : ' is'} unprotected.</p>
            <Link to="/solar" className="inline-flex items-center gap-1 mt-2 text-sm font-bold text-blue-700 hover:underline">
              View UPS & Inverter options <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Old AC upgrade advice */}
      {oldACs.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-5 flex items-start gap-3">
          <TrendingDown className="w-6 h-6 text-green-700 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-green-900">Energy Upgrade Opportunity</p>
            <p className="text-sm text-green-700 mt-1">
              {oldACs.map(a => `${a.brand}${a.model ? ' ' + a.model : ''} (${a.purchase_year})`).join(', ')} — {oldACs.length > 1 ? 'these are' : 'this is'} over {OLD_AC_THRESHOLD} years old. Older ACs use 30-50% more electricity than modern inverter models.
            </p>
            <Link to="/products?category=air-conditioners" className="inline-flex items-center gap-1 mt-2 text-sm font-bold text-green-700 hover:underline">
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
              {highLoad.map(a => a.brand + (a.model ? ' ' + a.model : '')).join(', ')} draw significant power. Make sure your wiring and circuit breakers are rated for the load. Our technicians can do a free assessment.
            </p>
            <a href={waSales('Hi! I\'d like a home electrical assessment.')} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1 mt-2 text-sm font-bold text-brand-600 hover:underline">
              Request assessment <ChevronRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
