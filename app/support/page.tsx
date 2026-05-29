import type { Metadata } from 'next'
import SupportPage from '@/views/Support'

export const metadata: Metadata = {
  title: 'Customer Support — Warranty, Returns & After-Sale Help | Tajalli\'s',
  description: 'Get help with your Tajalli\'s order — warranty claims, product support, delivery tracking, returns and service bookings. Call or WhatsApp +92 370 2578788.',
  alternates: { canonical: 'https://reliance.tajallis.com.pk/support' },
  openGraph: {
    title: 'Customer Support — Warranty, Returns & After-Sale Help | Tajalli\'s',
    description: 'Warranty claims, delivery support, and after-sale service for all Tajalli\'s orders. We respond within hours.',
    url: 'https://reliance.tajallis.com.pk/support',
  },
}

export default function Page() { return <SupportPage /> }
