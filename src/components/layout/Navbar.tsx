import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart, Menu, X, Phone, User, Leaf, Search } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import CartDrawer from '@/components/cart/CartDrawer';
import SearchBar from '@/components/SearchBar';
import { waSales } from '@/lib/whatsapp';

const NAV_LINKS = [
  { label: 'Products',        href: '/products' },
  { label: 'Build a Package', href: '/build-your-package' },
  { label: 'Installments',    href: '/installments' },
  { label: 'Solar',           href: '/solar' },
  { label: 'Green Corridor',  href: '/green-corridor', eco: true },
  { label: 'Buying Guide',    href: '/buying-guide' },
  { label: 'Services',        href: '/services' },
];

const MOBILE_LINKS = [
  ['Products',          '/products'],
  ['Build a Package 🎁', '/build-your-package'],
  ['Installments',      '/installments'],
  ['Solar Solutions',   '/solar'],
  ['Green Corridor',    '/green-corridor'],
  ['Solar Calculator',  '/solar-calculator'],
  ['Tools & Calculators', '/tools'],
  ['Buying Guide',      '/buying-guide'],
  ['Services',          '/services'],
  ['Partner With Us',   '/partner'],
  ['Refer & Earn',      '/referral'],
  ['Support / Complaints', '/support'],
  ['Sales Catalogue',   '/catalog'],
  ['About',             '/about'],
  ['Contact',           '/contact'],
];

export default function Navbar() {
  const [mobileOpen,   setMobileOpen]   = useState(false);
  const [cartOpen,     setCartOpen]     = useState(false);
  const [scrolled,     setScrolled]     = useState(false);
  const [searchOpen,   setSearchOpen]   = useState(false);
  const location = useLocation();
  const totalItems = useCartStore(s => s.items.reduce((n, i) => n + i.qty, 0));

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const isActive = (href: string) => location.pathname === href;

  return (
    <>
      <header className={`sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-100/80 transition-shadow duration-200 ${scrolled ? 'shadow-apple-lg' : ''}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 h-16">

            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 shrink-0 mr-2" aria-label="Tajalli's — Home page">
              <img src="/tajallis-logo-icon.svg" alt="" aria-hidden="true" className="h-9 w-9" />
              <span className="hidden sm:block leading-none">
                <span className="block font-black text-[17px] text-[#1b3a6e] tracking-tight leading-none">Tajalli&#8217;s</span>
                <span className="block text-[10px] font-medium text-gray-400 mt-0.5 tracking-wide uppercase">Home &amp; Commercial Solutions</span>
              </span>
            </Link>

            {/* Nav links — desktop */}
            <nav className="hidden lg:flex items-center gap-0.5">
              {NAV_LINKS.map(({ label, href, eco }) => (
                <Link key={href} to={href}
                  className={`px-3 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    isActive(href)
                      ? 'bg-brand-50 text-brand-600 font-semibold'
                      : eco
                        ? 'text-eco-700 hover:bg-eco-50 hover:text-eco-700'
                        : 'text-gray-600 hover:text-brand-600 hover:bg-brand-50'
                  }`}>
                  {eco && <Leaf className="w-3 h-3" />}
                  {label}
                </Link>
              ))}
            </nav>

            {/* Search */}
            <div className="hidden sm:block flex-1 max-w-md">
              <SearchBar placeholder="Search products, models, brands…" inputClass="bg-gray-50" />
            </div>

            {/* Right icons */}
            <div className="flex items-center gap-1 ml-auto sm:ml-0 shrink-0">
              {/* Mobile search toggle — hidden on sm+ where the inline bar is always visible */}
              <button
                onClick={() => { setSearchOpen(s => !s); setMobileOpen(false); }}
                aria-label="Search"
                className="sm:hidden w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
              >
                {searchOpen ? <X className="h-5 w-5" /> : <Search className="h-4 w-4" />}
              </button>

              <a href={waSales()} target="_blank" rel="noreferrer" aria-label="WhatsApp"
                className="hidden sm:flex w-9 h-9 items-center justify-center rounded-full text-green-500 hover:bg-green-50 transition-colors">
                <Phone className="h-4 w-4" />
              </a>
              <Link to="/portal" aria-label="My Account"
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-brand-50 text-gray-500 hover:text-brand-600 transition-colors">
                <User className="h-4 w-4" />
              </Link>
              <button onClick={() => setCartOpen(true)} aria-label={`Cart (${totalItems} items)`}
                className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-brand-50 text-gray-500 hover:text-brand-600 transition-colors">
                <ShoppingCart className="h-4 w-4" />
                {totalItems > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-brand-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </button>
              <button onClick={() => { setMobileOpen(m => !m); setSearchOpen(false); }} aria-label="Menu"
                className="lg:hidden w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 transition-colors">
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile search panel — toggled by search icon */}
        {searchOpen && !mobileOpen && (
          <div className="sm:hidden border-t border-gray-100 bg-white px-4 py-3">
            <SearchBar placeholder="Search products, models, brands…" autoFocus />
          </div>
        )}

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1">
            <div className="mb-3">
              <SearchBar placeholder="Search products…" />
            </div>
            {MOBILE_LINKS.map(([label, href]) => (
              <Link key={href} to={href} onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  href === '/green-corridor'
                    ? 'text-eco-700 hover:bg-eco-50'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}>
                {href === '/green-corridor' && <Leaf className="w-4 h-4 text-eco-500" />}
                {label}
              </Link>
            ))}
            <div className="pt-2 border-t border-gray-100">
              <a href="tel:+923702578788" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600">
                <Phone className="h-4 w-4" /> +92 370 2578788
              </a>
            </div>
          </div>
        )}
      </header>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}
