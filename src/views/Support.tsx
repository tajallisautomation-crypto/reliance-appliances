'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  MessageCircle, Phone, Mail, AlertCircle, Package,
  Wrench, Truck, HelpCircle, CheckCircle2, ChevronRight, ArrowLeft, CalendarCheck,
} from 'lucide-react'
import SEO from '@/components/ui/SEO'
import { waSales } from '@/lib/whatsapp'
import { WA_SALES } from '@/lib/config'
import { submitEnquiry } from '@/lib/api'

// ── Issue definitions ────────────────────────────────────────────────────────

interface IssueType {
  value: string
  label: string
  icon: React.ElementType
  color: string
  hint: string
  requiredFields: ('orderRef' | 'product' | 'serialNumber' | 'address' | 'dueDate')[]
  waTemplate: (f: FormState) => string
}

const ISSUE_TYPES: IssueType[] = [
  {
    value: 'product-defect',
    label: 'Product Defect / Malfunction',
    icon: Wrench,
    color: 'text-orange-600 bg-orange-50 border-orange-200',
    hint: 'Include invoice/order number, product model, and a photo or video of the issue if possible.',
    requiredFields: ['orderRef', 'product'],
    waTemplate: f =>
      `Hi Tajalli's, I need support with a product defect.\n\nName: ${f.name}\nPhone: ${f.phone}\nInvoice No: ${f.orderRef || '—'}\nProduct Model: ${f.product || '—'}\nSerial No: ${f.serialNumber || '—'}\n\nIssue:\n${f.description}`,
  },
  {
    value: 'delivery',
    label: 'Delivery Issue',
    icon: Truck,
    color: 'text-blue-600 bg-blue-50 border-blue-200',
    hint: 'Share your order number and delivery address so we can locate your shipment immediately.',
    requiredFields: ['orderRef', 'address'],
    waTemplate: f =>
      `Hi Tajalli's, I have a delivery issue.\n\nName: ${f.name}\nPhone: ${f.phone}\nOrder No: ${f.orderRef || '—'}\nDelivery Address: ${f.address || '—'}\n\nIssue:\n${f.description}`,
  },
  {
    value: 'warranty-claim',
    label: 'Warranty Claim',
    icon: Package,
    color: 'text-purple-600 bg-purple-50 border-purple-200',
    hint: 'You will need: invoice/order number, product model, serial number, and a photo or video of the fault.',
    requiredFields: ['orderRef', 'product', 'serialNumber'],
    waTemplate: f =>
      `Hi Tajalli's, I need to file a warranty claim.\n\nName: ${f.name}\nPhone: ${f.phone}\nInvoice No: ${f.orderRef || '—'}\nProduct Model: ${f.product || '—'}\nSerial No: ${f.serialNumber || '—'}\n\nIssue:\n${f.description}\n\n(Photo/video will be attached)`,
  },
  {
    value: 'wrong-product',
    label: 'Wrong / Damaged Product',
    icon: AlertCircle,
    color: 'text-red-600 bg-red-50 border-red-200',
    hint: 'Please attach a clear photo or video showing the damage or wrong item. This speeds up your replacement.',
    requiredFields: ['orderRef', 'product'],
    waTemplate: f =>
      `Hi Tajalli's, I received a wrong or damaged product.\n\nName: ${f.name}\nPhone: ${f.phone}\nOrder No: ${f.orderRef || '—'}\nProduct: ${f.product || '—'}\n\nIssue:\n${f.description}\n\n(Photo/video will be attached)`,
  },
  {
    value: 'billing',
    label: 'Billing / Installment Issue',
    icon: HelpCircle,
    color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    hint: 'Share your account/customer name, invoice number, and the due date or amount in question.',
    requiredFields: ['orderRef'],
    waTemplate: f =>
      `Hi Tajalli's, I need help with my installment account.\n\nName: ${f.name}\nPhone: ${f.phone}\nInvoice No: ${f.orderRef || '—'}\nDue Date: ${f.dueDate || '—'}\n\nIssue:\n${f.description}`,
  },
  {
    value: 'care-plan',
    label: 'Annual Care Plan / Service Package',
    icon: CalendarCheck,
    color: 'text-amber-700 bg-amber-50 border-amber-200',
    hint: 'For Annual Care Plan enquiries, new subscriptions, renewals, or queries about service packages and pricing.',
    requiredFields: ['product'],
    waTemplate: f =>
      `Hi Tajalli's, I have an enquiry about an Annual Care Plan or Service Package.\n\nName: ${f.name}\nPhone: ${f.phone}\nAppliance / Product: ${f.product || '—'}\n\nEnquiry:\n${f.description}`,
  },
  {
    value: 'general-query',
    label: 'General Query',
    icon: HelpCircle,
    color: 'text-gray-600 bg-gray-50 border-gray-200',
    hint: 'Ask us anything — product availability, pricing, packages, or anything else.',
    requiredFields: [],
    waTemplate: f =>
      `Hi Tajalli's, I have a query.\n\nName: ${f.name}\nPhone: ${f.phone}\n\nQuery:\n${f.description}`,
  },
]

// ── Form state ───────────────────────────────────────────────────────────────

interface FormState {
  name: string; phone: string; area: string; address: string
  orderRef: string; product: string; serialNumber: string
  dueDate: string; issueType: string; urgency: string; description: string
}

const EMPTY: FormState = {
  name: '', phone: '', area: '', address: '', orderRef: '',
  product: '', serialNumber: '', dueDate: '', issueType: '',
  urgency: 'normal', description: '',
}

// ── Step indicator ───────────────────────────────────────────────────────────

function StepBar({ step }: { step: number }) {
  const steps = ['Issue Type', 'Your Details', 'Describe & Submit']
  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((label, i) => (
        <div key={label} className="flex items-center gap-2 flex-1 min-w-0">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold border-2 transition-colors ${
            i + 1 < step  ? 'bg-brand-500 border-brand-500 text-white'
            : i + 1 === step ? 'border-brand-500 text-brand-600 bg-brand-50'
            : 'border-gray-200 text-gray-400 bg-white'
          }`}>{i + 1 < step ? '✓' : i + 1}</div>
          <span className={`text-xs font-medium truncate hidden sm:block ${i + 1 === step ? 'text-brand-600' : 'text-gray-400'}`}>{label}</span>
          {i < steps.length - 1 && <div className={`h-0.5 flex-1 rounded-full ${i + 1 < step ? 'bg-brand-400' : 'bg-gray-200'}`} />}
        </div>
      ))}
    </div>
  )
}

// ── Page component ───────────────────────────────────────────────────────────

export default function Support() {
  const [step, setStep]           = useState<1 | 2 | 3>(1)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading]     = useState(false)
  const [err, setErr]             = useState('')
  const [form, setForm]           = useState<FormState>(EMPTY)

  const issue = ISSUE_TYPES.find(t => t.value === form.issueType)

  function set(field: keyof FormState, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function buildWAUrl() {
    const msg = issue ? issue.waTemplate(form) : `Support request from ${form.name} (${form.phone}): ${form.description}`
    return `https://wa.me/${WA_SALES}?text=${encodeURIComponent(msg)}`
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
      setErr('Could not submit. Please try again or use WhatsApp below.')
    } finally {
      setLoading(false)
    }
  }

  // ── Done ──────────────────────────────────────────────────────────────────

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-10 text-center shadow-apple-xl">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Request Received</h2>
          <p className="text-gray-500 mb-6 leading-relaxed">
            Your support request has been received. Our team usually responds within business hours.
            Urgent issues should be sent on WhatsApp for the fastest response.
          </p>
          <div className="space-y-3">
            <a href={buildWAUrl()} target="_blank" rel="noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl font-bold text-white bg-[#25D366] hover:bg-[#1fb857] transition-colors">
              <MessageCircle className="w-4 h-4" /> Continue on WhatsApp
            </a>
            <Link href="/" className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl font-bold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">
              Back to Home
            </Link>
          </div>
          <button onClick={() => { setSubmitted(false); setForm(EMPTY); setStep(1) }}
            className="mt-4 text-sm text-gray-400 hover:text-gray-600">
            Submit another request
          </button>
        </div>
      </div>
    )
  }

  // ── Page shell ─────────────────────────────────────────────────────────────

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
            Tell us what happened and we will take care of the rest. Normal requests within 48 hours — urgent cases same day.
          </p>
        </div>
      </section>

      {/* Quick contact strip */}
      <div className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap gap-4 justify-center">
          <a href="tel:+923702578788" className="flex items-center gap-2 text-sm text-gray-600 hover:text-brand-600 font-medium">
            <Phone className="w-4 h-4" /> +92 370 2578788
          </a>
          <a href="mailto:support@tajallis.com.pk" className="flex items-center gap-2 text-sm text-gray-600 hover:text-brand-600 font-medium">
            <Mail className="w-4 h-4" /> support@tajallis.com.pk
          </a>
          <a href={waSales('Hi, I need support.')} target="_blank" rel="noreferrer"
            className="flex items-center gap-2 text-sm text-green-700 hover:text-green-800 font-medium">
            <MessageCircle className="w-4 h-4" /> Fastest: chat on WhatsApp
          </a>
        </div>
      </div>

      {/* Form area */}
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="bg-white rounded-3xl shadow-apple-lg p-6 sm:p-8">
          <StepBar step={step} />

          {/* ── Step 1: Choose issue ──────────────────────────────────────── */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-black text-gray-900 mb-2">What kind of issue is this?</h2>
              <p className="text-sm text-gray-500 mb-6">Select the category that best fits your situation.</p>
              <div className="space-y-2.5">
                {ISSUE_TYPES.map(t => (
                  <button key={t.value}
                    onClick={() => { set('issueType', t.value); setStep(2) }}
                    className={`w-full flex items-center justify-between gap-3 px-4 py-4 rounded-2xl text-left border transition-all
                      ${form.issueType === t.value
                        ? 'bg-brand-50 border-brand-300 text-brand-700'
                        : 'bg-gray-50 border-gray-100 text-gray-700 hover:border-brand-200 hover:bg-brand-50/40'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 ${t.color}`}>
                        <t.icon className="w-4 h-4" />
                      </div>
                      <span className="font-semibold text-sm">{t.label}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 2: Contact + reference info ─────────────────────────── */}
          {step === 2 && issue && (
            <div>
              <button onClick={() => setStep(1)} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-5">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border mb-6 ${issue.color}`}>
                <issue.icon className="w-4 h-4 flex-shrink-0" />
                <div>
                  <p className="font-bold text-sm">{issue.label}</p>
                  <p className="text-xs opacity-80 mt-0.5">{issue.hint}</p>
                </div>
              </div>

              <h2 className="text-xl font-black text-gray-900 mb-5">Your contact details</h2>
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name <span className="text-red-500">*</span></label>
                    <input required value={form.name} onChange={e => set('name', e.target.value)}
                      placeholder="e.g. Ahmed Ali"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Phone Number <span className="text-red-500">*</span></label>
                    <input required value={form.phone} onChange={e => set('phone', e.target.value)}
                      type="tel" placeholder="03XX-XXXXXXX"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400" />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Order / Invoice No <span className={issue.requiredFields.includes('orderRef') ? 'text-red-500' : 'text-gray-400 font-normal'}>{issue.requiredFields.includes('orderRef') ? '*' : '(optional)'}</span>
                    </label>
                    <input value={form.orderRef} onChange={e => set('orderRef', e.target.value)}
                      placeholder="e.g. ORD-A1B2C3D4"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Product Model <span className={issue.requiredFields.includes('product') ? 'text-red-500' : 'text-gray-400 font-normal'}>{issue.requiredFields.includes('product') ? '*' : '(optional)'}</span>
                    </label>
                    <input value={form.product} onChange={e => set('product', e.target.value)}
                      placeholder="e.g. Haier HRF-246 EBS"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400" />
                  </div>
                </div>

                {issue.requiredFields.includes('serialNumber') && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Serial Number</label>
                    <input value={form.serialNumber} onChange={e => set('serialNumber', e.target.value)}
                      placeholder="Usually on the sticker at the back or side of the product"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400" />
                  </div>
                )}

                {issue.requiredFields.includes('address') && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Delivery Address <span className="text-red-500">*</span></label>
                    <input value={form.address} onChange={e => set('address', e.target.value)}
                      placeholder="e.g. B-12, Block 7, Gulshan-e-Iqbal"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400" />
                  </div>
                )}

                {issue.requiredFields.includes('dueDate') && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Installment Due Date</label>
                    <input type="text" value={form.dueDate} onChange={e => set('dueDate', e.target.value)}
                      placeholder="e.g. 5th of each month"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400" />
                  </div>
                )}

                <button
                  onClick={() => { if (form.name.trim() && form.phone.trim()) setStep(3) }}
                  disabled={!form.name.trim() || !form.phone.trim()}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-50 transition-colors">
                  Next: Describe Your Issue <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Describe + submit ─────────────────────────────────── */}
          {step === 3 && issue && (
            <form onSubmit={handleSubmit}>
              <button type="button" onClick={() => setStep(2)} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-5">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <h2 className="text-xl font-black text-gray-900 mb-5">Describe the issue</h2>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    What happened? <span className="text-red-500">*</span>
                    {(issue.value === 'wrong-product' || issue.value === 'warranty-claim' || issue.value === 'product-defect') && (
                      <span className="text-gray-400 font-normal ml-1">(attach photo/video via WhatsApp after submitting)</span>
                    )}
                  </label>
                  <textarea required rows={5} value={form.description} onChange={e => set('description', e.target.value)}
                    placeholder="Describe the issue clearly — when it started, what you've already tried, and any visible symptoms."
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400 resize-none" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Urgency</label>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {[
                      { val: 'normal', label: 'Standard', sub: 'Response within 48 hours' },
                      { val: 'urgent', label: 'Same-Day Priority', sub: 'Request by 12 pm' },
                    ].map(o => (
                      <label key={o.val} className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${form.urgency === o.val ? 'border-brand-400 bg-brand-50' : 'border-gray-200 hover:border-gray-300'}`}>
                        <input type="radio" name="urgency" value={o.val} checked={form.urgency === o.val}
                          onChange={() => set('urgency', o.val)} className="accent-brand-500 mt-0.5" />
                        <div>
                          <p className="font-semibold text-sm text-gray-800">{o.label}</p>
                          <p className="text-xs text-gray-400">{o.sub}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {err && (
                  <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-sm text-red-700">{err}</div>
                )}

                <button type="submit" disabled={loading || !form.description.trim()}
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-white text-base shadow-lg active:scale-[0.98] bg-brand-500 hover:bg-brand-600 disabled:opacity-60 transition-colors">
                  <CheckCircle2 className="w-5 h-5" />
                  {loading ? 'Submitting…' : 'Submit Request'}
                </button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
                  <div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-gray-400">or skip the form</span></div>
                </div>

                <a href={buildWAUrl()} target="_blank" rel="noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl font-bold text-white bg-[#25D366] hover:bg-[#1fb857] transition-colors">
                  <MessageCircle className="w-4 h-4" /> Continue on WhatsApp instead
                </a>
                <p className="text-center text-xs text-gray-400">
                  WhatsApp is pre-filled with your details — just tap send.
                </p>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* FAQ strip */}
      <section className="max-w-2xl mx-auto px-4 pb-16">
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
