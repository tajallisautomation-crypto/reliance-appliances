import { useState } from 'react'
import { Sun, Zap, TrendingUp, Plus, Trash2, ChevronDown, ChevronUp, Award, CheckCircle } from 'lucide-react'

const APPLIANCES = [
  { id:'ac_1t',    name:'1 Ton AC (Inverter)',       category:'Cooling',        watts:900  },
  { id:'ac_15t',   name:'1.5 Ton AC (Inverter)',     category:'Cooling',        watts:1300 },
  { id:'ac_2t',    name:'2 Ton AC (Inverter)',        category:'Cooling',        watts:1800 },
  { id:'ac_1t_s',  name:'1 Ton AC (Non-Inverter)',   category:'Cooling',        watts:1200 },
  { id:'ac_15t_s', name:'1.5 Ton AC (Non-Inverter)', category:'Cooling',        watts:1600 },
  { id:'fridge_s', name:'Small Refrigerator (<10 cu.ft)',   category:'Refrigeration', watts:100 },
  { id:'fridge_m', name:'Medium Refrigerator (10-18 cu.ft)',category:'Refrigeration', watts:150 },
  { id:'fridge_l', name:'Large Refrigerator (18+ cu.ft)',   category:'Refrigeration', watts:200 },
  { id:'freezer',  name:'Deep Freezer',              category:'Refrigeration',  watts:150 },
  { id:'led_9w',   name:'LED Bulb (9W)',              category:'Lighting',       watts:9   },
  { id:'led_18w',  name:'LED Tube (18W)',             category:'Lighting',       watts:18  },
  { id:'fan_ceil', name:'Ceiling Fan',                category:'Lighting',       watts:75  },
  { id:'fan_ped',  name:'Pedestal Fan',               category:'Lighting',       watts:60  },
  { id:'tv_32',    name:'32" LED TV',                 category:'Entertainment',  watts:40  },
  { id:'tv_55',    name:'55" LED TV',                 category:'Entertainment',  watts:80  },
  { id:'tv_65',    name:'65" LED TV',                 category:'Entertainment',  watts:120 },
  { id:'dth',      name:'DTH Set-top Box',            category:'Entertainment',  watts:15  },
  { id:'mw',       name:'Microwave Oven',             category:'Kitchen',        watts:1200 },
  { id:'kettle',   name:'Electric Kettle',            category:'Kitchen',        watts:1500 },
  { id:'rice_c',   name:'Rice Cooker',                category:'Kitchen',        watts:700  },
  { id:'juicer',   name:'Juicer/Blender',             category:'Kitchen',        watts:350  },
  { id:'wm_auto',  name:'Automatic Washing Machine',  category:'Laundry',        watts:500  },
  { id:'wm_fl',    name:'Front Load Washing Machine', category:'Laundry',        watts:2000 },
  { id:'pc',       name:'Desktop Computer',           category:'Office',         watts:200  },
  { id:'laptop',   name:'Laptop',                     category:'Office',         watts:65   },
  { id:'router',   name:'WiFi Router',                category:'Office',         watts:10   },
  { id:'wh',       name:'Electric Water Heater (Geyser)', category:'Water',      watts:2000 },
  { id:'wp',       name:'Water Pump (1HP)',            category:'Water',          watts:750  },
  { id:'wd',       name:'Water Dispenser',             category:'Water',          watts:100  },
  { id:'iron',     name:'Electric Iron',               category:'Misc',           watts:1000 },
  { id:'vacuum',   name:'Vacuum Cleaner',              category:'Misc',           watts:1200 },
]
const CATEGORIES = ['Cooling','Refrigeration','Lighting','Entertainment','Kitchen','Laundry','Office','Water','Misc']
function r100(n: number) { return Math.round(n/100)*100 }
function pkr(n: number) { return 'PKR '+n.toLocaleString('en-PK') }
interface Item { id:string; name:string; watts:number; qty:number; hours:number; category:string }
const SHEET_URL = (import.meta as any).env?.VITE_SHEETS_URL || ''

export default function SolarCalculator() {
  const [step, setStep] = useState<1|2|3>(1)
  const [items, setItems] = useState<Item[]>([])
  const [sysType, setSysType] = useState<'on-grid'|'hybrid'|'off-grid'>('hybrid')
  const [peakHrs, setPeakHrs] = useState(7)
  const [quote, setQuote] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [openCat, setOpenCat] = useState<string|null>('Cooling')
  const [contact, setContact] = useState({name:'',phone:'',email:''})
  const [submitted, setSubmitted] = useState(false)
  const [custom, setCustom] = useState({name:'',watts:'',qty:'1',hours:'4'})

  const totalW = items.reduce((s,i)=>s+i.watts*i.qty, 0)
  const dailyU = items.reduce((s,i)=>s+i.watts*i.qty*i.hours/1000, 0)

  const addItem = (app: typeof APPLIANCES[0]) => setItems(prev => {
    const ex = prev.find(i=>i.id===app.id)
    if (ex) return prev.map(i=>i.id===app.id?{...i,qty:i.qty+1}:i)
    return [...prev,{id:app.id,name:app.name,watts:app.watts,qty:1,hours:4,category:app.category}]
  })
  const removeItem = (id: string) => setItems(p=>p.filter(i=>i.id!==id))
  const updHours = (id: string, h: number) => setItems(p=>p.map(i=>i.id===id?{...i,hours:h}:i))
  const updQty   = (id: string, q: number) => setItems(p=>p.map(i=>i.id===id?{...i,qty:Math.max(1,q)}:i))
  const addCustom = () => {
    if (!custom.name||!custom.watts) return
    setItems(p=>[...p,{id:'c_'+Date.now(),name:custom.name,watts:parseInt(custom.watts)||0,qty:parseInt(custom.qty)||1,hours:parseFloat(custom.hours)||4,category:'Custom'}])
    setCustom({name:'',watts:'',qty:'1',hours:'4'})
  }

  const calc = async () => {
    if (!items.length) return
    setLoading(true)
    try {
      const kw = +(totalW*1.25/1000).toFixed(2)
      const panels = Math.ceil(kw/0.545)
      const pCost  = r100(panels*12500)
      const invKW  = kw<=3?3:kw<=5?5:kw<=8?8:10
      const iCost  = invKW===3?45000:invKW===5?75000:invKW===8?120000:180000
      let bKWh=0,bCost=0
      if (sysType!=='on-grid'){bKWh=Math.ceil(dailyU/0.8);bCost=r100(bKWh*18000)}
      const total = r100(pCost+iCost+bCost+25000)
      const msave = r100(dailyU*30*50)
      const plans = {
        '3month':  {total:r100(total*1.15),advance:r100(total*1.15*0.45),monthly:r100(total*1.15*0.55/2), monthlyPayments:2},
        '6month':  {total:r100(total*1.25),advance:r100(total*1.25*0.40),monthly:r100(total*1.25*0.60/5), monthlyPayments:5},
        '12month': {total:r100(total*1.40),advance:r100(total*1.40*0.30),monthly:r100(total*1.40*0.70/11),monthlyPayments:11},
      }
      setQuote({systemKW:kw,panels,inverterKW:invKW,batteryKWh:bKWh,type:sysType,
        costs:{panels:pCost,inverter:iCost,battery:bCost,installation:25000,total},
        savings:{unitsPerMonth:+(dailyU*30).toFixed(1),monthlySaving:msave,annualSaving:r100(msave*12),paybackMonths:Math.ceil(total/msave),paybackYears:+(Math.ceil(total/msave)/12).toFixed(1)},
        plans,totalW,dailyU:+dailyU.toFixed(2)})
      setStep(3)
    } finally { setLoading(false) }
  }

  const submit = async () => {
    if (!contact.name||!contact.phone) return
    try { await fetch(SHEET_URL,{method:'POST',body:JSON.stringify({action:'submitRetailForm',...contact,interests:'Solar',notes:`Load:${totalW}W System:${quote.systemKW}kW Type:${sysType}`})}) } catch{}
    setSubmitted(true)
  }
  const wa = () => {
    const msg = encodeURIComponent(`Hi Reliance! Solar quote request:\nSystem: ${quote.systemKW}kW ${sysType}\nLoad: ${totalW}W\nCost: ${pkr(quote.costs.total)}\nMonthly saving: ${pkr(quote.savings.monthlySaving)}\n\nAppliances:\n${items.map(i=>`• ${i.qty}x ${i.name} (${i.watts}W × ${i.hours}hrs)`).join('\n')}`)
    window.open(`https://wa.me/923702578788?text=${msg}`,'_blank')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full text-sm font-medium mb-4"><Sun className="w-4 h-4"/> Solar Load Calculator</div>
          <h1 className="text-3xl md:text-5xl font-bold mb-3">How much solar do you need?</h1>
          <p className="text-amber-100 text-lg max-w-2xl mx-auto">Add your appliances and get an instant customised solar system quote.</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Step indicator */}
        <div className="flex items-center gap-2 justify-center mb-8">
          {[{n:1,label:'Select Appliances'},{n:2,label:'Preferences'},{n:3,label:'Your Quote'}].map((s,i)=>(
            <div key={s.n} className="flex items-center gap-2">
              <button onClick={()=>step>s.n&&setStep(s.n as 1|2|3)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${step===s.n?'bg-orange-500 text-white shadow-lg scale-105':step>s.n?'bg-green-500 text-white':'bg-white text-gray-400 border'}`}>
                {step>s.n?<CheckCircle className="w-4 h-4"/>:<span>{s.n}</span>}
                <span className="hidden sm:block">{s.label}</span>
              </button>
              {i<2&&<div className={`w-8 h-0.5 ${step>s.n+1?'bg-green-400':step>s.n?'bg-orange-300':'bg-gray-200'}`}/>}
            </div>
          ))}
        </div>

        {/* STEP 1 */}
        {step===1&&(
          <div className="grid lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3 space-y-3">
              <h2 className="text-xl font-bold text-gray-800">Select Your Appliances</h2>
              {CATEGORIES.map(cat=>{
                const apps = APPLIANCES.filter(a=>a.category===cat)
                return (
                  <div key={cat} className="bg-white rounded-2xl shadow-sm border border-orange-100 overflow-hidden">
                    <button onClick={()=>setOpenCat(openCat===cat?null:cat)} className="w-full flex items-center justify-between p-4 hover:bg-orange-50 transition-colors">
                      <span className="font-semibold text-gray-700">{cat}</span>
                      {openCat===cat?<ChevronUp className="w-4 h-4 text-gray-400"/>:<ChevronDown className="w-4 h-4 text-gray-400"/>}
                    </button>
                    {openCat===cat&&(
                      <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {apps.map(app=>(
                          <button key={app.id} onClick={()=>addItem(app)} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-orange-300 hover:bg-orange-50 transition-all text-left group">
                            <div><div className="text-sm font-medium text-gray-700 group-hover:text-orange-700">{app.name}</div><div className="text-xs text-gray-400">{app.watts}W</div></div>
                            <Plus className="w-4 h-4 text-gray-300 group-hover:text-orange-500"/>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
              <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-4">
                <h3 className="font-semibold text-gray-700 mb-3">Add Custom Appliance</h3>
                <div className="grid grid-cols-2 gap-2">
                  <input className="col-span-2 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400" placeholder="Appliance name" value={custom.name} onChange={e=>setCustom(p=>({...p,name:e.target.value}))}/>
                  <input className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400" placeholder="Watts" type="number" value={custom.watts} onChange={e=>setCustom(p=>({...p,watts:e.target.value}))}/>
                  <input className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400" placeholder="Qty" type="number" value={custom.qty} onChange={e=>setCustom(p=>({...p,qty:e.target.value}))}/>
                  <button onClick={addCustom} className="col-span-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl py-2 text-sm font-medium">Add Appliance</button>
                </div>
              </div>
            </div>
            <div className="lg:col-span-2">
              <div className="sticky top-4">
                <h2 className="text-xl font-bold text-gray-800 mb-3">Your Load</h2>
                <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-4 space-y-3 max-h-[500px] overflow-y-auto">
                  {!items.length&&<div className="text-center py-8 text-gray-400"><Zap className="w-10 h-10 mx-auto mb-2 opacity-30"/><p className="text-sm">Add appliances from the left</p></div>}
                  {items.map(item=>(
                    <div key={item.id} className="border border-gray-100 rounded-xl p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div><div className="text-sm font-medium text-gray-700">{item.name}</div><div className="text-xs text-gray-400">{item.watts}W each</div></div>
                        <button onClick={()=>removeItem(item.id)} className="text-red-300 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div><label className="text-gray-500 block mb-1">Qty</label><input type="number" min={1} value={item.qty} onChange={e=>updQty(item.id,parseInt(e.target.value)||1)} className="w-full border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-orange-400"/></div>
                        <div><label className="text-gray-500 block mb-1">Hours/day</label><input type="number" min={0.5} max={24} step={0.5} value={item.hours} onChange={e=>updHours(item.id,parseFloat(e.target.value)||1)} className="w-full border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-orange-400"/></div>
                      </div>
                      <div className="text-xs text-orange-600 mt-1 font-medium">{item.watts*item.qty}W × {item.hours}hrs = {(item.watts*item.qty*item.hours/1000).toFixed(2)} kWh/day</div>
                    </div>
                  ))}
                </div>
                {items.length>0&&(
                  <div className="mt-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-2xl p-4">
                    <div className="flex justify-between text-sm mb-1"><span>Total Load</span><span className="font-bold">{totalW}W</span></div>
                    <div className="flex justify-between text-sm"><span>Daily Usage</span><span className="font-bold">{dailyU.toFixed(1)} kWh</span></div>
                    <button onClick={()=>setStep(2)} className="w-full mt-3 bg-white text-orange-600 font-semibold rounded-xl py-2 hover:bg-orange-50 transition-colors">Next: Preferences →</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {step===2&&(
          <div className="max-w-2xl mx-auto space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 text-center">System Preferences</h2>
            <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-6">
              <h3 className="font-semibold text-gray-700 mb-4">System Type</h3>
              <div className="grid grid-cols-3 gap-3">
                {([{val:'on-grid',label:'On-Grid',icon:'⚡',desc:'Feed excess to grid. No battery.'},{val:'hybrid',label:'Hybrid',icon:'☀️',desc:'Battery backup + grid.'},{val:'off-grid',label:'Off-Grid',icon:'🔋',desc:'Fully independent.'}] as const).map(s=>(
                  <button key={s.val} onClick={()=>setSysType(s.val)} className={`p-4 rounded-xl border-2 text-center transition-all ${sysType===s.val?'border-orange-500 bg-orange-50':'border-gray-200 hover:border-orange-300'}`}>
                    <div className="text-2xl mb-1">{s.icon}</div>
                    <div className="font-semibold text-sm">{s.label}</div>
                    <div className="text-xs text-gray-500 mt-1">{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-6">
              <h3 className="font-semibold text-gray-700 mb-2">Peak Sun Hours</h3>
              <p className="text-xs text-gray-500 mb-4">Karachi/South: 7hrs | Punjab: 6hrs | Northern: 5hrs</p>
              <div className="flex items-center gap-4">
                <input type="range" min={4} max={9} step={0.5} value={peakHrs} onChange={e=>setPeakHrs(parseFloat(e.target.value))} className="flex-1 accent-orange-500"/>
                <div className="bg-orange-100 text-orange-700 font-bold px-4 py-2 rounded-xl min-w-[60px] text-center">{peakHrs}h</div>
              </div>
            </div>
            <div className="bg-gradient-to-r from-orange-100 to-amber-100 rounded-2xl p-5">
              <h3 className="font-semibold text-gray-700 mb-3">Load Summary</h3>
              <div className="grid grid-cols-3 gap-3 text-center">
                {[{v:totalW+'W',l:'Total Load'},{v:dailyU.toFixed(1),l:'kWh/day'},{v:(dailyU*30).toFixed(0),l:'kWh/month'}].map((x,i)=>(
                  <div key={i} className="bg-white rounded-xl p-3"><div className="text-2xl font-bold text-orange-600">{x.v}</div><div className="text-xs text-gray-500">{x.l}</div></div>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={()=>setStep(1)} className="flex-1 border border-gray-300 text-gray-600 rounded-xl py-3 font-medium hover:bg-gray-50">← Back</button>
              <button onClick={calc} disabled={loading} className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl py-3 font-semibold shadow-lg disabled:opacity-50">
                {loading?'Calculating...':'☀️ Generate Quote →'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {step===3&&quote&&(
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 text-white rounded-3xl p-8 text-center">
              <div className="text-6xl font-bold mb-1">{quote.systemKW} kW</div>
              <div className="text-amber-100 text-lg mb-4">Recommended {quote.type.charAt(0).toUpperCase()+quote.type.slice(1)} System</div>
              <div className="grid grid-cols-3 gap-4">
                {[{v:quote.panels,l:'Panels (545W)'},{v:quote.inverterKW+'kW',l:'Inverter'},{v:quote.batteryKWh||'—',l:quote.batteryKWh?'kWh Battery':'No Battery'}].map((x,i)=>(
                  <div key={i} className="bg-white/20 rounded-xl p-3"><div className="font-bold text-xl">{x.v}</div><div className="text-xs text-amber-100">{x.l}</div></div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-6">
              <h3 className="font-bold text-gray-800 mb-4 text-lg">Cost Breakdown</h3>
              <div className="space-y-3">
                {[
                  {label:`${quote.panels}× Solar Panels (545W)`,val:quote.costs.panels},
                  {label:`${quote.inverterKW}kW Inverter`,val:quote.costs.inverter},
                  ...(quote.costs.battery?[{label:`${quote.batteryKWh}kWh Battery`,val:quote.costs.battery}]:[]),
                  {label:'Installation & Wiring',val:quote.costs.installation},
                ].map((row,i)=>(
                  <div key={i} className="flex justify-between items-center py-2 border-b border-gray-50">
                    <span className="text-gray-600 text-sm">{row.label}</span>
                    <span className="font-semibold">{pkr(row.val)}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center py-3 bg-orange-50 rounded-xl px-3 mt-2">
                  <span className="font-bold text-gray-800">Total Investment</span>
                  <span className="font-bold text-2xl text-orange-600">{pkr(quote.costs.total)}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-6">
              <h3 className="font-bold text-gray-800 mb-4 text-lg flex items-center gap-2"><TrendingUp className="w-5 h-5 text-green-500"/> Savings Analysis</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[{l:'Units/Month',v:quote.savings.unitsPerMonth+' kWh'},{l:'Monthly Saving',v:pkr(quote.savings.monthlySaving)},{l:'Annual Saving',v:pkr(quote.savings.annualSaving)},{l:'Payback Period',v:quote.savings.paybackYears+' yrs'}].map((s,i)=>(
                  <div key={i} className="bg-green-50 rounded-xl p-4 text-center"><div className="font-bold text-green-700 text-lg">{s.v}</div><div className="text-xs text-gray-500 mt-1">{s.l}</div></div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-3">* Based on PKR 50/kWh average rate. Actual savings may vary.</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-blue-100 p-6">
              <h3 className="font-bold text-gray-800 mb-4 text-lg flex items-center gap-2"><Award className="w-5 h-5 text-blue-500"/> Installment Plans</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(quote.plans).map(([key,plan]: [string,any])=>(
                  <div key={key} className="border-2 border-blue-100 hover:border-blue-400 rounded-xl p-4 transition-all">
                    <div className="font-bold text-blue-700 capitalize mb-3">{key.replace('month',' Month')}</div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-gray-500">Total</span><span className="font-semibold">{pkr(plan.total)}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Advance</span><span className="font-semibold text-orange-600">{pkr(plan.advance)}</span></div>
                      <div className="flex justify-between border-t pt-2"><span className="text-gray-500">{plan.monthlyPayments}× Monthly</span><span className="font-bold text-lg text-blue-700">{pkr(plan.monthly)}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {!submitted?(
              <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-6">
                <h3 className="font-bold text-gray-800 mb-2">Get This Quote Delivered</h3>
                <p className="text-gray-500 text-sm mb-4">Our solar expert will call you within 2 hours.</p>
                <div className="grid md:grid-cols-3 gap-3">
                  <input className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400" placeholder="Your name *" value={contact.name} onChange={e=>setContact(p=>({...p,name:e.target.value}))}/>
                  <input className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400" placeholder="Phone number *" value={contact.phone} onChange={e=>setContact(p=>({...p,phone:e.target.value}))}/>
                  <input className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400" placeholder="Email (optional)" value={contact.email} onChange={e=>setContact(p=>({...p,email:e.target.value}))}/>
                </div>
                <div className="grid md:grid-cols-2 gap-3 mt-3">
                  <button onClick={submit} disabled={!contact.name||!contact.phone} className="bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl py-3 font-semibold disabled:opacity-50 hover:shadow-lg transition-all">📋 Request Detailed Quote</button>
                  <button onClick={wa} className="bg-green-500 hover:bg-green-600 text-white rounded-xl py-3 font-semibold transition-all">💬 WhatsApp This Quote</button>
                </div>
              </div>
            ):(
              <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3"/>
                <h3 className="font-bold text-green-800 text-lg">Quote Request Submitted!</h3>
                <p className="text-green-700 text-sm mt-1">Our solar expert will call you within 2 hours.</p>
                <button onClick={wa} className="mt-3 bg-green-500 text-white px-6 py-2 rounded-xl text-sm font-medium">Also WhatsApp Us</button>
              </div>
            )}
            <button onClick={()=>{setStep(1);setQuote(null);setSubmitted(false)}} className="w-full border border-gray-300 text-gray-500 rounded-xl py-3 hover:bg-gray-50 text-sm">← Start Over</button>
          </div>
        )}
      </div>
    </div>
  )
}
