import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MessageCircle, Phone, Mail, AlertCircle, Package, Wrench, Truck, HelpCircle, CheckCircle2 } from 'lucide-react'
import SEO from '@/components/ui/SEO'
import { waSales } from '@/lib/whatsapp'
import { submitEnquiry } from '@/lib/api'

const ISSUE_TYPES = [
  { value: 'product-defect',   label: 'Product Defect / Malfunction', icon: Wrench },
  { value: 'delivery',         label: 'Delivery Issue',               icon: Truck },
  { value: 'warranty-claim',   label: 'Warranty Claim',               icon: Package },
  { value: 'wrong-product',    label: 'Wrong / Damaged Product',      icon: AlertCircle },
  { value: 'billing',          label: 'Billing / Installment Issue',  icon: HelpCircle },
  { value: 'general-query',    label: 'General Query',                icon: HelpCircle },
]

export default function Support() {
  const [submitted, setSubmitted] = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [err,       setErr]       = useState('')
  const [form, setForm] = useState({
    name: '', phone: '', area: '', address: '', orderRef: '', product: '',
    issueType: '', urgency: 'normal', description: '',
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  function buildWhatsAppMessage() {
    const issue = ISSUE_TYPES.find(t => t.value === form.issueType)?.label || form.issueType
    return encodeURIComponent(
      `*Support Request — Tajalli's*\n\n` +
      `*Name:* ${form.name}\n` +
      `*Phone:* ${form.phone}\n` +
      (form.area    ? `*Area:* ${form.area}\n`         : '') +
      (form.address ? `*Address:* ${form.address}\n`   : '') +
      (form.orderRef ? `*Order Ref:* ${form.orderRef}\n` : '') +
      (form.product  ? `*Product:* ${form.product}\n`   : '') +
      `*Issue Type:* ${issue}\n` +
      `*Urgency:* ${form.urgency === 'urgent' ? '🔴 Same-Day Priority' : '🟡 Standard (Within 48 hrs)'}\n\n` +
      `*Description:*\n${form.description}`
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setErr('')
    try {
      await submitEnquiry({
        name: form.name, phone: form.phone,
        area: form.area || null,
        address: form.address || null,
        order_ref: form.orderRef || null,
        product: form.product || null,
        issue_type: form.issueType,
        urgency: form.urgency,
        description: form.description,
      })
      setSubmitted(true)
    } catch {
      setErr('Could not submit. Please try again or contact us directly.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-10 text-center shadow-apple-xl">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Request Received</h2>
          <p className="text-gray-500 mb-6">
            Our support team will contact you within <strong>48 hours</strong> (urgent requests same day). JazakAllah.
          </p>
          <div className="space-y-3">
            <Link to="/" className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl font-bold bg-brand-500 text-white hover:bg-brand-600 transition-colors">
              Back to Home
            </Link>
            <a href={waSales()} target="_blank" rel="noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl font-bold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">
              <MessageCircle className="w-4 h-4 text-[#25D366]" /> Chat on WhatsApp instead
            </a>
          </div>
          <button onClick={() => setSubmitted(false)} className="mt-4 text-sm text-gray-400 hover:text-gray-600">
            Submit another request
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SEO
        title="Customer Support — Tajalli's Karachi"
        description="Submit a complaint, warranty claim, or support request to Tajalli's. We respond within 48 hours — urgent cases same day."
        keywords="tajallis support, complaint, warranty claim karachi, after sale service"
        path="/support"
      />

      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white py-14 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur px-4 py-2 rounded-full text-sm font-medium mb-5">
            <HelpCircle className="w-4 h-4" /> Customer Support
          </div>
          <h1 className="text-3xl md:text-4xl font-black mb-3">How can we help you?</h1>
          <p className="text-blue-100 max-w-lg mx-auto">
            Fill in the form below and our team will contact you directly on WhatsApp. Normal requests: within 48 hours. Urgent cases: same day.
          </p>
        </div>
      </section>

      {/* Quick contact strip */}
      <div className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 py-4 flex flex-wrap gap-4 justify-center">
          <a href="tel:+923702578788" className="flex items-center gap-2 text-sm text-gray-600 hover:text-brand-600 font-medium">
            <Phone className="w-4 h-4" /> +92 370 2578788
          </a>
          <a href="tel:+923354266238" className="flex items-center gap-2 text-sm text-gray-600 hover:text-brand-600 font-medium">
            <Phone className="w-4 h-4" /> +92 335 4266238
          </a>
          <a href="mailto:support@tajallis.com.pk" className="flex items-center gap-2 text-sm text-gray-600 hover:text-brand-600 font-medium">
            <Mail className="w-4 h-4" /> support@tajallis.com.pk
          </a>
          <a href={waSales('Hi, I need support.')} target="_blank" rel="noreferrer"
            className="flex items-center gap-2 text-sm text-green-700 hover:text-green-800 font-medium">
            <MessageCircle className="w-4 h-4" /> Chat directly on WhatsApp
          </a>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10 grid md:grid-cols-3 gap-8">

        {/* Issue type cards (left) */}
        <div className="space-y-3">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Common Issues</p>
          {ISSUE_TYPES.map(t => (
            <button key={t.value}
              onClick={() => setForm(f => ({ ...f, issueType: t.value }))}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left text-sm font-medium border transition-all
                ${form.issueType === t.value
                  ? 'bg-brand-50 border-brand-300 text-brand-700'
                  : 'bg-white border-gray-100 text-gray-700 hover:border-brand-200 hover:bg-brand-50/50'}`}>
              <t.icon className="w-4 h-4 flex-shrink-0" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Form (right) */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-3xl shadow-apple-lg p-8">
            <h2 className="text-xl font-black text-gray-900 mb-6">Submit a Support Request</h2>

            <form onSubmit={handleSubmit} className="space-y-5">

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name <span className="text-red-500">*</span></label>
                  <input required name="name" value={form.name} onChange={handleChange}
                    placeholder="e.g. Ahmed Ali"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Phone Number <span className="text-red-500">*</span></label>
                  <input required name="phone" value={form.phone} onChange={handleChange}
                    type="tel" placeholder="03XX-XXXXXXX"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400" />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Area / Locality <span className="text-red-500">*</span></label>
                  <select required name="area" value={form.area} onChange={handleChange}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-400 cursor-pointer">
                    <option value="">Select area…</option>
                    {[
                      'DHA / Defence','Clifton / Bath Island','Gulshan-e-Iqbal','PECHS / Shahrah-e-Faisal',
                      'North Karachi','Nazimabad / North Nazimabad','Korangi / Landhi','Malir',
                      'Orangi / Baldia','Lyari','Saddar / City','Gulistan-e-Jauhar','Federal B Area',
                      'Scheme 33','Surjani Town','Other / Not listed',
                    ].map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Street / House Address <span className="text-gray-400 font-normal">(helps us route)</span></label>
                  <input name="address" value={form.address} onChange={handleChange}
                    placeholder="e.g. B-12, Block 7, Gulshan-e-Iqbal"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400" />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Order Reference <span className="text-gray-400 font-normal">(if applicable)</span></label>
                  <input name="orderRef" value={form.orderRef} onChange={handleChange}
                    placeholder="e.g. ORD-A1B2C3D4"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Product Name / Model</label>
                  <input name="product" value={form.product} onChange={handleChange}
                    placeholder="e.g. Haier HRF-246 EBS"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400" />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Issue Type <span className="text-red-500">*</span></label>
                  <select required name="issueType" value={form.issueType} onChange={handleChange}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-400 cursor-pointer">
                    <option value="">Select issue type…</option>
                    {ISSUE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Urgency</label>
                  <div className="flex flex-col gap-2 mt-1">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input type="radio" name="urgency" value="normal" checked={form.urgency === 'normal'} onChange={handleChange}
                        className="accent-brand-500 mt-0.5" />
                      <span className="text-sm text-gray-700">
                        <span className="font-medium">Standard</span>
                        <span className="text-gray-400 ml-1">— Within 48 hours</span>
                      </span>
                    </label>
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input type="radio" name="urgency" value="urgent" checked={form.urgency === 'urgent'} onChange={handleChange}
                        className="accent-brand-500 mt-0.5" />
                      <span className="text-sm text-gray-700">
                        <span className="font-medium">Same-Day Priority</span>
                        <span className="text-gray-400 ml-1">— request by 12 pm</span>
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Describe Your Issue <span className="text-red-500">*</span></label>
                <textarea required name="description" value={form.description} onChange={handleChange}
                  rows={5} placeholder="Please describe the issue in as much detail as possible. Include when the problem started, what you've tried, and any error messages or symptoms."
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400 resize-none" />
              </div>

              {err && (
                <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-sm text-red-700">{err}</div>
              )}

              <button type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-white text-base shadow-lg active:scale-[0.98] bg-brand-500 hover:bg-brand-600 disabled:opacity-60 transition-colors">
                <CheckCircle2 className="w-5 h-5" />
                {loading ? 'Submitting…' : 'Submit Request'}
              </button>

              <p className="text-center text-xs text-gray-400">
                Response within 48 hours (urgent requests same day). Prefer instant chat?{' '}
                <a href={waSales()} target="_blank" rel="noreferrer" className="text-[#25D366] hover:underline">WhatsApp us directly</a>.
              </p>
            </form>
          </div>
        </div>
      </div>

      {/* FAQ strip */}
      <section className="max-w-5xl mx-auto px-4 pb-16">
        <h2 className="text-xl font-black text-gray-900 mb-5">Frequently Asked Questions</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            { q: 'What is covered under warranty?', a: 'All products come with official brand warranty. Coverage varies by brand (1–10 years). Contact us with your model number for specifics.' },
            { q: 'How long does delivery take?', a: 'Same-day or next-day delivery within Karachi. Out-of-city deliveries take 2–4 business days.' },
            { q: 'Can I return a product?', a: 'Yes, within 7 days if the product is in original condition and packaging. Defective products are exchanged immediately.' },
            { q: 'How do installment payments work?', a: 'You pay an advance at delivery. Remaining instalments are collected monthly. No bank account required.' },
          ].map(faq => (
            <div key={faq.q} className="bg-white rounded-2xl p-5 border border-gray-100">
              <div className="font-bold text-gray-800 mb-1.5 text-sm">{faq.q}</div>
              <div className="text-sm text-gray-500 leading-relaxed">{faq.a}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
