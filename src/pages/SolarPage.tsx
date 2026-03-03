import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sun, MessageCircle, CheckCircle, Phone, Zap, TrendingDown, Shield, Award, ChevronDown, ChevronUp } from 'lucide-react';
import SEO from '@/components/ui/SEO';
import { waSales } from '@/lib/whatsapp';

const PACKAGES = [
  { name:'3kW Home Starter', price:'450,000', monthly:'37,500', rooms:'1–3 rooms', backup:'4–6 hrs', savings:'40–50%', hot:false, desc:'Ideal for small households. Covers fans, lights, 1 AC.' },
  { name:'5kW Family System', price:'720,000', monthly:'60,000', rooms:'3–5 rooms', backup:'6–8 hrs', savings:'50–65%', hot:false, desc:'Best for mid-size homes. Runs 2 ACs, fridge, full lighting.' },
  { name:'10kW Premium Home', price:'1,350,000', monthly:'112,500', rooms:'5+ rooms', backup:'8–12 hrs', savings:'65–80%', hot:true, desc:'Full-house coverage with battery backup. Most popular for DHA/Clifton.' },
  { name:'20kW Commercial',   price:'2,500,000', monthly:'Custom',  rooms:'Office/commercial', backup:'12+ hrs', savings:'70–85%', hot:false, desc:'Office parks, showrooms, retail. Net metering maximised.' },
];

const BRANDS = [
  { name:'Jinko Solar',      type:'Panels',    warranty:'25yr', icon:'☀️' },
  { name:'Canadian Solar',   type:'Panels',    warranty:'25yr', icon:'🍁' },
  { name:'Huawei FusionSolar',type:'Inverters', warranty:'10yr', icon:'⚡' },
  { name:'Growatt',          type:'Inverters', warranty:'10yr', icon:'🔋' },
  { name:'Pylontech',        type:'Batteries', warranty:'10yr', icon:'🔌' },
  { name:'Longi Solar',      type:'Panels',    warranty:'25yr', icon:'🌟' },
];

const FAQS = [
  { q:'How long does a solar installation take?',
    a:'A standard residential installation takes 1–2 days. Commercial systems 3–5 days. Our team handles all permits, DISCO approvals, and NEPRA net metering applications.' },
  { q:'Can I get solar on installments?',
    a:'Yes — solar systems qualify for our 6-month and 12-month installment plans. Contact us for a custom payment breakdown on your chosen package.' },
  { q:'What happens on cloudy days or at night?',
    a:'Hybrid systems with battery backup continue supplying power. Grid-tie systems use the grid at night and export surplus during the day through net metering, reducing your bill to near zero.' },
  { q:'How much can I actually save on my electricity bill?',
    a:'Most of our residential customers see 50–80% reduction. A 10kW system in a well-oriented Karachi roof can generate 1,200–1,400 kWh per month — enough to offset the average family bill entirely.' },
  { q:'Do you handle NEPRA/DISCO net metering approval?',
    a:'Yes — we handle the complete net metering application with your local DISCO (KESC/K-Electric) from survey to approval. Most approvals complete within 4–6 weeks.' },
];

export default function SolarPage() {
  const [openFaq, setOpenFaq] = useState<number|null>(null);
  const [calcBill, setCalcBill] = useState('');

  const bill = parseFloat(calcBill) || 0;
  const estSystem = bill > 0 ? (bill >= 25000 ? '20kW' : bill >= 12000 ? '10kW' : bill >= 6000 ? '5kW' : '3kW') : null;
  const estSavings = bill > 0 ? Math.round(bill * 0.70) : 0;

  return (
    <div>
      <SEO path="/products/solar-solutions" title="Solar Energy Solutions Karachi — Complete Turnkey Systems"
        description="Complete solar panel systems in Karachi. 3kW–20kW grid-tie, hybrid & off-grid. Jinko, Canadian Solar, Huawei. Easy installments. NEPRA net metering support."
        keywords="solar panels Karachi, solar system price Pakistan, net metering KESC, hybrid solar inverter Karachi" />

      {/* Hero */}
      <section className="relative py-24 px-4 text-center text-white overflow-hidden"
        style={{ background:'linear-gradient(160deg,#0a2e1a,#1a6b3a)' }}>
        <div className="absolute inset-0 opacity-20"
          style={{ background:'radial-gradient(ellipse at 60% 40%,#f5c842 0%,transparent 55%)' }} />
        <div className="relative max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-white/80 text-xs font-medium mb-6">
            <Sun className="h-3.5 w-3.5 text-yellow-400" /> 400+ Solar Systems Installed in Karachi
          </div>
          <h1 className="text-4xl md:text-6xl font-black mb-4">
            Solar <span className="text-gradient-gold">Solutions</span>
          </h1>
          <p className="text-white/70 text-xl mb-3">Bijli ki azaadi — ghar se leke office tak</p>
          <p className="text-white/50 text-sm mb-10">Cut your electricity bill by 50–80%. Permanent. Guaranteed.</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <a href={waSales('Salam! Solar system ke baare mein free consultation chahiye.')} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-bold text-white text-base"
              style={{ background:'#25d366' }}>
              <MessageCircle className="h-5 w-5" /> Free Solar Consultation
            </a>
            <a href="tel:+923702578788"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold border border-white/20 text-white text-sm hover:bg-white/10 transition-all">
              <Phone className="h-4 w-4" /> Call Us
            </a>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white border-b border-gray-100 py-6">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          {[
            { v:'400+', l:'Installations Done' },
            { v:'50–80%', l:'Average Bill Reduction' },
            { v:'25yr',  l:'Panel Warranty' },
            { v:'4–6wk', l:'Full Install & Net Metering' },
          ].map(s => (
            <div key={s.l} className="py-3">
              <p className="text-2xl font-black text-brand-600">{s.v}</p>
              <p className="text-xs text-gray-500 mt-1">{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Bill calculator */}
      <section className="max-w-2xl mx-auto px-4 py-14">
        <div className="bg-white rounded-apple-xl shadow-apple p-8 border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <Zap className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Quick Savings Estimator</h2>
              <p className="text-sm text-gray-500">See how much solar can save you</p>
            </div>
          </div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Your Monthly Electricity Bill (PKR)</label>
          <input type="text" value={calcBill} onChange={e => setCalcBill(e.target.value.replace(/\D/g,''))}
            placeholder="e.g. 15000" className="input-field text-lg font-semibold mb-4" />
          {bill > 0 && (
            <div className="space-y-3 animate-fade-in">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-emerald-50 rounded-apple p-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">Recommended</p>
                  <p className="font-black text-emerald-700">{estSystem}</p>
                </div>
                <div className="bg-brand-50 rounded-apple p-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">Monthly Savings</p>
                  <p className="font-black text-brand-600">PKR {estSavings.toLocaleString()}</p>
                </div>
                <div className="bg-amber-50 rounded-apple p-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">Annual Savings</p>
                  <p className="font-black text-amber-600">PKR {(estSavings*12).toLocaleString()}</p>
                </div>
              </div>
              <a href={waSales(`Salam! Mera monthly bill PKR ${calcBill} hai. ${estSystem} system ke baare mein batain.`)}
                target="_blank" rel="noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-apple-xl font-bold text-white text-sm"
                style={{ background:'#25d366' }}>
                <MessageCircle className="h-4 w-4" /> Get Exact Quote for {estSystem} System
              </a>
            </div>
          )}
        </div>
      </section>

      {/* Packages */}
      <section className="max-w-6xl mx-auto px-4 pb-14">
        <h2 className="section-title text-center mb-2">System Packages</h2>
        <p className="section-sub text-center mb-10">All prices include panels, inverter, mounting, cabling and installation</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {PACKAGES.map(p => (
            <div key={p.name}
              className={`rounded-apple-xl border-2 overflow-hidden relative ${p.hot ? 'border-brand-500 bg-brand-500 text-white' : 'border-gray-100 bg-white shadow-apple'}`}>
              {p.hot && <div className="text-xs font-bold text-white/70 uppercase tracking-wide px-6 pt-5 pb-0">⭐ Most Popular</div>}
              <div className="p-6">
                <h3 className={`font-black text-lg mb-1 ${p.hot?'text-white':'text-gray-900'}`}>{p.name}</h3>
                <p className={`text-xs mb-4 leading-relaxed ${p.hot?'text-white/70':'text-gray-500'}`}>{p.desc}</p>
                <p className={`text-3xl font-black mb-1 ${p.hot?'text-white':'text-brand-600'}`}>PKR {p.price}</p>
                <p className={`text-xs mb-5 ${p.hot?'text-white/50':'text-gray-400'}`}>or ~PKR {p.monthly}/mo on 12M plan</p>
                <div className="space-y-2 mb-5">
                  {[
                    ['🏠', p.rooms],
                    ['🔋', p.backup + ' battery backup'],
                    ['💰', p.savings + ' bill reduction'],
                  ].map(([icon, val]) => (
                    <div key={String(val)} className={`flex items-center gap-2 text-xs ${p.hot?'text-white/80':'text-gray-600'}`}>
                      <span>{icon}</span><span>{val}</span>
                    </div>
                  ))}
                </div>
                <a href={waSales(`Salam! ${p.name} solar package mein interested hoon.`)} target="_blank" rel="noreferrer"
                  className={`block text-center py-2.5 rounded-full text-sm font-bold transition-all
                    ${p.hot ? 'bg-white text-brand-600 hover:bg-gray-50' : 'bg-brand-500 text-white hover:bg-brand-600'}`}>
                  Get Quote
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Brands */}
      <section className="bg-surface-secondary py-14 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="section-title text-center mb-2">Brands We Install</h2>
          <p className="section-sub text-center mb-10">Only Tier-1 manufacturers — certified, warranted, genuine</p>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            {BRANDS.map(b => (
              <div key={b.name} className="bg-white rounded-apple-xl p-4 text-center shadow-apple">
                <div className="text-3xl mb-2">{b.icon}</div>
                <p className="text-xs font-bold text-gray-900 leading-tight mb-1">{b.name}</p>
                <p className="text-[10px] text-gray-400">{b.type}</p>
                <p className="text-[10px] text-emerald-600 font-semibold">{b.warranty} warranty</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why choose us */}
      <section className="max-w-5xl mx-auto px-4 py-14">
        <h2 className="section-title text-center mb-10">Why Reliance for Solar?</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            { Icon:CheckCircle, t:'End-to-End Turnkey',      d:'Survey, supply, install, NEPRA approval, net metering — one company, full accountability.' },
            { Icon:Shield,      t:'25-Year Panel Warranty',   d:'We only install Tier-1 panels with manufacturer-backed performance guarantees.' },
            { Icon:TrendingDown,t:'Proven ROI',               d:'400+ Karachi installations. Average payback period 3–4 years. 20+ year asset life.' },
            { Icon:Award,       t:'NEPRA Authorised',         d:'We handle all KESC/K-Electric net metering applications and approvals for you.' },
            { Icon:Zap,         t:'Fast Installation',        d:'Residential systems installed in 1–2 days. No mess, no extended disruption.' },
            { Icon:Sun,         t:'Ongoing Support',          d:'Post-installation monitoring, cleaning service and annual performance checks.' },
          ].map(i => (
            <div key={i.t} className="bg-white rounded-apple-xl shadow-apple p-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                <i.Icon className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm mb-1">{i.t}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{i.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 pb-16">
        <h2 className="section-title text-center mb-10">Solar FAQs</h2>
        <div className="space-y-3">
          {FAQS.map((f, i) => (
            <div key={i} className="bg-white rounded-apple-xl shadow-apple overflow-hidden border border-gray-50">
              <button onClick={() => setOpenFaq(openFaq===i ? null : i)}
                className="w-full flex items-center justify-between p-5 text-left gap-4 hover:bg-surface-secondary transition-colors">
                <span className="font-semibold text-gray-900 text-sm">{f.q}</span>
                {openFaq===i ? <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />}
              </button>
              {openFaq===i && (
                <div className="px-5 pb-5 pt-3 border-t border-gray-50 text-sm text-gray-600 leading-relaxed animate-fade-in">{f.a}</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-4 pb-16">
        <div className="rounded-apple-xl p-8 md:p-12 text-white text-center"
          style={{ background:'linear-gradient(135deg,#0a2e1a,#1a6b3a)' }}>
          <Sun className="h-10 w-10 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-2xl md:text-3xl font-black mb-3">Ready to Go Solar?</h2>
          <p className="text-white/70 mb-8">Free site survey. No commitment. Honest advice on the right system size.</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <a href={waSales('Salam! Solar system ke liye free site survey chahiye.')} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-bold text-white" style={{ background:'#25d366' }}>
              <MessageCircle className="h-5 w-5" /> Book Free Survey
            </a>
            <Link to="/products/category/solar-solutions"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-bold border border-white/25 text-white hover:bg-white/10 transition-all">
              Browse Solar Products
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
