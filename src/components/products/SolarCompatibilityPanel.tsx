import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Sun, Zap, Battery, TrendingDown, ChevronRight, ArrowRight } from 'lucide-react'
import { getProducts, formatPrice } from '@/lib/api'
import { calcPlan } from '@/lib/plans'
import type { Product } from '@/lib/types'

// ── Wattage estimation ─────────────────────────────────────────────────────────

interface ApplianceLoad {
  watts: number        // running wattage
  dailyHours: number   // typical daily usage hours
  label: string        // display label e.g. "1.5 Ton Inverter AC"
}

function estimateLoad(product: Product): ApplianceLoad | null {
  const cat  = (product.category || '').toLowerCase()
  const name = (product.simplified_name || product.model || '').toLowerCase()
  const specs = product.specs || {}

  // Skip solar/accessories/gas products — they don't draw household electricity
  if (cat.includes('solar') || cat.includes('gas') || cat.includes('geyser') ||
      cat.includes('hood') || cat.includes('hob') || cat.includes('accessories') ||
      cat.includes('stabilizer') || cat.includes('dispenser') === false && cat.includes('water heater'))
    return null

  // ── Air Conditioners ──────────────────────────────────────────────
  if (cat.includes('air condition') || cat.includes('ton air')) {
    const tonM = name.match(/(\d+(?:\.\d+)?)\s*ton/)
    const ton  = tonM ? parseFloat(tonM[1]) : 1.5
    const inv  = name.includes('inverter')
    const wattsByTon: Record<string, [number, number]> = {
      // [inverter, non-inverter]
      '1':   [700,  1200], '1.0': [700,  1200],
      '1.2': [800,  1300],
      '1.5': [1000, 1600],
      '2':   [1800, 2400], '2.0': [1800, 2400],
      '2.5': [2200, 3000],
      '3':   [2800, 3600], '3.0': [2800, 3600],
      '3.5': [3200, 4200],
      '4':   [4200, 5200], '4.0': [4200, 5200],
    }
    const [wInv, wStd] = wattsByTon[String(ton)] ?? [1000, 1600]
    return { watts: inv ? wInv : wStd, dailyHours: 8, label: `${ton} Ton${inv ? ' Inverter' : ''} AC` }
  }

  // ── Refrigerators ─────────────────────────────────────────────────
  if (cat.includes('refrigerat') || cat.includes('fridge') || cat.includes('minibar')) {
    const inv   = name.includes('inverter')
    const cuFtV = Object.values(specs).find(v => /cu\.?\s*ft/i.test(String(v)))
    const cuFt  = cuFtV ? parseFloat(String(cuFtV)) : 14
    const watts = inv ? 70 : cuFt > 18 ? 200 : cuFt > 10 ? 150 : 100
    const size  = cuFt ? `${cuFt} Cu.Ft` : ''
    return { watts, dailyHours: 24, label: `${size} ${inv ? 'Inverter ' : ''}Refrigerator`.trim() }
  }

  // ── Freezers ──────────────────────────────────────────────────────
  if (cat.includes('freezer')) {
    const inv    = name.includes('inverter')
    const vert   = name.includes('vertical') || cat.includes('vertical')
    const watts  = inv ? 75 : vert ? 125 : 150
    return { watts, dailyHours: 24, label: `${inv ? 'Inverter ' : ''}${vert ? 'Vertical' : 'Chest'} Freezer` }
  }

  // ── Washing Machines ──────────────────────────────────────────────
  if (cat.includes('washing') || cat.includes('washer')) {
    const fl     = cat.includes('front') || name.includes('front')
    const semi   = cat.includes('semi') || name.includes('semi')
    const watts  = fl ? 2000 : semi ? 400 : 500
    const type   = fl ? 'Front-Load' : semi ? 'Semi-Auto' : 'Top-Load'
    return { watts, dailyHours: 1.5, label: `${type} Washing Machine` }
  }

  // ── Televisions ───────────────────────────────────────────────────
  if (cat.includes('television') || cat.includes(' led') || cat.includes('qled') || cat.includes('smart tv')) {
    const inchM = name.match(/(\d{2,3})["""'']/) || name.match(/(\d{2,3})\s*(?:inch|")/i)
    const inch  = inchM ? parseInt(inchM[1]) : 43
    const watts = inch >= 75 ? 150 : inch >= 65 ? 120 : inch >= 50 ? 80 : 40
    return { watts, dailyHours: 6, label: `${inch}" Smart TV` }
  }

  // ── Microwave Ovens ───────────────────────────────────────────────
  if (cat.includes('microwave')) {
    const pwrSpec = Object.entries(specs).find(([k]) => /power|watt/i.test(k))
    const watts   = pwrSpec ? (parseFloat(String(pwrSpec[1])) || 1200) : 1200
    return { watts, dailyHours: 0.5, label: 'Microwave Oven' }
  }

  // ── Fans ──────────────────────────────────────────────────────────
  if (cat.includes('fan') && !cat.includes('kitchen')) {
    const inv   = name.includes('inverter')
    return { watts: inv ? 30 : 75, dailyHours: 12, label: `${inv ? 'Inverter ' : ''}Ceiling Fan` }
  }

  // ── Water Dispensers ──────────────────────────────────────────────
  if (cat.includes('water dispenser')) {
    return { watts: 100, dailyHours: 24, label: 'Water Dispenser' }
  }

  return null
}

// ── Solar sizing ───────────────────────────────────────────────────────────────

interface SolarSizing {
  panelKW: number      // system size in kW
  panelCount: number   // number of 575W panels
  invKW: number        // recommended inverter size
  dailyKWh: number     // daily energy generated
  monthlyUnits: number // units covered per month
  monthlySavings: number // PKR saved per month at PKR 70/kWh
  minCost: number      // estimated minimum system cost
  maxCost: number      // estimated maximum system cost
}

const PANEL_WATTS   = 575
const PEAK_HRS      = 5      // Karachi avg peak sun hours
const UNIT_RATE     = 70     // PKR / kWh
const COST_PER_W_LO = 62     // Rs/W all-in (panels + inverter + wiring + labor)
const COST_PER_W_HI = 90     // Rs/W upper bound (with battery + frame)

function calcSizing(load: ApplianceLoad): SolarSizing {
  const dailyKWh = (load.watts * load.dailyHours) / 1000
  const rawKW    = (dailyKWh * 1.25) / PEAK_HRS
  const panelKW  = Math.max(1, Math.ceil(rawKW * 2) / 2)   // round up to nearest 0.5kW
  const panelCount = Math.ceil(panelKW * 1000 / PANEL_WATTS)

  // Standard inverter tiers
  const invKW = panelKW <= 3 ? 3 : panelKW <= 5 ? 5 : panelKW <= 8 ? 8 : panelKW <= 12 ? 12 : 15

  const effectiveW       = panelKW * 1000
  const monthlyUnits     = Math.round(dailyKWh * 30)
  const monthlySavings   = Math.round(monthlyUnits * UNIT_RATE / 100) * 100

  return {
    panelKW, panelCount, invKW, dailyKWh,
    monthlyUnits, monthlySavings,
    minCost: Math.round(effectiveW * COST_PER_W_LO / 1000) * 1000,
    maxCost: Math.round(effectiveW * COST_PER_W_HI / 1000) * 1000,
  }
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function SolarCompatibilityPanel({ product }: { product: Product }) {
  const [solarInverters, setSolarInverters] = useState<Product[]>([])

  const load   = estimateLoad(product)
  if (!load) return null

  const sizing = calcSizing(load)

  // Fetch up to 3 real inverter products closest to the recommended kW
  useEffect(() => {
    getProducts({ category: 'solar-inverter', sort: 'price_asc' })
      .then(({ products }) => {
        const kw = sizing.invKW
        // Filter inverters ≥ needed kW, sorted by proximity to target
        const matched = products
          .filter(p => {
            const m = (p.simplified_name + ' ' + p.model).match(/(\d+(?:\.\d)?)\s*kw/i)
            return m && parseFloat(m[1]) >= kw
          })
          .sort((a, b) => {
            const kwa = parseFloat((a.simplified_name + ' ' + a.model).match(/(\d+(?:\.\d)?)\s*kw/i)?.[1] ?? '99')
            const kwb = parseFloat((b.simplified_name + ' ' + b.model).match(/(\d+(?:\.\d)?)\s*kw/i)?.[1] ?? '99')
            return kwa - kwb
          })
          .slice(0, 3)
        setSolarInverters(matched)
      })
      .catch(() => {})
  }, [sizing.invKW])

  // Installment option for the solar system (use midpoint cost)
  const midCost    = Math.round((sizing.minCost + sizing.maxCost) / 2)
  const canInstall = midCost <= 700_000   // site installment cap
  const installPlan = canInstall ? calcPlan(midCost, midCost > 500_000 ? '2m' : midCost > 150_000 ? '6m' : '12m') : null

  // Payback estimate in years
  const paybackYrs = sizing.monthlySavings > 0
    ? (sizing.minCost / (sizing.monthlySavings * 12)).toFixed(1)
    : null

  return (
    <div className="mt-10 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 overflow-hidden">

      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white">
        <Sun className="w-5 h-5 shrink-0" />
        <div>
          <p className="font-bold text-sm leading-tight">Solar Compatibility</p>
          <p className="text-amber-100 text-xs mt-0.5">
            Run this {load.label} on clean solar power
          </p>
        </div>
        <Link
          to="/solar-calculator"
          className="ml-auto text-xs font-semibold bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-full flex items-center gap-1 transition-colors whitespace-nowrap"
        >
          Full calculator <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="p-5 space-y-5">

        {/* Load + sizing summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl p-3.5 border border-amber-100">
            <div className="flex items-center gap-1.5 text-amber-600 mb-1">
              <Zap className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Running Load</span>
            </div>
            <p className="text-xl font-black text-gray-900">
              {load.watts >= 1000 ? `${(load.watts / 1000).toFixed(1)} kW` : `${load.watts} W`}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{load.dailyHours}h/day typical</p>
          </div>

          <div className="bg-white rounded-xl p-3.5 border border-amber-100">
            <div className="flex items-center gap-1.5 text-orange-600 mb-1">
              <Sun className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">System Size</span>
            </div>
            <p className="text-xl font-black text-gray-900">{sizing.panelKW} kW</p>
            <p className="text-xs text-gray-400 mt-0.5">{sizing.panelCount} × {PANEL_WATTS}W panels</p>
          </div>

          <div className="bg-white rounded-xl p-3.5 border border-amber-100">
            <div className="flex items-center gap-1.5 text-emerald-600 mb-1">
              <TrendingDown className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Monthly Saving</span>
            </div>
            <p className="text-xl font-black text-gray-900">
              PKR {(sizing.monthlySavings).toLocaleString()}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{sizing.monthlyUnits} units/mo</p>
          </div>

          <div className="bg-white rounded-xl p-3.5 border border-amber-100">
            <div className="flex items-center gap-1.5 text-blue-600 mb-1">
              <Battery className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Inverter</span>
            </div>
            <p className="text-xl font-black text-gray-900">{sizing.invKW} kW</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {paybackYrs ? `~${paybackYrs} yr payback` : 'recommended'}
            </p>
          </div>
        </div>

        {/* Cost estimate banner */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white rounded-xl border border-amber-100 px-4 py-3">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Estimated system cost (installed)</p>
            <p className="font-bold text-gray-900 text-sm">
              PKR {(sizing.minCost).toLocaleString()} – {(sizing.maxCost).toLocaleString()}
            </p>
            {installPlan && (
              <p className="text-xs text-brand-600 mt-0.5 font-medium">
                or ~PKR {installPlan.monthly.toLocaleString()}/mo · {installPlan.months} months
              </p>
            )}
          </div>
          <Link
            to="/products?group=solar"
            className="shrink-0 inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors"
          >
            Shop Solar <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Matching inverters from catalogue */}
        {solarInverters.length > 0 && (
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2.5">
              Recommended Inverters from Our Catalogue
            </p>
            <div className="grid sm:grid-cols-3 gap-3">
              {solarInverters.map(inv => {
                const invPrice = inv.price.cash_floor
                const canInst  = invPrice <= 700_000
                const plan     = canInst ? calcPlan(invPrice, invPrice > 500_000 ? '2m' : invPrice > 150_000 ? '6m' : '12m') : null
                return (
                  <Link
                    key={inv.id}
                    to={`/products/${inv.id}`}
                    className="group flex flex-col gap-1.5 bg-white hover:bg-amber-50 border border-amber-100 hover:border-amber-300 rounded-xl p-3.5 transition-all"
                  >
                    {inv.thumbnail && (
                      <img
                        src={inv.thumbnail}
                        alt={inv.simplified_name}
                        className="w-12 h-12 object-contain mx-auto mb-1"
                      />
                    )}
                    <p className="text-[11px] font-bold text-gray-500">{inv.brand}</p>
                    <p className="text-xs font-semibold text-gray-800 leading-tight group-hover:text-brand-600 line-clamp-2">
                      {inv.simplified_name}
                    </p>
                    <p className="text-sm font-black text-gray-900 mt-auto">
                      {formatPrice(invPrice)}
                    </p>
                    {plan && (
                      <p className="text-[10px] text-brand-500 font-medium">
                        or {formatPrice(plan.monthly)}/mo · {plan.months}m
                      </p>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <p className="text-[10px] text-gray-400 leading-relaxed">
          Estimates based on {PEAK_HRS}h peak sun (Karachi), {load.dailyHours}h daily usage, and PKR {UNIT_RATE}/kWh grid rate.
          Actual sizing may vary. Use our{' '}
          <Link to="/solar-calculator" className="underline hover:text-brand-500">Solar Calculator</Link>{' '}
          for a full household assessment.
        </p>
      </div>
    </div>
  )
}
