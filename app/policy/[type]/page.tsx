import type { Metadata } from 'next'
import PolicyPage from '@/views/PolicyPage'

const POLICY_META: Record<string, { title: string; description: string }> = {
  returns: {
    title: "Returns & Refund Policy — Tajalli's",
    description: "Tajalli's returns and refund policy — how to return a product, eligible conditions, and refund timelines. Easy returns within 7 days of delivery.",
  },
  warranty: {
    title: "Warranty Policy — Tajalli's",
    description: "Manufacturer warranty terms for appliances purchased at Tajalli's. How to claim warranty, what's covered, and how to contact support.",
  },
  installment: {
    title: "Installment Terms & Conditions — Tajalli's",
    description: "Full terms for Tajalli's installment plans — eligibility, advance requirements, monthly payment schedule, and what happens if a payment is missed.",
  },
  privacy: {
    title: "Privacy Policy — Tajalli's",
    description: "How Tajalli's collects, uses and protects your personal information. We do not sell your data. GDPR and Pakistan data protection compliant.",
  },
  terms: {
    title: "Terms of Service — Tajalli's",
    description: "Terms and conditions governing purchases, deliveries, and services provided by Tajalli's Home & Commercial Solutions in Karachi.",
  },
}

export async function generateMetadata({ params }: { params: { type: string } }): Promise<Metadata> {
  const meta = POLICY_META[params.type] ?? {
    title: "Policy — Tajalli's",
    description: "Tajalli's policies for purchases, returns, warranty and customer rights.",
  }
  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: `https://reliance.tajallis.com.pk/policy/${params.type}` },
    robots: { index: true, follow: true },
  }
}

export default function Page() { return <PolicyPage /> }
