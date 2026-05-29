import type { Metadata } from 'next'
import HomeClient from '@/views/Home'

export const metadata: Metadata = {
  title: "Tajalli's Home & Commercial Solutions â€” Appliances & Solar Karachi",
  description:
    "Buy ACs, refrigerators, washing machines, solar systems & kitchen appliances on easy installments in Karachi. Pakistan's most trusted store since 2015. Home delivery & after-sale support.",
  keywords:
    'home appliances karachi, buy ac karachi, solar panels karachi, haier dawlance price pakistan, refrigerator installment karachi, washing machine price karachi, t3 ac karachi',
  openGraph: {
    title: "Tajalli's â€” Home Appliances & Solar Solutions Karachi",
    description:
      "Buy ACs, refrigerators, washing machines & solar systems on easy installments in Karachi.",
    url: 'https://reliance.tajallis.com.pk',
    images: [{ url: '/og-image.svg', width: 1200, height: 630 }],
  },
  alternates: { canonical: 'https://reliance.tajallis.com.pk' },
}

// Revalidate the home page every hour (featured products can change)
export const revalidate = 3600

export default function HomePage() {
  return <HomeClient />
}
