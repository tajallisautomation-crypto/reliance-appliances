import type { Metadata } from 'next'
import GalleryPage from '@/views/Gallery'

export const metadata: Metadata = {
  title: 'Installation Gallery — Real Jobs Across Karachi | Tajalli\'s',
  description: 'See real appliance installations by Tajalli\'s — AC installation, solar systems, refrigerators, UPS setups and more. Covering North Karachi, Gulshan, DHA, F.B. Area and beyond.',
  alternates: { canonical: 'https://reliance.tajallis.com.pk/gallery' },
  openGraph: {
    title: 'Installation Gallery — Real Jobs Across Karachi | Tajalli\'s',
    description: 'Photos from real AC, solar, refrigerator and appliance installations completed by Tajalli\'s across Karachi.',
    url: 'https://reliance.tajallis.com.pk/gallery',
  },
}

export default function Page() { return <GalleryPage /> }
