import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Package, CreditCard, Star, Gift, Settings, LogOut, Phone, TrendingUp, Award, Copy, Shield, Clock, Wrench, Zap, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { formatPrice } from '@/lib/api';
import { waSales } from '@/lib/whatsapp';
import SEO from '@/components/ui/SEO';
import toast from 'react-hot-toast';
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import type { Customer } from '@/lib/types';

// ─── Demo data ──────────────────────────────────────────────────────────────
const DEMO_CUSTOMER: Customer = {
  id: 'CUST001', name: 'Ahmed Khan', phone: '+92 300 1234567',
  email: 'ahmed@example.com', area: 'DHA', tier: 'Gold',
  points: 2450, totalSpend: 385000, referralCode: 'AHME5678', joinDate: '2021-03-15',
};

const DEMO_ORDERS = [
  { id:'ORD-001', date:'2024-11-15', product:'Haier HSU-18HNF DC Inverter', amount:148500, plan:'12 Month', status:'Active',     warrantyExpiry:'2025-11-15', nextService:'2025-05-15', installLeft:8 },
  { id:'ORD-002', date:'2024-09-02', product:'Dawlance 9150 Chrome Pro',    amount:121000, plan:'Cash',     status:'Completed',  warrantyExpiry:'2034-09-02', nextService:'2025-03-02', installLeft:0 },
  { id:'ORD-003', date:'2024-12-10', product:'Samsung 55" 4K UHD TV',       amount:148500, plan:'6 Month',  status:'Active',     warrantyExpiry:'2025-12-10', nextService:'2025-06-10', installLeft:3 },
];

const CRM_ALERTS = [
  { type:'maintenance', icon:Wrench,       color:'text-amber-500', bg:'bg-amber-50', text:'Dawlance Refrigerator — annual service due Mar 2025', dueDate:'2025-03-02', urgent:true  },
  { type:'warranty',    icon:Shield,       color:'text-red-500',   bg:'bg-red-50',   text:'Samsung TV warranty expires Dec 2025 — consider renewal', dueDate:'2025-12-10', urgent:false },
  { type:'followup',    icon:Clock,        color:'text-blue-500',  bg:'bg-blue-50',  text:'Post-sale follow-up: How is your Samsung TV performing?', dueDate:'2025-01-10', urgent:true  },
  { type:'power',       icon:Zap,          color:'text-purple-500',bg:'bg-purple-50',text:'Your area DHA: Consider solar — avg savings 60%+', dueDate:null, urgent:false },
];

const SPEND_DATA = [
  {month:'Aug',spend:0},{month:'Sep',spend:121000},{month:'Oct',spend:121000},
  {month:'Nov',spend:269500},{month:'Dec',spend:385000},
];

const TIERS = {
  Bronze:   {color:'#cd7f32',min:0,     next:50000},
  Silver:   {color:'#94a3b8',min:50000, next:150000},
  Gold:     {color:'#f5c842',min:150000,next:500000},
  Platinum: {color:'#a78bfa',min:500000,next:999999},
};

type Tab = 'overview'|'orders'|'crm'|'installments'|'loyalty'|'referrals'|'settings';

export default function Portal() {
  const { customer, isLoggedIn, login, logout } = useAuthStore();
  const [tab, setTab]       = useState<Tab>('overview');
  const [phone, setPhone]   = useState('');
  const [otp, setOtp]       = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const navigate = useNavigate();

  const c    = isLoggedIn && customer ? customer : null;
  const tier = c ? TIERS[c.tier as keyof typeof TIERS] : null;

  const sendOTP = () => {
    if (!phone.trim()) { toast.error('Enter your phone number'); return; }
    setOtpSent(true);
    toast.success('OTP sent! (Demo: enter 1234)');
  };
  const verifyOTP = () => {
    if (otp === '1234' || otp.length >= 4) { login(DEMO_CUSTOMER); toast.success('Welcome back, Ahmed! 👋'); }
    else toast.error('Invalid OTP. Hint: 1234');
  };

  // ── Login screen ──────────────────────────────────────────────
  if (!isLoggedIn) return (
    <div className="min-h-screen bg-surface-secondary flex items-center justify-center p-4">
      <SEO title="Customer Portal" noIndex />
      <div className="w-full max-w-sm bg-white rounded-apple-xl shadow-apple-lg p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white text-2xl font-black"
            style={{ background: 'linear-gradient(135deg,#0070f3,#f5c842)' }}>R</div>
          <h1 className="text-2xl font-black text-gray-900 mb-1">Customer Portal</h1>
          <p className="text-sm text-gray-500">Apne account mein login karein</p>
        </div>
        {!otpSent ? (
          <>
            <label className="block text-sm font-medium text-gray-700 mb-2">WhatsApp Number</label>
            <div className="relative mb-4">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} onKeyDown={e => e.key==='Enter'&&sendOTP()}
                placeholder="+92 3XX XXXXXXX" className="pl-9 input-field" />
            </div>
            <button onClick={sendOTP} className="btn-primary w-full justify-center py-3.5">Send OTP via WhatsApp</button>
          </>
        ) : (
          <>
            <label className="block text-sm font-medium text-gray-700 mb-2">Enter OTP</label>
            <input type="number" value={otp} onChange={e => setOtp(e.target.value)} onKeyDown={e => e.key==='Enter'&&verifyOTP()}
              placeholder="• • • •" maxLength={4}
              className="input-field text-center text-3xl font-mono tracking-widest mb-1" />
            <p className="text-xs text-gray-400 mb-4 text-center">Demo hint: enter 1234</p>
            <button onClick={verifyOTP} className="btn-primary w-full justify-center py-3.5 mb-3">Verify & Login</button>
            <button onClick={() => setOtpSent(false)} className="btn-ghost w-full justify-center text-sm">Change Number</button>
          </>
        )}
      </div>
    </div>
  );

  const TABS: {id:Tab,label:string,Icon:any}[] = [
    {id:'overview',     label:'Overview',      Icon:TrendingUp},
    {id:'orders',       label:'My Orders',     Icon:Package},
    {id:'crm',          label:'My Care Plan',  Icon:Shield},
    {id:'installments', label:'Installments',  Icon:CreditCard},
    {id:'loyalty',      label:'Loyalty',       Icon:Star},
    {id:'referrals',    label:'Referrals',     Icon:Gift},
    {id:'settings',     label:'Settings',      Icon:Settings},
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <SEO title="My Portal" noIndex />
      <div className="grid lg:grid-cols-4 gap-6">

        {/* ── Sidebar ── */}
        <aside className="lg:col-span-1">
          <div className="bg-white rounded-apple-xl shadow-apple p-5 sticky top-24">
            {/* Profile */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl text-white font-black text-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg,#0070f3,#f5c842)' }}>
                {c?.name[0]}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-gray-900 text-sm truncate">{c?.name}</p>
                <p className="text-xs text-gray-500 truncate">{c?.phone}</p>
              </div>
            </div>
            {/* Tier badge */}
            {tier && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg mb-4"
                style={{ background: `${tier.color}15` }}>
                <Award className="h-4 w-4 flex-shrink-0" style={{ color: tier.color }} />
                <span className="text-sm font-bold" style={{ color: tier.color }}>{c?.tier} Member</span>
              </div>
            )}
            {/* Stats */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="bg-surface-secondary rounded-lg p-2.5 text-center">
                <div className="font-bold text-gray-900 text-sm">{c?.points.toLocaleString()}</div>
                <div className="text-xs text-gray-500">Points</div>
              </div>
              <div className="bg-surface-secondary rounded-lg p-2.5 text-center">
                <div className="font-bold text-gray-900 text-sm">PKR {(c?.totalSpend||0) >= 100000 ? ((c?.totalSpend||0)/1000).toFixed(0)+'K' : formatPrice(c?.totalSpend||0)}</div>
                <div className="text-xs text-gray-500">Spend</div>
              </div>
            </div>
            {/* CRM Alerts badge */}
            <div className="bg-red-50 rounded-lg p-2.5 mb-4 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-red-700">{CRM_ALERTS.filter(a=>a.urgent).length} urgent alerts</p>
                <button onClick={() => setTab('crm')} className="text-xs text-red-500 underline">View Care Plan</button>
              </div>
            </div>
            {/* Nav */}
            <nav className="space-y-0.5">
              {TABS.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${tab===t.id?'bg-brand-50 text-brand-600':'text-gray-600 hover:bg-gray-50'}`}>
                  <t.Icon className="h-4 w-4 flex-shrink-0" /> {t.label}
                </button>
              ))}
              <button onClick={() => { logout(); navigate('/'); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition-colors">
                <LogOut className="h-4 w-4" /> Logout
              </button>
            </nav>
          </div>
        </aside>

        {/* ── Main Content ── */}
        <main className="lg:col-span-3 space-y-5">

          {/* OVERVIEW */}
          {tab === 'overview' && (
            <>
              <div className="grid sm:grid-cols-3 gap-4">
                {[
                  {l:'Total Spend',  v:`PKR ${formatPrice(c?.totalSpend||0)}`, Icon:TrendingUp,color:'#0070f3'},
                  {l:'Loyalty Pts',  v:(c?.points||0).toLocaleString(),        Icon:Star,      color:'#f5c842'},
                  {l:'Active Orders',v:DEMO_ORDERS.filter(o=>o.status==='Active').length.toString(), Icon:Package,color:'#34d399'},
                ].map(s => (
                  <div key={s.l} className="bg-white rounded-apple-xl shadow-apple p-5">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-gray-500">{s.l}</p>
                      <s.Icon className="h-5 w-5" style={{ color: s.color }} />
                    </div>
                    <p className="text-2xl font-black text-gray-900">{s.v}</p>
                  </div>
                ))}
              </div>
              {/* Spend chart */}
              <div className="bg-white rounded-apple-xl shadow-apple p-5">
                <h3 className="font-bold text-gray-900 mb-4">Spend History</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={SPEND_DATA}>
                    <XAxis dataKey="month" tick={{fontSize:11,fill:'#9ca3af'}} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v:number) => [`PKR ${formatPrice(v)}`,'Spend']} contentStyle={{borderRadius:12,border:'none',fontSize:12}} />
                    <Line type="monotone" dataKey="spend" stroke="#0070f3" strokeWidth={2.5} dot={{fill:'#0070f3',r:4}} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              {/* Tier progress */}
              {tier && c?.tier !== 'Platinum' && (
                <div className="bg-white rounded-apple-xl shadow-apple p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-gray-900">Tier Progress</h3>
                    <span className="badge-gold">{c?.tier}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                    <div className="h-2 rounded-full transition-all duration-500"
                      style={{ background:tier.color, width:`${Math.min(100,((c?.totalSpend-tier.min)/(tier.next-tier.min))*100)}%` }} />
                  </div>
                  <p className="text-xs text-gray-500">PKR {formatPrice(Math.max(0,tier.next-c.totalSpend))} to next tier</p>
                </div>
              )}
            </>
          )}

          {/* ORDERS */}
          {tab === 'orders' && (
            <div className="bg-white rounded-apple-xl shadow-apple overflow-hidden">
              <div className="p-5 border-b border-gray-100"><h3 className="font-bold text-gray-900">Purchase History</h3></div>
              {DEMO_ORDERS.map(o => (
                <div key={o.id} className="p-5 border-b border-gray-50 last:border-0 hover:bg-surface-secondary transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 text-sm">{o.product}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{o.id} · {o.date}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="badge-blue">{o.plan}</span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${o.status==='Active'?'bg-brand-50 text-brand-600':'bg-emerald-50 text-emerald-600'}`}>{o.status}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 font-semibold flex items-center gap-1">
                          <Shield className="h-2.5 w-2.5" /> Warranty till {o.warrantyExpiry}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">PKR {formatPrice(o.amount)}</p>
                      {o.installLeft > 0 && <p className="text-xs text-orange-500">{o.installLeft} payments left</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* CRM — CARE PLAN */}
          {tab === 'crm' && (
            <>
              <div className="bg-white rounded-apple-xl shadow-apple p-5">
                <h3 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
                  <Shield className="h-5 w-5 text-brand-500" /> Your Care Plan
                </h3>
                <p className="text-sm text-gray-500 mb-5">Warranty, maintenance, follow-ups aur power solutions — sab ek jagah</p>
                <div className="space-y-3">
                  {CRM_ALERTS.map((a, i) => (
                    <div key={i} className={`flex items-start gap-3 p-4 rounded-apple-xl border ${a.urgent ? 'border-red-200' : 'border-gray-100'} ${a.bg}`}>
                      <a.icon className={`h-5 w-5 ${a.color} flex-shrink-0 mt-0.5`} />
                      <div className="flex-1">
                        <p className={`text-sm font-semibold ${a.urgent ? 'text-gray-900' : 'text-gray-700'}`}>{a.text}</p>
                        {a.dueDate && <p className="text-xs text-gray-400 mt-0.5">Due: {a.dueDate}</p>}
                      </div>
                      {a.urgent && <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full font-bold flex-shrink-0">Urgent</span>}
                      <a href={waSales(`Salam! I need help with: ${a.text}`)} target="_blank" rel="noreferrer"
                        className="text-xs px-3 py-1.5 rounded-full font-semibold text-white flex-shrink-0"
                        style={{ background: '#25d366' }}>
                        Get Help
                      </a>
                    </div>
                  ))}
                </div>
              </div>
              {/* Product health cards */}
              <div className="bg-white rounded-apple-xl shadow-apple p-5">
                <h3 className="font-bold text-gray-900 mb-4">Product Health Tracker</h3>
                <div className="space-y-4">
                  {DEMO_ORDERS.map(o => {
                    const warrantyDays = Math.floor((new Date(o.warrantyExpiry).getTime()-Date.now())/86400000);
                    return (
                      <div key={o.id} className="border border-gray-100 rounded-apple-xl p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{o.product}</p>
                            <p className="text-xs text-gray-400">Purchased {o.date}</p>
                          </div>
                          <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="bg-surface-secondary rounded-lg p-2.5">
                            <p className="text-gray-400 mb-0.5">Warranty</p>
                            <p className={`font-bold ${warrantyDays < 90 ? 'text-red-500' : 'text-emerald-600'}`}>
                              {warrantyDays > 0 ? `${warrantyDays} days left` : 'Expired'}
                            </p>
                          </div>
                          <div className="bg-surface-secondary rounded-lg p-2.5">
                            <p className="text-gray-400 mb-0.5">Next Service</p>
                            <p className="font-bold text-gray-900">{o.nextService}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Power solutions upsell */}
              <div className="bg-gradient-to-r from-emerald-600 to-emerald-800 rounded-apple-xl p-6 text-white">
                <div className="flex items-start gap-3 mb-4">
                  <Zap className="h-6 w-6 text-yellow-300 flex-shrink-0" />
                  <div>
                    <h3 className="font-bold text-lg">Power Solution Recommendation</h3>
                    <p className="text-emerald-100 text-sm mt-1">Based on your 3 ACs and refrigerator, a 5kW solar system would save you ~60% on electricity bills.</p>
                  </div>
                </div>
                <a href={waSales('Salam! I would like to discuss solar solutions for my home.')}
                  target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-emerald-700 font-bold text-sm hover:bg-gray-50 transition-colors">
                  Discuss Solar Options
                </a>
              </div>
            </>
          )}

          {/* INSTALLMENTS */}
          {tab === 'installments' && (
            <>
              {DEMO_ORDERS.filter(o => o.installLeft > 0).map(o => (
                <div key={o.id} className="bg-white rounded-apple-xl shadow-apple p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div><p className="font-bold text-gray-900">{o.product}</p><p className="text-xs text-gray-400">{o.id} · {o.plan}</p></div>
                    <span className="badge-blue">Active</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                    <div className="h-2 rounded-full bg-brand-500" style={{ width: `${((6-o.installLeft)/6)*100}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mb-4">
                    <span>{6-o.installLeft} of 6 paid</span>
                    <span>{o.installLeft} remaining</span>
                  </div>
                  <a href={waSales(`Salam, I'd like to make my installment payment for order ${o.id} (${o.product}).`)}
                    target="_blank" rel="noreferrer" className="btn-primary w-full justify-center">
                    Pay Installment via WhatsApp
                  </a>
                </div>
              ))}
              {DEMO_ORDERS.filter(o=>o.installLeft===0).map(o => (
                <div key={o.id} className="bg-white rounded-apple-xl shadow-apple p-4 opacity-60">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                    <div><p className="font-semibold text-gray-900 text-sm">{o.product}</p><p className="text-xs text-gray-400">Fully paid · {o.plan}</p></div>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* LOYALTY */}
          {tab === 'loyalty' && (
            <>
              <div className="bg-white rounded-apple-xl shadow-apple p-5">
                <h3 className="font-bold text-gray-900 mb-4">Loyalty Points</h3>
                <div className="text-center py-6 rounded-apple-xl bg-gradient-to-br from-brand-50 to-amber-50 mb-5">
                  <p className="text-5xl font-black text-gray-900 mb-1">{c?.points.toLocaleString()}</p>
                  <p className="text-sm text-gray-500">Points · Worth PKR {formatPrice((c?.points||0)*0.5)}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={()=>toast.success('Redeem feature coming soon!')} className="btn-primary justify-center py-3">Redeem for Discount</button>
                  <button onClick={()=>toast.success('Cash redeem coming soon!')} className="btn-outline justify-center py-3">Redeem for Cash</button>
                </div>
                <p className="text-xs text-gray-400 text-center mt-3">Min 500 points · 1 point = PKR 0.50</p>
              </div>
              <div className="bg-white rounded-apple-xl shadow-apple p-5">
                <h3 className="font-bold text-gray-900 mb-4">Tier Benefits</h3>
                <div className="space-y-2">
                  {Object.entries(TIERS).map(([name, cfg]) => (
                    <div key={name} className={`flex items-center gap-3 p-3 rounded-apple border ${c?.tier===name?'border-brand-200 bg-brand-50':'border-gray-100'}`}>
                      <Award className="h-5 w-5 flex-shrink-0" style={{ color: cfg.color }} />
                      <div className="flex-1">
                        <p className="text-sm font-bold" style={{ color: cfg.color }}>{name}</p>
                        <p className="text-xs text-gray-500">Min PKR {formatPrice(cfg.min)}</p>
                      </div>
                      <span className="text-xs font-semibold text-gray-700">
                        {name==='Bronze'?'1%':name==='Silver'?'2%':name==='Gold'?'4%':'6%'} off
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* REFERRALS */}
          {tab === 'referrals' && (
            <>
              <div className="bg-white rounded-apple-xl shadow-apple p-5">
                <h3 className="font-bold text-gray-900 mb-2">Your Referral Code</h3>
                <p className="text-sm text-gray-500 mb-4">Dost ko refer karein — dono ko PKR 500 reward!</p>
                <div className="flex items-center gap-3 bg-surface-secondary rounded-apple p-4 mb-4">
                  <p className="text-2xl font-black font-mono flex-1 text-gray-900">{c?.referralCode}</p>
                  <button onClick={() => { navigator.clipboard.writeText(c?.referralCode||''); toast.success('Copied!'); }}
                    className="p-2 text-gray-400 hover:text-brand-500 hover:bg-white rounded-lg transition-colors">
                    <Copy className="h-5 w-5" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <a href={`https://wa.me/?text=${encodeURIComponent(`Reliance Appliances se appliances lain easy installments par! Code: ${c?.referralCode} — PKR 500 discount milega. https://relianceappliances.pk`)}`}
                    target="_blank" rel="noreferrer" className="btn-primary justify-center py-3 text-sm">
                    Share on WhatsApp
                  </a>
                  <button onClick={() => { navigator.clipboard.writeText(`https://relianceappliances.pk?ref=${c?.referralCode}`); toast.success('Link copied!'); }}
                    className="btn-outline justify-center py-3 text-sm">
                    Copy Link
                  </button>
                </div>
              </div>
            </>
          )}

          {/* SETTINGS */}
          {tab === 'settings' && (
            <div className="bg-white rounded-apple-xl shadow-apple p-5 space-y-5">
              <h3 className="font-bold text-gray-900">Account Settings</h3>
              <div className="space-y-3">
                {[{l:'Full Name',v:c?.name||''},{l:'Phone',v:c?.phone||''},{l:'Email',v:c?.email||''},{l:'Area',v:c?.area||''}].map(f => (
                  <div key={f.l}>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{f.l}</label>
                    <input defaultValue={f.v} className="input-field" />
                  </div>
                ))}
              </div>
              <button onClick={() => toast.success('Changes saved!')} className="btn-primary">Save Changes</button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
