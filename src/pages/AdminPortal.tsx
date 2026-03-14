import { useState, useEffect, useRef, useMemo } from 'react';
import { signIn, signUp } from '@/lib/auth';
import { useAuthStore } from '@/store/authStore';
import {
  getProducts, upsertProduct, deleteProduct,
  uploadBrandImage, updateProductImages, fetchAndUploadOrSaveUrl,
  calcAllPlans, fmtPKR, CATEGORY_MAP,
  processCSVImport, reenrichAllProducts, rematchAllImages, getDataAudit, scanBucket, fixAllCategories,
  composeImages, decomposeImages, logAdminAction, getAuditLog, clearAuditLog,
  type ImportSummary, type CsvImportRow, type Product, type AuditProduct, type BucketScanResult,
  type ProductGalleryImage, type AuditLogEntry,
} from '@/lib/api';
import { buildSearchIndex, adminSearch } from '@/lib/search';
import {
  LogOut, Plus, Pencil, Trash2, Upload, Search, X, Check,
  ChevronDown, ChevronUp, Package, FileUp, Loader2, Sparkles, Image as ImageIcon,
  RefreshCw, AlertTriangle, Camera, ImageOff, Tag, Wand2, ListChecks, MessageCircle,
  CheckSquare, Square, Filter, History, Edit2, Star, MoveUp, MoveDown,
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugify(s: string) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }

/** A product "has an image" if it has any valid URL — not just Supabase Storage. */
function productHasImage(p: { thumbnail?: string }): boolean {
  return !!(p.thumbnail?.startsWith('http'));
}

const STOCK_OPTIONS = ['In Stock', 'Out of Stock', 'Coming Soon', 'Discontinued'];

// ── Shared Confirm Dialog ─────────────────────────────────────────────────────

function ConfirmDialog({
  title, message, confirmLabel = 'Confirm', danger = false,
  onConfirm, onCancel,
}: {
  title: string; message: string; confirmLabel?: string; danger?: boolean;
  onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full space-y-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className={`w-6 h-6 mt-0.5 shrink-0 ${danger ? 'text-red-500' : 'text-amber-500'}`} />
          <div>
            <h3 className="font-bold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500 mt-1 whitespace-pre-line">{message}</p>
          </div>
        </div>
        <div className="flex gap-3 justify-end pt-1">
          <button onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg">
            Cancel
          </button>
          <button onClick={onConfirm}
            className={`px-4 py-2 text-sm font-bold rounded-lg text-white ${danger ? 'bg-red-500 hover:bg-red-600' : 'bg-orange-500 hover:bg-orange-600'}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Compute the bucket path that uploadBrandImage will create */
function bucketPath(brand: string, model: string, isGallery = false) {
  if (!brand || !model) return '';
  const folder    = brand.toLowerCase().replace(/\s+/g, '');
  const modelSafe = model.replace(/[/\\:*?"<>|]/g, '').replace(/\s+/g, '').trim();
  const suffix    = isGallery ? '2' : '1';
  return `${folder}/${modelSafe}_${suffix}.<ext>`;
}

// ── Image Drop Zone ───────────────────────────────────────────────────────────

function ImageDropZone({
  label, currentUrl, pathPreview, onFile, uploading,
}: {
  label: string;
  currentUrl: string;
  pathPreview: string;
  onFile: (f: File) => void;
  uploading: boolean;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) onFile(file);
  }

  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <div
        className={`relative border-2 border-dashed rounded-xl transition-colors cursor-pointer
          ${dragging ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-orange-300 bg-gray-50'}`}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input ref={inputRef} type="file" accept="image/*" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }} />

        {currentUrl ? (
          <div className="flex items-center gap-3 p-3">
            <img src={currentUrl} alt="preview" className="h-16 w-16 object-cover rounded-lg border bg-white flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-700 truncate">Image set</p>
              {pathPreview && <p className="text-[10px] text-gray-400 mt-0.5 font-mono break-all">{pathPreview}</p>}
              <p className="text-[10px] text-orange-500 mt-1">Click or drop to replace</p>
            </div>
            {uploading && (
              <div className="absolute inset-0 bg-white/70 rounded-xl flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-5 gap-1">
            {uploading ? (
              <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
            ) : (
              <Upload className="w-6 h-6 text-gray-300" />
            )}
            <span className="text-xs text-gray-500">{uploading ? 'Uploading…' : 'Drop image or click to browse'}</span>
            {pathPreview && <span className="text-[10px] text-gray-400 font-mono">{pathPreview}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Product Image Manager ─────────────────────────────────────────────────────

function ProductImageManager({
  images, onChange,
}: {
  images: ProductGalleryImage[];
  onChange: (imgs: ProductGalleryImage[]) => void;
}) {
  const [showUrlBox, setShowUrlBox] = useState(false);
  const [urlsText, setUrlsText]     = useState('');
  const [delConfirm, setDelConfirm] = useState<number | null>(null);

  function reindex(imgs: ProductGalleryImage[]): ProductGalleryImage[] {
    return imgs.map((img, i) => ({ ...img, position: i + 1, is_primary: i === 0 }));
  }

  function moveUp(idx: number) {
    if (idx === 0) return;
    const next = [...images];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    onChange(reindex(next));
  }

  function moveDown(idx: number) {
    if (idx === images.length - 1) return;
    const next = [...images];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    onChange(reindex(next));
  }

  function setPrimary(idx: number) {
    const next = [images[idx], ...images.filter((_, i) => i !== idx)];
    onChange(reindex(next));
  }

  function remove(idx: number) {
    const next = images.filter((_, i) => i !== idx);
    onChange(reindex(next));
    setDelConfirm(null);
  }

  function addUrls() {
    const urls = urlsText.split('\n').map(u => u.trim()).filter(u => u.startsWith('http'));
    if (!urls.length) return;
    const existing = new Set(images.map(i => i.url));
    const newImgs = urls.filter(u => !existing.has(u));
    const combined = [
      ...images,
      ...newImgs.map((url, i) => ({
        url,
        position: images.length + i + 1,
        is_primary: images.length === 0 && i === 0,
      })),
    ];
    onChange(reindex(combined));
    setUrlsText(''); setShowUrlBox(false);
  }

  const urlCount = urlsText.split('\n').filter(u => u.trim().startsWith('http')).length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-gray-600">
          Product Images <span className="text-gray-400">({images.length})</span>
        </label>
        <button type="button" onClick={() => setShowUrlBox(v => !v)}
          className="flex items-center gap-1 text-xs text-orange-500 hover:text-orange-700 font-semibold">
          <Plus className="w-3.5 h-3.5" /> Add by URL
        </button>
      </div>

      {showUrlBox && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2">
          <p className="text-[10px] text-gray-400">Paste one URL per line</p>
          <textarea
            value={urlsText} onChange={e => setUrlsText(e.target.value)}
            placeholder={"https://example.com/img1.jpg\nhttps://example.com/img2.jpg"}
            rows={3} autoFocus
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
          />
          <div className="flex gap-2">
            <button type="button" onClick={addUrls} disabled={urlCount === 0}
              className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white text-xs font-bold py-1.5 rounded-lg">
              Add {urlCount > 0 ? urlCount : ''} URL{urlCount !== 1 ? 's' : ''}
            </button>
            <button type="button" onClick={() => { setUrlsText(''); setShowUrlBox(false); }}
              className="px-3 text-xs text-gray-500 hover:text-gray-700">Cancel</button>
          </div>
        </div>
      )}

      {images.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 rounded-xl py-5 text-center text-xs text-gray-400">
          No images yet · use "Add by URL" or drag &amp; drop files below
        </div>
      ) : (
        <div className="space-y-1.5">
          {images.map((img, idx) => (
            <div key={img.url + idx}
              className={`flex items-center gap-2 rounded-xl border p-2 transition-colors
                ${img.is_primary ? 'border-orange-300 bg-orange-50' : 'border-gray-100 bg-white hover:border-gray-200'}`}>
              <span className="text-[10px] text-gray-400 font-mono w-4 text-center shrink-0">{idx + 1}</span>
              <img src={img.url} alt="" className="w-10 h-10 object-cover rounded-lg bg-gray-100 shrink-0"
                onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-gray-500 truncate font-mono">{img.url}</p>
                {img.is_primary && (
                  <span className="inline-flex items-center gap-0.5 text-[9px] text-orange-600 font-bold">
                    <Star className="w-2.5 h-2.5" /> Primary
                  </span>
                )}
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                {!img.is_primary && (
                  <button type="button" onClick={() => setPrimary(idx)}
                    className="text-[9px] font-bold text-orange-500 hover:text-orange-700 px-1.5 py-0.5 bg-orange-50 hover:bg-orange-100 rounded"
                    title="Set as primary">
                    Primary
                  </button>
                )}
                <button type="button" onClick={() => moveUp(idx)} disabled={idx === 0}
                  className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-20" title="Move up">
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => moveDown(idx)} disabled={idx === images.length - 1}
                  className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-20" title="Move down">
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => setDelConfirm(idx)}
                  className="p-1 text-red-400 hover:text-red-600" title="Remove image">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {delConfirm !== null && (
        <ConfirmDialog
          title="Remove this image?"
          message={images[delConfirm]?.is_primary
            ? 'This is the primary image. The next image will become primary.'
            : 'This image will be removed from the gallery.'}
          confirmLabel="Remove"
          danger
          onConfirm={() => remove(delConfirm!)}
          onCancel={() => setDelConfirm(null)}
        />
      )}
    </div>
  );
}

// ── Empty product form ────────────────────────────────────────────────────────

function emptyForm() {
  return {
    id: '', brand: '', model: '', simplified_name: '', category: '', sub_category: '',
    retail_price: '', stock_status: 'In Stock', featured: false,
    images: [] as ProductGalleryImage[],
    description: '', warranty: '', tags: '',
    colors: '', seo_title: '', seo_desc: '',
  };
}

// ── Product Form Modal ────────────────────────────────────────────────────────

function ProductModal({
  initial, onClose, onSaved,
}: { initial: any; onClose: () => void; onSaved: () => void }) {
  const [form, setForm]             = useState<any>(initial || emptyForm());
  const [saving, setSaving]         = useState(false);
  const [err, setErr]               = useState('');
  const [confirmSave, setConfirmSave] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const price = Number(form.retail_price) || 0;
  const plans = price ? calcAllPlans(price) : null;

  // Upload a file and add the resulting URL to the image manager
  async function handleImageFile(file: File, isGallery = false) {
    if (!form.brand || !form.model) { setErr('Set Brand and Model first.'); return; }
    setUploadingFile(true); setErr('');
    try {
      const url = await uploadBrandImage(file, form.brand, form.model, isGallery);
      const existing = (form.images as ProductGalleryImage[]) || [];
      const alreadyHas = existing.some(i => i.url === url);
      if (!alreadyHas) {
        const next = [...existing, { url, position: existing.length + 1, is_primary: existing.length === 0 }];
        set('images', next.map((img, idx) => ({ ...img, position: idx + 1, is_primary: idx === 0 })));
      }
    } catch (e: any) { setErr(e.message); }
    finally { setUploadingFile(false); }
  }

  function requestSave() {
    if (!form.brand || !form.model || !form.category || !form.retail_price) {
      setErr('Brand, Model, Category, and Retail Price are required.'); return;
    }
    if (form.id) { setConfirmSave(true); return; }
    doSave();
  }

  async function doSave() {
    setConfirmSave(false);
    setSaving(true); setErr('');
    try {
      const id = form.id || slugify(`${form.brand}-${form.model}-${Date.now()}`);
      const { images: imgs, ...formRest } = form;
      const { thumbnail_url, gallery_urls } = decomposeImages(imgs || []);
      await upsertProduct({
        ...formRest, id,
        slug: form.id ? form.slug || form.id : id,
        retail_price: Number(form.retail_price),
        thumbnail_url,
        gallery_urls,
      });
      onSaved();
    } catch (e: any) { setErr(e.message); setSaving(false); }
  }

  const thumbPath   = bucketPath(form.brand, form.model, false);
  const galleryPath = bucketPath(form.brand, form.model, true);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl my-4">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-bold text-gray-900 text-lg">{form.id ? 'Edit Product' : 'Add Product'}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 grid grid-cols-2 gap-4 max-h-[75vh] overflow-y-auto">
          {/* Core fields */}
          <Field label="Brand *" value={form.brand} onChange={v => set('brand', v)} placeholder="Haier" />
          <Field label="Model *" value={form.model} onChange={v => set('model', v)} placeholder="HSU-18HNF" />

          <div className="col-span-2">
            <Field label="Simplified Name" value={form.simplified_name} onChange={v => set('simplified_name', v)} placeholder="Haier 1.5 Ton Inverter AC" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Category *</label>
            <select value={form.category} onChange={e => set('category', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
              <option value="">Select category…</option>
              {Object.values(CATEGORY_MAP).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <Field label="Sub-category" value={form.sub_category} onChange={v => set('sub_category', v)} placeholder="DC Inverter" />

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
                  <div className="font-bold text-orange-700">{k}</div>
                  <div className="text-gray-500">Adv {fmtPKR(p.advance)}</div>
                  <div className="text-gray-500">×{p.monthlyPayments} {fmtPKR(p.monthly)}</div>
                </div>
              ))}
            </div>
          )}

          {/* Image Manager */}
          <div className="col-span-2 space-y-3">
            <ProductImageManager
              images={form.images || []}
              onChange={imgs => set('images', imgs)}
            />
            {/* File upload shortcuts */}
            <div className="grid grid-cols-2 gap-2">
              <ImageDropZone
                label="Upload Thumbnail (_1)"
                currentUrl={(form.images as ProductGalleryImage[])?.[0]?.url || ''}
                pathPreview={thumbPath}
                onFile={f => handleImageFile(f, false)}
                uploading={uploadingFile}
              />
              <ImageDropZone
                label="Upload Gallery (_2)"
                currentUrl=""
                pathPreview={galleryPath}
                onFile={f => handleImageFile(f, true)}
                uploading={uploadingFile}
              />
            </div>
          </div>

          {/* Other fields */}
          <div className="col-span-2">
            <Field label="Description" value={form.description} onChange={v => set('description', v)} multiline />
          </div>
          <Field label="Warranty" value={form.warranty} onChange={v => set('warranty', v)} placeholder="5 years compressor" />
          <Field label="Colors" value={form.colors} onChange={v => set('colors', v)} placeholder="White, Silver" />
          <Field label="Tags" value={form.tags} onChange={v => set('tags', v)} placeholder="inverter, 1.5 ton" />
          <Field label="SEO Title" value={form.seo_title} onChange={v => set('seo_title', v)} />
          <div className="col-span-2">
            <Field label="SEO Description" value={form.seo_desc} onChange={v => set('seo_desc', v)} />
          </div>

          <div className="col-span-2 flex items-center gap-2">
            <input type="checkbox" id="featured" checked={!!form.featured} onChange={e => set('featured', e.target.checked)}
              className="w-4 h-4 accent-orange-500" />
            <label htmlFor="featured" className="text-sm font-medium text-gray-700">Featured product (shown on homepage)</label>
          </div>
        </div>

        {err && <p className="px-5 pb-2 text-red-500 text-sm">{err}</p>}

        <div className="flex justify-end gap-3 p-5 border-t">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
          <button onClick={requestSave} disabled={saving}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-5 py-2 rounded-lg text-sm font-bold disabled:opacity-60">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {saving ? 'Saving…' : 'Save Product'}
          </button>
        </div>
      </div>
      {confirmSave && (
        <ConfirmDialog
          title="Save changes to this product?"
          message={`You are about to overwrite the existing data for:\n${form.brand} — ${form.model}`}
          confirmLabel="Yes, Save"
          onConfirm={doSave}
          onCancel={() => setConfirmSave(false)}
        />
      )}
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

// ── Quick Image Upload (inline per-product) ───────────────────────────────────

function QuickImageUpload({
  product, onDone, onCancel,
}: { product: Product; onDone: () => void; onCancel: () => void }) {
  const [mode, setMode]         = useState<'file' | 'url'>('url');
  const [uploading, setUploading] = useState(false);
  const [err, setErr]           = useState('');
  const [done, setDone]         = useState(false);
  const [dragging, setDragging] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [notice, setNotice]     = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const path = bucketPath(product.brand, product.model, false);

  async function uploadFile(file: File) {
    setUploading(true); setErr('');
    try {
      const url = await uploadBrandImage(file, product.brand, product.model, false);
      await updateProductImages(product.id, url);
      setNotice('Saved to Supabase Storage ✓');
      setDone(true);
      setTimeout(onDone, 900);
    } catch (e: any) { setErr(e.message); setUploading(false); }
  }

  async function handleUrl() {
    const urls = urlInput.split('\n').map(u => u.trim()).filter(u => u.startsWith('http'));
    if (!urls.length) return;
    setUploading(true); setErr('');
    try {
      // Save first URL as primary, rest appended to gallery
      const results = await Promise.allSettled(
        urls.map(url => fetchAndUploadOrSaveUrl(url, product.id, product.brand, product.model))
      );
      const saved = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      setNotice(`${saved} image${saved !== 1 ? 's' : ''} saved${failed ? ` · ${failed} failed` : ''} ✓`);
      setDone(true);
      setTimeout(onDone, 1200);
    } catch (e: any) { setErr(e.message); setUploading(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl p-5 w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="font-bold text-gray-900 text-sm">{product.brand} · {product.model}</p>
            <p className="text-[10px] text-gray-400 font-mono mt-0.5">{path}</p>
          </div>
          <button onClick={onCancel} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
        </div>

        {done ? (
          <div className="flex flex-col items-center py-6 gap-2 text-green-600">
            <Check className="w-8 h-8" />
            <span className="text-sm font-medium">{notice || 'Image updated!'}</span>
          </div>
        ) : (
          <>
            {/* Mode tabs */}
            <div className="flex rounded-lg border border-gray-200 p-0.5 mb-3 text-xs font-semibold">
              <button onClick={() => setMode('url')}
                className={`flex-1 py-1.5 rounded-md transition-colors ${mode === 'url' ? 'bg-orange-500 text-white' : 'text-gray-500 hover:text-gray-700'}`}>
                Paste URL
              </button>
              <button onClick={() => setMode('file')}
                className={`flex-1 py-1.5 rounded-md transition-colors ${mode === 'file' ? 'bg-orange-500 text-white' : 'text-gray-500 hover:text-gray-700'}`}>
                Upload File
              </button>
            </div>

            {mode === 'url' ? (
              <div className="space-y-2">
                <textarea
                  value={urlInput} onChange={e => setUrlInput(e.target.value)}
                  placeholder={"https://example.com/img1.jpg\nhttps://example.com/img2.jpg\n(one URL per line)"}
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  autoFocus
                />
                <p className="text-[10px] text-gray-400">Paste one or more image URLs (one per line). Each will be saved — fetched to storage or stored as URL.</p>
                <button onClick={handleUrl} disabled={!urlInput.trim() || uploading}
                  className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-bold">
                  {uploading ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : 'Save Image(s)'}
                </button>
              </div>
            ) : (
              <div
                className={`border-2 border-dashed rounded-xl cursor-pointer transition-colors flex flex-col items-center justify-center py-8 gap-2
                  ${dragging ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-orange-300'}`}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) uploadFile(f); }}
                onClick={() => inputRef.current?.click()}
              >
                <input ref={inputRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f); }} />
                {uploading
                  ? <><Loader2 className="w-6 h-6 animate-spin text-orange-500" /><span className="text-xs text-gray-500">Uploading…</span></>
                  : <><Camera className="w-6 h-6 text-gray-300" /><span className="text-xs text-gray-500">Drop image or click to browse</span></>}
              </div>
            )}

            {err && <p className="mt-2 text-xs text-red-500">{err}</p>}
          </>
        )}
      </div>
    </div>
  );
}

// ── Fix Queue (sequential upload for missing images) ──────────────────────────

function FixQueue({ missing, onDone, onRefresh }: {
  missing: Product[]; onDone: () => void; onRefresh: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [err, setErr]             = useState('');
  const [doneIds, setDoneIds]     = useState<Set<string>>(new Set());
  const [dragging, setDragging]   = useState(false);
  const [mode, setMode]           = useState<'url' | 'file'>('url');
  const [urlInput, setUrlInput]   = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const queue   = missing.filter(p => !doneIds.has(p.id));
  const current = queue[0] ?? null;
  const total   = missing.length;
  const done    = doneIds.size;

  function advance() {
    if (!current) return;
    setDoneIds(prev => new Set([...prev, current.id]));
    setUrlInput(''); setErr('');
    onRefresh();
  }

  async function uploadFile(file: File) {
    if (!current) return;
    setUploading(true); setErr('');
    try {
      const url = await uploadBrandImage(file, current.brand, current.model, false);
      await updateProductImages(current.id, url);
      advance();
    } catch (e: any) { setErr(e.message); }
    finally { setUploading(false); }
  }

  async function handleUrl() {
    if (!current || !urlInput.trim()) return;
    setUploading(true); setErr('');
    try {
      await fetchAndUploadOrSaveUrl(urlInput.trim(), current.id, current.brand, current.model);
      advance();
    } catch (e: any) { setErr(e.message); }
    finally { setUploading(false); }
  }

  if (!current) {
    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center max-w-sm w-full">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-7 h-7 text-green-600" />
          </div>
          <h3 className="font-black text-gray-900 text-lg">Queue complete!</h3>
          <p className="text-gray-500 text-sm mt-1">{done} image{done !== 1 ? 's' : ''} uploaded.</p>
          <button onClick={onDone} className="mt-5 w-full bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg font-bold text-sm">Done</button>
        </div>
      </div>
    );
  }

  const pct = Math.round((done / total) * 100);
  const path = bucketPath(current.brand, current.model, false);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <div className="text-xs text-gray-400 font-medium">{done} done · {queue.length} remaining</div>
            <h3 className="font-black text-gray-900 text-base mt-0.5">{current.brand} — {current.model}</h3>
            {current.simplified_name && <div className="text-xs text-gray-500">{current.simplified_name}</div>}
          </div>
          <button onClick={onDone} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
        </div>

        {/* Progress bar */}
        <div className="mx-5 mb-4 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-orange-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>

        {/* Mode tabs + upload zone */}
        <div className="px-5 pb-3 space-y-3">
          <div className="text-[10px] text-gray-400 font-mono">{path}</div>

          <div className="flex rounded-lg border border-gray-200 p-0.5 text-xs font-semibold">
            <button onClick={() => setMode('url')}
              className={`flex-1 py-1.5 rounded-md transition-colors ${mode === 'url' ? 'bg-orange-500 text-white' : 'text-gray-500 hover:text-gray-700'}`}>
              Paste URL
            </button>
            <button onClick={() => setMode('file')}
              className={`flex-1 py-1.5 rounded-md transition-colors ${mode === 'file' ? 'bg-orange-500 text-white' : 'text-gray-500 hover:text-gray-700'}`}>
              Upload File
            </button>
          </div>

          {mode === 'url' ? (
            <div className="space-y-2">
              <input
                type="text" value={urlInput} onChange={e => setUrlInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleUrl()}
                placeholder="https://example.com/image.jpg"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                autoFocus
              />
              <button onClick={handleUrl} disabled={!urlInput.trim() || uploading}
                className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-bold">
                {uploading ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : 'Save Image'}
              </button>
            </div>
          ) : (
            <div
              className={`border-2 border-dashed rounded-xl cursor-pointer transition-colors flex flex-col items-center justify-center py-8 gap-2
                ${dragging ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-orange-300 bg-gray-50'}`}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) uploadFile(f); }}
              onClick={() => !uploading && inputRef.current?.click()}
            >
              <input ref={inputRef} type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = ''; }} />
              {uploading
                ? <><Loader2 className="w-7 h-7 animate-spin text-orange-400" /><span className="text-sm text-gray-400">Uploading…</span></>
                : <><Camera className="w-7 h-7 text-gray-300" /><span className="text-sm text-gray-500">Drop image or click to browse</span></>}
            </div>
          )}

          {err && <p className="text-xs text-red-500">{err}</p>}
        </div>

        {/* Footer: skip + upcoming */}
        <div className="px-5 pb-5 flex items-center gap-3">
          <button onClick={() => { setDoneIds(prev => new Set([...prev, current.id])); setUrlInput(''); setErr(''); }}
            className="flex-1 border border-gray-200 hover:bg-gray-50 text-gray-600 py-2 rounded-lg text-sm font-medium">
            Skip
          </button>
          {queue[1] && (
            <div className="flex-1 text-xs text-gray-400 truncate">
              Next: <span className="font-medium text-gray-600">{queue[1].brand} {queue[1].model}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Images Tab ────────────────────────────────────────────────────────────────

function ImagesTab({ products, onRefresh }: { products: Product[]; onRefresh: () => void }) {
  const [brandFilter, setBrandFilter]     = useState('');
  const [missingOnly, setMissingOnly]     = useState(false);
  const [quickImg, setQuickImg]           = useState<Product | null>(null);
  const [rematching, setRematching]       = useState(false);
  const [rematchResult, setRematchResult] = useState<{ found: number; missing: number } | null>(null);
  const [fixQueueOpen, setFixQueueOpen]   = useState(false);
  const [confirmRematch, setConfirmRematch] = useState(false);

  const brands = [...new Set(products.map(p => p.brand))].sort();

  const hasImg = productHasImage;

  const missingProducts = products.filter(p => !hasImg(p));

  const filtered = products
    .filter(p => !brandFilter || p.brand === brandFilter)
    .filter(p => !missingOnly || !hasImg(p));

  const totalWithImg = products.filter(hasImg).length;
  const totalMissing = missingProducts.length;

  async function handleRematch() {
    setRematching(true); setRematchResult(null);
    const r = await rematchAllImages(() => {});
    setRematchResult(r); setRematching(false); onRefresh();
  }

  return (
    <div className="max-w-6xl mx-auto py-6 space-y-4">
      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="text-2xl font-black text-green-600">{totalWithImg}</div>
          <div className="text-xs text-gray-500 mt-0.5">Products with images</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className={`text-2xl font-black ${totalMissing > 0 ? 'text-amber-500' : 'text-gray-300'}`}>{totalMissing}</div>
          <div className="text-xs text-gray-500 mt-0.5">Missing images</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="text-2xl font-black text-gray-900">{products.length ? ((totalWithImg / products.length) * 100).toFixed(0) : 0}%</div>
          <div className="text-xs text-gray-500 mt-0.5">Match rate</div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        <select value={brandFilter} onChange={e => setBrandFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white">
          <option value="">All brands</option>
          {brands.map(b => <option key={b}>{b}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" checked={missingOnly} onChange={e => setMissingOnly(e.target.checked)} className="accent-orange-500" />
          Missing only
        </label>
        <div className="flex-1" />
        {totalMissing > 0 && (
          <button onClick={() => setFixQueueOpen(true)}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-bold">
            <Camera className="w-4 h-4" />
            Fix {totalMissing} Missing →
          </button>
        )}
        <button onClick={() => setConfirmRematch(true)} disabled={rematching}
          className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 disabled:opacity-60 text-white px-4 py-2 rounded-lg text-sm font-bold">
          {rematching ? <><Loader2 className="w-4 h-4 animate-spin" />Re-matching…</> : <><RefreshCw className="w-4 h-4" />Auto Re-match</>}
        </button>
      </div>

      {rematchResult && (
        <p className={`text-sm font-medium ${rematchResult.missing > 0 ? 'text-amber-600' : 'text-green-600'}`}>
          Re-match done: {rematchResult.found} matched · {rematchResult.missing} still missing
        </p>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 text-xs font-medium text-gray-500">
          Showing {filtered.length} products
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600 w-16">Img</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Brand / Model</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Simplified Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Expected path</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 w-28">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 w-20">Upload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(p => {
                const hasImage = hasImg(p);
                const path = bucketPath(p.brand, p.model, false);
                return (
                  <tr key={p.id} className={`transition-colors ${hasImage ? 'hover:bg-gray-50' : 'hover:bg-amber-50 bg-amber-50/40'}`}>
                    <td className="px-4 py-3">
                      {hasImage
                        ? <img src={p.thumbnail} alt={p.model} className="w-10 h-10 object-cover rounded-lg border bg-gray-100" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                        : <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center"><ImageOff className="w-5 h-5 text-gray-300" /></div>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">{p.brand}</div>
                      <div className="text-xs text-gray-400">{p.model}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{p.simplified_name || '—'}</td>
                    <td className="px-4 py-3 text-[10px] text-gray-400 font-mono">{path}</td>
                    <td className="px-4 py-3">
                      {hasImage
                        ? <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Has image</span>
                        : <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">Missing</span>}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => setQuickImg(p)}
                        className="flex items-center gap-1 text-xs bg-orange-50 hover:bg-orange-100 text-orange-600 font-medium px-2 py-1.5 rounded-lg transition-colors">
                        <Camera className="w-3.5 h-3.5" />
                        Upload
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {quickImg && (
        <QuickImageUpload
          product={quickImg}
          onDone={() => { setQuickImg(null); onRefresh(); }}
          onCancel={() => setQuickImg(null)}
        />
      )}

      {fixQueueOpen && (
        <FixQueue
          missing={missingProducts}
          onRefresh={onRefresh}
          onDone={() => { setFixQueueOpen(false); onRefresh(); }}
        />
      )}
      {confirmRematch && (
        <ConfirmDialog
          title="Auto Re-match All Images?"
          message="This will scan the storage bucket and update thumbnail/gallery URLs for every product."
          confirmLabel="Yes, Re-match"
          onConfirm={() => { setConfirmRematch(false); handleRematch(); }}
          onCancel={() => setConfirmRematch(false)}
        />
      )}
    </div>
  );
}

// ── CSV Import Tab ────────────────────────────────────────────────────────────

const HEADER_MAP: Record<string, string> = {
  brand: 'Brand', 'brand name': 'Brand',
  model: 'Model', 'model number': 'Model', 'model no': 'Model',
  category: 'Category', 'product category': 'Category',
  retail_price: 'Retail_Price', 'retail price': 'Retail_Price',
  price: 'Retail_Price', 'mrp': 'Retail_Price', 'cash price': 'Retail_Price',
};

function normalizeHeader(h: string): string {
  const clean = h.toLowerCase().replace(/^\uFEFF/, '').trim();
  return HEADER_MAP[clean] || h.trim();
}

function splitCSVLine(line: string): string[] {
  const cells: string[] = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') { inQ = false; }
      else { cur += ch; }
    } else {
      if (ch === '"') { inQ = true; }
      else if (ch === ',') { cells.push(cur.trim()); cur = ''; }
      else { cur += ch; }
    }
  }
  cells.push(cur.trim());
  return cells;
}

function parseCSV(text: string): CsvImportRow[] {
  const normalized = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  const lines = normalized.split('\n');
  if (lines.length < 2) return [];
  const headers = splitCSVLine(lines[0]).map(h => normalizeHeader(h));
  return lines.slice(1)
    .filter(line => line.trim())
    .map(line => {
      const vals = splitCSVLine(line);
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => { obj[h] = vals[i] ?? ''; });
      return obj as CsvImportRow;
    });
}

const VALID_CATEGORIES = [
  'Air Conditioners', 'Refrigerators', 'Freezers', 'Washing Machines', 'Televisions',
  'Solar Solutions', 'Kitchen Appliances', 'Water Dispensers', 'Vacuum Cleaners', 'Small Appliances',
];

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-3 flex justify-between items-center">
      <span className="text-gray-600 text-sm">{label}</span>
      <span className={`font-bold text-lg ${color}`}>{value}</span>
    </div>
  );
}

function ImportTab({ onImported }: { onImported: () => void }) {
  const [rows, setRows]         = useState<CsvImportRow[]>([]);
  const [progress, setProgress] = useState<string>('');
  const [summary, setSummary]   = useState<ImportSummary | null>(null);
  const [err, setErr]           = useState('');

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      setRows(parseCSV(text));
      setSummary(null); setErr(''); setProgress('');
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    if (rows.length === 0) return;
    setErr(''); setSummary(null);
    try {
      const result = await processCSVImport(rows, msg => setProgress(msg));
      setSummary(result);
      if (result.errors.length > 0) {
        setErr(result.errors.slice(0, 5).join('\n') + (result.errors.length > 5 ? `\n…and ${result.errors.length - 5} more` : ''));
      }
      onImported();
    } catch (e: any) {
      setErr('Import failed: ' + e.message);
    } finally {
      setProgress('');
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="bg-blue-50 rounded-2xl p-6 mb-6">
        <h3 className="font-bold text-gray-900 mb-1">Minimal CSV Import — 4 columns only</h3>
        <p className="text-sm text-gray-600 mb-3">Everything else (name, warranty, description, tags, SEO, images, installment plans) is auto-generated.</p>
        <div className="bg-white rounded-lg border border-blue-200 p-3 font-mono text-xs text-gray-700 mb-3 overflow-x-auto">
          Brand,Model,Category,Retail_Price<br />
          Haier,HSU-18HNF,Air Conditioners,148500<br />
          Dawlance,9160 WB,Refrigerators,121000
        </div>
        <div className="text-xs text-gray-500 space-y-1">
          <p><strong>Valid Category values:</strong></p>
          <p className="text-gray-400">{VALID_CATEGORIES.join(' · ')}</p>
          <p className="mt-2 text-amber-600">Products absent from 2 consecutive imports will be marked <strong>Discontinued</strong>.</p>
        </div>
      </div>

      <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 hover:border-orange-400 rounded-2xl p-10 cursor-pointer transition-colors">
        <FileUp className="w-10 h-10 text-gray-400 mb-3" />
        <span className="font-medium text-gray-700">Click to choose CSV file</span>
        <span className="text-sm text-gray-400 mt-1">or drag and drop</span>
        <input type="file" accept=".csv" className="hidden" onChange={handleFile} />
      </label>

      {rows.length > 0 && !summary && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-700">{rows.length} rows detected — preview:</p>
            <button onClick={handleImport} disabled={!!progress}
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-5 py-2 rounded-lg text-sm font-bold disabled:opacity-60">
              {progress
                ? <><Loader2 className="w-4 h-4 animate-spin" /> {progress}</>
                : <><Upload className="w-4 h-4" /> Import {rows.length} Products</>}
            </button>
          </div>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="text-xs w-full">
              <thead className="bg-gray-50">
                <tr>{['Brand', 'Model', 'Category', 'Retail_Price'].map(h =>
                  <th key={h} className="text-left px-3 py-2 font-medium text-gray-600">{h}</th>)}</tr>
              </thead>
              <tbody>
                {rows.slice(0, 5).map((r, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    {['Brand', 'Model', 'Category', 'Retail_Price'].map(h =>
                      <td key={h} className="px-3 py-2 text-gray-700 truncate max-w-[140px]">{r[h] || '—'}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {err && <p className="mt-3 text-red-500 text-sm whitespace-pre-line">{err}</p>}
        </div>
      )}

      {summary && (
        <div className="mt-6 bg-green-50 rounded-2xl p-6 space-y-4">
          <h4 className="font-bold text-gray-900">Import Complete</h4>
          <div className="grid grid-cols-2 gap-3">
            <SummaryCard label="Added"          value={summary.added}         color="text-green-700"  />
            <SummaryCard label="Updated"        value={summary.updated}       color="text-blue-700"   />
            <SummaryCard label="Discontinued"   value={summary.discontinued}  color="text-red-600"    />
            <SummaryCard label="Images Found"   value={summary.imagesFound}   color="text-purple-700" />
            <SummaryCard label="Images Missing" value={summary.imagesMissing} color={summary.imagesMissing > 0 ? 'text-amber-600' : 'text-gray-400'} />
          </div>
          {err && (
            <div className="bg-red-50 rounded-lg p-3">
              <p className="text-xs font-medium text-red-600 mb-1">Errors:</p>
              <p className="text-xs text-red-500 whitespace-pre-line">{err}</p>
            </div>
          )}
          <button onClick={() => { setRows([]); setSummary(null); setErr(''); }}
            className="text-sm text-gray-500 hover:text-gray-800 underline">Import another file</button>
        </div>
      )}
    </div>
  );
}

// ── Inline Audit Fix (quick edit of missing fields for one product) ───────────

function InlineAuditFix({ product, missingFields, onDone }: {
  product: Product; missingFields: string[]; onDone: () => void;
}) {
  const [vals, setVals] = useState<Record<string, string>>({
    simplified_name: product.simplified_name || '',
    warranty:        product.warranty || '',
    description:     product.description || '',
    tags:            product.tags || '',
    seo_title:       product.seo?.title || '',
    seo_desc:        product.seo?.description || '',
  });
  const [saving, setSaving]     = useState(false);
  const [err, setErr]           = useState('');
  const [quickImg, setQuickImg] = useState(false);
  const [confirmFix, setConfirmFix] = useState(false);

  const set = (k: string, v: string) => setVals(prev => ({ ...prev, [k]: v }));

  // Map audit field name → form keys to show
  const FIELD_INPUTS: Record<string, { key: string; label: string; multiline?: boolean }[]> = {
    Name:    [{ key: 'simplified_name', label: 'Simplified Name' }],
    Desc:    [{ key: 'description',     label: 'Description', multiline: true }],
    Warranty:[{ key: 'warranty',        label: 'Warranty' }],
    Tags:    [{ key: 'tags',            label: 'Tags' }],
    SEO:     [{ key: 'seo_title', label: 'SEO Title' }, { key: 'seo_desc', label: 'SEO Description' }],
  };

  const fields = missingFields.flatMap(f => FIELD_INPUTS[f] || []);
  const needsImage = missingFields.includes('Image');

  async function save() {
    setSaving(true); setErr('');
    try {
      await upsertProduct({
        id: product.id,
        brand: product.brand, model: product.model, slug: product.slug || product.id,
        category: product.category, sub_category: product.sub_category,
        retail_price: product.price.retail || product.price.cash_floor,
        stock_status: product.stock_status, featured: product.featured,
        thumbnail_url: product.thumbnail,
        simplified_name: vals.simplified_name,
        warranty: vals.warranty, description: vals.description,
        tags: vals.tags,
        seo_title: vals.seo_title, seo_desc: vals.seo_desc,
      });
      onDone();
    } catch (e: any) { setErr(e.message); setSaving(false); }
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-blue-800">Fixing: {product.brand} · {product.model}</p>
        <button onClick={onDone} className="text-blue-400 hover:text-blue-700"><X className="w-3.5 h-3.5" /></button>
      </div>

      {needsImage && (
        <>
          {quickImg ? (
            <QuickImageUpload
              product={product}
              onDone={() => { setQuickImg(false); onDone(); }}
              onCancel={() => setQuickImg(false)}
            />
          ) : (
            <button onClick={() => setQuickImg(true)}
              className="flex items-center gap-2 w-full justify-center border-2 border-dashed border-blue-300 hover:border-orange-400 rounded-lg py-3 text-sm text-blue-600 hover:text-orange-600 font-medium transition-colors">
              <Camera className="w-4 h-4" /> Upload Image
            </button>
          )}
        </>
      )}

      {fields.map(f => (
        <div key={f.key}>
          <label className="block text-[10px] font-semibold text-blue-700 mb-1">{f.label}</label>
          {f.multiline
            ? <textarea value={vals[f.key]} onChange={e => set(f.key, e.target.value)} rows={2}
                className="w-full border border-blue-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white" />
            : <input value={vals[f.key]} onChange={e => set(f.key, e.target.value)}
                className="w-full border border-blue-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white" />}
        </div>
      ))}

      {fields.length > 0 && (
        <>
          {err && <p className="text-red-500 text-xs">{err}</p>}
          <div className="flex gap-2 justify-end">
            <button onClick={onDone} className="text-xs text-gray-500 hover:text-gray-800 px-3 py-1.5">Cancel</button>
            <button onClick={() => setConfirmFix(true)} disabled={saving}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-bold px-4 py-1.5 rounded-lg">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </>
      )}
      {confirmFix && (
        <ConfirmDialog
          title="Save changes to this product?"
          message={`${product.brand} — ${product.model}`}
          confirmLabel="Yes, Save"
          onConfirm={() => { setConfirmFix(false); save(); }}
          onCancel={() => setConfirmFix(false)}
        />
      )}
    </div>
  );
}

// ── Bulk Edit Panel ───────────────────────────────────────────────────────────

type BulkField = 'images' | 'name' | 'description' | 'specs' | 'price' | 'category' | 'sub_category' | 'tags';
type BulkAction = 'replace' | 'append' | 'merge';
type ImageOp    = 'add' | 'replace_primary';

const BULK_FIELDS: { id: BulkField; label: string }[] = [
  { id: 'images',      label: 'Images' },
  { id: 'name',        label: 'Name' },
  { id: 'description', label: 'Description' },
  { id: 'specs',       label: 'Specifications' },
  { id: 'price',       label: 'Price' },
  { id: 'category',    label: 'Category' },
  { id: 'sub_category',label: 'Sub-category' },
  { id: 'tags',        label: 'Tags' },
];

function BulkEditPanel({
  selectedIds, products, onClose, onDone,
}: {
  selectedIds: Set<string>; products: Product[];
  onClose: () => void; onDone: () => void;
}) {
  const [field,    setField]    = useState<BulkField>('images');
  const [action,   setAction]   = useState<BulkAction>('replace');
  const [value,    setValue]    = useState('');
  const [specKey,  setSpecKey]  = useState('');
  const [specVal,  setSpecVal]  = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageOp,  setImageOp]  = useState<ImageOp>('add');
  const [saving,   setSaving]   = useState(false);
  const [progress, setProgress] = useState('');
  const [result,   setResult]   = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const selectedProducts = products.filter(p => selectedIds.has(p.id));
  const n = selectedProducts.length;

  function switchField(f: BulkField) {
    setField(f); setValue(''); setAction('replace');
    setSpecKey(''); setSpecVal(''); setImageUrl(''); setResult(null);
  }

  function isValid(): boolean {
    if (saving) return false;
    if (field === 'images') return imageUrl.startsWith('http');
    if (field === 'specs') return !!specKey.trim() && !!specVal.trim();
    return !!value.trim();
  }

  async function apply() {
    setSaving(true); setResult(null); setProgress('');
    let done = 0;
    const errors: string[] = [];
    const BATCH = 50;
    const ids = [...selectedIds];
    try {
      for (let i = 0; i < ids.length; i += BATCH) {
        const batchIds = ids.slice(i, i + BATCH);
        setProgress(`Processing ${i + 1}–${Math.min(i + BATCH, ids.length)} of ${ids.length}…`);
        for (const id of batchIds) {
          const p = products.find(pr => pr.id === id);
          if (!p) continue;
          try {
            const patch: Record<string, any> = { id: p.id, slug: p.slug || p.id };
            if (field === 'name') {
              patch.simplified_name = value;
            } else if (field === 'description') {
              patch.description = action === 'append'
                ? [p.description, value].filter(Boolean).join('\n') : value;
            } else if (field === 'price') {
              patch.retail_price = Number(value);
            } else if (field === 'category') {
              patch.category = value;
            } else if (field === 'sub_category') {
              patch.sub_category = value;
            } else if (field === 'tags') {
              patch.tags = action === 'append'
                ? [p.tags, value].filter(Boolean).join(', ') : value;
            } else if (field === 'specs') {
              patch.specs = action === 'merge'
                ? { ...(p.specs || {}), [specKey]: specVal }
                : { [specKey]: specVal };
            } else if (field === 'images') {
              if (imageOp === 'replace_primary') {
                patch.thumbnail_url = imageUrl;
              } else {
                // add to gallery
                const existingGallery = p.gallery || [];
                if (!existingGallery.includes(imageUrl) && p.thumbnail !== imageUrl) {
                  if (!p.thumbnail?.startsWith('http')) {
                    patch.thumbnail_url = imageUrl;
                  } else {
                    patch.gallery_urls = [...existingGallery, imageUrl];
                  }
                }
              }
            }
            await upsertProduct(patch);
            done++;
          } catch (e: any) { errors.push(`${p.brand} ${p.model}: ${e.message}`); }
        }
      }
      logAdminAction({
        action: `Bulk Edit: ${field}`,
        productsAffected: done,
        fields: [field],
        details: field === 'images'
          ? imageOp : (action !== 'replace' ? action : undefined),
      });
      const msg = errors.length
        ? `Updated ${done}, ${errors.length} error(s): ${errors.slice(0, 2).join('; ')}`
        : `Updated ${done} product${done !== 1 ? 's' : ''} successfully.`;
      setResult(msg);
    } catch (e: any) {
      setResult(`Error: ${e.message}`);
    } finally {
      setSaving(false); setProgress('');
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
          <div>
            <h2 className="font-black text-gray-900">Bulk Edit</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {n} product{n !== 1 ? 's' : ''} selected
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Field selector */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Field to Update</p>
            <div className="flex flex-wrap gap-1.5">
              {BULK_FIELDS.map(f => (
                <button key={f.id} type="button" onClick={() => switchField(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors
                    ${field === f.id ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Images */}
          {field === 'images' && (
            <div className="space-y-3">
              <div className="flex gap-2">
                {(['add', 'replace_primary'] as ImageOp[]).map(op => (
                  <button key={op} type="button" onClick={() => setImageOp(op)}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors
                      ${imageOp === op ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {op === 'add' ? 'Add to Gallery' : 'Replace Primary'}
                  </button>
                ))}
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Image URL</label>
                <input type="text" value={imageUrl} onChange={e => setImageUrl(e.target.value)}
                  placeholder="https://example.com/product.jpg"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                {imageUrl.startsWith('http') && (
                  <img src={imageUrl} alt="preview"
                    className="mt-2 w-16 h-16 object-cover rounded-lg border bg-gray-50"
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                )}
              </div>
              {imageOp === 'replace_primary' && (
                <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                  This will replace the primary (position 1) image on all {n} selected products.
                </p>
              )}
            </div>
          )}

          {/* Description */}
          {field === 'description' && (
            <div className="space-y-3">
              <div className="flex gap-2">
                {(['replace', 'append'] as BulkAction[]).map(a => (
                  <button key={a} type="button" onClick={() => setAction(a)}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors
                      ${action === a ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {a === 'replace' ? 'Replace' : 'Append'}
                  </button>
                ))}
              </div>
              <textarea value={value} onChange={e => setValue(e.target.value)} rows={4}
                placeholder={action === 'append'
                  ? 'Text to append to existing descriptions…'
                  : 'New description for all selected products…'}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
          )}

          {/* Specifications */}
          {field === 'specs' && (
            <div className="space-y-3">
              <div className="flex gap-2">
                {(['merge', 'replace'] as BulkAction[]).map(a => (
                  <button key={a} type="button" onClick={() => setAction(a)}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors
                      ${action === a ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {a === 'merge' ? 'Merge (keep existing)' : 'Replace all specs'}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Spec Key</label>
                  <input type="text" value={specKey} onChange={e => setSpecKey(e.target.value)}
                    placeholder="motor_power"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Value</label>
                  <input type="text" value={specVal} onChange={e => setSpecVal(e.target.value)}
                    placeholder="1200W"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                </div>
              </div>
              {action === 'replace' && (
                <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
                  "Replace all" will discard every existing spec on each product.
                </p>
              )}
            </div>
          )}

          {/* Tags */}
          {field === 'tags' && (
            <div className="space-y-3">
              <div className="flex gap-2">
                {(['replace', 'append'] as BulkAction[]).map(a => (
                  <button key={a} type="button" onClick={() => setAction(a)}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors
                      ${action === a ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {a === 'replace' ? 'Replace' : 'Append'}
                  </button>
                ))}
              </div>
              <input type="text" value={value} onChange={e => setValue(e.target.value)}
                placeholder="inverter, energy saving, wifi"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
          )}

          {/* Category dropdown */}
          {field === 'category' && (
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">New Category</label>
              <select value={value} onChange={e => setValue(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white">
                <option value="">Select category…</option>
                {Object.values(CATEGORY_MAP).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}

          {/* Text / number fields */}
          {(field === 'name' || field === 'sub_category' || field === 'price') && (
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">
                {field === 'price' ? 'New Retail Price (PKR)' : `New ${field.replace('_', ' ')}`}
              </label>
              <input
                type={field === 'price' ? 'number' : 'text'}
                value={value} onChange={e => setValue(e.target.value)}
                placeholder={field === 'price' ? '85000' : ''}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
          )}

          {/* Product preview */}
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs font-semibold text-gray-500 mb-2">
              Affects {n} product{n !== 1 ? 's' : ''}:
            </p>
            <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
              {selectedProducts.slice(0, 20).map(p => (
                <span key={p.id}
                  className="text-[10px] bg-white border border-gray-200 rounded px-2 py-0.5 text-gray-600 truncate max-w-[160px]">
                  {p.simplified_name || `${p.brand} ${p.model}`}
                </span>
              ))}
              {n > 20 && <span className="text-[10px] text-gray-400 self-center">+{n - 20} more</span>}
            </div>
          </div>

          {progress && (
            <p className="text-xs text-blue-600 font-mono bg-blue-50 rounded-lg px-3 py-2">{progress}</p>
          )}
          {result && (
            <p className={`text-xs font-medium rounded-lg px-3 py-2 ${
              result.startsWith('Error') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
              {result}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 pb-5 pt-2 border-t border-gray-100 sticky bottom-0 bg-white">
          <button onClick={onClose}
            className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 py-2.5 rounded-xl text-sm font-medium">
            {result ? 'Close' : 'Cancel'}
          </button>
          {!result && (
            <button onClick={() => setConfirmOpen(true)} disabled={!isValid()}
              className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2">
              {saving
                ? <><Loader2 className="w-4 h-4 animate-spin" />Applying…</>
                : `Apply to ${n} Products`}
            </button>
          )}
          {result && !result.startsWith('Error') && (
            <button onClick={() => { onDone(); onClose(); }}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-xl text-sm font-bold">
              Done &amp; Refresh
            </button>
          )}
        </div>
      </div>

      {confirmOpen && (
        <ConfirmDialog
          title={`Apply changes to ${n} products?`}
          message={`Field: ${BULK_FIELDS.find(f => f.id === field)?.label ?? field}\n${
            field === 'images' ? `Action: ${imageOp === 'add' ? 'Add to gallery' : 'Replace primary'}`
            : field === 'specs' ? `Key: ${specKey} = ${specVal}\nMode: ${action}`
            : `Value: ${value.slice(0, 80)}${value.length > 80 ? '…' : ''}`
          }\n\nThis will update ${n} product${n !== 1 ? 's' : ''}.`}
          confirmLabel="Yes, Apply"
          onConfirm={() => { setConfirmOpen(false); apply(); }}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
    </div>
  );
}

// ── Audit Log Tab ─────────────────────────────────────────────────────────────

function AuditLogTab() {
  const [log, setLog]     = useState<AuditLogEntry[]>([]);
  const [cleared, setCleared] = useState(false);

  useEffect(() => { setLog(getAuditLog()); }, []);

  function handleClear() {
    clearAuditLog(); setLog([]); setCleared(true);
  }

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <History className="w-4 h-4 text-gray-500" /> Audit Log
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {log.length} entr{log.length !== 1 ? 'ies' : 'y'} — stored in this browser
          </p>
        </div>
        {log.length > 0 && (
          <button onClick={handleClear}
            className="text-xs text-red-500 hover:text-red-700 font-medium border border-red-200 rounded-lg px-3 py-1.5">
            Clear Log
          </button>
        )}
      </div>

      {log.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center text-gray-400">
          <History className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">{cleared ? 'Log cleared.' : 'No bulk actions logged yet'}</p>
          <p className="text-sm mt-1">Bulk edits and operations will appear here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Action</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-24">Products</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Fields</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-40">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {log.map(entry => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{entry.action}</div>
                      {entry.details && (
                        <div className="text-xs text-gray-400 mt-0.5">{entry.details}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-700 text-center">
                      {entry.productsAffected}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {entry.fields.map(f => (
                          <span key={f} className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-semibold">
                            {f}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {new Date(entry.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── QC Queue Tab ─────────────────────────────────────────────────────────────

import { runQC, qcSummary, QC_FILTER_OPTIONS, REQUIRED_SPECS, flagImageMismatch, clearImageMismatch, getImageMismatchFlags, type QCCode, type QCResult } from '@/lib/qc';
import { SPEC_SCHEMA, getEffectiveSpecFields, saveCustomSpecField, removeCustomSpecField, getAllSchemaCategories, type SpecField } from '@/lib/compare';
type QCFilterCode = QCCode | 'all';

function QCScoreBadge({ score }: { score: number }) {
  const color = score >= 90 ? 'bg-green-100 text-green-700'
              : score >= 70 ? 'bg-amber-100 text-amber-700'
              : 'bg-red-100 text-red-600';
  return (
    <span className={`inline-flex items-center text-xs font-bold px-2.5 py-0.5 rounded-full ${color}`}>
      {score}
    </span>
  );
}

function QCQuickFix({
  product, result, onClose, onSaved,
}: { product: Product; result: QCResult; onClose: () => void; onSaved: () => void }) {
  const [urlInput,      setUrlInput]      = useState('');
  const [saving,        setSaving]        = useState(false);
  const [err,           setErr]           = useState('');
  const [specKey,       setSpecKey]       = useState('');
  const [specVal,       setSpecVal]       = useState('');
  const [newName,       setNewName]       = useState(product.simplified_name || '');
  const [bucketImgs,    setBucketImgs]    = useState<string[]>([]);
  const [bucketLoading, setBucketLoading] = useState(false);
  const [isMismatched,  setIsMismatched]  = useState(() => getImageMismatchFlags().has(product.id));

  const hasMissingImage = result.issues.some(i =>
    i.code === 'MISSING_IMAGE' || i.code === 'MISSING_PRIMARY_IMAGE' || i.code === 'IMAGE_CATEGORY_MISMATCH'
  );
  const hasInvalidName  = result.issues.some(i => i.code === 'NAME_INVALID');
  const hasSpecIssue    = result.issues.some(i => i.code === 'SPEC_INCOMPLETE');

  async function searchBucket() {
    setBucketLoading(true);
    try {
      const { getBrandImages } = await import('@/lib/api');
      const imgs = await getBrandImages(product.brand);
      setBucketImgs(imgs);
    } finally { setBucketLoading(false); }
  }

  function toggleMismatch() {
    if (isMismatched) { clearImageMismatch(product.id); setIsMismatched(false); }
    else              { flagImageMismatch(product.id);  setIsMismatched(true);  }
    onSaved();
  }

  async function saveImage() {
    const url = urlInput.trim();
    if (!url.startsWith('http')) { setErr('Enter a valid URL'); return; }
    setSaving(true); setErr('');
    try {
      await fetchAndUploadOrSaveUrl(url, product.id, product.brand, product.model);
      onSaved();
    } catch (e: any) { setErr(e.message); setSaving(false); }
  }

  async function saveName() {
    if (!newName.trim()) { setErr('Name cannot be empty'); return; }
    setSaving(true); setErr('');
    try {
      await upsertProduct({ id: product.id, slug: product.slug || product.id, simplified_name: newName.trim() });
      onSaved();
    } catch (e: any) { setErr(e.message); setSaving(false); }
  }

  async function saveSpec() {
    if (!specKey.trim() || !specVal.trim()) { setErr('Enter both key and value'); return; }
    setSaving(true); setErr('');
    try {
      await upsertProduct({ id: product.id, slug: product.slug || product.id, specs: { ...(product.specs || {}), [specKey]: specVal } });
      onSaved();
    } catch (e: any) { setErr(e.message); setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
          <div>
            <p className="font-black text-gray-900 text-sm">{product.brand} · {product.model}</p>
            <div className="flex items-center gap-2 mt-1">
              <QCScoreBadge score={result.score} />
              <span className="text-xs text-gray-400">QC Score</span>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Issues */}
          <div className="space-y-1.5">
            {result.issues.map(issue => (
              <div key={issue.code} className={`flex items-start gap-2 rounded-lg px-3 py-2 text-xs
                ${issue.severity === 'error' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <div>
                  <span className="font-semibold">{issue.label}</span>
                  {issue.detail && <p className="opacity-80 mt-0.5">{issue.detail}</p>}
                </div>
              </div>
            ))}
          </div>

          {hasMissingImage && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-700 block">Add / Replace Image URL</label>
              <input type="text" value={urlInput} onChange={e => setUrlInput(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              <div className="flex gap-2 flex-wrap">
                <button onClick={saveImage} disabled={saving || !urlInput.trim()}
                  className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white text-xs font-bold px-4 py-2 rounded-lg">
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null} Save Image
                </button>
                <button onClick={searchBucket} disabled={bucketLoading}
                  className="flex items-center gap-1.5 border border-gray-200 text-gray-600 hover:border-orange-300 text-xs font-semibold px-3 py-2 rounded-lg">
                  {bucketLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                  Search Bucket
                </button>
              </div>
              {bucketImgs.length > 0 && (
                <div>
                  <p className="text-[10px] text-gray-400 mb-1.5">Click an image to use it:</p>
                  <div className="grid grid-cols-4 gap-1.5 max-h-40 overflow-y-auto">
                    {bucketImgs.map(url => (
                      <button key={url} onClick={() => setUrlInput(url)}
                        className={`rounded-lg overflow-hidden border-2 transition-all ${urlInput === url ? 'border-orange-500' : 'border-gray-100 hover:border-orange-300'}`}>
                        <img src={url} alt="" className="w-full aspect-square object-cover"
                          onError={e => { (e.currentTarget.parentElement as HTMLElement).style.display = 'none'; }} />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Image mismatch toggle */}
          <div className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2">
            <div>
              <p className="text-xs font-semibold text-gray-700">Image Category Mismatch</p>
              <p className="text-[10px] text-gray-400">Flag if this image belongs to a different product category</p>
            </div>
            <button onClick={toggleMismatch}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${isMismatched
                ? 'bg-red-100 text-red-600 hover:bg-red-200'
                : 'bg-gray-100 text-gray-500 hover:bg-amber-50 hover:text-amber-600'}`}>
              {isMismatched ? 'Flagged — Clear' : 'Flag Mismatch'}
            </button>
          </div>

          {hasInvalidName && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-700 block">Fix Product Name</label>
              <p className="text-[10px] text-gray-400">Format: {product.brand} [Size] [Feature] [Sub-category] [Category]</p>
              <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
                placeholder={`${product.brand} 1.5 Ton Inverter Air Conditioner`}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              <button onClick={saveName} disabled={saving || !newName.trim()}
                className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white text-xs font-bold px-4 py-2 rounded-lg">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null} Save Name
              </button>
            </div>
          )}

          {hasSpecIssue && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-700 block">Add Missing Spec</label>
              {(REQUIRED_SPECS[product.category] ?? []).filter(s =>
                !Object.keys(product.specs || {}).some(k => k.toLowerCase() === s.toLowerCase())
              ).map(s => (
                <button key={s} type="button" onClick={() => setSpecKey(s)}
                  className="mr-1 mb-1 text-[10px] bg-blue-50 text-blue-600 hover:bg-blue-100 px-2 py-0.5 rounded font-semibold">
                  {s}
                </button>
              ))}
              <div className="grid grid-cols-2 gap-2">
                <input type="text" value={specKey} onChange={e => setSpecKey(e.target.value)} placeholder="Spec key"
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                <input type="text" value={specVal} onChange={e => setSpecVal(e.target.value)} placeholder="Value"
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
              <button onClick={saveSpec} disabled={saving || !specKey.trim() || !specVal.trim()}
                className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white text-xs font-bold px-4 py-2 rounded-lg">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null} Add Spec
              </button>
            </div>
          )}

          {err && <p className="text-xs text-red-500">{err}</p>}

          <div className="flex gap-2 justify-end border-t border-gray-100 pt-3">
            <a href={`/products/${product.slug}`} target="_blank" rel="noreferrer"
              className="text-xs text-gray-500 hover:text-orange-600 font-medium px-3 py-1.5 border border-gray-200 rounded-lg">
              Preview →
            </a>
            <button onClick={onClose} className="text-xs text-gray-500 hover:text-gray-800 px-3 py-1.5 border border-gray-200 rounded-lg">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function QCQueueTab({ products, onRefresh }: { products: Product[]; onRefresh: () => void }) {
  const [filterCode,   setFilterCode]   = useState<QCFilterCode>('all');
  const [fixingResult, setFixingResult] = useState<{ product: Product; result: QCResult } | null>(null);
  const [scanning,     setScanning]     = useState(false);
  const [selectedQC,   setSelectedQC]   = useState<Set<string>>(new Set());
  const [bulkAction,   setBulkAction]   = useState<string>('');

  const summary  = qcSummary(products);
  const allQC    = runQC(products, 90);
  const filtered = filterCode === 'all'
    ? allQC
    : allQC.filter(r => r.issues.some(i => i.code === filterCode));

  function handleRescan() {
    setScanning(true); setSelectedQC(new Set());
    onRefresh();
    setTimeout(() => setScanning(false), 800);
  }

  function toggleQCSelect(id: string) {
    setSelectedQC(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  const allSelectedOnPage = filtered.length > 0 && filtered.every(r => selectedQC.has(r.product.id));
  function toggleSelectAll() {
    if (allSelectedOnPage) setSelectedQC(new Set());
    else setSelectedQC(new Set(filtered.map(r => r.product.id)));
  }

  return (
    <div className="max-w-6xl mx-auto py-6 space-y-5">
      {/* Summary stats — 7 cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Products',   value: summary.total,          color: 'text-gray-900' },
          { label: 'QC Issues',        value: summary.qcIssues,       color: summary.qcIssues > 0 ? 'text-red-600' : 'text-green-600' },
          { label: 'Missing Images',   value: summary.missingImage,   color: summary.missingImage > 0 ? 'text-amber-600' : 'text-gray-400' },
          { label: 'Image Mismatch',   value: summary.imageMismatch,  color: summary.imageMismatch > 0 ? 'text-rose-600' : 'text-gray-400' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4">
            <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Invalid Names',  value: summary.invalidName, color: 'text-purple-600' },
          { label: 'Price Errors',   value: summary.priceError,  color: 'text-red-500' },
          { label: 'Missing Desc',   value: summary.missingDesc, color: 'text-gray-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4">
            <div className={`text-xl font-black ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        {QC_FILTER_OPTIONS.map(opt => (
          <button key={opt.code} onClick={() => { setFilterCode(opt.code as QCFilterCode); setSelectedQC(new Set()); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors
              ${filterCode === opt.code ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {opt.label}
          </button>
        ))}
        <div className="flex-1" />
        <button onClick={handleRescan} disabled={scanning}
          className="flex items-center gap-1.5 border border-gray-200 text-gray-600 hover:border-orange-300 text-xs font-semibold px-3 py-1.5 rounded-lg">
          {scanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Re-scan
        </button>
        <span className="text-xs text-gray-400">{filtered.length} flagged</span>
      </div>

      {/* Bulk action bar */}
      {selectedQC.size > 0 && (
        <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
          <span className="text-sm font-bold text-orange-700">{selectedQC.size} selected</span>
          <select value={bulkAction} onChange={e => setBulkAction(e.target.value)}
            className="border border-orange-200 bg-white rounded-lg px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-orange-400">
            <option value="">Choose bulk action…</option>
            <option value="flag_mismatch">Flag all as image mismatch</option>
            <option value="clear_mismatch">Clear image mismatch flags</option>
          </select>
          <button
            onClick={() => {
              if (!bulkAction) return;
              selectedQC.forEach(id => {
                if (bulkAction === 'flag_mismatch')  flagImageMismatch(id);
                if (bulkAction === 'clear_mismatch') clearImageMismatch(id);
              });
              setSelectedQC(new Set()); setBulkAction(''); onRefresh();
            }}
            disabled={!bulkAction}
            className="text-xs font-bold bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white px-4 py-1.5 rounded-lg">
            Apply
          </button>
          <button onClick={() => setSelectedQC(new Set())} className="text-xs text-gray-500 hover:text-gray-700 ml-auto">
            Deselect all
          </button>
        </div>
      )}

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Check className="w-7 h-7 text-green-600" />
          </div>
          <p className="font-bold text-gray-900">
            {filterCode !== 'all' ? 'No products match this filter.' : 'All products pass QC!'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 w-8">
                    <button onClick={toggleSelectAll}
                      className="w-4 h-4 rounded border border-gray-300 flex items-center justify-center text-orange-500 hover:border-orange-400">
                      {allSelectedOnPage ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5 text-gray-300" />}
                    </button>
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Product</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-32">Category</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-28">QC Score</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Issues</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(({ product: p, score, issues, lastChecked }) => (
                  <tr key={p.id} className={`hover:bg-gray-50 transition-colors ${selectedQC.has(p.id) ? 'bg-orange-50/50' : ''}`}>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleQCSelect(p.id)}
                        className="w-4 h-4 rounded border border-gray-300 flex items-center justify-center text-orange-500 hover:border-orange-400">
                        {selectedQC.has(p.id) ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5 text-gray-300" />}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 shrink-0 flex items-center justify-center">
                          {p.thumbnail?.startsWith('http')
                            ? <img src={p.thumbnail} alt="" className="w-full h-full object-cover"
                                onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                            : <ImageOff className="w-4 h-4 text-gray-300" />}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 leading-tight">
                            {p.simplified_name || <span className="text-amber-500 italic text-xs">No name</span>}
                          </div>
                          <div className="text-xs text-gray-400">{p.brand} · {p.model}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{p.category}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <QCScoreBadge score={score} />
                        <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${score >= 90 ? 'bg-green-400' : score >= 70 ? 'bg-amber-400' : 'bg-red-400'}`}
                            style={{ width: `${score}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {issues.map(i => (
                          <span key={i.code} className={`text-[10px] px-2 py-0.5 rounded-full font-semibold
                            ${i.severity === 'error' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'}`}>
                            {i.label}
                          </span>
                        ))}
                      </div>
                      <p className="text-[10px] text-gray-300 mt-0.5">
                        {new Date(lastChecked).toLocaleTimeString()}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          onClick={() => setFixingResult({ product: p, result: { productId: p.id, score, issues, lastChecked } })}
                          className="text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white px-2.5 py-1.5 rounded-lg transition-colors">
                          Fix
                        </button>
                        <a href={`/products/${p.slug}`} target="_blank" rel="noreferrer"
                          className="text-xs font-medium text-gray-500 hover:text-orange-600 bg-gray-100 hover:bg-orange-50 px-2.5 py-1.5 rounded-lg transition-colors">
                          View
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {fixingResult && (
        <QCQuickFix
          product={fixingResult.product}
          result={fixingResult.result}
          onClose={() => setFixingResult(null)}
          onSaved={() => { setFixingResult(null); onRefresh(); }}
        />
      )}
    </div>
  );
}

// ── Spec Schema Admin Tab ─────────────────────────────────────────────────────

function SpecSchemaTab() {
  const [cats]            = useState(() => getAllSchemaCategories());
  const [selCat, setSelCat] = useState(cats[0] ?? '');
  const [fields,  setFields] = useState<SpecField[]>(() => selCat ? getEffectiveSpecFields(selCat) : []);
  const [newKey,  setNewKey]  = useState('');
  const [newLabel,setNewLabel]= useState('');
  const [newUnit, setNewUnit] = useState('');
  const [newHL,   setNewHL]   = useState<''|'min'|'max'>('');
  const [saved,   setSaved]   = useState(false);
  const [allCats] = useState(cats);
  const [customCat, setCustomCat] = useState('');

  function load(cat: string) {
    setSelCat(cat);
    setFields(getEffectiveSpecFields(cat));
    setSaved(false);
  }

  function addField() {
    if (!newKey.trim() || !newLabel.trim()) return;
    const field: SpecField = {
      key: newKey.trim(), label: newLabel.trim(),
      ...(newUnit.trim() && { unit: newUnit.trim() }),
      ...(newHL && { highlight: newHL }),
    };
    saveCustomSpecField(selCat, field);
    setFields(getEffectiveSpecFields(selCat));
    setNewKey(''); setNewLabel(''); setNewUnit(''); setNewHL('');
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  }

  function deleteCustomField(key: string) {
    removeCustomSpecField(selCat, key);
    setFields(getEffectiveSpecFields(selCat));
  }

  const defaultKeys = new Set((SPEC_SCHEMA[selCat] ?? []).map(f => f.key));

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-6">
      <div>
        <h2 className="text-lg font-extrabold text-gray-900">Spec Schema Editor</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          View and extend the specification fields used in product comparison. Changes are saved locally.
        </p>
      </div>

      {/* Category selector */}
      <div className="flex flex-wrap gap-2">
        {allCats.map(cat => (
          <button key={cat} onClick={() => load(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors
              ${selCat === cat ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {cat}
          </button>
        ))}
        {/* New category input */}
        <div className="flex items-center gap-1">
          <input value={customCat} onChange={e => setCustomCat(e.target.value)}
            placeholder="New category…"
            className="border border-gray-200 rounded-lg px-2 py-1 text-xs w-36 focus:outline-none focus:ring-2 focus:ring-orange-400" />
          <button onClick={() => { if (customCat.trim()) { load(customCat.trim()); setCustomCat(''); } }}
            className="text-xs bg-gray-100 hover:bg-orange-100 text-gray-600 hover:text-orange-700 px-2 py-1 rounded-lg">
            + Add
          </button>
        </div>
      </div>

      {selCat && (
        <>
          {/* Current fields */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">{selCat}</h3>
              <span className="text-xs text-gray-400">{fields.length} fields</span>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="text-left px-5 py-2 text-xs font-semibold text-gray-500">Key</th>
                  <th className="text-left px-5 py-2 text-xs font-semibold text-gray-500">Label</th>
                  <th className="text-left px-5 py-2 text-xs font-semibold text-gray-500">Unit</th>
                  <th className="text-left px-5 py-2 text-xs font-semibold text-gray-500">Best Value</th>
                  <th className="px-5 py-2 w-16" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {fields.map(f => (
                  <tr key={f.key} className="hover:bg-gray-50">
                    <td className="px-5 py-2.5 font-mono text-xs text-gray-700">{f.key}</td>
                    <td className="px-5 py-2.5 text-xs text-gray-900">{f.label}</td>
                    <td className="px-5 py-2.5 text-xs text-gray-500">{f.unit ?? '—'}</td>
                    <td className="px-5 py-2.5">
                      {f.highlight
                        ? <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${f.highlight === 'max' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                            {f.highlight === 'max' ? 'Higher better' : 'Lower better'}
                          </span>
                        : <span className="text-xs text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      {defaultKeys.has(f.key)
                        ? <span className="text-[10px] text-gray-300">built-in</span>
                        : <button onClick={() => deleteCustomField(f.key)}
                            className="text-[10px] text-red-400 hover:text-red-600 font-semibold">
                            Remove
                          </button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add new field */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h4 className="text-sm font-bold text-gray-900 mb-4">Add Spec Field to "{selCat}"</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Field Key *</label>
                <input value={newKey} onChange={e => setNewKey(e.target.value)} placeholder="e.g. Noise Level"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Display Label *</label>
                <input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="e.g. Noise Level"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Unit (optional)</label>
                <input value={newUnit} onChange={e => setNewUnit(e.target.value)} placeholder="e.g. dB, W, L"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Highlight</label>
                <select value={newHL} onChange={e => setNewHL(e.target.value as ''|'min'|'max')}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white">
                  <option value="">None</option>
                  <option value="max">Higher is better</option>
                  <option value="min">Lower is better</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={addField} disabled={!newKey.trim() || !newLabel.trim()}
                className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white text-xs font-bold px-4 py-2 rounded-lg">
                <Plus className="w-3.5 h-3.5" /> Add Field
              </button>
              {saved && <span className="text-xs text-green-600 font-semibold">Saved!</span>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Data Tools Tab ────────────────────────────────────────────────────────────

const FIELD_COLORS: Record<string, string> = {
  Image:   'bg-purple-100 text-purple-700',
  Name:    'bg-orange-100 text-orange-700',
  Desc:    'bg-blue-100 text-blue-700',
  Warranty:'bg-teal-100 text-teal-700',
  Tags:    'bg-yellow-100 text-yellow-700',
  SEO:     'bg-pink-100 text-pink-700',
};

type OpScope = 'all' | 'new' | 'selected';

function ToolsTab({ onRefresh, products, selectedIds }: {
  onRefresh: () => void; products: Product[]; selectedIds: Set<string>;
}) {
  const [scope,          setScope]          = useState<OpScope>('all');
  const [enrichProgress, setEnrichProgress] = useState('');
  const [enrichResult,   setEnrichResult]   = useState<{ done: number; errors: string[] } | null>(null);
  const [imageProgress,  setImageProgress]  = useState('');
  const [imageResult,    setImageResult]    = useState<{ found: number; missing: number; errors: string[] } | null>(null);
  const [catProgress,    setCatProgress]    = useState('');
  const [catResult,      setCatResult]      = useState<{ fixed: number; skipped: number; errors: string[] } | null>(null);
  const [allResult,      setAllResult]      = useState<string | null>(null);
  const [scanLoading,    setScanLoading]    = useState(false);
  const [scanResult,     setScanResult]     = useState<BucketScanResult | null>(null);
  const [audit,          setAudit]          = useState<AuditProduct[] | null>(null);
  const [auditLoading,   setAuditLoading]   = useState(false);
  const [fixingId,       setFixingId]       = useState<string | null>(null);
  const [confirmBulk,    setConfirmBulk]    = useState<null | { title: string; message: string; action: () => void }>(null);

  const unenrichedIds = products.filter(p => !p.simplified_name?.trim()).map(p => p.id);

  function getScopeIds(): string[] | undefined {
    if (scope === 'all') return undefined;
    if (scope === 'new') return unenrichedIds;
    return [...selectedIds];
  }

  function getScopeLabel() {
    if (scope === 'all') return `all ${products.length} products`;
    if (scope === 'new') return `${unenrichedIds.length} unenriched product${unenrichedIds.length !== 1 ? 's' : ''}`;
    return `${selectedIds.size} selected product${selectedIds.size !== 1 ? 's' : ''}`;
  }

  function isBusy() { return !!enrichProgress || !!imageProgress || !!catProgress; }

  async function loadAudit() {
    setAuditLoading(true);
    setAudit(await getDataAudit());
    setAuditLoading(false);
  }
  useEffect(() => { loadAudit(); }, []);

  async function handleEnrich() {
    setEnrichResult(null); setAllResult(null);
    const r = await reenrichAllProducts(setEnrichProgress, getScopeIds());
    setEnrichResult(r); onRefresh(); loadAudit();
  }

  async function handleImages() {
    setImageResult(null); setAllResult(null);
    const r = await rematchAllImages(setImageProgress, getScopeIds());
    setImageResult(r); onRefresh(); loadAudit();
  }

  async function handleFixCategories() {
    setCatResult(null); setAllResult(null);
    const r = await fixAllCategories(setCatProgress, getScopeIds());
    setCatResult(r); setCatProgress(''); onRefresh(); loadAudit();
  }

  async function handleRunAll() {
    setEnrichResult(null); setCatResult(null); setImageResult(null); setAllResult(null);
    const ids = getScopeIds();
    const er = await reenrichAllProducts(setEnrichProgress, ids);
    setEnrichResult(er);
    const cr = await fixAllCategories(setCatProgress, ids);
    setCatResult(cr); setCatProgress('');
    const ir = await rematchAllImages(setImageProgress, ids);
    setImageResult(ir);
    const total = er.done;
    setAllResult(`Done: ${total} enriched · ${cr.fixed} categories fixed · ${ir.found} images matched`);
    onRefresh(); loadAudit();
  }

  async function handleScan() {
    setScanLoading(true); setScanResult(null);
    const r = await scanBucket();
    setScanResult(r); setScanLoading(false);
  }

  const counts = audit ? Object.fromEntries(
    ['Image','Name','Desc','Warranty','Tags','SEO'].map(k => [k, audit.filter(p => p.missing.includes(k)).length])
  ) : {};

  const scopeEmpty = (scope === 'new' && unenrichedIds.length === 0) || (scope === 'selected' && selectedIds.size === 0);

  return (
    <div className="max-w-5xl mx-auto py-8 space-y-6">

      {/* ── Bulk Operations ── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-5">
        <div>
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-orange-500" />
            Bulk Operations
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">Run enrichment, category fix, and image matching on a group of products.</p>
        </div>

        {/* Scope selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Scope:</span>
          {([
            { id: 'all',      label: `All Products (${products.length})` },
            { id: 'new',      label: `New / Unenriched (${unenrichedIds.length})` },
            { id: 'selected', label: `Selected (${selectedIds.size})` },
          ] as { id: OpScope; label: string }[]).map(s => (
            <button key={s.id} onClick={() => setScope(s.id)}
              disabled={s.id === 'selected' && selectedIds.size === 0}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${scope === s.id
                  ? 'bg-orange-500 text-white'
                  : s.id === 'selected' && selectedIds.size === 0
                    ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {s.label}
            </button>
          ))}
        </div>

        {scopeEmpty && (
          <p className="text-sm text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
            {scope === 'new' ? 'No unenriched products found — all products already have names.' : 'No products selected. Go to Products tab and check the boxes.'}
          </p>
        )}

        {/* Operation cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Enrich */}
          <div className="border border-gray-100 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <span className="font-semibold text-gray-800 text-sm">Enrich Names</span>
            </div>
            <p className="text-xs text-gray-400">Regenerates name, sub-category, warranty, description, tags and SEO.</p>
            <button
              onClick={() => setConfirmBulk({ title: 'Enrich Names?', message: `Regenerate enriched fields for ${getScopeLabel()}.`, action: handleEnrich })}
              disabled={isBusy() || scopeEmpty}
              className="w-full flex items-center justify-center gap-1.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white py-2 rounded-lg text-xs font-bold">
              {enrichProgress ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span className="truncate max-w-[120px]">{enrichProgress}</span></> : <><Sparkles className="w-3.5 h-3.5" />Run Enrich</>}
            </button>
            {enrichResult && (
              <p className={`text-xs font-medium ${enrichResult.errors.length ? 'text-amber-600' : 'text-green-600'}`}>
                {enrichResult.done} done{enrichResult.errors.length ? ` · ${enrichResult.errors.length} errors` : ' ✓'}
              </p>
            )}
          </div>

          {/* Fix Categories */}
          <div className="border border-gray-100 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-green-50 rounded-lg flex items-center justify-center">
                <Tag className="w-3.5 h-3.5 text-green-600" />
              </div>
              <span className="font-semibold text-gray-800 text-sm">Fix Categories</span>
            </div>
            <p className="text-xs text-gray-400">Reclassifies each product's category from brand and model number.</p>
            <button
              onClick={() => setConfirmBulk({ title: 'Fix Categories?', message: `Reclassify category for ${getScopeLabel()}.`, action: handleFixCategories })}
              disabled={isBusy() || scopeEmpty}
              className="w-full flex items-center justify-center gap-1.5 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white py-2 rounded-lg text-xs font-bold">
              {catProgress ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span className="truncate max-w-[120px]">{catProgress}</span></> : <><Tag className="w-3.5 h-3.5" />Fix Categories</>}
            </button>
            {catResult && (
              <p className={`text-xs font-medium ${catResult.errors.length ? 'text-amber-600' : 'text-green-600'}`}>
                {catResult.fixed} fixed · {catResult.skipped} ok{catResult.errors.length ? ` · ${catResult.errors.length} errors` : ' ✓'}
              </p>
            )}
          </div>

          {/* Match Images */}
          <div className="border border-gray-100 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-purple-50 rounded-lg flex items-center justify-center">
                <ImageIcon className="w-3.5 h-3.5 text-purple-600" />
              </div>
              <span className="font-semibold text-gray-800 text-sm">Match Images</span>
            </div>
            <p className="text-xs text-gray-400">Scans the storage bucket and links product images by model name.</p>
            <button
              onClick={() => setConfirmBulk({ title: 'Match Images?', message: `Scan bucket and link images for ${getScopeLabel()}.`, action: handleImages })}
              disabled={isBusy() || scopeEmpty}
              className="w-full flex items-center justify-center gap-1.5 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white py-2 rounded-lg text-xs font-bold">
              {imageProgress ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span className="truncate max-w-[120px]">{imageProgress}</span></> : <><ImageIcon className="w-3.5 h-3.5" />Match Images</>}
            </button>
            {imageResult && (
              <p className={`text-xs font-medium ${imageResult.missing > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                {imageResult.found} matched · {imageResult.missing} missing{imageResult.errors.length ? ` · ${imageResult.errors.length} err` : ''}
              </p>
            )}
          </div>
        </div>

        {/* Run All */}
        <div className="pt-1 flex flex-wrap items-center gap-3">
          <button
            onClick={() => setConfirmBulk({ title: 'Run All 3 Operations?', message: `Enrich names → Fix categories → Match images for ${getScopeLabel()}.\n\nThis is the recommended flow after a CSV import.`, action: handleRunAll })}
            disabled={isBusy() || scopeEmpty}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-bold">
            <Wand2 className="w-4 h-4" />
            Run All 3 Operations
          </button>
          <button onClick={handleScan} disabled={scanLoading}
            className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-60 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-bold">
            {scanLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Scanning…</> : <><RefreshCw className="w-4 h-4" />Scan Bucket</>}
          </button>
          {allResult && <p className="text-sm font-medium text-green-600">{allResult} ✓</p>}
        </div>

        {/* Scan result */}
        {scanResult && (
          <div className="text-xs border border-gray-100 rounded-xl overflow-hidden">
            {scanResult.error ? (
              <div className="bg-red-50 text-red-700 p-3 font-medium">{scanResult.error}</div>
            ) : (
              <>
                <div className="bg-gray-50 px-3 py-2 font-semibold text-gray-700">
                  Bucket — {scanResult.totalFiles} files in {scanResult.folders.length} folder{scanResult.folders.length !== 1 ? 's' : ''}
                </div>
                {scanResult.folders.map(folder => (
                  <div key={folder} className="px-3 py-2 border-t border-gray-100">
                    <span className="font-bold text-gray-800">{folder}/</span>
                    <span className="text-gray-400 ml-2">{scanResult.filesByFolder[folder]?.length ?? 0} files</span>
                    {(scanResult.filesByFolder[folder] ?? []).slice(0, 5).map(f => (
                      <div key={f} className="ml-3 text-gray-500 truncate">· {f}</div>
                    ))}
                    {(scanResult.filesByFolder[folder]?.length ?? 0) > 5 && (
                      <div className="ml-3 text-gray-400">…and {scanResult.filesByFolder[folder].length - 5} more</div>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* Data completeness audit */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Data Completeness Audit
            </h3>
            {audit && (
              <p className="text-sm text-gray-500 mt-0.5">
                {audit.length === 0 ? 'All products are complete ✓' : `${audit.length} product${audit.length !== 1 ? 's' : ''} have incomplete data`}
              </p>
            )}
          </div>
          <button onClick={loadAudit} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>

        {audit && audit.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-5">
            {Object.entries(counts).filter(([, v]) => v > 0).map(([k, v]) => (
              <span key={k} className={`text-xs font-semibold px-2.5 py-1 rounded-full ${FIELD_COLORS[k]}`}>
                {v} missing {k}
              </span>
            ))}
          </div>
        )}

        {auditLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-orange-400" /></div>
        ) : audit?.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-10 text-green-600">
            <Check className="w-5 h-5" /><span className="font-medium">All products are complete!</span>
          </div>
        ) : (
          <div className="space-y-0">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Brand</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Model</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Category</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Missing Fields</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600 w-16">Fix</th>
                </tr>
              </thead>
            </table>
            <div className="divide-y divide-gray-50">
              {(audit ?? []).sort((a, b) => b.missing.length - a.missing.length).map(p => {
                const fullProduct = products.find(pr => pr.id === p.id);
                const isFixing = fixingId === p.id;
                return (
                  <div key={p.id}>
                    <table className="w-full text-xs">
                      <tbody>
                        <tr className={`transition-colors ${isFixing ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                          <td className="px-3 py-2 font-medium text-gray-800">{p.brand}</td>
                          <td className="px-3 py-2 text-gray-600">{p.model}</td>
                          <td className="px-3 py-2 text-gray-400">{p.category}</td>
                          <td className="px-3 py-2">
                            <div className="flex flex-wrap gap-1">
                              {p.missing.map(m => (
                                <span key={m} className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${FIELD_COLORS[m]}`}>{m}</span>
                              ))}
                            </div>
                          </td>
                          <td className="px-3 py-2 w-16">
                            <button
                              onClick={() => setFixingId(isFixing ? null : p.id)}
                              className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-colors ${isFixing ? 'bg-blue-200 text-blue-800' : 'bg-blue-50 hover:bg-blue-100 text-blue-600'}`}>
                              {isFixing ? 'Close' : 'Fix ▸'}
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    {isFixing && fullProduct && (
                      <div className="px-3 pb-3">
                        <InlineAuditFix
                          product={fullProduct}
                          missingFields={p.missing}
                          onDone={() => { setFixingId(null); onRefresh(); loadAudit(); }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      {confirmBulk && (
        <ConfirmDialog
          title={confirmBulk.title}
          message={confirmBulk.message}
          confirmLabel="Yes, Proceed"
          onConfirm={() => { const fn = confirmBulk.action; setConfirmBulk(null); fn(); }}
          onCancel={() => setConfirmBulk(null)}
        />
      )}

      {/* ── WhatsApp / Meta Catalog Export ── */}
      <CatalogExportPanel products={products} />
    </div>
  );
}

// ── WhatsApp Catalog Export Panel ─────────────────────────────────────────────

function CatalogExportPanel({ products }: { products: Product[] }) {
  const [view,       setView]       = useState<'summary' | 'issues' | 'sets'>('summary');
  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState<import('@/lib/catalog').CatalogValidationResult | null>(null);
  const [sets,       setSets]       = useState<import('@/lib/catalog').WAProductSet[]>([]);
  const [exporting,  setExporting]  = useState(false);

  async function runValidation() {
    setValidating(true);
    const { buildCatalogFeed, validateCatalogFeed, buildWAProductSets } = await import('@/lib/catalog');
    const feed = buildCatalogFeed(products);
    setValidation(validateCatalogFeed(feed));
    setSets(buildWAProductSets(feed));
    setValidating(false);
  }

  async function handleExportCSV() {
    setExporting(true);
    const { buildCatalogFeed, downloadCatalogCSV } = await import('@/lib/catalog');
    const feed = buildCatalogFeed(products);
    downloadCatalogCSV(feed, `catalog-${new Date().toISOString().slice(0,10)}.csv`);
    setExporting(false);
  }

  async function handleExportJSON() {
    setExporting(true);
    const { buildCatalogFeed, downloadCatalogJSON } = await import('@/lib/catalog');
    const feed = buildCatalogFeed(products);
    downloadCatalogJSON(feed, `catalog-${new Date().toISOString().slice(0,10)}.json`);
    setExporting(false);
  }

  const formatPrice = (n: number) => n.toLocaleString();

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-green-500" />
            WhatsApp / Meta Catalog Export
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Export your product catalog for Meta Commerce Manager, WhatsApp Shopping, and Facebook/Instagram Shop.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={runValidation} disabled={validating || products.length === 0}
            className="flex items-center gap-1.5 border border-gray-200 text-gray-600 hover:border-orange-300 text-xs font-semibold px-3 py-2 rounded-lg">
            {validating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ListChecks className="w-3.5 h-3.5" />}
            Validate
          </button>
          <button onClick={handleExportCSV} disabled={exporting || products.length === 0}
            className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 disabled:opacity-40 text-white text-xs font-bold px-3 py-2 rounded-lg">
            {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileUp className="w-3.5 h-3.5" />}
            Export CSV
          </button>
          <button onClick={handleExportJSON} disabled={exporting || products.length === 0}
            className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white text-xs font-bold px-3 py-2 rounded-lg">
            {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileUp className="w-3.5 h-3.5" />}
            Export JSON
          </button>
        </div>
      </div>

      {/* Quick info bar */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Products in feed', value: products.filter(p => p.stock_status !== 'Discontinued').length, color: 'text-gray-900' },
          { label: 'With images',      value: products.filter(p => p.thumbnail?.startsWith('http')).length,    color: 'text-green-600' },
          { label: 'With installments',value: products.filter(p => Object.keys(p.installments || {}).length > 0).length, color: 'text-blue-600' },
        ].map(s => (
          <div key={s.label} className="bg-gray-50 rounded-xl p-3 text-center">
            <div className={`text-xl font-black ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Validation results */}
      {validation && (
        <div className="space-y-3">
          <div className="flex gap-2">
            {(['summary', 'sets', 'issues'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors
                  ${view === v ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {v === 'summary' ? 'Summary' : v === 'sets' ? `WA Categories (${sets.length})` : `Issues (${validation.errors + validation.warnings})`}
              </button>
            ))}
          </div>

          {view === 'summary' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Total items',      value: validation.total,        color: 'text-gray-900' },
                { label: 'Valid',            value: validation.valid,        color: 'text-green-600' },
                { label: 'Warnings',         value: validation.warnings,     color: validation.warnings > 0 ? 'text-amber-600' : 'text-gray-400' },
                { label: 'Errors',           value: validation.errors,       color: validation.errors > 0 ? 'text-red-600' : 'text-gray-400' },
              ].map(s => (
                <div key={s.label} className="bg-gray-50 rounded-xl p-3 text-center">
                  <div className={`text-xl font-black ${s.color}`}>{s.value}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
                </div>
              ))}
              {validation.localhostUrls > 0 && (
                <div className="col-span-4 flex items-start gap-2 bg-red-50 rounded-xl px-4 py-3 text-xs text-red-700">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    <strong>{validation.localhostUrls}</strong> item(s) contain localhost URLs.
                    Update <code>VITE_SITE_URL</code> to the production domain before exporting.
                  </span>
                </div>
              )}
            </div>
          )}

          {view === 'sets' && (
            <div className="bg-gray-50 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="text-left px-4 py-2 font-semibold text-gray-600">WhatsApp Category (custom_label_0)</th>
                    <th className="text-right px-4 py-2 font-semibold text-gray-600">Products</th>
                    <th className="text-right px-4 py-2 font-semibold text-gray-600">Price Range</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sets.map(s => (
                    <tr key={s.label} className="bg-white hover:bg-orange-50">
                      <td className="px-4 py-2 font-medium text-gray-800">{s.label}</td>
                      <td className="px-4 py-2 text-right text-gray-600">{s.count}</td>
                      <td className="px-4 py-2 text-right text-gray-500">
                        PKR {formatPrice(s.minPrice)}
                        {s.minPrice !== s.maxPrice && ` – ${formatPrice(s.maxPrice)}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {view === 'issues' && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {validation.issues.length === 0 ? (
                <p className="text-sm text-green-600 font-medium">No issues found — catalog is ready to export!</p>
              ) : validation.issues.map(issue => (
                <div key={issue.id} className="bg-gray-50 rounded-lg px-4 py-2 text-xs">
                  <p className="font-semibold text-gray-800 truncate">{issue.title || issue.id}</p>
                  {issue.problems.map(p => (
                    <p key={p} className="text-red-500 mt-0.5">• {p}</p>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Export instructions */}
          <details className="text-xs text-gray-500">
            <summary className="cursor-pointer hover:text-gray-700 font-medium">How to upload to Meta Commerce Manager →</summary>
            <ol className="mt-2 space-y-1 pl-4 list-decimal text-gray-500">
              <li>Go to <strong>business.facebook.com</strong> → Commerce Manager</li>
              <li>Select or create a Catalog → Data Sources</li>
              <li>Click <strong>Add Items</strong> → Use a Data Feed</li>
              <li>Upload the exported CSV file (or host it at a public URL)</li>
              <li>Map the columns — they match Meta's standard schema</li>
              <li>Set up a scheduled sync if you host the feed at a URL</li>
            </ol>
          </details>
        </div>
      )}
    </div>
  );
}

// ── Main AdminPortal ──────────────────────────────────────────────────────────

export default function AdminPortal() {
  const { isLoggedIn, loading, signOut } = useAuthStore();

  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [authErr, setAuthErr]   = useState('');
  const [authOk, setAuthOk]     = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [products, setProducts]   = useState<Product[]>([]);
  const [fetching, setFetching]   = useState(false);
  const [search, setSearch]       = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [brandFilter, setBrandFilter]   = useState('');
  const [missingImgFilter, setMissingImgFilter] = useState(false);
  const [installFilter, setInstallFilter]       = useState(false);
  const [priceMin, setPriceMin]   = useState('');
  const [priceMax, setPriceMax]   = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [modal, setModal]         = useState<null | 'add' | Product>(null);
  const [deleteId, setDeleteId]   = useState<string | null>(null);
  const [deleting, setDeleting]   = useState(false);
  const [quickImg, setQuickImg]   = useState<Product | null>(null);
  const [tab, setTab]             = useState<'products' | 'images' | 'import' | 'tools' | 'qc' | 'audit' | 'schema'>('products');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [enrichingId, setEnrichingId] = useState<string | null>(null);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault(); setAuthErr(''); setAuthOk(''); setSubmitting(true);
    try {
      if (authMode === 'signup') {
        if (password !== confirm) { setAuthErr('Passwords do not match'); setSubmitting(false); return; }
        const { session } = await signUp(email, password);
        if (!session) {
          setAuthOk('Account created! Check your email to confirm, then sign in.');
          setAuthMode('signin'); setPassword(''); setConfirm('');
        }
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

  // Build search index whenever products change
  const searchIndex = useMemo(() => buildSearchIndex(products), [products]);

  // All unique brands for filter dropdown
  const allBrands = useMemo(() => [...new Set(products.map(p => p.brand))].sort(), [products]);

  // Use search engine for text search; then apply additional filter bar filters
  const filtered = useMemo(() => {
    let list = search.trim()
      ? adminSearch(searchIndex, search).map(r => r.product)
      : products;
    if (brandFilter) list = list.filter(p => p.brand === brandFilter);
    if (missingImgFilter) list = list.filter(p => !productHasImage(p));
    if (installFilter) list = list.filter(p => p.installments && Object.keys(p.installments).length > 0);
    if (priceMin) list = list.filter(p => p.price.cash_floor >= Number(priceMin));
    if (priceMax) list = list.filter(p => p.price.cash_floor <= Number(priceMax));
    return list;
  }, [search, searchIndex, products, brandFilter, missingImgFilter, installFilter, priceMin, priceMax]);

  const activeFilterCount = [brandFilter, missingImgFilter, installFilter, priceMin, priceMax].filter(Boolean).length;

  async function handleDelete(id: string) {
    setDeleting(true);
    try { await deleteProduct(id); await loadProducts(); }
    finally { setDeleting(false); setDeleteId(null); }
  }

  async function handleEnrichOne(id: string) {
    setEnrichingId(id);
    await reenrichAllProducts(() => {}, [id]);
    await loadProducts();
    setEnrichingId(null);
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(p => p.id)));
    }
  }

  // ── Login screen ─────────────────────────────────────────────────────────────

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
              {submitting
                ? <><Loader2 className="w-4 h-4 animate-spin" /> {authMode === 'signin' ? 'Signing in…' : 'Creating account…'}</>
                : (authMode === 'signin' ? 'Sign In' : 'Create Account')}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────────

  const missingImgCount = products.filter(p => !productHasImage(p)).length;

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
        {([
          { id: 'products', label: 'Products' },
          { id: 'images',   label: `Images${missingImgCount > 0 ? ` (${missingImgCount} missing)` : ''}` },
          { id: 'import',   label: 'Import CSV' },
          { id: 'tools',    label: 'Data Tools' },
          { id: 'qc',       label: `QC Queue${products.length > 0 ? ` (${qcSummary(products).qcIssues})` : ''}` },
          { id: 'schema',   label: 'Spec Schema' },
          { id: 'audit',    label: 'Audit Log' },
        ] as const).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              tab === t.id ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {tab === 'import' ? (
          <ImportTab onImported={loadProducts} />
        ) : tab === 'tools' ? (
          <ToolsTab onRefresh={loadProducts} products={products} selectedIds={selectedIds} />
        ) : tab === 'images' ? (
          <ImagesTab products={products} onRefresh={loadProducts} />
        ) : tab === 'qc' ? (
          <QCQueueTab products={products} onRefresh={loadProducts} />
        ) : tab === 'schema' ? (
          <SpecSchemaTab />
        ) : tab === 'audit' ? (
          <AuditLogTab />
        ) : (
          <>
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 mb-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search by name, model, brand · try: missing images, under 50000, haier fridge…"
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="relative">
                <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
                  className="appearance-none border border-gray-200 rounded-lg pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white">
                  <option value="">All categories</option>
                  {Object.values(CATEGORY_MAP).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
              <button onClick={() => setFiltersOpen(v => !v)}
                className={`relative flex items-center gap-2 border px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors
                  ${filtersOpen || activeFilterCount > 0
                    ? 'border-orange-400 bg-orange-50 text-orange-700'
                    : 'border-gray-200 text-gray-600 hover:border-orange-300 hover:text-orange-600'}`}>
                <Filter className="w-4 h-4" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-orange-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
              <button onClick={() => setModal('add')}
                className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap">
                <Plus className="w-4 h-4" /> Add Product
              </button>
            </div>

            {/* Filter bar */}
            {filtersOpen && (
              <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Brand */}
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Brand</label>
                  <select value={brandFilter} onChange={e => setBrandFilter(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white">
                    <option value="">All brands</option>
                    {allBrands.map(b => <option key={b}>{b}</option>)}
                  </select>
                </div>
                {/* Price range */}
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Min Price</label>
                  <input type="number" value={priceMin} onChange={e => setPriceMin(e.target.value)}
                    placeholder="0"
                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Max Price</label>
                  <input type="number" value={priceMax} onChange={e => setPriceMax(e.target.value)}
                    placeholder="∞"
                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                </div>
                {/* Toggles */}
                <div className="flex flex-col gap-2 justify-center">
                  <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
                    <input type="checkbox" checked={missingImgFilter} onChange={e => setMissingImgFilter(e.target.checked)}
                      className="w-4 h-4 accent-orange-500" />
                    Missing images
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
                    <input type="checkbox" checked={installFilter} onChange={e => setInstallFilter(e.target.checked)}
                      className="w-4 h-4 accent-orange-500" />
                    Installment eligible
                  </label>
                </div>
                {activeFilterCount > 0 && (
                  <div className="col-span-2 sm:col-span-4 flex justify-end">
                    <button onClick={() => {
                      setBrandFilter(''); setMissingImgFilter(false);
                      setInstallFilter(false); setPriceMin(''); setPriceMax('');
                    }} className="text-xs text-red-500 hover:text-red-700 font-medium">
                      Clear all filters
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Filter result count */}
            {(activeFilterCount > 0 || search) && (
              <div className="text-xs text-gray-500 mb-3">
                Showing <span className="font-semibold text-gray-800">{filtered.length}</span> of {products.length} products
              </div>
            )}

            {/* Selection action bar */}
            {selectedIds.size > 0 && (
              <div className="flex flex-wrap items-center gap-2 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 mb-3">
                {bulkRunning
                  ? <Loader2 className="w-4 h-4 text-orange-500 animate-spin shrink-0" />
                  : <ListChecks className="w-4 h-4 text-orange-600 shrink-0" />}
                <span className="text-sm font-semibold text-orange-800 mr-1">
                  {bulkRunning ? 'Working…' : `${selectedIds.size} selected`}
                </span>
                <button disabled={bulkRunning}
                  onClick={() => setBulkEditOpen(true)}
                  className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-bold px-3 py-1.5 rounded-lg">
                  <Edit2 className="w-3.5 h-3.5" /> Bulk Edit
                </button>
                <button disabled={bulkRunning}
                  onClick={async () => {
                    setBulkRunning(true);
                    const r = await reenrichAllProducts(() => {}, [...selectedIds]);
                    logAdminAction({ action: 'Bulk Enrich', productsAffected: r.done, fields: ['name','description','tags','seo'] });
                    await loadProducts(); setSelectedIds(new Set()); setBulkRunning(false);
                  }}
                  className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-xs font-bold px-3 py-1.5 rounded-lg">
                  <Sparkles className="w-3.5 h-3.5" /> Enrich
                </button>
                <button disabled={bulkRunning}
                  onClick={async () => {
                    setBulkRunning(true);
                    const r = await fixAllCategories(() => {}, [...selectedIds]);
                    logAdminAction({ action: 'Bulk Fix Categories', productsAffected: r.fixed, fields: ['category'] });
                    await loadProducts(); setSelectedIds(new Set()); setBulkRunning(false);
                  }}
                  className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white text-xs font-bold px-3 py-1.5 rounded-lg">
                  <Tag className="w-3.5 h-3.5" /> Fix Categories
                </button>
                <button disabled={bulkRunning}
                  onClick={async () => {
                    setBulkRunning(true);
                    const r = await rematchAllImages(() => {}, [...selectedIds]);
                    logAdminAction({ action: 'Bulk Match Images', productsAffected: r.found, fields: ['images'] });
                    await loadProducts(); setSelectedIds(new Set()); setBulkRunning(false);
                  }}
                  className="flex items-center gap-1.5 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white text-xs font-bold px-3 py-1.5 rounded-lg">
                  <ImageIcon className="w-3.5 h-3.5" /> Match Images
                </button>
                <div className="flex-1" />
                <button disabled={bulkRunning} onClick={() => setSelectedIds(new Set())} className="p-1 text-orange-400 hover:text-orange-700 disabled:opacity-40">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Table */}
            {fetching ? (
              <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-orange-400" /></div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                {products.length === 0 ? (
                  <>
                    <p className="font-medium">No products yet</p>
                    <p className="text-sm mt-1">Add your first product or import from CSV</p>
                  </>
                ) : (
                  <>
                    <p className="font-medium">No results for "{search}"</p>
                    <p className="text-sm mt-1">Try a different search term or clear the filter</p>
                    <button onClick={() => setSearch('')} className="mt-3 text-sm text-orange-500 hover:text-orange-700 font-medium">
                      Clear search
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="px-4 py-3 w-10">
                          <button onClick={toggleSelectAll} className="text-gray-400 hover:text-orange-500 transition-colors" title="Select all">
                            {selectedIds.size === filtered.length && filtered.length > 0
                              ? <CheckSquare className="w-4 h-4 text-orange-500" />
                              : <Square className="w-4 h-4" />}
                          </button>
                        </th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600 w-16">Img</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Price</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Stock</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600 w-36">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filtered.map(p => {
                        const hasImg = productHasImage(p);
                        const isSelected = selectedIds.has(p.id);
                        const isEnriching = enrichingId === p.id;
                        return (
                          <tr key={p.id} className={`transition-colors ${isSelected ? 'bg-orange-50/60' : 'hover:bg-gray-50'}`}>
                            <td className="px-4 py-3">
                              <button onClick={() => toggleSelect(p.id)} className="text-gray-300 hover:text-orange-500 transition-colors">
                                {isSelected ? <CheckSquare className="w-4 h-4 text-orange-500" /> : <Square className="w-4 h-4" />}
                              </button>
                            </td>
                            <td className="px-4 py-3">
                              <div className="relative group w-10 h-10">
                                {hasImg
                                  ? <img src={p.thumbnail} alt={p.simplified_name || p.model}
                                      onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                                      className="w-10 h-10 object-cover rounded-lg bg-gray-100" />
                                  : <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                                      <ImageOff className="w-4 h-4 text-gray-300" />
                                    </div>
                                }
                                <button
                                  onClick={() => setQuickImg(p)}
                                  className="absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                  title="Upload image"
                                >
                                  <Camera className="w-4 h-4 text-white" />
                                </button>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-medium text-gray-900 leading-tight">
                                {p.simplified_name || <span className="text-amber-500 italic text-xs">No name yet</span>}
                              </div>
                              <div className="text-xs text-gray-400">{p.brand} · {p.model}</div>
                            </td>
                            <td className="px-4 py-3 text-gray-600">{p.category}<br/>
                              {p.sub_category && <span className="text-xs text-gray-400">{p.sub_category}</span>}
                            </td>
                            <td className="px-4 py-3 font-medium text-gray-900">{fmtPKR(p.price.cash_floor)}</td>
                            <td className="px-4 py-3">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                p.stock_status === 'In Stock'     ? 'bg-green-100 text-green-700' :
                                p.stock_status === 'Discontinued' ? 'bg-gray-200 text-gray-500 line-through' :
                                'bg-red-100 text-red-600'}`}>
                                {p.stock_status}
                              </span>
                              {p.featured && <span className="ml-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Featured</span>}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-1">
                                <button onClick={() => setQuickImg(p)} className="p-1.5 hover:bg-orange-50 text-orange-500 rounded-lg" title="Upload image">
                                  <Camera className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleEnrichOne(p.id)} disabled={isEnriching} className="p-1.5 hover:bg-blue-50 text-blue-500 rounded-lg disabled:opacity-50" title="Enrich this product">
                                  {isEnriching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                </button>
                                <button onClick={() => setModal(p)} className="p-1.5 hover:bg-gray-100 text-gray-600 rounded-lg" title="Edit">
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button onClick={() => setDeleteId(p.id)} className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg" title="Delete">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
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
          initial={modal === 'add' ? null : (() => {
            const p = modal as Product;
            return {
              id: p.id, brand: p.brand, model: p.model, slug: p.slug,
              simplified_name: p.simplified_name,
              category: p.category, sub_category: p.sub_category,
              retail_price: String(p.price.retail || p.price.cash_floor),
              stock_status: p.stock_status, featured: p.featured,
              images: composeImages(p.thumbnail, p.gallery),
              description: p.description, warranty: p.warranty,
              tags: p.tags || '', colors: p.colors || '',
              seo_title: p.seo?.title || '', seo_desc: p.seo?.description || '',
            };
          })()}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); loadProducts(); }}
        />
      )}

      {/* Bulk edit panel */}
      {bulkEditOpen && (
        <BulkEditPanel
          selectedIds={selectedIds}
          products={products}
          onClose={() => setBulkEditOpen(false)}
          onDone={() => { setBulkEditOpen(false); loadProducts(); setSelectedIds(new Set()); }}
        />
      )}

      {/* Quick image upload */}
      {quickImg && (
        <QuickImageUpload
          product={quickImg}
          onDone={() => { setQuickImg(null); loadProducts(); }}
          onCancel={() => setQuickImg(null)}
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
