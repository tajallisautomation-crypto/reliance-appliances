import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Calculator, Info, CheckCircle, Phone, FileText,
  Home, Users, Clock, ShieldCheck, ChevronRight, AlertCircle, ChevronDown,
} from 'lucide-react'
import { calcAllPlans, fmtPKR, roundTo100 } from '../lib/api'
import SEO from '../components/ui/SEO'
import { waSales } from '../lib/whatsapp'

const FAQS = [
  {
    q: 'Does my guarantor need to come to your office?',
    a: 'No. Your guarantor only needs to be available for a phone call and the home verification visit. They never need to visit our office.',
  },
  {
    q: 'My guarantor is a tenant — what do I do?',
    a: 'Guarantors must be homeowners. If your first guarantor is a tenant, you can provide two separate guarantors who are both homeowners. Their utility bills must be in their own names.',
  },
  {
    q: 'Is the advance refundable if my application is rejected?',
    a: 'Yes — fully. If verification is unsuccessful, the advance is returned to you with no deductions. Refunds are processed within 3 working days.',
  },
  {
    q: 'What happens if I miss a monthly payment?',
    a: 'Late payments attract a penalty charge as per your signed agreement. Persistent non-payment can result in product retrieval and legal proceedings. Contact us immediately on WhatsApp if you are facing difficulty — we can discuss options.',
  },
  {
    q: 'Can I settle the full remaining balance early?',
    a: 'Yes. Early settlement is welcome at any time. WhatsApp us to get your outstanding balance and arrange payment — no early-settlement penalty applies.',
  },
  {
    q: 'Which products qualify for installments?',
    a: 'Most products above PKR 15,000 qualify. Solar systems above 5 kW and orders above PKR 700,000 are cash only. Use the calculator on any product page to see what plans are available.',
  },
  {
    q: 'Can I buy a product that isn\'t on your website on installments?',
    a: 'Yes. WhatsApp us the product name and model and we\'ll check availability and put together an installment quote for you.',
  },
  {
    q: 'How do I track my payment schedule?',
    a: 'Log in to your customer portal at /portal to view your full payment schedule, outstanding balance, and payment history.',
  },
]

const PLAN_DETAILS = [
  { key: '2 Payments',  label: '2 Payments',  splits: '2',  note: 'Pay a portion upfront, then 1 remaining payment.', popular: false },
  { key: '3 Payments',  label: '3 Payments',  splits: '3',  note: 'Pay a portion upfront, then 2 monthly payments.', popular: true },
  { key: '6 Payments',  label: '6 Payments',  splits: '6',  note: 'Pay a portion upfront, then 5 monthly payments.' },
  { key: '12 Payments', label: '12 Payments', splits: '12', note: 'Pay a portion upfront, then 11 monthly payments.' },
]

const PROCESS_STEPS = [
  { num: '01', title: 'Choose Your Product', desc: 'Select your appliance and preferred payment plan. Use the slider on any product page.', icon: ShieldCheck },
  { num: '02', title: 'Upload Documents', desc: 'Log in to your portal and upload your NIC, utility bill, and guarantor\'s documents. Advance is collected at this stage.', icon: FileText },
  { num: '03', title: 'Home Verification', desc: 'Our team makes a physical visit to your home within 4 working days to complete verification. You\'ll receive the decision shortly after.', icon: Clock },
  { num: '04', title: 'Delivery & Installation', desc: 'Upon approval, your appliance is delivered and professionally installed at your home.', icon: Home },
]

const BUYER_DOCS = [
  'Original CNIC (National Identity Card)',
  'Copy of latest electricity or gas utility bill',
  'Passport-sized photograph',
]

const GUARANTOR_DOCS = [
  'Original CNIC of guarantor',
  'Copy of utility bill in guarantor\'s name',
  'Passport-sized photograph of guarantor',
]

export default function InstallmentsPage() {
  const [price,   setPrice]   = useState('')
  const [result,  setResult]  = useState<any>(null)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const calculate = () => {
    const p = parseFloat(price)
    if (!p || p <= 0) return
    setResult({ price: roundTo100(p), plans: calcAllPlans(p) })
  }

  return (
    <div className="min-h-screen bg-white">
      <SEO
        title="Easy Installment Plans — Reliance Appliances Karachi"
        description="Buy home appliances on 2, 3, 6, or 12-payment installment plans. No bank account required. Document requirements, process, and calculator."
      />

      {/* Hero */}
      <div className="bg-gray-900 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-brand-400 text-xs font-bold uppercase tracking-widest mb-3">Flexible Financing</p>
          <h1 className="text-3xl md:text-5xl font-black mb-4">Buy Now, Pay Easy</h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Up to 12-payment plans with no bank account required.
            Professional verification. Transparent terms.
          </p>
          <div className="flex flex-wrap gap-4 justify-center mt-8">
            <a href={waSales('Hi, I\'d like to apply for an installment plan')}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white bg-wa hover:bg-wa-hover transition-colors">
              💬 Start on WhatsApp
            </a>
            <Link to="/products"
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold bg-white text-gray-900 hover:bg-gray-100 transition-colors">
              Browse Products <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-14 space-y-16">

        {/* Plans grid */}
        <section>
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black text-gray-900">Our Installment Plans</h2>
            <p className="text-gray-500 mt-1 text-sm">All plans include professional delivery and installation in Karachi</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PLAN_DETAILS.map(p => (
              <div key={p.key} className={`relative bg-white rounded-2xl border-2 p-6 ${p.popular ? 'border-brand-400 shadow-lg shadow-brand-50' : 'border-gray-100'}`}>
                {p.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-500 text-white text-xs font-bold px-3 py-1 rounded-full">MOST POPULAR</div>
                )}
                <div className="text-center">
                  <div className="text-2xl font-black text-gray-900 mb-2">{p.label}</div>
                  <div className="text-4xl font-black text-brand-500 mb-4">{p.splits}×</div>
                  <p className="text-sm text-gray-500 leading-relaxed">{p.note}</p>
                  <p className="text-xs text-gray-400 mt-3">Use the calculator below to see exact amounts for your product.</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Calculator */}
        <section className="bg-gray-50 rounded-3xl p-8 border border-gray-100">
          <h2 className="text-2xl font-black text-gray-900 mb-2 flex items-center gap-2">
            <Calculator className="w-6 h-6 text-brand-500" /> Installment Calculator
          </h2>
          <p className="text-sm text-gray-500 mb-6">Enter any product price to see exact monthly amounts</p>
          <div className="flex gap-3 max-w-md">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">PKR</span>
              <input
                type="number" value={price}
                onChange={e => setPrice(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && calculate()}
                placeholder="e.g. 75000"
                className="w-full border-2 border-gray-200 rounded-xl pl-12 pr-4 py-3 text-lg font-semibold focus:outline-none focus:border-brand-400"
              />
            </div>
            <button onClick={calculate}
              className="bg-gray-900 hover:bg-gray-800 text-white px-6 py-3 rounded-xl font-semibold transition-colors">
              Calculate
            </button>
          </div>
          {result && (
            <div className="mt-8 space-y-4">
              <p className="text-sm text-gray-500">Results for <strong>{fmtPKR(result.price)}</strong></p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(result.plans).map(([key, plan]: [string, any]) => (
                  <div key={key} className={`rounded-2xl border-2 p-5 ${key === '3m' ? 'border-brand-400 bg-brand-50' : 'border-gray-200 bg-white'}`}>
                    <div className="font-bold text-base text-gray-800 mb-4">
                      {key === '2m' ? '2' : key === '3m' ? '3' : key === '6m' ? '6' : '12'} Payments
                    </div>
                    <div className="space-y-2.5">
                      <div className="bg-gray-50 rounded-xl p-3">
                        <div className="text-xs text-gray-500 mb-0.5">Total</div>
                        <div className="font-bold">{fmtPKR(plan.total)}</div>
                      </div>
                      <div className="bg-brand-50 rounded-xl p-3 border border-brand-100">
                        <div className="text-xs text-brand-600 mb-0.5">Advance ({Math.round(plan.advancePct * 100)}%)</div>
                        <div className="font-bold text-lg text-brand-700">{fmtPKR(plan.advance)}</div>
                      </div>
                      {plan.monthly > 0 && (
                        <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                          <div className="text-xs text-blue-600 mb-0.5">{plan.monthlyPayments}× Monthly</div>
                          <div className="font-bold text-lg text-blue-700">{fmtPKR(plan.monthly)}</div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-start gap-2 bg-blue-50 rounded-xl p-3 text-sm text-blue-700">
                <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>All amounts rounded to nearest PKR 100. Approval subject to document verification.</span>
              </div>
            </div>
          )}
        </section>

        {/* How it works */}
        <section>
          <div className="text-center mb-10">
            <h2 className="text-2xl font-black text-gray-900">How It Works</h2>
            <p className="text-gray-500 mt-1 text-sm">From product selection to doorstep delivery in 4 steps</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {PROCESS_STEPS.map(step => (
              <div key={step.num} className="text-center">
                <div className="w-12 h-12 bg-gray-900 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 text-lg font-black">
                  {step.num}
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Requirements — anchor target */}
        <section id="requirements" className="scroll-mt-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-black text-gray-900">Document Requirements</h2>
            <p className="text-gray-500 mt-1 text-sm">All documents are required at the time of advance payment</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Buyer documents */}
            <div className="bg-white border border-gray-100 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Buyer Documents</h3>
                  <p className="text-xs text-gray-400">Required from the purchaser</p>
                </div>
              </div>
              <ul className="space-y-3">
                {BUYER_DOCS.map(doc => (
                  <li key={doc} className="flex items-start gap-2 text-sm text-gray-700">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    {doc}
                  </li>
                ))}
              </ul>
            </div>

            {/* Guarantor documents */}
            <div className="bg-white border border-gray-100 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center">
                  <Users className="w-5 h-5 text-brand-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Guarantor Documents</h3>
                  <p className="text-xs text-gray-400">Required from the guarantor(s)</p>
                </div>
              </div>
              <ul className="space-y-3">
                {GUARANTOR_DOCS.map(doc => (
                  <li key={doc} className="flex items-start gap-2 text-sm text-gray-700">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    {doc}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Guarantor policy callout */}
          <div className="mt-6 space-y-3">
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-2xl p-5">
              <Home className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-bold text-amber-900 mb-1">Guarantor must be a homeowner</p>
                <p className="text-amber-700">
                  Your guarantor must own their home. A utility bill in the guarantor's name is accepted as proof. If you are a tenant, two guarantors (both homeowners) are required.
                  The guarantor takes legal responsibility for the installment payments.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-2xl p-5">
              <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-bold text-blue-900 mb-1">4 Working Days Verification</p>
                <p className="text-blue-700">
                  After document submission and advance collection, our team completes verification within 4 working days.
                  You will be contacted with the decision. Advance is refundable if the application is not approved.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-2xl p-5">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-bold text-red-900 mb-1">Important Notice</p>
                <p className="text-red-700">
                  Approval is not guaranteed. Missing or falsified documents result in immediate cancellation.
                  All installment agreements are legally binding.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section>
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black text-gray-900">Frequently Asked Questions</h2>
            <p className="text-gray-500 mt-1 text-sm">Everything you need to know before applying</p>
          </div>
          <div className="space-y-2 max-w-3xl mx-auto">
            {FAQS.map((faq, i) => (
              <div key={i} className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="font-semibold text-gray-800 text-sm leading-snug">{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5 text-sm text-gray-600 leading-relaxed border-t border-gray-50 pt-4">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="text-center mt-6">
            <p className="text-sm text-gray-500">
              Have a question not listed here?{' '}
              <a href={waSales('Hi, I have a question about the installment plan')}
                target="_blank" rel="noreferrer"
                className="text-brand-500 font-semibold hover:underline">
                Ask us on WhatsApp →
              </a>
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-gray-900 rounded-3xl p-10 text-white text-center">
          <h2 className="text-2xl font-black mb-2">Ready to apply?</h2>
          <p className="text-gray-400 mb-8 max-w-md mx-auto text-sm">
            WhatsApp us with the product you want and we'll walk you through the process step by step.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href={waSales('Hi, I\'d like to apply for an installment plan')}
              className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-bold text-white bg-wa hover:bg-wa-hover transition-colors">
              💬 Start Application on WhatsApp
            </a>
            <a href="tel:+923702578788"
              className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-bold bg-white text-gray-900 hover:bg-gray-100 transition-colors">
              <Phone className="w-4 h-4" /> Call +92 370 2578788
            </a>
          </div>
        </section>

      </div>
    </div>
  )
}
