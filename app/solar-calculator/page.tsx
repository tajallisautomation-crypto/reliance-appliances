import type { Metadata } from 'next'
import SolarCalculator from '@/views/SolarCalculator'

export const metadata: Metadata = {
  title: 'Solar System Size Calculator for Pakistan — Free Tool | Tajalli\'s',
  description: 'Calculate the right solar system size for your Karachi home or business. Enter your monthly bill and get an instant recommendation — system size, estimated cost, and monthly savings.',
  keywords: 'solar calculator pakistan, solar system size calculator, how much solar do i need karachi',
  alternates: { canonical: 'https://reliance.tajallis.com.pk/solar-calculator' },
  openGraph: {
    title: 'Solar System Size Calculator for Pakistan — Free Tool | Tajalli\'s',
    description: 'Free solar calculator — find out what size system you need and how much you\'ll save on your Karachi electricity bill.',
    url: 'https://reliance.tajallis.com.pk/solar-calculator',
  },
}

export default function Page() { return <SolarCalculator /> }
