import type { PortalData } from './portalTypes'

interface TimelineEvent {
  id:       string
  date:     string
  type:     'purchase' | 'order' | 'loyalty' | 'referral' | 'appliance' | 'care-plan'
  icon:     string
  title:    string
  subtitle: string
  badge?:   string
  badgeCls?: string
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-PK', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function fmtPKR(n: number) {
  return 'Rs ' + Math.round(n).toLocaleString('en-PK')
}

function buildTimeline(data: PortalData): TimelineEvent[] {
  const events: TimelineEvent[] = []

  for (const inv of data.invoicePurchases) {
    const isInst = inv.doc_type === 'installment-invoice'
    const items  = inv.lines.map(l => l.model || l.name).filter(Boolean).join(', ')
    events.push({
      id:       `inv-${inv.id}`,
      date:     inv.created_at,
      type:     'purchase',
      icon:     isInst ? '📋' : '🛍️',
      title:    isInst ? `Installment Purchase` : `Cash Purchase`,
      subtitle: `${inv.ref_number}${items ? ` · ${items}` : ''} · ${fmtPKR(inv.grand_total)}`,
      badge:    inv.payment_status,
      badgeCls: inv.payment_status === 'paid'
        ? 'bg-green-100 text-green-700'
        : inv.payment_status === 'partial'
        ? 'bg-amber-100 text-amber-700'
        : 'bg-gray-100 text-gray-500',
    })
  }

  for (const o of data.orders) {
    const items = (o.products || []).map(p => p.model).filter(Boolean).join(', ')
    events.push({
      id:       `order-${o.id}`,
      date:     o.created_at,
      type:     'order',
      icon:     '🛒',
      title:    `Order Placed`,
      subtitle: `${items || 'Items'} · ${fmtPKR(o.total_amount)}`,
      badge:    o.status || 'pending',
      badgeCls: o.status === 'delivered' || o.status === 'completed'
        ? 'bg-green-100 text-green-700'
        : 'bg-blue-100 text-blue-700',
    })
  }

  for (const t of data.loyaltyTxns) {
    events.push({
      id:       `loyalty-${t.id}`,
      date:     t.created_at,
      type:     'loyalty',
      icon:     t.points >= 0 ? '⭐' : '🔄',
      title:    t.points >= 0 ? `Earned ${t.points} Points` : `Redeemed ${Math.abs(t.points)} Points`,
      subtitle: t.description || t.type,
    })
  }

  for (const r of data.referralEarnings) {
    events.push({
      id:       `ref-${r.id}`,
      date:     r.created_at,
      type:     'referral',
      icon:     '🎉',
      title:    `Referral Commission`,
      subtitle: r.commission_amount ? `Rs ${Math.round(r.commission_amount).toLocaleString()} earned` : 'Pending confirmation',
      badge:    r.status,
      badgeCls: r.status === 'paid'
        ? 'bg-green-100 text-green-700'
        : 'bg-amber-100 text-amber-700',
    })
  }

  for (const a of data.appliances) {
    events.push({
      id:       `appliance-${a.id}`,
      date:     a.created_at,
      type:     'appliance',
      icon:     '🏠',
      title:    `Appliance Registered`,
      subtitle: `${a.brand} ${a.model} · ${a.category}`,
    })
  }

  for (const c of data.carePlans) {
    events.push({
      id:       `care-${c.id}`,
      date:     c.created_at,
      type:     'care-plan',
      icon:     '🛡️',
      title:    `Care Plan — ${c.plan_tier.charAt(0).toUpperCase() + c.plan_tier.slice(1)}`,
      subtitle: c.activated_at
        ? `Active since ${fmtDate(c.activated_at)}`
        : 'Pending inspection',
      badge:    c.status.replace(/_/g, ' '),
      badgeCls: c.status === 'active'
        ? 'bg-green-100 text-green-700'
        : 'bg-gray-100 text-gray-500',
    })
  }

  return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export default function PortalTimeline(data: PortalData) {
  const events = buildTimeline(data)

  if (events.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400 text-sm">
        No activity yet. Your purchase history and account activity will appear here.
      </div>
    )
  }

  let lastYear = ''

  return (
    <div className="space-y-1">
      <p className="text-xs text-gray-400 mb-4">{events.length} events across your account history</p>
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-5 top-0 bottom-0 w-px bg-gray-100" />

        <div className="space-y-0">
          {events.map(ev => {
            const year = new Date(ev.date).getFullYear().toString()
            const showYear = year !== lastYear
            lastYear = year

            return (
              <div key={ev.id}>
                {showYear && (
                  <div className="relative z-10 flex items-center gap-3 py-3">
                    <div className="w-10 flex-shrink-0" />
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{year}</span>
                  </div>
                )}
                <div className="relative flex gap-3 py-2.5">
                  <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full bg-white border border-gray-100 shadow-sm z-10 text-lg">
                    {ev.icon}
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-800 leading-tight">{ev.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{ev.subtitle}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className="text-xs text-gray-400 whitespace-nowrap">{fmtDate(ev.date)}</span>
                        {ev.badge && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${ev.badgeCls || 'bg-gray-100 text-gray-500'}`}>
                            {ev.badge}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
