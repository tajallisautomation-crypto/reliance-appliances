import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Truck, Award, Phone, MessageCircle, ChevronRight, Sun, Wrench, RotateCcw, Building } from 'lucide-react';
import { fetchProducts, CATEGORIES, formatPrice } from '@/lib/api';
import type { Product } from '@/lib/types';
import ProductCard from '@/components/products/ProductCard';
import SEO from '@/components/ui/SEO';
import { waSales } from '@/lib/whatsapp';

const TRUST = [
  { icon: Shield, label: '10+ Years',     sub: 'Trusted Since 2015',       href: '/about' },
  { icon: Award,  label: '14,000+',        sub: 'Families Served',          href: '/about' },
  { icon: Truck,  label: '6–48hr',         sub: 'Karachi Delivery',         href: '/services' },
  { icon: Phone,  label: '360° Support',   sub: 'Installation to Warranty', href: '/services' },
];

const SERVICES = [
  { icon: Wrench,    title: 'Installation',       sub: 'Professional certified technicians', href: '/services' },
  { icon: Shield,    title: 'Warranty Support',   sub: 'Manufacturer claim assistance',      href: '/services' },
  { icon: RotateCcw, title: 'Maintenance',        sub: 'Scheduled preventive service',       href: '/services' },
  { icon: Sun,       title: 'Solar Solutions',    sub: 'Complete turnkey systems',           href: '/products/solar-solutions' },
  { icon: Building,  title: 'Corporate',          sub: 'Priority SLA service',               href: '/corporate' },
  { icon: Award,     title: 'Loyalty Program',    sub: 'Earn points on every purchase',      href: '/portal' },
];

export default function Home() {
  const [featured, setFeatured] = useState<Product[]>([]);

  useEffect(() => {
    fetchProducts().then(all => setFeatured(all.filter(p => p.featured).slice(0, 8)));
  }, []);

  return (
    <div>
      <SEO />

      {/* ── Hero ── */}
      <section
        className="relative py-24 md:py-32 px-4 overflow-hidden text-white"
        style={{ background: 'linear-gradient(160deg, #0a0a1e 0%, #0d1a4a 50%, #0a2040 100%)' }}
      >
        <div className="absolute inset-0 opacity-30"
          style={{ background: 'radial-gradient(ellipse at 70% 40%, #f5c842 0%, transparent 55%)' }} />
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/20 bg-white/10 text-white/80 text-xs font-medium mb-6">
            ⭐ Karachi's Most Trusted — Since 2015
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black mb-4 tracking-tight">
            Premium Appliances<br />
            <span className="text-gradient-gold">Asaan Aqsaat Ke Sath</span>
          </h1>
          <p className="text-xl text-white/80 mb-2">Pakistan's best home appliance experience</p>
          <p className="text-white/50 text-sm italic mb-10">14,000+ families trust Reliance in Karachi</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link to="/products" className="btn-primary px-8 py-4 text-base">
              Shop Now <ChevronRight className="h-4 w-4" />
            </Link>
            <a href={waSales()} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full text-base font-semibold text-white transition-all hover:opacity-90"
              style={{ background: '#25d366' }}>
              <MessageCircle className="h-5 w-5" /> WhatsApp Us
            </a>
          </div>
        </div>
      </section>

      {/* ── Trust Bar ── */}
      <section className="bg-white border-b border-gray-100 py-6">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          {TRUST.map(t => (
            <Link key={t.label} to={t.href}
              className="flex items-center gap-3 p-3 rounded-apple hover:bg-surface-secondary transition-colors group">
              <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0 group-hover:bg-brand-100 transition-colors">
                <t.icon className="h-5 w-5 text-brand-500" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-sm">{t.label}</p>
                <p className="text-xs text-gray-500">{t.sub}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Categories ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <h2 className="section-title text-center mb-2">Browse by Category</h2>
        <p className="section-sub text-center mb-8">Tamam categories easy installments pe</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {CATEGORIES.map(c => (
            <Link key={c.slug} to={`/products/category/${c.slug}`}
              className="flex flex-col items-center gap-2 p-4 rounded-apple-xl bg-white border border-gray-100 shadow-apple hover:shadow-apple-lg hover:-translate-y-1 transition-all group">
              <span className="text-3xl">{c.icon}</span>
              <span className="text-xs font-semibold text-gray-700 text-center group-hover:text-brand-600 leading-tight">{c.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Featured Products ── */}
      <section className="bg-surface-secondary py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="section-title">Featured Products</h2>
              <p className="section-sub">Top picks — easy installments available</p>
            </div>
            <Link to="/products" className="btn-ghost gap-1 hidden sm:inline-flex">
              View All <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          {featured.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {featured.map((p, i) => (
                <div key={p.id} className="animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="rounded-apple-xl overflow-hidden">
                  <div className="aspect-square shimmer-bg" />
                  <div className="p-4 space-y-2">
                    <div className="h-3 rounded shimmer-bg w-2/3" />
                    <div className="h-4 rounded shimmer-bg" />
                    <div className="h-3 rounded shimmer-bg w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="text-center mt-8 sm:hidden">
            <Link to="/products" className="btn-outline">View All Products</Link>
          </div>
        </div>
      </section>

      {/* ── Installment Plans Banner ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div
          className="rounded-apple-xl p-8 md:p-12 text-white text-center"
          style={{ background: 'linear-gradient(135deg, #0070f3 0%, #003585 100%)' }}
        >
          <h2 className="text-3xl md:text-4xl font-black mb-3">Asaan Aqsaat Plans</h2>
          <p className="text-white/80 mb-8 text-lg">2, 3, 6 aur 12 mahine — koi hidden charges nahi</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { plan: '2 Month',  desc: 'Quick pay-off' },
              { plan: '3 Month',  desc: 'Popular choice' },
              { plan: '6 Month',  desc: 'Flexible payments' },
              { plan: '12 Month', desc: 'Lowest monthly' },
            ].map(p => (
              <div key={p.plan} className="bg-white/10 rounded-apple-xl p-4 text-left">
                <p className="font-black text-xl">{p.plan}</p>
                <p className="text-white/60 text-sm mt-1">{p.desc}</p>
              </div>
            ))}
          </div>
          <Link to="/installments" className="btn-gold px-10 py-4 text-base">
            Calculate Installments
          </Link>
        </div>
      </section>

      {/* ── Services ── */}
      <section className="bg-surface-secondary py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="section-title text-center mb-2">360° Service Promise</h2>
          <p className="section-sub text-center mb-10">Purchase ke baad bhi hum sath hain</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {SERVICES.map(s => (
              <Link key={s.title} to={s.href}
                className="flex items-start gap-4 p-5 bg-white rounded-apple-xl shadow-apple hover:shadow-apple-lg transition-all group">
                <div className="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0 group-hover:bg-brand-100 transition-colors">
                  <s.icon className="h-5 w-5 text-brand-500" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 mb-0.5">{s.title}</p>
                  <p className="text-sm text-gray-500">{s.sub}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-brand-500 ml-auto self-center transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-16 px-4 text-center"
        style={{ background: 'linear-gradient(160deg, #0a0a1e, #0d1a4a)' }}>
        <h2 className="text-3xl font-black text-white mb-3">Ready to upgrade your home?</h2>
        <p className="text-white/60 mb-8 max-w-lg mx-auto">
          Hamari team se baat karein — free consultation, same-day quotation, doorstep delivery.
        </p>
        <a href={waSales()} target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-2 px-10 py-4 rounded-full text-lg font-bold text-white hover:opacity-90 transition-all"
          style={{ background: '#25d366' }}>
          <MessageCircle className="h-6 w-6" /> Start on WhatsApp
        </a>
      </section>
    </div>
  );
}
