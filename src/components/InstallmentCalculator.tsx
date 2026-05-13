/**
 * InstallmentCalculator — interactive down-payment slider with 4 tenures.
 * Standalone component; embed in ProductDetail, Installments page, or modals.
 *
 * Formula: Monthly = ((Retail × Factor) − DownPayment) / Tenure
 * Down payment: user-adjustable slider, minimum 30% of retail price.
 */

import { useState, useMemo } from 'react'
import {
  Calculator, ChevronDown, ChevronUp,
  CheckCircle2, Info, Phone,
} from 'lucide-react'
import { fmtPKR, roundTo100 } from '../lib/api'

// ─── Tenure definitions (separate from plans.ts — new spec) ──────────────────
const TENURES = [
  { months: 1,  factor: 1.08, label: '1 Payment',   star: false },
  { months: 2,  factor: 1.13, label: '2 Payments',  star: true  }, // popular
  { months: 5,  factor: 1.20, label: '5 Payments',  star: false },
  { months: 11, factor: 1.35, label: '11 Payments', star: false },
] as const

type TenureMonths = 1 | 2 | 5 | 11

// ─── Requirements checklist ───────────────────────────────────────────────────
const REQUIREMENTS = [
  {
    label: 'Valid CNIC',
    desc:  'Photocopy of both sides',
    icon:  '🪪',
  },
  {
    label: 'Recent Utility Bill',
    desc:  'Electricity or gas — last 3 months',
    icon:  '📄',
  },
  {
    label: 'Landlord Guarantee',
    desc:  'Required for tenants only',
    icon:  '🏠',
  },
  {
    label: 'Post-Dated Cheques (PDCs)',
    desc:  'One cheque per monthly installment',
    icon:  '📝',
  },
]

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  /** Pre-fill the price input from a product page. */
  defaultPrice?: number
  /** WhatsApp number for the CTA (no +, no spaces). */
  waNumber?: string
}

export default function InstallmentCalculator({
  defaultPrice = 0,
  waNumber    = '923702578788',
}: Props) {
  const [priceRaw, setPriceRaw] = useState(
    defaultPrice > 0 ? String(defaultPrice) : '',
  )
  const [retail, setRetail]     = useState(
    defaultPrice > 0 ? roundTo100(defaultPrice) : 0,
  )
  const [tenure, setTenure]     = useState<TenureMonths>(2)
  const [dpPct, setDpPct]       = useState(30) // % of retail
  const [showReqs, setShowReqs] = useState(false)

  // ── Derived values ──────────────────────────────────────────────────────────
  const cfg         = TENURES.find(t => t.months === tenure)!
  const downPayment = useMemo(() => roundTo100(retail * dpPct / 100), [retail, dpPct])

  const { total, monthly, markup } = useMemo(() => {
    if (!retail) return { total: 0, monthly: 0, markup: 0 }
    const total   = roundTo100(retail * cfg.factor)
    const monthly = cfg.months > 0
      ? roundTo100((total - downPayment) / cfg.months)
      : total - downPayment
    return { total, monthly, markup: total - retail }
  }, [retail, tenure, downPayment, cfg])

  // ── Handlers ────────────────────────────────────────────────────────────────
  const applyPrice = () => {
    const p = parseFloat(priceRaw.replace(/,/g, ''))
    if (!p || p <= 0) return
    setRetail(roundTo100(p))
    setDpPct(30)
  }

  const isReady    = retail > 0
  const markupPct  = Math.round((cfg.factor - 1) * 100)

  const waText = isReady
    ? encodeURIComponent(
        `Hi, I want to buy on installment.\nPrice: PKR ${retail.toLocaleString()}\nPlan: ${cfg.label} plan\nDown Payment: PKR ${downPayment.toLocaleString()}\nMonthly: PKR ${monthly.toLocaleString()}`
      )
    : ''

  return (
    <div className="bg-white rounded-3xl shadow-apple-xl border border-gray-100 overflow-hidden w-full max-w-md mx-auto">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-brand-600 to-brand-500 px-6 pt-6 pb-5">
        <div className="flex items-center gap-3 text-white mb-1">
          <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold leading-tight">Installment Calculator</h2>
            <p className="text-brand-100 text-xs">No bank · No credit check · Same-day</p>
          </div>
        </div>
      </div>

      <div className="p-5 md:p-7 space-y-5">

        {/* ── Price Input ──────────────────────────────────────────────────── */}
        <div>
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest block mb-2">
            Product Price
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold select-none pointer-events-none">
                PKR
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={priceRaw}
                onChange={e => setPriceRaw(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && applyPrice()}
                placeholder="e.g. 148,500"
                className="w-full border-2 border-gray-200 focus:border-brand-400 rounded-2xl pl-12 pr-4 py-3.5 text-base font-bold text-gray-900 outline-none transition-colors placeholder:font-normal placeholder:text-gray-400"
              />
            </div>
            <button
              onClick={applyPrice}
              className="bg-brand-500 hover:bg-brand-600 active:scale-95 text-white px-5 rounded-2xl font-bold text-sm transition-all shadow-brand"
            >
              Go
            </button>
          </div>
        </div>

        {/* ── Tenure Tabs ──────────────────────────────────────────────────── */}
        <div>
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest block mb-2">
            Payment Tenure
          </label>
          <div className="grid grid-cols-4 gap-1 bg-gray-100 p-1.5 rounded-2xl">
            {TENURES.map(t => (
              <button
                key={t.months}
                onClick={() => setTenure(t.months as TenureMonths)}
                className={`relative py-2.5 rounded-xl text-sm font-bold transition-all leading-tight ${
                  tenure === t.months
                    ? 'bg-white text-brand-600 shadow-apple'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t.star && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-eco-500 text-white text-[8px] font-extrabold px-1.5 py-px rounded-full leading-tight whitespace-nowrap">
                    Popular
                  </span>
                )}
                <span className="block">
                  {t.months === 11 ? '11' : t.months}
                </span>
                <span className="text-[10px] font-medium opacity-70">
                  {t.months === 1 ? 'payment' : 'payments'}
                </span>
              </button>
            ))}
          </div>
          <p className="text-center text-xs text-gray-400 mt-1.5">
            +{markupPct}% finance fee · {cfg.months} monthly payment{cfg.months > 1 ? 's' : ''}
          </p>
        </div>

        {/* ── Down Payment Slider (only shown once price is set) ────────────── */}
        {isReady && (
          <div className="animate-slide-up">
            <div className="flex justify-between items-baseline mb-2">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                Down Payment
              </label>
              <div className="flex items-baseline gap-1.5">
                <span className="text-brand-600 font-black text-xl leading-none">
                  {fmtPKR(downPayment)}
                </span>
                <span className="text-gray-400 text-xs">({dpPct}%)</span>
              </div>
            </div>

            {/* Custom range slider */}
            <div className="relative">
              <input
                type="range"
                min={30}
                max={90}
                step={1}
                value={dpPct}
                onChange={e => setDpPct(Number(e.target.value))}
                className="w-full h-2 rounded-full appearance-none cursor-pointer accent-brand-500 bg-gray-200"
                style={{
                  background: `linear-gradient(to right, #123F73 0%, #123F73 ${((dpPct - 30) / 60) * 100}%, #e5e7eb ${((dpPct - 30) / 60) * 100}%, #e5e7eb 100%)`
                }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-gray-400 mt-1 font-medium">
              <span>Min 30%</span>
              <span>Max 90%</span>
            </div>
          </div>
        )}

        {/* ── Breakdown Card ────────────────────────────────────────────────── */}
        {isReady && (
          <div className="animate-slide-up rounded-2xl border-2 border-gray-100 overflow-hidden">

            {/* Due Today row */}
            <div className="bg-brand-50 border-b border-brand-100 px-5 py-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-extrabold text-brand-500 uppercase tracking-widest mb-0.5">
                    Due Today
                  </p>
                  <p className="text-3xl font-black text-gray-900 leading-none">
                    {fmtPKR(downPayment)}
                  </p>
                </div>
                <span className="bg-brand-100 text-brand-700 text-xs font-bold px-2.5 py-1 rounded-full mt-1">
                  {dpPct}% advance
                </span>
              </div>
            </div>

            {/* Monthly row */}
            <div className="bg-white border-b border-gray-100 px-5 py-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-extrabold text-brand-500 uppercase tracking-widest mb-0.5">
                    Then Monthly × {cfg.months}
                  </p>
                  <p className="text-3xl font-black text-brand-600 leading-none">
                    {fmtPKR(monthly)}
                  </p>
                </div>
                <div className="text-right mt-1">
                  <p className="text-xs text-gray-400 font-medium">per month</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {cfg.months} payment{cfg.months > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </div>

            {/* Summary row */}
            <div className="bg-gray-50 px-5 py-3 grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Total</p>
                <p className="text-sm font-bold text-gray-800 mt-0.5">{fmtPKR(total)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Finance Fee</p>
                <p className="text-sm font-bold text-gray-500 mt-0.5">+{fmtPKR(markup)}</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Info note ─────────────────────────────────────────────────────── */}
        {isReady && (
          <div className="flex items-start gap-2 text-xs text-blue-700 bg-blue-50 rounded-xl px-4 py-3">
            <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-blue-400" />
            <span>
              Amounts rounded to nearest PKR 100. Approval subject to document verification.
            </span>
          </div>
        )}

        {/* ── Requirements Toggle ───────────────────────────────────────────── */}
        <div className="border border-gray-200 rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowReqs(v => !v)}
            className="w-full flex items-center justify-between px-5 py-4 text-sm font-semibold text-gray-800 hover:bg-gray-50 transition-colors"
          >
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-eco-500 flex-shrink-0" />
              Required Documents
            </span>
            {showReqs
              ? <ChevronUp className="w-4 h-4 text-gray-400" />
              : <ChevronDown className="w-4 h-4 text-gray-400" />
            }
          </button>

          {showReqs && (
            <div className="border-t border-gray-100 px-5 pb-5 pt-4 space-y-3 animate-slide-up">
              {REQUIREMENTS.map(req => (
                <div key={req.label} className="flex items-start gap-3">
                  <span className="text-base leading-none mt-0.5 flex-shrink-0">{req.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{req.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{req.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── CTA ───────────────────────────────────────────────────────────── */}
        <a
          href={isReady
            ? `https://wa.me/${waNumber}?text=${waText}`
            : `https://wa.me/${waNumber}`
          }
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full bg-eco-500 hover:bg-eco-600 active:scale-[.98] text-white py-4 rounded-2xl font-bold text-sm transition-all shadow-eco"
        >
          <Phone className="w-4 h-4" />
          {isReady ? 'Apply on WhatsApp' : 'Enquire on WhatsApp'}
        </a>

      </div>
    </div>
  )
}
