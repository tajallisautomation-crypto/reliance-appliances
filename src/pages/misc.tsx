// Services, Corporate pages
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Phone, MessageCircle, Building2, Award, Shield, ClipboardList,
  Wrench, Truck, CalendarCheck, CheckCircle, Star, Clock,
  ThumbsUp, Headphones, Zap, Users, ChevronRight, AlertCircle,
  ChevronDown, Mail,
} from 'lucide-react'
import SEO from '@/components/ui/SEO'
import { getMaintenanceImages, type MediaItem } from '@/lib/gallery'
import { SERVICES_CATALOG, ANNUAL_CARE_PLANS, type ServiceEntry, requiresSiteConsultation, DELIVERY_POLICY } from '@/lib/services'
import { waSales } from '@/lib/whatsapp'

// ── Master price list (mirrors the official Service Price List flyer) ─────────

const PRICE_LIST_SECTIONS = [
  {
    num: '01', title: 'Inspection & General Service',
    items: [
      { label: 'Technician Visit Charges (if no work done)',  price: 'PKR 2,000',        isNew: false },
      { label: 'Solar Cleaning & Maintenance',                price: 'PKR 6,500',        isNew: false },
      { label: 'AC Cleaning & Checkup',                       price: 'PKR 2,500',        isNew: false },
      { label: 'AC Master Service (Split)',                    price: 'PKR 4,500',        isNew: false },
      { label: 'AC Master Service (Floor Standing)',           price: 'PKR 7,500',        isNew: false },
    ],
  },
  {
    num: '02', title: 'AC Leakage Repair',
    items: [
      { label: '1 Ton AC Leakage',                            price: 'PKR 13,000',       isNew: false },
      { label: '1.5 Ton AC Leakage',                          price: 'PKR 17,000',       isNew: false },
      { label: '2 Ton AC Leakage',                            price: 'PKR 24,000',       isNew: false },
      { label: '2 Ton Floor Standing AC Leakage',             price: 'PKR 29,000',       isNew: false },
      { label: '4 Ton Floor Standing AC Leakage',             price: 'PKR 45,000',       isNew: false },
      { label: 'AC Card Repair',                              price: 'PKR 15,000',       isNew: true  },
      { label: 'AC Card Replacement',                         price: 'PKR 25,000',       isNew: true  },
    ],
  },
  {
    num: '03', title: 'AC Coil Change',
    items: [
      { label: '1 Ton Coil Change',                           price: 'PKR 30,000',       isNew: false },
      { label: '1.5 Ton Coil Change',                         price: 'PKR 40,000',       isNew: false },
      { label: '2 Ton Coil Change',                           price: 'PKR 70,000',       isNew: false },
      { label: '2 Ton Floor Standing Coil Change',            price: 'PKR 80,000',       isNew: false },
      { label: '4 Ton Floor Standing Coil Change',            price: 'PKR 110,000',      isNew: false },
    ],
  },
  {
    num: '04', title: 'Dispenser & Refrigerator Repairs',
    items: [
      { label: 'Dispenser Tap Replacement',                   price: 'PKR 3,000',        isNew: false },
      { label: 'Dispenser Leakage Fix',                       price: 'PKR 5,000',        isNew: false },
      { label: 'Dispenser Tank Repair',                       price: 'PKR 3,000',        isNew: false },
      { label: 'Refrigerator Leakage Repair',                 price: 'PKR 10,000',       isNew: false },
      { label: 'Refrigerator Relay Replacement',              price: 'PKR 7,000',        isNew: false },
    ],
  },
  {
    num: '05', title: 'UPS / Solar / Installation',
    items: [
      { label: 'UPS / Solar Inverter (per watt)',             price: 'PKR 8 per Watt',   isNew: false },
      { label: 'Solar Installation Labor',                    price: 'PKR 7,000 / kW',   isNew: false },
      { label: 'Elevated Structure Labor + Material + Install', price: 'PKR 15,000 / plate', isNew: false },
      { label: 'AC Installation Labor',                       price: 'PKR 4,500',        isNew: false },
      { label: 'AC Relocation Labor',                         price: 'PKR 7,000',        isNew: false },
      { label: 'Lifting Charges (per item / floor)',          price: 'PKR 1,000',        isNew: false },
      { label: 'Fan Installation',                            price: 'PKR 1,500',        isNew: false },
      { label: 'Solar Inverter Uninstallation & Reinstallation', price: 'PKR 6,000',     isNew: true  },
      { label: 'Solar Battery Replacement Labor',             price: 'PKR 6,000',        isNew: true  },
    ],
  },
  {
    num: '06', title: 'LED Installation',
    items: [
      { label: 'LED Installation 32 inch',                    price: 'PKR 1,200',        isNew: false },
      { label: 'LED Installation 40–43 inch',                 price: 'PKR 1,800',        isNew: false },
      { label: 'LED Installation 50 inch',                    price: 'PKR 2,500',        isNew: false },
      { label: 'LED Installation 55–75 inch',                 price: 'PKR 7,000',        isNew: false },
      { label: 'LED Installation 75 inch+',                   price: 'Site survey required', isNew: false },
    ],
  },
  {
    num: '07', title: 'Additional Services',
    items: [
      { label: 'AC Card Repair',                              price: 'PKR 15,000',       isNew: true  },
      { label: 'AC Card Replacement',                         price: 'PKR 25,000',       isNew: true  },
      { label: 'Solar Inverter Uninstallation & Reinstallation', price: 'PKR 6,000',     isNew: true  },
      { label: 'Solar Battery Replacement Labor',             price: 'PKR 6,000',        isNew: true  },
    ],
  },
]

// ── Service package groups (for the package cards section) ───────────────────

const PACKAGE_GROUPS = [
  {
    id: 'ac-preventive',
    label: 'AC Preventive Care',
    ids: ['ac-basic-care', 'ac-master-service-split', 'ac-master-service-floor', 'summer-ac-readiness'],
  },
  {
    id: 'ac-repairs',
    label: 'AC Repairs',
    ids: ['ac-leakage-repair-split', 'ac-leakage-repair-floor', 'ac-coil-change', 'ac-card-repair', 'ac-card-replacement'],
  },
  {
    id: 'ac-setup',
    label: 'AC Installation & Setup',
    ids: ['ac-install-tajalli', 'ac-relocation', 'ac-lifting'],
  },
  {
    id: 'home-appliance',
    label: 'Home Appliance Repairs',
    ids: ['fridge-leakage-repair', 'fridge-relay-replacement', 'dispenser-tap-replacement', 'dispenser-leakage-fix', 'dispenser-tank-repair', 'home-appliance-care-package', 'repair-visit-standard'],
  },
  {
    id: 'power-backup',
    label: 'Power Backup & Inverter',
    ids: ['ups-solar-inverter-service', 'solar-inverter-reinstall', 'solar-battery-replacement-labor', 'shop-salon-backup-starter'],
  },
]

// ── PackageCard ───────────────────────────────────────────────────────────────

function PackageCard({ s }: { s: ServiceEntry }) {
  const [open, setOpen] = useState(false)

  const priceBlock = () => {
    if (s.price.tiers && s.price.tiers.length > 0) {
      return (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mt-3">
          {s.price.tiers.map(t => (
            <div key={t.label} className="bg-[#1a2a4a] rounded-lg px-2.5 py-2 text-center">
              <div className="text-[10px] text-slate-300 font-medium">{t.label}</div>
              <div className="text-amber-400 font-black text-sm mt-0.5">PKR {t.amount.toLocaleString()}</div>
            </div>
          ))}
        </div>
      )
    }
    if (s.price.options && s.price.options.length > 0) {
      return (
        <div className="grid grid-cols-2 gap-1.5 mt-3">
          {s.price.options.map(o => (
            <div key={o.label} className="bg-[#1a2a4a] rounded-lg px-2.5 py-2 text-center">
              <div className="text-[10px] text-slate-300 font-medium">{o.label}</div>
              <div className="text-amber-400 font-black text-sm mt-0.5">PKR {o.amount.toLocaleString()}</div>
            </div>
          ))}
        </div>
      )
    }
    if (s.price.type === 'free') {
      return <div className="mt-3 text-green-400 font-black text-lg">{s.price.display}</div>
    }
    if (s.price.type === 'on_request') {
      return <div className="mt-3 text-amber-300 font-semibold text-sm">{s.price.display}</div>
    }
    return (
      <div className="mt-3 bg-[#1a2a4a] rounded-xl px-4 py-2.5 text-center">
        <div className="text-amber-400 font-black text-xl">{s.price.display}</div>
      </div>
    )
  }

  return (
    <div className="bg-[#0d1b35] border border-[#1e3260] rounded-2xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-[#0f2247] px-5 py-4 flex items-start gap-3">
        <Shield className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <h3 className="font-black text-white text-base leading-snug">{s.name}</h3>
      </div>

      <div className="px-5 py-4 flex flex-col gap-3 flex-1">
        {/* Best for */}
        {s.bestFor && (
          <div className="flex gap-2 text-sm text-slate-300">
            <span className="text-amber-400 font-semibold shrink-0">Best for:</span>
            <span>{s.bestFor}</span>
          </div>
        )}

        {/* Includes */}
        {s.packageIncludes && s.packageIncludes.length > 0 && (
          <div>
            <p className="text-xs font-bold text-amber-400 uppercase tracking-wide mb-1.5">Includes:</p>
            <ul className="space-y-1">
              {s.packageIncludes.map(item => (
                <li key={item} className="flex items-start gap-1.5 text-xs text-slate-300">
                  <CheckCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Pricing */}
        {priceBlock()}

        {/* Terms toggle */}
        {s.packageTerms && (
          <div className="mt-auto pt-2">
            <button
              onClick={() => setOpen(v => !v)}
              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
            >
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
              Terms
            </button>
            {open && (
              <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed border-t border-[#1e3260] pt-2">
                {s.packageTerms}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Services ─────────────────────────────────────────────────────────────────

const SERVICE_ITEMS = [
  {
    icon: '❄️',
    title: 'AC Installation & Service',
    desc: 'Full inverter and non-inverter air conditioner installation by certified technicians. Includes copper piping, drain line, and test run. Gas recharging, fin cleaning, and annual maintenance contracts also available.',
    tags: ['Same-day Karachi', 'All Brands', 'Certified Techs'],
  },
  {
    icon: '🧊',
    title: 'Refrigerator Repair',
    desc: 'Compressor replacement, gas refilling, thermostat repair, and seal replacement. Both on-site and workshop service available. Haier, Dawlance, and all major brands supported.',
    tags: ['On-site & Workshop', 'Genuine Parts', '90-Day Guarantee'],
  },
  {
    icon: '☀️',
    title: 'Solar System Installation',
    desc: 'End-to-end solar solution — site assessment, system design, panel mounting, inverter setup, and net-metering liaison. Residential and commercial systems. Full commissioning and handover report included.',
    tags: ['Free Site Assessment', 'Net-Metering Help', 'On-Grid & Off-Grid'],
  },
  {
    icon: '🔌',
    title: 'Washing Machine & Appliance Repair',
    desc: 'Motor, PCB, pump, and drum repairs for all washing machine types. Geysers, microwave ovens, and kitchen appliances also handled. Genuine parts sourced from brand-authorised suppliers.',
    tags: ['All Types', 'Quick Turnaround', 'Genuine Parts'],
  },
  {
    icon: '🔧',
    title: 'Annual Maintenance Contracts',
    desc: 'Scheduled service visits for all your appliances under a single AMC. Priority response, discounted parts, and dedicated technician. Ideal for homes, offices, and rental properties.',
    tags: ['Priority Response', 'Discounted Parts', 'Flexible Schedules'],
  },
  {
    icon: '📦',
    title: 'White-Glove Delivery & Setup',
    desc: 'Same-day and next-day delivery within Karachi. Our team unboxes, positions, and fully sets up your appliance before they leave. Packaging disposed of responsibly.',
    tags: ['Same/Next-Day', 'Full Setup', 'No Hidden Charges'],
  },
]

const PROCESS = [
  { num: '01', title: 'Contact Us', desc: 'WhatsApp or call to describe your requirement. Urgent same-day requests must reach us by 12pm. Standard service is scheduled within 48 hours.' },
  { num: '02', title: 'Schedule Visit', desc: 'We confirm a time slot that works for you — including evenings and Saturdays.' },
  { num: '03', title: 'Diagnosis & Quote', desc: 'The technician assesses the issue on-site. A transparent quote is provided before any work begins.' },
  { num: '04', title: 'Repair & Sign-Off', desc: 'Work is completed to standard. You sign off before we leave. 90-day workmanship guarantee on all repairs.' },
]

const TRUST_STATS = [
  { value: '11', label: 'Years in Business' },
  { value: '14,400+', label: 'Clients Served' },
  { value: 'Same Day', label: 'Karachi Response' },
  { value: '90 Days', label: 'Workmanship Guarantee' },
]

export function Services() {
  const [recentWork, setRecentWork] = useState<MediaItem[]>([])
  useEffect(() => { getMaintenanceImages(6).then(setRecentWork) }, [])

  return (
    <div className="min-h-screen bg-white">
      <SEO
        title="Professional Appliance Services — Tajalli's Karachi"
        description="AC installation, refrigerator repair, solar installation, and annual maintenance contracts by certified technicians. Same-day service in Karachi."
      />

      {/* Hero */}
      <div className="bg-gray-900 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-brand-300 text-xs font-bold uppercase tracking-widest mb-3">Complete 360° Care</p>
          <h1 className="text-3xl md:text-5xl font-black mb-4">Professional After-Sale Services</h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Our relationship doesn't end at the sale. Certified technicians, genuine parts,
            and a 90-day workmanship guarantee — every time.
          </p>
          <div className="flex flex-wrap gap-4 justify-center mt-8">
            <a href={waSales('Hi, I\'d like to book a service')} target="_blank" rel="noreferrer"
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white bg-wa hover:bg-wa-hover transition-colors">
              <MessageCircle className="w-4 h-4" /> Book on WhatsApp
            </a>
            <a href="tel:+923702578788"
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold bg-white/10 hover:bg-white/20 transition-colors">
              <Phone className="w-4 h-4" /> +92 370 2578788
            </a>
          </div>
        </div>
      </div>

      {/* Trust stats bar */}
      <div className="bg-brand-500 text-white py-5 px-4">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          {TRUST_STATS.map(s => (
            <div key={s.label}>
              <div className="text-xl font-black">{s.value}</div>
              <div className="text-brand-100 text-xs mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-14 space-y-16">

        {/* Services grid */}
        <section>
          <div className="text-center mb-10">
            <h2 className="text-2xl font-black text-gray-900">What We Cover</h2>
            <p className="text-gray-500 mt-1 text-sm">All services rendered by trained, experienced technicians</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {SERVICE_ITEMS.map(s => (
              <div key={s.title} className="bg-white rounded-2xl p-6 border border-gray-100 hover:border-brand-200 hover:shadow-soft transition-all">
                <div className="w-12 h-12 bg-brand-50 rounded-2xl flex items-center justify-center mb-4 text-2xl">{s.icon}</div>
                <h3 className="font-bold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-500 mb-4 leading-relaxed">{s.desc}</p>
                <div className="flex flex-wrap gap-1.5">
                  {s.tags.map(tag => (
                    <span key={tag} className="text-[10px] font-semibold bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{tag}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Service Packages ── */}
        <section>
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black text-gray-900">Service Packages & Pricing</h2>
            <p className="text-gray-500 mt-1 text-sm">Transparent, fixed pricing — no surprises. Materials always itemised separately.</p>
          </div>

          {/* Policy notices */}
          <div className="space-y-3 mb-8">
            <div className="bg-brand-50 border border-brand-200 rounded-2xl px-5 py-4 flex gap-3">
              <Wrench className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
              <div className="text-sm text-brand-900 leading-relaxed space-y-1">
                <p><strong>Repair Policy — Diagnosis First:</strong> All repair services require an on-site technician visit for diagnosis. Repair quote provided after assessment.</p>
                <ul className="list-disc pl-4 space-y-0.5 text-brand-800">
                  <li><strong>Standard (within 48 hrs):</strong> PKR 2,000 — collected at start of visit.</li>
                  <li><strong>Same-day Priority:</strong> PKR 3,000 — collected in advance. Request by 12pm.</li>
                  <li>If you <strong>decline</strong> the repair, the visit charge is retained.</li>
                </ul>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-2xl px-5 py-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800 leading-relaxed">
                <strong>Materials Policy:</strong> Repair and installation rates include standard equipment, parts and materials unless clearly stated otherwise. Installation-only rates (AC installation, relocation, lifting, cleaning, checkup, master service) are labor-only — materials charged separately.
              </p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex gap-3">
              <Truck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800 leading-relaxed">
                <strong>Delivery:</strong> {DELIVERY_POLICY.display}. <strong>Installment sales</strong> require advance payment before verification. Final pricing may vary based on site conditions, gas refill, electrical work, transport, or special requirements — confirm before work begins.
              </p>
            </div>
          </div>

          {/* Package groups */}
          {PACKAGE_GROUPS.map(group => {
            const entries = SERVICES_CATALOG.filter(s => group.ids.includes(s.id))
            if (entries.length === 0) return null
            return (
              <div key={group.id} className="mb-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-px flex-1 bg-gray-200" />
                  <h3 className="text-sm font-black uppercase tracking-widest text-gray-700 shrink-0">{group.label}</h3>
                  <div className="h-px flex-1 bg-gray-200" />
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {entries.map(s => <PackageCard key={s.id} s={s} />)}
                </div>
              </div>
            )
          })}

          {/* Master price list — 7-category grid matching the official price list flyer */}
          <div className="mt-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-px flex-1 bg-gray-200" />
              <h3 className="text-sm font-black uppercase tracking-widest text-gray-700 shrink-0">Service Price List</h3>
              <div className="h-px flex-1 bg-gray-200" />
            </div>

            {/* Policy notice strip */}
            <div className="mb-5 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3.5 flex gap-3">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 leading-relaxed">
                Repair rates include equipment, parts and material charges unless otherwise stated.
                Only installation, cleaning, checkup, technician visit, master service and relocation charges are labor-only.
                Items that explicitly mention material include material as stated.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {PRICE_LIST_SECTIONS.map(section => (
                <div key={section.num} className="bg-[#0d1b35] rounded-2xl overflow-hidden border border-[#1e3260]">
                  {/* Section header */}
                  <div className="bg-[#0f2247] px-4 py-3 flex items-center gap-2.5">
                    <span className="bg-amber-400 text-[#0d1b35] text-[10px] font-black px-2 py-0.5 rounded-md">{section.num}</span>
                    <h4 className="text-white font-black text-xs uppercase tracking-wide">{section.title}</h4>
                  </div>
                  {/* Items */}
                  <div className="px-4 py-3 space-y-2">
                    {section.items.map((item, i) => (
                      <div key={i} className="flex items-start justify-between gap-2 border-b border-[#1e3260] last:border-0 pb-2 last:pb-0">
                        <div className="flex items-start gap-1.5 min-w-0">
                          {item.isNew && (
                            <span className="shrink-0 bg-amber-400 text-[#0d1b35] text-[8px] font-black px-1 py-0.5 rounded mt-0.5">NEW</span>
                          )}
                          <span className="text-slate-300 text-[11px] leading-snug">{item.label}</span>
                        </div>
                        <span className="text-amber-400 font-black text-[11px] shrink-0 text-right">{item.price}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer notice */}
            <div className="mt-4 bg-[#0d1b35] border border-[#1e3260] rounded-2xl px-5 py-4 flex gap-3">
              <Shield className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-300 leading-relaxed">
                Final pricing may vary based on site conditions, gas refill, electrical work, transport, distance, frame work or special installation requirements where applicable.{' '}
                <strong className="text-amber-400">Please confirm final quotation before work begins.</strong>
              </p>
            </div>

            <p className="text-xs text-gray-400 mt-3 text-center">
              All prices are for Karachi. Subject to change without notice.
            </p>
          </div>
        </section>

        {/* Recent work photo strip */}
        {recentWork.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-black text-gray-900">Recent Work</h2>
                <p className="text-gray-500 text-sm mt-0.5">Real jobs, real technicians, real Karachi homes</p>
              </div>
              <Link to="/gallery"
                className="flex items-center gap-1 text-brand-500 hover:text-brand-600 font-semibold text-sm transition-colors">
                See all <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {recentWork.map(item => (
                <Link key={item.id} to="/gallery"
                  className="aspect-square rounded-2xl overflow-hidden block bg-gray-100 hover:opacity-90 transition-opacity">
                  <img
                    src={item.public_url}
                    alt={item.caption}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* How it works */}
        <section className="bg-gray-50 rounded-3xl p-8 border border-gray-100">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-black text-gray-900">How It Works</h2>
            <p className="text-gray-500 mt-1 text-sm">From contact to completion — a transparent, professional process</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {PROCESS.map(step => (
              <div key={step.num} className="text-center">
                <div className="w-12 h-12 bg-gray-900 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 text-lg font-black">
                  {step.num}
                </div>
                <h3 className="font-bold text-gray-900 mb-2 text-sm">{step.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Guarantee strip */}
        <section>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { icon: ThumbsUp, title: '90-Day Workmanship Guarantee', desc: 'If the same fault recurs within 90 days of repair, we fix it free of charge.', bg: 'bg-green-50 border-green-100', fg: 'text-green-600' },
              { icon: Shield, title: 'Genuine Parts Only', desc: 'We source parts directly from brand-authorised suppliers — no grey-market components.', bg: 'bg-blue-50 border-blue-100', fg: 'text-blue-600' },
              { icon: Headphones, title: 'Post-Service Support', desc: 'Our technician\'s direct line stays available for 7 days after any service visit.', bg: 'bg-brand-50 border-brand-100', fg: 'text-brand-600' },
            ].map(g => (
              <div key={g.title} className={`${g.bg} border rounded-2xl p-5`}>
                <g.icon className={`w-6 h-6 ${g.fg} mb-3`} />
                <h3 className="font-bold text-gray-900 mb-1 text-sm">{g.title}</h3>
                <p className="text-xs text-gray-600 leading-relaxed">{g.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Annual Care Plans */}
        <section>
          <div className="text-center mb-8">
            <p className="text-brand-600 text-xs font-bold uppercase tracking-widest mb-2">Annual Care Plans</p>
            <h2 className="text-2xl font-black text-gray-900">Protect Your Appliances Year-Round</h2>
            <p className="text-gray-500 mt-1 text-sm max-w-xl mx-auto">
              Three tiers of annual coverage for every budget. Starting rates are per registered product per year. Final pricing confirmed after inspection.
            </p>
          </div>

          {(() => {
            const PLAN_STYLE = {
              essential: {
                card:         'border-gray-200 bg-white',
                header:       'bg-gray-50',
                badge:        null as string | null,
                badgeBg:      '',
                title:        'text-gray-900',
                desc:         'text-gray-500',
                label:        'text-brand-600',
                itemBg:       'bg-gray-50 border border-gray-100',
                numColor:     'text-brand-500',
                catColor:     'text-gray-900',
                covColor:     'text-gray-500',
                priceColor:   'text-brand-600',
                includesBg:   'bg-brand-50 border border-brand-100',
                includesLabel:'text-brand-600',
                includesItem: 'text-gray-700',
                checkColor:   'text-brand-500',
                bestBg:       'bg-blue-50 border border-blue-100',
                bestLabel:    'text-blue-600',
                bestText:     'text-gray-600',
                termsLabel:   'text-gray-400',
                termsItem:    'text-gray-400',
                cta:          'bg-gray-900 text-white hover:bg-gray-800',
              },
              plus: {
                card:         'border-amber-400 bg-[#0d1b35]',
                header:       'bg-[#0f2247]',
                badge:        'Most Popular',
                badgeBg:      'bg-amber-400 text-[#0d1b35]',
                title:        'text-amber-400',
                desc:         'text-slate-300',
                label:        'text-amber-400',
                itemBg:       'bg-[#1a2a4a]',
                numColor:     'text-amber-400',
                catColor:     'text-white',
                covColor:     'text-slate-400',
                priceColor:   'text-amber-400',
                includesBg:   'bg-[#1a2a4a]',
                includesLabel:'text-amber-400',
                includesItem: 'text-slate-300',
                checkColor:   'text-amber-400',
                bestBg:       'bg-[#1a2a4a]',
                bestLabel:    'text-amber-400',
                bestText:     'text-slate-300',
                termsLabel:   'text-slate-400',
                termsItem:    'text-slate-500',
                cta:          'bg-amber-400 text-[#0d1b35] hover:bg-amber-300',
              },
              elite: {
                card:         'border-yellow-500 bg-[#0f0a1a]',
                header:       'bg-[#160e26]',
                badge:        'Best Coverage',
                badgeBg:      'bg-yellow-400 text-[#0f0a1a]',
                title:        'text-yellow-300',
                desc:         'text-stone-300',
                label:        'text-yellow-400',
                itemBg:       'bg-[#1e1530]',
                numColor:     'text-yellow-400',
                catColor:     'text-white',
                covColor:     'text-stone-400',
                priceColor:   'text-yellow-300',
                includesBg:   'bg-[#1e1530]',
                includesLabel:'text-yellow-400',
                includesItem: 'text-stone-300',
                checkColor:   'text-yellow-400',
                bestBg:       'bg-[#1e1530]',
                bestLabel:    'text-yellow-400',
                bestText:     'text-stone-300',
                termsLabel:   'text-stone-500',
                termsItem:    'text-stone-600',
                cta:          'bg-yellow-400 text-[#0f0a1a] hover:bg-yellow-300',
              },
            } as const

            return (
              <div className="grid lg:grid-cols-3 gap-5">
                {ANNUAL_CARE_PLANS.map(plan => {
                  const s = PLAN_STYLE[plan.id]
                  return (
                    <div key={plan.id} className={`rounded-3xl overflow-hidden border-2 flex flex-col ${s.card}`}>
                      {/* Header */}
                      <div className={`px-5 py-5 ${s.header}`}>
                        {s.badge && (
                          <span className={`inline-block text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full mb-2 ${s.badgeBg}`}>
                            {s.badge}
                          </span>
                        )}
                        <h3 className={`text-xl font-black ${s.title}`}>{plan.name}</h3>
                        <p className={`text-xs mt-1 leading-relaxed ${s.desc}`}>{plan.description}</p>
                      </div>

                      {/* Pricing grid */}
                      <div className="px-5 pt-4 pb-2">
                        <p className={`text-[10px] font-bold uppercase tracking-wide mb-2.5 ${s.label}`}>Starting rates — per unit / year</p>
                        <div className="space-y-1.5">
                          {plan.appliances.map(a => (
                            <div key={a.num} className={`flex items-center justify-between rounded-xl px-3 py-2 ${s.itemBg}`}>
                              <div className="flex items-center gap-2 min-w-0">
                                <span className={`text-[10px] font-black shrink-0 w-5 ${s.numColor}`}>{a.num}</span>
                                <div className="min-w-0">
                                  <div className={`text-[11px] font-bold truncate ${s.catColor}`}>{a.category}</div>
                                  <div className={`text-[10px] truncate ${s.covColor}`}>{a.coverage}</div>
                                </div>
                              </div>
                              <span className={`text-[11px] font-black shrink-0 ml-2 ${s.priceColor}`}>
                                {a.startsAt === 0 ? 'Custom' : `PKR ${a.startsAt.toLocaleString()}`}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Includes */}
                      <div className={`mx-5 mt-4 rounded-2xl px-4 py-3.5 ${s.includesBg}`}>
                        <p className={`text-[10px] font-bold uppercase tracking-wide mb-2 ${s.includesLabel}`}>What's Included</p>
                        <ul className="space-y-1.5">
                          {plan.includes.map(item => (
                            <li key={item} className={`flex items-start gap-2 text-xs ${s.includesItem}`}>
                              <CheckCircle className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${s.checkColor}`} />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Best for */}
                      <div className={`mx-5 mt-3 rounded-2xl px-4 py-3 ${s.bestBg}`}>
                        <p className={`text-[10px] font-bold uppercase tracking-wide mb-1 ${s.bestLabel}`}>Best For</p>
                        <p className={`text-xs leading-relaxed ${s.bestText}`}>{plan.bestFor}</p>
                      </div>

                      {/* Terms */}
                      <div className="mx-5 mt-3 mb-4">
                        <p className={`text-[10px] font-bold uppercase tracking-wide mb-1.5 ${s.termsLabel}`}>Terms & Conditions</p>
                        <ol className="space-y-1">
                          {plan.terms.map((t, i) => (
                            <li key={i} className={`text-[10px] leading-relaxed ${s.termsItem}`}>{i + 1}. {t}</li>
                          ))}
                        </ol>
                      </div>

                      {/* CTA */}
                      <div className="px-5 pb-5 mt-auto">
                        <a href={waSales(`Hi, I'd like to know about the ${plan.name} for my appliances`)}
                          target="_blank" rel="noreferrer"
                          className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-sm transition-colors ${s.cta}`}>
                          <MessageCircle className="w-4 h-4" />
                          Get {plan.id === 'elite' ? 'Elite' : plan.id === 'plus' ? 'Plus' : 'Essential'} Plan Quote
                        </a>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })()}

          <p className="text-xs text-gray-400 text-center mt-4">
            All rates are per unit / set per year. Final eligibility and pricing confirmed after inspection. Elite includes product replacement only if declared non-repairable.
          </p>
        </section>

        {/* Book service CTA */}
        <section className="bg-gray-900 rounded-3xl p-10 text-white text-center">
          <h2 className="text-2xl font-black mb-2">Ready to book?</h2>
          <p className="text-gray-400 mb-8 max-w-md mx-auto text-sm">
            WhatsApp us with your appliance and the issue. Standard service within 48 hours — or same-day if you request by 12pm.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href={waSales('Hi, I\'d like to book a service visit')} target="_blank" rel="noreferrer"
              className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-bold text-white bg-wa hover:bg-wa-hover transition-colors">
              <MessageCircle className="w-4 h-4" /> Book on WhatsApp
            </a>
            <a href="tel:+923702578788"
              className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-bold bg-white text-gray-900 hover:bg-gray-100 transition-colors">
              <Phone className="w-4 h-4" /> +92 370 2578788
            </a>
          </div>
          <div className="mt-6 flex flex-wrap gap-4 justify-center text-sm">
            <Link to="/installments" className="text-gray-400 hover:text-white underline">Installment Plans</Link>
            <Link to="/referral" className="text-gray-400 hover:text-white underline">Refer & Earn 2%</Link>
            <Link to="/contact" className="text-gray-400 hover:text-white underline">Get in Touch</Link>
          </div>
        </section>

      </div>
    </div>
  )
}

// ── Corporate ─────────────────────────────────────────────────────────────────

const CORP_BENEFITS = [
  {
    icon: Building2,
    title: 'Volume Pricing — Up to 12% Off',
    desc: '5 units: 4% off. 10 units: 8% off. 20+ units: 12% off list price. Savings are applied per-item across the full order. Applies to ACs, refrigerators, washing machines, TVs, and more.',
    bg: 'bg-blue-50 border-blue-100',   fg: 'text-blue-600',
  },
  {
    icon: Shield,
    title: 'Extended Warranty & Priority Service',
    desc: 'Corporate accounts receive extended warranty coordination and jump-the-queue priority for any service or breakdown. Guaranteed 4-hour response for breakdown calls — no waiting behind retail queue.',
    bg: 'bg-green-50 border-green-100',  fg: 'text-green-600',
  },
  {
    icon: ClipboardList,
    title: 'Dedicated Account Manager',
    desc: 'A single named contact manages your entire procurement — from specification to quotation to delivery to after-sale. Reach them directly by WhatsApp. No call centres, no hold music, no re-explaining.',
    bg: 'bg-brand-50 border-brand-100', fg: 'text-brand-600',
  },
  {
    icon: Award,
    title: 'Brand-Agnostic Procurement',
    desc: "We source the right product for your requirement — not just what's in stock. We carry Haier, Dawlance, Gree, EcoStar, Westpoint, Crown, and others. Your spec drives the selection, not our margin.",
    bg: 'bg-purple-50 border-purple-100', fg: 'text-purple-600',
  },
  {
    icon: Truck,
    title: 'Phased & Scheduled Delivery',
    desc: 'Projects with multiple phases (fit-out, floor-by-floor, building-by-building) get phased delivery at no extra cost. We work to your project schedule, not ours.',
    bg: 'bg-amber-50 border-amber-100', fg: 'text-amber-600',
  },
  {
    icon: Zap,
    title: 'Commercial Solar Packages',
    desc: 'Reduce your commercial electricity bill with a custom solar system. We design, supply, install, and maintain. Grid-tied and hybrid options for offices, factories, and retail units.',
    bg: 'bg-eco-50 border-eco-100', fg: 'text-eco-600',
  },
]

const INDUSTRIES = [
  { emoji: '🏨', name: 'Hotels & Hospitality',       desc: 'Room ACs, commercial fridges, laundry equipment, backup power' },
  { emoji: '🏢', name: 'Offices & Commercial',        desc: 'Multi-floor AC systems, UPS backup, kitchen appliances' },
  { emoji: '🏗️', name: 'Real Estate & Developers',   desc: 'Fit-out packages per unit, bulk pricing, phased delivery' },
  { emoji: '🏫', name: 'Schools & Institutions',       desc: 'Classroom ACs, admin refrigeration, solar for cost reduction' },
  { emoji: '🏥', name: 'Clinics & Healthcare',         desc: 'Medical-grade cooling, reliable backup power, fast response' },
  { emoji: '🏭', name: 'Factories & Industry',         desc: 'Industrial cooling, large-capacity freezers, solar systems' },
  { emoji: '💇', name: 'Salons & Beauty',              desc: 'Reliable UPS + AC packages, backup power for chairs & equipment' },
  { emoji: '🍽️', name: 'Restaurants & Cafes',         desc: 'Commercial refrigeration, freezers, kitchen appliances' },
  { emoji: '🏬', name: 'Retail & Showrooms',           desc: 'Display cooling, energy-efficient ACs, solar to cut overheads' },
]

const CORP_CATEGORIES = [
  { emoji: '❄️', name: 'Air Conditioners', detail: '1T–4T floor standing, inverter & T3-rated, any brand' },
  { emoji: '🧊', name: 'Refrigerators & Freezers', detail: 'Commercial upright, chest deep freezers, display units' },
  { emoji: '👕', name: 'Washing Machines', detail: 'Semi-auto, fully auto, front-load — bulk rates' },
  { emoji: '📺', name: 'Televisions & Displays', detail: 'Smart TVs for waiting areas, conference rooms, lobbies' },
  { emoji: '☀️', name: 'Solar Systems', detail: 'Grid-tied, hybrid, off-grid — complete supply & install' },
  { emoji: '🔋', name: 'UPS & Battery Backup', detail: 'Salon, office, and factory backup power packages' },
  { emoji: '🍳', name: 'Kitchen Appliances', detail: 'Microwaves, water dispensers, commercial kitchen equipment' },
  { emoji: '💨', name: 'Fans & Ventilation', detail: 'Industrial fans, exhaust systems, office ceiling fans' },
]

export function Corporate() {
  return (
    <div className="min-h-screen bg-white">
      <SEO
        title="Commercial Solutions — Tajalli's Home & Commercial Solutions, Karachi"
        description="B2B appliance procurement for offices, hotels, clinics, schools, and developers in Karachi. Volume pricing up to 12% off, dedicated account manager, phased delivery, and priority after-sale support. Quote in 24 hours."
        keywords="commercial appliances karachi, bulk ac purchase karachi, corporate procurement karachi, office ac installation karachi, commercial solar karachi, hotel appliances karachi"
      />

      {/* Hero */}
      <div className="bg-gray-900 text-white py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="max-w-2xl">
            <p className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-3">Commercial Solutions · B2B Procurement</p>
            <h1 className="text-3xl md:text-5xl font-black mb-4 leading-tight">
              Appliances &amp; Solar<br />
              <span className="text-brand-400">for Businesses That Mean Business.</span>
            </h1>
            <p className="text-gray-400 text-lg mb-8 max-w-xl leading-relaxed">
              Volume pricing up to 12% off, a dedicated account manager, phased delivery, and 4-hour breakdown response — for offices, hotels, clinics, schools, and developers across Karachi.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href={waSales("Hi, I'd like a commercial/B2B quote for my business")} target="_blank" rel="noreferrer"
                className="flex items-center gap-2 px-6 py-3.5 rounded-2xl font-bold text-white bg-wa hover:bg-wa-hover transition-colors">
                <MessageCircle className="w-4 h-4" /> WhatsApp Corporate Team
              </a>
              <a href="mailto:sales@tajallis.com.pk"
                className="flex items-center gap-2 px-6 py-3.5 rounded-2xl font-bold bg-white/10 hover:bg-white/20 border border-white/20 transition-colors">
                <Mail className="w-4 h-4" /> sales@tajallis.com.pk
              </a>
              <a href="tel:+923702578788"
                className="flex items-center gap-2 px-6 py-3.5 rounded-2xl font-bold bg-white/10 hover:bg-white/20 transition-colors">
                <Phone className="w-4 h-4" /> +92 370 2578788
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div className="border-b border-gray-100 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 py-6 grid grid-cols-2 sm:grid-cols-4 gap-6">
          {[
            { value: '11+ yrs', label: 'Serving Karachi businesses' },
            { value: '24h',     label: 'Branded quote turnaround' },
            { value: '4 hrs',   label: 'Corporate breakdown response' },
            { value: '12%',     label: 'Volume discount on 20+ units' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className="text-2xl font-black text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-14 space-y-16">

        {/* Volume pricing table */}
        <section>
          <div className="text-center mb-10">
            <h2 className="text-2xl font-black text-gray-900">Volume Pricing Tiers</h2>
            <p className="text-gray-500 mt-1 text-sm">Applied per-item across your entire order. Discounts are off our standard list price.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-900 text-white">
                  <th className="text-left px-5 py-3 rounded-tl-2xl font-bold">Order Size</th>
                  <th className="text-center px-5 py-3 font-bold">Discount</th>
                  <th className="text-left px-5 py-3 rounded-tr-2xl font-bold">What You Get</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { qty: '1–4 units',  disc: 'Standard price', extras: 'Same-day delivery, professional installation, after-sale support' },
                  { qty: '5–9 units',  disc: '4% off',         extras: '+ Account manager, priority scheduling, consolidated delivery' },
                  { qty: '10–19 units',disc: '8% off',         extras: '+ Phased delivery, extended coordination, invoice billing available' },
                  { qty: '20+ units',  disc: '12% off',        extras: '+ Dedicated on-site liaison, custom SLA, 4-hour breakdown response' },
                ].map((row, i) => (
                  <tr key={row.qty} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-5 py-3.5 font-bold text-gray-900 border-b border-gray-100">{row.qty}</td>
                    <td className="px-5 py-3.5 text-center font-black text-brand-600 border-b border-gray-100">{row.disc}</td>
                    <td className="px-5 py-3.5 text-gray-600 border-b border-gray-100">{row.extras}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 mt-3 text-center">Discounts apply to standard retail prices. Subject to product availability and brand. Contact us for a custom quote.</p>
        </section>

        {/* Benefits */}
        <section>
          <div className="text-center mb-10">
            <h2 className="text-2xl font-black text-gray-900">Why Businesses Choose Tajalli's</h2>
            <p className="text-gray-500 mt-1 text-sm">Built for procurement teams that need reliability, not just a price list</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {CORP_BENEFITS.map(b => (
              <div key={b.title} className={`${b.bg} border rounded-2xl p-5`}>
                <b.icon className={`w-7 h-7 ${b.fg} mb-3`} />
                <h3 className="font-bold text-gray-900 mb-1.5 text-sm">{b.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Product categories */}
        <section>
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black text-gray-900">What We Supply Commercially</h2>
            <p className="text-gray-500 mt-1 text-sm">All products are genuine, brand-warranted, and backed by our after-sale support</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {CORP_CATEGORIES.map(c => (
              <div key={c.name} className="bg-gray-50 border border-gray-100 rounded-2xl p-4">
                <span className="text-2xl block mb-2">{c.emoji}</span>
                <h3 className="font-bold text-gray-900 text-sm mb-1">{c.name}</h3>
                <p className="text-xs text-gray-500 leading-snug">{c.detail}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Industries */}
        <section>
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black text-gray-900">Industries We Serve</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {INDUSTRIES.map(i => (
              <div key={i.name} className="flex items-start gap-3 bg-white border border-gray-100 rounded-2xl p-4 hover:border-brand-200 hover:shadow-sm transition-all">
                <span className="text-2xl shrink-0">{i.emoji}</span>
                <div>
                  <p className="font-bold text-gray-900 text-sm">{i.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-snug">{i.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Process */}
        <section className="bg-gray-50 rounded-3xl p-8 border border-gray-100">
          <h2 className="text-xl font-black text-gray-900 mb-8 text-center">How It Works</h2>
          <div className="grid sm:grid-cols-4 gap-6">
            {[
              { num: '01', title: 'Share Requirements', desc: 'Send your product list, quantities, delivery timeline, and site details via WhatsApp or email.' },
              { num: '02', title: 'Receive Custom Quote', desc: 'Your account manager sends a branded, itemised quotation within 24 hours — no chasing required.' },
              { num: '03', title: 'Confirm & Advance', desc: 'Approve the quote and place a 30% advance. Corporate payment terms available for pre-qualified accounts.' },
              { num: '04', title: 'Phased Delivery', desc: 'We deliver and install to your project schedule — phase by phase, floor by floor, or all at once.' },
            ].map(step => (
              <div key={step.num} className="text-center">
                <div className="w-10 h-10 bg-gray-900 text-white rounded-xl flex items-center justify-center mx-auto mb-3 font-black text-sm">{step.num}</div>
                <h3 className="font-bold text-gray-900 mb-1 text-sm">{step.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Guarantees */}
        <section>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { icon: Clock, title: 'Quote in 24 Hours',           desc: 'A complete branded quotation with itemised pricing — delivered within one business day, every time.' },
              { icon: Truck, title: 'Phased Delivery Available',   desc: 'We work around your project timeline — staggered delivery at no extra cost, with install coordination.' },
              { icon: Zap,   title: '4-Hour Breakdown Response',   desc: 'Corporate accounts get guaranteed same-day response for any fault — your operations do not stop.' },
            ].map(g => (
              <div key={g.title} className="bg-white border border-gray-100 rounded-2xl p-5">
                <g.icon className="w-5 h-5 text-brand-600 mb-3" />
                <h3 className="font-bold text-gray-900 mb-1 text-sm">{g.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{g.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="bg-gray-900 rounded-3xl p-8 sm:p-12 text-white">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl font-black mb-3">Ready to get a commercial quote?</h2>
            <p className="text-gray-400 mb-8 text-sm leading-relaxed">
              Share your requirements — product list, quantities, delivery timeline, site location — and your account manager will send a complete itemised proposal within 24 hours.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href={waSales("Hi, I'd like a commercial/B2B appliance quote for my business")} target="_blank" rel="noreferrer"
                className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-bold text-white bg-wa hover:bg-wa-hover transition-colors">
                <MessageCircle className="w-4 h-4" /> WhatsApp Corporate Team
              </a>
              <a href="mailto:sales@tajallis.com.pk"
                className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-bold bg-white text-gray-900 hover:bg-gray-100 transition-colors">
                <Mail className="w-4 h-4" /> sales@tajallis.com.pk
              </a>
            </div>
            <p className="text-gray-500 text-xs mt-6">Or call directly: <a href="tel:+923702578788" className="text-gray-400 hover:text-white underline">+92 370 2578788</a></p>
            <div className="mt-6 flex flex-wrap gap-4 justify-center text-sm">
              <Link to="/services" className="text-gray-400 hover:text-white underline">After-Sale Services</Link>
              <Link to="/solar" className="text-gray-400 hover:text-white underline">Commercial Solar</Link>
              <Link to="/partner" className="text-gray-400 hover:text-white underline">Become a Partner</Link>
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}

export default Services
