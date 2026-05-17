import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CreditCard, Copy, CheckCircle, MessageCircle, Package, Upload } from 'lucide-react'
import { waSales } from '@/lib/whatsapp'
import type { PortalData } from './portalTypes'
import { INST_MONTHLY, BANK } from './portalConstants'

const fmtPKR  = (n: number) => 'PKR ' + Math.round(n || 0).toLocaleString('en-PK')
const fmtDate = (d: Date | string) => new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })

interface ScheduleRow { no: number; label: string; due: Date; amount: number; status: 'paid' | 'upcoming' | 'overdue' }

function buildSchedule(order: { created_at: string; advance_paid: number | null; monthly_amount: number | null; payment_method: string }): ScheduleRow[] {
  const rows: ScheduleRow[] = []
  const monthlyCount = INST_MONTHLY[order.payment_method] ?? 0
  const created = new Date(order.created_at)
  const now = new Date()

  rows.push({ no: 0, label: 'Advance Payment', due: created, amount: order.advance_paid ?? 0, status: 'paid' })

  for (let i = 1; i <= monthlyCount; i++) {
    const due = new Date(created)
    due.setMonth(due.getMonth() + i)
    rows.push({
      no: i,
      label: `Installment ${i}`,
      due,
      amount: order.monthly_amount ?? 0,
      status: due < now ? 'overdue' : 'upcoming',
    })
  }
  return rows
}

export default function PortalPayments({ orders }: PortalData) {
  const [copied, setCopied] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  const instOrders = orders.filter(o => INST_MONTHLY[o.payment_method])
  const cashOrders = orders.filter(o => !INST_MONTHLY[o.payment_method])

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => { setCopied(key); setTimeout(() => setCopied(''), 2000) })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-bold text-gray-900 text-lg">Payments & Installments</h2>
        <p className="text-sm text-gray-500">Your order history and upcoming installment schedule.</p>
      </div>

      {/* Bank transfer details */}
      <div className="bg-brand-50 border border-brand-200 rounded-2xl p-5">
        <p className="font-bold text-brand-900 mb-3 flex items-center gap-2"><CreditCard className="w-4 h-4" /> Bank Transfer Details</p>
        <div className="space-y-2">
          {[
            { label: 'Bank',          value: BANK.bank,    key: 'bank' },
            { label: 'Account Title', value: BANK.title,   key: 'title' },
            { label: 'Account No.',   value: BANK.account, key: 'account' },
            { label: 'IBAN',          value: BANK.iban,    key: 'iban' },
            { label: 'Branch',        value: BANK.branch,  key: 'branch' },
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
        <a href={waSales("Hi! I've made a bank transfer for my installment. Please confirm receipt.")} target="_blank" rel="noreferrer"
          className="mt-4 flex items-center justify-center gap-2 w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl text-sm transition-colors">
          <Upload className="w-4 h-4" /> Send Payment Confirmation on WhatsApp
        </a>
      </div>

      {/* Installment orders */}
      {instOrders.length > 0 && (
        <div>
          <h3 className="font-bold text-gray-700 text-sm mb-3">Installment Plans</h3>
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
                      {overdue.length > 0 && (
                        <span className="inline-block text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full mt-1">
                          {overdue.length} overdue payment{overdue.length > 1 ? 's' : ''}
                        </span>
                      )}
                      {upcoming && overdue.length === 0 && (
                        <p className="text-xs text-blue-600 font-medium mt-1">Next: {fmtPKR(upcoming.amount)} due {fmtDate(upcoming.due)}</p>
                      )}
                    </div>
                    <span className="text-gray-400 text-xs">{isOpen ? '▲' : '▼'}</span>
                  </button>

                  {isOpen && (
                    <div className="border-t border-gray-100 p-4 space-y-2">
                      {schedule.map(row => (
                        <div key={row.no} className={`flex items-center justify-between rounded-xl px-4 py-2.5 ${
                          row.status === 'paid'     ? 'bg-green-50' :
                          row.status === 'overdue'  ? 'bg-red-50'   : 'bg-gray-50'
                        }`}>
                          <div>
                            <p className="text-sm font-medium text-gray-800">{row.label}</p>
                            <p className="text-xs text-gray-400">{fmtDate(row.due)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-gray-900">{fmtPKR(row.amount)}</p>
                            <span className={`text-xs font-semibold ${
                              row.status === 'paid'    ? 'text-green-600' :
                              row.status === 'overdue' ? 'text-red-600'   : 'text-gray-400'
                            }`}>
                              {row.status === 'paid' ? '✓ Paid' : row.status === 'overdue' ? '⚠ Overdue' : 'Upcoming'}
                            </span>
                          </div>
                        </div>
                      ))}
                      {(overdue.length > 0 || upcoming) && (
                        <a href={waSales(`Hi! I'd like to pay my installment for order placed ${fmtDate(o.created_at)}. Amount: ${fmtPKR(upcoming?.amount ?? overdue[0]?.amount ?? 0)}.`)} target="_blank" rel="noreferrer"
                          className="flex items-center justify-center gap-2 w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-2.5 rounded-xl text-sm mt-2">
                          <MessageCircle className="w-4 h-4" /> Confirm Payment via WhatsApp
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
          <h3 className="font-bold text-gray-700 text-sm mb-3">Completed Orders</h3>
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
          <p className="text-sm mt-1">Orders placed with your email address appear here automatically.</p>
          <Link to="/products" className="inline-block mt-4 bg-brand-500 hover:bg-brand-600 text-white font-bold px-6 py-2.5 rounded-xl text-sm">
            Shop Now
          </Link>
        </div>
      )}
    </div>
  )
}
