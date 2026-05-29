import type { Metadata } from 'next'
import InstallmentsPage from '@/views/Installments'

export const metadata: Metadata = {
  title: 'Easy Installment Plans for Appliances in Karachi — Tajalli\'s',
  description: 'Buy home appliances on easy installments in Karachi — 2, 3, 6 and 12-month plans with no hidden charges. ACs, refrigerators, washing machines, TVs, solar systems. No bank account needed.',
  keywords: 'appliances installment karachi, ac installment plan karachi, fridge installment karachi, buy on installments karachi',
  alternates: { canonical: 'https://reliance.tajallis.com.pk/installments' },
  openGraph: {
    title: 'Easy Installment Plans for Appliances in Karachi — Tajalli\'s',
    description: '2, 3, 6 and 12-month installment plans on ACs, refrigerators, TVs and more. No bank account needed. Transparent pricing, no hidden charges.',
    url: 'https://reliance.tajallis.com.pk/installments',
  },
}

export default function Page() { return <InstallmentsPage /> }
