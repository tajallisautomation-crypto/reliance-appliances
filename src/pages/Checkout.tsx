import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, User, CreditCard, MessageCircle, Check, ChevronRight } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { formatPrice } from '@/lib/api';
import SEO from '@/components/ui/SEO';
import { waOrder } from '@/lib/whatsapp';
import toast from 'react-hot-toast';

const AREAS = ['Clifton','DHA','Gulshan-e-Iqbal','North Nazimabad','Gulberg','Saddar','Nazimabad','Malir','Korangi','PECHS','Bahadurabad','F.B.Area','Landhi','Shah Faisal','Other'];

export default function Checkout() {
  const { items, subtotal, clearCart } = useCartStore();
  const [step, setStep]  = useState<'details'|'payment'|'confirm'>('details');
  const [form, setForm]  = useState({ name:'', phone:'', area:'', address:'', notes:'' });
  const [payType, setPayType] = useState<'cash'|'installment'>('cash');
  const [globalPlan, setGlobalPlan] = useState('cash');
  const navigate = useNavigate();

  if (items.length === 0) return (
    <div className="max-w-3xl mx-auto px-4 py-16 text-center">
      <SEO title="Checkout" noIndex />
      <ShoppingCart className="h-16 w-16 text-gray-200 mx-auto mb-4" />
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Your cart is empty</h2>
      <Link to="/products" className="btn-primary">Browse Products</Link>
    </div>
  );

  const placeOrder = () => {
    const lines = items.map(i =>
      `• ${i.product.brand} ${i.product.model} ×${i.qty} — PKR ${formatPrice((i.plan==='cash'?i.product.price.cash_floor:i.product.installments[i.plan as '2m'|'3m'|'6m'|'12m']?.total??i.product.price.retail)*i.qty)}`
    ).join('\n');
    const msg = `🛒 NEW ORDER\n\nCustomer: ${form.name}\nPhone: ${form.phone}\nArea: ${form.area}, Karachi\nAddress: ${form.address}\nPayment: ${payType==='cash'?'Cash':globalPlan+' Installment'}\n\nItems:\n${lines}\n\nTotal: PKR ${formatPrice(subtotal())}${form.notes?'\nNotes: '+form.notes:''}`;
    window.open(waOrder(msg), '_blank');
    clearCart();
    toast.success('Order sent! Our team will confirm shortly 🎉');
    navigate('/');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <SEO title="Checkout" noIndex />

      {/* Steps */}
      <div className="flex items-center justify-center gap-2 mb-10">
        {(['details','payment','confirm'] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all
              ${['details','payment','confirm'].indexOf(step) > i ? 'bg-emerald-500 border-emerald-500 text-white'
              : step === s ? 'bg-brand-500 border-brand-500 text-white'
              : 'border-gray-200 bg-white text-gray-400'}`}>
              {['details','payment','confirm'].indexOf(step) > i ? <Check className="h-4 w-4" /> : i+1}
            </div>
            <span className={`hidden sm:inline text-sm font-medium capitalize ${step===s?'text-brand-600':'text-gray-400'}`}>{s}</span>
            {i < 2 && <div className="w-8 md:w-16 h-0.5 bg-gray-200 mx-1" />}
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {/* DETAILS */}
          {step === 'details' && (
            <div className="bg-white rounded-apple-xl shadow-apple p-6 space-y-4">
              <h2 className="font-bold text-gray-900 flex items-center gap-2"><User className="h-5 w-5 text-brand-500" /> Your Details</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  {l:'Full Name *',k:'name',ph:'Muhammad Ahmed',t:'text'},
                  {l:'WhatsApp / Phone *',k:'phone',ph:'+92 3XX XXXXXXX',t:'tel'},
                ].map(f => (
                  <div key={f.k}>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{f.l}</label>
                    <input type={f.t} value={(form as any)[f.k]} onChange={e => setForm({...form,[f.k]:e.target.value})}
                      placeholder={f.ph} className="input-field" />
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Karachi Area *</label>
                  <select value={form.area} onChange={e => setForm({...form,area:e.target.value})} className="select-field">
                    <option value="">Select area</option>
                    {AREAS.map(a => <option key={a}>{a}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Full Address *</label>
                <textarea value={form.address} onChange={e => setForm({...form,address:e.target.value})}
                  rows={2} className="input-field resize-none" placeholder="Street, block, near landmark…" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Notes (optional)</label>
                <input value={form.notes} onChange={e => setForm({...form,notes:e.target.value})}
                  className="input-field" placeholder="Special instructions…" />
              </div>
              <button onClick={() => {
                if (!form.name || !form.phone || !form.area || !form.address) { toast.error('Please fill all required fields'); return; }
                setStep('payment');
              }} className="btn-primary w-full justify-center py-3.5">
                Continue to Payment <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* PAYMENT */}
          {step === 'payment' && (
            <div className="bg-white rounded-apple-xl shadow-apple p-6 space-y-5">
              <h2 className="font-bold text-gray-900 flex items-center gap-2"><CreditCard className="h-5 w-5 text-brand-500" /> Payment</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {(['cash','installment'] as const).map(t => (
                  <button key={t} onClick={() => { setPayType(t); if(t==='cash') setGlobalPlan('cash'); }}
                    className={`p-4 rounded-apple-xl border-2 text-left transition-all ${payType===t?'border-brand-500 bg-brand-50':'border-gray-200 hover:border-brand-200'}`}>
                    <p className="font-bold text-gray-900">{t==='cash'?'💵 Cash Payment':'📆 Installment Plan'}</p>
                    <p className="text-xs text-gray-500 mt-1">{t==='cash'?'Pay full — get cash discount':'Pay advance + monthly installments'}</p>
                  </button>
                ))}
              </div>
              {payType === 'installment' && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Select Plan</p>
                  <div className="grid grid-cols-4 gap-2">
                    {['2m','3m','6m','12m'].map(p => (
                      <button key={p} onClick={() => setGlobalPlan(p)}
                        className={`py-2 text-xs font-semibold rounded-lg border transition-all ${globalPlan===p?'bg-brand-500 text-white border-brand-500':'bg-white border-gray-200 text-gray-600 hover:border-brand-300'}`}>
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <button onClick={() => setStep('confirm')} className="btn-primary w-full justify-center py-3.5">
                Review Order <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* CONFIRM */}
          {step === 'confirm' && (
            <div className="bg-white rounded-apple-xl shadow-apple p-6 space-y-4">
              <h2 className="font-bold text-gray-900 flex items-center gap-2"><Check className="h-5 w-5 text-emerald-500" /> Confirm Order</h2>
              <div className="bg-surface-secondary rounded-apple-xl p-4 text-sm space-y-2">
                <p><span className="font-semibold">Name:</span> {form.name}</p>
                <p><span className="font-semibold">Phone:</span> {form.phone}</p>
                <p><span className="font-semibold">Area:</span> {form.area}, Karachi</p>
                <p><span className="font-semibold">Address:</span> {form.address}</p>
                <p><span className="font-semibold">Payment:</span> {payType==='cash'?'Cash':globalPlan+' Installment'}</p>
              </div>
              <button onClick={placeOrder}
                className="w-full flex items-center justify-center gap-3 py-5 rounded-apple-xl text-lg font-bold text-white hover:opacity-90 transition-all"
                style={{ background: '#25d366' }}>
                <MessageCircle className="h-6 w-6" /> Place Order via WhatsApp
              </button>
              <p className="text-xs text-center text-gray-400">Order sent to our sales team. Confirmation within minutes.</p>
            </div>
          )}
        </div>

        {/* Summary sidebar */}
        <div className="bg-white rounded-apple-xl shadow-apple p-5 h-fit sticky top-24">
          <h3 className="font-bold text-gray-900 mb-4">Order Summary</h3>
          <div className="space-y-3 mb-4 max-h-52 overflow-y-auto">
            {items.map(i => (
              <div key={i.product.id} className="flex items-center gap-2">
                <img src={i.product.thumbnail} alt="" className="w-10 h-10 rounded-apple object-cover flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-700 truncate">{i.product.brand} {i.product.model}</p>
                  <p className="text-xs text-gray-400">×{i.qty}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between font-bold text-gray-900 text-lg pt-2 border-t border-gray-100">
            <span>Total</span><span>PKR {formatPrice(subtotal())}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
