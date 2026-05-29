import type { Metadata } from 'next'
import ComparePage from '@/views/ComparePage'

export const metadata: Metadata = {
  title: "Compare Appliances Side-by-Side — Tajalli's",
  description: 'Compare AC models, refrigerators, washing machines and other appliances side-by-side. Specs, prices and features compared to help you decide.',
  alternates: { canonical: 'https://reliance.tajallis.com.pk/compare' },
  robots: { index: false, follow: true },
}

export default function Page() { return <ComparePage /> }
