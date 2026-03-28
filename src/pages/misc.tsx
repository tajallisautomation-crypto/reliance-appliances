// Services, Corporate pages
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Phone, MessageCircle, Building2, Award, Shield, ClipboardList,
  Wrench, Truck, CalendarCheck, CheckCircle, Star, Clock,
  ThumbsUp, Headphones, Zap, Users, ChevronRight,
} from 'lucide-react'
import SEO from '@/components/ui/SEO'
import { getMaintenanceImages, type MediaItem } from '@/lib/gallery'

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
  { num: '01', title: 'Contact Us', desc: 'WhatsApp or call to describe your requirement. Our team responds within 1 hour during business hours.' },
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
        title="Professional Appliance Services — Reliance Appliances Karachi"
        description="AC installation, refrigerator repair, solar installation, and annual maintenance contracts by certified technicians. Same-day service in Karachi."
      />

      {/* Hero */}
      <div className="bg-gray-900 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-orange-400 text-xs font-bold uppercase tracking-widest mb-3">Complete 360° Care</p>
          <h1 className="text-3xl md:text-5xl font-black mb-4">Professional After-Sale Services</h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Our relationship doesn't end at the sale. Certified technicians, genuine parts,
            and a 90-day workmanship guarantee — every time.
          </p>
          <div className="flex flex-wrap gap-4 justify-center mt-8">
            <a href="https://wa.me/923702578788?text=Hi%2C%20I%27d%20like%20to%20book%20a%20service"
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
      <div className="bg-orange-500 text-white py-5 px-4">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          {TRUST_STATS.map(s => (
            <div key={s.label}>
              <div className="text-xl font-black">{s.value}</div>
              <div className="text-orange-100 text-xs mt-0.5">{s.label}</div>
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
              <div key={s.title} className="bg-white rounded-2xl p-6 border border-gray-100 hover:border-orange-200 hover:shadow-md transition-all">
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

        {/* Recent work photo strip */}
        {recentWork.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-black text-gray-900">Recent Work</h2>
                <p className="text-gray-500 text-sm mt-0.5">Real jobs, real technicians, real Karachi homes</p>
              </div>
              <Link to="/gallery"
                className="flex items-center gap-1 text-orange-500 hover:text-orange-600 font-semibold text-sm transition-colors">
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
              { icon: Headphones, title: 'Post-Service Support', desc: 'Our technician\'s direct line stays available for 7 days after any service visit.', bg: 'bg-orange-50 border-orange-100', fg: 'text-orange-600' },
            ].map(g => (
              <div key={g.title} className={`${g.bg} border rounded-2xl p-5`}>
                <g.icon className={`w-6 h-6 ${g.fg} mb-3`} />
                <h3 className="font-bold text-gray-900 mb-1 text-sm">{g.title}</h3>
                <p className="text-xs text-gray-600 leading-relaxed">{g.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* AMC callout */}
        <section className="border-2 border-orange-200 bg-orange-50 rounded-3xl p-8">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="flex-1">
              <p className="text-orange-600 text-xs font-bold uppercase tracking-widest mb-2">Recommended for Homes & Offices</p>
              <h2 className="text-xl font-black text-gray-900 mb-3">Annual Maintenance Contract (AMC)</h2>
              <p className="text-gray-600 text-sm leading-relaxed mb-4">
                One AMC covers all appliances in your home or office. Scheduled visits, priority breakdown response, and
                discounted parts — so you're never caught without a working appliance.
              </p>
              <ul className="space-y-2">
                {['2 scheduled service visits per appliance per year', 'Priority same-day breakdown response', '20% discount on all parts', 'Dedicated technician who knows your setup'].map(item => (
                  <li key={item} className="flex items-start gap-2 text-sm text-gray-700">
                    <CheckCircle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="md:w-56">
              <a href="https://wa.me/923702578788?text=Hi%2C%20I%27d%20like%20to%20know%20about%20the%20Annual%20Maintenance%20Contract"
                className="block w-full text-center py-3.5 rounded-xl font-bold text-white bg-orange-500 hover:bg-orange-600 transition-colors">
                Get AMC Quote
              </a>
              <p className="text-xs text-gray-500 text-center mt-2">We'll call back within 1 hour</p>
            </div>
          </div>
        </section>

        {/* Book service CTA */}
        <section className="bg-gray-900 rounded-3xl p-10 text-white text-center">
          <h2 className="text-2xl font-black mb-2">Ready to book?</h2>
          <p className="text-gray-400 mb-8 max-w-md mx-auto text-sm">
            WhatsApp us with your appliance and the issue — we'll confirm a slot within 1 hour.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="https://wa.me/923702578788?text=Hi%2C%20I%27d%20like%20to%20book%20a%20service%20visit"
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
    desc: 'Corporate clients receive extended warranty periods and jump-the-queue priority for any service or breakdown calls — guaranteed response within 4 hours.',
    bg: 'bg-green-50 border-green-100',  fg: 'text-green-600',
  },
  {
    icon: ClipboardList,
    title: 'Dedicated Account Manager',
    desc: 'A single point of contact manages your entire procurement — from quotation to delivery to after-sale. No call centres, no hold music.',
    bg: 'bg-orange-50 border-orange-100', fg: 'text-orange-600',
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
        title="Corporate Solutions — Reliance Appliances Karachi"
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
            <a href="https://wa.me/923354266238?text=Hi%2C%20I%27d%20like%20a%20corporate%20quote"
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
            <h2 className="text-2xl font-black text-gray-900">Why Businesses Choose Reliance</h2>
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
            <a href="https://wa.me/923354266238?text=Hi%2C%20I%27d%20like%20a%20corporate%20appliance%20quote%20for%20my%20business"
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
