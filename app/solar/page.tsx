import type { Metadata } from 'next'
import SolarPage from '@/views/SolarPage'

export const metadata: Metadata = {
  title: 'Solar Panel Systems in Karachi — On-Grid, Hybrid & Off-Grid | Tajalli\'s',
  description: 'Buy solar systems in Karachi on easy installments. 3kW to 12kW on-grid and hybrid systems. Crown inverters, Jinko/Longi panels. Free site assessment & professional installation.',
  keywords: 'solar panels karachi, solar system price pakistan, on-grid solar karachi, hybrid solar karachi, solar installment karachi',
  alternates: { canonical: 'https://reliance.tajallis.com.pk/solar' },
  openGraph: {
    title: 'Solar Panel Systems in Karachi — On-Grid, Hybrid & Off-Grid | Tajalli\'s',
    description: '3kW to 12kW solar systems for homes and businesses in Karachi. Free site assessment, professional installation, easy installment plans.',
    url: 'https://reliance.tajallis.com.pk/solar',
  },
}

export default function Page() { return <SolarPage /> }
