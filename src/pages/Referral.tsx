import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Gift, Share2, CheckCircle, Users, TrendingUp, Copy, MessageCircle } from 'lucide-react'
import SEO from '../components/ui/SEO'

const SITE_URL = import.meta.env.VITE_SITE_URL || 'https://reliance.tajallis.com.pk'

function generateCode(name: string, phone: string): string {
  const namePart = name.replace(/\s+/g, '').toUpperCase().slice(0, 4)
  const phonePart = phone.replace(/\D/g, '').slice(-4)
  return `${namePart}${phonePart}`
}

export default function ReferralPage() {
  const [form, setForm] = useState({ name: '', phone: '' })
  const [code, setCode] = useState('')
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

  const waShareText = referralLink
    ? encodeURIComponent(
        `🎁 Buy home appliances from Reliance on easy installments — up to 12 payments, no bank required.\n\nUse my referral link: ${referralLink}`
      )
    : ''

  return (
    <div className="min-h-screen bg-white">
      <SEO
        title="Referral Program — Reliance Appliances"
        description="Earn 1% commission on every sale you refer to Reliance Appliances. Share your link, earn rewards."
      />

      {/* Hero */}
      <div className="bg-gray-900 text-white py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="w-16 h-16 bg-orange-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Gift className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl md:text-5xl font-black mb-4">Refer & Earn</h1>
          <p className="text-gray-400 text-lg">
            Earn <strong className="text-orange-400">1% of every sale</strong> you bring to Reliance. No cap, no expiry.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-14 space-y-14">

        {/* How it works */}
        <section>
          <h2 className="text-2xl font-black text-gray-900 text-center mb-10">How It Works</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { icon: Users, title: 'Get Your Link', desc: 'Generate your unique referral link below using your name and phone number.', color: 'blue' },
              { icon: Share2, title: 'Share It', desc: 'Send your link to family, friends, or colleagues who are looking for appliances.', color: 'orange' },
              { icon: TrendingUp, title: 'Earn 1%', desc: 'When they make a purchase, you receive 1% of the total sale amount — paid to you directly.', color: 'green' },
            ].map(item => (
              <div key={item.title} className="text-center p-6 bg-gray-50 rounded-2xl">
                <div className={`w-12 h-12 bg-${item.color}-100 rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                  <item.icon className={`w-6 h-6 text-${item.color}-600`} />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Generator */}
        <section className="bg-gray-50 rounded-3xl p-8 border border-gray-100">
          <h2 className="text-xl font-black text-gray-900 mb-6">Generate Your Referral Link</h2>
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Your Full Name</label>
              <input
                type="text"
                placeholder="e.g. Ali Hassan"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Your Phone Number</label>
              <input
                type="tel"
                placeholder="03XX XXXXXXX"
                value={form.phone}
                onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400"
              />
            </div>
          </div>
          <button
            onClick={handleGenerate}
            disabled={!form.name.trim() || !form.phone.trim()}
            className="w-full sm:w-auto bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white px-8 py-3 rounded-xl font-bold text-sm transition-colors">
            Generate My Link
          </button>

          {code && (
            <div className="mt-6 space-y-3">
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1 font-medium">Your referral code</p>
                <p className="text-2xl font-black text-gray-900 tracking-wider">{code}</p>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-600 font-mono truncate">
                  {referralLink}
                </div>
                <button
                  onClick={handleCopy}
                  className={`flex items-center gap-1.5 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                    copied ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}>
                  {copied ? <><CheckCircle className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy</>}
                </button>
              </div>
              <a
                href={`https://wa.me/?text=${waShareText}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-bold text-white transition-opacity hover:opacity-90"
                style={{ background: '#25d366' }}>
                <MessageCircle className="w-4 h-4" /> Share on WhatsApp
              </a>
              <p className="text-xs text-gray-400 text-center">
                Share this link anywhere. Commission is tracked manually — WhatsApp us at{' '}
                <a href="https://wa.me/923702578788" className="text-orange-500 hover:underline">+92 370 2578788</a> to confirm your referrals.
              </p>
            </div>
          )}
        </section>

        {/* Terms */}
        <section className="border border-gray-100 rounded-2xl p-6">
          <h3 className="font-bold text-gray-900 mb-4">Programme Terms</h3>
          <ul className="space-y-2.5 text-sm text-gray-600">
            {[
              '1% commission is calculated on the total invoice value of the referred sale.',
              'Commission is paid after the full transaction is completed and payment verified.',
              'Referrals must be new customers who have not previously purchased from Reliance.',
              'Self-referrals are not eligible.',
              'Commission is transferred via EasyPaisa, JazzCash, or bank transfer — your choice.',
              'Reliance reserves the right to modify programme terms with 30-day notice.',
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
          <a href="https://wa.me/923702578788?text=Hi%2C%20I%27d%20like%20to%20know%20more%20about%20the%20referral%20programme"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-white"
            style={{ background: '#25d366' }}>
            💬 Ask on WhatsApp
          </a>
          <div className="mt-4">
            <Link to="/products" className="text-orange-500 hover:underline text-sm">
              Browse products to refer →
            </Link>
          </div>
        </section>

      </div>
    </div>
  )
}
