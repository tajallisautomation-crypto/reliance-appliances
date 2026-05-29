'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, Wrench, CheckCircle, Loader2, Calendar, Hash, MoreVertical, Shield, ChevronLeft, Download, AlertCircle, ArrowRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { waSales } from '@/lib/whatsapp'
import toast from 'react-hot-toast'
import type { PortalData, CustomerAppliance } from './portalTypes'
import { CATEGORY_ICONS, APPLIANCE_CATEGORIES, SERVICE_INTERVAL, CATEGORY_TO_PLAN_CATEGORY } from './portalConstants'

const CURRENT_YEAR = new Date().getFullYear()
const YEAR_OPTIONS = Array.from({ length: CURRENT_YEAR - 1999 }, (_, i) => CURRENT_YEAR - i)

function daysAgo(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
}

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000)
}

function serviceStatus(a: Pick<CustomerAppliance, 'category' | 'last_serviced_at' | 'purchase_year'>) {
  const interval = SERVICE_INTERVAL[a.category]
  if (!interval) return null
  const ref = a.last_serviced_at ?? (a.purchase_year ? `${a.purchase_year}-06-01` : null)
  if (!ref) return 'unknown'
  const days = daysAgo(ref)
  if (days >= interval) return 'due'
  if (days >= interval * 0.8) return 'soon'
  return 'ok'
}

function healthScore(a: CustomerAppliance): { label: string; color: string; bg: string } {
  const now = new Date()
  const warrantyEnd = a.warranty_end_date ? new Date(a.warranty_end_date) : null
  const warrantyOk = warrantyEnd ? warrantyEnd > now : null
  const svc = serviceStatus(a)
  const age = a.purchase_year ? CURRENT_YEAR - a.purchase_year : null

  if (warrantyOk === false && svc === 'due' && age && age >= 8)
    return { label: 'High Risk',             color: 'text-red-700',    bg: 'bg-red-100'    }
  if (warrantyOk === false && svc === 'due')
    return { label: 'Needs Attention',        color: 'text-red-600',    bg: 'bg-red-50'     }
  if (warrantyOk === false)
    return { label: 'Warranty Expired',       color: 'text-orange-700', bg: 'bg-orange-100' }
  if (svc === 'due')
    return { label: 'Service Due',            color: 'text-amber-700',  bg: 'bg-amber-100'  }
  if (svc === 'soon')
    return { label: 'Service Due Soon',       color: 'text-yellow-700', bg: 'bg-yellow-100' }
  if (warrantyOk === true && (!svc || svc === 'ok'))
    return { label: 'Good',                   color: 'text-green-700',  bg: 'bg-green-100'  }
  return   { label: 'Check Required',         color: 'text-gray-600',   bg: 'bg-gray-100'   }
}

function warrantyBadge(a: CustomerAppliance): { label: string; color: string } | null {
  if (!a.warranty_end_date) return null
  const days = daysUntil(a.warranty_end_date)
  if (days <= 0)    return { label: 'Warranty Expired',      color: 'text-red-600 bg-red-50'     }
  if (days <= 30)   return { label: `Expiry in ${days}d`,    color: 'text-amber-600 bg-amber-50'  }
  if (days <= 60)   return { label: 'Expiring Soon',         color: 'text-orange-600 bg-orange-50'}
  return               { label: 'Warranty Active',           color: 'text-green-600 bg-green-50'  }
}

function useOutsideClick(ref: React.RefObject<HTMLElement>, cb: () => void) {
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
  useOutsideClick(ref as React.RefObject<HTMLElement>, () => setOpen(false))
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(s => !s)}
        className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 transition-colors">
        <MoreVertical className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-9 bg-white border border-gray-100 rounded-xl shadow-lg z-20 min-w-[150px] py-1">
          <button onClick={() => { setOpen(false); onDelete(id) }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
            <Trash2 className="w-4 h-4" /> Remove
          </button>
        </div>
      )}
    </div>
  )
}

// ── Order-import suggestion ────────────────────────────────────────────────
interface ImportSuggestion {
  brand:    string
  model:    string
  category: string
  orderId:  string
  orderDate:string
}

function deriveCategory(brand: string, model: string): string {
  const q = `${brand} ${model}`.toLowerCase()
  if (/ac|air.?con|split|inverter ac|hsu|hsu-|gree|haier.*split/i.test(q)) return 'air-conditioners'
  if (/fridge|refrigerator|ref\b|dawlance.*ref|haier.*ref/i.test(q)) return 'refrigerators'
  if (/freezer/i.test(q)) return 'freezers'
  if (/washing|washer|wm\b|twin.?tub/i.test(q)) return 'washing-machines'
  if (/led|tv|television|smart.?tv/i.test(q)) return 'televisions'
  if (/microwave|oven/i.test(q)) return 'microwaves'
  if (/dispenser|water.?cooler/i.test(q)) return 'water-dispensers'
  if (/solar|panel|inverex|inverter|ups\b|homeage/i.test(q)) return 'solar'
  if (/blender|kettle|toaster|chopper|juicer|mixer/i.test(q)) return 'kitchen-appliances'
  if (/fan|iron|vacuum|steamer/i.test(q)) return 'small-appliances'
  return 'small-appliances'
}

export default function PortalAppliances({ appliances, orders, carePlans, reload, navigateTo }: PortalData) {
  const [showForm,    setShowForm]    = useState(false)
  const [saving,      setSaving]      = useState(false)
  const [showImport,  setShowImport]  = useState(false)
  const [importing,   setImporting]   = useState(false)
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set())
  const [suggCats, setSuggCats] = useState<Record<string, string>>({})

  const [form, setForm] = useState({
    brand: '', model: '', category: 'air-conditioners',
    purchase_year: '', purchase_source: 'other' as 'tajallis' | 'other',
    serial_no: '', warranty_end_date: '', warranty_start_date: '',
    system_kw: '', battery_kwh: '',
  })

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))
  const isEnergySystem = form.category === 'solar' || form.category === 'ups-inverters'

  // Build import suggestions from orders (products not yet registered)
  const suggestions: ImportSuggestion[] = orders.flatMap(o => {
    if (!Array.isArray(o.products)) return []
    return o.products.map(p => ({
      brand:     p.brand,
      model:     p.model,
      category:  deriveCategory(p.brand, p.model),
      orderId:   o.id,
      orderDate: o.created_at,
    }))
  }).filter(s => {
    // Exclude if already registered (fuzzy match brand+model)
    return !appliances.some(a =>
      a.brand.toLowerCase() === s.brand.toLowerCase() &&
      a.model.toLowerCase() === s.model.toLowerCase()
    )
  })

  const suggKey = (s: ImportSuggestion) => `${s.brand}::${s.model}::${s.orderId}`

  const toggleSugg = (key: string) => {
    setSelectedSuggestions(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleImport = async () => {
    const toImport = suggestions.filter(s => selectedSuggestions.has(suggKey(s)))
    if (!toImport.length) return
    setImporting(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setImporting(false); return }

    const rows = toImport.map(s => ({
      user_id:          user.id,
      brand:            s.brand,
      model:            s.model,
      category:         suggCats[suggKey(s)] ?? s.category,
      purchase_source:  'tajallis' as const,
      purchase_year:    new Date(s.orderDate).getFullYear(),
    }))

    const { error } = await supabase.from('customer_appliances').insert(rows)
    setImporting(false)
    if (error) { toast.error('Could not import appliances.'); return }
    toast.success(`${toImport.length} appliance${toImport.length > 1 ? 's' : ''} imported!`)
    setShowImport(false)
    setSelectedSuggestions(new Set())
    reload()
  }

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
      user_id:              user.id,
      brand:                form.brand.trim(),
      model:                form.model.trim(),
      category:             form.category,
      purchase_year:        form.purchase_year ? Number(form.purchase_year) : null,
      purchase_source:      form.purchase_source,
      serial_no:            form.serial_no.trim() || null,
      warranty_start_date:  form.warranty_start_date || null,
      warranty_end_date:    form.warranty_end_date || null,
      notes:                capacityNotes,
    })
    setSaving(false)
    if (error) { toast.error('Could not add appliance.'); return }
    toast.success('Appliance added!')
    setForm({ brand: '', model: '', category: 'air-conditioners', purchase_year: '', purchase_source: 'other', serial_no: '', warranty_end_date: '', warranty_start_date: '', system_kw: '', battery_kwh: '' })
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
            <p className="text-sm text-gray-500">Your digital appliance locker — warranty, service & care plan status in one place.</p>
          </div>
        </div>
        <button onClick={() => setShowForm(s => !s)}
          className="flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors">
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>

      {/* Order-import banner */}
      {suggestions.length > 0 && !showImport && (
        <div className="bg-brand-50 border border-brand-200 rounded-2xl p-4 flex items-start gap-3">
          <Download className="w-5 h-5 text-brand-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-brand-900 text-sm">Import from your orders</p>
            <p className="text-xs text-brand-700 mt-0.5">
              {suggestions.length} product{suggestions.length > 1 ? 's' : ''} from your Tajalli's orders not yet registered. Add them in one tap to get warranty tracking and service reminders.
            </p>
          </div>
          <button onClick={() => setShowImport(true)}
            className="flex-shrink-0 flex items-center gap-1 text-xs font-bold text-brand-600 hover:text-brand-800 whitespace-nowrap">
            Review <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Import panel */}
      {showImport && suggestions.length > 0 && (
        <div className="bg-brand-50 border border-brand-200 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-brand-900 text-sm">Select products to register</p>
            <button onClick={() => setShowImport(false)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
          </div>
          <p className="text-xs text-brand-700">Tick the products you still own and want to track. We'll pre-fill details from your order.</p>

          <div className="space-y-2">
            {suggestions.map(s => {
              const key = suggKey(s)
              const selected = selectedSuggestions.has(key)
              return (
                <div key={key} className={`bg-white rounded-xl border p-3.5 transition-colors ${selected ? 'border-brand-400' : 'border-gray-200'}`}>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" checked={selected} onChange={() => toggleSugg(key)}
                      className="mt-0.5 w-4 h-4 accent-brand-500" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900">{s.brand} {s.model}</p>
                      <p className="text-xs text-gray-400">
                        Ordered {new Date(s.orderDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })} · from Tajalli's
                      </p>
                      {selected && (
                        <div className="mt-2">
                          <label className="text-xs text-gray-500 block mb-1">Confirm category</label>
                          <select
                            value={suggCats[key] ?? s.category}
                            onChange={e => setSuggCats(prev => ({ ...prev, [key]: e.target.value }))}
                            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-brand-400 bg-white">
                            {APPLIANCE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                  </label>
                </div>
              )
            })}
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex items-start gap-2 text-xs text-amber-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            Warranty dates are not set automatically. After importing, edit each appliance to add your warranty end date from the warranty card.
          </div>

          <div className="flex gap-2">
            <button onClick={handleImport} disabled={importing || selectedSuggestions.size === 0}
              className="flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-bold px-5 py-2.5 rounded-xl text-sm">
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {importing ? 'Importing…' : `Import ${selectedSuggestions.size || ''} Product${selectedSuggestions.size !== 1 ? 's' : ''}`}
            </button>
            <button onClick={() => { setShowImport(false); setSelectedSuggestions(new Set()) }}
              className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Manual add form */}
      {showForm && (
        <form onSubmit={handleAdd} className="bg-brand-50 border border-brand-200 rounded-2xl p-5 space-y-4">
          <p className="font-semibold text-brand-800 text-sm">Register an appliance</p>
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
              <label className="text-xs font-medium text-gray-600 block mb-1">Warranty Start Date</label>
              <input type="date" value={form.warranty_start_date} onChange={e => set('warranty_start_date', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Warranty End Date</label>
              <input type="date" value={form.warranty_end_date} onChange={e => set('warranty_end_date', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400" />
            </div>
          </div>

          {isEnergySystem && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-yellow-800">
                {form.category === 'solar' ? '☀️ Solar System Details' : '🔋 UPS / Inverter Details'}
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
      {appliances.length === 0 && !showForm && !showImport ? (
        <div className="text-center py-14 text-gray-400">
          <span className="text-5xl block mb-3">🏠</span>
          <p className="font-semibold">No appliances added yet</p>
          <p className="text-sm mt-1">Add your appliances to get warranty alerts, service reminders, and care plan recommendations.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {appliances.map(a => {
            const svc = serviceStatus(a)
            const health = healthScore(a)
            const wBadge = warrantyBadge(a)
            const warrantyEnd = a.warranty_end_date ? new Date(a.warranty_end_date) : null
            const now = new Date()
            const warrantyExpiredBool = warrantyEnd ? warrantyEnd < now : null
            const activePlan = carePlans.find(cp =>
              cp.appliance_id === a.id && ['active', 'expiring_soon'].includes(cp.status)
            )
            const planCat = CATEGORY_TO_PLAN_CATEGORY[a.category]

            return (
              <div key={a.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                <div className="flex items-start gap-3">
                  <span className="text-3xl flex-shrink-0 mt-0.5">{CATEGORY_ICONS[a.category] ?? '🔌'}</span>

                  <div className="flex-1 min-w-0">
                    {/* Name + health */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900">{a.brand} {a.model}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {APPLIANCE_CATEGORIES.find(c => c.value === a.category)?.label ?? a.category}
                          {a.purchase_year ? ` · ${a.purchase_year}` : ''}
                          {a.purchase_source === 'tajallis' ? " · Tajalli's" : ''}
                        </p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${health.bg} ${health.color}`}>
                        {health.label}
                      </span>
                    </div>

                    {/* Serial + warranty */}
                    <div className="mt-2 space-y-1">
                      {a.serial_no && (
                        <p className="flex items-center gap-1 text-xs text-gray-400">
                          <Hash className="w-3 h-3" />{a.serial_no}
                        </p>
                      )}
                      {wBadge && (
                        <p className={`flex items-center gap-1.5 text-xs font-medium ${wBadge.color} rounded-lg px-0 w-fit`}>
                          <Calendar className="w-3 h-3" />
                          {wBadge.label}
                          {a.warranty_end_date && ` — ${new Date(a.warranty_end_date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                        </p>
                      )}
                      {!a.warranty_end_date && (
                        <button onClick={() => {}} className="flex items-center gap-1 text-xs text-gray-400 hover:text-brand-500 transition-colors">
                          <AlertCircle className="w-3 h-3" /> Add warranty date from card
                        </button>
                      )}
                    </div>

                    {/* Solar/UPS capacity */}
                    {(a.category === 'solar' || a.category === 'ups-inverters') && (() => {
                      try {
                        const cap = a.notes ? JSON.parse(a.notes) : null
                        if (!cap) return null
                        const parts: string[] = []
                        if (cap.system_kw) parts.push(`${cap.system_kw} kW ${a.category === 'solar' ? 'panels' : 'inverter'}`)
                        if (cap.battery_kwh) parts.push(`${cap.battery_kwh} kWh battery`)
                        if (!parts.length) return null
                        return <p className="text-xs text-gray-400 mt-1">{parts.join(' · ')}</p>
                      } catch { return null }
                    })()}

                    {/* Care plan status */}
                    {planCat && (
                      <div className="mt-2">
                        {activePlan ? (
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                            activePlan.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            <Shield className="w-3 h-3" />
                            {activePlan.plan_tier.charAt(0).toUpperCase() + activePlan.plan_tier.slice(1)} Care
                            {activePlan.status === 'expiring_soon' ? ' · Expiring Soon' : ' · Active'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                            <Shield className="w-3 h-3" /> No care plan
                          </span>
                        )}
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {warrantyEnd && !warrantyExpiredBool && (
                        <a href={waSales(`Hi! I'd like to claim warranty for my ${a.brand} ${a.model}. Serial: ${a.serial_no || 'N/A'}`)}
                          target="_blank" rel="noreferrer"
                          className="flex items-center gap-1 text-xs font-bold bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1.5 rounded-lg transition-colors">
                          <Shield className="w-3 h-3" /> Claim Warranty
                        </a>
                      )}
                      {(svc === 'due' || svc === 'soon') && (
                        <a href={waSales(`Hi! I'd like to book a service for my ${a.brand} ${a.model}.`)}
                          target="_blank" rel="noreferrer"
                          className="flex items-center gap-1 text-xs font-bold bg-amber-100 hover:bg-amber-200 text-amber-700 px-3 py-1.5 rounded-lg transition-colors">
                          <Wrench className="w-3 h-3" /> Book Service
                        </a>
                      )}
                      {planCat && !activePlan && (
                        <button onClick={() => navigateTo?.('care-plans')}
                          className="flex items-center gap-1 text-xs font-bold bg-brand-50 hover:bg-brand-100 text-brand-600 px-3 py-1.5 rounded-lg transition-colors">
                          <Shield className="w-3 h-3" /> Add Care Plan
                        </button>
                      )}
                      {warrantyExpiredBool && !activePlan && (
                        <a href={waSales(`Hi! I'd like to book a paid service for my ${a.brand} ${a.model}. Warranty has expired.`)}
                          target="_blank" rel="noreferrer"
                          className="flex items-center gap-1 text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 rounded-lg transition-colors">
                          <Wrench className="w-3 h-3" /> Book Paid Service
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Right actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {svc === 'due' && (
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
