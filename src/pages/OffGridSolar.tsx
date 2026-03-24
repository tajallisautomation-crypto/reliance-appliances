import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  Sun, Battery, Zap, MessageCircle, ChevronRight,
  CheckCircle, Shield, ArrowRight, Phone, User, MapPin,
} from 'lucide-react'
import { submitSolarLead } from '../lib/api'


// ── Constants ──────────────────────────────────────────────────────────────────
const UNIT_PRICE   = 62    // PKR/unit — 2026 Karachi average tariff
const PEAK_SUN_HRS = 4.5   // Karachi daily peak sun hours
const WA_NUMBER    = '923354266238'

// ── Calculation Logic ──────────────────────────────────────────────────────────
function calcSystem(bill: number, backupHours: number) {
  const dailyUnits   = (bill / UNIT_PRICE) / 30
  const systemKw     = Math.max(1, Math.ceil(dailyUnits / PEAK_SUN_HRS))
  const panels       = Math.ceil((systemKw * 1000) / 545)
  const batteryKwh   = parseFloat((dailyUnits * (backupHours / 24) * 1.2).toFixed(1))
  const batteryAh48  = Math.ceil((batteryKwh * 1000) / 48)
  const estSavings   = Math.round(bill * 0.9)
  return { dailyUnits, systemKw, panels, batteryKwh, batteryAh48, estSavings }
}

function buildWaMessage(bill: number, backupHours: number, result: ReturnType<typeof calcSystem>) {
  const lines = [
    '*Off-Grid Solar Inquiry* ☀️',
    '',
    `Current Bill: PKR ${bill.toLocaleString()}/month`,
    `Backup Required: ${backupHours} Hours/night`,
    '',
    '*Proposed Setup:*',
    `• System Size: ${result.systemKw}kW`,
    `• Solar Panels: ${result.panels} × 545W`,
    `• Battery Bank: ${result.batteryKwh}kWh (${result.batteryAh48}Ah at 48V)`,
    `• Est. Monthly Savings: PKR ${result.estSavings.toLocaleString()}`,
    '',
    'Please share your best quote. JazakAllah.',
  ]
  return encodeURIComponent(lines.join('\n'))
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1 px-6 py-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm">
      <span className="text-2xl font-black text-white tabular-nums">{value}</span>
      <span className="text-xs text-gray-400 text-center">{label}</span>
    </div>
  )
}

function SpecRow({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-center gap-4 py-4 border-b border-white/8 last:border-0">
      <div className="w-9 h-9 rounded-xl bg-orange-500/15 flex items-center justify-center text-orange-400 flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-gray-500 mb-0.5">{label}</div>
        <div className="text-white font-semibold">{value}</div>
        {sub && <div className="text-xs text-gray-500 mt-0.5">{sub}</div>}
      </div>
    </div>
  )
}

// ── Calculator Section ─────────────────────────────────────────────────────────

function OffGridCalculator() {
  const [bill, setBill]       = useState('')
  const [backup, setBackup]   = useState('8')
  const [result, setResult]   = useState<ReturnType<typeof calcSystem> | null>(null)
  const resultRef             = useRef<HTMLDivElement>(null)

  const calculate = () => {
    const b = parseInt(bill.replace(/,/g, ''))
    if (!b || b < 1000) return
    const r = calcSystem(b, parseInt(backup))
    setResult(r)
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100)
  }

  const waHref = result && bill
    ? `https://wa.me/${WA_NUMBER}?text=${buildWaMessage(parseInt(bill.replace(/,/g, '')), parseInt(backup), result)}`
    : '#'

  return (
    <div className="max-w-xl mx-auto">
      {/* Inputs */}
      <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-sm space-y-5">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-2 tracking-wider uppercase">
            Average Monthly Bill (PKR)
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">₨</span>
            <input
              type="number"
              value={bill}
              onChange={e => setBill(e.target.value)}
              placeholder="e.g. 35,000"
              className="w-full bg-white/8 border border-white/12 rounded-2xl pl-9 pr-4 py-3.5 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-orange-500/50 focus:bg-white/10 transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-2 tracking-wider uppercase">
            Night Backup Required
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { val: '4', label: '4 hrs', sub: 'Lights & fans' },
              { val: '8', label: '8 hrs', sub: 'Full night' },
              { val: '12', label: '12 hrs', sub: 'Heavy usage' },
            ].map(opt => (
              <button
                key={opt.val}
                onClick={() => setBackup(opt.val)}
                className={`py-3 px-2 rounded-2xl border text-center transition-all ${
                  backup === opt.val
                    ? 'bg-orange-500 border-orange-500 text-white'
                    : 'bg-white/5 border-white/12 text-gray-400 hover:border-white/20 hover:text-white'
                }`}
              >
                <div className="text-sm font-bold">{opt.label}</div>
                <div className="text-xs opacity-70 mt-0.5">{opt.sub}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-2 tracking-wider uppercase">
            City
          </label>
          <div className="bg-white/8 border border-white/12 rounded-2xl px-4 py-3.5 text-gray-300 text-sm flex items-center gap-2">
            <MapPin className="w-4 h-4 text-orange-400 flex-shrink-0" />
            Karachi (4.5 peak sun hours)
          </div>
        </div>

        <button
          onClick={calculate}
          disabled={!bill || parseInt(bill) < 1000}
          className="w-full bg-orange-500 hover:bg-orange-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl transition-all active:scale-[0.98] text-sm tracking-wide"
        >
          Calculate My System
        </button>
      </div>

      {/* Results */}
      {result && (
        <div ref={resultRef} className="mt-4 bg-white/5 border border-orange-500/20 rounded-3xl p-6 backdrop-blur-sm space-y-1 animate-fadeIn">
          <div className="text-xs font-medium text-orange-400 mb-4 tracking-wider uppercase">
            Your Proposed Off-Grid System
          </div>

          <SpecRow
            icon={<Sun className="w-4 h-4" />}
            label="System Size"
            value={`${result.systemKw} kW`}
            sub={`${result.panels} × 545W solar panels`}
          />
          <SpecRow
            icon={<Battery className="w-4 h-4" />}
            label="Battery Bank"
            value={`${result.batteryKwh} kWh`}
            sub={`${result.batteryAh48}Ah at 48V — covers ${backup}h night backup`}
          />
          <SpecRow
            icon={<Zap className="w-4 h-4" />}
            label="Daily Generation"
            value={`${result.dailyUnits.toFixed(1)} units/day`}
            sub="Based on your current consumption"
          />
          <SpecRow
            icon={<CheckCircle className="w-4 h-4" />}
            label="Est. Monthly Savings"
            value={`PKR ${result.estSavings.toLocaleString()}`}
            sub="90% grid avoidance"
          />

          <div className="pt-4 space-y-3">
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2.5 bg-[#25D366] hover:bg-[#20bc5a] text-white font-bold py-4 rounded-2xl transition-all active:scale-[0.98] text-sm"
            >
              <MessageCircle className="w-5 h-5" />
              Get Exact Quote on WhatsApp
            </a>
            <p className="text-center text-xs text-gray-600">
              Opens WhatsApp with your system specs pre-filled
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Lead Capture Form ──────────────────────────────────────────────────────────
// Saves to partner_leads (anon INSERT allowed) then opens WhatsApp.

function LeadForm() {
  const [form, setForm] = useState({ name: '', phone: '', city: 'Karachi', bill: '', backup: '8' })
  const [loading, setLoading] = useState(false)
  const [done, setDone]       = useState(false)
  const [err, setErr]         = useState('')

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const bill = parseInt(form.bill.replace(/,/g, ''))
    if (!form.name.trim() || !form.phone.trim() || !bill) {
      setErr('Please fill all fields'); return
    }
    setLoading(true); setErr('')
    try {
      const backup = parseInt(form.backup)
      const result = calcSystem(bill, backup)
      // Save to DB (anon INSERT — no select needed)
      await submitSolarLead({
        name: form.name.trim(), phone: form.phone.trim(),
        city: form.city, monthly_bill: bill,
        backup_hours: backup, system_kw: result.systemKw,
        battery_kwh: result.batteryKwh, est_savings: result.estSavings,
      })
      // Also open WhatsApp with the pre-filled inquiry
      const lines = [
        `*Off-Grid Solar Consultation Request* ☀️`, ``,
        `*Name:* ${form.name.trim()}`,
        `*Phone:* ${form.phone.trim()}`,
        `*Monthly Bill:* PKR ${bill.toLocaleString()}`,
        `*Night Backup Needed:* ${backup} Hours`, ``,
        `*Calculated System:*`,
        `• ${result.systemKw}kW — ${result.panels} × 545W panels`,
        `• Battery: ${result.batteryKwh}kWh (${result.batteryAh48}Ah @ 48V)`,
        `• Est. Monthly Savings: PKR ${result.estSavings.toLocaleString()}`, ``,
        `Please call me for a free consultation. JazakAllah.`,
      ]
      window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(lines.join('\n'))}`, '_blank')
      setDone(true)
    } catch (e: any) {
      // DB error — still open WhatsApp so the lead isn't lost
      const backup = parseInt(form.backup)
      const result = calcSystem(bill, backup)
      const lines = [
        `*Off-Grid Solar Consultation Request* ☀️`, ``,
        `*Name:* ${form.name.trim()}`, `*Phone:* ${form.phone.trim()}`,
        `*Monthly Bill:* PKR ${bill.toLocaleString()}`,
        `*Night Backup Needed:* ${backup} Hours`, ``,
        `*System:* ${result.systemKw}kW — Battery: ${result.batteryKwh}kWh`,
        `Please call me. JazakAllah.`,
      ]
      window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(lines.join('\n'))}`, '_blank')
      setDone(true)
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="text-center py-10 space-y-3">
        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8 text-green-400" />
        </div>
        <div className="text-white font-bold text-lg">Request Sent</div>
        <div className="text-gray-400 text-sm">WhatsApp opened with your details. Our solar expert will reply within 2 hours.</div>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wider">Full Name</label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input value={form.name} onChange={e => set('name', e.target.value)} required
              placeholder="Muhammad Ali"
              className="w-full bg-white/8 border border-white/12 rounded-2xl pl-10 pr-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-orange-500/50 transition-all" />
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wider">Phone (WhatsApp)</label>
          <div className="relative">
            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input value={form.phone} onChange={e => set('phone', e.target.value)} required
              placeholder="03xx-xxxxxxx"
              className="w-full bg-white/8 border border-white/12 rounded-2xl pl-10 pr-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-orange-500/50 transition-all" />
          </div>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wider">Monthly Bill (PKR)</label>
          <input type="number" value={form.bill} onChange={e => set('bill', e.target.value)} required
            placeholder="e.g. 35000"
            className="w-full bg-white/8 border border-white/12 rounded-2xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-orange-500/50 transition-all" />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wider">Night Backup Needed</label>
          <select value={form.backup} onChange={e => set('backup', e.target.value)}
            className="w-full bg-white/8 border border-white/12 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-orange-500/50 transition-all">
            <option value="4" className="bg-gray-900">4 Hours (Lights &amp; Fans)</option>
            <option value="8" className="bg-gray-900">8 Hours (Full Night)</option>
            <option value="12" className="bg-gray-900">12 Hours (Heavy Usage)</option>
          </select>
        </div>
      </div>
      {err && <p className="text-red-400 text-xs">{err}</p>}
      <button type="submit" disabled={loading}
        className="w-full bg-[#25D366] hover:bg-[#20bc5a] disabled:opacity-50 text-white font-bold py-4 rounded-2xl transition-all text-sm flex items-center justify-center gap-2">
        <MessageCircle className="w-4 h-4" />
        {loading ? 'Sending…' : 'Request Consultation via WhatsApp'}
      </button>
      <p className="text-center text-xs text-gray-600">Opens WhatsApp — your request is also saved to our system.</p>
    </form>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Enter Your Bill',
    desc: 'Tell us your average monthly electricity cost. We use the 2026 Karachi tariff to calculate your real unit consumption.',
  },
  {
    step: '02',
    title: 'We Size Your System',
    desc: 'Our algorithm calculates the exact panel count, inverter capacity, and battery bank needed for your load and backup hours.',
  },
  {
    step: '03',
    title: 'Get a Proposal',
    desc: 'Receive a detailed Solar Independence Proposal via WhatsApp — with Tubular and Lithium battery options and pricing.',
  },
  {
    step: '04',
    title: 'Grid Independence',
    desc: 'Our team installs your system. You stop paying KESC/LESCO bills and gain full power independence.',
  },
]

const WHY_OFF_GRID = [
  { icon: '🔋', title: 'No KESC Bill', desc: 'Eliminate your electricity bill entirely. Generate, store, use — 100% yours.' },
  { icon: '⚡', title: 'No Load Shedding', desc: 'Batteries power your home through outages — 4 to 12 hours of stored energy.' },
  { icon: '🛡️', title: '25-Year Warranty', desc: 'Tier-1 solar panels with 80% output guarantee for 25 years.' },
  { icon: '💰', title: 'Break-Even in 4 Yrs', desc: 'Typical Karachi system pays back in 3\u20135 years. Then its free power.' },
]

export default function OffGridSolar() {
  return (
    <div className="min-h-screen bg-black text-white">

      {/* ── Hero ── */}
      <section className="relative overflow-hidden pt-20 pb-24 px-4">
        {/* Ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-orange-500/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-20 left-1/4 w-64 h-64 bg-yellow-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-medium px-4 py-2 rounded-full mb-8 tracking-wider uppercase">
            <Sun className="w-3.5 h-3.5" />
            Off-Grid Solar — Karachi
          </div>

          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 leading-[1.05]">
            <span className="text-white">End Your</span>
            <br />
            <span className="bg-gradient-to-r from-orange-400 via-amber-300 to-yellow-400 bg-clip-text text-transparent">
              Electricity Bill.
            </span>
            <br />
            <span className="text-white">Forever.</span>
          </h1>

          <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Off-grid solar for Karachi homes. Battery-backed power independence —
            no net metering required, no grid dependency.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mb-14">
            <a href="#calculator" className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white font-bold px-8 py-4 rounded-2xl transition-all active:scale-[0.98] text-sm">
              <Zap className="w-4 h-4" />
              Calculate My System
            </a>
            <a href="#consult" className="inline-flex items-center gap-2 bg-white/8 hover:bg-white/12 border border-white/10 text-white font-medium px-8 py-4 rounded-2xl transition-all text-sm">
              Talk to an Expert
              <ChevronRight className="w-4 h-4" />
            </a>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl mx-auto">
            <StatPill label="Avg. monthly savings" value="PKR 28k" />
            <StatPill label="Break-even period" value="4 yrs" />
            <StatPill label="Panel warranty" value="25 yrs" />
            <StatPill label="Peak sun hours" value="4.5 hrs" />
          </div>
        </div>
      </section>

      {/* ── Why Off-Grid ── */}
      <section className="py-20 px-4 bg-white/[0.02] border-y border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black mb-3">Why Go Off-Grid?</h2>
            <p className="text-gray-500">Total independence. Zero dependency on KESC/LESCO.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {WHY_OFF_GRID.map(w => (
              <div key={w.title} className="bg-white/4 border border-white/8 rounded-3xl p-6 hover:bg-white/6 transition-all">
                <div className="text-3xl mb-4">{w.icon}</div>
                <div className="font-bold text-white mb-2">{w.title}</div>
                <div className="text-sm text-gray-500 leading-relaxed">{w.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Calculator ── */}
      <section id="calculator" className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 text-orange-400 text-xs font-medium tracking-wider uppercase mb-4">
              <Zap className="w-3.5 h-3.5" /> Off-Grid Independence Calculator
            </div>
            <h2 className="text-3xl md:text-4xl font-black mb-3">Size Your System Instantly</h2>
            <p className="text-gray-500 max-w-lg mx-auto">
              Enter your monthly bill and required backup hours. We'll tell you exactly what you need.
            </p>
          </div>
          <OffGridCalculator />
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-20 px-4 bg-white/[0.02] border-y border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-black mb-3">From Bill to Battery in 4 Steps</h2>
            <p className="text-gray-500">The Reliance Tajalli process — simple, transparent, fast.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW_IT_WORKS.map((s, i) => (
              <div key={s.step} className="relative">
                {i < HOW_IT_WORKS.length - 1 && (
                  <div className="hidden lg:block absolute top-5 left-full w-full h-px bg-gradient-to-r from-orange-500/30 to-transparent z-0" />
                )}
                <div className="relative">
                  <div className="text-orange-500/30 font-black text-5xl mb-4 select-none">{s.step}</div>
                  <div className="font-bold text-white mb-2">{s.title}</div>
                  <div className="text-sm text-gray-500 leading-relaxed">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── System Specs (what's included) ── */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <div className="text-orange-400 text-xs font-medium tracking-wider uppercase mb-4">Complete Package</div>
              <h2 className="text-3xl md:text-4xl font-black mb-4">
                Everything Included.
                <br />
                <span className="text-gray-500">Nothing Hidden.</span>
              </h2>
              <p className="text-gray-400 leading-relaxed mb-6">
                Every Reliance off-grid system comes with Tier-1 panels, a certified off-grid inverter,
                your choice of Tubular or Lithium battery bank, full installation, and a 1-year service warranty.
              </p>
              <div className="space-y-2">
                {[
                  'Tier-1 545W Mono PERC Panels',
                  'Off-Grid Inverter (Growatt / Deye)',
                  'Tubular Battery Bank (optional Lithium)',
                  'DC Combiner Box + AC Distribution',
                  'Professional Installation (Karachi)',
                  '1-Year Service Warranty',
                ].map(item => (
                  <div key={item} className="flex items-center gap-2.5 text-sm text-gray-300">
                    <CheckCircle className="w-4 h-4 text-orange-400 flex-shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {/* Battery comparison card */}
            <div className="bg-white/4 border border-white/8 rounded-3xl p-6 space-y-4">
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">Battery Options</div>
              <div className="space-y-3">
                <div className="bg-white/4 border border-white/8 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-bold text-white text-sm">Tubular Lead-Acid</div>
                    <div className="text-orange-400 text-xs font-medium">Budget-Friendly</div>
                  </div>
                  <div className="text-gray-500 text-xs leading-relaxed">
                    Lower upfront cost. 3–5 year life. Requires distilled water top-up every 3 months. Best for tight budgets.
                  </div>
                  <div className="mt-2 text-xs text-gray-600">Starting ~PKR 180/Ah</div>
                </div>
                <div className="bg-orange-500/8 border border-orange-500/20 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-bold text-white text-sm">Lithium (LiFePO₄)</div>
                    <div className="text-orange-400 text-xs font-medium">Recommended</div>
                  </div>
                  <div className="text-gray-500 text-xs leading-relaxed">
                    3× longer life (10+ years). Zero maintenance. Lighter. Safe chemistry. Best ROI over time.
                  </div>
                  <div className="mt-2 text-xs text-gray-600">Starting ~PKR 420/Ah</div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600 pt-2">
                <Shield className="w-3.5 h-3.5 text-orange-400" />
                Both options include installation & warranty
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Lead Form / Consultation ── */}
      <section id="consult" className="py-20 px-4 bg-white/[0.02] border-y border-white/5">
        <div className="max-w-xl mx-auto">
          <div className="text-center mb-10">
            <div className="text-orange-400 text-xs font-medium tracking-wider uppercase mb-4">Free Consultation</div>
            <h2 className="text-3xl md:text-4xl font-black mb-3">Talk to a Solar Expert</h2>
            <p className="text-gray-500 text-sm leading-relaxed">
              Leave your details and our Karachi-based solar engineer will call you within 2 hours — no pushy sales, just honest advice.
            </p>
          </div>
          <div className="bg-white/4 border border-white/8 rounded-3xl p-6">
            <LeadForm />
          </div>
        </div>
      </section>

      {/* ── CTA / WhatsApp ── */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-black mb-4">
            Questions? We're on WhatsApp.
          </h2>
          <p className="text-gray-500 mb-8 text-sm">
            Talk directly to our solar team. No bots, no hold music.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent('Assalam-o-Alaikum, I want to inquire about an off-grid solar system.')}`}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2.5 bg-[#25D366] hover:bg-[#20bc5a] text-white font-bold px-8 py-4 rounded-2xl transition-all text-sm"
            >
              <MessageCircle className="w-5 h-5" />
              WhatsApp Our Solar Team
            </a>
            <Link
              to="/solar"
              className="inline-flex items-center justify-center gap-2 bg-white/8 hover:bg-white/12 border border-white/10 text-white font-medium px-8 py-4 rounded-2xl transition-all text-sm"
            >
              View Solar Products <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
