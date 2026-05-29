import type { Metadata } from 'next'
import OffGridSolar from '@/views/OffGridSolar'

export const metadata: Metadata = {
  title: "Off-Grid Solar Systems in Karachi — Complete Battery Backup Solutions | Tajalli's",
  description: 'Off-grid solar systems for Karachi homes and businesses — fully independent from the grid. Battery bank + solar panels + inverter packages. No K-Electric dependency. Professional installation.',
  keywords: 'off grid solar karachi, off grid solar system pakistan, solar battery backup karachi',
  alternates: { canonical: 'https://reliance.tajallis.com.pk/solar/off-grid' },
  openGraph: {
    title: "Off-Grid Solar Systems in Karachi — Complete Battery Backup Solutions | Tajalli's",
    description: 'Fully independent solar with battery storage — eliminate electricity bills completely. Professional installation across Karachi.',
    url: 'https://reliance.tajallis.com.pk/solar/off-grid',
  },
}

export default function Page() { return <OffGridSolar /> }
