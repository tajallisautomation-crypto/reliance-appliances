import Link from 'next/link'
import { Home, Search, MessageCircle, AirVent, Refrigerator, Shirt, Sun, Tv } from 'lucide-react'

const CATEGORIES = [
  { label: 'Air Conditioners', href: '/products?category=air-conditioners', Icon: AirVent },
  { label: 'Refrigerators',    href: '/products?category=refrigerators',    Icon: Refrigerator },
  { label: 'Washing Machines', href: '/products?category=washing-machines', Icon: Shirt },
  { label: 'Solar & Backup',   href: '/solar',                              Icon: Sun },
  { label: 'Televisions',      href: '/products?category=televisions',      Icon: Tv },
]

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-16 text-center">
      <div className="text-[6rem] font-black text-gray-100 leading-none select-none">404</div>

      <h1 className="text-2xl font-black text-gray-900 mt-2 mb-2">Page not found</h1>
      <p className="text-gray-500 max-w-sm mb-8">
        The page you&apos;re looking for doesn&apos;t exist or may have moved.
        Try browsing a category or searching for a product below.
      </p>

      {/* Search */}
      <form action="/search" method="get" className="w-full max-w-sm mb-10">
        <div className="relative">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
          <input
            name="q"
            type="search"
            placeholder="Search products..."
            aria-label="Search products"
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-400"
          />
        </div>
      </form>

      {/* Categories */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full max-w-lg mb-10">
        {CATEGORIES.map(({ label, href, Icon }) => (
          <Link key={href} href={href}
            className="flex flex-col items-center gap-2 p-4 bg-gray-50 hover:bg-brand-50 border border-gray-100 hover:border-brand-200 rounded-2xl transition-colors text-sm font-medium text-gray-700 hover:text-brand-700">
            <Icon className="w-6 h-6 text-brand-500" />
            {label}
          </Link>
        ))}
      </div>

      {/* CTAs */}
      <div className="flex flex-wrap gap-3 justify-center">
        <Link href="/"
          className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-bold px-5 py-3 rounded-xl transition-colors">
          <Home className="w-4 h-4" /> Go Home
        </Link>
        <a href="https://wa.me/923702578788?text=Hi%2C+I+was+looking+for+a+product+on+your+website+and+need+help."
          target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold px-5 py-3 rounded-xl transition-colors">
          <MessageCircle className="w-4 h-4" /> WhatsApp Us
        </a>
      </div>
    </div>
  )
}
