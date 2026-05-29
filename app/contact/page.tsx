import type { Metadata } from 'next'
import ContactPage from '@/views/Contact'

export const metadata: Metadata = {
  title: "Contact Tajalli's — Call, WhatsApp or Visit Us in Karachi",
  description: "Get in touch with Tajalli's Home & Commercial Solutions. Call or WhatsApp +92 370 2578788. Showroom at L-152-153 Sector 11C-1, North Karachi. We respond within hours.",
  alternates: { canonical: 'https://reliance.tajallis.com.pk/contact' },
  openGraph: {
    title: "Contact Tajalli's — Call, WhatsApp or Visit Us in Karachi",
    description: "Call or WhatsApp +92 370 2578788 for appliances, solar quotes, or service bookings. North Karachi showroom.",
    url: 'https://reliance.tajallis.com.pk/contact',
  },
}

export default function Page() { return <ContactPage /> }
