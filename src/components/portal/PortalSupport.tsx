import { useState, useEffect } from 'react'
import { Loader2, Plus, MessageCircle, CheckCircle, Clock, AlertCircle, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { waSales } from '@/lib/whatsapp'
import toast from 'react-hot-toast'
import type { PortalData } from './portalTypes'

interface Ticket {
  id: string; ticket_ref: string; category: string; subject: string
  description: string; status: string; priority: string
  order_id: string | null; appliance_id: string | null
  resolution_note: string | null; created_at: string
}

const CATEGORIES = [
  { value: 'warranty_claim',     label: 'Warranty Claim',      emoji: '🛡️' },
  { value: 'product_defect',     label: 'Product Defect',      emoji: '⚠️' },
  { value: 'delivery_issue',     label: 'Delivery Issue',      emoji: '🚚' },
  { value: 'installation_issue', label: 'Installation Issue',  emoji: '🔧' },
  { value: 'payment_issue',      label: 'Payment Issue',       emoji: '💳' },
  { value: 'wrong_product',      label: 'Wrong Product',       emoji: '📦' },
  { value: 'service_request',    label: 'Service Request',     emoji: '🔨' },
  { value: 'complaint',          label: 'General Complaint',   emoji: '📋' },
  { value: 'other',              label: 'Other',               emoji: '❓' },
]

const STATUS_STYLES: Record<string, string> = {
  open:             'bg-red-100 text-red-700',
  in_review:        'bg-blue-100 text-blue-700',
  waiting_customer: 'bg-amber-100 text-amber-700',
  assigned:         'bg-purple-100 text-purple-700',
  resolved:         'bg-green-100 text-green-700',
  rejected:         'bg-gray-100 text-gray-600',
}
const STATUS_LABELS: Record<string, string> = {
  open: 'Open', in_review: 'In Review', waiting_customer: 'Awaiting Your Response',
  assigned: 'Assigned', resolved: 'Resolved', rejected: 'Rejected',
}

const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })

// Quick-action chips that pre-fill the form
const QUICK_ACTIONS = [
  { label: 'Warranty Claim',    category: 'warranty_claim',     subject: 'Warranty claim for my product' },
  { label: 'Product Defect',    category: 'product_defect',     subject: 'Product is not working properly' },
  { label: 'Service Request',   category: 'service_request',    subject: 'Service/maintenance visit required' },
  { label: 'Delivery Issue',    category: 'delivery_issue',     subject: 'Issue with my delivery' },
  { label: 'Payment Dispute',   category: 'payment_issue',      subject: 'Payment related issue' },
  { label: 'Installation Help', category: 'installation_issue', subject: 'Installation not completed' },
]

export default function PortalSupport({ appliances, orders }: PortalData) {
  const [tickets,   setTickets]   = useState<Ticket[]>([])
  const [loading,   setLoading]   = useState(true)
  const [showForm,  setShowForm]  = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [form, setForm] = useState({
    category: 'complaint', subject: '', description: '',
    order_id: '', appliance_id: '', priority: 'medium',
  })

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const fetchTickets = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setTickets(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchTickets() }, [])

  const applyQuickAction = (qa: typeof QUICK_ACTIONS[0]) => {
    setForm(p => ({ ...p, category: qa.category, subject: qa.subject }))
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.subject.trim() || !form.description.trim()) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    const { data: ticket, error } = await supabase
      .from('support_tickets')
      .insert({
        user_id:      user.id,
        category:     form.category,
        subject:      form.subject.trim(),
        description:  form.description.trim(),
        priority:     form.priority,
        order_id:     form.order_id   || null,
        appliance_id: form.appliance_id || null,
      })
      .select()
      .single()
    setSaving(false)
    if (error) { toast.error('Could not submit ticket.'); return }
    toast.success(`Ticket ${ticket?.ticket_ref} submitted!`)
    setForm({ category: 'complaint', subject: '', description: '', order_id: '', appliance_id: '', priority: 'medium' })
    setShowForm(false)
    fetchTickets()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-gray-900 text-lg">Support & Warranty</h2>
          <p className="text-sm text-gray-500">Raise a support request, warranty claim, or complaint.</p>
        </div>
        <button onClick={() => setShowForm(s => !s)}
          className="flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors">
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cancel' : 'New Request'}
        </button>
      </div>

      {/* Quick action chips */}
      {!showForm && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Quick Actions</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_ACTIONS.map(qa => (
              <button key={qa.category} onClick={() => applyQuickAction(qa)}
                className="flex items-center gap-1.5 border border-gray-200 bg-white hover:border-brand-300 hover:bg-brand-50 text-gray-700 text-sm font-medium px-4 py-2 rounded-xl transition-colors">
                {CATEGORIES.find(c => c.value === qa.category)?.emoji} {qa.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* New ticket form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-brand-50 border border-brand-200 rounded-2xl p-5 space-y-4">
          <p className="font-semibold text-brand-900 text-sm">Raise a Support Request</p>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Category *</label>
              <select value={form.category} onChange={e => set('category', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400 bg-white">
                {CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Priority</label>
              <select value={form.priority} onChange={e => set('priority', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400 bg-white">
                <option value="low">Low — Non-urgent</option>
                <option value="medium">Medium — Within a few days</option>
                <option value="high">High — Urgent issue</option>
                <option value="urgent">Urgent — Product unusable</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Subject *</label>
            <input value={form.subject} onChange={e => set('subject', e.target.value)} required
              placeholder="Short description of the issue"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400" />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Description *</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} required rows={4}
              placeholder="Please describe the issue in detail — what happened, when it happened, what you have tried."
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400 resize-none" />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {orders.length > 0 && (
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Related Order (optional)</label>
                <select value={form.order_id} onChange={e => set('order_id', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400 bg-white">
                  <option value="">— Select order —</option>
                  {orders.map(o => (
                    <option key={o.id} value={o.id}>
                      {new Date(o.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })} · PKR {Math.round(o.total_amount).toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {appliances.length > 0 && (
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Related Appliance (optional)</label>
                <select value={form.appliance_id} onChange={e => set('appliance_id', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400 bg-white">
                  <option value="">— Select appliance —</option>
                  {appliances.map(a => (
                    <option key={a.id} value={a.id}>{a.brand} {a.model || a.category}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
            After submitting, you can send photos or videos of the issue via WhatsApp. A link will be provided.
          </div>

          <div className="flex gap-2">
            <button type="submit" disabled={saving || !form.subject.trim() || !form.description.trim()}
              className="flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {saving ? 'Submitting…' : 'Submit Request'}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Ticket list */}
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-brand-400" /></div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <CheckCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-semibold text-gray-600">No support requests</p>
          <p className="text-sm mt-1">Use the quick actions above or WhatsApp us for immediate help.</p>
          <a href={waSales('Hi! I need some help.')} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-2 mt-4 bg-wa hover:bg-wa-hover text-white font-bold px-5 py-2.5 rounded-xl text-sm">
            <MessageCircle className="w-4 h-4" /> WhatsApp Support
          </a>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{tickets.length} Request{tickets.length !== 1 ? 's' : ''}</p>
          {tickets.map(t => {
            const catInfo = CATEGORIES.find(c => c.value === t.category)
            const isResolved = ['resolved', 'rejected'].includes(t.status)
            return (
              <div key={t.id} className={`bg-white rounded-2xl border p-4 ${isResolved ? 'border-gray-100 opacity-80' : 'border-gray-100 hover:border-brand-200'}`}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-lg">{catInfo?.emoji}</span>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{t.subject}</p>
                      <p className="text-xs text-gray-400 font-mono">{t.ticket_ref} · {fmtDate(t.created_at)}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${STATUS_STYLES[t.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {STATUS_LABELS[t.status] ?? t.status}
                  </span>
                </div>

                <p className="text-xs text-gray-500 line-clamp-2 mb-3">{t.description}</p>

                {t.resolution_note && (
                  <div className="bg-green-50 border border-green-100 rounded-xl p-3 mb-3">
                    <p className="text-xs font-semibold text-green-700 mb-0.5">Resolution Note</p>
                    <p className="text-xs text-green-600">{t.resolution_note}</p>
                  </div>
                )}

                {!isResolved && (
                  <div className="flex gap-2">
                    <a href={waSales(`Hi! Following up on my support ticket ${t.ticket_ref}: "${t.subject}". Please update me on the status.`)} target="_blank" rel="noreferrer"
                      className="flex items-center gap-1.5 bg-wa hover:bg-wa-hover text-white text-xs font-bold px-3 py-2 rounded-xl">
                      <MessageCircle className="w-3.5 h-3.5" /> Follow Up
                    </a>
                    {t.status === 'waiting_customer' && (
                      <span className="flex items-center gap-1 text-xs text-amber-600 font-semibold">
                        <AlertCircle className="w-3.5 h-3.5" /> Your response is needed
                      </span>
                    )}
                    {t.status === 'open' && (
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock className="w-3.5 h-3.5" /> Waiting for review
                      </span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
