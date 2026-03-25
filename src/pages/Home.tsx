import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, Sun, Calculator, ShieldCheck, Truck, CreditCard, Headphones,
  ChevronRight, Zap, Leaf, MessageCircle,
} from 'lucide-react'
import { getProducts, getProductCount, DEFAULT_CATEGORIES, type Product, formatPrice } from '../lib/api'
import { calcPlan } from '../lib/plans'
import ProductCard from '../components/products/ProductCard'
import AnimatedCounter from '../components/ui/AnimatedCounter'
import SEO from '../components/ui/SEO'
import { waSales } from '../lib/whatsapp'
import OfferBannerSlider from '../components/OfferBannerSlider'

const BRANDS = [
  { name: 'Haier',     slug: 'haier',     color: '#e31837', desc: "World's #1 home appliance brand" },
  { name: 'Dawlance',  slug: 'dawlance',  color: '#003087', desc: "Pakistan's most trusted brand" },
  { name: 'Gree',      slug: 'gree',      color: '#00843d', desc: 'Energy-efficient inverter ACs' },
  { name: 'EcoStar',   slug: 'ecostar',   color: '#0070c0', desc: 'Smart TVs & air conditioners' },
  { name: 'Crown',     slug: 'crown',     color: '#1a1a2e', desc: 'Premium solar solutions' },
  { name: 'Westpoint', slug: 'westpoint', color: '#2563eb', desc: 'Quality kitchen & home appliances' },
]

const WHY_RELIANCE = [
  { icon: ShieldCheck, title: 'Authentic Products',   desc: 'Every product 100% genuine with official warranty.',          color: 'blue' },
  { icon: CreditCard,  title: 'Easy Installments',    desc: '2–12 month plans, no bank account required.',                color: 'green' },
  { icon: Truck,       title: 'Home Delivery',        desc: 'Fast delivery & professional installation service.',          color: 'orange' },
  { icon: Headphones,  title: 'After-Sale Support',   desc: 'Dedicated service team, follow-up & warranty claims.',       color: 'purple' },
]

const PLAN_OPTIONS = [
  { key: '2m'  as const, label: '2 Payments'  },
  { key: '3m'  as const, label: '3 Payments'  },
  { key: '6m'  as const, label: '6 Payments'  },
  { key: '12m' as const, label: '12 Payments' },
]

const TOOLS = [
  { icon: '🔢', title: 'Solar Calculator',    desc: 'Find out exactly what solar system you need.',       href: '/solar-calculator' },
  { icon: '💡', title: 'Bill Savings Calc',   desc: 'See how much solar can reduce your electricity bill.',href: '/tools' },
  { icon: '📈', title: 'Payback Calculator',  desc: 'Calculate when your solar investment pays back.',     href: '/tools' },
  { icon: '⚡', title: 'Net Metering Check',  desc: "Check if you're eligible to sell power to the grid.", href: '/tools' },
]

export default function Home() {
  const [featured,       setFeatured]      = useState<Product[]>([])
  const [heroProduct,    setHeroProduct]   = useState<Product | null>(null)
  const [loading,        setLoading]       = useState(true)
  const [totalProducts,  setTotalProducts] = useState(0)
  const [activePlan,     setActivePlan]    = useState<'2m'|'3m'|'6m'|'12m'>('3m')
  const [samplePrice,    setSamplePrice]   = useState(150000)

  useEffect(() => {
    getProducts({ featured: 'true' }).then(d => {
      setHeroProduct(d.products[0] ?? null)
      setFeatured(d.products.slice(0, 8))
      setLoading(false)
    })
    getProductCount().then(setTotalProducts)
  }, [])

  const calc = calcPlan(samplePrice, activePlan)

  return (
    <div className="min-h-screen bg-white">
      <SEO
        title="Reliance by Tajallis — Premium Home Appliances Karachi"
        description="Shop ACs, refrigerators, washing machines, TVs & solar systems on easy installments. Karachi's most trusted appliance store since 2015. Genuine products, home delivery & after-sale support."
        keywords="home appliances karachi, buy ac karachi, refrigerator installment karachi, solar panels karachi, haier dawlance price pakistan"
        path="/"
      />

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16 md:pt-20 md:pb-24">
        <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* Left: text */}
          <div>
            <p className="text-brand-500 text-xs font-bold uppercase tracking-[0.2em] mb-5">
              Karachi · Since 2015 · 11 Years of Trust
            </p>
            <h1 className="text-5xl md:text-6xl lg:text-[4.5rem] font-black text-gray-900 leading-[1.04] tracking-tight mb-6">
              Pakistan's Most<br />Trusted Home<br />
              <span className="text-brand-500">Technology Partner.</span>
            </h1>
            <p className="text-lg text-gray-500 leading-relaxed mb-8 max-w-md">
              Every appliance. Every service. Cash or installments.<br className="hidden md:block" />
              One call — delivered across Karachi to your doorstep.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/products"
                className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-bold px-7 py-4 rounded-2xl shadow-brand transition-all">
                Shop Products <ArrowRight className="w-4 h-4" />
              </Link>
              <a href={waSales('Hi, I would like to book a consultation.')}
                target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white font-bold px-7 py-4 rounded-2xl transition-all">
                <MessageCircle className="w-4 h-4" /> Book Consultation
              </a>
            </div>
          </div>

          {/* Right: hero visual */}
          <div className="relative hidden md:block">
            <div className="aspect-square rounded-4xl overflow-hidden bg-gradient-to-br from-brand-50 to-gray-100 shadow-apple-2xl">
              {heroProduct?.thumbnail ? (
                <img
                  src={heroProduct.thumbnail}
                  alt={heroProduct.simplified_name || heroProduct.model}
                  className="w-full h-full object-cover animate-fade-in"
                  loading="eager"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 animate-pulse" />
              )}
            </div>
            {/* Floating badges */}
            <div className="absolute -bottom-5 -left-5 bg-white rounded-2xl shadow-apple-xl px-5 py-4 border border-gray-100 animate-slide-up">
              <p className="text-2xl font-black text-gray-900 leading-none">14,000+</p>
              <p className="text-xs text-gray-400 mt-0.5 font-medium">Homes served</p>
            </div>
            <div className="absolute -top-5 -right-5 bg-gray-900 text-white rounded-2xl shadow-apple-xl px-5 py-4 animate-slide-up">
              <p className="text-2xl font-black leading-none text-brand-400">23K+</p>
              <p className="text-xs opacity-60 mt-0.5 font-medium">Moments created</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── TRUST STRIP ──────────────────────────────────────────── */}
      <section className="bg-gray-950 py-14">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { target: 11,    suffix: ' Years', label: 'In Business' },
            { target: 14000, suffix: '+',      label: 'Homes Served' },
            { target: 80,    suffix: '%',       label: 'Customer Retention' },
            { target: 23000, suffix: '+',      label: 'Moments Created' },
          ].map(item => (
            <div key={item.label}>
              <p className="text-4xl md:text-5xl font-black text-brand-400 mb-1">
                <AnimatedCounter target={item.target} suffix={item.suffix} />
              </p>
              <p className="text-gray-500 text-sm">{item.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CATEGORY GRID ────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-5">Shop by Category</p>
        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-2.5">
          {DEFAULT_CATEGORIES.map(cat => (
            <Link key={cat.id} to={`/products/category/${cat.slug}`}
              className="group flex flex-col items-center gap-1.5 py-3.5 px-1.5 rounded-2xl bg-gray-50 hover:bg-brand-50 border border-transparent hover:border-brand-200 transition-all duration-200 text-center">
              <span className="text-2xl group-hover:scale-110 transition-transform duration-200 leading-none">{cat.icon}</span>
              <span className="text-[10px] font-semibold text-gray-600 group-hover:text-brand-700 leading-tight">{cat.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── OFFER BANNERS ────────────────────────────────────────── */}
      <OfferBannerSlider />

      {/* ── INSTALLMENT ENGINE ───────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 pb-4">
        <div className="bg-gray-950 rounded-3xl p-8 md:p-12">
          <div className="text-center mb-10">
            <p className="text-brand-400 text-xs font-bold uppercase tracking-widest mb-3">Flexible Installments</p>
            <h2 className="text-3xl md:text-4xl font-black text-white mb-3">Own it today. Pay your way.</h2>
            <p className="text-gray-400">No bank account needed · No credit check · No hidden charges.</p>
          </div>

          {/* Plan tabs */}
          <div className="flex gap-1 bg-gray-800/60 p-1 rounded-2xl mb-8 max-w-md mx-auto">
            {PLAN_OPTIONS.map(pl => (
              <button key={pl.key} onClick={() => setActivePlan(pl.key)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  activePlan === pl.key
                    ? 'bg-white text-gray-900 shadow-lg'
                    : 'text-gray-400 hover:text-gray-200'
                }`}>
                {pl.label}
              </button>
            ))}
          </div>

          {/* Live calculator */}
          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <div>
              <label className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2 block">
                Product price (PKR)
              </label>
              <input
                type="number"
                min={5000}
                step={5000}
                value={samplePrice}
                onChange={e => setSamplePrice(Math.max(5000, Number(e.target.value)))}
                className="w-full bg-gray-800 text-white text-2xl font-black rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-brand-500 border border-gray-700"
              />
              <p className="text-gray-600 text-xs mt-2">Try: 50,000 · 150,000 · 500,000</p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-apple-xl animate-fade-in" key={activePlan + samplePrice}>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Advance at delivery</p>
                  <p className="text-2xl font-black text-gray-900">PKR {formatPrice(calc.advance)}</p>
                </div>
                {calc.monthly > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Monthly × {calc.months - 1}</p>
                    <p className="text-2xl font-black text-brand-500">PKR {formatPrice(calc.monthly)}</p>
                  </div>
                )}
              </div>
              <div className="pt-3 border-t border-gray-100 flex justify-between text-sm">
                <span className="text-gray-500">Total cost</span>
                <span className="font-bold text-gray-900">PKR {formatPrice(calc.total)}</span>
              </div>
            </div>
          </div>

          <div className="text-center mt-8">
            <Link to="/installments"
              className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-bold px-8 py-3.5 rounded-full transition-colors shadow-brand">
              See All Installment Plans <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── GREEN CORRIDOR TEASER ─────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 py-4">
        <div className="relative bg-gray-950 rounded-3xl overflow-hidden">
          {/* Subtle grid background */}
          <div className="absolute inset-0 opacity-[0.04]"
            style={{ backgroundImage: 'linear-gradient(#4ade80 1px, transparent 1px), linear-gradient(90deg, #4ade80 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

          <div className="relative max-w-3xl mx-auto px-8 py-16 text-center">
            <div className="inline-flex items-center gap-2 bg-eco-500/15 text-eco-400 px-4 py-2 rounded-full text-sm font-semibold mb-6">
              <Leaf className="w-4 h-4" /> Green Corridor
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">
              Cut your electricity bill.<br />
              Power your home.<br />
              <span className="text-eco-400">Charge your car.</span>
            </h2>
            <p className="text-gray-400 text-lg mb-10 max-w-xl mx-auto">
              Solar · Inverter ACs · EV Charging — all from one company, on installments.
            </p>

            {/* Journey */}
            <div className="flex items-center justify-center gap-3 mb-10 flex-wrap">
              {[
                { emoji: '☀️', label: 'Solar Panels' },
                null,
                { emoji: '❄️', label: 'Inverter ACs' },
                null,
                { emoji: '⚡', label: 'EV Charging' },
              ].map((item, i) =>
                item === null ? (
                  <ArrowRight key={i} className="w-4 h-4 text-gray-600" />
                ) : (
                  <div key={i} className="bg-gray-800 border border-gray-700 rounded-2xl px-5 py-3 text-sm font-medium text-gray-200">
                    {item.emoji} {item.label}
                  </div>
                )
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/solar-calculator"
                className="inline-flex items-center justify-center gap-2 bg-eco-500 hover:bg-eco-600 text-white font-bold px-8 py-4 rounded-2xl transition-colors shadow-eco">
                <Calculator className="w-4 h-4" /> Calculate Your Savings
              </Link>
              <Link to="/green-corridor"
                className="inline-flex items-center justify-center gap-2 border border-gray-700 text-gray-300 hover:bg-gray-800 font-medium px-8 py-4 rounded-2xl transition-colors">
                Explore Green Corridor <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── SOLAR CTA ────────────────────────────────────────────── */}
      <section className="bg-gradient-to-r from-amber-500 via-brand-500 to-yellow-400 mx-4 md:mx-8 rounded-3xl overflow-hidden my-4">
        <div className="max-w-5xl mx-auto px-6 py-12 md:py-14 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-white">
            <div className="flex items-center gap-2 text-amber-100 text-sm font-medium mb-3"><Sun className="w-4 h-4" /> Solar Solutions</div>
            <h2 className="text-3xl md:text-4xl font-black mb-3">How much solar do you need?</h2>
            <p className="text-amber-100 text-lg max-w-lg">Add your appliances, get an instant solar system recommendation with customised pricing.</p>
          </div>
          <div className="flex flex-col gap-3 flex-shrink-0">
            <Link to="/solar-calculator"
              className="inline-flex items-center gap-2 bg-white text-brand-600 font-bold px-8 py-4 rounded-2xl hover:bg-orange-50 shadow-lg">
              <Calculator className="w-5 h-5" /> Solar Calculator
            </Link>
            <Link to="/solar"
              className="inline-flex items-center gap-2 border border-white/50 text-white font-medium px-8 py-3 rounded-2xl hover:bg-white/10 justify-center">
              View Solar Products
            </Link>
          </div>
        </div>
      </section>

      {/* ── BRANDS ───────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 pb-10 pt-6">
        <h2 className="text-2xl font-black text-gray-900 mb-6 text-center">Brands We Carry</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {BRANDS.map(b => (
            <Link key={b.slug} to={`/products?brand=${b.slug}`}
              className="group flex items-center gap-4 bg-white border border-gray-100 hover:border-brand-300 hover:shadow-apple-lg rounded-2xl p-5 transition-all">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-xl flex-shrink-0" style={{ backgroundColor: b.color }}>{b.name[0]}</div>
              <div>
                <div className="font-bold text-gray-800 group-hover:text-brand-700">{b.name}</div>
                <div className="text-xs text-gray-500">{b.desc}</div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-brand-500 ml-auto" />
            </Link>
          ))}
        </div>
      </section>

      {/* ── TOOLS ────────────────────────────────────────────────── */}
      <section className="bg-gray-50 py-14">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-10">
            <div className="text-brand-500 text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-1 justify-center"><Zap className="w-4 h-4" /> Free Tools</div>
            <h2 className="text-2xl md:text-3xl font-black text-gray-900">Make Smarter Decisions</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {TOOLS.map(t => (
              <Link key={t.title} to={t.href}
                className="group bg-white rounded-2xl border border-gray-100 hover:border-brand-300 hover:shadow-apple-lg p-6 transition-all">
                <div className="text-3xl mb-3">{t.icon}</div>
                <div className="font-bold text-gray-800 mb-1 group-hover:text-brand-700">{t.title}</div>
                <div className="text-sm text-gray-500 mb-4">{t.desc}</div>
                <div className="flex items-center gap-1 text-brand-600 text-sm font-semibold">Try it free <ChevronRight className="w-3 h-3" /></div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY RELIANCE ─────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 py-14">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-black text-gray-900">Why Choose Reliance?</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {WHY_RELIANCE.map(item => (
            <div key={item.title} className="text-center p-6">
              <div className={`w-14 h-14 bg-${item.color}-100 rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                <item.icon className={`w-7 h-7 text-${item.color}-600`} />
              </div>
              <h3 className="font-bold text-gray-800 mb-2">{item.title}</h3>
              <p className="text-sm text-gray-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURED PRODUCTS ────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 py-14">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-brand-500 text-xs font-bold uppercase tracking-widest mb-1">Featured</p>
            <h2 className="text-2xl md:text-3xl font-black text-gray-900">Top Picks for You</h2>
          </div>
          <Link to="/products?featured=true"
            className="hidden sm:flex items-center gap-1 text-brand-600 font-semibold text-sm hover:text-brand-700">
            View All <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        {loading
          ? <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  <div className="aspect-square bg-gray-100 animate-pulse" />
                  <div className="p-4 space-y-2.5">
                    <div className="h-2.5 w-16 bg-gray-100 rounded-full animate-pulse" />
                    <div className="h-3.5 w-3/4 bg-gray-100 rounded-full animate-pulse" />
                    <div className="h-3.5 w-1/2 bg-gray-100 rounded-full animate-pulse" />
                    <div className="h-3 w-1/3 bg-gray-100 rounded-full animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          : <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">{featured.map(p => <ProductCard key={p.id} product={p} />)}</div>
        }
        <div className="text-center mt-8">
          <Link to="/products"
            className="inline-flex items-center gap-2 border-2 border-brand-500 text-brand-600 font-bold px-8 py-3 rounded-2xl hover:bg-brand-500 hover:text-white transition-all">
            Browse All {totalProducts > 0 ? `${totalProducts} ` : ''}Products <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────────── */}
      <section className="bg-gray-900 text-white py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-black mb-4">Ready to shop?</h2>
          <p className="text-gray-400 mb-8 text-lg">
            Browse {totalProducts > 0 ? totalProducts : '400+'} products from Haier, Dawlance, Gree, EcoStar, Westpoint &amp; more with easy installments.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/products" className="bg-brand-500 hover:bg-brand-600 text-white font-bold px-8 py-4 rounded-2xl transition-colors">
              Shop All Products
            </Link>
            <a href={waSales()} target="_blank" rel="noreferrer"
              className="font-bold px-8 py-4 rounded-2xl flex items-center gap-2 justify-center transition-colors"
              style={{ background: '#25d366' }}>
              <MessageCircle className="w-4 h-4" /> WhatsApp Us
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
