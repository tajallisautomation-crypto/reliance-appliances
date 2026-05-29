import type { Metadata } from 'next'
import GreenCorridor from '@/views/GreenCorridor'

export const metadata: Metadata = {
  title: 'Green Corridor — Solar, Inverter ACs & Energy Savings Karachi | Tajalli\'s',
  description: 'Cut your electricity bill with Tajalli\'s Green Corridor — inverter ACs, solar panels, battery backup and UPS combined into one complete energy strategy for Karachi homes and businesses.',
  keywords: 'reduce electricity bill karachi, inverter ac karachi, solar ups battery karachi, energy saving appliances karachi',
  alternates: { canonical: 'https://reliance.tajallis.com.pk/green-corridor' },
  openGraph: {
    title: 'Green Corridor — Solar, Inverter ACs & Energy Savings Karachi | Tajalli\'s',
    description: 'A complete strategy to reduce Karachi electricity bills — inverter ACs, solar systems, and battery backup working together.',
    url: 'https://reliance.tajallis.com.pk/green-corridor',
  },
}

export default function Page() { return <GreenCorridor /> }
