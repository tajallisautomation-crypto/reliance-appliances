'use client'

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAdminAuthStore } from '@/store/adminAuthStore';
import { fmtPKR, getPriceHistory, logAdminAction, type Product } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Search, X, Edit2, Check, History, Loader2,
  ChevronUp, ChevronDown, Download, ClipboardList, CheckCircle2, XCircle, Clock,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type SortKey = 'brand' | 'cash' | 'retail' | 'cost' | 'margin';
type SortDir = 'asc' | 'desc';
type PriceFlag = 'no_cost' | 'low_margin' | 'no_price' | 'price_conflict' | 'install_heavy';
type FlagFilter = 'all' | PriceFlag;

type ChangeField = 'cash_floor' | 'retail_price' | 'cost_price';

interface PriceChangeRequest {
  id:             string;
  product_id:     string;
  product_name:   string;
  product_brand:  string;
  product_model:  string;
  field_name:     ChangeField;
  old_value:      number | null;
  proposed_value: number;
  reason:         string;
  proposed_by:    string;
  proposed_at:    string;
  status:         'pending' | 'approved' | 'rejected' | 'applied';
  reviewed_by:    string | null;
  reviewed_at:    string | null;
  review_note:    string | null;
  old_margin_pct: number | null;
  new_margin_pct: number | null;
}

interface PriceRow {
  product: Product;
  retail: number;
  cash: number;
  cost: number | null;
  install12Total: number | null;
  install12Markup: number | null;
  margin: number | null;
  flags: PriceFlag[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const FLAG_META: Record<PriceFlag, { label: string; cls: string }> = {
  no_cost:        { label: 'No cost',       cls: 'bg-gray-100 text-gray-600' },
  low_margin:     { label: 'Low margin',    cls: 'bg-red-100 text-red-700' },
  no_price:       { label: 'No price',      cls: 'bg-red-100 text-red-700' },
  price_conflict: { label: 'Cash > retail', cls: 'bg-orange-100 text-orange-700' },
  install_heavy:  { label: '12m > +40%',    cls: 'bg-purple-100 text-purple-700' },
};

// ── Pure helpers ───────────────────────────────────────────────────────────────

function buildRow(p: Product): PriceRow {
  const retail = p.price.retail || p.price.cash_floor || 0;
  const cash   = p.price.cash_floor || retail;
  const cost   = p.cost_price ?? null;
  const plan12 = (p.installments as Record<string, { total: number }>)?.['12m'];
  const install12Total  = plan12?.total ?? null;
  const install12Markup = (install12Total && cash) ? ((install12Total - cash) / cash) * 100 : null;
  const margin          = (cost && retail) ? ((retail - cost) / retail) * 100 : null;

  const flags: PriceFlag[] = [];
  if (!retail && !cash)                               flags.push('no_price');
  if (cost === null)                                  flags.push('no_cost');
  if (margin !== null && margin < 15)                 flags.push('low_margin');
  if (cash && retail && cash > retail * 1.02)        flags.push('price_conflict');
  if (install12Markup !== null && install12Markup > 40) flags.push('install_heavy');

  return { product: p, retail, cash, cost, install12Total, install12Markup, margin, flags };
}

function marginBadgeCls(margin: number | null): string {
  if (margin === null) return 'bg-gray-100 text-gray-400';
  if (margin < 10)     return 'bg-red-100 text-red-700 font-bold';
  if (margin < 20)     return 'bg-amber-100 text-amber-700 font-semibold';
  if (margin < 30)     return 'bg-yellow-100 text-yellow-700';
  return 'bg-green-100 text-green-700 font-semibold';
}

function exportCSV(rows: PriceRow[], label: string) {
  const headers = ['Brand', 'Model', 'Category', 'Cost (PKR)', 'Cash Price (PKR)', 'Retail (PKR)', '12m Total (PKR)', 'Margin %', 'Flags'];
  const body = rows.map(r => [
    r.product.brand,
    r.product.model,
    r.product.category,
    r.cost ?? '',
    r.cash || '',
    r.retail || '',
    r.install12Total ?? '',
    r.margin !== null ? r.margin.toFixed(1) : '',
    r.flags.map(f => FLAG_META[f].label).join('; '),
  ]);
  const csv = [headers, ...body]
    .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), {
    href: url,
    download: `pricing-${label}-${new Date().toISOString().slice(0, 10)}.csv`,
  });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, colorCls, onClick,
}: {
  label: string; value: number | string; sub: string;
  colorCls: string; onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`rounded-xl border p-3 ${colorCls} ${onClick ? 'cursor-pointer hover:shadow-sm transition-shadow' : ''}`}
    >
      <div className="text-2xl font-bold leading-none">{value}</div>
      <div className="text-xs font-semibold mt-1">{label}</div>
      <div className="text-[10px] opacity-70 mt-0.5">{sub}</div>
    </div>
  );
}

function ColHeader({
  label, colKey, sortKey, sortDir, onSort,
}: {
  label: string; colKey: SortKey; sortKey: SortKey; sortDir: SortDir;
  onSort: (k: SortKey) => void;
}) {
  const active = sortKey === colKey;
  return (
    <button
      onClick={() => onSort(colKey)}
      className={`flex items-center gap-1 text-xs font-semibold uppercase tracking-wider whitespace-nowrap
        ${active ? 'text-brand-600' : 'text-gray-500 hover:text-gray-700'}`}
    >
      {label}
      {active
        ? (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)
        : <ChevronUp className="w-3 h-3 opacity-25" />}
    </button>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function PricingGovernanceTab({
  products,
  onRefresh,
}: {
  products: Product[];
  onRefresh: () => void;
}) {
  const { staff } = useAdminAuthStore();

  const [search, setSearch]           = useState('');
  const [flagFilter, setFlagFilter]   = useState<FlagFilter>('all');
  const [brandFilter, setBrandFilter] = useState('');
  const [catFilter, setCatFilter]     = useState('');
  const [sortKey, setSortKey]         = useState<SortKey>('margin');
  const [sortDir, setSortDir]         = useState<SortDir>('asc');

  const [editingId, setEditingId]     = useState<string | null>(null);
  const [editCost, setEditCost]       = useState('');
  const [saving, setSaving]           = useState(false);

  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
  const [historyData, setHistoryData]       = useState<{ retail_price: number; imported_at: string }[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // ── Price change approval workflow ─────────────────────────────────────────
  const [pendingRequests, setPendingRequests]   = useState<PriceChangeRequest[]>([]);
  const [requestsLoading, setRequestsLoading]   = useState(false);
  const [approvingId, setApprovingId]           = useState<string | null>(null);

  // Propose-change modal
  const [proposeRow, setProposeRow]   = useState<PriceRow | null>(null);
  const [proposeField, setProposeField] = useState<ChangeField>('cash_floor');
  const [proposeValue, setProposeValue] = useState('');
  const [proposeReason, setProposeReason] = useState('');
  const [proposing, setProposing]     = useState(false);

  const canApprove = staff?.role === 'owner' || staff?.role === 'admin';

  const loadRequests = useCallback(async () => {
    setRequestsLoading(true);
    const { data, error } = await supabase
      .from('price_change_requests')
      .select('*')
      .eq('status', 'pending')
      .order('proposed_at', { ascending: false });
    if (!error && data) setPendingRequests(data as PriceChangeRequest[]);
    setRequestsLoading(false);
  }, []);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  async function proposeChange() {
    if (!proposeRow || !proposeValue || !proposeReason.trim()) {
      toast.error('Fill in proposed value and reason');
      return;
    }
    const val = parseFloat(proposeValue);
    if (isNaN(val) || val <= 0) { toast.error('Enter a valid price'); return; }

    setProposing(true);
    const p = proposeRow.product;
    const oldVal = proposeField === 'cash_floor' ? proposeRow.cash
                 : proposeField === 'retail_price' ? proposeRow.retail
                 : proposeRow.cost;

    const cost = proposeRow.cost;
    const newMargin = (cost && proposeField === 'retail_price')
      ? ((val - cost) / val) * 100 : null;
    const oldMargin = proposeRow.margin;

    const { error } = await supabase.from('price_change_requests').insert({
      product_id:     p.id,
      product_name:   p.simplified_name || p.model,
      product_brand:  p.brand,
      product_model:  p.model,
      field_name:     proposeField,
      old_value:      oldVal ?? null,
      proposed_value: val,
      reason:         proposeReason.trim(),
      proposed_by:    staff?.email ?? 'unknown',
      old_margin_pct: oldMargin,
      new_margin_pct: newMargin,
    });

    setProposing(false);
    if (error) { toast.error('Failed: ' + error.message); return; }
    toast.success('Change request submitted for approval');
    setProposeRow(null);
    setProposeValue('');
    setProposeReason('');
    loadRequests();
  }

  async function reviewRequest(req: PriceChangeRequest, decision: 'approved' | 'rejected', note?: string) {
    setApprovingId(req.id);

    const { error: reviewErr } = await supabase
      .from('price_change_requests')
      .update({
        status:      decision,
        reviewed_by: staff?.email ?? 'unknown',
        reviewed_at: new Date().toISOString(),
        review_note: note ?? null,
      })
      .eq('id', req.id);

    if (reviewErr) {
      setApprovingId(null);
      toast.error('Review failed: ' + reviewErr.message);
      return;
    }

    if (decision === 'approved') {
      // Apply to products table immediately
      const fieldMap: Record<ChangeField, string> = {
        cash_floor:   'cash_floor',
        retail_price: 'retail_price',
        cost_price:   'cost_price',
      };
      const { error: applyErr } = await supabase
        .from('products')
        .update({ [fieldMap[req.field_name]]: req.proposed_value, updated_at: new Date().toISOString() })
        .eq('id', req.product_id);

      if (applyErr) {
        setApprovingId(null);
        toast.error('Approved but apply failed: ' + applyErr.message);
        return;
      }

      // Mark as applied
      await supabase.from('price_change_requests')
        .update({ status: 'applied', applied_at: new Date().toISOString() })
        .eq('id', req.id);

      toast.success(`Applied: ${req.product_brand} ${req.product_model} ${req.field_name}`);
      onRefresh();
    } else {
      toast.success('Request rejected');
    }

    setApprovingId(null);
    loadRequests();
  }

  const fieldLabel: Record<ChangeField, string> = {
    cash_floor:   'Cash Price',
    retail_price: 'Retail Price',
    cost_price:   'Cost Price',
  };

  // ── Derived data ────────────────────────────────────────────────────────────

  const rows = useMemo(() => products.map(buildRow), [products]);

  const allBrands = useMemo(
    () => [...new Set(products.map(p => p.brand))].sort(),
    [products],
  );

  const allCategories = useMemo(
    () => [...new Set(products.map(p => p.category).filter(Boolean))].sort(),
    [products],
  );

  const stats = useMemo(() => {
    const known = rows.filter(r => r.margin !== null);
    const avgMargin = known.length
      ? known.reduce((s, r) => s + r.margin!, 0) / known.length
      : null;
    return {
      total:      rows.length,
      noCost:     rows.filter(r => r.flags.includes('no_cost')).length,
      lowMargin:  rows.filter(r => r.flags.includes('low_margin')).length,
      noPrice:    rows.filter(r => r.flags.includes('no_price')).length,
      conflict:   rows.filter(r => r.flags.includes('price_conflict')).length,
      installHvy: rows.filter(r => r.flags.includes('install_heavy')).length,
      avgMargin,
    };
  }, [rows]);

  const filtered = useMemo(() => {
    let list = rows;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        r.product.brand.toLowerCase().includes(q) ||
        r.product.model.toLowerCase().includes(q) ||
        r.product.simplified_name?.toLowerCase().includes(q),
      );
    }
    if (flagFilter !== 'all') list = list.filter(r => r.flags.includes(flagFilter));
    if (brandFilter)          list = list.filter(r => r.product.brand === brandFilter);
    if (catFilter)            list = list.filter(r => r.product.category === catFilter);
    return list;
  }, [rows, search, flagFilter, brandFilter, catFilter]);

  const sorted = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case 'margin': return ((a.margin ?? -Infinity) - (b.margin ?? -Infinity)) * dir;
        case 'cash':   return (a.cash - b.cash) * dir;
        case 'retail': return (a.retail - b.retail) * dir;
        case 'cost':   return ((a.cost ?? -1) - (b.cost ?? -1)) * dir;
        case 'brand':  return a.product.brand.localeCompare(b.product.brand) * dir;
        default:       return 0;
      }
    });
  }, [filtered, sortKey, sortDir]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  }

  function clearFilters() {
    setSearch(''); setFlagFilter('all'); setBrandFilter(''); setCatFilter('');
  }

  function startEdit(row: PriceRow) {
    setEditingId(row.product.id);
    setEditCost(row.cost !== null ? String(row.cost) : '');
  }

  async function saveCost(
    id: string,
    brand: string,
    model: string,
    oldCost: number | null,
  ) {
    const trimmed = editCost.trim();
    const newCost = trimmed === '' ? null : Number(trimmed);
    if (newCost !== null && (isNaN(newCost) || newCost < 0)) {
      toast.error('Enter a valid cost price (positive number, or leave blank to clear)');
      return;
    }
    setSaving(true);

    const { error } = await supabase
      .from('products')
      .update({ cost_price: newCost, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      setSaving(false);
      toast.error('Save failed: ' + error.message);
      return;
    }

    // DB-backed audit — fire and forget, don't block UX on failure
    supabase.from('pricing_cost_changes').insert({
      product_id: id,
      brand,
      model,
      old_cost:   oldCost,
      new_cost:   newCost,
      changed_by: staff?.email ?? 'unknown',
    }).then(({ error: auditErr }) => {
      if (auditErr) console.warn('pricing audit write failed:', auditErr.message);
    });

    // localStorage audit (for AuditLogTab visibility)
    logAdminAction({
      action:           'update_cost_price',
      productsAffected: 1,
      fields:           ['cost_price'],
      details:          `${brand} ${model}: ${oldCost !== null ? fmtPKR(oldCost) : 'unset'} → ${newCost !== null ? fmtPKR(newCost) : 'cleared'}`,
    });

    setSaving(false);
    toast.success('Cost price saved');
    setEditingId(null);
    onRefresh();
  }

  async function openHistory(p: Product) {
    setHistoryProduct(p);
    setHistoryLoading(true);
    const data = await getPriceHistory(p.id);
    setHistoryData(data);
    setHistoryLoading(false);
  }

  function handleExport() {
    const label = flagFilter !== 'all' ? flagFilter : brandFilter || catFilter || 'all';
    exportCSV(sorted, label);
  }

  const hasFilters = search || flagFilter !== 'all' || brandFilter || catFilter;
  const sortProps  = { sortKey, sortDir, onSort: toggleSort };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* ── Pending approvals panel (owner/admin only) ─────────────────────── */}
      {canApprove && (pendingRequests.length > 0 || requestsLoading) && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <ClipboardList className="w-4 h-4 text-amber-600" />
            <h3 className="font-bold text-amber-800 text-sm">
              Pending Price Change Requests
              {pendingRequests.length > 0 && (
                <span className="ml-2 bg-amber-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {pendingRequests.length}
                </span>
              )}
            </h3>
          </div>
          {requestsLoading ? (
            <div className="flex items-center gap-2 text-xs text-amber-600 py-2">
              <Loader2 className="w-3 h-3 animate-spin" /> Loading…
            </div>
          ) : (
            <div className="divide-y divide-amber-100">
              {pendingRequests.map(req => (
                <div key={req.id} className="py-2.5 flex flex-wrap items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 text-xs">
                      {req.product_brand} {req.product_model}
                    </div>
                    <div className="text-[11px] text-gray-500 mt-0.5">
                      Change <span className="font-medium">{fieldLabel[req.field_name]}</span>
                      {' '}from{' '}
                      <span className="font-medium">{req.old_value != null ? fmtPKR(req.old_value) : '—'}</span>
                      {' '}to{' '}
                      <span className="font-semibold text-gray-800">{fmtPKR(req.proposed_value)}</span>
                      {req.old_margin_pct != null && req.new_margin_pct != null && (
                        <span className="ml-1.5 text-gray-400">
                          margin {req.old_margin_pct.toFixed(1)}% → {req.new_margin_pct.toFixed(1)}%
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-amber-700 mt-0.5 italic">
                      &ldquo;{req.reason}&rdquo;
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      Proposed by {req.proposed_by} · {new Date(req.proposed_at).toLocaleDateString('en-PK')}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      disabled={approvingId === req.id}
                      onClick={() => reviewRequest(req, 'approved')}
                      className="flex items-center gap-1 text-xs bg-green-600 text-white px-2.5 py-1 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50"
                    >
                      {approvingId === req.id
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <CheckCircle2 className="w-3 h-3" />}
                      Approve &amp; Apply
                    </button>
                    <button
                      disabled={approvingId === req.id}
                      onClick={() => reviewRequest(req, 'rejected', 'Rejected by admin')}
                      className="flex items-center gap-1 text-xs bg-white border border-red-200 text-red-600 px-2.5 py-1 rounded-lg font-semibold hover:bg-red-50 disabled:opacity-50"
                    >
                      <XCircle className="w-3 h-3" /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── My pending requests (finance/sales submitters) ─────────────────── */}
      {!canApprove && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-2 flex items-center gap-2 text-xs text-blue-700">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          Use the <strong>Propose Change</strong> button on any row to request a price change. Owner/Admin will be notified to review it.
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          label="Total Products"
          value={stats.total}
          sub={stats.avgMargin !== null ? `Avg margin ${stats.avgMargin.toFixed(1)}%` : 'No cost data yet'}
          colorCls="bg-blue-50 text-blue-700 border-blue-100"
        />
        <StatCard
          label="No Cost Price"
          value={stats.noCost}
          sub="Margin unknown"
          colorCls={stats.noCost > 0 ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-green-50 text-green-700 border-green-100'}
          onClick={stats.noCost > 0 ? () => setFlagFilter('no_cost') : undefined}
        />
        <StatCard
          label="Low Margin"
          value={stats.lowMargin}
          sub="Below 15%"
          colorCls={stats.lowMargin > 0 ? 'bg-red-50 text-red-700 border-red-100' : 'bg-green-50 text-green-700 border-green-100'}
          onClick={stats.lowMargin > 0 ? () => setFlagFilter('low_margin') : undefined}
        />
        <StatCard
          label="No Price"
          value={stats.noPrice}
          sub="Missing retail/cash"
          colorCls={stats.noPrice > 0 ? 'bg-red-50 text-red-700 border-red-100' : 'bg-green-50 text-green-700 border-green-100'}
          onClick={stats.noPrice > 0 ? () => setFlagFilter('no_price') : undefined}
        />
        <StatCard
          label="Price Conflict"
          value={stats.conflict}
          sub="Cash > retail"
          colorCls={stats.conflict > 0 ? 'bg-orange-50 text-orange-700 border-orange-100' : 'bg-green-50 text-green-700 border-green-100'}
          onClick={stats.conflict > 0 ? () => setFlagFilter('price_conflict') : undefined}
        />
        <StatCard
          label="Heavy 12m Markup"
          value={stats.installHvy}
          sub="> 40% over cash"
          colorCls={stats.installHvy > 0 ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-green-50 text-green-700 border-green-100'}
          onClick={stats.installHvy > 0 ? () => setFlagFilter('install_heavy') : undefined}
        />
      </div>

      {/* Filter bar */}
      <div className="bg-white border border-gray-200 rounded-xl p-3 flex flex-wrap gap-2 items-center">
        <div className="relative min-w-48 flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search brand or model…"
            className="w-full pl-8 pr-8 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2">
              <X className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>

        <select
          value={flagFilter}
          onChange={e => setFlagFilter(e.target.value as FlagFilter)}
          className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white"
        >
          <option value="all">All flags</option>
          <option value="no_cost">No cost price</option>
          <option value="low_margin">Low margin (&lt;15%)</option>
          <option value="no_price">No price</option>
          <option value="price_conflict">Price conflict</option>
          <option value="install_heavy">Heavy 12m markup</option>
        </select>

        <select
          value={brandFilter}
          onChange={e => setBrandFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white"
        >
          <option value="">All brands</option>
          {allBrands.map(b => <option key={b}>{b}</option>)}
        </select>

        <select
          value={catFilter}
          onChange={e => setCatFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white"
        >
          <option value="">All categories</option>
          {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800"
          >
            <X className="w-3 h-3" /> Clear
          </button>
        )}

        <span className="text-xs text-gray-400 ml-auto mr-2">
          {sorted.length} of {rows.length}
        </span>

        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-brand-400 hover:text-brand-600 transition-colors"
        >
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3">
                  <ColHeader label="Product" colKey="brand" {...sortProps} />
                </th>
                <th className="text-right px-3 py-3">
                  <ColHeader label="Cost" colKey="cost" {...sortProps} />
                </th>
                <th className="text-right px-3 py-3">
                  <ColHeader label="Cash Price" colKey="cash" {...sortProps} />
                </th>
                <th className="text-right px-3 py-3">
                  <ColHeader label="Retail" colKey="retail" {...sortProps} />
                </th>
                <th className="text-right px-3 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  12m Total
                </th>
                <th className="text-right px-3 py-3">
                  <ColHeader label="Margin" colKey="margin" {...sortProps} />
                </th>
                <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Flags
                </th>
                <th className="px-3 py-3 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sorted.map(row => (
                <tr key={row.product.id} className="hover:bg-gray-50 transition-colors group">

                  {/* Product */}
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 text-sm">
                      {row.product.brand} {row.product.model}
                    </div>
                    <div className="text-xs text-gray-400">{row.product.category}</div>
                  </td>

                  {/* Cost price — inline edit */}
                  <td className="px-3 py-3 text-right">
                    {editingId === row.product.id ? (
                      <div className="flex items-center justify-end gap-1">
                        <input
                          value={editCost}
                          onChange={e => setEditCost(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter')  saveCost(row.product.id, row.product.brand, row.product.model, row.cost);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          className="w-28 border border-brand-400 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-brand-400"
                          placeholder="0"
                          autoFocus
                        />
                        {saving ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-500" />
                        ) : (
                          <>
                            <button
                              onClick={() => saveCost(row.product.id, row.product.brand, row.product.model, row.cost)}
                              className="text-green-600 hover:text-green-700"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => startEdit(row)}
                        className="group/cost flex items-center gap-1 justify-end w-full text-right"
                      >
                        <span className={row.cost === null ? 'text-gray-300 italic text-xs' : 'text-gray-700'}>
                          {row.cost !== null ? fmtPKR(row.cost) : 'add cost'}
                        </span>
                        <Edit2 className="w-3 h-3 text-gray-300 group-hover/cost:text-brand-400 opacity-0 group-hover/cost:opacity-100 transition-opacity" />
                      </button>
                    )}
                  </td>

                  {/* Cash */}
                  <td className="px-3 py-3 text-right text-gray-700">
                    {row.cash ? fmtPKR(row.cash) : <span className="text-gray-300">—</span>}
                  </td>

                  {/* Retail */}
                  <td className="px-3 py-3 text-right text-gray-700">
                    {row.retail ? fmtPKR(row.retail) : <span className="text-gray-300">—</span>}
                  </td>

                  {/* 12m total */}
                  <td className="px-3 py-3 text-right">
                    {row.install12Total ? (
                      <>
                        <div className="text-gray-600 text-xs">{fmtPKR(row.install12Total)}</div>
                        {row.install12Markup !== null && (
                          <div className="text-gray-400 text-[10px]">+{row.install12Markup.toFixed(0)}%</div>
                        )}
                      </>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>

                  {/* Margin */}
                  <td className="px-3 py-3 text-right">
                    {row.margin !== null ? (
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${marginBadgeCls(row.margin)}`}>
                        {row.margin.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300 italic">—</span>
                    )}
                  </td>

                  {/* Flags */}
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1">
                      {row.flags.map(f => (
                        <span key={f} className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${FLAG_META[f].cls}`}>
                          {FLAG_META[f].label}
                        </span>
                      ))}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openHistory(row.product)}
                        className="text-gray-300 hover:text-brand-500 transition-colors"
                        title="Retail price history"
                      >
                        <History className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setProposeRow(row);
                          setProposeField('cash_floor');
                          setProposeValue(String(row.cash || ''));
                          setProposeReason('');
                        }}
                        className="text-gray-300 hover:text-amber-500 transition-colors"
                        title="Propose price change"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {sorted.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400 text-sm">
                    No products match the current filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Propose price change modal ────────────────────────────────────────── */}
      {proposeRow && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setProposeRow(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-gray-900">Propose Price Change</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {proposeRow.product.brand} {proposeRow.product.model}
                </p>
              </div>
              <button onClick={() => setProposeRow(null)}>
                <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Field to change</label>
                <select
                  value={proposeField}
                  onChange={e => {
                    const f = e.target.value as ChangeField;
                    setProposeField(f);
                    setProposeValue(String(
                      f === 'cash_floor'   ? proposeRow.cash   || ''
                      : f === 'retail_price' ? proposeRow.retail || ''
                      : proposeRow.cost ?? ''
                    ));
                  }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                >
                  <option value="cash_floor">Cash Price (current: {proposeRow.cash ? fmtPKR(proposeRow.cash) : '—'})</option>
                  <option value="retail_price">Retail Price (current: {proposeRow.retail ? fmtPKR(proposeRow.retail) : '—'})</option>
                  <option value="cost_price">Cost Price (current: {proposeRow.cost != null ? fmtPKR(proposeRow.cost) : '—'})</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Proposed value (PKR)</label>
                <input
                  type="number"
                  value={proposeValue}
                  onChange={e => setProposeValue(e.target.value)}
                  placeholder="e.g. 85000"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
                {proposeRow.cost && proposeField === 'retail_price' && proposeValue && !isNaN(parseFloat(proposeValue)) && (
                  <p className="text-[11px] text-gray-400 mt-1">
                    Margin after change:{' '}
                    <span className={parseFloat(proposeValue) > proposeRow.cost
                      ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                      {(((parseFloat(proposeValue) - proposeRow.cost) / parseFloat(proposeValue)) * 100).toFixed(1)}%
                    </span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Reason for change</label>
                <textarea
                  value={proposeReason}
                  onChange={e => setProposeReason(e.target.value)}
                  placeholder="e.g. New supplier invoice, competitor price drop, promotional pricing…"
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setProposeRow(null)}
                  className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  disabled={proposing || !proposeValue || !proposeReason.trim()}
                  onClick={proposeChange}
                  className="flex-1 bg-brand-500 text-white rounded-lg py-2 text-sm font-semibold hover:bg-brand-600 disabled:opacity-40 flex items-center justify-center gap-1.5"
                >
                  {proposing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardList className="w-4 h-4" />}
                  {canApprove ? 'Apply Directly' : 'Submit for Approval'}
                </button>
              </div>

              {canApprove && (
                <p className="text-[10px] text-gray-400 text-center -mt-1">
                  As owner/admin you can still propose for audit trail purposes, or edit cost directly in the table.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Price history modal */}
      {historyProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setHistoryProduct(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">
                  {historyProduct.brand} {historyProduct.model}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Retail price history — recorded on each CSV import
                </p>
              </div>
              <button onClick={() => setHistoryProduct(null)}>
                <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
              </button>
            </div>

            {historyLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
              </div>
            ) : historyData.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-sm text-gray-400">No price history yet</p>
                <p className="text-xs text-gray-300 mt-1">
                  History is recorded on each CSV import
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {historyData.map((h, i) => {
                  const prev  = historyData[i + 1];
                  const delta = prev ? h.retail_price - prev.retail_price : null;
                  return (
                    <div key={i} className="flex items-center justify-between py-2.5 text-sm">
                      <span className="text-gray-500 text-xs">
                        {new Date(h.imported_at).toLocaleDateString('en-PK', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </span>
                      <span className="font-medium text-gray-900">{fmtPKR(h.retail_price)}</span>
                      {delta !== null && (
                        <span className={`text-xs font-medium ${delta > 0 ? 'text-red-500' : delta < 0 ? 'text-green-600' : 'text-gray-400'}`}>
                          {delta > 0
                            ? `+${fmtPKR(delta)}`
                            : delta < 0
                              ? `-${fmtPKR(Math.abs(delta))}`
                              : '—'}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
