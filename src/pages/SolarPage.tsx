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
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/solar-calculator" className="inline-flex items-center gap-2 bg-white text-orange-600 font-bold px-8 py-4 rounded-2xl hover:bg-orange-50 shadow-lg">
              <Calculator className="w-5 h-5" /> Calculate My System
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
      <div className="bg-gradient-to-r from-orange-100 to-amber-100 mx-4 md:mx-8 rounded-3xl p-8 mb-12 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Not sure what system you need?</h2>
          <p className="text-gray-600">Use our Solar Load Calculator for an instant recommendation with pricing.</p>
        </div>
        <Link to="/solar-calculator" className="flex-shrink-0 bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-4 rounded-2xl inline-flex items-center gap-2">
          <Calculator className="w-5 h-5" /> Try Calculator
        </Link>
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
