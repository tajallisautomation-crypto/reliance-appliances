import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import {
  ArrowRight, Calculator, ShieldCheck, Truck, CreditCard, Headphones,
  ChevronRight, Zap, Leaf, Image, Phone, Building2, Wrench,
  AirVent, Refrigerator, Shirt, Tv, Sun, UtensilsCrossed, Droplets, Plug,
  Snowflake, CalendarDays, Users, Star, Package,
} from 'lucide-react'
import { getProducts, getProductCount, type Product, formatPrice } from '../lib/api'
import { waSales } from '../lib/whatsapp'
import { SITE_URL } from '../lib/config'

const RECENT_JOBS = [
  { type: 'Installation completed', area: 'PECHS',         detail: 'Gree 1.5 Ton Inverter AC'    },
  { type: 'Delivery completed',     area: 'North Karachi', detail: 'Dawlance Refrigerator'        },
  { type: 'Backup setup completed', area: 'Gulshan',       detail: 'UPS + Battery Package'        },
  { type: 'Installation completed', area: 'Nazimabad',     detail: 'Haier 2 Ton Inverter AC'      },
  { type: 'Delivery completed',     area: 'F.B. Area',     detail: 'Westpoint Washing Machine'    },
  { type: 'Solar setup completed',  area: 'DHA',           detail: '5kW Solar System'             },
]

const HERO_STATS = [
  { Icon: CalendarDays, value: '11+ Years', label: 'In Business Since 2015',    iconColor: 'text-brand-600', iconBg: 'bg-brand-50'    },
  { Icon: Users,        value: '14,400+',  label: 'Homes & Businesses Served', iconColor: 'text-blue-600',  iconBg: 'bg-blue-50'     },
  { Icon: Package,      value: '24,000+',  label: 'Jobs Completed',            iconColor: 'text-eco-600',   iconBg: 'bg-eco-50'      },
  { Icon: Star,         value: '75%',      label: 'Repeat Customers',          iconColor: 'text-gold-600',  iconBg: 'bg-gold-300/25' },
]

const HERO_TILES = [
  { Icon: AirVent,   label: 'AC Installation',  area: 'North Karachi',   bg: 'from-blue-50 to-blue-100',    color: 'text-blue-500'  },
  { Icon: Sun,       label: 'Inverter Setup',   area: 'Gulshan',         bg: 'from-amber-50 to-yellow-100', color: 'text-amber-600' },
  { Icon: Snowflake, label: 'Freezer Delivery', area: 'F.B. Area',       bg: 'from-cyan-50 to-cyan-100',    color: 'text-cyan-600'  },
  { Icon: Tv,        label: 'TV Delivery',      area: 'North Nazimabad', bg: 'from-gray-50 to-gray-100',    color: 'text-gray-500'  },
];

const REVIEWS = [
  { name: 'M. Tariq',  area: 'Gulshan-e-Iqbal', service: 'Inverter AC on Installments', text: 'AC delivered and installed the same day. Professional team, clean work. Installment plan was fully transparent — no hidden charges.' },
  { name: 'Fatima K.', area: 'North Karachi',    service: 'Solar Inverter Setup',        text: 'Excellent installation. Team explained everything clearly and followed up after the job. Haven\'t paid a full electricity bill since.' },
  { name: 'Asad M.',   area: 'Federal B Area',   service: 'Haier Refrigerator',          text: 'Ordered through WhatsApp — delivery was fast, packaging intact, product original. Will definitely buy again.' },
  { name: 'Sara R.',   area: 'Nazimabad',        service: 'Salon Backup Package',        text: 'UPS and battery for my salon — no more load-shedding problems. Team understood exactly what we needed and set it up perfectly.' },
  { name: 'Imran A.',  area: 'North Nazimabad',  service: 'AC + Washing Machine Bundle', text: 'Bought two products together, saved on delivery and installation. Everything works perfectly. Tajalli\'s is my go-to now.' },
  { name: 'Hina Z.',   area: 'Korangi',          service: 'Smart TV Delivery',           text: 'Very smooth from start to finish. Good price, same-day delivery, team even helped with the wall bracket setup.' },
];

const KARACHI_AREAS = [
  'North Karachi', 'Federal B Area', 'Gulshan-e-Iqbal', 'Gulistan-e-Johar',
  'North Nazimabad', 'Nazimabad', 'Landhi', 'DHA', 'Clifton', 'PECHS',
  'Malir', 'Korangi', 'Saddar', 'Buffer Zone', 'Orangi Town', 'Surjani Town',
];

// Shop-by-category — 9 stable main categories only. Subcategories live inside filters/BYOP/buying guides.
const HOME_CATEGORIES = [
  { id: 'air-conditioners',   name: 'Air Conditioners',   sub: 'Inverter, T3, Heat & Cool',        Icon: AirVent,          color: 'text-blue-600',    bg: 'bg-blue-50',          to: '/products?category=air-conditioners'   },
  { id: 'refrigerators',      name: 'Refrigerators',      sub: 'Inverter, Glass Door, Large Cap.',  Icon: Refrigerator,     color: 'text-cyan-700',    bg: 'bg-cyan-50',          to: '/products?category=refrigerators'      },
  { id: 'washing-machines',   name: 'Washing Machines',   sub: 'Auto, Semi-Auto, Top Load',         Icon: Shirt,            color: 'text-indigo-600',  bg: 'bg-indigo-50',        to: '/products?category=washing-machines'   },
  { id: 'freezers',           name: 'Freezers',           sub: 'Single Door, Deep Chest',           Icon: Snowflake,        color: 'text-sky-600',     bg: 'bg-sky-50',           to: '/products?category=freezers'           },
  { id: 'televisions',        name: 'Televisions',        sub: 'Smart, LED, 4K',                    Icon: Tv,               color: 'text-gray-700',    bg: 'bg-gray-100',         to: '/products?category=televisions'        },
  { id: 'solar',              name: 'Solar, UPS & Backup',sub: 'Solar, Inverters, Batteries',       Icon: Sun,              color: 'text-gold-700',    bg: 'bg-gold-300/25',      to: '/solar'                                },
  { id: 'kitchen-appliances', name: 'Kitchen',            sub: 'Microwaves, Air Fryers, Blenders',  Icon: UtensilsCrossed,  color: 'text-brand-600',   bg: 'bg-brand-50',         to: '/products?category=kitchen-appliances' },
  { id: 'water-dispensers',   name: 'Water Dispensers',   sub: 'Countertop, Floor Standing',        Icon: Droplets,         color: 'text-teal-700',    bg: 'bg-teal-50',          to: '/products?category=water-dispensers'   },
  { id: 'small-appliances',   name: 'Small Appliances',   sub: 'Fans, Irons, Heaters',              Icon: Plug,             color: 'text-purple-600',  bg: 'bg-purple-50',        to: '/products?category=small-appliances'   },
]
import { calcPlan } from '../lib/plans'
import ProductCard from '../components/products/ProductCard'
import SEO from '../components/ui/SEO'
import OfferBannerSlider from '../components/OfferBannerSlider'
import { getInstallationImages, type MediaItem } from '../lib/gallery'
import SocialProofLoop from '../components/ui/SocialProofLoop'

// Brand list — preferred brands (Haier, Crown, Westpoint) listed first for merchandising visibility
const BRANDS = [
  { name: 'Haier',     slug: 'haier',     color: '#e31837', desc: 'ACs, refrigerators, washing machines',         featured: true  },
  { name: 'Crown',     slug: 'crown',     color: '#1a1a2e', desc: 'Solar inverters, batteries & energy solutions', featured: true  },
  { name: 'Westpoint', slug: 'westpoint', color: '#2563eb', desc: 'Kitchen & home appliances',                    featured: true  },
  { name: 'Dawlance',  slug: 'dawlance',  color: '#003087', desc: 'Refrigerators, freezers, kitchen appliances',   featured: false },
  { name: 'Gree',      slug: 'gree',      color: '#00843d', desc: 'Inverter ACs for Karachi heat',                 featured: false },
  { name: 'EcoStar',   slug: 'ecostar',   color: '#0070c0', desc: 'Smart TVs & air conditioners',                  featured: false },
]


const PLAN_OPTIONS = [
  { key: '2m'  as const, label: '2 Payments'  },
  { key: '3m'  as const, label: '3 Payments'  },
  { key: '6m'  as const, label: '6 Payments'  },
  { key: '12m' as const, label: '12 Payments' },
]

const TOOLS = [
  { icon: '🔢', title: 'Solar Calculator',        desc: 'Find out exactly what solar system you need.',              href: '/solar-calculator' },
  { icon: '💡', title: 'Bill Savings Calc',       desc: 'Estimate your solar savings based on your actual load.',    href: '/tools' },
  { icon: '🔋', title: 'UPS & Battery Calc',      desc: 'Calculate backup power needed for your home or shop.',      href: '/tools' },
  { icon: '❄️', title: 'AC Consumption Calc',     desc: 'Estimate AC electricity usage and monthly running cost.',   href: '/tools' },
  { icon: '📈', title: 'Payback Calculator',      desc: 'Calculate when your solar investment pays back.',            href: '/tools' },
  { icon: '💳', title: 'Installment Calculator',  desc: 'See advance, monthly payment and total cost before you buy.',href: '/installments' },
  { icon: '⚡', title: 'Net Metering Check',      desc: "Check if you're eligible to sell power to the grid.",       href: '/tools' },
  { icon: '📦', title: 'Package Builder',         desc: 'Mix appliances and get an instant bundle price estimate.',   href: '/build-your-package' },
]

const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Do you offer installment plans for home appliances in Karachi?',
      acceptedAnswer: { '@type': 'Answer', text: "Yes. Tajalli's offers easy installment plans with 2, 3, 6, and 12-month options. No hidden charges — the breakdown is shown upfront before you buy. Available on ACs, refrigerators, washing machines, TVs, and more." },
    },
    {
      '@type': 'Question',
      name: 'Do you deliver and install appliances in Karachi?',
      acceptedAnswer: { '@type': 'Answer', text: "Yes. We offer same-day delivery across Karachi and professional installation for air conditioners, washing machines, and other appliances. Our trained technicians handle setup and post-installation testing." },
    },
    {
      '@type': 'Question',
      name: 'What brands do you carry?',
      acceptedAnswer: { '@type': 'Answer', text: "We carry all major Pakistani and international brands including Haier, Dawlance, Gree, EcoStar, PEL, Orient, Samsung, TCL, Westpoint, Crown, Waves, and more — all genuine, company-warranted products." },
    },
    {
      '@type': 'Question',
      name: 'Are your products genuine with official warranty?',
      acceptedAnswer: { '@type': 'Answer', text: "Yes. Every product sold by Tajalli's is 100% genuine with full manufacturer warranty. We are an authorised dealer for all brands we carry. No grey imports, no refurbished stock." },
    },
    {
      '@type': 'Question',
      name: 'What is a T3 air conditioner and do you sell them?',
      acceptedAnswer: { '@type': 'Answer', text: "A T3-rated air conditioner is designed to operate in extreme heat — up to 52°C outdoor ambient temperature. This rating is critical for Pakistan's climate. We stock T3 ACs from Haier (HFT/HFAB series), Gree (Pular T3, Airy T3, Zeno T3), EcoStar (Nova T3, Ario T3, Prince T3), and Dawlance." },
    },
    {
      '@type': 'Question',
      name: 'Do you offer solar systems for homes and businesses?',
      acceptedAnswer: { '@type': 'Answer', text: "Yes. We design and install on-grid, off-grid, and hybrid solar systems. Packages start from 3kW for homes up to commercial-scale setups. We handle panels, inverter, net metering registration, and after-sale monitoring." },
    },
    {
      '@type': 'Question',
      name: 'What areas in Karachi do you serve?',
      acceptedAnswer: { '@type': 'Answer', text: "We deliver and install across all major Karachi areas including North Karachi, Federal B Area, Gulshan-e-Iqbal, Gulistan-e-Johar, North Nazimabad, Nazimabad, DHA, Clifton, PECHS, Malir, Korangi, Saddar, Orangi Town, and more." },
    },
  ],
};

const TESTIMONIAL_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  '@id': `${SITE_URL}/#organization`,
  review: REVIEWS.map(r => ({
    '@type': 'Review',
    author: { '@type': 'Person', name: r.name },
    reviewRating: { '@type': 'Rating', ratingValue: 5, bestRating: 5, worstRating: 1 },
    reviewBody: r.text,
    publisher: { '@type': 'Organization', name: "Tajalli's" },
  })),
};

export default function Home() {
  const [featured,       setFeatured]      = useState<Product[]>([])
  const [loading,        setLoading]       = useState(true)
  const [totalProducts,  setTotalProducts] = useState(0)
  const [activePlan,     setActivePlan]    = useState<'2m'|'3m'|'6m'|'12m'>('3m')
  const [samplePrice,    setSamplePrice]   = useState(150000)
  const [galleryStrip,   setGalleryStrip]  = useState<MediaItem[]>([])
  const [collageSlots,   setCollageSlots]  = useState<string[][]>([[], [], [], []])
  const [activeIndexes,  setActiveIndexes] = useState([0, 0, 0, 0])
  const [fadingSlot,     setFadingSlot]    = useState<number | null>(null)
  const [toastIndex,     setToastIndex]    = useState(0)
  const [toastVisible,   setToastVisible]  = useState(false)
  const collageRef = useRef<string[][]>([[], [], [], []])

  // Preferred brands surfaced first in homepage featured section
  const PREFERRED_BRANDS = ['haier', 'crown', 'westpoint']

  useEffect(() => {
    getProducts({ featured: 'true' }).then(d => {
      const all = d.products
      // Sort: preferred brands first, then rest — preserving featured ordering within each group
      const preferred = all.filter(p => PREFERRED_BRANDS.includes(p.brand.toLowerCase()))
      const others    = all.filter(p => !PREFERRED_BRANDS.includes(p.brand.toLowerCase()))
      const sorted    = [...preferred, ...others]
      setFeatured(sorted.slice(0, 8))
      setLoading(false)
    }).catch(() => setLoading(false))
    getProductCount().then(setTotalProducts)
    getInstallationImages(20).then(items => {
      setGalleryStrip(items.slice(0, 6))
      const slots: string[][] = [[], [], [], []]
      items.forEach((item, i) => slots[i % 4].push(item.public_url))
      collageRef.current = slots
      setCollageSlots(slots)
    })
  }, [])

  // Rotate one collage slot at a time every 5s
  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) return
    const interval = setInterval(() => {
      const slots = collageRef.current
      const eligible = slots.map((s, i) => s.length > 1 ? i : -1).filter(i => i >= 0)
      if (eligible.length === 0) return
      const slot = eligible[Math.floor(Math.random() * eligible.length)]
      setFadingSlot(slot)
      setTimeout(() => {
        setActiveIndexes(prev => {
          const next = [...prev]
          next[slot] = (next[slot] + 1) % slots[slot].length
          return next
        })
        setFadingSlot(null)
      }, 350)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  // Show toast after 3s, rotate every 9s
  useEffect(() => {
    const show = setTimeout(() => setToastVisible(true), 3000)
    return () => clearTimeout(show)
  }, [])
  useEffect(() => {
    const interval = setInterval(() => {
      setToastVisible(false)
      setTimeout(() => {
        setToastIndex(prev => (prev + 1) % RECENT_JOBS.length)
        setToastVisible(true)
      }, 600)
    }, 9000)
    return () => clearInterval(interval)
  }, [])

  const calc = calcPlan(samplePrice, activePlan)

  return (
    <div className="min-h-screen bg-white">
      <SEO
        title="Tajalli's Home & Commercial Solutions — Appliances & Solar Karachi"
        description="Buy ACs, refrigerators, washing machines, solar systems & kitchen appliances on easy installments in Karachi. Pakistan's most trusted store since 2015. Home delivery & after-sale support."
        keywords="home appliances karachi, buy ac karachi, solar panels karachi, haier dawlance price pakistan, refrigerator installment karachi, washing machine price karachi, t3 ac karachi, inverter ac installment karachi"
        path="/"
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(FAQ_SCHEMA)}</script>
        <script type="application/ld+json">{JSON.stringify(TESTIMONIAL_SCHEMA)}</script>
      </Helmet>

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className="relative bg-gradient-to-b from-brand-50/50 via-brand-50/20 to-white">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-7 sm:py-10 md:py-14">
          {/* Mobile: stack. Desktop: 45/55 two-column grid */}
          <div
            className="flex flex-col gap-5 md:grid md:items-center md:gap-12"
            style={{ gridTemplateColumns: '45% 55%' }}
          >

            {/* ── LEFT COLUMN ── */}
            <div className="flex flex-col gap-3 md:gap-5">

              {/* Trust badge */}
              <div className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 bg-white border border-brand-100 shadow-sm rounded-full px-3 py-1 self-start">
                <span className="text-brand-600 text-[0.72rem] font-bold uppercase tracking-[0.14em]">Karachi</span>
                <span className="text-brand-300 text-xs">·</span>
                <span className="text-brand-600 text-[0.72rem] font-bold uppercase tracking-[0.14em]">Since 2015</span>
                <span className="text-brand-300 text-xs">·</span>
                <span className="text-brand-600 text-[0.72rem] font-bold uppercase tracking-[0.14em] whitespace-nowrap">24,000+ Jobs Completed</span>
              </div>

              {/* Headline */}
              <h1 className="mb-0">
                <span
                  className="block font-bold text-gray-400 leading-[1.15] mb-2"
                  style={{ fontSize: 'clamp(1.1rem, 2vw, 1.75rem)' }}
                >
                  Appliances, Solar &amp; Backup Solutions
                </span>
                <span
                  className="block font-black text-brand-500 leading-[0.95] tracking-[-0.04em]"
                  style={{ fontSize: 'clamp(3rem, 6vw, 5.2rem)' }}
                >
                  Delivered.<br />Installed.<br />
                  <span className="text-gold-500">Supported.</span>
                </span>
              </h1>

              {/* Body copy */}
              <p className="text-base md:text-[1.05rem] text-gray-500 leading-relaxed max-w-[30rem]">
                From ACs and fridges to solar, UPS and batteries — Tajalli's delivers, installs and supports complete home and commercial solutions across Karachi.
              </p>

              {/* CTAs: Build a Package → Shop Products → WhatsApp */}
              {/* Mobile: 2-per-row (Build + Shop), WhatsApp full-width below */}
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <Link to="/build-your-package"
                    className="flex-1 inline-flex items-center justify-center gap-2 bg-gold-500 hover:bg-gold-600 text-white font-bold text-sm px-4 py-3 rounded-2xl shadow-sm transition-all min-h-[48px]">
                    <Package className="w-4 h-4 shrink-0" /> Build a Package
                  </Link>
                  <Link to="/products"
                    className="flex-1 inline-flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm px-4 py-3 rounded-2xl shadow-brand transition-all min-h-[48px]">
                    Shop Products <ArrowRight className="w-4 h-4 shrink-0" />
                  </Link>
                </div>
                <a href={waSales()} target="_blank" rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 bg-eco-500 hover:bg-eco-600 text-white font-semibold text-sm px-5 py-3 rounded-2xl transition-all min-h-[44px]">
                  <Phone className="w-4 h-4" /> WhatsApp Help
                </a>
              </div>

              {/* Stats — desktop only (shown after CTAs in left column) */}
              <div className="hidden md:grid grid-cols-2 gap-2.5 pt-5 border-t border-brand-100">
                {HERO_STATS.map(({ Icon, value, label, iconColor, iconBg }) => (
                  <div key={label}
                    className="flex items-center gap-2.5 bg-white border border-gray-100 shadow-apple rounded-2xl px-3 py-2.5 cursor-default">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
                      <Icon className={`w-4 h-4 ${iconColor}`} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-gray-900 leading-none">{value}</p>
                      <p className="text-[10px] text-gray-500 font-medium mt-0.5 leading-snug">{label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── RIGHT COLUMN: rotating installation collage ── */}
            <div className="relative">
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                {collageSlots.some(s => s.length > 0)
                  ? collageSlots.map((slotUrls, slotIndex) => (
                    <div key={slotIndex}
                      className="aspect-square rounded-[1.75rem] overflow-hidden bg-gray-100 shadow-apple">
                      {slotUrls.length > 0
                        ? <img
                            src={slotUrls[activeIndexes[slotIndex]]}
                            alt="Completed installation by Tajalli's Home & Commercial Solutions"
                            className="w-full h-full object-cover"
                            style={{
                              transition: 'opacity 350ms ease, transform 350ms ease',
                              opacity: fadingSlot === slotIndex ? 0 : 1,
                              transform: fadingSlot === slotIndex ? 'scale(1.03)' : 'scale(1)',
                              filter: 'brightness(1.03) contrast(1.04) saturate(1.04)',
                            }}
                            loading={slotIndex === 0 ? 'eager' : 'lazy'}
                          />
                        : <div className="w-full h-full bg-gray-50" />
                      }
                    </div>
                  ))
                  : HERO_TILES.map(({ Icon, label, area, bg, color }, i) => (
                    <div key={label}
                      className={`aspect-square rounded-[1.75rem] bg-gradient-to-br ${bg} shadow-apple flex flex-col items-center justify-center gap-2 animate-fade-in`}
                      style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'both' }}>
                      <Icon className={`w-10 h-10 ${color}`} />
                      <p className="text-xs font-bold text-gray-700 text-center leading-tight">{label}</p>
                      <p className="text-[10px] text-gray-400 text-center">{area}</p>
                    </div>
                  ))
                }
              </div>
              {/* Floating badge — desktop only */}
              <div className="hidden md:flex absolute -bottom-3 -right-3 bg-white border border-gray-100 shadow-apple-xl rounded-2xl px-4 py-2.5 items-center gap-2">
                <div className="w-8 h-8 bg-brand-50 rounded-xl flex items-center justify-center shrink-0">
                  <Package className="w-4 h-4 text-brand-600" />
                </div>
                <div>
                  <p className="text-xs font-black text-gray-900 leading-none">24,000+ jobs</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">completed across Karachi</p>
                </div>
              </div>
            </div>

            {/* ── STATS: mobile only — after collage ── */}
            <div className="md:hidden grid grid-cols-2 gap-2">
              {HERO_STATS.map(({ Icon, value, label, iconColor, iconBg }) => (
                <div key={label}
                  className="flex items-center gap-2 bg-white border border-gray-100 shadow-apple rounded-2xl px-2.5 py-2 cursor-default">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
                    <Icon className={`w-4 h-4 ${iconColor}`} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-900 leading-none">{value}</p>
                    <p className="text-[10px] text-gray-500 font-medium mt-0.5 leading-snug">{label}</p>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* ── RECENT JOB TOAST — fixed bottom-left, desktop only ── */}
      <div
        className={`hidden sm:flex fixed bottom-6 left-6 z-40 items-start gap-3 bg-white/95 backdrop-blur-md border border-gray-100 shadow-apple-xl rounded-2xl px-4 py-3 max-w-[280px] pointer-events-none transition-all duration-500 ${
          toastVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
        }`}
        aria-hidden="true"
      >
        <div className="w-8 h-8 bg-brand-50 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
          <Wrench className="w-3.5 h-3.5 text-brand-600" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold text-brand-600 uppercase tracking-wider leading-none mb-0.5">
            {RECENT_JOBS[toastIndex].type} · {RECENT_JOBS[toastIndex].area}
          </p>
          <p className="text-xs font-semibold text-gray-800 leading-snug">{RECENT_JOBS[toastIndex].detail}</p>
        </div>
      </div>


      {/* ── CATEGORY GRID ────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-14 pb-10 sm:pb-16">
        <div className="flex items-baseline justify-between mb-4 sm:mb-6">
          <h2 className="text-xl font-black text-gray-900">Shop by Category</h2>
          <Link to="/products" className="text-sm text-brand-600 font-semibold hover:text-brand-700 flex items-center gap-1">
            All <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-9 gap-2.5 sm:gap-4">
          {HOME_CATEGORIES.map(({ id, name, sub, Icon, color, bg, to }) => (
            <Link key={id} to={to}
              className="group flex flex-col items-center gap-1.5 py-4 sm:py-5 px-1 sm:px-2 rounded-2xl sm:rounded-3xl bg-white hover:bg-brand-50 border border-gray-100 hover:border-brand-200 hover:shadow-sm transition-all duration-200 text-center min-w-0">
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 ${bg} group-hover:scale-110 transition-transform duration-200`}>
                <Icon className={`w-4.5 h-4.5 sm:w-5.5 sm:h-5.5 ${color}`} />
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold text-gray-700 group-hover:text-brand-700 leading-tight break-words w-full">{name}</span>
              <span className="hidden sm:block text-[9px] text-gray-400 leading-tight">{sub}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── OFFER BANNERS ────────────────────────────────────────── */}
      <OfferBannerSlider />

      {/* ── MOBILE EARLY PRODUCTS — shown only on mobile before heavy sections ── */}
      {!loading && featured.length > 0 && (
        <section className="sm:hidden max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-gray-900">Top Picks</h2>
            <Link to="/products?featured=true" className="text-sm text-brand-600 font-semibold flex items-center gap-1">
              All <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {featured.slice(0, 4).map(p => <ProductCard key={p.id} product={p} />)}
          </div>
          <div className="text-center mt-4">
            <Link to="/products"
              className="inline-flex items-center gap-2 border border-brand-500 text-brand-600 font-semibold text-sm px-5 py-2.5 rounded-2xl hover:bg-brand-50 transition-all">
              Browse All Products <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>
      )}

      {/* ── MYOP PROMO ───────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 md:pt-32 pb-20">
        <div className="relative bg-gray-950 rounded-3xl overflow-hidden">
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.8) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.8) 1px,transparent 1px)', backgroundSize: '32px 32px' }} />
          <div className="relative px-5 sm:px-8 py-7 md:py-12">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-8 mb-6 md:mb-8">
              <div className="flex-1">
                <p className="text-gold-400 text-xs font-bold uppercase tracking-widest mb-3">Build a Package</p>
                <h2 className="text-3xl md:text-4xl font-black text-white mb-3 leading-tight">Your home, shop or office —<br className="hidden md:block" />fully equipped in one order.</h2>
                <p className="text-gray-400 text-sm max-w-lg">
                  Mix ACs, fridges, washing machines, UPS, batteries, solar and more. Get bundle savings, installment options, and one coordinated delivery &amp; installation plan.
                </p>
                <p className="text-gray-500 text-xs mt-2">
                  Bundle 3+ items and get automatic package savings, delivery coordination and installment planning — all in one order.
                </p>
              </div>
              <div className="shrink-0 text-center md:text-right space-y-3">
                <Link to="/build-your-package"
                  className="flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-bold px-8 py-4 rounded-2xl transition-colors shadow-brand">
                  Start Building <ArrowRight className="w-4 h-4" />
                </Link>
                <p className="text-gray-500 text-xs">3+ items · 5% bundle discount</p>
              </div>
            </div>
            {/* Example packages */}
            <div className="flex flex-wrap gap-2">
              {[
                { icon: '🏠', label: 'New Home Package' },
                { icon: '💇', label: 'Salon Backup Package' },
                { icon: '🏢', label: 'Apartment Comfort Package' },
                { icon: '🏪', label: 'Office Essentials Package' },
                { icon: '☀️', label: 'Solar-Ready Home Package' },
              ].map(p => (
                <Link key={p.label} to="/build-your-package"
                  className="inline-flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-brand-500 text-gray-300 hover:text-white text-xs font-medium px-4 py-2.5 rounded-full transition-all">
                  {p.icon} {p.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── INSTALLMENT ENGINE ───────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 pb-10 md:pb-16">
        <div className="bg-gray-950 rounded-3xl p-6 md:p-12">
          <div className="text-center mb-6 md:mb-10">
            <p className="text-gold-400 text-xs font-bold uppercase tracking-widest mb-2">Flexible Installments</p>
            <h2 className="text-2xl md:text-4xl font-black text-white mb-2">Own it today. Pay your way.</h2>
            <p className="text-gray-400 text-sm">No bank account needed · Advance, monthly &amp; total cost upfront.</p>
          </div>

          {/* Plan tabs */}
          <div className="flex gap-1 bg-gray-800/60 p-1 rounded-2xl mb-5 md:mb-8 max-w-md mx-auto">
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
              <div className="space-y-1.5 pt-3 border-t border-gray-100">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Cash price</span>
                  <span className="font-medium text-gray-600">PKR {formatPrice(samplePrice)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Total installment cost</span>
                  <span className="font-bold text-gray-900">PKR {formatPrice(calc.total)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Financing charge</span>
                  <span className="text-orange-500 font-medium">+ PKR {formatPrice(calc.total - samplePrice)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mt-8">
            <Link to="/installments"
              className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-bold px-8 py-3.5 rounded-full transition-colors shadow-brand">
              See All Installment Plans <ArrowRight className="w-4 h-4" />
            </Link>
            <p className="text-gray-600 text-xs mt-3">
              Example only · Final plan subject to product and approval · Ask on WhatsApp
            </p>
          </div>
        </div>
      </section>

      {/* ── GREEN CORRIDOR TEASER ─────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="relative bg-gray-950 rounded-3xl overflow-hidden">
          <div className="absolute inset-0 opacity-[0.04]"
            style={{ backgroundImage: 'linear-gradient(#4ade80 1px, transparent 1px), linear-gradient(90deg, #4ade80 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
          <div className="absolute top-1/2 right-0 -translate-y-1/2 w-96 h-96 bg-eco-500/8 rounded-full blur-3xl pointer-events-none" />

          <div className="relative px-5 sm:px-8 py-10 sm:py-14 md:py-16">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 bg-eco-500/15 text-eco-400 px-3.5 py-1.5 rounded-full text-xs font-bold mb-6 uppercase tracking-widest">
                <Leaf className="w-3.5 h-3.5" /> Tajalli's Green Corridor
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">
                A smarter home.<br />
                <span className="text-eco-400">A smaller bill.</span>
              </h2>
              <p className="text-gray-400 text-base mb-8 max-w-lg leading-relaxed">
                Green Corridor helps you reduce electricity bills by combining inverter appliances, UPS/battery backup and solar systems into one practical plan for your home or business. Not just solar — a complete strategy.
              </p>

              {/* Pathway chips — horizontal scroll on mobile */}
              <div className="-mx-8 sm:mx-0 overflow-x-auto no-scrollbar mb-8 sm:mb-10">
              <div className="flex sm:flex-wrap gap-2 px-8 sm:px-0 pb-1 sm:pb-0 flex-nowrap">
                {[
                  { icon: '☀️', label: 'Solar Systems' },
                  { icon: '❄️', label: 'Inverter ACs' },
                  { icon: '🧊', label: 'Inverter Fridges' },
                  { icon: '🔋', label: 'Battery Storage' },
                  { icon: '🔌', label: 'UPS Backup' },
                  { icon: '💨', label: 'Efficient Fans' },
                  { icon: '🍳', label: 'Efficient Appliances' },
                ].map(c => (
                  <span key={c.label} className="inline-flex items-center gap-1.5 bg-gray-800 border border-gray-700 text-gray-300 text-xs font-medium px-3.5 py-2 rounded-full">
                    {c.icon} {c.label}
                  </span>
                ))}
              </div>
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


      {/* ── FOR BUSINESSES ───────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="text-center mb-6 md:mb-10">
          <div className="inline-flex items-center gap-2 text-brand-500 text-xs font-bold uppercase tracking-widest mb-2">
            <Building2 className="w-4 h-4" /> Commercial Solutions
          </div>
          <h2 className="text-xl md:text-3xl font-black text-gray-900">Solutions for Shops, Salons, Offices &amp; Small Businesses</h2>
          <p className="text-gray-500 text-sm md:text-base mt-2 md:mt-3 max-w-xl mx-auto">
            Backup power, cooling, appliances &amp; solar — packaged with installation and after-sales support.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5 mb-6 md:mb-8">
          {[
            { icon: '💇', title: 'Salon Backup Package',          desc: 'UPS, battery & AC for uninterrupted salon operations.',        href: '/build-your-package' },
            { icon: '🏢', title: 'Office Cooling Package',        desc: 'Inverter ACs with professional installation for any office.',   href: '/products?category=air-conditioners' },
            { icon: '🔋', title: 'Shop UPS & Battery Package',    desc: 'Reliable backup power to keep your shop running all day.',      href: '/solar' },
            { icon: '🍽️', title: 'Restaurant & Kitchen',         desc: 'Commercial fridges, freezers and kitchen equipment.',           href: '/products?category=kitchen-appliances' },
            { icon: '🏥', title: 'Clinic & Waiting Area Cooling', desc: 'Quiet inverter ACs with fast professional installation.',       href: '/products?category=air-conditioners' },
            { icon: '☀️', title: 'Solar for Commercial Use',      desc: 'Reduce commercial electricity bills with solar systems.',       href: '/solar' },
          ].map(item => (
            <Link key={item.title} to={item.href}
              className="group flex gap-3 sm:gap-4 bg-white border border-gray-100 hover:border-brand-200 hover:shadow-soft rounded-2xl p-3.5 sm:p-5 transition-all">
              <div className="text-xl sm:text-2xl shrink-0 mt-0.5">{item.icon}</div>
              <div>
                <div className="text-sm sm:text-base font-bold text-gray-800 group-hover:text-brand-700 leading-tight mb-0.5 sm:mb-1">{item.title}</div>
                <div className="hidden sm:block text-sm text-gray-500">{item.desc}</div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-brand-400 ml-auto shrink-0 self-center" />
            </Link>
          ))}
        </div>
        <div className="text-center">
          <Link to="/build-your-package"
            className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-bold px-8 py-3.5 rounded-2xl transition-colors shadow-brand">
            Get a Business Quote <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ── BRANDS ───────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 py-8 sm:py-14">
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
      <section className="bg-gray-50 py-10 sm:py-14">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-10">
            <div className="text-brand-500 text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-1 justify-center"><Zap className="w-4 h-4" /> Free Tools</div>
            <h2 className="text-2xl md:text-3xl font-black text-gray-900">Make Smarter Decisions</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
            {TOOLS.map(t => (
              <Link key={t.title} to={t.href}
                className="group bg-white rounded-2xl border border-gray-100 hover:border-brand-300 hover:shadow-soft p-4 sm:p-6 transition-all">
                <div className="text-xl sm:text-2xl mb-2 sm:mb-3">{t.icon}</div>
                <div className="text-sm sm:text-base font-bold text-gray-800 mb-0.5 sm:mb-1 group-hover:text-brand-700 leading-tight">{t.title}</div>
                <div className="hidden sm:block text-sm text-gray-500 mb-4">{t.desc}</div>
                <div className="flex items-center gap-1 text-brand-600 text-xs sm:text-sm font-semibold mt-2">Try free <ChevronRight className="w-3 h-3" /></div>
              </Link>
            ))}
          </div>
        </div>
      </section>


      {/* ── PROOF OF WORK ────────────────────────────────────────── */}
      {galleryStrip.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-8 sm:py-14">
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

      {/* ── SERVICE AREAS ────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="bg-brand-50 rounded-3xl px-5 sm:px-8 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
            <div>
              <p className="text-brand-500 text-xs font-bold uppercase tracking-widest mb-1">Delivery &amp; Installation</p>
              <h2 className="text-xl font-black text-gray-900">Serving Karachi — All Major Areas</h2>
            </div>
            <a href={waSales()} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors shrink-0">
              <Phone className="w-3.5 h-3.5" /> Check Your Area
            </a>
          </div>
          <div className="flex flex-wrap gap-2">
            {KARACHI_AREAS.map(area => (
              <span key={area}
                className="inline-flex items-center bg-white border border-brand-100 text-gray-700 text-xs font-medium px-3.5 py-1.5 rounded-full">
                {area}
              </span>
            ))}
          </div>
          <p className="text-gray-400 text-xs mt-4">Not listed? Message us — we cover most of Karachi and surrounding towns.</p>
        </div>
      </section>

      {/* ── TRUST BAND ───────────────────────────────────────────── */}
      <section className="relative bg-gray-950 overflow-hidden">
        {/* Accent lines */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-brand-500/50 to-transparent" />
        <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
          {/* Editorial header — left-aligned, intentional */}
          <div className="mb-8 md:mb-12">
            <p className="text-brand-400 text-xs font-bold uppercase tracking-[0.25em] mb-3">Established 2015 · Karachi</p>
            <h2 className="text-3xl md:text-6xl font-black text-white leading-[1.05] tracking-tight max-w-2xl">
              11+ years.<br />
              <span className="text-brand-400">14,400+ homes &amp; businesses.</span><br />
              One standard.
            </h2>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-0 mb-8 md:mb-12">
            {[
              { value: '14,400+', label: 'Homes & businesses served', detail: 'Karachi-wide, since 2015' },
              { value: '24,000+', label: 'Orders delivered',          detail: 'On time, every time' },
              { value: '75%',     label: 'Repeat customers',          detail: 'Come back. Bring family.' },
              { value: '11+ yrs', label: 'In business',               detail: 'No shortcuts. No drop in quality.' },
            ].map((s, i) => (
              <div key={s.label}
                className={`group py-4 md:py-8 pr-3 md:pr-8 cursor-default transition-all duration-300 hover:bg-white/[0.03] rounded-xl ${i % 2 !== 0 ? 'pl-3 md:pl-8 border-l border-white/10' : ''} ${i >= 2 ? 'border-t border-white/10 md:border-t-0 md:border-l border-white/10' : ''}`}>
                <p className="text-3xl md:text-6xl font-black text-white leading-none tracking-tight mb-1 md:mb-2 group-hover:text-brand-300 transition-colors duration-300">{s.value}</p>
                <p className="text-xs md:text-sm font-bold text-brand-400 mb-0.5 md:mb-1">{s.label}</p>
                <p className="hidden md:block text-xs text-gray-600 group-hover:text-gray-500 leading-snug transition-colors duration-300">{s.detail}</p>
              </div>
            ))}
          </div>

          {/* Proof pillars — minimal, not boxed */}
          <div className="border-t border-white/8 pt-8 md:pt-10 grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-8">
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

          <div className="flex flex-col sm:flex-row gap-4 mt-8 md:mt-10">
            <Link to="/products" className="inline-flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-bold px-8 py-4 rounded-2xl transition-colors">
              Shop All Products <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/installments" className="inline-flex items-center justify-center gap-2 border border-gray-700 text-gray-300 hover:bg-gray-800 font-bold px-8 py-4 rounded-2xl transition-colors">
              View Installment Plans
            </Link>
          </div>
        </div>
      </section>

      {/* ── CUSTOMER REVIEWS ─────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="text-center mb-10">
          <p className="text-brand-500 text-xs font-bold uppercase tracking-widest mb-2">Customer Stories</p>
          <h2 className="text-2xl md:text-3xl font-black text-gray-900">What Our Customers Say</h2>
          <p className="text-gray-500 text-sm mt-2">Real customers, real jobs, real results — across Karachi.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
          {REVIEWS.map(r => (
            <div key={r.name} className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-5 flex flex-col gap-2.5 sm:gap-3 hover:shadow-soft hover:border-brand-100 transition-all">
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 text-gold-500 fill-gold-400" />
                ))}
              </div>
              <p className="text-sm text-gray-700 leading-relaxed flex-1">&ldquo;{r.text}&rdquo;</p>
              <div className="pt-2 border-t border-gray-50 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-900">{r.name}</p>
                  <p className="text-[10px] text-gray-400">{r.area}</p>
                </div>
                <span className="text-[10px] text-brand-500 font-medium bg-brand-50 px-2 py-0.5 rounded-full">{r.service}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURED PRODUCTS ────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 py-8 sm:py-14">
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

      {/* ── SERVICES & CARE PLANS ────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="text-center mb-8">
          <p className="text-brand-500 text-xs font-bold uppercase tracking-widest mb-2">After-Sale Support</p>
          <h2 className="text-2xl md:text-3xl font-black text-gray-900">Services & Annual Care Plans</h2>
          <p className="text-gray-500 text-sm mt-2 max-w-xl mx-auto">Professional repair, maintenance &amp; protection plans for every appliance — from a single visit to full annual cover.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Service packages */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 hover:border-brand-200 hover:shadow-soft transition-all">
            <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center mb-3">
              <Wrench className="w-5 h-5 text-brand-600" />
            </div>
            <h3 className="font-black text-gray-900 mb-1">Service Packages</h3>
            <p className="text-sm text-gray-500 mb-3 leading-relaxed">AC, fridge, solar & dispenser repairs — transparent fixed pricing, no surprises.</p>
            <p className="text-xs text-brand-600 font-bold mb-3">From PKR 2,500 per visit</p>
            <Link to="/services" className="text-xs font-bold text-brand-500 hover:text-brand-700 flex items-center gap-1">View all packages <ChevronRight className="w-3.5 h-3.5" /></Link>
          </div>
          {/* Essential Care Plan */}
          <div className="bg-[#0d1b35] rounded-2xl p-5 border border-[#1e3260]">
            <p className="text-amber-400 text-[10px] font-black uppercase tracking-widest mb-2">Essential Care</p>
            <h3 className="text-white font-black mb-1">Basic Annual Cover</h3>
            <p className="text-slate-300 text-sm mb-3 leading-relaxed">1 preventive visit, basic inspection, 10% off repairs, 72hr response.</p>
            <p className="text-amber-400 font-black text-sm mb-3">From PKR 3,000 / year</p>
            <Link to="/services#care-plans" className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1">View plans <ChevronRight className="w-3.5 h-3.5" /></Link>
          </div>
          {/* Plus Care Plan */}
          <div className="bg-[#0d1b35] rounded-2xl p-5 border border-amber-500/40">
            <p className="text-amber-400 text-[10px] font-black uppercase tracking-widest mb-2">Plus Care — Best Value</p>
            <h3 className="text-white font-black mb-1">Maintenance + Parts</h3>
            <p className="text-slate-300 text-sm mb-3 leading-relaxed">2 visits, covered parts, maintenance labor included, priority 48hr response.</p>
            <p className="text-amber-400 font-black text-sm mb-3">From PKR 6,500 / year</p>
            <Link to="/services#care-plans" className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1">View plans <ChevronRight className="w-3.5 h-3.5" /></Link>
          </div>
          {/* Elite Care Plan */}
          <div className="bg-[#0f0a1a] rounded-2xl p-5 border border-yellow-500/50">
            <p className="text-yellow-400 text-[10px] font-black uppercase tracking-widest mb-2">Elite Care — Full Protection</p>
            <h3 className="text-white font-black mb-1">Repairs + Replacement</h3>
            <p className="text-stone-300 text-sm mb-3 leading-relaxed">3 visits, covered repairs & parts, replacement if non-repairable, priority 24hr.</p>
            <p className="text-yellow-300 font-black text-sm mb-3">From PKR 13,650 / year</p>
            <Link to="/services#care-plans" className="text-xs font-bold text-yellow-400 hover:text-yellow-300 flex items-center gap-1">View plans <ChevronRight className="w-3.5 h-3.5" /></Link>
          </div>
        </div>
        <div className="text-center">
          <Link to="/services"
            className="inline-flex items-center gap-2 border-2 border-brand-500 text-brand-600 font-bold px-7 py-3 rounded-2xl hover:bg-brand-500 hover:text-white transition-all text-sm">
            View All Services &amp; Pricing <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <SocialProofLoop />
    </div>
  )
}
