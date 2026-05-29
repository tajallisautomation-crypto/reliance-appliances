import type { Metadata } from 'next'
import CheckoutPage from '@/views/Checkout'

export const metadata: Metadata = {
  title: "Checkout — Tajalli's",
  description: "Complete your appliance order from Tajalli's. Choose delivery address, payment method and installment plan.",
  robots: { index: false, follow: false },
}

export default function Page() { return <CheckoutPage /> }
