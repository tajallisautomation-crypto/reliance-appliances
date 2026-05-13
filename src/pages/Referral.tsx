import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Gift, Share2, CheckCircle, Users, TrendingUp, Copy, MessageCircle } from 'lucide-react'
import SEO from '../components/ui/SEO'
import { waSales } from '../lib/whatsapp'

const SITE_URL = import.meta.env.VITE_SITE_URL || 'https://tajallis.com.pk'

function generateCode(name: string, phone: string): string {
  const namePart  = name.replace(/\s+/g, '').toUpperCase().slice(0, 4)
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

  // Share message reads as a genuine personal recommendation — no mention of
  // commission, referral programme, or incentive. The ?ref= code is tracked
  // silently on the buyer's end when they click the link.
  const shareMessage = referralLink
    ? `Yaar, mujhe Tajalli's se kafi achi service mili hai — genuine products, easy installments aur free delivery. Ek baar check karo:\n\n${referralLink}`
    : ''

  const waShareUrl = shareMessage
    ? `https://wa.me/?text=${encodeURIComponent(shareMessage)}`
    : ''

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
            Earn <strong className="text-brand-400">2% of every sale</strong> you bring to Tajalli's. No cap, no expiry.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-14 space-y-14">

        {/* How it works */}
        <section>
          <h2 className="text-2xl font-black text-gray-900 text-center mb-10">How It Works</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { icon: Users,     title: 'Get Your Link',  bg: 'bg-blue-100',   fg: 'text-blue-600',   desc: 'Generate your unique link below using your name and phone number.' },
              { icon: Share2,    title: 'Share Naturally', bg: 'bg-brand-100', fg: 'text-brand-600', desc: 'Send it to family or friends looking for appliances — just like a personal recommendation.' },
              { icon: TrendingUp, title: 'Earn 2%',       bg: 'bg-green-100',  fg: 'text-green-600',  desc: 'When they make a purchase, you receive 2% of the total sale amount — paid directly to you.' },
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

        {/* Generator */}
        <section className="bg-gray-50 rounded-3xl p-8 border border-gray-100">
          <h2 className="text-xl font-black text-gray-900 mb-2">Generate Your Link</h2>
          <p className="text-sm text-gray-500 mb-6">
            Your link tracks purchases automatically — nothing changes for the buyer, they just shop normally.
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
            Generate My Link
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

              {/* WhatsApp share */}
              <a
                href={waShareUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-bold text-white bg-wa hover:bg-wa-hover transition-colors">
                <MessageCircle className="w-4 h-4" /> Share Recommendation on WhatsApp
              </a>

              {/* How tracking works — for referrer only */}
              <div className="bg-blue-50 border border-blue-100 rounded-2xl px-5 py-4 text-sm text-blue-700">
                <strong>How tracking works:</strong> When someone clicks your link, their purchases are attributed to you automatically for 30 days — even if they don't buy immediately. You don't need to do anything else.
              </div>

              <p className="text-xs text-gray-400 text-center">
                Commission is tracked manually. WhatsApp us at{' '}
                <a href={waSales()} target="_blank" rel="noreferrer" className="text-brand-500 hover:underline">+92 370 2578788</a> to confirm and collect your earnings.
              </p>
            </div>
          )}
        </section>

        {/* Terms */}
        <section className="border border-gray-100 rounded-2xl p-6">
          <h3 className="font-bold text-gray-900 mb-4">Programme Terms</h3>
          <ul className="space-y-2.5 text-sm text-gray-600">
            {[
              '2% commission is calculated on the total invoice value of the referred sale.',
              'Attribution window is 30 days — purchases within 30 days of clicking your link count.',
              'Commission is paid after the full transaction is completed and payment verified.',
              'Referrals must be customers who have not previously purchased from Tajalli\'s.',
              'Self-referrals are not eligible.',
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
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-white bg-wa hover:bg-wa-hover transition-colors">
            💬 Ask on WhatsApp
          </a>
          <div className="mt-4">
            <Link to="/products" className="text-brand-500 hover:underline text-sm">
              Browse products to refer →
            </Link>
          </div>
        </section>

      </div>
    </div>
  )
}
