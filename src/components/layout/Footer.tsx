import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, Leaf, Facebook, ChevronDown } from 'lucide-react';

function CollapsibleSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="md:cursor-default w-full flex items-center justify-between mb-3"
        aria-expanded={open}
      >
        <h3 className="font-bold text-sm uppercase tracking-wider text-brand-200">{title}</h3>
        <ChevronDown className={`h-4 w-4 text-brand-300 transition-transform md:hidden ${open ? 'rotate-180' : ''}`} />
      </button>
      <div className={`md:block ${open ? 'block' : 'hidden'}`}>{children}</div>
    </div>
  );
}

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-brand-700 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 grid grid-cols-2 md:grid-cols-4 gap-5 sm:gap-8">
        {/* Brand */}
        <div className="col-span-2 md:col-span-1">
          <div className="flex items-center gap-3 mb-4">
            <img
              src="/tajallis-logo-icon.svg"
              alt=""
              aria-hidden="true"
              className="h-10 w-10 shrink-0 brightness-0 invert"
              loading="lazy"
            />
            <div className="leading-none">
              <p className="font-black text-xl text-white tracking-tight leading-none">Tajalli&#8217;s</p>
              <p className="text-[11px] font-semibold text-brand-200 mt-1 tracking-[0.08em] uppercase leading-none">
                Home &amp; Commercial Solutions
              </p>
            </div>
          </div>
          <p className="flex items-center gap-1 text-[11px] font-semibold mb-3">
            <span className="text-white/70">Delivered</span>
            <span className="text-white/30 mx-0.5">•</span>
            <span className="text-gold-400">Installed</span>
            <span className="text-white/30 mx-0.5">•</span>
            <span className="text-eco-400">Supported</span>
          </p>
          <p className="text-sm text-brand-200 leading-relaxed mb-4">
            Karachi's most trusted appliance partner since 2015. Serving 14,400+ clients — homes, offices &amp; businesses — with genuine products and real after-sales support.
          </p>
          <div className="flex gap-2">
            <a href="https://www.facebook.com/tajallishomecollection/" target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors">
              <Facebook className="h-4 w-4" /> Facebook
            </a>
          </div>
        </div>

        {/* Products */}
        <CollapsibleSection title="Products">
          <ul className="space-y-2">
            {[
              { label: 'Air Conditioners',   to: '/products?category=air-conditioners'   },
              { label: 'Refrigerators',      to: '/products?category=refrigerators'      },
              { label: 'Freezers',           to: '/products?category=freezers'           },
              { label: 'Washing Machines',   to: '/products?category=washing-machines'   },
              { label: 'Televisions',        to: '/products?category=televisions'        },
              { label: 'Solar Solutions',    to: '/solar'                                },
              { label: 'Kitchen Appliances', to: '/products?category=kitchen-appliances' },
            ].map(({ label, to }) => (
              <li key={label}>
                <Link to={to} className="text-sm text-brand-300 hover:text-white transition-colors">{label}</Link>
              </li>
            ))}
          </ul>
        </CollapsibleSection>

        {/* Services */}
        <CollapsibleSection title="Services">
          <ul className="space-y-2">
            {[
              ['Build a Package',    '/build-your-package'],
              ['Installment Plans',  '/installments'],
              ['Customer Support',   '/support'],
              ['Installation',       '/services'],
              ['Warranty Claims',    '/support'],
              ['Green Corridor',     '/green-corridor'],
              ['Partner With Us',    '/partner'],
              ['Refer & Earn',       '/referral'],
              ['Gallery',            '/gallery'],
              ['Customer Portal',    '/portal'],
            ].map(([l, h]) => (
              <li key={l}>
                <Link to={h}
                  className={`text-sm transition-colors flex items-center gap-1.5 ${h === '/green-corridor' ? 'text-eco-400 hover:text-eco-300' : 'text-brand-300 hover:text-white'}`}>
                  {h === '/green-corridor' && <Leaf className="w-3 h-3" />}{l}
                </Link>
              </li>
            ))}
          </ul>
          <a href="https://wa.me/923702578788?text=Hi%2C+I+want+to+check+delivery%2Finstallation+availability+in+my+area."
            target="_blank" rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-xs text-green-400 hover:text-green-300 transition-colors font-semibold">
            Not in your area? WhatsApp us →
          </a>
        </CollapsibleSection>

        {/* Contact — always visible */}
        <div>
          <h3 className="font-bold text-sm uppercase tracking-wider text-brand-200 mb-3">Contact</h3>
          <ul className="space-y-3">
            {[
              { icon: Phone, val: '+92 370 2578788', href: 'tel:+923702578788' },
              { icon: Mail,  val: 'sales@tajallis.com.pk',   href: 'mailto:sales@tajallis.com.pk' },
              { icon: Mail,  val: 'support@tajallis.com.pk', href: 'mailto:support@tajallis.com.pk' },
              { icon: MapPin, val: 'L-152-153, Sector 11C-1, UP More, North Karachi, Karachi', href: 'https://maps.google.com/?q=L-152-153+Sector+11C-1+UP+More+North+Karachi' },
            ].map(({ icon: Icon, val, href }) => (
              <li key={val}>
                <a href={href} className="flex items-start gap-2 text-sm text-brand-300 hover:text-white transition-colors">
                  <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" /> {val}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Authorized service brands */}
      <div className="border-t border-brand-600/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className="text-[10px] font-bold text-brand-400 uppercase tracking-widest shrink-0 mr-1">Authorized Brands:</span>
          {['Haier','Dawlance','Westpoint','EcoStar','Gree','Hanco','Crown Solar','Ziewnic','Welcome','GFC','Orange LED'].map(b => (
            <span key={b} className="text-[11px] text-brand-300 font-medium">{b}</span>
          ))}
        </div>
      </div>

      <div className="border-t-2 border-gold-500/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-brand-300">© {year} Tajalli&#8217;s Home &amp; Commercial Solutions. All rights reserved.</p>
          <div className="flex gap-4">
            {[['Privacy','/policy/privacy'],['Terms','/policy/terms'],['Warranty','/policy/warranty'],['Refund','/policy/refund']].map(([l,h]) => (
              <Link key={h} to={h} className="text-xs text-brand-300 hover:text-brand-200 transition-colors">{l}</Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
