import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ShieldCheck, CreditCard, Truck, Headphones, MessageCircle, ChevronRight, Image, Clock, Building2, BadgeCheck } from 'lucide-react'
import SEO from '@/components/ui/SEO'
import { waSales } from '@/lib/whatsapp'
import { getInstallationImages, type MediaItem } from '@/lib/gallery'

const STATS = [
  { value: '11',      label: 'Years in Business' },
  { value: '14,400+', label: 'Customers Served' },
  { value: '24,000+', label: 'Orders Fulfilled' },
  { value: '75%',     label: 'Returning Customers' },
]

const VALUES = [
  { icon: ShieldCheck, title: 'Authenticity',    desc: 'Every product we sell is 100% genuine with official brand warranty. No grey-market or parallel imports.', bg: 'bg-blue-100',   fg: 'text-blue-600' },
  { icon: CreditCard,  title: 'Flexibility',     desc: 'We offer 2–12 month installment plans so everyone can afford quality appliances, no bank account needed.', bg: 'bg-green-100',  fg: 'text-green-600' },
  { icon: Truck,       title: 'Reliability',     desc: 'We deliver to your door and provide professional installation — so your appliance is set up right from day one.', bg: 'bg-orange-100', fg: 'text-orange-600' },
  { icon: Headphones,  title: 'After-Sale Care', desc: "Our relationship doesn't end at the sale. We follow up, handle warranty claims, and provide ongoing support.", bg: 'bg-purple-100', fg: 'text-purple-600' },
]

export default function About() {
  const [galleryStrip, setGalleryStrip] = useState<MediaItem[]>([])

  useEffect(() => {
    getInstallationImages(5).then(setGalleryStrip)
  }, [])

  return (
    <div className="min-h-screen bg-white">
      <SEO
        title="About Us — Karachi's Trusted Appliance Partner"
        description="Learn about Tajalli's Home And Commercial Solutions — Karachi's trusted appliance partner since 2015. 14,400+ clients served, 24,000+ orders fulfilled, genuine products & real after-sale support."
        keywords="about reliance appliances karachi, home appliances karachi, trusted appliance store pakistan"
      />

      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur px-4 py-2 rounded-full text-sm font-medium mb-6">
            🏪 About Us
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-5 leading-tight">
            Karachi's Most Trusted<br />Appliance Partner
          </h1>
          <p className="text-lg text-blue-100 max-w-2xl mx-auto">
            Since 2015, Tajalli's has been the trusted appliance partner for homes,
            offices, and businesses across Karachi — genuine products, flexible terms, real support.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-gray-50 py-12">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {STATS.map(s => (
            <div key={s.label} className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="text-3xl font-black text-orange-500 mb-1">{s.value}</div>
              <div className="text-sm text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Our Story */}
      <section className="max-w-4xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="text-orange-500 text-sm font-semibold mb-2">Our Story</div>
            <h2 className="text-3xl font-black text-gray-900 mb-4">Built on Trust, Grown by Service</h2>
            <div className="space-y-4 text-gray-600 leading-relaxed">
              <p>
                Tajalli's was founded with a simple belief: every Pakistani family deserves
                access to quality appliances at fair prices — without the runaround of grey-market
                products or opaque pricing.
              </p>
              <p>
                We started small in Karachi, focusing on a few key brands and building deep expertise in
                what we sell. Over the years, we've grown by word of mouth — customer by customer —
                because we do what we say.
              </p>
              <p>
                Today we carry 400+ products from Haier, Dawlance, Gree, EcoStar, Westpoint, and Crown
                — as an authorised dealer for Pakistan's leading appliance brands.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl p-6 text-white">
              <div className="text-4xl font-black mb-1">2015</div>
              <div className="text-blue-200 text-sm">Year Founded</div>
            </div>
            <div className="bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl p-6 text-white">
              <div className="text-4xl font-black mb-1">100%</div>
              <div className="text-orange-100 text-sm">Genuine Products</div>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 text-white">
              <div className="text-4xl font-black mb-1">6+</div>
              <div className="text-green-100 text-sm">Premium Brands</div>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl p-6 text-white">
              <div className="text-4xl font-black mb-1">5★</div>
              <div className="text-purple-100 text-sm">Customer Rating</div>
            </div>
          </div>
        </div>
      </section>

      {/* Real Work strip — only rendered once gallery is populated */}
      {galleryStrip.length > 0 && (
        <section className="bg-gray-950 py-14 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-end justify-between mb-7">
              <div>
                <p className="text-orange-400 text-xs font-bold uppercase tracking-widest mb-2">Proof of Work</p>
                <h2 className="text-2xl font-black text-white">Real Jobs. Real Homes. Karachi.</h2>
                <p className="text-gray-400 text-sm mt-1">Every photo is a real installation or service call.</p>
              </div>
              <Link to="/gallery"
                className="hidden sm:flex items-center gap-1.5 text-orange-400 hover:text-orange-300 font-semibold text-sm transition-colors flex-shrink-0 ml-6">
                <Image className="w-4 h-4" /> Full Gallery <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {galleryStrip.map(item => (
                <Link key={item.id} to="/gallery"
                  className="aspect-square rounded-2xl overflow-hidden block bg-gray-800 hover:opacity-90 transition-opacity">
                  <img
                    src={item.public_url}
                    alt={item.caption}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                </Link>
              ))}
            </div>

            <div className="mt-5 text-center sm:hidden">
              <Link to="/gallery" className="text-orange-400 font-semibold text-sm">
                View Full Gallery →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Values */}
      <section className="bg-gray-50 py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <div className="text-orange-500 text-sm font-semibold mb-2">What We Stand For</div>
            <h2 className="text-3xl font-black text-gray-900">Our Core Values</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {VALUES.map(v => (
              <div key={v.title} className="bg-white rounded-2xl p-6 shadow-sm text-center">
                <div className={`w-14 h-14 ${v.bg} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                  <v.icon className={`w-7 h-7 ${v.fg}`} />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{v.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How We Work — service level transparency */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <p className="text-orange-500 text-xs font-bold uppercase tracking-widest mb-2">How We Work</p>
          <h2 className="text-3xl font-black text-gray-900">No surprises. No fine print.</h2>
          <p className="text-gray-500 mt-2 max-w-xl mx-auto">This is exactly what you get when you buy from us.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            {
              icon: Truck,
              title: 'Delivery',
              color: 'text-blue-600',
              bg: 'bg-blue-50',
              points: [
                'Free delivery within Karachi standard zones',
                '48 hours after advance payment & verification',
                'Door-to-room for large appliances (ACs, fridges)',
                'Out-of-city delivery priced on request',
              ],
            },
            {
              icon: Clock,
              title: 'Support Response',
              color: 'text-amber-600',
              bg: 'bg-amber-50',
              points: [
                'Normal requests: within 48 hours',
                'Urgent requests: same day (subject to availability)',
                'Urgent requests via WhatsApp by 12pm for same-day',
                'Technician visit: PKR 2,000 (standard) / 3,000 (urgent)',
              ],
            },
            {
              icon: CreditCard,
              title: 'Installments',
              color: 'text-green-600',
              bg: 'bg-green-50',
              points: [
                '2 to 12 month plans — no bank account required',
                'Advance payment required before delivery',
                'Verification completes within 24–48 hours of advance',
                'Solar systems above PKR 700k: cash only',
              ],
            },
            {
              icon: ShieldCheck,
              title: 'Warranty',
              color: 'text-purple-600',
              bg: 'bg-purple-50',
              points: [
                'Official brand warranty on every product',
                'We assist with warranty claims — no runaround',
                '7-day return on defective items in original packaging',
                'Coverage varies by brand and product type',
              ],
            },
            {
              icon: BadgeCheck,
              title: 'Authenticity',
              color: 'text-brand-600',
              bg: 'bg-brand-50',
              points: [
                '100% genuine products — no grey market or parallel imports',
                'Authorised dealer for all brands we carry',
                'Official brand invoices on every purchase',
                'Products come with brand-registered warranty cards',
              ],
            },
            {
              icon: Headphones,
              title: 'After-Sale',
              color: 'text-rose-600',
              bg: 'bg-rose-50',
              points: [
                'Dedicated support number and WhatsApp line',
                'We follow up after every major installation',
                'Annual maintenance contracts available (AMC)',
                'We liaise with brand service centers on your behalf',
              ],
            },
          ].map(item => (
            <div key={item.title} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
              <div className={`w-10 h-10 ${item.bg} rounded-xl flex items-center justify-center mb-4`}>
                <item.icon className={`w-5 h-5 ${item.color}`} />
              </div>
              <h3 className="font-bold text-gray-900 mb-3">{item.title}</h3>
              <ul className="space-y-1.5">
                {item.points.map(pt => (
                  <li key={pt} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" />
                    {pt}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* B2B / Corporate credibility */}
      <section className="bg-gray-950 py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <p className="text-brand-400 text-xs font-bold uppercase tracking-widest mb-3">Corporate & B2B</p>
              <h2 className="text-3xl font-black text-white mb-4">We outfit offices, hospitals, and housing projects.</h2>
              <p className="text-gray-400 leading-relaxed mb-6">
                Tajalli's has supplied bulk appliance packages to corporate offices, commercial kitchens, residential towers, and hospitality projects across Karachi.
                We offer volume pricing, consolidated invoicing, and dedicated account management.
              </p>
              <ul className="space-y-2 mb-6">
                {[
                  'Bulk pricing from 5+ units',
                  'Consolidated tax invoices',
                  'Site-wide AC / appliance packages',
                  'Dedicated project coordinator',
                  'Post-installation service contracts',
                ].map(pt => (
                  <li key={pt} className="flex items-center gap-2 text-sm text-gray-300">
                    <Building2 className="w-4 h-4 text-brand-400 shrink-0" />
                    {pt}
                  </li>
                ))}
              </ul>
              <div className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 mb-8 flex items-center gap-3">
                <BadgeCheck className="w-4 h-4 text-brand-400 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">National Tax Number (NTN)</p>
                  <p className="text-sm font-mono font-bold text-white tracking-wider mt-0.5">42101-3836602-3</p>
                </div>
              </div>
              <Link to="/corporate"
                className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-bold px-6 py-3 rounded-2xl transition-colors">
                Corporate Enquiry <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { value: '400+',   label: 'Products stocked' },
                { value: 'PKR 0',  label: 'Hidden charges' },
                { value: '11 yrs', label: 'In business' },
                { value: '6',      label: 'Authorised brands' },
              ].map(s => (
                <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-center">
                  <p className="text-2xl font-black text-white mb-1">{s.value}</p>
                  <p className="text-xs text-gray-500">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Brands */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-black text-gray-900">Brands We Carry</h2>
          <p className="text-gray-500 mt-2">Authorised dealer for Pakistan's leading appliance brands</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {[
            { name: 'Haier',     color: '#e31837', desc: "World's #1 appliance brand",       slug: 'haier' },
            { name: 'Dawlance',  color: '#003087', desc: "Pakistan's most trusted brand",     slug: 'dawlance' },
            { name: 'Gree',      color: '#00843d', desc: 'Energy-efficient inverter ACs',     slug: 'gree' },
            { name: 'EcoStar',   color: '#0070c0', desc: 'Smart TVs & air conditioners',      slug: 'ecostar' },
            { name: 'Crown',     color: '#1a1a2e', desc: 'Premium solar solutions',           slug: 'crown' },
            { name: 'Westpoint', color: '#2563eb', desc: 'Quality kitchen & home appliances', slug: 'westpoint' },
          ].map(b => (
            <Link key={b.slug} to={`/products?brand=${b.slug}`}
              className="flex flex-col items-center gap-3 bg-white border border-gray-100 hover:border-orange-300 hover:shadow-md rounded-2xl p-6 transition-all text-center">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-black text-2xl"
                style={{ backgroundColor: b.color }}>{b.name[0]}</div>
              <div>
                <div className="font-bold text-gray-800">{b.name}</div>
                <div className="text-xs text-gray-500 mt-0.5">{b.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gray-900 text-white py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-black mb-4">Ready to shop with us?</h2>
          <p className="text-gray-400 mb-8">Browse our full range or reach out — we're happy to help you find the right appliance.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/products" className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-4 rounded-2xl">
              Browse Products
            </Link>
            <a href={waSales()} target="_blank" rel="noreferrer"
              className="flex items-center gap-2 justify-center bg-green-600 hover:bg-green-700 text-white font-bold px-8 py-4 rounded-2xl">
              <MessageCircle className="w-5 h-5" /> WhatsApp Us
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
