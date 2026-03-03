import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart2, Users, ShoppingBag, TrendingUp, Eye, MousePointer, Clock,
  AlertTriangle, CheckCircle, RefreshCw, ExternalLink, Download,
  Wrench, Shield, Zap, MessageCircle, Star, ArrowUp, ArrowDown,
  Search, Filter, Package, DollarSign, Activity
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend
} from 'recharts';
import SEO from '@/components/ui/SEO';
import { formatPrice } from '@/lib/api';

// ── Demo analytics data ────────────────────────────────────────────
const VISIT_DATA = [
  { day:'Mon', visits:142, conversions:8, wa:31 },
  { day:'Tue', visits:189, conversions:12, wa:44 },
  { day:'Wed', visits:203, conversions:15, wa:52 },
  { day:'Thu', visits:176, conversions:11, wa:38 },
  { day:'Fri', visits:241, conversions:19, wa:61 },
  { day:'Sat', visits:318, conversions:27, wa:84 },
  { day:'Sun', visits:286, conversions:22, wa:71 },
];

const MONTHLY_REVENUE = [
  { month:'Aug', revenue:842000, orders:9,  avgOrder:93556 },
  { month:'Sep', revenue:1240000, orders:14, avgOrder:88571 },
  { month:'Oct', revenue:1580000, orders:17, avgOrder:92941 },
  { month:'Nov', revenue:2140000, orders:23, avgOrder:93043 },
  { month:'Dec', revenue:1920000, orders:21, avgOrder:91429 },
  { month:'Jan', revenue:2380000, orders:26, avgOrder:91538 },
  { month:'Feb', revenue:2650000, orders:29, avgOrder:91379 },
  { month:'Mar', revenue:2890000, orders:31, avgOrder:93226 },
];

const CATEGORY_SALES = [
  { name:'Air Conditioners', value:38, color:'#0070f3' },
  { name:'Refrigerators',    value:22, color:'#10b981' },
  { name:'Solar Solutions',  value:18, color:'#f5c842' },
  { name:'Televisions',      value:12, color:'#8b5cf6' },
  { name:'Washing Machines', value:7,  color:'#f97316' },
  { name:'Other',            value:3,  color:'#94a3b8' },
];

const TOP_PRODUCTS = [
  { name:'Haier HSU-18HNF DC Inverter', sales:18, revenue:2673000, trend:+12 },
  { name:'Jinko 400W Solar Panel',      sales:15, revenue:486750,  trend:+28 },
  { name:'Dawlance 9150 Chrome Pro',    sales:12, revenue:1309200, trend:+5  },
  { name:'Samsung 55" Crystal 4K',      sales:9,  revenue:1336500, trend:-3  },
  { name:'Gree GS-18PITH Fairy',        sales:8,  revenue:1229600, trend:+18 },
];

const COMPETITOR_ALERTS = [
  { product:'Haier HSU-18HNF', platform:'Daraz',       ourPrice:148500, theirPrice:152000, status:'better',   lastChecked:'2h ago' },
  { product:'Dawlance 9150',   platform:'HomeShopping', ourPrice:121000, theirPrice:119500, status:'higher',   lastChecked:'2h ago' },
  { product:'Jinko 400W',      platform:'OLX',          ourPrice:36750,  theirPrice:37200,  status:'better',   lastChecked:'3h ago' },
  { product:'Samsung 55"',     platform:'Daraz',        ourPrice:148500, theirPrice:145000, status:'higher',   lastChecked:'1h ago' },
  { product:'Gree Fairy',      platform:'HomeShopping', ourPrice:156250, theirPrice:158000, status:'better',   lastChecked:'2h ago' },
];

const FOLLOWUP_DUE = [
  { customer:'Ahmed Khan',    product:'Haier AC',        type:'maintenance',   due:'Today',      phone:'+923001234567', urgent:true  },
  { customer:'Sara Malik',    product:'Dawlance Fridge', type:'quarterly',     due:'Today',      phone:'+923451234567', urgent:true  },
  { customer:'Zain Raza',     product:'Samsung TV',      type:'post-sale',     due:'Tomorrow',   phone:'+923121234567', urgent:false },
  { customer:'Hira Baig',     product:'Jinko Solar',     type:'annual',        due:'In 2 days',  phone:'+923331234567', urgent:false },
  { customer:'Omar Farooq',   product:'Gree AC',         type:'warranty-expiry',due:'In 3 days', phone:'+923211234567', urgent:false },
];

const COMPETITOR_SPEC_ALERTS = [
  { product:'Haier HSU-18HNF', field:'Specs',       issue:'Daraz shows R32 refrigerant — verify',      priority:'medium' },
  { product:'Dawlance 9150',   field:'Colors',       issue:'New Graphite color variant found on OLX',   priority:'low'    },
  { product:'Samsung 55" TV',  field:'Description',  issue:'Spec mismatch: HDR10+ vs HDR10 on PK.com',  priority:'high'   },
  { product:'Jinko 400W',      field:'Warranty',     issue:'HomeShopping lists 10yr product warranty — confirm', priority:'high' },
];

const PAGE_PERF = [
  { page:'Home',           views:1842, bounce:'28%', avgTime:'2m 14s', conversions:47 },
  { page:'Products',       views:1531, bounce:'34%', avgTime:'3m 42s', conversions:89 },
  { page:'Product Detail', views:982,  bounce:'41%', avgTime:'4m 18s', conversions:62 },
  { page:'Installments',   views:743,  bounce:'22%', avgTime:'5m 01s', conversions:38 },
  { page:'Cart',           views:412,  bounce:'19%', avgTime:'2m 55s', conversions:187 },
];

type Tab = 'overview'|'analytics'|'products'|'crm'|'competitor'|'performance';

const ADMIN_PASS = 'reliance2025'; // In production this comes from env

export default function Dashboard() {
  const [authed, setAuthed]   = useState(false);
  const [passInput, setPass]  = useState('');
  const [tab, setTab]         = useState<Tab>('overview');
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => { setRefreshing(false); setLastRefresh(new Date()); }, 1200);
  };

  if (!authed) return (
    <div className="min-h-screen flex items-center justify-center bg-surface-secondary px-4">
      <SEO title="Admin Dashboard" noIndex />
      <div className="bg-white rounded-apple-xl shadow-apple-lg p-8 w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-apple-xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#0070f3,#003585)' }}>
            <BarChart2 className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-xl font-black text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Reliance Appliances</p>
        </div>
        <div className="space-y-4">
          <input type="password" value={passInput} onChange={e => setPass(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && passInput === ADMIN_PASS && setAuthed(true)}
            placeholder="Admin password" className="input-field" autoFocus />
          <button onClick={() => { if (passInput === ADMIN_PASS) setAuthed(true); }}
            className="btn-primary w-full justify-center py-3">
            Access Dashboard
          </button>
        </div>
      </div>
    </div>
  );

  const KPI = [
    { label:'Total Revenue',     value:'PKR 2.89M', change:'+9.1%', up:true,  icon:DollarSign, color:'text-emerald-600' },
    { label:'Orders This Month', value:'31',        change:'+6.9%', up:true,  icon:ShoppingBag,color:'text-blue-600' },
    { label:'Website Visitors',  value:'1,555',     change:'+14%',  up:true,  icon:Eye,        color:'text-purple-600' },
    { label:'WA Conversions',    value:'381',       change:'+22%',  up:true,  icon:MessageCircle,color:'text-green-600' },
    { label:'Pending Follow-ups',value:'12',        change:'-4',    up:false, icon:Clock,      color:'text-amber-600' },
    { label:'Competitor Alerts', value:'4',         change:'new',   up:false, icon:AlertTriangle,color:'text-red-600' },
  ];

  const TABS: { key: Tab; label: string; icon: any }[] = [
    { key:'overview',    label:'Overview',    icon:BarChart2   },
    { key:'analytics',   label:'Analytics',   icon:TrendingUp  },
    { key:'products',    label:'Products',    icon:Package     },
    { key:'crm',         label:'CRM & CRM',   icon:Users       },
    { key:'competitor',  label:'Competitor',  icon:Search      },
    { key:'performance', label:'Performance', icon:Activity    },
  ];

  return (
    <div className="min-h-screen bg-surface-secondary">
      <SEO title="Admin Dashboard" noIndex />

      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background:'linear-gradient(135deg,#0070f3,#003585)' }}>
            <BarChart2 className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm">Reliance Dashboard</p>
            <p className="text-xs text-gray-400">Last updated: {lastRefresh.toLocaleTimeString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleRefresh}
            className={`btn-ghost text-xs gap-1.5 ${refreshing ? 'animate-spin-slow' : ''}`}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <Link to="/" className="btn-ghost text-xs gap-1.5">
            <ExternalLink className="h-4 w-4" /> View Site
          </Link>
        </div>
      </div>

      {/* Tab nav */}
      <div className="bg-white border-b border-gray-100 px-4">
        <div className="max-w-7xl mx-auto flex overflow-x-auto no-scrollbar">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-3.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-all
                ${tab===t.key ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              <t.icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* ── OVERVIEW ── */}
        {tab === 'overview' && (
          <div className="space-y-6">
            {/* KPI Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {KPI.map(k => (
                <div key={k.label} className="bg-white rounded-apple-xl p-4 shadow-apple">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center bg-gray-50`}>
                      <k.icon className={`h-4 w-4 ${k.color}`} />
                    </div>
                    <div className={`flex items-center gap-0.5 text-xs font-semibold ${k.up ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {k.up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                      {k.change}
                    </div>
                  </div>
                  <p className="text-xl font-black text-gray-900">{k.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{k.label}</p>
                </div>
              ))}
            </div>

            {/* Revenue + Visits charts */}
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-apple-xl shadow-apple p-5">
                <h3 className="font-bold text-gray-900 mb-4">Monthly Revenue</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={MONTHLY_REVENUE}>
                    <defs>
                      <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0070f3" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#0070f3" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" tick={{ fontSize:11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize:11 }} axisLine={false} tickLine={false}
                      tickFormatter={v => `${(v/1000000).toFixed(1)}M`} />
                    <Tooltip formatter={(v: number) => [`PKR ${formatPrice(v)}`, 'Revenue']} />
                    <Area type="monotone" dataKey="revenue" stroke="#0070f3" strokeWidth={2} fill="url(#rev)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white rounded-apple-xl shadow-apple p-5">
                <h3 className="font-bold text-gray-900 mb-4">Weekly Visits & WA Clicks</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={VISIT_DATA}>
                    <XAxis dataKey="day" tick={{ fontSize:11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize:11 }} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Legend iconSize={8} />
                    <Bar dataKey="visits"      fill="#e0efff" name="Visits" radius={[4,4,0,0]} />
                    <Bar dataKey="wa"          fill="#0070f3" name="WA Clicks" radius={[4,4,0,0]} />
                    <Bar dataKey="conversions" fill="#f5c842" name="Orders" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Category breakdown + top products */}
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-apple-xl shadow-apple p-5">
                <h3 className="font-bold text-gray-900 mb-4">Sales by Category</h3>
                <div className="flex items-center gap-6">
                  <ResponsiveContainer width={160} height={160}>
                    <PieChart>
                      <Pie data={CATEGORY_SALES} cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                        paddingAngle={3} dataKey="value">
                        {CATEGORY_SALES.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => [`${v}%`, '']} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2">
                    {CATEGORY_SALES.map(c => (
                      <div key={c.name} className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: c.color }} />
                        <span className="text-xs text-gray-600 flex-1">{c.name}</span>
                        <span className="text-xs font-bold text-gray-900">{c.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-apple-xl shadow-apple p-5">
                <h3 className="font-bold text-gray-900 mb-4">Top Products</h3>
                <div className="space-y-3">
                  {TOP_PRODUCTS.map((p, i) => (
                    <div key={p.name} className="flex items-center gap-3">
                      <span className="text-xs font-black text-gray-300 w-4">{i+1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                        <p className="text-xs text-gray-400">{p.sales} sold · PKR {formatPrice(p.revenue)}</p>
                      </div>
                      <div className={`flex items-center gap-0.5 text-xs font-bold ${p.trend > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {p.trend > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                        {Math.abs(p.trend)}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Urgent action items */}
            <div className="bg-white rounded-apple-xl shadow-apple p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900">Urgent Follow-Ups Due Today</h3>
                <button onClick={() => setTab('crm')} className="text-xs text-brand-500 font-semibold hover:underline">View All →</button>
              </div>
              <div className="space-y-3">
                {FOLLOWUP_DUE.filter(f => f.urgent).map(f => (
                  <div key={f.customer} className="flex items-center gap-4 p-3 bg-red-50 rounded-apple border border-red-100">
                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                      <Clock className="h-4 w-4 text-red-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{f.customer}</p>
                      <p className="text-xs text-gray-500">{f.product} · {f.type.replace('-',' ')}</p>
                    </div>
                    <a href={`https://wa.me/${f.phone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
                      className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white"
                      style={{ background:'#25d366' }}>
                      <MessageCircle className="h-4 w-4" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── ANALYTICS ── */}
        {tab === 'analytics' && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-4 gap-4">
              {[
                { l:'Page Views',     v:'9,847',  c:'+18%', up:true },
                { l:'Unique Visitors',v:'4,231',  c:'+14%', up:true },
                { l:'Avg Session',    v:'3m 42s', c:'+8%',  up:true },
                { l:'Bounce Rate',    v:'31.4%',  c:'-4%',  up:true },
              ].map(s => (
                <div key={s.l} className="bg-white rounded-apple-xl p-5 shadow-apple">
                  <p className="text-2xl font-black text-gray-900">{s.v}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{s.l}</p>
                  <p className={`text-xs font-semibold mt-2 ${s.up ? 'text-emerald-600' : 'text-red-500'}`}>{s.c} vs last month</p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-apple-xl shadow-apple p-5">
              <h3 className="font-bold text-gray-900 mb-4">Conversion Funnel</h3>
              <div className="space-y-3">
                {[
                  { stage:'Website Visits',      count:4231, pct:100 },
                  { stage:'Product Page Views',  count:1842, pct:43.5 },
                  { stage:'WhatsApp Clicks',     count:381,  pct:9.0 },
                  { stage:'Cart Adds',           count:218,  pct:5.2 },
                  { stage:'Checkouts',           count:94,   pct:2.2 },
                  { stage:'Confirmed Orders',    count:31,   pct:0.7 },
                ].map(s => (
                  <div key={s.stage}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700">{s.stage}</span>
                      <span className="font-bold text-gray-900">{s.count.toLocaleString()} <span className="text-gray-400 font-normal text-xs">({s.pct}%)</span></span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width:`${s.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-apple-xl shadow-apple p-5">
              <h3 className="font-bold text-gray-900 mb-4">Traffic Sources</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  { src:'Direct',      pct:34, color:'#0070f3' },
                  { src:'WhatsApp',    pct:28, color:'#25d366' },
                  { src:'Google',      pct:22, color:'#f5c842' },
                  { src:'Social',      pct:10, color:'#8b5cf6' },
                  { src:'Referral',    pct:6,  color:'#f97316' },
                ].map(s => (
                  <div key={s.src} className="text-center p-4 bg-surface-secondary rounded-apple-xl">
                    <div className="text-2xl font-black mb-1" style={{ color: s.color }}>{s.pct}%</div>
                    <p className="text-xs text-gray-500">{s.src}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-apple-xl shadow-apple p-5">
              <h3 className="font-bold text-gray-900 mb-4">Page Performance</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400 uppercase tracking-wider border-b border-gray-100">
                      {['Page','Views','Bounce','Avg Time','Conversions'].map(h => (
                        <th key={h} className="text-left pb-2 pr-4 font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {PAGE_PERF.map(p => (
                      <tr key={p.page}>
                        <td className="py-3 pr-4 font-medium text-gray-900">{p.page}</td>
                        <td className="py-3 pr-4 text-gray-600">{p.views.toLocaleString()}</td>
                        <td className="py-3 pr-4 text-gray-600">{p.bounce}</td>
                        <td className="py-3 pr-4 text-gray-600">{p.avgTime}</td>
                        <td className="py-3 pr-4"><span className="badge-blue">{p.conversions}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── PRODUCTS / MONITORING ── */}
        {tab === 'products' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Product Monitoring</h2>
                <p className="text-sm text-gray-500">Cross-platform accuracy tracking &amp; improvement alerts</p>
              </div>
              <button className="btn-primary gap-2 text-sm">
                <RefreshCw className="h-4 w-4" /> Run Sync
              </button>
            </div>

            {/* Spec/data mismatch alerts */}
            <div className="bg-white rounded-apple-xl shadow-apple p-5">
              <h3 className="font-bold text-gray-900 mb-1">Data Accuracy Alerts</h3>
              <p className="text-xs text-gray-400 mb-4">Discrepancies found vs Daraz, HomeShopping, OLX, PakWheels, Yayvo</p>
              <div className="space-y-3">
                {COMPETITOR_SPEC_ALERTS.map((a, i) => (
                  <div key={i} className={`flex items-start gap-4 p-4 rounded-apple-xl border
                    ${a.priority==='high' ? 'bg-red-50 border-red-100' : a.priority==='medium' ? 'bg-amber-50 border-amber-100' : 'bg-blue-50 border-blue-100'}`}>
                    <AlertTriangle className={`h-5 w-5 mt-0.5 flex-shrink-0
                      ${a.priority==='high' ? 'text-red-500' : a.priority==='medium' ? 'text-amber-500' : 'text-blue-500'}`} />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">{a.product} · {a.field}</p>
                      <p className="text-xs text-gray-600 mt-0.5">{a.issue}</p>
                    </div>
                    <span className={`badge flex-shrink-0
                      ${a.priority==='high' ? 'badge-red' : a.priority==='medium' ? 'badge-gold' : 'badge-blue'}`}>
                      {a.priority}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Enrichment progress */}
            <div className="bg-white rounded-apple-xl shadow-apple p-5">
              <h3 className="font-bold text-gray-900 mb-4">Enrichment Status</h3>
              <div className="grid sm:grid-cols-3 gap-4 mb-4">
                {[
                  { l:'Fully Enriched',  v:18, total:24, color:'emerald' },
                  { l:'Needs Review',    v:4,  total:24, color:'amber' },
                  { l:'Pending Images',  v:2,  total:24, color:'red' },
                ].map(s => (
                  <div key={s.l} className="text-center p-4 bg-surface-secondary rounded-apple-xl">
                    <div className={`text-3xl font-black text-${s.color}-600`}>{s.v}</div>
                    <p className="text-xs text-gray-500 mt-1">{s.l}</p>
                    <div className="h-1.5 bg-gray-200 rounded-full mt-2 overflow-hidden">
                      <div className={`h-full bg-${s.color}-500 rounded-full`} style={{ width:`${(s.v/s.total)*100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-xs text-gray-400 text-center">
                Last enrichment run: Today at 06:00 AM · Next: Tomorrow 06:00 AM
              </div>
            </div>

            {/* Improvement recommendations */}
            <div className="bg-white rounded-apple-xl shadow-apple p-5">
              <h3 className="font-bold text-gray-900 mb-4">Improvement Recommendations</h3>
              <div className="space-y-3">
                {[
                  { product:'Samsung 55" 4K TV',       rec:'Add side-view gallery image — 23% higher conversion rate on similar products', impact:'High', effort:'Low' },
                  { product:'Haier HSU-18HNF',          rec:'Description mentions 720 m³/h airflow — not visible on product page specs', impact:'Medium', effort:'Low' },
                  { product:'Gree GS-18PITH',           rec:'Add "Works with Alexa" badge — competing listings feature this prominently', impact:'Medium', effort:'Low' },
                  { product:'Jinko 400W Solar',          rec:'Add installation diagram to gallery — most searched visual on solar pages', impact:'High', effort:'Medium' },
                  { product:'Dawlance 9150 Chrome Pro', rec:'Customer reviews mention missing water dispenser — update description clarity', impact:'Low', effort:'Low' },
                ].map((r, i) => (
                  <div key={i} className="flex items-start gap-3 p-4 bg-surface-secondary rounded-apple border border-gray-100">
                    <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
                      <TrendingUp className="h-4 w-4 text-brand-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900 mb-0.5">{r.product}</p>
                      <p className="text-xs text-gray-600">{r.rec}</p>
                    </div>
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      <span className={`badge ${r.impact==='High'?'badge-red':r.impact==='Medium'?'badge-gold':'badge-blue'}`}>{r.impact}</span>
                      <span className="badge bg-gray-100 text-gray-500">{r.effort} effort</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── CRM ── */}
        {tab === 'crm' && (
          <div className="space-y-6">
            <div className="grid sm:grid-cols-4 gap-4">
              {[
                { l:'Total Customers', v:'847', icon:Users,       color:'text-blue-600' },
                { l:'Due Follow-ups',  v:'12',  icon:Clock,       color:'text-amber-600' },
                { l:'Warranties Expiring (30d)', v:'8', icon:Shield, color:'text-red-600' },
                { l:'Service Due',     v:'15',  icon:Wrench,      color:'text-purple-600' },
              ].map(s => (
                <div key={s.l} className="bg-white rounded-apple-xl p-5 shadow-apple">
                  <s.icon className={`h-5 w-5 ${s.color} mb-2`} />
                  <p className="text-2xl font-black text-gray-900">{s.v}</p>
                  <p className="text-xs text-gray-400">{s.l}</p>
                </div>
              ))}
            </div>

            {/* Follow-ups */}
            <div className="bg-white rounded-apple-xl shadow-apple p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900">All Scheduled Follow-Ups</h3>
                <div className="flex gap-2">
                  <button className="btn-ghost text-xs gap-1"><Filter className="h-3.5 w-3.5" />Filter</button>
                  <button className="btn-ghost text-xs gap-1"><Download className="h-3.5 w-3.5" />Export</button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400 uppercase tracking-wider border-b border-gray-100">
                      {['Customer','Product','Type','Due','Status','Action'].map(h => (
                        <th key={h} className="text-left pb-2 pr-4 font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {FOLLOWUP_DUE.map(f => (
                      <tr key={f.customer + f.product}>
                        <td className="py-3 pr-4">
                          <p className="font-medium text-gray-900">{f.customer}</p>
                          <p className="text-xs text-gray-400">{f.phone}</p>
                        </td>
                        <td className="py-3 pr-4 text-gray-600 text-xs">{f.product}</td>
                        <td className="py-3 pr-4">
                          <span className={`badge ${
                            f.type==='maintenance'?'badge-gold':
                            f.type==='post-sale'?'badge-blue':
                            f.type==='annual'?'badge-green':'badge-red'
                          }`}>{f.type.replace('-',' ')}</span>
                        </td>
                        <td className={`py-3 pr-4 text-xs font-semibold ${f.urgent?'text-red-600':'text-gray-600'}`}>{f.due}</td>
                        <td className="py-3 pr-4">
                          <span className={`badge ${f.urgent?'badge-red':'badge-blue'}`}>{f.urgent?'Urgent':'Scheduled'}</span>
                        </td>
                        <td className="py-3">
                          <a href={`https://wa.me/${f.phone.replace(/\D/g,'')}?text=Salam%20${f.customer}!`}
                            target="_blank" rel="noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold text-white"
                            style={{ background:'#25d366' }}>
                            <MessageCircle className="h-3 w-3" /> Send
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* CRM Timeline */}
            <div className="bg-white rounded-apple-xl shadow-apple p-5">
              <h3 className="font-bold text-gray-900 mb-4">Follow-Up Schedule (Next 30 Days)</h3>
              <div className="space-y-2">
                {[
                  { date:'Today',     count:2, urgent:true  },
                  { date:'Tomorrow',  count:1, urgent:false },
                  { date:'In 2 days', count:1, urgent:false },
                  { date:'In 3 days', count:1, urgent:false },
                  { date:'This week', count:4, urgent:false },
                  { date:'Next week', count:7, urgent:false },
                  { date:'This month',count:18,urgent:false },
                ].map(s => (
                  <div key={s.date} className={`flex items-center justify-between p-3 rounded-apple border ${s.urgent?'bg-red-50 border-red-100':'bg-surface-secondary border-gray-100'}`}>
                    <span className={`text-sm font-medium ${s.urgent?'text-red-700':'text-gray-700'}`}>{s.date}</span>
                    <span className={`badge ${s.urgent?'badge-red':'badge-blue'}`}>{s.count} follow-up{s.count>1?'s':''}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── COMPETITOR ── */}
        {tab === 'competitor' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Competitor Price Intelligence</h2>
              <p className="text-sm text-gray-500">Live comparison vs Daraz, HomeShopping, OLX, Yayvo, PakWheels</p>
            </div>

            {/* Price comparison table */}
            <div className="bg-white rounded-apple-xl shadow-apple p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900">Price Comparison</h3>
                <span className="text-xs text-gray-400">Updated every 2 hours via Apps Script sync</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400 uppercase tracking-wider border-b border-gray-100">
                      {['Product','Platform','Our Price','Their Price','Difference','Status','Checked'].map(h => (
                        <th key={h} className="text-left pb-2 pr-4 font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {COMPETITOR_ALERTS.map((c, i) => (
                      <tr key={i}>
                        <td className="py-3 pr-4 font-medium text-gray-900 text-xs">{c.product}</td>
                        <td className="py-3 pr-4"><span className="badge badge-blue">{c.platform}</span></td>
                        <td className="py-3 pr-4 font-semibold text-gray-900">PKR {formatPrice(c.ourPrice)}</td>
                        <td className="py-3 pr-4 text-gray-600">PKR {formatPrice(c.theirPrice)}</td>
                        <td className={`py-3 pr-4 font-bold text-sm ${c.status==='better'?'text-emerald-600':'text-red-500'}`}>
                          {c.status==='better'?'−':'+'}{formatPrice(Math.abs(c.ourPrice - c.theirPrice))}
                        </td>
                        <td className="py-3 pr-4">
                          <span className={`badge ${c.status==='better'?'badge-green':'badge-red'}`}>
                            {c.status==='better'?'We\'re cheaper':'They\'re cheaper'}
                          </span>
                        </td>
                        <td className="py-3 text-xs text-gray-400">{c.lastChecked}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Data consistency */}
            <div className="bg-white rounded-apple-xl shadow-apple p-5">
              <h3 className="font-bold text-gray-900 mb-1">Data Consistency Monitoring</h3>
              <p className="text-xs text-gray-400 mb-4">Automated cross-check of specs, warranty, colors, descriptions across platforms</p>
              <div className="space-y-3">
                {COMPETITOR_SPEC_ALERTS.map((a, i) => (
                  <div key={i} className={`p-4 rounded-apple-xl border flex items-start gap-4
                    ${a.priority==='high'?'bg-red-50 border-red-100':a.priority==='medium'?'bg-amber-50 border-amber-100':'bg-blue-50 border-blue-100'}`}>
                    <AlertTriangle className={`h-5 w-5 mt-0.5 flex-shrink-0 ${a.priority==='high'?'text-red-500':a.priority==='medium'?'text-amber-500':'text-blue-400'}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-gray-900">{a.product}</span>
                        <span className={`badge ${a.priority==='high'?'badge-red':a.priority==='medium'?'badge-gold':'badge-blue'}`}>{a.field}</span>
                      </div>
                      <p className="text-xs text-gray-600">{a.issue}</p>
                    </div>
                    <button className="btn-ghost text-xs flex-shrink-0">Resolve</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── PERFORMANCE ── */}
        {tab === 'performance' && (
          <div className="space-y-6">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { l:'Core Web Vitals', v:'Good',   icon:CheckCircle, color:'text-emerald-600' },
                { l:'Page Load (avg)', v:'1.2s',   icon:Activity,    color:'text-blue-600' },
                { l:'Mobile Score',    v:'94/100',  icon:Star,        color:'text-amber-600' },
                { l:'SEO Score',       v:'91/100',  icon:TrendingUp,  color:'text-purple-600' },
              ].map(s => (
                <div key={s.l} className="bg-white rounded-apple-xl p-5 shadow-apple">
                  <s.icon className={`h-5 w-5 ${s.color} mb-2`} />
                  <p className="text-2xl font-black text-gray-900">{s.v}</p>
                  <p className="text-xs text-gray-400">{s.l}</p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-apple-xl shadow-apple p-5">
              <h3 className="font-bold text-gray-900 mb-4">Site Health Checklist</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  { item:'All product images loading',         status:'pass' },
                  { item:'WhatsApp links working',             status:'pass' },
                  { item:'Installment calculator accurate',    status:'pass' },
                  { item:'Sheets API connected',               status:'pass' },
                  { item:'SEO meta tags on all pages',         status:'pass' },
                  { item:'Mobile responsiveness',              status:'pass' },
                  { item:'OG share images loading',            status:'warn' },
                  { item:'Competitor sync running',            status:'pass' },
                  { item:'CRM follow-ups processed',           status:'warn' },
                  { item:'Price archive updated',              status:'pass' },
                ].map(c => (
                  <div key={c.item} className={`flex items-center gap-3 p-3 rounded-apple border
                    ${c.status==='pass'?'bg-emerald-50 border-emerald-100':'bg-amber-50 border-amber-100'}`}>
                    <CheckCircle className={`h-4 w-4 flex-shrink-0 ${c.status==='pass'?'text-emerald-500':'text-amber-500'}`} />
                    <span className="text-sm text-gray-700">{c.item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
