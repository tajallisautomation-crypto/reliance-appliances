import { Link } from 'react-router-dom'
import { ShieldCheck, CreditCard, Truck, Headphones, MapPin, Phone, Mail, MessageCircle } from 'lucide-react'
import SEO from '@/components/ui/SEO'
import { waSales } from '@/lib/whatsapp'

const TEAM = [
  { name: 'Reliance Appliances', role: 'Karachi\'s trusted home appliance partner since 2015', initial: 'R', color: 'from-blue-500 to-cyan-500' },
]

const STATS = [
  { value: '10+',    label: 'Years in Business' },
  { value: '14,000+', label: 'Happy Customers' },
  { value: '400+',   label: 'Products Available' },
  { value: '4',      label: 'Premium Brands' },
]

const VALUES = [
  { icon: ShieldCheck, title: 'Authenticity',     desc: 'Every product we sell is 100% genuine with official brand warranty. No grey-market or parallel imports.', color: 'blue' },
  { icon: CreditCard,  title: 'Flexibility',      desc: 'We offer 2–12 month installment plans so everyone can afford quality appliances, no bank account needed.', color: 'green' },
  { icon: Truck,       title: 'Reliability',      desc: 'We deliver to your door and provide professional installation — so your appliance is set up right from day one.', color: 'orange' },
  { icon: Headphones,  title: 'After-Sale Care',  desc: 'Our relationship doesn\'t end at the sale. We follow up, handle warranty claims, and provide ongoing support.', color: 'purple' },
]

export default function About() {
  return (
    <div className="min-h-screen bg-white">
      <SEO
        title="About Us — Reliance Appliances Karachi"
        description="Learn about Reliance Appliances — Karachi's most trusted home appliance partner since 2015. Serving 14,000+ households with genuine products, easy installments & real after-sale support."
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
            Since 2015, Reliance Appliances has been helping Karachi households get the best home appliances — with genuine products, flexible installments, and real after-sale support.
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
                Reliance Appliances was founded with a simple belief: every Pakistani family deserves access to quality home appliances at fair prices — without the runaround of grey-market products or opaque pricing.
              </p>
              <p>
                We started small in Karachi, focusing on a few key brands and building deep expertise in what we sell. Over the years, we've grown by word of mouth — customer by customer — because we do what we say.
              </p>
              <p>
                Today we carry 400+ products from Haier, Dawlance, Crown, and Westpoint. Our installment plans have helped thousands of families afford air conditioners, refrigerators, and solar systems that make their lives better.
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
              <div className="text-4xl font-black mb-1">4</div>
              <div className="text-green-100 text-sm">Premium Brands</div>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl p-6 text-white">
              <div className="text-4xl font-black mb-1">5★</div>
              <div className="text-purple-100 text-sm">Customer Rating</div>
            </div>
          </div>
        </div>
      </section>

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
                <div className={`w-14 h-14 bg-${v.color}-100 rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                  <v.icon className={`w-7 h-7 text-${v.color}-600`} />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{v.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Brands */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-black text-gray-900">Brands We Carry</h2>
          <p className="text-gray-500 mt-2">Authorised dealer for Pakistan's leading appliance brands</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { name: 'Haier',     color: '#e31837', desc: "World's #1 appliance brand",      slug: 'haier' },
            { name: 'Dawlance', color: '#003087', desc: "Pakistan's most trusted brand",    slug: 'dawlance' },
            { name: 'Crown',    color: '#1a1a2e', desc: 'Premium solar solutions',           slug: 'crown' },
            { name: 'Westpoint',color: '#2563eb', desc: 'Quality kitchen & home appliances', slug: 'westpoint' },
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
