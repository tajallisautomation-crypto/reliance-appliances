import type { Metadata } from 'next'
import ReferralPage from '@/views/Referral'

export const metadata: Metadata = {
  title: 'Refer & Earn — Get Rewarded for Every Referral | Tajalli\'s',
  description: 'Refer a friend to Tajalli\'s and earn a reward for every successful purchase. Easy to join, no limits on earnings. Available across Karachi.',
  alternates: { canonical: 'https://reliance.tajallis.com.pk/referral' },
  openGraph: {
    title: 'Refer & Earn — Get Rewarded for Every Referral | Tajalli\'s',
    description: 'Earn rewards every time someone you refer buys from Tajalli\'s. Share your referral link and track your earnings.',
    url: 'https://reliance.tajallis.com.pk/referral',
  },
}

export default function Page() { return <ReferralPage /> }
