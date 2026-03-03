import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, MessageCircle } from 'lucide-react';
import { waSales } from '@/lib/whatsapp';

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
        {/* Brand */}
        <div className="col-span-2 md:col-span-1">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-black"
              style={{ background: 'linear-gradient(135deg,#0070f3,#f5c842)' }}>R</div>
            <span className="font-black text-lg">Reliance Appliances</span>
          </div>
          <p className="text-sm text-gray-400 leading-relaxed mb-4">
            Karachi's most trusted home appliance partner since 2015. Serving 14,000+ households with premium products and genuine after-sales support.
          </p>
          <a href={waSales()} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-white"
            style={{ background: '#25d366' }}>
            <MessageCircle className="h-4 w-4" /> Chat on WhatsApp
          </a>
        </div>

        {/* Products */}
        <div>
          <h3 className="font-bold text-sm uppercase tracking-wider text-gray-300 mb-3">Products</h3>
          <ul className="space-y-2">
            {['Air Conditioners','Refrigerators','Washing Machines','Televisions','Solar Solutions','Kitchen Appliances'].map(c => (
              <li key={c}>
                <Link to={`/products/category/${c.toLowerCase().replace(/\s+/g,'-')}`}
                  className="text-sm text-gray-400 hover:text-white transition-colors">{c}</Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Services */}
        <div>
          <h3 className="font-bold text-sm uppercase tracking-wider text-gray-300 mb-3">Services</h3>
          <ul className="space-y-2">
            {[['Installment Plans','/installments'],['Installation','/services'],['Warranty Claims','/services'],
              ['Solar Solutions','/products/solar-solutions'],['Corporate','/corporate'],['Customer Portal','/portal']].map(([l,h]) => (
              <li key={h}><Link to={h} className="text-sm text-gray-400 hover:text-white transition-colors">{l}</Link></li>
            ))}
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h3 className="font-bold text-sm uppercase tracking-wider text-gray-300 mb-3">Contact</h3>
          <ul className="space-y-3">
            {[
              { icon: Phone, val: '+92 370 2578788', href: 'tel:+923702578788' },
              { icon: Phone, val: '+92 335 4266238', href: 'tel:+923354266238' },
              { icon: Mail,  val: 'info@relianceappliances.pk', href: 'mailto:info@relianceappliances.pk' },
              { icon: MapPin, val: 'Karachi, Pakistan', href: '#' },
            ].map(({ icon: Icon, val, href }) => (
              <li key={val}>
                <a href={href} className="flex items-start gap-2 text-sm text-gray-400 hover:text-white transition-colors">
                  <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" /> {val}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-gray-500">© {year} Reliance Appliances. All rights reserved.</p>
          <div className="flex gap-4">
            {[['Privacy','/policy/privacy'],['Terms','/policy/terms'],['Warranty','/policy/warranty'],['Refund','/policy/refund']].map(([l,h]) => (
              <Link key={h} to={h} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">{l}</Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
