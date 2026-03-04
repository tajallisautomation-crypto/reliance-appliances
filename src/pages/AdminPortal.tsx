import { useState, useEffect, useRef } from 'react';
import { signIn, signUp } from '@/lib/auth';
import { useAuthStore } from '@/store/authStore';
import {
  getProducts, upsertProduct, deleteProduct, uploadProductImage,
  calcAllPlans, fmtPKR, CATEGORY_MAP,
  type Product,
} from '@/lib/api';
import {
  LogOut, Plus, Pencil, Trash2, Upload, Search, X, Check,
  ChevronDown, Package, FileUp, Loader2,
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugify(s: string) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }

const STOCK_OPTIONS = ['In Stock', 'Out of Stock', 'Coming Soon'];

// ── Empty product form ────────────────────────────────────────────────────────

function emptyForm() {
  return {
    id: '', brand: '', model: '', simplified_name: '', category: '', sub_category: '',
    retail_price: '', stock_status: 'In Stock', featured: false,
    thumbnail_url: '', description: '', warranty: '', tags: '',
    seo_title: '', seo_desc: '',
  };
}

// ── Product Form Modal ────────────────────────────────────────────────────────

function ProductModal({
  initial, onClose, onSaved,
}: { initial: any; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<any>(initial || emptyForm());
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const price = Number(form.retail_price) || 0;
  const plans = price ? calcAllPlans(price) : null;

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    try {
      const id = form.id || slugify(`${form.brand}-${form.model}`);
      const url = await uploadProductImage(file, id || 'tmp');
      set('thumbnail_url', url);
    } catch (e: any) { setErr(e.message); }
    finally { setUploading(false); }
  }

  async function handleSave() {
    if (!form.brand || !form.model || !form.category || !form.retail_price) {
      setErr('Brand, Model, Category, and Retail Price are required.'); return;
    }
    setSaving(true); setErr('');
    try {
      const id = form.id || slugify(`${form.brand}-${form.model}-${Date.now()}`);
      await upsertProduct({ ...form, id, slug: form.id ? form.id : id, retail_price: Number(form.retail_price) });
      onSaved();
    } catch (e: any) { setErr(e.message); setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl my-4">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-bold text-gray-900 text-lg">{form.id ? 'Edit Product' : 'Add Product'}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 grid grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto">
          {/* Row 1 */}
          <Field label="Brand *" value={form.brand} onChange={v => set('brand', v)} />
          <Field label="Model *" value={form.model} onChange={v => set('model', v)} />

          {/* Row 2 */}
          <div className="col-span-2">
            <Field label="Simplified Name (customer-friendly)" value={form.simplified_name} onChange={v => set('simplified_name', v)} placeholder="e.g. Haier 1.5 Ton Inverter AC" />
          </div>

          {/* Row 3 */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Category *</label>
            <select
              value={form.category}
              onChange={e => set('category', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            >
              <option value="">Select category…</option>
              {Object.values(CATEGORY_MAP).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <Field label="Sub-category" value={form.sub_category} onChange={v => set('sub_category', v)} placeholder="e.g. DC Inverter" />

          {/* Row 4 */}
          <Field label="Retail Price (PKR) *" type="number" value={form.retail_price} onChange={v => set('retail_price', v)} />
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Stock Status</label>
            <select value={form.stock_status} onChange={e => set('stock_status', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
              {STOCK_OPTIONS.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>

          {/* Installment preview */}
          {plans && (
            <div className="col-span-2 bg-orange-50 rounded-xl p-3 grid grid-cols-4 gap-2 text-xs">
              {Object.entries(plans).map(([k, p]) => (
                <div key={k} className="text-center">
                  <div className="font-bold text-orange-700">{k.replace('month', 'm')}</div>
                  <div className="text-gray-500">Adv {fmtPKR(p.advance)}</div>
                  <div className="text-gray-500">×{p.monthlyPayments} {fmtPKR(p.monthly)}</div>
                </div>
              ))}
            </div>
          )}

          {/* Thumbnail */}
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Thumbnail Image</label>
            <div className="flex gap-2">
              <input
                type="text" value={form.thumbnail_url} onChange={e => set('thumbnail_url', e.target.value)}
                placeholder="Paste image URL or upload file →"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
              <button
                type="button" onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg text-sm font-medium"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploading ? 'Uploading…' : 'Upload'}
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </div>
            {form.thumbnail_url && (
              <img src={form.thumbnail_url} alt="preview" className="mt-2 h-24 w-24 object-cover rounded-lg border" />
            )}
          </div>

          {/* Text fields */}
          <div className="col-span-2">
            <Field label="Description" value={form.description} onChange={v => set('description', v)} multiline />
          </div>
          <Field label="Warranty" value={form.warranty} onChange={v => set('warranty', v)} placeholder="e.g. 5 years compressor" />
          <Field label="Tags" value={form.tags} onChange={v => set('tags', v)} placeholder="inverter, 1.5 ton, haier" />
          <Field label="SEO Title" value={form.seo_title} onChange={v => set('seo_title', v)} />
          <Field label="SEO Description" value={form.seo_desc} onChange={v => set('seo_desc', v)} />

          {/* Featured */}
          <div className="col-span-2 flex items-center gap-2">
            <input type="checkbox" id="featured" checked={!!form.featured} onChange={e => set('featured', e.target.checked)}
              className="w-4 h-4 accent-orange-500" />
            <label htmlFor="featured" className="text-sm font-medium text-gray-700">Featured product (shown on homepage)</label>
          </div>
        </div>

        {err && <p className="px-5 pb-2 text-red-500 text-sm">{err}</p>}

        <div className="flex justify-end gap-3 p-5 border-t">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-5 py-2 rounded-lg text-sm font-bold disabled:opacity-60">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {saving ? 'Saving…' : 'Save Product'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder = '', multiline = false }: {
  label: string; value: any; onChange: (v: string) => void;
  type?: string; placeholder?: string; multiline?: boolean;
}) {
  const cls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400';
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {multiline
        ? <textarea value={value || ''} onChange={e => onChange(e.target.value)} rows={3} placeholder={placeholder} className={cls} />
        : <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={cls} />
      }
    </div>
  );
}

// ── CSV Import Tab ────────────────────────────────────────────────────────────

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
    return obj;
  });
}

function csvRowToProduct(row: Record<string, string>): Record<string, any> {
  const get = (...keys: string[]) => {
    for (const k of keys) {
      const found = Object.keys(row).find(h => h.toLowerCase().replace(/[^a-z]/g, '') === k.toLowerCase().replace(/[^a-z]/g, ''));
      if (found && row[found]) return row[found];
    }
    return '';
  };
  const brand = get('Brand');
  const model = get('Model');
  const price = Number(get('Retail_Price', 'RetailPrice', 'Price')) || 0;
  const id = slugify(`${brand}-${model}`);
  return {
    id, slug: id, brand, model,
    simplified_name: get('Simplified_Name', 'SimplifiedName', 'Name'),
    category:        get('Category'),
    sub_category:    get('Sub_Category', 'SubCategory'),
    retail_price:    price,
    stock_status:    get('Stock_Status', 'StockStatus') || 'In Stock',
    featured:        get('Featured').toLowerCase() === 'true',
    thumbnail_url:   get('Image_URL', 'ImageURL', 'Image'),
    description:     get('Description'),
    warranty:        get('Warranty'),
    tags:            get('Tags'),
    seo_title:       get('SEO_Title', 'SEOTitle', 'SeoTitle'),
    seo_desc:        get('SEO_Desc', 'SEODesc', 'SeoDesc'),
  };
}

function ImportTab({ onImported }: { onImported: () => void }) {
  const [rows, setRows]       = useState<Record<string, string>[]>([]);
  const [progress, setProgress] = useState<string>('');
  const [done, setDone]       = useState(false);
  const [err, setErr]         = useState('');

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      setRows(parseCSV(text));
      setDone(false); setErr(''); setProgress('');
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    if (rows.length === 0) return;
    setErr(''); setDone(false);
    const BATCH = 50;
    let imported = 0, errors = 0;
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH);
      await Promise.all(batch.map(async row => {
        try {
          await upsertProduct(csvRowToProduct(row));
          imported++;
        } catch { errors++; }
      }));
      setProgress(`Imported ${imported} / ${rows.length}…`);
    }
    setProgress('');
    setDone(true);
    if (errors > 0) setErr(`${errors} rows failed to import.`);
    onImported();
  }

  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="bg-blue-50 rounded-2xl p-6 mb-6">
        <h3 className="font-bold text-gray-900 mb-2">How to import from Google Sheets</h3>
        <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
          <li>Open your Google Sheet (Master_Products)</li>
          <li>Click <strong>File → Download → Comma Separated Values (.csv)</strong></li>
          <li>Upload the file below</li>
          <li>Preview the first 5 rows, then click Import</li>
        </ol>
        <p className="text-xs text-gray-500 mt-3">
          Auto-detected columns: Brand, Model, Simplified_Name, Category, Sub_Category, Retail_Price,
          Stock_Status, Featured, Image_URL, Description, Warranty, Tags, SEO_Title, SEO_Desc
        </p>
      </div>

      <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 hover:border-orange-400 rounded-2xl p-10 cursor-pointer transition-colors">
        <FileUp className="w-10 h-10 text-gray-400 mb-3" />
        <span className="font-medium text-gray-700">Click to choose CSV file</span>
        <span className="text-sm text-gray-400 mt-1">or drag and drop</span>
        <input type="file" accept=".csv" className="hidden" onChange={handleFile} />
      </label>

      {rows.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-700">{rows.length} rows detected — preview of first 5:</p>
            <button onClick={handleImport} disabled={!!progress}
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-5 py-2 rounded-lg text-sm font-bold disabled:opacity-60">
              {progress ? <><Loader2 className="w-4 h-4 animate-spin" /> {progress}</> : <><Upload className="w-4 h-4" /> Import All {rows.length} Products</>}
            </button>
          </div>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="text-xs w-full">
              <thead className="bg-gray-50">
                <tr>{Object.keys(rows[0]).slice(0, 8).map(h => <th key={h} className="text-left px-3 py-2 font-medium text-gray-600">{h}</th>)}</tr>
              </thead>
              <tbody>
                {rows.slice(0, 5).map((r, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    {Object.values(r).slice(0, 8).map((v, j) => <td key={j} className="px-3 py-2 text-gray-700 truncate max-w-[120px]">{v}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {err  && <p className="mt-3 text-red-500 text-sm">{err}</p>}
          {done && <p className="mt-3 text-green-600 text-sm font-medium">Import complete!</p>}
        </div>
      )}
    </div>
  );
}

// ── Main AdminPortal ──────────────────────────────────────────────────────────

export default function AdminPortal() {
  const { isLoggedIn, loading, signOut } = useAuthStore();

  // Auth state
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [authErr, setAuthErr]   = useState('');
  const [authOk, setAuthOk]     = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Products state
  const [products, setProducts] = useState<Product[]>([]);
  const [fetching, setFetching] = useState(false);
  const [search, setSearch]     = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [modal, setModal]       = useState<null | 'add' | Product>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [tab, setTab]           = useState<'products' | 'import'>('products');

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault(); setAuthErr(''); setAuthOk(''); setSubmitting(true);
    try {
      if (authMode === 'signup') {
        if (password !== confirm) { setAuthErr('Passwords do not match'); setSubmitting(false); return; }
        const { session } = await signUp(email, password);
        // If email confirmations are disabled in Supabase, session is returned immediately
        if (!session) {
          setAuthOk('Account created! Check your email to confirm, then sign in.');
          setAuthMode('signin'); setPassword(''); setConfirm('');
        }
        // If confirmations are off, onAuthStateChange fires and logs the user in automatically
      } else {
        await signIn(email, password);
      }
    } catch (err: any) { setAuthErr(err.message || 'Something went wrong'); }
    finally { setSubmitting(false); }
  }

  async function loadProducts() {
    setFetching(true);
    const { products: p } = await getProducts(catFilter ? { category: catFilter } : undefined);
    setProducts(p); setFetching(false);
  }

  useEffect(() => { if (isLoggedIn) loadProducts(); }, [isLoggedIn, catFilter]);

  const filtered = products.filter(p =>
    !search || (p.simplified_name || p.model).toLowerCase().includes(search.toLowerCase()) || p.brand.toLowerCase().includes(search.toLowerCase())
  );

  async function handleDelete(id: string) {
    setDeleting(true);
    try { await deleteProduct(id); await loadProducts(); }
    finally { setDeleting(false); setDeleteId(null); }
  }

  // ── Login screen ────────────────────────────────────────────────────────────

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>;
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border w-full max-w-sm p-8">
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Package className="w-6 h-6 text-orange-600" />
            </div>
            <h1 className="text-xl font-black text-gray-900">Reliance Admin</h1>
            <p className="text-sm text-gray-500 mt-1">{authMode === 'signin' ? 'Sign in to manage products' : 'Create an admin account'}</p>
          </div>

          {/* Mode tabs */}
          <div className="flex rounded-xl border border-gray-200 p-1 mb-5">
            {(['signin', 'signup'] as const).map(m => (
              <button key={m} type="button" onClick={() => { setAuthMode(m); setAuthErr(''); setAuthOk(''); }}
                className={`flex-1 py-1.5 rounded-lg text-sm font-semibold transition-colors ${authMode === m ? 'bg-orange-500 text-white' : 'text-gray-500 hover:text-gray-700'}`}>
                {m === 'signin' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
            {authMode === 'signup' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Confirm Password</label>
                <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
            )}
            {authErr && <p className="text-red-500 text-xs">{authErr}</p>}
            {authOk  && <p className="text-green-600 text-xs">{authOk}</p>}
            <button type="submit" disabled={submitting}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg font-bold text-sm disabled:opacity-60 flex items-center justify-center gap-2">
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> {authMode === 'signin' ? 'Signing in…' : 'Creating account…'}</> : (authMode === 'signin' ? 'Sign In' : 'Create Account')}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Dashboard ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
            <Package className="w-4 h-4 text-orange-600" />
          </div>
          <span className="font-black text-gray-900">Reliance Admin</span>
          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">{products.length} products</span>
        </div>
        <button onClick={() => signOut()} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100 px-4 flex gap-1">
        {(['products', 'import'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-3 text-sm font-medium capitalize border-b-2 transition-colors ${tab === t ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t === 'import' ? 'Import CSV' : 'Products'}
          </button>
        ))}
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {tab === 'import' ? (
          <ImportTab onImported={loadProducts} />
        ) : (
          <>
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products…"
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
              <div className="relative">
                <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
                  className="appearance-none border border-gray-200 rounded-lg pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white">
                  <option value="">All categories</option>
                  {Object.values(CATEGORY_MAP).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
              <button onClick={() => setModal('add')}
                className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap">
                <Plus className="w-4 h-4" /> Add Product
              </button>
            </div>

            {/* Table */}
            {fetching ? (
              <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-orange-400" /></div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No products yet</p>
                <p className="text-sm mt-1">Add your first product or import from CSV</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium text-gray-600 w-16">Img</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Price</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Stock</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600 w-24">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filtered.map(p => (
                        <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <img src={p.thumbnail} alt={p.simplified_name || p.model} onError={e => { (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=80&q=60'; }}
                              className="w-10 h-10 object-cover rounded-lg bg-gray-100" />
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900 leading-tight">{p.simplified_name || p.model}</div>
                            <div className="text-xs text-gray-400">{p.brand} · {p.model}</div>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{p.category}</td>
                          <td className="px-4 py-3 font-medium text-gray-900">{fmtPKR(p.price.cash_floor)}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.stock_status === 'In Stock' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                              {p.stock_status}
                            </span>
                            {p.featured && <span className="ml-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Featured</span>}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              <button onClick={() => setModal(p)} className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg" title="Edit">
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button onClick={() => setDeleteId(p.id)} className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg" title="Delete">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Product modal */}
      {modal && (
        <ProductModal
          initial={modal === 'add' ? null : {
            id: (modal as Product).id, brand: (modal as Product).brand, model: (modal as Product).model,
            simplified_name: (modal as Product).simplified_name, category: (modal as Product).category,
            sub_category: (modal as Product).sub_category, retail_price: String((modal as Product).price.cash_floor),
            stock_status: (modal as Product).stock_status,
            featured: (modal as Product).featured, thumbnail_url: (modal as Product).thumbnail,
            description: (modal as Product).description, warranty: (modal as Product).warranty,
            tags: (modal as Product).tags || '', seo_title: (modal as Product).seo?.title, seo_desc: (modal as Product).seo?.description,
          }}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); loadProducts(); }}
        />
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full text-center">
            <Trash2 className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <h3 className="font-bold text-gray-900 mb-2">Delete this product?</h3>
            <p className="text-sm text-gray-500 mb-5">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm font-medium hover:bg-gray-50">Cancel</button>
              <button onClick={() => handleDelete(deleteId!)} disabled={deleting}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-lg py-2 text-sm font-bold disabled:opacity-60 flex items-center justify-center gap-2">
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
