import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle, MessageCircle, Phone, Building2, Zap, Car, CreditCard, ArrowRight } from 'lucide-react'
import SEO from '@/components/ui/SEO'
import AnimatedCounter from '@/components/ui/AnimatedCounter'
import { supabase } from '@/lib/supabase'
import { waSales } from '@/lib/whatsapp'

const PRODUCT_CATEGORIES = [
  'Solar Panels & Systems',
  'Inverters & Batteries',
  'EV Chargers',
  'Air Conditioners',
  'Refrigerators & Freezers',
  'Washing Machines',
  'Televisions',
  'Kitchen Appliances',
  'Water Heaters & Pumps',
  'Fans & Ventilation',
  'Consumer Electronics',
  'Financial / Credit Products',
  'Other',
]

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'You send stock',
    desc: 'Consignment arrangement. Products are displayed in our 800 sq.ft. Experience Corner and listed on our digital platform.',
  },
  {
    step: '02',
    title: 'We display & market',
    desc: 'Your brand reaches our 14,400-client network via our physical showroom, website, and 1,600-member Facebook community.',
  },
  {
    step: '03',
    title: 'Customer buys',
    desc: 'We close the sale — cash or 2 to 12-payment installments. We verify the customer and manage the full transaction.',
  },
  {
    step: '04',
    title: 'We remit to you',
    desc: 'Payment transferred within 30 days of sale. You bear zero credit risk — we absorb it entirely.',
  },
]

const PARTNER_TYPES = [
  {
    icon: Zap,
    iconColor: 'text-amber-500',
    iconBg: 'bg-amber-50',
    title: 'Solar & Energy Brands',
    pitch: 'We have the rooftop access you need.',
    body: '14,400 pre-engaged clients actively looking at solar. Our Green Corridor initiative is driving qualified, high-intent buyers directly to us.',
    proof: '95% of our solar leads come with a monthly bill over PKR 8,000.',
  },
  {
    icon: Car,
    iconColor: 'text-blue-500',
    iconBg: 'bg-blue-50',
    title: 'EV & Charging Brands',
    pitch: "Pakistan's EV transition is happening. We have the households.",
    body: 'Our customer base skews toward upper-middle income families across Karachi — exactly the demographic buying EVs in Pakistan today.',
    proof: 'Growing 1,600-member community actively discussing EV adoption.',
  },
  {
    icon: CreditCard,
    iconColor: 'text-eco-600',
    iconBg: 'bg-eco-50',
    title: 'Credit & Finance Partners',
    pitch: 'We verify customers. You provide financing.',
    body: 'Our 98% credit recovery rate over 15 years is not marketing copy — it is a documented track record across 23,000 invoices. We run the customer verification process ourselves.',
    proof: '98% credit recovery rate · 23,000+ invoices processed.',
  },
]

interface FormState {
  company:  string
  contact:  string
  phone:    string
  email:    string
  category: string
  volume:   string
  website:  string
  message:  string
}

const EMPTY_FORM: FormState = {
  company: '', contact: '', phone: '', email: '',
  category: '', volume: '', website: '', message: '',
}

export default function Partner() {
  const [form,       setForm]       = useState<FormState>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [submitted,  setSubmitted]  = useState(false)
  const [error,      setError]      = useState('')

  const set = (field: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const { error: dbError } = await supabase.from('partner_leads').insert({
        company_name:   form.company,
        contact_person: form.contact,
        phone:          form.phone,
        email:          form.email   || null,
        category:       form.category,
        monthly_volume: form.volume  || null,
        website:        form.website || null,
        message:        form.message || null,
        status:         'new',
      })
      if (dbError) throw dbError
      setSubmitted(true)
    } catch {
      setError('Submission failed. Please WhatsApp us directly — we reply within 2 hours.')
    } finally {
      setSubmitting(false)
    }
  }

  const waPartner = waSales('Hi, I\'d like to enquire about a brand partnership with Reliance Appliances.')

  return (
    <div className="min-h-screen bg-white">
      <SEO
        path="/partner"
        title="Partner With Us — Reliance Appliances B2B"
        description="Partner with Karachi's most trusted appliance distributor. Zero-risk consignment model. 14,400 clients, 98% credit recovery, 11 years in business."
        keywords="distributor karachi, appliance brand partner pakistan, consignment sales karachi, solar distributor karachi"
      />

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className="bg-gray-950 py-24 md:py-32 px-4 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        <div className="relative max-w-3xl mx-auto">
          <p className="text-brand-400 text-xs font-bold uppercase tracking-[0.2em] mb-6">B2B Partnership</p>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-white leading-[1.05] tracking-tight mb-6">
            You make it.<br />
            <span className="text-brand-400">We put it in 14,400 hands.</span>
          </h1>
          <p className="text-gray-400 text-xl mb-4 max-w-xl mx-auto">
            No upfront investment from you. Pay-as-it-sells. Zero credit risk.
          </p>
          <p className="text-gray-600 text-sm mb-10">
            We handle sales, credit verification, installments, delivery, and installation.
            You handle manufacturing and supply.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#apply"
              className="inline-flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-bold px-8 py-4 rounded-2xl transition-all shadow-brand">
              Apply to Partner <ArrowRight className="w-4 h-4" />
            </a>
            <a href={waPartner} target="_blank" rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 border border-gray-700 text-gray-300 hover:bg-gray-800 font-medium px-8 py-4 rounded-2xl transition-all">
              <MessageCircle className="w-5 h-5" /> WhatsApp Us
            </a>
          </div>
        </div>
      </section>

      {/* ── INFRASTRUCTURE STATS ─────────────────────────────────── */}
      <section className="border-b border-gray-100 py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <p className="text-center text-gray-400 text-xs font-bold uppercase tracking-widest mb-10">
            What you're buying into
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { target: 11,    suffix: ' Years', label: 'In Business',       sub: 'Established 2015, serving all Karachi' },
              { target: 14400, suffix: '+',      label: 'Clients in Network', sub: 'Verified buying customers' },
              { target: 24000, suffix: '+',      label: 'Orders Processed',   sub: 'Documented transaction history' },
              { target: 98,    suffix: '%',       label: 'Credit Recovery Rate', sub: 'Our SLA to finance partners' },
            ].map(item => (
              <div key={item.label}>
                <p className="text-4xl md:text-5xl font-black text-gray-900 mb-1">
                  <AnimatedCounter target={item.target} suffix={item.suffix} />
                </p>
                <p className="font-bold text-gray-800 text-sm mb-1">{item.label}</p>
                <p className="text-xs text-gray-500">{item.sub}</p>
              </div>
            ))}
          </div>

          {/* Experience Corner callout */}
          <div className="mt-12 bg-gray-50 rounded-3xl p-8 border border-gray-100 flex flex-col md:flex-row items-center gap-6">
            <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Building2 className="w-8 h-8 text-brand-500" />
            </div>
            <div>
              <h3 className="font-black text-gray-900 text-xl mb-1">Karachi Experience Corner</h3>
              <p className="text-gray-600 text-sm leading-relaxed max-w-2xl">
                An 800 sq.ft. physical showroom with live product demonstrations and walk-in customers.
                Partner products are displayed with branding, pricing, and installation showcases.
                Our sales team actively presents products and closes consultations in-store.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 py-20">
        <div className="text-center mb-14">
          <p className="text-brand-500 text-xs font-bold uppercase tracking-widest mb-3">The Model</p>
          <h2 className="text-3xl md:text-4xl font-black text-gray-900">Zero risk. Maximum reach.</h2>
          <p className="text-gray-500 mt-3 max-w-xl mx-auto">
            The consignment model removes every barrier between your product and 14,400 qualified buyers.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {HOW_IT_WORKS.map(step => (
            <div key={step.step} className="flex gap-5 p-6 bg-gray-50 rounded-2xl border border-gray-100">
              <span className="text-3xl font-black text-gray-200 leading-none flex-shrink-0">{step.step}</span>
              <div>
                <h3 className="font-bold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 bg-gray-900 text-white rounded-2xl p-6 text-center">
          <p className="text-gray-400 text-sm mb-2">The bottom line</p>
          <p className="text-xl font-bold">
            You bear <span className="text-brand-400">zero credit risk</span> and{' '}
            <span className="text-brand-400">zero upfront cost</span>. We absorb both.
          </p>
        </div>
      </section>

      {/* ── IDEAL PARTNERS ───────────────────────────────────────── */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <p className="text-brand-500 text-xs font-bold uppercase tracking-widest mb-3">Ideal Partners</p>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900">Built for forward-thinking brands.</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {PARTNER_TYPES.map(pt => (
              <div key={pt.title} className="bg-white rounded-3xl p-7 border border-gray-100 shadow-apple flex flex-col">
                <div className={`w-12 h-12 ${pt.iconBg} rounded-2xl flex items-center justify-center mb-4`}>
                  <pt.icon className={`w-6 h-6 ${pt.iconColor}`} />
                </div>
                <h3 className="font-black text-gray-900 text-lg mb-1">{pt.title}</h3>
                <p className="text-brand-500 text-sm font-semibold mb-3">{pt.pitch}</p>
                <p className="text-sm text-gray-600 leading-relaxed mb-5 flex-1">{pt.body}</p>
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <p className="text-xs text-gray-500 font-semibold">{pt.proof}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── APPLICATION FORM ─────────────────────────────────────── */}
      <section id="apply" className="max-w-3xl mx-auto px-4 py-20">
        <div className="text-center mb-10">
          <p className="text-brand-500 text-xs font-bold uppercase tracking-widest mb-3">Apply Now</p>
          <h2 className="text-3xl md:text-4xl font-black text-gray-900">Start the conversation.</h2>
          <p className="text-gray-500 mt-3">We review all applications within 48 hours. Our team will call you directly.</p>
        </div>

        {submitted ? (
          <div className="bg-eco-50 border border-eco-200 rounded-3xl p-12 text-center">
            <CheckCircle className="w-14 h-14 text-eco-500 mx-auto mb-4" />
            <h3 className="text-2xl font-black text-gray-900 mb-2">Application received.</h3>
            <p className="text-gray-600 mb-6">
              Our partnership team will call you within 48 hours. In the meantime, feel free to reach out on WhatsApp.
            </p>
            <a href={waPartner} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 font-bold text-white px-6 py-3 rounded-xl bg-wa hover:bg-wa-hover transition-colors">
              <MessageCircle className="w-4 h-4" /> WhatsApp Us
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-gray-50 rounded-3xl p-8 border border-gray-100 space-y-5">
            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
                  Company Name *
                </label>
                <input required value={form.company} onChange={set('company')}
                  placeholder="e.g. Solar Tech Pakistan"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-500 bg-white" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
                  Contact Person *
                </label>
                <input required value={form.contact} onChange={set('contact')}
                  placeholder="e.g. Ahmed Ali"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-500 bg-white" />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
                  Phone Number *
                </label>
                <input required type="tel" value={form.phone} onChange={set('phone')}
                  placeholder="03xx-xxxxxxx"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-500 bg-white" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
                  Email Address
                </label>
                <input type="email" value={form.email} onChange={set('email')}
                  placeholder="optional"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-500 bg-white" />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
                  Product Category *
                </label>
                <select required value={form.category} onChange={set('category')}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-500 bg-white appearance-none">
                  <option value="">Select category…</option>
                  {PRODUCT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
                  Estimated Monthly Volume
                </label>
                <input value={form.volume} onChange={set('volume')}
                  placeholder="e.g. 20–50 units/month"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-500 bg-white" />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
                Website / Catalogue Link
              </label>
              <input type="url" value={form.website} onChange={set('website')}
                placeholder="https://your-website.com (optional)"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-500 bg-white" />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
                Brief Message
              </label>
              <textarea value={form.message} onChange={set('message')} rows={3}
                placeholder="Tell us about your products and what you're looking for in a partnership…"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-500 bg-white resize-none" />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                <p className="text-sm text-red-700">{error}</p>
                <a href={waPartner} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sm font-semibold mt-2 text-wa">
                  <MessageCircle className="w-4 h-4" /> WhatsApp Us Instead
                </a>
              </div>
            )}

            <button type="submit" disabled={submitting}
              className="w-full py-4 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {submitting ? 'Submitting…' : <>Submit Application <ArrowRight className="w-4 h-4" /></>}
            </button>

            <p className="text-xs text-center text-gray-400">
              Or reach us directly:{' '}
              <a href="tel:+923354266238" className="font-semibold text-gray-700 hover:text-brand-600">
                <Phone className="w-3 h-3 inline-block" /> +92 335 4266238
              </a>
            </p>
          </form>
        )}
      </section>

      {/* Referral nudge */}
      <section className="max-w-4xl mx-auto px-4 pb-16">
        <div className="bg-orange-50 border border-orange-100 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-5">
          <div className="text-3xl">🎁</div>
          <div className="flex-1 text-center sm:text-left">
            <p className="font-bold text-gray-900">Not a business? You can still earn.</p>
            <p className="text-sm text-gray-500 mt-0.5">Individuals can refer friends and family and earn 2% on every completed sale — no sign-up required.</p>
          </div>
          <Link to="/referral"
            className="shrink-0 bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-colors whitespace-nowrap">
            See Referral Programme →
          </Link>
        </div>
      </section>
    </div>
  )
}
