import { useEffect, useState, startTransition } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  ArrowLeft, ShoppingCart, MessageCircle, Shield, Truck, Award,
  Check, Wrench, Share2, Star, Phone, CalendarDays,
  TrendingDown, TrendingUp, History,
} from 'lucide-react';
import { getProductBySlug, getRelatedProducts, getPriceHistory, formatPrice, DEFAULT_CATEGORIES } from '@/lib/api';
import type { Product } from '@/lib/types';
import ProductCard from '@/components/products/ProductCard';
import ReviewSection from '@/components/products/ReviewSection';
import CompareButton from '@/components/CompareButton';
import SEO from '@/components/ui/SEO';
import Spinner from '@/components/ui/Spinner';
import { useCartStore } from '@/store/cartStore';
import { useSettingsStore } from '@/store/settingsStore';
import { waProduct, waInstallment, waSales } from '@/lib/whatsapp';
import toast from 'react-hot-toast';

const PLAN_LABELS: Record<string, string> = {
  cash: 'Cash Price', '2m': '2 Months', '3m': '3 Months', '6m': '6 Months', '12m': '12 Months',
};

/** Price threshold above which consultation flow replaces add-to-cart — overridable via admin Settings */
const CONSULTATION_THRESHOLD_DEFAULT = 200_000;

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
  const [related,    setRelated]    = useState<Product[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [plan,       setPlan]       = useState<'cash'|'2m'|'3m'|'6m'|'12m'>('cash');
  const [withInstall, setWithInstall] = useState(false);
  const [activeImg,  setActiveImg]  = useState(0);
  const [activeTab,  setActiveTab]  = useState<TabKey>('specs');
  const [priceHistory, setPriceHistory] = useState<{ retail_price: number; imported_at: string }[]>([]);

  const addItem = useCartStore(s => s.addItem);
  const consultationThreshold = useSettingsStore(s => s.consultationThreshold) ?? CONSULTATION_THRESHOLD_DEFAULT;

  useEffect(() => {
    if (!slug) { navigate('/products'); return; }
    getProductBySlug(slug).then(p => {
      if (!p) { navigate('/products', { replace: true }); return; }
      startTransition(() => {
        setProduct(p);
        setLoading(false);
      });
      getRelatedProducts(p.id, p.category, 4).then(r => startTransition(() => setRelated(r)));
      getPriceHistory(p.id).then(ph => startTransition(() => setPriceHistory(ph)));
    });
  }, [slug, navigate]);

  if (loading) return <Spinner />;
  if (!product) return null;

  const p          = product;
  const allImages  = [p.thumbnail, ...p.gallery].filter(Boolean);
  const INSTALL    = 2000;
  const planData   = plan !== 'cash' ? p.installments[plan] : null;
  const isHighTicket = p.price.cash_floor >= consultationThreshold;

  const handleAdd = () => { addItem(p); toast.success(`${p.brand} ${p.model} added to cart!`); };

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

  const SITE_URL = import.meta.env.VITE_SITE_URL || 'https://reliance.tajallis.com.pk';
  const catSlug  = p.category.toLowerCase().replace(/\s+/g, '-');

  // Product structured data — includes MPN, SKU, and spec-based additionalProperty
  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.simplified_name || p.model,
    description: p.description,
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
      seller: { '@type': 'Organization', name: 'Reliance Appliances', url: SITE_URL },
      priceValidUntil: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      hasMerchantReturnPolicy: {
        '@type': 'MerchantReturnPolicy',
        returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
        merchantReturnDays: 7,
        returnMethod: 'https://schema.org/ReturnInStore',
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
      { '@type': 'ListItem', position: 3, name: p.category, item: `${SITE_URL}/products/category/${catSlug}` },
      { '@type': 'ListItem', position: 4, name: p.simplified_name || p.model },
    ],
  };

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'specs',         label: 'Specifications' },
    { key: 'about',         label: 'About'          },
    { key: 'price-history', label: `Price History${priceHistory.length > 0 ? ` (${priceHistory.length})` : ''}` },
    { key: 'installation',  label: 'Installation'   },
    { key: 'reviews',       label: 'Reviews'        },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <SEO path={`/products/${p.slug}`} title={p.seo.title} description={p.seo.description}
        keywords={p.seo.keywords} ogImage={p.thumbnail} type="product" />

      <Helmet>
        <script type="application/ld+json">{JSON.stringify(productSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
      </Helmet>

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6 flex-wrap">
        <Link to="/" className="hover:text-brand-600">Home</Link><span>/</span>
        <Link to="/products" className="hover:text-brand-600">Products</Link><span>/</span>
        <Link
          to={`/products/category/${DEFAULT_CATEGORIES.find(c => c.slug === p.category.toLowerCase().replace(/\s+/g, '-'))?.slug ?? p.category.toLowerCase().replace(/\s+/g, '-')}`}
          className="hover:text-brand-600">{p.category}</Link><span>/</span>
        <span className="text-gray-900 font-medium truncate max-w-xs">{p.model}</span>
      </nav>

      <div className="grid md:grid-cols-2 gap-10 lg:gap-16">

        {/* ── Images (sticky) ── */}
        <div className="md:sticky md:top-24 self-start">
          <div className="aspect-square rounded-3xl overflow-hidden bg-gray-50 mb-3 shadow-apple-lg relative group">
            <img src={allImages[activeImg] || p.thumbnail} alt={`${p.brand} ${p.model}`}
              className="w-full h-full object-cover transition-opacity duration-300" />
            <button onClick={handleShare}
              className="absolute top-3 right-3 w-9 h-9 bg-white/90 rounded-full flex items-center justify-center text-gray-500 hover:text-brand-500 shadow-apple transition-colors opacity-0 group-hover:opacity-100">
              <Share2 className="h-4 w-4" />
            </button>
          </div>
          {allImages.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {allImages.map((img, i) => (
                <button key={i} onClick={() => setActiveImg(i)}
                  className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${activeImg === i ? 'border-brand-500' : 'border-gray-100 hover:border-brand-200'}`}>
                  <img src={img} alt="" className="w-full h-full object-cover" />
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

        {/* ── Details ── */}
        <div>
          <p className="text-brand-500 font-bold text-xs uppercase tracking-widest mb-1">{p.brand}</p>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight leading-tight mb-1">
            {p.simplified_name || `${p.brand} ${p.model}`}
          </h1>
          {p.simplified_name && (
            <p className="text-gray-400 text-sm mb-1 font-mono">Model: {p.model}</p>
          )}
          <p className="text-gray-400 text-sm mb-4">{p.category}</p>

          {/* Badges */}
          <div className="flex flex-wrap gap-2 mb-5">
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${p.stock_status === 'In Stock' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              <Check className="h-3 w-3" /> {p.stock_status}
            </span>
            {p.warranty && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                <Shield className="h-3 w-3" /> {p.warranty.split(',')[0]}
              </span>
            )}
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              <Truck className="h-3 w-3" /> Free Delivery Karachi
            </span>
          </div>

          {/* Payment plan selector */}
          <div className="bg-gray-50 rounded-2xl p-5 mb-5 border border-gray-100">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Payment Plan</p>
            {(() => {
              const available = (['cash', '2m', '3m', '6m', '12m'] as const).filter(pl => pl === 'cash' || !!p.installments[pl]);
              return (
                <div className="flex gap-1.5 flex-wrap mb-4">
                  {available.map(pl => (
                    <button key={pl} onClick={() => setPlan(pl)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                        plan === pl
                          ? 'bg-gray-900 text-white border-gray-900'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
                      }`}>
                      {pl === 'cash' ? 'Cash' : pl}
                    </button>
                  ))}
                </div>
              );
            })()}

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
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-brand-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-0.5">At Delivery</p>
                      <p className="text-xl font-black text-brand-600">PKR {formatPrice(planData.advance)}</p>
                    </div>
                    {planData.monthly > 0 && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-0.5">Monthly × {planData.months - 1}</p>
                        <p className="text-xl font-black text-gray-900">PKR {formatPrice(planData.monthly)}</p>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Total: PKR {formatPrice(planData.total)} · {PLAN_LABELS[plan]} plan
                  </p>
                </>
              ) : null}
            </div>

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
                  className="flex items-center justify-center gap-2 py-4 rounded-2xl text-base font-bold text-white transition-all hover:opacity-90"
                  style={{ background: '#25d366' }}>
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
            <div className="space-y-3 mb-3">
              {/* WhatsApp — PRIMARY */}
              <a href={waUrl} target="_blank" rel="noreferrer"
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-base font-bold text-white hover:opacity-90 transition-all"
                style={{ background: '#25d366' }}>
                <MessageCircle className="h-5 w-5" />
                {plan === 'cash' ? 'WhatsApp — Enquire Now' : `WhatsApp — Get ${PLAN_LABELS[plan]} Quote`}
              </a>
              {/* Add to Cart — SECONDARY */}
              <button onClick={handleAdd} disabled={p.stock_status !== 'In Stock'}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-base font-bold text-gray-900 bg-white border-2 border-gray-200 hover:border-gray-400 disabled:opacity-40 transition-all">
                <ShoppingCart className="h-5 w-5" /> Add to Cart
              </button>
            </div>
          )}

          <CompareButton product={p} variant="full" className="w-full justify-center mb-5" />

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
      <div className="mt-14">
        {/* Tab bar */}
        <div className="flex gap-1 border-b border-gray-100 mb-8 overflow-x-auto">
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-all -mb-px ${
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
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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

        {/* Installation tab */}
        {activeTab === 'installation' && (
          <div className="animate-fade-in">
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
                className="inline-flex items-center gap-2 font-bold text-white px-6 py-3 rounded-xl transition-all hover:opacity-90"
                style={{ background: '#25d366' }}>
                <MessageCircle className="h-4 w-4" /> Book via WhatsApp
              </a>
            </div>
          </div>
        )}

        {/* Price History tab */}
        {activeTab === 'price-history' && (
          <div className="animate-fade-in max-w-2xl">
            {priceHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <History className="w-10 h-10 text-gray-200 mb-3" />
                <p className="text-sm text-gray-400 font-medium">No price history recorded yet.</p>
                <p className="text-xs text-gray-300 mt-1">Prices are logged each time the catalog is updated.</p>
              </div>
            ) : (() => {
              const maxPrice = Math.max(...priceHistory.map(e => e.retail_price));
              const minPrice = Math.min(...priceHistory.map(e => e.retail_price));
              return (
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Retail price tracked since {new Date(priceHistory[priceHistory.length - 1].imported_at).toLocaleDateString('en-PK', { month: 'short', year: 'numeric' })}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Cash price is always lower — contact us for best offer.</p>
                    </div>
                    {minPrice < maxPrice && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <TrendingDown className="w-3 h-3" /> Down {Math.round((1 - minPrice / maxPrice) * 100)}% from peak
                      </span>
                    )}
                  </div>
                  {priceHistory.map((entry, i) => {
                    const prev = priceHistory[i + 1];
                    const delta = prev ? entry.retail_price - prev.retail_price : 0;
                    const barPct = Math.round((entry.retail_price / maxPrice) * 100);
                    const isCurrent = i === 0;
                    return (
                      <div key={entry.imported_at}
                        className={`rounded-2xl border p-4 transition-all ${isCurrent ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100 hover:border-gray-200'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <span className={`text-xs font-semibold ${isCurrent ? 'text-gray-400' : 'text-gray-400'}`}>
                              {isCurrent ? 'Current' : new Date(entry.imported_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                            <p className={`text-xl font-black mt-0.5 ${isCurrent ? 'text-white' : 'text-gray-900'}`}>
                              PKR {formatPrice(entry.retail_price)}
                            </p>
                          </div>
                          {delta !== 0 && (
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${delta < 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                              {delta < 0
                                ? <><TrendingDown className="w-3 h-3" /> {formatPrice(Math.abs(delta))}</>
                                : <><TrendingUp className="w-3 h-3" /> +{formatPrice(delta)}</>}
                            </span>
                          )}
                        </div>
                        <div className={`h-1.5 rounded-full overflow-hidden ${isCurrent ? 'bg-gray-700' : 'bg-gray-100'}`}>
                          <div className={`h-full rounded-full transition-all ${isCurrent ? 'bg-orange-500' : delta < 0 ? 'bg-emerald-400' : delta > 0 ? 'bg-red-400' : 'bg-gray-300'}`}
                            style={{ width: `${barPct}%` }} />
                        </div>
                      </div>
                    );
                  })}
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

      {/* Related products */}
      {related.length > 0 && (
        <div className="mt-14">
          <h2 className="text-lg font-extrabold text-gray-900 mb-5">More {p.category.replace(/s$/, '')}s</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {related.map(r => <ProductCard key={r.id} product={r} />)}
          </div>
        </div>
      )}

      <div className="mt-8">
        <Link to="/products" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-brand-600 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Products
        </Link>
      </div>
    </div>
  );
}
