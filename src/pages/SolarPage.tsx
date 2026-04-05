import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Sun, ArrowRight, Calculator, CheckCircle2, MessageCircle, Shield, CalendarCheck } from 'lucide-react'
import { getProducts, getProduct, type Product, formatPrice } from '../lib/api'
import ProductCard from '../components/products/ProductCard'
import { wa } from '../lib/whatsapp'
import { WA_SALES } from '../lib/config'
import BookingModal, { type BookingContext } from '../components/BookingModal'

const SOLAR_BENEFITS = [
  { icon:'☀️', title:'25 Year Performance Warranty', desc:'Panels guaranteed at 80% output for 25 years.' },
  { icon:'💰', title:'80% Bill Reduction', desc:'Average customer saves PKR 8,000–25,000/month.' },
  { icon:'🔋', title:'Backup Power', desc:'Hybrid systems keep your home running during outages.' },
  { icon:'🌿', title:'Net Metering', desc:'Sell excess power back to the grid and earn credits (KE requires 10kW+ for Net Metering).' },
]

// ── Component option types ────────────────────────────────────────────────────

interface ComponentOption {
  label:  string;
  brand:  'Crown' | 'Ziewnic';
  /** DB slug for Crown — used to look up fetched price */
  slug?:  string;
  /** Hardcoded retail price for Ziewnic (Crown price comes from DB) */
  price?: number;
}

// ── Crown component definitions (prices fetched from DB at runtime) ──────────

const CROWN_INV_36:  ComponentOption = { label: 'Crown Yorker 3.6kW Inverter',    brand: 'Crown', slug: 'crown-yorker-3-6kw'               }
const CROWN_INV_5:   ComponentOption = { label: 'Crown Yorker 5kW Inverter',       brand: 'Crown', slug: 'crown-yorker-5kw'                 }
const CROWN_INV_8:   ComponentOption = { label: 'Crown 8kW Hybrid Inverter',       brand: 'Crown', slug: 'crown-nexus-8kw'                  }
const CROWN_BAT_24:  ComponentOption = { label: 'Crown 2.4kWh LiFePO4 Battery',   brand: 'Crown', slug: 'crown-elektra-boost-pro-2-4kw'    }
const CROWN_BAT_512: ComponentOption = { label: 'Crown 5.12kWh LiFePO4 Battery',  brand: 'Crown', slug: 'crown-elektra-boost-pro-5-12kw'   }

// ── Ziewnic component definitions (Ziewnic Jan 2026 catalog + 15% Reliance margin, rounded) ─

function zn(label: string, catalogPrice: number): ComponentOption {
  return { label, brand: 'Ziewnic', price: Math.round(catalogPrice * 1.15 / 1000) * 1000 }
}

const ZN_INV_MINI35:  ComponentOption = zn('Ziewnic RouX Mini 3.5kW',     85_000)   //  98,000
const ZN_INV_MAX35:   ComponentOption = zn('Ziewnic MAX 3.5kW',           95_000)   // 110,000
const ZN_INV_LITE42:  ComponentOption = zn('Ziewnic RouX Lite 4.2kW',    115_000)   // 133,000
const ZN_INV_MAX55:   ComponentOption = zn('Ziewnic MAX 5.5kW',          110_000)   // 127,000
const ZN_INV_LITE59:  ComponentOption = zn('Ziewnic RouX Lite 5.9kW',    135_000)   // 156,000
const ZN_INV_ROUX67:  ComponentOption = zn('Ziewnic RouX 6.7kW',         167_000)   // 193,000
const ZN_INV_ULTRA85: ComponentOption = zn('Ziewnic RouX Ultra 8.5kW',   250_000)   // 288,000

const ZN_BAT_LW256:  ComponentOption = zn('Ziewnic LI-WALL 2.0 2.56kWh',  134_000)  // 154,000
const ZN_BAT_LW512:  ComponentOption = zn('Ziewnic LI-WALL 2.0 5.12kWh',  223_000)  // 257,000
const ZN_BAT_ZB256:  ComponentOption = zn('Ziewnic Z Box European 2.56kWh',163_000)  // 188,000
const ZN_BAT_ZB512:  ComponentOption = zn('Ziewnic Z Box European 5.12kWh',250_000)  // 288,000

// ── Package definitions ───────────────────────────────────────────────────────

interface SolarPackage {
  id:              string;
  name:            string;
  kw:              string;
  type:            'ups' | 'solar';
  badge:           string;
  badgeColor:      string;
  popular:         boolean;
  includes:        string[];   // non-component line items (panels, wiring, etc.)
  warranties:      string[];
  /** Total with default Crown components and (for solar) with elevated frame.
   *  Used only to back-calculate overhead once Crown prices are fetched. */
  total:           number;
  frameDeduction:  number;
  frameLabel?:     string;
  inverterOptions: ComponentOption[];   // [0] = Crown default
  batteryOptions:  ComponentOption[];   // [0] = Crown default
}

export const PACKAGES: SolarPackage[] = [
  {
    id: 'ups-3.6kw', name: '3.6kW UPS System', kw: '3.6kW',
    type: 'ups', badge: 'Backup Only', badgeColor: 'bg-gray-700', popular: false,
    includes: ['All wiring & electrical equipment', 'Professional installation & transport'],
    warranties: ['3-Year Replacement Warranty — Inverter', '10-Year Replacement Warranty — Battery'],
    total: 285000, frameDeduction: 0,
    inverterOptions: [CROWN_INV_36, ZN_INV_MINI35, ZN_INV_MAX35, ZN_INV_LITE42],
    batteryOptions:  [CROWN_BAT_24, ZN_BAT_LW256, ZN_BAT_ZB256, CROWN_BAT_512, ZN_BAT_LW512],
  },
  {
    id: 'solar-3.6kw', name: '3.6kW Solar System', kw: '3.6kW',
    type: 'solar', badge: 'Solar + Backup', badgeColor: 'bg-amber-500', popular: false,
    includes: [
      'Crown Bi-Facial 620W Solar Plates ×6',
      'All wiring & electrical equipment',
      'Professional installation & transport',
      'Elevated Solar Frame (optional)',
    ],
    warranties: ['3-Year Replacement Warranty — Inverter', '10-Year Replacement Warranty — Battery'],
    // PKR 480,000 without frame | PKR 576,000 with frame
    total: 576000, frameDeduction: 96000, frameLabel: 'Elevated Solar Frame',
    inverterOptions: [CROWN_INV_36, ZN_INV_MINI35, ZN_INV_MAX35, ZN_INV_LITE42],
    batteryOptions:  [CROWN_BAT_24, ZN_BAT_LW256, ZN_BAT_ZB256, CROWN_BAT_512, ZN_BAT_LW512],
  },
  {
    id: 'ups-5kw', name: '5kW UPS System', kw: '5kW',
    type: 'ups', badge: 'Backup Only', badgeColor: 'bg-gray-700', popular: false,
    includes: ['All wiring & electrical equipment', 'Professional installation & transport'],
    warranties: ['3-Year Replacement Warranty — Inverter', '10-Year Replacement Warranty — Battery'],
    total: 475000, frameDeduction: 0,
    inverterOptions: [CROWN_INV_5, ZN_INV_MAX55, ZN_INV_LITE59, ZN_INV_ROUX67, CROWN_INV_36, CROWN_INV_8],
    batteryOptions:  [CROWN_BAT_512, ZN_BAT_LW512, ZN_BAT_ZB512, CROWN_BAT_24, ZN_BAT_LW256],
  },
  {
    id: 'solar-5kw', name: '5kW Solar System', kw: '5kW',
    type: 'solar', badge: 'Most Popular', badgeColor: 'bg-orange-500', popular: true,
    includes: [
      'Crown Bi-Facial 620W Solar Plates ×8',
      'All wiring & electrical equipment',
      'Professional installation & transport',
      'Elevated Solar Frame (optional)',
    ],
    warranties: ['3-Year Replacement Warranty — Inverter', '10-Year Replacement Warranty — Battery'],
    total: 875000, frameDeduction: 140000, frameLabel: 'Elevated Solar Frame',
    inverterOptions: [CROWN_INV_5, ZN_INV_MAX55, ZN_INV_LITE59, ZN_INV_ROUX67, CROWN_INV_36, CROWN_INV_8],
    batteryOptions:  [CROWN_BAT_512, ZN_BAT_LW512, ZN_BAT_ZB512, CROWN_BAT_24, ZN_BAT_LW256],
  },
  {
    id: 'solar-8kw', name: '8kW Solar System', kw: '8kW',
    type: 'solar', badge: 'Maximum Power', badgeColor: 'bg-blue-600', popular: false,
    includes: [
      'Crown Bi-Facial 620W Solar Plates ×14',
      'All wiring & electrical equipment',
      'Professional installation & transport',
      'Elevated Solar Frame (optional)',
    ],
    warranties: ['5-Year Replacement Warranty — Inverter', '10-Year Replacement Warranty — Battery'],
    total: 1364000, frameDeduction: 224000, frameLabel: 'Elevated Solar Frame',
    inverterOptions: [CROWN_INV_8, ZN_INV_ULTRA85, ZN_INV_ROUX67, CROWN_INV_5],
    batteryOptions:  [CROWN_BAT_512, ZN_BAT_LW512, ZN_BAT_ZB512],
  },
]

// ── Price helpers ─────────────────────────────────────────────────────────────

/** Resolve the retail price for an option, using fetched Crown prices when needed. */
function optionPrice(opt: ComponentOption, crownPrices: Record<string, number>): number {
  if (opt.brand === 'Ziewnic') return opt.price ?? 0
  return crownPrices[opt.slug ?? ''] ?? 0
}

/** Overhead = wiring + panels (if solar) + labor + transport for this package tier.
 *  Computed once per package after Crown prices arrive:
 *    overhead = pkg.total(no-frame) - defaultInverterPrice - defaultBatteryPrice */
function computeOverhead(pkg: SolarPackage, crownPrices: Record<string, number>): number {
  const baseTotal = pkg.total - pkg.frameDeduction
  const invPrice  = optionPrice(pkg.inverterOptions[0], crownPrices)
  const batPrice  = optionPrice(pkg.batteryOptions[0],  crownPrices)
  return baseTotal - invPrice - batPrice
}

// ── WA message ────────────────────────────────────────────────────────────────

function buildWAMsg(
  pkg:      SolarPackage,
  withFrame: boolean,
  invOpt:   ComponentOption,
  batOpt:   ComponentOption,
  total:    number,
): string {
  const isCustom = invOpt.label !== pkg.inverterOptions[0].label || batOpt.label !== pkg.batteryOptions[0].label
  return (
    `Hello! I'm interested in the *${pkg.name}* package.\n\n` +
    `🔌 Inverter: ${invOpt.label}\n` +
    `🔋 Battery: ${batOpt.label}\n` +
    (pkg.frameDeduction > 0 ? `🏗️ Elevated Frame: ${withFrame ? 'Included' : 'Not required'}\n` : '') +
    `💰 Total: *PKR ${total.toLocaleString()}*\n` +
    (isCustom ? `\n⚠️ Custom configuration — please confirm final price.\n` : '') +
    `\nCould you confirm availability and share details?`
  )
}

// ── ComponentSelector ─────────────────────────────────────────────────────────

function ComponentSelector({
  label, options, value, crownPrices, onChange,
}: {
  label:       string;
  options:     ComponentOption[];
  value:       string;
  crownPrices: Record<string, number>;
  onChange:    (v: string) => void;
}) {
  const pricesLoaded = options.every(o => o.brand === 'Ziewnic' || (crownPrices[o.slug ?? ''] ?? 0) > 0)

  return (
    <div className="mb-3">
      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">{label}</p>
      <div className="flex flex-col gap-1.5">
        {options.map(opt => {
          const price  = optionPrice(opt, crownPrices)
          const active = value === opt.label
          return (
            <button
              key={opt.label}
              type="button"
              onClick={() => onChange(opt.label)}
              className={`w-full text-left px-3 py-2 rounded-xl border text-sm transition-colors ${
                active
                  ? 'border-orange-400 bg-orange-50 text-orange-900 font-semibold'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <span className={`inline-block w-3 h-3 rounded-full border-2 mr-2 align-middle shrink-0 ${
                active ? 'border-orange-500 bg-orange-500' : 'border-gray-300'
              }`} />
              <span className="flex-1">{opt.label}</span>
              {pricesLoaded && price > 0 && (
                <span className={`ml-1 text-xs ${active ? 'text-orange-700' : 'text-gray-400'}`}>
                  PKR {formatPrice(price)}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── PackageCard ───────────────────────────────────────────────────────────────

function PackageCard({
  pkg, crownPrices, onBook,
}: {
  pkg:         SolarPackage;
  crownPrices: Record<string, number>;
  onBook:      (ctx: BookingContext) => void;
}) {
  const [withFrame,       setWithFrame]       = useState(pkg.frameDeduction > 0)
  const [selectedInvLabel, setInvLabel]       = useState(pkg.inverterOptions[0].label)
  const [selectedBatLabel, setBatLabel]       = useState(pkg.batteryOptions[0].label)

  const invOpt = pkg.inverterOptions.find(o => o.label === selectedInvLabel) ?? pkg.inverterOptions[0]
  const batOpt = pkg.batteryOptions.find(o => o.label === selectedBatLabel) ?? pkg.batteryOptions[0]

  const overhead = computeOverhead(pkg, crownPrices)
  const pricesReady = overhead > 0   // true once Crown prices have loaded

  const invPrice     = optionPrice(invOpt, crownPrices)
  const batPrice     = optionPrice(batOpt, crownPrices)
  const frameAdd     = withFrame ? pkg.frameDeduction : 0
  // Use dynamic price when Crown prices are loaded; fall back to static pkg.total
  const displayPrice = pricesReady
    ? invPrice + batPrice + overhead + frameAdd
    : (withFrame ? pkg.total : pkg.total - pkg.frameDeduction)

  const isDefault    = invOpt.label === pkg.inverterOptions[0].label && batOpt.label === pkg.batteryOptions[0].label
  const allIncludes  = [invOpt.label, batOpt.label, ...pkg.includes]

  const handleBook = () => {
    onBook({
      packageName:    pkg.name,
      estimatedPrice: displayPrice,
      notes: [
        `Inverter: ${invOpt.label}`,
        `Battery: ${batOpt.label}`,
        pkg.frameDeduction > 0 ? `Elevated frame: ${withFrame ? 'Yes' : 'No'}` : '',
        !isDefault ? 'Custom config — price subject to confirmation' : '',
      ].filter(Boolean).join(' | '),
    })
  }

  return (
    <div className={`relative bg-white rounded-3xl border-2 flex flex-col overflow-hidden shadow-sm ${
      pkg.popular ? 'border-orange-400 shadow-orange-100 shadow-lg' : 'border-gray-100'
    }`}>
      {pkg.popular && (
        <div className="bg-orange-500 text-white text-xs font-bold text-center py-1.5 tracking-wide">
          ⭐ MOST POPULAR CHOICE
        </div>
      )}

      <div className="p-6 flex flex-col flex-1">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className={`inline-block text-white text-xs font-semibold px-2.5 py-1 rounded-full mb-2 ${pkg.badgeColor}`}>
              {pkg.badge}
            </span>
            <h3 className="text-xl font-black text-gray-900 leading-tight">{pkg.name}</h3>
          </div>
          <div className="text-3xl">{pkg.type === 'solar' ? '☀️' : '🔋'}</div>
        </div>

        {/* Component selectors */}
        <ComponentSelector label="Inverter" options={pkg.inverterOptions} value={selectedInvLabel}
          crownPrices={crownPrices} onChange={setInvLabel} />
        <ComponentSelector label="Battery"  options={pkg.batteryOptions}  value={selectedBatLabel}
          crownPrices={crownPrices} onChange={setBatLabel} />

        {/* What's included */}
        <div className="mb-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">What's Included</p>
          <ul className="space-y-1.5">
            {allIncludes.map(item => (
              <li key={item} className="flex items-start gap-2 text-sm text-gray-600">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Warranties */}
        <div className="bg-blue-50 rounded-2xl px-4 py-3 mb-4">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Shield className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-xs font-bold text-blue-700">Warranties</span>
          </div>
          <p className="text-xs text-blue-600 leading-relaxed font-semibold">✓ 1-Year Installation Warranty</p>
          {pkg.warranties.map(w => (
            <p key={w} className="text-xs text-blue-600 leading-relaxed">✓ {w}</p>
          ))}
        </div>

        {/* Frame toggle */}
        {pkg.frameDeduction > 0 && (
          <label className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mb-4 cursor-pointer">
            <div>
              <p className="text-sm font-semibold text-amber-900">{pkg.frameLabel}</p>
              <p className="text-xs text-amber-700">
                {withFrame
                  ? `Remove to save PKR ${formatPrice(pkg.frameDeduction)}`
                  : `Add for PKR ${formatPrice(pkg.frameDeduction)} more`}
              </p>
            </div>
            <input type="checkbox" checked={withFrame} onChange={e => setWithFrame(e.target.checked)}
              className="w-4 h-4 accent-orange-500 cursor-pointer" />
          </label>
        )}

        {/* Price + CTAs */}
        <div className="mt-auto">
          <div className="text-center mb-4">
            <p className="text-xs text-gray-400 mb-0.5">Total Package Price</p>
            {pricesReady ? (
              <p className="text-3xl font-black text-gray-900">PKR {formatPrice(displayPrice)}</p>
            ) : (
              <div className="h-9 bg-gray-100 rounded-xl animate-pulse mx-auto w-48 mt-1" />
            )}
            <p className="text-xs text-gray-400 mt-1">All-inclusive · labor · transport · equipment</p>
            {!isDefault && pricesReady && (
              <p className="text-xs text-orange-600 mt-1 font-medium">
                Custom config — price subject to confirmation
              </p>
            )}
          </div>

          <div className="space-y-2">
            <button
              onClick={handleBook}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-white text-sm bg-gray-900 hover:bg-orange-500 transition-colors">
              <CalendarCheck className="w-4 h-4" /> Book This Package
            </button>
            <a href={wa(WA_SALES, buildWAMsg(pkg, withFrame, invOpt, batOpt, displayPrice))}
              target="_blank" rel="noreferrer"
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-2xl border border-gray-200 text-gray-500 text-xs font-medium hover:bg-gray-50 transition-colors">
              <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" /> Questions? Ask on WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

/** All Crown component slugs we need to fetch (deduped). */
const CROWN_SLUGS_TO_FETCH = Array.from(new Set(
  PACKAGES.flatMap(pkg => [
    ...pkg.inverterOptions.filter(o => o.brand === 'Crown').map(o => o.slug!),
    ...pkg.batteryOptions.filter(o => o.brand === 'Crown').map(o => o.slug!),
  ])
))

export default function SolarPage() {
  const [products,       setProducts]       = useState<Product[]>([])
  const [loading,        setLoading]        = useState(true)
  const [bookingOpen,    setBookingOpen]    = useState(false)
  const [bookingContext, setBookingContext] = useState<BookingContext>({ packageName: 'Solar Package' })
  const [crownPrices,    setCrownPrices]   = useState<Record<string, number>>({})

  const openBooking = (ctx: BookingContext) => { setBookingContext(ctx); setBookingOpen(true) }

  // Fetch Crown component prices from DB
  useEffect(() => {
    Promise.all(CROWN_SLUGS_TO_FETCH.map(slug => getProduct(slug))).then(results => {
      const map: Record<string, number> = {}
      results.forEach((product, i) => {
        if (product) map[CROWN_SLUGS_TO_FETCH[i]] = product.price.cash_floor
      })
      setCrownPrices(map)
    })
  }, [])

  useEffect(() => {
    getProducts({ category: 'solar' }).then(d => { setProducts(d.products); setLoading(false) })
  }, [])

  return (
    <div className="min-h-screen bg-white">
      <BookingModal open={bookingOpen} onClose={() => setBookingOpen(false)} context={bookingContext} />

      {/* Hero */}
      <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-yellow-400 text-white py-20 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-black mb-4">Power Your Life with Solar</h1>
          <p className="text-xl text-amber-100 max-w-2xl mx-auto mb-8">Complete solar systems. Cut your electricity bill by up to 80%.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center flex-wrap">
            <a href="#packages" className="inline-flex items-center gap-2 bg-white text-orange-600 font-bold px-8 py-4 rounded-2xl hover:bg-orange-50 shadow-lg">
              ☀️ View Packages
            </a>
            <Link to="/solar-calculator" className="inline-flex items-center gap-2 bg-black/30 border border-white/40 text-white font-bold px-8 py-4 rounded-2xl hover:bg-black/50 shadow-lg">
              <Calculator className="w-5 h-5" /> Grid-Tie Calculator
            </Link>
            <Link to="/solar/off-grid" className="inline-flex items-center gap-2 border border-white/50 text-white font-medium px-8 py-4 rounded-2xl hover:bg-white/10">
              🔋 Off-Grid Independence <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Benefits */}
      <div className="max-w-5xl mx-auto px-4 py-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {SOLAR_BENEFITS.map(b => (
          <div key={b.title} className="text-center p-5">
            <div className="text-4xl mb-3">{b.icon}</div>
            <div className="font-bold text-gray-800 mb-1">{b.title}</div>
            <div className="text-sm text-gray-500">{b.desc}</div>
          </div>
        ))}
      </div>

      {/* ── PACKAGES SECTION ─────────────────────────────────────────── */}
      <div id="packages" className="bg-gray-50 py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-4">
            <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
              ☀️ Ready-to-Install Packages
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-3">Solar & UPS Packages</h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              All-inclusive prices — inverter, battery, panels, wiring, labor &amp; transport.
              Choose Crown or Ziewnic components to suit your budget.
            </p>
          </div>

          {/* Customisation note */}
          <div className="max-w-2xl mx-auto mb-10 bg-white border border-blue-100 rounded-2xl px-5 py-4 text-sm text-blue-700 text-center shadow-sm">
            <strong>Mix Crown and Ziewnic components freely.</strong> Select your inverter and battery below —
            the price updates live. Custom configurations are confirmed on WhatsApp before booking.
          </div>

          {/* Package cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
            {PACKAGES.map(pkg => (
              <PackageCard key={pkg.id} pkg={pkg} crownPrices={crownPrices} onBook={openBooking} />
            ))}
          </div>

          <p className="text-center text-xs text-gray-400 mt-8">
            Prices include all components, electrical equipment, labor &amp; transport within Karachi.
            Crown warranties are replacement (not repair) warranties.
            Ziewnic prices are based on official Jan 2026 price list.
          </p>
        </div>
      </div>

      {/* Calculator cards */}
      <div className="max-w-5xl mx-auto px-4 py-12 grid sm:grid-cols-2 gap-4">
        <div className="bg-gradient-to-r from-orange-100 to-amber-100 rounded-3xl p-6 flex flex-col justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-gray-900 mb-1">Grid-Tie / Hybrid</h2>
            <p className="text-gray-600 text-sm">Calculate your system size, add appliances, get a quote with net-metering savings.</p>
          </div>
          <Link to="/solar-calculator" className="self-start bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-3 rounded-2xl inline-flex items-center gap-2 text-sm">
            <Calculator className="w-4 h-4" /> Try Calculator
          </Link>
        </div>
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-3xl p-6 flex flex-col justify-between gap-4">
          <div>
            <div className="text-xs font-medium text-orange-400 uppercase tracking-wider mb-1">New</div>
            <h2 className="text-xl font-black mb-1">Off-Grid Independence</h2>
            <p className="text-gray-400 text-sm">Battery-backed power. No KESC bill. No load shedding. Enter your bill — we size your system.</p>
          </div>
          <Link to="/solar/off-grid" className="self-start bg-orange-500 hover:bg-orange-400 text-white font-bold px-6 py-3 rounded-2xl inline-flex items-center gap-2 text-sm">
            🔋 Go Off-Grid
          </Link>
        </div>
      </div>

      {/* Products */}
      <div id="products" className="max-w-7xl mx-auto px-4 pb-14">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Solar Products</h2>
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {Array.from({length:8}).map((_,i) => <div key={i} className="bg-gray-100 rounded-2xl h-72 animate-pulse"/>)}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Sun className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Solar products coming soon.</p>
            <a href={wa(WA_SALES, 'Hello! I need a solar quote.')} className="mt-4 inline-block bg-green-500 text-white px-6 py-2.5 rounded-xl font-medium">
              WhatsApp for Solar Quote
            </a>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {products.map(p => <ProductCard key={p.id} product={p}/>)}
          </div>
        )}
      </div>
    </div>
  )
}
