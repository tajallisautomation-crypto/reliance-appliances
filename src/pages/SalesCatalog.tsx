import { useState, useEffect, useCallback } from 'react'
import { Copy, MessageCircle, Printer, Check, RefreshCw, Share2 } from 'lucide-react'
import SEO from '@/components/ui/SEO'
import Spinner from '@/components/ui/Spinner'
import { getProducts, formatPrice } from '@/lib/api'
import type { Product } from '@/lib/api'
import {
  CATALOG_CATEGORIES,
  groupBySpec,
  buildCategoryWAMessage,
  buildMegaWAMessage,
  buildPrintHTML,
  type CatalogCategory,
} from '@/lib/salesCatalog'
import { wa } from '@/lib/whatsapp'
import { WA_SALES } from '@/lib/config'

// ── Helpers ────────────────────────────────────────────────────────────────────

const MAX_WA_CHARS = 1800  // conservative URL-encoded limit

async function copyText(text: string) {
  await navigator.clipboard.writeText(text)
}

function openPrint(cat: CatalogCategory, grouped: Map<string, Product[]>) {
  const html = buildPrintHTML(cat, grouped)
  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(html)
  w.document.close()
  w.focus()
  setTimeout(() => w.print(), 400)
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function CopyBtn({ text, label = 'Copy Text' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false)
  const handle = async () => {
    await copyText(text)
    setDone(true)
    setTimeout(() => setDone(false), 2200)
  }
  return (
    <button onClick={handle}
      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border border-gray-200 bg-white hover:bg-gray-50 transition-colors">
      {done ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-gray-500" />}
      {done ? 'Copied!' : label}
    </button>
  )
}

function WABtn({ text }: { text: string }) {
  const encoded = encodeURIComponent(text)
  const fits    = encoded.length <= MAX_WA_CHARS

  if (fits) {
    return (
      <a href={wa(WA_SALES, text)} target="_blank" rel="noreferrer"
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90"
        style={{ background: '#25d366' }}>
        <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
      </a>
    )
  }
  // Too long for URL — just copy
  return (
    <CopyBtn text={text} label="Copy for WhatsApp" />
  )
}

// ── Product row ────────────────────────────────────────────────────────────────

function ProductRow({ p }: { p: Product }) {
  const price  = p.price.cash_floor || p.price.retail
  const plan3m = p.installments?.['3m']

  return (
    <tr className="border-b border-gray-100 hover:bg-orange-50/30 transition-colors">
      <td className="py-2.5 px-3">
        <div className="text-sm font-medium text-gray-800 leading-tight">{p.simplified_name}</div>
        <div className="text-xs text-gray-400 mt-0.5">{p.brand} · {p.warranty || 'warranty incl.'}</div>
      </td>
      <td className="py-2.5 px-3 text-sm font-bold text-gray-900 whitespace-nowrap">
        PKR {formatPrice(price)}
      </td>
      <td className="py-2.5 px-3 text-sm text-gray-600 whitespace-nowrap">
        {plan3m ? `PKR ${formatPrice(plan3m.monthly)}/mo` : '—'}
      </td>
      <td className="py-2.5 px-3 text-xs text-gray-400 whitespace-nowrap">
        {plan3m ? `Adv: ${formatPrice(plan3m.advance)}` : '—'}
      </td>
    </tr>
  )
}

// ── Group section ─────────────────────────────────────────────────────────────

function GroupSection({ group, products }: { group: string; products: Product[] }) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="mb-4">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition-colors text-left">
        <span className="text-sm font-bold text-gray-800">{group}</span>
        <span className="text-xs text-gray-400 font-medium">{products.length} products</span>
      </button>
      {expanded && (
        <div className="mt-1 border border-gray-100 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-800 text-white text-xs">
                <th className="py-2 px-3 text-left font-semibold">Product</th>
                <th className="py-2 px-3 text-left font-semibold">Cash Price</th>
                <th className="py-2 px-3 text-left font-semibold">3m Monthly</th>
                <th className="py-2 px-3 text-left font-semibold">Advance (3m)</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => <ProductRow key={p.id} p={p} />)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Category panel ─────────────────────────────────────────────────────────────

function CategoryPanel({ cat, products, loading }: {
  cat:      CatalogCategory;
  products: Product[] | null;
  loading:  boolean;
}) {
  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Spinner />
    </div>
  )
  if (!products) return null

  const grouped = groupBySpec(products, cat)
  const waText  = buildCategoryWAMessage(cat, grouped)
  const total   = products.length

  return (
    <div>
      {/* Category action bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-4 border-b border-gray-100">
        <div>
          <h2 className="text-lg font-black text-gray-900">
            {cat.emoji} {cat.label}
          </h2>
          <p className="text-sm text-gray-400">{total} products · {grouped.size} groups</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <CopyBtn text={waText} label="Copy List" />
          <WABtn text={waText} />
          <button
            onClick={() => openPrint(cat, grouped)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border border-gray-200 bg-white hover:bg-gray-50 transition-colors">
            <Printer className="w-3.5 h-3.5 text-gray-500" /> Print Card
          </button>
        </div>
      </div>

      {/* Groups */}
      {[...grouped.entries()].map(([group, prods]) => (
        <GroupSection key={group} group={group} products={prods} />
      ))}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SalesCatalog() {
  const [activeCatId, setActiveCatId] = useState(CATALOG_CATEGORIES[0].id)
  const [cache,  setCache]  = useState<Record<string, Product[]>>({})
  const [loading, setLoading] = useState(false)
  const [megaCopied, setMegaCopied] = useState(false)

  const activeCat = CATALOG_CATEGORIES.find(c => c.id === activeCatId)!

  // Load category on first visit
  const loadCat = useCallback(async (cat: CatalogCategory, force = false) => {
    if (!force && cache[cat.id] !== undefined) return
    setLoading(true)
    try {
      const { products } = await getProducts({ category: cat.catParam, sort: 'name_asc' })
      setCache(prev => ({ ...prev, [cat.id]: products }))
    } finally {
      setLoading(false)
    }
  }, [cache])

  // Load active category
  useEffect(() => { loadCat(activeCat) }, [activeCatId])  // eslint-disable-line

  // Share full catalogue overview
  const shareMega = async () => {
    const allData = CATALOG_CATEGORIES
      .filter(c => cache[c.id])
      .map(c => ({ cat: c, products: cache[c.id] }))
    const text = buildMegaWAMessage(allData)
    await copyText(text)
    setMegaCopied(true)
    setTimeout(() => setMegaCopied(false), 2500)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SEO
        title="Sales Catalogue — Reliance by Tajallis"
        description="Internal sales tool — browse, share, and print product catalogues by category for customer consultation."
        path="/catalog"
      />

      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-base font-black text-gray-900 leading-tight">Sales Catalogue</h1>
            <p className="text-xs text-gray-400">Share price lists with customers via WhatsApp or print</p>
          </div>
          <button
            onClick={shareMega}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 bg-white hover:bg-gray-50 transition-colors shrink-0">
            {megaCopied
              ? <><Check className="w-4 h-4 text-green-500" /> Copied!</>
              : <><Share2 className="w-4 h-4 text-gray-500" /> Share Full Catalogue</>}
          </button>
        </div>

        {/* Category tabs */}
        <div className="max-w-6xl mx-auto px-4 pb-0 flex gap-1 overflow-x-auto scrollbar-hide">
          {CATALOG_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCatId(cat.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                cat.id === activeCatId
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}>
              {cat.emoji} {cat.label}
              {cache[cat.id] && (
                <span className="text-xs font-normal text-gray-400">({cache[cat.id].length})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">

          {/* Refresh + help note */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-gray-400">
              Prices shown are <strong>cash floor</strong> prices. Click any group header to expand/collapse.
            </p>
            <button
              onClick={() => loadCat(activeCat, true)}
              disabled={loading}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50">
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>

          <CategoryPanel
            cat={activeCat}
            products={cache[activeCatId] ?? null}
            loading={loading}
          />
        </div>

        {/* How to use */}
        <div className="mt-6 grid sm:grid-cols-3 gap-4">
          {[
            {
              icon: <Copy className="w-5 h-5 text-blue-500" />,
              title: 'Copy List',
              desc: 'Copy a formatted WhatsApp-ready price list for the current category. Paste directly into any chat.',
            },
            {
              icon: <MessageCircle className="w-5 h-5 text-green-500" />,
              title: 'WhatsApp',
              desc: 'For smaller categories, click WhatsApp to open a chat with the list pre-filled.',
            },
            {
              icon: <Printer className="w-5 h-5 text-orange-500" />,
              title: 'Print Card',
              desc: 'Opens a printable page — use browser Print to PDF, then share the PDF with customers.',
            },
          ].map(tip => (
            <div key={tip.title} className="bg-white rounded-xl border border-gray-100 p-4 flex gap-3">
              <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">{tip.icon}</div>
              <div>
                <div className="text-sm font-bold text-gray-800 mb-0.5">{tip.title}</div>
                <div className="text-xs text-gray-500 leading-relaxed">{tip.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
