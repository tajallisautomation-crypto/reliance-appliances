import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Leaf, Sun, Zap, TrendingDown, CheckCircle, MessageCircle, Calculator, Battery, CalendarCheck } from 'lucide-react'
import SEO from '@/components/ui/SEO'
import AnimatedCounter from '@/components/ui/AnimatedCounter'
import { calcPlan, formatPrice } from '@/lib/api'
import { waSales } from '@/lib/whatsapp'
import BookingModal, { type BookingContext } from '@/components/BookingModal'

const JOURNEY_STEPS = [
  {
    number: '01',
    icon: Sun,
    iconColor: 'text-amber-400',
    bgColor: 'bg-amber-400/10',
    title: 'Solar Panels on Your Roof',
    subtitle: 'Generate your own electricity',
    body: 'A 5kW system generates 550–650 units per month — enough to cover a typical 3-bedroom home in Karachi. Installed in one day. Note: K-Electric Net Metering requires a system of 10kW or above; standard grid-tied systems simply offset your consumption in real-time.',
    stats: [
      { label: 'Units/month', value: '550–650' },
      { label: 'Install time', value: '1 day' },
      { label: 'Panel warranty', value: '25 yrs' },
    ],
  },
  {
    number: '02',
    icon: Zap,
    iconColor: 'text-blue-400',
    bgColor: 'bg-blue-400/10',
    title: 'Switch to Inverter ACs',
    subtitle: '60% less power than conventional ACs',
    body: 'Inverter ACs run on solar during the day — no battery needed. On grid at night, they\'re still 40–60% cheaper than non-inverter models. Combined with solar, your cooling cost drops to near zero in peak summer.',
    stats: [
      { label: 'Energy saving', value: '60%' },
      { label: 'Brands', value: 'Haier, Dawlance' },
      { label: 'Warranty', value: '3–5 yrs' },
    ],
  },
  {
    number: '03',
    icon: Battery,
    iconColor: 'text-eco-400',
    bgColor: 'bg-eco-400/10',
    title: 'Add Battery Storage',
    subtitle: 'Power through load shedding — no generator needed',
    body: 'A lithium battery bank paired with your solar system keeps your home running during load shedding. No diesel, no noise, no fumes. Charge during the day, use at night. Payback accelerated by the fuel savings alone.',
    stats: [
      { label: 'Load shedding cover', value: '8–12 hrs' },
      { label: 'vs Generator cost', value: '80% cheaper' },
      { label: 'Battery life', value: '10–20 yrs' },
    ],
  },
]

// Net metering rule: only available for 10kW+ systems, PKR 250,000 add-on.
// None of the standard packages below qualify — do NOT show net metering on these.
const NET_METERING_MIN_KW = 10
const NET_METERING_ADDON_PRICE = 250000

interface GCPackage {
  id: string
  name: string
  tagline: string
  solarKw: number
  panelWatts: number
  panelCount: number
  inverterModel: string
  inverterWarranty: string
  batteryKwh: number | null
  batteryModel: string | null
  batteryWarranty: string | null
  acCount: number
  acTonnage: string
  acBrands: string
  monthlyUnitsMin: number
  monthlyUnitsMax: number
  billReduction: string
  includes: string[]
  price: number
  popular: boolean
  color: string
  badgeColor: string
  workmanshipWarranty: string
}

const PACKAGES: GCPackage[] = [
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'Ideal for 2-bedroom homes with 1 AC',
    solarKw: 3,
    panelWatts: 620,
    panelCount: 5,
    inverterModel: 'Crown Yorker 3.6kW Hybrid Inverter',
    inverterWarranty: '2-year',
    batteryKwh: null,
    batteryModel: null,
    batteryWarranty: null,
    acCount: 1,
    acTonnage: '1 ton',
    acBrands: 'Haier or Dawlance',
    monthlyUnitsMin: 350,
    monthlyUnitsMax: 420,
    billReduction: '50–65%',
    includes: [
      '5 × Crown Bi-Facial 620W Solar Panels (3.1kW peak)',
      'Crown Yorker 3.6kW Hybrid Inverter (2-yr warranty)',
      '1 Haier or Dawlance Inverter AC (1 ton)',
      'All wiring, electrical equipment & transport',
      'Professional installation & commissioning',
    ],
    price: 450000,
    popular: false,
    color: 'border-gray-200',
    badgeColor: 'bg-gray-100 text-gray-700',
    workmanshipWarranty: '1-year',
  },
  {
    id: 'home-complete',
    name: 'Home Complete',
    tagline: 'Most popular — covers a full 3-bedroom home',
    solarKw: 5,
    panelWatts: 620,
    panelCount: 8,
    inverterModel: 'Crown 5kW Hybrid Inverter',
    inverterWarranty: '2-year',
    batteryKwh: null,
    batteryModel: null,
    batteryWarranty: null,
    acCount: 2,
    acTonnage: '1.5 ton each',
    acBrands: 'Haier or Dawlance',
    monthlyUnitsMin: 550,
    monthlyUnitsMax: 650,
    billReduction: '65–80%',
    includes: [
      '8 × Crown Bi-Facial 620W Solar Panels (4.96kW peak)',
      'Crown 5kW Hybrid Inverter (2-yr warranty)',
      '2 Haier or Dawlance Inverter ACs (1.5 ton each)',
      'All wiring, electrical equipment & transport',
      'Professional installation & commissioning',
    ],
    price: 850000,
    popular: true,
    color: 'border-eco-500',
    badgeColor: 'bg-eco-500 text-white',
    workmanshipWarranty: '1-year',
  },
  {
    id: 'total-freedom',
    name: 'Total Freedom',
    tagline: 'Larger homes — full backup, no load-shedding impact',
    solarKw: 8,
    panelWatts: 620,
    panelCount: 13,
    inverterModel: 'Crown 8kW Hybrid Inverter',
    inverterWarranty: '2-year',
    batteryKwh: 10,
    batteryModel: 'Crown 10.24kWh LiFePO4 Battery (2 × 5.12kWh)',
    batteryWarranty: '5-year',
    acCount: 4,
    acTonnage: 'mixed (1 + 1.5 + 1.5 + 2 ton)',
    acBrands: 'Haier or Dawlance',
    monthlyUnitsMin: 900,
    monthlyUnitsMax: 1050,
    billReduction: '75–90%',
    includes: [
      '13 × Crown Bi-Facial 620W Solar Panels (8.06kW peak)',
      'Crown 8kW Hybrid Inverter (2-yr warranty)',
      'Crown 10.24kWh LiFePO4 Battery Storage — 8–12 hrs backup (5-yr warranty)',
      '4 Haier or Dawlance Inverter ACs (mixed tonnage)',
      'All wiring, electrical equipment & transport',
      'Professional installation & commissioning',
    ],
    price: 1435000,
    popular: false,
    color: 'border-gray-200',
    badgeColor: 'bg-gray-100 text-gray-700',
    workmanshipWarranty: '1-year',
  },
]

export default function GreenCorridor() {
  const [monthlyBill, setMonthlyBill] = useState(8000)
  const [numACs,      setNumACs]      = useState(2)
  const [hasBattery,  setHasBattery]  = useState(false)

  // Booking modal state
  const [bookingOpen,    setBookingOpen]    = useState(false)
  const [bookingContext, setBookingContext] = useState<BookingContext>({ packageName: 'Green Corridor Consultation' })

  const openBooking = (ctx: BookingContext) => { setBookingContext(ctx); setBookingOpen(true) }

  // Simplified savings estimate
  const solarSavingPct  = Math.min(0.85, 0.55 + numACs * 0.05 + (hasBattery ? 0.10 : 0))
  const monthlySaving   = Math.round(monthlyBill * solarSavingPct / 100) * 100
  const annualSaving    = monthlySaving * 12
  const systemCost      = (numACs <= 2 ? 450000 : numACs <= 4 ? 850000 : 1435000) + (hasBattery ? 250000 : 0)
  const paybackYears    = annualSaving > 0 ? +(systemCost / annualSaving).toFixed(1) : 0
  const plan3m          = calcPlan(systemCost, '3m')

  // Determine which package the calculator maps to
  const matchedPackage = PACKAGES.find(p =>
    numACs <= 2 && !hasBattery ? p.solarKw === 3 :
    numACs <= 4 && !hasBattery ? p.solarKw === 5 :
    p.solarKw === 8
  ) ?? PACKAGES[1]

  const waConsult = waSales('Hi, I\'m interested in the Green Corridor solar + inverter AC package. Can I book a free consultation?')

  return (
    <div className="min-h-screen bg-white">
      <SEO
        path="/green-corridor"
        title="Green Corridor — Solar, Inverter ACs & Battery Storage"
        description="Cut your electricity bill by up to 85%. Complete solar systems, inverter ACs and battery storage on easy installments. Free site assessment in Karachi."
        keywords="solar system karachi, inverter ac karachi, battery storage karachi, solar installation karachi, green energy karachi"
      />

      <BookingModal
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        context={bookingContext}
      />

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <div className="relative bg-gray-950 overflow-hidden">
        {/* Grid background */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'linear-gradient(#4ade80 1px,transparent 1px),linear-gradient(90deg,#4ade80 1px,transparent 1px)', backgroundSize: '48px 48px' }} />
        {/* Radial glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-eco-500/10 rounded-full blur-3xl" />

        <div className="relative max-w-4xl mx-auto px-4 py-24 md:py-32 text-center">
          <div className="inline-flex items-center gap-2 bg-eco-500/15 text-eco-400 px-4 py-2 rounded-full text-sm font-semibold mb-8">
            <Leaf className="w-4 h-4" /> Solar + Inverter AC Packages — Karachi
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-white leading-[1.05] tracking-tight mb-6">
            Your home.<br />
            <span className="text-eco-400">Off the grid.</span>
          </h1>
          <p className="text-gray-400 text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
            Solar · Inverter ACs · Battery Storage<br />
            One roof. One partner. Zero compromise.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#calculator"
              className="inline-flex items-center justify-center gap-2 bg-eco-500 hover:bg-eco-600 text-white font-bold px-8 py-4 rounded-2xl transition-all shadow-eco">
              <Calculator className="w-5 h-5" /> Calculate My Savings
            </a>
            <button
              onClick={() => openBooking({ packageName: 'Green Corridor — Free Consultation', notes: 'Hero CTA — general consultation request' })}
              className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-gray-600 text-gray-200 font-medium px-8 py-4 rounded-2xl transition-all">
              <CalendarCheck className="w-5 h-5" /> Book Free Consultation
            </button>
          </div>
          <p className="text-gray-600 text-xs mt-5">
            Prefer to chat? <a href={waConsult} target="_blank" rel="noreferrer" className="text-eco-400 hover:underline inline-flex items-center gap-1"><MessageCircle className="w-3 h-3" /> WhatsApp us</a>
          </p>
        </div>
      </div>

      {/* ── THE PROBLEM ──────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-4 py-20 text-center">
        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-6">The Reality</p>
        <div className="mb-6">
          <p className="text-7xl md:text-8xl font-black text-gray-900">
            PKR <AnimatedCounter target={8400} />
          </p>
          <p className="text-xl text-gray-500 mt-3">Average monthly electricity bill in Karachi.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          {[
            { label: 'Per year leaving your household', value: 'PKR 1,00,800' },
            { label: 'Hours of load shedding in summer', value: '12–16 hrs/day' },
            { label: 'Fuel cost increase per year', value: '~25%' },
          ].map(item => (
            <div key={item.label} className="bg-red-50 border border-red-100 rounded-2xl p-6">
              <p className="text-2xl font-black text-red-600 mb-2">{item.value}</p>
              <p className="text-sm text-gray-600">{item.label}</p>
            </div>
          ))}
        </div>
        <p className="text-xl font-bold text-gray-900 mt-12">There is a better way.</p>
      </section>

      {/* ── THE JOURNEY ──────────────────────────────────────────── */}
      <section className="bg-gray-950 py-20">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-14">
            <p className="text-eco-400 text-xs font-bold uppercase tracking-widest mb-3">The Green Corridor Journey</p>
            <h2 className="text-3xl md:text-4xl font-black text-white">Three steps. One roof. Total freedom.</h2>
          </div>
          <div className="space-y-8">
            {JOURNEY_STEPS.map((step, i) => (
              <div key={step.number}
                className="grid md:grid-cols-2 gap-8 items-center bg-gray-900 rounded-3xl p-8 border border-gray-800">
                <div className={i % 2 === 1 ? 'md:order-2' : ''}>
                  <div className="flex items-center gap-4 mb-4">
                    <span className="text-5xl font-black text-gray-700">{step.number}</span>
                    <div className={`w-12 h-12 ${step.bgColor} rounded-2xl flex items-center justify-center`}>
                      <step.icon className={`w-6 h-6 ${step.iconColor}`} />
                    </div>
                  </div>
                  <h3 className="text-2xl font-black text-white mb-1">{step.title}</h3>
                  <p className={`text-sm font-semibold mb-4 ${step.iconColor}`}>{step.subtitle}</p>
                  <p className="text-gray-400 leading-relaxed text-sm">{step.body}</p>
                </div>
                <div className={`grid grid-cols-3 gap-3 ${i % 2 === 1 ? 'md:order-1' : ''}`}>
                  {step.stats.map(stat => (
                    <div key={stat.label} className="bg-gray-800 rounded-2xl p-4 text-center border border-gray-700">
                      <p className="text-xl font-black text-white mb-1">{stat.value}</p>
                      <p className="text-xs text-gray-500">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SAVINGS CALCULATOR ───────────────────────────────────── */}
      <section id="calculator" className="max-w-4xl mx-auto px-4 py-20">
        <div className="text-center mb-10">
          <p className="text-brand-500 text-xs font-bold uppercase tracking-widest mb-3">Free Calculator</p>
          <h2 className="text-3xl md:text-4xl font-black text-gray-900">How much will you save?</h2>
          <p className="text-gray-500 mt-3">Tell us about your home — get an instant estimate.</p>
        </div>

        <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100">
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {/* Monthly bill */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-3">
                Monthly electricity bill
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">PKR</span>
                <input type="number" min={0} step={500} value={monthlyBill}
                  onChange={e => setMonthlyBill(Math.max(0, Number(e.target.value)))}
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-xl font-black text-gray-900 focus:outline-none focus:border-brand-500" />
              </div>
            </div>

            {/* No. of ACs */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-3">
                Number of ACs
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4].map(n => (
                  <button key={n} onClick={() => setNumACs(n)}
                    className={`flex-1 py-3 rounded-xl text-sm font-bold border transition-all ${numACs === n ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-200 text-gray-700 hover:border-gray-400'}`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Battery toggle */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-3">
                Add battery storage?
              </label>
              <div className="flex gap-2">
                {(['No', 'Yes'] as const).map((val) => (
                  <button key={val} onClick={() => setHasBattery(val === 'Yes')}
                    className={`flex-1 py-3 rounded-xl text-sm font-bold border transition-all ${(val === 'Yes') === hasBattery ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-200 text-gray-700 hover:border-gray-400'}`}>
                    {val}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-apple animate-fade-in" key={`${monthlyBill}-${numACs}-${hasBattery}`}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Monthly saving',  value: `PKR ${formatPrice(monthlySaving)}`,  color: 'text-eco-600' },
                { label: 'Annual saving',   value: `PKR ${formatPrice(annualSaving)}`,   color: 'text-eco-600' },
                { label: 'Estimated system', value: `PKR ${formatPrice(systemCost)}`,    color: 'text-gray-900' },
                { label: 'Payback period',  value: `${paybackYears} yrs`,               color: 'text-brand-500' },
              ].map(item => (
                <div key={item.label} className="text-center">
                  <p className={`text-2xl font-black ${item.color}`}>{item.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{item.label}</p>
                </div>
              ))}
            </div>
            <div className="bg-eco-50 rounded-xl p-4 border border-eco-100">
              <p className="text-xs text-gray-500 mb-1">Installment option (3-payment plan)</p>
              <div className="flex items-baseline gap-3">
                <p className="text-xl font-black text-gray-900">PKR {formatPrice(plan3m.advance)} advance</p>
                <span className="text-gray-400 text-sm">then PKR {formatPrice(plan3m.monthly)}/mo × 2</span>
              </div>
              <p className="text-[11px] text-amber-700 mt-2 font-medium">
                ⚠ Solar packages on installments require a minimum 40% advance payment. Verification starts after advance is received. Systems above 5kW or PKR 700,000 are cash only.
              </p>
            </div>
          </div>

          {/* Matched package detail hint */}
          <div className="mt-4 bg-eco-50 border border-eco-100 rounded-2xl p-4">
            <div className="flex items-start gap-3 mb-3">
              <Leaf className="w-4 h-4 text-eco-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-eco-800">
                  Suggested Based on Your Inputs: <strong>{matchedPackage.name}</strong> Package ({matchedPackage.solarKw}kW)
                </p>
                <p className="text-xs text-eco-700 mt-0.5">
                  {matchedPackage.panelCount} × {matchedPackage.panelWatts}W panels · {matchedPackage.inverterModel}
                  {matchedPackage.batteryModel ? ` · ${matchedPackage.batteryModel}` : ''}
                  {' · '}{matchedPackage.acCount} {matchedPackage.acBrands} AC{matchedPackage.acCount !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-white rounded-xl py-2 px-1">
                <p className="text-base font-black text-eco-600">{matchedPackage.monthlyUnitsMin}–{matchedPackage.monthlyUnitsMax}</p>
                <p className="text-[10px] text-gray-500">Units/month</p>
              </div>
              <div className="bg-white rounded-xl py-2 px-1">
                <p className="text-base font-black text-eco-600">{matchedPackage.billReduction}</p>
                <p className="text-[10px] text-gray-500">Bill reduction</p>
              </div>
              <div className="bg-white rounded-xl py-2 px-1">
                <p className="text-base font-black text-gray-900">PKR {formatPrice(matchedPackage.price)}</p>
                <p className="text-[10px] text-gray-500">Package price</p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => openBooking({
                packageName: `Green Corridor — ${matchedPackage.name} (${matchedPackage.solarKw}kW)`,
                estimatedPrice: systemCost,
                notes: `Calculator result: ${numACs} ACs, battery: ${hasBattery}, monthly bill: PKR ${monthlyBill}`,
              })}
              className="inline-flex items-center justify-center gap-2 bg-eco-500 hover:bg-eco-600 text-white font-bold px-8 py-4 rounded-2xl transition-all shadow-eco">
              <CalendarCheck className="w-5 h-5" /> Book Free Site Assessment
            </button>
            <a href={waConsult} target="_blank" rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium px-6 py-4 rounded-2xl transition-all text-sm">
              <MessageCircle className="w-4 h-4 text-[#25D366]" /> Ask on WhatsApp
            </a>
          </div>
          <p className="text-xs text-gray-400 mt-3 text-center">Our engineer visits your home, measures your load, and designs a system. Free of charge.</p>
        </div>

        <div className="text-center mt-6">
          <Link to="/solar-calculator"
            className="text-sm text-brand-600 font-semibold hover:text-brand-700 inline-flex items-center gap-1">
            Need a more detailed calculation? Use the full Solar Calculator <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ── PACKAGES ─────────────────────────────────────────────── */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <p className="text-eco-600 text-xs font-bold uppercase tracking-widest mb-3">Packages</p>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900">Choose your level of freedom.</h2>
            <p className="text-gray-500 mt-3">All packages include delivery, installation, wiring &amp; workmanship warranty.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {PACKAGES.map(pkg => {
              const plan3mPkg = calcPlan(pkg.price, '3m')
              return (
                <div key={pkg.id}
                  className={`bg-white rounded-3xl border-2 ${pkg.color} relative flex flex-col shadow-apple overflow-hidden`}>

                  {pkg.popular && (
                    <div className="absolute -top-0 left-0 right-0 bg-eco-500 text-white text-[11px] font-bold text-center py-1.5 tracking-wide">
                      ⭐ MOST POPULAR
                    </div>
                  )}

                  <div className={`p-6 flex flex-col flex-1 ${pkg.popular ? 'pt-8' : ''}`}>

                    {/* Badge + name */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className={`text-xs font-bold px-3 py-1.5 rounded-full inline-block mb-1.5 ${pkg.badgeColor}`}>{pkg.name}</p>
                        <p className="text-gray-500 text-sm leading-snug">{pkg.tagline}</p>
                      </div>
                    </div>

                    {/* System spec badges */}
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      <span className="bg-amber-50 border border-amber-100 text-amber-800 text-[11px] font-semibold px-2.5 py-1 rounded-full">
                        ☀️ {pkg.solarKw}kW Solar
                      </span>
                      {pkg.batteryKwh && (
                        <span className="bg-blue-50 border border-blue-100 text-blue-800 text-[11px] font-semibold px-2.5 py-1 rounded-full">
                          🔋 {pkg.batteryKwh}kWh Battery
                        </span>
                      )}
                      <span className="bg-gray-50 border border-gray-200 text-gray-700 text-[11px] font-semibold px-2.5 py-1 rounded-full">
                        ❄️ {pkg.acCount} AC{pkg.acCount !== 1 ? 's' : ''} ({pkg.acTonnage})
                      </span>
                    </div>

                    {/* Performance metrics */}
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <div className="bg-eco-50 border border-eco-100 rounded-xl p-3 text-center">
                        <p className="text-sm font-black text-eco-700">{pkg.monthlyUnitsMin}–{pkg.monthlyUnitsMax}</p>
                        <p className="text-[10px] text-eco-600">units/month generated</p>
                      </div>
                      <div className="bg-eco-50 border border-eco-100 rounded-xl p-3 text-center">
                        <p className="text-sm font-black text-eco-700">{pkg.billReduction}</p>
                        <p className="text-[10px] text-eco-600">est. bill reduction</p>
                      </div>
                    </div>

                    {/* Technical components */}
                    <div className="bg-gray-50 rounded-xl p-3 mb-4 space-y-1.5">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">System Components</p>
                      <div className="flex items-start gap-2">
                        <span className="text-amber-500 text-xs mt-px shrink-0">☀️</span>
                        <span className="text-xs text-gray-700">{pkg.panelCount} × {pkg.panelWatts}W Crown Bi-Facial Solar Panels</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-blue-500 text-xs mt-px shrink-0">⚡</span>
                        <span className="text-xs text-gray-700">{pkg.inverterModel} <span className="text-gray-400">({pkg.inverterWarranty} warranty)</span></span>
                      </div>
                      {pkg.batteryModel && (
                        <div className="flex items-start gap-2">
                          <span className="text-eco-500 text-xs mt-px shrink-0">🔋</span>
                          <span className="text-xs text-gray-700">
                            {pkg.batteryModel}
                            {pkg.batteryWarranty && <span className="text-gray-400"> ({pkg.batteryWarranty} warranty)</span>}
                          </span>
                        </div>
                      )}
                      <div className="flex items-start gap-2">
                        <span className="text-gray-400 text-xs mt-px shrink-0">❄️</span>
                        <span className="text-xs text-gray-700">{pkg.acCount} {pkg.acBrands} Inverter AC{pkg.acCount !== 1 ? 's' : ''} ({pkg.acTonnage})</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-gray-400 text-xs mt-px shrink-0">🔧</span>
                        <span className="text-xs text-gray-700">All wiring, electrical equipment, transport & installation</span>
                      </div>
                    </div>

                    {/* Warranties */}
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      <span className="bg-blue-50 border border-blue-100 text-blue-700 text-[11px] font-medium px-2.5 py-1 rounded-full">
                        🛡 {pkg.workmanshipWarranty} workmanship
                      </span>
                      <span className="bg-blue-50 border border-blue-100 text-blue-700 text-[11px] font-medium px-2.5 py-1 rounded-full">
                        🛡 25-yr panel warranty
                      </span>
                    </div>

                    {/* Price */}
                    <div className="mb-4 mt-auto">
                      <p className="text-3xl font-black text-gray-900">PKR {formatPrice(pkg.price)}</p>
                      {pkg.price <= 700_000 ? (
                        <p className="text-xs text-gray-500 mt-1">
                          or PKR {formatPrice(plan3mPkg.advance)} advance + PKR {formatPrice(plan3mPkg.monthly)}/mo × 2
                          <span className="block text-amber-600 font-medium mt-0.5">Min. 40% advance required</span>
                        </p>
                      ) : (
                        <p className="text-xs text-gray-500 mt-1">
                          Cash payment only <span className="text-gray-400">(above PKR 700,000 limit)</span>
                        </p>
                      )}
                    </div>

                    {/* CTAs */}
                    <button
                      onClick={() => openBooking({
                        packageName: `Green Corridor — ${pkg.name} (${pkg.solarKw}kW, ${pkg.acCount} AC)`,
                        estimatedPrice: pkg.price,
                        notes: `${pkg.panelCount}×${pkg.panelWatts}W panels, ${pkg.inverterModel}${pkg.batteryModel ? `, ${pkg.batteryModel}` : ''}, ${pkg.acCount} AC`,
                      })}
                      className={`w-full py-3.5 rounded-2xl font-bold text-sm transition-all mb-2 flex items-center justify-center gap-2 ${
                        pkg.popular
                          ? 'bg-eco-500 hover:bg-eco-600 text-white shadow-eco'
                          : 'bg-gray-900 hover:bg-gray-800 text-white'
                      }`}>
                      <CalendarCheck className="w-4 h-4" /> Book This Package
                    </button>
                    <a href={waSales(`Hi, I'm interested in the Green Corridor ${pkg.name} package (${pkg.solarKw}kW, ${pkg.acCount} AC).`)}
                      target="_blank" rel="noreferrer"
                      className="w-full py-2.5 rounded-2xl border border-gray-200 text-gray-500 hover:bg-gray-50 text-xs font-medium text-center transition-all flex items-center justify-center gap-1.5">
                      <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" /> Questions? Ask on WhatsApp
                    </a>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Net metering notice — honest, prominent, correctly positioned */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-2xl px-5 py-4 text-sm text-blue-900">
            <p className="font-bold mb-1 flex items-center gap-2">
              <span>ℹ️</span> About Net Metering
            </p>
            <p>
              K-Electric (KE) only approves Net Metering for systems of <strong>{NET_METERING_MIN_KW}kW or above</strong>.
              None of the packages above are eligible — they operate as standard grid-tied systems.
              If Net Metering is a priority, contact us for a custom 10kW+ system.
              Net Metering adds <strong>PKR {formatPrice(NET_METERING_ADDON_PRICE)}</strong> to the system cost.
            </p>
          </div>

          <p className="text-center text-xs text-gray-400 mt-4">
            All prices are estimates. Final quote provided after free site assessment. Prices subject to equipment availability.
          </p>
        </div>
      </section>

      {/* ── SAVINGS VISUAL ───────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { icon: TrendingDown, stat: 'Up to 85%', label: 'Bill reduction (based on full load + battery system)', color: 'text-eco-500', caveat: true },
            { icon: Sun,          stat: '25 Years',  label: 'Panel performance warranty',     color: 'text-amber-500', caveat: false },
            { icon: Zap,          stat: '1 Day',     label: 'Average installation time',      color: 'text-blue-500', caveat: false },
            { icon: CheckCircle,  stat: '100%',      label: 'Genuine DISCO-approved equipment', color: 'text-eco-500', caveat: false },
          ].map(item => (
            <div key={item.label} className="p-6">
              <item.icon className={`w-8 h-8 ${item.color} mx-auto mb-3`} />
              <p className={`text-3xl font-black ${item.color} mb-1`}>{item.stat}</p>
              <p className="text-sm text-gray-500">{item.label}</p>
              {item.caveat && <p className="text-[10px] text-gray-400 mt-1">Actual savings depend on your usage and load profile</p>}
            </div>
          ))}
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────────── */}
      <section className="bg-gray-950 py-20 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <Leaf className="w-10 h-10 text-eco-400 mx-auto mb-6" />
          <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
            Start your green journey today.
          </h2>
          <p className="text-gray-400 mb-8 text-lg">
            Free site assessment. No obligation. Our engineer visits, measures your load, and designs your system.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => openBooking({ packageName: 'Green Corridor — Free Site Assessment', notes: 'Footer CTA' })}
              className="inline-flex items-center justify-center gap-2 bg-eco-500 hover:bg-eco-600 text-white font-bold px-8 py-4 rounded-2xl transition-all shadow-eco">
              <CalendarCheck className="w-5 h-5" /> Book Free Site Assessment
            </button>
            <Link to="/solar-calculator"
              className="inline-flex items-center justify-center gap-2 border border-gray-700 text-gray-300 hover:bg-gray-800 font-medium px-8 py-4 rounded-2xl transition-all">
              <Calculator className="w-5 h-5" /> Full Solar Calculator
            </Link>
          </div>
          <p className="text-gray-600 text-xs mt-5">
            Prefer to chat? <a href={waConsult} target="_blank" rel="noreferrer" className="text-eco-400 hover:underline inline-flex items-center gap-1"><MessageCircle className="w-3 h-3" /> WhatsApp us</a>
          </p>
        </div>
      </section>
    </div>
  )
}
