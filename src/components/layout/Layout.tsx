import { ReactNode } from 'react'
import Navbar from './Navbar'
import Footer from './Footer'
import { CompareBar } from '@/components/CompareButton'
import AnnouncementBanner from '@/components/AnnouncementBanner'
import { MessageCircle } from 'lucide-react'
import { waSales } from '@/lib/whatsapp'

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <AnnouncementBanner />
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <CompareBar />
      <a
        href={waSales()}
        target="_blank"
        rel="noreferrer"
        aria-label="Chat on WhatsApp"
        className="fixed bottom-8 right-8 z-40 w-14 h-14 rounded-full bg-green-500 hover:bg-green-600 active:bg-green-700 shadow-lg flex items-center justify-center transition-colors"
      >
        <MessageCircle className="w-7 h-7 text-white" />
      </a>
    </div>
  )
}
