'use client'

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

type OpsQueue = 'delivery' | 'installation' | 'service' | 'payments' | 'applications' | 'support'

interface DeliveryRow {
  id: string; ref_number: string; customer_name: string | null; customer_phone: string | null;
  payment_status: string; delivery_eta: string | null; created_at: string; grand_total: number;
  doc_type: string;
}
interface InstallRow {
  id: string; brand: string; model: string; category: string; area_location: string | null;
  serial_no: string | null; created_at: string; notes: string;
}
interface ServicePlanRow {
  id: string; plan_tier: string; status: string; created_at: string; annual_price: number | null;
  notes: string; profile_name: string | null; profile_phone: string | null;
}
interface PaymentProofRow {
  id: string; user_id: string; order_id: string | null; payment_method: string;
  amount: number; txn_date: string; reference_number: string; notes: string;
  status: 'pending' | 'approved' | 'rejected'; admin_note: string | null; created_at: string;
}
interface SupportTicketRow {
  id: string; ticket_ref: string; category: string; subject: string; description: string;
  status: string; priority: 'low' | 'medium' | 'high' | 'urgent';
  resolution_note: string | null; created_at: string;
  customer_profiles?: { full_name: string | null; phone: string | null } | null;
}
interface InstAppRow {
  id: string; customer_name: string; customer_phone: string; customer_email: string | null;
  customer_cnic: string | null; guarantor_name: string | null; guarantor_phone: string | null;
  product_interest: string; requested_amount: number | null; requested_months: number | null;
  employment_type: string | null; monthly_income: number | null;
  status: 'pending' | 'approved' | 'rejected' | 'converted'; admin_note: string | null; created_at: string;
}

export default function OpsQueueTab() {
  const [queue, setQueue] = useState<OpsQueue>('delivery');
  const [deliveries, setDeliveries]     = useState<DeliveryRow[]>([]);
  const [installs,   setInstalls]       = useState<InstallRow[]>([]);
  const [servicePlans, setServicePlans] = useState<ServicePlanRow[]>([]);
  const [proofRows,  setProofRows]      = useState<PaymentProofRow[]>([]);
  const [rejectId,   setRejectId]       = useState<string | null>(null);
  const [rejectNote, setRejectNote]     = useState('');
  const [instApps,     setInstApps]     = useState<InstAppRow[]>([]);
  const [appDecide,    setAppDecide]    = useState<{ id: string; action: 'approved' | 'rejected' } | null>(null);
  const [appNote,      setAppNote]      = useState('');
  const [supportTix,   setSupportTix]   = useState<SupportTicketRow[]>([]);
  const [resolveId,    setResolveId]    = useState<string | null>(null);
  const [resolveNote,  setResolveNote]  = useState('');
  const [loading, setLoading]           = useState(false);
  const [msg, setMsg]                   = useState('');

  async function loadDeliveries() {
    setLoading(true);
    const { data } = await supabase
      .from('invoices')
      .select('id,ref_number,customer_name,customer_phone,payment_status,delivery_eta,created_at,grand_total,doc_type')
      .in('doc_type', ['invoice', 'installment-invoice'])
      .not('payment_status', 'eq', 'pending')
      .neq('stock_status', 'delivered')
      .order('created_at', { ascending: false })
      .limit(100);
    setDeliveries((data || []) as DeliveryRow[]);
    setLoading(false);
  }

  async function loadInstalls() {
    setLoading(true);
    const { data } = await supabase
      .from('customer_appliances')
      .select('id,brand,model,category,area_location,serial_no,created_at,notes')
      .eq('purchase_source', 'tajallis')
      .is('installation_date', null)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(100);
    setInstalls((data || []) as InstallRow[]);
    setLoading(false);
  }

  async function loadService() {
    setLoading(true);
    const { data } = await supabase
      .from('customer_care_plans')
      .select('id,plan_tier,status,created_at,annual_price,notes,customer_profiles(full_name,phone)')
      .in('status', ['pending_inspection', 'inspection_required'])
      .order('created_at', { ascending: false })
      .limit(100);
    setServicePlans(((data || []) as any[]).map(r => ({
      id: r.id, plan_tier: r.plan_tier, status: r.status, created_at: r.created_at,
      annual_price: r.annual_price, notes: r.notes,
      profile_name:  r.customer_profiles?.full_name || null,
      profile_phone: r.customer_profiles?.phone || null,
    })));
    setLoading(false);
  }

  async function loadPaymentProofs() {
    setLoading(true);
    const { data } = await supabase
      .from('payment_proofs')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(100);
    setProofRows((data || []) as PaymentProofRow[]);
    setLoading(false);
  }

  async function loadInstApps() {
    setLoading(true);
    const { data } = await supabase
      .from('installment_applications')
      .select('*')
      .in('status', ['pending'])
      .order('created_at', { ascending: false })
      .limit(100);
    setInstApps((data || []) as InstAppRow[]);
    setLoading(false);
  }

  async function loadSupportTickets() {
    setLoading(true);
    const { data } = await supabase
      .from('support_tickets')
      .select('id,ticket_ref,category,subject,description,status,priority,resolution_note,created_at,customer_profiles(full_name,phone)')
      .in('status', ['open', 'in_review', 'assigned'])
      .order('created_at', { ascending: true })
      .limit(100);
    setSupportTix((data || []) as unknown as SupportTicketRow[]);
    setLoading(false);
  }

  useEffect(() => {
    if (queue === 'delivery')            loadDeliveries();
    else if (queue === 'installation')   loadInstalls();
    else if (queue === 'service')        loadService();
    else if (queue === 'payments')       loadPaymentProofs();
    else if (queue === 'applications')   loadInstApps();
    else                                 loadSupportTickets();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue]);

  async function markDelivered(id: string) {
    await supabase.from('invoices').update({ stock_status: 'delivered' } as any).eq('id', id);
    setDeliveries(prev => prev.filter(r => r.id !== id));
    setMsg('Marked as delivered.');
    setTimeout(() => setMsg(''), 3000);
  }

  async function markInstalled(id: string) {
    await supabase.from('customer_appliances')
      .update({ installation_date: new Date().toISOString().slice(0, 10) })
      .eq('id', id);
    setInstalls(prev => prev.filter(r => r.id !== id));
    setMsg('Installation date recorded.');
    setTimeout(() => setMsg(''), 3000);
  }

  async function markInspected(id: string) {
    await supabase.from('customer_care_plans')
      .update({ status: 'active', activated_at: new Date().toISOString() })
      .eq('id', id);
    setServicePlans(prev => prev.filter(r => r.id !== id));
    setMsg('Care plan activated.');
    setTimeout(() => setMsg(''), 3000);
  }

  async function approveProof(proof: PaymentProofRow) {
    await supabase.from('payment_proofs').update({ status: 'approved' }).eq('id', proof.id);
    if (proof.order_id) {
      await supabase.from('invoices').update({ payment_status: 'paid' }).eq('id', proof.order_id);
    }
    setProofRows(prev => prev.filter(r => r.id !== proof.id));
    setMsg('Payment proof approved. Invoice marked paid.');
    setTimeout(() => setMsg(''), 4000);
  }

  async function rejectProof(id: string, note: string) {
    await supabase.from('payment_proofs').update({ status: 'rejected', admin_note: note }).eq('id', id);
    setProofRows(prev => prev.filter(r => r.id !== id));
    setRejectId(null); setRejectNote('');
    setMsg('Payment proof rejected.');
    setTimeout(() => setMsg(''), 3000);
  }

  async function decideApp(id: string, status: 'approved' | 'rejected', note: string) {
    await supabase.from('installment_applications').update({ status, admin_note: note || null }).eq('id', id);
    setInstApps(prev => prev.filter(r => r.id !== id));
    setAppDecide(null); setAppNote('');
    setMsg(status === 'approved' ? 'Application approved.' : 'Application rejected.');
    setTimeout(() => setMsg(''), 3000);
  }

  async function resolveTicket(id: string, note: string) {
    await supabase.from('support_tickets')
      .update({ status: 'resolved', resolution_note: note || null })
      .eq('id', id);
    setSupportTix(prev => prev.filter(r => r.id !== id));
    setResolveId(null); setResolveNote('');
    setMsg('Ticket resolved.');
    setTimeout(() => setMsg(''), 3000);
  }

  function slaSeverity(priority: string, createdAt: string): { label: string; cls: string } {
    const hoursAgo = (Date.now() - new Date(createdAt).getTime()) / 3600000;
    const limits: Record<string, number> = { urgent: 4, high: 8, medium: 24, low: 72 };
    const limit = limits[priority] ?? 24;
    if (hoursAgo > limit)       return { label: `SLA breached ${Math.round(hoursAgo - limit)}h ago`, cls: 'text-red-600 font-semibold' };
    if (hoursAgo > limit * 0.7) return { label: `${Math.round(limit - hoursAgo)}h left`, cls: 'text-amber-600 font-medium' };
    return { label: `${Math.round(limit - hoursAgo)}h left`, cls: 'text-gray-400' };
  }

  const QUEUES: { id: OpsQueue; label: string; icon: string; count: number }[] = [
    { id: 'delivery',     label: 'Deliveries',         icon: '🚚', count: deliveries.length },
    { id: 'installation', label: 'Installations',      icon: '🔧', count: installs.length },
    { id: 'service',      label: 'Care Plans',         icon: '🛡️', count: servicePlans.length },
    { id: 'payments',     label: 'Payment Proofs',     icon: '💳', count: proofRows.length },
    { id: 'applications', label: 'Inst. Applications', icon: '📝', count: instApps.length },
    { id: 'support',      label: 'Support Tickets',    icon: '🎫', count: supportTix.length },
  ];

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-5">
      <div>
        <h2 className="text-lg font-black text-gray-900">Operational Queues</h2>
        <p className="text-xs text-gray-400 mt-0.5">Work-in-progress across delivery, installation, and care plan inspection.</p>
      </div>

      {msg && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2 text-sm text-green-700">{msg}</div>
      )}

      {/* Queue selector */}
      <div className="flex gap-2 flex-wrap">
        {QUEUES.map(q => (
          <button key={q.id} onClick={() => setQueue(q.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
              queue === q.id ? 'bg-brand-600 text-white border-brand-600' : 'border-gray-200 text-gray-600 hover:border-brand-300'
            }`}>
            <span>{q.icon}</span> {q.label}
            {q.count > 0 && (
              <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${queue === q.id ? 'bg-white/20' : 'bg-gray-100 text-gray-600'}`}>
                {q.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-10 text-center text-gray-400 text-sm">Loading…</div>
      ) : queue === 'delivery' ? (
        deliveries.length === 0 ? (
          <div className="bg-green-50 rounded-xl p-8 text-center text-green-700 text-sm font-semibold">
            All deliveries complete — no pending items.
          </div>
        ) : (
          <div className="space-y-2">
            {deliveries.map(r => (
              <div key={r.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{r.customer_name || 'Unknown'}</p>
                  <p className="text-xs text-gray-500">{r.customer_phone} · {r.ref_number} · Rs {Math.round(r.grand_total).toLocaleString()}</p>
                  <div className="flex gap-2 mt-1.5 flex-wrap">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 capitalize">{r.doc_type.replace('-', ' ')}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                      r.payment_status === 'paid' ? 'bg-green-100 text-green-700'
                      : r.payment_status === 'advance_paid' ? 'bg-amber-100 text-amber-700'
                      : 'bg-gray-100 text-gray-500'}`}>
                      {r.payment_status.replace('_', ' ')}
                    </span>
                    {r.delivery_eta && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">ETA {r.delivery_eta}</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Invoiced {fmtDate(r.created_at)}</p>
                </div>
                <button onClick={() => markDelivered(r.id)}
                  className="shrink-0 text-xs font-bold bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700">
                  Mark Delivered
                </button>
              </div>
            ))}
          </div>
        )
      ) : queue === 'installation' ? (
        installs.length === 0 ? (
          <div className="bg-green-50 rounded-xl p-8 text-center text-green-700 text-sm font-semibold">
            No pending installations.
          </div>
        ) : (
          <div className="space-y-2">
            {installs.map(r => (
              <div key={r.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{r.brand} {r.model}</p>
                  <p className="text-xs text-gray-500">{r.category}{r.area_location ? ` · ${r.area_location}` : ''}</p>
                  {r.serial_no && <p className="text-xs text-gray-400 font-mono">{r.serial_no}</p>}
                  {r.notes && <p className="text-xs text-gray-400 italic mt-0.5">{r.notes}</p>}
                  <p className="text-xs text-gray-400 mt-1">Registered {fmtDate(r.created_at)}</p>
                </div>
                <button onClick={() => markInstalled(r.id)}
                  className="shrink-0 text-xs font-bold bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700">
                  Mark Installed
                </button>
              </div>
            ))}
          </div>
        )
      ) : queue === 'service' ? (
        servicePlans.length === 0 ? (
          <div className="bg-green-50 rounded-xl p-8 text-center text-green-700 text-sm font-semibold">
            No care plans pending inspection.
          </div>
        ) : (
          <div className="space-y-2">
            {servicePlans.map(r => (
              <div key={r.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 text-sm capitalize">{r.plan_tier} Care Plan</p>
                  {r.profile_name && <p className="text-xs text-gray-500">{r.profile_name}{r.profile_phone ? ` · ${r.profile_phone}` : ''}</p>}
                  <span className={`text-xs px-2 py-0.5 rounded-full capitalize mt-1 inline-block ${
                    r.status === 'inspection_required' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                  }`}>{r.status.replace(/_/g, ' ')}</span>
                  {r.notes && <p className="text-xs text-gray-400 italic mt-0.5">{r.notes}</p>}
                  <p className="text-xs text-gray-400 mt-1">Applied {fmtDate(r.created_at)}</p>
                </div>
                <button onClick={() => markInspected(r.id)}
                  className="shrink-0 text-xs font-bold bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700">
                  Activate Plan
                </button>
              </div>
            ))}
          </div>
        )
      ) : queue === 'payments' ? (
        proofRows.length === 0 ? (
          <div className="bg-green-50 rounded-xl p-8 text-center text-green-700 text-sm font-semibold">
            No pending payment proofs.
          </div>
        ) : (
          <div className="space-y-2">
            {rejectId && (
              <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold text-gray-800">Rejection reason</p>
                <textarea value={rejectNote} onChange={e => setRejectNote(e.target.value)}
                  rows={2} placeholder="Explain why this proof was rejected (optional)"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
                <div className="flex gap-2">
                  <button onClick={() => rejectProof(rejectId, rejectNote)}
                    className="text-xs font-bold bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700">
                    Confirm Reject
                  </button>
                  <button onClick={() => { setRejectId(null); setRejectNote(''); }}
                    className="text-xs font-semibold text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200">
                    Cancel
                  </button>
                </div>
              </div>
            )}
            {proofRows.map(r => (
              <div key={r.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">
                    Rs {Math.round(r.amount).toLocaleString()} · {r.payment_method.toUpperCase()}
                  </p>
                  <p className="text-xs text-gray-500">
                    Txn date: {r.txn_date}{r.reference_number ? ` · Ref: ${r.reference_number}` : ''}
                  </p>
                  {r.order_id && <p className="text-xs text-gray-400">Invoice: {r.order_id.slice(0, 8)}…</p>}
                  {r.notes && <p className="text-xs text-gray-400 italic mt-0.5">{r.notes}</p>}
                  <p className="text-xs text-gray-400 mt-1">Submitted {fmtDate(r.created_at)}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => approveProof(r)}
                    className="text-xs font-bold bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700">
                    Approve
                  </button>
                  <button onClick={() => { setRejectId(r.id); setRejectNote(''); }}
                    className="text-xs font-bold border border-red-200 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50">
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : queue === 'applications' ? (
        instApps.length === 0 ? (
          <div className="bg-green-50 rounded-xl p-8 text-center text-green-700 text-sm font-semibold">
            No pending installment applications.
          </div>
        ) : (
          <div className="space-y-2">
            {appDecide && (
              <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold text-gray-800">
                  {appDecide.action === 'approved' ? 'Approval note (optional)' : 'Rejection reason'}
                </p>
                <textarea value={appNote} onChange={e => setAppNote(e.target.value)}
                  rows={2} placeholder={appDecide.action === 'approved' ? 'e.g. Approved — invoice will be prepared' : 'e.g. CNIC verification failed'}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
                <div className="flex gap-2">
                  <button onClick={() => decideApp(appDecide.id, appDecide.action, appNote)}
                    className={`text-xs font-bold text-white px-3 py-1.5 rounded-lg ${
                      appDecide.action === 'approved' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                    }`}>
                    Confirm {appDecide.action === 'approved' ? 'Approval' : 'Rejection'}
                  </button>
                  <button onClick={() => { setAppDecide(null); setAppNote(''); }}
                    className="text-xs font-semibold text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200">
                    Cancel
                  </button>
                </div>
              </div>
            )}
            {instApps.map(r => (
              <div key={r.id} className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">{r.customer_name}</p>
                    <p className="text-xs text-gray-500">{r.customer_phone}{r.customer_cnic ? ` · CNIC: ${r.customer_cnic}` : ''}</p>
                    <p className="text-xs text-gray-700 mt-1 font-medium">{r.product_interest}</p>
                    <p className="text-xs text-gray-500">
                      {r.requested_months ? `${r.requested_months} months` : ''}
                      {r.requested_amount ? ` · Rs ${Math.round(r.requested_amount).toLocaleString()}` : ''}
                      {r.employment_type ? ` · ${r.employment_type}` : ''}
                      {r.monthly_income ? ` · Income Rs ${Math.round(r.monthly_income).toLocaleString()}` : ''}
                    </p>
                    {r.guarantor_name && (
                      <p className="text-xs text-gray-400">Guarantor: {r.guarantor_name} · {r.guarantor_phone}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">Submitted {fmtDate(r.created_at)}</p>
                  </div>
                  <div className="flex gap-2 shrink-0 flex-col items-end">
                    <button onClick={() => { setAppDecide({ id: r.id, action: 'approved' }); setAppNote(''); }}
                      className="text-xs font-bold bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700">
                      Approve
                    </button>
                    <button onClick={() => { setAppDecide({ id: r.id, action: 'rejected' }); setAppNote(''); }}
                      className="text-xs font-bold border border-red-200 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50">
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* Support Tickets */
        supportTix.length === 0 ? (
          <div className="bg-green-50 rounded-xl p-8 text-center text-green-700 text-sm font-semibold">
            No open support tickets.
          </div>
        ) : (
          <div className="space-y-2">
            {resolveId && (
              <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold text-gray-800">Resolution note</p>
                <textarea value={resolveNote} onChange={e => setResolveNote(e.target.value)}
                  rows={2} placeholder="Describe how this was resolved"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
                <div className="flex gap-2">
                  <button onClick={() => resolveTicket(resolveId, resolveNote)}
                    className="text-xs font-bold bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700">
                    Mark Resolved
                  </button>
                  <button onClick={() => { setResolveId(null); setResolveNote(''); }}
                    className="text-xs font-semibold text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200">
                    Cancel
                  </button>
                </div>
              </div>
            )}
            {supportTix.map(r => {
              const sla = slaSeverity(r.priority, r.created_at);
              const PRIORITY_CLS: Record<string, string> = {
                urgent: 'bg-red-100 text-red-700', high: 'bg-orange-100 text-orange-700',
                medium: 'bg-amber-100 text-amber-700', low: 'bg-gray-100 text-gray-500',
              };
              return (
                <div key={r.id} className="bg-white rounded-xl border border-gray-100 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs font-mono text-gray-400">{r.ticket_ref}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium ${PRIORITY_CLS[r.priority] || 'bg-gray-100 text-gray-500'}`}>
                          {r.priority}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 capitalize">
                          {r.status.replace(/_/g, ' ')}
                        </span>
                        <span className={`text-xs ${sla.cls}`}>{sla.label}</span>
                      </div>
                      <p className="font-semibold text-gray-900 text-sm">{r.subject}</p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{r.description}</p>
                      {r.customer_profiles && (
                        <p className="text-xs text-gray-400 mt-1">
                          {r.customer_profiles.full_name}{r.customer_profiles.phone ? ` · ${r.customer_profiles.phone}` : ''}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-0.5">{r.category.replace(/_/g,' ')} · {fmtDate(r.created_at)}</p>
                    </div>
                    <button onClick={() => { setResolveId(r.id); setResolveNote(''); }}
                      className="shrink-0 text-xs font-bold bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700">
                      Resolve
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
