'use client'

import { useState } from 'react'
import { MessageCircle, FileDown, Loader2 } from 'lucide-react'
import { waSales } from '@/lib/whatsapp'

const INDUSTRIES = [
  'Office / Commercial', 'Hotel / Hospitality', 'School / Institution',
  'Clinic / Healthcare', 'Restaurant / Cafe', 'Salon / Beauty',
  'Retail / Showroom', 'Factory / Warehouse', 'Real Estate / Developer',
  'Other',
]

const PRODUCT_OPTIONS = [
  'Air Conditioners', 'Refrigerators / Freezers', 'Washing Machines',
  'Televisions', 'Solar System', 'UPS / Battery Backup',
  'Kitchen Appliances', 'Fans / Ventilation', 'Multiple categories',
]

export function CorporateQuoteForm() {
  const [company,   setCompany]   = useState('')
  const [industry,  setIndustry]  = useState('')
  const [products,  setProducts]  = useState('')
  const [qty,       setQty]       = useState('')
  const [timeline,  setTimeline]  = useState('')
  const [area,      setArea]      = useState('')
  const [notes,     setNotes]     = useState('')

  function buildMsg(): string {
    const lines = [
      `Hi, I'd like a *commercial/B2B quotation* for:`,
      `• *Company:* ${company || '(not provided)'}`,
      `• *Industry:* ${industry || '(not provided)'}`,
      `• *Products needed:* ${products || '(not specified)'}`,
      `• *Quantity:* ${qty || '(not specified)'}`,
      `• *Delivery timeline:* ${timeline || '(not specified)'}`,
      `• *Site location:* ${area || '(not provided)'}`,
    ]
    if (notes.trim()) lines.push(`• *Additional notes:* ${notes.trim()}`)
    lines.push(`\nPlease send a detailed itemised quote within 24 hours.`)
    return lines.join('\n')
  }

  const filled = company.trim() || products.trim() || qty.trim()

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
      <div>
        <h3 className="font-black text-gray-900 text-base">Request a Commercial Quote</h3>
        <p className="text-xs text-gray-500 mt-0.5">Fill in as much as you know — we'll handle the rest. Quote within 24 hours.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Company / Organisation Name</label>
          <input value={company} onChange={e => setCompany(e.target.value)}
            placeholder="e.g. Al-Hassan Enterprises"
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Industry / Business Type</label>
          <select value={industry} onChange={e => setIndustry(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-400">
            <option value="">Select industry…</option>
            {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Products Required</label>
          <select value={products} onChange={e => setProducts(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-400">
            <option value="">Select category…</option>
            {PRODUCT_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Approximate Quantity</label>
          <input value={qty} onChange={e => setQty(e.target.value)}
            placeholder="e.g. 10 ACs, 5 fridges…"
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Delivery Timeline</label>
          <input value={timeline} onChange={e => setTimeline(e.target.value)}
            placeholder="e.g. within 2 weeks, June 2026…"
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Site Location / Area</label>
          <input value={area} onChange={e => setArea(e.target.value)}
            placeholder="e.g. Gulshan Block 7, Karachi"
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1">Additional Requirements / Notes</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
          placeholder="Brand preferences, specific models, installation included, phased delivery, etc."
          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-1">
        <a href={waSales(buildMsg())} target="_blank" rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-2 bg-wa hover:bg-wa-hover text-white font-bold py-3 rounded-xl transition-colors text-sm">
          <MessageCircle className="w-4 h-4" />
          {filled ? 'Send Quotation Request' : 'Chat with Corporate Team'}
        </a>
        <a href="mailto:sales@tajallis.com.pk?subject=Corporate+Quote+Request"
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold text-sm hover:border-brand-300 hover:bg-brand-50 transition-colors">
          Email Us
        </a>
      </div>

      <p className="text-[11px] text-gray-400 text-center">
        NTN: 42101-3836602-3 · sales@tajallis.com.pk · +92 370 2578788
      </p>
    </div>
  )
}

// ── Downloadable Corporate Profile PDF ────────────────────────────────────────

export function DownloadCorporateProfile() {
  const [generating, setGenerating] = useState(false)

  async function handleDownload() {
    setGenerating(true)
    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

      const W = 210, MARGIN = 20
      let y = 20

      const addText = (text: string, x: number, size: number, bold: boolean, color: [number,number,number]) => {
        doc.setFontSize(size)
        doc.setFont('helvetica', bold ? 'bold' : 'normal')
        doc.setTextColor(...color)
        doc.text(text, x, y)
      }

      // Header bar
      doc.setFillColor(30, 64, 175)
      doc.rect(0, 0, W, 38, 'F')
      doc.setFontSize(22); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255)
      doc.text("Tajalli's Home & Commercial Solutions", MARGIN, 18)
      doc.setFontSize(10); doc.setFont('helvetica', 'normal')
      doc.text('Corporate Profile & B2B Procurement Guide', MARGIN, 28)
      doc.text('reliance.tajallis.com.pk', W - MARGIN, 28, { align: 'right' })

      y = 52
      addText('Who We Are', MARGIN, 14, true, [17, 24, 39])
      y += 8
      doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(75, 85, 99)
      const intro = "Tajalli's Home & Commercial Solutions has served Karachi since 2015, supplying and installing home appliances and solar solutions for over 14,400 homes and businesses. We offer genuine products from Haier, Dawlance, Gree, EcoStar, Westpoint, Crown and more — with professional installation, after-sale service, and dedicated corporate support."
      const introLines = doc.splitTextToSize(intro, W - MARGIN * 2)
      doc.text(introLines, MARGIN, y)
      y += introLines.length * 5 + 8

      addText('Corporate Benefits', MARGIN, 13, true, [17, 24, 39])
      y += 7
      const benefits = [
        ['Volume Pricing',         '5 units: 4% off  |  10 units: 8% off  |  20+ units: 12% off list price'],
        ['Dedicated Account Mgr',  'Single named contact. Direct WhatsApp access. No call centres.'],
        ['Priority Service',       '4-hour breakdown response. Jump-the-queue for corporate accounts.'],
        ['Phased Delivery',        'Multi-phase projects delivered to your schedule, at no extra cost.'],
        ['Extended Warranty',      'Coordinated warranty support for bulk orders.'],
        ['Commercial Solar',       'Grid-tied & hybrid solar for offices, factories, and retail.'],
      ]
      doc.setFontSize(9)
      for (const [title, detail] of benefits) {
        doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 64, 175)
        doc.text(`• ${title}:`, MARGIN, y)
        doc.setFont('helvetica', 'normal'); doc.setTextColor(75, 85, 99)
        const detailLines = doc.splitTextToSize(detail, W - MARGIN * 2 - 35)
        doc.text(detailLines, MARGIN + 35, y)
        y += Math.max(detailLines.length * 4.5, 5) + 1.5
      }
      y += 5

      addText('Industries We Serve', MARGIN, 13, true, [17, 24, 39])
      y += 7
      const industries = ['Hotels & Hospitality', 'Offices & Commercial', 'Schools & Institutions', 'Clinics & Healthcare', 'Restaurants & Cafes', 'Salons & Beauty', 'Factories & Warehouses', 'Real Estate & Developers', 'Retail & Showrooms']
      doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(75, 85, 99)
      const cols = 3, colW = (W - MARGIN * 2) / cols
      industries.forEach((ind, i) => {
        const col = i % cols, row = Math.floor(i / cols)
        doc.text(`• ${ind}`, MARGIN + col * colW, y + row * 5.5)
      })
      y += Math.ceil(industries.length / cols) * 5.5 + 8

      addText('Product Categories', MARGIN, 13, true, [17, 24, 39])
      y += 7
      const cats = ['Air Conditioners (1T–4T, inverter & T3-rated)', 'Refrigerators & Deep Freezers', 'Washing Machines (semi & fully auto)', 'Smart Televisions & Displays', 'Solar Systems (on-grid, hybrid, off-grid)', 'UPS & Battery Backup Solutions', 'Kitchen & Small Appliances', 'Fans & Ventilation Equipment']
      doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(75, 85, 99)
      cats.forEach((cat, i) => {
        const col = i % 2, row = Math.floor(i / 2)
        doc.text(`• ${cat}`, MARGIN + col * (W / 2 - MARGIN), y + row * 5.5)
      })
      y += Math.ceil(cats.length / 2) * 5.5 + 8

      // NTN / Registration box
      doc.setFillColor(248, 250, 252)
      doc.setDrawColor(226, 232, 240)
      doc.roundedRect(MARGIN, y, W - MARGIN * 2, 18, 3, 3, 'FD')
      doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 64, 175)
      doc.text('Business Registration', MARGIN + 4, y + 6)
      doc.setFont('helvetica', 'normal'); doc.setTextColor(55, 65, 81)
      doc.text('NTN: 42101-3836602-3', MARGIN + 4, y + 12)
      doc.text('FBR-registered business', MARGIN + 60, y + 12)
      y += 24

      // Footer
      doc.setFillColor(17, 24, 39)
      doc.rect(0, 280, W, 17, 'F')
      doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255)
      doc.text("Tajalli's Home & Commercial Solutions", MARGIN, 288)
      doc.setFont('helvetica', 'normal'); doc.setTextColor(156, 163, 175)
      doc.text('+92 370 2578788  ·  sales@tajallis.com.pk  ·  reliance.tajallis.com.pk', W / 2, 294, { align: 'center' })

      doc.save('Tajallis-Corporate-Profile.pdf')
    } catch (e) {
      console.error('PDF generation failed', e)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <button onClick={handleDownload} disabled={generating}
      className="flex items-center gap-2 px-5 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold text-sm hover:border-brand-300 hover:bg-brand-50 transition-colors disabled:opacity-60">
      {generating
        ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
        : <><FileDown className="w-4 h-4" /> Download Corporate Profile (PDF)</>
      }
    </button>
  )
}
