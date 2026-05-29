import type { Metadata } from 'next'
import { Suspense } from 'react'
import ProductsClient from '@/views/Products'

export const metadata: Metadata = {
  title: "Buy Home Appliances in Karachi on Easy Installments — Tajalli's",
  description: "Shop ACs, refrigerators, washing machines, TVs, solar systems & kitchen appliances in Karachi. Filter by brand (Haier, Dawlance, Gree), budget, and stock. Free delivery & professional installation.",
  keywords: 'buy appliances karachi, home appliances installment karachi, haier dawlance gree karachi, ac fridge washing machine karachi',
  alternates: { canonical: 'https://reliance.tajallis.com.pk/products' },
  openGraph: {
    title: "Buy Home Appliances in Karachi on Easy Installments — Tajalli's",
    description: 'ACs, refrigerators, washing machines, TVs, solar systems and more — all with official warranty, free delivery and installment plans.',
    url: 'https://reliance.tajallis.com.pk/products',
  },
}

export default function ProductsPage() {
  return (
    <Suspense>
      <ProductsClient />
    </Suspense>
  )
}
