'use client'

import { useState } from 'react'
import { Copy, CheckCircle, MessageCircle, Gift, TrendingUp } from 'lucide-react'
import { waSales } from '@/lib/whatsapp'
import { SITE_URL } from '@/lib/config'
import type { PortalData } from './portalTypes'

const fmtPKR  = (n: number) => 'PKR ' + Math.round(n || 0).toLocaleString('en-PK')
const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })

const STATUS_STYLES = {
  pending:   'bg-amber-100 text-amber-700',
  confirmed: 'bg-blue-100 text-blue-700',
  paid:      'bg-green-100 text-green-700',
}

export default function PortalReferrals({ profile, referralEarnings }: PortalData) {
  const [copied, setCopied] = useState(false)

  const code = profile?.referral_code ?? ''
  const link = code ? `${SITE_URL}/?ref=${code}` : ''

  const shareMsg = link
    ? `Yaar, mujhe Tajalli's se kafi achi service mili hai — genuine products, easy installments aur free delivery. Ek baar check karo:\n\n${link}`
    : ''

  const totalPending   = referralEarnings.filter(r => r.status === 'pending').reduce((s, r) => s + (r.commission_amount ?? 0), 0)
  const totalConfirmed = referralEarnings.filter(r => r.status === 'confirmed').reduce((s, r) => s + (r.commission_amount ?? 0), 0)
  const totalPaid      = referralEarnings.filter(r => r.status === 'paid').reduce((s, r) => s + (r.commission_amount ?? 0), 0)

  const copyLink = () => {
    if (!link) return
    navigator.clipboard.writeText(link).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500) })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-bold text-gray-900 text-lg">Referral Earnings</h2>
        <p className="text-sm text-gray-500">Earn 2% on every sale you refer. No cap, no expiry.</p>
      </div>

      {/* Referral code + link */}
      <div className="bg-gradient-to-br from-brand-500 to-brand-700 text-white rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-1">
          <Gift className="w-5 h-5" />
          <p className="font-bold">Your Referral Code</p>
        </div>
        <p className="text-3xl font-black tracking-widest mb-4">{code || '—'}</p>
        {link && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <div className="flex-1 bg-white/10 rounded-xl px-4 py-2.5 text-sm font-mono truncate">{link}</div>
              <button onClick={copyLink}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors flex-shrink-0 ${copied ? 'bg-green-400 text-white' : 'bg-white/20 hover:bg-white/30 text-white'}`}>
                {copied ? <><CheckCircle className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy</>}
              </button>
            </div>
            <a href={`https://wa.me/?text=${encodeURIComponent(shareMsg)}`} target="_blank" rel="noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-wa hover:bg-wa-hover py-3 rounded-xl font-bold text-sm text-white transition-colors">
              <MessageCircle className="w-4 h-4" /> Share on WhatsApp
            </a>
          </div>
        )}
      </div>

      {/* Earnings summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Pending',   value: totalPending,   color: 'text-amber-600',  bg: 'bg-amber-50'  },
          { label: 'Confirmed', value: totalConfirmed, color: 'text-blue-600',   bg: 'bg-blue-50'   },
          { label: 'Paid Out',  value: totalPaid,      color: 'text-green-600',  bg: 'bg-green-50'  },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-4 text-center`}>
            <p className={`text-lg font-black ${s.color}`}>{fmtPKR(s.value)}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Earnings table */}
      {referralEarnings.length > 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100">
            <TrendingUp className="w-4 h-4 text-brand-500" />
            <p className="font-bold text-gray-900 text-sm">Earnings History</p>
          </div>
          <div className="divide-y divide-gray-50">
            {referralEarnings.map(r => (
              <div key={r.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm text-gray-700">{r.order_id ? `Order ${r.order_id.slice(0, 8).toUpperCase()}` : 'Referral'}</p>
                  <p className="text-xs text-gray-400">{fmtDate(r.created_at)}</p>
                  {r.order_amount && <p className="text-xs text-gray-400">Sale: {fmtPKR(r.order_amount)}</p>}
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">{r.commission_amount ? fmtPKR(r.commission_amount) : '—'}</p>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[r.status]}`}>{r.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-10 text-gray-400">
          <Gift className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-semibold text-gray-600">No referrals yet</p>
          <p className="text-sm mt-1">Share your link and earn 2% when someone buys.</p>
        </div>
      )}

      {/* Collect earnings CTA */}
      {totalConfirmed > 0 && (
        <a href={waSales(`Hi! I'd like to collect my confirmed referral commission of ${fmtPKR(totalConfirmed)}. My referral code is ${code}.`)} target="_blank" rel="noreferrer"
          className="flex items-center justify-center gap-2 w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3.5 rounded-2xl text-sm transition-colors">
          <MessageCircle className="w-4 h-4" /> Collect {fmtPKR(totalConfirmed)} Confirmed Earnings
        </a>
      )}

      <div className="text-xs text-gray-400 text-center">
        2% commission is calculated on the total sale value. Commission is paid via EasyPaisa, JazzCash, or bank transfer after order is completed and verified.
      </div>
    </div>
  )
}
