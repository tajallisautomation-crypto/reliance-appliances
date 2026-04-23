import { useState, useEffect, useRef } from 'react'

const NOTIFICATIONS = [
  { area: 'Gulshan-e-Iqbal',   product: 'Haier 1.5 Ton Inverter AC',         action: 'delivery'     },
  { area: 'DHA Phase 6',        product: 'Crown 5kW Solar System',             action: 'installation' },
  { area: 'North Karachi',      product: 'Dawlance Inverter Refrigerator',     action: 'delivery'     },
  { area: 'Clifton',            product: 'Haier 1 Ton T3 Inverter AC',         action: 'delivery'     },
  { area: 'PECHS',              product: 'Gree 1.5 Ton Inverter AC',           action: 'installation' },
  { area: 'Nazimabad',          product: 'Crown 3.6kW UPS + LiFePO4 Battery',  action: 'installation' },
  { area: 'Gulistan-e-Johar',   product: 'EcoStar 55" Smart TV',               action: 'delivery'     },
  { area: 'Korangi',            product: 'Haier Front Load Washing Machine',   action: 'delivery'     },
  { area: 'Model Colony',       product: 'Crown 8kW Hybrid Solar System',      action: 'installation' },
  { area: 'Federal B Area',     product: 'Dawlance 15 Cu.Ft Refrigerator',     action: 'delivery'     },
  { area: 'Malir',              product: 'Haier 2 Ton Inverter AC',            action: 'installation' },
  { area: 'Bahria Town',        product: 'Crown 12kW 3-Phase Solar System',    action: 'installation' },
  { area: 'Landhi',             product: 'Gree 1 Ton Inverter AC',             action: 'delivery'     },
  { area: 'Saddar',             product: 'Westpoint Air Fryer + Kettle Set',   action: 'delivery'     },
  { area: 'Shah Faisal Colony', product: 'Crown 5kW Solar + LiFePO4 Battery',  action: 'installation' },
]

// Show each notification for 4s, pause 5s, then show next
const SHOW_MS  = 4000
const PAUSE_MS = 5000

export default function SocialProofLoop() {
  const [idx, setIdx]         = useState(0)
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (dismissed) return
    // Initial delay before first notification
    timer.current = setTimeout(() => {
      setVisible(true)
      scheduleNext()
    }, 3000)
    return () => { if (timer.current) clearTimeout(timer.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dismissed])

  function scheduleNext() {
    timer.current = setTimeout(() => {
      setVisible(false)
      timer.current = setTimeout(() => {
        setIdx(i => (i + 1) % NOTIFICATIONS.length)
        setVisible(true)
        scheduleNext()
      }, PAUSE_MS)
    }, SHOW_MS)
  }

  if (dismissed) return null

  const n = NOTIFICATIONS[idx]
  const label = n.action === 'installation' ? 'Installation completed' : 'Delivered'

  return (
    <div
      aria-live="polite"
      className={`fixed bottom-8 left-6 z-30 max-w-[280px] transition-all duration-500 ease-out hidden sm:block ${
        visible ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-3 pointer-events-none'
      }`}
    >
      <div className="bg-white border border-gray-200 shadow-apple-lg rounded-2xl px-4 py-3 flex items-start gap-3">
        <span className="mt-0.5 relative flex h-2.5 w-2.5 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold text-green-700">{label} · {n.area}</p>
          <p className="text-xs text-gray-700 leading-snug mt-0.5 truncate">{n.product}</p>
        </div>
        <button
          onClick={() => { setVisible(false); setTimeout(() => setDismissed(true), 300) }}
          className="text-gray-300 hover:text-gray-500 text-base leading-none shrink-0 ml-1 -mt-0.5"
          aria-label="Dismiss"
        >×</button>
      </div>
    </div>
  )
}
