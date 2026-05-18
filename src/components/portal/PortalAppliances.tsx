import { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, Wrench, CheckCircle, Loader2, Calendar, Hash, MoreVertical, Shield, ChevronLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { waSales } from '@/lib/whatsapp'
import toast from 'react-hot-toast'
import type { PortalData } from './portalTypes'
import { CATEGORY_ICONS, APPLIANCE_CATEGORIES, SERVICE_INTERVAL } from './portalConstants'

const CURRENT_YEAR = new Date().getFullYear()

const YEAR_OPTIONS = [
  ...Array.from({ length: CURRENT_YEAR - 1999 }, (_, i) => CURRENT_YEAR - i),
]

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

function useOutsideClick(ref: { current: HTMLElement | null }, cb: () => void) {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) cb()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [ref, cb])
}

function ApplianceMenu({ id, onDelete }: { id: string; onDelete: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null!)
  useOutsideClick(ref, () => setOpen(false))

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(s => !s)}
        className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 transition-colors">
        <MoreVertical className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-9 bg-white border border-gray-100 rounded-xl shadow-lg z-20 min-w-[150px] py-1">
          <button
            onClick={() => { setOpen(false); onDelete(id) }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
            <Trash2 className="w-4 h-4" /> Remove Appliance
          </button>
        </div>
      )}
    </div>
  )
}

export default function PortalAppliances({ appliances, reload, navigateTo }: PortalData) {
  const [showForm, setShowForm] = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [form, setForm] = useState({
    brand: '', model: '', category: 'air-conditioners',
    purchase_year: '', purchase_source: 'other' as 'tajallis' | 'other',
    serial_no: '', warranty_end_date: '',
    system_kw: '', battery_kwh: '',
  })

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))
  const isEnergySystem = form.category === 'solar' || form.category === 'ups-inverters'

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.brand.trim()) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    const capacityNotes = (form.system_kw || form.battery_kwh)
      ? JSON.stringify({ system_kw: form.system_kw ? Number(form.system_kw) : null, battery_kwh: form.battery_kwh ? Number(form.battery_kwh) : null })
      : null
    const { error } = await supabase.from('customer_appliances').insert({
      user_id:           user.id,
      brand:             form.brand.trim(),
      model:             form.model.trim(),
      category:          form.category,
      purchase_year:     form.purchase_year ? Number(form.purchase_year) : null,
      purchase_source:   form.purchase_source,
      serial_no:         form.serial_no.trim() || null,
      warranty_end_date: form.warranty_end_date || null,
      notes:             capacityNotes,
    })
    setSaving(false)
    if (error) { toast.error('Could not add appliance.'); return }
    toast.success('Appliance added!')
    setForm({ brand: '', model: '', category: 'air-conditioners', purchase_year: '', purchase_source: 'other', serial_no: '', warranty_end_date: '', system_kw: '', battery_kwh: '' })
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
        <div className="flex items-center gap-2">
          {navigateTo && (
            <button onClick={() => navigateTo('overview')} className="text-gray-400 hover:text-gray-600 transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h2 className="font-bold text-gray-900 text-lg">My Appliances</h2>
            <p className="text-sm text-gray-500">Track what you own — get service reminders and tailored recommendations.</p>
          </div>
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
              <select value={form.purchase_year} onChange={e => set('purchase_year', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400 bg-white">
                <option value="">Select year</option>
                {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
                <option value="1999">Before 2000</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Serial No. (optional)</label>
              <input value={form.serial_no} onChange={e => set('serial_no', e.target.value)} placeholder="From product sticker"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Warranty End Date (optional)</label>
              <input type="date" value={form.warranty_end_date} onChange={e => set('warranty_end_date', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400" />
            </div>
          </div>

          {/* Solar / UPS capacity fields */}
          {isEnergySystem && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-yellow-800">
                {form.category === 'solar' ? '☀️ Solar System Details' : '🔋 UPS / Inverter Details'} — helps us give you upgrade suggestions
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">
                    {form.category === 'solar' ? 'Panel Capacity (kW)' : 'Inverter Capacity (kW)'}
                  </label>
                  <input type="number" value={form.system_kw} onChange={e => set('system_kw', e.target.value)}
                    min={0} step={0.1} placeholder={form.category === 'solar' ? 'e.g. 5' : 'e.g. 2'}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400 bg-white" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Battery Capacity (kWh)</label>
                  <input type="number" value={form.battery_kwh} onChange={e => set('battery_kwh', e.target.value)}
                    min={0} step={0.5} placeholder="e.g. 10"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400 bg-white" />
                </div>
              </div>
              <p className="text-[11px] text-yellow-700">For UPS: convert Ah to kWh — a 200Ah 12V battery = 2.4 kWh</p>
            </div>
          )}

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
            const warrantyEnd = a.warranty_end_date ? new Date(a.warranty_end_date) : null
            const now = new Date()
            const warrantyExpired = warrantyEnd ? warrantyEnd < now : null
            const warrantyExpiringSoon = warrantyEnd && !warrantyExpired
              ? (warrantyEnd.getTime() - now.getTime()) < 60 * 24 * 60 * 60 * 1000
              : false

            return (
              <div key={a.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                <div className="flex items-start gap-4">
                  <span className="text-3xl flex-shrink-0 mt-0.5">{CATEGORY_ICONS[a.category] ?? '🔌'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">{a.brand} {a.model}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {APPLIANCE_CATEGORIES.find(c => c.value === a.category)?.label ?? a.category}
                      {a.purchase_year ? ` · ${a.purchase_year}` : ''}
                      {a.purchase_source === 'tajallis' ? " · Tajalli's" : ''}
                    </p>
                    {a.serial_no && (
                      <p className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                        <Hash className="w-3 h-3" />{a.serial_no}
                      </p>
                    )}
                    {(a.category === 'solar' || a.category === 'ups-inverters') && (() => {
                      try {
                        const cap = a.notes ? JSON.parse(a.notes) : null
                        if (!cap) return null
                        const parts = []
                        if (cap.system_kw) parts.push(`${cap.system_kw} kW ${a.category === 'solar' ? 'panels' : 'inverter'}`)
                        if (cap.battery_kwh) parts.push(`${cap.battery_kwh} kWh battery`)
                        if (!parts.length) return null
                        return <p className="text-xs text-gray-400 mt-0.5">{parts.join(' · ')}</p>
                      } catch { return null }
                    })()}
                    {warrantyEnd && (
                      <p className={`flex items-center gap-1 text-xs mt-0.5 ${warrantyExpired ? 'text-red-500' : warrantyExpiringSoon ? 'text-amber-500' : 'text-green-600'}`}>
                        <Calendar className="w-3 h-3" />
                        Warranty {warrantyExpired ? 'expired' : 'ends'} {warrantyEnd.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {warrantyExpiringSoon && ' — expiring soon'}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {status === 'due' && (
                        <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Service Due</span>
                      )}
                      {status === 'soon' && (
                        <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Service Due Soon</span>
                      )}
                      {a.purchase_source === 'tajallis' && (
                        <span className="text-xs font-semibold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">Tajalli's</span>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {warrantyEnd && !warrantyExpired && (
                        <a href={waSales(`Hi! I'd like to claim warranty for my ${a.brand} ${a.model}. Serial: ${a.serial_no || 'N/A'}`)}
                          target="_blank" rel="noreferrer"
                          className="flex items-center gap-1 text-xs font-bold bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1.5 rounded-lg transition-colors">
                          <Shield className="w-3 h-3" /> Claim Warranty
                        </a>
                      )}
                      {(status === 'due' || status === 'soon') && (
                        <a href={waSales(`Hi! I'd like to book a service for my ${a.brand} ${a.model}.`)}
                          target="_blank" rel="noreferrer"
                          className="flex items-center gap-1 text-xs font-bold bg-amber-100 hover:bg-amber-200 text-amber-700 px-3 py-1.5 rounded-lg transition-colors">
                          <Wrench className="w-3 h-3" /> Request Service
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {status === 'due' && (
                      <button onClick={() => handleServiced(a.id)}
                        className="w-8 h-8 flex items-center justify-center bg-green-100 hover:bg-green-200 rounded-xl text-green-700 transition-colors"
                        title="Mark as serviced">
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    )}
                    <ApplianceMenu id={a.id} onDelete={handleDelete} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
