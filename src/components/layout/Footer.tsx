import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, Leaf, Facebook } from 'lucide-react';

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
        {/* Brand */}
        <div className="col-span-2 md:col-span-1">
          <div className="mb-5">
            <img
              src="/tajallis-logo-white.svg"
              alt="Tajalli's Home & Commercial Solutions"
              className="h-24 w-auto"
              loading="lazy"
            />
          </div>
          <p className="text-sm text-gray-400 leading-relaxed mb-4">
            Karachi's most trusted appliance partner since 2015. Serving 14,400+ clients — homes, offices & businesses — with genuine products and real after-sales support.
          </p>
          <div className="flex gap-2">
            <a href="https://www.facebook.com/tajallishomecollection/" target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors">
              <Facebook className="h-4 w-4" /> Facebook
            </a>
          </div>
        </div>

        {/* Products */}
        <div>
          <h3 className="font-bold text-sm uppercase tracking-wider text-gray-300 mb-3">Products</h3>
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
                <Link to={to} className="text-sm text-gray-400 hover:text-white transition-colors">{label}</Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Services */}
        <div>
          <h3 className="font-bold text-sm uppercase tracking-wider text-gray-300 mb-3">Services</h3>
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
                  className={`text-sm transition-colors flex items-center gap-1.5 ${h === '/green-corridor' ? 'text-eco-400 hover:text-eco-300' : 'text-gray-400 hover:text-white'}`}>
                  {h === '/green-corridor' && <Leaf className="w-3 h-3" />}{l}
                </Link>
              </li>
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
              { icon: Mail,  val: 'sales@tajallis.com.pk',   href: 'mailto:sales@tajallis.com.pk' },
              { icon: Mail,  val: 'support@tajallis.com.pk', href: 'mailto:support@tajallis.com.pk' },
              { icon: MapPin, val: 'Karachi, Pakistan', href: 'https://maps.google.com/?q=Karachi,Pakistan' },
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
          <p className="text-xs text-gray-500">© {year} Tajalli&#8217;s Home &amp; Commercial Solutions. All rights reserved.</p>
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
