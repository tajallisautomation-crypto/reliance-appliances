'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAdminAuthStore } from '@/store/adminAuthStore';
import { fmtPKR, type Product } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Plus, X, Loader2, Search, ExternalLink, TrendingDown, TrendingUp, Minus,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Benchmark {
  id:                  string;
  product_id:          string | null;
  product_brand:       string | null;
  product_model:       string | null;
  product_category:    string | null;
  competitor_name:     string;
  competitor_url:      string | null;
  competitor_price:    number;
  price_date:          string;
  confidence:          'high' | 'medium' | 'low';
  notes:               string | null;
  suggested_ta_price:  number | null;
  margin_at_suggested: number | null;
  recorded_by:         string | null;
  tajalli_cash:        number | null;
  tajalli_retail:      number | null;
  tajalli_cost:        number | null;
  price_diff_pct:      number | null;
  created_at:          string;
}

interface BenchmarkForm {
  product_id:         string;
  competitor_name:    string;
  competitor_url:     string;
  competitor_price:   string;
  price_date:         string;
  confidence:         'high' | 'medium' | 'low';
  notes:              string;
  suggested_ta_price: string;
}

const BLANK_FORM: BenchmarkForm = {
  product_id:         '',
  competitor_name:    '',
  competitor_url:     '',
  competitor_price:   '',
  price_date:         new Date().toISOString().slice(0, 10),
  confidence:         'high',
  notes:              '',
  suggested_ta_price: '',
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function diffBadge(pct: number | null) {
  if (pct === null) return null;
  if (Math.abs(pct) < 1) return (
    <span className="inline-flex items-center gap-0.5 text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-medium">
      <Minus className="w-2.5 h-2.5" /> Parity
    </span>
  );
  if (pct > 0) return (
    <span className="inline-flex items-center gap-0.5 text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">
      <TrendingUp className="w-2.5 h-2.5" /> +{pct.toFixed(1)}% above
    </span>
  );
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">
      <TrendingDown className="w-2.5 h-2.5" /> {pct.toFixed(1)}% below
    </span>
  );
}

function confidenceDot(c: string) {
  return c === 'high' ? 'bg-green-400' : c === 'medium' ? 'bg-amber-400' : 'bg-red-400';
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function CompetitorBenchmarksTab({ products }: { products: Product[] }) {
  const { staff } = useAdminAuthStore();

  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [showForm, setShowForm]     = useState(false);
  const [form, setForm]             = useState<BenchmarkForm>(BLANK_FORM);
  const [saving, setSaving]         = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('latest_competitor_benchmarks')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setBenchmarks(data as Benchmark[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Suggest Tajalli price: 5% below competitor (default)
  useEffect(() => {
    if (form.competitor_price && !isNaN(parseFloat(form.competitor_price))) {
      const cp = parseFloat(form.competitor_price);
      const suggested = Math.round(cp * 0.95 / 500) * 500;
      setForm(f => ({ ...f, suggested_ta_price: String(suggested) }));
    }
  }, [form.competitor_price]);

  const filtered = benchmarks.filter(b => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      b.competitor_name.toLowerCase().includes(q) ||
      (b.product_brand ?? '').toLowerCase().includes(q) ||
      (b.product_model ?? '').toLowerCase().includes(q) ||
      (b.product_category ?? '').toLowerCase().includes(q)
    );
  });

  async function saveBenchmark() {
    if (!form.competitor_name.trim() || !form.competitor_price) {
      toast.error('Competitor name and price are required');
      return;
    }
    const price = parseFloat(form.competitor_price);
    if (isNaN(price) || price <= 0) { toast.error('Enter a valid price'); return; }

    setSaving(true);
    const product = form.product_id
      ? products.find(p => p.id === form.product_id) ?? null : null;

    const suggested = form.suggested_ta_price ? parseFloat(form.suggested_ta_price) : null;
    const cost = product?.cost_price ?? null;
    const marginAtSuggested = (cost && suggested)
      ? ((suggested - cost) / suggested) * 100 : null;

    const { error } = await supabase.from('competitor_benchmarks').insert({
      product_id:          form.product_id || null,
      product_brand:       product?.brand ?? null,
      product_model:       product?.model ?? null,
      product_category:    product?.category ?? null,
      competitor_name:     form.competitor_name.trim(),
      competitor_url:      form.competitor_url.trim() || null,
      competitor_price:    price,
      price_date:          form.price_date,
      confidence:          form.confidence,
      notes:               form.notes.trim() || null,
      suggested_ta_price:  suggested,
      margin_at_suggested: marginAtSuggested,
      recorded_by:         staff?.email ?? null,
    });

    setSaving(false);
    if (error) { toast.error('Save failed: ' + error.message); return; }
    toast.success('Benchmark recorded');
    setShowForm(false);
    setForm(BLANK_FORM);
    load();
  }

  async function deleteBenchmark(id: string) {
    setDeletingId(id);
    const { error } = await supabase.from('competitor_benchmarks').delete().eq('id', id);
    setDeletingId(null);
    if (error) { toast.error('Delete failed'); return; }
    toast.success('Removed');
    load();
  }

  // Summary stats
  const cheaper   = benchmarks.filter(b => (b.price_diff_pct ?? 0) < -1).length;
  const parity    = benchmarks.filter(b => Math.abs(b.price_diff_pct ?? 0) <= 1).length;
  const expensive = benchmarks.filter(b => (b.price_diff_pct ?? 0) > 1).length;

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-black text-gray-900 text-lg">Competitor Benchmarks</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {benchmarks.length} observations · {cheaper} cheaper · {parity} parity · {expensive} more expensive
          </p>
        </div>
        <button
          onClick={() => setShowForm(s => !s)}
          className="flex items-center gap-1.5 bg-brand-500 text-white px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-brand-600"
        >
          <Plus className="w-4 h-4" /> Add Benchmark
        </button>
      </div>

      {/* Summary chips */}
      <div className="flex gap-3 flex-wrap">
        <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-2 text-center">
          <div className="text-xl font-black text-green-700">{cheaper}</div>
          <div className="text-[10px] font-semibold text-green-600 uppercase tracking-wider">We're cheaper</div>
        </div>
        <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 text-center">
          <div className="text-xl font-black text-gray-600">{parity}</div>
          <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Price parity</div>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-2 text-center">
          <div className="text-xl font-black text-red-600">{expensive}</div>
          <div className="text-[10px] font-semibold text-red-500 uppercase tracking-wider">We're more expensive</div>
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-800 text-sm">Record Competitor Price</h3>
            <button onClick={() => setShowForm(false)}>
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Product (optional)</label>
              <select
                value={form.product_id}
                onChange={e => setForm(f => ({ ...f, product_id: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-400"
              >
                <option value="">— No specific product —</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.brand} {p.model}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Competitor name *</label>
              <input
                value={form.competitor_name}
                onChange={e => setForm(f => ({ ...f, competitor_name: e.target.value }))}
                placeholder="e.g. Home Appliances PK, Daraz, HomeShoppee"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Competitor price (PKR) *</label>
              <input
                type="number"
                value={form.competitor_price}
                onChange={e => setForm(f => ({ ...f, competitor_price: e.target.value }))}
                placeholder="e.g. 85000"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Suggested Tajalli price (PKR)</label>
              <input
                type="number"
                value={form.suggested_ta_price}
                onChange={e => setForm(f => ({ ...f, suggested_ta_price: e.target.value }))}
                placeholder="Auto-set to −5% of competitor"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Price date</label>
              <input
                type="date"
                value={form.price_date}
                onChange={e => setForm(f => ({ ...f, price_date: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Confidence</label>
              <select
                value={form.confidence}
                onChange={e => setForm(f => ({ ...f, confidence: e.target.value as 'high' | 'medium' | 'low' }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-400"
              >
                <option value="high">High — confirmed from live listing</option>
                <option value="medium">Medium — seen recently / screenshot</option>
                <option value="low">Low — verbal or estimated</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Competitor URL / reference</label>
              <input
                value={form.competitor_url}
                onChange={e => setForm(f => ({ ...f, competitor_url: e.target.value }))}
                placeholder="https://…"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
              <textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Include or exclude installation, stock status, any other context…"
                rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              disabled={saving}
              onClick={saveBenchmark}
              className="px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-semibold hover:bg-brand-600 disabled:opacity-40 flex items-center gap-1.5"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Save Benchmark
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search competitor or product…"
          className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
        />
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">
            {benchmarks.length === 0
              ? 'No competitor benchmarks yet. Add the first one above.'
              : 'No results for your search.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Product</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Competitor</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Their Price</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Our Price</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Suggested</th>
                  <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Position</th>
                  <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Date</th>
                  <th className="px-3 py-3 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(b => (
                  <tr key={b.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-4 py-3">
                      {b.product_brand ? (
                        <>
                          <div className="font-medium text-gray-900 text-xs">{b.product_brand} {b.product_model}</div>
                          <div className="text-[10px] text-gray-400">{b.product_category}</div>
                        </>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Generic / unlinked</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-medium text-gray-800">{b.competitor_name}</span>
                        <span className={`w-2 h-2 rounded-full shrink-0 ${confidenceDot(b.confidence)}`} title={`Confidence: ${b.confidence}`} />
                      </div>
                      {b.competitor_url && (
                        <a
                          href={b.competitor_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-brand-500 hover:underline flex items-center gap-0.5 mt-0.5"
                        >
                          <ExternalLink className="w-2.5 h-2.5" /> Source
                        </a>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right font-medium text-gray-900 text-xs">
                      {fmtPKR(b.competitor_price)}
                    </td>
                    <td className="px-3 py-3 text-right text-xs text-gray-600">
                      {b.tajalli_cash ? fmtPKR(b.tajalli_cash) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-3 text-right text-xs">
                      {b.suggested_ta_price ? (
                        <>
                          <div className="font-medium text-brand-700">{fmtPKR(b.suggested_ta_price)}</div>
                          {b.margin_at_suggested != null && (
                            <div className="text-[10px] text-gray-400">{b.margin_at_suggested.toFixed(1)}% margin</div>
                          )}
                        </>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-3">
                      {diffBadge(b.price_diff_pct)}
                    </td>
                    <td className="px-3 py-3 text-[10px] text-gray-400">
                      {new Date(b.price_date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-3 py-3">
                      <button
                        disabled={deletingId === b.id}
                        onClick={() => deleteBenchmark(b.id)}
                        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-colors"
                        title="Delete"
                      >
                        {deletingId === b.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <X className="w-3.5 h-3.5" />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
