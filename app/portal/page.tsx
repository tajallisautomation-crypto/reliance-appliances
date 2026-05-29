import type { Metadata } from 'next'
import PortalPage from '@/views/Portal'

export const metadata: Metadata = {
  title: "My Account — Customer Portal | Tajalli's",
  description: "Manage your Tajalli's orders, track deliveries, view appliance records, and access your loyalty rewards.",
  robots: { index: false, follow: false },
}

export default function Page() { return <PortalPage /> }
