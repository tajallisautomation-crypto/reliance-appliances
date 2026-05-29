import type { Metadata } from 'next'
import CartPage from '@/views/Cart'

export const metadata: Metadata = {
  title: "Your Cart — Tajalli's",
  description: "Review your selected appliances and proceed to checkout.",
  robots: { index: false, follow: false },
}

export default function Page() { return <CartPage /> }
