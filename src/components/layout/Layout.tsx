import { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'
import { CompareBar } from '@/components/CompareButton'
import AnnouncementBanner from '@/components/AnnouncementBanner'
import { MessageCircle } from 'lucide-react'
import { waSales } from '@/lib/whatsapp'
import { useCompareStore } from '@/store/compareStore'

// Pages that have their own bottom CTA bar (mobile) or are app-like — hide the global WA float to prevent overlap
const HIDE_WA_FLOAT = ['/build-your-package', '/portal', '/admin', '/cart', '/checkout']

export default function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const compareCount = useCompareStore(s => s.items.length)
  // Also hide on product detail pages (/products/:slug) — they have their own sticky bottom bar on mobile
  const isProductDetail = /^\/products\/[^/]+/.test(pathname)
  const showWaFloat  = !isProductDetail && !HIDE_WA_FLOAT.some(p => pathname === p || pathname.startsWith(p + '/'))
  const isPortal     = pathname === '/portal' || pathname.startsWith('/portal/')
  const isAdmin      = pathname === '/admin' || pathname.startsWith('/admin/')

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <AnnouncementBanner />
      <Navbar />
      <main className="flex-1">{children}</main>
      {isAdmin ? null : isPortal ? (
        <div className="border-t border-gray-100 py-3 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} Tajalli's Home &amp; Commercial Solutions · <a href="tel:+923702578788" className="hover:text-brand-500">+92 370 2578788</a>
        </div>
      ) : (
        <Footer />
      )}
      <CompareBar />
      {showWaFloat && (
        <a
          href={waSales()}
          target="_blank"
          rel="noreferrer"
          aria-label="Chat on WhatsApp"
          className={`fixed right-4 sm:right-8 z-[60] w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-green-500 hover:bg-green-600 active:bg-green-700 shadow-lg flex items-center justify-center transition-all duration-300 ${
            compareCount > 0 ? 'bottom-20 sm:bottom-24' : 'bottom-5 sm:bottom-8'
          }`}
        >
          <MessageCircle className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
        </a>
      )}
    </div>
  )
}
