'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import SEO from '@/components/ui/SEO'
import { waSales } from '@/lib/whatsapp'

type PolicyType = 'privacy' | 'terms' | 'warranty' | 'refund' | 'installment' | 'care-plan' | 'solar' | 'service'

const POLICIES: Record<PolicyType, { title: string; description: string; content: Array<{ heading: string; body: string }> }> = {
  privacy: {
    title: 'Privacy Policy',
    description: "How Tajalli's collects, uses, and protects your personal data.",
    content: [
      {
        heading: 'Information We Collect',
        body: `When you place an order or enquire about a product, we collect your name, phone number, email address (if provided), and delivery address. We may also collect device and browsing data through standard web analytics tools to improve our website.`,
      },
      {
        heading: 'How We Use Your Information',
        body: `We use your information solely to: process and fulfil your orders; contact you regarding your order status or enquiries; provide after-sale support and warranty services; and send you relevant product updates (only if you opt in). We do not sell, rent, or share your personal data with third parties for marketing purposes.`,
      },
      {
        heading: 'WhatsApp & Communication',
        body: `If you contact us via WhatsApp, your conversation is subject to WhatsApp's privacy policy. We use your WhatsApp number only to respond to your enquiries and provide order updates. We will not add you to bulk broadcast lists without your explicit consent.`,
      },
      {
        heading: 'Data Security',
        body: `Your data is stored securely. We use industry-standard encryption (SSL/TLS) for all data transmitted through our website. Access to customer data is restricted to authorised staff only.`,
      },
      {
        heading: 'Your Rights',
        body: `You have the right to request access to the personal data we hold about you, request correction of inaccurate data, or request deletion of your data. To exercise these rights, contact us at support@tajallis.com.pk or WhatsApp +92 370 2578788.`,
      },
      {
        heading: 'Contact',
        body: `For any privacy-related questions or concerns, please contact us at support@tajallis.com.pk or WhatsApp +92 370 2578788.`,
      },
    ],
  },
  terms: {
    title: 'Terms & Conditions',
    description: "Terms and conditions for using the Tajalli's website and purchasing our products.",
    content: [
      {
        heading: 'Acceptance of Terms',
        body: `By browsing our website or placing an order with Tajalli's, you agree to be bound by these terms and conditions. If you do not agree, please do not use our services.`,
      },
      {
        heading: 'Products & Pricing',
        body: `All prices are displayed in Pakistani Rupees (PKR) and are subject to change without notice. We make every effort to ensure accuracy, but in the event of a pricing error, we reserve the right to cancel an order and issue a full refund. Product availability is subject to stock levels.`,
      },
      {
        heading: 'Orders & Payment',
        body: `Orders are confirmed only after we contact you to verify the order details. Payment methods include cash on delivery and installment plans as described on our website. For installment orders, the advance payment is required before delivery.`,
      },
      {
        heading: 'Delivery',
        body: `We deliver within Karachi and to selected cities. Delivery timelines are estimates and may vary. Tajalli's is not liable for delays caused by factors outside our control (weather, courier issues, etc.). A delivery fee may apply for locations outside Karachi.`,
      },
      {
        heading: 'Installment Plans',
        body: `Installment plans are offered directly by Tajalli's — not through a bank. Plan terms (advance %, monthly amounts, duration) are as agreed at the time of order. Late or missed payments may result in recovery action and affect future purchases.`,
      },
      {
        heading: 'Limitation of Liability',
        body: `Tajalli's is not liable for any indirect, incidental, or consequential damages arising from the use of products purchased from us, beyond the manufacturer's warranty terms. Our liability is limited to the purchase price of the product.`,
      },
    ],
  },
  warranty: {
    title: 'Warranty Policy',
    description: "Understanding your warranty coverage when you buy from Tajalli's — both manufacturer warranty and our own service guarantees.",
    content: [
      {
        heading: 'Official Brand Warranty',
        body: `All products sold by Tajalli's come with the official manufacturer's warranty. Warranty periods vary by brand and product category — for example, Haier AC compressors carry a 5-year warranty, while Dawlance refrigerator compressors carry a 10-year warranty. The specific warranty period for each product is displayed on the product page.`,
      },
      {
        heading: 'What Is Covered',
        body: `Manufacturer warranty covers manufacturing defects and component failures under normal use conditions. This includes motor failures, compressor failures, electronic control issues, and other defects not caused by misuse or external damage.`,
      },
      {
        heading: 'What Is Not Covered',
        body: `Warranty does not cover: physical damage caused by mishandling or accidents; damage caused by power surges or improper installation; consumable parts (filters, belts, etc.); damage caused by unauthorised repair or modification; and normal wear and tear.`,
      },
      {
        heading: '90-Day Workmanship Guarantee (Repair Services)',
        body: `This is separate from manufacturer warranty and applies only to repair and maintenance services performed by Tajalli's technicians. If the same fault recurs within 90 days of a completed repair, we return and fix it at no additional charge. This guarantee covers our labour and the specific fault repaired — it does not cover new or unrelated faults, nor does it replace the manufacturer's product warranty.`,
      },
      {
        heading: 'How to Claim Warranty',
        body: `To claim manufacturer warranty, WhatsApp us at +92 370 2578788 with your order reference number and a description or photo of the issue. We will coordinate with the brand's authorised service centre on your behalf. Most claims are processed within 3–7 working days.`,
      },
      {
        heading: "Tajalli's After-Sale Support",
        body: `Beyond manufacturer warranty, we provide our own after-sale support. Our team follows up with customers after purchase, assists with service scheduling, and ensures warranty claims are handled efficiently. We act as your advocate with the brand.`,
      },
    ],
  },
  refund: {
    title: 'Refund & Return Policy',
    description: "Our policy on returns, exchanges, and refunds for products purchased from Tajalli's.",
    content: [
      {
        heading: 'Eligibility for Return',
        body: `Returns are accepted within 48 hours of delivery if: the product is defective or damaged on arrival; the wrong product was delivered; or the product does not match the specification confirmed at time of order. Products must be unused, in original packaging, with all accessories included.`,
      },
      {
        heading: 'How to Initiate a Return',
        body: `To initiate a return, WhatsApp us at +92 370 2578788 within 48 hours of delivery. Provide your order reference and photos showing the issue. Our team will arrange pick-up and either replace the product or issue a refund.`,
      },
      {
        heading: 'Refund Processing',
        body: `Approved refunds are processed within 5–7 working days. Refunds are issued via the same payment method used at the time of purchase (cash return for COD orders). For installment orders, the advance payment will be refunded and the plan cancelled.`,
      },
      {
        heading: 'Non-Returnable Situations',
        body: `We cannot accept returns for: change of mind after the product has been installed or used; products damaged by the customer after delivery; products returned after 48 hours of delivery without prior notification; and products with removed or tampered serial number stickers.`,
      },
      {
        heading: 'Exchange Policy',
        body: `If you wish to exchange a product for a different model, contact us within 48 hours. Subject to stock availability, exchanges are processed with any price difference settled. Opened and used products may not be exchanged unless defective.`,
      },
      {
        heading: 'Contact for Returns',
        body: `For all return and refund enquiries, WhatsApp +92 370 2578788 or email support@tajallis.com.pk. Please have your order reference ready.`,
      },
    ],
  },
  installment: {
    title: 'Installment Policy',
    description: "How Tajalli's in-house installment plans work — terms, advance requirements, and payment conditions.",
    content: [
      {
        heading: 'In-House Financing — No Bank Required',
        body: `Tajalli's installment plans are offered directly by us, not through a bank or third-party finance company. No CNIC verification, no bank account, and no credit check required. Plans are available on most products including ACs, refrigerators, washing machines, televisions, and more.`,
      },
      {
        heading: 'Plan Options',
        body: `We offer 2, 3, 6, and 12-payment plans. Each plan includes an advance payment due at delivery, followed by equal monthly payments. The total installment cost is higher than the cash price — this difference (the financing charge) is shown upfront before you commit. There are no hidden fees.`,
      },
      {
        heading: 'Advance Payment Requirement',
        body: `An advance payment is required before delivery for all installment orders. The advance is typically 30–40% of the total installment cost depending on the plan and product. For solar systems, the minimum advance is 40% and systems above PKR 700,000 or 5kW must be paid in full (cash only).`,
      },
      {
        heading: 'Payment Schedule & Due Dates',
        body: `Your payment schedule is confirmed at the time of order. Monthly payments are due on the same date each month. We will send a reminder before each due date. Payments are accepted via cash, bank transfer, JazzCash, and EasyPaisa.`,
      },
      {
        heading: 'Late or Missed Payments',
        body: `If a payment is missed or significantly delayed, our team will contact you to arrange resolution. Repeated non-payment may result in recovery action and may affect your eligibility for future installment purchases. We are always willing to discuss payment difficulties before they escalate — please contact us early.`,
      },
      {
        heading: 'Refund on Installment Orders',
        body: `If a product is returned under our refund policy, the advance payment will be refunded and the installment plan cancelled. If the installment plan was arranged with a third-party financier on your behalf, refund terms may differ — we will advise at time of return.`,
      },
      {
        heading: 'Installment Calculator',
        body: `Use our free Installment Calculator at tajallis.com.pk/installments to see exact advance, monthly payment, and total cost for any product price before you buy.`,
      },
    ],
  },
  'care-plan': {
    title: 'Care Plan Policy',
    description: "Terms covering Tajalli's annual care plans — what's included, how to claim, and plan limitations.",
    content: [
      {
        heading: 'What Is a Care Plan?',
        body: `A Tajalli's Care Plan is an annual maintenance and protection agreement for your home appliances. It is separate from the manufacturer's product warranty. Care plans cover preventive maintenance visits, priority response, and — depending on your plan tier — parts and repair costs.`,
      },
      {
        heading: 'Plan Tiers',
        body: `Essential Care (from PKR 3,000/year): 1 preventive visit, basic inspection, 10% off repairs, 72-hour response. Plus Care (from PKR 6,500/year): 2 visits, covered parts, maintenance labour included, priority 48-hour response. Elite Care (from PKR 13,650/year): 3 visits, covered repairs and parts, replacement if non-repairable, priority 24-hour response. Exact pricing depends on appliance type and size.`,
      },
      {
        heading: 'What Is Covered',
        body: `Care plans cover scheduled preventive maintenance visits, labour for covered repairs, and (on Plus and Elite tiers) specified replacement parts. Elite plans include a like-for-like replacement if the appliance is determined non-repairable by our technician.`,
      },
      {
        heading: 'What Is Not Covered',
        body: `Care plans do not cover: physical damage from accidents or misuse; damage from power surges, flooding, or fire; cosmetic damage (dents, scratches); products modified by unauthorised technicians; consumable parts (filters, belts, light bulbs); and appliances that were already faulty at the time the plan was purchased.`,
      },
      {
        heading: 'How to Raise a Care Plan Claim',
        body: `WhatsApp us at +92 370 2578788 with your care plan reference number and a description of the fault. Our team will schedule a technician visit within your plan's response window. Please have your appliance serial number ready.`,
      },
      {
        heading: 'Plan Period & Renewal',
        body: `Care plans are valid for 12 months from the date of purchase. Plans do not renew automatically. We will contact you before expiry with a renewal option. Plans are non-transferable and apply to the specific appliance registered at time of purchase.`,
      },
      {
        heading: 'Cancellation',
        body: `Care plans may be cancelled within 14 days of purchase for a full refund, provided no service visit has been used. After 14 days or after the first visit, no refund is available for unused plan period. Cancellations must be requested in writing via WhatsApp or email.`,
      },
    ],
  },
  solar: {
    title: 'Solar System Disclaimer',
    description: "Important assumptions, limitations, and disclosures for Tajalli's solar system calculations and packages.",
    content: [
      {
        heading: 'Calculation Assumptions',
        body: `All solar savings estimates, payback periods, and system sizing recommendations on this website and in our calculators are based on standard assumptions: average Karachi peak sun hours of 5–5.5 hours per day; average grid electricity price of PKR 50–60 per unit; typical household load profiles for Pakistan. Actual results will vary based on your specific location, roof orientation, shading, appliance usage patterns, and local electricity tariff.`,
      },
      {
        heading: 'These Are Estimates, Not Guarantees',
        body: `Solar output estimates, savings projections, and payback periods shown in our Solar Calculator, Green Corridor pages, and package breakdowns are estimates for planning purposes only. Tajalli's does not guarantee any specific level of generation, savings, or payback period. An on-site assessment by our team is required before any firm commitment can be made.`,
      },
      {
        heading: 'Panel Output Degradation',
        body: `Solar panels degrade in output over time — typically 0.5% per year for premium panels. Our calculators do not factor in degradation. Year 1 output will be higher than Year 10 output. This does not affect the warranty or structural performance of the panels.`,
      },
      {
        heading: 'Net Metering Eligibility',
        body: `Net metering (selling surplus power to the grid) requires a minimum system size of 10 kW and is subject to NEPRA regulations and KESC/HESCO approval. Our net metering eligibility tool is indicative only. Tajalli's does not guarantee approval for net metering. Registration cost, processing time, and approval are outside our control.`,
      },
      {
        heading: 'Package Pricing',
        body: `Solar package prices shown on this website are current at the time of display but are subject to change due to exchange rate fluctuations and component price changes. The price valid at the time of your confirmed order is the price you will pay. Any price change after order confirmation and advance payment requires your agreement.`,
      },
      {
        heading: 'Elevated Structure',
        body: `Packages shown without an elevated structure assume a standard flat roof or ground mount. If an elevated/tilted structure is required for optimal angle, an additional cost applies (currently PKR 15,000 per panel or PKR 96,000 for a 3.6 kW system — confirm at time of order). Our team will advise during the site visit.`,
      },
      {
        heading: 'Cash Only Above Threshold',
        body: `Solar systems above 5 kW or above PKR 700,000 in total value are available on a cash-only basis. Installment plans for solar require a minimum 40% advance payment and are subject to approval. These terms reflect the financing risk on large, fixed-installation systems.`,
      },
      {
        heading: 'After-Sale & Monitoring',
        body: `Tajalli's provides after-installation support for systems we install. Manufacturer warranty on panels, inverters, and batteries is as stated by the respective brands. We coordinate warranty claims on your behalf. Remote monitoring availability depends on the inverter brand selected.`,
      },
    ],
  },
  service: {
    title: 'Service Policy',
    description: "How Tajalli's after-sale service and repair visits work — booking, pricing, and your rights.",
    content: [
      {
        heading: 'How to Book a Service',
        body: `All service bookings are made via WhatsApp at +92 370 2578788 or by calling +92 370 2578788. Share your appliance brand, model, and a description of the fault. We will confirm a technician visit within your requested timeframe.`,
      },
      {
        heading: 'Technician Visit Fee',
        body: `A visit fee of PKR 2,000 (standard, within 48 hours) or PKR 3,000 (urgent, same-day if booked by 12pm) applies to all service calls. This fee is charged regardless of whether repair work proceeds. If you decide not to proceed with repair after the diagnosis, the visit fee is forfeited — it covers the technician's time, transport, and diagnosis.`,
      },
      {
        heading: 'Repair Pricing',
        body: `All repair prices are fixed and shown upfront on our Services page. There are no hidden charges. If additional work beyond the initial diagnosis is required, the technician will inform you and obtain your approval before proceeding. You will not be charged for unauthorised additional work.`,
      },
      {
        heading: '90-Day Workmanship Guarantee',
        body: `If the same fault recurs within 90 days of a completed repair by Tajalli's technician, we return and fix it at no additional charge. This applies to the specific fault repaired only and does not cover new faults or product warranty claims.`,
      },
      {
        heading: 'Genuine Parts',
        body: `We use genuine or OEM-equivalent parts for all repairs. Where only aftermarket parts are available, we will advise you before fitting. Parts used in repairs carry a 30-day part defect guarantee (not to be confused with the 90-day workmanship guarantee on the repair itself).`,
      },
      {
        heading: 'Annual Care Plans',
        body: `For recurring maintenance needs, consider our annual Care Plans which bundle preventive visits, parts, and priority response at a lower per-visit cost. See our Care Plan Policy or visit tajallis.com.pk/services for plan options and pricing.`,
      },
      {
        heading: 'Service Availability',
        body: `Standard service is available across all major Karachi areas. Same-day urgent service is available in most areas if booked by 12pm. Service outside Karachi may incur a travel surcharge — ask when booking.`,
      },
    ],
  },
}

export default function PolicyPage() {
  const params = useParams()
  const type = params?.type as string | undefined
  const router = useRouter()
  if (!type || !(type in POLICIES)) { router.replace('/'); return null }
  const policy = POLICIES[type as PolicyType]
  const lastUpdated = 'March 2026'

  return (
    <div className="min-h-screen bg-white">
      <SEO title={`${policy.title} — Tajalli's`} description={policy.description} />

      {/* Header */}
      <div className="bg-gray-50 border-b">
        <div className="max-w-3xl mx-auto px-4 py-10">
          <div className="flex gap-2 text-sm text-gray-400 mb-3">
            <Link href="/" className="hover:text-brand-500">Home</Link>
            <span>/</span>
            <span className="text-gray-600">{policy.title}</span>
          </div>
          <h1 className="text-3xl font-black text-gray-900 mb-2">{policy.title}</h1>
          <p className="text-gray-500">Last updated: {lastUpdated}</p>
        </div>
      </div>

      {/* Policy nav */}
      <div className="border-b bg-white sticky top-16 lg:top-[104px] z-20">
        <div className="max-w-3xl mx-auto px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar">
          {(Object.keys(POLICIES) as PolicyType[]).map(k => (
            <Link key={k} href={`/policy/${k}`}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                k === type ? 'bg-brand-500 text-white' : 'text-gray-500 hover:text-gray-800'
              }`}>
              {POLICIES[k].title}
            </Link>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-12">
        <p className="text-gray-600 leading-relaxed mb-10 text-lg">{policy.description}</p>
        <div className="space-y-8">
          {policy.content.map((section, i) => (
            <div key={i}>
              <h2 className="text-lg font-bold text-gray-900 mb-3">
                {i + 1}. {section.heading}
              </h2>
              <p className="text-gray-600 leading-relaxed">{section.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 p-6 bg-brand-50 rounded-2xl border border-brand-100">
          <h3 className="font-bold text-gray-900 mb-2">Questions about this policy?</h3>
          <p className="text-sm text-gray-600 mb-4">We're always happy to clarify. Reach out to us directly.</p>
          <div className="flex flex-wrap gap-3">
            <a href={waSales()} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 bg-green-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-green-600">
              💬 WhatsApp Us
            </a>
            <a href="mailto:support@tajallis.com.pk"
              className="inline-flex items-center gap-2 border border-gray-200 text-gray-700 px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50">
              ✉️ Email Us
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
