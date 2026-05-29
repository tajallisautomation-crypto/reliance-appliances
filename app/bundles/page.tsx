import type { Metadata } from 'next'
import BundlesPage from '@/views/BundlesPage'

export const metadata: Metadata = {
  title: 'Home Appliance Bundle Deals Karachi — Save on Complete Sets | Tajalli\'s',
  description: 'Ready-made appliance bundles for Karachi homes — AC + fridge combos, solar packages, backup power kits. Save on price and delivery when you buy complete sets.',
  alternates: { canonical: 'https://reliance.tajallis.com.pk/bundles' },
  openGraph: {
    title: 'Home Appliance Bundle Deals Karachi — Save on Complete Sets | Tajalli\'s',
    description: 'Pre-configured appliance bundles — save on combined delivery and installation when you buy complete home setups.',
    url: 'https://reliance.tajallis.com.pk/bundles',
  },
}

export default function Page() { return <BundlesPage /> }
