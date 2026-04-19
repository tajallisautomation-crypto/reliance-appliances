import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, Calculator, ShieldCheck, Truck, CreditCard, Headphones,
  ChevronRight, Zap, Leaf, Image,
  AirVent, Refrigerator, Shirt, Tv, Sun, UtensilsCrossed, Droplets, Plug,
  Snowflake, CalendarDays, Users, Star, Package,
} from 'lucide-react'
import { getProducts, getProductCount, type Product, formatPrice } from '../lib/api'

// Shop-by-category — 9 stable main categories only. Subcategories live inside filters/BYOP/buying guides.
const HOME_CATEGORIES = [
  { id: 'air-conditioners',   name: 'Air Conditioners',  Icon: AirVent,          color: 'text-blue-500',   to: '/products?category=air-conditioners'   },
  { id: 'refrigerators',      name: 'Refrigerators',     Icon: Refrigerator,     color: 'text-cyan-500',   to: '/products?category=refrigerators'      },
  { id: 'washing-machines',   name: 'Washing Machines',  Icon: Shirt,            color: 'text-indigo-500', to: '/products?category=washing-machines'   },
  { id: 'freezers',           name: 'Freezers',          Icon: Snowflake,        color: 'text-sky-500',    to: '/products?category=freezers'           },
  { id: 'televisions',        name: 'Televisions',       Icon: Tv,               color: 'text-gray-700',   to: '/products?category=televisions'        },
  { id: 'solar',              name: 'Solar & Energy',    Icon: Sun,              color: 'text-amber-500',  to: '/solar'                                },
  { id: 'kitchen-appliances', name: 'Kitchen',           Icon: UtensilsCrossed,  color: 'text-orange-500', to: '/products?category=kitchen-appliances' },
  { id: 'water-dispensers',   name: 'Water Dispensers',  Icon: Droplets,         color: 'text-teal-500',   to: '/products?category=water-dispensers'   },
  { id: 'small-appliances',   name: 'Small Appliances',  Icon: Plug,             color: 'text-purple-500', to: '/products?category=small-appliances'   },
]
import { calcPlan } from '../lib/plans'
import ProductCard from '../components/products/ProductCard'
import SEO from '../components/ui/SEO'
import OfferBannerSlider from '../components/OfferBannerSlider'
import { getInstallationImages, type MediaItem } from '../lib/gallery'

// Brand list — preferred brands (Haier, Crown, Westpoint) listed first for merchandising visibility
const BRANDS = [
  { name: 'Haier',     slug: 'haier',     color: '#e31837', desc: "World's #1 home appliance brand",     featured: true  },
  { name: 'Crown',     slug: 'crown',     color: '#1a1a2e', desc: 'Premium solar & home solutions',      featured: true  },
  { name: 'Westpoint', slug: 'westpoint', color: '#2563eb', desc: 'Quality kitchen & home appliances',   featured: true  },
  { name: 'Dawlance',  slug: 'dawlance',  color: '#003087', desc: "Pakistan's most trusted refrigerators", featured: false },
  { name: 'Gree',      slug: 'gree',      color: '#00843d', desc: 'Energy-efficient inverter ACs',       featured: false },
  { name: 'EcoStar',   slug: 'ecostar',   color: '#0070c0', desc: 'Smart TVs & air conditioners',        featured: false },
]


const PLAN_OPTIONS = [
  { key: '2m'  as const, label: '2 Payments'  },
  { key: '3m'  as const, label: '3 Payments'  },
  { key: '6m'  as const, label: '6 Payments'  },
  { key: '12m' as const, label: '12 Payments' },
]

const TOOLS = [
  { icon: '🔢', title: 'Solar Calculator',    desc: 'Find out exactly what solar system you need.',       href: '/solar-calculator' },
  { icon: '💡', title: 'Bill Savings Calc',   desc: 'Estimate your solar savings based on your actual load and usage.',href: '/tools' },
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
  const [galleryStrip,   setGalleryStrip]  = useState<MediaItem[]>([])

  // Preferred brands surfaced first in homepage featured section
  const PREFERRED_BRANDS = ['haier', 'crown', 'westpoint']

  useEffect(() => {
    getProducts({ featured: 'true' }).then(d => {
      const all = d.products
      // Sort: preferred brands first, then rest — preserving featured ordering within each group
      const preferred = all.filter(p => PREFERRED_BRANDS.includes(p.brand.toLowerCase()))
      const others    = all.filter(p => !PREFERRED_BRANDS.includes(p.brand.toLowerCase()))
      const sorted    = [...preferred, ...others]
      setHeroProduct(sorted[0] ?? null)
      setFeatured(sorted.slice(0, 8))
      setLoading(false)
    }).catch(() => setLoading(false))
    getProductCount().then(setTotalProducts)
    getInstallationImages(6).then(setGalleryStrip)
  }, [])

  const calc = calcPlan(samplePrice, activePlan)

  return (
    <div className="min-h-screen bg-white">
      <SEO
        title="Tajalli's Home & Commercial Solutions — Appliances & Solar Karachi"
        description="Buy ACs, refrigerators, washing machines, solar systems & kitchen appliances on easy installments in Karachi. Pakistan's most trusted store since 2015. Home delivery & after-sale support."
        keywords="home appliances karachi, buy ac karachi, solar panels karachi, haier dawlance price pakistan, refrigerator installment karachi, washing machine price karachi"
        path="/"
      />

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16 md:pt-20 md:pb-24">
        <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* Left: text */}
          <div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-5">
              <span className="text-brand-500 text-xs font-bold uppercase tracking-[0.2em]">Karachi</span>
              <span className="text-brand-300 text-xs">·</span>
              <span className="text-brand-500 text-xs font-bold uppercase tracking-[0.2em]">Since 2015</span>
              <span className="text-brand-300 text-xs">·</span>
              <span className="text-brand-500 text-xs font-bold uppercase tracking-[0.2em] whitespace-nowrap">11 Years of Trust</span>
            </div>
            <h1 className="leading-[1.06] tracking-tight mb-6">
              <span className="block text-2xl md:text-3xl lg:text-4xl font-bold text-gray-400 mb-2 tracking-normal">
                Home Appliances &amp; Solar Solutions
              </span>
              <span className="block text-5xl md:text-6xl lg:text-[4.5rem] font-black text-brand-500">
                All on Installments.
              </span>
            </h1>
            <p className="text-lg text-gray-500 leading-relaxed mb-8 max-w-md">
              Karachi's trusted store for ACs, fridges, washing machines, solar & more — since 2015.
              Cash or installments. Delivered to your door.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/products"
                className="inline-flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-bold px-7 py-4 rounded-2xl shadow-brand transition-all min-w-[168px]">
                Shop Now <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/solar"
                className="inline-flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white font-bold px-7 py-4 rounded-2xl transition-all min-w-[168px]">
                <Zap className="w-4 h-4" /> Solar Solutions
              </Link>
            </div>
            <div className="mt-6 pt-5 border-t border-gray-100">
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { Icon: CalendarDays, value: '11 Years',  label: 'Established 2015', color: 'text-brand-500' },
                  { Icon: Users,        value: '14,400+',   label: 'Customer Loyalty', color: 'text-blue-500'  },
                  { Icon: Star,         value: '75%',       label: 'Repeat Customers', color: 'text-amber-500' },
                  { Icon: Package,      value: '24,000+',   label: 'Orders Fulfilled', color: 'text-green-500' },
                ].map(({ Icon, value, label, color }) => (
                  <div key={label}
                    className="group flex items-center gap-3 bg-gray-50 hover:bg-white border border-transparent hover:border-gray-200 hover:shadow-soft rounded-2xl px-3.5 py-3 transition-all duration-200 cursor-default">
                    <Icon className={`w-5 h-5 ${color} shrink-0`} />
                    <div>
                      <p className="text-sm font-black text-gray-900 leading-none">{value}</p>
                      <p className="text-[11px] text-gray-400 font-medium mt-0.5 leading-none">{label}</p>
                    </div>
                  </div>
                ))}
              </div>
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
          </div>
        </div>
      </section>


      {/* ── CATEGORY GRID ────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-16">
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="text-xl font-black text-gray-900">Shop by Category</h2>
          <Link to="/products" className="text-sm text-brand-600 font-semibold hover:text-brand-700 flex items-center gap-1">
            All products <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-9 gap-3 sm:gap-4">
          {HOME_CATEGORIES.map(({ id, name, Icon, color, to }) => (
            <Link key={id} to={to}
              className="group flex flex-col items-center gap-2 py-5 px-2 rounded-3xl bg-gray-50 hover:bg-brand-50 border border-transparent hover:border-brand-100 hover:shadow-sm transition-all duration-200 text-center">
              <Icon className={`w-7 h-7 ${color} group-hover:scale-110 transition-transform duration-200`} />
              <span className="text-[11px] font-bold text-gray-500 group-hover:text-brand-700 leading-tight">{name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── OFFER BANNERS ────────────────────────────────────────── */}
      <OfferBannerSlider />

      {/* ── MYOP PROMO ───────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 md:pt-32 pb-20">
        <div className="relative bg-gray-950 rounded-3xl overflow-hidden">
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.8) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.8) 1px,transparent 1px)', backgroundSize: '32px 32px' }} />
          <div className="relative flex flex-col md:flex-row items-center gap-8 px-8 py-10 md:py-12">
            <div className="flex-1 text-center md:text-left">
              <p className="text-brand-400 text-xs font-bold uppercase tracking-widest mb-3">Build a Package</p>
              <h2 className="text-3xl md:text-4xl font-black text-white mb-3 leading-tight">Your home, fully equipped.<br className="hidden md:block" />One order. One deal.</h2>
              <p className="text-gray-400 text-sm max-w-md">
                Mix any 3+ appliances — ACs, fridges, washing machines, TVs, solar — and get <strong className="text-white">5% off your entire order</strong> automatically.
              </p>
            </div>
            <div className="shrink-0 text-center md:text-right space-y-3">
              <Link to="/build-your-package"
                className="flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-bold px-8 py-4 rounded-2xl transition-colors shadow-brand">
                Start Building <ArrowRight className="w-4 h-4" />
              </Link>
              <p className="text-gray-400 text-xs">3+ items required for discount</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── INSTALLMENT ENGINE ───────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 pb-16">
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
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="relative bg-gray-950 rounded-3xl overflow-hidden">
          <div className="absolute inset-0 opacity-[0.04]"
            style={{ backgroundImage: 'linear-gradient(#4ade80 1px, transparent 1px), linear-gradient(90deg, #4ade80 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
          <div className="absolute top-1/2 right-0 -translate-y-1/2 w-96 h-96 bg-eco-500/8 rounded-full blur-3xl pointer-events-none" />

          <div className="relative px-8 py-14 md:py-16">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 bg-eco-500/15 text-eco-400 px-3.5 py-1.5 rounded-full text-xs font-bold mb-6 uppercase tracking-widest">
                <Leaf className="w-3.5 h-3.5" /> Tajalli's Green Corridor
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">
                A smarter home.<br />
                <span className="text-eco-400">A smaller bill.</span>
              </h2>
              <p className="text-gray-400 text-base mb-8 max-w-lg leading-relaxed">
                The Green Corridor is a curated pathway to a lower-consumption home — inverter ACs, efficient refrigerators, solar systems, and smart appliance combinations. Not just solar. A complete strategy.
              </p>

              {/* Pathway chips */}
              <div className="flex flex-wrap gap-2 mb-10">
                {[
                  { icon: '☀️', label: 'Solar Systems' },
                  { icon: '❄️', label: 'Inverter ACs' },
                  { icon: '🧊', label: 'Inverter Fridges' },
                  { icon: '🔋', label: 'Battery Storage' },
                  { icon: '💨', label: 'Efficient Fans' },
                  { icon: '🍳', label: 'Efficient Appliances' },
                ].map(c => (
                  <span key={c.label} className="inline-flex items-center gap-1.5 bg-gray-800 border border-gray-700 text-gray-300 text-xs font-medium px-3.5 py-2 rounded-full">
                    {c.icon} {c.label}
                  </span>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link to="/green-corridor"
                  className="inline-flex items-center justify-center gap-2 bg-eco-500 hover:bg-eco-600 text-white font-bold px-7 py-3.5 rounded-2xl transition-colors">
                  <Leaf className="w-4 h-4" /> Explore Green Corridor
                </Link>
                <Link to="/solar-calculator"
                  className="inline-flex items-center justify-center gap-2 bg-white/8 hover:bg-white/12 border border-gray-700 text-gray-300 font-medium px-7 py-3.5 rounded-2xl transition-colors">
                  <Calculator className="w-4 h-4" /> Calculate Savings
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* ── BRANDS ───────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 py-14">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-black text-gray-900">Brands We Carry</h2>
          <Link to="/products" className="text-sm text-brand-600 font-semibold flex items-center gap-1 hover:text-brand-700">
            All Products <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        {/* Featured brands (Haier, Crown, Westpoint) shown prominently on top row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-3">
          {BRANDS.filter(b => b.featured).map(b => (
            <Link key={b.slug} to={`/products?brand=${b.slug}`}
              className="group flex items-center gap-4 bg-white border-2 border-gray-100 hover:border-brand-300 hover:shadow-soft rounded-2xl p-5 transition-all">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-xl flex-shrink-0" style={{ backgroundColor: b.color }}>{b.name[0]}</div>
              <div>
                <div className="font-bold text-gray-800 group-hover:text-brand-700">{b.name}</div>
                <div className="text-xs text-gray-500">{b.desc}</div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-brand-500 ml-auto" />
            </Link>
          ))}
        </div>
        {/* Other brands */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {BRANDS.filter(b => !b.featured).map(b => (
            <Link key={b.slug} to={`/products?brand=${b.slug}`}
              className="group flex items-center gap-3 bg-gray-50 border border-gray-100 hover:border-brand-200 hover:bg-white hover:shadow-sm rounded-xl p-4 transition-all">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-black text-base flex-shrink-0" style={{ backgroundColor: b.color }}>{b.name[0]}</div>
              <div>
                <div className="text-sm font-bold text-gray-700 group-hover:text-brand-700">{b.name}</div>
                <div className="text-xs text-gray-400">{b.desc}</div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-brand-400 ml-auto" />
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
                className="group bg-white rounded-2xl border border-gray-100 hover:border-brand-300 hover:shadow-soft p-6 transition-all">
                <div className="text-3xl mb-3">{t.icon}</div>
                <div className="font-bold text-gray-800 mb-1 group-hover:text-brand-700">{t.title}</div>
                <div className="text-sm text-gray-500 mb-4">{t.desc}</div>
                <div className="flex items-center gap-1 text-brand-600 text-sm font-semibold">Try it free <ChevronRight className="w-3 h-3" /></div>
              </Link>
            ))}
          </div>
        </div>
      </section>


      {/* ── PROOF OF WORK ────────────────────────────────────────── */}
      {galleryStrip.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-14">
          <div className="flex items-end justify-between mb-6">
            <div>
              <p className="text-brand-500 text-xs font-bold uppercase tracking-widest mb-1">Real Jobs</p>
              <h2 className="text-2xl font-black text-gray-900">Installed Across Karachi</h2>
            </div>
            <Link to="/gallery"
              className="flex items-center gap-1 text-brand-600 hover:text-brand-700 font-semibold text-sm transition-colors">
              <Image className="w-4 h-4" /> Full Gallery <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {galleryStrip.map((item, i) => (
              <Link key={item.id} to="/gallery"
                className="aspect-square rounded-2xl overflow-hidden block bg-gray-100 hover:opacity-90 transition-opacity animate-fade-in"
                style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'both' }}>
                <img
                  src={item.public_url}
                  alt={item.caption}
                  loading="lazy"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── TRUST BAND ───────────────────────────────────────────── */}
      <section className="relative bg-gray-950 overflow-hidden">
        {/* Accent lines */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-brand-500/50 to-transparent" />
        <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-24">
          {/* Editorial header — left-aligned, intentional */}
          <div className="mb-16 md:mb-20">
            <p className="text-brand-400 text-xs font-bold uppercase tracking-[0.25em] mb-4">Established 2015 · Karachi</p>
            <h2 className="text-4xl md:text-6xl font-black text-white leading-[1.05] tracking-tight max-w-2xl">
              11 years.<br />
              <span className="text-brand-400">14,400 homes.</span><br />
              One standard.
            </h2>
          </div>

          {/* Metrics — large editorial numbers, horizontal rule treatment */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-0 mb-16">
            {[
              { value: '14,400+', label: 'Clients served',    detail: 'Karachi-wide, since 2015' },
              { value: '24,000+', label: 'Orders fulfilled',  detail: 'On time, every time' },
              { value: '75%',     label: 'Customer Loyalty',  detail: 'Come back. Bring family.' },
              { value: '11 yrs',  label: 'In business',       detail: 'No shortcuts. No drop in quality.' },
            ].map((s, i) => (
              <div key={s.label}
                className={`group py-6 md:py-8 pr-4 md:pr-8 cursor-default transition-all duration-300 hover:bg-white/[0.03] rounded-xl ${i % 2 !== 0 ? 'pl-4 md:pl-8 border-l border-white/10' : ''} ${i >= 2 ? 'border-t border-white/10 md:border-t-0 md:border-l border-white/10' : ''}`}>
                <p className="text-4xl md:text-6xl font-black text-white leading-none tracking-tight mb-2 group-hover:text-brand-300 transition-colors duration-300">{s.value}</p>
                <p className="text-sm font-bold text-brand-400 mb-1">{s.label}</p>
                <p className="text-xs text-gray-600 group-hover:text-gray-500 leading-snug transition-colors duration-300">{s.detail}</p>
              </div>
            ))}
          </div>

          {/* Proof pillars — minimal, not boxed */}
          <div className="border-t border-white/8 pt-12 grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { icon: ShieldCheck, label: 'Authentic Products', sub: '100% genuine, full manufacturer warranty' },
              { icon: CreditCard,  label: 'Easy Installments',  sub: '2–12 months · no bank account needed' },
              { icon: Truck,       label: 'Home Delivery',      sub: 'Fast, professional delivery across Karachi' },
              { icon: Headphones,  label: 'After-Sale Support', sub: 'Dedicated team · warranty claims handled' },
            ].map(({ icon: Icon, label, sub }) => (
              <div key={label} className="flex flex-col gap-2">
                <Icon className="w-5 h-5 text-brand-400" />
                <p className="text-sm font-bold text-white">{label}</p>
                <p className="text-xs text-gray-500 leading-snug">{sub}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mt-12">
            <Link to="/products" className="inline-flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-bold px-8 py-4 rounded-2xl transition-colors">
              Shop All Products <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/installments" className="inline-flex items-center justify-center gap-2 border border-gray-700 text-gray-300 hover:bg-gray-800 font-bold px-8 py-4 rounded-2xl transition-colors">
              View Installment Plans
            </Link>
          </div>
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
    </div>
  )
}
