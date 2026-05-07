import { useEffect, useState, startTransition, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  ArrowLeft, ShoppingCart, MessageCircle, Shield, Truck, Award,
  Check, Wrench, Share2, Star, Phone, CalendarDays,
  TrendingDown, TrendingUp, History, Info, ZoomIn, X, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { getProductBySlug, getRelatedProducts, getAlternativeProducts, getPriceHistory, formatPrice, DEFAULT_CATEGORIES, isTrueT3 } from '@/lib/api';
import type { Product } from '@/lib/types';
import ProductCard from '@/components/products/ProductCard';
import ReviewSection from '@/components/products/ReviewSection';
import CompareButton from '@/components/CompareButton';
import SEO from '@/components/ui/SEO';
import Spinner from '@/components/ui/Spinner';
import SolarCompatibilityPanel from '@/components/products/SolarCompatibilityPanel';
import { useCartStore } from '@/store/cartStore';
import { useSettingsStore } from '@/store/settingsStore';
import { requiresInstallation } from '@/lib/services';
import { waProduct, waInstallment, waSales } from '@/lib/whatsapp';
import toast from 'react-hot-toast';

const PLAN_LABELS: Record<string, string> = {
  cash: 'Pay in Full', '2m': '2 Payments', '3m': '3 Payments', '6m': '6 Payments', '12m': '12 Payments',
};

/**
 * Price threshold above which consultation flow replaces add-to-cart — overridable via admin Settings.
 * Governance rule (2026-04-03): only products > PKR 1,000,000 require site consultation.
 * Must match SETTING_DEFAULTS.consultationThreshold in settingsStore.ts.
 */
const CONSULTATION_THRESHOLD_DEFAULT = 1_000_000;

type TabKey = 'specs' | 'about' | 'installation' | 'reviews' | 'price-history';

const INSTALL_SERVICES = [
  { title: 'Professional Installation', desc: 'Trained technician arrives same day in Karachi.' },
  { title: 'Site Inspection',           desc: 'Free assessment before any large-system install.' },
  { title: 'Post-Install Check',        desc: '48-hour follow-up to ensure everything runs perfectly.' },
  { title: 'Annual Maintenance',        desc: 'Optional AMC available at time of purchase.' },
];

export default function ProductDetail() {
  const { slug }    = useParams<{ slug: string }>();
  const navigate    = useNavigate();

  const [product,    setProduct]    = useState<Product | null>(null);
  const [related,           setRelated]           = useState<Product[]>([]);
  const [relatedLoading,    setRelatedLoading]    = useState(true);
  const [alternatives,      setAlternatives]      = useState<Product[]>([]);
  const [altLoading,        setAltLoading]        = useState(true);
  const [loading,    setLoading]    = useState(true);
  const [plan,       setPlan]       = useState<'cash'|'2m'|'3m'|'6m'|'12m'>('cash');
  const [customAdvance, setCustomAdvance] = useState<number | null>(null);
  const [withInstall, setWithInstall] = useState(false);
  const [activeImg,  setActiveImg]  = useState(0);
  const [activeTab,  setActiveTab]  = useState<TabKey>('specs');
  const [priceHistory, setPriceHistory] = useState<{ retail_price: number; imported_at: string }[]>([]);
  const [priceHistoryLoading, setPriceHistoryLoading] = useState(true);
  const [lightbox, setLightbox] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ dragging: boolean; startX: number; startY: number; panX: number; panY: number }>({ dragging: false, startX: 0, startY: 0, panX: 0, panY: 0 });

  const addItem         = useCartStore(s => s.addItem);
  const setSelectedPlan = useCartStore(s => s.setSelectedPlan);
  const consultationThreshold = useSettingsStore(s => s.consultationThreshold) ?? CONSULTATION_THRESHOLD_DEFAULT;

  useEffect(() => {
    if (!slug) { navigate('/products'); return; }
    // Reset plan selection so the new product doesn't inherit a plan key it may not have
    setPlan('cash');
    setCustomAdvance(null);
    setLoading(true);
    getProductBySlug(slug)
      .then(p => {
        if (!p) { navigate('/products', { replace: true }); return; }
        startTransition(() => { setProduct(p); setLoading(false); });
        getRelatedProducts(p.id, p.category, 4)
          .then(r => startTransition(() => { setRelated(r); setRelatedLoading(false); }))
          .catch(() => setRelatedLoading(false));
        getAlternativeProducts(p.id, p.category, p.price.cash_floor, 4)
          .then(a => startTransition(() => { setAlternatives(a); setAltLoading(false); }))
          .catch(() => setAltLoading(false));
        getPriceHistory(p.id)
          .then(ph => startTransition(() => { setPriceHistory(ph); setPriceHistoryLoading(false); }))
          .catch(() => setPriceHistoryLoading(false));
      })
      .catch(() => navigate('/products', { replace: true }));
  }, [slug, navigate]);

  // allImages + lightbox hooks must be declared BEFORE early returns (Rules of Hooks)
  const allImages = product ? [product.thumbnail, ...product.gallery].filter(Boolean) : [];

  const openLightbox = useCallback((idx: number) => { setActiveImg(idx); setZoom(1); setPan({ x: 0, y: 0 }); setLightbox(true); }, []);
  const closeLightbox = useCallback(() => { setLightbox(false); setZoom(1); setPan({ x: 0, y: 0 }); }, []);
  const lbPrev = useCallback(() => { setActiveImg(i => (i - 1 + allImages.length) % allImages.length); setZoom(1); setPan({ x: 0, y: 0 }); }, [allImages.length]);
  const lbNext = useCallback(() => { setActiveImg(i => (i + 1) % allImages.length); setZoom(1); setPan({ x: 0, y: 0 }); }, [allImages.length]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(z => Math.min(5, Math.max(1, z - e.deltaY * 0.002)));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (zoom <= 1) return;
    dragRef.current = { dragging: true, startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
  }, [zoom, pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragRef.current.dragging) return;
    setPan({ x: dragRef.current.panX + e.clientX - dragRef.current.startX, y: dragRef.current.panY + e.clientY - dragRef.current.startY });
  }, []);

  const handleMouseUp = useCallback(() => { dragRef.current.dragging = false; }, []);

  if (loading) return <Spinner />;
  if (!product) return null;

  const p = product;
  const INSTALL    = 2000;
  const planData   = plan !== 'cash' ? p.installments[plan] : null;

  // Custom advance: clamped between planData.advance (floor) and planData.total (max)
  const effectiveAdvance = planData
    ? Math.min(planData.total, Math.max(planData.advance, customAdvance ?? planData.advance))
    : 0;
  const customMonthly = planData && planData.monthlyPayments > 0
    ? Math.ceil((planData.total - effectiveAdvance) / planData.monthlyPayments / 100) * 100
    : 0;
  const isHighTicket = p.price.cash_floor >= consultationThreshold;

  const handleAdd = () => {
    addItem(p);
    setSelectedPlan(plan);
    toast.success(`${p.brand} ${p.model} added to cart!`);
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/products/${p.slug}`;
    try { await navigator.share({ title: `${p.brand} ${p.model}`, url }); }
    catch { await navigator.clipboard.writeText(url); toast.success('Link copied!'); }
  };

  const specEntries = Object.entries(p.specs || {}).filter(([, v]) => v);
  const tags        = (p.tags || '').split(',').map(t => t.trim()).filter(Boolean);

  // WhatsApp CTA URL
  const waUrl = plan === 'cash'
    ? waProduct(p.brand, p.model)
    : waInstallment(p.brand, p.model, PLAN_LABELS[plan]);

  const waConsultUrl = waSales(
    `Hi, I'm interested in the ${p.simplified_name || `${p.brand} ${p.model}`} and would like to book a free consultation.`
  );

  const SITE_URL = import.meta.env.VITE_SITE_URL || 'https://tajallis.com.pk';
  // Resolve the canonical category slug for breadcrumb + structured data.
  // Priority: 1) normalized seo_category_slug from taxonomy (most accurate)
  //           2) DEFAULT_CATEGORIES slug match against raw DB category string
  //           3) slugified raw category string as last resort
  const _rawCat = p.category.toLowerCase();
  const _catEntry = DEFAULT_CATEGORIES.find(c => c.slug === _rawCat.replace(/\s+/g, '-'))
                 || DEFAULT_CATEGORIES.find(c => _rawCat.includes(c.name.toLowerCase()))
                 || DEFAULT_CATEGORIES.find(c => _rawCat.includes(c.id));
  const catSlug = p.seo_category_slug
    || _catEntry?.slug
    || _rawCat.replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

  // Human-readable category label for breadcrumb and related-product headings.
  // Priority: normalized_category (cleanest) → DEFAULT_CATEGORIES name match →
  //           canonical-category display name → raw p.category as last resort.
  const _CC_DISPLAY: Record<string, string> = {
    air_conditioner: 'Air Conditioners', refrigerator: 'Refrigerators',
    deep_freezer: 'Freezers', washing_machine: 'Washing Machines',
    television: 'Televisions', solar: 'Solar Products', battery: 'Solar Batteries',
    solar_inverter: 'Solar Inverters', solar_panel: 'Solar Panels',
    vacuum: 'Vacuum Cleaners', water_dispenser: 'Water Dispensers',
    microwave: 'Microwaves', air_fryer: 'Air Fryers', blender: 'Kitchen Appliances',
    fan: 'Fans', iron: 'Small Appliances', kettle: 'Kitchen Appliances',
  };
  const catLabel = p.normalized_category
    || _catEntry?.name
    || _CC_DISPLAY[p.category.toLowerCase().replace(/\s+/g, '_')] || p.category;

  // Product structured data — includes MPN, SKU, and spec-based additionalProperty
  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.simplified_name || p.model,
    description: p.description || p.seo.description || `${p.brand} ${p.model} — available at Tajalli's, Karachi.`,
    brand: { '@type': 'Brand', name: p.brand },
    model: p.model,
    sku: p.model,
    mpn: p.model,
    image: allImages.filter(Boolean),
    url: `${SITE_URL}/products/${p.slug}`,
    additionalProperty: Object.entries(p.specs || {}).map(([name, value]) => ({
      '@type': 'PropertyValue', name, value,
    })),
    offers: {
      '@type': 'Offer',
      price: p.price.cash_floor,
      priceCurrency: 'PKR',
      availability: p.stock_status === 'In Stock'
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      url: `${SITE_URL}/products/${p.slug}`,
      seller: { '@type': 'Organization', name: "Tajalli's", url: SITE_URL },
      priceValidUntil: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      hasMerchantReturnPolicy: {
        '@type': 'MerchantReturnPolicy',
        returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
        merchantReturnDays: 7,
        returnMethod: 'https://schema.org/ReturnInStore',
      },
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingRate: { '@type': 'MonetaryAmount', value: 0, currency: 'PKR' },
        shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'PK', addressRegion: 'Sindh' },
        deliveryTime: {
          '@type': 'ShippingDeliveryTime',
          handlingTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: 1, unitCode: 'DAY' },
          transitTime:  { '@type': 'QuantitativeValue', minValue: 1, maxValue: 2, unitCode: 'DAY' },
        },
      },
    },
  };

  // BreadcrumbList schema
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home',     item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Products', item: `${SITE_URL}/products` },
      { '@type': 'ListItem', position: 3, name: catLabel, item: `${SITE_URL}/products/category/${catSlug}` },
      { '@type': 'ListItem', position: 4, name: p.simplified_name || p.model },
    ],
  };

  // Governance: only show Installation tab for categories that require professional installation.
  // Refrigerators, TVs, small appliances etc. do not require installation — show Delivery tab instead.
  const _normCat = (p.normalized_category || p.category).toLowerCase();
  const _needsInstall = requiresInstallation(_normCat);

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'specs',         label: 'Specifications' },
    { key: 'about',         label: 'About'          },
    ...(!priceHistoryLoading && priceHistory.length > 0
      ? [{ key: 'price-history' as TabKey, label: `Price History (${priceHistory.length})` }]
      : []),
    { key: 'installation',  label: _needsInstall ? 'Installation' : 'Delivery' },
    { key: 'reviews',       label: 'Reviews'        },
  ];

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 pb-28 md:pb-8">
      <SEO path={`/products/${p.slug}`} title={p.seo.title} description={p.seo.description}
        keywords={p.seo.keywords} ogImage={p.thumbnail} type="product" />

      <Helmet>
        <script type="application/ld+json">{JSON.stringify(productSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
      </Helmet>

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-500 mb-4 sm:mb-6 overflow-x-auto no-scrollbar whitespace-nowrap">
        <Link to="/" className="hover:text-brand-600 shrink-0">Home</Link><span className="shrink-0">/</span>
        <Link to="/products" className="hover:text-brand-600 shrink-0">Products</Link><span className="shrink-0">/</span>
        <Link to={`/products/category/${catSlug}`} className="hover:text-brand-600 shrink-0">{catLabel}</Link><span className="shrink-0">/</span>
        <span className="text-gray-900 font-medium truncate">{p.model}</span>
      </nav>

      <div className="grid md:grid-cols-2 gap-6 sm:gap-10 lg:gap-16">

        {/* ── Images (sticky) ── */}
        <div className="md:sticky md:top-24 lg:top-[120px] self-start">
          <div
            className="aspect-square rounded-2xl overflow-hidden bg-gray-50 mb-3 shadow-apple-lg relative group cursor-zoom-in"
            onClick={() => openLightbox(activeImg)}
          >
            <img src={allImages[activeImg] || p.thumbnail} alt={`${p.brand} ${p.model}`}
              className="w-full h-full object-contain p-4 transition-opacity duration-300" />
            {/* Overlay buttons */}
            <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={e => { e.stopPropagation(); openLightbox(activeImg); }}
                className="w-9 h-9 bg-white/90 rounded-full flex items-center justify-center text-gray-600 hover:text-brand-500 shadow-apple">
                <ZoomIn className="h-4 w-4" />
              </button>
              <button onClick={e => { e.stopPropagation(); handleShare(); }}
                className="w-9 h-9 bg-white/90 rounded-full flex items-center justify-center text-gray-500 hover:text-brand-500 shadow-apple">
                <Share2 className="h-4 w-4" />
              </button>
            </div>
            <div className="absolute bottom-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="bg-black/50 text-white text-xs px-2 py-1 rounded-lg font-medium">Click to zoom</span>
            </div>
          </div>
          {allImages.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {allImages.map((img, i) => (
                <button key={i} onClick={() => setActiveImg(i)}
                  className={`flex-shrink-0 w-16 h-16 sm:w-16 sm:h-16 rounded-xl overflow-hidden border-2 transition-all active:scale-95 ${activeImg === i ? 'border-brand-500' : 'border-gray-100 hover:border-brand-200'}`}>
                  <img src={img} alt="" className="w-full h-full object-contain p-1" />
                </button>
              ))}
            </div>
          )}
          {p.featured && (
            <div className="mt-3 inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-full text-xs font-semibold">
              <Star className="h-3 w-3 fill-current" /> Featured Product
            </div>
          )}
        </div>

        {/* ── Lightbox ── */}
        {lightbox && (
          <div
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
            onKeyDown={e => { if (e.key === 'Escape') closeLightbox(); if (e.key === 'ArrowLeft') lbPrev(); if (e.key === 'ArrowRight') lbNext(); }}
            tabIndex={-1}
            ref={el => el?.focus()}
          >
            {/* Close */}
            <button onClick={closeLightbox}
              className="absolute top-4 right-4 z-10 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors">
              <X className="w-5 h-5" />
            </button>

            {/* Nav arrows */}
            {allImages.length > 1 && (
              <>
                <button onClick={lbPrev}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button onClick={lbNext}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}

            {/* Zoom controls */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3 bg-black/60 rounded-2xl px-4 py-2">
              <button onClick={() => setZoom(z => Math.max(1, z - 0.5))} className="text-white/70 hover:text-white w-7 h-7 flex items-center justify-center text-xl font-bold">−</button>
              <span className="text-white text-sm font-medium w-12 text-center">{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom(z => Math.min(5, z + 0.5))} className="text-white/70 hover:text-white w-7 h-7 flex items-center justify-center text-xl font-bold">+</button>
              {zoom > 1 && <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} className="text-white/50 hover:text-white text-xs ml-1">Reset</button>}
            </div>

            {/* Counter */}
            {allImages.length > 1 && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/60 text-sm font-medium">
                {activeImg + 1} / {allImages.length}
              </div>
            )}

            {/* Image */}
            <div
              className="w-full h-full flex items-center justify-center overflow-hidden"
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              style={{ cursor: zoom > 1 ? (dragRef.current.dragging ? 'grabbing' : 'grab') : 'zoom-in' }}
            >
              <img
                src={allImages[activeImg]}
                alt={`${p.brand} ${p.model}`}
                draggable={false}
                className="max-h-[90vh] max-w-[90vw] object-contain select-none transition-transform duration-100"
                style={{ transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)` }}
              />
            </div>

            {/* Thumbnail strip */}
            {allImages.length > 1 && (
              <div className="absolute bottom-14 left-1/2 -translate-x-1/2 flex gap-2 overflow-x-auto max-w-[90vw]">
                {allImages.map((img, i) => (
                  <button key={i} onClick={() => { setActiveImg(i); setZoom(1); setPan({ x: 0, y: 0 }); }}
                    className={`flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${activeImg === i ? 'border-white' : 'border-white/20 hover:border-white/60'}`}>
                    <img src={img} alt="" className="w-full h-full object-contain p-1" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Details ── */}
        <div>
          <p className="text-brand-500 font-bold text-xs uppercase tracking-widest mb-1">{p.brand}</p>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight leading-tight mb-1">
            {p.simplified_name
              ? p.simplified_name.replace(new RegExp(`^${p.brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+`, 'i'), '')
              : `${p.brand} ${p.model}`}
          </h1>
          {p.simplified_name && (
            <p className="text-gray-400 text-sm mb-1 font-mono">Model: {p.model}</p>
          )}
          <p className="text-gray-400 text-sm mb-4">{p.category}</p>

          {/* Badges */}
          <div className="flex flex-wrap gap-2 mb-5">
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
              p.stock_status === 'In Stock'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : p.stock_status === 'Discontinued'
                ? 'bg-amber-50 text-amber-700 border border-amber-300'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              <Check className="h-3 w-3" /> {p.stock_status}
            </span>
            {p.warranty && p.warranty.split(',').map(w => w.trim()).filter(Boolean).map((w, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                <Shield className="h-3 w-3" /> {w}
              </span>
            ))}
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              <Truck className="h-3 w-3" /> Free Delivery Karachi
            </span>
          </div>

          {/* Key Specs highlight — ACs: show Tonnage, BTU, Inverter, T3 prominently */}
          {p.specs?.['Tonnage'] && (
            <div className="flex flex-wrap gap-2 mb-5">
              <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-50 border border-sky-200 text-sky-800 text-sm font-bold">
                <span className="text-base leading-none">❄️</span> {p.specs['Tonnage']} Ton
              </div>
              {p.specs['BTU'] && (
                <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-50 border border-sky-100 text-sky-700 text-xs font-semibold">
                  {p.specs['BTU']} BTU
                </div>
              )}
              {(p.specs['Inverter'] || '').toLowerCase() === 'yes' && (
                <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
                  ⚡ DC Inverter
                </div>
              )}
              {isTrueT3(p.model) && (
                <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold">
                  🌡 T3 Tropical
                </div>
              )}
              {p.specs['Voltage Range'] && (
                <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-gray-700 text-xs font-semibold">
                  ⚡ {p.specs['Voltage Range']}
                </div>
              )}
            </div>
          )}

          {/* Payment plan selector */}
          <div className="bg-gray-50 rounded-2xl p-5 mb-5 border border-gray-100">
            {(() => {
              const available = (['cash', '2m', '3m', '6m', '12m'] as const).filter(pl => pl === 'cash' || !!p.installments[pl]);
              const currentIdx = available.indexOf(plan);
              return (
                <>
                  {/* Slider header */}
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Payment Plan</p>
                    <span className="text-sm font-bold text-gray-900">{PLAN_LABELS[plan]}</span>
                  </div>

                  {/* Range slider */}
                  <div className="mb-4">
                    <input
                      type="range"
                      min={0}
                      max={available.length - 1}
                      step={1}
                      value={currentIdx}
                      onChange={e => { setPlan(available[Number(e.target.value)]); setCustomAdvance(null); }}
                      className="w-full h-2 rounded-full appearance-none cursor-pointer accent-gray-900 bg-gray-200"
                    />
                    <div className="flex justify-between mt-1">
                      {available.map((pl, i) => (
                        <button key={pl} onClick={() => { setPlan(pl); setCustomAdvance(null); }}
                          className={`text-[10px] font-semibold transition-colors ${currentIdx === i ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}>
                          {PLAN_LABELS[pl]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Plan details card */}
                  <div className="bg-white rounded-xl p-4 border border-gray-100">
                    {plan === 'cash' ? (
                      <>
                        <div className="flex items-baseline justify-between">
                          <span className="text-3xl font-black text-gray-900">PKR {formatPrice(p.price.cash_floor)}</span>
                          {p.price.retail > p.price.cash_floor && (
                            <span className="text-sm text-gray-400 line-through">PKR {formatPrice(p.price.retail)}</span>
                          )}
                        </div>
                        <p className="text-xs text-emerald-600 font-medium mt-1">Best price — pay in full at delivery</p>
                      </>
                    ) : planData ? (
                      <>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div className="bg-brand-50 rounded-lg p-3">
                            <p className="text-xs text-gray-500 mb-0.5">Advance (at document submission)</p>
                            <p className="text-xl font-black text-brand-600">PKR {formatPrice(effectiveAdvance)}</p>
                          </div>
                          {planData.monthlyPayments > 0 && (
                            <div className="bg-gray-50 rounded-lg p-3">
                              <p className="text-xs text-gray-500 mb-0.5">Monthly × {planData.monthlyPayments}</p>
                              <p className="text-xl font-black text-gray-900">PKR {formatPrice(customMonthly)}</p>
                            </div>
                          )}
                        </div>

                        {/* Dual sliders: advance ↔ monthly operate in unison */}
                        {planData.monthlyPayments > 0 && (
                          <div className="border-t border-gray-100 pt-3 mb-2 space-y-4">
                            <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Build your own plan</p>
                            {/* Advance slider */}
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-xs text-gray-500 font-medium">Advance</p>
                                <p className="text-xs font-bold text-brand-600">PKR {formatPrice(effectiveAdvance)}</p>
                              </div>
                              <input
                                type="range"
                                min={planData.advance}
                                max={planData.total}
                                step={100}
                                value={effectiveAdvance}
                                onChange={e => setCustomAdvance(Number(e.target.value))}
                                className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-brand-500 bg-gray-200"
                              />
                              <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                                <span>Min ({Math.round(planData.advancePct * 100)}%)</span>
                                <span>Pay in full</span>
                              </div>
                            </div>
                            {/* Monthly slider — inversely linked to advance */}
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-xs text-gray-500 font-medium">Monthly × {planData.monthlyPayments}</p>
                                <p className="text-xs font-bold text-gray-800">PKR {formatPrice(customMonthly)}</p>
                              </div>
                              <input
                                type="range"
                                min={0}
                                max={planData.monthly}
                                step={100}
                                value={customMonthly}
                                onChange={e => {
                                  const m = Number(e.target.value);
                                  const a = Math.round((planData.total - m * planData.monthlyPayments) / 100) * 100;
                                  setCustomAdvance(Math.max(planData.advance, Math.min(planData.total, a)));
                                }}
                                className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-gray-700 bg-gray-200"
                              />
                              <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                                <span>Zero (pay upfront)</span>
                                <span>Max monthly</span>
                              </div>
                            </div>
                          </div>
                        )}

                        <p className="text-xs text-gray-400">
                          Total: PKR {formatPrice(planData.total)} · {PLAN_LABELS[plan]} plan
                        </p>
                        <Link to="/installments#requirements"
                          className="mt-2 inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium">
                          <Info className="h-3 w-3" /> Document requirements & process →
                        </Link>

                        {/* PDC / document notice */}
                        {(() => {
                          const isFrontLoad = tags.includes('front-load') || p.sub_category === 'Front Load';
                          const isSemiAuto  = p.category === 'Semi-Automatic Washing Machines';
                          const isHighValue = planData.total >= 100_000;
                          const isSolar     = _normCat.includes('solar') || p.category.toLowerCase().includes('solar');
                          const isSolarCashOnly = isSolar && planData.total >= 700_000;
                          if (!isFrontLoad && !isSemiAuto && !isHighValue && !isSolar) return null;
                          return (
                            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-1.5">
                              {isSolar && (
                                <p className="text-xs text-amber-800 font-semibold">
                                  ☀️ Solar products on installments require a minimum 40% advance payment.
                                </p>
                              )}
                              {isSolarCashOnly && (
                                <p className="text-xs text-red-700 font-semibold">
                                  ⚠️ Systems above PKR 700,000 are cash payment only — installment plans are not available.
                                </p>
                              )}
                              {isFrontLoad && (
                                <p className="text-xs text-amber-800 font-semibold">
                                  📋 PDCs (Post-Dated Cheques) are mandatory for all front-load washing machines.
                                </p>
                              )}
                              {isSemiAuto && (
                                <p className="text-xs text-amber-800 font-semibold">
                                  📄 Required documents: Valid NIC + Recent Utility Bill.
                                </p>
                              )}
                              {isHighValue && !isFrontLoad && (
                                <p className="text-xs text-amber-800 font-semibold">
                                  📋 PDCs are required for orders above PKR 1 Lac.
                                </p>
                              )}
                              {!isSolar && (
                                <p className="text-xs text-amber-700">
                                  PDC requirement is waived if an existing Tajalli's customer acts as guarantor.
                                </p>
                              )}
                            </div>
                          );
                        })()}
                      </>
                    ) : null}
                  </div>
                </>
              );
            })()}

            {/* Installation add-on */}
            <button onClick={() => setWithInstall(!withInstall)}
              className={`mt-3 w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                withInstall ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-600 hover:border-blue-200'
              }`}>
              <div className="flex items-center gap-2 text-sm font-medium">
                <Wrench className="h-4 w-4" /> Professional Installation
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">+ PKR {formatPrice(INSTALL)}</span>
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${withInstall ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
                  {withInstall && <Check className="h-3 w-3 text-white" />}
                </div>
              </div>
            </button>
          </div>

          {/* ── CTAs ── */}
          {isHighTicket ? (
            /* Consultation flow for high-ticket items */
            <div className="bg-gray-50 rounded-2xl p-6 mb-3 border border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Premium Product</p>
              <h3 className="text-lg font-bold text-gray-900 mb-2">This product requires a site assessment.</h3>
              <p className="text-sm text-gray-500 leading-relaxed mb-5">
                Our engineer will visit, assess your space, and design a solution that's right for your home.
                No obligation. Free of charge.
              </p>
              <div className="grid grid-cols-1 gap-3">
                <a href={waConsultUrl} target="_blank" rel="noreferrer"
                  className="flex items-center justify-center gap-2 py-4 rounded-2xl text-base font-bold text-white bg-wa hover:bg-wa-hover transition-colors">
                  <CalendarDays className="h-5 w-5" /> Book Free Consultation
                </a>
                <a href="tel:+923702578788"
                  className="flex items-center justify-center gap-2 py-3.5 rounded-2xl text-base font-bold text-gray-900 bg-white border-2 border-gray-200 hover:border-gray-400 transition-all">
                  <Phone className="h-5 w-5" /> Call Now
                </a>
              </div>
            </div>
          ) : (
            /* Standard purchase flow */
            <>
            {p.stock_status === 'Discontinued' && (
              <div className="mb-4 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
                <span className="mt-0.5 text-base leading-none">⚠️</span>
                <span>This model has been <strong>discontinued</strong>. Stock may still be available — WhatsApp us to confirm before ordering.</span>
              </div>
            )}
            <div className="space-y-3 mb-3">
              {/* WhatsApp — PRIMARY */}
              <a href={waUrl} target="_blank" rel="noreferrer"
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-base font-bold text-white bg-wa hover:bg-wa-hover transition-colors">
                <MessageCircle className="h-5 w-5" />
                {p.stock_status === 'Discontinued'
                  ? 'WhatsApp — Check Availability'
                  : plan === 'cash' ? 'WhatsApp — Enquire Now' : `WhatsApp — ${PLAN_LABELS[plan]} Quote`}
              </a>
              {/* Add to Cart — SECONDARY */}
              <button onClick={handleAdd} disabled={p.stock_status !== 'In Stock'}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-base font-bold text-gray-900 bg-white border-2 border-gray-200 hover:border-gray-400 disabled:opacity-40 transition-all">
                <ShoppingCart className="h-5 w-5" /> Add to Cart
              </button>
            </div>
            </>
          )}

          {/* Share + Compare row */}
          <div className="flex gap-2 mb-5">
            <button
              onClick={() => {
                const url = window.location.href;
                const title = p.simplified_name || `${p.brand} ${p.model}`;
                if (navigator.share) {
                  navigator.share({ title, url }).catch(() => {});
                } else {
                  navigator.clipboard.writeText(url).then(() => toast.success('Link copied!')).catch(() => {});
                }
              }}
              className="flex items-center justify-center gap-2 flex-1 py-3 rounded-2xl text-sm font-bold text-gray-700 bg-white border-2 border-gray-200 hover:border-gray-400 transition-all">
              <Share2 className="h-4 w-4" /> Share
            </button>
            <CompareButton product={p} variant="full" className="flex-1 justify-center" />
          </div>

          {/* Trust strip */}
          <div className="grid grid-cols-3 gap-2">
            {[{ Icon: Shield, text: 'Warranty Backed' }, { Icon: Truck, text: '6–48hr Delivery' }, { Icon: Award, text: 'Genuine Product' }].map(i => (
              <div key={i.text} className="flex flex-col items-center gap-1 text-center p-2">
                <i.Icon className="h-4 w-4 text-brand-500" />
                <span className="text-[10px] text-gray-500 font-medium leading-tight">{i.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── TABBED CONTENT ────────────────────────────────────────── */}
      <div className="mt-8 sm:mt-14">
        {/* Tab bar — scrollable on mobile */}
        <div className="flex gap-0 border-b border-gray-100 mb-6 sm:mb-8 overflow-x-auto no-scrollbar">
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`px-4 sm:px-5 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-all -mb-px min-h-[44px] ${
                activeTab === tab.key
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Specs tab */}
        {activeTab === 'specs' && (
          <div className="animate-fade-in">
            {specEntries.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {specEntries.map(([key, val]) => (
                  <div key={key} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5 capitalize">{key.replace(/_/g, ' ')}</p>
                    <p className="text-sm font-semibold text-gray-900">{val as string}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-sm">Detailed specifications coming soon.</p>
            )}
            {p.colors && (
              <div className="mt-6 pt-6 border-t border-gray-100">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Available Colors</p>
                <p className="text-sm font-semibold text-gray-900">{p.colors}</p>
              </div>
            )}
            {p.warranty && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Warranty</p>
                <p className="text-sm text-gray-700">{p.warranty}</p>
              </div>
            )}
          </div>
        )}

        {/* About tab */}
        {activeTab === 'about' && (
          <div className="animate-fade-in max-w-2xl">
            <p className="text-gray-600 leading-relaxed text-base mb-6">{p.description}</p>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                  <Link key={tag} to={`/products?q=${encodeURIComponent(tag)}`}
                    className="px-3 py-1 rounded-full text-xs bg-gray-100 text-gray-500 hover:bg-brand-50 hover:text-brand-600 transition-colors border border-gray-200">
                    #{tag}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Installation / Delivery tab — content depends on whether this category needs installation */}
        {activeTab === 'installation' && (
          <div className="animate-fade-in">
            {_needsInstall ? (
              /* Categories that require professional installation: ACs, washing machines, solar */
              <>
                <div className="grid sm:grid-cols-2 gap-4 mb-8">
                  {INSTALL_SERVICES.map(s => (
                    <div key={s.title} className="flex gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Wrench className="w-4 h-4 text-brand-500" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm mb-0.5">{s.title}</p>
                        <p className="text-xs text-gray-500">{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="bg-brand-50 rounded-2xl p-6 border border-brand-100">
                  <h3 className="font-bold text-gray-900 mb-2">Book Installation</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Professional installation available same-day in Karachi. PKR 2,000 flat fee — includes all labour and basic fittings.
                  </p>
                  <a href={waSales(`Hi, I'd like to book installation for ${p.simplified_name || `${p.brand} ${p.model}`}.`)}
                    target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-2 font-bold text-white px-6 py-3 rounded-xl bg-wa hover:bg-wa-hover transition-colors">
                    <MessageCircle className="h-4 w-4" /> Book via WhatsApp
                  </a>
                </div>
              </>
            ) : (
              /* Categories that do NOT require installation: refrigerators, TVs, small appliances, etc. */
              <div className="space-y-4">
                <div className="flex gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Wrench className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm mb-0.5">No Installation Required</p>
                    <p className="text-xs text-gray-500">This product does not require professional installation. We deliver, unbox, and place it in position.</p>
                  </div>
                </div>
                <div className="flex gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Wrench className="w-4 h-4 text-brand-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm mb-0.5">Free Delivery in Karachi</p>
                    <p className="text-xs text-gray-500">Door-to-room delivery, unboxing, and placement included — free within standard Karachi delivery zones.</p>
                  </div>
                </div>
                <div className="bg-brand-50 rounded-2xl p-5 border border-brand-100">
                  <h3 className="font-bold text-gray-900 mb-1 text-sm">Questions about delivery?</h3>
                  <p className="text-xs text-gray-600 mb-3">WhatsApp us to confirm delivery timing, outstation availability, or any special placement requirements.</p>
                  <a href={waSales(`Hi, I'd like to confirm delivery details for ${p.simplified_name || `${p.brand} ${p.model}`}.`)}
                    target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-2 font-bold text-white px-5 py-2.5 rounded-xl bg-wa hover:bg-wa-hover transition-colors text-sm">
                    <MessageCircle className="h-4 w-4" /> WhatsApp Us
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Price History tab — SVG trend chart (exact prices hidden) */}
        {activeTab === 'price-history' && (
          <div className="animate-fade-in max-w-2xl">
            {priceHistoryLoading ? (
              <div className="space-y-4 animate-pulse">
                {/* Header skeleton */}
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="h-3.5 w-48 bg-gray-100 rounded-full" />
                    <div className="h-2.5 w-64 bg-gray-100 rounded-full" />
                  </div>
                  <div className="h-6 w-24 bg-gray-100 rounded-full" />
                </div>
                {/* Chart skeleton */}
                <div className="bg-gray-50 rounded-2xl border border-gray-100 h-40 flex items-end gap-1 px-4 pb-4">
                  {[55, 70, 45, 80, 60, 90, 50, 75].map((h, i) => (
                    <div key={i} className="flex-1 bg-gray-200 rounded-t-md" style={{ height: `${h}%` }} />
                  ))}
                </div>
                {/* Footer skeleton */}
                <div className="grid grid-cols-3 gap-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="bg-gray-50 rounded-xl p-3 space-y-1.5">
                      <div className="h-2.5 w-16 bg-gray-100 rounded-full" />
                      <div className="h-4 w-24 bg-gray-100 rounded-full" />
                    </div>
                  ))}
                </div>
              </div>
            ) : priceHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <History className="w-10 h-10 text-gray-200 mb-3" />
                <p className="text-sm text-gray-400 font-medium">No price history recorded yet.</p>
                <p className="text-xs text-gray-300 mt-1">Prices are logged each time the catalog is updated.</p>
              </div>
            ) : (() => {
              // Reverse so oldest is left → newest is right
              const ordered = [...priceHistory].reverse();
              const prices  = ordered.map(e => e.retail_price);
              const maxP    = Math.max(...prices);
              const minP    = Math.min(...prices);
              const range   = maxP - minP || 1;
              const W = 560, H = 160, PAD = { t: 16, r: 16, b: 32, l: 16 };
              const iW = W - PAD.l - PAD.r;
              const iH = H - PAD.t - PAD.b;
              const pts = ordered.map((e, i) => ({
                x: PAD.l + (ordered.length === 1 ? iW / 2 : i / (ordered.length - 1) * iW),
                y: PAD.t + iH - ((e.retail_price - minP) / range) * iH,
                date: new Date(e.imported_at),
                price: e.retail_price,
              }));
              const polyline = pts.map(p => `${p.x},${p.y}`).join(' ');
              const areaPath = `M${pts[0].x},${PAD.t + iH} ` +
                               pts.map(p => `L${p.x},${p.y}`).join(' ') +
                               ` L${pts[pts.length-1].x},${PAD.t + iH} Z`;
              const current  = ordered[ordered.length - 1];
              const oldest   = ordered[0];
              const pctChange = Math.round(((current.retail_price - oldest.retail_price) / oldest.retail_price) * 100);
              const trending  = current.retail_price < maxP;
              return (
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        Price trend since {new Date(oldest.imported_at).toLocaleDateString('en-PK', { month: 'short', year: 'numeric' })}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">Cash price is always lower — contact us for best deal.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {pctChange < 0 && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <TrendingDown className="w-3 h-3" /> {Math.abs(pctChange)}% down
                        </span>
                      )}
                      {pctChange > 0 && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
                          <TrendingUp className="w-3 h-3" /> {pctChange}% up
                        </span>
                      )}
                      {trending && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-brand-50 text-brand-700 border border-brand-200">
                          <TrendingDown className="w-3 h-3" /> {Math.round((1 - current.retail_price / maxP) * 100)}% off peak
                        </span>
                      )}
                    </div>
                  </div>

                  {/* SVG chart */}
                  <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 160 }}>
                      <defs>
                        <linearGradient id="ph-grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f97316" stopOpacity="0.18" />
                          <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      {/* Filled area */}
                      <path d={areaPath} fill="url(#ph-grad)" />
                      {/* Line */}
                      <polyline points={polyline} fill="none" stroke="#f97316" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
                      {/* Dots */}
                      {pts.map((pt, i) => (
                        <circle key={i} cx={pt.x} cy={pt.y} r={i === pts.length - 1 ? 5 : 3.5}
                          fill={i === pts.length - 1 ? '#f97316' : '#fff'}
                          stroke="#f97316" strokeWidth="2" />
                      ))}
                      {/* X-axis date labels — show first and last only */}
                      <text x={pts[0].x} y={H - 6} textAnchor="middle" fontSize="10" fill="#9ca3af">
                        {new Date(oldest.imported_at).toLocaleDateString('en-PK', { month: 'short', year: '2-digit' })}
                      </text>
                      {pts.length > 1 && (
                        <text x={pts[pts.length-1].x} y={H - 6} textAnchor="middle" fontSize="10" fill="#9ca3af">
                          Now
                        </text>
                      )}
                    </svg>
                  </div>

                  {/* Direction pills row — one per recorded entry */}
                  <div className="flex gap-1.5 flex-wrap">
                    {ordered.map((entry, i) => {
                      const prev  = ordered[i - 1];
                      const delta = prev ? entry.retail_price - prev.retail_price : 0;
                      const isNow = i === ordered.length - 1;
                      return (
                        <span key={entry.imported_at}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border
                            ${isNow ? 'bg-gray-900 text-white border-gray-800'
                              : delta < 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : delta > 0 ? 'bg-red-50 text-red-700 border-red-200'
                              : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                          {isNow ? '● Now' : delta < 0 ? <><TrendingDown className="w-2.5 h-2.5" /> Drop</>
                            : delta > 0 ? <><TrendingUp className="w-2.5 h-2.5" /> Rise</> : '—'}
                          <span className="text-[10px] opacity-70 ml-0.5">
                            {new Date(entry.imported_at).toLocaleDateString('en-PK', { month: 'short', year: '2-digit' })}
                          </span>
                        </span>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-gray-400">
                    {priceHistory.length} price point{priceHistory.length !== 1 ? 's' : ''} recorded · Graph shows relative trend only.
                  </p>
                </div>
              );
            })()}
          </div>
        )}

        {/* Reviews tab */}
        {activeTab === 'reviews' && (
          <div className="animate-fade-in">
            <ReviewSection productId={p.id} productName={p.simplified_name || p.model} />
          </div>
        )}
      </div>

      {/* Solar Compatibility Panel */}
      <SolarCompatibilityPanel product={p} />

      {/* Alternatives — same category, similar price band */}
      {(altLoading || alternatives.length > 0) && (
        <div className="mt-14">
          <h2 className="text-lg font-extrabold text-gray-900 mb-1">Consider these alternatives</h2>
          <p className="text-sm text-gray-400 mb-5">Similar {catLabel} in the same price range</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {altLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <div className="aspect-square bg-gray-100 animate-pulse" />
                    <div className="p-4 space-y-2.5">
                      <div className="h-2 w-12 bg-gray-100 rounded-full animate-pulse" />
                      <div className="h-3.5 w-3/4 bg-gray-100 rounded-full animate-pulse" />
                      <div className="h-3 w-1/3 bg-gray-100 rounded-full animate-pulse" />
                    </div>
                  </div>
                ))
              : alternatives.map(a => <ProductCard key={a.id} product={a} />)
            }
          </div>
        </div>
      )}

      {/* Related products — skeleton while loading, hidden if none found */}
      {(relatedLoading || related.length > 0) && (
        <div className="mt-14">
          <h2 className="text-lg font-extrabold text-gray-900 mb-5">More {catLabel.endsWith('s') ? catLabel : catLabel + 's'}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {relatedLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <div className="aspect-square bg-gray-100 animate-pulse" />
                    <div className="p-4 space-y-2.5">
                      <div className="h-2 w-12 bg-gray-100 rounded-full animate-pulse" />
                      <div className="h-3.5 w-3/4 bg-gray-100 rounded-full animate-pulse" />
                      <div className="h-3 w-1/2 bg-gray-100 rounded-full animate-pulse" />
                      <div className="h-3 w-1/3 bg-gray-100 rounded-full animate-pulse" />
                    </div>
                  </div>
                ))
              : related.map(r => <ProductCard key={r.id} product={r} />)
            }
          </div>
        </div>
      )}

      <div className="mt-8">
        <Link to="/products" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-brand-600 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Products
        </Link>
      </div>

      {/* ── Mobile sticky CTA bar ── */}
      {!isHighTicket && (
        <div className="md:hidden fixed bottom-0 inset-x-0 z-20 bg-white border-t border-gray-200 px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] safe-bottom">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-gray-500 leading-none mb-0.5">
                {plan === 'cash' ? 'Cash price' : PLAN_LABELS[plan] + ' from'}
              </p>
              <p className="text-lg font-black text-gray-900 leading-tight">
                {plan === 'cash'
                  ? `PKR ${formatPrice(p.price.cash_floor)}`
                  : planData ? `PKR ${formatPrice(effectiveAdvance)} advance` : `PKR ${formatPrice(p.price.cash_floor)}`}
              </p>
              {plan !== 'cash' && planData && (
                <p className="text-[10px] text-gray-400">then PKR {formatPrice(customMonthly)}/mo × {planData.monthlyPayments}</p>
              )}
            </div>
            <a href={waUrl} target="_blank" rel="noreferrer"
              className="flex items-center justify-center gap-2 bg-[#25d366] hover:bg-[#1ebe57] active:bg-[#1ebe57] text-white px-5 h-12 rounded-xl font-bold text-sm transition-colors shrink-0">
              <MessageCircle className="w-4 h-4" />
              {plan === 'cash' ? 'Enquire' : 'Get Quote'}
            </a>
            <button onClick={handleAdd} disabled={p.stock_status !== 'In Stock'}
              className="flex items-center justify-center gap-1.5 bg-brand-500 hover:bg-brand-600 active:bg-brand-700 disabled:opacity-40 text-white px-4 h-12 rounded-xl font-bold text-sm transition-colors shrink-0">
              <ShoppingCart className="w-4 h-4" />
              Cart
            </button>
          </div>
        </div>
      )}
      {isHighTicket && (
        <div className="md:hidden fixed bottom-0 inset-x-0 z-20 bg-white border-t border-gray-200 px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] safe-bottom">
          <a href={waConsultUrl} target="_blank" rel="noreferrer"
            className="flex items-center justify-center gap-2 w-full bg-[#25d366] text-white h-12 rounded-xl font-bold text-sm">
            <CalendarDays className="w-4 h-4" /> Book Free Consultation
          </a>
        </div>
      )}
    </div>
  );
}
