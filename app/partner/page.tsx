import type { Metadata } from 'next'
import PartnerPage from '@/views/Partner'

export const metadata: Metadata = {
  title: 'Partner With Tajalli\'s — Become a Dealer or Referral Partner',
  description: 'Join Tajalli\'s partner network in Karachi. Earn commissions as a dealer or referral partner for home appliances, solar systems, and commercial solutions.',
  alternates: { canonical: 'https://reliance.tajallis.com.pk/partner' },
  openGraph: {
    title: 'Partner With Tajalli\'s — Become a Dealer or Referral Partner',
    description: 'Earn by referring customers or become a Tajalli\'s dealer. Apply online — open to individuals, shops and businesses across Karachi.',
    url: 'https://reliance.tajallis.com.pk/partner',
  },
}

export default function Page() { return <PartnerPage /> }
