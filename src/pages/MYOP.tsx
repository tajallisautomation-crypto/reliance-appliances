import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Package, CheckCircle, MessageCircle, Trash2, Tag,
  ChevronDown, ChevronUp, Info, ShoppingBag, Sparkles,
} from 'lucide-react'
import { getProducts, formatPrice, calcPlan, type Product } from '@/lib/api'
import SEO from '@/components/ui/SEO'
import { waSales } from '@/lib/whatsapp'

// ── Constants ────────────────────────────────────────────────────────────────

const DISCOUNT_THRESHOLD = 3
const DISCOUNT_PCT       = 0.05   // 5%

// Categories available in the package builder
const TABS = [
  { id: 'ac',      label: 'Air Conditioners', icon: '❄️' },
  { id: 'fridge',  label: 'Refrigerators',    icon: '🧊' },
  { id: 'washing', label: 'Washing Machines', icon: '👕' },
  { id: 'tv',      label: 'Televisions',      icon: '📺' },
  { id: 'solar',   label: 'Solar',            icon: '☀️' },
  { id: 'kitchen', label: 'Kitchen',          icon: '🍳' },
  { id: 'small',   label: 'Small Appliances', icon: '🔌' },
]

// ── Types ────────────────────────────────────────────────────────────────────

interface PackageItem {
  product: Product
  qty:     number
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildWAMessage(items: PackageItem[], subtotal: number, discount: number, total: number): string {
  const lines: string[] = [
    '*My Custom Package — Reliance by Tajallis* 📦',
    '',
    ...items.map((item, i) => {
      const name = item.product.simplified_name || item.product.model
      const price = item.product.price.cash_floor
      return `${i + 1}. *${item.product.brand} ${name}*${item.qty > 1 ? ` ×${item.qty}` : ''} — PKR ${formatPrice(price * item.qty)}`
    }),
    '',
    `Subtotal: PKR ${formatPrice(subtotal)}`,
  ]
  if (discount > 0) {
    lines.push(`5% Package Discount: −PKR ${formatPrice(discount)}`)
    lines.push(`*Total: PKR ${formatPrice(total)}*`)
  } else {
    lines.push(`*Total: PKR ${formatPrice(total)}*`)
    lines.push(`_(Add ${DISCOUNT_THRESHOLD - items.length} more item${DISCOUNT_THRESHOLD - items.length === 1 ? '' : 's'} to unlock 5% discount)_`)
  }
  lines.push('')
  lines.push('Please confirm availability and share installment options. JazakAllah.')
  return lines.join('\n')
}

// ── Sub-components ───────────────────────────────────────────────────────────

function ProductTile({
  product,
  selected,
  onAdd,
  onRemove,
}: {
  product:  Product
  selected: boolean
  onAdd:    () => void
  onRemove: () => void
}) {
  return (
    <div className={`relative bg-white rounded-2xl border-2 transition-all overflow-hidden group ${
      selected ? 'border-orange-400 shadow-lg shadow-orange-50' : 'border-gray-100 hover:border-orange-200 hover:shadow-md'
    }`}>
      {selected && (
        <div className="absolute top-2 right-2 z-10">
          <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center shadow">
            <CheckCircle className="w-4 h-4 text-white" />
          </div>
        </div>
      )}
      <div className="aspect-square bg-gray-50 overflow-hidden">
        {product.thumbnail ? (
          <img
            src={product.thumbnail}
            alt={product.simplified_name || product.model}
            className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-200"
            onError={e => { (e.currentTarget as HTMLImageElement).src = '/placeholder-product.svg' }}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl">📦</div>
        )}
      </div>
      <div className="p-3">
        <p className="text-xs font-semibold text-orange-500 mb-0.5">{product.brand}</p>
        <p className="text-sm font-bold text-gray-900 leading-tight line-clamp-2 mb-2">
          {product.simplified_name || product.model}
        </p>
        <p className="text-base font-black text-gray-900 mb-3">
          PKR {formatPrice(product.price.cash_floor)}
        </p>
        {selected ? (
          <button
            onClick={onRemove}
            className="w-full py-2 rounded-xl text-sm font-bold border-2 border-red-200 text-red-500 hover:bg-red-50 transition-colors flex items-center justify-center gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" /> Remove
          </button>
        ) : (
          <button
            onClick={onAdd}
            className="w-full py-2 rounded-xl text-sm font-bold bg-gray-900 hover:bg-orange-500 text-white transition-colors"
          >
            + Add to Package
          </button>
        )}
      </div>
    </div>
  )
}

function PackageSummary({
  items,
  onRemove,
  onQtyChange,
  onSubmit,
}: {
  items:       PackageItem[]
  onRemove:    (id: string) => void
  onQtyChange: (id: string, qty: number) => void
  onSubmit:    () => void
}) {
  const [expanded, setExpanded] = useState(true)
  const totalItems  = items.reduce((n, i) => n + i.qty, 0)
  const subtotal    = items.reduce((n, i) => n + i.product.price.cash_floor * i.qty, 0)
  const qualifies   = totalItems >= DISCOUNT_THRESHOLD
  const discount    = qualifies ? Math.round(subtotal * DISCOUNT_PCT) : 0
  const total       = subtotal - discount
  const plan3m      = total > 0 ? calcPlan(total, '3m') : null

  const waMsg = buildWAMessage(items, subtotal, discount, total)

  return (
    <div className="bg-white rounded-3xl border-2 border-gray-100 shadow-xl overflow-hidden sticky top-20">
      {/* Header */}
      <div className="bg-gray-900 px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-white" />
          <span className="font-black text-white">Your Package</span>
          {totalItems > 0 && (
            <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {totalItems}
            </span>
          )}
        </div>
        <button onClick={() => setExpanded(v => !v)} className="text-gray-400 hover:text-white transition-colors">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Discount progress */}
      {totalItems < DISCOUNT_THRESHOLD && (
        <div className="px-5 py-3 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
          <Tag className="w-4 h-4 text-amber-500 shrink-0" />
          <p className="text-xs text-amber-800">
            Add <strong>{DISCOUNT_THRESHOLD - totalItems} more item{DISCOUNT_THRESHOLD - totalItems === 1 ? '' : 's'}</strong> to unlock <strong>5% discount</strong>
          </p>
        </div>
      )}
      {qualifies && (
        <div className="px-5 py-3 bg-green-50 border-b border-green-100 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-green-500 shrink-0" />
          <p className="text-xs text-green-800 font-semibold">5% package discount applied! 🎉</p>
        </div>
      )}

      {expanded && (
        <div className="px-5 py-4 max-h-64 overflow-y-auto space-y-3">
          {items.length === 0 ? (
            <div className="text-center py-6">
              <Package className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No items added yet</p>
              <p className="text-xs text-gray-400 mt-1">Browse products and add to your package</p>
            </div>
          ) : items.map(item => (
            <div key={item.product.id} className="flex items-start gap-3">
              <img
                src={item.product.thumbnail || '/placeholder-product.svg'}
                alt={item.product.simplified_name || item.product.model}
                className="w-12 h-12 rounded-xl object-contain bg-gray-50 border border-gray-100 shrink-0"
                onError={e => { (e.currentTarget as HTMLImageElement).src = '/placeholder-product.svg' }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-orange-500 font-semibold">{item.product.brand}</p>
                <p className="text-xs font-bold text-gray-900 leading-tight truncate">
                  {item.product.simplified_name || item.product.model}
                </p>
                <div className="flex items-center justify-between mt-1">
                  <div className="flex items-center gap-1 border border-gray-200 rounded-lg">
                    <button
                      onClick={() => onQtyChange(item.product.id, item.qty - 1)}
                      className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-700 text-xs font-bold"
                    >−</button>
                    <span className="text-xs font-bold text-gray-700 w-5 text-center">{item.qty}</span>
                    <button
                      onClick={() => onQtyChange(item.product.id, item.qty + 1)}
                      className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-700 text-xs font-bold"
                    >+</button>
                  </div>
                  <p className="text-xs font-black text-gray-900">
                    PKR {formatPrice(item.product.price.cash_floor * item.qty)}
                  </p>
                </div>
              </div>
              <button onClick={() => onRemove(item.product.id)} className="text-gray-300 hover:text-red-500 transition-colors mt-1">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Totals */}
      {items.length > 0 && (
        <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-2">
          <div className="flex justify-between text-sm text-gray-500">
            <span>Subtotal</span>
            <span>PKR {formatPrice(subtotal)}</span>
          </div>
          {qualifies && (
            <div className="flex justify-between text-sm text-green-600 font-semibold">
              <span>5% Discount</span>
              <span>− PKR {formatPrice(discount)}</span>
            </div>
          )}
          <div className="flex justify-between font-black text-gray-900 text-base border-t border-gray-100 pt-2">
            <span>Total</span>
            <span>PKR {formatPrice(total)}</span>
          </div>
          {plan3m && (
            <p className="text-xs text-gray-400 text-right">
              or PKR {formatPrice(plan3m.advance)} advance + PKR {formatPrice(plan3m.monthly)}/mo × 2
            </p>
          )}

          <button
            onClick={onSubmit}
            disabled={items.length === 0}
            className="w-full mt-3 py-3.5 rounded-2xl font-black text-white bg-wa hover:bg-wa-hover transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <MessageCircle className="w-4 h-4" /> Get This Package on WhatsApp
          </button>
          <p className="text-xs text-gray-400 text-center">
            We'll confirm availability and payment options within 1 hour.
          </p>

          {/* Hidden WA anchor — triggered by onSubmit */}
          <a id="myop-wa-link" href={waSales(waMsg)} target="_blank" rel="noreferrer" className="hidden" />
        </div>
      )}
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function MYOPPage() {
  const [activeTab,  setActiveTab]  = useState(TABS[0].id)
  const [products,   setProducts]   = useState<Product[]>([])
  const [loading,    setLoading]    = useState(false)
  const [selected,   setSelected]   = useState<PackageItem[]>([])

  // Fetch products for the active tab
  const fetchTab = useCallback(async (tabId: string) => {
    setLoading(true)
    setProducts([])
    try {
      const { products } = await getProducts({ category: tabId, sort: 'price_asc' })
      setProducts(products)
    } catch { /* silent — show empty state */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchTab(activeTab) }, [activeTab, fetchTab])

  const isSelected = (id: string) => selected.some(i => i.product.id === id)

  const addItem = (product: Product) => {
    setSelected(prev => {
      const existing = prev.find(i => i.product.id === product.id)
      if (existing) return prev.map(i => i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i)
      return [...prev, { product, qty: 1 }]
    })
  }

  const removeItem = (id: string) => setSelected(prev => prev.filter(i => i.product.id !== id))

  const changeQty = (id: string, qty: number) => {
    if (qty < 1) { removeItem(id); return }
    setSelected(prev => prev.map(i => i.product.id === id ? { ...i, qty } : i))
  }

  const handleSubmit = () => {
    document.getElementById('myop-wa-link')?.click()
  }

  const totalItems = selected.reduce((n, i) => n + i.qty, 0)
  const qualifies  = totalItems >= DISCOUNT_THRESHOLD

  return (
    <div className="min-h-screen bg-gray-50">
      <SEO
        title="Build Your Own Package — Reliance by Tajallis"
        description="Mix and match appliances and solar products. Get 5% off when you pick 3 or more products. Easy installments available."
        keywords="home appliance package karachi, bundle deals appliances pakistan, custom appliance package"
      />

      {/* Hero */}
      <div className="bg-gray-900 text-white py-14 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-orange-500/20 text-orange-400 px-4 py-1.5 rounded-full text-sm font-semibold mb-5">
            <Sparkles className="w-4 h-4" /> Make Your Own Package
          </div>
          <h1 className="text-3xl md:text-5xl font-black mb-4 leading-tight">
            Build Your Perfect<br />Home Package
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-6">
            Pick any appliances or solar products you need — mix and match across categories.
            Add <strong className="text-orange-400">3 or more items</strong> and get <strong className="text-orange-400">5% off</strong> your entire order.
          </p>

          {/* Discount badge */}
          <div className="inline-flex items-center gap-3 bg-white/10 border border-white/20 rounded-2xl px-6 py-3">
            <Tag className="w-5 h-5 text-orange-400" />
            <div className="text-left">
              <p className="text-white font-bold text-sm">5% Bundle Discount</p>
              <p className="text-gray-400 text-xs">Automatically applied when you pick 3+ products</p>
            </div>
          </div>
        </div>
      </div>

      {/* How it works strip */}
      <div className="bg-white border-b border-gray-100 py-5 px-4">
        <div className="max-w-4xl mx-auto grid grid-cols-3 gap-4 text-center">
          {[
            { step: '01', text: 'Browse & add products from any category' },
            { step: '02', text: 'Add 3+ items to unlock your 5% discount' },
            { step: '03', text: 'WhatsApp us — we confirm and deliver' },
          ].map(s => (
            <div key={s.step} className="flex flex-col items-center gap-1">
              <span className="text-xs font-black text-orange-500">{s.step}</span>
              <p className="text-xs text-gray-600 leading-snug">{s.text}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-6">

          {/* ── Left: Category tabs + product grid ── */}
          <div className="flex-1 min-w-0">

            {/* Category tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-6 no-scrollbar">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 whitespace-nowrap px-4 py-2.5 rounded-xl text-sm font-bold border-2 transition-all shrink-0 ${
                    activeTab === tab.id
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                  }`}
                >
                  <span>{tab.icon}</span> {tab.label}
                </button>
              ))}
            </div>

            {/* Products grid */}
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
                    <div className="aspect-square bg-gray-100" />
                    <div className="p-3 space-y-2">
                      <div className="h-3 bg-gray-100 rounded w-1/2" />
                      <div className="h-4 bg-gray-100 rounded w-3/4" />
                      <div className="h-4 bg-gray-100 rounded w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
                <p className="text-4xl mb-3">📦</p>
                <p className="text-gray-500 font-medium">No products found in this category</p>
                <Link to="/products" className="text-orange-500 text-sm hover:underline mt-2 inline-block">
                  Browse all products →
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {products.map(product => (
                  <ProductTile
                    key={product.id}
                    product={product}
                    selected={isSelected(product.id)}
                    onAdd={() => addItem(product)}
                    onRemove={() => removeItem(product.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── Right: Package summary (desktop sticky) ── */}
          <div className="lg:w-80 shrink-0">
            <PackageSummary
              items={selected}
              onRemove={removeItem}
              onQtyChange={changeQty}
              onSubmit={handleSubmit}
            />

            {/* Info box */}
            <div className="mt-4 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 flex gap-2">
              <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700 leading-relaxed">
                Prices shown are cash prices. Installment plans are available on all package totals — ask us on WhatsApp.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile floating bar */}
      {selected.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white border-t border-gray-200 px-4 py-3 flex items-center gap-3 shadow-apple-xl">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 leading-none mb-0.5">
              {totalItems} item{totalItems !== 1 ? 's' : ''} selected
              {qualifies && <span className="text-green-600 font-semibold ml-1">· 5% off</span>}
            </p>
            <p className="font-black text-gray-900 text-base leading-none">
              PKR {formatPrice(
                selected.reduce((n, i) => n + i.product.price.cash_floor * i.qty, 0) * (qualifies ? (1 - DISCOUNT_PCT) : 1)
              )}
            </p>
          </div>
          <button
            onClick={handleSubmit}
            className="bg-wa hover:bg-wa-hover text-white font-bold px-5 py-3 rounded-xl flex items-center gap-2 text-sm whitespace-nowrap transition-colors"
          >
            <MessageCircle className="w-4 h-4" /> Get Package
          </button>
        </div>
      )}
      {/* Bottom padding for mobile bar */}
      {selected.length > 0 && <div className="h-20 lg:hidden" />}
    </div>
  )
}
