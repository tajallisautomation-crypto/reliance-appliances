import { useState } from 'react'
import { Calculator, Info, CheckCircle, Phone } from 'lucide-react'
import { calcAllPlans, fmtPKR, roundTo100 } from '../lib/api'

const PLAN_DETAILS = [
  { key:'2month',  markup:'10%', advance:'50%', note:'Pay 50% upfront, then 1 monthly payment.' },
  { key:'3month',  markup:'15%', advance:'45%', note:'Pay 45% upfront, then 2 monthly payments.' },
  { key:'6month',  markup:'25%', advance:'40%', note:'Pay 40% upfront, then 5 monthly payments.' },
  { key:'12month', markup:'40%', advance:'30%', note:'Pay 30% upfront, then 11 monthly payments.' },
]

export default function InstallmentsPage() {
  const [price, setPrice] = useState('')
  const [result, setResult] = useState<any>(null)
  const calculate = () => { const p = parseFloat(price); if (!p || p <= 0) return; setResult({ price: roundTo100(p), plans: calcAllPlans(p) }) }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl md:text-5xl font-bold mb-3">Buy Now, Pay Easy</h1>
          <p className="text-blue-100 text-lg max-w-2xl mx-auto">Choose from 2, 3, 6, or 12-month plans. No bank required.</p>
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-4 py-12 space-y-10">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Our Installment Plans</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PLAN_DETAILS.map(p => (
              <div key={p.key} className={`relative bg-white rounded-2xl border-2 p-5 shadow-sm ${p.key==='3month' ? 'border-green-400 shadow-green-100' : 'border-gray-100'}`}>
                {p.key==='3month' && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-white text-xs font-bold px-3 py-0.5 rounded-full">POPULAR</div>}
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-800 mb-1">{p.key.replace('month',' mo')}</div>
                  <div className="space-y-2 text-sm mt-3">
                    <div className="flex justify-between items-center bg-gray-50 rounded-lg px-3 py-1.5"><span className="text-gray-500">Markup</span><span className="font-bold">+{p.markup}</span></div>
                    <div className="flex justify-between items-center bg-blue-50 rounded-lg px-3 py-1.5"><span className="text-gray-500">Advance</span><span className="font-bold text-blue-700">{p.advance}</span></div>
                  </div>
                  <p className="text-xs text-gray-400 mt-3">{p.note}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-3xl shadow-sm border p-6 md:p-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2"><Calculator className="w-6 h-6 text-blue-500" /> Installment Calculator</h2>
          <div className="flex gap-3 max-w-md">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">PKR</span>
              <input type="number" value={price} onChange={e => setPrice(e.target.value)} onKeyDown={e => e.key==='Enter' && calculate()} placeholder="0"
                className="w-full border-2 border-gray-200 rounded-xl pl-12 pr-4 py-3 text-lg font-semibold focus:outline-none focus:border-blue-400" />
            </div>
            <button onClick={calculate} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold">Calculate</button>
          </div>
          {result && (
            <div className="mt-8 space-y-4">
              <div className="text-sm text-gray-500 mb-2">Results for: <strong>{fmtPKR(result.price)}</strong></div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(result.plans).map(([key, plan]: [string, any]) => (
                  <div key={key} className={`rounded-2xl border-2 p-5 ${key==='3month' ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                    <div className="font-bold text-lg text-gray-800 mb-4">{key.replace('month',' Month')} Plan</div>
                    <div className="space-y-3">
                      <div className="bg-white rounded-xl p-3"><div className="text-xs text-gray-500 mb-0.5">Total</div><div className="font-bold">{fmtPKR(plan.total)}</div></div>
                      <div className="bg-orange-50 rounded-xl p-3 border border-orange-200"><div className="text-xs text-orange-600 mb-0.5">Advance ({Math.round(plan.advancePct*100)}%)</div><div className="font-bold text-xl text-orange-700">{fmtPKR(plan.advance)}</div></div>
                      <div className="bg-blue-50 rounded-xl p-3 border border-blue-200"><div className="text-xs text-blue-600 mb-0.5">{plan.monthlyPayments}× Monthly</div><div className="font-bold text-xl text-blue-700">{fmtPKR(plan.monthly)}</div></div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-start gap-2 bg-blue-50 rounded-xl p-3 text-sm text-blue-700">
                <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>All amounts rounded to nearest PKR 100. 3-month advance is 45%. Approval subject to verification.</span>
              </div>
            </div>
          )}
        </div>
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-8 text-white text-center">
          <h2 className="text-2xl font-bold mb-2">Ready to buy on installments?</h2>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
            <a href="https://wa.me/923702578788" className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-xl font-semibold">💬 WhatsApp Us</a>
            <a href="tel:+923702578788" className="bg-white text-blue-600 px-8 py-3 rounded-xl font-semibold flex items-center gap-2 justify-center"><Phone className="w-4 h-4" /> Call +92 370 2578788</a>
          </div>
        </div>
      </div>
    </div>
  )
}
