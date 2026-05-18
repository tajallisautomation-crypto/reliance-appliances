import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Package, ChevronDown, ChevronUp, MessageCircle, AlertCircle, ShoppingBag } from 'lucide-react'
import { waSales } from '@/lib/whatsapp'
import type { PortalData } from './portalTypes'
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

const ORDER_STEPS = ['Order Received', 'Processing', 'Confirmed', 'Dispatched', 'Delivered', 'Completed']

export default function PortalOrders({ orders }: PortalData) {
  const [expanded, setExpanded] = useState<string | null>(null)

  if (orders.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="font-semibold text-gray-600">No orders yet</p>
        <p className="text-sm mt-1">Orders placed with your email appear here automatically.</p>
        <Link to="/products" className="inline-block mt-4 bg-brand-500 hover:bg-brand-600 text-white font-bold px-6 py-2.5 rounded-xl text-sm">
          Browse Products
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-bold text-gray-900 text-lg">My Orders</h2>
        <p className="text-sm text-gray-500">{orders.length} order{orders.length !== 1 ? 's' : ''} linked to your account.</p>
      </div>

      <div className="space-y-3">
        {orders.map(o => {
          const isOpen   = expanded === o.id
          const statusInfo = STATUS_INFO[o.status ?? ''] ?? { label: o.status ?? 'Processing', color: 'bg-amber-100 text-amber-700', step: 1 }
          const isInst   = !!INST_MONTHLY[o.payment_method]
          const totalPaid = isInst ? (o.advance_paid ?? 0) : o.total_amount
          const remaining = isInst ? Math.max(0, o.total_amount - (o.advance_paid ?? 0)) : 0

          return (
            <div key={o.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">

              {/* Summary row */}
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

              {/* Expanded detail */}
              {isOpen && (
                <div className="border-t border-gray-100 p-4 space-y-5">

                  {/* Status timeline */}
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

                  {/* Products */}
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Items Ordered</p>
                    <div className="space-y-2">
                      {Array.isArray(o.products) && o.products.length > 0 ? o.products.map((p, i) => (
                        <div key={i} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                          <div>
                            <p className="text-sm font-medium text-gray-800">{p.qty}× {p.brand} {p.model}</p>
                          </div>
                          <p className="text-sm font-semibold text-gray-700">{fmtPKR(p.price * p.qty)}</p>
                        </div>
                      )) : (
                        <p className="text-sm text-gray-400">Product details not available.</p>
                      )}
                    </div>
                  </div>

                  {/* Payment summary */}
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

                  {/* Customer details */}
                  <div className="text-xs text-gray-400 space-y-0.5">
                    <p>Customer: <span className="text-gray-600 font-medium">{o.customer_name}</span></p>
                    <p>Phone: <span className="text-gray-600 font-medium">{o.customer_phone}</span></p>
                    <p>Payment method: <span className="text-gray-600 font-medium">{o.payment_method}</span></p>
                  </div>

                  {/* Actions */}
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
  )
}
