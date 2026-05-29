'use client'

import { useState, useEffect } from 'react'
import { Loader2, Plus, X, CheckCircle, Clock, XCircle, FileText, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { PortalData } from './portalTypes'

interface Application {
  id: string
  product_interest: string
  requested_amount: number | null
  requested_months: number | null
  status: 'pending' | 'approved' | 'rejected' | 'converted'
  admin_note: string | null
  created_at: string
}

const MONTHS_OPTIONS = [6, 12, 18, 24, 36]
const EMPLOYMENT_OPTIONS = [
  { value: 'salaried',  label: 'Salaried Employee' },
  { value: 'business',  label: 'Business Owner' },
  { value: 'retired',   label: 'Retired / Pension' },
  { value: 'other',     label: 'Other' },
]

const STATUS_STYLE: Record<string, { cls: string; icon: React.ReactNode; label: string; next: string }> = {
  pending:   { cls: 'bg-amber-100 text-amber-700', icon: <Clock className="w-3 h-3" />, label: 'Under Review',
    next: 'Our team is reviewing your application. We will call you on the number you provided within 1–2 business days.' },
  approved:  { cls: 'bg-green-100 text-green-700', icon: <CheckCircle className="w-3 h-3" />, label: 'Approved',
    next: 'Congratulations! Your plan is approved. Visit our showroom or contact us to finalise the invoice and pay your advance.' },
  rejected:  { cls: 'bg-red-100 text-red-700',     icon: <XCircle className="w-3 h-3" />, label: 'Not Approved',
    next: 'We were unable to approve this application. Contact us on WhatsApp to discuss alternatives — a larger advance or a guarantor may help.' },
  converted: { cls: 'bg-blue-100 text-blue-700',   icon: <CheckCircle className="w-3 h-3" />, label: 'Invoice Issued',
    next: 'Invoice has been created. Check your Payments tab to view your monthly schedule and upcoming due dates.' },
}

const DOCS_CHECKLIST = [
  { label: 'Original CNIC (applicant)',         required: true,  note: 'Both sides — for identity verification' },
  { label: 'CNIC photocopy (guarantor)',         required: true,  note: 'Required for plans above PKR 50,000' },
  { label: 'Salary slip or bank statement',     required: false, note: '3 months — strongly recommended for faster approval' },
  { label: 'Proof of address',                  required: false, note: 'Utility bill or rental agreement — for delivery address confirmation' },
  { label: 'Business registration (if business)',required: false, note: 'NTN or trade registration — for corporate customers' },
]

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtPKR(n: number) {
  return 'Rs ' + Math.round(n).toLocaleString('en-PK')
}

function emptyForm() {
  return {
    customer_name: '', customer_phone: '', customer_email: '', customer_cnic: '',
    guarantor_name: '', guarantor_phone: '', guarantor_cnic: '',
    product_interest: '', requested_amount: '', requested_months: '12',
    employment_type: 'salaried', monthly_income: '',
  }
}

export default function PortalInstallments({ profile }: PortalData) {
  const [apps, setApps]       = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]       = useState(emptyForm)
  const [saving, setSaving]   = useState(false)
  const [err, setErr]         = useState('')
  const [done, setDone]       = useState(false)
  const [showGuide, setShowGuide] = useState(false)

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const { data } = await supabase
        .from('installment_applications')
        .select('id,product_interest,requested_amount,requested_months,status,admin_note,created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      setApps((data || []) as Application[])
      setLoading(false)
      // Pre-fill name/phone from profile if available
      if (profile) {
        setForm(f => ({
          ...f,
          customer_name:  profile.full_name || '',
          customer_phone: profile.phone     || '',
        }))
      }
    })()
  }, [profile])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.customer_name.trim() || !form.customer_phone.trim() || !form.product_interest.trim()) {
      setErr('Name, phone, and product interest are required.')
      return
    }
    setSaving(true); setErr('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setErr('Please sign in.'); setSaving(false); return }

    const { error } = await supabase.from('installment_applications').insert({
      user_id:          user.id,
      customer_name:    form.customer_name.trim(),
      customer_phone:   form.customer_phone.trim(),
      customer_email:   form.customer_email.trim() || null,
      customer_cnic:    form.customer_cnic.trim()  || null,
      guarantor_name:   form.guarantor_name.trim() || null,
      guarantor_phone:  form.guarantor_phone.trim() || null,
      guarantor_cnic:   form.guarantor_cnic.trim() || null,
      product_interest: form.product_interest.trim(),
      requested_amount: form.requested_amount ? Number(form.requested_amount) : null,
      requested_months: Number(form.requested_months),
      employment_type:  form.employment_type,
      monthly_income:   form.monthly_income ? Number(form.monthly_income) : null,
    })

    if (error) { setErr(error.message); setSaving(false); return }
    setDone(true)
    setSaving(false)
    setShowForm(false)
    // Reload
    const { data } = await supabase
      .from('installment_applications')
      .select('id,product_interest,requested_amount,requested_months,status,admin_note,created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setApps((data || []) as Application[])
  }

  if (loading) return <div className="py-10 text-center text-gray-400 text-sm">Loading…</div>

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-black text-gray-900">Installment Applications</h2>
          <p className="text-xs text-gray-500 mt-0.5">Apply for a monthly installment plan. Our team reviews within 1–2 business days.</p>
        </div>
        {!showForm && (
          <button onClick={() => { setShowForm(true); setDone(false) }}
            className="flex items-center gap-1.5 text-xs font-bold bg-brand-600 text-white px-3 py-2 rounded-xl hover:bg-brand-700">
            <Plus className="w-3.5 h-3.5" /> New Application
          </button>
        )}
      </div>

      {/* How it works + document checklist */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl overflow-hidden">
        <button onClick={() => setShowGuide(s => !s)}
          className="w-full flex items-center justify-between px-4 py-3 text-left">
          <span className="flex items-center gap-2 text-xs font-bold text-blue-800">
            <FileText className="w-3.5 h-3.5" /> How installments work &amp; required documents
          </span>
          {showGuide ? <ChevronUp className="w-4 h-4 text-blue-500" /> : <ChevronDown className="w-4 h-4 text-blue-500" />}
        </button>
        {showGuide && (
          <div className="px-4 pb-4 border-t border-blue-100 pt-3 space-y-4">
            {/* Process steps */}
            <div className="grid sm:grid-cols-4 gap-2">
              {[
                { n: '1', label: 'Submit application', detail: 'Fill this form with your details and product choice.' },
                { n: '2', label: 'Team reviews',       detail: 'We review within 1–2 business days and call you.' },
                { n: '3', label: 'Pay advance',        detail: 'Minimum 40% advance starts the order. Delivery within 1–3 days.' },
                { n: '4', label: 'Monthly payments',   detail: 'Pay on the same date each month until complete.' },
              ].map(s => (
                <div key={s.n} className="bg-white rounded-xl p-3">
                  <div className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center mb-1.5">{s.n}</div>
                  <p className="text-xs font-semibold text-gray-800 mb-0.5">{s.label}</p>
                  <p className="text-[10px] text-gray-500 leading-snug">{s.detail}</p>
                </div>
              ))}
            </div>
            {/* Document checklist */}
            <div>
              <p className="text-xs font-bold text-blue-800 mb-2">Documents to bring / share for approval</p>
              <div className="space-y-1.5">
                {DOCS_CHECKLIST.map(doc => (
                  <div key={doc.label} className="flex items-start gap-2">
                    <span className={`mt-px text-xs font-bold shrink-0 ${doc.required ? 'text-red-500' : 'text-gray-400'}`}>
                      {doc.required ? '✓ Required' : '○ Optional'}
                    </span>
                    <div>
                      <span className="text-xs text-gray-800 font-medium">{doc.label}</span>
                      <span className="text-[10px] text-gray-500 ml-1">— {doc.note}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {done && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-green-800">Application submitted!</p>
            <p className="text-xs text-green-700 mt-0.5">Our team will review it within 1–2 business days and contact you on the number you provided.</p>
          </div>
        </div>
      )}

      {showForm && (
        <form onSubmit={submit} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-900 text-sm">New Installment Application</h3>
            <button type="button" onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          {err && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">{err}</div>}

          {/* Customer details */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Your Details</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { k: 'customer_name',  label: 'Full Name *',  type: 'text' },
                { k: 'customer_phone', label: 'Phone *',      type: 'tel' },
                { k: 'customer_email', label: 'Email',        type: 'email' },
                { k: 'customer_cnic',  label: 'CNIC',         type: 'text' },
              ].map(f => (
                <div key={f.k}>
                  <label className="text-xs font-medium text-gray-600 block mb-1">{f.label}</label>
                  <input type={f.type} value={(form as any)[f.k]} onChange={e => set(f.k, e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
                </div>
              ))}
            </div>
          </div>

          {/* Employment */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Income</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Employment Type</label>
                <select value={form.employment_type} onChange={e => set('employment_type', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400">
                  {EMPLOYMENT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Monthly Income (PKR)</label>
                <input type="number" value={form.monthly_income} onChange={e => set('monthly_income', e.target.value)}
                  placeholder="Optional"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
              </div>
            </div>
          </div>

          {/* Guarantor */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Guarantor (Recommended)</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { k: 'guarantor_name',  label: 'Full Name',  type: 'text' },
                { k: 'guarantor_phone', label: 'Phone',      type: 'tel' },
                { k: 'guarantor_cnic',  label: 'CNIC',       type: 'text' },
              ].map(f => (
                <div key={f.k}>
                  <label className="text-xs font-medium text-gray-600 block mb-1">{f.label}</label>
                  <input type={f.type} value={(form as any)[f.k]} onChange={e => set(f.k, e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
                </div>
              ))}
            </div>
          </div>

          {/* Product */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Product & Terms</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Product You Want *</label>
                <input type="text" value={form.product_interest} onChange={e => set('product_interest', e.target.value)}
                  placeholder="e.g. Haier 1.5 Ton Inverter AC HSU-18HNF"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Approximate Price (PKR)</label>
                  <input type="number" value={form.requested_amount} onChange={e => set('requested_amount', e.target.value)}
                    placeholder="Optional"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Requested Duration</label>
                  <select value={form.requested_months} onChange={e => set('requested_months', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400">
                    {MONTHS_OPTIONS.map(m => <option key={m} value={m}>{m} months</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <button type="submit" disabled={saving}
            className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Submitting…' : 'Submit Application'}
          </button>
          <p className="text-xs text-gray-400 text-center">Our team reviews every application within 1–2 business days.</p>
        </form>
      )}

      {apps.length === 0 && !showForm ? (
        <div className="bg-gray-50 rounded-2xl p-8 text-center space-y-3">
          <p className="text-2xl">📋</p>
          <p className="font-semibold text-gray-700 text-sm">No applications yet</p>
          <p className="text-xs text-gray-400">Submit an application to start the installment approval process.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {apps.map(a => {
            const st = STATUS_STYLE[a.status] || STATUS_STYLE.pending
            return (
              <div key={a.id} className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">{a.product_interest}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {a.requested_months ? `${a.requested_months} months` : ''}
                      {a.requested_amount ? ` · ${fmtPKR(a.requested_amount)}` : ''}
                    </p>
                    {a.admin_note && (
                      <p className="text-xs text-gray-600 mt-1 italic">Admin note: {a.admin_note}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">Submitted {fmtDate(a.created_at)}</p>
                  </div>
                  <span className={`shrink-0 flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${st.cls}`}>
                    {st.icon} {st.label}
                  </span>
                </div>
                {st.next && (
                  <p className="text-[11px] text-gray-500 mt-2 leading-relaxed bg-gray-50 rounded-lg px-3 py-2">
                    <span className="font-semibold text-gray-600">What's next:</span> {st.next}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
