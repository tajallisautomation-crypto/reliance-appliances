import type { Metadata } from 'next'
import dynamic from 'next/dynamic'

export const metadata: Metadata = {
  title: "Admin — Tajalli's",
  robots: { index: false, follow: false },
}

const AdminPortal = dynamic(() => import('@/views/AdminPortal'), { ssr: false })

export default function Page() { return <AdminPortal /> }
