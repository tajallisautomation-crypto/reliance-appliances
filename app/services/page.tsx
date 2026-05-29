import type { Metadata } from 'next'
import ServicesPage from '@/views/Services'

export const metadata: Metadata = {
  title: 'AC Installation, Repair & Maintenance Services Karachi — Tajalli\'s',
  description: 'Professional appliance services in Karachi — AC installation (PKR 3,500), AC repair & cleaning, refrigerator repair, solar installation, annual maintenance contracts. 90-day workmanship guarantee.',
  keywords: 'ac installation karachi, ac repair karachi, refrigerator repair karachi, solar installation karachi, appliance maintenance karachi',
  alternates: { canonical: 'https://reliance.tajallis.com.pk/services' },
  openGraph: {
    title: 'AC Installation, Repair & Maintenance Services Karachi — Tajalli\'s',
    description: 'Certified technicians for AC installation, repair, solar setup, and annual care plans. 90-day workmanship guarantee. Same-day service available in Karachi.',
    url: 'https://reliance.tajallis.com.pk/services',
  },
}

export default function Page() { return <ServicesPage /> }
