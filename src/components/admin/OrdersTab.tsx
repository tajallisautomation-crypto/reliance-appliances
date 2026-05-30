'use client'

import React, { useState, useDeferredValue } from 'react';
import { Search, Loader2, ShoppingBag, RefreshCw, Trash2, MessageCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { ConfirmDialog } from './ConfirmDialog';
import { useAutoRefresh } from './useAutoRefresh';

interface Order {
  id: string;
  customer_name: string;
  customer_phone: string;
  email: string | null;
  address: string | null;
  city: string | null;
  products: Array<{ model: string; brand: string; qty: number; price: number }>;
  total_amount: number;
  payment_method: string | null;
  plan: string | null;
  status: string;
  created_at: string;
}

const ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'delivered', 'cancelled'] as const;

const ORDER_STATUS_COLORS: Record<string, string> = {
  pending:    'bg-yellow-100 text-yellow-700',
  confirmed:  'bg-blue-100 text-blue-700',
  processing: 'bg-brand-100 text-brand-700',
  delivered:  'bg-green-100 text-green-700',
  cancelled:  'bg-red-100 text-red-600',
};

function orderWaMessage(order: Order): string {
  const name = order.customer_name || 'valued customer';
  const ref  = order.id.slice(0, 8).toUpperCase();
  const amt  = order.total_amount ? `PKR ${Math.round(order.total_amount).toLocaleString()}` : '';
  switch (order.status) {
    case 'confirmed':  return `Hi ${name}, your Tajalli's order #${ref}${amt ? ` (${amt})` : ''} has been confirmed and is being prepared. We'll contact you before dispatch.`;
    case 'processing': return `Hi ${name}, your Tajalli's order #${ref} is being processed and packed. Expected delivery soon — our team will call before arriving.`;
    case 'delivered':  return `Hi ${name}, your Tajalli's order #${ref} has been delivered. We hope you're happy with your purchase! For any after-sale support please WhatsApp us anytime.`;
    case 'cancelled':  return `Hi ${name}, unfortunately your Tajalli's order #${ref} has been cancelled. Please WhatsApp us if you'd like to reschedule or need a refund.`;
    default:           return `Hi ${name}, your Tajalli's order #${ref} has been received. We'll confirm it shortly.`;
  }
}

export default function OrdersTab() {
  const [orders,      setOrders]      = useState<Order[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [loadError,   setLoadError]   = useState('');
  const [statusFilter,setStatusFilter]= useState('all');
  const [search,      setSearch]      = useState('');
  const deferredSearch                = useDeferredValue(search);
  const [expanded,    setExpanded]    = useState<string | null>(null);
  const [updatingId,  setUpdatingId]  = useState<string | null>(null);
  const [confirmDel,  setConfirmDel]  = useState<Order | null>(null);
  const [deleting,    setDeleting]    = useState<string | null>(null);

  async function load() {
    setLoading(true); setLoadError('');
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) setLoadError(error.message);
    setOrders((data ?? []) as Order[]);
    setLoading(false);
  }
  useAutoRefresh(load, 'orders', 30_000);

  async function updateStatus(id: string, status: string) {
    setUpdatingId(id);
    const { data } = await supabase.from('orders').update({ status }).eq('id', id).select().single();
    if (data) setOrders(prev => prev.map(o => o.id === id ? data as Order : o));
    setUpdatingId(null);
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    await supabase.from('orders').delete().eq('id', id);
    setOrders(prev => prev.filter(o => o.id !== id));
    setDeleting(null);
    setConfirmDel(null);
  }

  const filtered = orders.filter(o => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    if (deferredSearch) {
      const q = deferredSearch.toLowerCase();
      return o.customer_name?.toLowerCase().includes(q)
          || o.customer_phone?.includes(q)
          || o.id.toLowerCase().includes(q);
    }
    return true;
  });

  const counts = Object.fromEntries(ORDER_STATUSES.map(s => [s, orders.filter(o => o.status === s).length]));
  const revenue = orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + (o.total_amount || 0), 0);
  const todayCount = orders.filter(o => new Date(o.created_at).toDateString() === new Date().toDateString()).length;

  return (
    <div className="max-w-6xl mx-auto py-6 space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Orders',  value: orders.length,                          color: 'text-gray-900' },
          { label: 'Today',         value: todayCount,                             color: 'text-blue-600' },
          { label: 'Pending',       value: counts['pending'] || 0,                 color: counts['pending'] > 0 ? 'text-amber-600' : 'text-gray-400' },
          { label: 'Total Revenue', value: `PKR ${revenue.toLocaleString()}`,      color: 'text-green-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4">
            <div className={`text-xl font-black ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        {(['all', ...ORDER_STATUSES] as string[]).map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
              statusFilter === s ? 'bg-brand-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
            }`}>
            {s === 'all' ? `All (${orders.length})` : `${s} (${counts[s] || 0})`}
          </button>
        ))}
        <div className="flex-1" />
        <button onClick={load} className="flex items-center gap-1.5 border border-gray-200 text-gray-600 hover:border-brand-300 px-3 py-2 rounded-lg text-xs font-semibold">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, phone, order ID…"
          className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
      </div>

      {loadError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          <strong>Error:</strong> {loadError}
          {(loadError.includes('permission') || loadError.includes('policy') || loadError.includes('relation')) && (
            <p className="mt-1 text-xs">Run <code className="bg-red-100 px-1 rounded">20260316_admin_orders.sql</code> in Supabase SQL Editor.</p>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-brand-400" /></div>
      ) : !loadError && orders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
          <ShoppingBag className="w-10 h-10 mx-auto mb-3 text-gray-200" />
          <p className="font-medium text-gray-500">No orders yet</p>
          <p className="text-xs text-gray-400 mt-1">Orders placed via /checkout will appear here</p>
        </div>
      ) : (
        <>
        {/* Mobile card view */}
        <div className="md:hidden space-y-2">
          {filtered.map(order => {
            const prods = Array.isArray(order.products) ? order.products : [];
            return (
              <div key={order.id} className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{order.customer_name}</p>
                    <a href={`tel:${order.customer_phone}`} className="text-xs text-blue-500">{order.customer_phone}</a>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-gray-900 text-sm">PKR {(order.total_amount || 0).toLocaleString()}</p>
                    <p className="text-[10px] text-gray-400">{new Date(order.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}</p>
                  </div>
                </div>
                {prods.length > 0 && (
                  <div className="text-xs text-gray-600 space-y-0.5">
                    {prods.slice(0, 2).map((p, i) => <p key={i}>{p.brand} {p.model}{p.qty > 1 ? ` ×${p.qty}` : ''}</p>)}
                    {prods.length > 2 && <p className="text-gray-400">+{prods.length - 2} more</p>}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <select
                    value={order.status || 'pending'}
                    onChange={e => updateStatus(order.id, e.target.value)}
                    disabled={updatingId === order.id}
                    className={`flex-1 text-xs font-semibold rounded-lg px-2 py-2.5 border-0 focus:outline-none focus:ring-2 focus:ring-brand-400 capitalize cursor-pointer disabled:opacity-60
                      ${ORDER_STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-600'}`}>
                    {ORDER_STATUSES.map(s => <option key={s} value={s} className="bg-white text-gray-800 font-normal capitalize">{s}</option>)}
                  </select>
                  {updatingId === order.id && <Loader2 className="w-4 h-4 animate-spin text-brand-400 shrink-0" />}
                  <a href={`https://wa.me/${order.customer_phone?.replace(/\D/g, '')}?text=${encodeURIComponent(orderWaMessage(order))}`}
                    target="_blank" rel="noreferrer"
                    className="p-2.5 hover:bg-green-50 text-green-600 rounded-lg shrink-0">
                    <MessageCircle className="w-5 h-5" />
                  </a>
                  <button onClick={() => setConfirmDel(order)} className="p-2.5 hover:bg-red-50 text-red-400 hover:text-red-600 rounded-lg shrink-0">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            );
          })}
          {filtered.length < orders.length && (
            <p className="text-center text-xs text-gray-400 pt-1">Showing {filtered.length} of {orders.length} orders</p>
          )}
        </div>

        {/* Desktop table view */}
        <div className="hidden md:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-28">Order</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Customer</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Items</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-28">Total</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-40">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-28">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-16">WA</th>
                  <th className="px-4 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(order => {
                  const prods = Array.isArray(order.products) ? order.products : [];
                  return (
                    <>
                      <tr key={order.id}
                        className={`border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors ${expanded === order.id ? 'bg-brand-50/30' : ''}`}
                        onClick={() => setExpanded(expanded === order.id ? null : order.id)}>
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{order.id.slice(0, 8)}…</td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-900 text-sm">{order.customer_name}</div>
                          <a href={`tel:${order.customer_phone}`} className="text-xs text-blue-500 hover:underline" onClick={e => e.stopPropagation()}>{order.customer_phone}</a>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-xs text-gray-700">
                            {prods.slice(0, 2).map((p, i) => <div key={i}>{p.brand} {p.model}{p.qty > 1 ? ` ×${p.qty}` : ''}</div>)}
                            {prods.length > 2 && <div className="text-gray-400">+{prods.length - 2} more</div>}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-900 text-sm">PKR {(order.total_amount || 0).toLocaleString()}</td>
                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-1.5">
                            <select
                              value={order.status || 'pending'}
                              onChange={e => updateStatus(order.id, e.target.value)}
                              disabled={updatingId === order.id}
                              className={`text-xs font-semibold rounded-lg px-2 py-1 border-0 focus:outline-none focus:ring-2 focus:ring-brand-400 capitalize cursor-pointer disabled:opacity-60
                                ${ORDER_STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-600'}`}>
                              {ORDER_STATUSES.map(s => <option key={s} value={s} className="bg-white text-gray-800 font-normal capitalize">{s}</option>)}
                            </select>
                            {updatingId === order.id && <Loader2 className="w-3 h-3 animate-spin text-brand-400" />}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                          {new Date(order.created_at).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </td>
                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                          <a
                            href={`https://wa.me/${order.customer_phone?.replace(/\D/g, '')}?text=${encodeURIComponent(orderWaMessage(order))}`}
                            target="_blank" rel="noreferrer"
                            title={`WhatsApp: ${order.status} update`}
                            className="p-1.5 hover:bg-green-50 text-green-600 rounded-lg flex items-center justify-center w-8 h-8">
                            <MessageCircle className="w-4 h-4" />
                          </a>
                        </td>
                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                          <button onClick={() => setConfirmDel(order)}
                            className="p-1.5 hover:bg-red-50 text-red-400 hover:text-red-600 rounded-lg">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>

                      {expanded === order.id && (
                        <tr key={`${order.id}-d`} className="bg-brand-50/20 border-b border-brand-100">
                          <td colSpan={8} className="px-6 py-4">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Customer</p>
                                <p className="text-sm font-medium text-gray-900">{order.customer_name}</p>
                                <p className="text-xs text-gray-500">{order.customer_phone}</p>
                                {order.email && <p className="text-xs text-gray-500">{order.email}</p>}
                                {order.address && <p className="text-xs text-gray-500 mt-1">{order.address}{order.city ? `, ${order.city}` : ''}</p>}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Payment</p>
                                <p className="text-sm text-gray-800 capitalize">{order.payment_method || '—'}</p>
                                {order.plan && <p className="text-xs text-gray-500">{order.plan} plan</p>}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Items</p>
                                {prods.map((p, i) => (
                                  <div key={i} className="flex justify-between text-xs text-gray-700">
                                    <span>{p.brand} {p.model}{p.qty > 1 ? ` ×${p.qty}` : ''}</span>
                                    <span className="text-gray-400 ml-4">PKR {(p.price || 0).toLocaleString()}</span>
                                  </div>
                                ))}
                                <div className="flex justify-between text-sm font-bold text-gray-900 mt-1 pt-1 border-t border-gray-100">
                                  <span>Total</span><span>PKR {(order.total_amount || 0).toLocaleString()}</span>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtered.length < orders.length && (
            <div className="px-4 py-2 border-t border-gray-50 text-xs text-gray-400">
              Showing {filtered.length} of {orders.length} orders
            </div>
          )}
        </div>
        </>
      )}

      {confirmDel && (
        <ConfirmDialog
          title="Delete this order?"
          message={`Order from ${confirmDel.customer_name} — PKR ${(confirmDel.total_amount || 0).toLocaleString()}\nThis cannot be undone.`}
          confirmLabel="Delete Order"
          danger
          onConfirm={() => handleDelete(confirmDel.id)}
          onCancel={() => setConfirmDel(null)}
        />
      )}
      {deleting && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-white" />
        </div>
      )}
    </div>
  );
}
