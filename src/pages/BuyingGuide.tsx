import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Wind, Refrigerator, Shirt, ChevronRight, CheckCircle, AlertCircle, Info } from 'lucide-react'
import SEO from '@/components/ui/SEO'

// ─────────────────────────────────────────────────────────────────────────────
// Shared UI atoms
// ─────────────────────────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-semibold text-gray-700 mb-2">{children}</p>
}

function Select({ value, onChange, options }: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-400 bg-white"
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

function NumberInput({ value, onChange, placeholder, min = 1, max = 999 }: {
  value: string; onChange: (v: string) => void; placeholder: string; min?: number; max?: number
}) {
  return (
    <input
      type="number" value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} min={min} max={max}
      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-400"
    />
  )
}

function ResultCard({ icon, label, value, sub, color = 'brand' }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; color?: string
}) {
  const colors: Record<string, string> = {
    brand: 'bg-brand-50 border-brand-200 text-brand-700',
    blue:   'bg-blue-50  border-blue-200  text-blue-700',
    green:  'bg-green-50 border-green-200 text-green-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
  }
  return (
    <div className={`rounded-2xl border p-4 ${colors[color]}`}>
      <div className="flex items-center gap-2 mb-1">{icon}<span className="text-xs font-medium opacity-70">{label}</span></div>
      <div className="text-xl font-black">{value}</div>
      {sub && <div className="text-xs opacity-60 mt-0.5">{sub}</div>}
    </div>
  )
}

function CalcShell({ icon, title, tagline, children, accentColor }: {
  icon: React.ReactNode; title: string; tagline: string; children: React.ReactNode; accentColor: string
}) {
  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
      <div className={`px-6 py-5 ${accentColor}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-white">
            {icon}
          </div>
          <div>
            <h2 className="text-lg font-black text-white">{title}</h2>
            <p className="text-white/80 text-xs">{tagline}</p>
          </div>
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl p-3 mt-3">
      <Info className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
      <p className="text-xs text-amber-800">{children}</p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. AC Size Calculator
// ─────────────────────────────────────────────────────────────────────────────

type ACResult = {
  btu: number
  ton: string
  tonLabel: string
  categorySlug: string
  factors: string[]
}

function ACCalculator() {
  const [length, setLength]   = useState('')
  const [width,  setWidth]    = useState('')
  const [floor,  setFloor]    = useState('middle')
  const [sun,    setSun]      = useState('partial')
  const [insul,  setInsul]    = useState('average')
  const [people, setPeople]   = useState('2')
  const [result, setResult]   = useState<ACResult | null>(null)

  function calculate() {
    const l = parseFloat(length), w = parseFloat(width)
    if (!l || !w || l <= 0 || w <= 0) return

    // Base: 25 BTU per sq.ft (Pakistan standard for T3 climate)
    let btu = l * w * 25
    const factors: string[] = [`Base: ${l}×${w} = ${l * w} sq.ft × 25 BTU`]

    // Floor adjustment
    if (floor === 'top') {
      btu *= 1.18
      factors.push('Top floor / roof: +18% (direct heat transfer)')
    } else if (floor === 'ground') {
      btu *= 0.95
      factors.push('Ground floor: −5% (cooler slab)')
    }

    // Sun exposure
    if (sun === 'direct') {
      btu *= 1.15
      factors.push('Direct sun exposure: +15%')
    } else if (sun === 'partial') {
      btu *= 1.07
      factors.push('Partial sun: +7%')
    }

    // Insulation
    if (insul === 'poor') {
      btu *= 1.15
      factors.push('Poor insulation (tin/asbestos roof): +15%')
    } else if (insul === 'good') {
      btu *= 0.95
      factors.push('Well insulated (double ceiling, cavity walls): −5%')
    }

    // People (base assumes 2; every extra adds 600 BTU)
    const extra = Math.max(0, parseInt(people || '2') - 2)
    if (extra > 0) {
      btu += extra * 600
      factors.push(`${extra} extra person${extra > 1 ? 's' : ''}: +${extra * 600} BTU`)
    }

    btu = Math.round(btu)

    // Map to standard tonnage
    let ton: string, tonLabel: string, categorySlug: string
    if (btu <= 10500) {
      ton = '0.75–1'; tonLabel = '1 Ton'; categorySlug = '1-ton-air-conditioners'
    } else if (btu <= 14500) {
      ton = '1'; tonLabel = '1 Ton'; categorySlug = '1-ton-air-conditioners'
    } else if (btu <= 20000) {
      ton = '1.5'; tonLabel = '1.5 Ton'; categorySlug = '1-5-ton-air-conditioners'
    } else {
      ton = '2'; tonLabel = '2 Ton'; categorySlug = '2-ton-air-conditioners'
    }

    setResult({ btu, ton, tonLabel, categorySlug, factors })
  }

  return (
    <CalcShell
      icon={<Wind className="w-5 h-5" />}
      title="AC Size Calculator"
      tagline="Find the right tonnage for your room"
      accentColor="bg-gradient-to-r from-sky-500 to-blue-600"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Room Length (feet)</Label>
            <NumberInput value={length} onChange={setLength} placeholder="e.g. 14" />
          </div>
          <div>
            <Label>Room Width (feet)</Label>
            <NumberInput value={width} onChange={setWidth} placeholder="e.g. 12" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Floor Level</Label>
            <Select value={floor} onChange={setFloor} options={[
              { value: 'ground',  label: 'Ground Floor' },
              { value: 'middle',  label: 'Middle Floor' },
              { value: 'top',     label: 'Top / Roof Floor' },
            ]} />
          </div>
          <div>
            <Label>Sun Exposure</Label>
            <Select value={sun} onChange={setSun} options={[
              { value: 'shaded',  label: 'Shaded / North-facing' },
              { value: 'partial', label: 'Partial Sun' },
              { value: 'direct',  label: 'Direct Sun (south/west)' },
            ]} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Ceiling / Insulation</Label>
            <Select value={insul} onChange={setInsul} options={[
              { value: 'good',    label: 'Well insulated (false ceiling)' },
              { value: 'average', label: 'Average (concrete slab)' },
              { value: 'poor',    label: 'Poor (tin / asbestos roof)' },
            ]} />
          </div>
          <div>
            <Label>People Regularly in Room</Label>
            <Select value={people} onChange={setPeople} options={[
              { value: '1',  label: '1 person' },
              { value: '2',  label: '2 people' },
              { value: '3',  label: '3 people' },
              { value: '4',  label: '4 people' },
              { value: '5',  label: '5+ people' },
            ]} />
          </div>
        </div>

        <button
          onClick={calculate}
          className="w-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white rounded-xl py-3 font-bold text-sm transition-all"
        >
          Calculate Recommended Tonnage
        </button>

        {result && (
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-2 gap-3">
              <ResultCard
                icon={<CheckCircle className="w-4 h-4" />}
                label="Recommended Size"
                value={result.tonLabel + ' AC'}
                sub={`~${result.btu.toLocaleString()} BTU/hr required`}
                color="blue"
              />
              <ResultCard
                icon={<Wind className="w-4 h-4" />}
                label="Tonnage"
                value={result.ton + ' Ton'}
                sub="Inverter type recommended"
                color="blue"
              />
            </div>

            <div className="bg-gray-50 rounded-xl p-3 space-y-1">
              <p className="text-xs font-semibold text-gray-500 mb-2">How we calculated this:</p>
              {result.factors.map((f, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <ChevronRight className="w-3 h-3 text-blue-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-gray-600">{f}</p>
                </div>
              ))}
            </div>

            <Tip>
              Always choose inverter over non-inverter in Pakistan — they consume 40–60% less
              electricity and handle voltage fluctuations better. If in doubt between two sizes,
              go one step up.
            </Tip>

            <Link
              to={`/products/category/${result.categorySlug}`}
              className="flex items-center justify-center gap-2 w-full bg-blue-500 hover:bg-blue-600 text-white rounded-xl py-3 font-bold text-sm transition-all"
            >
              Browse {result.tonLabel} Air Conditioners <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </CalcShell>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Refrigerator Size Calculator
// ─────────────────────────────────────────────────────────────────────────────

type RefResult = {
  minCF: number
  recCF: number
  sizeLabel: string
  categorySlug: string
  reasons: string[]
  type: string
}

function RefrigeratorCalculator() {
  const [members,  setMembers]  = useState('4')
  const [cooking,  setCooking]  = useState('regular')
  const [shopping, setShopping] = useState('weekly')
  const [meat,     setMeat]     = useState('no')
  const [result,   setResult]   = useState<RefResult | null>(null)

  function calculate() {
    const m = parseInt(members || '4')
    const reasons: string[] = []

    // 2 Cu.Ft per person is the Pakistan household baseline
    let cf = m * 2
    reasons.push(`${m} family members × 2 Cu.Ft = ${cf} Cu.Ft base`)

    if (cooking === 'heavy') {
      cf += 3
      reasons.push('Heavy/daily cooking: +3 Cu.Ft (fresh produce, leftovers)')
    } else if (cooking === 'light') {
      cf -= 2
      reasons.push('Light cooking / eating out often: −2 Cu.Ft')
    }

    if (shopping === 'fortnightly') {
      cf += 4
      reasons.push('Fortnightly grocery shopping: +4 Cu.Ft (bulk storage)')
    } else if (shopping === 'weekly') {
      cf += 2
      reasons.push('Weekly grocery shopping: +2 Cu.Ft')
    }

    if (meat === 'yes') {
      cf += 4
      reasons.push('Long-term meat / fish storage: +4 Cu.Ft (dedicated freezer zone)')
    }

    // Minimum is what the calculation gives; add 20% buffer for comfort
    const minCF  = Math.max(6, Math.round(cf))
    const recCF  = Math.max(8, Math.round(cf * 1.2))

    let sizeLabel: string, categorySlug: string, type: string
    if (recCF <= 12) {
      sizeLabel = 'Small (up to 12 Cu.Ft)'; categorySlug = 'small-refrigerators'
      type = 'Single-door or small double-door'
    } else if (recCF <= 17) {
      sizeLabel = 'Medium (13–17 Cu.Ft)'; categorySlug = 'medium-refrigerators'
      type = 'Double-door or mid-size'
    } else {
      sizeLabel = 'Large (18 Cu.Ft+)'; categorySlug = 'large-refrigerators'
      type = 'Large double-door or side-by-side'
    }

    setResult({ minCF, recCF, sizeLabel, categorySlug, reasons, type })
  }

  return (
    <CalcShell
      icon={<Refrigerator className="w-5 h-5" />}
      title="Refrigerator Size Guide"
      tagline="Right capacity for your family & lifestyle"
      accentColor="bg-gradient-to-r from-teal-500 to-emerald-600"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Family Members</Label>
            <Select value={members} onChange={setMembers} options={[
              { value: '1',  label: '1–2 members' },
              { value: '2',  label: '2 members' },
              { value: '3',  label: '3 members' },
              { value: '4',  label: '4 members' },
              { value: '5',  label: '5 members' },
              { value: '6',  label: '6 members' },
              { value: '8',  label: '7–8 members' },
              { value: '10', label: '9+ members (joint family)' },
            ]} />
          </div>
          <div>
            <Label>Cooking Style</Label>
            <Select value={cooking} onChange={setCooking} options={[
              { value: 'light',   label: 'Light (mostly outside / ordering)' },
              { value: 'regular', label: 'Regular home cooking' },
              { value: 'heavy',   label: 'Heavy (fresh cooking daily)' },
            ]} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Grocery Shopping</Label>
            <Select value={shopping} onChange={setShopping} options={[
              { value: 'daily',       label: 'Daily (sabzi mandi etc.)' },
              { value: 'weekly',      label: 'Weekly' },
              { value: 'fortnightly', label: 'Fortnightly / Monthly bulk' },
            ]} />
          </div>
          <div>
            <Label>Store Meat / Fish Long-Term?</Label>
            <Select value={meat} onChange={setMeat} options={[
              { value: 'no',  label: 'No / minimal' },
              { value: 'yes', label: 'Yes (Eid stock, bulk meat)' },
            ]} />
          </div>
        </div>

        <button
          onClick={calculate}
          className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white rounded-xl py-3 font-bold text-sm transition-all"
        >
          Find My Ideal Refrigerator Size
        </button>

        {result && (
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-2 gap-3">
              <ResultCard
                icon={<CheckCircle className="w-4 h-4" />}
                label="Recommended Size"
                value={result.recCF + ' Cu.Ft'}
                sub={result.sizeLabel}
                color="green"
              />
              <ResultCard
                icon={<Refrigerator className="w-4 h-4" />}
                label="Type"
                value={result.type}
                sub={`Minimum: ${result.minCF} Cu.Ft`}
                color="green"
              />
            </div>

            <div className="bg-gray-50 rounded-xl p-3 space-y-1">
              <p className="text-xs font-semibold text-gray-500 mb-2">Breakdown:</p>
              {result.reasons.map((r, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <ChevronRight className="w-3 h-3 text-teal-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-gray-600">{r}</p>
                </div>
              ))}
            </div>

            <Tip>
              In Karachi, load-shedding and frequent power cuts mean a larger fridge pays off —
              more thermal mass keeps food cold longer during outages. Inverter compressors
              also reduce electricity cost significantly on large units.
            </Tip>

            <Link
              to={`/products/category/${result.categorySlug}`}
              className="flex items-center justify-center gap-2 w-full bg-teal-500 hover:bg-teal-600 text-white rounded-xl py-3 font-bold text-sm transition-all"
            >
              Browse {result.sizeLabel} Refrigerators <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </CalcShell>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Washing Machine Capacity Calculator
// ─────────────────────────────────────────────────────────────────────────────

type WMResult = {
  kgLoad: number
  recKg: number
  type: string
  categorySlug: string
  reasons: string[]
  typeNote: string
}

function ShirtCalculator() {
  const [members,   setMembers]   = useState('4')
  const [frequency, setFrequency] = useState('2-3days')
  const [heavy,     setHeavy]     = useState('sometimes')
  const [prefer,    setPrefer]    = useState('auto')
  const [result,    setResult]    = useState<WMResult | null>(null)

  function calculate() {
    const m = parseInt(members || '4')
    const reasons: string[] = []

    // Average kg of laundry per person per day ≈ 0.5 kg
    let kgPerWash = 0
    if (frequency === 'daily') {
      kgPerWash = m * 0.5
      reasons.push(`${m} members × 0.5 kg/day (daily wash) = ${kgPerWash} kg per load`)
    } else if (frequency === '2-3days') {
      kgPerWash = m * 0.5 * 2.5
      reasons.push(`${m} members × 0.5 kg/day × 2.5 days = ${kgPerWash.toFixed(1)} kg per load`)
    } else {
      kgPerWash = m * 0.5 * 6
      reasons.push(`${m} members × 0.5 kg/day × 6 days = ${kgPerWash.toFixed(1)} kg per load`)
    }

    // Heavy items
    if (heavy === 'often') {
      kgPerWash += 3
      reasons.push('Heavy items (comforters, curtains, jeans) washed often: +3 kg')
    } else if (heavy === 'sometimes') {
      kgPerWash += 1.5
      reasons.push('Occasional heavy items (jeans, towels): +1.5 kg buffer')
    }

    kgPerWash = Math.ceil(kgPerWash)

    // Round up to nearest standard drum size: 6, 7, 7.5, 8, 9, 10, 11, 12, 14
    const SIZES = [6, 7, 7.5, 8, 9, 10, 11, 12, 14]
    const recKg = SIZES.find(s => s >= kgPerWash) ?? 14

    // Type recommendation
    let type: string, categorySlug: string, typeNote: string
    if (prefer === 'front') {
      type = 'Front-Load Fully Automatic'; categorySlug = 'automatic-washing-machines'
      typeNote = 'Front-load uses 40% less water and gives better wash quality for fine fabrics'
    } else if (prefer === 'semi') {
      type = 'Semi-Automatic (Twin Tub)'; categorySlug = 'semi-automatic-washing-machines'
      typeNote = 'Semi-automatic gives more control and works well during load-shedding (lower power draw)'
    } else {
      type = 'Top-Load Fully Automatic'; categorySlug = 'automatic-washing-machines'
      typeNote = 'Top-load automatic is easiest to use and fastest wash cycle — good for large families'
    }

    setResult({ kgLoad: kgPerWash, recKg, type, categorySlug, reasons, typeNote })
  }

  return (
    <CalcShell
      icon={<Shirt className="w-5 h-5" />}
      title="Washing Machine Capacity Guide"
      tagline="Match drum size to your laundry load"
      accentColor="bg-gradient-to-r from-violet-500 to-purple-600"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Family Members</Label>
            <Select value={members} onChange={setMembers} options={[
              { value: '1',  label: '1–2 members' },
              { value: '2',  label: '2 members' },
              { value: '3',  label: '3 members' },
              { value: '4',  label: '4 members' },
              { value: '5',  label: '5 members' },
              { value: '6',  label: '6 members' },
              { value: '8',  label: '7–8 members' },
              { value: '10', label: '9+ members (joint family)' },
            ]} />
          </div>
          <div>
            <Label>Laundry Frequency</Label>
            <Select value={frequency} onChange={setFrequency} options={[
              { value: 'daily',    label: 'Daily' },
              { value: '2-3days', label: 'Every 2–3 days' },
              { value: 'weekly',   label: 'Once a week' },
            ]} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Heavy Items (comforters, curtains, jeans)</Label>
            <Select value={heavy} onChange={setHeavy} options={[
              { value: 'rarely',    label: 'Rarely' },
              { value: 'sometimes', label: 'Sometimes' },
              { value: 'often',     label: 'Often / Regularly' },
            ]} />
          </div>
          <div>
            <Label>Preferred Machine Type</Label>
            <Select value={prefer} onChange={setPrefer} options={[
              { value: 'auto',  label: 'Top-Load Automatic' },
              { value: 'front', label: 'Front-Load Automatic' },
              { value: 'semi',  label: 'Semi-Automatic (Twin Tub)' },
            ]} />
          </div>
        </div>

        <button
          onClick={calculate}
          className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white rounded-xl py-3 font-bold text-sm transition-all"
        >
          Find My Ideal Washing Machine
        </button>

        {result && (
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-2 gap-3">
              <ResultCard
                icon={<CheckCircle className="w-4 h-4" />}
                label="Recommended Capacity"
                value={result.recKg + ' kg'}
                sub={`Your load: ~${result.kgLoad} kg per wash`}
                color="purple"
              />
              <ResultCard
                icon={<Shirt className="w-4 h-4" />}
                label="Best Type For You"
                value={result.type.split(' ')[0] + '-Load'}
                sub={result.type}
                color="purple"
              />
            </div>

            <div className="bg-gray-50 rounded-xl p-3 space-y-1">
              <p className="text-xs font-semibold text-gray-500 mb-2">Load calculation:</p>
              {result.reasons.map((r, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <ChevronRight className="w-3 h-3 text-violet-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-gray-600">{r}</p>
                </div>
              ))}
            </div>

            <div className="flex items-start gap-2 bg-violet-50 border border-violet-100 rounded-xl p-3">
              <AlertCircle className="w-4 h-4 text-violet-500 mt-0.5 shrink-0" />
              <p className="text-xs text-violet-800">{result.typeNote}</p>
            </div>

            <Tip>
              Never overload a washing machine — fill to 80% capacity maximum for best wash
              quality and to protect the motor. If you regularly wash bulky comforters,
              go one drum size up from the recommendation.
            </Tip>

            <Link
              to={`/products/category/${result.categorySlug}`}
              className="flex items-center justify-center gap-2 w-full bg-violet-500 hover:bg-violet-600 text-white rounded-xl py-3 font-bold text-sm transition-all"
            >
              Browse {result.type} <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </CalcShell>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Page shell
// ─────────────────────────────────────────────────────────────────────────────

export default function BuyingGuide() {
  return (
    <div className="min-h-screen bg-gray-50">
      <SEO
        title="Appliance Buying Guide — AC, Fridge & Washing Machine Size Calculator"
        description="Free interactive calculators to find the right AC tonnage for your room, refrigerator size for your family, and washing machine capacity for your laundry load. By Reliance Appliances Karachi."
        path="/buying-guide"
        keywords="ac size calculator pakistan, refrigerator size guide, washing machine capacity calculator karachi, which ac to buy, right fridge size family"
      />

      {/* Hero */}
      <div className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 py-10 text-center">
          <span className="inline-block text-xs font-bold text-brand-600 bg-brand-50 px-3 py-1 rounded-full mb-4">
            Free Tools
          </span>
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-3">
            Appliance Buying Guide
          </h1>
          <p className="text-gray-500 text-base max-w-xl mx-auto">
            Answer a few questions and get an instant, personalised recommendation —
            no sales pitch, just the right size for your home.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <ACCalculator />
        <RefrigeratorCalculator />
        <ShirtCalculator />

        {/* Bottom CTA */}
        <div className="bg-gradient-to-r from-brand-500 to-brand-700 rounded-3xl p-6 text-center text-white">
          <p className="font-black text-lg mb-1">Still not sure? Talk to our team.</p>
          <p className="text-white/80 text-sm mb-4">
            Our advisors help thousands of Karachi families choose the right appliance every month.
            Free consultation — no obligation.
          </p>
          <a
            href="https://wa.me/923702578788?text=Hi%2C%20I%20need%20help%20choosing%20the%20right%20appliance%20for%20my%20home."
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-white text-brand-600 font-bold px-6 py-3 rounded-xl hover:bg-brand-50 transition-colors"
          >
            Chat on WhatsApp <ChevronRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  )
}
