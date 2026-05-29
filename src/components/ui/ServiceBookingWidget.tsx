'use client'

import { useState } from 'react'
import { ChevronRight, MessageCircle, RefreshCw } from 'lucide-react'
import { waSales } from '@/lib/whatsapp'

interface IssueOption {
  label: string;
  estimate: string;           // price range shown to user
  waNote: string;             // appended to WhatsApp message
  visitFee?: string;          // clarification about diagnosis fee if applicable
}

interface ProductType {
  id: string;
  label: string;
  icon: string;
  issues: IssueOption[];
}

const PRODUCT_TYPES: ProductType[] = [
  {
    id: 'ac', label: 'Air Conditioner', icon: '❄️',
    issues: [
      { label: 'Not cooling / weak cooling',      estimate: 'PKR 2,000 visit + parts',   waNote: 'not cooling or weak cooling',           visitFee: 'PKR 2,000 diagnosis visit fee applies. Repair quote after inspection.' },
      { label: 'Gas recharge (gas leaking)',       estimate: 'PKR 4,500–6,000',           waNote: 'gas recharge / gas leak',               visitFee: 'Includes gas refill labor. Parts charged separately.' },
      { label: 'AC not turning on / electrical',  estimate: 'PKR 2,000 visit + parts',   waNote: 'not turning on or electrical fault',     visitFee: 'PKR 2,000 diagnosis visit fee applies.' },
      { label: 'Noisy operation',                 estimate: 'PKR 2,000 visit + parts',   waNote: 'unusual noise during operation',         visitFee: 'PKR 2,000 diagnosis visit fee applies.' },
      { label: 'AC cleaning / fin wash',          estimate: 'PKR 2,500–3,500',           waNote: 'cleaning and fin wash service',         visitFee: 'Fixed rate, no hidden charges.' },
      { label: 'New installation',                estimate: 'PKR 3,500–5,500',           waNote: 'new AC installation',                   visitFee: 'Labor only. Materials (pipe, wiring) charged separately.' },
      { label: 'Annual maintenance (AMC)',        estimate: 'From PKR 5,500/year',       waNote: 'annual maintenance contract for AC',    visitFee: 'Includes 1–2 visits depending on plan tier.' },
    ],
  },
  {
    id: 'fridge', label: 'Refrigerator / Freezer', icon: '🧊',
    issues: [
      { label: 'Not cooling',                     estimate: 'PKR 2,000 visit + parts',   waNote: 'refrigerator not cooling',              visitFee: 'PKR 2,000 diagnosis visit fee applies.' },
      { label: 'Gas / cooling problem (frost)',   estimate: 'PKR 3,500–5,500',           waNote: 'gas refill or excessive frost buildup', visitFee: 'Includes gas refill labor. Parts charged separately.' },
      { label: 'Compressor fault',                estimate: 'PKR 2,000 visit + parts',   waNote: 'compressor not running or noisy',       visitFee: 'PKR 2,000 visit fee; compressor replacement cost depends on model.' },
      { label: 'Water leaking / draining',        estimate: 'PKR 2,000 visit + parts',   waNote: 'water leak or drainage issue',          visitFee: 'PKR 2,000 diagnosis visit fee applies.' },
      { label: 'Door seal / gasket replacement',  estimate: 'PKR 1,500–2,500',           waNote: 'door seal or gasket replacement',       visitFee: 'Parts cost varies by model.' },
      { label: 'Thermostat or control fault',     estimate: 'PKR 2,000 visit + parts',   waNote: 'thermostat or temperature control issue', visitFee: 'PKR 2,000 visit fee applies.' },
    ],
  },
  {
    id: 'wm', label: 'Washing Machine', icon: '👕',
    issues: [
      { label: 'Not spinning / agitator fault',  estimate: 'PKR 2,000 visit + parts',   waNote: 'not spinning or agitator fault',        visitFee: 'PKR 2,000 diagnosis visit fee applies.' },
      { label: 'Water not filling / draining',   estimate: 'PKR 2,000 visit + parts',   waNote: 'water inlet or drain problem',          visitFee: 'PKR 2,000 diagnosis visit fee applies.' },
      { label: 'Noisy / vibrating',              estimate: 'PKR 2,000 visit + parts',   waNote: 'noisy or vibrating during operation',   visitFee: 'PKR 2,000 diagnosis visit fee applies.' },
      { label: 'Not turning on',                 estimate: 'PKR 2,000 visit + parts',   waNote: 'machine not turning on',               visitFee: 'PKR 2,000 diagnosis visit fee applies.' },
      { label: 'PCB / electronic fault',         estimate: 'PKR 2,000 visit + parts',   waNote: 'PCB or electronic control board fault', visitFee: 'PKR 2,000 visit; PCB cost depends on model.' },
    ],
  },
  {
    id: 'solar', label: 'Solar / UPS / Inverter', icon: '☀️',
    issues: [
      { label: 'Inverter not working',            estimate: 'PKR 2,000 visit + parts',   waNote: 'solar inverter or UPS not working',     visitFee: 'PKR 2,000 diagnosis visit fee applies.' },
      { label: 'Battery not charging',            estimate: 'PKR 2,000 visit + parts',   waNote: 'battery not charging or not holding',   visitFee: 'PKR 2,000 visit; battery replacement cost depends on type.' },
      { label: 'No output / power cut issue',     estimate: 'PKR 2,000 visit + parts',   waNote: 'no output or random power cuts',        visitFee: 'PKR 2,000 diagnosis visit fee applies.' },
      { label: 'New solar installation',          estimate: 'Free site survey first',    waNote: 'new solar system installation',         visitFee: 'Free site assessment included. Get a detailed proposal.' },
      { label: 'Expand or upgrade existing system', estimate: 'Free site survey first', waNote: 'upgrade or expand existing solar system', visitFee: 'Free site assessment included.' },
    ],
  },
  {
    id: 'tv', label: 'Television / Display', icon: '📺',
    issues: [
      { label: 'No display / blank screen',       estimate: 'PKR 2,000 visit + parts',   waNote: 'no display or blank screen',           visitFee: 'PKR 2,000 diagnosis visit fee applies.' },
      { label: 'Lines / spots on screen',         estimate: 'PKR 2,000 visit + parts',   waNote: 'lines, spots or broken screen',        visitFee: 'Screen replacement cost depends on model and size.' },
      { label: 'No sound',                        estimate: 'PKR 2,000 visit + parts',   waNote: 'no sound from TV',                     visitFee: 'PKR 2,000 diagnosis visit fee applies.' },
      { label: 'Smart TV software / connectivity', estimate: 'PKR 2,000 visit',          waNote: 'smart TV software or connectivity issue', visitFee: 'PKR 2,000 visit; software fixes may not require parts.' },
      { label: 'Wall mounting',                   estimate: 'PKR 1,500–2,500',           waNote: 'wall mounting installation',           visitFee: 'Fixed rate. Bracket charged separately if not provided.' },
    ],
  },
  {
    id: 'geyser', label: 'Geyser / Water Heater', icon: '🚿',
    issues: [
      { label: 'Not heating',                    estimate: 'PKR 2,000 visit + parts',   waNote: 'geyser not heating water',              visitFee: 'PKR 2,000 diagnosis visit fee applies.' },
      { label: 'Water leaking from geyser',      estimate: 'PKR 2,000 visit + parts',   waNote: 'water leak from geyser',               visitFee: 'PKR 2,000 visit; part cost depends on fault.' },
      { label: 'New geyser installation',         estimate: 'PKR 2,000–3,500',           waNote: 'new geyser installation',              visitFee: 'Labor only. Materials charged separately.' },
    ],
  },
  {
    id: 'other', label: 'Other Appliance', icon: '🔧',
    issues: [
      { label: 'General repair',                 estimate: 'PKR 2,000 visit + parts',   waNote: 'appliance repair',                      visitFee: 'PKR 2,000 diagnosis visit fee applies.' },
      { label: 'Installation / setup',           estimate: 'Varies by appliance',       waNote: 'appliance installation',               visitFee: 'Contact us for a quote.' },
      { label: 'Annual maintenance contract',    estimate: 'From PKR 3,000/year',       waNote: 'annual maintenance contract',          visitFee: 'Pricing depends on appliance type and number of units.' },
    ],
  },
]

export default function ServiceBookingWidget() {
  const [step,    setStep]    = useState<1 | 2 | 3>(1)
  const [product, setProduct] = useState<ProductType | null>(null)
  const [issue,   setIssue]   = useState<IssueOption | null>(null)
  const [brand,   setBrand]   = useState('')
  const [area,    setArea]    = useState('')

  function reset() {
    setStep(1); setProduct(null); setIssue(null); setBrand(''); setArea('')
  }

  function buildWhatsAppMsg(): string {
    const parts: string[] = [
      `Hi, I'd like to book a *service visit* for:`,
      `• *Appliance:* ${product?.label}${brand ? ` (${brand})` : ''}`,
      `• *Issue:* ${issue?.waNote}`,
      `• *Area:* ${area || 'Karachi (area TBD)'}`,
      `• *Estimated cost:* ${issue?.estimate}`,
    ]
    if (issue?.visitFee) parts.push(`• *Note:* ${issue.visitFee}`)
    parts.push(`\nPlease confirm availability and next steps.`)
    return parts.join('\n')
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gray-900 text-white px-5 py-4 flex items-center justify-between">
        <div>
          <p className="font-black text-sm">Quick Service Request</p>
          <p className="text-gray-400 text-xs mt-0.5">3 steps to a pre-filled WhatsApp booking</p>
        </div>
        {step > 1 && (
          <button onClick={reset} className="flex items-center gap-1 text-gray-400 hover:text-white text-xs transition-colors">
            <RefreshCw className="w-3.5 h-3.5" /> Start over
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-100">
        <div className="h-full bg-brand-500 transition-all duration-300" style={{ width: `${(step / 3) * 100}%` }} />
      </div>

      <div className="p-5">
        {/* Step 1 — Product type */}
        {step === 1 && (
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-3">Step 1: Which appliance needs service?</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PRODUCT_TYPES.map(pt => (
                <button key={pt.id}
                  onClick={() => { setProduct(pt); setStep(2) }}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-gray-200 hover:border-brand-400 hover:bg-brand-50 transition-all text-center">
                  <span className="text-2xl">{pt.icon}</span>
                  <span className="text-xs font-semibold text-gray-700 leading-tight">{pt.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2 — Issue */}
        {step === 2 && product && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">{product.icon}</span>
              <p className="text-sm font-semibold text-gray-700">Step 2: What's the issue with your {product.label}?</p>
            </div>
            <div className="space-y-2">
              {product.issues.map(iss => (
                <button key={iss.label}
                  onClick={() => { setIssue(iss); setStep(3) }}
                  className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl border border-gray-200 hover:border-brand-400 hover:bg-brand-50 transition-all text-left">
                  <span className="text-sm text-gray-800">{iss.label}</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs font-semibold text-brand-600 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded-full">{iss.estimate}</span>
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3 — Review & send */}
        {step === 3 && product && issue && (
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-3">Step 3: Review your request</p>

            <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-2 text-sm mb-4">
              <div className="flex gap-2">
                <span className="text-gray-400 w-20 flex-shrink-0">Appliance</span>
                <span className="font-semibold text-gray-900">{product.icon} {product.label}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-gray-400 w-20 flex-shrink-0">Issue</span>
                <span className="font-medium text-gray-800">{issue.label}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-gray-400 w-20 flex-shrink-0">Estimate</span>
                <span className="font-semibold text-brand-700">{issue.estimate}</span>
              </div>
              {issue.visitFee && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-1 leading-relaxed">
                  {issue.visitFee}
                </p>
              )}
            </div>

            <div className="grid sm:grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Brand (optional)</label>
                <input value={brand} onChange={e => setBrand(e.target.value)}
                  placeholder="e.g. Haier, Dawlance…"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Your area in Karachi</label>
                <input value={area} onChange={e => setArea(e.target.value)}
                  placeholder="e.g. Gulshan, North Karachi…"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
              </div>
            </div>

            <a href={waSales(buildWhatsAppMsg())} target="_blank" rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 bg-wa hover:bg-wa-hover text-white font-bold py-3 rounded-xl transition-colors text-sm">
              <MessageCircle className="w-4 h-4" />
              Send Service Request on WhatsApp
            </a>
            <p className="text-xs text-gray-400 mt-2 text-center">
              Our team confirms availability and schedules your visit — usually within 2 hours.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
