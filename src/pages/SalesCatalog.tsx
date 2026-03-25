import { useState, useEffect, useCallback, useRef } from 'react'
import { Copy, MessageCircle, Printer, Check, RefreshCw, Share2, Download, LayoutGrid, Table2, ImageIcon } from 'lucide-react'
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

const MAX_WA_CHARS = 1800

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

async function downloadElementAsImage(el: HTMLElement, filename: string) {
  const html2canvas = (await import('html2canvas')).default
  const canvas = await html2canvas(el, {
    useCORS: true,
    allowTaint: true,
    scale: 2,
    backgroundColor: '#ffffff',
    logging: false,
  })
  const link = document.createElement('a')
  link.download = `${filename}.png`
  link.href = canvas.toDataURL('image/png')
  link.click()
}

// ── Copy button ────────────────────────────────────────────────────────────────

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
  if (encoded.length <= MAX_WA_CHARS) {
    return (
      <a href={wa(WA_SALES, text)} target="_blank" rel="noreferrer"
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90"
        style={{ background: '#25d366' }}>
        <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
      </a>
    )
  }
  return <CopyBtn text={text} label="Copy for WhatsApp" />
}

// ── Visual flyer card ──────────────────────────────────────────────────────────

const BRAND_COLORS: Record<string, string> = {
  haier: '#e31837', dawlance: '#003087', gree: '#00843d',
  ecostar: '#0070c0', crown: '#1a1a2e', westpoint: '#2563eb',
}

function getBrandColor(brand: string) {
  return BRAND_COLORS[brand.toLowerCase()] || '#374151'
}

function ProductImageCell({ p }: { p: Product }) {
  const [failed, setFailed] = useState(false)
  if (p.thumbnail && !failed) {
    return (
      <img
        src={p.thumbnail}
        alt={p.simplified_name}
        crossOrigin="anonymous"
        onError={() => setFailed(true)}
        className="w-full h-full object-contain"
      />
    )
  }
  return (
    <div className="w-full h-full flex items-center justify-center rounded-lg text-white font-black text-xl"
      style={{ background: getBrandColor(p.brand) }}>
      {p.brand.charAt(0)}
    </div>
  )
}

function FlyerGroupCard({
  cat, group, products,
}: {
  cat: CatalogCategory;
  group: string;
  products: Product[];
}) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [downloading, setDownloading] = useState(false)
  const shown = products.slice(0, 12)
  const extra = products.length - shown.length

  const handleDownload = async () => {
    if (!cardRef.current) return
    setDownloading(true)
    try {
      const slug = `${cat.id}-${group.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`
      await downloadElementAsImage(cardRef.current, `reliance-${slug}`)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="mb-8">
      {/* Action bar above card */}
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-sm font-bold text-gray-700">{group}
          <span className="text-gray-400 font-normal ml-1.5">({products.length})</span>
        </span>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white transition-colors disabled:opacity-60">
          {downloading
            ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            : <Download className="w-3.5 h-3.5" />}
          {downloading ? 'Saving…' : 'Download Image'}
        </button>
      </div>

      {/* The flyer card — this is what gets captured */}
      <div ref={cardRef} className="bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm"
        style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>

        {/* Flyer header */}
        <div className="flex items-center justify-between px-5 py-3"
          style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a8e 100%)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-black text-sm shrink-0"
              style={{ background: 'linear-gradient(135deg,#f97316,#f5c842)' }}>R</div>
            <div>
              <div className="text-white font-black text-sm leading-tight">Reliance</div>
              <div className="text-blue-200 text-[10px] font-medium leading-tight">by Tajallis</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-white font-bold text-sm">{cat.emoji} {group}</div>
            <div className="text-blue-200 text-[10px]">{cat.label} · {products.length} products</div>
          </div>
        </div>

        {/* Product grid */}
        <div className="p-4 grid grid-cols-3 sm:grid-cols-4 gap-3">
          {shown.map(p => {
            const price  = p.price.cash_floor || p.price.retail
            const plan3m = p.installments?.['3m']
            return (
              <div key={p.id} className="flex flex-col bg-gray-50 rounded-xl overflow-hidden border border-gray-100">
                {/* Image */}
                <div className="w-full aspect-square bg-white p-1">
                  <ProductImageCell p={p} />
                </div>
                {/* Info */}
                <div className="px-2 py-2 flex flex-col gap-0.5">
                  <div className="text-[10px] font-semibold text-gray-500 leading-tight truncate">{p.brand}</div>
                  <div className="text-[11px] font-bold text-gray-900 leading-tight line-clamp-2" style={{ minHeight: '2.4em' }}>
                    {p.simplified_name.replace(p.brand, '').trim()}
                  </div>
                  <div className="text-[12px] font-black text-orange-600 mt-1">
                    PKR {formatPrice(price)}
                  </div>
                  {plan3m && (
                    <div className="text-[9px] text-gray-400">3m: {formatPrice(plan3m.monthly)}/mo</div>
                  )}
                </div>
              </div>
            )
          })}
          {extra > 0 && (
            <div className="flex items-center justify-center bg-gray-100 rounded-xl border border-gray-200 aspect-square">
              <div className="text-center">
                <div className="text-xl font-black text-gray-400">+{extra}</div>
                <div className="text-[10px] text-gray-400">more</div>
              </div>
            </div>
          )}
        </div>

        {/* Flyer footer */}
        <div className="px-5 py-3 flex items-center justify-between"
          style={{ background: '#f8f9fa', borderTop: '2px solid #f97316' }}>
          <div className="text-[10px] text-gray-600">
            <span className="font-bold">📞 0370-2578788</span>
            <span className="mx-2 text-gray-300">·</span>
            0335-4266238
          </div>
          <div className="text-[10px] text-gray-500 text-right">
            <div className="font-semibold">tajallis.com.pk</div>
            <div>Free delivery · Genuine · Installments</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Table view components ──────────────────────────────────────────────────────

function ProductRow({ p }: { p: Product }) {
  const price  = p.price.cash_floor || p.price.retail
  const plan3m = p.installments?.['3m']
  return (
    <tr className="border-b border-gray-100 hover:bg-orange-50/30 transition-colors">
      <td className="py-2.5 px-3">
        <div className="text-sm font-medium text-gray-800 leading-tight">{p.simplified_name}</div>
        <div className="text-xs text-gray-400 mt-0.5">{p.brand} · {p.warranty || 'warranty incl.'}</div>
      </td>
      <td className="py-2.5 px-3 text-sm font-bold text-gray-900 whitespace-nowrap">PKR {formatPrice(price)}</td>
      <td className="py-2.5 px-3 text-sm text-gray-600 whitespace-nowrap">{plan3m ? `PKR ${formatPrice(plan3m.monthly)}/mo` : '—'}</td>
      <td className="py-2.5 px-3 text-xs text-gray-400 whitespace-nowrap">{plan3m ? `Adv: ${formatPrice(plan3m.advance)}` : '—'}</td>
    </tr>
  )
}

function TableGroupSection({ group, products }: { group: string; products: Product[] }) {
  const [expanded, setExpanded] = useState(true)
  return (
    <div className="mb-4">
      <button onClick={() => setExpanded(e => !e)}
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
            <tbody>{products.map(p => <ProductRow key={p.id} p={p} />)}</tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Category panel ─────────────────────────────────────────────────────────────

function CategoryPanel({ cat, products, loading, viewMode }: {
  cat:      CatalogCategory;
  products: Product[] | null;
  loading:  boolean;
  viewMode: 'table' | 'flyer';
}) {
  if (loading) return <div className="flex items-center justify-center py-20"><Spinner /></div>
  if (!products) return null

  const grouped = groupBySpec(products, cat)
  const waText  = buildCategoryWAMessage(cat, grouped)

  return (
    <div>
      {/* Action bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-4 border-b border-gray-100">
        <div>
          <h2 className="text-lg font-black text-gray-900">{cat.emoji} {cat.label}</h2>
          <p className="text-sm text-gray-400">{products.length} products · {grouped.size} groups</p>
        </div>
        {viewMode === 'table' && (
          <div className="flex flex-wrap gap-2">
            <CopyBtn text={waText} label="Copy List" />
            <WABtn text={waText} />
            <button onClick={() => openPrint(cat, grouped)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border border-gray-200 bg-white hover:bg-gray-50 transition-colors">
              <Printer className="w-3.5 h-3.5 text-gray-500" /> Print Table
            </button>
          </div>
        )}
        {viewMode === 'flyer' && (
          <p className="text-xs text-gray-400">Click <strong>Download Image</strong> on any group to save a PNG</p>
        )}
      </div>

      {/* Content */}
      {viewMode === 'table'
        ? [...grouped.entries()].map(([group, prods]) => (
            <TableGroupSection key={group} group={group} products={prods} />
          ))
        : [...grouped.entries()].map(([group, prods]) => (
            <FlyerGroupCard key={group} cat={cat} group={group} products={prods} />
          ))
      }
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function SalesCatalog() {
  const [activeCatId, setActiveCatId] = useState(CATALOG_CATEGORIES[0].id)
  const [viewMode, setViewMode]       = useState<'table' | 'flyer'>('flyer')
  const [cache,  setCache]            = useState<Record<string, Product[]>>({})
  const [loading, setLoading]         = useState(false)
  const [megaCopied, setMegaCopied]   = useState(false)

  const activeCat = CATALOG_CATEGORIES.find(c => c.id === activeCatId)!

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

  useEffect(() => { loadCat(activeCat) }, [activeCatId]) // eslint-disable-line

  const shareMega = async () => {
    const allData = CATALOG_CATEGORIES.filter(c => cache[c.id]).map(c => ({ cat: c, products: cache[c.id] }))
    const text = buildMegaWAMessage(allData)
    await copyText(text)
    setMegaCopied(true)
    setTimeout(() => setMegaCopied(false), 2500)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SEO
        title="Sales Catalogue — Reliance by Tajallis"
        description="Browse and share product catalogues by category for customer consultation."
        path="/catalog"
      />

      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-base font-black text-gray-900 leading-tight">Sales Catalogue</h1>
            <p className="text-xs text-gray-400">Download product flyers or copy price lists for WhatsApp</p>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-1">
              <button onClick={() => setViewMode('flyer')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  viewMode === 'flyer' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}>
                <ImageIcon className="w-3.5 h-3.5" /> Flyer
              </button>
              <button onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  viewMode === 'table' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}>
                <Table2 className="w-3.5 h-3.5" /> Table
              </button>
            </div>
            <button onClick={shareMega}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 bg-white hover:bg-gray-50 transition-colors shrink-0">
              {megaCopied
                ? <><Check className="w-4 h-4 text-green-500" /> Copied!</>
                : <><Share2 className="w-4 h-4 text-gray-500" /> Full Catalogue</>}
            </button>
          </div>
        </div>

        {/* Category tabs */}
        <div className="max-w-6xl mx-auto px-4 flex gap-1 overflow-x-auto scrollbar-hide">
          {CATALOG_CATEGORIES.map(cat => (
            <button key={cat.id} onClick={() => setActiveCatId(cat.id)}
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

      {/* Main */}
      <div className="max-w-6xl mx-auto px-4 py-6">

        {/* Flyer mode tip */}
        {viewMode === 'flyer' && (
          <div className="flex items-start gap-3 bg-orange-50 border border-orange-200 rounded-2xl px-4 py-3 mb-5 text-sm text-orange-800">
            <LayoutGrid className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <strong>Flyer Mode:</strong> Each group below is a branded image card.
              Click <strong>Download Image</strong> to save as PNG — then share directly on WhatsApp, attach in messages, or use in presentations.
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-gray-400">
              {viewMode === 'table'
                ? 'Prices shown are cash floor prices. Click group headers to expand/collapse.'
                : 'Products grouped by size/type. Up to 12 shown per card.'}
            </p>
            <button onClick={() => loadCat(activeCat, true)} disabled={loading}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50">
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>

          <CategoryPanel
            cat={activeCat}
            products={cache[activeCatId] ?? null}
            loading={loading}
            viewMode={viewMode}
          />
        </div>

        {/* How-to cards */}
        <div className="mt-6 grid sm:grid-cols-3 gap-4">
          {[
            {
              icon: <Download className="w-5 h-5 text-orange-500" />,
              title: 'Download Image',
              desc: 'Flyer mode — click "Download Image" on any group. Saves a branded PNG with product photos, prices, and contact details.',
            },
            {
              icon: <MessageCircle className="w-5 h-5 text-green-500" />,
              title: 'Share on WhatsApp',
              desc: 'Switch to Table view → Copy List or WhatsApp button sends a formatted text price list for smaller categories.',
            },
            {
              icon: <Printer className="w-5 h-5 text-blue-500" />,
              title: 'Print to PDF',
              desc: 'Table view → Print Table opens a formatted print window. Use Save as PDF in the browser for a full catalogue PDF.',
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
