'use client'

import { useState } from 'react'
import { X, Mail, Lock, User, Phone, Eye, EyeOff, CheckCircle, Loader2 } from 'lucide-react'
import { signIn, signUp, resetPasswordForEmail } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { SITE_URL } from '@/lib/config'

type Mode = 'login' | 'signup' | 'forgot'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
  defaultMode?: Mode
}

export default function AuthModal({ open, onClose, onSuccess, defaultMode = 'login' }: Props) {
  const [mode, setMode]       = useState<Mode>(defaultMode)
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [name, setName]       = useState('')
  const [phone, setPhone]     = useState('')
  const [showPw, setShowPw]   = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')

  if (!open) return null

  const switchMode = (m: Mode) => { setMode(m); setError(''); setSuccess('') }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      await signIn(email, password)
      onSuccess?.()
      onClose()
    } catch (err: any) {
      setError(err.message?.includes('Invalid login') ? 'Incorrect email or password.' : err.message || 'Sign-in failed.')
    } finally { setLoading(false) }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    setLoading(true); setError('')
    try {
      const result = await signUp(email, password)
      if (result.user) {
        await supabase.from('customer_profiles').upsert({
          user_id:   result.user.id,
          full_name: name.trim(),
          phone:     phone.trim(),
        }, { onConflict: 'user_id' })
      }
      setSuccess("Account created! Check your email to confirm, then sign in.")
      switchMode('login')
    } catch (err: any) {
      setError(err.message?.includes('already registered') ? 'This email is already registered. Sign in instead.' : err.message || 'Sign-up failed.')
    } finally { setLoading(false) }
  }

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      await resetPasswordForEmail(email, `${SITE_URL}/portal`)
      setSuccess('Reset link sent! Check your inbox and follow the link to set a new password.')
    } catch (err: any) {
      setError(err.message || 'Could not send reset email. Try again.')
    } finally { setLoading(false) }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 relative animate-in fade-in slide-in-from-bottom-4 duration-200">

        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Brand header */}
        <div className="text-center mb-7">
          <div className="w-12 h-12 bg-brand-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <User className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-xl font-black text-gray-900">
            {mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Reset Password'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {mode === 'login'  && "Access your Tajalli's account"}
            {mode === 'signup' && 'Join the loyalty programme — earn points on every purchase'}
            {mode === 'forgot' && "We'll send a reset link to your email"}
          </p>
        </div>

        {success && (
          <div className="mb-5 flex items-start gap-3 bg-green-50 border border-green-200 rounded-2xl p-4">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-green-700">{success}</p>
          </div>
        )}

        {error && (
          <div className="mb-5 bg-red-50 border border-red-200 rounded-2xl p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* ── Login form ── */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <Field label="Email Address" id="login-email">
              <InputWrap icon={<Mail className="w-4 h-4 text-gray-400" />}>
                <input id="login-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  placeholder="you@example.com" autoComplete="email"
                  className="w-full pl-10 pr-4 py-3 text-sm focus:outline-none" />
              </InputWrap>
            </Field>

            <Field label="Password" id="login-password">
              <InputWrap icon={<Lock className="w-4 h-4 text-gray-400" />}>
                <input id="login-password" type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                  placeholder="••••••••" autoComplete="current-password"
                  className="w-full pl-10 pr-10 py-3 text-sm focus:outline-none" />
                <button type="button" onClick={() => setShowPw(s => !s)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </InputWrap>
            </Field>

            <button type="button" onClick={() => switchMode('forgot')}
              className="text-xs text-brand-500 hover:underline">
              Forgot password?
            </button>

            <SubmitBtn loading={loading} label="Sign In" loadingLabel="Signing in…" />

            <p className="text-center text-sm text-gray-500">
              New to Tajalli's?{' '}
              <button type="button" onClick={() => switchMode('signup')} className="text-brand-600 font-semibold hover:underline">
                Create account
              </button>
            </p>
          </form>
        )}

        {/* ── Signup form ── */}
        {mode === 'signup' && (
          <form onSubmit={handleSignup} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Full Name" id="signup-name">
                <InputWrap icon={<User className="w-4 h-4 text-gray-400" />}>
                  <input id="signup-name" type="text" value={name} onChange={e => setName(e.target.value)} required
                    placeholder="Ali Hassan" autoComplete="name"
                    className="w-full pl-10 pr-4 py-3 text-sm focus:outline-none" />
                </InputWrap>
              </Field>
              <Field label="Phone" id="signup-phone">
                <InputWrap icon={<Phone className="w-4 h-4 text-gray-400" />}>
                  <input id="signup-phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                    placeholder="03XX XXXXXXX" autoComplete="tel"
                    className="w-full pl-10 pr-4 py-3 text-sm focus:outline-none" />
                </InputWrap>
              </Field>
            </div>

            <Field label="Email Address" id="signup-email">
              <InputWrap icon={<Mail className="w-4 h-4 text-gray-400" />}>
                <input id="signup-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  placeholder="you@example.com" autoComplete="email"
                  className="w-full pl-10 pr-4 py-3 text-sm focus:outline-none" />
              </InputWrap>
            </Field>

            <Field label="Password" id="signup-password">
              <InputWrap icon={<Lock className="w-4 h-4 text-gray-400" />}>
                <input id="signup-password" type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                  placeholder="Min. 8 characters" minLength={8} autoComplete="new-password"
                  className="w-full pl-10 pr-10 py-3 text-sm focus:outline-none" />
                <button type="button" onClick={() => setShowPw(s => !s)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </InputWrap>
            </Field>

            <SubmitBtn loading={loading} label="Create Account & Earn Points" loadingLabel="Creating…" />

            <p className="text-center text-sm text-gray-500">
              Already have an account?{' '}
              <button type="button" onClick={() => switchMode('login')} className="text-brand-600 font-semibold hover:underline">
                Sign in
              </button>
            </p>
          </form>
        )}

        {/* ── Forgot password form ── */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgot} className="space-y-4">
            <Field label="Email Address" id="forgot-email">
              <InputWrap icon={<Mail className="w-4 h-4 text-gray-400" />}>
                <input id="forgot-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  placeholder="you@example.com" autoComplete="email"
                  className="w-full pl-10 pr-4 py-3 text-sm focus:outline-none" />
              </InputWrap>
            </Field>

            <SubmitBtn loading={loading} label="Send Reset Link" loadingLabel="Sending…" />

            <p className="text-center text-sm text-gray-500">
              Remembered it?{' '}
              <button type="button" onClick={() => switchMode('login')} className="text-brand-600 font-semibold hover:underline">
                Back to sign in
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}

// ── Shared primitives ──────────────────────────────────────────────────────

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="text-xs font-semibold text-gray-600 block mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function InputWrap({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="relative border border-gray-200 rounded-xl focus-within:border-brand-400 transition-colors">
      <span className="absolute left-3.5 top-3.5">{icon}</span>
      {children}
    </div>
  )
}

function SubmitBtn({ loading, label, loadingLabel }: { loading: boolean; label: string; loadingLabel: string }) {
  return (
    <button type="submit" disabled={loading}
      className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2">
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {loading ? loadingLabel : label}
    </button>
  )
}