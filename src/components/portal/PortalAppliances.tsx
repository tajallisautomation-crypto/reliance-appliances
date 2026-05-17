import { useState } from 'react'
import { Plus, Trash2, Wrench, CheckCircle, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { waSales } from '@/lib/whatsapp'
import toast from 'react-hot-toast'
import type { PortalData } from './portalTypes'
import { CATEGORY_ICONS, APPLIANCE_CATEGORIES, SERVICE_INTERVAL } from './portalConstants'

const CURRENT_YEAR = new Date().getFullYear()

function daysAgo(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
}

function serviceStatus(a: { category: string; last_serviced_at: string | null; purchase_year: number | null }) {
  const interval = SERVICE_INTERVAL[a.category]
  if (!interval) return null
  const ref = a.last_serviced_at ?? (a.purchase_year ? `${a.purchase_year}-06-01` : null)
  if (!ref) return 'unknown'
  const days = daysAgo(ref)
  if (days >= interval) return 'due'
  if (days >= interval * 0.8) return 'soon'
  return 'ok'
}

export default function PortalAppliances({ appliances, reload }: PortalData) {
  const [showForm, setShowForm] = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [form, setForm] = useState({
    brand: '', model: '', category: 'air-conditioners',
    purchase_year: '', purchase_source: 'other' as 'tajallis' | 'other',
  })

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.brand.trim()) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    const { error } = await supabase.from('customer_appliances').insert({
      user_id:         user.id,
      brand:           form.brand.trim(),
      model:           form.model.trim(),
      category:        form.category,
      purchase_year:   form.purchase_year ? Number(form.purchase_year) : null,
      purchase_source: form.purchase_source,
    })
    setSaving(false)
    if (error) { toast.error('Could not add appliance.'); return }
    toast.success('Appliance added!')
    setForm({ brand: '', model: '', category: 'air-conditioners', purchase_year: '', purchase_source: 'other' })
    setShowForm(false)
    reload()
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('customer_appliances').update({ is_active: false }).eq('id', id)
    if (error) { toast.error('Could not remove.'); return }
    toast.success('Appliance removed.')
    reload()
  }

  const handleServiced = async (id: string) => {
    const today = new Date().toISOString().slice(0, 10)
    const { error } = await supabase.from('customer_appliances').update({ last_serviced_at: today }).eq('id', id)
    if (error) { toast.error('Could not update.'); return }
    toast.success('Marked as serviced!')
    reload()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-gray-900 text-lg">My Appliances</h2>
          <p className="text-sm text-gray-500">Track what you own — get service reminders and tailored recommendations.</p>
        </div>
        <button onClick={() => setShowForm(s => !s)}
          className="flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors">
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleAdd} className="bg-brand-50 border border-brand-200 rounded-2xl p-5 space-y-4">
          <p className="font-semibold text-brand-800 text-sm">Add an appliance</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Category *</label>
              <select value={form.category} onChange={e => set('category', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400 bg-white">
                {APPLIANCE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Brand *</label>
              <input value={form.brand} onChange={e => set('brand', e.target.value)} required placeholder="e.g. Haier, Gree"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Model (optional)</label>
              <input value={form.model} onChange={e => set('model', e.target.value)} placeholder="e.g. HSU-12HF"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Year Purchased</label>
              <input type="number" value={form.purchase_year} onChange={e => set('purchase_year', e.target.value)}
                min={2000} max={CURRENT_YEAR} placeholder={String(CURRENT_YEAR)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-2">Where did you buy it?</label>
            <div className="flex gap-3">
              {(['tajallis', 'other'] as const).map(s => (
                <label key={s} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border cursor-pointer text-sm font-medium transition-colors ${form.purchase_source === s ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-600'}`}>
                  <input type="radio" name="source" value={s} checked={form.purchase_source === s} onChange={() => set('purchase_source', s)} className="sr-only" />
                  {s === 'tajallis' ? "Tajalli's" : 'Somewhere else'}
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving || !form.brand.trim()}
              className="flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {saving ? 'Saving…' : 'Save Appliance'}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Appliance list */}
      {appliances.length === 0 && !showForm ? (
        <div className="text-center py-14 text-gray-400">
          <span className="text-5xl block mb-3">🏠</span>
          <p className="font-semibold">No appliances added yet</p>
          <p className="text-sm mt-1">Add your appliances to get service reminders and a personalised energy plan.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {appliances.map(a => {
            const status = serviceStatus(a)
            return (
              <div key={a.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4">
                <span className="text-3xl flex-shrink-0">{CATEGORY_ICONS[a.category] ?? '🔌'}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{a.brand} {a.model}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {APPLIANCE_CATEGORIES.find(c => c.value === a.category)?.label ?? a.category}
                    {a.purchase_year ? ` · ${a.purchase_year}` : ''}
                    {a.purchase_source === 'tajallis' ? " · Tajalli's" : ''}
                  </p>
                  {status === 'due' && (
                    <span className="inline-block mt-1 text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Service Due</span>
                  )}
                  {status === 'soon' && (
                    <span className="inline-block mt-1 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Service Due Soon</span>
                  )}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {status && status !== 'ok' && (
                    <a href={waSales(`Hi! I'd like to book a service for my ${a.brand} ${a.model}.`)} target="_blank" rel="noreferrer"
                      className="w-8 h-8 flex items-center justify-center bg-amber-100 hover:bg-amber-200 rounded-xl text-amber-700">
                      <Wrench className="w-4 h-4" />
                    </a>
                  )}
                  {status === 'due' && (
                    <button onClick={() => handleServiced(a.id)}
                      className="w-8 h-8 flex items-center justify-center bg-green-100 hover:bg-green-200 rounded-xl text-green-700"
                      title="Mark as serviced">
                      <CheckCircle className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => handleDelete(a.id)}
                    className="w-8 h-8 flex items-center justify-center bg-red-50 hover:bg-red-100 rounded-xl text-red-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
