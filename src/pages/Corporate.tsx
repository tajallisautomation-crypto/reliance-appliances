import { useState } from 'react';
import { Building, Clock, Shield, Users, Zap, Star, MessageCircle, Phone, Check, ChevronDown, ChevronUp, Award, Briefcase } from 'lucide-react';
import SEO from '@/components/ui/SEO';
import { waSales, waCorporate } from '@/lib/whatsapp';

const SVCS = [
  { Icon:Clock,    t:'Priority SLA Response',  d:'<4hr emergency response guarantee. Dedicated escalation line. No call-centre queues.' },
  { Icon:Zap,      t:'Backup Power Solutions', d:'Custom UPS, inverter & solar backup for zero downtime. KESC outage protection.' },
  { Icon:Shield,   t:'AMC Contracts',          d:'Annual maintenance for all office appliances. Quarterly preventive visits, parts at cost.' },
  { Icon:Users,    t:'Bulk Purchase Pricing',  d:'Volume-based pricing from 5+ units. Credit terms available. Fleet warranty management.' },
  { Icon:Building, t:'Complete Office Setup',  d:'ACs, water dispensers, microwaves, fridges — single vendor, full project management.' },
  { Icon:Star,     t:'Corporate Loyalty',      d:'5–10% corporate discount + dedicated account manager + priority scheduling.' },
];

const CLIENTS = [
  'FMCG & Retail', 'Banking & Finance', 'Healthcare', 'Real Estate',
  'Education', 'Hospitality', 'Manufacturing', 'Technology',
];

const STEPS = [
  { n:'1', t:'Submit Requirements', d:'Share your office size, appliance list and budget via WhatsApp or email.' },
  { n:'2', t:'Free Site Survey',    d:'Our corporate team visits, assesses needs and designs the solution.' },
  { n:'3', t:'Custom Proposal',     d:'Detailed quotation with SLA terms, payment schedule and warranty coverage.' },
  { n:'4', t:'Delivery & Setup',    d:'Coordinated installation minimising disruption to your operations.' },
];

export default function Corporate() {
  const [openFaq, setOpenFaq] = useState<number|null>(null);
  const [form, setForm] = useState({ company:'', name:'', phone:'', requirements:'' });

  const FAQS = [
    { q:'What is the minimum order for corporate pricing?',
      a:'Corporate pricing applies from 5 units. For 10+ units, we offer additional tiered discounts. Contact us for a custom quote based on your specific requirements.' },
    { q:'Do you offer credit or payment terms for corporates?',
      a:'Yes — for established businesses, we offer 30-day net payment terms after the first cash order. Discuss with our corporate team for details.' },
    { q:'How fast is your emergency response?',
      a:'Our SLA commitment is <4 hours for corporate emergency calls within Karachi during business hours. A dedicated technician is dispatched immediately upon call logging.' },
    { q:'Can you handle a complete office setup from scratch?',
      a:'Yes — we provide end-to-end office appliance setup: survey, procurement, delivery, installation, and ongoing AMC. Single point of contact for all appliances.' },
    { q:'Do you provide monthly invoicing and GST receipts?',
      a:'Yes — corporate accounts receive consolidated monthly invoicing with full GST documentation for accounting and tax purposes.' },
  ];

  const sendQuote = () => {
    const msg = `🏢 CORPORATE ENQUIRY\n\nCompany: ${form.company}\nContact: ${form.name}\nPhone: ${form.phone}\n\nRequirements:\n${form.requirements}\n\nPlease send a custom quote.`;
    window.open(`https://wa.me/923354266238?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div>
      <SEO path="/corporate" title="Corporate Appliance Solutions Karachi — Priority Service"
        description="Complete corporate appliance solutions in Karachi. Priority SLA service, bulk purchase, AMC contracts, backup power. Dedicated account managers."
        keywords="corporate appliances Karachi, office AC installation, AMC contract Karachi, bulk appliance purchase Pakistan" />

      {/* Hero */}
      <section className="relative py-24 px-4 text-center text-white overflow-hidden"
        style={{ background:'linear-gradient(160deg,#0a0a2e,#1a1a4e)' }}>
        <div className="absolute inset-0 opacity-20"
          style={{ background:'radial-gradient(ellipse at 70% 40%,#f5c842 0%,transparent 55%)' }} />
        <div className="relative max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-medium text-white/80 mb-6">
            <Briefcase className="h-3.5 w-3.5" /> {"200+ Corporate Clients · <4hr SLA"}
          </div>
          <h1 className="text-4xl md:text-6xl font-black mb-4">
            Corporate <span className="text-gradient-gold">Priority Service</span>
          </h1>
          <p className="text-white/70 text-xl mb-10">Aapki operations kabhi nahi rukein — guaranteed.</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <a href={waCorporate()} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-bold text-white"
              style={{ background:'#25d366' }}>
              <MessageCircle className="h-5 w-5" /> Talk to Corporate Team
            </a>
            <a href="tel:+923354266238"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold border border-white/20 text-white text-sm hover:bg-white/10 transition-all">
              <Phone className="h-4 w-4" /> +92 335 4266238
            </a>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          {[
            { n:'200+', l:'Corporate Clients' },
            { n:'<4hr', l:'Emergency Response' },
            { n:'99.5%', l:'Uptime SLA Achieved' },
            { n:'360°',  l:'Coverage' },
          ].map(s => (
            <div key={s.l} className="py-2">
              <div className="text-3xl font-black text-brand-600 mb-1">{s.n}</div>
              <div className="text-sm text-gray-500">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">

        {/* Services grid */}
        <h2 className="section-title text-center mb-2">Corporate Services</h2>
        <p className="section-sub text-center mb-10">Everything your office needs — one trusted partner</p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {SVCS.map(s => (
            <div key={s.t} className="bg-white rounded-apple-xl shadow-apple p-6 hover:shadow-apple-lg transition-all group">
              <div className="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center mb-4 group-hover:bg-brand-100 transition-colors">
                <s.Icon className="h-5 w-5 text-brand-500" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">{s.t}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>

        {/* Industries */}
        <div className="bg-surface-secondary rounded-apple-xl p-8 mb-16">
          <h2 className="section-title text-center mb-2">Industries We Serve</h2>
          <p className="section-sub text-center mb-8">Across all sectors in Karachi</p>
          <div className="flex flex-wrap justify-center gap-3">
            {CLIENTS.map(c => (
              <div key={c} className="px-4 py-2 bg-white rounded-full text-sm font-medium text-gray-700 border border-gray-100 shadow-apple">
                {c}
              </div>
            ))}
          </div>
        </div>

        {/* How it works */}
        <h2 className="section-title text-center mb-10">How We Onboard You</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {STEPS.map((s, i) => (
            <div key={s.n} className="text-center relative">
              {i < STEPS.length-1 && (
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

        {/* Quote form + FAQ */}
        <div className="grid lg:grid-cols-2 gap-10">

          {/* Quote request */}
          <div className="bg-white rounded-apple-xl shadow-apple p-7">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
                <Building className="h-5 w-5 text-brand-500" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Request Corporate Quote</h3>
                <p className="text-xs text-gray-400">Response within 2 business hours</p>
              </div>
            </div>
            <div className="space-y-4">
              {[
                { l:'Company Name', k:'company', ph:'Acme Corporation Ltd' },
                { l:'Your Name',    k:'name',    ph:'Muhammad Ahmed' },
                { l:'Phone / WhatsApp', k:'phone', ph:'+92 3XX XXXXXXX' },
              ].map(f => (
                <div key={f.k}>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{f.l}</label>
                  <input value={(form as any)[f.k]} onChange={e => setForm({...form, [f.k]:e.target.value})}
                    placeholder={f.ph} className="input-field" />
                </div>
              ))}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Requirements</label>
                <textarea value={form.requirements} onChange={e => setForm({...form,requirements:e.target.value})}
                  rows={3} placeholder="e.g. 5×ACs for 3000 sqft office, monthly maintenance contract needed..."
                  className="input-field resize-none" />
              </div>
              <button onClick={sendQuote} className="btn-primary w-full justify-center py-3.5 gap-2">
                <MessageCircle className="h-4 w-4" /> Send via WhatsApp
              </button>
              <p className="text-xs text-gray-400 text-center">Or call our corporate line: +92 335 4266238</p>
            </div>
          </div>

          {/* FAQ */}
          <div>
            <h3 className="font-bold text-gray-900 text-lg mb-6">Corporate FAQs</h3>
            <div className="space-y-3">
              {FAQS.map((f, i) => (
                <div key={i} className="bg-white rounded-apple-xl shadow-apple overflow-hidden border border-gray-50">
                  <button onClick={() => setOpenFaq(openFaq===i ? null : i)}
                    className="w-full flex items-center justify-between p-4 text-left gap-4 hover:bg-surface-secondary transition-colors">
                    <span className="font-semibold text-gray-900 text-sm">{f.q}</span>
                    {openFaq===i ? <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />}
                  </button>
                  {openFaq===i && (
                    <div className="px-4 pb-4 pt-3 border-t border-gray-50 text-sm text-gray-600 leading-relaxed animate-fade-in">{f.a}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
