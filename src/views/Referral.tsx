'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Gift, Share2, CheckCircle, Users, TrendingUp, Copy,
  MessageCircle, Calculator, ClipboardList,
} from 'lucide-react'
import SEO from '../components/ui/SEO'
import { waSales } from '../lib/whatsapp'
import { WA_SALES, SITE_URL } from '../lib/config'

function generateCode(name: string, phone: string): string {
  const namePart  = name.replace(/\s+/g, '').toUpperCase().slice(0, 4)
  const phonePart = phone.replace(/\D/g, '').slice(-4)
  return `${namePart}${phonePart}`
}

// Earnings calculator helper
function calcEarning(saleAmount: number) {
  return Math.round(saleAmount * 0.02)
}

const EXAMPLES = [
  { product: 'Split AC (1.5 ton)',   price: 150_000 },
  { product: 'Inverter Refrigerator', price: 85_000 },
  { product: 'Home Package (AC + Fridge + Washing Machine)', price: 290_000 },
]

export default function ReferralPage() {
  const [form, setForm]   = useState({ name: '', phone: '' })
  const [code, setCode]   = useState('')
  const [copied, setCopied] = useState(false)

  const handleGenerate = () => {
    if (!form.name.trim() || !form.phone.trim()) return
    setCode(generateCode(form.name, form.phone))
    setCopied(false)
  }

  const referralLink = code ? `${SITE_URL}/?ref=${code}` : ''

  const handleCopy = async () => {
    if (!referralLink) return
    try {
      await navigator.clipboard.writeText(referralLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch { /* silent */ }
  }

  const shareMessage = referralLink
    ? `Yaar, mujhe Tajalli's se kafi achi service mili hai — genuine products, easy installments aur free delivery. Ek baar check karo:\n\n${referralLink}`
    : ''

  const waShareUrl = shareMessage
    ? `https://wa.me/?text=${encodeURIComponent(shareMessage)}`
    : ''

  const waTrackUrl = `https://wa.me/${WA_SALES}?text=${encodeURIComponent(
    `Hi Tajalli's, I'd like to check the status of my referral earnings.\n\nName: ${form.name || '—'}\nPhone: ${form.phone || '—'}\nReferral Code: ${code || '—'}`
  )}`

  return (
    <div className="min-h-screen bg-white">
      <SEO
        title="Refer & Earn — Tajalli's"
        description="Earn 2% commission on every sale you refer to Tajalli's. Share your link, earn rewards."
      />

      {/* Hero */}
      <div className="bg-gray-900 text-white py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="w-16 h-16 bg-brand-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Gift className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl md:text-5xl font-black mb-4">Refer & Earn</h1>
          <p className="text-gray-400 text-lg">
            Earn <strong className="text-brand-300">2% of every sale</strong> you bring to Tajalli's. No cap, no expiry.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-14 space-y-14">

        {/* How it works */}
        <section>
          <h2 className="text-2xl font-black text-gray-900 text-center mb-10">How It Works</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { icon: Users,      title: 'Get Your Link',   bg: 'bg-blue-100',   fg: 'text-blue-600',   desc: 'Generate your unique referral link below using your name and phone number.' },
              { icon: Share2,     title: 'Share Naturally', bg: 'bg-brand-100',  fg: 'text-brand-600',  desc: 'Send it to family or friends looking for appliances — like a personal recommendation.' },
              { icon: TrendingUp, title: 'Earn 2%',         bg: 'bg-green-100',  fg: 'text-green-600',  desc: 'When they make a purchase and payment is complete, you receive 2% paid directly to you.' },
            ].map(item => (
              <div key={item.title} className="text-center p-6 bg-gray-50 rounded-2xl">
                <div className={`w-12 h-12 ${item.bg} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                  <item.icon className={`w-6 h-6 ${item.fg}`} />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Earnings example */}
        <section className="bg-gradient-to-br from-brand-50 to-blue-50 border border-brand-100 rounded-3xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center">
              <Calculator className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-black text-gray-900">What You Can Earn</h2>
          </div>
          <div className="space-y-3 mb-5">
            {EXAMPLES.map(ex => (
              <div key={ex.product} className="flex items-center justify-between bg-white rounded-2xl px-5 py-3.5 border border-brand-100">
                <div>
                  <p className="font-semibold text-sm text-gray-800">{ex.product}</p>
                  <p className="text-xs text-gray-400">Sale value: PKR {ex.price.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-green-700 text-lg">PKR {calcEarning(ex.price).toLocaleString()}</p>
                  <p className="text-xs text-gray-400">your reward</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500">
            Rewards are paid after full payment is completed and delivery/installation is confirmed. Installment sales are paid after account verification and payment clearance.
          </p>
        </section>

        {/* Generator */}
        <section className="bg-gray-50 rounded-3xl p-8 border border-gray-100">
          <h2 className="text-xl font-black text-gray-900 mb-2">Generate Your Referral Link</h2>
          <p className="text-sm text-gray-500 mb-6">
            Your link tracks purchases automatically for 30 days — nothing changes for the buyer, they just shop normally.
          </p>
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Your Full Name</label>
              <input
                type="text"
                placeholder="e.g. Ali Hassan"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-400"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Your Phone Number</label>
              <input
                type="tel"
                placeholder="03XX XXXXXXX"
                value={form.phone}
                onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-400"
              />
            </div>
          </div>
          <button
            onClick={handleGenerate}
            disabled={!form.name.trim() || !form.phone.trim()}
            className="w-full sm:w-auto bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white px-8 py-3 rounded-xl font-bold text-sm transition-colors">
            Generate My Referral Link
          </button>

          {code && (
            <div className="mt-6 space-y-3">
              {/* Link display */}
              <div className="flex gap-2">
                <div className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-600 font-mono truncate">
                  {referralLink}
                </div>
                <button
                  onClick={handleCopy}
                  className={`flex items-center gap-1.5 px-4 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                    copied ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}>
                  {copied ? <><CheckCircle className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy</>}
                </button>
              </div>

              {/* Action buttons */}
              <div className="grid sm:grid-cols-2 gap-3">
                <a
                  href={waShareUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-white bg-[#25D366] hover:bg-[#1fb857] transition-colors">
                  <Share2 className="w-4 h-4" /> Share on WhatsApp
                </a>
                <a
                  href={waTrackUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-gray-800 bg-gray-100 hover:bg-gray-200 transition-colors">
                  <ClipboardList className="w-4 h-4" /> Track My Referrals
                </a>
              </div>

              {/* Tracking info */}
              <div className="bg-blue-50 border border-blue-100 rounded-2xl px-5 py-4 text-sm text-blue-700">
                <strong>How tracking works:</strong> When someone clicks your link, their purchases are attributed to you automatically for 30 days — even if they don't buy immediately. Commission is confirmed and paid via WhatsApp after each verified sale.
              </div>

              <p className="text-xs text-gray-400 text-center">
                To collect earnings, WhatsApp us at{' '}
                <a href={waSales()} target="_blank" rel="noreferrer" className="text-brand-500 hover:underline">+92 370 2578788</a> with your referral code.
              </p>
            </div>
          )}
        </section>

        {/* Programme Rules */}
        <section className="border border-gray-100 rounded-2xl p-6">
          <h3 className="font-bold text-gray-900 mb-4">Programme Rules</h3>
          <ul className="space-y-2.5 text-sm text-gray-600">
            {[
              'Referral must be submitted before the customer purchases — late claims are not eligible.',
              'Reward is paid only after full payment is completed and delivery/installation is confirmed.',
              'Installment sales are paid after account verification and payment clearance.',
              'Self-referrals are not eligible.',
              'Duplicate referrals for the same customer are not eligible.',
              'Tajalli\'s reserves the right to reject fraudulent or repeated fake referrals.',
              '2% commission is calculated on the total invoice value of the referred sale.',
              'Attribution window is 30 days — purchases within 30 days of clicking your link count.',
              'Commission is transferred via EasyPaisa, JazzCash, or bank transfer — your choice.',
              'Tajalli\'s reserves the right to modify programme terms with 30-day notice.',
            ].map(term => (
              <li key={term} className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                {term}
              </li>
            ))}
          </ul>
        </section>

        {/* CTA */}
        <section className="text-center">
          <p className="text-gray-500 text-sm mb-4">Questions about the referral programme?</p>
          <a href={waSales('Hi, I\'d like to know more about the referral programme')} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-white bg-[#25D366] hover:bg-[#1fb857] transition-colors">
            <MessageCircle className="w-4 h-4" /> Ask on WhatsApp
          </a>
          <div className="mt-4">
            <Link href="/products" className="text-brand-500 hover:underline text-sm">
              Browse products to refer →
            </Link>
          </div>
        </section>

      </div>
    </div>
  )
}
