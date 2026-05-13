import { useState } from 'react'
import { Calculator, Scale, ArrowRight, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'

function roundTo100(n: number) { return Math.round(n / 100) * 100 }
function fmtPKR(n: number) { return 'PKR ' + Math.round(n).toLocaleString('en-PK') }

const UNIT_RATE = 70  // PKR/kWh — K-Electric Karachi average (matches Solar Calculator)
const STD_SIZES = [1, 1.5, 2, 3, 5, 6, 8, 10, 12, 15, 20]
function recSystemKW(offsetKwh: number) {
  const raw = offsetKwh / (4.5 * 30 * 0.80)
  return STD_SIZES.find(s => s >= raw) ?? Math.ceil(raw)
}

function BillSavingsCalc() {
  const [bill, setBill] = useState('')
  const [units, setUnits] = useState('')
  const [offset, setOffset] = useState(80)
  const [result, setResult] = useState<any>(null)

  const calculate = () => {
    const u = parseFloat(units); if (!u || u <= 0) return
    const billEntered = !!parseFloat(bill)
    const currentBill = billEntered ? parseFloat(bill) : roundTo100(u * UNIT_RATE)
    const offsetUnits = u * offset / 100
    const savedAmount = roundTo100(offsetUnits * UNIT_RATE)
    const remainingBill = roundTo100(Math.max(0, currentBill - savedAmount))
    setResult({ currentBill, savedAmount, remainingBill, annualSaving: roundTo100(savedAmount * 12), sysKW: recSystemKW(offsetUnits), billEntered, offset })
  }

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div><label className="text-sm font-medium text-gray-700 block mb-1">Monthly Units (kWh)</label><input type="number" value={units} onChange={e=>setUnits(e.target.value)} placeholder="e.g. 400" className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-brand-400"/></div>
        <div><label className="text-sm font-medium text-gray-700 block mb-1">Actual Bill Amount (optional)</label><input type="number" value={bill} onChange={e=>setBill(e.target.value)} placeholder="PKR — leave blank to estimate" className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-brand-400"/></div>
      </div>
      <div>
        <div className="flex justify-between items-center mb-1">
          <label className="text-sm font-medium text-gray-700">Solar Offset</label>
          <span className="text-sm font-bold text-brand-600">{offset}%</span>
        </div>
        <input type="range" min={25} max={100} step={5} value={offset} onChange={e=>setOffset(+e.target.value)} className="w-full accent-brand-500"/>
        <div className="flex justify-between text-xs text-gray-400 mt-1"><span>25% partial</span><span>50% half</span><span>75%</span><span>100% full</span></div>
      </div>
      <button onClick={calculate} className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl py-3 font-semibold">Calculate My Savings</button>
      {result && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: result.billEntered ? 'Current Bill' : 'Est. Current Bill', val: fmtPKR(result.currentBill), cls: 'bg-red-50 text-red-700' },
              { label: 'Monthly Saving', val: fmtPKR(result.savedAmount), cls: 'bg-green-50 text-green-700' },
              { label: 'New Bill', val: fmtPKR(result.remainingBill), cls: 'bg-blue-50 text-blue-700' },
              { label: 'Annual Saving', val: fmtPKR(result.annualSaving), cls: 'bg-brand-50 text-brand-700' },
            ].map((s, i) => (
              <div key={i} className={`${s.cls} rounded-xl p-4 text-center`}>
                <div className="font-bold text-lg">{s.val}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between gap-3">
            <div>
              <div className="font-semibold text-emerald-800 text-sm">Recommended System Size</div>
              <div className="text-emerald-700 text-xs mt-0.5">To offset {result.offset}% of your {result.billEntered ? 'actual' : 'estimated'} consumption</div>
            </div>
            <div className="text-2xl font-bold text-emerald-700 whitespace-nowrap">{result.sysKW} kW</div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800 space-y-1">
            <p><strong>Assumptions:</strong> PKR {UNIT_RATE}/kWh average unit rate (K-Electric Karachi). Actual rate varies by slab — higher users save more per unit. Fixed charges, taxes, and Fuel Price Adjustments (FPA) are <em>not included</em> in this estimate.</p>
            {!result.billEntered && <p><strong>Note:</strong> No bill amount entered — monthly saving is estimated from units × PKR {UNIT_RATE}/kWh. Enter your actual bill amount above for a more accurate figure.</p>}
          </div>
        </div>
      )}
    </div>
  )
}

function PaybackCalc() {
  const [investment, setInv] = useState('')
  const [saving, setSaving] = useState('')
  const [result, setResult] = useState<any>(null)
  const calculate = () => {
    const inv=parseFloat(investment),sav=parseFloat(saving); if(!inv||!sav) return
    const months=Math.ceil(inv/sav),years=+(months/12).toFixed(1)
    const lifetimeSaving=sav*12*25,roi=+((lifetimeSaving-inv)/inv*100).toFixed(1)
    setResult({months,years,lifetimeSaving:roundTo100(lifetimeSaving),roi})
  }
  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div><label className="text-sm font-medium text-gray-700 block mb-1">System Cost (PKR)</label><input type="number" value={investment} onChange={e=>setInv(e.target.value)} placeholder="e.g. 800000" className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-400"/></div>
        <div><label className="text-sm font-medium text-gray-700 block mb-1">Monthly Saving (PKR)</label><input type="number" value={saving} onChange={e=>setSaving(e.target.value)} placeholder="e.g. 12000" className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-400"/></div>
      </div>
      <button onClick={calculate} className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl py-3 font-semibold">Calculate Payback</button>
      {result && <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{[{label:'Payback Period',val:`${result.years} years`,sub:`${result.months} months`},{label:'25yr Savings',val:fmtPKR(result.lifetimeSaving),sub:'system lifespan'},{label:'ROI',val:result.roi+'%',sub:'return on investment'},{label:'System Lifespan',val:'25 years',sub:'panel warranty'}].map((s,i)=><div key={i} className="bg-blue-50 rounded-xl p-4 text-center"><div className="font-bold text-blue-700 text-lg">{s.val}</div><div className="text-xs text-gray-500 mt-0.5">{s.label}</div><div className="text-xs text-blue-400">{s.sub}</div></div>)}</div>}
    </div>
  )
}

function NetMeteringChecker() {
  const [systemKW, setKW] = useState('')
  const [disco, setDisco] = useState('')
  const [result, setResult] = useState<any>(null)
  const DISCOS: Record<string,string> = {'LESCO':'Lahore Electric Supply Company','HESCO':'Hyderabad Electric Supply Company','PESCO':'Peshawar Electric Supply Company','MEPCO':'Multan Electric Power Company','SEPCO':'Sukkur Electric Power Company','QESCO':'Quetta Electric Supply Company','GEPCO':'Gujranwala Electric Power Company','IESCO':'Islamabad Electric Supply Company','TESCO':'Tribal Areas Electric Supply Company','K-Electric':'K-Electric (Karachi)'}
  const check = () => {
    const kw=parseFloat(systemKW); if(!kw) return
    const isKE = disco === 'K-Electric'
    const eligible = isKE ? kw >= 10 && kw <= 1000 : kw >= 1 && kw <= 1000
    const netExport=kw*7*0.3*30,monthlyCredit=roundTo100(netExport*12)
    const keNote = isKE && kw < 10 ? `❌ K-Electric minimum is 10kW — your ${kw}kW system is not eligible for KE Net Metering` : `System size ${kw}kW — ${eligible?'✅ Within eligible range':'❌ Outside eligible range'}`
    setResult({eligible,kw,monthlyCredit,isKE,requirements:[keNote,'✅ System must use Type-1 approved net meter','✅ Must apply to your DISCO for NM connection agreement','✅ Tier-1 certified installer required','✅ Processing time: 4-8 weeks typically']})
  }
  return (
    <div className="space-y-4">
      <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700"><strong>Net Metering (NEPRA Policy):</strong> Sell excess solar electricity back to your DISCO. Systems 1kW–1MW eligible.</div>
      <div className="grid md:grid-cols-2 gap-4">
        <div><label className="text-sm font-medium text-gray-700 block mb-1">System Size (kW)</label><input type="number" value={systemKW} onChange={e=>setKW(e.target.value)} placeholder="e.g. 5" className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-400"/></div>
        <div><label className="text-sm font-medium text-gray-700 block mb-1">Your DISCO</label><select value={disco} onChange={e=>setDisco(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none bg-white"><option value="">Select your DISCO</option>{Object.entries(DISCOS).map(([k,v])=><option key={k} value={k}>{k} — {v}</option>)}</select></div>
      </div>
      <button onClick={check} className="w-full bg-gradient-to-r from-purple-500 to-violet-500 text-white rounded-xl py-3 font-semibold">Check Eligibility</button>
      {result && <div className="space-y-3"><div className={`rounded-xl p-4 ${result.eligible?'bg-green-50 border border-green-200':'bg-red-50 border border-red-200'}`}><div className={`font-bold text-lg ${result.eligible?'text-green-700':'text-red-700'}`}>{result.eligible?'✅ Your system is Net Metering eligible!':'❌ System not eligible'}</div>{result.eligible&&<div className="mt-2 text-sm text-green-700">Est. monthly credit: <strong>{fmtPKR(result.monthlyCredit)}</strong></div>}</div><div className="bg-gray-50 rounded-xl p-4 space-y-2"><h4 className="font-semibold text-gray-700 text-sm">Requirements</h4>{result.requirements.map((r: string,i: number)=><div key={i} className="text-sm text-gray-600">{r}</div>)}</div></div>}
    </div>
  )
}

function ProductComparison() {
  return (<div className="text-center py-8"><Scale className="w-12 h-12 text-gray-300 mx-auto mb-3"/><p className="text-gray-500 mb-4">Compare products side by side from our catalogue.</p><Link to="/products" className="inline-flex items-center gap-2 bg-brand-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-brand-600">Browse Products <ArrowRight className="w-4 h-4"/></Link></div>)
}

const TOOLS = [
  { id:'bill', icon:'💡', title:'Bill Savings Calculator', desc:'Estimate how much solar reduces your bill.', component:BillSavingsCalc },
  { id:'payback', icon:'📈', title:'Payback Period Calculator', desc:'Find out when your investment pays back.', component:PaybackCalc },
  { id:'netmetering', icon:'⚡', title:'Net Metering Eligibility', desc:'Check if you can sell excess power to the grid.', component:NetMeteringChecker },
  { id:'compare', icon:'⚖️', title:'Product Comparison', desc:'Compare appliances side by side.', component:ProductComparison },
]

export default function ToolsPage() {
  const [activeTool, setActiveTool] = useState('bill')
  const active = TOOLS.find(t => t.id === activeTool) ?? TOOLS[0]
  // JSX requires component references to be a capitalised variable
  const ActiveComponent = active.component
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 py-12 text-center">
          <div className="inline-flex items-center gap-2 bg-brand-100 text-brand-700 px-4 py-1.5 rounded-full text-sm font-medium mb-4">
            <Calculator className="w-4 h-4"/> Free Tools
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">Smart Buying Tools</h1>
          <p className="text-gray-500 max-w-2xl mx-auto">Make smarter decisions with our free calculators.</p>
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {TOOLS.map(t => (
            <button key={t.id} onClick={() => setActiveTool(t.id)}
              className={`p-4 rounded-2xl border-2 text-left transition-all ${activeTool === t.id ? 'border-brand-400 bg-brand-50 shadow-md scale-[1.02]' : 'border-gray-200 bg-white hover:border-brand-300'}`}>
              <div className="text-3xl mb-2">{t.icon}</div>
              <div className="font-semibold text-gray-800 text-sm">{t.title}</div>
              <div className="text-xs text-gray-500 mt-1">{t.desc}</div>
            </button>
          ))}
        </div>
        <div className="bg-white rounded-2xl shadow-sm border p-6 md:p-8">
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <span>{active.icon}</span> {active.title}
          </h2>
          <ActiveComponent />
        </div>
        <div className="mt-6 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 text-white">
          <div>
            <h3 className="font-bold text-lg">Ready to go solar?</h3>
            <p className="text-amber-100 text-sm">Use our full Solar Load Calculator for a customised quote.</p>
          </div>
          <Link to="/solar-calculator" className="whitespace-nowrap bg-white text-brand-600 px-6 py-3 rounded-xl font-semibold flex items-center gap-2 hover:bg-brand-50">
            Solar Calculator <ChevronRight className="w-4 h-4"/>
          </Link>
        </div>
      </div>
    </div>
  )
}
