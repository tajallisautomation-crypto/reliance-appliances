import { useState, useEffect } from 'react';
import {
  Package, ImageOff, AlertTriangle, ShoppingBag, FileText,
  CalendarDays, Users, Zap, Star, Building2, TrendingUp,
  CheckCircle, XCircle, Clock, RefreshCw, ArrowRight,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { fmtPKR } from '@/lib/api';
import type { Product } from '@/lib/api';
import { qcSummary } from '@/lib/qc';

function productHasImage(p: Product) {
  return !!(p.thumbnail?.startsWith('http')) || (p.gallery?.some((u: string) => u?.startsWith('http')) ?? false);
}

interface DashMetrics {
  ordersToday: number;
  revenueToday: number;
  ordersPending: number;
  pendingQuotations: number;
  unpaidInvoiceCount: number;
  unpaidInvoiceTotal: number;
  overdueInstallments: number;
  dueInstallments: number;
  enquiriesWeek: number;
  solarLeadsActive: number;
  partnerLeadsNew: number;
  avgRating: number;
  reviewCount: number;
}

function StatCard({
  label, value, sub, icon: Icon, color = 'text-gray-500', bg = 'bg-gray-50',
  warn = false, onClick,
}: {
  label: string; value: string | number; sub?: string;
  icon: any; color?: string; bg?: string;
  warn?: boolean; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left bg-white rounded-2xl p-4 border shadow-sm transition-shadow hover:shadow-md
        ${warn ? 'border-amber-200' : 'border-gray-100'}`}
    >
      <div className="flex items-start justify-between mb-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${bg}`}>
          <Icon className={`w-3.5 h-3.5 ${color}`} />
        </div>
      </div>
      <p className={`text-2xl font-black leading-none ${warn && Number(value) > 0 ? 'text-amber-600' : 'text-gray-900'}`}>{value}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-1">{sub}</p>}
    </button>
  );
}

function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">{title}</h2>
      {action && (
        <button onClick={onAction} className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium">
          {action} <ArrowRight className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

export default function AdminDashboard({
  products,
  onNavigate,
}: {
  products: Product[];
  onNavigate: (tab: string) => void;
}) {
  const [metrics, setMetrics] = useState<DashMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  async function load() {
    setLoading(true);
    const today = new Date().toISOString().slice(0, 10);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const todayDue = new Date().toISOString().slice(0, 10);

    const safe = async <T,>(q: PromiseLike<{ data: T[] | null }>) => {
      try { const r = await q; return r.data || []; } catch { return [] as T[]; }
    };

    const [
      todayOrders, pendingOrders, pendingQuotes, unpaidInv,
      overdueInst, dueInst, weekEnq, solarLeads, partnerLeads, reviews,
    ] = await Promise.all([
      safe(supabase.from('orders').select('id,total_amount').gte('created_at', today + 'T00:00:00')),
      safe(supabase.from('orders').select('id').eq('status', 'pending')),
      safe(supabase.from('invoices').select('id').eq('doc_type', 'quotation').eq('payment_status', 'pending')),
      safe(supabase.from('invoices').select('id,grand_total').neq('doc_type', 'quotation').in('payment_status', ['pending', 'partial'])),
      safe(supabase.from('installment_schedules').select('id').eq('status', 'overdue')),
      safe(supabase.from('installment_schedules').select('id').eq('status', 'pending').lte('due_date', todayDue)),
      safe(supabase.from('analytics').select('id').gte('created_at', weekAgo)),
      safe(supabase.from('solar_leads').select('id,status').in('status', ['new', 'contacted', 'quoted'])),
      safe(supabase.from('partner_leads').select('id,status').in('status', ['new', 'contacted'])),
      safe(supabase.from('reviews').select('id,rating')),
    ]);

    const todayRev = (todayOrders as any[]).reduce((s, o) => s + (Number(o.total_amount) || 0), 0);
    const unpaidTotal = (unpaidInv as any[]).reduce((s, i) => s + (Number(i.grand_total) || 0), 0);
    const ratings = (reviews as any[]).map(r => Number(r.rating)).filter(Boolean);
    const avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

    setMetrics({
      ordersToday: todayOrders.length,
      revenueToday: todayRev,
      ordersPending: pendingOrders.length,
      pendingQuotations: pendingQuotes.length,
      unpaidInvoiceCount: unpaidInv.length,
      unpaidInvoiceTotal: unpaidTotal,
      overdueInstallments: overdueInst.length,
      dueInstallments: dueInst.length,
      enquiriesWeek: weekEnq.length,
      solarLeadsActive: solarLeads.length,
      partnerLeadsNew: partnerLeads.length,
      avgRating: Math.round(avgRating * 10) / 10,
      reviewCount: reviews.length,
    });
    setLastUpdated(new Date());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  // Catalog stats from products prop
  const totalProducts = products.length;
  const missingImages = products.filter(p => !productHasImage(p)).length;
  const outOfStock = products.filter(p => p.stock_status !== 'In Stock').length;
  const qcIssues = products.length > 0 ? qcSummary(products).qcIssues : 0;
  const featured = products.filter(p => p.featured).length;

  return (
    <div className="space-y-8">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black text-gray-900">Dashboard</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {lastUpdated
              ? `Updated ${lastUpdated.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}`
              : 'Loading…'}
          </p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 border border-gray-200 px-3 py-1.5 rounded-lg">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Catalog health */}
      <div>
        <SectionHeader title="Catalog" action="Go to Products" onAction={() => onNavigate('products')} />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard label="Total Products" value={totalProducts} icon={Package}
            bg="bg-brand-50" color="text-brand-600" onClick={() => onNavigate('products')} />
          <StatCard label="Missing Images" value={missingImages} icon={ImageOff}
            warn={missingImages > 0} bg="bg-amber-50" color="text-amber-500"
            sub={missingImages > 0 ? 'Need images' : 'All covered'}
            onClick={() => onNavigate('images')} />
          <StatCard label="QC Issues" value={qcIssues} icon={AlertTriangle}
            warn={qcIssues > 0} bg="bg-red-50" color="text-red-500"
            sub={qcIssues > 0 ? 'Review needed' : 'All clear'}
            onClick={() => onNavigate('qc')} />
          <StatCard label="Out of Stock" value={outOfStock} icon={XCircle}
            warn={outOfStock > 0} bg="bg-orange-50" color="text-orange-500"
            onClick={() => onNavigate('products')} />
          <StatCard label="Featured" value={featured} icon={Star}
            bg="bg-yellow-50" color="text-yellow-600"
            onClick={() => onNavigate('products')} />
        </div>
      </div>

      {/* Sales & Finance */}
      <div>
        <SectionHeader title="Sales & Finance" action="View Orders" onAction={() => onNavigate('orders')} />
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 animate-pulse h-24" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <StatCard label="Orders Today" value={metrics?.ordersToday ?? 0} icon={ShoppingBag}
              bg="bg-green-50" color="text-green-600"
              sub={metrics?.revenueToday ? fmtPKR(metrics.revenueToday) : 'No revenue yet'}
              onClick={() => onNavigate('orders')} />
            <StatCard label="Pending Orders" value={metrics?.ordersPending ?? 0} icon={Clock}
              warn={(metrics?.ordersPending ?? 0) > 0}
              bg="bg-amber-50" color="text-amber-500"
              sub="Awaiting confirmation" onClick={() => onNavigate('orders')} />
            <StatCard label="Pending Quotations" value={metrics?.pendingQuotations ?? 0} icon={FileText}
              bg="bg-blue-50" color="text-blue-600"
              sub="Awaiting approval" onClick={() => onNavigate('invoices')} />
            <StatCard label="Unpaid Invoices" value={metrics?.unpaidInvoiceCount ?? 0} icon={TrendingUp}
              warn={(metrics?.unpaidInvoiceCount ?? 0) > 0}
              bg="bg-purple-50" color="text-purple-600"
              sub={metrics?.unpaidInvoiceTotal ? fmtPKR(metrics.unpaidInvoiceTotal) : undefined}
              onClick={() => onNavigate('invoices')} />
          </div>
        )}
      </div>

      {/* Installments */}
      <div>
        <SectionHeader title="Installments" action="View Ledger" onAction={() => onNavigate('installment_ledger')} />
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 animate-pulse h-24" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Due Today" value={metrics?.dueInstallments ?? 0} icon={CalendarDays}
              warn={(metrics?.dueInstallments ?? 0) > 0}
              bg="bg-amber-50" color="text-amber-500"
              sub="Payments due" onClick={() => onNavigate('installment_ledger')} />
            <StatCard label="Overdue" value={metrics?.overdueInstallments ?? 0} icon={AlertTriangle}
              warn={(metrics?.overdueInstallments ?? 0) > 0}
              bg="bg-red-50" color="text-red-500"
              sub="Missed payments" onClick={() => onNavigate('installment_ledger')} />
          </div>
        )}
      </div>

      {/* CRM & Leads */}
      <div>
        <SectionHeader title="CRM & Leads" action="View Enquiries" onAction={() => onNavigate('enquiries')} />
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 animate-pulse h-24" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Enquiries (7d)" value={metrics?.enquiriesWeek ?? 0} icon={Zap}
              bg="bg-indigo-50" color="text-indigo-600"
              sub="New this week" onClick={() => onNavigate('enquiries')} />
            <StatCard label="Solar Leads" value={metrics?.solarLeadsActive ?? 0} icon={CheckCircle}
              bg="bg-yellow-50" color="text-yellow-600"
              sub="Active pipeline" onClick={() => onNavigate('solar')} />
            <StatCard label="Partner Leads" value={metrics?.partnerLeadsNew ?? 0} icon={Building2}
              bg="bg-teal-50" color="text-teal-600"
              sub="Uncontacted" onClick={() => onNavigate('leads')} />
            <StatCard label="Reviews" value={`${metrics?.avgRating ?? '–'}★`} icon={Star}
              bg="bg-orange-50" color="text-orange-500"
              sub={`${metrics?.reviewCount ?? 0} total reviews`}
              onClick={() => onNavigate('reviews')} />
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div>
        <SectionHeader title="Quick Actions" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {[
            { label: 'New Quotation', icon: FileText, tab: 'quotation', color: 'text-brand-600', bg: 'bg-brand-50' },
            { label: 'Import Products', icon: Package, tab: 'import', color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Fix Missing Images', icon: ImageOff, tab: 'images', color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Customer CRM', icon: Users, tab: 'customers', color: 'text-purple-600', bg: 'bg-purple-50' },
          ].map(({ label, icon: Icon, tab, color, bg }) => (
            <button key={tab} onClick={() => onNavigate(tab)}
              className="flex items-center gap-3 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow text-left">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <span className="text-sm font-semibold text-gray-700">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
