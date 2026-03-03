import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Wrench, Shield, RefreshCw, Sun, Building, Star,
  MessageCircle, Phone, Check, ChevronDown, ChevronUp,
  Clock, Zap, Award, CheckCircle
} from 'lucide-react';
import SEO from '@/components/ui/SEO';
import { waSales } from '@/lib/whatsapp';

const SERVICES = [
  {
    icon: Wrench, id: 'installation',
    title: 'Professional Installation',
    subtitle: 'Same-day certified technician service',
    price: 'PKR 2,000 per unit',
    colorClass: 'text-blue-600 bg-blue-50',
    badge: 'Most Requested',
    features: ['Certified factory-trained technicians','Same-day or next-day scheduling','All tools and materials included','Post-installation testing & demo','AC, Fridge, Washing Machine, TV, Solar'],
  },
  {
    icon: Shield, id: 'warranty',
    title: 'Warranty Claim Assistance',
    subtitle: '100% free — we handle everything for you',
    price: 'Completely Free',
    colorClass: 'text-emerald-600 bg-emerald-50',
    badge: 'Free Service',
    features: ['We contact manufacturer on your behalf','No paperwork for you','Technician dispatched within 24hrs','Genuine spare parts guaranteed','Full claim tracking via WhatsApp'],
  },
  {
    icon: RefreshCw, id: 'amc',
    title: 'Annual Maintenance Contract',
    subtitle: 'Preventive care that extends appliance life',
    price: 'From PKR 12,000/year',
    colorClass: 'text-purple-600 bg-purple-50',
    badge: 'Best Value',
    features: ['Quarterly preventive visits','Priority emergency response','Parts at cost price','Full service history log','Energy efficiency monitoring'],
  },
  {
    icon: Sun, id: 'solar',
    title: 'Solar & Energy Solutions',
    subtitle: 'Complete turnkey solar — from survey to switch-on',
    price: 'From PKR 450,000',
    colorClass: 'text-amber-600 bg-amber-50',
    badge: 'High Demand',
    features: ['3kW–20kW residential & commercial','Grid-tie, off-grid & hybrid','Jinko, Canadian Solar, Huawei','NEPRA net metering support','25-year panel performance warranty'],
  },
  {
    icon: Building, id: 'corporate',
    title: 'Corporate Priority Service',
    subtitle: 'SLA-backed response for offices and businesses',
    price: 'Custom Quote',
    colorClass: 'text-slate-600 bg-slate-50',
    badge: 'Enterprise',
    features: ['<4hr emergency response SLA','Dedicated account manager','Bulk purchase corporate pricing','Monthly consolidated invoicing','On-site staff training included'],
  },
  {
    icon: Star, id: 'followup',
    title: '360° After-Sales Support',
    subtitle: 'We stay with you for the entire life of every product',
    price: 'Included Free',
    colorClass: 'text-rose-600 bg-rose-50',
    badge: 'Included',
    features: ['3-day post-delivery check-in','Quarterly performance call','Annual service reminders','Upgrade advisory when due','Direct WhatsApp support line'],
  },
];

const PROCESS = [
  { n:'1', t:'Contact Us',   d:'WhatsApp or call — we respond in under 30 minutes during business hours.' },
  { n:'2', t:'Schedule',     d:'Pick a time that works. We offer same-day and next-day slots across Karachi.' },
  { n:'3', t:'We Arrive',    d:'Uniformed, certified technician arrives at your confirmed time slot.' },
  { n:'4', t:'Job Complete', d:'Full service done, tested, demonstrated. You sign off with confidence.' },
];

const FAQS = [
  { q:'How quickly can you send a technician?',
    a:'For new installations, same-day or next-day. For warranty/repair calls, within 24 hours of logging the request. Corporate SLA is under 4 hours for emergencies.' },
  { q:'Is the PKR 2,000 installation fee per unit or per visit?',
    a:'It is PKR 2,000 per appliance unit. No separate call-out or visit fee is added on top. Multiple units in one visit are each charged at PKR 2,000.' },
  { q:'Do your technicians bring their own tools and materials?',
    a:'Yes — they arrive fully equipped. For AC installations, this includes copper piping, brackets, drain pipes, and all consumables. You do not need to arrange anything.' },
  { q:'What warranty claims do you assist with?',
    a:'We assist with all manufacturer warranty claims for products purchased from us — completely free. We contact the manufacturer, arrange the visit, and source genuine parts on your behalf.' },
  { q:'Can I get an AMC for appliances not bought from Reliance?',
    a:'Yes. We offer AMC contracts for all major brands regardless of purchase origin. Contact us for a custom quote based on your inventory.' },
  { q:'Which areas in Karachi do you cover?',
    a:'We cover all major areas: DHA, Clifton, Gulshan, North Nazimabad, Malir, Korangi, PECHS, Bahadurabad, Nazimabad, FB Area, Saddar, Landhi, Shah Faisal, and more.' },
];

export default function Services() {
  const [expanded, setExpanded] = useState<string|null>(null);
  const [openFaq, setOpenFaq]   = useState<number|null>(null);

  return (
    <div>
      <SEO path="/services" title="Professional Appliance Services in Karachi"
        description="Installation, warranty, maintenance, solar and corporate appliance services in Karachi. Same-day technicians, free warranty assistance, AMC contracts."
        keywords="appliance installation Karachi, AC installation, warranty claim service, AMC maintenance contract" />

      {/* Hero */}
      <section style={{ background:'linear-gradient(160deg,#0a0a2e,#0d1a4a)' }} className="py-20 px-4 text-center text-white">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-white/80 text-xs font-medium mb-6">
            <CheckCircle className="h-3.5 w-3.5 text-emerald-400" /> 10+ Years · 14,000+ Households Served
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-4">360° Service Promise</h1>
          <p className="text-white/70 text-lg mb-8 max-w-xl mx-auto">
            We don't just sell appliances — we stand behind every product for its entire life. Purchase ke baad bhi hum sath hain.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <a href={waSales('Salam! I need to book a service.')} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-white text-sm"
              style={{ background:'#25d366' }}>
              <MessageCircle className="h-4 w-4" /> Book via WhatsApp
            </a>
            <a href="tel:+923702578788"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold border border-white/20 text-white text-sm hover:bg-white/10 transition-all">
              <Phone className="h-4 w-4" /> +92 370 2578788
            </a>
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <section className="bg-white border-b border-gray-100 py-4">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { Icon:Clock,  v:'< 30 min', l:'Response time' },
            { Icon:Zap,    v:'Same-day',  l:'Installation available' },
            { Icon:Award,  v:'100% Free', l:'Warranty claims' },
            { Icon:Shield, v:'2-Year',    l:'Workmanship guarantee' },
          ].map(s => (
            <div key={s.l} className="flex items-center gap-3 px-2 py-1">
              <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
                <s.Icon className="h-4 w-4 text-brand-500" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-sm">{s.v}</p>
                <p className="text-xs text-gray-400">{s.l}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Service cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="section-title mb-2">Our Services</h2>
          <p className="section-sub">Click any card to see what's included</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {SERVICES.map(s => (
            <div key={s.id}
              onClick={() => setExpanded(expanded === s.id ? null : s.id)}
              className={`bg-white rounded-apple-xl border transition-all duration-300 overflow-hidden cursor-pointer
                ${expanded===s.id ? 'border-brand-300 shadow-blue' : 'border-gray-100 shadow-apple hover:shadow-apple-lg hover:-translate-y-0.5'}`}>
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${s.colorClass}`}>
                    <s.icon className="h-6 w-6" />
                  </div>
                  <span className="badge badge-blue text-xs">{s.badge}</span>
                </div>
                <h3 className="font-bold text-gray-900 mb-1">{s.title}</h3>
                <p className="text-sm text-gray-500 mb-2">{s.subtitle}</p>
                <p className="text-sm font-bold text-brand-600 mb-4">{s.price}</p>
                <div className="flex items-center justify-between">
                  <a href={waSales(`Salam! I need ${s.title} service.`)} target="_blank" rel="noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-white px-4 py-2 rounded-full"
                    style={{ background:'#25d366' }}>
                    <MessageCircle className="h-3.5 w-3.5" /> Book Now
                  </a>
                  {expanded===s.id
                    ? <ChevronUp className="h-5 w-5 text-gray-400" />
                    : <ChevronDown className="h-5 w-5 text-gray-400" />}
                </div>
              </div>
              {expanded===s.id && (
                <div className="px-6 pb-6 border-t border-gray-50 pt-4 animate-fade-in">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">What's Included</p>
                  <ul className="space-y-2">
                    {s.features.map(f => (
                      <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                        <Check className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" /> {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-surface-secondary py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="section-title text-center mb-2">How It Works</h2>
          <p className="section-sub text-center mb-12">Booking takes 2 minutes</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {PROCESS.map((s, i) => (
              <div key={s.n} className="text-center relative">
                {i < PROCESS.length-1 && (
                  <div className="hidden lg:block absolute top-6 left-[62%] right-[-38%] h-0.5 bg-brand-100 z-0" />
                )}
                <div className="w-12 h-12 rounded-full bg-brand-500 text-white font-black text-xl flex items-center justify-center mx-auto mb-4 relative z-10">
                  {s.n}
                </div>
                <h3 className="font-bold text-gray-900 text-sm mb-2">{s.t}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <h2 className="section-title text-center mb-2">Frequently Asked Questions</h2>
        <p className="section-sub text-center mb-10">Direct answers — no runaround</p>
        <div className="space-y-3">
          {FAQS.map((f, i) => (
            <div key={i} className="bg-white rounded-apple-xl shadow-apple overflow-hidden border border-gray-50">
              <button onClick={() => setOpenFaq(openFaq===i ? null : i)}
                className="w-full flex items-center justify-between p-5 text-left gap-4 hover:bg-surface-secondary transition-colors">
                <span className="font-semibold text-gray-900 text-sm">{f.q}</span>
                {openFaq===i
                  ? <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  : <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />}
              </button>
              {openFaq===i && (
                <div className="px-5 pb-5 pt-3 border-t border-gray-50 text-sm text-gray-600 leading-relaxed animate-fade-in">
                  {f.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-4 pb-16">
        <div className="rounded-apple-xl p-8 md:p-12 text-center text-white"
          style={{ background:'linear-gradient(135deg,#0070f3 0%,#003585 100%)' }}>
          <h2 className="text-2xl md:text-3xl font-black mb-3">Ready to Book?</h2>
          <p className="text-white/70 mb-8">Our team responds in under 30 minutes — directly to our service coordinators, not a call centre.</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <a href={waSales('Salam! I need to book a service.')} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-bold text-white" style={{ background:'#25d366' }}>
              <MessageCircle className="h-5 w-5" /> Book via WhatsApp
            </a>
            <a href="tel:+923702578788"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-bold border border-white/25 text-white hover:bg-white/10 transition-all">
              <Phone className="h-5 w-5" /> Call Now
            </a>
          </div>
          <p className="text-white/40 text-xs mt-6">Mon–Sat: 9AM–9PM · Sun: 10AM–6PM · Corporate Emergency: 24/7</p>
        </div>
      </section>
    </div>
  );
}
