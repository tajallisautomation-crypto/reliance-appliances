'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MessageCircle, Search, ShoppingCart, CreditCard } from 'lucide-react'
import { waSales } from '@/lib/whatsapp'
import { useCartStore } from '@/store/cartStore'
import { trackWhatsAppClick } from '@/lib/analytics'

const HIDE_PATHS = ['/build-your-package', '/portal', '/admin', '/cart', '/checkout']

export default function MobileBottomBar() {
  const pathname   = usePathname() ?? ''
  const cartCount  = useCartStore(s => s.items.reduce((n, i) => n + i.qty, 0))

  const isProductDetail = /^\/products\/[^/]+/.test(pathname)
  if (isProductDetail || HIDE_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    return null
  }

  return (
    <nav
      className="sm:hidden fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-[0_-2px_16px_rgba(0,0,0,0.08)] flex items-stretch"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Quick actions"
    >
      <a
        href={waSales()}
        target="_blank"
        rel="noreferrer"
        onClick={() => trackWhatsAppClick('mobile-bottom-bar')}
        className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-green-600 active:bg-green-50 transition-colors"
        aria-label="Chat on WhatsApp"
      >
        <MessageCircle className="w-[1.2rem] h-[1.2rem]" />
        <span className="text-[9px] font-semibold leading-none">WhatsApp</span>
      </a>

      <Link
        href="/products"
        className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-gray-500 active:bg-gray-50 transition-colors"
        aria-label="Search products"
      >
        <Search className="w-[1.2rem] h-[1.2rem]" />
        <span className="text-[9px] font-semibold leading-none">Search</span>
      </Link>

      <Link
        href="/cart"
        className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-gray-500 active:bg-gray-50 transition-colors"
        aria-label={`Cart${cartCount > 0 ? `, ${cartCount} items` : ''}`}
      >
        <div className="relative">
          <ShoppingCart className="w-[1.2rem] h-[1.2rem]" />
          {cartCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-[14px] h-[14px] bg-brand-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center leading-none">
              {cartCount > 9 ? '9+' : cartCount}
            </span>
          )}
        </div>
        <span className="text-[9px] font-semibold leading-none mt-0.5">Cart</span>
      </Link>

      <Link
        href="/installments"
        className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-gray-500 active:bg-gray-50 transition-colors"
        aria-label="Installment plans"
      >
        <CreditCard className="w-[1.2rem] h-[1.2rem]" />
        <span className="text-[9px] font-semibold leading-none">Installments</span>
      </Link>
    </nav>
  )
}
