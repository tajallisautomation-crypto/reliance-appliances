import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  ComposedChart, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  ReferenceLine, CartesianGrid,
} from 'recharts';
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingBag, Users, Zap,
  AlertTriangle, CheckCircle, Target, BarChart2, Activity, RefreshCw,
  Plus, Save, Trash2, Lightbulb, ArrowUp, ArrowDown, Package,
  MessageCircle, FileText, Sun, Calendar, Settings,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatPrice } from '@/lib/api';
import SEO from '@/components/ui/SEO';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Order {
  id: string; customer_name: string; customer_phone: string;
  customer_address?: string; products: any[]; total_amount: number;
  payment_method: string; status: string; created_at: string;
}
interface Invoice {
  id: string; ref_number: string; doc_type: string; customer_name?: string;
  customer_phone?: string; customer_area?: string; customer_type?: string;
  sale_type?: string; service_level?: string; grand_total?: number;
  subtotal?: number; discount_pct?: number; payment_status: string;
  inst_total_price?: number; inst_months?: number; inst_monthly_amt?: number;
  created_at: string;
}
interface InvoiceLine {
  id: string; invoice_id: string; product_id?: string; name?: string;
  category?: string; brand?: string; qty?: number; unit_price?: number;
  line_total?: number;
}
interface SolarLead {
  id: string; name: string; phone: string; city: string;
  system_kw: number; monthly_bill: number; est_savings: number;
  status: string; created_at: string;
}
interface AnalyticsEvent {
  id: string; event: string; customer_name?: string;
  customer_phone?: string; subject?: string; created_at: string;
}
interface BiExpense {
  id: string; month: string; category: string;
  amount: number; description?: string;
}
interface BiTarget {
  id: string; month: string; revenue_target?: number;
  order_target?: number; solar_lead_target?: number; notes?: string;
}
interface BiOfflineSale {
  id: string; sale_date: string; amount: number;
  category?: string; description?: string; channel?: string;
}
interface BiProductCost {
  id: string; product_name: string; product_id?: string;
  category?: string; cost_price: number; effective_date: string;
}
interface InstallmentLedgerRow {
  invoice_id: string; ref_number: string; customer_name?: string;
  customer_phone?: string; contract_total?: number; total_collected?: number;
  balance_outstanding?: number; pending_slots?: number; overdue_slots?: number;
  paid_slots?: number; payment_status: string;
}

type Tab = 'summary' | 'revenue' | 'sales' | 'seasonality' | 'customers' | 'leads' | 'insights' | 'studio';

// ─── Constants ────────────────────────────────────────────────────────────────
const ADMIN_PASS = (import.meta as any).env?.VITE_ADMIN_PASS || 'reliance2025';
const C = ['#0F2D52','#2E7D32','#FFC107','#8b5cf6','#3FA34D','#ef4444','#14b8a6','#0C2444','#64748b','#06b6d4'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const EXPENSE_CATS = ['rent','utilities','staff_salaries','marketing','logistics','maintenance','purchase_costs','other'];
const REPORT_TABS: { key: Tab; label: string; icon: any }[] = [
  { key: 'summary',    label: 'Summary',     icon: BarChart2   },
  { key: 'revenue',    label: 'Revenue',     icon: DollarSign  },
  { key: 'sales',      label: 'Sales',       icon: ShoppingBag },
  { key: 'seasonality',label: 'Seasonality', icon: Calendar    },
  { key: 'customers',  label: 'Customers',   icon: Users       },
  { key: 'leads',      label: 'Leads',       icon: Zap         },
  { key: 'insights',   label: 'Insights',    icon: Lightbulb   },
  { key: 'studio',     label: 'Data Studio', icon: Settings    },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const pk = (n: number) => `PKR ${formatPrice(n)}`;
const pct = (a: number, b: number) => b ? ((a / b - 1) * 100).toFixed(1) : '0.0';
const monthKey = (d: string | Date) => {
  const dt = typeof d === 'string' ? new Date(d) : d;
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
};
const monthLabel = (key: string) => {
  const [y, m] = key.split('-');
  return `${MONTHS[Number(m) - 1]} '${y.slice(2)}`;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 shadow-lg rounded-xl px-3 py-2 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
          {p.name}: <strong>{typeof p.value === 'number' && p.value > 10000 ? pk(p.value) : p.value}</strong>
        </p>
      ))}
    </div>
  );
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, change, up, icon: Icon, color = 'text-brand-600' }: {
  label: string; value: string; sub?: string; change?: string; up?: boolean;
  icon: any; color?: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center bg-gray-50 ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="text-2xl font-black text-gray-900 leading-none mb-1">{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
      {change && (
        <p className={`text-xs font-medium mt-2 flex items-center gap-0.5 ${up ? 'text-emerald-600' : 'text-red-500'}`}>
          {up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />} {change}
        </p>
      )}
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className="mb-4">
        <h3 className="font-bold text-gray-900 text-sm">{title}</h3>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      {children}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function Empty({ msg = 'No data yet' }: { msg?: string }) {
  return (
    <div className="h-40 flex flex-col items-center justify-center text-gray-300 gap-2">
      <BarChart2 className="h-8 w-8" />
      <p className="text-sm">{msg}</p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ReportsPortal({ embedded = false }: { embedded?: boolean } = {}) {
  const [authed, setAuthed] = useState(embedded); // skip auth gate when embedded in admin
  const [passInput, setPass] = useState('');
  const [tab, setTab] = useState<Tab>('summary');
  const [period, setPeriod] = useState<'3m' | '6m' | '12m'>('6m');
  const [loading, setLoading] = useState(false);
  const [refreshedAt, setRefreshedAt] = useState(new Date());

  // Raw data state
  const [orders, setOrders] = useState<Order[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [lines, setLines] = useState<InvoiceLine[]>([]);
  const [solarLeads, setSolarLeads] = useState<SolarLead[]>([]);
  const [analyticsEvents, setAnalyticsEvents] = useState<AnalyticsEvent[]>([]);
  const [ledger, setLedger] = useState<InstallmentLedgerRow[]>([]);
  const [expenses, setExpenses] = useState<BiExpense[]>([]);
  const [targets, setTargets] = useState<BiTarget[]>([]);
  const [offlineSales, setOfflineSales] = useState<BiOfflineSale[]>([]);
  const [productCosts, setProductCosts] = useState<BiProductCost[]>([]);

  // Studio form state
  const [studioTab, setStudioTab] = useState<'targets' | 'expenses' | 'cogs' | 'offline'>('targets');
  const [targetForm, setTargetForm] = useState({ month: '', revenue_target: '', order_target: '', solar_lead_target: '', notes: '' });
  const [expenseForm, setExpenseForm] = useState({ month: '', category: 'rent', amount: '', description: '' });
  const [cogsForm, setCogsForm] = useState({ product_name: '', category: '', cost_price: '', effective_date: new Date().toISOString().slice(0, 10) });
  const [offlineForm, setOfflineForm] = useState({ sale_date: new Date().toISOString().slice(0, 10), amount: '', category: '', description: '', channel: 'walk_in' });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const safe = async (q: PromiseLike<any>) => { try { const r = await q; return r.data || []; } catch { return []; } };
    const [ord, inv, ln, sl, ae, exp, tgt, off, pc, led] = await Promise.all([
      safe(supabase.from('orders').select('id,customer_name,customer_phone,customer_address,products,total_amount,payment_method,status,created_at').order('created_at', { ascending: false })),
      safe(supabase.from('invoices').select('id,ref_number,doc_type,customer_name,customer_phone,customer_area,customer_type,sale_type,service_level,grand_total,subtotal,discount_pct,payment_status,inst_total_price,inst_months,inst_monthly_amt,created_at').order('created_at', { ascending: false })),
      safe(supabase.from('invoice_lines').select('id,invoice_id,product_id,name,category,brand,qty,unit_price,line_total')),
      safe(supabase.from('solar_leads').select('*').order('created_at', { ascending: false })),
      safe(supabase.from('analytics').select('id,event,customer_name,customer_phone,subject,created_at').order('created_at', { ascending: false }).limit(500)),
      safe(supabase.from('bi_expenses').select('*').order('month', { ascending: false })),
      safe(supabase.from('bi_targets').select('*').order('month', { ascending: false })),
      safe(supabase.from('bi_offline_sales').select('*').order('sale_date', { ascending: false })),
      safe(supabase.from('bi_product_costs').select('*').order('created_at', { ascending: false })),
      safe(supabase.from('installment_ledger').select('*')),
    ]);
    setOrders(ord); setInvoices(inv); setLines(ln); setSolarLeads(sl);
    setAnalyticsEvents(ae); setExpenses(exp); setTargets(tgt);
    setOfflineSales(off); setProductCosts(pc); setLedger(led);
    setRefreshedAt(new Date());
    setLoading(false);
  }, []);

  useEffect(() => { if (authed) fetchData(); }, [authed, fetchData]);

  // ─── Date window ───────────────────────────────────────────
  const cutoff = useMemo(() => {
    const d = new Date(); d.setMonth(d.getMonth() - Number(period.replace('m', '')));
    return d.toISOString();
  }, [period]);

  // ─── Computed metrics ──────────────────────────────────────
  const metrics = useMemo(() => {
    const filtInv = invoices.filter(i => i.created_at >= cutoff && i.doc_type !== 'quotation');
    const filtOrd = orders.filter(o => o.created_at >= cutoff);
    const allOrd  = orders;

    // Monthly revenue from invoices (preferred) or orders fallback
    const revSource = filtInv.length ? filtInv : filtOrd;
    const revField  = filtInv.length ? 'grand_total' : 'total_amount';
    const monthMap = new Map<string, { revenue: number; orders: number; target?: number }>();
    for (const r of revSource) {
      const k = monthKey(r.created_at);
      if (!monthMap.has(k)) monthMap.set(k, { revenue: 0, orders: 0 });
      monthMap.get(k)!.revenue += Number((r as any)[revField]) || 0;
      monthMap.get(k)!.orders  += 1;
    }
    // Attach offline sales
    for (const o of offlineSales.filter(o => o.sale_date >= cutoff.slice(0, 10))) {
      const k = monthKey(o.sale_date);
      if (!monthMap.has(k)) monthMap.set(k, { revenue: 0, orders: 0 });
      monthMap.get(k)!.revenue += Number(o.amount) || 0;
    }
    // Attach targets
    for (const t of targets) {
      const k = t.month.slice(0, 7);
      if (monthMap.has(k)) monthMap.get(k)!.target = Number(t.revenue_target) || undefined;
    }
    const monthlyRevenue = Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => ({ key: k, month: monthLabel(k), ...v }));

    const totalRevenue = monthlyRevenue.reduce((s, m) => s + m.revenue, 0);
    const now = monthKey(new Date());
    const thisMonthRev = monthMap.get(now)?.revenue || 0;
    const prevMonthKey = (() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return monthKey(d); })();
    const lastMonthRev = monthMap.get(prevMonthKey)?.revenue || 0;
    const revenueGrowth = lastMonthRev > 0 ? ((thisMonthRev - lastMonthRev) / lastMonthRev) * 100 : 0;

    // Category breakdown from invoice_lines
    const filtLineIds = new Set(filtInv.map(i => i.id));
    const filtLines = lines.filter(l => filtLineIds.has(l.invoice_id));
    const catMap = new Map<string, number>();
    for (const l of filtLines) {
      const cat = l.category || 'Other';
      catMap.set(cat, (catMap.get(cat) || 0) + (Number(l.line_total) || 0));
    }
    const categoryBreakdown = Array.from(catMap.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([name, revenue], i) => ({ name, revenue, value: revenue, color: C[i % C.length] }));

    // Top products from invoice_lines
    const prodMap = new Map<string, { revenue: number; qty: number; category: string; brand: string }>();
    for (const l of filtLines) {
      const key = l.name || 'Unknown';
      if (!prodMap.has(key)) prodMap.set(key, { revenue: 0, qty: 0, category: l.category || '', brand: l.brand || '' });
      const p = prodMap.get(key)!;
      p.revenue += Number(l.line_total) || 0;
      p.qty     += Number(l.qty) || 1;
    }
    const topProducts = Array.from(prodMap.entries())
      .sort(([, a], [, b]) => b.revenue - a.revenue)
      .slice(0, 10)
      .map(([name, v]) => ({ name: name.length > 30 ? name.slice(0, 28) + '…' : name, ...v }));

    // Payment methods
    const pmMap = new Map<string, number>();
    const pmSource = filtInv.length
      ? filtInv.map(i => ({ method: i.sale_type || 'cash' }))
      : filtOrd.map(o => ({ method: o.payment_method }));
    for (const { method } of pmSource) {
      const m = method === 'installment' ? 'Installment' : method === 'bank' ? 'Bank Transfer' : 'Cash';
      pmMap.set(m, (pmMap.get(m) || 0) + 1);
    }
    const paymentMethods = Array.from(pmMap.entries())
      .map(([name, value], i) => ({ name, value, color: C[i % C.length] }));

    // Avg order value
    const totalOrders = revSource.length;
    const avgOrderValue = totalOrders ? totalRevenue / totalOrders : 0;

    // Installment health
    const instTotal = ledger.reduce((s, r) => s + (Number(r.contract_total) || 0), 0);
    const instCollected = ledger.reduce((s, r) => s + (Number(r.total_collected) || 0), 0);
    const instOutstanding = ledger.reduce((s, r) => s + (Number(r.balance_outstanding) || 0), 0);
    const instOverdue = ledger.reduce((s, r) => s + (Number(r.overdue_slots) || 0), 0);

    // Solar lead funnel
    const stages = ['new', 'contacted', 'quoted', 'closed'];
    const solarFunnel = stages.map((s, i) => ({
      stage: s.charAt(0).toUpperCase() + s.slice(1),
      count: solarLeads.filter(l => l.status === s).length,
      color: C[i],
    }));
    const solarByCity = Object.entries(
      solarLeads.reduce((acc, l) => ({ ...acc, [l.city]: (acc[l.city] || 0) + 1 }), {} as Record<string, number>)
    ).map(([city, count], i) => ({ city, count, value: count, color: C[i % C.length] }));

    // Seasonality — all-time monthly pattern
    const seasonMap = new Map<number, { revenue: number; orders: number }>();
    for (let m = 1; m <= 12; m++) seasonMap.set(m, { revenue: 0, orders: 0 });
    for (const r of allOrd) {
      const m = new Date(r.created_at).getMonth() + 1;
      const e = seasonMap.get(m)!;
      e.revenue += Number(r.total_amount) || 0;
      e.orders  += 1;
    }
    for (const inv of invoices.filter(i => i.doc_type !== 'quotation')) {
      const m = new Date(inv.created_at).getMonth() + 1;
      const e = seasonMap.get(m)!;
      e.revenue += Number(inv.grand_total) || 0;
    }
    const avgSeasonRev = Array.from(seasonMap.values()).reduce((s, v) => s + v.revenue, 0) / 12;
    const seasonalData = Array.from(seasonMap.entries()).map(([m, v]) => ({
      month: MONTHS[m - 1],
      revenue: v.revenue,
      orders: v.orders,
      index: avgSeasonRev > 0 ? Math.round((v.revenue / avgSeasonRev) * 100) : 0,
    }));

    // Customer analysis from invoices
    const custMap = new Map<string, { name: string; revenue: number; orders: number; area: string }>();
    for (const inv of filtInv) {
      const key = inv.customer_phone || inv.customer_name || 'Unknown';
      if (!custMap.has(key)) custMap.set(key, { name: inv.customer_name || 'Unknown', revenue: 0, orders: 0, area: inv.customer_area || '' });
      const c = custMap.get(key)!;
      c.revenue += Number(inv.grand_total) || 0;
      c.orders  += 1;
    }
    const uniqueCustomers = custMap.size;
    const repeatCustomers = Array.from(custMap.values()).filter(c => c.orders > 1).length;
    const topCustomers = Array.from(custMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

    const areaMap = new Map<string, number>();
    for (const inv of filtInv) {
      const a = inv.customer_area || 'Unknown';
      areaMap.set(a, (areaMap.get(a) || 0) + 1);
    }
    const customerAreas = Array.from(areaMap.entries())
      .sort(([, a], [, b]) => b - a).slice(0, 8)
      .map(([area, count]) => ({ area, count }));

    const typeMap = new Map<string, number>();
    for (const inv of filtInv) {
      const t = inv.customer_type || 'house';
      typeMap.set(t, (typeMap.get(t) || 0) + 1);
    }
    const customerTypes = Array.from(typeMap.entries())
      .map(([name, value], i) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value, color: C[i] }));

    // Order status
    const statusMap = new Map<string, number>();
    for (const o of filtOrd) statusMap.set(o.status, (statusMap.get(o.status) || 0) + 1);
    const orderStatuses = Array.from(statusMap.entries())
      .map(([name, value], i) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value, color: C[i] }));

    // Gross margin (if COGS data present)
    const grossMarginData = (() => {
      if (!productCosts.length) return [];
      const costByName = new Map(productCosts.map(c => [c.product_name.toLowerCase(), Number(c.cost_price)]));
      let totalCost = 0; let totalRev = 0;
      for (const l of filtLines) {
        const cost = costByName.get((l.name || '').toLowerCase());
        if (cost && l.line_total) { totalCost += cost * (l.qty || 1); totalRev += l.line_total; }
      }
      return totalRev > 0 ? [{ name: 'Gross Profit', value: Math.round(((totalRev - totalCost) / totalRev) * 100) }] : [];
    })();

    // Total expenses
    const filtExp = expenses.filter(e => e.month >= cutoff.slice(0, 7) + '-01');
    const totalExpenses = filtExp.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const monthlyExpenses = (() => {
      const m = new Map<string, number>();
      for (const e of filtExp) { const k = e.month.slice(0, 7); m.set(k, (m.get(k) || 0) + Number(e.amount)); }
      return Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => ({ month: monthLabel(k), expenses: v }));
    })();

    // Analytics events
    const eventMap = new Map<string, number>();
    for (const e of analyticsEvents) eventMap.set(e.event, (eventMap.get(e.event) || 0) + 1);
    const topEvents = Array.from(eventMap.entries()).sort(([, a], [, b]) => b - a)
      .map(([event, count], i) => ({ event, count, color: C[i % C.length] }));

    return {
      monthlyRevenue, totalRevenue, thisMonthRev, lastMonthRev, revenueGrowth,
      totalOrders, avgOrderValue, categoryBreakdown, topProducts, paymentMethods,
      instTotal, instCollected, instOutstanding, instOverdue,
      solarFunnel, solarByCity,
      seasonalData, uniqueCustomers, repeatCustomers, topCustomers, customerAreas, customerTypes,
      orderStatuses, grossMarginData, totalExpenses, monthlyExpenses, topEvents,
    };
  }, [invoices, orders, lines, solarLeads, analyticsEvents, ledger, offlineSales, targets, expenses, productCosts, cutoff]);

  // ─── Strategic insights ────────────────────────────────────
  const insights = useMemo(() => {
    const m = metrics;
    const month = new Date().getMonth() + 1;
    const list: { type: 'opportunity' | 'risk' | 'seasonal' | 'operational'; title: string; insight: string; action: string; priority: 'high' | 'medium' | 'low' }[] = [];

    // Revenue momentum
    if (m.revenueGrowth > 15) list.push({ type: 'opportunity', title: 'Strong Revenue Momentum', insight: `Revenue grew ${m.revenueGrowth.toFixed(0)}% vs last month. Capitalize now.`, action: 'Increase inventory depth for top-selling categories. Consider promotional push.', priority: 'high' });
    else if (m.revenueGrowth < -10) list.push({ type: 'risk', title: 'Revenue Decline Detected', insight: `Revenue dropped ${Math.abs(m.revenueGrowth).toFixed(0)}% vs last month. Investigate cause.`, action: 'Review order pipeline, check competitor pricing, activate follow-up calls.', priority: 'high' });

    // Category concentration
    if (m.categoryBreakdown.length && m.totalRevenue > 0) {
      const top = m.categoryBreakdown[0];
      const share = (top.revenue / m.totalRevenue) * 100;
      if (share > 50) list.push({ type: 'risk', title: 'Revenue Concentration', insight: `${top.name} represents ${share.toFixed(0)}% of revenue. Business is vulnerable to category slowdowns.`, action: 'Actively cross-sell Solar, Water Heaters, or seasonal appliances to diversify.', priority: 'medium' });
    }

    // Seasonal — Pakistan context
    if (month >= 2 && month <= 4) list.push({ type: 'seasonal', title: 'Pre-Summer Peak (Feb–Apr)', insight: 'AC and cooling demand surges from March. Stock is historically a bottleneck.', action: 'Pre-book AC inventory (Haier, Gree, EcoStar). Hire installation staff. Offer early-bird pricing.', priority: 'high' });
    if (month >= 9 && month <= 11) list.push({ type: 'seasonal', title: 'Winter Season Incoming (Oct–Dec)', insight: 'Heater, geyser, and water heater demand rises sharply in Oct–Dec in Karachi and northern cities.', action: 'Push Hanco/EcoStar water heaters, gas/electric heaters. Run social media campaigns.', priority: 'medium' });
    if (month >= 3 && month <= 9) list.push({ type: 'seasonal', title: 'Solar High Season (Mar–Sep)', insight: 'Peak sunshine months drive highest solar ROI for customers. Urgency is highest now.', action: 'Run targeted WhatsApp campaigns for solar leads. Offer free site surveys. Promote financing.', priority: 'high' });

    // Installment overdue
    if (m.instOverdue > 5) list.push({ type: 'risk', title: `${m.instOverdue} Overdue Installments`, insight: `Outstanding balance ${pk(m.instOutstanding)} at risk. Overdue slots mean cash flow pressure.`, action: 'Prioritize collection calls for overdue accounts. Offer 1-time settlement discount if >60 days.', priority: 'high' });

    // Solar conversion
    const solarTotal = solarLeads.length;
    const solarClosed = solarLeads.filter(l => l.status === 'closed').length;
    const solarConv = solarTotal > 0 ? (solarClosed / solarTotal) * 100 : 0;
    if (solarTotal >= 3 && solarConv < 20) list.push({ type: 'opportunity', title: 'Solar Conversion Below Target', insight: `${solarConv.toFixed(0)}% conversion on ${solarTotal} leads. Industry benchmark is 20–30%.`, action: 'Follow up within 24h of inquiry. Offer free proposal + WhatsApp quote. Create urgency with net-metering deadlines.', priority: 'high' });

    // Cash vs installment
    const cashPm = m.paymentMethods.find(p => p.name === 'Cash');
    const totalPm = m.paymentMethods.reduce((s, p) => s + p.value, 0);
    if (cashPm && totalPm > 10) {
      const cashR = (cashPm.value / totalPm) * 100;
      if (cashR > 70) list.push({ type: 'opportunity', title: 'EMI Upsell Potential', insight: `${cashR.toFixed(0)}% of orders are cash. Installment plans enable higher-ticket purchases.`, action: 'For any order >PKR 80k, proactively offer 6–12 month plan. Highlight affordability.', priority: 'medium' });
    }

    // Avg order value
    if (m.avgOrderValue > 0 && m.avgOrderValue < 80000 && m.totalOrders > 5) list.push({ type: 'opportunity', title: 'Low Avg Order Value', insight: `Average transaction is ${pk(m.avgOrderValue)}. Upselling can significantly boost margins.`, action: 'Bundle products (AC + installation), offer appliance combos, cross-sell warranties.', priority: 'medium' });

    // Expenses vs revenue
    if (m.totalExpenses > 0 && m.totalRevenue > 0) {
      const expRatio = (m.totalExpenses / m.totalRevenue) * 100;
      if (expRatio > 30) list.push({ type: 'risk', title: 'High Expense-to-Revenue Ratio', insight: `Expenses are ${expRatio.toFixed(0)}% of revenue. Target is under 25% for healthy margins.`, action: 'Audit staff_salaries and logistics. Renegotiate rent if above market. Reduce marketing waste.', priority: 'high' });
    }

    // Customer repeat rate
    if (m.uniqueCustomers > 10) {
      const repeatRate = (m.repeatCustomers / m.uniqueCustomers) * 100;
      if (repeatRate < 15) list.push({ type: 'opportunity', title: 'Low Customer Retention', insight: `Only ${repeatRate.toFixed(0)}% of customers repeat. Loyalty drives 2–5× cheaper growth vs acquisition.`, action: 'Launch post-sale follow-up sequence. Offer maintenance packages. WhatsApp birthday/anniversary promos.', priority: 'medium' });
    }

    if (list.length === 0) list.push({ type: 'operational', title: 'Add More Data for Deeper Insights', insight: 'Connect invoices, expenses, and targets in the Data Studio to unlock strategic analysis.', action: 'Go to Data Studio → enter monthly targets, operating expenses, and product costs.', priority: 'low' } as any);

    const order = { high: 0, medium: 1, low: 2 };
    return list.sort((a, b) => (order[a.priority] || 2) - (order[b.priority] || 2));
  }, [metrics, solarLeads]);

  // ─── Auth Gate ─────────────────────────────────────────────
  if (!authed) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <SEO title="Reports Portal" noIndex />
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm border border-gray-100">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#0F2D52,#0C2444)' }}>
            <TrendingUp className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-xl font-black text-gray-900">Reports Portal</h1>
          <p className="text-sm text-gray-400 mt-1">Tajalli's Business Intelligence</p>
        </div>
        <div className="space-y-3">
          <input type="password" value={passInput} onChange={e => setPass(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && passInput === ADMIN_PASS && setAuthed(true)}
            placeholder="Admin password" className="input-field" autoFocus />
          <button onClick={() => { if (passInput === ADMIN_PASS) setAuthed(true); }}
            className="btn-primary w-full justify-center py-3">
            Enter Portal
          </button>
        </div>
      </div>
    </div>
  );

  const TABS = REPORT_TABS;

  // ─── Save helpers ──────────────────────────────────────────
  const toast = (msg: string) => { setSaveMsg(msg); setTimeout(() => setSaveMsg(''), 3000); };

  const saveTarget = async () => {
    if (!targetForm.month) return;
    setSaving(true);
    const { error } = await supabase.from('bi_targets').upsert({
      month: targetForm.month + '-01',
      revenue_target: Number(targetForm.revenue_target) || null,
      order_target: Number(targetForm.order_target) || null,
      solar_lead_target: Number(targetForm.solar_lead_target) || null,
      notes: targetForm.notes || null,
    }, { onConflict: 'month' });
    setSaving(false);
    if (!error) { toast('Target saved'); fetchData(); setTargetForm({ month: '', revenue_target: '', order_target: '', solar_lead_target: '', notes: '' }); }
    else toast('Error: ' + error.message);
  };

  const saveExpense = async () => {
    if (!expenseForm.month || !expenseForm.amount) return;
    setSaving(true);
    const { error } = await supabase.from('bi_expenses').upsert({
      month: expenseForm.month + '-01', category: expenseForm.category,
      amount: Number(expenseForm.amount), description: expenseForm.description || null,
    }, { onConflict: 'month, category' });
    setSaving(false);
    if (!error) { toast('Expense saved'); fetchData(); setExpenseForm({ month: '', category: 'rent', amount: '', description: '' }); }
    else toast('Error: ' + error.message);
  };

  const saveCogs = async () => {
    if (!cogsForm.product_name || !cogsForm.cost_price) return;
    setSaving(true);
    const { error } = await supabase.from('bi_product_costs').insert({
      product_name: cogsForm.product_name, category: cogsForm.category || null,
      cost_price: Number(cogsForm.cost_price), effective_date: cogsForm.effective_date,
    });
    setSaving(false);
    if (!error) { toast('Cost saved'); fetchData(); setCogsForm({ product_name: '', category: '', cost_price: '', effective_date: new Date().toISOString().slice(0, 10) }); }
    else toast('Error: ' + error.message);
  };

  const saveOffline = async () => {
    if (!offlineForm.sale_date || !offlineForm.amount) return;
    setSaving(true);
    const { error } = await supabase.from('bi_offline_sales').insert({
      sale_date: offlineForm.sale_date, amount: Number(offlineForm.amount),
      category: offlineForm.category || null, description: offlineForm.description || null,
      channel: offlineForm.channel,
    });
    setSaving(false);
    if (!error) { toast('Sale saved'); fetchData(); setOfflineForm({ sale_date: new Date().toISOString().slice(0, 10), amount: '', category: '', description: '', channel: 'walk_in' }); }
    else toast('Error: ' + error.message);
  };

  const deleteRow = async (table: string, id: string) => {
    await supabase.from(table).delete().eq('id', id);
    fetchData();
  };

  // ─── Tab renderers ─────────────────────────────────────────

  const renderSummary = () => (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard label="Revenue (Period)" value={`PKR ${formatPrice(metrics.totalRevenue / 1000)}K`}
          sub={`${metrics.totalOrders} invoices`} change={`${metrics.revenueGrowth > 0 ? '+' : ''}${metrics.revenueGrowth.toFixed(1)}% MoM`}
          up={metrics.revenueGrowth >= 0} icon={DollarSign} color="text-blue-600" />
        <KpiCard label="This Month" value={`PKR ${formatPrice(metrics.thisMonthRev / 1000)}K`}
          sub="month to date" icon={TrendingUp} color="text-emerald-600" />
        <KpiCard label="Avg Order Value" value={`PKR ${formatPrice(metrics.avgOrderValue / 1000)}K`}
          icon={ShoppingBag} color="text-brand-500" />
        <KpiCard label="Inst. Outstanding" value={`PKR ${formatPrice(metrics.instOutstanding / 1000)}K`}
          sub={`${metrics.instOverdue} overdue slots`} up={metrics.instOverdue === 0}
          change={metrics.instOverdue > 0 ? `${metrics.instOverdue} overdue` : 'All clear'}
          icon={FileText} color={metrics.instOverdue > 0 ? 'text-red-500' : 'text-emerald-600'} />
        <KpiCard label="Solar Leads" value={String(solarLeads.length)}
          sub={`${solarLeads.filter(l => l.status === 'new').length} new`}
          icon={Sun} color="text-yellow-500" />
        <KpiCard label="Unique Customers" value={String(metrics.uniqueCustomers)}
          sub={`${metrics.repeatCustomers} repeat`} icon={Users} color="text-purple-600" />
      </div>

      {/* Revenue trend + Category split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Section title="Revenue Trend" sub={`${period} window — invoices + offline sales`}>
            {metrics.monthlyRevenue.length < 2 ? <Empty msg="Need at least 2 months of data" /> : (
              <ResponsiveContainer width="100%" height={240}>
                <ComposedChart data={metrics.monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${Math.round(v / 1000)}K`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="revenue" name="Revenue" fill="#EEF3F8" stroke="#0F2D52" strokeWidth={2} />
                  {metrics.monthlyRevenue.some(m => m.target) &&
                    <Line type="monotone" dataKey="target" name="Target" stroke="#FFC107" strokeWidth={2} strokeDasharray="5 3" dot={false} />}
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </Section>
        </div>
        <Section title="Category Mix" sub="by revenue">
          {metrics.categoryBreakdown.length === 0 ? <Empty msg="Add invoices to see breakdown" /> : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={metrics.categoryBreakdown} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={(e: any) => `${e.name.split(' ')[0]} ${(e.percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                    {metrics.categoryBreakdown.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => pk(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {metrics.categoryBreakdown.slice(0, 5).map((c, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: c.color }} />
                      <span className="text-gray-600 truncate max-w-[120px]">{c.name}</span>
                    </div>
                    <span className="font-semibold text-gray-800">PKR {formatPrice(c.revenue / 1000)}K</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Section>
      </div>

      {/* Alerts */}
      {(metrics.instOverdue > 0 || orders.filter(o => o.status === 'pending').length > 5) && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm space-y-1">
            {metrics.instOverdue > 0 && <p className="text-red-700 font-medium">{metrics.instOverdue} overdue installment slots — outstanding {pk(metrics.instOutstanding)}</p>}
            {orders.filter(o => o.status === 'pending').length > 5 && <p className="text-amber-700 font-medium">{orders.filter(o => o.status === 'pending').length} orders still in Pending status — review & confirm</p>}
          </div>
        </div>
      )}

      {/* Activity feed */}
      <Section title="Recent Activity" sub="latest analytics events">
        {analyticsEvents.length === 0 ? <Empty msg="No events captured yet" /> : (
          <div className="space-y-2 max-h-56 overflow-y-auto">
            {analyticsEvents.slice(0, 20).map((e, i) => (
              <div key={i} className="flex items-center gap-3 py-1.5 border-b border-gray-50 last:border-0">
                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium min-w-fit">{e.event}</span>
                <span className="text-xs text-gray-500 truncate">{e.customer_name || e.subject || '—'}</span>
                <span className="text-xs text-gray-300 ml-auto min-w-fit">{new Date(e.created_at).toLocaleDateString('en-PK', { day:'numeric', month:'short' })}</span>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );

  const renderRevenue = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="Revenue vs Target" sub="actual (bars) · target (dashed line)">
          {metrics.monthlyRevenue.length < 1 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={metrics.monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${Math.round(v / 1000)}K`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="revenue" name="Revenue" fill="#0F2D52" radius={[4, 4, 0, 0]} />
                {metrics.monthlyRevenue.some(m => m.target) &&
                  <Line type="monotone" dataKey="target" name="Target" stroke="#FFC107" strokeWidth={2} strokeDasharray="5 3" dot={false} />}
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </Section>

        <Section title="Payment Method Split" sub="Cash · Bank · Installment">
          {metrics.paymentMethods.length === 0 ? <Empty /> : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={metrics.paymentMethods} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" label={(e: any) => `${e.name} ${(e.percent * 100).toFixed(0)}%`} labelLine fontSize={10}>
                    {metrics.paymentMethods.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => [`${v} orders`, '']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex gap-4 justify-center flex-wrap mt-1">
                {metrics.paymentMethods.map((p, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
                    <span className="text-gray-600">{p.name}</span>
                    <span className="font-bold text-gray-900">{p.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Section>

        <Section title="Installment Portfolio Health" sub="collected vs outstanding vs overdue">
          {ledger.length === 0 ? <Empty msg="No installment invoices yet" /> : (
            <div className="space-y-4">
              {[
                { label: 'Total Contract Value', value: metrics.instTotal, color: 'bg-blue-100 text-blue-700' },
                { label: 'Total Collected', value: metrics.instCollected, color: 'bg-emerald-100 text-emerald-700' },
                { label: 'Outstanding Balance', value: metrics.instOutstanding, color: 'bg-amber-100 text-amber-700' },
              ].map((r, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{r.label}</span>
                  <span className={`text-sm font-bold px-2 py-0.5 rounded-lg ${r.color}`}>{pk(r.value)}</span>
                </div>
              ))}
              <div className="h-4 rounded-full bg-gray-100 overflow-hidden mt-2">
                <div className="h-full bg-emerald-400 rounded-full transition-all"
                  style={{ width: metrics.instTotal > 0 ? `${Math.min(100, (metrics.instCollected / metrics.instTotal) * 100)}%` : '0%' }} />
              </div>
              <p className="text-xs text-gray-400 text-center">
                {metrics.instTotal > 0 ? `${((metrics.instCollected / metrics.instTotal) * 100).toFixed(1)}% collected` : 'No data'}
                {metrics.instOverdue > 0 && <span className="text-red-500 ml-2">· {metrics.instOverdue} overdue slot{metrics.instOverdue > 1 ? 's' : ''}</span>}
              </p>
              {/* Per-customer ledger */}
              <div className="border-t border-gray-100 pt-3 space-y-2 max-h-48 overflow-y-auto">
                {ledger.map((r, i) => (
                  <div key={i} className="flex items-center justify-between text-xs gap-2">
                    <span className="text-gray-600 truncate flex-1">{r.customer_name || r.ref_number}</span>
                    <span className="text-amber-600 font-semibold">{pk(Number(r.balance_outstanding) || 0)} left</span>
                    {Number(r.overdue_slots) > 0 && <span className="text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">{r.overdue_slots} overdue</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Section>

        <Section title="Monthly Expense vs Revenue" sub="requires expense entries in Data Studio">
          {metrics.monthlyExpenses.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center gap-2 text-gray-400">
              <Settings className="h-6 w-6" />
              <p className="text-sm">Enter expenses in Data Studio to see this chart</p>
              <button onClick={() => { setTab('studio'); setStudioTab('expenses'); }}
                className="text-xs text-blue-600 underline">Go to Data Studio →</button>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={metrics.monthlyRevenue.map(m => {
                const expEntry = metrics.monthlyExpenses.find(e => e.month === m.month);
                return { ...m, expenses: expEntry?.expenses || 0, profit: m.revenue - (expEntry?.expenses || 0) };
              })}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${Math.round(v / 1000)}K`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="revenue" name="Revenue" fill="#0F2D52" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="profit" name="Net Profit" stroke="#2E7D32" strokeWidth={2.5} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </Section>
      </div>

      {/* Gross margin */}
      {metrics.grossMarginData.length > 0 && (
        <Section title="Gross Margin" sub="based on product cost entries">
          <div className="flex items-center gap-4">
            <div className="text-4xl font-black text-emerald-600">{metrics.grossMarginData[0]?.value}%</div>
            <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${metrics.grossMarginData[0]?.value}%` }} />
            </div>
            <span className="text-sm text-gray-500">Target: 25–35%</span>
          </div>
        </Section>
      )}
    </div>
  );

  const renderSales = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="Revenue by Category" sub="top categories — invoice lines">
          {metrics.categoryBreakdown.length === 0 ? <Empty msg="No invoice line data" /> : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={metrics.categoryBreakdown.slice(0, 8)} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `${Math.round(v / 1000)}K`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={110} />
                <Tooltip formatter={(v: any) => pk(v)} />
                <Bar dataKey="revenue" name="Revenue" radius={[0, 4, 4, 0]}>
                  {metrics.categoryBreakdown.slice(0, 8).map((e, i) => <Cell key={i} fill={e.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Section>

        <Section title="Top Products" sub="by revenue — invoice lines">
          {metrics.topProducts.length === 0 ? <Empty msg="No invoice line data" /> : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={metrics.topProducts.slice(0, 8)} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `${Math.round(v / 1000)}K`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={130} />
                <Tooltip formatter={(v: any) => pk(v)} />
                <Bar dataKey="revenue" name="Revenue" fill="#0F2D52" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Section>

        <Section title="Order Status Distribution" sub="current pipeline">
          {metrics.orderStatuses.length === 0 ? <Empty /> : (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="50%" height={180}>
                <PieChart>
                  <Pie data={metrics.orderStatuses} cx="50%" cy="50%" outerRadius={75} dataKey="value" label={(e: any) => `${(e.percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                    {metrics.orderStatuses.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 flex-1">
                {metrics.orderStatuses.map((s, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                      <span className="text-gray-600">{s.name}</span>
                    </div>
                    <span className="font-bold text-gray-900">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Section>

        <Section title="Monthly Orders Volume" sub="number of invoices per month">
          {metrics.monthlyRevenue.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={metrics.monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="orders" name="Orders" fill="#2E7D32" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Section>
      </div>

      {/* Product table */}
      {metrics.topProducts.length > 0 && (
        <Section title="Product Performance Table" sub="top 10 by revenue">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-gray-100">
                {['Product','Category','Brand','Units','Revenue','Avg Price'].map(h => (
                  <th key={h} className="text-left py-2 px-2 text-gray-400 font-semibold uppercase tracking-wide text-[10px]">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {metrics.topProducts.map((p, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-2 px-2 font-medium text-gray-800">{p.name}</td>
                    <td className="py-2 px-2 text-gray-500">{p.category}</td>
                    <td className="py-2 px-2 text-gray-500">{p.brand || '—'}</td>
                    <td className="py-2 px-2 text-gray-700 font-semibold">{p.qty}</td>
                    <td className="py-2 px-2 font-bold text-gray-900">{pk(p.revenue)}</td>
                    <td className="py-2 px-2 text-gray-600">{p.qty > 0 ? pk(p.revenue / p.qty) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}
    </div>
  );

  const renderSeasonality = () => {
    const hasSeason = metrics.seasonalData.some(d => d.revenue > 0);
    const peakMonth = hasSeason ? [...metrics.seasonalData].sort((a, b) => b.revenue - a.revenue)[0] : null;
    const troughMonth = hasSeason ? [...metrics.seasonalData].sort((a, b) => a.revenue - b.revenue)[0] : null;
    return (
      <div className="space-y-6">
        {peakMonth && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard label="Peak Month" value={peakMonth.month} sub={pk(peakMonth.revenue)} icon={TrendingUp} color="text-emerald-600" />
            <KpiCard label="Slowest Month" value={troughMonth?.month || '—'} sub={pk(troughMonth?.revenue || 0)} icon={TrendingDown} color="text-red-500" />
            <KpiCard label="Peak/Trough Ratio" value={`${troughMonth?.revenue ? (peakMonth.revenue / troughMonth.revenue).toFixed(1) : '—'}×`} sub="seasonality amplitude" icon={Activity} color="text-blue-600" />
            <KpiCard label="Revenue Variance" value={`±${hasSeason ? Math.round((Math.max(...metrics.seasonalData.map(d => d.index)) - 100)) : 0}%`} sub="from annual avg" icon={BarChart2} color="text-purple-600" />
          </div>
        )}

        <Section title="Monthly Revenue Pattern (All Time)" sub="aggregated across all years — shows true seasonality">
          {!hasSeason ? <Empty msg="Need order/invoice data to show seasonality" /> : (
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={metrics.seasonalData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="rev" tick={{ fontSize: 10 }} tickFormatter={v => `${Math.round(v / 1000)}K`} />
                <YAxis yAxisId="idx" orientation="right" tick={{ fontSize: 10 }} domain={[0, 200]} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Bar yAxisId="rev" dataKey="revenue" name="Revenue" fill="#EEF3F8" radius={[4, 4, 0, 0]}>
                  {metrics.seasonalData.map((_, i) => <Cell key={i} fill={C[0]} fillOpacity={0.6} />)}
                </Bar>
                <Line yAxisId="idx" type="monotone" dataKey="index" name="Seasonal Index" stroke="#FFC107" strokeWidth={2.5} dot={{ r: 4 }} />
                <ReferenceLine yAxisId="idx" y={100} stroke="#2E7D32" strokeDasharray="4 3" label={{ value: 'Avg=100', position: 'right', fontSize: 10 }} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </Section>

        <Section title="Seasonal Index Table" sub="index 100 = average month; >100 = above average demand">
          {!hasSeason ? <Empty /> : (
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {metrics.seasonalData.map((d, i) => (
                <div key={i} className={`rounded-xl p-3 text-center ${d.index >= 120 ? 'bg-emerald-50 border border-emerald-200' : d.index <= 80 ? 'bg-red-50 border border-red-100' : 'bg-gray-50 border border-gray-100'}`}>
                  <p className="text-xs font-semibold text-gray-600">{d.month}</p>
                  <p className={`text-2xl font-black mt-1 ${d.index >= 120 ? 'text-emerald-600' : d.index <= 80 ? 'text-red-500' : 'text-gray-700'}`}>{d.index}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{d.orders} orders</p>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Pakistan Appliance Market: Expected Seasonality" sub="context for planning (industry benchmark)">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { cat: 'Air Conditioners', peak: 'Mar–Jun', off: 'Oct–Jan', note: 'Pre-summer AC rush; Jan–Feb lowest demand' },
              { cat: 'Solar Systems', peak: 'Feb–Sep', off: 'Oct–Jan', note: 'Peak sun season = best ROI for customers' },
              { cat: 'Refrigerators', peak: 'Apr–Jul', off: 'Nov–Feb', note: 'Summer food storage drives purchases' },
              { cat: 'Water Heaters', peak: 'Oct–Feb', off: 'Apr–Aug', note: 'Winter geyser demand highest in Dec–Jan' },
              { cat: 'Washing Machines', peak: 'Jan–Mar', off: 'Jul–Aug', note: 'New year/Eid spending, relatively stable' },
              { cat: 'TVs / LED', peak: 'Nov–Jan', off: 'May–Jul', note: 'Eid, Ramadan, and New Year gifting season' },
            ].map((r, i) => (
              <div key={i} className="flex gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="w-2 h-12 rounded-full flex-shrink-0" style={{ background: C[i % C.length] }} />
                <div>
                  <p className="text-sm font-bold text-gray-800">{r.cat}</p>
                  <p className="text-xs text-emerald-600 mt-0.5">Peak: {r.peak}</p>
                  <p className="text-xs text-red-400">Off-peak: {r.off}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{r.note}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>
      </div>
    );
  };

  const renderCustomers = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Unique Customers" value={String(metrics.uniqueCustomers)} icon={Users} color="text-blue-600" />
        <KpiCard label="Repeat Customers" value={String(metrics.repeatCustomers)}
          sub={metrics.uniqueCustomers > 0 ? `${((metrics.repeatCustomers / metrics.uniqueCustomers) * 100).toFixed(0)}% retention` : ''}
          icon={CheckCircle} color="text-emerald-600" />
        <KpiCard label="Avg Orders/Customer" value={(metrics.uniqueCustomers ? (metrics.totalOrders / metrics.uniqueCustomers) : 0).toFixed(1)} icon={ShoppingBag} color="text-brand-500" />
        <KpiCard label="Revenue/Customer" value={`PKR ${formatPrice(metrics.uniqueCustomers ? metrics.totalRevenue / metrics.uniqueCustomers / 1000 : 0)}K`} icon={DollarSign} color="text-purple-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="Customer Area Distribution" sub="from invoice customer_area">
          {metrics.customerAreas.length === 0 ? <Empty msg="Need invoices with area data" /> : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={metrics.customerAreas} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="area" tick={{ fontSize: 10 }} width={100} />
                <Tooltip />
                <Bar dataKey="count" name="Customers" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Section>

        <Section title="Customer Type Breakdown" sub="House · Apartment · Commercial">
          {metrics.customerTypes.length === 0 ? <Empty msg="Need invoices with customer type" /> : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={metrics.customerTypes} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                    label={(e: any) => `${e.name} ${(e.percent * 100).toFixed(0)}%`} labelLine fontSize={10}>
                    {metrics.customerTypes.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {metrics.customerTypes.map((t, i) => (
                  <div key={i} className="text-center p-2 rounded-xl" style={{ background: t.color + '18' }}>
                    <p className="text-lg font-black" style={{ color: t.color }}>{t.value}</p>
                    <p className="text-xs text-gray-500">{t.name}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </Section>
      </div>

      {metrics.topCustomers.length > 0 && (
        <Section title="Top Customers by Revenue" sub="all time — from invoices">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-gray-100">
                {['#','Customer','Phone','Area','Orders','Lifetime Revenue'].map(h => (
                  <th key={h} className="text-left py-2 px-3 text-gray-400 font-semibold uppercase tracking-wide text-[10px]">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {metrics.topCustomers.map((c, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 px-3 text-gray-400 font-medium">{i + 1}</td>
                    <td className="py-2 px-3 font-semibold text-gray-800">{c.name}</td>
                    <td className="py-2 px-3 text-gray-500">{c.area || '—'}</td>
                    <td className="py-2 px-3 text-gray-500">{c.area || '—'}</td>
                    <td className="py-2 px-3 font-semibold text-gray-700">{c.orders}</td>
                    <td className="py-2 px-3 font-bold text-gray-900">{pk(c.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}
    </div>
  );

  const renderLeads = () => {
    const solarNewThisMonth = solarLeads.filter(l => l.created_at.startsWith(new Date().toISOString().slice(0, 7))).length;
    const avgSystemKw = solarLeads.length ? (solarLeads.reduce((s, l) => s + l.system_kw, 0) / solarLeads.length).toFixed(1) : '—';
    const totalEstSavings = solarLeads.reduce((s, l) => s + (l.est_savings || 0), 0);
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="Total Solar Leads" value={String(solarLeads.length)} sub={`${solarNewThisMonth} this month`} icon={Zap} color="text-yellow-500" />
          <KpiCard label="Closed / Won" value={String(solarLeads.filter(l => l.status === 'closed').length)}
            sub={solarLeads.length ? `${((solarLeads.filter(l => l.status === 'closed').length / solarLeads.length) * 100).toFixed(0)}% rate` : ''}
            icon={CheckCircle} color="text-emerald-600" />
          <KpiCard label="Avg System Size" value={`${avgSystemKw} kW`} icon={Sun} color="text-brand-500" />
          <KpiCard label="Total Est. Savings" value={`PKR ${formatPrice(totalEstSavings / 1000)}K`} sub="across all leads / yr" icon={DollarSign} color="text-blue-600" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Section title="Solar Lead Funnel" sub="new → contacted → quoted → closed">
            {solarLeads.length === 0 ? <Empty msg="No solar leads yet" /> : (
              <div className="space-y-3 py-2">
                {metrics.solarFunnel.map((s, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-20 text-right">{s.stage}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-7 overflow-hidden">
                      <div className="h-full rounded-full flex items-center pl-3 transition-all"
                        style={{ width: `${solarLeads.length ? Math.max(8, (s.count / solarLeads.length) * 100) : 0}%`, background: s.color }}>
                        <span className="text-white text-xs font-bold">{s.count}</span>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-gray-700 w-8">
                      {solarLeads.length ? `${((s.count / solarLeads.length) * 100).toFixed(0)}%` : '0%'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Leads by City" sub="geographic distribution">
            {metrics.solarByCity.length === 0 ? <Empty /> : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={metrics.solarByCity} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                      label={(e: any) => `${e.city} ${(e.percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                      {metrics.solarByCity.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => [`${v} leads`, '']} />
                  </PieChart>
                </ResponsiveContainer>
              </>
            )}
          </Section>
        </div>

        {/* Solar leads table */}
        {solarLeads.length > 0 && (
          <Section title="Solar Lead Details" sub="all leads — most recent first">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-gray-100">
                  {['Name','Phone','City','System kW','Bill/mo','Est. Savings/yr','Status','Date'].map(h => (
                    <th key={h} className="text-left py-2 px-2 text-gray-400 font-semibold uppercase tracking-wide text-[10px]">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {solarLeads.slice(0, 25).map((l, i) => (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2 px-2 font-medium text-gray-800">{l.name}</td>
                      <td className="py-2 px-2 text-gray-500">{l.phone}</td>
                      <td className="py-2 px-2 text-gray-600">{l.city}</td>
                      <td className="py-2 px-2 font-semibold text-blue-700">{l.system_kw} kW</td>
                      <td className="py-2 px-2 text-gray-600">PKR {formatPrice(l.monthly_bill)}</td>
                      <td className="py-2 px-2 font-semibold text-emerald-600">PKR {formatPrice(l.est_savings)}</td>
                      <td className="py-2 px-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          l.status === 'closed' ? 'bg-emerald-100 text-emerald-700' :
                          l.status === 'quoted' ? 'bg-blue-100 text-blue-700' :
                          l.status === 'contacted' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-600'}`}>{l.status}</span>
                      </td>
                      <td className="py-2 px-2 text-gray-400">{new Date(l.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        )}

        {/* Analytics events */}
        {metrics.topEvents.length > 0 && (
          <Section title="Website Events Summary" sub="from analytics table">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {metrics.topEvents.slice(0, 8).map((e, i) => (
                <div key={i} className="rounded-xl p-3 border border-gray-100 text-center">
                  <p className="text-xs text-gray-500 truncate">{e.event}</p>
                  <p className="text-2xl font-black mt-1" style={{ color: e.color }}>{e.count}</p>
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>
    );
  };

  const renderInsights = () => {
    const typeConfig = {
      opportunity: { color: 'border-emerald-200 bg-emerald-50', badge: 'bg-emerald-100 text-emerald-700', icon: TrendingUp },
      risk:        { color: 'border-red-200 bg-red-50',         badge: 'bg-red-100 text-red-700',         icon: AlertTriangle },
      seasonal:    { color: 'border-yellow-200 bg-yellow-50',   badge: 'bg-yellow-100 text-yellow-700',   icon: Calendar },
      operational: { color: 'border-blue-200 bg-blue-50',       badge: 'bg-blue-100 text-blue-700',       icon: Activity },
    };
    const priorityBadge = { high: 'bg-red-100 text-red-700', medium: 'bg-amber-100 text-amber-700', low: 'bg-gray-100 text-gray-500' };

    // Business health score
    let score = 60;
    if (metrics.revenueGrowth > 10) score += 10;
    if (metrics.revenueGrowth < -10) score -= 15;
    if (metrics.instOverdue === 0) score += 10;
    if (metrics.instOverdue > 5) score -= 10;
    if (metrics.repeatCustomers > metrics.uniqueCustomers * 0.2) score += 10;
    if (metrics.totalOrders > 10) score += 10;
    score = Math.max(10, Math.min(100, score));
    const scoreColor = score >= 75 ? 'text-emerald-600' : score >= 50 ? 'text-amber-500' : 'text-red-500';
    const scoreBg = score >= 75 ? 'bg-emerald-50' : score >= 50 ? 'bg-amber-50' : 'bg-red-50';

    return (
      <div className="space-y-6">
        {/* Health score */}
        <div className={`rounded-2xl p-6 border ${scoreBg} border-gray-100`}>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className={`text-6xl font-black ${scoreColor}`}>{score}</p>
              <p className="text-xs text-gray-500 mt-1">Business Health Score</p>
              <p className="text-[10px] text-gray-400">out of 100</p>
            </div>
            <div className="flex-1">
              <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${score >= 75 ? 'bg-emerald-400' : score >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                  style={{ width: `${score}%` }} />
              </div>
              <p className="text-sm text-gray-600 mt-3">
                {score >= 75 ? 'Business is performing well. Focus on growth and diversification.' :
                 score >= 50 ? 'Moderate performance. Address risk items to improve.' :
                 'Immediate attention needed. Review risks below.'}
              </p>
              <p className="text-xs text-gray-400 mt-1">Score updates automatically as you add data (invoices, expenses, targets)</p>
            </div>
          </div>
        </div>

        {/* Insight cards */}
        <div className="space-y-4">
          {insights.map((ins, i) => {
            const cfg = typeConfig[ins.type as keyof typeof typeConfig] || typeConfig.operational;
            const IIcon = cfg.icon;
            return (
              <div key={i} className={`rounded-2xl p-5 border ${cfg.color}`}>
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.badge}`}>
                    <IIcon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h4 className="font-bold text-gray-900 text-sm">{ins.title}</h4>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${cfg.badge}`}>
                        {ins.type.toUpperCase()}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${priorityBadge[ins.priority]}`}>
                        {ins.priority.toUpperCase()} PRIORITY
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{ins.insight}</p>
                    <div className="mt-2 flex items-start gap-1.5">
                      <CheckCircle className="h-3.5 w-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-gray-500"><strong>Action:</strong> {ins.action}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Strategic matrix */}
        <Section title="Business Capability Matrix" sub="Tajalli's strategic position assessment">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { area: 'Product Range', score: 85, notes: 'Strong: Haier, Gree, Dawlance, EcoStar, Westpoint, Jinko. Add Hisense / TCL for broader TV/AC coverage.' },
              { area: 'Solar Business', score: 70, notes: 'Growing: active leads pipeline, off-grid capability. Needs faster conversion & certified installer network.' },
              { area: 'Installment Reach', score: 80, notes: 'Good: 2m–12m plans active. Unlock more customers by reducing advance requirement on high-value items.' },
              { area: 'Customer Retention', score: metrics.uniqueCustomers > 0 ? Math.min(90, 40 + Math.round((metrics.repeatCustomers / metrics.uniqueCustomers) * 100)) : 50, notes: 'Improve with post-sale follow-up automation and annual maintenance packages.' },
              { area: 'Digital Presence', score: 72, notes: 'Website + WhatsApp active. Add Google Ads and Instagram shop to capture demand-gen traffic.' },
              { area: 'Operational Systems', score: 78, notes: 'Invoice system, CRM, and portal in place. Add WhatsApp-to-order automation to reduce friction.' },
            ].map((item, i) => (
              <div key={i} className="p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-sm font-bold text-gray-800">{item.area}</p>
                  <span className={`text-sm font-black ${item.score >= 75 ? 'text-emerald-600' : item.score >= 60 ? 'text-amber-500' : 'text-red-500'}`}>{item.score}/100</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
                  <div className={`h-full rounded-full ${item.score >= 75 ? 'bg-emerald-400' : item.score >= 60 ? 'bg-amber-400' : 'bg-red-400'}`}
                    style={{ width: `${item.score}%` }} />
                </div>
                <p className="text-xs text-gray-500">{item.notes}</p>
              </div>
            ))}
          </div>
        </Section>
      </div>
    );
  };

  const renderStudio = () => {
    const inputCls = 'border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 w-full';
    const labelCls = 'text-xs font-semibold text-gray-600 mb-1 block';
    return (
      <div className="space-y-6">
        {saveMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />{saveMsg}
          </div>
        )}

        {/* Sub-tabs */}
        <div className="flex gap-2 flex-wrap">
          {([['targets', 'Monthly Targets', Target], ['expenses', 'Operating Expenses', DollarSign], ['cogs', 'Product Costs', Package], ['offline', 'Offline Sales', MessageCircle]] as const).map(([key, label, Icon]) => (
            <button key={key} onClick={() => setStudioTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${studioTab === key ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              <Icon className="h-3.5 w-3.5" />{label}
            </button>
          ))}
        </div>

        {studioTab === 'targets' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Section title="Set Monthly Target" sub="revenue, orders, and lead targets per month">
              <div className="space-y-4">
                <div><label className={labelCls}>Month</label><input type="month" value={targetForm.month} onChange={e => setTargetForm(p => ({ ...p, month: e.target.value }))} className={inputCls} /></div>
                <div><label className={labelCls}>Revenue Target (PKR)</label><input type="number" placeholder="e.g. 3000000" value={targetForm.revenue_target} onChange={e => setTargetForm(p => ({ ...p, revenue_target: e.target.value }))} className={inputCls} /></div>
                <div><label className={labelCls}>Order Target (count)</label><input type="number" placeholder="e.g. 35" value={targetForm.order_target} onChange={e => setTargetForm(p => ({ ...p, order_target: e.target.value }))} className={inputCls} /></div>
                <div><label className={labelCls}>Solar Lead Target</label><input type="number" placeholder="e.g. 10" value={targetForm.solar_lead_target} onChange={e => setTargetForm(p => ({ ...p, solar_lead_target: e.target.value }))} className={inputCls} /></div>
                <div><label className={labelCls}>Notes</label><textarea value={targetForm.notes} onChange={e => setTargetForm(p => ({ ...p, notes: e.target.value }))} className={inputCls} rows={2} /></div>
                <button onClick={saveTarget} disabled={saving || !targetForm.month} className="btn-primary gap-2 w-full justify-center py-3">
                  <Save className="h-4 w-4" />{saving ? 'Saving…' : 'Save Target'}
                </button>
              </div>
            </Section>
            <Section title="Saved Targets" sub="click a row to pre-fill form">
              {targets.length === 0 ? <Empty msg="No targets set yet" /> : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {targets.map((t, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 cursor-pointer"
                      onClick={() => setTargetForm({ month: t.month.slice(0, 7), revenue_target: String(t.revenue_target || ''), order_target: String(t.order_target || ''), solar_lead_target: String(t.solar_lead_target || ''), notes: t.notes || '' })}>
                      <div>
                        <p className="text-sm font-bold text-gray-800">{monthLabel(t.month.slice(0, 7))}</p>
                        <p className="text-xs text-gray-500">{t.revenue_target ? `Rev: ${pk(t.revenue_target)}` : ''} {t.order_target ? `· ${t.order_target} orders` : ''}</p>
                      </div>
                      <button onClick={e => { e.stopPropagation(); deleteRow('bi_targets', t.id); }} className="text-red-400 hover:text-red-600 p-1"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </div>
        )}

        {studioTab === 'expenses' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Section title="Add Expense Entry" sub="one entry per category per month">
              <div className="space-y-4">
                <div><label className={labelCls}>Month</label><input type="month" value={expenseForm.month} onChange={e => setExpenseForm(p => ({ ...p, month: e.target.value }))} className={inputCls} /></div>
                <div>
                  <label className={labelCls}>Category</label>
                  <select value={expenseForm.category} onChange={e => setExpenseForm(p => ({ ...p, category: e.target.value }))} className={inputCls}>
                    {EXPENSE_CATS.map(c => <option key={c} value={c}>{c.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>)}
                  </select>
                </div>
                <div><label className={labelCls}>Amount (PKR)</label><input type="number" placeholder="e.g. 80000" value={expenseForm.amount} onChange={e => setExpenseForm(p => ({ ...p, amount: e.target.value }))} className={inputCls} /></div>
                <div><label className={labelCls}>Description (optional)</label><input type="text" placeholder="e.g. DHA shop rent" value={expenseForm.description} onChange={e => setExpenseForm(p => ({ ...p, description: e.target.value }))} className={inputCls} /></div>
                <button onClick={saveExpense} disabled={saving || !expenseForm.month || !expenseForm.amount} className="btn-primary gap-2 w-full justify-center py-3">
                  <Save className="h-4 w-4" />{saving ? 'Saving…' : 'Save Expense'}
                </button>
              </div>
            </Section>
            <Section title="Expense Log" sub="all months — sorted newest first">
              {expenses.length === 0 ? <Empty msg="No expenses recorded yet" /> : (
                <>
                  <div className="bg-amber-50 rounded-xl px-3 py-2 mb-3 text-xs text-amber-700 flex items-center justify-between">
                    <span>Total in view</span>
                    <span className="font-bold">{pk(expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0))}</span>
                  </div>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {expenses.map((e, i) => (
                      <div key={i} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl">
                        <div>
                          <p className="text-xs font-bold text-gray-800">{monthLabel(e.month.slice(0, 7))} · {e.category.replace('_', ' ')}</p>
                          {e.description && <p className="text-xs text-gray-400">{e.description}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-900">{pk(Number(e.amount))}</span>
                          <button onClick={() => deleteRow('bi_expenses', e.id)} className="text-red-400 hover:text-red-600 p-1"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Section>
          </div>
        )}

        {studioTab === 'cogs' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Section title="Add Product Cost (COGS)" sub="cost price for gross margin calculation">
              <div className="space-y-4">
                <div><label className={labelCls}>Product Name</label><input type="text" placeholder="e.g. Haier HSU-18HNF DC Inverter" value={cogsForm.product_name} onChange={e => setCogsForm(p => ({ ...p, product_name: e.target.value }))} className={inputCls} /></div>
                <div><label className={labelCls}>Category (optional)</label><input type="text" placeholder="e.g. Air Conditioner" value={cogsForm.category} onChange={e => setCogsForm(p => ({ ...p, category: e.target.value }))} className={inputCls} /></div>
                <div><label className={labelCls}>Cost Price (PKR)</label><input type="number" placeholder="e.g. 110000" value={cogsForm.cost_price} onChange={e => setCogsForm(p => ({ ...p, cost_price: e.target.value }))} className={inputCls} /></div>
                <div><label className={labelCls}>Effective Date</label><input type="date" value={cogsForm.effective_date} onChange={e => setCogsForm(p => ({ ...p, effective_date: e.target.value }))} className={inputCls} /></div>
                <button onClick={saveCogs} disabled={saving || !cogsForm.product_name || !cogsForm.cost_price} className="btn-primary gap-2 w-full justify-center py-3">
                  <Save className="h-4 w-4" />{saving ? 'Saving…' : 'Save Cost'}
                </button>
              </div>
            </Section>
            <Section title="Product Costs" sub="used for gross margin calculation">
              {productCosts.length === 0 ? <Empty msg="No product costs entered yet" /> : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {productCosts.map((c, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl">
                      <div>
                        <p className="text-xs font-bold text-gray-800 truncate max-w-[180px]">{c.product_name}</p>
                        <p className="text-xs text-gray-400">{c.category || '—'} · from {new Date(c.effective_date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-900">{pk(c.cost_price)}</span>
                        <button onClick={() => deleteRow('bi_product_costs', c.id)} className="text-red-400 hover:text-red-600 p-1"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </div>
        )}

        {studioTab === 'offline' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Section title="Add Offline Sale" sub="walk-in, WhatsApp, or phone sales not in the system">
              <div className="space-y-4">
                <div><label className={labelCls}>Sale Date</label><input type="date" value={offlineForm.sale_date} onChange={e => setOfflineForm(p => ({ ...p, sale_date: e.target.value }))} className={inputCls} /></div>
                <div><label className={labelCls}>Amount (PKR)</label><input type="number" placeholder="e.g. 145000" value={offlineForm.amount} onChange={e => setOfflineForm(p => ({ ...p, amount: e.target.value }))} className={inputCls} /></div>
                <div><label className={labelCls}>Category (optional)</label><input type="text" placeholder="e.g. Air Conditioner" value={offlineForm.category} onChange={e => setOfflineForm(p => ({ ...p, category: e.target.value }))} className={inputCls} /></div>
                <div>
                  <label className={labelCls}>Channel</label>
                  <select value={offlineForm.channel} onChange={e => setOfflineForm(p => ({ ...p, channel: e.target.value }))} className={inputCls}>
                    {['walk_in','whatsapp','phone','referral','other'].map(c => <option key={c} value={c}>{c.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>)}
                  </select>
                </div>
                <div><label className={labelCls}>Description (optional)</label><input type="text" placeholder="e.g. Gree 1.5 Ton AC — cash" value={offlineForm.description} onChange={e => setOfflineForm(p => ({ ...p, description: e.target.value }))} className={inputCls} /></div>
                <button onClick={saveOffline} disabled={saving || !offlineForm.sale_date || !offlineForm.amount} className="btn-primary gap-2 w-full justify-center py-3">
                  <Save className="h-4 w-4" />{saving ? 'Saving…' : 'Save Sale'}
                </button>
              </div>
            </Section>
            <Section title="Offline Sales Log">
              {offlineSales.length === 0 ? <Empty msg="No offline sales recorded yet" /> : (
                <>
                  <div className="bg-emerald-50 rounded-xl px-3 py-2 mb-3 text-xs text-emerald-700 flex items-center justify-between">
                    <span>Total offline sales</span>
                    <span className="font-bold">{pk(offlineSales.reduce((s, o) => s + (Number(o.amount) || 0), 0))}</span>
                  </div>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {offlineSales.map((o, i) => (
                      <div key={i} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl">
                        <div>
                          <p className="text-xs font-bold text-gray-800">{new Date(o.sale_date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })} · {o.channel || '—'}</p>
                          {o.description && <p className="text-xs text-gray-400 truncate max-w-[180px]">{o.description}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-900">{pk(Number(o.amount))}</span>
                          <button onClick={() => deleteRow('bi_offline_sales', o.id)} className="text-red-400 hover:text-red-600 p-1"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Section>
          </div>
        )}
      </div>
    );
  };

  // ─── Main render ───────────────────────────────────────────
  const tabContent: Record<Tab, () => React.ReactNode> = {
    summary: renderSummary, revenue: renderRevenue, sales: renderSales,
    seasonality: renderSeasonality, customers: renderCustomers,
    leads: renderLeads, insights: renderInsights, studio: renderStudio,
  };

  // ─── Embedded toolbar (when inside AdminPortal) ────────────────────────────
  if (embedded) {
    return (
      <div className="space-y-0 -mx-4 -my-6">
        {/* Compact toolbar */}
        <div className="bg-white border-b border-gray-100 px-4 py-2.5 flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-gray-500 mr-1">Period:</span>
          {(['3m','6m','12m'] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-all ${period === p ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {p === '3m' ? '3M' : p === '6m' ? '6M' : '12M'}
            </button>
          ))}
          <button onClick={fetchData} disabled={loading} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 ml-1">
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Loading…' : `Updated ${refreshedAt.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}`}
          </button>
          <div className="ml-auto flex items-center gap-0.5 overflow-x-auto">
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors
                  ${tab === t.key ? 'bg-brand-50 text-brand-700' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}>
                <t.icon className="h-3.5 w-3.5 shrink-0" />{t.label}
              </button>
            ))}
          </div>
        </div>
        {/* Content */}
        <div className="px-4 py-6">
          {loading && orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400">
              <RefreshCw className="h-8 w-8 animate-spin" />
              <p className="text-sm">Loading business data…</p>
            </div>
          ) : tabContent[tab]()}
        </div>
      </div>
    );
  }

  // ─── Standalone layout ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">
      <SEO title="Reports Portal" noIndex />

      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#0F2D52,#0C2444)' }}>
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-black text-gray-900 text-sm leading-none">Business Intelligence</h1>
              <p className="text-[10px] text-gray-400">Tajalli's · Updated {refreshedAt.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {(['3m','6m','12m'] as const).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${period === p ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {p === '3m' ? '3 Months' : p === '6m' ? '6 Months' : '12 Months'}
              </button>
            ))}
            <button onClick={fetchData} disabled={loading}
              className="btn-ghost text-xs gap-1.5 ml-1">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Loading…' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex overflow-x-auto no-scrollbar border-t border-gray-50">
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-all flex-shrink-0
                  ${tab === t.key ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                <t.icon className="h-3.5 w-3.5" />{t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {loading && orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400">
            <RefreshCw className="h-8 w-8 animate-spin" />
            <p className="text-sm">Loading business data…</p>
          </div>
        ) : tabContent[tab]()}
      </div>
    </div>
  );
}
