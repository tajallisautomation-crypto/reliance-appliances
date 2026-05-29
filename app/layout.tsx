import type { Metadata } from 'next'
import './globals.css'
import ClientProviders from '@/components/providers/ClientProviders'
import Layout from '@/components/layout/Layout'

export const metadata: Metadata = {
  metadataBase: new URL('https://reliance.tajallis.com.pk'),
  title: {
    default: "Tajalli's — Home Appliances & Solar Solutions Karachi",
    template: "%s | Tajalli's",
  },
  description:
    "Buy ACs, Refrigerators, Washing Machines & Solar Systems on easy installments in Karachi. Pakistan's most trusted store since 2015.",
  keywords:
    'home appliances karachi, buy ac karachi, solar panels karachi, haier dawlance price pakistan, refrigerator installment karachi',
  openGraph: {
    type: 'website',
    locale: 'en_PK',
    url: 'https://reliance.tajallis.com.pk',
    siteName: "Tajalli's Home & Commercial Solutions",
    images: [{ url: '/og-image.svg', width: 1200, height: 630, alt: "Tajalli's" }],
  },
  twitter: { card: 'summary_large_image' },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
}

const LOCAL_BUSINESS_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': ['LocalBusiness', 'Store'],
  '@id': 'https://reliance.tajallis.com.pk/#organization',
  name: "Tajalli's Home & Commercial Solutions",
  alternateName: "Tajalli's",
  url: 'https://reliance.tajallis.com.pk',
  logo: 'https://reliance.tajallis.com.pk/tajallis-logo-icon.svg',
  image: 'https://reliance.tajallis.com.pk/og-image.svg',
  telephone: '+923702578788',
  email: 'sales@tajallis.com.pk',
  foundingDate: '2015',
  priceRange: '$$',
  currenciesAccepted: 'PKR',
  paymentAccepted: 'Cash, Bank Transfer, Installment',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'L-152-153, Sector 11C-1, UP More',
    addressLocality: 'North Karachi',
    addressRegion: 'Karachi',
    addressCountry: 'PK',
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: 24.9748,
    longitude: 67.0595,
  },
  areaServed: [
    'North Karachi', 'Federal B Area', 'Gulshan-e-Iqbal', 'Gulistan-e-Johar',
    'North Nazimabad', 'Nazimabad', 'DHA', 'Clifton', 'PECHS', 'Malir',
    'Korangi', 'Saddar', 'Orangi Town', 'Surjani Town', 'Landhi',
  ].map(name => ({ '@type': 'City', name })),
  openingHoursSpecification: [
    { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'], opens: '10:00', closes: '20:00' },
    { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Sunday'], opens: '11:00', closes: '18:00' },
  ],
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Home Appliances & Solar Solutions',
    itemListElement: [
      'Air Conditioners', 'Refrigerators', 'Washing Machines', 'Freezers',
      'Televisions', 'Solar Systems', 'UPS & Batteries', 'Kitchen Appliances',
    ].map(name => ({ '@type': 'Offer', itemOffered: { '@type': 'Product', name } })),
  },
  sameAs: [
    'https://www.facebook.com/tajallishomecollection/',
    'https://www.instagram.com/tajallis.pk/',
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-PK">
      {/*
        Fonts are loaded via <link> in the HTML head so they're available to Tailwind's
        font-family utilities ('Inter', 'Poppins') without next/font rewriting class names.
      */}
      <head>
        {/* Critical resource hints */}
        <link rel="preload" href="/tajallis-logo-icon.svg" as="image" type="image/svg+xml" />
        <link rel="preload" href="/tajallis-logo-white.svg" as="image" type="image/svg+xml" />
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="dns-prefetch" href="//fonts.gstatic.com" />
        <link rel="dns-prefetch" href="//lh3.googleusercontent.com" />
        <link rel="dns-prefetch" href="//drive.google.com" />
        {/* Supabase storage CDN — exact project subdomain is runtime-only so we prefetch the root */}
        <link rel="dns-prefetch" href="//supabase.co" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@600;700;800;900&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(LOCAL_BUSINESS_SCHEMA) }}
        />
        {/* Plausible Analytics — privacy-friendly, GDPR-compliant, no cookies */}
        <script
          defer
          data-domain="reliance.tajallis.com.pk"
          src="https://plausible.io/js/script.js"
        />
      </head>
      <body>
        <ClientProviders>
          {/*
            Layout is 'use client' (needs usePathname for WA float / footer logic).
            children are server components — Next.js passes them through the client
            boundary via the "children as props" pattern, preserving RSC payloads.
          */}
          <Layout>{children}</Layout>
        </ClientProviders>
      </body>
    </html>
  )
}
