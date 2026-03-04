import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Search, Menu, X, Phone, User } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import CartDrawer from '@/components/cart/CartDrawer';
import { waSales } from '@/lib/whatsapp';

export default function Navbar() {
  const [mobileOpen, setMobileOpen]   = useState(false);
  const [cartOpen, setCartOpen]       = useState(false);
  const [searchQ, setSearchQ]         = useState('');
  const totalItems = useCartStore(s => s.items.reduce((n, i) => n + i.qty, 0));
  const navigate   = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQ.trim()) { navigate(`/products?q=${encodeURIComponent(searchQ.trim())}`); setSearchQ(''); }
  };

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 font-black text-lg text-gray-900 shrink-0 mr-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-black"
                style={{ background: 'linear-gradient(135deg,#0070f3,#f5c842)' }}>R</div>
              <span className="hidden sm:inline">Reliance</span>
            </Link>

            {/* Nav links — desktop */}
            <nav className="hidden md:flex items-center gap-1 flex-1">
              {[
                ['Products',     '/products'],
                ['Installments', '/installments'],
                ['Solar',        '/products/solar-solutions'],
                ['Tools',        '/tools'],
                ['Services',     '/services'],
                ['Corporate',    '/corporate'],
              ].map(([label, href]) => (
                <Link key={href} to={href}
                  className="px-3 py-2 rounded-full text-sm font-medium text-gray-600 hover:text-brand-600 hover:bg-brand-50 transition-colors">
                  {label}
                </Link>
              ))}
            </nav>

            {/* Search */}
            <form onSubmit={handleSearch} className="hidden sm:flex flex-1 max-w-xs">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <input
                  value={searchQ} onChange={e => setSearchQ(e.target.value)}
                  placeholder="Search products…"
                  className="pl-9 pr-4 py-2 w-full rounded-full bg-surface-secondary border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>
            </form>

            {/* Right icons */}
            <div className="flex items-center gap-1 ml-auto md:ml-0">
              <a href={waSales()} target="_blank" rel="noreferrer" aria-label="WhatsApp"
                className="hidden sm:flex w-9 h-9 items-center justify-center rounded-full hover:bg-green-50 transition-colors"
                style={{ color: '#25d366' }}>
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
              <button onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menu"
                className="md:hidden w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 transition-colors">
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1">
            <form onSubmit={handleSearch} className="mb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
                  placeholder="Search products…"
                  className="pl-9 pr-4 py-2.5 w-full rounded-full bg-surface-secondary border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
            </form>
            {[
              ['Products','/products'], ['Installments','/installments'],
              ['Solar Solutions','/products/solar-solutions'],
              ['Solar Calculator','/solar-calculator'],
              ['Tools & Calculators','/tools'],
              ['Services','/services'],
              ['Corporate','/corporate'], ['About','/about'], ['Contact','/contact'],
            ].map(([l,h]) => (
              <Link key={h} to={h} onClick={() => setMobileOpen(false)}
                className="block px-3 py-2.5 rounded-apple text-sm font-medium text-gray-700 hover:bg-surface-secondary">
                {l}
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
