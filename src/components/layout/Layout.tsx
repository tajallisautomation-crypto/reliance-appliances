import { ReactNode } from 'react'
import Navbar from './Navbar'
import Footer from './Footer'
import { CompareBar } from '@/components/CompareButton'
import AnnouncementBanner from '@/components/AnnouncementBanner'

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <AnnouncementBanner />
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <CompareBar />
    </div>
  )
}
