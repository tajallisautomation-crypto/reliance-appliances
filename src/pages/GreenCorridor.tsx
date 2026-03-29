import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Leaf, Sun, Zap, Bike, TrendingDown, CheckCircle, MessageCircle, Calculator } from 'lucide-react'
import SEO from '@/components/ui/SEO'
import AnimatedCounter from '@/components/ui/AnimatedCounter'
import { calcPlan } from '@/lib/plans'
import { formatPrice } from '@/lib/api'
import { waSales } from '@/lib/whatsapp'

const JOURNEY_STEPS = [
  {
    number: '01',
    icon: Sun,
    iconColor: 'text-amber-400',
    bgColor: 'bg-amber-400/10',
    title: 'Solar Panels on Your Roof',
    subtitle: 'Generate your own electricity',
    body: 'A 5kW system generates ~600 units per month — enough to cover a typical 3-bedroom home in Karachi. Installed in one day. Eligible for DISCO net metering, meaning you earn credits when generating more than you consume.',
    stats: [
      { label: 'Units/month', value: '600+' },
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
    icon: Bike,
    iconColor: 'text-eco-400',
    bgColor: 'bg-eco-400/10',
    title: 'Ride an Electric Motorcycle',
    subtitle: 'PKR 1–2/km vs PKR 20+/km on petrol',
    body: 'Charge your electric motorcycle overnight on solar power and ride for a fraction of the petrol cost. The economics are clear: an electric bike costs 10–20× less per kilometre to run. Combined with your solar system, your daily commute is effectively free.',
    stats: [
      { label: 'Cost per km', value: 'PKR 1–2' },
      { label: 'Petrol comparison', value: '90% cheaper' },
      { label: 'Daily charge', value: 'Overnight' },
    ],
  },
]

const PACKAGES = [
  {
    name: 'Starter',
    tagline: 'Perfect for 2-bedroom homes',
    includes: ['3kW Solar System', '1 Inverter AC (1 ton)', 'Net Metering Setup', '1-year workmanship warranty'],
    price: 450000,
    popular: false,
    color: 'border-gray-200',
    badgeColor: 'bg-gray-100 text-gray-700',
  },
  {
    name: 'Home Complete',
    tagline: 'The most popular choice',
    includes: ['5kW Solar System', '2 Inverter ACs (1.5 ton each)', 'Net Metering + Monitoring App', '3-year workmanship warranty'],
    price: 850000,
    popular: true,
    color: 'border-eco-500',
    badgeColor: 'bg-eco-500 text-white',
  },
  {
    name: 'Total Freedom',
    tagline: 'For larger homes + electric motorcycle owners',
    includes: ['8kW Solar System', '4 Inverter ACs', 'Electric Motorcycle (on installments)', '5-year workmanship warranty'],
    price: 1400000,
    popular: false,
    color: 'border-gray-200',
    badgeColor: 'bg-gray-100 text-gray-700',
  },
]

export default function GreenCorridor() {
  const [monthlyBill, setMonthlyBill] = useState(8000)
  const [numACs,      setNumACs]      = useState(2)
  const [hasEV,       setHasEV]       = useState(false)

  // Simplified savings estimate
  const solarSavingPct  = Math.min(0.85, 0.55 + numACs * 0.05 + (hasEV ? 0.10 : 0))
  const monthlySaving   = Math.round(monthlyBill * solarSavingPct / 100) * 100
  const annualSaving    = monthlySaving * 12
  const systemCost      = (numACs <= 2 ? 450000 : numACs <= 4 ? 850000 : 1400000) + (hasEV ? 250000 : 0)
  const paybackYears    = annualSaving > 0 ? +(systemCost / annualSaving).toFixed(1) : 0
  const plan3m          = calcPlan(systemCost, '3m')

  const waConsult = waSales('Hi, I\'m interested in the Green Corridor solar + inverter AC package. Can I book a free consultation?')

  return (
    <div className="min-h-screen bg-white">
      <SEO
        path="/green-corridor"
        title="Green Corridor — Solar, Inverter ACs & Electric Motorcycles | Reliance by Tajallis"
        description="Cut your electricity bill by up to 85%. Complete solar systems, inverter ACs and electric motorcycles on easy installments. Free site assessment in Karachi."
        keywords="solar system karachi, inverter ac karachi, electric motorcycle pakistan, solar installation karachi, green energy karachi"
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
            <Leaf className="w-4 h-4" /> Reliance Green Corridor
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-white leading-[1.05] tracking-tight mb-6">
            Your home.<br />
            <span className="text-eco-400">Off the grid.</span>
          </h1>
          <p className="text-gray-400 text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
            Solar · Inverter ACs · Electric Motorcycles<br />
            One roof. One partner. Zero compromise.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#calculator"
              className="inline-flex items-center justify-center gap-2 bg-eco-500 hover:bg-eco-600 text-white font-bold px-8 py-4 rounded-2xl transition-all shadow-eco">
              <Calculator className="w-5 h-5" /> Calculate My Savings
            </a>
            <a href={waConsult} target="_blank" rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 border border-gray-700 text-gray-300 hover:bg-gray-800 font-medium px-8 py-4 rounded-2xl transition-all">
              <MessageCircle className="w-5 h-5" /> Book Free Consultation
            </a>
          </div>
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
                <input type="number" min={1000} step={500} value={monthlyBill}
                  onChange={e => setMonthlyBill(Math.max(1000, Number(e.target.value)))}
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

            {/* EV toggle */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-3">
                Electric motorcycle?
              </label>
              <div className="flex gap-2">
                {(['No', 'Yes'] as const).map((val) => (
                  <button key={val} onClick={() => setHasEV(val === 'Yes')}
                    className={`flex-1 py-3 rounded-xl text-sm font-bold border transition-all ${(val === 'Yes') === hasEV ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-200 text-gray-700 hover:border-gray-400'}`}>
                    {val}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-apple animate-fade-in" key={`${monthlyBill}-${numACs}-${hasEV}`}>
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
            </div>
          </div>

          <div className="mt-6 text-center">
            <a href={waConsult} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 bg-eco-500 hover:bg-eco-600 text-white font-bold px-8 py-4 rounded-2xl transition-all shadow-eco">
              <MessageCircle className="w-5 h-5" /> Book Free Site Assessment
            </a>
            <p className="text-xs text-gray-400 mt-3">Our engineer visits your home, measures your load, and designs a system. Free of charge.</p>
          </div>
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
            <p className="text-gray-500 mt-3">All packages include delivery, installation, and net metering setup.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {PACKAGES.map(pkg => (
              <div key={pkg.name}
                className={`bg-white rounded-3xl p-7 border-2 ${pkg.color} relative flex flex-col shadow-apple`}>
                {pkg.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="bg-eco-500 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-eco">Most Popular</span>
                  </div>
                )}
                <p className={`text-xs font-bold px-3 py-1.5 rounded-full inline-self-start w-fit mb-4 ${pkg.badgeColor}`}>
                  {pkg.name}
                </p>
                <p className="text-gray-500 text-sm mb-5">{pkg.tagline}</p>
                <div className="mb-6">
                  <p className="text-3xl font-black text-gray-900">PKR {formatPrice(pkg.price)}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    or PKR {formatPrice(calcPlan(pkg.price, '3m').monthly)}/mo (3-payment plan)
                  </p>
                </div>
                <ul className="space-y-2.5 flex-1 mb-6">
                  {pkg.includes.map(item => (
                    <li key={item} className="flex items-start gap-2 text-sm text-gray-700">
                      <CheckCircle className="w-4 h-4 text-eco-500 flex-shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                  <li className="flex items-start gap-2 text-sm text-gray-700">
                    <CheckCircle className="w-4 h-4 text-eco-500 flex-shrink-0 mt-0.5" />
                    25-year panel warranty
                  </li>
                </ul>
                <a href={waSales(`Hi, I'm interested in the Green Corridor ${pkg.name} package.`)}
                  target="_blank" rel="noreferrer"
                  className={`w-full py-3.5 rounded-2xl font-bold text-center text-sm transition-all block ${
                    pkg.popular
                      ? 'bg-eco-500 hover:bg-eco-600 text-white shadow-eco'
                      : 'bg-gray-900 hover:bg-gray-800 text-white'
                  }`}>
                  Get This Package
                </a>
              </div>
            ))}
          </div>

          <div className="mt-6 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 text-sm text-amber-800">
            <strong>KE Net Metering note:</strong> K-Electric (KE) only approves Net Metering for systems of <strong>10kW or above</strong>. The Starter (3kW) and Home Complete (5kW) packages are not eligible for KE Net Metering — they operate as standard grid-tied or hybrid systems. The Total Freedom (8kW) package is also below the KE threshold. Contact us for a 10kW+ system if Net Metering is a priority.
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
            { icon: TrendingDown, stat: 'Up to 85%', label: 'Reduction in electricity bill',  color: 'text-eco-500' },
            { icon: Sun,          stat: '25 Years',  label: 'Panel performance warranty',     color: 'text-amber-500' },
            { icon: Zap,          stat: '1 Day',     label: 'Average installation time',      color: 'text-blue-500' },
            { icon: CheckCircle,  stat: '100%',      label: 'Genuine DISCO-approved equipment', color: 'text-eco-500' },
          ].map(item => (
            <div key={item.label} className="p-6">
              <item.icon className={`w-8 h-8 ${item.color} mx-auto mb-3`} />
              <p className={`text-3xl font-black ${item.color} mb-1`}>{item.stat}</p>
              <p className="text-sm text-gray-500">{item.label}</p>
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
            Free consultation. Free site assessment. No obligation.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href={waConsult} target="_blank" rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-eco-500 hover:bg-eco-600 text-white font-bold px-8 py-4 rounded-2xl transition-all shadow-eco">
              <MessageCircle className="w-5 h-5" /> Book Free Consultation
            </a>
            <Link to="/solar-calculator"
              className="inline-flex items-center justify-center gap-2 border border-gray-700 text-gray-300 hover:bg-gray-800 font-medium px-8 py-4 rounded-2xl transition-all">
              <Calculator className="w-5 h-5" /> Full Solar Calculator
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
