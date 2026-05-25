import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
  waLifecycleInstall, waLifecycleDay7, waLifecycleMonth3,
  waLifecyclePresummer, waLifecycleCarePlan, waLifecycleSolar,
  openWhatsApp,
} from '@/lib/whatsapp';
import {
  MessageCircle, Plus, ChevronDown, ChevronRight, AlertTriangle,
  Clock, CheckCircle, User, Phone, Package, Filter, X, RefreshCw,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
type LifecycleStage =
  | 'installation_pending' | 'day7_check' | 'month3_service'
  | 'presummer_clean' | 'annual_care_plan' | 'solar_offer' | 'completed';

type Segment = 'new_customer' | 'repeat_buyer' | 'high_value' | 'at_risk' | 'solar_prospect';

interface LifecycleFlow {
  id: string;
  customer_name: string;
  customer_phone: string;
  product_name: string;
  product_category: string;
  purchase_date: string;
  installation_date: string | null;
  current_stage: LifecycleStage;
  stage_updated_at: string;
  next_action_at: string | null;
  linked_invoice_id: string | null;
  staff_notes: string;
  segment: Segment;
  created_at: string;
}

// ─── Stage metadata ───────────────────────────────────────────────────────────
const STAGES: Record<LifecycleStage, { label: string; color: string; bg: string; daysAfterInstall: number | null }> = {
  installation_pending: { label: 'Installation',     color: 'text-blue-700',   bg: 'bg-blue-100',   daysAfterInstall: 0   },
  day7_check:           { label: '7-Day Check',       color: 'text-purple-700', bg: 'bg-purple-100', daysAfterInstall: 7   },
  month3_service:       { label: '3-Month Service',   color: 'text-amber-700',  bg: 'bg-amber-100',  daysAfterInstall: 90  },
  presummer_clean:      { label: 'Pre-Summer Clean',  color: 'text-orange-700', bg: 'bg-orange-100', daysAfterInstall: 270 },
  annual_care_plan:     { label: 'Annual Care Plan',  color: 'text-green-700',  bg: 'bg-green-100',  daysAfterInstall: 365 },
  solar_offer:          { label: 'Solar Offer',       color: 'text-yellow-700', bg: 'bg-yellow-100', daysAfterInstall: 540 },
  completed:            { label: 'Completed',         color: 'text-gray-500',   bg: 'bg-gray-100',   daysAfterInstall: null },
};

const STAGE_ORDER: LifecycleStage[] = [
  'installation_pending', 'day7_check', 'month3_service',
  'presummer_clean', 'annual_care_plan', 'solar_offer', 'completed',
];

const SEGMENT_LABELS: Record<Segment, string> = {
  new_customer:    'New Customer',
  repeat_buyer:    'Repeat Buyer',
  high_value:      'High Value',
  at_risk:         'At Risk',
  solar_prospect:  'Solar Prospect',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function nextStage(current: LifecycleStage): LifecycleStage {
  const idx = STAGE_ORDER.indexOf(current);
  return STAGE_ORDER[Math.min(idx + 1, STAGE_ORDER.length - 1)];
}

function nextActionDate(stage: LifecycleStage, installDate: string | null, purchaseDate: string): string {
  const base = installDate ?? purchaseDate;
  const d = new Date(base);
  const days = STAGES[stage].daysAfterInstall;
  if (days === null) return '';
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function urgencyClass(days: number | null): string {
  if (days === null) return '';
  if (days < 0)  return 'text-red-600 font-semibold';
  if (days === 0) return 'text-orange-600 font-semibold';
  if (days <= 3)  return 'text-amber-600 font-medium';
  return 'text-gray-500';
}

function urgencyLabel(days: number | null): string {
  if (days === null) return '—';
  if (days < 0)  return `${Math.abs(days)}d overdue`;
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `In ${days}d`;
}

function waForStage(stage: LifecycleStage, name: string, product: string): string {
  switch (stage) {
    case 'installation_pending': return waLifecycleInstall(name, product);
    case 'day7_check':           return waLifecycleDay7(name, product);
    case 'month3_service':       return waLifecycleMonth3(name, product);
    case 'presummer_clean':      return waLifecyclePresummer(name, product);
    case 'annual_care_plan':     return waLifecycleCarePlan(name, product);
    case 'solar_offer':          return waLifecycleSolar(name, product);
    default:                     return '';
  }
}

// ─── Add Flow Form ────────────────────────────────────────────────────────────
function AddFlowForm({ onSaved, onCancel }: { onSaved: () => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    customer_name: '', customer_phone: '', product_name: '',
    product_category: 'air-conditioners', purchase_date: new Date().toISOString().split('T')[0],
    installation_date: '', linked_invoice_id: '', segment: 'new_customer' as Segment, staff_notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setErr('');
    if (!form.customer_phone.trim() || !form.product_name.trim()) {
      setErr('Phone and product name are required'); return;
    }
    setSaving(true);
    const installDate = form.installation_date || null;
    const firstStage: LifecycleStage = 'installation_pending';
    const next = nextActionDate(firstStage, installDate, form.purchase_date);
    const { error } = await supabase.from('customer_lifecycle_flows').insert({
      ...form,
      installation_date: installDate || null,
      linked_invoice_id: form.linked_invoice_id || null,
      current_stage: firstStage,
      next_action_at: next || null,
    });
    setSaving(false);
    if (error) { setErr(error.message); return; }
    onSaved();
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
      <h3 className="font-semibold text-gray-900">Add Customer to Lifecycle</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Customer Name</label>
          <input value={form.customer_name} onChange={e => set('customer_name', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            placeholder="e.g. Ahmed Raza" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Phone *</label>
          <input value={form.customer_phone} onChange={e => set('customer_phone', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            placeholder="03XX-XXXXXXX" required />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Product *</label>
          <input value={form.product_name} onChange={e => set('product_name', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            placeholder="e.g. Haier 1.5T Inverter AC" required />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
          <select value={form.product_category} onChange={e => set('product_category', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white">
            <option value="air-conditioners">Air Conditioner</option>
            <option value="refrigerators">Refrigerator</option>
            <option value="washing-machines">Washing Machine</option>
            <option value="solar">Solar System</option>
            <option value="ups-inverters">UPS / Inverter</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Purchase Date</label>
          <input type="date" value={form.purchase_date} onChange={e => set('purchase_date', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Installation Date</label>
          <input type="date" value={form.installation_date} onChange={e => set('installation_date', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Invoice ID (optional)</label>
          <input value={form.linked_invoice_id} onChange={e => set('linked_invoice_id', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            placeholder="INV-XXXX" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Segment</label>
          <select value={form.segment} onChange={e => set('segment', e.target.value as Segment)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white">
            {(Object.entries(SEGMENT_LABELS) as [Segment, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
          <input value={form.staff_notes} onChange={e => set('staff_notes', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            placeholder="Any context for follow-up…" />
        </div>
      </div>
      {err && <p className="text-sm text-red-600">{err}</p>}
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel}
          className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
        <button type="submit" disabled={saving}
          className="px-4 py-2 text-sm bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50">
          {saving ? 'Saving…' : 'Add to Lifecycle'}
        </button>
      </div>
    </form>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function LifecycleAdmin() {
  const [flows, setFlows] = useState<LifecycleFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState<LifecycleStage | 'all'>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [advancing, setAdvancing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('customer_lifecycle_flows')
      .select('*')
      .order('next_action_at', { ascending: true });
    setFlows((data as LifecycleFlow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function advanceStage(flow: LifecycleFlow) {
    setAdvancing(flow.id);
    const next = nextStage(flow.current_stage);
    const actionDate = nextActionDate(next, flow.installation_date, flow.purchase_date);
    await supabase.from('customer_lifecycle_flows').update({
      current_stage: next,
      stage_updated_at: new Date().toISOString(),
      next_action_at: actionDate || null,
      updated_at: new Date().toISOString(),
    }).eq('id', flow.id);
    setAdvancing(null);
    await load();
  }

  const filtered = stageFilter === 'all'
    ? flows
    : flows.filter(f => f.current_stage === stageFilter);

  // Stage counts for summary bar
  const stageCounts = flows.reduce<Record<string, number>>((acc, f) => {
    acc[f.current_stage] = (acc[f.current_stage] ?? 0) + 1;
    return acc;
  }, {});

  const overdueCount = flows.filter(f => {
    const d = daysUntil(f.next_action_at);
    return f.current_stage !== 'completed' && d !== null && d < 0;
  }).length;

  const dueCount = flows.filter(f => {
    const d = daysUntil(f.next_action_at);
    return f.current_stage !== 'completed' && d !== null && d >= 0 && d <= 3;
  }).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Customer Lifecycle Engine</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            AC and high-value buyers tracked through 6 post-sale touchpoints
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setShowAdd(v => !v)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600">
            <Plus className="w-4 h-4" />
            Add Customer
          </button>
        </div>
      </div>

      {showAdd && (
        <AddFlowForm onSaved={() => { setShowAdd(false); load(); }} onCancel={() => setShowAdd(false)} />
      )}

      {/* Alert bar */}
      {(overdueCount > 0 || dueCount > 0) && (
        <div className="flex gap-3">
          {overdueCount > 0 && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span><strong>{overdueCount}</strong> overdue action{overdueCount > 1 ? 's' : ''}</span>
            </div>
          )}
          {dueCount > 0 && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm text-amber-700">
              <Clock className="w-4 h-4 shrink-0" />
              <span><strong>{dueCount}</strong> due within 3 days</span>
            </div>
          )}
        </div>
      )}

      {/* Stage summary pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setStageFilter('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors
            ${stageFilter === 'all' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
          All ({flows.length})
        </button>
        {STAGE_ORDER.filter(s => s !== 'completed').map(s => {
          const meta = STAGES[s];
          const count = stageCounts[s] ?? 0;
          return (
            <button key={s} onClick={() => setStageFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors
                ${stageFilter === s ? `${meta.bg} ${meta.color} border-current` : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
              {meta.label} ({count})
            </button>
          );
        })}
        <button onClick={() => setStageFilter('completed')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors
            ${stageFilter === 'completed' ? 'bg-gray-100 text-gray-600 border-gray-400' : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'}`}>
          Done ({stageCounts['completed'] ?? 0})
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Loading flows…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          {stageFilter === 'all' ? 'No lifecycle flows yet. Add an AC buyer above.' : 'No customers at this stage.'}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="px-4 py-3 text-left">Product</th>
                <th className="px-4 py-3 text-left">Stage</th>
                <th className="px-4 py-3 text-left">Next Action</th>
                <th className="px-4 py-3 text-left">Segment</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(flow => {
                const stageMeta = STAGES[flow.current_stage];
                const days = daysUntil(flow.next_action_at);
                const isCompleted = flow.current_stage === 'completed';
                const waUrl = !isCompleted ? waForStage(flow.current_stage, flow.customer_name || 'Customer', flow.product_name) : '';
                return (
                  <tr key={flow.id} className="bg-white hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{flow.customer_name || '—'}</div>
                      <div className="flex items-center gap-1 text-gray-500 text-xs mt-0.5">
                        <Phone className="w-3 h-3" />
                        {flow.customer_phone}
                      </div>
                      {flow.staff_notes && (
                        <div className="text-xs text-gray-400 mt-0.5 italic truncate max-w-[180px]">{flow.staff_notes}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-gray-800">{flow.product_name}</div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        Purchased {new Date(flow.purchase_date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${stageMeta.bg} ${stageMeta.color}`}>
                        {stageMeta.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {flow.next_action_at ? (
                        <>
                          <div className={urgencyClass(days)}>{urgencyLabel(days)}</div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            {new Date(flow.next_action_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
                          </div>
                        </>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                        {SEGMENT_LABELS[flow.segment]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center gap-2 justify-end">
                        {!isCompleted && waUrl && (
                          <button
                            onClick={() => openWhatsApp(waUrl)}
                            title="Send WhatsApp message"
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors">
                            <MessageCircle className="w-3.5 h-3.5" />
                            Send
                          </button>
                        )}
                        {!isCompleted && (
                          <button
                            onClick={() => advanceStage(flow)}
                            disabled={advancing === flow.id}
                            title="Mark stage done and advance to next"
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-500 text-white text-xs font-medium rounded-lg hover:bg-brand-600 disabled:opacity-50 transition-colors">
                            {advancing === flow.id ? (
                              <span>…</span>
                            ) : (
                              <>
                                <ChevronRight className="w-3.5 h-3.5" />
                                {nextStage(flow.current_stage) === 'completed' ? 'Complete' : 'Advance'}
                              </>
                            )}
                          </button>
                        )}
                        {isCompleted && (
                          <span className="flex items-center gap-1 text-xs text-green-600">
                            <CheckCircle className="w-3.5 h-3.5" />
                            Done
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Legend */}
      <div className="bg-blue-50 rounded-xl p-4 text-xs text-blue-700 space-y-1">
        <p className="font-semibold">How it works</p>
        <p>Each customer enters at <strong>Installation</strong> stage when a sale is logged. Click <strong>Send</strong> to open the correct WhatsApp template, then <strong>Advance</strong> to move to the next stage. The engine auto-calculates the next action date based on installation date.</p>
        <p className="mt-1">Stages: Installation → 7-Day Check → 3-Month Service → Pre-Summer Clean → Annual Care Plan → Solar Offer → Completed</p>
      </div>
    </div>
  );
}
