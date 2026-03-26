import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Sun, ArrowRight, Calculator, CheckCircle2, MessageCircle, Shield } from 'lucide-react'
import { getProducts, type Product, formatPrice } from '../lib/api'
import ProductCard from '../components/products/ProductCard'
import { wa } from '../lib/whatsapp'
import { WA_SALES } from '../lib/config'

const SOLAR_BENEFITS = [
  { icon:'☀️', title:'25 Year Performance Warranty', desc:'Panels guaranteed at 80% output for 25 years.' },
  { icon:'💰', title:'80% Bill Reduction', desc:'Average customer saves PKR 8,000–25,000/month.' },
  { icon:'🔋', title:'Backup Power', desc:'Hybrid systems keep your home running during outages.' },
  { icon:'🌿', title:'Net Metering', desc:'Sell excess power back to the grid and earn credits.' },
]

interface SolarPackage {
  id:             string;
  name:           string;
  kw:             string;
  type:           'ups' | 'solar';
  badge:          string;
  badgeColor:     string;
  popular:        boolean;
  includes:       string[];
  warranties:     string[];
  total:          number;
  frameDeduction: number;   // 0 if no frame option
  frameLabel?:    string;
}

const PACKAGES: SolarPackage[] = [
  {
    id: 'ups-3.6kw', name: '3.6kW UPS System', kw: '3.6kW',
    type: 'ups', badge: 'Backup Only', badgeColor: 'bg-gray-700', popular: false,
    includes: [
      'Crown Yorker 3.6kW Inverter',
      'Crown 2.4kW LiFePO4 Battery',
      'All wiring & electrical equipment',
      'Professional installation & transport',
    ],
    warranties: ['3-Year Replacement Warranty — Inverter', '10-Year Replacement Warranty — Battery'],
    total: 285000, frameDeduction: 0,
  },
  {
    id: 'solar-3.6kw', name: '3.6kW Solar System', kw: '3.6kW',
    type: 'solar', badge: 'Solar + Backup', badgeColor: 'bg-amber-500', popular: false,
    includes: [
      'Crown Yorker 3.6kW Inverter',
      'Crown 2.4kW LiFePO4 Battery',
      'Crown Bi-Facial 620W Solar Plates ×6',
      'All wiring & electrical equipment',
      'Professional installation & transport',
      'Elevated Solar Frame (optional)',
    ],
    warranties: ['3-Year Replacement Warranty — Inverter', '10-Year Replacement Warranty — Battery'],
    total: 485000, frameDeduction: 224000, frameLabel: 'Elevated Solar Frame',
  },
  {
    id: 'ups-5kw', name: '5kW UPS System', kw: '5kW',
    type: 'ups', badge: 'Backup Only', badgeColor: 'bg-gray-700', popular: false,
    includes: [
      'Crown 5kW Inverter',
      'Crown 5.12kW LiFePO4 Battery',
      'All wiring & electrical equipment',
      'Professional installation & transport',
    ],
    warranties: ['3-Year Replacement Warranty — Inverter', '10-Year Replacement Warranty — Battery'],
    total: 475000, frameDeduction: 0,
  },
  {
    id: 'solar-5kw', name: '5kW Solar System', kw: '5kW',
    type: 'solar', badge: 'Most Popular', badgeColor: 'bg-orange-500', popular: true,
    includes: [
      'Crown 5kW Inverter',
      'Crown 5.12kW LiFePO4 Battery',
      'Crown Bi-Facial 620W Solar Plates ×8',
      'All wiring & electrical equipment',
      'Professional installation & transport',
      'Elevated Solar Frame (optional)',
    ],
    warranties: ['3-Year Replacement Warranty — Inverter', '10-Year Replacement Warranty — Battery'],
    total: 875000, frameDeduction: 140000, frameLabel: 'Elevated Solar Frame',
  },
  {
    id: 'solar-8kw', name: '8kW Solar System', kw: '8kW',
    type: 'solar', badge: 'Maximum Power', badgeColor: 'bg-blue-600', popular: false,
    includes: [
      'Crown 8kW Hybrid Inverter',
      'Crown 5.12kW LiFePO4 Battery',
      'Crown Bi-Facial 620W Solar Plates ×14',
      'All wiring & electrical equipment',
      'Professional installation & transport',
      'Elevated Solar Frame (optional)',
    ],
    warranties: ['5-Year Replacement Warranty — Inverter', '10-Year Replacement Warranty — Battery'],
    total: 1364000, frameDeduction: 224000, frameLabel: 'Elevated Solar Frame',
  },
]

function buildWAMsg(pkg: SolarPackage, withFrame: boolean) {
  const price = withFrame ? pkg.total : pkg.total - pkg.frameDeduction
  return (
    `Hello! I'm interested in the *${pkg.name}* package.\n\n` +
    `💰 Total: *PKR ${price.toLocaleString()}*\n` +
    (pkg.frameDeduction > 0 ? `🏗️ Elevated Frame: ${withFrame ? 'Included' : 'Not required'}\n` : '') +
    `\nCould you confirm availability and share more details? I may also want to customise the package.`
  )
}

function PackageCard({ pkg }: { pkg: SolarPackage }) {
  const [withFrame, setWithFrame] = useState(pkg.frameDeduction > 0)
  const displayPrice = withFrame ? pkg.total : pkg.total - pkg.frameDeduction

  return (
    <div className={`relative bg-white rounded-3xl border-2 flex flex-col overflow-hidden shadow-sm ${
      pkg.popular ? 'border-orange-400 shadow-orange-100 shadow-lg' : 'border-gray-100'
    }`}>
      {/* Popular ribbon */}
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

        {/* What's included */}
        <div className="mb-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">What's Included</p>
          <ul className="space-y-1.5">
            {pkg.includes.map(item => (
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

        {/* Price */}
        <div className="mt-auto">
          <div className="text-center mb-4">
            <p className="text-xs text-gray-400 mb-0.5">Total Package Price</p>
            <p className="text-3xl font-black text-gray-900">PKR {formatPrice(displayPrice)}</p>
            <p className="text-xs text-gray-400 mt-1">
              All-inclusive · labor · transport · equipment
            </p>
          </div>

          {/* CTAs */}
          <div className="space-y-2">
            <a href={wa(WA_SALES, buildWAMsg(pkg, withFrame))} target="_blank" rel="noreferrer"
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-white text-sm bg-wa hover:bg-wa-hover transition-colors">
              <MessageCircle className="w-4 h-4" /> Get Quote on WhatsApp
            </a>
            <a href={wa(WA_SALES,
              `Hello! I'd like to *customise* a ${pkg.kw} solar/UPS package. I may want to adjust the inverter, battery capacity, or number of plates. Could you help me build a custom quote?`
            )} target="_blank" rel="noreferrer"
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-medium text-gray-700 text-sm border border-gray-200 hover:bg-gray-50 transition-colors">
              ✏️ Customise This Package
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SolarPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading]   = useState(true)
  useEffect(() => { getProducts({ category: 'solar' }).then(d => { setProducts(d.products); setLoading(false) }) }, [])

  return (
    <div className="min-h-screen bg-white">
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
              All-inclusive prices — inverter, battery, panels, wiring, labor &amp; transport. Top-quality Crown components with industry-leading <strong>replacement</strong> warranties.
            </p>
          </div>

          {/* Customisation note */}
          <div className="max-w-2xl mx-auto mb-10 bg-white border border-blue-100 rounded-2xl px-5 py-4 text-sm text-blue-700 text-center shadow-sm">
            <strong>Every package is customisable.</strong> Want a different inverter size, more battery capacity, or fewer panels? WhatsApp us and we'll build a quote tailored to your needs.
          </div>

          {/* Package cards grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
            {PACKAGES.map(pkg => <PackageCard key={pkg.id} pkg={pkg} />)}
          </div>

          {/* Bottom disclaimer */}
          <p className="text-center text-xs text-gray-400 mt-8">
            Prices include all components, electrical equipment, labor &amp; transport within Karachi.
            Elevated frame can be removed to reduce the total — toggle above each package to see the adjusted price.
            All components are genuine Crown products with replacement (not repair) warranties.
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
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">{Array.from({length:8}).map((_,i)=><div key={i} className="bg-gray-100 rounded-2xl h-72 animate-pulse"/>)}</div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Sun className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Solar products coming soon.</p>
            <a href={wa(WA_SALES, 'Hello! I need a solar quote.')} className="mt-4 inline-block bg-green-500 text-white px-6 py-2.5 rounded-xl font-medium">WhatsApp for Solar Quote</a>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">{products.map(p=><ProductCard key={p.id} product={p}/>)}</div>
        )}
      </div>
    </div>
  )
}
