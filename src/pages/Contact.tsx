import { useState } from 'react'
import { Phone, Mail, MapPin, MessageCircle, Clock, Send, CheckCircle } from 'lucide-react'
import SEO from '@/components/ui/SEO'
import { waSales } from '@/lib/whatsapp'
import { supabase } from '@/lib/supabase'

const CONTACT_INFO = [
  { icon: Phone,   label: 'Sales',   value: '+92 370 2578788', href: 'tel:+923702578788' },
  { icon: Phone,   label: 'Support', value: '+92 335 4266238', href: 'tel:+923354266238' },
  { icon: Mail,    label: 'Email',   value: 'support@tajallis.com.pk', href: 'mailto:support@tajallis.com.pk' },
  { icon: MapPin,  label: 'Location', value: 'Karachi, Pakistan', href: '#' },
]

const HOURS = [
  { days: 'Mon – Sat', time: '10:00 AM – 8:00 PM' },
  { days: 'Sunday',    time: '11:00 AM – 6:00 PM' },
]

export default function Contact() {
  const [form, setForm] = useState({ name: '', phone: '', email: '', subject: '', message: '' })
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.phone || !form.message) return
    setLoading(true)
    setError('')
    try {
      const { error: dbErr } = await supabase.from('analytics').insert({
        event: 'contact_form',
        customer_name: form.name,
        customer_phone: form.phone,
        customer_email: form.email,
        subject: form.subject,
        message: form.message,
      })
      if (dbErr) throw dbErr
      setSent(true)
    } catch (err: any) {
      setError('Failed to send message. Please WhatsApp us directly.')
      if (import.meta.env.DEV) console.error('[Contact]', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <SEO
        title="Contact Us — Reliance by Tajallis Karachi"
        description="Get in touch with Reliance by Tajallis. Call, WhatsApp, or send us a message. We're here to help with product enquiries, orders, and after-sale support."
        keywords="contact reliance appliances karachi, appliance store phone number, whatsapp appliances pakistan"
      />

      {/* Hero */}
      <section className="bg-gradient-to-br from-gray-900 to-gray-800 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full text-sm font-medium mb-6">
            📞 Get In Touch
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-4">We're Here to Help</h1>
          <p className="text-gray-300 text-lg max-w-xl mx-auto">
            Questions about a product, an order, or after-sale support? Reach out on WhatsApp for the fastest response.
          </p>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid lg:grid-cols-5 gap-12">

          {/* Contact details */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-5">Contact Information</h2>
              <div className="space-y-4">
                {CONTACT_INFO.map(c => (
                  <a key={c.value} href={c.href}
                    className="flex items-center gap-4 p-4 bg-gray-50 hover:bg-brand-50 rounded-2xl transition-colors group">
                    <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center flex-shrink-0">
                      <c.icon className="w-5 h-5 text-brand-500" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 font-medium">{c.label}</div>
                      <div className="text-sm font-semibold text-gray-800 group-hover:text-brand-700">{c.value}</div>
                    </div>
                  </a>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-brand-500" /> Business Hours
              </h3>
              <div className="space-y-2">
                {HOURS.map(h => (
                  <div key={h.days} className="flex justify-between text-sm py-2 border-b border-gray-100">
                    <span className="text-gray-600">{h.days}</span>
                    <span className="font-medium text-gray-800">{h.time}</span>
                  </div>
                ))}
              </div>
            </div>

            <a href={waSales()} target="_blank" rel="noreferrer"
              className="flex items-center justify-center gap-3 w-full py-4 rounded-2xl text-white font-bold text-lg shadow-lg hover:shadow-xl bg-wa hover:bg-wa-hover transition-colors">
              <MessageCircle className="w-6 h-6" />
              Chat on WhatsApp
            </a>
            <p className="text-xs text-center text-gray-400">Fastest response — usually within minutes during business hours</p>
          </div>

          {/* Contact form */}
          <div className="lg:col-span-3">
            <h2 className="text-xl font-bold text-gray-900 mb-5">Send Us a Message</h2>
            {sent ? (
              <div className="flex flex-col items-center justify-center gap-4 py-16 bg-green-50 rounded-2xl border border-green-200 text-center">
                <CheckCircle className="w-14 h-14 text-green-500" />
                <div>
                  <h3 className="font-bold text-green-800 text-lg">Message Sent!</h3>
                  <p className="text-green-600 text-sm mt-1">We'll get back to you within a few hours.</p>
                </div>
                <button onClick={() => { setSent(false); setForm({ name:'', phone:'', email:'', subject:'', message:'' }) }}
                  className="text-sm text-gray-500 hover:text-gray-700 underline">Send another message</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Full Name *</label>
                    <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                      placeholder="Your name"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-400" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Phone Number *</label>
                    <input required value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                      placeholder="+92 3XX XXXXXXX" type="tel"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-400" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Email (optional)</label>
                  <input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    placeholder="your@email.com" type="email"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-400" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Subject</label>
                  <select value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-400 bg-white">
                    <option value="">Select a topic...</option>
                    <option>Product Enquiry</option>
                    <option>Order Status</option>
                    <option>Installment Plans</option>
                    <option>Warranty / Repair</option>
                    <option>Solar Consultation</option>
                    <option>Corporate / Bulk Order</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Message *</label>
                  <textarea required rows={5} value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                    placeholder="Tell us how we can help..."
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-400 resize-none" />
                </div>
                {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>}
                <button type="submit" disabled={loading || !form.name || !form.phone || !form.message}
                  className="w-full flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-colors">
                  <Send className="w-4 h-4" />
                  {loading ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
