import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Sun, ArrowRight, Calculator } from 'lucide-react'
import { getProducts, type Product } from '../lib/api'
import ProductCard from '../components/products/ProductCard'

const SOLAR_BENEFITS = [
  { icon:'☀️', title:'25 Year Performance Warranty', desc:'Panels guaranteed at 80% output for 25 years.' },
  { icon:'💰', title:'80% Bill Reduction', desc:'Average customer saves PKR 8,000–25,000/month.' },
  { icon:'🔋', title:'Backup Power', desc:'Hybrid systems keep your home running during outages.' },
  { icon:'🌿', title:'Net Metering', desc:'Sell excess power back to the grid and earn credits.' },
]

export default function SolarPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading]   = useState(true)
  useEffect(() => { getProducts({ category: 'solar' }).then(d => { setProducts(d.products); setLoading(false) }) }, [])
  return (
    <div className="min-h-screen bg-white">
      <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-yellow-400 text-white py-20 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-black mb-4">Power Your Life with Solar</h1>
          <p className="text-xl text-amber-100 max-w-2xl mx-auto mb-8">Complete solar systems. Cut your electricity bill by up to 80%.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center flex-wrap">
            <Link to="/solar-calculator" className="inline-flex items-center gap-2 bg-white text-orange-600 font-bold px-8 py-4 rounded-2xl hover:bg-orange-50 shadow-lg">
              <Calculator className="w-5 h-5" /> Grid-Tie Calculator
            </Link>
            <Link to="/solar/off-grid" className="inline-flex items-center gap-2 bg-black/30 border border-white/40 text-white font-bold px-8 py-4 rounded-2xl hover:bg-black/50 shadow-lg">
              🔋 Off-Grid Independence
            </Link>
            <a href="#products" className="inline-flex items-center gap-2 border border-white/50 text-white font-medium px-8 py-4 rounded-2xl hover:bg-white/10">
              Browse Products <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-4 py-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {SOLAR_BENEFITS.map(b => (
          <div key={b.title} className="text-center p-5">
            <div className="text-4xl mb-3">{b.icon}</div>
            <div className="font-bold text-gray-800 mb-1">{b.title}</div>
            <div className="text-sm text-gray-500">{b.desc}</div>
          </div>
        ))}
      </div>
      <div className="max-w-5xl mx-auto px-4 mb-8 grid sm:grid-cols-2 gap-4">
        <div className="bg-gradient-to-r from-orange-100 to-amber-100 rounded-3xl p-6 flex flex-col justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-gray-900 mb-1">Grid-Tie / Hybrid</h2>
            <p className="text-gray-600 text-sm">Calculate your system size, add appliances, get a quote with net-metering savings.</p>
          </div>
          <Link to="/solar-calculator" className="self-start bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-3 rounded-2xl inline-flex items-center gap-2 text-sm">
            <Calculator className="w-4 h-4" /> Try Calculator
          </Link>
        </div>
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-3xl p-6 flex flex-col justify-between gap-4">
          <div>
            <div className="text-xs font-medium text-orange-400 uppercase tracking-wider mb-1">New</div>
            <h2 className="text-xl font-black mb-1">Off-Grid Independence</h2>
            <p className="text-gray-400 text-sm">Battery-backed power. No KESC bill. No load shedding. Enter your bill — we size your system.</p>
          </div>
          <Link to="/solar/off-grid" className="self-start bg-orange-500 hover:bg-orange-400 text-white font-bold px-6 py-3 rounded-2xl inline-flex items-center gap-2 text-sm">
            🔋 Go Off-Grid
          </Link>
        </div>
      </div>
      <div id="products" className="max-w-7xl mx-auto px-4 pb-14">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Solar Products</h2>
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">{Array.from({length:8}).map((_,i)=><div key={i} className="bg-gray-100 rounded-2xl h-72 animate-pulse"/>)}</div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Sun className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Solar products coming soon.</p>
            <a href="https://wa.me/923702578788" className="mt-4 inline-block bg-green-500 text-white px-6 py-2.5 rounded-xl font-medium">WhatsApp for Solar Quote</a>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">{products.map(p=><ProductCard key={p.id} product={p}/>)}</div>
        )}
      </div>
    </div>
  )
}
