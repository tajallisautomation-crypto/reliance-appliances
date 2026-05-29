import type { Metadata } from 'next'
import ReportsPortal from '@/views/ReportsPortal'

export const metadata: Metadata = {
  title: "Reports — Tajalli's",
  robots: { index: false, follow: false },
}

export default function Page() { return <ReportsPortal /> }
