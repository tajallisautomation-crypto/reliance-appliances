import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart, Menu, X, Phone, User, Leaf, Search, ChevronDown } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import CartDrawer from '@/components/cart/CartDrawer';
import SearchBar from '@/components/SearchBar';
import { waSales } from '@/lib/whatsapp';

const NAV_LINKS = [
  { label: 'Products',        href: '/products' },
  { label: 'Build a Package', href: '/build-your-package' },
  { label: 'Installments',    href: '/installments' },
  { label: 'Solar',           href: '/solar' },
  { label: 'Solar Packages',  href: '/green-corridor', eco: true },
  { label: 'Buying Guide',    href: '/buying-guide' },
  { label: 'Services',        href: '/services' },
];

const CATEGORY_NAV = [
  { href: '/products?category=air-conditioners',  label: 'Air Conditioners',   icon: '❄️' },
  { href: '/products?category=refrigerators',     label: 'Refrigerators',      icon: '🧊' },
  { href: '/products?category=freezers',          label: 'Freezers',           icon: '🥶' },
  { href: '/products?category=washing-machines',  label: 'Washing Machines',   icon: '👕' },
  { href: '/products?category=televisions',       label: 'Televisions',        icon: '📺' },
  { href: '/solar',                               label: 'Solar',              icon: '☀️' },
  { href: '/products?category=kitchen-appliances',label: 'Kitchen Appliances', icon: '🍳' },
  { href: '/products?category=water-dispensers',  label: 'Water Dispensers',   icon: '💧' },
  { href: '/products?category=small-appliances',  label: 'Small Appliances',   icon: '🔌' },
];

const MOBILE_LINKS = [
  ['Products',             '/products'],
  ['Build a Package 🎁',  '/build-your-package'],
  ['Installments',         '/installments'],
  ['Solar Solutions',      '/solar'],
  ['Solar Packages',       '/green-corridor'],
  ['Solar Calculator',     '/solar-calculator'],
  ['Tools & Calculators',  '/tools'],
  ['Buying Guide',         '/buying-guide'],
  ['Services',             '/services'],
  ['Partner With Us',      '/partner'],
  ['Refer & Earn',         '/referral'],
  ['Support / Complaints', '/support'],
  ['Sales Catalogue',      '/catalog'],
  ['About',                '/about'],
  ['Contact',              '/contact'],
];

export default function Navbar() {
  const [mobileOpen,   setMobileOpen]   = useState(false);
  const [cartOpen,     setCartOpen]     = useState(false);
  const [scrolled,     setScrolled]     = useState(false);
  const [searchOpen,   setSearchOpen]   = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);
  const productsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const location = useLocation();
  const totalItems = useCartStore(s => s.items.reduce((n, i) => n + i.qty, 0));

  const openProducts  = () => { if (productsTimeoutRef.current) clearTimeout(productsTimeoutRef.current); setProductsOpen(true); };
  const closeProducts = () => { productsTimeoutRef.current = setTimeout(() => setProductsOpen(false), 120); };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close mobile menu / search on route change
  useEffect(() => { setMobileOpen(false); setSearchOpen(false); }, [location.pathname]);

  const isActive = (href: string) => location.pathname === href;

  return (
    <>
      <header className={`sticky top-0 z-30 bg-white/95 backdrop-blur-xl transition-shadow duration-200 ${scrolled ? 'shadow-apple-lg' : ''}`}>

        {/* ── Row 1: Logo + Search + Icons ──────────────────────────── */}
        <div className="border-b border-gray-100/80">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2 sm:gap-4 h-14 sm:h-16">

              {/* Logo */}
              <Link to="/" className="flex items-center gap-1.5 sm:gap-2 shrink-0 group" aria-label="Tajalli's — Home page">
                <img
                  src="/tajallis-logo-icon.svg"
                  alt=""
                  aria-hidden="true"
                  className="h-7 w-7 sm:h-9 sm:w-9 transition-transform duration-200 group-hover:scale-105"
                />
                <span className="leading-none select-none">
                  <span className="block font-black text-[18px] text-brand-500 tracking-tight leading-none">
                    Tajalli&#8217;s
                  </span>
                  <span className="hidden sm:block text-[9.5px] font-semibold text-gray-400 mt-0.5 tracking-[0.08em] uppercase">
                    Home &amp; Commercial Solutions
                  </span>
                </span>
              </Link>

              {/* Search — sm+ only, takes all available space between logo and icons */}
              <div className="hidden sm:block flex-1 min-w-0">
                <SearchBar
                  placeholder="Search products, models, brands…"
                  inputClass="bg-gray-50 h-10"
                />
              </div>

              {/* Right icons */}
              <div className="flex items-center gap-0.5 sm:gap-1 ml-auto sm:ml-0 shrink-0">

                {/* Mobile: search toggle — hidden sm+ where inline bar is shown */}
                <button
                  onClick={() => { setSearchOpen(s => !s); setMobileOpen(false); }}
                  aria-label="Search"
                  className="sm:hidden w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
                >
                  {searchOpen ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
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

                {/* Hamburger — hidden on lg+ where nav row is visible */}
                <button
                  onClick={() => { setMobileOpen(m => !m); setSearchOpen(false); }}
                  aria-label="Menu"
                  className="lg:hidden w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
                >
                  {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Row 2: Nav links — lg+ only ───────────────────────────── */}
        <div className="hidden lg:block border-b border-gray-100/60">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <nav className="flex items-center h-10 gap-0.5">
              {NAV_LINKS.map(({ label, href, eco }) =>
                href === '/products' ? (
                  <div key={href} className="relative h-full flex items-center"
                    onMouseEnter={openProducts}
                    onMouseLeave={closeProducts}
                  >
                    <Link to={href}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1 ${
                        isActive(href) ? 'bg-brand-50 text-brand-600 font-semibold' : 'text-gray-600 hover:text-brand-600 hover:bg-brand-50'
                      }`}>
                      {label}
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${productsOpen ? 'rotate-180' : ''}`} />
                    </Link>

                    {productsOpen && (
                      <div
                        className="fixed inset-x-0 z-50 bg-white border-b border-gray-100 shadow-lg"
                        style={{ top: '105px' }}
                        onMouseEnter={openProducts}
                        onMouseLeave={closeProducts}
                      >
                        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-4 grid grid-cols-3 lg:grid-cols-9 gap-2">
                          {CATEGORY_NAV.map(cat => (
                            <Link key={cat.href} to={cat.href}
                              onClick={() => setProductsOpen(false)}
                              className="flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl hover:bg-brand-50 transition-colors text-center group">
                              <span className="text-2xl leading-none">{cat.icon}</span>
                              <span className="text-xs font-semibold text-gray-600 group-hover:text-brand-600 leading-tight">{cat.label}</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <Link key={href} to={href}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${
                      isActive(href)
                        ? 'bg-brand-50 text-brand-600 font-semibold'
                        : eco
                          ? 'text-eco-700 hover:bg-eco-50 hover:text-eco-700'
                          : 'text-gray-600 hover:text-brand-600 hover:bg-brand-50'
                    }`}>
                    {eco && <Leaf className="w-3 h-3" />}
                    {label}
                  </Link>
                )
              )}
            </nav>
          </div>
        </div>

        {/* ── Mobile: search panel ──────────────────────────────────── */}
        {searchOpen && !mobileOpen && (
          <div className="sm:hidden border-b border-gray-100 bg-white px-4 py-3">
            <SearchBar placeholder="Search products, models, brands…" autoFocus />
          </div>
        )}

        {/* ── Mobile: nav menu ─────────────────────────────────────── */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-gray-100 bg-white px-3 py-3 max-h-[80vh] overflow-y-auto no-scrollbar">
            <div className="space-y-0.5">
              {MOBILE_LINKS.map(([label, href]) => (
                <Link key={href} to={href} onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-[15px] font-medium transition-colors min-h-[52px] ${
                    isActive(href)
                      ? 'bg-brand-50 text-brand-600 font-semibold'
                      : href === '/green-corridor'
                        ? 'text-eco-700 hover:bg-eco-50 active:bg-eco-100'
                        : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                  }`}>
                  {href === '/green-corridor' && <Leaf className="w-4 h-4 text-eco-500 flex-shrink-0" />}
                  {label}
                </Link>
              ))}
            </div>
            <div className="pt-3 mt-2 border-t border-gray-100 space-y-1">
              <a href="tel:+923702578788"
                className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-[15px] text-gray-600 font-medium hover:bg-gray-50 active:bg-gray-100 min-h-[52px]">
                <Phone className="h-4 w-4 text-green-500 flex-shrink-0" /> +92 370 2578788
              </a>
            </div>
          </div>
        )}
      </header>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}
