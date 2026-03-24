/**
 * SolarROISlider — homepage standalone component.
 * Maps "Monthly Electricity Bill" → Recommended kW system + Estimated Cost + ROI.
 * Eco-branded (green palette). Mobile-first.
 */

import { useState, useMemo } from 'react'
import { Sun, TrendingUp, Zap, ArrowRight } from 'lucide-react'
import { fmtPKR } from '../lib/api'

// ─── Lookup table: monthly bill → recommended system ─────────────────────────
// kW = on-grid residential system; cost = installed turnkey (PKR)
// Based on ~4 peak sun hours/day, PKR 80K/kW installed, 85% bill offset
const SOLAR_MAP = [
  { billMax:  3_000, kw:  1, cost:    85_000 },
  { billMax:  5_000, kw:  2, cost:   165_000 },
  { billMax:  8_000, kw:  3, cost:   245_000 },
  { billMax: 12_000, kw:  5, cost:   385_000 },
  { billMax: 18_000, kw:  7, cost:   525_000 },
  { billMax: 25_000, kw: 10, cost:   725_000 },
  { billMax: 35_000, kw: 15, cost: 1_050_000 },
  { billMax: 50_000, kw: 20, cost: 1_350_000 },
]

const BILL_MIN  = 2_000
const BILL_MAX  = 50_000
const BILL_STEP = 500

function getSolarRec(bill: number) {
  return SOLAR_MAP.find(row => bill <= row.billMax) ?? SOLAR_MAP[SOLAR_MAP.length - 1]
}

/** Format a number with K/M suffix for compact display */
function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  /** WhatsApp number for quote CTA. */
  waNumber?: string
}

export default function SolarROISlider({ waNumber = '923702578788' }: Props) {
  const [bill, setBill] = useState(10_000)

  const rec = useMemo(() => getSolarRec(bill), [bill])

  // ROI metrics
  const annualSavings  = useMemo(() => Math.round(bill * 12 * 0.85 / 100) * 100,  [bill])
  const paybackYears   = useMemo(() => +(rec.cost / annualSavings).toFixed(1), [rec, annualSavings])
  const savings10yr    = useMemo(() => annualSavings * 10 - rec.cost,              [annualSavings, rec])
  const savings25yr    = useMemo(() => annualSavings * 25 - rec.cost,              [annualSavings, rec])

  // Slider fill %
  const fillPct = ((bill - BILL_MIN) / (BILL_MAX - BILL_MIN)) * 100

  const waText = encodeURIComponent(
    `Hi, I want a solar quote.\nMonthly bill: PKR ${bill.toLocaleString()}\nRecommended: ${rec.kw} kW system\nEstimated cost: PKR ${rec.cost.toLocaleString()}`
  )

  return (
    <div className="bg-white rounded-3xl shadow-apple-xl border border-gray-100 overflow-hidden w-full">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-eco-600 to-eco-500 px-6 pt-6 pb-5">
        <div className="flex items-center gap-3 text-white">
          <div className="w-11 h-11 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
            <Sun className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold leading-tight">Solar Savings Calculator</h2>
            <p className="text-eco-100 text-xs">See your payback period in seconds</p>
          </div>
        </div>

        {/* Current bill badge */}
        <div className="mt-5 text-center">
          <p className="text-eco-100 text-xs font-semibold uppercase tracking-widest mb-1">
            Monthly Electricity Bill
          </p>
          <p className="text-4xl font-black text-white leading-none">
            {fmtPKR(bill)}
          </p>
        </div>
      </div>

      <div className="px-5 md:px-7 pt-6 pb-7 space-y-6">

        {/* ── Slider ───────────────────────────────────────────────────────── */}
        <div>
          <input
            type="range"
            min={BILL_MIN}
            max={BILL_MAX}
            step={BILL_STEP}
            value={bill}
            onChange={e => setBill(Number(e.target.value))}
            className="w-full h-2.5 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #16a34a 0%, #22c55e ${fillPct}%, #e5e7eb ${fillPct}%, #e5e7eb 100%)`
            }}
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1.5 font-medium">
            <span>{fmtPKR(BILL_MIN)}</span>
            <span>{fmtPKR(BILL_MAX)}+</span>
          </div>
        </div>

        {/* ── Recommendation card ───────────────────────────────────────────── */}
        <div className="bg-eco-50 border-2 border-eco-200 rounded-2xl px-5 py-4 flex items-center gap-4">
          <div className="w-14 h-14 bg-eco-500 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-eco">
            <Zap className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-eco-600 font-semibold uppercase tracking-wide mb-0.5">
              Recommended System
            </p>
            <p className="text-3xl font-black text-eco-700 leading-none">
              {rec.kw} kW
            </p>
            <p className="text-xs text-eco-600 mt-1 font-medium">
              On-grid solar · fully installed
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs text-gray-500 font-medium">Estimated Cost</p>
            <p className="text-lg font-black text-gray-900">{fmtPKR(rec.cost)}</p>
          </div>
        </div>

        {/* ── ROI Metrics ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-2">
          {[
            {
              label:    'Annual Savings',
              value:    fmtPKR(annualSavings),
              sub:      'est. per year',
              color:    'text-eco-600',
              bg:       'bg-eco-50',
              border:   'border-eco-200',
            },
            {
              label:    'Payback',
              value:    `${paybackYears} yrs`,
              sub:      'break-even',
              color:    'text-brand-600',
              bg:       'bg-brand-50',
              border:   'border-brand-200',
            },
            {
              label:    '25-yr Savings',
              value:    `PKR ${fmt(savings25yr > 0 ? savings25yr : 0)}`,
              sub:      'net profit',
              color:    'text-eco-700',
              bg:       'bg-eco-50',
              border:   'border-eco-200',
            },
          ].map(m => (
            <div
              key={m.label}
              className={`${m.bg} border ${m.border} rounded-2xl px-3 py-3.5 text-center`}
            >
              <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide leading-tight">
                {m.label}
              </p>
              <p className={`text-sm font-black ${m.color} mt-1 leading-none`}>
                {m.value}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">{m.sub}</p>
            </div>
          ))}
        </div>

        {/* ── Savings bar ──────────────────────────────────────────────────── */}
        <div className="bg-gray-50 rounded-2xl px-5 py-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-eco-500 flex-shrink-0" />
            <p className="text-xs font-bold text-gray-700">10-Year Savings Breakdown</p>
          </div>
          <div className="space-y-2.5">
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1 font-medium">
                <span>System Cost</span>
                <span>{fmtPKR(rec.cost)}</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full">
                <div
                  className="h-2 bg-gray-400 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min((rec.cost / (annualSavings * 10)) * 100, 100)}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1 font-medium">
                <span>10-yr Bill Savings</span>
                <span>{fmtPKR(annualSavings * 10)}</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full">
                <div className="h-2 bg-eco-400 rounded-full w-full" />
              </div>
            </div>
          </div>
          {savings10yr > 0 && (
            <p className="text-xs text-eco-700 font-bold mt-3 text-center">
              Net gain after 10 years: {fmtPKR(savings10yr)} ✓
            </p>
          )}
        </div>

        {/* ── Disclaimer ───────────────────────────────────────────────────── */}
        <p className="text-[10px] text-gray-400 text-center leading-relaxed">
          Estimates based on 4 peak sun hours/day, 85% bill offset, and current market rates.
          Actual savings may vary. Subject to site survey.
        </p>

        {/* ── CTA ───────────────────────────────────────────────────────────── */}
        <a
          href={`https://wa.me/${waNumber}?text=${waText}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full bg-eco-500 hover:bg-eco-600 active:scale-[.98] text-white py-4 rounded-2xl font-bold text-sm transition-all shadow-eco"
        >
          Get Free Solar Quote
          <ArrowRight className="w-4 h-4" />
        </a>
      </div>
    </div>
  )
}
