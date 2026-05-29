import type { Metadata } from 'next'
import { Suspense } from 'react'
import SearchResults from '@/views/SearchResults'

export const metadata: Metadata = {
  title: "Search Results — Tajalli's",
  description: "Search for appliances, solar systems, brands and models at Tajalli's. Find ACs, refrigerators, washing machines, TVs and more in Karachi.",
  robots: { index: false, follow: true },
}

export default function Page() {
  return (
    <Suspense>
      <SearchResults />
    </Suspense>
  )
}
