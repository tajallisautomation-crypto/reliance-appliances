import type { Metadata } from 'next'
import CorporatePage from '@/views/Corporate'

export const metadata: Metadata = {
  title: 'B2B & Commercial Appliance Solutions Karachi — Tajalli\'s',
  description: 'Bulk appliance procurement, office cooling, salon backup packages, restaurant equipment and solar for commercial use in Karachi. Volume pricing, priority installation, dedicated support.',
  keywords: 'commercial appliances karachi, b2b appliances karachi, office ac installation karachi, solar for business karachi',
  alternates: { canonical: 'https://reliance.tajallis.com.pk/corporate' },
  openGraph: {
    title: 'B2B & Commercial Appliance Solutions Karachi — Tajalli\'s',
    description: 'Appliances, solar, and backup power solutions for shops, salons, offices and businesses across Karachi. Volume pricing and priority support.',
    url: 'https://reliance.tajallis.com.pk/corporate',
  },
}

export default function Page() { return <CorporatePage /> }
