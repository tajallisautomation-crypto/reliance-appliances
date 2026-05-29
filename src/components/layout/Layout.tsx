'use client'

import { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import Navbar from './Navbar'
import Footer from './Footer'
import { CompareBar } from '@/components/CompareButton'
import AnnouncementBanner from '@/components/AnnouncementBanner'
import MobileBottomBar from './MobileBottomBar'
import { MessageCircle } from 'lucide-react'
import { waSales } from '@/lib/whatsapp'
import { useCompareStore } from '@/store/compareStore'
import { trackWhatsAppClick } from '@/lib/analytics'

// Pages that have their own bottom CTA bar (mobile) or are app-like — hide the global WA float to prevent overlap
const HIDE_WA_FLOAT = ['/build-your-package', '/portal', '/admin', '/cart', '/checkout']

export default function Layout({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? ''
  const compareCount = useCompareStore(s => s.items.length)
  // Also hide on product detail pages (/products/:slug) — they have their own sticky bottom bar on mobile
  const isProductDetail = /^\/products\/[^/]+/.test(pathname)
  const showWaFloat  = !isProductDetail && !HIDE_WA_FLOAT.some(p => pathname === p || pathname.startsWith(p + '/'))
  const isPortal     = pathname === '/portal' || pathname.startsWith('/portal/')
  const isAdmin      = pathname === '/admin' || pathname.startsWith('/admin/')

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Skip navigation — visible only on keyboard focus, for screen readers and keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[200] focus:px-4 focus:py-2 focus:bg-brand-500 focus:text-white focus:rounded-xl focus:font-bold focus:text-sm focus:shadow-lg"
      >
        Skip to main content
      </a>
      <AnnouncementBanner />
      <Navbar />
      <main id="main-content" className="flex-1 pb-14 sm:pb-0">{children}</main>
      {isAdmin ? null : isPortal ? (
        <div className="border-t border-gray-100 py-3 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} Tajalli&apos;s Home &amp; Commercial Solutions ·{' '}
          <a href="tel:+923702578788" className="hover:text-brand-500">+92 370 2578788</a>
        </div>
      ) : (
        <Footer />
      )}
      <CompareBar />
      <MobileBottomBar />
      {showWaFloat && (
        <a
          href={waSales()}
          target="_blank"
          rel="noreferrer"
          aria-label="Chat on WhatsApp"
          onClick={() => trackWhatsAppClick('floating-button')}
          className={`hidden sm:flex fixed right-8 z-[60] w-14 h-14 rounded-full bg-green-500 hover:bg-green-600 active:bg-green-700 shadow-lg items-center justify-center transition-all duration-300 ${
            compareCount > 0 ? 'bottom-24' : 'bottom-8'
          }`}
        >
          <MessageCircle className="w-7 h-7 text-white" />
        </a>
      )}
    </div>
  )
}
