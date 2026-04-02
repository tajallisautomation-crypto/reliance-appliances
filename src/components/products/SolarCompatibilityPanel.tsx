import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Sun, Zap, Battery, TrendingDown, ChevronRight, ArrowRight, Leaf } from 'lucide-react'
import { getProducts, formatPrice } from '@/lib/api'
import { calcPlan } from '@/lib/plans'
import type { Product } from '@/lib/types'

// ── Constants (aligned with SolarCalculator.tsx pre-fed values) ────────────────
const PANEL_WATTS   = 620        // W per panel
const PANEL_PRICE   = 30_000     // PKR per panel (rate hidden)
const PEAK_HRS      = 5          // avg daily peak sun hours (Karachi)
const UNIT_RATE     = 70         // PKR / kWh — grid rate
const WIRING_PER_W  = 12         // Rs/W — wiring & equipment (from SolarCalculator)
const LABOR_PER_W   = 7          // Rs/W — installation labor (PKR 7,000/kW)

// ── Wattage estimation ─────────────────────────────────────────────────────────

interface ApplianceLoad {
  watts: number
  dailyHours: number
  label: string
  isInverter: boolean
  tonOrSize: string    // for finding efficient alternative
}

function estimateLoad(product: Product): ApplianceLoad | null {
  const cat  = (product.category || '').toLowerCase()
  const name = (product.simplified_name || product.model || '').toLowerCase()
  const specs = product.specs || {}

  // Skip solar, gas, gas appliances, hoods/hobs, accessories, stabilizers
  if (
    cat.includes('solar') || cat.includes('gas') || cat.includes('geyser') ||
    cat.includes('hood') || cat.includes('hob') || cat.includes('accessories') ||
    cat.includes('stabilizer') || cat.includes('water heater')
  ) return null

  const isInverter = name.includes('inverter')

  // Helper: read numeric wattage from any spec key matching a pattern
  function specWatts(...patterns: RegExp[]): number | null {
    for (const pat of patterns) {
      const entry = Object.entries(specs).find(([k]) => pat.test(k))
      if (entry) {
        const v = parseFloat(String(entry[1]).replace(/[^\d.]/g, ''))
        if (v > 0) return v
      }
    }
    return null
  }

  // ── Air Conditioners ──────────────────────────────────────────────
  if (cat.includes('air condition') || cat.includes('ton air')) {
    const tonM = name.match(/(\d+(?:\.\d+)?)\s*ton/)
    const ton  = tonM ? parseFloat(tonM[1]) : 1.5
    // Read actual wattage from spec if available, else use tonnage table
    const fromSpec = specWatts(/running\s*wattage/i, /power\s*consumption/i, /input\s*power/i)
    const wattsByTon: Record<string, [number, number]> = {
      '1':   [700,  1200], '1.0': [700,  1200],
      '1.2': [800,  1300],
      '1.5': [1050, 1650],
      '2':   [1800, 2400], '2.0': [1800, 2400],
      '2.5': [2200, 3000],
      '3':   [2800, 3600], '3.0': [2800, 3600],
      '3.5': [3200, 4200],
      '4':   [4200, 5200], '4.0': [4200, 5200],
    }
    const [wInv, wStd] = wattsByTon[String(ton)] ?? [1050, 1650]
    const watts = fromSpec ?? (isInverter ? wInv : wStd)
    return {
      watts,
      dailyHours: 8,
      label: `${ton} Ton${isInverter ? ' Inverter' : ''} AC`,
      isInverter,
      tonOrSize: String(ton),
    }
  }

  // ── Refrigerators ─────────────────────────────────────────────────
  if (cat.includes('refrigerat') || cat.includes('fridge') || cat.includes('minibar')) {
    const fromSpec = specWatts(/running\s*wattage/i, /power\s*consumption/i, /rated\s*power/i)
    const cuFtV = Object.values(specs).find(v => /cu\.?\s*ft/i.test(String(v)))
    const cuFt  = cuFtV ? parseFloat(String(cuFtV)) : 14
    const fallback = isInverter ? 65 : cuFt > 22 ? 220 : cuFt > 16 ? 175 : cuFt > 10 ? 140 : 95
    const watts = fromSpec ?? fallback
    return {
      watts, dailyHours: 24,
      label: `${cuFt ? cuFt + ' Cu.Ft ' : ''}${isInverter ? 'Inverter ' : ''}Refrigerator`.trim(),
      isInverter, tonOrSize: String(cuFt),
    }
  }

  // ── Freezers ──────────────────────────────────────────────────────
  if (cat.includes('freezer')) {
    const fromSpec = specWatts(/running\s*wattage/i, /power\s*consumption/i)
    const vert  = name.includes('vertical') || cat.includes('vertical')
    const fallback = isInverter ? 70 : vert ? 125 : 155
    const watts = fromSpec ?? fallback
    return {
      watts, dailyHours: 24,
      label: `${isInverter ? 'Inverter ' : ''}${vert ? 'Vertical' : 'Chest'} Freezer`,
      isInverter, tonOrSize: vert ? 'vertical' : 'chest',
    }
  }

  // ── Washing Machines ──────────────────────────────────────────────
  if (cat.includes('washing') || cat.includes('washer')) {
    const fl   = cat.includes('front') || name.includes('front')
    const semi = cat.includes('semi') || name.includes('semi')
    const fromSpec = specWatts(/rated\s*power/i, /power\s*consumption/i, /wattage/i)
    const fallback = fl ? 2000 : semi ? 400 : 500
    const watts = fromSpec ?? fallback
    return {
      watts, dailyHours: 1.5,
      label: `${fl ? 'Front-Load' : semi ? 'Semi-Auto' : 'Top-Load'} Washing Machine`,
      isInverter, tonOrSize: fl ? 'front' : semi ? 'semi' : 'top',
    }
  }

  // ── Televisions ───────────────────────────────────────────────────
  if (cat.includes('television') || cat.includes(' led') || cat.includes('qled') || cat.includes('smart tv')) {
    const inchM = name.match(/(\d{2,3})["""'']/) || name.match(/(\d{2,3})\s*(?:inch|")/i)
    const inch  = inchM ? parseInt(inchM[1]) : 43
    const fromSpec = specWatts(/power\s*consumption/i, /rated\s*power/i, /wattage/i)
    // Table: typical modern LED/QLED power by size
    const fallback = inch >= 85 ? 190 : inch >= 75 ? 155 : inch >= 65 ? 120 : inch >= 55 ? 90 : inch >= 43 ? 65 : 40
    const watts = fromSpec ?? fallback
    return {
      watts, dailyHours: 6,
      label: `${inch}" Smart TV`,
      isInverter: false, tonOrSize: String(inch),
    }
  }

  // ── Microwave Ovens ───────────────────────────────────────────────
  if (cat.includes('microwave')) {
    const watts = specWatts(/^power$/i, /wattage/i, /output\s*power/i) ?? 1200
    return { watts, dailyHours: 0.5, label: 'Microwave Oven', isInverter: false, tonOrSize: '' }
  }

  // ── Fans ──────────────────────────────────────────────────────────
  if (cat.includes('fan') && !cat.includes('kitchen')) {
    const fromSpec = specWatts(/wattage/i, /power/i)
    const fallback = isInverter ? 28 : 75
    return {
      watts: fromSpec ?? fallback, dailyHours: 12,
      label: `${isInverter ? 'Inverter ' : ''}Ceiling Fan`,
      isInverter, tonOrSize: '',
    }
  }

  // ── Water Dispensers ──────────────────────────────────────────────
  if (cat.includes('water dispenser')) {
    const watts = specWatts(/wattage/i, /power/i) ?? 100
    return { watts, dailyHours: 24, label: 'Water Dispenser', isInverter: false, tonOrSize: '' }
  }

  return null
}

// ── Solar sizing ───────────────────────────────────────────────────────────────

interface SolarSizing {
  panelCount: number       // number of 620W panels
  actualKW: number         // actual system kW (panelCount × 620W)
  invKW: number            // recommended inverter tier
  dailyKWh: number         // appliance daily consumption
  monthlyUnits: number     // appliance monthly consumption (units offset)
  monthlySavings: number   // PKR/month at UNIT_RATE
  panelCost: number        // panelCount × 30,000
  installCost: number      // wiring + labor (17 Rs/W)
  totalMin: number         // panels + install (inverter added separately from DB)
}

function r100(n: number) { return Math.round(n / 100) * 100 }

function calcSizing(load: ApplianceLoad): SolarSizing {
  // Size the system to cover the appliance's actual daily consumption + 25% losses
  const dailyKWh  = (load.watts * load.dailyHours) / 1000
  const neededKW  = (dailyKWh * 1.25) / PEAK_HRS
  // Round up to nearest 0.5 kW, minimum 1 kW
  const sizedKW   = Math.max(1, Math.ceil(neededKW * 2) / 2)

  const panelCount  = Math.ceil(sizedKW * 1000 / PANEL_WATTS)
  const actualKW    = (panelCount * PANEL_WATTS) / 1000

  // Inverter tier: must be >= actualKW
  const invKW = actualKW <= 3 ? 3 : actualKW <= 5 ? 5 : actualKW <= 8 ? 8 : actualKW <= 12 ? 12 : 15

  // Monthly units = appliance consumption (not system generation)
  const monthlyUnits   = Math.round(dailyKWh * 30)
  const monthlySavings = r100(monthlyUnits * UNIT_RATE)

  const panelCost   = panelCount * PANEL_PRICE
  const installCost = r100(actualKW * 1000 * (WIRING_PER_W + LABOR_PER_W))
  const totalMin    = panelCost + installCost   // inverter from DB added on top

  return { panelCount, actualKW, invKW, dailyKWh, monthlyUnits, monthlySavings, panelCost, installCost, totalMin }
}

// ── Efficient alternative search ───────────────────────────────────────────────

function shouldSuggestAlternative(product: Product, load: ApplianceLoad): string | null {
  const cat  = (product.category || '').toLowerCase()
  const name = (product.simplified_name || product.model || '').toLowerCase()

  // Suggest inverter AC if current is non-inverter
  if ((cat.includes('air condition') || cat.includes('ton air')) && !load.isInverter) {
    const ton = load.tonOrSize
    return `${ton} ton inverter air conditioner`
  }
  // Suggest inverter fridge if current is non-inverter
  if ((cat.includes('refrigerat') || cat.includes('fridge')) && !load.isInverter) {
    return 'inverter refrigerator'
  }
  // Suggest inverter fan
  if (cat.includes('fan') && !load.isInverter) {
    return 'inverter ceiling fan'
  }
  return null
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function SolarCompatibilityPanel({ product }: { product: Product }) {
  const [solarInverters, setSolarInverters] = useState<Product[]>([])
  const [batteries,      setBatteries]      = useState<Product[]>([])
  const [efficientAlt,   setEfficientAlt]   = useState<Product | null>(null)
  const [showBattery,    setShowBattery]    = useState(false)

  const load = estimateLoad(product)
  if (!load) return null

  const sizing = calcSizing(load)

  // ── Fetch inverters from DB ───────────────────────────────────────
  useEffect(() => {
    getProducts({ category: 'solar-inverter', sort: 'price_asc' })
      .then(({ products }) => {
        const kw = sizing.invKW
        const matched = products
          .filter(p => {
            const m = (p.simplified_name + ' ' + p.model).match(/(\d+(?:\.\d+)?)\s*kw/i)
            return m && parseFloat(m[1]) >= kw
          })
          .sort((a, b) => {
            const ka = parseFloat((a.simplified_name + ' ' + a.model).match(/(\d+(?:\.\d+)?)\s*kw/i)?.[1] ?? '99')
            const kb = parseFloat((b.simplified_name + ' ' + b.model).match(/(\d+(?:\.\d+)?)\s*kw/i)?.[1] ?? '99')
            return ka !== kb ? ka - kb : a.price.cash_floor - b.price.cash_floor
          })
          .slice(0, 3)
        setSolarInverters(matched)
      })
      .catch(() => {})
  }, [sizing.invKW])

  // ── Fetch batteries from DB ───────────────────────────────────────
  useEffect(() => {
    getProducts({ category: 'solar-battery', sort: 'price_asc' })
      .then(({ products }) => setBatteries(products.slice(0, 2)))
      .catch(() => {})
  }, [])

  // ── Fetch efficient alternative ───────────────────────────────────
  useEffect(() => {
    const searchTerm = shouldSuggestAlternative(product, load)
    if (!searchTerm) return
    getProducts({ search: searchTerm, sort: 'price_asc' })
      .then(({ products }) => {
        const alt = products.find(p =>
          p.id !== product.id &&
          (p.simplified_name || p.model || '').toLowerCase().includes('inverter')
        )
        setEfficientAlt(alt ?? null)
      })
      .catch(() => {})
  }, [product.id])

  // ── Cheapest matching inverter (for cost estimate) ─────────────────
  const cheapestInv     = solarInverters[0]
  const invCost         = cheapestInv?.price.cash_floor ?? 0
  const totalWithInv    = invCost ? sizing.totalMin + invCost : null

  // ── Payback ────────────────────────────────────────────────────────
  const paybackYrs = totalWithInv && sizing.monthlySavings > 0
    ? (totalWithInv / (sizing.monthlySavings * 12)).toFixed(1)
    : null

  // ── Installment check ──────────────────────────────────────────────
  const installBase  = totalWithInv ?? sizing.totalMin
  const canInstall   = installBase <= 700_000 && sizing.actualKW <= 5
  const installPlan  = canInstall
    ? calcPlan(installBase, installBase > 500_000 ? '2m' : installBase > 150_000 ? '6m' : '12m')
    : null

  // ── Efficient alternative wattage savings ──────────────────────────
  const altLoad = efficientAlt ? estimateLoad(efficientAlt) : null
  const altSavedUnits = altLoad
    ? Math.max(0, Math.round((load.watts - altLoad.watts) * load.dailyHours * 30 / 1000))
    : 0
  const altSavedPKR = r100(altSavedUnits * UNIT_RATE)

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

        {/* More efficient alternative banner */}
        {efficientAlt && altSavedPKR > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
            <div className="flex items-start gap-2.5 flex-1">
              <Leaf className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-bold text-emerald-800">More energy-efficient option available</p>
                <p className="text-xs text-emerald-700 mt-0.5 leading-snug">
                  <span className="font-semibold">{efficientAlt.simplified_name}</span> uses ~{altLoad?.watts}W
                  vs {load.watts}W — saves an extra{' '}
                  <span className="font-semibold">PKR {altSavedPKR.toLocaleString()}/mo</span> and needs a smaller solar system.
                </p>
              </div>
            </div>
            <Link
              to={`/products/${efficientAlt.id}`}
              className="shrink-0 text-xs font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 whitespace-nowrap"
            >
              View product <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        )}

        {/* Stat cards */}
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
            <p className="text-xl font-black text-gray-900">{sizing.actualKW.toFixed(1)} kW</p>
            <p className="text-xs text-gray-400 mt-0.5">{sizing.panelCount} × {PANEL_WATTS}W panels</p>
          </div>

          <div className="bg-white rounded-xl p-3.5 border border-amber-100">
            <div className="flex items-center gap-1.5 text-emerald-600 mb-1">
              <TrendingDown className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Monthly Saving</span>
            </div>
            <p className="text-xl font-black text-gray-900">
              PKR {sizing.monthlySavings.toLocaleString()}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">offsets {sizing.monthlyUnits} units/mo</p>
          </div>

          <div className="bg-white rounded-xl p-3.5 border border-amber-100">
            <div className="flex items-center gap-1.5 text-blue-600 mb-1">
              <Battery className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Inverter</span>
            </div>
            <p className="text-xl font-black text-gray-900">{sizing.invKW} kW</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {paybackYrs ? `~${paybackYrs} yr payback` : 'recommended size'}
            </p>
          </div>
        </div>

        {/* Package total */}
        <div className="bg-white rounded-xl border border-amber-100 overflow-hidden">
          <div className="flex justify-between items-center px-4 py-4 bg-amber-50">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-0.5">Complete Solar Package</p>
              <p className="text-[11px] text-gray-400">
                {sizing.panelCount} × {PANEL_WATTS}W panels · {sizing.invKW}kW inverter · wiring &amp; installation
              </p>
            </div>
            <div className="text-right">
              {totalWithInv ? (
                <>
                  <p className="text-2xl font-black text-gray-900">PKR {totalWithInv.toLocaleString()}</p>
                  {installPlan && (
                    <p className="text-[11px] text-brand-600 font-medium mt-0.5">
                      or PKR {installPlan.monthly.toLocaleString()}/mo · {installPlan.months} months
                    </p>
                  )}
                </>
              ) : (
                <p className="text-2xl font-black text-gray-900">PKR {sizing.totalMin.toLocaleString()}+</p>
              )}
            </div>
          </div>
        </div>

        {/* Battery add-on section */}
        {batteries.length > 0 && (
          <div>
            <button
              onClick={() => setShowBattery(s => !s)}
              className="w-full flex items-center justify-between px-4 py-3 bg-white border border-amber-100 rounded-xl text-sm font-semibold text-gray-700 hover:bg-amber-50 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Battery className="w-4 h-4 text-blue-500" />
                Add battery backup (optional)
              </span>
              <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${showBattery ? 'rotate-90' : ''}`} />
            </button>

            {showBattery && (
              <div className="mt-2 grid sm:grid-cols-2 gap-3">
                {batteries.map(bat => {
                  const kwhM = (bat.simplified_name + ' ' + (bat.specs?.Capacity ?? '')).match(/(\d+(?:\.\d+)?)\s*k[wW]h/i)
                  const kwh  = kwhM ? parseFloat(kwhM[1]) : null
                  return (
                    <Link
                      key={bat.id}
                      to={`/products/${bat.id}`}
                      className="group flex gap-3 bg-white hover:bg-blue-50 border border-blue-100 hover:border-blue-300 rounded-xl p-3.5 transition-all"
                    >
                      {bat.thumbnail && (
                        <img src={bat.thumbnail} alt={bat.simplified_name} className="w-12 h-12 object-contain shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-gray-400">{bat.brand}</p>
                        <p className="text-xs font-semibold text-gray-800 group-hover:text-brand-600 leading-tight line-clamp-2">
                          {bat.simplified_name}
                        </p>
                        {kwh && (
                          <p className="text-[11px] text-blue-600 mt-0.5">{kwh} kWh capacity</p>
                        )}
                        <p className="text-sm font-black text-gray-900 mt-1">
                          {formatPrice(bat.price.cash_floor)}
                        </p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Matching inverters from catalogue */}
        {solarInverters.length > 0 && (
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2.5">
              Matching Inverters from Our Catalogue
            </p>
            <div className="grid sm:grid-cols-3 gap-3">
              {solarInverters.map(inv => {
                const invP = inv.price.cash_floor
                const canI = invP <= 700_000 && sizing.actualKW <= 5
                const plan = canI ? calcPlan(invP, invP > 500_000 ? '2m' : invP > 150_000 ? '6m' : '12m') : null
                return (
                  <Link
                    key={inv.id}
                    to={`/products/${inv.id}`}
                    className="group flex flex-col gap-1.5 bg-white hover:bg-amber-50 border border-amber-100 hover:border-amber-300 rounded-xl p-3.5 transition-all"
                  >
                    {inv.thumbnail && (
                      <img src={inv.thumbnail} alt={inv.simplified_name}
                        className="w-12 h-12 object-contain mx-auto mb-1" />
                    )}
                    <p className="text-[11px] font-bold text-gray-400">{inv.brand}</p>
                    <p className="text-xs font-semibold text-gray-800 leading-tight group-hover:text-brand-600 line-clamp-2">
                      {inv.simplified_name}
                    </p>
                    <p className="text-sm font-black text-gray-900 mt-auto">
                      {formatPrice(invP)}
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

        {/* Shop solar CTA */}
        <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl px-4 py-3 text-white">
          <p className="text-sm font-semibold">
            Need a full household quote?
          </p>
          <Link
            to="/solar-calculator"
            className="shrink-0 inline-flex items-center gap-1.5 bg-white text-orange-600 text-xs font-bold px-4 py-2 rounded-lg hover:bg-orange-50 transition-colors"
          >
            Solar Calculator <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Disclaimer */}
        <p className="text-[10px] text-gray-400 leading-relaxed">
          Estimates based on {PEAK_HRS}h peak sun (Karachi), {load.dailyHours}h/day typical usage, PKR {UNIT_RATE}/kWh grid rate, and PKR {(WIRING_PER_W + LABOR_PER_W)}/W for wiring, equipment &amp; installation (PKR {WIRING_PER_W}/W equipment + PKR {LABOR_PER_W}/W labor).
          Monthly units show this appliance's consumption, not total system generation.
          Actual sizing may vary. Use our{' '}
          <Link to="/solar-calculator" className="underline hover:text-brand-500">Solar Calculator</Link>{' '}
          for a full household assessment, or{' '}
          <Link to="/products?group=solar" className="underline hover:text-brand-500">browse all solar products</Link>.
        </p>
      </div>
    </div>
  )
}
