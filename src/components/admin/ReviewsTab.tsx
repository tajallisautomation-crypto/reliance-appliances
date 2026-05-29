'use client'

import React, { useState, useDeferredValue } from 'react';
import { Search, RefreshCw, Star, Loader2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { ConfirmDialog } from './ConfirmDialog';
import { useAutoRefresh } from './useAutoRefresh';

interface ReviewRow {
  id: string;
  product_id: string;
  customer_name: string;
  city: string | null;
  rating: number;
  comment: string;
  verified_purchase: boolean;
  status: 'pending' | 'approved' | 'rejected';
  is_featured: boolean;
  service_label: string | null;
  admin_note: string | null;
  created_at: string;
}

export default function ReviewsTab() {
  const [reviews,   setReviews]   = useState<ReviewRow[]>([]);
  const [prodNames, setProdNames] = useState<Record<string, string>>({});
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const deferredSearch            = useDeferredValue(search);
  const [ratingFilter, setRatingFilter] = useState(0);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [confirmDel, setConfirmDel] = useState<ReviewRow | null>(null);
  const [deleting,  setDeleting]  = useState<string | null>(null);
  const [toggling,  setToggling]  = useState<string | null>(null);
  const [moderating, setModerating] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data: revs } = await supabase
      .from('reviews')
      .select('*')
      .order('status', { ascending: true })
      .order('created_at', { ascending: false });
    const rows = (revs ?? []) as ReviewRow[];
    setReviews(rows);
    const ids = [...new Set(rows.map(r => r.product_id))];
    if (ids.length) {
      const { data: prods } = await supabase
        .from('products')
        .select('id, simplified_name, model, brand')
        .in('id', ids);
      const map: Record<string, string> = {};
      (prods ?? []).forEach((p: any) => {
        map[p.id] = p.simplified_name || `${p.brand} ${p.model}`;
      });
      setProdNames(map);
    }
    setLoading(false);
  }

  useAutoRefresh(load, 'reviews', 60_000);

  async function handleDelete(id: string) {
    setDeleting(id);
    await supabase.from('reviews').delete().eq('id', id);
    setReviews(prev => prev.filter(r => r.id !== id));
    setDeleting(null);
    setConfirmDel(null);
  }

  async function toggleVerified(r: ReviewRow) {
    setToggling(r.id);
    const { data } = await supabase
      .from('reviews')
      .update({ verified_purchase: !r.verified_purchase })
      .eq('id', r.id)
      .select()
      .single();
    if (data) setReviews(prev => prev.map(x => x.id === r.id ? data as ReviewRow : x));
    setToggling(null);
  }

  async function moderateReview(id: string, status: 'approved' | 'rejected') {
    setModerating(id);
    const { data } = await supabase
      .from('reviews')
      .update({ status })
      .eq('id', id)
      .select()
      .single();
    if (data) setReviews(prev => prev.map(x => x.id === id ? data as ReviewRow : x));
    setModerating(null);
    toast.success(status === 'approved' ? 'Review approved and now public.' : 'Review rejected.');
  }

  async function toggleFeatured(r: ReviewRow) {
    setModerating(r.id);
    const { data } = await supabase
      .from('reviews')
      .update({ is_featured: !r.is_featured })
      .eq('id', r.id)
      .select()
      .single();
    if (data) setReviews(prev => prev.map(x => x.id === r.id ? data as ReviewRow : x));
    setModerating(null);
  }

  async function saveServiceLabel(id: string, label: string) {
    await supabase.from('reviews').update({ service_label: label || null }).eq('id', id);
    setReviews(prev => prev.map(x => x.id === id ? { ...x, service_label: label || null } : x));
  }

  const pendingCount = reviews.filter(r => r.status === 'pending').length;

  const filtered = reviews.filter(r => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (ratingFilter && r.rating !== ratingFilter) return false;
    if (deferredSearch) {
      const q = deferredSearch.toLowerCase();
      return r.customer_name.toLowerCase().includes(q)
        || r.comment.toLowerCase().includes(q)
        || (prodNames[r.product_id] || '').toLowerCase().includes(q);
    }
    return true;
  });

  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  return (
    <div className="max-w-6xl mx-auto py-6 space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total Reviews', value: reviews.length,                                 color: 'text-gray-900' },
          { label: 'Pending',       value: pendingCount,                                   color: pendingCount > 0 ? 'text-amber-600' : 'text-gray-400' },
          { label: 'Avg Rating',    value: reviews.length ? avg.toFixed(1) : '—',          color: avg >= 4 ? 'text-green-600' : avg >= 3 ? 'text-amber-600' : 'text-red-600' },
          { label: 'Verified',      value: reviews.filter(r => r.verified_purchase).length, color: 'text-green-600' },
          { label: 'Featured',      value: reviews.filter(r => r.is_featured).length,       color: 'text-amber-500' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4">
            <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {(['all', 'pending', 'approved', 'rejected'] as const).map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
              statusFilter === s ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            {s}{s === 'pending' && pendingCount > 0 ? ` · ${pendingCount}` : ''}
          </button>
        ))}
      </div>

      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by product, customer, comment…"
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
        </div>
        <div className="flex gap-1">
          {[0, 5, 4, 3, 2, 1].map(n => (
            <button key={n} onClick={() => setRatingFilter(ratingFilter === n ? 0 : n)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors
                ${ratingFilter === n ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {n === 0 ? 'All' : `${n}★`}
            </button>
          ))}
        </div>
        <button onClick={load} className="flex items-center gap-1.5 border border-gray-200 text-gray-600 hover:border-brand-300 px-3 py-2 rounded-lg text-xs font-semibold">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-brand-400" /></div>
      ) : reviews.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
          <Star className="w-10 h-10 mx-auto mb-3 text-gray-200" />
          <p className="font-medium text-gray-500">No reviews yet</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Product</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Customer</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-24">Rating</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Comment</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-24">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-48">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(r => (
                  <tr key={r.id} className={`hover:bg-gray-50 ${r.status === 'pending' ? 'bg-amber-50/40' : ''}`}>
                    <td className="px-4 py-3 max-w-[180px]">
                      <div className="text-xs font-medium text-gray-800 truncate">
                        {prodNames[r.product_id] || <span className="text-gray-400 italic">{r.product_id.slice(0, 12)}…</span>}
                      </div>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        r.status === 'approved' ? 'bg-green-100 text-green-700' :
                        r.status === 'rejected' ? 'bg-red-100 text-red-600' :
                        'bg-amber-100 text-amber-700'
                      }`}>{r.status}{r.is_featured ? ' ★' : ''}</span>
                      {r.is_featured && (
                        <input
                          defaultValue={r.service_label ?? ''}
                          onBlur={e => saveServiceLabel(r.id, e.target.value)}
                          placeholder="Homepage badge…"
                          className="mt-1 w-full text-[10px] border border-amber-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-amber-400 bg-amber-50"
                        />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 text-xs">{r.customer_name}</div>
                      {r.city && <div className="text-xs text-gray-400">{r.city}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map(n => (
                          <Star key={n} className={`w-3 h-3 ${n <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="text-xs text-gray-700 line-clamp-2">{r.comment}</p>
                      {r.verified_purchase && (
                        <span className="text-[10px] text-green-700 font-semibold">✓ Verified</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                      {new Date(r.created_at).toLocaleDateString('en-PK', { month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap items-center">
                        {r.status !== 'approved' && (
                          <button onClick={() => moderateReview(r.id, 'approved')}
                            disabled={moderating === r.id}
                            className="text-[10px] font-bold px-2 py-1 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-50">
                            {moderating === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : '✓ Approve'}
                          </button>
                        )}
                        {r.status !== 'rejected' && (
                          <button onClick={() => moderateReview(r.id, 'rejected')}
                            disabled={moderating === r.id}
                            className="text-[10px] font-bold px-2 py-1 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 disabled:opacity-50">
                            ✗ Reject
                          </button>
                        )}
                        <button onClick={() => toggleFeatured(r)}
                          disabled={moderating === r.id}
                          title={r.is_featured ? 'Unfeature' : 'Feature on product page'}
                          className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${r.is_featured ? 'bg-amber-100 text-amber-600' : 'text-gray-300 hover:text-amber-400 hover:bg-amber-50'}`}>
                          <Star className={`w-3.5 h-3.5 ${r.is_featured ? 'fill-amber-500' : ''}`} />
                        </button>
                        <button onClick={() => toggleVerified(r)}
                          disabled={toggling === r.id}
                          title={r.verified_purchase ? 'Remove verified' : 'Mark verified purchase'}
                          className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-colors disabled:opacity-50 ${
                            r.verified_purchase ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}>
                          {toggling === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : r.verified_purchase ? '✓' : 'Verify'}
                        </button>
                        <button onClick={() => setConfirmDel(r)}
                          className="p-1.5 hover:bg-red-50 text-red-400 hover:text-red-600 rounded-lg">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length < reviews.length && (
            <div className="px-4 py-2 border-t border-gray-50 text-xs text-gray-400">
              Showing {filtered.length} of {reviews.length} reviews
            </div>
          )}
        </div>
      )}

      {confirmDel && (
        <ConfirmDialog
          title="Delete this review?"
          message={`"${confirmDel.comment.slice(0, 100)}"\n— ${confirmDel.customer_name}`}
          confirmLabel="Delete Review"
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
