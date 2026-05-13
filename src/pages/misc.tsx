// Services, Corporate pages
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Phone, MessageCircle, Building2, Award, Shield, ClipboardList,
  Wrench, Truck, CalendarCheck, CheckCircle, Star, Clock,
  ThumbsUp, Headphones, Zap, Users, ChevronRight, AlertCircle,
} from 'lucide-react'
import SEO from '@/components/ui/SEO'
import { getMaintenanceImages, type MediaItem } from '@/lib/gallery'
import { SERVICES_CATALOG, requiresSiteConsultation, DELIVERY_POLICY } from '@/lib/services'
import { waSales, waAdmin } from '@/lib/whatsapp'

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
          <p className="text-brand-400 text-xs font-bold uppercase tracking-widest mb-3">Complete 360° Care</p>
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
                <div className="text-3xl mb-4">{s.icon}</div>
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

        {/* ── Service pricing table ── */}
        <section>
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black text-gray-900">Service Pricing</h2>
            <p className="text-gray-500 mt-1 text-sm">Transparent pricing — no surprises. Materials are always itemised separately.</p>
          </div>

          {/* Repair diagnosis / visit-charge policy */}
          <div className="mb-4 bg-brand-50 border border-brand-200 rounded-2xl px-5 py-4 flex gap-3">
            <Wrench className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
            <div className="text-sm text-brand-900 leading-relaxed space-y-1">
              <p><strong>Repair Policy — Diagnosis First:</strong> All repair services (AC, refrigerator, freezer, dispenser, washing machine, solar inverter, UPS, microwave, LED TV) require an on-site technician visit for diagnosis. The repair quote is only provided <em>after</em> the technician assesses the unit.</p>
              <ul className="list-disc pl-4 space-y-0.5 text-brand-800">
                <li><strong>Standard (Within 48 hours):</strong> PKR 2,000 — collected at start of visit.</li>
                <li><strong>Same-Day Priority:</strong> PKR 3,000 — collected in advance. Request by 12pm.</li>
                <li>If you <strong>decline</strong> the repair after diagnosis, the visit charge is retained. No refund on visit fees.</li>
              </ul>
            </div>
          </div>

          {/* Installation policy notice */}
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-2xl px-5 py-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800 leading-relaxed">
              <strong>Installation Policy:</strong> Brand-provided free installations (e.g. Gree, Haier promotional offers) are performed by the brand's own team — Tajalli does not charge for these.
              When <em>Tajalli's technicians</em> install, our installation charges apply.
              Equipment, copper pipe, conduit, and other materials are <strong>always charged separately</strong> at cost.
            </div>
          </div>

          {/* Delivery & installment policy */}
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex gap-3">
            <Truck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800 leading-relaxed">
              <strong>Delivery:</strong> {DELIVERY_POLICY.display}.&nbsp;
              <strong>Installment sales</strong> require advance payment before verification.&nbsp;
              {requiresSiteConsultation(1_000_001) && (
                <span>Orders above <strong>PKR 1,000,000</strong> require a site consultation before finalisation.</span>
              )}
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-900 text-white">
                  <th className="text-left px-5 py-3 font-bold">Service</th>
                  <th className="text-left px-5 py-3 font-bold">Applies To</th>
                  <th className="text-left px-5 py-3 font-bold">Price</th>
                  <th className="text-left px-5 py-3 font-bold hidden sm:table-cell">Notes</th>
                </tr>
              </thead>
              <tbody>
                {SERVICES_CATALOG.filter(s => s.price.type !== 'free' || s.category === 'installation').map((s, i) => (
                  <tr key={s.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-5 py-3 font-semibold text-gray-900 align-top">{s.name}</td>
                    <td className="px-5 py-3 text-gray-500 align-top">{s.appliesTo.join(', ')}</td>
                    <td className="px-5 py-3 align-top">
                      {s.installationProvider === 'brand_free' ? (
                        <span className="inline-block bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full text-xs">Free (Brand)</span>
                      ) : s.price.type === 'free' ? (
                        <span className="inline-block bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full text-xs">Included</span>
                      ) : (
                        <span className="font-bold text-gray-900">{s.price.display}</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-400 text-xs hidden sm:table-cell align-top">{s.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 mt-3 text-center">
            * All prices are for Karachi. Prices exclude materials unless stated. Subject to change without notice.
          </p>
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

        {/* Annual Maintenance Subscription */}
        <section>
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black text-gray-900">Annual Maintenance Subscription</h2>
            <p className="text-gray-500 mt-1 text-sm">For eligible products — includes free service visits throughout the year</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
              <Star className="w-6 h-6 text-blue-600 mb-3" />
              <h3 className="font-bold text-gray-900 mb-2">Who qualifies?</h3>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                Annual maintenance subscriptions are available for products priced above <strong>PKR 50,000</strong> — including ACs, refrigerators, washing machines, solar systems, and other major appliances.
              </p>
              <ul className="space-y-1.5 text-sm text-gray-700">
                {[
                  'Subscription price = 15% of product price per year',
                  'Includes all service visits and labor for covered repairs',
                  'Replacement parts are paid by the customer at cost',
                  'Priority scheduling — visits confirmed within 24 hours',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6">
              <Zap className="w-6 h-6 text-brand-500 mb-3" />
              <h3 className="font-bold text-gray-900 mb-2">How it works</h3>
              <ol className="space-y-3 text-sm text-gray-600">
                {[
                  'Purchase any eligible product (above PKR 50,000).',
                  'Opt in to the Annual Maintenance Subscription at the time of purchase or within 30 days.',
                  'Your subscription price is confirmed at 15% of the product\'s cash price.',
                  'We schedule routine visits and respond to breakdowns throughout the year — labor is included.',
                  'If parts need replacing, we source them and bill you at cost — no markup.',
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="w-5 h-5 bg-brand-100 text-brand-600 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
              <div className="mt-4 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-xs text-amber-800">
                <strong>Example:</strong> AC purchased at PKR 120,000 → Annual Maintenance Subscription = PKR 18,000/year (15%). All service visits and labor included. Parts at cost.
              </div>
            </div>
          </div>
          <div className="mt-4 text-center">
            <a href={waSales('Hi, I\'d like to know about the Annual Maintenance Subscription for my appliance')} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 bg-gray-900 text-white font-bold px-7 py-3 rounded-xl hover:bg-gray-800 transition-colors">
              <MessageCircle className="w-4 h-4" /> Ask About Subscription
            </a>
          </div>
        </section>

        {/* AMC callout */}
        <section className="border-2 border-brand-200 bg-brand-50 rounded-3xl p-8">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="flex-1">
              <p className="text-brand-600 text-xs font-bold uppercase tracking-widest mb-2">Recommended for Homes & Offices</p>
              <h2 className="text-xl font-black text-gray-900 mb-3">Annual Maintenance Contract (AMC)</h2>
              <p className="text-gray-600 text-sm leading-relaxed mb-4">
                One AMC covers all appliances in your home or office. Scheduled visits, priority breakdown response, and
                discounted parts — so you're never caught without a working appliance.
              </p>
              <ul className="space-y-2">
                {['2 scheduled service visits per appliance per year', 'Priority same-day breakdown response', '20% discount on all parts', 'Dedicated technician who knows your setup'].map(item => (
                  <li key={item} className="flex items-start gap-2 text-sm text-gray-700">
                    <CheckCircle className="w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="md:w-56">
              <a href={waSales('Hi, I\'d like to know about the Annual Maintenance Contract')} target="_blank" rel="noreferrer"
                className="block w-full text-center py-3.5 rounded-xl font-bold text-white bg-brand-500 hover:bg-brand-600 transition-colors">
                Get AMC Quote
              </a>
              <p className="text-xs text-gray-500 text-center mt-2">Standard: within 48 hrs · Urgent same-day: request by 12pm</p>
            </div>
          </div>
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
    title: 'Volume Pricing',
    desc: 'Dedicated pricing tiers for orders of 5, 10, 20+ units. The more you order, the more you save — with no compromise on after-sale support.',
    bg: 'bg-blue-50 border-blue-100',   fg: 'text-blue-600',
  },
  {
    icon: Shield,
    title: 'Extended Warranty & Priority Service',
    desc: 'Corporate clients receive extended warranty periods and jump-the-queue priority for any service or breakdown calls — same-day response guaranteed.',
    bg: 'bg-green-50 border-green-100',  fg: 'text-green-600',
  },
  {
    icon: ClipboardList,
    title: 'Dedicated Account Manager',
    desc: 'A single point of contact manages your entire procurement — from quotation to delivery to after-sale. No call centres, no hold music.',
    bg: 'bg-brand-50 border-brand-100', fg: 'text-brand-600',
  },
  {
    icon: Award,
    title: 'Custom Procurement Packages',
    desc: 'We build brand-agnostic bundles optimised for your use case — office, hotel, hospital, or factory. Specification, sourcing, and logistics handled end-to-end.',
    bg: 'bg-purple-50 border-purple-100', fg: 'text-purple-600',
  },
]

const INDUSTRIES = [
  { emoji: '🏨', name: 'Hotels & Hospitality' },
  { emoji: '🏢', name: 'Offices & Commercial' },
  { emoji: '🏗️', name: 'Real Estate & Developers' },
  { emoji: '🏫', name: 'Schools & Institutions' },
  { emoji: '🏥', name: 'Clinics & Healthcare' },
  { emoji: '🏭', name: 'Factories & Industry' },
]

export function Corporate() {
  return (
    <div className="min-h-screen bg-white">
      <SEO
        title="Corporate Solutions — Tajalli's Karachi"
        description="Bulk appliance procurement for offices, hotels, hospitals, and developers. Volume pricing, dedicated account manager, and priority after-sale support."
      />

      {/* Hero */}
      <div className="bg-gray-900 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-3">B2B Procurement</p>
          <h1 className="text-3xl md:text-5xl font-black mb-4">Corporate Solutions</h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Bulk pricing, a dedicated account manager, and enterprise-grade after-sale support
            for businesses that expect more than a standard retailer can offer.
          </p>
          <div className="flex flex-wrap gap-4 justify-center mt-8">
            <a href={waAdmin('Hi, I\'d like a corporate quote')} target="_blank" rel="noreferrer"
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white bg-wa hover:bg-wa-hover transition-colors">
              <MessageCircle className="w-4 h-4" /> WhatsApp Corporate Team
            </a>
            <a href="tel:+923354266238"
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold bg-white/10 hover:bg-white/20 transition-colors">
              <Phone className="w-4 h-4" /> +92 335 4266238
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-14 space-y-16">

        {/* Benefits */}
        <section>
          <div className="text-center mb-10">
            <h2 className="text-2xl font-black text-gray-900">Why Businesses Choose Tajalli's</h2>
            <p className="text-gray-500 mt-1 text-sm">Built for procurement teams that need reliability, not just a price list</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            {CORP_BENEFITS.map(b => (
              <div key={b.title} className={`${b.bg} border rounded-2xl p-6`}>
                <b.icon className={`w-8 h-8 ${b.fg} mb-4`} />
                <h3 className="font-bold text-gray-900 mb-2">{b.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Industries */}
        <section>
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black text-gray-900">Industries We Serve</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {INDUSTRIES.map(i => (
              <div key={i.name} className="flex items-center gap-3 bg-gray-50 rounded-2xl p-4 border border-gray-100">
                <span className="text-2xl">{i.emoji}</span>
                <span className="font-medium text-gray-800 text-sm">{i.name}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Process */}
        <section className="bg-gray-50 rounded-3xl p-8 border border-gray-100">
          <h2 className="text-xl font-black text-gray-900 mb-8 text-center">How It Works</h2>
          <div className="grid sm:grid-cols-4 gap-6">
            {[
              { num: '01', title: 'Send Requirements', desc: 'Share your product list, quantities, and timeline via WhatsApp or email.' },
              { num: '02', title: 'Receive Custom Quote', desc: 'Your account manager sends a branded quotation within 24 hours.' },
              { num: '03', title: 'Agree & Advance', desc: 'Confirm the order. Standard corporate terms available for pre-qualified buyers.' },
              { num: '04', title: 'Phased Delivery', desc: 'We deliver and install in phases to match your project schedule.' },
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
              { icon: Clock, title: 'Quote in 24 Hours', desc: 'No back-and-forth. A full branded quotation delivered within one business day.' },
              { icon: Truck, title: 'Phased Delivery Available', desc: 'We work around your project timeline — staggered delivery at no extra cost.' },
              { icon: Zap, title: '4-Hour Breakdown Response', desc: 'Corporate clients receive guaranteed same-day response for any breakdown.' },
            ].map(g => (
              <div key={g.title} className="bg-white border border-gray-100 rounded-2xl p-5">
                <g.icon className="w-5 h-5 text-blue-600 mb-3" />
                <h3 className="font-bold text-gray-900 mb-1 text-sm">{g.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{g.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="bg-gray-900 rounded-3xl p-10 text-white text-center">
          <h2 className="text-2xl font-black mb-2">Request a Corporate Quote</h2>
          <p className="text-gray-400 mb-8 max-w-md mx-auto text-sm">
            Tell us your requirements and your account manager will send a complete proposal within 24 hours.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href={waAdmin('Hi, I\'d like a corporate appliance quote for my business')} target="_blank" rel="noreferrer"
              className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-bold text-white bg-wa hover:bg-wa-hover transition-colors">
              <MessageCircle className="w-4 h-4" /> WhatsApp Corporate Team
            </a>
            <a href="tel:+923354266238"
              className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-bold bg-white text-gray-900 hover:bg-gray-100 transition-colors">
              <Phone className="w-4 h-4" /> +92 335 4266238
            </a>
          </div>
          <div className="mt-6 flex flex-wrap gap-4 justify-center text-sm">
            <Link to="/services" className="text-gray-400 hover:text-white underline">After-Sale Services</Link>
            <Link to="/partner" className="text-gray-400 hover:text-white underline">Become a Partner</Link>
            <Link to="/contact" className="text-gray-400 hover:text-white underline">Get in Touch</Link>
          </div>
        </section>

      </div>
    </div>
  )
}

export default Services
