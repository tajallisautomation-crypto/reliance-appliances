import type { Metadata } from 'next'
import MYOP from '@/views/MYOP'

export const metadata: Metadata = {
  title: 'Build Your Home Package — Custom Appliance Bundles Karachi | Tajalli\'s',
  description: 'Mix and match ACs, refrigerators, washing machines, solar and UPS into a custom package. Get a combined price with free delivery and installation across Karachi.',
  alternates: { canonical: 'https://reliance.tajallis.com.pk/build-your-package' },
  openGraph: {
    title: 'Build Your Home Package — Custom Appliance Bundles Karachi | Tajalli\'s',
    description: 'Create your own appliance bundle and save. ACs, fridges, washing machines, solar and backup — all in one order.',
    url: 'https://reliance.tajallis.com.pk/build-your-package',
  },
}

export default function Page() { return <MYOP /> }
