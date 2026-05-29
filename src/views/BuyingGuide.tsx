'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Wind, Refrigerator, Shirt, ChevronRight, CheckCircle, AlertCircle, Info, Leaf } from 'lucide-react'
import SEO from '@/components/ui/SEO'
import { waSales } from '@/lib/whatsapp'
import { getProducts, formatPrice, type Product } from '@/lib/api'

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
    <div className={`rounded-2xl border p-4 h-full ${colors[color]}`}>
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

// ── Inline product strip shown below calculator results ─────────────────────

function InlineProductStrip({
  category,
  label,
  accentColor,
  viewAllHref,
}: {
  category: string
  label: string
  accentColor: string
  viewAllHref: string
}) {
  const [items, setItems] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    getProducts({ category, sort: 'price_asc' })
      .then(({ products }) => setItems(products.slice(0, 6)))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [category])

  if (loading) {
    return (
      <div className="mt-4 space-y-2">
        <div className="h-3 w-40 bg-gray-100 rounded animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-gray-50 rounded-2xl p-3 animate-pulse">
              <div className="aspect-square bg-gray-100 rounded-xl mb-2" />
              <div className="h-3 bg-gray-100 rounded w-3/4 mb-1" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!items.length) return null

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Matching {label} from our catalog</p>
        <Link href={viewAllHref} className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-0.5">
          View all <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {items.map(p => (
          <Link
            key={p.id}
            href={`/products/${p.id}`}
            className={`group bg-white border-2 border-transparent hover:border-brand-300 hover:shadow-apple rounded-2xl p-3 transition-all`}
          >
            <div className="aspect-square bg-gray-50 rounded-xl overflow-hidden mb-2">
              {p.thumbnail ? (
                <img src={p.thumbnail} alt={p.simplified_name || p.model} className="w-full h-full object-contain p-1 group-hover:scale-105 transition-transform duration-200" loading="lazy" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
              )}
            </div>
            <p className="text-[9px] font-bold text-brand-500 uppercase tracking-wider mb-0.5">{p.brand}</p>
            <p className="text-xs font-bold text-gray-900 leading-tight line-clamp-2 mb-1">{p.simplified_name || p.model}</p>
            <p className="text-xs font-black text-gray-900">PKR {formatPrice(p.price.cash_floor)}</p>
          </Link>
        ))}
      </div>
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

    // Base: 65 BTU per sq.ft — Pakistan T3 hot climate standard
    // (Pakistani industry rule of thumb: ~1 ton per 175–200 sq.ft standard room)
    const sqft = l * w
    let btu = sqft * 65
    const factors: string[] = [`Base: ${l}×${w} = ${sqft} sq.ft × 65 BTU/sq.ft (Pakistan T3 tropical standard)`]

    // Floor adjustment
    if (floor === 'top') {
      btu *= 1.18
      factors.push('Top floor / roof: +18% (direct solar heat through slab)')
    } else if (floor === 'ground') {
      btu *= 0.95
      factors.push('Ground floor: −5% (cooler slab, shaded walls)')
    }

    // Sun exposure
    if (sun === 'direct') {
      btu *= 1.15
      factors.push('Direct sun (south/west facing): +15%')
    } else if (sun === 'partial') {
      btu *= 1.07
      factors.push('Partial sun: +7%')
    }

    // Insulation / ceiling type
    if (insul === 'poor') {
      btu *= 1.20
      factors.push('Poor insulation (tin/asbestos roof): +20% (high radiant heat)')
    } else if (insul === 'good') {
      btu *= 0.92
      factors.push('Well insulated (false ceiling, cavity walls): −8%')
    }

    // People (base assumes 2; every extra adds 600 BTU body heat)
    const extra = Math.max(0, parseInt(people || '2') - 2)
    if (extra > 0) {
      btu += extra * 600
      factors.push(`${extra} extra person${extra > 1 ? 's' : ''}: +${extra * 600} BTU (body heat)`)
    }

    btu = Math.round(btu)

    // Map to standard Pakistani AC sizes — always size conservatively (round up)
    // 1 ton = 12,000 BTU | 1.5 ton = 18,000 | 2 ton = 24,000 | 3 ton = 36,000
    let ton: string, tonLabel: string, categorySlug: string
    if (btu <= 13000) {
      ton = '1'; tonLabel = '1 Ton'; categorySlug = '1-ton-air-conditioners'
    } else if (btu <= 19500) {
      ton = '1.5'; tonLabel = '1.5 Ton'; categorySlug = '1-5-ton-air-conditioners'
    } else if (btu <= 26000) {
      ton = '2'; tonLabel = '2 Ton'; categorySlug = '2-ton-air-conditioners'
    } else if (btu <= 38000) {
      ton = '3'; tonLabel = '3 Ton'; categorySlug = 'air-conditioners'
    } else {
      ton = '3+'; tonLabel = '3 Ton+'; categorySlug = 'air-conditioners'
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

            {/* Green Corridor compatibility tag */}
            {(() => {
              const pkg =
                result.ton === '1'   ? { name: 'Starter',       saving: '55–70%' } :
                result.ton === '1.5' ? { name: 'Home Complete',  saving: '70–85%' } :
                                       { name: 'Total Freedom',  saving: '80–90%' }
              return (
                <Link href="/green-corridor" className="flex items-center gap-3 bg-eco-50 border border-eco-200 rounded-xl px-4 py-3 hover:bg-eco-100 transition-colors group">
                  <Leaf className="w-5 h-5 text-eco-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-eco-800">
                      Compatible with our {pkg.name} Solar Package
                    </p>
                    <p className="text-xs text-eco-700 mt-0.5">
                      Run this AC on solar — cut your electricity bill by {pkg.saving}. See the Green Corridor →
                    </p>
                  </div>
                </Link>
              )
            })()}

            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">How we calculated this</p>
              {result.factors.map((f, i) => {
                const icon = i === 0 ? '📐' : f.includes('roof') || f.includes('slab') ? '🔥' : f.includes('sun') ? '☀️' : f.includes('insul') || f.includes('tin') ? '🏠' : f.includes('person') ? '👤' : '➕'
                return (
                  <div key={i} className="flex items-start gap-2.5 bg-white rounded-lg px-3 py-2 border border-gray-100">
                    <span className="text-base leading-none mt-0.5">{icon}</span>
                    <p className="text-sm text-gray-700 leading-snug">{f}</p>
                  </div>
                )
              })}
            </div>

            <Tip>
              {result.ton === '3' || result.ton === '3+'
                ? 'For large halls and open areas, consider a 3-ton or cassette AC. Contact our team — we can recommend the right unit and multi-split options for your space.'
                : 'Always choose inverter over non-inverter in Pakistan — they consume 40–60% less electricity and handle voltage fluctuations better. When in doubt between two sizes, go one step up for better comfort.'}
            </Tip>

            <InlineProductStrip
              category="air-conditioners"
              label={`${result.tonLabel} Air Conditioners`}
              accentColor="blue"
              viewAllHref={`/products/category/${result.categorySlug}`}
            />
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

    // Haier-aligned baseline: 2.5 Cu.Ft per person
    // Haier guidance: 2–3 persons → 7–10 cu.ft | 3–4 → 11–14 | 4–6 → 15–18 | 6+ → 18+
    let cf = m * 2.5
    reasons.push(`${m} family members × 2.5 Cu.Ft = ${cf} Cu.Ft base (Haier-aligned)`)

    if (cooking === 'heavy') {
      cf += 2.5
      reasons.push('Heavy/daily cooking: +2.5 Cu.Ft (fresh produce, daily leftovers)')
    } else if (cooking === 'light') {
      cf -= 1.5
      reasons.push('Light cooking / eating out often: −1.5 Cu.Ft')
    }

    if (shopping === 'fortnightly') {
      cf += 3
      reasons.push('Fortnightly bulk shopping: +3 Cu.Ft (extra storage)')
    } else if (shopping === 'weekly') {
      cf += 1.5
      reasons.push('Weekly grocery shopping: +1.5 Cu.Ft')
    }

    if (meat === 'yes') {
      cf += 3
      reasons.push('Long-term meat / fish storage: +3 Cu.Ft (dedicated freezer zone)')
    }

    // Use a 10% buffer (not 20%) to stay close to Haier guidance ranges
    const minCF = Math.max(7, Math.round(cf))
    const recCF = Math.max(8, Math.round(cf * 1.1))
    // Liter equivalent: 1 cu.ft ≈ 28.3L
    const recL  = Math.round(recCF * 28.3 / 10) * 10

    let sizeLabel: string, categorySlug: string, type: string
    if (recCF <= 10) {
      sizeLabel = 'Small (7–10 Cu.Ft / up to 280L)'; categorySlug = 'refrigerators'
      type = 'Single-door or compact double-door'
    } else if (recCF <= 14) {
      sizeLabel = 'Medium (11–14 Cu.Ft / 280–400L)'; categorySlug = 'refrigerators'
      type = 'Double-door (e.g. Haier HRF-306, HRF-336)'
    } else if (recCF <= 18) {
      sizeLabel = 'Large (15–18 Cu.Ft / 400–510L)'; categorySlug = 'refrigerators'
      type = 'Large double-door (e.g. Haier HRF-398, HRF-438)'
    } else {
      sizeLabel = 'Extra Large (18 Cu.Ft+ / 510L+)'; categorySlug = 'refrigerators'
      type = 'Large double-door or side-by-side (joint family)'
    }

    setResult({ minCF, recCF: recCF, sizeLabel, categorySlug, reasons, type: `${type} (~${recL}L)` })
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
              { value: 'daily',       label: 'Daily (sabzi mandi, fresh only)' },
              { value: 'weekly',      label: 'Weekly (2–4 full bags, family stock)' },
              { value: 'fortnightly', label: 'Fortnightly / Monthly bulk (big haul)' },
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
                label="Recommended Capacity"
                value={result.recCF + ' Cu.Ft'}
                sub={`Min: ${result.minCF} cu.ft · ${result.sizeLabel.split('(')[1]?.replace(')', '') || ''}`}
                color="green"
              />
              <ResultCard
                icon={<Refrigerator className="w-4 h-4" />}
                label="Best Type"
                value={result.sizeLabel.split(' (')[0]}
                sub={`Min: ${result.minCF} Cu.Ft`}
                color="green"
              />
            </div>

            <div className="bg-teal-50 border border-teal-100 rounded-xl px-4 py-3">
              <p className="text-xs font-semibold text-teal-700">Recommended model type:</p>
              <p className="text-sm text-teal-800 font-medium mt-0.5">{result.type}</p>
            </div>

            <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
              <span className="text-2xl leading-none">⚡</span>
              <div>
                <p className="text-sm font-bold text-green-800">Choose Inverter — Save 30–50% on electricity</p>
                <p className="text-xs text-green-700 mt-0.5">Inverter compressors adjust speed to load instead of cycling on/off — a {result.recCF} Cu.Ft inverter fridge can save PKR 2,000–4,000/month in Karachi's heat.</p>
              </div>
            </div>

            <Link href="/green-corridor" className="flex items-center gap-3 bg-eco-50 border border-eco-200 rounded-xl px-4 py-3 hover:bg-eco-100 transition-colors">
              <Leaf className="w-5 h-5 text-eco-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-eco-800">Pair with a Solar Package</p>
                <p className="text-xs text-eco-700 mt-0.5">An inverter fridge runs all day on solar — our Green Corridor packages slash your total bill by 55–90%. →</p>
              </div>
            </Link>

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
              In Karachi, inverter refrigerators save 30–50% electricity vs non-inverter.
              Glass Door (GD) models keep food visible without opening — reducing cooling loss.
              Haier EP / IP / IF series are popular glass-door inverter options.
            </Tip>

            <InlineProductStrip
              category="refrigerators"
              label="Refrigerators"
              accentColor="teal"
              viewAllHref="/products?category=refrigerators"
            />
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
      typeNote = 'Front-load uses 40% less water and gives better wash quality for delicate and fine fabrics'
    } else if (prefer === 'semi') {
      type = 'Semi-Automatic (Twin Tub)'; categorySlug = 'semi-automatic-washing-machines'
      typeNote = 'Semi-auto gives more control and works during load-shedding (lower power draw, flexible water use)'
    } else if (prefer === 'washer') {
      type = 'Washer Only (Semi-Auto Motor)'; categorySlug = 'semi-automatic-washing-machines'
      typeNote = 'A standalone washer motor suits households that already have a spinner or hand-dry. Budget-friendly and low on power.'
    } else if (prefer === 'spinner') {
      type = 'Spinner / Dryer Only'; categorySlug = 'semi-automatic-washing-machines'
      typeNote = 'A standalone spinner spins water out of hand-washed or semi-auto washed clothes quickly — great as a companion unit.'
    } else {
      type = 'Top-Load Fully Automatic'; categorySlug = 'automatic-washing-machines'
      typeNote = 'Top-load automatic is the easiest to use with the fastest wash cycle — best for large families'
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
              { value: 'auto',    label: 'Top-Load Automatic (Full Auto)' },
              { value: 'front',   label: 'Front-Load Automatic (Full Auto)' },
              { value: 'semi',    label: 'Semi-Automatic (Twin Tub)' },
              { value: 'washer',  label: 'Washer Only (Semi-Auto Motor)' },
              { value: 'spinner', label: 'Spinner / Dryer Only' },
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
                value={result.type.includes('Automatic') ? result.type.split(' ')[0] + '-Load Auto' : result.type.split(' ')[0]}
                sub={result.type}
                color="purple"
              />
            </div>

            {/* Drum size comparison */}
            {(() => {
              const base = [6, 7, 8, 10, 12]
              const bars = Array.from(new Set([...base, result.recKg])).sort((a, b) => a - b)
              const max = Math.max(...bars)
              return (
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Drum size comparison</p>
                  <div className="flex items-end justify-around gap-1">
                    {bars.map(sz => {
                      const isRec = sz === result.recKg
                      const heightPct = 36 + (sz / max) * 64
                      return (
                        <div key={sz} className="flex flex-col items-center gap-1.5">
                          <div
                            className={`w-10 rounded-t-full border-2 transition-all ${isRec ? 'bg-violet-500 border-violet-600' : 'bg-gray-200 border-gray-300'}`}
                            style={{ height: `${heightPct}px` }}
                          />
                          <span className={`text-xs font-bold ${isRec ? 'text-violet-700' : 'text-gray-400'}`}>{sz} kg</span>
                          {isRec && <span className="text-[9px] font-bold text-violet-600 bg-violet-100 px-1.5 py-0.5 rounded-full">You</span>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })()}

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

            <InlineProductStrip
              category={result.categorySlug}
              label={result.type}
              accentColor="violet"
              viewAllHref={`/products/category/${result.categorySlug}`}
            />
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
        description="Free interactive calculators to find the right AC tonnage for your room, refrigerator size for your family, and washing machine capacity for your laundry load. By Tajalli's — Karachi."
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
            href={waSales('Hi, I need help choosing the right appliance for my home.')}
            target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-2 bg-white text-brand-600 font-bold px-6 py-3 rounded-xl hover:bg-brand-50 transition-colors"
          >
            Chat on WhatsApp <ChevronRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  )
}
