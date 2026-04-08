import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { X, ChevronLeft, ChevronRight, Play, Image, MessageCircle } from 'lucide-react'
import { getGallery, CATEGORY_LABELS, type MediaItem, type MediaCategory } from '../lib/gallery'
import SEO from '../components/ui/SEO'
import { waSales } from '../lib/whatsapp'

// ── Tab definitions ───────────────────────────────────────────────────────────

const TABS: { key: MediaCategory | 'all'; emoji: string }[] = [
  { key: 'all',           emoji: '🏠' },
  { key: 'installations', emoji: '❄️' },
  { key: 'maintenance',   emoji: '🔧' },
  { key: 'solar',         emoji: '☀️' },
  { key: 'commercial',    emoji: '🏢' },
  { key: 'team',          emoji: '👷' },
]

// ── Lightbox ──────────────────────────────────────────────────────────────────

function Lightbox({
  items, index, onClose, onPrev, onNext,
}: {
  items: MediaItem[]; index: number
  onClose: () => void; onPrev: () => void; onNext: () => void
}) {
  const item = items[index]
  if (!item) return null

  // keyboard nav
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') onPrev()
      if (e.key === 'ArrowRight') onNext()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, onPrev, onNext])

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center"
      onClick={onClose}
    >
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Counter */}
      <div className="absolute top-5 left-1/2 -translate-x-1/2 text-white/50 text-sm font-medium">
        {index + 1} / {items.length}
      </div>

      {/* Prev */}
      {index > 0 && (
        <button
          onClick={e => { e.stopPropagation(); onPrev() }}
          className="absolute left-3 md:left-6 text-white/70 hover:text-white p-3 rounded-full hover:bg-white/10 transition-colors"
        >
          <ChevronLeft className="w-7 h-7" />
        </button>
      )}

      {/* Media */}
      <div
        className="max-w-5xl w-full max-h-[80vh] flex items-center justify-center px-16"
        onClick={e => e.stopPropagation()}
      >
        {item.media_type === 'video' ? (
          <video
            src={item.public_url}
            controls
            autoPlay
            className="max-w-full max-h-[78vh] rounded-2xl"
          />
        ) : (
          <img
            src={item.public_url}
            alt={item.caption}
            className="max-w-full max-h-[78vh] object-contain rounded-2xl"
          />
        )}
      </div>

      {/* Caption */}
      {item.caption && (
        <p className="absolute bottom-6 text-white/80 text-sm font-medium text-center px-4">
          {item.caption}
        </p>
      )}

      {/* Next */}
      {index < items.length - 1 && (
        <button
          onClick={e => { e.stopPropagation(); onNext() }}
          className="absolute right-3 md:right-6 text-white/70 hover:text-white p-3 rounded-full hover:bg-white/10 transition-colors"
        >
          <ChevronRight className="w-7 h-7" />
        </button>
      )}
    </div>
  )
}

// ── Media card ────────────────────────────────────────────────────────────────

function MediaCard({ item, onClick }: { item: MediaItem; onClick: () => void }) {
  const [loaded, setLoaded] = useState(false)

  return (
    <button
      onClick={onClick}
      className="group relative aspect-square bg-gray-100 rounded-2xl overflow-hidden border border-gray-100 hover:border-orange-300 hover:shadow-lg transition-all text-left w-full"
    >
      {!loaded && (
        <div className="absolute inset-0 bg-gray-100 animate-pulse" />
      )}

      {item.media_type === 'video' ? (
        <>
          {/* Videos: show a dark placeholder with play icon */}
          <div className="w-full h-full bg-gray-900 flex items-center justify-center">
            <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center group-hover:bg-orange-500/80 transition-colors">
              <Play className="w-6 h-6 text-white fill-white ml-1" />
            </div>
          </div>
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-3">
            <span className="text-white text-xs font-medium line-clamp-2">{item.caption}</span>
          </div>
        </>
      ) : (
        <>
          <img
            src={item.public_url}
            alt={item.caption}
            loading="lazy"
            onLoad={() => setLoaded(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
          {item.caption && (
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-white text-xs font-medium line-clamp-2">{item.caption}</span>
            </div>
          )}
        </>
      )}
    </button>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-20 h-20 bg-orange-50 rounded-3xl flex items-center justify-center mb-5">
        <Image className="w-9 h-9 text-orange-400" />
      </div>
      <h3 className="font-bold text-gray-800 mb-2">No photos yet</h3>
      <p className="text-sm text-gray-400 max-w-xs leading-relaxed">
        Drop photos into the <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">media/</code> folder,
        then run <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">node sync-media.mjs</code> to publish them here.
      </p>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Gallery() {
  const [activeTab, setActiveTab] = useState<MediaCategory | 'all'>('all')
  const [items, setItems]         = useState<MediaItem[]>([])
  const [loading, setLoading]     = useState(true)
  const [lightbox, setLightbox]   = useState<number | null>(null)

  useEffect(() => {
    setLoading(true)
    getGallery(activeTab).then(data => {
      setItems(data)
      setLoading(false)
    })
  }, [activeTab])

  const open  = useCallback((i: number) => setLightbox(i), [])
  const close = useCallback(() => setLightbox(null), [])
  const prev  = useCallback(() => setLightbox(i => i !== null && i > 0 ? i - 1 : i), [])
  const next  = useCallback(() => setLightbox(i => i !== null && i < items.length - 1 ? i + 1 : i), [items.length])

  return (
    <div className="min-h-screen bg-white">
      <SEO
        title="Our Work Gallery — Tajalli's Karachi"
        description="Real installations and maintenance jobs by Tajalli's — ACs, refrigerators, solar systems, and more across Karachi homes and businesses."
        keywords="ac installation karachi, home appliance service karachi, solar installation karachi"
      />

      {/* Hero */}
      <div className="bg-gray-900 text-white py-14 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-orange-400 text-xs font-bold uppercase tracking-widest mb-3">Real Work</p>
          <h1 className="text-3xl md:text-5xl font-black mb-4">Our Work Gallery</h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Every photo is a real job. Every customer is a real home. No stock images.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 flex gap-1 overflow-x-auto py-3 scrollbar-hide">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeTab === tab.key
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span>{tab.emoji}</span>
              <span>{CATEGORY_LABELS[tab.key]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-6xl mx-auto px-4 py-10">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-square bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map((item, i) => (
              <MediaCard key={item.id} item={item} onClick={() => open(i)} />
            ))}
          </div>
        )}

        {/* Item count */}
        {!loading && items.length > 0 && (
          <p className="text-center text-gray-400 text-sm mt-8">
            {items.length} {items.length === 1 ? 'item' : 'items'} shown
          </p>
        )}
      </div>

      {/* CTA */}
      <div className="bg-gray-50 border-t border-gray-100 py-14 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-black text-gray-900 mb-3">Like what you see?</h2>
          <p className="text-gray-500 mb-8 max-w-md mx-auto">
            Book a free consultation and we'll handle everything — from choosing the right
            appliance to installing it in your home.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={waSales('Hi, I saw your work gallery and would like a consultation.')}
              target="_blank" rel="noreferrer"
              className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold px-8 py-4 rounded-2xl transition-colors"
            >
              <MessageCircle className="w-5 h-5" /> Book on WhatsApp
            </a>
            <Link to="/products"
              className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-4 rounded-2xl transition-colors">
              Browse Products
            </Link>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox !== null && (
        <Lightbox items={items} index={lightbox} onClose={close} onPrev={prev} onNext={next} />
      )}
    </div>
  )
}
