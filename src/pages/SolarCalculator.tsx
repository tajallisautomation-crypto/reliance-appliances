/**
 * Solar Calculator — Reliance by Tajallis
 *
 * Pricing rules:
 *   Solar — wiring & equipment: Rs.12/W | labor: Rs.5/W | elevated frame: Rs.28/W (optional)
 *   UPS   — wiring & equipment: Rs.9/W  | labor: Rs.3/W
 *
 * Installment rules:
 *   > 5kW system   → no installments
 *   > PKR 700,000  → no installments
 *   > PKR 500,000  → max 2 payments
 *   > PKR 150,000  → max 6 payments
 */

import { useState, useEffect, useMemo } from 'react'
import { Sun, Zap, TrendingUp, Plus, Trash2, ChevronDown, ChevronUp,
         CheckCircle, Award, RefreshCw, ArrowRight, Star, Info } from 'lucide-react'
import { getProducts, fmtPKR, roundTo100 as r100, calcAllPlans } from '../lib/api'
import type { Product, InstallmentPlan } from '../lib/api'

// ── Appliance list ─────────────────────────────────────────────────────────────

const APPLIANCES = [
  { id:'ac_1t',    name:'1 Ton AC (Inverter)',              category:'Cooling',       watts:900  },
  { id:'ac_15t',   name:'1.5 Ton AC (Inverter)',            category:'Cooling',       watts:1300 },
  { id:'ac_2t',    name:'2 Ton AC (Inverter)',              category:'Cooling',       watts:1800 },
  { id:'ac_1t_s',  name:'1 Ton AC (Non-Inverter)',          category:'Cooling',       watts:1200 },
  { id:'ac_15t_s', name:'1.5 Ton AC (Non-Inverter)',        category:'Cooling',       watts:1600 },
  { id:'fridge_s', name:'Small Refrigerator (<10 cu.ft)',   category:'Refrigeration', watts:100  },
  { id:'fridge_m', name:'Medium Refrigerator (10-18 cu.ft)',category:'Refrigeration', watts:150  },
  { id:'fridge_l', name:'Large Refrigerator (18+ cu.ft)',   category:'Refrigeration', watts:200  },
  { id:'fridge_inv',name:'Inverter Refrigerator',           category:'Refrigeration', watts:70   },
  { id:'freezer',  name:'Deep Freezer',                     category:'Refrigeration', watts:150  },
  { id:'led_9w',   name:'LED Bulb (9W)',                    category:'Lighting',      watts:9    },
  { id:'led_18w',  name:'LED Tube (18W)',                   category:'Lighting',      watts:18   },
  { id:'fan_ceil', name:'Ceiling Fan',                      category:'Lighting',      watts:75   },
  { id:'fan_ped',  name:'Pedestal Fan',                     category:'Lighting',      watts:60   },
  { id:'tv_32',    name:'32in LED TV',                      category:'Entertainment', watts:40   },
  { id:'tv_55',    name:'55in LED TV',                      category:'Entertainment', watts:80   },
  { id:'tv_65',    name:'65in LED TV',                      category:'Entertainment', watts:120  },
  { id:'dth',      name:'DTH Set-top Box',                  category:'Entertainment', watts:15   },
  { id:'mw',       name:'Microwave Oven',                   category:'Kitchen',       watts:1200 },
  { id:'kettle',   name:'Electric Kettle',                  category:'Kitchen',       watts:1500 },
  { id:'rice_c',   name:'Rice Cooker',                      category:'Kitchen',       watts:700  },
  { id:'juicer',   name:'Juicer/Blender',                   category:'Kitchen',       watts:350  },
  { id:'wm_auto',  name:'Automatic Washing Machine',        category:'Laundry',       watts:500  },
  { id:'wm_fl',    name:'Front Load Washing Machine',       category:'Laundry',       watts:2000 },
  { id:'pc',       name:'Desktop Computer',                 category:'Office',        watts:200  },
  { id:'laptop',   name:'Laptop',                           category:'Office',        watts:65   },
  { id:'router',   name:'WiFi Router',                      category:'Office',        watts:10   },
  { id:'wh',       name:'Electric Water Heater (Geyser)',   category:'Water',         watts:2000 },
  { id:'wp',       name:'Water Pump (1HP)',                 category:'Water',         watts:750  },
  { id:'wd',       name:'Water Dispenser',                  category:'Water',         watts:100  },
  { id:'iron',     name:'Electric Iron',                    category:'Misc',          watts:1000 },
  { id:'vacuum',   name:'Vacuum Cleaner',                   category:'Misc',          watts:1200 },
]
const CATEGORIES = ['Cooling','Refrigeration','Lighting','Entertainment','Kitchen','Laundry','Office','Water','Misc']

// Energy-efficient upgrade suggestions for common appliances
const UPGRADE_SUGGESTIONS: Record<string, { label: string; savingsW: number; category: string; searchKey: string }> = {
  ac_1t_s:  { label:'Switch to a 1 Ton Inverter AC',    savingsW:300, category:'ac',     searchKey:'1 ton inverter'    },
  ac_15t_s: { label:'Switch to a 1.5 Ton Inverter AC',  savingsW:300, category:'ac',     searchKey:'1.5 ton inverter'  },
  fridge_m: { label:'Switch to an Inverter Refrigerator',savingsW:80, category:'fridge', searchKey:'inverter fridge'   },
  fridge_l: { label:'Switch to an Inverter Refrigerator',savingsW:130,category:'fridge', searchKey:'inverter fridge'   },
  wm_fl:    { label:'Switch to a Top-Load Automatic WM', savingsW:1500,category:'washing',searchKey:'top load automatic'},
}

// ── Pricing constants ──────────────────────────────────────────────────────────

const PANEL_WATTS        = 575       // standard panel wattage
const PANEL_PRICE_PER_W  = 45        // PKR per watt (575W panel = PKR 25,875)
const UNIT_RATE          = 70        // PKR per kWh — hardcoded Karachi average
const WIRING_PER_W       = 12        // Rs/W — solar wiring & equipment
const LABOR_PER_W        = 5         // Rs/W — solar installation labor
const ELEVATED_FRAME_W   = 28        // Rs/W — elevated frame surcharge
const UPS_WIRING_PER_W   = 9         // Rs/W — UPS wiring & equipment
const UPS_LABOR_PER_W    = 3         // Rs/W — UPS labor
const BATTERY_PER_KWH    = 22000     // PKR per kWh of battery

// ── Types ─────────────────────────────────────────────────────────────────────

interface Item { id:string; name:string; watts:number; qty:number; hours:number; category:string }

interface SolarProducts {
  panels:   Product[]
  inverters:Product[]
  batteries:Product[]
}

interface Quote {
  systemKW:    number
  panels:      number
  panelProduct:Product | null
  inverterKW:  number
  invProduct:  Product | null
  batteryKWh:  number
  batBank:     BatteryBank | null
  type:        'on-grid'|'hybrid'|'off-grid'|'ups-only'
  costs: {
    panels:number; inverter:number; battery:number
    wiring:number; labor:number; frame:number; total:number
  }
  savings: {
    unitsPerMonth:number; monthlySaving:number
    annualSaving:number; paybackYears:number
  }
  plans:       Record<string, InstallmentPlan>
  totalW:      number
  dailyU:      number
  withInstallments: boolean
  noInstallReason:  string
}

// ── Plan filter per installment rules ─────────────────────────────────────────

function filterPlans(total: number, systemKW: number, plans: Record<string, InstallmentPlan>) {
  if (systemKW > 5 || total > 700_000) return {}
  const maxPayments = total > 500_000 ? 2 : total > 150_000 ? 6 : 12
  return Object.fromEntries(
    Object.entries(plans).filter(([, p]) => p.monthlyPayments <= maxPayments)
  )
}

function noInstallReason(total: number, systemKW: number): string {
  if (systemKW > 5)    return 'Systems above 5kW are not available on installments.'
  if (total > 700_000) return 'Packages above PKR 700,000 are not available on installments.'
  return ''
}

// ── Best product matcher ───────────────────────────────────────────────────────

function bestPanel(panels: Product[]): Product | null {
  return panels.sort((a, b) => b.price.cash_floor - a.price.cash_floor)[0] || null
}

function bestInverter(inverters: Product[], targetKW: number): Product | null {
  // Pick the inverter whose model number is closest to targetKW but >= targetKW
  return inverters
    .filter(p => {
      const m = p.simplified_name.match(/(\d+(?:\.\d)?)\s*kw/i)
      return m && parseFloat(m[1]) >= targetKW
    })
    .sort((a, b) => {
      const kwa = parseFloat(a.simplified_name.match(/(\d+(?:\.\d)?)\s*kw/i)?.[1] || '99')
      const kwb = parseFloat(b.simplified_name.match(/(\d+(?:\.\d)?)\s*kw/i)?.[1] || '99')
      return kwa - kwb
    })[0] || inverters[0] || null
}

interface BatteryBank {
  product:   Product
  qty:       number
  totalKWh:  number
  totalCost: number
}

function bestBatteryBank(batteries: Product[], targetKWh: number): BatteryBank | null {
  if (!targetKWh || !batteries.length) return null
  const kwhOf = (p: Product) => {
    const m = (p.simplified_name + ' ' + (p.specs?.Capacity ?? '') + '').match(/(\d+(?:\.\d)?)\s*k[wW]h/i)
    return m ? parseFloat(m[1]) : 0
  }
  const valid = batteries.filter(p => kwhOf(p) > 0)
  if (!valid.length) return null
  // Pick the option with lowest total cost to cover targetKWh
  let best: BatteryBank | null = null
  for (const p of valid) {
    const unitKWh = kwhOf(p)
    const qty = Math.ceil(targetKWh / unitKWh)
    const totalCost = p.price.cash_floor * qty
    const totalKWh  = unitKWh * qty
    if (!best || totalCost < best.totalCost) {
      best = { product: p, qty, totalKWh, totalCost }
    }
  }
  return best
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function SolarCalculator() {
  const [mode,        setMode]      = useState<'solar'|'ups'>('solar')
  const [step,        setStep]      = useState<1|2|3|4>(1)
  const [items,       setItems]     = useState<Item[]>([])
  const [sysType,     setSysType]   = useState<'on-grid'|'hybrid'|'off-grid'|'ups-only'>('hybrid')
  const [peakHrs,     setPeakHrs]   = useState(7)
  const [elevFrame,   setElevFrame] = useState(false)
  const [backupHrs,   setBackupHrs] = useState(4)   // UPS mode: desired backup hours
  const [quote,       setQuote]     = useState<Quote | null>(null)
  const [loading,     setLoading]   = useState(false)
  const [openCat,     setOpenCat]   = useState<string|null>('Cooling')
  const [contact,     setContact]   = useState({name:'',phone:'',email:''})
  const [submitted,   setSubmitted] = useState(false)
  const [custom,      setCustom]    = useState({name:'',watts:'',qty:'1',hours:'4'})
  const [solarProds,  setSolarProds] = useState<SolarProducts>({ panels:[], inverters:[], batteries:[] })
  const [billMode,    setBillMode]  = useState(false)
  const [billAmount,  setBillAmount]= useState('')

  // Load solar products from Supabase on mount
  useEffect(() => {
    async function loadSolarProds() {
      try {
        const [panR, invR, batR] = await Promise.all([
          getProducts({ category: 'solar-panel',   admin: 'true', sort: 'price_desc' }),
          getProducts({ category: 'solar-inverter',admin: 'true', sort: 'price_desc' }),
          getProducts({ category: 'solar-battery', admin: 'true', sort: 'price_asc'  }),
        ])
        setSolarProds({ panels: panR.products, inverters: invR.products, batteries: batR.products })
      } catch { /* non-critical — fallback to formula pricing */ }
    }
    loadSolarProds()
  }, [])

  const totalW  = items.reduce((s,i) => s + i.watts * i.qty, 0)
  const dailyU  = items.reduce((s,i) => s + i.watts * i.qty * i.hours / 1000, 0)

  // Bill-based load estimate (PKR 70/kWh assumed)
  const billKWh = useMemo(() => {
    const a = parseFloat(billAmount)
    if (!a) return 0
    return Math.round(a / UNIT_RATE)          // monthly kWh
  }, [billAmount])

  const effectiveDailyU = billMode && billKWh ? billKWh / 30 : dailyU

  const addItem = (app: typeof APPLIANCES[0]) => setItems(prev => {
    const ex = prev.find(i => i.id === app.id)
    if (ex) return prev.map(i => i.id === app.id ? { ...i, qty: i.qty + 1 } : i)
    return [...prev, { ...app, qty: 1, hours: 4 }]
  })
  const removeItem = (id: string) => setItems(p => p.filter(i => i.id !== id))
  const updHours   = (id: string, h: number) => setItems(p => p.map(i => i.id === id ? { ...i, hours: h } : i))
  const updQty     = (id: string, q: number) => setItems(p => p.map(i => i.id === id ? { ...i, qty: Math.max(0, q) } : i))

  const addCustom = () => {
    if (!custom.name || !custom.watts) return
    setItems(p => [...p, {
      id: 'c_' + Date.now(), name: custom.name,
      watts: parseInt(custom.watts) || 0,
      qty: parseInt(custom.qty) || 1,
      hours: parseFloat(custom.hours) || 4, category: 'Custom',
    }])
    setCustom({ name:'', watts:'', qty:'1', hours:'4' })
  }

  // Upgrade suggestions based on selected inefficient appliances
  const upgradeSuggestions = useMemo(() =>
    items
      .filter(i => UPGRADE_SUGGESTIONS[i.id])
      .map(i => ({ item: i, ...UPGRADE_SUGGESTIONS[i.id] }))
  , [items])

  const calc = async () => {
    if (!effectiveDailyU && !items.length && mode === 'solar') return
    if (!totalW && mode === 'ups') return
    setLoading(true)
    try {
      const activeType = mode === 'ups' ? 'ups-only' : sysType
      const refU = effectiveDailyU || dailyU

      // ── UPS mode: size by load × backup hours ──────────────────────────────
      if (mode === 'ups') {
        const batKWh  = Math.ceil(totalW * backupHrs / 1000 * 1.2)  // 20% buffer
        const invKW   = Math.ceil(totalW / 100) / 10                 // round up to 0.1kW
        const batBank = bestBatteryBank(solarProds.batteries, batKWh)
        const batCost = batBank ? batBank.totalCost : r100(batKWh * BATTERY_PER_KWH)
        const invProduct = bestInverter(solarProds.inverters, invKW)
        const invCost    = invProduct ? invProduct.price.cash_floor : r100(invKW * 15000)
        const wiringCost = r100(totalW * (UPS_WIRING_PER_W + UPS_LABOR_PER_W))
        const total      = r100(invCost + batCost + wiringCost)
        const allPlans   = calcAllPlans(total)
        const plans      = filterPlans(total, invKW, allPlans)
        setQuote({
          systemKW: invKW, panels: 0, panelProduct: null,
          inverterKW: invKW, invProduct, batteryKWh: batBank ? batBank.totalKWh : batKWh, batBank,
          type: 'ups-only',
          costs: { panels: 0, inverter: invCost, battery: batCost, wiring: wiringCost, labor: 0, frame: 0, total },
          savings: { unitsPerMonth: 0, monthlySaving: 0, annualSaving: 0, paybackYears: 0 },
          plans, totalW, dailyU: +refU.toFixed(2),
          withInstallments: Object.keys(plans).length > 0,
          noInstallReason: noInstallReason(total, invKW),
        })
        setStep(3)
        return
      }

      // ── Solar mode ─────────────────────────────────────────────────────────
      // Size the system: add 25% safety margin, divide by peak sun hours
      const rawKW  = refU * 1.25 / peakHrs
      const sysKW  = Math.ceil(rawKW * 10) / 10   // round up to 1 decimal

      // Panels
      const panelCount  = activeType === 'ups-only' ? 0 : Math.ceil(sysKW * 1000 / PANEL_WATTS)
      const panProduct  = activeType === 'ups-only' ? null : bestPanel(solarProds.panels)
      const panelCost   = panProduct
        ? panProduct.price.cash_floor * panelCount
        : r100(panelCount * PANEL_WATTS * PANEL_PRICE_PER_W)

      // Inverter
      const invKW      = activeType === 'ups-only' ? sysKW : (sysKW <= 3 ? 3 : sysKW <= 5 ? 5 : sysKW <= 8 ? 8 : sysKW <= 12 ? 12 : 15)
      const invProduct = bestInverter(solarProds.inverters, invKW)
      const invCost    = invProduct ? invProduct.price.cash_floor : r100(invKW * 15000)

      // Battery bank (supports stacking multiple units)
      const needBat = activeType !== 'on-grid'
      const batKWh  = needBat ? Math.ceil(refU * 0.6) : 0   // cover 60% of daily from battery
      const batBank = needBat ? bestBatteryBank(solarProds.batteries, batKWh) : null
      const batCost = needBat
        ? (batBank ? batBank.totalCost : r100(batKWh * BATTERY_PER_KWH))
        : 0

      // Installation
      const effectiveW = sysKW * 1000
      const wiringCost = activeType === 'ups-only'
        ? r100(effectiveW * (UPS_WIRING_PER_W + UPS_LABOR_PER_W))
        : r100(effectiveW * (WIRING_PER_W + LABOR_PER_W))
      const frameCost  = elevFrame ? r100(effectiveW * ELEVATED_FRAME_W) : 0

      const total = r100(panelCost + invCost + batCost + wiringCost + frameCost)

      // Savings (skip for UPS-only)
      const monthlyUnits = activeType === 'ups-only' ? 0 : +(refU * 30).toFixed(0)
      const mSave        = r100(monthlyUnits * UNIT_RATE)
      const paybackYrs   = mSave > 0 ? +(total / mSave / 12).toFixed(1) : 99

      const allPlans = calcAllPlans(total)
      const plans    = filterPlans(total, sysKW, allPlans)

      setQuote({
        systemKW: sysKW, panels: panelCount, panelProduct: panProduct,
        inverterKW: invKW, invProduct,
        batteryKWh: batBank ? batBank.totalKWh : batKWh, batBank,
        type: activeType,
        costs: { panels: panelCost, inverter: invCost, battery: batCost, wiring: wiringCost, labor: 0, frame: frameCost, total },
        savings: { unitsPerMonth: monthlyUnits, monthlySaving: mSave, annualSaving: r100(mSave * 12), paybackYears: paybackYrs },
        plans, totalW, dailyU: +refU.toFixed(2),
        withInstallments: Object.keys(plans).length > 0,
        noInstallReason: noInstallReason(total, sysKW),
      })
      setStep(3)
    } finally { setLoading(false) }
  }

  const submit = () => {
    if (!contact.name || !contact.phone || !quote) return
    const msg = encodeURIComponent(
      `*Solar Quote Request* ☀️\n\nName: ${contact.name}\nPhone: ${contact.phone}${contact.email ? '\nEmail: ' + contact.email : ''}\n\n` +
      `System: ${quote.systemKW}kW ${sysType}\nLoad: ${totalW}W\nPanels: ${quote.panels}\n` +
      `Est. Cost: ${fmtPKR(quote.costs.total)}\nMonthly Saving: ${fmtPKR(quote.savings.monthlySaving)}\n\nPlease send me a detailed proposal.`
    )
    window.open(`https://wa.me/923702578788?text=${msg}`, '_blank')
    setSubmitted(true)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      {/* Hero */}
      <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 text-white py-14 px-4">
        <div className="max-w-4xl mx-auto text-center">
          {/* Mode toggle */}
          <div className="inline-flex bg-white/20 rounded-2xl p-1 mb-6">
            <button onClick={() => { setMode('solar'); setQuote(null); setStep(1); }}
              className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${mode === 'solar' ? 'bg-white text-orange-600 shadow' : 'text-white/80 hover:text-white'}`}>
              ☀️ Solar Calculator
            </button>
            <button onClick={() => { setMode('ups'); setQuote(null); setStep(1); }}
              className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${mode === 'ups' ? 'bg-white text-orange-600 shadow' : 'text-white/80 hover:text-white'}`}>
              🔌 UPS Calculator
            </button>
          </div>
          {mode === 'solar' ? (
            <>
              <h1 className="text-3xl md:text-5xl font-bold mb-3">How much solar do you need?</h1>
              <p className="text-amber-100 text-lg max-w-2xl mx-auto">
                Add your appliances and get an instant, accurate quote using real product prices.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-3xl md:text-5xl font-bold mb-3">UPS & Battery Backup Calculator</h1>
              <p className="text-amber-100 text-lg max-w-2xl mx-auto">
                Find the right UPS inverter and battery bank to keep your home running during load shedding.
              </p>
            </>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Steps */}
        <div className="flex items-center gap-2 justify-center mb-8">
          {(mode === 'ups'
            ? [{n:1,label:'Appliances'},{n:2,label:'Backup Hours'},{n:3,label:'Quote'}]
            : [{n:1,label:'Appliances'},{n:2,label:'Preferences'},{n:3,label:'Quote'},{n:4,label:'Upgrades'}]
          ).map((s,i,arr) => (
            <div key={s.n} className="flex items-center gap-1.5">
              <button onClick={() => quote && setStep(s.n as 1|2|3|4)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all
                  ${step === s.n ? 'bg-orange-500 text-white shadow-lg scale-105'
                  : step > s.n  ? 'bg-green-500 text-white'
                  : 'bg-white text-gray-400 border'}`}>
                {step > s.n ? <CheckCircle className="w-3.5 h-3.5"/> : <span>{s.n}</span>}
                <span className="hidden sm:block">{s.label}</span>
              </button>
              {i < arr.length - 1 && <div className={`w-6 h-0.5 ${step > s.n+1 ? 'bg-green-400' : step > s.n ? 'bg-orange-300' : 'bg-gray-200'}`}/>}
            </div>
          ))}
        </div>

        {/* ── Step 1: Appliances ──────────────────────────────────────────────── */}
        {step === 1 && (
          <div className="grid lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3 space-y-3">
              {/* Bill mode toggle */}
              <div className="bg-white rounded-2xl border border-orange-100 p-4 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <button onClick={() => setBillMode(false)}
                    className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${!billMode ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                    Add Appliances
                  </button>
                  <button onClick={() => setBillMode(true)}
                    className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${billMode ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                    Use Electricity Bill
                  </button>
                </div>
                {billMode && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-1">Monthly Bill Amount (PKR)</label>
                      <input type="number" value={billAmount} onChange={e => setBillAmount(e.target.value)}
                        placeholder="e.g. 15000"
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
                    </div>
                    {billKWh > 0 && (
                      <div className="bg-orange-50 rounded-xl px-4 py-3 text-sm">
                        <span className="font-bold text-orange-700">{billKWh} kWh/month</span>
                        <span className="text-gray-500"> — estimated monthly consumption</span>
                      </div>
                    )}
                    <p className="text-xs text-gray-400">
                      Calculated at PKR {UNIT_RATE}/kWh (Karachi average). You can also add specific appliances below to identify energy drainers and get upgrade suggestions.
                    </p>
                  </div>
                )}
              </div>

              <h2 className="text-base font-bold text-gray-800">
                {billMode ? 'Optionally add appliances for upgrade recommendations' : 'Select Your Appliances'}
              </h2>

              {CATEGORIES.map(cat => {
                const apps = APPLIANCES.filter(a => a.category === cat)
                return (
                  <div key={cat} className="bg-white rounded-2xl shadow-sm border border-orange-100 overflow-hidden">
                    <button onClick={() => setOpenCat(openCat === cat ? null : cat)}
                      className="w-full flex items-center justify-between p-4 hover:bg-orange-50 transition-colors">
                      <span className="font-semibold text-gray-700 text-sm">{cat}</span>
                      {openCat === cat ? <ChevronUp className="w-4 h-4 text-gray-400"/> : <ChevronDown className="w-4 h-4 text-gray-400"/>}
                    </button>
                    {openCat === cat && (
                      <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {apps.map(app => (
                          <button key={app.id} onClick={() => addItem(app)}
                            className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-orange-300 hover:bg-orange-50 transition-all text-left group">
                            <div>
                              <div className="text-sm font-medium text-gray-700 group-hover:text-orange-700">{app.name}</div>
                              <div className="text-xs text-gray-400">{app.watts}W</div>
                            </div>
                            <Plus className="w-4 h-4 text-gray-300 group-hover:text-orange-500"/>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Custom appliance */}
              <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-4">
                <h3 className="font-semibold text-gray-700 text-sm mb-3">Add Custom Appliance</h3>
                <div className="grid grid-cols-2 gap-2">
                  <input className="col-span-2 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                    placeholder="Appliance name" value={custom.name} onChange={e => setCustom(p => ({...p,name:e.target.value}))}/>
                  <input className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                    placeholder="Watts" type="number" value={custom.watts} onChange={e => setCustom(p => ({...p,watts:e.target.value}))}/>
                  <input className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                    placeholder="Qty" type="number" value={custom.qty} onChange={e => setCustom(p => ({...p,qty:e.target.value}))}/>
                  <button onClick={addCustom}
                    className="col-span-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl py-2 text-sm font-medium">
                    Add Appliance
                  </button>
                </div>
              </div>
            </div>

            {/* Load summary sidebar */}
            <div className="lg:col-span-2">
              <div className="sticky top-4">
                <h2 className="text-base font-bold text-gray-800 mb-3">Your Load</h2>
                <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-4 space-y-3 max-h-96 overflow-y-auto">
                  {!items.length && (
                    <div className="text-center py-8 text-gray-400">
                      <Zap className="w-10 h-10 mx-auto mb-2 opacity-30"/>
                      <p className="text-sm">Add appliances from the left</p>
                    </div>
                  )}
                  {items.map(item => (
                    <div key={item.id} className="border border-gray-100 rounded-xl p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="text-sm font-medium text-gray-700">{item.name}</div>
                          <div className="text-xs text-gray-400">{item.watts}W each</div>
                        </div>
                        <button onClick={() => removeItem(item.id)} className="text-red-300 hover:text-red-500">
                          <Trash2 className="w-4 h-4"/>
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="text-gray-500 block mb-1">Qty</label>
                          <input type="number" min={0} value={item.qty}
                            onChange={e => updQty(item.id, parseInt(e.target.value) || 0)}
                            className="w-full border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-orange-400"/>
                        </div>
                        <div>
                          <label className="text-gray-500 block mb-1">Hours/day</label>
                          <input type="number" min={0} max={24} step={0.5} value={item.hours}
                            onChange={e => updHours(item.id, parseFloat(e.target.value) || 0)}
                            className="w-full border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-orange-400"/>
                        </div>
                      </div>
                      <div className="text-xs text-orange-600 mt-1 font-medium">
                        {item.watts * item.qty}W × {item.hours}hrs = {(item.watts * item.qty * item.hours / 1000).toFixed(2)} kWh/day
                      </div>
                      {UPGRADE_SUGGESTIONS[item.id] && (
                        <div className="mt-1.5 text-[10px] text-amber-700 bg-amber-50 rounded-lg px-2 py-1 flex items-center gap-1">
                          <Star className="w-2.5 h-2.5 fill-current flex-shrink-0"/>
                          {UPGRADE_SUGGESTIONS[item.id].label} to save ~{UPGRADE_SUGGESTIONS[item.id].savingsW}W
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {(items.length > 0 || (billMode && billKWh > 0)) && (
                  <div className="mt-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-2xl p-4">
                    {items.length > 0 && (
                      <>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Total Load</span><span className="font-bold">{totalW}W</span>
                        </div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Daily Usage</span><span className="font-bold">{dailyU.toFixed(1)} kWh</span>
                        </div>
                      </>
                    )}
                    {billMode && billKWh > 0 && (
                      <div className="flex justify-between text-sm mb-1">
                        <span>Bill-based usage</span><span className="font-bold">{(billKWh/30).toFixed(1)} kWh/day</span>
                      </div>
                    )}
                    <button onClick={() => setStep(2)}
                      className="w-full mt-3 bg-white text-orange-600 font-semibold rounded-xl py-2 hover:bg-orange-50 transition-colors text-sm">
                      {mode === 'ups' ? 'Next: Backup Hours' : 'Next: Preferences'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Step 2: UPS mode — backup hours ─────────────────────────────────── */}
        {step === 2 && mode === 'ups' && (
          <div className="max-w-2xl mx-auto space-y-5">
            <h2 className="text-2xl font-bold text-gray-800 text-center">UPS Preferences</h2>

            <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-6">
              <h3 className="font-semibold text-gray-700 mb-1 text-sm">Desired Backup Duration</h3>
              <p className="text-xs text-gray-500 mb-4">How many hours do you want to run during load shedding?</p>
              <div className="flex items-center gap-4">
                <input type="range" min={1} max={12} step={0.5} value={backupHrs}
                  onChange={e => setBackupHrs(parseFloat(e.target.value))}
                  className="flex-1 accent-orange-500"/>
                <div className="bg-orange-100 text-orange-700 font-bold px-4 py-2 rounded-xl min-w-[60px] text-center text-sm">
                  {backupHrs}h
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-orange-100 to-amber-100 rounded-2xl p-5">
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { v: `${totalW}W`,    l: 'Total Load' },
                  { v: `${backupHrs}h`, l: 'Backup Time' },
                  { v: `${+(totalW * backupHrs / 1000 * 1.2).toFixed(1)} kWh`, l: 'Battery Needed' },
                ].map((x,i) => (
                  <div key={i} className="bg-white rounded-xl p-3">
                    <div className="text-xl font-bold text-orange-600">{x.v}</div>
                    <div className="text-[10px] text-gray-500">{x.l}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(1)}
                className="flex-1 border border-gray-300 text-gray-600 rounded-xl py-3 font-medium hover:bg-gray-50 text-sm">
                Back
              </button>
              <button onClick={calc} disabled={loading || !totalW}
                className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl py-3 font-semibold shadow-lg disabled:opacity-50 text-sm">
                {loading ? 'Calculating…' : 'Generate Quote'}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Solar — Preferences ─────────────────────────────────────── */}
        {step === 2 && mode === 'solar' && (
          <div className="max-w-2xl mx-auto space-y-5">
            <h2 className="text-2xl font-bold text-gray-800 text-center">System Preferences</h2>

            {/* System type */}
            <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-6">
              <h3 className="font-semibold text-gray-700 mb-4 text-sm">System Type</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {([
                  { val:'on-grid',  label:'On-Grid',   desc:'No battery. Lowest cost.',       icon:'⚡' },
                  { val:'hybrid',   label:'Hybrid',    desc:'Battery backup + grid tie.',      icon:'🔋' },
                  { val:'off-grid', label:'Off-Grid',  desc:'Fully independent.',              icon:'☀️' },
                  { val:'ups-only', label:'UPS / Battery', desc:'No panels — backup only.',   icon:'🔌' },
                ] as const).map(s => (
                  <button key={s.val} onClick={() => setSysType(s.val)}
                    className={`p-3 rounded-xl border-2 text-center transition-all
                      ${sysType === s.val ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-orange-300'}`}>
                    <div className="text-xl mb-1">{s.icon}</div>
                    <div className="font-semibold text-xs">{s.label}</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Peak sun hours */}
            {sysType !== 'ups-only' && (
              <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-6">
                <h3 className="font-semibold text-gray-700 mb-1 text-sm">Peak Sun Hours</h3>
                <p className="text-xs text-gray-500 mb-4">Karachi: 7hrs · Punjab: 6hrs · Northern: 5hrs</p>
                <div className="flex items-center gap-4">
                  <input type="range" min={4} max={9} step={0.5} value={peakHrs}
                    onChange={e => setPeakHrs(parseFloat(e.target.value))}
                    className="flex-1 accent-orange-500"/>
                  <div className="bg-orange-100 text-orange-700 font-bold px-4 py-2 rounded-xl min-w-[56px] text-center text-sm">
                    {peakHrs}h
                  </div>
                </div>
              </div>
            )}

            {/* Elevated frame */}
            {sysType !== 'ups-only' && (
              <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-5">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={elevFrame} onChange={e => setElevFrame(e.target.checked)}
                    className="mt-0.5 accent-orange-500"/>
                  <div>
                    <div className="text-sm font-semibold text-gray-700">Elevated / Tilted Frame</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      Required if roof is flat or mounting on a stand. Adds Rs.28/watt (Rs.{(28 * effectiveDailyU * 1.25 / peakHrs * 1000 / 1000).toFixed(0) || '—'}k estimated).
                    </div>
                  </div>
                </label>
              </div>
            )}

            {/* KE Net Metering info — only relevant for grid-tied systems */}
            {(sysType === 'on-grid' || sysType === 'hybrid') && (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex gap-3">
                <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5"/>
                <div className="text-xs text-blue-800">
                  <span className="font-semibold">KE Net Metering: </span>
                  K-Electric (KE) only approves Net Metering for systems of <span className="font-semibold">10kW or above</span>. Systems under 10kW will not qualify — you can still use solar to offset your own consumption, but you cannot sell surplus electricity back to the grid.
                </div>
              </div>
            )}

            {/* Summary */}
            <div className="bg-gradient-to-r from-orange-100 to-amber-100 rounded-2xl p-5">
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { v: effectiveDailyU > 0 ? `${effectiveDailyU.toFixed(1)} kWh` : '—', l: 'Daily Usage' },
                  { v: effectiveDailyU > 0 ? `${(effectiveDailyU*30).toFixed(0)} kWh` : '—', l: 'Monthly' },
                  { v: effectiveDailyU > 0 ? `${+(effectiveDailyU*1.25/peakHrs).toFixed(1)} kW` : '—', l: 'Est. System Size' },
                ].map((x,i) => (
                  <div key={i} className="bg-white rounded-xl p-3">
                    <div className="text-xl font-bold text-orange-600">{x.v}</div>
                    <div className="text-[10px] text-gray-500">{x.l}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(1)}
                className="flex-1 border border-gray-300 text-gray-600 rounded-xl py-3 font-medium hover:bg-gray-50 text-sm">
                Back
              </button>
              <button onClick={calc} disabled={loading || (!effectiveDailyU && !items.length)}
                className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl py-3 font-semibold shadow-lg disabled:opacity-50 text-sm">
                {loading ? 'Calculating…' : 'Generate Quote'}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Quote ───────────────────────────────────────────────────── */}
        {step === 3 && quote && (
          <div className="max-w-3xl mx-auto space-y-5">
            {/* Hero summary */}
            <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 text-white rounded-3xl p-7 text-center">
              <div className="text-5xl font-bold mb-1">
                {quote.type === 'ups-only' ? `${quote.inverterKW}kW` : `${quote.systemKW} kW`}
              </div>
              <div className="text-amber-100 mb-4">
                {quote.type === 'ups-only' ? 'UPS / Battery Backup System' : `${quote.type.charAt(0).toUpperCase() + quote.type.slice(1)} Solar System`}
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { v: quote.type === 'ups-only' ? '—' : `${quote.panels}`, l: quote.panelProduct ? quote.panelProduct.brand + ' Panels' : `Panels (${PANEL_WATTS}W)` },
                  { v: quote.invProduct ? quote.invProduct.brand : `${quote.inverterKW}kW`, l: quote.invProduct ? quote.invProduct.simplified_name.replace(/\d+(?:\.\d)?kw/i,'').trim().slice(0,20) : 'Inverter' },
                  { v: quote.batBank ? `${quote.batBank.qty > 1 ? `${quote.batBank.qty}×` : ''}${quote.batteryKWh.toFixed(1)} kWh` : (quote.batteryKWh ? `${quote.batteryKWh} kWh` : '—'), l: quote.batBank ? quote.batBank.product.brand + ' Battery' : quote.batteryKWh ? 'kWh Battery' : 'No Battery' },
                ].map((x,i) => (
                  <div key={i} className="bg-white/20 rounded-xl p-3">
                    <div className="font-bold text-lg">{x.v}</div>
                    <div className="text-[10px] text-amber-100 truncate">{x.l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* KE Net Metering warning — shown when grid-tied and system < 10kW */}
            {(quote.type === 'on-grid' || quote.type === 'hybrid') && quote.systemKW < 10 && (
              <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex gap-3">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5"/>
                <div className="text-sm text-amber-900">
                  <span className="font-semibold">Net Metering not available for this system. </span>
                  K-Electric (KE) requires a minimum of <span className="font-semibold">10kW</span> for Net Metering approval. Your {quote.systemKW}kW system will reduce your electricity bill by consuming solar power directly, but you cannot export surplus power to the grid under KE's current policy. Contact us if you'd like to size up to 10kW.
                </div>
              </div>
            )}

            {/* Recommended products */}
            {(quote.panelProduct || quote.invProduct || quote.batBank) && (
              <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-5">
                <h3 className="font-bold text-gray-800 mb-3 text-sm flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500 fill-current"/> Recommended Products
                </h3>
                <div className="space-y-2">
                  {quote.panelProduct && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      {quote.panelProduct.thumbnail && (
                        <img src={quote.panelProduct.thumbnail} alt="" className="w-10 h-10 object-contain rounded"/>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-gray-500">{quote.panelProduct.brand} — Solar Panel</div>
                        <div className="text-sm font-semibold text-gray-800 truncate">{quote.panelProduct.simplified_name}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs text-gray-400">×{quote.panels}</div>
                        <div className="text-sm font-bold text-orange-600">{fmtPKR(quote.costs.panels)}</div>
                      </div>
                    </div>
                  )}
                  {quote.invProduct && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      {quote.invProduct.thumbnail && (
                        <img src={quote.invProduct.thumbnail} alt="" className="w-10 h-10 object-contain rounded"/>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-gray-500">{quote.invProduct.brand} — {quote.type === 'ups-only' ? 'UPS Inverter' : 'Solar Inverter'}</div>
                        <div className="text-sm font-semibold text-gray-800 truncate">{quote.invProduct.simplified_name}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-bold text-orange-600">{fmtPKR(quote.costs.inverter)}</div>
                      </div>
                    </div>
                  )}
                  {quote.batBank && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      {quote.batBank.product.thumbnail && (
                        <img src={quote.batBank.product.thumbnail} alt="" className="w-10 h-10 object-contain rounded"/>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-gray-500">{quote.batBank.product.brand} — Battery{quote.batBank.qty > 1 ? ` Bank (${quote.batBank.qty} units)` : ''}</div>
                        <div className="text-sm font-semibold text-gray-800 truncate">{quote.batBank.product.simplified_name}</div>
                        {quote.batBank.qty > 1 && (
                          <div className="text-xs text-orange-600 mt-0.5">{quote.batBank.qty}× units = {quote.batBank.totalKWh.toFixed(1)} kWh total</div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs text-gray-400">×{quote.batBank.qty}</div>
                        <div className="text-sm font-bold text-orange-600">{fmtPKR(quote.costs.battery)}</div>
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-gray-400 mt-2 flex items-center gap-1">
                  <Info className="w-3 h-3"/> Multiple battery units are stacked to meet your capacity requirement.
                </p>
              </div>
            )}

            {/* Cost breakdown */}
            <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-5">
              <h3 className="font-bold text-gray-800 mb-4 text-sm">Cost Breakdown</h3>
              <div className="space-y-2">
                {[
                  quote.type !== 'ups-only' && quote.panels > 0 && { label: `${quote.panels}× Solar Panels`, val: quote.costs.panels },
                  { label: `${quote.inverterKW}kW ${quote.type === 'ups-only' ? 'UPS Inverter' : 'Solar Inverter'}`, val: quote.costs.inverter },
                  quote.batteryKWh > 0 && { label: quote.batBank && quote.batBank.qty > 1 ? `${quote.batBank.qty}× Battery Units (${quote.batteryKWh.toFixed(1)} kWh)` : `${quote.batteryKWh} kWh Battery`, val: quote.costs.battery },
                  { label: `Wiring, Equipment & Installation`, val: quote.costs.wiring },
                  quote.costs.frame > 0 && { label: 'Elevated Frame', val: quote.costs.frame },
                ].filter(Boolean).map((row: any, i) => (
                  <div key={i} className="flex justify-between items-center py-1.5 border-b border-gray-50">
                    <span className="text-gray-600 text-sm">{row.label}</span>
                    <span className="font-semibold text-sm">{fmtPKR(row.val)}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center py-3 bg-orange-50 rounded-xl px-3 mt-2">
                  <span className="font-bold text-gray-800">Total Investment</span>
                  <span className="font-bold text-2xl text-orange-600">{fmtPKR(quote.costs.total)}</span>
                </div>
              </div>
            </div>

            {/* Savings */}
            {quote.savings.monthlySaving > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-5">
                <h3 className="font-bold text-gray-800 mb-4 text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-500"/> Savings Analysis
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { l:'Units/Month', v: `${quote.savings.unitsPerMonth} kWh` },
                    { l:'Monthly Saving', v: fmtPKR(quote.savings.monthlySaving) },
                    { l:'Annual Saving', v: fmtPKR(quote.savings.annualSaving) },
                    { l:'Payback Period', v: `${quote.savings.paybackYears} yrs` },
                  ].map((s,i) => (
                    <div key={i} className="bg-green-50 rounded-xl p-3 text-center">
                      <div className="font-bold text-green-700 text-sm">{s.v}</div>
                      <div className="text-[10px] text-gray-500 mt-0.5">{s.l}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Installment plans */}
            <div className="bg-white rounded-2xl shadow-sm border border-blue-100 p-5">
              <h3 className="font-bold text-gray-800 mb-4 text-sm flex items-center gap-2">
                <Award className="w-4 h-4 text-blue-500"/> Installment Plans
              </h3>
              {!quote.withInstallments ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
                  {quote.noInstallReason || 'Installments not available for this package.'}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {Object.entries(quote.plans).map(([key, plan]) => (
                    <div key={key} className="border-2 border-blue-100 hover:border-blue-400 rounded-xl p-4 transition-all">
                      <div className="font-bold text-blue-700 text-sm capitalize mb-3">{key.replace('m',' Month')}</div>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between"><span className="text-gray-500">Total</span><span className="font-semibold">{fmtPKR(plan.total)}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Advance ({Math.round(plan.advancePct*100)}%)</span><span className="font-semibold text-orange-600">{fmtPKR(plan.advance)}</span></div>
                        <div className="flex justify-between border-t pt-1.5"><span className="text-gray-500">{plan.monthlyPayments}× Monthly</span><span className="font-bold text-sm text-blue-700">{fmtPKR(plan.monthly)}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Lead capture */}
            {!submitted ? (
              <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-5">
                <h3 className="font-bold text-gray-800 mb-1 text-sm">Get This Quote Delivered</h3>
                <p className="text-gray-500 text-xs mb-4">Our solar expert will contact you within 2 hours.</p>
                <div className="grid md:grid-cols-3 gap-3">
                  <input className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400"
                    placeholder="Your name *" value={contact.name} onChange={e => setContact(p => ({...p,name:e.target.value}))}/>
                  <input className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400"
                    placeholder="Phone number *" value={contact.phone} onChange={e => setContact(p => ({...p,phone:e.target.value}))}/>
                  <input className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400"
                    placeholder="Email (optional)" value={contact.email} onChange={e => setContact(p => ({...p,email:e.target.value}))}/>
                </div>
                <div className="grid md:grid-cols-2 gap-3 mt-3">
                  <button onClick={submit} disabled={!contact.name || !contact.phone}
                    className="bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl py-3 font-semibold disabled:opacity-50 hover:shadow-lg transition-all text-sm">
                    Request Detailed Quote
                  </button>
                  {mode === 'solar' && (
                    <button onClick={() => { setStep(4) }}
                      className="border-2 border-orange-300 text-orange-600 rounded-xl py-3 font-semibold hover:bg-orange-50 transition-all flex items-center justify-center gap-2 text-sm">
                      See Upgrade Savings <ArrowRight className="w-4 h-4"/>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3"/>
                <h3 className="font-bold text-green-800">Quote Sent!</h3>
                <p className="text-green-700 text-sm mt-1">Our solar expert will contact you within 2 hours.</p>
              </div>
            )}

            <button onClick={() => { setStep(1); setQuote(null); setSubmitted(false) }}
              className="w-full border border-gray-300 text-gray-500 rounded-xl py-3 hover:bg-gray-50 text-sm">
              <RefreshCw className="w-4 h-4 inline mr-2"/>Start Over
            </button>
          </div>
        )}

        {/* ── Step 4: Upgrade Suggestions ─────────────────────────────────────── */}
        {step === 4 && quote && (
          <div className="max-w-3xl mx-auto space-y-5">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-800">Reduce Your Solar Requirement</h2>
              <p className="text-gray-500 text-sm mt-1">
                Switching to energy-efficient appliances can significantly reduce your solar system size and upfront cost.
              </p>
            </div>

            {upgradeSuggestions.length === 0 ? (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
                <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-3"/>
                <h3 className="font-bold text-green-800">Your appliance mix looks efficient!</h3>
                <p className="text-green-700 text-sm mt-1">No major energy drainers found in your current list.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {upgradeSuggestions.map(({ item, label, savingsW }) => {
                  const reducedW    = totalW - savingsW * item.qty
                  const reducedKW   = +(reducedW * 1.25 / peakHrs / 1000).toFixed(1)
                  const savedKW     = quote.systemKW - reducedKW
                  const savedCost   = r100(savedKW * (WIRING_PER_W + LABOR_PER_W + PANEL_PRICE_PER_W) * 1000)
                  return (
                    <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-amber-100 p-5">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                          <Star className="w-5 h-5 text-amber-600 fill-current"/>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">{item.name} (×{item.qty})</div>
                          <div className="font-semibold text-gray-800 text-sm">{label}</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-center">
                        {[
                          { l:'Power Saving', v:`${savingsW * item.qty}W` },
                          { l:'System Reduction', v:`${savedKW.toFixed(1)}kW` },
                          { l:'Est. Cost Saving', v: fmtPKR(savedCost) },
                        ].map((x,i) => (
                          <div key={i} className="bg-amber-50 rounded-xl p-3">
                            <div className="font-bold text-amber-700 text-sm">{x.v}</div>
                            <div className="text-[10px] text-gray-500">{x.l}</div>
                          </div>
                        ))}
                      </div>
                      <a href={`/products/category/${item.category === 'ac' ? 'air-conditioners' : item.category}`}
                        className="mt-3 w-full flex items-center justify-center gap-2 border border-orange-300 text-orange-600 rounded-xl py-2 text-sm font-medium hover:bg-orange-50 transition-colors">
                        View Energy-Efficient Options <ArrowRight className="w-4 h-4"/>
                      </a>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Night load comparison */}
            {items.some(i => i.hours > 12) && (
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
                <h3 className="font-bold text-blue-800 text-sm mb-2">Night Load Analysis</h3>
                <p className="text-blue-700 text-xs mb-3">
                  Appliances running at night rely on battery. Reducing night load reduces battery requirement and cost.
                </p>
                <div className="space-y-1.5">
                  {items.filter(i => i.hours > 8).map(i => (
                    <div key={i.id} className="flex justify-between text-xs">
                      <span className="text-gray-700">{i.name} ×{i.qty}</span>
                      <span className="font-semibold text-blue-700">{(i.watts * i.qty * i.hours / 1000).toFixed(1)} kWh/day on battery</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep(3)}
                className="flex-1 border border-gray-300 text-gray-600 rounded-xl py-3 text-sm font-medium hover:bg-gray-50">
                Back to Quote
              </button>
              <button onClick={submit} disabled={!contact.name || !contact.phone}
                className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-50">
                {contact.name ? 'Send Quote via WhatsApp' : 'Enter contact details first'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
