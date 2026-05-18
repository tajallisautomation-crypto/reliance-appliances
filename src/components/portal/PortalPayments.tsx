import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { CreditCard, Copy, CheckCircle, MessageCircle, Package, Upload, Loader2, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { waSales } from '@/lib/whatsapp'
import toast from 'react-hot-toast'
import type { PortalData } from './portalTypes'
import { INST_MONTHLY, BANK } from './portalConstants'

const fmtPKR  = (n: number) => 'PKR ' + Math.round(n || 0).toLocaleString('en-PK')
const fmtDate = (d: Date | string) => new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })

interface ScheduleRow { no: number; label: string; due: Date; amount: number; status: 'paid' | 'upcoming' | 'overdue' }
interface PaymentProof {
  id: string; order_id: string | null; payment_method: string
  amount: number; txn_date: string; reference_number: string
  notes: string; status: 'pending' | 'approved' | 'rejected'; admin_note: string | null; created_at: string
}

function buildSchedule(order: { created_at: string; advance_paid: number | null; monthly_amount: number | null; payment_method: string }): ScheduleRow[] {
  const rows: ScheduleRow[] = []
  const monthlyCount = INST_MONTHLY[order.payment_method] ?? 0
  const created = new Date(order.created_at)
  const now = new Date()
  rows.push({ no: 0, label: 'Advance Payment', due: created, amount: order.advance_paid ?? 0, status: 'paid' })
  for (let i = 1; i <= monthlyCount; i++) {
    const due = new Date(created)
    due.setMonth(due.getMonth() + i)
    rows.push({ no: i, label: `Installment ${i}`, due, amount: order.monthly_amount ?? 0, status: due < now ? 'overdue' : 'upcoming' })
  }
  return rows
}

const PROOF_STATUS_STYLE: Record<string, string> = {
  pending:  'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
}

export default function PortalPayments({ orders }: PortalData) {
  const [copied,     setCopied]     = useState('')
  const [expanded,   setExpanded]   = useState<string | null>(null)
  const [showPolicy, setShowPolicy] = useState(false)
  const [proofs,     setProofs]     = useState<PaymentProof[]>([])
  const [showProofForm, setShowProofForm] = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [proofForm,  setProofForm]  = useState({
    order_id: '', payment_method: 'bank', amount: '',
    txn_date: new Date().toISOString().slice(0, 10),
    reference_number: '', notes: '',
  })

  const setP = (k: string, v: string) => setProofForm(p => ({ ...p, [k]: v }))

  const instOrders = orders.filter(o => INST_MONTHLY[o.payment_method])
  const cashOrders = orders.filter(o => !INST_MONTHLY[o.payment_method])

  // Any overdue installment across all orders
  const hasOverdue = instOrders.some(o => {
    const schedule = buildSchedule(o)
    return schedule.some(r => r.status === 'overdue')
  })

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => { setCopied(key); setTimeout(() => setCopied(''), 2000) })
  }

  const fetchProofs = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('payment_proofs').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    setProofs(data || [])
  }
  useEffect(() => { fetchProofs() }, [])

  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!proofForm.amount || Number(proofForm.amount) <= 0) { toast.error('Enter a valid amount.'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    const { error } = await supabase.from('payment_proofs').insert({
      user_id:          user.id,
      order_id:         proofForm.order_id || null,
      payment_method:   proofForm.payment_method,
      amount:           Number(proofForm.amount),
      txn_date:         proofForm.txn_date,
      reference_number: proofForm.reference_number.trim(),
      notes:            proofForm.notes.trim(),
    })
    setSaving(false)
    if (error) { toast.error('Could not submit proof.'); return }
    toast.success('Payment proof submitted!')
    setShowProofForm(false)
    setProofForm({ order_id: '', payment_method: 'bank', amount: '', txn_date: new Date().toISOString().slice(0, 10), reference_number: '', notes: '' })
    fetchProofs()
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-bold text-gray-900 text-lg">Payments & Installments</h2>
        <p className="text-sm text-gray-500">View your installment schedule, submit payment proof, and track account status.</p>
      </div>

      {/* Overdue alert */}
      {hasOverdue && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-red-800 text-sm">Overdue Payment Detected</p>
            <p className="text-xs text-red-600 mt-1">
              One or more installments are past due. Please make payment and submit proof below, or contact us immediately to avoid additional charges.
            </p>
            <button onClick={() => setShowPolicy(s => !s)} className="text-xs text-red-500 underline mt-1">
              {showPolicy ? 'Hide policy' : 'View overdue policy'}
            </button>
            {showPolicy && (
              <div className="mt-3 bg-white border border-red-100 rounded-xl p-3 text-xs text-gray-600 space-y-1.5">
                <p>If an installment becomes overdue without prior notice, a 1% daily penalty may apply on the overdue balance from day 16 onward.</p>
                <p>Physical follow-up may begin after 15 days overdue. Product recovery may begin after 30 days overdue, as per your signed installment agreement.</p>
                <p className="font-semibold text-gray-800">If you are facing difficulty, please inform us immediately — we can often arrange an extension before it becomes a formal issue.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bank transfer details */}
      <div className="bg-brand-50 border border-brand-200 rounded-2xl p-5">
        <p className="font-bold text-brand-900 mb-3 flex items-center gap-2"><CreditCard className="w-4 h-4" /> Bank Transfer Details</p>
        <div className="space-y-2">
          {[
            { label: 'Bank',          value: BANK.bank,    key: 'bank'    },
            { label: 'Account Title', value: BANK.title,   key: 'title'   },
            { label: 'Account No.',   value: BANK.account, key: 'account' },
            { label: 'IBAN',          value: BANK.iban,    key: 'iban'    },
            { label: 'Branch',        value: BANK.branch,  key: 'branch'  },
          ].map(row => (
            <div key={row.key} className="flex items-center justify-between bg-white rounded-xl px-4 py-2.5">
              <div>
                <p className="text-xs text-gray-400">{row.label}</p>
                <p className="text-sm font-semibold text-gray-900 font-mono">{row.value}</p>
              </div>
              <button onClick={() => copy(row.value, row.key)}
                className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${copied === row.key ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                {copied === row.key ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-4">
          <a href={waSales("Hi! I've made a bank transfer. Please confirm receipt.")} target="_blank" rel="noreferrer"
            className="flex-1 flex items-center justify-center gap-2 bg-wa hover:bg-wa-hover text-white font-bold py-3 rounded-xl text-sm transition-colors">
            <MessageCircle className="w-4 h-4" /> Send Screenshot on WhatsApp
          </a>
          <button onClick={() => setShowProofForm(s => !s)}
            className="flex items-center gap-1.5 border border-brand-300 text-brand-700 hover:bg-brand-50 font-bold px-4 py-3 rounded-xl text-sm transition-colors">
            <Upload className="w-4 h-4" /> Log Payment
          </button>
        </div>
      </div>

      {/* Payment proof form */}
      {showProofForm && (
        <form onSubmit={handleSubmitProof} className="bg-blue-50 border border-blue-200 rounded-2xl p-5 space-y-4">
          <p className="font-semibold text-blue-900 text-sm">Log a Payment</p>
          <p className="text-xs text-blue-700">Record your payment details here. Then send the screenshot via WhatsApp so our team can verify it.</p>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Payment Method *</label>
              <select value={proofForm.payment_method} onChange={e => setP('payment_method', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400 bg-white">
                <option value="bank">Bank Transfer</option>
                <option value="easypaisa">EasyPaisa</option>
                <option value="jazzcash">JazzCash</option>
                <option value="cash">Cash</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Amount Paid (PKR) *</label>
              <input type="number" value={proofForm.amount} onChange={e => setP('amount', e.target.value)} required min={1}
                placeholder="e.g. 25000"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Payment Date *</label>
              <input type="date" value={proofForm.txn_date} onChange={e => setP('txn_date', e.target.value)} required
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Reference / Transaction ID</label>
              <input value={proofForm.reference_number} onChange={e => setP('reference_number', e.target.value)}
                placeholder="TXN ID or last 4 digits"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400" />
            </div>
            {instOrders.length > 0 && (
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-gray-600 block mb-1">For Which Order? (optional)</label>
                <select value={proofForm.order_id} onChange={e => setP('order_id', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400 bg-white">
                  <option value="">— Select if applicable —</option>
                  {instOrders.map(o => (
                    <option key={o.id} value={o.id}>
                      {fmtDate(o.created_at)} · {fmtPKR(o.total_amount)} · {o.payment_method.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-gray-600 block mb-1">Notes (optional)</label>
              <input value={proofForm.notes} onChange={e => setP('notes', e.target.value)}
                placeholder="e.g. 2nd installment for May"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400" />
            </div>
          </div>

          <div className="flex gap-2">
            <button type="submit" disabled={saving}
              className="flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-bold px-5 py-2.5 rounded-xl text-sm">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              {saving ? 'Saving…' : 'Submit Record'}
            </button>
            <button type="button" onClick={() => setShowProofForm(false)}
              className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          </div>
        </form>
      )}

      {/* Submitted proofs list */}
      {proofs.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Payment Records Submitted</p>
          <div className="space-y-2">
            {proofs.map(p => (
              <div key={p.id} className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{fmtPKR(p.amount)} · {p.payment_method}</p>
                  <p className="text-xs text-gray-400">{fmtDate(p.txn_date)}{p.reference_number ? ` · Ref: ${p.reference_number}` : ''}</p>
                  {p.admin_note && <p className="text-xs text-gray-500 mt-0.5 italic">{p.admin_note}</p>}
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${PROOF_STATUS_STYLE[p.status]}`}>
                  {p.status === 'pending' ? 'Pending Verification' : p.status === 'approved' ? 'Approved' : 'Rejected'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Installment schedules */}
      {instOrders.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Installment Plans</p>
          <div className="space-y-3">
            {instOrders.map(o => {
              const schedule = buildSchedule(o)
              const overdue  = schedule.filter(r => r.status === 'overdue')
              const upcoming = schedule.find(r => r.status === 'upcoming')
              const isOpen   = expanded === o.id
              return (
                <div key={o.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  <button onClick={() => setExpanded(isOpen ? null : o.id)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors">
                    <div>
                      <p className="font-semibold text-gray-900">{fmtPKR(o.total_amount)} · {o.payment_method.toUpperCase()} Plan</p>
                      <p className="text-xs text-gray-400 mt-0.5">Ordered {fmtDate(o.created_at)}</p>
                      {overdue.length > 0 && <span className="inline-block text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full mt-1">{overdue.length} overdue</span>}
                      {upcoming && overdue.length === 0 && <p className="text-xs text-blue-600 font-medium mt-1">Next: {fmtPKR(upcoming.amount)} due {fmtDate(upcoming.due)}</p>}
                    </div>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </button>
                  {isOpen && (
                    <div className="border-t border-gray-100 p-4 space-y-2">
                      {schedule.map(row => (
                        <div key={row.no} className={`flex items-center justify-between rounded-xl px-4 py-2.5 ${row.status === 'paid' ? 'bg-green-50' : row.status === 'overdue' ? 'bg-red-50' : 'bg-gray-50'}`}>
                          <div>
                            <p className="text-sm font-medium text-gray-800">{row.label}</p>
                            <p className="text-xs text-gray-400">{fmtDate(row.due)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-gray-900">{fmtPKR(row.amount)}</p>
                            <span className={`text-xs font-semibold ${row.status === 'paid' ? 'text-green-600' : row.status === 'overdue' ? 'text-red-600' : 'text-gray-400'}`}>
                              {row.status === 'paid' ? '✓ Paid' : row.status === 'overdue' ? '⚠ Overdue' : 'Upcoming'}
                            </span>
                          </div>
                        </div>
                      ))}
                      {(overdue.length > 0 || upcoming) && (
                        <a href={waSales(`Hi! Paying installment for order ${fmtDate(o.created_at)}, ${fmtPKR(o.total_amount)}. Amount: ${fmtPKR(upcoming?.amount ?? overdue[0]?.amount ?? 0)}.`)}
                          target="_blank" rel="noreferrer"
                          className="flex items-center justify-center gap-2 w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-2.5 rounded-xl text-sm mt-2">
                          <MessageCircle className="w-4 h-4" /> Confirm This Payment
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Cash orders */}
      {cashOrders.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Completed Orders</p>
          <div className="space-y-2">
            {cashOrders.map(o => (
              <div key={o.id} className="flex items-center justify-between bg-white rounded-xl border border-gray-100 px-4 py-3">
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{fmtPKR(o.total_amount)}</p>
                  <p className="text-xs text-gray-400">{fmtDate(o.created_at)} · Cash</p>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${o.status === 'delivered' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                  {o.status || 'Confirmed'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {orders.length === 0 && (
        <div className="text-center py-14 text-gray-400">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-semibold text-gray-600">No orders linked to your account</p>
          <p className="text-sm mt-1">Orders placed with your email appear here automatically.</p>
          <Link to="/products" className="inline-block mt-4 bg-brand-500 hover:bg-brand-600 text-white font-bold px-6 py-2.5 rounded-xl text-sm">Shop Now</Link>
        </div>
      )}
    </div>
  )
}
