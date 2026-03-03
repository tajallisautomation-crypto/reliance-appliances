import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calculator, MessageCircle, Shield, CheckCircle, Phone, ChevronRight } from 'lucide-react';
import { fetchProducts, CATEGORIES, formatPrice, slugifyCategory } from '@/lib/api';
import type { Product } from '@/lib/types';
import SEO from '@/components/ui/SEO';
import { waInstallment, waSales } from '@/lib/whatsapp';
import { calcAllPlans, type PlanKey } from '@/lib/plans';

export default function Installments() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cat, setCat] = useState('');
  const [calcPrice, setCalcPrice] = useState('');
  useEffect(() => { fetchProducts().then(setProducts); }, []);

  const price = parseFloat(calcPrice.replace(/,/g, '')) || 0;
  const calcResults = price > 0 ? calcAllPlans(price) : null;

  const filtered = cat ? products.filter(p => slugifyCategory(p.category) === cat) : products;

  return (
    <div>
      <SEO path="/installments" title="Easy Installment Plans — 2 to 12 Months"
        description="Buy premium appliances on easy installments in Karachi. 2, 3, 6 and 12 month plans. Transparent pricing, no hidden charges."
        keywords="appliance installment Karachi, aqsaat, AC fridge TV installment Pakistan, easy monthly payments" />

      {/* Hero */}
      <div className="bg-gradient-to-br from-brand-700 to-brand-900 text-white py-16 px-4 text-center">
        <h1 className="text-4xl md:text-5xl font-black mb-3">Asaan Aqsaat</h1>
        <p className="text-white/70 text-lg mb-6">2, 3, 6 aur 12 mahine ke plans — transparent pricing, koi hidden charges nahi</p>
        <div className="flex flex-wrap justify-center gap-3 text-sm">
          {[['✅','No Hidden Charges'],['🚚','Free Delivery'],['🛡️','Full Warranty'],['📞','Dedicated Support'],['⚡','Same-Day Delivery']].map(([i,t])=>(
            <div key={String(t)} className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full text-xs font-medium">
              <span>{i}</span><span>{t}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* Plan cards — customer-facing only: months + features */}
        <h2 className="section-title text-center mb-2">Choose Your Plan</h2>
        <p className="section-sub text-center mb-8">All plans include full warranty, free delivery and installation support</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-14">
          {([
            { key:'2m'  as PlanKey, label:'2 Month',  popular:false, highlight:'Fastest pay-off',  color:'border-gray-200' },
            { key:'3m'  as PlanKey, label:'3 Month',  popular:false, highlight:'Balanced choice',  color:'border-gray-200' },
            { key:'6m'  as PlanKey, label:'6 Month',  popular:false, highlight:'Manageable spread', color:'border-gray-200' },
            { key:'12m' as PlanKey, label:'12 Month', popular:true,  highlight:'Most popular',      color:'border-brand-500' },
          ] as const).map(p => (
            <div key={p.key} className={`rounded-apple-xl p-6 border-2 bg-white ${p.color} ${p.popular ? 'shadow-blue' : 'shadow-apple'} relative`}>
              {p.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-brand-500 text-white text-xs font-bold rounded-full whitespace-nowrap">
                  ⭐ Most Popular
                </div>
              )}
              <h3 className="text-2xl font-black text-gray-900 mt-2 mb-1">{p.label}</h3>
              <p className="text-xs font-semibold text-brand-500 mb-4">{p.highlight}</p>
              <ul className="space-y-2 mb-6">
                {['Small advance at delivery','Equal monthly payments','No processing fee','No prepayment penalty','Full product warranty'].map(f => (
                  <li key={f} className="flex items-center gap-2 text-xs text-gray-600">
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />{f}
                  </li>
                ))}
              </ul>
              <Link to="/products"
                className={`block text-center py-2.5 px-4 rounded-full text-sm font-bold transition-all ${p.popular ? 'bg-brand-500 text-white hover:bg-brand-600' : 'bg-brand-50 text-brand-600 hover:bg-brand-100'}`}>
                Shop on {p.label}
              </Link>
            </div>
          ))}
        </div>

        {/* How it works */}
        <div className="bg-surface-secondary rounded-apple-xl p-8 mb-14">
          <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">How It Works</h2>
          <p className="text-center text-gray-500 text-sm mb-8">4 simple steps from browsing to delivery</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { n:'1', t:'Pick Your Product', d:'Browse our full range and choose the product that fits your needs.' },
              { n:'2', t:'Choose a Plan',     d:'Select 2, 3, 6 or 12 months — we show you exact amounts upfront.' },
              { n:'3', t:'Pay & Confirm',     d:'Small advance at delivery. Our team calls to confirm everything.' },
              { n:'4', t:'Monthly Payments',  d:'Simple equal monthly payments. No surprises, no hidden charges.' },
            ].map(s => (
              <div key={s.n} className="text-center">
                <div className="w-12 h-12 rounded-full bg-brand-500 text-white font-black text-xl flex items-center justify-center mx-auto mb-3">{s.n}</div>
                <h3 className="font-bold text-gray-900 text-sm mb-1">{s.t}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Installment Calculator — shows ONLY what customer pays */}
        <div className="max-w-2xl mx-auto mb-14">
          <div className="bg-white rounded-apple-xl shadow-apple p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
                <Calculator className="h-5 w-5 text-brand-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Installment Calculator</h2>
                <p className="text-sm text-gray-500">Enter any product price to see your payment breakdown</p>
              </div>
            </div>
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">Product Price (PKR)</label>
              <input type="text" value={calcPrice}
                onChange={e => setCalcPrice(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="e.g. 150000" className="input-field text-lg font-semibold" />
            </div>
            {calcResults && (
              <div className="space-y-3 animate-fade-in">
                {(Object.entries(calcResults) as [PlanKey, typeof calcResults['2m']][]).map(([key, r]) => (
                  <div key={key} className="bg-surface-secondary rounded-apple p-4 border border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-bold text-gray-900">{key === '2m' ? '2' : key === '3m' ? '3' : key === '6m' ? '6' : '12'} Month Plan</span>
                      <span className="text-xs text-gray-500">Total: PKR {formatPrice(r.total)}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white rounded-lg p-3">
                        <p className="text-xs text-gray-400 mb-0.5">At Delivery</p>
                        <p className="font-black text-brand-600 text-xl">PKR {formatPrice(r.advance)}</p>
                      </div>
                      {r.monthly > 0 && (
                        <div className="bg-white rounded-lg p-3">
                          <p className="text-xs text-gray-400 mb-0.5">Monthly × {r.months - 1}</p>
                          <p className="font-black text-gray-900 text-xl">PKR {formatPrice(r.monthly)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 rounded-apple p-3 border border-amber-100">
                  <Shield className="h-4 w-4 flex-shrink-0 mt-0.5 text-amber-500" />
                  Amounts are indicative. Final figures confirmed at time of order. No processing fees.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Products table — monthly payment only, no advance % */}
        <div className="flex items-end justify-between mb-4 flex-wrap gap-3">
          <div>
            <h2 className="section-title">All Products on Installment</h2>
            <p className="text-gray-500 text-sm mt-1">Click any product for exact payment breakdown</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          <button onClick={() => setCat('')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${!cat ? 'bg-brand-500 text-white border-brand-500' : 'bg-white border-gray-200 text-gray-600'}`}>
            All
          </button>
          {CATEGORIES.map(c => (
            <button key={c.slug} onClick={() => setCat(c.slug)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${cat===c.slug ? 'bg-brand-500 text-white border-brand-500' : 'bg-white border-gray-200 text-gray-600'}`}>
              {c.icon} {c.name}
            </button>
          ))}
        </div>
        <div className="overflow-x-auto rounded-apple-xl border border-gray-100 shadow-apple">
          <table className="w-full min-w-[600px]">
            <thead className="bg-surface-secondary">
              <tr>
                {['Product','Cash Price','3M Monthly','6M Monthly','12M Monthly',''].map(h => (
                  <th key={h} className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider last:text-right">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-surface-secondary transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <img src={p.thumbnail} alt={p.model} className="w-10 h-10 rounded-lg object-cover flex-shrink-0 bg-gray-50" />
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{p.brand} {p.model}</p>
                        <p className="text-xs text-gray-400">{p.category}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 font-bold text-gray-900 text-sm">PKR {formatPrice(p.price.cash_floor)}</td>
                  <td className="p-4 text-sm text-brand-600 font-semibold">PKR {formatPrice(p.installments['3m'].monthly)}<span className="text-gray-400 font-normal">/mo</span></td>
                  <td className="p-4 text-sm text-brand-600 font-semibold">PKR {formatPrice(p.installments['6m'].monthly)}<span className="text-gray-400 font-normal">/mo</span></td>
                  <td className="p-4 text-sm text-brand-600 font-semibold">PKR {formatPrice(p.installments['12m'].monthly)}<span className="text-gray-400 font-normal">/mo</span></td>
                  <td className="p-4 text-right">
                    <Link to={`/products/${p.slug}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-600 hover:bg-brand-100 transition-colors mr-1">
                      Details <ChevronRight className="h-3 w-3" />
                    </Link>
                    <a href={waInstallment(p.brand, p.model, '12 Month')} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold text-white"
                      style={{ background: '#25d366' }}>
                      <MessageCircle className="h-3 w-3" /> Quote
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* CTA */}
        <div className="mt-14 rounded-apple-xl p-8 text-center text-white"
          style={{ background: 'linear-gradient(135deg, #0070f3 0%, #003585 100%)' }}>
          <h2 className="text-2xl font-bold mb-2">Not sure which plan is right for you?</h2>
          <p className="text-white/70 mb-6">Our team gives free, honest advice — no pressure, no obligation.</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <a href={waSales('Salam! Installment plan ke baare mein guide karein.')} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-white" style={{ background: '#25d366' }}>
              <MessageCircle className="h-5 w-5" /> Chat on WhatsApp
            </a>
            <a href="tel:+923702578788" className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold border border-white/30 text-white hover:bg-white/10 transition-all">
              <Phone className="h-5 w-5" /> Call Us
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
