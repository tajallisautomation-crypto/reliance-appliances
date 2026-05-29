'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Package, ChevronDown, ChevronUp, MessageCircle, AlertCircle, ShoppingBag, FileText, Shield } from 'lucide-react'
import { waSales } from '@/lib/whatsapp'
import type { PortalData, InvoicePurchase } from './portalTypes'
import { INST_MONTHLY } from './portalConstants'

const fmtPKR  = (n: number) => 'PKR ' + Math.round(n || 0).toLocaleString('en-PK')
const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })

const STATUS_INFO: Record<string, { label: string; color: string; step: number }> = {
  pending:              { label: 'Order Received',       color: 'bg-gray-100 text-gray-600',   step: 1 },
  processing:           { label: 'Processing',           color: 'bg-blue-100 text-blue-700',   step: 2 },
  confirmed:            { label: 'Confirmed',            color: 'bg-green-100 text-green-700', step: 3 },
  dispatched:           { label: 'Dispatched',           color: 'bg-purple-100 text-purple-700', step: 4 },
  delivered:            { label: 'Delivered',            color: 'bg-brand-100 text-brand-700', step: 5 },
  installation_pending: { label: 'Installation Pending', color: 'bg-amber-100 text-amber-700', step: 5 },
  completed:            { label: 'Completed',            color: 'bg-green-100 text-green-700', step: 6 },
  cancelled:            { label: 'Cancelled',            color: 'bg-red-100 text-red-700',     step: 0 },
}

const INVOICE_STATUS_COLOR: Record<string, string> = {
  pending:      'bg-yellow-100 text-yellow-800',
  partial:      'bg-blue-100 text-blue-700',
  advance_paid: 'bg-orange-100 text-orange-800',
  paid:         'bg-green-100 text-green-700',
  overdue:      'bg-red-100 text-red-700',
}

const ORDER_STEPS = ['Order Received', 'Processing', 'Confirmed', 'Dispatched', 'Delivered', 'Completed']

function warrantyBadge(inv: InvoicePurchase) {
  const warranties = inv.lines
    .map(l => l.warranty)
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i)
  if (!warranties.length) return null
  return warranties[0]
}

function InvoicePurchaseCard({ inv }: { inv: InvoicePurchase }) {
  const [open, setOpen] = useState(false)
  const isInst = inv.doc_type === 'installment-invoice'
  const wty = warrantyBadge(inv)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-4 p-4 text-left hover:bg-gray-50 transition-colors"
      >
        <FileText className="w-5 h-5 text-brand-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-gray-900 text-sm">{fmtPKR(inv.grand_total)}</span>
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${INVOICE_STATUS_COLOR[inv.payment_status] ?? 'bg-gray-100 text-gray-500'}`}>
              {inv.payment_status}
            </span>
            {isInst && (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700">
                {inv.inst_months}m Installment
              </span>
            )}
            {wty && (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-green-100 text-green-700 flex items-center gap-1">
                <Shield className="w-3 h-3" /> {wty}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">Invoice {inv.ref_number} · {fmtDate(inv.created_at)}</p>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
      </button>

      {open && (
        <div className="border-t border-gray-100 p-4 space-y-4">
          {/* Items */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Items Purchased</p>
            <div className="space-y-2">
              {inv.lines.map((l, i) => (
                <div key={i} className="flex justify-between items-start py-2 border-b border-gray-50 last:border-0">
                  <div className="min-w-0 flex-1 pr-3">
                    <p className="text-sm font-medium text-gray-800">{l.qty > 1 ? `${l.qty}× ` : ''}{l.name}</p>
                    {l.warranty && (
                      <p className="text-xs text-green-600 mt-0.5 flex items-center gap-1">
                        <Shield className="w-3 h-3" /> {l.warranty}
                      </p>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-gray-700 flex-shrink-0">{fmtPKR(l.unit_price * l.qty)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Payment summary */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Payment</p>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total</span>
              <span className="font-bold">{fmtPKR(inv.grand_total)}</span>
            </div>
            {isInst && inv.inst_advance_amt != null && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Advance</span>
                  <span className="font-semibold text-green-600">{fmtPKR(inv.inst_advance_amt)}</span>
                </div>
                {inv.inst_monthly_amt != null && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Monthly × {inv.inst_months}</span>
                    <span className="font-semibold">{fmtPKR(inv.inst_monthly_amt)}</span>
                  </div>
                )}
              </>
            )}
          </div>

          {inv.notes && (
            <p className="text-xs text-gray-500 italic">{inv.notes}</p>
          )}

          <div className="flex flex-wrap gap-2">
            <a href={waSales(`Hi! I have a query about my purchase (Invoice ${inv.ref_number}) on ${fmtDate(inv.created_at)}.`)}
              target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 bg-wa hover:bg-wa-hover text-white text-xs font-bold px-4 py-2.5 rounded-xl">
              <MessageCircle className="w-3.5 h-3.5" /> Ask About This Purchase
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

export default function PortalOrders({ orders, invoicePurchases }: PortalData) {
  const [expanded, setExpanded] = useState<string | null>(null)

  const hasOrders   = orders.length > 0
  const hasInvoices = invoicePurchases.length > 0

  if (!hasOrders && !hasInvoices) {
    return (
      <div className="text-center py-16 text-gray-400">
        <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="font-semibold text-gray-600">No purchases yet</p>
        <p className="text-sm mt-1">Orders and invoices linked to your account will appear here.</p>
        <Link href="/products" className="inline-block mt-4 bg-brand-500 hover:bg-brand-600 text-white font-bold px-6 py-2.5 rounded-xl text-sm">
          Browse Products
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* ── Invoice-based purchases (from admin panel) ── */}
      {hasInvoices && (
        <div>
          <div className="mb-3">
            <h2 className="font-bold text-gray-900 text-lg">Purchase History</h2>
            <p className="text-sm text-gray-500">{invoicePurchases.length} invoice{invoicePurchases.length !== 1 ? 's' : ''} on file.</p>
          </div>
          <div className="space-y-3">
            {invoicePurchases.map(inv => (
              <InvoicePurchaseCard key={inv.id} inv={inv} />
            ))}
          </div>
        </div>
      )}

      {/* ── Online orders ── */}
      {hasOrders && (
        <div>
          <div className="mb-3">
            <h2 className="font-bold text-gray-900 text-lg">Online Orders</h2>
            <p className="text-sm text-gray-500">{orders.length} order{orders.length !== 1 ? 's' : ''} linked to your account.</p>
          </div>
          <div className="space-y-3">
            {orders.map(o => {
              const isOpen     = expanded === o.id
              const statusInfo = STATUS_INFO[o.status ?? ''] ?? { label: o.status ?? 'Processing', color: 'bg-amber-100 text-amber-700', step: 1 }
              const isInst     = !!INST_MONTHLY[o.payment_method]
              const remaining  = isInst ? Math.max(0, o.total_amount - (o.advance_paid ?? 0)) : 0

              return (
                <div key={o.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  <button
                    onClick={() => setExpanded(isOpen ? null : o.id)}
                    className="w-full flex items-center gap-4 p-4 text-left hover:bg-gray-50 transition-colors"
                  >
                    <Package className="w-5 h-5 text-brand-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-gray-900 text-sm">{fmtPKR(o.total_amount)}</span>
                        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                        {isInst && (
                          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
                            {o.payment_method.toUpperCase()} Installment
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{fmtDate(o.created_at)}</p>
                    </div>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                  </button>

                  {isOpen && (
                    <div className="border-t border-gray-100 p-4 space-y-5">
                      {statusInfo.step > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Order Progress</p>
                          <div className="flex items-center gap-1">
                            {ORDER_STEPS.map((step, i) => {
                              const stepNo  = i + 1
                              const done    = stepNo <= statusInfo.step
                              const current = stepNo === statusInfo.step
                              return (
                                <div key={step} className="flex-1 flex flex-col items-center gap-1">
                                  <div className={`w-3 h-3 rounded-full border-2 transition-colors ${done ? 'bg-brand-500 border-brand-500' : 'bg-white border-gray-300'} ${current ? 'ring-2 ring-brand-200' : ''}`} />
                                  <div className={`h-0.5 w-full ${done && stepNo < statusInfo.step ? 'bg-brand-400' : 'bg-gray-200'} ${i === 0 ? 'invisible' : ''}`} style={i === 0 ? {} : { marginTop: '-14px', width: '100%' }} />
                                  <p className={`text-[9px] text-center leading-tight ${done ? 'text-brand-600 font-semibold' : 'text-gray-400'}`} style={{ maxWidth: 48 }}>{step}</p>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Items Ordered</p>
                        <div className="space-y-2">
                          {Array.isArray(o.products) && o.products.length > 0 ? o.products.map((p, i) => (
                            <div key={i} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                              <p className="text-sm font-medium text-gray-800">{p.qty}× {p.brand} {p.model}</p>
                              <p className="text-sm font-semibold text-gray-700">{fmtPKR(p.price * p.qty)}</p>
                            </div>
                          )) : (
                            <p className="text-sm text-gray-400">Product details not available.</p>
                          )}
                        </div>
                      </div>

                      <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Payment</p>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Order Total</span>
                          <span className="font-bold">{fmtPKR(o.total_amount)}</span>
                        </div>
                        {isInst && (
                          <>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Advance Paid</span>
                              <span className="font-semibold text-green-600">{fmtPKR(o.advance_paid ?? 0)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Monthly Installment</span>
                              <span className="font-semibold">{fmtPKR(o.monthly_amount ?? 0)}</span>
                            </div>
                            {remaining > 0 && (
                              <div className="flex justify-between text-sm border-t border-gray-200 pt-2">
                                <span className="text-gray-700 font-semibold">Remaining Balance</span>
                                <span className="font-bold text-amber-700">{fmtPKR(remaining)}</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      <div className="text-xs text-gray-400 space-y-0.5">
                        <p>Customer: <span className="text-gray-600 font-medium">{o.customer_name}</span></p>
                        <p>Phone: <span className="text-gray-600 font-medium">{o.customer_phone}</span></p>
                        <p>Payment method: <span className="text-gray-600 font-medium">{o.payment_method}</span></p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <a href={waSales(`Hi! I have a question about my order placed on ${fmtDate(o.created_at)} for ${fmtPKR(o.total_amount)}. Name: ${o.customer_name}.`)} target="_blank" rel="noreferrer"
                          className="flex items-center gap-1.5 bg-wa hover:bg-wa-hover text-white text-xs font-bold px-4 py-2.5 rounded-xl">
                          <MessageCircle className="w-3.5 h-3.5" /> Ask About This Order
                        </a>
                        <a href={waSales(`Hi! I'd like to report an issue with my order placed on ${fmtDate(o.created_at)}. Name: ${o.customer_name}.`)} target="_blank" rel="noreferrer"
                          className="flex items-center gap-1.5 border border-red-200 text-red-500 hover:bg-red-50 text-xs font-bold px-4 py-2.5 rounded-xl">
                          <AlertCircle className="w-3.5 h-3.5" /> Report an Issue
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
