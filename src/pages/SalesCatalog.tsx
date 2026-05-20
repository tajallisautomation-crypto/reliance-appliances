import { useState, useEffect, useCallback, useRef } from 'react'
import { Copy, MessageCircle, Printer, Check, RefreshCw, Share2, Download, Table2, ImageIcon } from 'lucide-react'
import SEO from '@/components/ui/SEO'
import Spinner from '@/components/ui/Spinner'
import { getProducts, formatPrice } from '@/lib/api'
import type { Product } from '@/lib/api'
import {
  CATALOG_CATEGORIES,
  groupBySpec,
  getKeySpecs,
  buildCategoryWAMessage,
  buildMegaWAMessage,
  buildPrintHTML,
  type CatalogCategory,
} from '@/lib/salesCatalog'
import { wa } from '@/lib/whatsapp'
import { WA_SALES } from '@/lib/config'

// ── Helpers ────────────────────────────────────────────────────────────────────

const MAX_WA_CHARS = 1800

async function copyText(text: string) { await navigator.clipboard.writeText(text) }

function openPrint(cat: CatalogCategory, grouped: Map<string, Product[]>) {
  const html = buildPrintHTML(cat, grouped)
  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(html)
  w.document.close()
  w.focus()
  setTimeout(() => w.print(), 400)
}

async function downloadEl(el: HTMLElement, filename: string) {
  const html2canvas = (await import('html2canvas')).default
  const canvas = await html2canvas(el, { useCORS: true, allowTaint: true, scale: 2, backgroundColor: '#ffffff', logging: false })
  const a = document.createElement('a')
  a.download = `${filename}.png`
  a.href = canvas.toDataURL('image/png')
  a.click()
}

// ── Shared UI ──────────────────────────────────────────────────────────────────

function CopyBtn({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false)
  return (
    <button onClick={async () => { await copyText(text); setDone(true); setTimeout(() => setDone(false), 2200) }}
      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border border-gray-200 bg-white hover:bg-gray-50 transition-colors">
      {done ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-gray-500" />}
      {done ? 'Copied!' : label}
    </button>
  )
}

function WABtn({ text }: { text: string }) {
  if (encodeURIComponent(text).length <= MAX_WA_CHARS)
    return (
      <a href={wa(WA_SALES, text)} target="_blank" rel="noreferrer"
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-white hover:opacity-90 bg-wa hover:bg-wa-hover transition-colors">
        <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
      </a>
    )
  return <CopyBtn text={text} label="Copy for WhatsApp" />
}

// ── Brand fallback colours ─────────────────────────────────────────────────────

const BRAND_COLORS: Record<string, string> = {
  haier:'#e31837', dawlance:'#003087', gree:'#00843d',
  ecostar:'#0070c0', crown:'#1a1a2e', westpoint:'#2563eb',
}
function brandColor(b: string) { return BRAND_COLORS[b.toLowerCase()] || '#374151' }

function ProductThumb({ p }: { p: Product }) {
  const [err, setErr] = useState(false)
  if (p.thumbnail && !err)
    return <img src={p.thumbnail} alt={p.brand} crossOrigin="anonymous" onError={() => setErr(true)} className="w-full h-full object-contain" />
  return (
    <div className="w-full h-full flex items-center justify-center text-white font-black text-lg rounded"
      style={{ background: brandColor(p.brand) }}>{p.brand.charAt(0)}</div>
  )
}

// ── Flyer card per group ───────────────────────────────────────────────────────

function FlyerGroupCard({ cat, group, products }: { cat: CatalogCategory; group: string; products: Product[] }) {
  const cardRef    = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState(false)
  const shown = products.slice(0, 16)
  const extra = products.length - shown.length

  const download = async () => {
    if (!cardRef.current) return
    setBusy(true)
    try {
      const slug = `${cat.id}-${group.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`
      await downloadEl(cardRef.current, `tajallis-${slug}`)
    } finally { setBusy(false) }
  }

  return (
    <div className="mb-8">
      {/* Action row */}
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-sm font-bold text-gray-700">
          {group} <span className="text-gray-400 font-normal">({products.length})</span>
        </span>
        <button onClick={download} disabled={busy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-brand-500 hover:bg-brand-600 text-white disabled:opacity-60 transition-colors">
          {busy ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          {busy ? 'Saving…' : 'Download Image'}
        </button>
      </div>

      {/* Branded flyer card — captured by html2canvas */}
      <div ref={cardRef} className="bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm"
        style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3"
          style={{ background: 'linear-gradient(135deg,#0F2D52 0%,#3A6B9E 100%)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-black text-sm shrink-0"
              style={{ background: 'linear-gradient(135deg,#0F2D52,#FFC107)' }}>R</div>
            <div>
              <div className="text-white font-black text-sm leading-tight">Tajalli's</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-white font-bold text-sm">{cat.emoji} {group}</div>
            <div className="text-blue-200 text-[10px]">{cat.label} · {products.length} models</div>
          </div>
        </div>

        {/* Product grid */}
        <div className="p-3 grid grid-cols-4 gap-2">
          {shown.map(p => {
            const price  = p.price.cash_floor || p.price.retail
            const plan3m = p.installments?.['3m']
            const specs  = getKeySpecs(p, cat.id).slice(0, 2)
            return (
              <div key={p.id} className="flex flex-col bg-gray-50 rounded-xl overflow-hidden border border-gray-100">
                {/* Image */}
                <div className="w-full aspect-square bg-white p-1 relative">
                  <ProductThumb p={p} />
                  {/* Brand badge */}
                  <div className="absolute bottom-0 left-0 right-0 text-center py-0.5 text-[8px] font-bold text-white"
                    style={{ background: brandColor(p.brand) }}>{p.brand}</div>
                </div>
                {/* Info */}
                <div className="px-1.5 py-1.5 flex flex-col gap-0.5 flex-1">
                  <div className="text-[9px] font-bold text-gray-500 font-mono leading-tight">{p.model}</div>
                  <div className="text-[10px] font-bold text-gray-900 leading-tight line-clamp-2 flex-1"
                    style={{ minHeight: '2.6em' }}>
                    {p.simplified_name.replace(new RegExp(p.brand, 'i'), '').replace(p.model, '').trim()}
                  </div>
                  {specs.length > 0 && (
                    <div className="flex flex-wrap gap-0.5 mt-0.5">
                      {specs.map(s => (
                        <span key={s} className="text-[8px] bg-blue-50 text-blue-700 px-1 py-0.5 rounded font-medium leading-tight">{s}</span>
                      ))}
                    </div>
                  )}
                  <div className="text-[11px] font-black text-brand-600 mt-1">PKR {formatPrice(price)}</div>
                  {plan3m && (
                    <div className="text-[8px] text-gray-400">3m: {formatPrice(plan3m.monthly)}/mo</div>
                  )}
                  {p.warranty && (
                    <div className="text-[8px] text-green-700 font-medium leading-tight mt-0.5">🛡 {p.warranty}</div>
                  )}
                </div>
              </div>
            )
          })}
          {extra > 0 && (
            <div className="flex items-center justify-center bg-gray-100 rounded-xl border border-dashed border-gray-300 aspect-square">
              <div className="text-center">
                <div className="text-xl font-black text-gray-400">+{extra}</div>
                <div className="text-[10px] text-gray-400 font-medium">more models</div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 flex items-center justify-between"
          style={{ background: '#f8f9fa', borderTop: '2px solid #0F2D52' }}>
          <div className="text-[10px] text-gray-600">
            <span className="font-bold text-brand-600">📞 0370-2578788</span>
            <span className="mx-2 text-gray-300">·</span>sales@tajallis.com.pk
          </div>
          <div className="text-[10px] text-gray-500 text-right leading-tight">
            <div className="font-semibold">tajallis.com.pk</div>
            <div>Free delivery · Genuine · Easy installments</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Table view ─────────────────────────────────────────────────────────────────

function TableRow({ p, catId }: { p: Product; catId: string }) {
  const price  = p.price.cash_floor || p.price.retail
  const plan3m = p.installments?.['3m']
  const specs  = getKeySpecs(p, catId)

  return (
    <tr className="border-b border-gray-100 hover:bg-brand-50/30 transition-colors">
      <td className="py-2 px-3 text-xs font-bold text-gray-500 font-mono whitespace-nowrap">{p.model}</td>
      <td className="py-2 px-3">
        <div className="text-sm font-semibold text-gray-800 leading-tight">{p.simplified_name}</div>
        <div className="text-xs text-gray-400 mt-0.5">{p.brand}</div>
      </td>
      <td className="py-2 px-3">
        <div className="flex flex-wrap gap-1">
          {specs.map(s => (
            <span key={s} className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium">{s}</span>
          ))}
        </div>
      </td>
      <td className="py-2 px-3 text-sm font-bold text-gray-900 whitespace-nowrap">PKR {formatPrice(price)}</td>
      <td className="py-2 px-3 text-sm text-gray-600 whitespace-nowrap">{plan3m ? `PKR ${formatPrice(plan3m.monthly)}/mo` : '—'}</td>
      <td className="py-2 px-3 text-xs text-green-700 whitespace-nowrap">{p.warranty || '—'}</td>
    </tr>
  )
}

function TableGroup({ group, products, catId }: { group: string; products: Product[]; catId: string }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="mb-3">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition-colors text-left">
        <span className="text-sm font-bold text-gray-800">{group}</span>
        <span className="text-xs text-gray-400">{products.length} models</span>
      </button>
      {open && (
        <div className="mt-1 border border-gray-100 rounded-xl overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="bg-gray-800 text-white text-xs">
                <th className="py-2 px-3 text-left font-semibold">Model</th>
                <th className="py-2 px-3 text-left font-semibold">Description</th>
                <th className="py-2 px-3 text-left font-semibold">Key Specs</th>
                <th className="py-2 px-3 text-left font-semibold">Cash Price</th>
                <th className="py-2 px-3 text-left font-semibold">3m Monthly</th>
                <th className="py-2 px-3 text-left font-semibold">Warranty</th>
              </tr>
            </thead>
            <tbody>{products.map(p => <TableRow key={p.id} p={p} catId={catId} />)}</tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Category panel ─────────────────────────────────────────────────────────────

function CategoryPanel({ cat, products, loading, viewMode }: {
  cat: CatalogCategory; products: Product[] | null; loading: boolean; viewMode: 'table' | 'flyer';
}) {
  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>
  if (!products) return null

  const grouped = groupBySpec(products, cat)
  const waText  = buildCategoryWAMessage(cat, grouped)
  const total   = products.length

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-4 border-b border-gray-100">
        <div>
          <h2 className="text-lg font-black text-gray-900">{cat.emoji} {cat.label}</h2>
          <p className="text-sm text-gray-400">{total} models across {grouped.size} groups</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <CopyBtn text={waText} label="Copy List" />
          <WABtn text={waText} />
          <button onClick={() => openPrint(cat, grouped)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border border-gray-200 bg-white hover:bg-gray-50">
            <Printer className="w-3.5 h-3.5 text-gray-500" /> Print
          </button>
        </div>
      </div>

      {/* Groups */}
      {viewMode === 'flyer'
        ? [...grouped.entries()].map(([g, ps]) => (
            <FlyerGroupCard key={g} cat={cat} group={g} products={ps} />
          ))
        : [...grouped.entries()].map(([g, ps]) => (
            <TableGroup key={g} group={g} products={ps} catId={cat.id} />
          ))
      }
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function SalesCatalog() {
  const [activeCatId, setActiveCatId] = useState(CATALOG_CATEGORIES[0].id)
  const [viewMode,    setViewMode]    = useState<'table' | 'flyer'>('flyer')
  const [cache,       setCache]       = useState<Record<string, Product[]>>({})
  const [loading,     setLoading]     = useState(false)
  const [loadError,   setLoadError]   = useState('')
  const [megaCopied,  setMegaCopied]  = useState(false)

  const activeCat = CATALOG_CATEGORIES.find(c => c.id === activeCatId)!

  const loadCat = useCallback(async (cat: CatalogCategory, force = false) => {
    if (!force && cache[cat.id] !== undefined) return
    setLoading(true)
    setLoadError('')
    try {
      // admin:true fetches ALL products including those without images / prices
      const { products } = await getProducts({ category: cat.catParam, sort: 'name_asc', admin: 'true' })
      setCache(prev => ({ ...prev, [cat.id]: products }))
    } catch (e: any) {
      setLoadError(e?.message || 'Failed to load products.')
    } finally { setLoading(false) }
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
      <SEO title="Sales Catalogue — Tajalli's" description="Internal sales tool." path="/catalog" />

      {/* Sticky header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-base font-black text-gray-900 leading-tight">Sales Catalogue</h1>
            <p className="text-xs text-gray-400">Download flyers · copy price lists · print tables for customer consultations</p>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-0.5">
              <button onClick={() => setViewMode('flyer')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  viewMode === 'flyer' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                <ImageIcon className="w-3.5 h-3.5" /> Flyer
              </button>
              <button onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  viewMode === 'table' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                <Table2 className="w-3.5 h-3.5" /> Table
              </button>
            </div>
            <button onClick={shareMega}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border border-gray-200 bg-white hover:bg-gray-50 transition-colors">
              {megaCopied ? <><Check className="w-4 h-4 text-green-500" /> Copied!</> : <><Share2 className="w-4 h-4 text-gray-500" /> Full Catalogue</>}
            </button>
          </div>
        </div>

        {/* Category tabs */}
        <div className="max-w-6xl mx-auto px-4 flex gap-0.5 overflow-x-auto scrollbar-hide">
          {CATALOG_CATEGORIES.map(cat => (
            <button key={cat.id} onClick={() => setActiveCatId(cat.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                cat.id === activeCatId ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
              {cat.emoji} {cat.label}
              {cache[cat.id] !== undefined && (
                <span className="text-xs font-normal text-gray-400">({cache[cat.id].length})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-gray-400">
              {viewMode === 'flyer'
                ? 'Click "Download Image" on any group to save a branded PNG ready to share on WhatsApp.'
                : 'Model numbers, specs and warranty shown for each product. Use "Copy List" to share via WhatsApp.'}
            </p>
            <button onClick={() => loadCat(activeCat, true)} disabled={loading}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 disabled:opacity-50">
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
          {loadError && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <span className="text-3xl">⚠️</span>
              <p className="text-sm font-semibold text-red-600">{loadError}</p>
              <button onClick={() => loadCat(activeCat, true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-brand-500 text-white hover:bg-brand-600 transition-colors">
                <RefreshCw className="w-3.5 h-3.5" /> Try Again
              </button>
            </div>
          )}
          {!loadError && <CategoryPanel cat={activeCat} products={cache[activeCatId] ?? null} loading={loading} viewMode={viewMode} />}
        </div>
      </div>
    </div>
  )
}
