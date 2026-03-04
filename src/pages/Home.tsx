import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Sun, Calculator, ShieldCheck, Truck, CreditCard, Headphones, ChevronRight, Zap, Star } from 'lucide-react'
import { getProducts, DEFAULT_CATEGORIES, type Product, fmtPKR } from '../lib/api'
import ProductCard from '../components/products/ProductCard'

const HERO_SLIDES = [
  { badge:'Summer Sale', title:'Beat the Heat\nThis Summer', subtitle:'Inverter ACs starting from PKR 96,140 · Easy installments available', cta:'Shop ACs', ctaHref:'/products?category=ac', bg:'from-blue-600 via-cyan-600 to-teal-500', emoji:'❄️' },
  { badge:'Go Solar', title:'Cut Your Electricity\nBill by 80%', subtitle:'Complete solar systems with inverter, panels & battery backup', cta:'Calculate My System', ctaHref:'/solar-calculator', bg:'from-amber-500 via-orange-500 to-yellow-500', emoji:'☀️' },
  { badge:'Easy Installments', title:'Buy Now\nPay Easy', subtitle:'2, 3, 6 or 12-month plans · No bank account needed', cta:'View Plans', ctaHref:'/installments', bg:'from-violet-600 via-purple-600 to-indigo-600', emoji:'💳' },
]
const BRANDS = [
  { name:'Haier', slug:'haier', color:'#e31837', desc:"World's #1 home appliance brand" },
  { name:'Dawlance', slug:'dawlance', color:'#003087', desc:"Pakistan's most trusted brand" },
  { name:'Crown', slug:'crown', color:'#1a1a2e', desc:'Premium solar solutions' },
  { name:'Westpoint', slug:'westpoint', color:'#2563eb', desc:'Quality kitchen & home appliances' },
]
const WHY_RELIANCE = [
  { icon:ShieldCheck, title:'Authentic Products', desc:'Every product 100% genuine with official warranty.', color:'blue' },
  { icon:CreditCard, title:'Easy Installments', desc:'2–12 month plans, no bank account required.', color:'green' },
  { icon:Truck, title:'Home Delivery', desc:'Fast delivery & professional installation service.', color:'orange' },
  { icon:Headphones, title:'After-Sale Support', desc:'Dedicated service team, follow-up & warranty claims.', color:'purple' },
]

export default function Home() {
  const [slide, setSlide] = useState(0)
  const [featured, setFeatured] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => { const t = setInterval(() => setSlide(s => (s+1)%HERO_SLIDES.length), 5000); return () => clearInterval(t) }, [])
  useEffect(() => { getProducts({ featured:'true', sort:'price_asc' }).then(d => { setFeatured(d.products.slice(0,8)); setLoading(false) }) }, [])
  const s = HERO_SLIDES[slide]
  return (
    <div className="min-h-screen bg-white">
      <section className={`relative overflow-hidden bg-gradient-to-br ${s.bg} text-white transition-all duration-700`}>
        <div className="absolute inset-0 opacity-10"><div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white translate-x-1/2 -translate-y-1/2" /><div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-white -translate-x-1/2 translate-y-1/2" /></div>
        <div className="relative max-w-7xl mx-auto px-4 py-20 md:py-28">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur px-3 py-1.5 rounded-full text-sm font-medium mb-5"><span className="text-lg">{s.emoji}</span> {s.badge}</div>
            <h1 className="text-4xl md:text-6xl font-black leading-tight mb-5 whitespace-pre-line">{s.title}</h1>
            <p className="text-lg text-white/80 mb-8 max-w-xl">{s.subtitle}</p>
            <div className="flex flex-wrap gap-3">
              <Link to={s.ctaHref} className="inline-flex items-center gap-2 bg-white text-gray-900 font-bold px-7 py-3.5 rounded-2xl hover:bg-gray-100 shadow-lg">{s.cta} <ArrowRight className="w-4 h-4" /></Link>
              <Link to="/products" className="inline-flex items-center gap-2 border border-white/40 text-white font-medium px-7 py-3.5 rounded-2xl hover:bg-white/10">Browse All</Link>
            </div>
          </div>
        </div>
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">{HERO_SLIDES.map((_,i) => <button key={i} onClick={() => setSlide(i)} className={`rounded-full transition-all ${i===slide?'w-6 h-2 bg-white':'w-2 h-2 bg-white/40'}`} />)}</div>
      </section>
      <section className="border-b bg-gray-50"><div className="max-w-7xl mx-auto px-4 py-5 overflow-x-auto"><div className="flex gap-3 min-w-max">{DEFAULT_CATEGORIES.map(cat => <Link key={cat.id} to={`/products?category=${cat.id}`} className="flex items-center gap-2 bg-white border border-gray-200 hover:border-orange-400 hover:bg-orange-50 text-gray-700 hover:text-orange-700 px-4 py-2.5 rounded-2xl text-sm font-medium transition-all whitespace-nowrap shadow-sm"><span>{cat.icon}</span> {cat.name}</Link>)}</div></div></section>
      <section className="max-w-7xl mx-auto px-4 py-14">
        <div className="flex items-center justify-between mb-8">
          <div><div className="flex items-center gap-2 text-orange-500 text-sm font-semibold mb-1"><Star className="w-4 h-4 fill-orange-500" /> Featured Products</div><h2 className="text-2xl md:text-3xl font-bold text-gray-900">Top Picks for You</h2></div>
          <Link to="/products?featured=true" className="hidden sm:flex items-center gap-1 text-orange-600 font-medium text-sm">View All <ChevronRight className="w-4 h-4" /></Link>
        </div>
        {loading ? <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">{Array.from({length:8}).map((_,i)=><div key={i} className="bg-gray-100 rounded-2xl h-72 animate-pulse"/>)}</div> : <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">{featured.map(p=><ProductCard key={p.id} product={p}/>)}</div>}
        <div className="text-center mt-8"><Link to="/products" className="inline-flex items-center gap-2 border-2 border-orange-500 text-orange-600 font-semibold px-8 py-3 rounded-2xl hover:bg-orange-500 hover:text-white transition-all">Browse All 406 Products <ArrowRight className="w-4 h-4" /></Link></div>
      </section>
      <section className="bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-400 mx-4 md:mx-8 rounded-3xl overflow-hidden my-4">
        <div className="max-w-5xl mx-auto px-6 py-12 md:py-16 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-white"><div className="flex items-center gap-2 text-amber-100 text-sm font-medium mb-3"><Sun className="w-4 h-4" /> Solar Solutions</div><h2 className="text-3xl md:text-4xl font-black mb-3">How much solar do you need?</h2><p className="text-amber-100 text-lg max-w-lg">Add your appliances and get an instant solar system recommendation with customised pricing.</p></div>
          <div className="flex flex-col gap-3 flex-shrink-0"><Link to="/solar-calculator" className="inline-flex items-center gap-2 bg-white text-orange-600 font-bold px-8 py-4 rounded-2xl hover:bg-orange-50 shadow-lg"><Calculator className="w-5 h-5" /> Solar Calculator</Link><Link to="/solar" className="inline-flex items-center gap-2 border border-white/50 text-white font-medium px-8 py-3 rounded-2xl hover:bg-white/10 justify-center">View Solar Products</Link></div>
        </div>
      </section>
      <section className="max-w-7xl mx-auto px-4 py-14">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-3xl p-8 md:p-12">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div><div className="text-blue-600 text-sm font-semibold mb-2 flex items-center gap-1"><CreditCard className="w-4 h-4" /> Flexible Installments</div><h2 className="text-3xl font-black text-gray-900 mb-4">Buy Now, Pay in Easy Instalments</h2><p className="text-gray-600 mb-6">Choose from 2, 3, 6, or 12-month plans. No bank account required.</p><Link to="/installments" className="inline-flex items-center gap-2 bg-blue-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-blue-700">Calculate Installments <ArrowRight className="w-4 h-4" /></Link></div>
            <div className="grid grid-cols-2 gap-4">{[{plan:'3 Month',advance:'45%',monthly:'Pay over 2 months',color:'green',popular:true},{plan:'6 Month',advance:'40%',monthly:'Pay over 5 months',color:'blue'},{plan:'12 Month',advance:'30%',monthly:'Pay over 11 months',color:'orange'},{plan:'2 Month',advance:'50%',monthly:'Pay over 1 month',color:'purple'}].map(p=><div key={p.plan} className={`bg-white rounded-2xl p-4 shadow-sm border-2 ${p.popular?'border-green-400':'border-transparent'} relative`}>{p.popular&&<div className="absolute -top-2.5 left-3 bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">Popular</div>}<div className="font-bold text-gray-800">{p.plan}</div><div className="text-2xl font-black text-blue-600 my-1">{p.advance}</div><div className="text-xs text-gray-400">advance</div><div className="text-xs text-gray-500 mt-1">{p.monthly}</div></div>)}</div>
          </div>
        </div>
      </section>
      <section className="max-w-7xl mx-auto px-4 pb-10"><h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Brands We Carry</h2><div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">{BRANDS.map(b=><Link key={b.slug} to={`/products?brand=${b.slug}`} className="group flex items-center gap-4 bg-white border border-gray-100 hover:border-orange-300 hover:shadow-md rounded-2xl p-5 transition-all"><div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-xl" style={{backgroundColor:b.color}}>{b.name[0]}</div><div><div className="font-bold text-gray-800 group-hover:text-orange-700">{b.name}</div><div className="text-xs text-gray-500">{b.desc}</div></div><ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-orange-500 ml-auto"/></Link>)}</div></section>
      <section className="bg-gray-50 py-14"><div className="max-w-7xl mx-auto px-4"><div className="text-center mb-10"><div className="text-orange-500 text-sm font-semibold mb-2 flex items-center gap-1 justify-center"><Zap className="w-4 h-4"/> Free Tools</div><h2 className="text-2xl md:text-3xl font-bold text-gray-900">Make Smarter Decisions</h2></div><div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">{[{icon:'🔢',title:'Solar Calculator',desc:'Find out exactly what solar system you need.',href:'/solar-calculator'},{icon:'💡',title:'Bill Savings Calc',desc:'See how much solar can reduce your electricity bill.',href:'/tools'},{icon:'📈',title:'Payback Calculator',desc:'Calculate when your solar investment pays back.',href:'/tools'},{icon:'⚡',title:'Net Metering Check',desc:"Check if you're eligible to sell power to the grid.",href:'/tools'}].map(t=><Link key={t.title} to={t.href} className="group bg-white rounded-2xl border border-gray-100 hover:border-orange-300 hover:shadow-md p-6 transition-all"><div className="text-3xl mb-3">{t.icon}</div><div className="font-bold text-gray-800 mb-1 group-hover:text-orange-700">{t.title}</div><div className="text-sm text-gray-500 mb-4">{t.desc}</div><div className="flex items-center gap-1 text-orange-600 text-sm font-medium">Try it free <ChevronRight className="w-3 h-3"/></div></Link>)}</div></div></section>
      <section className="max-w-7xl mx-auto px-4 py-14"><div className="text-center mb-10"><h2 className="text-2xl md:text-3xl font-bold text-gray-900">Why Choose Reliance?</h2></div><div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">{WHY_RELIANCE.map(item=><div key={item.title} className="text-center p-6"><div className={`w-14 h-14 bg-${item.color}-100 rounded-2xl flex items-center justify-center mx-auto mb-4`}><item.icon className={`w-7 h-7 text-${item.color}-600`}/></div><h3 className="font-bold text-gray-800 mb-2">{item.title}</h3><p className="text-sm text-gray-500">{item.desc}</p></div>)}</div></section>
      <section className="bg-gray-900 text-white py-16 px-4"><div className="max-w-3xl mx-auto text-center"><h2 className="text-3xl font-black mb-4">Ready to shop?</h2><p className="text-gray-400 mb-8 text-lg">Browse 406 products from Haier, Dawlance, Crown & Westpoint with easy installments.</p><div className="flex flex-col sm:flex-row gap-4 justify-center"><Link to="/products" className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-4 rounded-2xl">Shop All Products</Link><a href="https://wa.me/923702578788" className="bg-green-600 hover:bg-green-700 text-white font-bold px-8 py-4 rounded-2xl flex items-center gap-2 justify-center">💬 WhatsApp Us</a></div></div></section>
    </div>
  )
}
