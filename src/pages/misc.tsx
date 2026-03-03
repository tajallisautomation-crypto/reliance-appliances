import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Phone, Mail, MapPin } from 'lucide-react';
import SEO from '@/components/ui/SEO';

/* ── About ─────────────────────────────────────────────── */
export function About() {
  return (
    <div>
      <SEO path="/about" title="About Us"
        description="Reliance Appliances — serving 14,000+ Karachi households since 2015 with premium appliances." />
      <div className="relative py-20 px-4 text-white text-center"
        style={{ background: 'linear-gradient(160deg,#1d1d1f,#2d2d2f)' }}>
        <h1 className="text-4xl font-extrabold mb-2">About Reliance Appliances</h1>
        <p className="text-white/60 text-lg">Karachi ka bharosa — since 2015</p>
      </div>
      <div className="max-w-4xl mx-auto px-4 py-14">
        <div className="grid md:grid-cols-2 gap-10 items-center mb-14">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Story</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Founded in 2015 in Karachi, Reliance Appliances started with one mission: make premium home
              appliances accessible to every Pakistani family, with honest pricing and genuine after-sales support.
            </p>
            <p className="text-gray-600 leading-relaxed italic text-sm">
              2015 mein shuroo hua ek chota sa safar aaj 14,000+ ghar tak pahuncha hai.
              Hamara mission sirf product bechna nahi — aapki zindagi comfortable banana hai.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            {[{n:'10+',l:'Years'},{n:'14K+',l:'Families'},{n:'4.9★',l:'Rating'}].map(s => (
              <div key={s.l} className="bg-surface-secondary rounded-apple-xl p-4">
                <div className="text-2xl font-black text-brand-600">{s.n}</div>
                <div className="text-xs text-gray-500">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="grid sm:grid-cols-3 gap-6 bg-surface-secondary rounded-apple-xl p-8 mb-10">
          {[
            {t:'Customer First',    d:"Honesty over profit, always. Every decision starts with what's right for our customers."},
            {t:'Quality Guaranteed',d:"We only stock products we'd put in our own homes. Authorized dealers only."},
            {t:'Community Focused', d:'Karachi hamara ghar hai. Fair pricing, local employment, transparent service.'},
          ].map(v => (
            <div key={v.t} className="text-center">
              <h3 className="font-bold text-gray-900 mb-2">{v.t}</h3>
              <p className="text-sm text-gray-500">{v.d}</p>
            </div>
          ))}
        </div>
        <div className="space-y-3">
          {[
            {Icon:Phone, l:'Sales (WhatsApp)', v:'+92 370 2578788', href:'tel:+923702578788'},
            {Icon:Phone, l:'Admin & Corporate', v:'+92 335 4266238', href:'tel:+923354266238'},
            {Icon:Mail,  l:'Email', v:'info@relianceappliances.pk', href:'mailto:info@relianceappliances.pk'},
            {Icon:MapPin,l:'Location', v:'Karachi, Sindh, Pakistan', href:'#'},
          ].map(c => (
            <a key={c.v} href={c.href}
              className="flex items-start gap-4 p-4 rounded-apple-xl bg-surface-secondary hover:bg-gray-100 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
                <c.Icon className="h-4 w-4 text-brand-500" />
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">{c.l}</p>
                <p className="font-semibold text-gray-900 text-sm">{c.v}</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Contact ────────────────────────────────────────────── */
export function Contact() {
  return (
    <div>
      <SEO path="/contact" title="Contact Us"
        description="Contact Reliance Appliances Karachi. Sales: +92 370 2578788. 9AM-9PM, Mon-Sat." />
      <div className="bg-brand-500 text-white py-14 px-4 text-center">
        <h1 className="text-4xl font-extrabold mb-2">Humse Rabta Karein</h1>
        <p className="text-white/70">Get in touch - we are here to help</p>
      </div>
      <div className="max-w-4xl mx-auto px-4 py-14 grid md:grid-cols-2 gap-10">
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-5">Contact Information</h2>
          <div className="space-y-3">
            {[
              {Icon:Phone, l:'Sales (WhatsApp)', v:'+92 370 2578788', href:'tel:+923702578788'},
              {Icon:Phone, l:'Admin & Corporate', v:'+92 335 4266238', href:'tel:+923354266238'},
              {Icon:Mail,  l:'Email', v:'info@relianceappliances.pk', href:'mailto:info@relianceappliances.pk'},
              {Icon:MapPin,l:'Location', v:'Karachi, Sindh, Pakistan', href:'#'},
            ].map(c => (
              <a key={c.v} href={c.href}
                className="flex items-start gap-4 p-4 rounded-apple-xl bg-surface-secondary hover:bg-gray-100 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
                  <c.Icon className="h-4 w-4 text-brand-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">{c.l}</p>
                  <p className="font-semibold text-gray-900 text-sm">{c.v}</p>
                </div>
              </a>
            ))}
          </div>
          <a href="https://wa.me/923702578788" target="_blank" rel="noreferrer"
            className="mt-6 w-full flex items-center justify-center gap-2 py-4 rounded-apple-xl font-bold text-white"
            style={{ background: '#25d366' }}>
            Chat on WhatsApp Now
          </a>
        </div>
        <div className="bg-white rounded-apple-xl p-6" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Message</h2>
          <div className="space-y-4">
            <input className="input-field" placeholder="Your Name *" />
            <input className="input-field" placeholder="Phone / WhatsApp *" />
            <select className="select-field">
              <option>Product Enquiry</option>
              <option>Installment Query</option>
              <option>Service Request</option>
              <option>Warranty Claim</option>
              <option>Corporate Enquiry</option>
              <option>Other</option>
            </select>
            <textarea rows={3} className="input-field resize-none" placeholder="Your message..." />
            <a href="https://wa.me/923702578788" target="_blank" rel="noreferrer"
              className="btn-primary w-full justify-center py-3.5">
              Send via WhatsApp
            </a>
            <p className="text-xs text-gray-400 text-center">
              Opens WhatsApp. We reply within 1 hour during business hours.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── FAQ ────────────────────────────────────────────────── */
export function FAQ() {
  const [open, setOpen] = useState<number | null>(null);
  const faqs = [
    {q:'Installment plans kaise kaam karte hain?',a:'Hum 4 plans offer karte hain: 2, 3, 6 aur 12 mahine. Advance delivery pe, baaki monthly. Koi hidden charges nahi.'},
    {q:'Karachi mein delivery kitne time mein hoti hai?',a:'6 se 48 ghante ke andar. Same-day delivery kuch areas mein. WhatsApp confirmation ke baad team schedule karti hai.'},
    {q:'Kya installation service free hai?',a:'Professional installation PKR 2,000 mein available hai. Checkout pe add karein. AC, fridge, washing machine sab ke liye certified technicians.'},
    {q:'Warranty claim kaise karta hoon?',a:'WhatsApp karein apne product details ke saath. Hum manufacturer se seedha deal karte hain. Bilkul free.'},
    {q:'Kya products genuine hain?',a:'Bilkul! Hum sirf authorized distributors se khareedtay hain. Haier, Gree, Samsung, Dawlance, Jinko sab authorized channel se.'},
    {q:'Loyalty points kaise earn hote hain?',a:'Har PKR 100 purchase pe 1 point. 500 points se redemption shuru. Points 2 saal mein expire hote hain.'},
    {q:'Solar system installation mein kitna waqt lagta hai?',a:'Residential: 1-2 din installation. DISCO approval include karke poora process 2-4 weeks.'},
    {q:'OTP login kaise kaam karta hai?',a:'Portal mein apna WhatsApp number enter karein. 4-digit OTP aata hai. Enter karein. No password needed.'},
  ];
  return (
    <div>
      <SEO path="/faq" title="FAQ"
        description="Common questions about installments, delivery, warranty, and services at Reliance Appliances Karachi." />
      <div className="bg-brand-500 text-white py-14 px-4 text-center">
        <h1 className="text-4xl font-extrabold mb-2">Aksar Pooche Jane Wale Sawaal</h1>
        <p className="text-white/70">Frequently Asked Questions</p>
      </div>
      <div className="max-w-3xl mx-auto px-4 py-14 space-y-3">
        {faqs.map((f, i) => (
          <div key={i} className="bg-white rounded-apple-xl overflow-hidden"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <button onClick={() => setOpen(open === i ? null : i)}
              className="w-full flex items-center justify-between p-5 text-left gap-4 hover:bg-surface-secondary transition-colors">
              <span className="font-semibold text-gray-900 text-sm leading-snug">{f.q}</span>
              <span className="text-gray-400 flex-shrink-0 text-xs">{open === i ? '▲' : '▼'}</span>
            </button>
            {open === i && (
              <div className="px-5 pb-5 text-sm text-gray-600 leading-relaxed border-t border-gray-50 pt-3">{f.a}</div>
            )}
          </div>
        ))}
        <div className="mt-8 text-center bg-surface-secondary rounded-apple-xl p-8">
          <p className="text-gray-600 mb-4">Still have questions? Our team is ready to help.</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <a href="https://wa.me/923702578788" target="_blank" rel="noreferrer" className="btn-primary">
              Chat on WhatsApp
            </a>
            <Link to="/contact" className="btn-outline">Contact Us</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Policy ─────────────────────────────────────────────── */
const POLICIES: Record<string, { title: string; body: string }> = {
  privacy:  { title:'Privacy Policy',    body:'We collect name, phone, email and purchase history to process orders and provide support. We do not sell your data. WhatsApp communications are end-to-end encrypted.\n\nFor privacy concerns: info@relianceappliances.pk' },
  terms:    { title:'Terms of Service',  body:'Orders are confirmed via WhatsApp. Price at confirmation is final. Installments are due monthly on the agreed date. Delivery within Karachi only. Returns within 7 days if unopened and in original packaging.' },
  warranty: { title:'Warranty Policy',   body:'All products carry manufacturer warranty. ACs: 5-year compressor. Fridges: 10-year compressor. Solar: 25-year linear output. Free claim assistance via WhatsApp.\n\nWarranty does not cover physical damage, power surge damage, or unauthorized repairs.' },
  refund:   { title:'Refund Policy',     body:'Refunds for: product not delivered, wrong product, or defect confirmed within 48hr. Cash refunds in 3-5 business days.\n\nContact: +92 370 2578788 via WhatsApp with your order ID.' },
};

export function Policy() {
  const { type } = useParams<{ type: string }>();
  const p = POLICIES[type || ''];
  if (!p) return <div className="py-16 text-center text-gray-500">Policy not found.</div>;
  return (
    <div>
      <SEO title={p.title} noIndex />
      <div className="bg-surface-secondary py-12 px-4 text-center border-b border-gray-100">
        <h1 className="text-3xl font-extrabold text-gray-900">{p.title}</h1>
      </div>
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-white rounded-apple-xl p-8 text-sm text-gray-600 leading-relaxed whitespace-pre-line"
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          {p.body}
        </div>
      </div>
    </div>
  );
}

/* ── NotFound ───────────────────────────────────────────── */
export function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-20 text-center">
      <SEO title="Page Not Found" noIndex />
      <div className="text-8xl font-black text-gray-100 mb-6">404</div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Page Not Found</h1>
      <p className="text-gray-500 mb-8 max-w-md">Yeh page exist nahi karta. Please search for the product below.</p>
      <div className="flex flex-wrap gap-3 justify-center">
        <Link to="/products" className="btn-primary">Browse Products</Link>
        <Link to="/"         className="btn-outline">Back to Home</Link>
      </div>
    </div>
  );
}
