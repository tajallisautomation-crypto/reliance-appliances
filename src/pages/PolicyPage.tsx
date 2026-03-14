import { useParams, Link, Navigate } from 'react-router-dom'
import SEO from '@/components/ui/SEO'

type PolicyType = 'privacy' | 'terms' | 'warranty' | 'refund'

const POLICIES: Record<PolicyType, { title: string; description: string; content: Array<{ heading: string; body: string }> }> = {
  privacy: {
    title: 'Privacy Policy',
    description: 'How Reliance Appliances collects, uses, and protects your personal data.',
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
        body: `You have the right to request access to the personal data we hold about you, request correction of inaccurate data, or request deletion of your data. To exercise these rights, contact us at info@relianceappliances.pk or WhatsApp +92 370 2578788.`,
      },
      {
        heading: 'Contact',
        body: `For any privacy-related questions or concerns, please contact us at info@relianceappliances.pk or WhatsApp +92 370 2578788.`,
      },
    ],
  },
  terms: {
    title: 'Terms & Conditions',
    description: 'Terms and conditions for using the Reliance Appliances website and purchasing our products.',
    content: [
      {
        heading: 'Acceptance of Terms',
        body: `By browsing our website or placing an order with Reliance Appliances, you agree to be bound by these terms and conditions. If you do not agree, please do not use our services.`,
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
        body: `We deliver within Karachi and to selected cities. Delivery timelines are estimates and may vary. Reliance Appliances is not liable for delays caused by factors outside our control (weather, courier issues, etc.). A delivery fee may apply for locations outside Karachi.`,
      },
      {
        heading: 'Installment Plans',
        body: `Installment plans are offered directly by Reliance Appliances — not through a bank. Plan terms (advance %, monthly amounts, duration) are as agreed at the time of order. Late or missed payments may result in recovery action and affect future purchases.`,
      },
      {
        heading: 'Limitation of Liability',
        body: `Reliance Appliances is not liable for any indirect, incidental, or consequential damages arising from the use of products purchased from us, beyond the manufacturer's warranty terms. Our liability is limited to the purchase price of the product.`,
      },
    ],
  },
  warranty: {
    title: 'Warranty Policy',
    description: 'Understanding your warranty coverage when you buy from Reliance Appliances.',
    content: [
      {
        heading: 'Official Brand Warranty',
        body: `All products sold by Reliance Appliances come with the official manufacturer's warranty. Warranty periods vary by brand and product category — for example, Haier AC compressors carry a 5-year warranty, while Dawlance refrigerator compressors carry a 10-year warranty. The specific warranty for each product is displayed on the product page.`,
      },
      {
        heading: 'What Is Covered',
        body: `Warranty covers manufacturing defects and component failures under normal use conditions. This includes motor failures, compressor failures, electronic control issues, and other defects not caused by misuse.`,
      },
      {
        heading: 'What Is Not Covered',
        body: `Warranty does not cover: physical damage caused by mishandling or accidents; damage caused by power surges or improper installation; consumable parts (filters, belts, etc.); damage caused by unauthorised repair or modification; and normal wear and tear.`,
      },
      {
        heading: 'How to Claim Warranty',
        body: `To claim warranty, WhatsApp us at +92 370 2578788 with your order reference number and a description / photo of the issue. We will coordinate with the brand's authorised service centre on your behalf. Most claims are processed within 3–7 working days.`,
      },
      {
        heading: 'Reliance After-Sale Support',
        body: `Beyond manufacturer warranty, we provide our own after-sale support. Our team follows up with customers after purchase, assists with service scheduling, and ensures warranty claims are handled efficiently. We act as your advocate with the brand.`,
      },
    ],
  },
  refund: {
    title: 'Refund & Return Policy',
    description: 'Our policy on returns, exchanges, and refunds for products purchased from Reliance Appliances.',
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
        body: `For all return and refund enquiries, WhatsApp +92 370 2578788 or email info@relianceappliances.pk. Please have your order reference ready.`,
      },
    ],
  },
}

export default function PolicyPage() {
  const { type } = useParams<{ type: string }>()
  if (!type || !(type in POLICIES)) return <Navigate to="/" replace />
  const policy = POLICIES[type as PolicyType]
  const lastUpdated = 'March 2025'

  return (
    <div className="min-h-screen bg-white">
      <SEO title={`${policy.title} — Reliance Appliances`} description={policy.description} />

      {/* Header */}
      <div className="bg-gray-50 border-b">
        <div className="max-w-3xl mx-auto px-4 py-10">
          <div className="flex gap-2 text-sm text-gray-400 mb-3">
            <Link to="/" className="hover:text-orange-500">Home</Link>
            <span>/</span>
            <span className="text-gray-600">{policy.title}</span>
          </div>
          <h1 className="text-3xl font-black text-gray-900 mb-2">{policy.title}</h1>
          <p className="text-gray-500">Last updated: {lastUpdated}</p>
        </div>
      </div>

      {/* Policy nav */}
      <div className="border-b bg-white sticky top-16 z-20">
        <div className="max-w-3xl mx-auto px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar">
          {(Object.keys(POLICIES) as PolicyType[]).map(k => (
            <Link key={k} to={`/policy/${k}`}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                k === type ? 'bg-orange-500 text-white' : 'text-gray-500 hover:text-gray-800'
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

        <div className="mt-12 p-6 bg-orange-50 rounded-2xl border border-orange-100">
          <h3 className="font-bold text-gray-900 mb-2">Questions about this policy?</h3>
          <p className="text-sm text-gray-600 mb-4">We're always happy to clarify. Reach out to us directly.</p>
          <div className="flex flex-wrap gap-3">
            <a href="https://wa.me/923702578788" target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 bg-green-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-green-600">
              💬 WhatsApp Us
            </a>
            <a href="mailto:info@relianceappliances.pk"
              className="inline-flex items-center gap-2 border border-gray-200 text-gray-700 px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50">
              ✉️ Email Us
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
