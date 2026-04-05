/**
 * BookingModal — lightweight website-native booking form.
 * Used for solar/package/service bookings that don't go through the cart.
 * Submits to Supabase `orders` table with type='booking'.
 * WhatsApp is always available as an optional support path after submission.
 */

import { useState } from 'react'
import { X, CheckCircle, MessageCircle, Phone, AlertCircle } from 'lucide-react'
import { submitOrder } from '@/lib/api'
import { waSales } from '@/lib/whatsapp'

export interface BookingContext {
  /** Label shown in the form heading (e.g. "Green Corridor — Home Complete") */
  packageName: string
  /** Pre-filled notes context (passed as internal notes to order) */
  notes?: string
  /** The estimated price (shown informatively, not charged) */
  estimatedPrice?: number
}

interface Props {
  open:    boolean
  onClose: () => void
  context: BookingContext
}

export default function BookingModal({ open, onClose, context }: Props) {
  const [form, setForm]     = useState({ name: '', phone: '', city: '', notes: '' })
  const [loading, setLoading] = useState(false)
  const [done, setDone]     = useState(false)
  const [orderId, setOrderId] = useState('')
  const [error, setError]   = useState('')

  const phoneValid = /^(\+92|0)3\d{9}$/.test(form.phone.trim())
  const canSubmit  = !loading && form.name.trim() && phoneValid && form.city.trim()

  const handleSubmit = async () => {
    if (!canSubmit) return
    setLoading(true)
    setError('')
    try {
      const result = await submitOrder({
        customer_name:    form.name.trim(),
        customer_phone:   form.phone.trim(),
        customer_address: form.city.trim(),
        customer_email:   '',
        products: [{
          id: context.packageName,
          model: context.packageName,
          brand: 'Reliance',
          qty: 1,
          price: context.estimatedPrice ?? 0,
        }],
        total_amount:     context.estimatedPrice ?? 0,
        payment_method:   'booking',
        installment_plan: '',
        advance_paid:     0,
        monthly_amount:   0,
        notes: [
          `Package: ${context.packageName}`,
          context.notes ? `Context: ${context.notes}` : '',
          form.notes ? `Customer notes: ${form.notes}` : '',
        ].filter(Boolean).join(' | '),
      })
      if (result.error) throw new Error(result.error)
      setOrderId(result.id ? `BK-${result.id.toString().slice(0, 8).toUpperCase()}` : 'BK-' + Date.now())
      setDone(true)
    } catch {
      setError('Could not submit booking. Please try WhatsApp or call us directly.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!done) { setForm({ name: '', phone: '', city: '', notes: '' }); setError('') }
    setDone(false)
    onClose()
  }

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value })),
  })

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={e => { if (e.target === e.currentTarget) handleClose() }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      {/* Panel */}
      <div className="relative bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div>
            <p className="text-[11px] font-bold text-eco-600 uppercase tracking-widest mb-1">Book via Website</p>
            <h3 className="font-black text-gray-900 text-lg leading-snug">{context.packageName}</h3>
          </div>
          <button onClick={handleClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-colors ml-3 shrink-0 mt-0.5">
            <X className="w-4 h-4" />
          </button>
        </div>

        {done ? (
          /* ── Success state ── */
          <div className="px-6 py-8 text-center">
            <CheckCircle className="w-12 h-12 text-eco-500 mx-auto mb-4" />
            <h3 className="text-xl font-black text-gray-900 mb-2">Booking Received!</h3>
            <p className="text-gray-500 text-sm mb-1">Reference: <strong className="text-gray-900">{orderId}</strong></p>
            <p className="text-gray-400 text-sm mb-6">Our team will call you within a few hours to confirm and schedule a free site assessment.</p>
            <div className="space-y-3">
              <a
                href={waSales(`Hi, I just booked the ${context.packageName} online. My reference is ${orderId}.`)}
                target="_blank" rel="noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-[#25D366] hover:bg-[#1da84e] text-white font-semibold text-sm transition-colors"
              >
                <MessageCircle className="w-4 h-4" /> Track on WhatsApp (optional)
              </a>
              <button onClick={handleClose} className="w-full py-3 rounded-2xl border border-gray-200 text-gray-600 font-medium text-sm hover:bg-gray-50 transition-colors">
                Close
              </button>
            </div>
          </div>
        ) : (
          /* ── Form ── */
          <div className="px-6 py-5">
            <p className="text-xs text-gray-500 mb-5 leading-relaxed">
              Fill in your details and we'll call you to confirm and schedule a <strong>free site assessment</strong>. No payment now.
            </p>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-1.5">Full Name *</label>
                <input
                  type="text"
                  placeholder="Your name"
                  {...field('name')}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-eco-500 focus:ring-1 focus:ring-eco-500 transition-colors"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-1.5">Mobile Number *</label>
                <input
                  type="tel"
                  placeholder="03XX-XXXXXXX"
                  {...field('phone')}
                  className={`w-full border rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none transition-colors ${
                    form.phone && !phoneValid
                      ? 'border-red-300 focus:border-red-400 focus:ring-1 focus:ring-red-300'
                      : 'border-gray-200 focus:border-eco-500 focus:ring-1 focus:ring-eco-500'
                  }`}
                />
                {form.phone && !phoneValid && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Enter a valid Pakistani mobile number
                  </p>
                )}
              </div>

              {/* City/Area */}
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-1.5">City / Area *</label>
                <input
                  type="text"
                  placeholder="e.g. Karachi, DHA Phase 6"
                  {...field('city')}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-eco-500 focus:ring-1 focus:ring-eco-500 transition-colors"
                />
              </div>

              {/* Notes (optional) */}
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-1.5">Notes <span className="text-gray-400 font-normal normal-case">(optional)</span></label>
                <textarea
                  placeholder="Any specific requirements, load details, or questions…"
                  rows={2}
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-eco-500 focus:ring-1 focus:ring-eco-500 transition-colors resize-none"
                />
              </div>
            </div>

            {error && (
              <div className="mt-4 flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-red-700">{error}</p>
                  <a href={waSales(`Hi, I'd like to book the ${context.packageName} package.`)}
                    target="_blank" rel="noreferrer"
                    className="text-xs text-red-600 font-semibold hover:underline mt-1 inline-flex items-center gap-1">
                    <MessageCircle className="w-3 h-3" /> Book via WhatsApp instead
                  </a>
                </div>
              </div>
            )}

            <div className="mt-5 space-y-3">
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="w-full py-3.5 rounded-2xl font-black text-white bg-eco-500 hover:bg-eco-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm"
              >
                {loading ? 'Submitting…' : 'Confirm Booking'}
              </button>
              <a
                href={waSales(`Hi, I'd like to book the ${context.packageName} package.`)}
                target="_blank" rel="noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl border border-gray-200 text-gray-600 font-medium text-sm hover:bg-gray-50 transition-colors"
              >
                <MessageCircle className="w-4 h-4 text-[#25D366]" /> Prefer WhatsApp? Ask us here
              </a>
            </div>

            <p className="text-center text-[11px] text-gray-400 mt-4">
              <Phone className="w-3 h-3 inline mr-1" />No payment required now · We'll call to confirm
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
