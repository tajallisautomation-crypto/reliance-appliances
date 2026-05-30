'use client'

import React, { useState } from 'react';
import { Loader2, Mail, RefreshCw, MessageCircle, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { ConfirmDialog } from './ConfirmDialog';
import { useAutoRefresh } from './useAutoRefresh';

interface Enquiry {
  id: string;
  event: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  message: string | null;
  product_id: string | null;
  brand: string | null;
  model: string | null;
  created_at: string;
}

export default function EnquiriesTab() {
  const [items,      setItems]      = useState<Enquiry[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [loadError,  setLoadError]  = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [confirmDel, setConfirmDel] = useState<Enquiry | null>(null);
  const [deleting,   setDeleting]   = useState<string | null>(null);

  async function handleDelete(id: string) {
    setDeleting(id);
    await supabase.from('analytics').delete().eq('id', id);
    setItems(prev => prev.filter(i => i.id !== id));
    setDeleting(null);
    setConfirmDel(null);
  }

  async function load() {
    setLoading(true); setLoadError('');
    const { data, error } = await supabase
      .from('analytics')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) setLoadError(error.message);
    setItems((data ?? []) as Enquiry[]);
    setLoading(false);
  }
  useAutoRefresh(load, 'analytics', 30_000);

  const types = [...new Set(items.map(i => i.event))].filter(Boolean);
  const filtered = typeFilter === 'all' ? items : items.filter(i => i.event === typeFilter);
  const counts = Object.fromEntries(types.map(t => [t, items.filter(i => i.event === t).length]));
  const todayCount = items.filter(i => new Date(i.created_at).toDateString() === new Date().toDateString()).length;

  return (
    <div className="max-w-6xl mx-auto py-6 space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total',   value: items.length,           color: 'text-gray-900' },
          { label: 'Today',   value: todayCount,             color: 'text-blue-600' },
          { label: 'Contact', value: counts['contact'] || 0, color: 'text-purple-600' },
          { label: 'Enquiry', value: counts['enquiry'] || 0, color: 'text-brand-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4">
            <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {(['all', ...types] as string[]).map(t => (
          <button key={t} onClick={() => setTypeFilter(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
              typeFilter === t ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            {t === 'all' ? `All (${items.length})` : `${t} (${counts[t] || 0})`}
          </button>
        ))}
        <div className="flex-1" />
        <button onClick={load} className="flex items-center gap-1.5 border border-gray-200 text-gray-600 hover:border-brand-300 px-3 py-2 rounded-lg text-xs font-semibold">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
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
      ) : !loadError && items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
          <Mail className="w-10 h-10 mx-auto mb-3 text-gray-200" />
          <p className="font-medium text-gray-500">No enquiries yet</p>
          <p className="text-xs text-gray-400 mt-1">Contact form and product enquiries appear here</p>
        </div>
      ) : (
        <>
        {/* Mobile card view */}
        <div className="md:hidden space-y-2">
          {filtered.map(item => (
            <div key={item.id} className="bg-white rounded-xl border border-gray-100 p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{item.name || '—'}</p>
                  {item.phone && <a href={`tel:${item.phone}`} className="text-xs text-blue-500 block">{item.phone}</a>}
                  {item.email && <a href={`mailto:${item.email}`} className="text-xs text-gray-400 block truncate">{item.email}</a>}
                </div>
                <span className={`shrink-0 text-[10px] font-bold px-2 py-1 rounded-full capitalize ${
                  item.event === 'contact' ? 'bg-purple-100 text-purple-700' : 'bg-brand-100 text-brand-700'
                }`}>{item.event}</span>
              </div>
              <p className="text-xs text-gray-600 line-clamp-2">
                {item.brand && item.model ? `${item.brand} ${item.model}` : item.message || '—'}
              </p>
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-gray-400">{new Date(item.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                <div className="flex gap-1">
                  {item.phone && (
                    <a href={`https://wa.me/${item.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${item.name || ''}, thank you for contacting Tajalli's!`)}`}
                      target="_blank" rel="noreferrer"
                      className="p-2 hover:bg-green-50 text-green-600 rounded-lg">
                      <MessageCircle className="w-4 h-4" />
                    </a>
                  )}
                  {item.email && (
                    <a href={`mailto:${item.email}`} className="p-2 hover:bg-blue-50 text-blue-500 rounded-lg">
                      <Mail className="w-4 h-4" />
                    </a>
                  )}
                  <button onClick={() => setConfirmDel(item)} className="p-2 hover:bg-red-50 text-red-400 hover:text-red-600 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {filtered.length < items.length && (
            <p className="text-center text-xs text-gray-400 pt-1">Showing {filtered.length} of {items.length} entries</p>
          )}
        </div>

        {/* Desktop table view */}
        <div className="hidden md:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Contact</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-24">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Message / Product</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-28">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-20">Reach</th>
                  <th className="px-4 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900 text-sm">{item.name || '—'}</td>
                    <td className="px-4 py-3">
                      {item.phone && <a href={`tel:${item.phone}`} className="text-xs text-blue-500 hover:underline block">{item.phone}</a>}
                      {item.email && <a href={`mailto:${item.email}`} className="text-xs text-gray-400 hover:underline block">{item.email}</a>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                        item.event === 'contact' ? 'bg-purple-100 text-purple-700' : 'bg-brand-100 text-brand-700'
                      }`}>{item.event}</span>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      {item.brand && item.model
                        ? <span className="text-xs font-medium text-gray-800">{item.brand} {item.model}</span>
                        : <span className="text-xs text-gray-600 line-clamp-2">{item.message || '—'}</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                      {new Date(item.created_at).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {item.phone && (
                          <a href={`https://wa.me/${item.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${item.name || ''}, thank you for contacting Tajalli's!`)}`}
                            target="_blank" rel="noreferrer"
                            className="p-1.5 hover:bg-green-50 text-green-600 rounded-lg">
                            <MessageCircle className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {item.email && (
                          <a href={`mailto:${item.email}`}
                            className="p-1.5 hover:bg-blue-50 text-blue-500 rounded-lg">
                            <Mail className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => setConfirmDel(item)}
                        className="p-1.5 hover:bg-red-50 text-red-400 hover:text-red-600 rounded-lg">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length < items.length && (
            <div className="px-4 py-2 border-t border-gray-50 text-xs text-gray-400">
              Showing {filtered.length} of {items.length} entries
            </div>
          )}
        </div>
        </>
      )}

      {confirmDel && (
        <ConfirmDialog
          title="Delete this enquiry?"
          message={`From: ${confirmDel.name || 'Unknown'}\nType: ${confirmDel.event}\nThis cannot be undone.`}
          confirmLabel="Delete"
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
