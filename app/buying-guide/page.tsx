import type { Metadata } from 'next'
import BuyingGuide from '@/views/BuyingGuide'

export const metadata: Metadata = {
  title: 'Appliance Buying Guide for Pakistan — How to Choose the Right AC, Fridge & More',
  description: 'Expert buying guides for home appliances in Pakistan — how to choose the right AC size, inverter vs non-inverter, refrigerator capacity, solar system sizing, and more.',
  keywords: 'how to choose ac pakistan, inverter ac guide pakistan, best refrigerator pakistan, appliance buying guide karachi',
  alternates: { canonical: 'https://reliance.tajallis.com.pk/buying-guide' },
  openGraph: {
    title: 'Appliance Buying Guide for Pakistan — How to Choose the Right AC, Fridge & More',
    description: 'Free expert guides on choosing the right appliances for Pakistani homes — AC, refrigerator, solar, UPS and more.',
    url: 'https://reliance.tajallis.com.pk/buying-guide',
  },
}

export default function Page() { return <BuyingGuide /> }
