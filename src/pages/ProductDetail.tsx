import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingCart, MessageCircle, Shield, Truck, Award, Check, Wrench, Share2, ChevronDown, ChevronUp, Star, ZoomIn } from 'lucide-react';
import { getProductBySlug, formatPrice } from '@/lib/api';
import type { Product } from '@/lib/types';
import SEO from '@/components/ui/SEO';
import Spinner from '@/components/ui/Spinner';
import { useCartStore } from '@/store/cartStore';
import { waProduct, waInstallment } from '@/lib/whatsapp';
import toast from 'react-hot-toast';

const PLAN_LABELS: Record<string, string> = {
  cash: 'Cash Price', '2m': '2 Months', '3m': '3 Months', '6m': '6 Months', '12m': '12 Months',
};

export default function ProductDetail() {
  const { slug }                = useParams<{ slug: string }>();
  const navigate                = useNavigate();
  const [product, setProduct]   = useState<Product | null>(null);
  const [loading, setLoading]   = useState(true);
  const [plan, setPlan]         = useState<'cash'|'2m'|'3m'|'6m'|'12m'>('cash');
  const [withInstall, setWithInstall] = useState(false);
  const [specsOpen, setSpecsOpen]     = useState(true);
  const [activeImg, setActiveImg]     = useState(0);
  const addItem = useCartStore(s => s.addItem);

  useEffect(() => {
    if (!slug) { navigate('/products'); return; }
    getProductBySlug(slug).then(p => {
      if (!p) { navigate('/products', { replace: true }); return; }
      setProduct(p);
      setLoading(false);
    });
  }, [slug, navigate]);

  if (loading) return <Spinner />;
  if (!product) return null;

  const p         = product;
  const allImages = [p.thumbnail, ...p.gallery].filter(Boolean);
  const INSTALL   = 2000;
  const planData  = plan !== 'cash' ? p.installments[plan] : null;

  const handleAdd = () => { addItem(p); toast.success(`${p.brand} ${p.model} added to cart!`); };
  const handleShare = async () => {
    const url = `${window.location.origin}/products/${p.slug}`;
    try { await navigator.share({ title: `${p.brand} ${p.model}`, url }); }
    catch { await navigator.clipboard.writeText(url); toast.success('Link copied!'); }
  };

  const specEntries = Object.entries(p.specs || {}).filter(([, v]) => v);
  const tags = (p.tags || '').split(',').map(t => t.trim()).filter(Boolean);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <SEO path={`/products/${p.slug}`} title={p.seo.title} description={p.seo.description}
        keywords={p.seo.keywords} ogImage={p.thumbnail} type="product" />

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6 flex-wrap">
        <Link to="/" className="hover:text-brand-600">Home</Link><span>/</span>
        <Link to="/products" className="hover:text-brand-600">Products</Link><span>/</span>
        <Link to={`/products/category/${p.category.toLowerCase().replace(/\s+/g,'-')}`}
          className="hover:text-brand-600">{p.category}</Link><span>/</span>
        <span className="text-gray-900 font-medium truncate max-w-xs">{p.model}</span>
      </nav>

      <div className="grid md:grid-cols-2 gap-10 lg:gap-16">
        {/* Images */}
        <div className="md:sticky md:top-24 self-start">
          <div className="aspect-square rounded-apple-xl overflow-hidden bg-surface-secondary mb-3 shadow-apple relative group">
            <img src={allImages[activeImg] || p.thumbnail} alt={`${p.brand} ${p.model}`}
              className="w-full h-full object-cover" />
            <button onClick={handleShare}
              className="absolute top-3 right-3 w-9 h-9 bg-white/90 rounded-full flex items-center justify-center text-gray-500 hover:text-brand-500 shadow-apple transition-colors opacity-0 group-hover:opacity-100">
              <Share2 className="h-4 w-4" />
            </button>
          </div>
          {allImages.length > 1 && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {allImages.map((img, i) => (
                <button key={i} onClick={() => setActiveImg(i)}
                  className={`flex-shrink-0 w-16 h-16 rounded-apple overflow-hidden border-2 transition-all ${activeImg === i ? 'border-brand-500' : 'border-gray-100 hover:border-brand-200'}`}>
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
          {p.featured && (
            <div className="mt-3 badge-gold inline-flex">
              <Star className="h-3 w-3 fill-current" /> Featured Product
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          <div className="mb-1">
            <p className="text-brand-500 font-bold text-xs uppercase tracking-widest">{p.brand}</p>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight leading-tight mb-2">
            {p.model}
          </h1>
          <p className="text-gray-400 text-sm mb-4">{p.category}</p>

          {/* Stock + warranty badges */}
          <div className="flex flex-wrap gap-2 mb-5">
            <span className={`badge ${p.stock_status === 'In Stock' ? 'badge-green' : 'badge-red'}`}>
              <Check className="h-3 w-3" /> {p.stock_status}
            </span>
            {p.warranty && <span className="badge badge-blue"><Shield className="h-3 w-3" /> {p.warranty.split(',')[0]}</span>}
            <span className="badge badge-gold"><Truck className="h-3 w-3" /> Free Delivery Karachi</span>
          </div>

          <p className="text-gray-600 text-sm leading-relaxed mb-6">{p.description}</p>

          {/* Plan selector */}
          <div className="bg-surface-secondary rounded-apple-xl p-5 mb-5">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Select Payment Plan</p>
            <div className="grid grid-cols-5 gap-2 mb-4">
              {(['cash','2m','3m','6m','12m'] as const).map(pl => (
                <button key={pl} onClick={() => setPlan(pl)}
                  className={`py-2 px-1 rounded-lg text-xs font-bold text-center transition-all border focus-visible:ring-2 focus-visible:ring-brand-500
                    ${plan === pl ? 'bg-brand-500 text-white border-brand-500 shadow-blue' : 'bg-white border-gray-200 text-gray-600 hover:border-brand-300'}`}>
                  {pl === 'cash' ? 'Cash' : pl}
                </button>
              ))}
            </div>

            {/* Price display — NO advance %, NO markup shown */}
            <div className="bg-white rounded-apple p-4">
              {plan === 'cash' ? (
                <>
                  <div className="flex items-baseline justify-between">
                    <span className="text-3xl font-black text-gray-900">PKR {formatPrice(p.price.cash_floor)}</span>
                    {p.price.retail > p.price.cash_floor && (
                      <span className="text-sm text-gray-400 line-through">PKR {formatPrice(p.price.retail)}</span>
                    )}
                  </div>
                  <p className="text-xs text-emerald-600 font-medium mt-1">
                    Best price — pay in full at delivery
                  </p>
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

            {/* Installation */}
            <button onClick={() => setWithInstall(!withInstall)}
              className={`mt-3 w-full flex items-center justify-between p-3 rounded-lg border transition-all
                ${withInstall ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-600 hover:border-blue-200'}`}>
              <div className="flex items-center gap-2 text-sm font-medium">
                <Wrench className="h-4 w-4" /> Professional Installation
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">+ PKR {formatPrice(INSTALL)}</span>
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all
                  ${withInstall ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
                  {withInstall && <Check className="h-3 w-3 text-white" />}
                </div>
              </div>
            </button>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <button onClick={handleAdd} disabled={p.stock_status !== 'In Stock'}
              className="btn-primary py-4 text-base disabled:opacity-50">
              <ShoppingCart className="h-5 w-5" /> Add to Cart
            </button>
            <a href={plan === 'cash' ? waProduct(p.brand, p.model) : waInstallment(p.brand, p.model, PLAN_LABELS[plan])}
              target="_blank" rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 py-4 rounded-full text-base font-bold text-white hover:opacity-90 transition-all"
              style={{ background: '#25d366' }}>
              <MessageCircle className="h-5 w-5" /> WhatsApp
            </a>
          </div>
          <Link to="/checkout" onClick={handleAdd} className="btn-gold w-full justify-center py-3.5 text-base">
            Buy Now
          </Link>

          {/* Trust icons */}
          <div className="grid grid-cols-3 gap-2 mt-5">
            {[{Icon:Shield,text:'Warranty Backed'},{Icon:Truck,text:'6–48hr Delivery'},{Icon:Award,text:'Genuine Product'}].map(i => (
              <div key={i.text} className="flex flex-col items-center gap-1 text-center p-2">
                <i.Icon className="h-4 w-4 text-brand-500" />
                <span className="text-[10px] text-gray-500 font-medium leading-tight">{i.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Specs accordion */}
      {specEntries.length > 0 && (
        <div className="mt-12 border border-gray-100 rounded-apple-xl overflow-hidden">
          <button onClick={() => setSpecsOpen(!specsOpen)}
            className="w-full flex items-center justify-between p-5 bg-surface-secondary hover:bg-gray-100 transition-colors font-semibold text-gray-900">
            <span>Specifications</span>
            {specsOpen ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
          </button>
          {specsOpen && (
            <div className="p-5 animate-fade-in">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {specEntries.map(([key, val]) => (
                  <div key={key} className="bg-surface-secondary rounded-apple p-3">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5 capitalize">{key.replace(/_/g,' ')}</p>
                    <p className="text-sm font-semibold text-gray-900">{val as string}</p>
                  </div>
                ))}
              </div>
              {p.colors && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Available Colors</p>
                  <p className="text-sm font-semibold text-gray-900">{p.colors}</p>
                </div>
              )}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Warranty</p>
                <p className="text-sm text-gray-700">{p.warranty}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {tags.map(tag => (
            <Link key={tag} to={`/products?q=${encodeURIComponent(tag)}`}
              className="px-3 py-1 rounded-full text-xs bg-surface-secondary text-gray-500 hover:bg-brand-50 hover:text-brand-600 transition-colors border border-gray-100">
              #{tag}
            </Link>
          ))}
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
