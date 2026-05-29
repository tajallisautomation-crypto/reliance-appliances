import type { Metadata } from 'next'
import AboutPage from '@/views/About'

export const metadata: Metadata = {
  title: "About Tajalli's — Karachi's Trusted Appliance Partner Since 2015",
  description: "Learn about Tajalli's Home & Commercial Solutions — 11+ years in Karachi, 14,400+ customers served. Genuine products, easy installments, and real after-sale support.",
  alternates: { canonical: 'https://reliance.tajallis.com.pk/about' },
  openGraph: {
    title: "About Tajalli's — Karachi's Trusted Appliance Partner Since 2015",
    description: "11+ years serving Karachi homes and businesses with genuine appliances, solar systems, and professional installation.",
    url: 'https://reliance.tajallis.com.pk/about',
  },
}

export default function Page() { return <AboutPage /> }
