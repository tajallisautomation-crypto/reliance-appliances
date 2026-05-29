'use client'

import { useState } from 'react'
import { Save, Lock, LogOut, Loader2, Eye, EyeOff } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { updatePassword } from '@/lib/auth'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'
import type { PortalData } from './portalTypes'

export default function PortalAccount({ profile, reload }: PortalData) {
  const { signOut } = useAuthStore()

  const [form, setForm] = useState({
    full_name:    profile?.full_name ?? '',
    phone:        profile?.phone ?? '',
    city:         profile?.city ?? '',
    address:      profile?.address ?? '',
    address_type: (profile?.address_type ?? 'residence') as 'residence' | 'office',
  })
  const [saving, setSaving] = useState(false)

  const [pw, setPw]         = useState({ current: '', next: '', confirm: '' })
  const [showPw, setShowPw] = useState(false)
  const [pwSaving, setPwSaving] = useState(false)

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    const { error } = await supabase.from('customer_profiles').upsert({
      user_id:      user.id,
      full_name:    form.full_name.trim(),
      phone:        form.phone.trim(),
      city:         form.city.trim(),
      address:      form.address.trim(),
      address_type: form.address_type,
    }, { onConflict: 'user_id' })
    setSaving(false)
    if (error) { toast.error('Could not save profile.'); return }
    toast.success('Profile updated!')
    reload()
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pw.next.length < 8)          { toast.error('Password must be at least 8 characters.'); return }
    if (pw.next !== pw.confirm)      { toast.error('Passwords do not match.'); return }
    setPwSaving(true)
    try {
      await updatePassword(pw.next)
      toast.success('Password updated!')
      setPw({ current: '', next: '', confirm: '' })
    } catch (err: any) {
      toast.error(err.message || 'Could not update password.')
    } finally { setPwSaving(false) }
  }

  return (
    <div className="space-y-7">
      <div>
        <h2 className="font-bold text-gray-900 text-lg">Account Settings</h2>
        <p className="text-sm text-gray-500">Update your profile details and password.</p>
      </div>

      {/* Profile form */}
      <form onSubmit={handleSaveProfile} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
        <p className="font-semibold text-gray-800 text-sm">Profile Details</p>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Full Name</label>
            <input value={form.full_name} onChange={e => set('full_name', e.target.value)}
              placeholder="Ali Hassan" autoComplete="name"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-400" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Phone Number</label>
            <input value={form.phone} onChange={e => set('phone', e.target.value)}
              placeholder="03XX XXXXXXX" type="tel" autoComplete="tel"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-400" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">City</label>
            <input value={form.city} onChange={e => set('city', e.target.value)} placeholder="Karachi"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-400" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Residence Type</label>
            <div className="flex gap-2">
              {(['residence', 'office'] as const).map(t => (
                <label key={t} className={`flex-1 text-center py-3 rounded-xl border cursor-pointer text-sm font-medium transition-colors ${form.address_type === t ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-600'}`}>
                  <input type="radio" name="addr_type" value={t} checked={form.address_type === t} onChange={() => set('address_type', t)} className="sr-only" />
                  {t === 'residence' ? '🏠 Home' : '🏢 Office'}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Delivery Address</label>
          <textarea value={form.address} onChange={e => set('address', e.target.value)} rows={2}
            placeholder="Street, area, city"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-400 resize-none" />
        </div>

        <button type="submit" disabled={saving}
          className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-bold px-6 py-3 rounded-xl text-sm transition-colors">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </form>

      {/* Change password */}
      <form onSubmit={handleChangePassword} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
        <p className="font-semibold text-gray-800 text-sm flex items-center gap-2"><Lock className="w-4 h-4" /> Change Password</p>

        <div className="space-y-3">
          {[
            { key: 'next',    label: 'New Password',     ph: 'Min. 8 characters' },
            { key: 'confirm', label: 'Confirm Password', ph: 'Repeat new password' },
          ].map(f => (
            <div key={f.key}>
              <label className="text-xs font-medium text-gray-600 block mb-1">{f.label}</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={pw[f.key as 'next' | 'confirm']}
                  onChange={e => setPw(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.ph} minLength={8}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-10 text-sm focus:outline-none focus:border-brand-400"
                />
                {f.key === 'next' && (
                  <button type="button" onClick={() => setShowPw(s => !s)}
                    className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <button type="submit" disabled={pwSaving || !pw.next || !pw.confirm}
          className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 disabled:opacity-60 text-white font-bold px-6 py-3 rounded-xl text-sm transition-colors">
          {pwSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
          {pwSaving ? 'Updating…' : 'Update Password'}
        </button>
      </form>

      {/* Sign out */}
      <button onClick={() => signOut()}
        className="flex items-center gap-2 w-full justify-center border border-red-200 text-red-500 hover:bg-red-50 font-semibold py-3.5 rounded-2xl text-sm transition-colors">
        <LogOut className="w-4 h-4" /> Sign Out
      </button>
    </div>
  )
}
