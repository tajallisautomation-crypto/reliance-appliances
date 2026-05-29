import type { Metadata } from 'next'
import ToolsPage from '@/views/ToolsPage'

export const metadata: Metadata = {
  title: "Free Appliance Tools — Solar Calculator, Package Builder & More | Tajalli's",
  description: "Free tools to help you make smarter appliance decisions — solar system size calculator, custom package builder, installment estimator and buying guides.",
  alternates: { canonical: 'https://reliance.tajallis.com.pk/tools' },
  openGraph: {
    title: "Free Appliance Tools — Solar Calculator, Package Builder & More | Tajalli's",
    description: 'Free tools: solar calculator, package builder, installment estimator. Make smarter buying decisions.',
    url: 'https://reliance.tajallis.com.pk/tools',
  },
}

export default function Page() { return <ToolsPage /> }
