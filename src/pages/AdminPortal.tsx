import React, { useState, useEffect, useRef, useMemo, useDeferredValue, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { signIn, signUp, resetPasswordForEmail, updatePassword } from '@/lib/auth';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import {
  getProducts, upsertProduct, deleteProduct,
  uploadBrandImage, updateProductImages, fetchAndUploadOrSaveUrl, saveProductImages,
  calcAllPlans, roundUp500, fmtPKR, CATEGORY_MAP,
  processCSVImport, reenrichAllProducts, rematchAllImages, getDataAudit, scanBucket, fixAllCategories,
  rebalanceCategories, getCategoryCounts, CAT_MIN, CAT_MAX,
  mergeDuplicates, findNearDuplicates, normalizeCategoryNames, type MergeResult, type MergePreviewGroup, type NearDupeGroup,
  composeImages, decomposeImages, logAdminAction, getAuditLog, clearAuditLog,
  getSolarLeads, updateSolarLeadStatus, saveSolarProposal, type SolarLead,
  type ImportSummary, type CsvImportRow, type Product, type AuditProduct, type BucketScanResult,
  type ProductGalleryImage, type AuditLogEntry,
} from '@/lib/api';
import { buildSearchIndex, adminSearch } from '@/lib/search';
import {
  PANEL_WATTS, PANEL_PRICE_PER_W, INVERTER_PKR_PER_KW, BATTERY_PKR_PER_KWH,
  UNIT_RATE_PKR, NET_METERING_COST_PKR, DEFAULT_BATTERY_CHEMISTRY,
  SAVING_PCT_3KW, SAVING_PCT_5KW, SAVING_PCT_8KW, SAVING_PCT_BATTERY_ADDON,
  BILL_THRESHOLD_SMALL, BILL_THRESHOLD_LARGE,
  ELEVATED_FRAME_PER_PANEL, WIRING_PER_W, LABOR_PER_W,
} from '@/lib/solarRules';
import {
  LogOut, Plus, Pencil, Trash2, Upload, Search, X, Check,
  ChevronDown, ChevronUp, Package, FileUp, Loader2, Sparkles, Image as ImageIcon,
  RefreshCw, AlertTriangle, Camera, ImageOff, Tag, Wand2, ListChecks, MessageCircle,
  CheckSquare, Square, Filter, History, Edit2, Star, MoveUp, MoveDown,
  Building2, Phone, Mail, Bell, Settings, ShoppingBag, CalendarDays, CheckCircle, Layers,
} from 'lucide-react';
import { useSettingsStore, SETTING_DEFAULTS, DEFAULT_BANNERS, type OfferBanner } from '@/store/settingsStore';
import * as XLSX from 'xlsx';

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugify(s: string) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }

/** A product "has an image" if it has a thumbnail or at least one gallery image. */
function productHasImage(p: { thumbnail?: string; gallery?: string[] }): boolean {
  return !!(p.thumbnail?.startsWith('http')) || (p.gallery?.some(u => u?.startsWith('http')) ?? false);
}

/** Returns the best displayable image URL — thumbnail first, then first gallery item. */
function productDisplayImage(p: { thumbnail?: string; gallery?: string[] }): string | undefined {
  if (p.thumbnail?.startsWith('http')) return p.thumbnail;
  return p.gallery?.find(u => u?.startsWith('http'));
}

const STOCK_OPTIONS = ['In Stock', 'Out of Stock', 'Coming Soon', 'Discontinued'];

// ── Shared Confirm Dialog ─────────────────────────────────────────────────────

function ConfirmDialog({
  title, message, confirmLabel = 'Confirm', danger = false,
  onConfirm, onCancel,
}: {
  title: string; message: React.ReactNode; confirmLabel?: string; danger?: boolean;
  onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full space-y-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className={`w-6 h-6 mt-0.5 shrink-0 ${danger ? 'text-red-500' : 'text-amber-500'}`} />
          <div>
            <h3 className="font-bold text-gray-900">{title}</h3>
            <div className="text-sm text-gray-500 mt-1 whitespace-pre-line">{message}</div>
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

// ── Auto-refresh hook ─────────────────────────────────────────────────────────
// Combines three mechanisms so every admin tab stays live:
//  1. Supabase Realtime — instant push when DB rows change
//  2. Polling interval  — safety net in case Realtime misses something
//  3. Page Visibility   — re-fetch the moment the admin tab regains focus
function useAutoRefresh(load: () => void, table: string, pollMs = 60_000) {
  const loadRef = useRef(load);
  useEffect(() => { loadRef.current = load; }, [load]);
  useEffect(() => {
    loadRef.current();
    const channel = supabase
      .channel(`admin-rt-${table}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, () => loadRef.current())
      .subscribe();
    const timer = setInterval(() => loadRef.current(), pollMs);
    const onVisible = () => { if (!document.hidden) loadRef.current(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [table, pollMs]);
}

// ── Image Drop Zone ───────────────────────────────────────────────────────────

function ImageDropZone({
  label, currentUrl, pathPreview, onFile, onUrl, uploading,
}: {
  label: string;
  currentUrl: string;
  pathPreview: string;
  onFile: (f: File) => void;
  onUrl?: (url: string) => Promise<void>;
  uploading: boolean;
}) {
  const [dragging, setDragging]   = useState(false);
  const [urlInput, setUrlInput]   = useState('');
  const [fetchingUrl, setFetchingUrl] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) onFile(file);
  }

  async function handleFetchUrl() {
    if (!urlInput.trim() || !onUrl) return;
    setFetchingUrl(true);
    try { await onUrl(urlInput.trim()); setUrlInput(''); }
    finally { setFetchingUrl(false); }
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

      {/* URL fetch row */}
      {onUrl && (
        <div className="flex gap-1 mt-1.5" onClick={e => e.stopPropagation()}>
          <input
            type="url"
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleFetchUrl(); } }}
            placeholder="Paste image URL and press Fetch…"
            className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-orange-400"
          />
          <button
            type="button"
            onClick={handleFetchUrl}
            disabled={!urlInput.trim() || fetchingUrl || uploading}
            className="px-2.5 py-1 bg-orange-500 text-white text-xs rounded-lg hover:bg-orange-600 disabled:opacity-40 flex items-center gap-1"
          >
            {fetchingUrl ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
            Fetch
          </button>
        </div>
      )}
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
    specs: {} as Record<string, string>,
  };
}

// ── Specs Editor ──────────────────────────────────────────────────────────────

// Row shape used internally by SpecsEditor
interface SpecRow { uid: number; key: string; val: string; }

let _specUid = 0;
function toRows(specs: Record<string, string>): SpecRow[] {
  return Object.entries(specs).map(([key, val]) => ({ uid: ++_specUid, key, val }));
}
function fromRows(rows: SpecRow[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const r of rows) {
    const k = r.key.trim();
    if (k) out[k] = r.val;
  }
  return out;
}

function SpecsEditor({
  specs, onChange,
}: {
  specs: Record<string, string>;
  onChange: (specs: Record<string, string>) => void;
}) {
  // Local rows — typing never touches parent state (no INP lag).
  // Keyed by product id in ProductModal, so remounts fresh per product.
  const [rows, setRows] = useState<SpecRow[]>(() => toRows(specs));
  const [newKey, setNewKey] = useState('');
  const [newVal, setNewVal] = useState('');

  // Ref always points to latest rows — avoids stale-closure bugs on blur
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  function push(nextRows: SpecRow[]) {
    rowsRef.current = nextRows;
    onChange(fromRows(nextRows));
  }

  function updateRow(uid: number, field: 'key' | 'val', value: string) {
    setRows(prev => prev.map(r => r.uid === uid ? { ...r, [field]: value } : r));
    // don't push on every keystroke — onBlur handles it
  }

  function flushOnBlur() {
    // rowsRef.current is always the latest rows, even if re-render hasn't committed yet
    onChange(fromRows(rowsRef.current));
  }

  function removeRow(uid: number) {
    const next = rows.filter(r => r.uid !== uid);
    push(next);
    setRows(next);
  }

  function addRow() {
    const k = newKey.trim();
    const v = newVal.trim();
    if (!k || !v) return;
    const next = [...rowsRef.current, { uid: ++_specUid, key: k, val: v }];
    push(next);
    setRows(next);
    setNewKey(''); setNewVal('');
  }

  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-gray-600">
        Specifications <span className="text-gray-400">({rows.length})</span>
      </label>

      {rows.length === 0 && (
        <p className="text-xs text-gray-400 italic">No specs yet — add rows below.</p>
      )}

      <div className="space-y-1.5">
        {rows.map(row => (
          <div key={row.uid} className="flex items-center gap-2">
            <input
              value={row.key}
              onChange={e => updateRow(row.uid, 'key', e.target.value)}
              onBlur={flushOnBlur}
              placeholder="Spec name"
              className="w-36 shrink-0 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-orange-400 font-medium"
            />
            <input
              value={row.val}
              onChange={e => updateRow(row.uid, 'val', e.target.value)}
              onBlur={flushOnBlur}
              placeholder="Value"
              className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            <button
              type="button"
              onClick={() => removeRow(row.uid)}
              className="p-1 text-red-400 hover:text-red-600 shrink-0"
              title="Remove spec"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Add new row */}
      <div className="flex items-center gap-2 pt-1">
        <input
          value={newKey}
          onChange={e => setNewKey(e.target.value)}
          placeholder="Spec name"
          className="w-36 shrink-0 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-orange-400"
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addRow(); } }}
        />
        <input
          value={newVal}
          onChange={e => setNewVal(e.target.value)}
          placeholder="Value"
          className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-orange-400"
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addRow(); } }}
        />
        <button
          type="button"
          onClick={addRow}
          disabled={!newKey.trim() || !newVal.trim()}
          className="p-1 text-orange-500 hover:text-orange-700 disabled:opacity-30 shrink-0"
          title="Add spec"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
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

  // Fetch an image from a URL and upload it to storage
  async function handleImageUrl(urlStr: string) {
    if (!form.brand || !form.model) { setErr('Set Brand and Model first.'); return; }
    setUploadingFile(true); setErr('');
    try {
      const pId = form.id || slugify(`${form.brand}-${form.model}`);
      const { savedUrl: url } = await fetchAndUploadOrSaveUrl(urlStr, pId, form.brand, form.model);
      const existing = (form.images as ProductGalleryImage[]) || [];
      if (!existing.some(i => i.url === url)) {
        const next = [...existing, { url, position: existing.length + 1, is_primary: existing.length === 0 }];
        set('images', next.map((img, idx) => ({ ...img, position: idx + 1, is_primary: idx === 0 })));
      }
    } catch (e: any) { setErr(e.message); }
    finally { setUploadingFile(false); }
  }

  function requestSave() {
    if (!form.brand || !form.model || !form.category || !form.retail_price?.toString().trim() || Number(form.retail_price) <= 0) {
      setErr('Brand, Model, Category, and Retail Price (must be a positive number) are required.'); return;
    }
    if (form.id) { setConfirmSave(true); return; }
    doSave();
  }

  async function doSave() {
    setConfirmSave(false); setSaving(true); setErr('');
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

          {/* Specs editor — keyed so it remounts fresh when switching products */}
          <div className="col-span-2 border border-gray-100 rounded-xl p-3 bg-gray-50">
            <SpecsEditor
              key={form.id || '__new__'}
              specs={form.specs || {}}
              onChange={s => set('specs', s)}
            />
          </div>

          {/* Tags */}
          <div className="col-span-2">
            <Field label="Tags (comma-separated)" value={form.tags} onChange={v => set('tags', v)} placeholder="inverter, 1.5 ton, energy-saving" />
          </div>

          {/* Description */}
          <div className="col-span-2">
            <Field label="Description" value={form.description} onChange={v => set('description', v)} multiline />
          </div>

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
                onUrl={url => handleImageUrl(url)}
                uploading={uploadingFile}
              />
              <ImageDropZone
                label="Upload Gallery (_2)"
                currentUrl=""
                pathPreview={galleryPath}
                onFile={f => handleImageFile(f, true)}
                onUrl={url => handleImageUrl(url)}
                uploading={uploadingFile}
              />
            </div>
          </div>

          <Field label="Warranty" value={form.warranty} onChange={v => set('warranty', v)} placeholder="5 years compressor" />
          <Field label="Colors" value={form.colors} onChange={v => set('colors', v)} placeholder="White, Silver" />
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
        ? <textarea value={value ?? ''} onChange={e => onChange(e.target.value)} rows={3} placeholder={placeholder} className={cls} />
        : <input type={type} value={value ?? ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={cls} />
      }
    </div>
  );
}

// ── Quick Image Upload (inline per-product) ───────────────────────────────────

function QuickImageUpload({
  product, onDone, onCancel,
}: { product: Product; onDone: () => void; onCancel: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [err, setErr]             = useState('');
  const [done, setDone]           = useState(false);
  const [notice, setNotice]       = useState('');
  // Separate fields: one thumbnail URL + multiple gallery URLs
  const [thumbUrl,  setThumbUrl]  = useState(product.thumbnail || '');
  const [galleryUrls, setGalleryUrls] = useState<string[]>(product.gallery || []);
  const thumbRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  // Upload a local file to storage and place it in the right slot
  async function uploadFile(file: File, slot: 'thumb' | 'gallery') {
    setErr('');
    try {
      const url = await uploadBrandImage(file, product.brand, product.model, false);
      if (slot === 'thumb') setThumbUrl(url);
      else setGalleryUrls(prev => [...prev.filter(u => u !== url), url]);
    } catch (e: any) { setErr(e.message); }
  }

  function addGallerySlot() {
    setGalleryUrls(prev => [...prev, '']);
  }

  function setGalleryUrl(idx: number, val: string) {
    setGalleryUrls(prev => prev.map((u, i) => i === idx ? val : u));
  }

  function removeGallerySlot(idx: number) {
    setGalleryUrls(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    const thumb = thumbUrl.trim();
    if (!thumb) { setErr('Enter a display image URL or upload a file'); return; }
    const gallery = galleryUrls.map(u => u.trim()).filter(u => u.startsWith('http') && u !== thumb);

    setUploading(true); setErr('');
    try {
      const result = await saveProductImages(
        product.id, product.brand, product.model,
        thumb, gallery,
        [], // don't keep old gallery — user has full control here
      );
      const total = 1 + result.gallery.length;
      setNotice(`${total} image${total !== 1 ? 's' : ''} saved ✓`);
      setDone(true);
      setTimeout(onDone, 1000);
    } catch (e: any) {
      setErr(e.message || 'Save failed — check your URLs and try again');
      setUploading(false);
    }
  }

  const canSave = !!thumbUrl.trim() && !uploading;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl p-5 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-bold text-gray-900 text-sm">{product.brand} · {product.model}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Add or replace product images</p>
          </div>
          <button onClick={onCancel} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
        </div>

        {done ? (
          <div className="flex flex-col items-center py-8 gap-2 text-green-600">
            <Check className="w-9 h-9" />
            <span className="text-sm font-semibold">{notice}</span>
          </div>
        ) : (
          <div className="space-y-4">

            {/* ── Thumbnail slot ── */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center text-[10px] font-black">1</span>
                Display Image (thumbnail)
              </label>
              {thumbUrl && thumbUrl.startsWith('http') && (
                <img src={thumbUrl} alt="" className="w-full h-32 object-contain rounded-xl border border-gray-100 bg-gray-50" />
              )}
              <div className="flex gap-2">
                <input
                  ref={thumbRef}
                  value={thumbUrl}
                  onChange={e => setThumbUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
                <label className="shrink-0 cursor-pointer flex items-center gap-1 border border-gray-200 hover:border-orange-300 text-gray-500 px-2.5 rounded-lg text-xs font-semibold">
                  <Camera className="w-3.5 h-3.5" />
                  File
                  <input type="file" accept="image/*" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f, 'thumb'); }} />
                </label>
              </div>
            </div>

            {/* ── Gallery slots ── */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">Additional Images (gallery)</label>
              {galleryUrls.map((url, idx) => (
                <div key={idx} className="space-y-1">
                  {url && url.startsWith('http') && (
                    <img src={url} alt="" className="w-full h-20 object-contain rounded-lg border border-gray-100 bg-gray-50" />
                  )}
                  <div className="flex gap-2">
                    <input
                      value={url}
                      onChange={e => setGalleryUrl(idx, e.target.value)}
                      placeholder={`https://example.com/image-${idx + 2}.jpg`}
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    />
                    <label className="shrink-0 cursor-pointer flex items-center gap-1 border border-gray-200 hover:border-orange-300 text-gray-500 px-2.5 rounded-lg text-xs font-semibold">
                      <Camera className="w-3.5 h-3.5" />
                      File
                      <input type="file" accept="image/*" className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f, 'gallery'); }} />
                    </label>
                    <button onClick={() => removeGallerySlot(idx)}
                      className="shrink-0 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              <button onClick={addGallerySlot}
                className="w-full border border-dashed border-gray-200 hover:border-orange-300 text-gray-400 hover:text-orange-500 py-2 rounded-lg text-xs font-semibold transition-colors">
                + Add another image
              </button>
            </div>

            {err && <p className="text-xs text-red-500 font-medium">{err}</p>}

            <button onClick={handleSave} disabled={!canSave}
              className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white py-2.5 rounded-xl text-sm font-bold">
              {uploading ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : 'Save Images'}
            </button>
          </div>
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

// ── Image slot counting (target: 1 thumbnail + 2 gallery = 3 images) ─────────

function imageSlotCount(p: Product): number {
  let n = 0;
  if (p.thumbnail?.startsWith('http')) n++;
  if (p.gallery) n += p.gallery.filter(u => u?.startsWith('http')).length;
  return n;
}

/** Export products with fewer than 3 images to Excel for bulk URL entry. */
function exportImageGapsXlsx(products: Product[]) {
  const rows = products
    .filter(p => imageSlotCount(p) < 3)
    .map(p => {
      const gallery = (p.gallery || []).filter(u => u?.startsWith('http'));
      return {
        id:          p.id,
        brand:       p.brand,
        model:       p.model,
        category:    p.normalized_category || p.category,
        name:        p.simplified_name || '',
        image_1:     p.thumbnail || '',
        image_2:     gallery[0] || '',
        image_3:     gallery[1] || '',
        images_have: imageSlotCount(p),
        images_missing: 3 - imageSlotCount(p),
      };
    });

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [
    { wch: 36 }, // id
    { wch: 14 }, // brand
    { wch: 20 }, // model
    { wch: 22 }, // category
    { wch: 30 }, // name
    { wch: 60 }, // image_1
    { wch: 60 }, // image_2
    { wch: 60 }, // image_3
    { wch: 12 }, // images_have
    { wch: 14 }, // images_missing
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Image Gaps');
  XLSX.writeFile(wb, `image-gaps-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/** Parse an image-gap import Excel file. Returns per-row results. */
async function importImageGapsXlsx(file: File, onProgress?: (msg: string) => void): Promise<{ ok: number; skipped: number; errors: string[] }> {
  const buf  = await file.arrayBuffer();
  const wb   = XLSX.read(buf, { type: 'array' });
  const ws   = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws);

  let ok = 0, skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const id = String(row['id'] || '').trim();
    if (!id) { skipped++; continue; }

    const img1 = String(row['image_1'] || '').trim();
    const img2 = String(row['image_2'] || '').trim();
    const img3 = String(row['image_3'] || '').trim();

    // Only update slots that now have a URL (never blank out existing)
    const thumbnail_url = img1.startsWith('http') ? img1 : undefined;
    const gallery_urls  = [img2, img3].filter(u => u.startsWith('http'));

    if (!thumbnail_url && gallery_urls.length === 0) { skipped++; continue; }

    try {
      const update: Record<string, unknown> = {};
      if (thumbnail_url) update.thumbnail_url = thumbnail_url;
      if (gallery_urls.length) {
        // fetch existing gallery first, then merge
        const { data } = await supabase.from('products').select('gallery_urls').eq('id', id).single();
        const existing: string[] = Array.isArray(data?.gallery_urls) ? data.gallery_urls : [];
        const merged = [...new Set([...gallery_urls, ...existing])];
        update.gallery_urls = merged;
      }
      const { error } = await supabase.from('products').update(update).eq('id', id);
      if (error) { errors.push(`${id}: ${error.message}`); }
      else { ok++; onProgress?.(`Updated ${id}`); }
    } catch (e) {
      errors.push(`${id}: ${String(e)}`);
    }
  }
  return { ok, skipped, errors };
}

// ── Images Tab ────────────────────────────────────────────────────────────────

function ImagesTab({ products, onRefresh }: { products: Product[]; onRefresh: () => void }) {
  const [brandFilter, setBrandFilter]       = useState('');
  const [missingOnly, setMissingOnly]       = useState(false);
  const [quickImg, setQuickImg]             = useState<Product | null>(null);
  const [rematching, setRematching]         = useState(false);
  const [rematchResult, setRematchResult]   = useState<{ found: number; missing: number; cleared: number } | null>(null);
  const [clearUnmatched, setClearUnmatched] = useState(true);
  const [fixQueueOpen, setFixQueueOpen]     = useState(false);
  const [confirmRematch, setConfirmRematch] = useState(false);
  const [importing, setImporting]           = useState(false);
  const [importResult, setImportResult]     = useState<{ ok: number; skipped: number; errors: string[] } | null>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting]             = useState(false);

  const brands = [...new Set(products.map(p => p.brand))].sort();

  const hasImg = productHasImage;

  const missingProducts    = products.filter(p => !hasImg(p));
  const under3Products     = products.filter(p => imageSlotCount(p) < 3);

  const filtered = products
    .filter(p => !brandFilter || p.brand === brandFilter)
    .filter(p => !missingOnly || !hasImg(p));

  const totalWithImg = products.filter(hasImg).length;
  const totalMissing = missingProducts.length;
  const totalUnder3  = under3Products.length;

  async function handleRematch() {
    setRematching(true); setRematchResult(null);
    const r = await rematchAllImages(() => {}, undefined, { clearUnmatched });
    setRematchResult(r); setRematching(false); onRefresh();
  }

  async function handleDeleteProduct(id: string) {
    setDeleting(true);
    try { await deleteProduct(id); onRefresh(); }
    finally { setDeleting(false); setDeleteConfirmId(null); }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true); setImportResult(null);
    const result = await importImageGapsXlsx(file);
    setImportResult(result); setImporting(false);
    onRefresh();
    if (importRef.current) importRef.current.value = '';
  }

  return (
    <div className="max-w-6xl mx-auto py-6 space-y-4">
      {/* Summary bar */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="text-2xl font-black text-green-600">{totalWithImg}</div>
          <div className="text-xs text-gray-500 mt-0.5">Have at least 1 image</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className={`text-2xl font-black ${totalMissing > 0 ? 'text-red-500' : 'text-gray-300'}`}>{totalMissing}</div>
          <div className="text-xs text-gray-500 mt-0.5">No images at all</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className={`text-2xl font-black ${totalUnder3 > 0 ? 'text-amber-500' : 'text-gray-300'}`}>{totalUnder3}</div>
          <div className="text-xs text-gray-500 mt-0.5">Under 3 images</div>
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
        {/* Excel export — products with < 3 images */}
        {totalUnder3 > 0 && (
          <button onClick={() => exportImageGapsXlsx(products)}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold">
            <FileUp className="w-4 h-4" />
            Export {totalUnder3} gaps (.xlsx)
          </button>
        )}
        {/* Excel import */}
        <label className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold cursor-pointer ${importing ? 'bg-gray-300 text-gray-500' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
          {importing ? <><Loader2 className="w-4 h-4 animate-spin" />Importing…</> : <><Upload className="w-4 h-4" />Import URLs (.xlsx)</>}
          <input ref={importRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} disabled={importing} />
        </label>
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

      {/* Import result */}
      {importResult && (
        <div className={`text-sm font-medium px-4 py-2 rounded-lg ${importResult.errors.length ? 'bg-amber-50 text-amber-800' : 'bg-green-50 text-green-800'}`}>
          Import done: {importResult.ok} updated · {importResult.skipped} skipped
          {importResult.errors.length > 0 && <span className="text-red-600"> · {importResult.errors.length} errors: {importResult.errors.slice(0, 3).join(', ')}</span>}
        </div>
      )}

      {rematchResult && (
        <p className={`text-sm font-medium ${rematchResult.missing > 0 ? 'text-amber-600' : 'text-green-600'}`}>
          Re-match done: {rematchResult.found} matched · {rematchResult.missing} still missing
          {rematchResult.cleared > 0 && ` · ${rematchResult.cleared} stock images cleared`}
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
                        ? <img src={productDisplayImage(p)} alt={p.model} className="w-10 h-10 object-cover rounded-lg border bg-gray-100" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                        : <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center"><ImageOff className="w-5 h-5 text-gray-300" /></div>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">{p.brand}</div>
                      <div className="text-xs text-gray-400">{p.model}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{p.simplified_name || '—'}</td>
                    <td className="px-4 py-3 text-[10px] text-gray-400 font-mono">{path}</td>
                    <td className="px-4 py-3 space-y-1">
                      {p.thumbnail?.startsWith('http')
                        ? <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium block w-fit">Thumbnail ✓</span>
                        : hasImage
                          ? <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium block w-fit">Gallery only</span>
                          : <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium block w-fit">No image</span>}
                      {(() => { const n = imageSlotCount(p); return n < 3 ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 font-medium block w-fit">
                          {n}/3 — missing {3 - n}
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-50 text-gray-400 font-medium block w-fit">3/3 ✓</span>
                      ); })()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => setQuickImg(p)}
                          className="flex items-center gap-1 text-xs bg-orange-50 hover:bg-orange-100 text-orange-600 font-medium px-2 py-1.5 rounded-lg transition-colors">
                          <Camera className="w-3.5 h-3.5" />
                          Upload
                        </button>
                        <button onClick={() => setDeleteConfirmId(p.id)}
                          className="flex items-center gap-1 text-xs bg-red-50 hover:bg-red-100 text-red-600 font-medium px-2 py-1.5 rounded-lg transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
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
          message={
            <div className="space-y-3">
              <p>This will scan the storage bucket and update thumbnail/gallery URLs for every product.</p>
              <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <input type="checkbox" checked={clearUnmatched} onChange={e => setClearUnmatched(e.target.checked)} className="accent-orange-500" />
                <span>Also clear stock/wrong images for products with no Storage match</span>
              </label>
            </div>
          }
          confirmLabel="Yes, Re-match"
          onConfirm={() => { setConfirmRematch(false); handleRematch(); }}
          onCancel={() => setConfirmRematch(false)}
        />
      )}

      {deleteConfirmId && (() => {
        const p = products.find(x => x.id === deleteConfirmId);
        return (
          <ConfirmDialog
            title="Delete Product?"
            message={<p>Permanently delete <strong>{p?.brand} {p?.model}</strong>? This cannot be undone.</p>}
            confirmLabel={deleting ? 'Deleting…' : 'Delete'}
            danger
            onConfirm={() => handleDeleteProduct(deleteConfirmId)}
            onCancel={() => setDeleteConfirmId(null)}
          />
        );
      })()}
    </div>
  );
}

// ── CSV Import Tab ────────────────────────────────────────────────────────────

const HEADER_MAP: Record<string, string> = {
  brand: 'Brand', 'brand name': 'Brand', 'make': 'Brand',
  model: 'Model', 'model number': 'Model', 'model no': 'Model', 'model #': 'Model', 'part no': 'Model', 'part number': 'Model',
  category: 'Category', 'product category': 'Category', 'type': 'Category', 'product type': 'Category',
  retail_price: 'Retail_Price', 'retail price': 'Retail_Price',
  price: 'Retail_Price', 'mrp': 'Retail_Price', 'cash price': 'Retail_Price',
  'list price': 'Retail_Price', 'selling price': 'Retail_Price', 'dealer price': 'Retail_Price',
  'net price': 'Retail_Price', 'unit price': 'Retail_Price', 'pkr': 'Retail_Price',
  'cash floor': 'Retail_Price', 'min price': 'Retail_Price', 'floor price': 'Retail_Price',
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

/** Normalise a model string for fuzzy duplicate matching.
 *  Strips spaces/dashes/underscores and lowercases.
 *  Also collapses common OCR confusions: 0↔O, 1↔I↔L, 5↔S, 8↔B, 6↔G.
 *  Returns the canonical key used to detect near-duplicate model numbers. */
function normModel(s: string): string {
  return s.toLowerCase()
    .replace(/\s+/g, '').replace(/[-_]/g, '')
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/5/g, 's')
    .replace(/8/g, 'b')
    .replace(/6/g, 'g');
}

interface DuplicateHit {
  csvRow:    CsvImportRow;
  existingModel: string;
  existingId:    string;
  kind: 'exact' | 'fuzzy';
}

function findDuplicates(rows: CsvImportRow[], existing: Product[]): DuplicateHit[] {
  const hits: DuplicateHit[] = [];
  // Build lookup: brand → model → id
  const exact  = new Map<string, string>(); // `${brand}|${model.toLowerCase()}` → id
  const fuzzy  = new Map<string, { model: string; id: string }>(); // `${brand}|${normModel}` → {model,id}
  for (const p of existing) {
    const bk = p.brand.toLowerCase();
    exact.set(`${bk}|${p.model.toLowerCase()}`, p.id);
    const fk = `${bk}|${normModel(p.model)}`;
    if (!fuzzy.has(fk)) fuzzy.set(fk, { model: p.model, id: p.id });
  }
  for (const row of rows) {
    const brand = (row['Brand'] || '').trim();
    const model = (row['Model'] || '').trim();
    if (!brand || !model) continue;
    const bk = brand.toLowerCase();
    const ek = `${bk}|${model.toLowerCase()}`;
    if (exact.has(ek)) {
      hits.push({ csvRow: row, existingModel: model, existingId: exact.get(ek)!, kind: 'exact' });
      continue;
    }
    const fk = `${bk}|${normModel(model)}`;
    if (fuzzy.has(fk)) {
      const m = fuzzy.get(fk)!;
      if (m.model.toLowerCase() !== model.toLowerCase()) { // only flag if models visually differ
        hits.push({ csvRow: row, existingModel: m.model, existingId: m.id, kind: 'fuzzy' });
      }
    }
  }
  return hits;
}

function ImportTab({ onImported, existingProducts }: { onImported: () => void; existingProducts: Product[] }) {
  const [rows, setRows]           = useState<CsvImportRow[]>([]);
  const [progress, setProgress]   = useState<string>('');
  const [summary, setSummary]     = useState<ImportSummary | null>(null);
  const [err, setErr]             = useState('');
  const [rematchImgs, setRematchImgs] = useState(false);
  const [dupeOverride, setDupeOverride] = useState(false);

  const dupes = useMemo(() => rows.length > 0 ? findDuplicates(rows, existingProducts) : [], [rows, existingProducts]);
  const fuzzyDupes = dupes.filter(d => d.kind === 'fuzzy');
  const exactDupes = dupes.filter(d => d.kind === 'exact');
  const hasBlockingDupes = fuzzyDupes.length > 0 && !dupeOverride;

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      setRows(parseCSV(text));
      setSummary(null); setErr(''); setProgress(''); setDupeOverride(false);
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    if (rows.length === 0 || hasBlockingDupes) return;
    setErr(''); setSummary(null);
    try {
      const result = await processCSVImport(rows, msg => setProgress(msg), { rematchImages: rematchImgs });
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
          <p className="mt-2 text-blue-600">Products not in this upload are <strong>not changed</strong> — they stay visible in listings until you manually disable them.</p>
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

          {/* ── Duplicate / OCR check panel ── */}
          {dupes.length > 0 && (
            <div className={`mb-4 rounded-2xl border p-4 ${fuzzyDupes.length > 0 ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
              <p className={`text-sm font-bold mb-2 flex items-center gap-2 ${fuzzyDupes.length > 0 ? 'text-red-800' : 'text-amber-800'}`}>
                <AlertTriangle className="w-4 h-4" />
                {fuzzyDupes.length > 0
                  ? `${fuzzyDupes.length} likely OCR/typo duplicate${fuzzyDupes.length !== 1 ? 's' : ''} detected — import blocked`
                  : `${exactDupes.length} exact match${exactDupes.length !== 1 ? 'es' : ''} found — prices will update, no new products created`}
              </p>

              {fuzzyDupes.length > 0 && (
                <>
                  <p className="text-xs text-red-700 mb-3">
                    These CSV models look like corrupted versions of existing models (0↔O, 1↔I, 5↔S, 8↔B, 6↔G confusion). Check the source price list carefully before importing.
                  </p>
                  <div className="overflow-x-auto rounded-lg border border-red-200 mb-3">
                    <table className="text-xs w-full bg-white">
                      <thead className="bg-red-50">
                        <tr>
                          <th className="text-left px-3 py-2 text-red-700">Brand</th>
                          <th className="text-left px-3 py-2 text-red-700">CSV Model (suspect)</th>
                          <th className="text-left px-3 py-2 text-red-700">Existing Model (in DB)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fuzzyDupes.map((d, i) => (
                          <tr key={i} className="border-t border-red-100">
                            <td className="px-3 py-1.5 text-gray-700">{d.csvRow['Brand']}</td>
                            <td className="px-3 py-1.5 font-mono text-red-700 font-bold">{d.csvRow['Model']}</td>
                            <td className="px-3 py-1.5 font-mono text-gray-600">{d.existingModel}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-red-700 cursor-pointer select-none">
                    <input type="checkbox" checked={dupeOverride} onChange={e => setDupeOverride(e.target.checked)} className="accent-red-500" />
                    I have verified these are genuinely new models — override block and allow import
                  </label>
                </>
              )}

              {fuzzyDupes.length === 0 && exactDupes.length > 0 && (
                <div className="overflow-x-auto rounded-lg border border-amber-200">
                  <table className="text-xs w-full bg-white">
                    <thead className="bg-amber-50">
                      <tr>
                        <th className="text-left px-3 py-2 text-amber-700">Brand</th>
                        <th className="text-left px-3 py-2 text-amber-700">Model (existing — price will update)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {exactDupes.slice(0, 10).map((d, i) => (
                        <tr key={i} className="border-t border-amber-100">
                          <td className="px-3 py-1.5 text-gray-700">{d.csvRow['Brand']}</td>
                          <td className="px-3 py-1.5 font-mono text-gray-600">{d.existingModel}</td>
                        </tr>
                      ))}
                      {exactDupes.length > 10 && (
                        <tr><td colSpan={2} className="px-3 py-1.5 text-amber-600 text-center">…and {exactDupes.length - 10} more</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-medium text-gray-700">{rows.length} rows detected — preview:</p>
              <label className="flex items-center gap-2 mt-1 cursor-pointer select-none">
                <input type="checkbox" checked={rematchImgs} onChange={e => setRematchImgs(e.target.checked)} className="accent-orange-500" />
                <span className="text-xs text-gray-500">Re-match images for existing products</span>
              </label>
            </div>
            <button onClick={handleImport} disabled={!!progress || hasBlockingDupes}
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-5 py-2 rounded-lg text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed">
              {progress
                ? <><Loader2 className="w-4 h-4 animate-spin" /> {progress}</>
                : hasBlockingDupes
                  ? <><AlertTriangle className="w-4 h-4" /> Blocked — resolve OCR dupes first</>
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

      {summary && (() => {
        // Separate taxonomy review items from hard errors
        const reviewItems  = summary.errors.filter(e => e.startsWith('Review required:'));
        const draftItems   = summary.errors.filter(e => e.startsWith('Draft (no price):'));
        const hardErrors   = summary.errors.filter(e => !e.startsWith('Review required:') && !e.startsWith('Draft (no price):'));
        return (
          <div className="mt-6 bg-green-50 rounded-2xl p-6 space-y-4">
            <h4 className="font-bold text-gray-900">Import Complete</h4>
            <p className="text-xs text-gray-500">
              Existing products had <strong>prices &amp; installment plans updated only</strong> — names, specs, images, descriptions, and status were preserved.
              New products were fully enriched. All price changes were logged to history.
              Products absent from this upload were <strong>not changed</strong> — they remain active until you disable them manually.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <SummaryCard label="New Products"       value={summary.added}              color="text-green-700"  />
              <SummaryCard label="Prices Updated"     value={summary.updated}            color="text-blue-700"   />
              <SummaryCard label="Not in CSV"         value={summary.notInCsv ?? 0}      color="text-gray-500"   />
              <SummaryCard label="Images Found"       value={summary.imagesFound}        color="text-purple-700" />
              <SummaryCard label="Images Missing"     value={summary.imagesMissing}      color={summary.imagesMissing > 0 ? 'text-amber-600' : 'text-gray-400'} />
              <SummaryCard label="Taxonomy Review"    value={reviewItems.length}         color={reviewItems.length > 0 ? 'text-amber-600' : 'text-gray-400'} />
            </div>

            {/* Taxonomy review queue — these products are saved but NOT live */}
            {reviewItems.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-xs font-bold text-amber-800 mb-2">
                  ⚠️ {reviewItems.length} product{reviewItems.length > 1 ? 's' : ''} queued for taxonomy review (not yet live)
                </p>
                <p className="text-xs text-amber-700 mb-2">
                  These products have unrecognized categories. They are saved with <code>taxonomy_status = 'review'</code> and will not appear in the public catalog until you resolve their category mapping in <code>src/lib/taxonomy.ts</code> or approve them manually.
                </p>
                <ul className="space-y-1">
                  {reviewItems.map((e, i) => (
                    <li key={i} className="text-xs text-amber-700 font-mono bg-amber-100 rounded px-2 py-1">{e.replace('Review required: ', '')}</li>
                  ))}
                </ul>
                <p className="text-xs text-amber-600 mt-2 font-semibold">
                  To resolve: add the raw category string to <code>TAXONOMY_REGISTRY</code> aliases in <code>src/lib/taxonomy.ts</code>, then re-import or manually set <code>taxonomy_status = 'live'</code> in Supabase.
                </p>
              </div>
            )}

            {/* Draft products (no price) */}
            {draftItems.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                <p className="text-xs font-bold text-blue-700 mb-1">ℹ️ {draftItems.length} draft product{draftItems.length > 1 ? 's' : ''} (no price — set price to publish)</p>
                <ul className="space-y-0.5">
                  {draftItems.map((e, i) => <li key={i} className="text-xs text-blue-600 font-mono">{e.replace('Draft (no price): ', '')}</li>)}
                </ul>
              </div>
            )}

            {/* Hard errors */}
            {(hardErrors.length > 0 || err) && (
              <div className="bg-red-50 rounded-lg p-3">
                <p className="text-xs font-medium text-red-600 mb-1">Errors ({hardErrors.length}):</p>
                <p className="text-xs text-red-500 whitespace-pre-line">{hardErrors.join('\n')}</p>
                {err && <p className="text-xs text-red-500 mt-1">{err}</p>}
              </div>
            )}
            <button onClick={() => { setRows([]); setSummary(null); setErr(''); }}
              className="text-sm text-gray-500 hover:text-gray-800 underline">Import another file</button>
          </div>
        );
      })()}
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

// Quick spec presets — each applies a single spec key+value via merge
const QUICK_SPEC_PRESETS: { label: string; key: string; val: string; color?: string }[] = [
  // AC
  { label: 'T3 ✓',        key: 'T3',       val: 'Yes',                                          color: 'blue'   },
  { label: 'T3 ✗',        key: 'T3',       val: 'No',                                           color: 'gray'   },
  { label: 'Heat & Cool', key: 'Heating',  val: 'Yes — Heat & Cool (works in winter)',           color: 'red'    },
  { label: 'Cool Only',   key: 'Heating',  val: 'No (cooling only)',                             color: 'sky'    },
  { label: 'Inverter ✓',  key: 'Inverter', val: 'Yes',                                          color: 'green'  },
  { label: 'Inverter ✗',  key: 'Inverter', val: 'No',                                           color: 'gray'   },
  // Fridge
  { label: 'Glass Door',  key: 'Type',     val: 'Glass Door',                                   color: 'purple' },
  { label: 'Double Door', key: 'Type',     val: 'Double Door',                                  color: 'indigo' },
  { label: 'Side-by-Side',key: 'Type',     val: 'Side-by-Side (No-Frost)',                      color: 'indigo' },
  { label: 'French Door', key: 'Type',     val: 'French Door / T-Door',                         color: 'indigo' },
  // Washer
  { label: 'Front Load',  key: 'Type',     val: 'Front Load — Fully Automatic',                 color: 'teal'   },
  { label: 'Top Load',    key: 'Type',     val: 'Top Load — Fully Automatic',                   color: 'teal'   },
  { label: 'Semi-Auto',   key: 'Type',     val: 'Semi-Automatic',                               color: 'teal'   },
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
              const newPrice = Number(value);
              const cashFloor = roundUp500(newPrice);
              const plans = calcAllPlans(cashFloor, p.category);
              const p2 = plans['2m'], p3 = plans['3m'], p6 = plans['6m'], p12 = plans['12m'];
              patch.retail_price  = newPrice;
              patch.cash_floor    = cashFloor;
              patch.adv_2m = p2?.advance ?? null;  patch.monthly_2m = p2?.monthly ?? null;  patch.total_2m = p2?.total ?? null;
              patch.adv_3m = p3?.advance ?? null;  patch.monthly_3m = p3?.monthly ?? null;  patch.total_3m = p3?.total ?? null;
              patch.adv_6m = p6?.advance ?? null;  patch.monthly_6m = p6?.monthly ?? null;  patch.total_6m = p6?.total ?? null;
              patch.adv_12m = p12?.advance ?? null; patch.monthly_12m = p12?.monthly ?? null; patch.total_12m = p12?.total ?? null;
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
                      ${action === a
                        ? a === 'replace' ? 'bg-red-500 text-white' : 'bg-orange-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {a === 'merge' ? 'Merge (keep existing)' : '⚠ Replace all specs'}
                  </button>
                ))}
              </div>
              {action === 'replace' && (
                <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 font-medium">
                  Warning: this will delete ALL existing specs on {n} product{n !== 1 ? 's' : ''} and replace with only the one spec you enter below.
                </p>
              )}
              {/* Quick presets */}
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Quick Presets</p>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_SPEC_PRESETS.map(preset => (
                    <button key={preset.label} type="button"
                      onClick={() => { setSpecKey(preset.key); setSpecVal(preset.val); setAction('merge'); }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors
                        ${specKey === preset.key && specVal === preset.val
                          ? 'bg-orange-500 text-white border-orange-500'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-orange-300 hover:text-orange-700'}`}>
                      {preset.label}
                    </button>
                  ))}
                </div>
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

import { runQC, qcSummary, scoreProduct, QC_FILTER_OPTIONS, REQUIRED_SPECS, flagImageMismatch, clearImageMismatch, getImageMismatchFlags, type QCCode, type QCResult } from '@/lib/qc';
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
    const urls = urlInput.split(/[\n,]+/).map(u => u.trim()).filter(u => u.startsWith('http'));
    if (!urls.length) { setErr('Enter a valid URL starting with http'); return; }
    setSaving(true); setErr('');
    const results = await Promise.allSettled(
      urls.map(url => fetchAndUploadOrSaveUrl(url, product.id, product.brand, product.model))
    );
    const saved  = results.filter(r => r.status === 'fulfilled').length;
    const errors = results
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map(r => r.reason?.message || String(r.reason));
    setSaving(false);
    if (saved === 0) {
      setErr(errors[0] || 'Save failed — check the URL and try again');
      return;
    }
    onSaved();
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
              <label className="text-xs font-semibold text-gray-700 block">Add / Replace Image URL(s)</label>
              <textarea value={urlInput} onChange={e => setUrlInput(e.target.value)} rows={2}
                placeholder={"https://…/image1.jpg\nhttps://…/image2.jpg"}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none" />
              <p className="text-[10px] text-gray-400 -mt-1">Enter one URL per line — first becomes thumbnail, others go to gallery.</p>
              <div className="flex gap-2 flex-wrap">
                <button onClick={saveImage} disabled={saving || !urlInput.trim()}
                  className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white text-xs font-bold px-4 py-2 rounded-lg">
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null} Save Image(s)
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
                      <button key={url} onClick={() => setUrlInput(prev => {
                        const lines = prev.split('\n').map(l => l.trim()).filter(Boolean);
                        return lines.includes(url) ? lines.filter(l => l !== url).join('\n') : [...lines, url].join('\n');
                      })}
                        className={`rounded-lg overflow-hidden border-2 transition-all ${urlInput.includes(url) ? 'border-orange-500' : 'border-gray-100 hover:border-orange-300'}`}>
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
      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Products',    value: summary.total,           color: 'text-gray-900', bg: '' },
          { label: 'QC Issues',         value: summary.qcIssues,        color: summary.qcIssues > 0 ? 'text-red-600' : 'text-green-600', bg: summary.qcIssues > 0 ? 'border-red-200' : '' },
          { label: 'No Image',          value: summary.missingImage,    color: summary.missingImage > 0 ? 'text-red-600' : 'text-gray-400', bg: summary.missingImage > 0 ? 'border-red-200' : '' },
          { label: 'Gallery Only (no thumbnail)', value: summary.missingPrimary, color: summary.missingPrimary > 0 ? 'text-amber-600' : 'text-gray-400', bg: '' },
        ].map(s => (
          <div key={s.label} className={`bg-white rounded-xl border p-4 ${s.bg || 'border-gray-100'}`}>
            <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Missing Specs',  value: summary.missingSpecs, color: summary.missingSpecs > 0 ? 'text-blue-600' : 'text-gray-400' },
          { label: 'Invalid Names',  value: summary.invalidName,  color: summary.invalidName > 0 ? 'text-purple-600' : 'text-gray-400' },
          { label: 'Missing Desc',   value: summary.missingDesc,  color: summary.missingDesc > 0 ? 'text-gray-600' : 'text-gray-400' },
          { label: 'Price Errors',   value: summary.priceError,   color: summary.priceError > 0 ? 'text-red-500' : 'text-gray-400' },
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
                          {productHasImage(p)
                            ? <img src={productDisplayImage(p)} alt="" className="w-full h-full object-cover"
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
  const [imageResult,    setImageResult]    = useState<{ found: number; missing: number; cleared: number; errors: string[] } | null>(null);
  const [catProgress,    setCatProgress]    = useState('');
  const [catResult,      setCatResult]      = useState<{ fixed: number; skipped: number; errors: string[] } | null>(null);
  const [allResult,      setAllResult]      = useState<string | null>(null);
  const [scanLoading,    setScanLoading]    = useState(false);
  const [scanResult,     setScanResult]     = useState<BucketScanResult | null>(null);
  const [audit,          setAudit]          = useState<AuditProduct[] | null>(null);
  const [auditLoading,   setAuditLoading]   = useState(false);
  const [fixingId,       setFixingId]       = useState<string | null>(null);
  const [confirmBulk,    setConfirmBulk]    = useState<null | { title: string; message: string; action: () => void }>(null);
  const [rebalProgress,  setRebalProgress]  = useState('');
  const [rebalResult,    setRebalResult]    = useState<{ updated: number; unchanged: number; byCategory: Record<string, number>; errors: string[] } | null>(null);
  const [catCounts,      setCatCounts]      = useState<Record<string, number> | null>(null);
  const [catCountsLoading, setCatCountsLoading] = useState(false);
  const [mergeProgress,  setMergeProgress]  = useState('');
  const [mergeResult,    setMergeResult]    = useState<MergeResult | null>(null);
  const [mergePreview,   setMergePreview]   = useState<MergePreviewGroup[] | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [normLoading,    setNormLoading]    = useState(false);
  const [normResult,     setNormResult]     = useState('');
  const [nearDupes,      setNearDupes]      = useState<NearDupeGroup[] | null>(null);
  const [nearDupesLoading, setNearDupesLoading] = useState(false);
  const [deletingNearId, setDeletingNearId] = useState<string | null>(null);

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

  function isBusy() { return !!enrichProgress || !!imageProgress || !!catProgress || !!rebalProgress || !!mergeProgress; }

  async function handlePreviewMerge() {
    setMergePreview(null); setMergeResult(null); setPreviewLoading(true);
    const r = await mergeDuplicates(setMergeProgress, true);
    setMergePreview(r.preview ?? []); setPreviewLoading(false);
  }

  async function handleMergeDuplicates() {
    setMergeResult(null); setMergePreview(null); setAllResult(null);
    const r = await mergeDuplicates(setMergeProgress);
    setMergeResult(r); onRefresh();
  }

  async function handleScanNearDupes() {
    setNearDupesLoading(true); setNearDupes(null);
    const groups = await findNearDuplicates();
    setNearDupes(groups); setNearDupesLoading(false);
  }

  async function handleDeleteNearDupe(id: string, groupKey: string) {
    setDeletingNearId(id);
    await supabase.from('products').delete().eq('id', id);
    setNearDupes(prev => prev?.map(g =>
      g.key === groupKey ? { ...g, products: g.products.filter(p => p.id !== id) } : g
    ).filter(g => g.products.length > 1) ?? null);
    setDeletingNearId(null);
    onRefresh();
  }

  async function handleNormalizeCategories() {
    setNormLoading(true); setNormResult('');
    const msg = await normalizeCategoryNames();
    setNormResult(msg); setNormLoading(false);
    onRefresh();
  }

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
    const r = await rematchAllImages(setImageProgress, getScopeIds(), { clearUnmatched: true });
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
    const ir = await rematchAllImages(setImageProgress, ids, { clearUnmatched: true });
    setImageResult(ir);
    const total = er.done;
    setAllResult(`Done: ${total} enriched · ${cr.fixed} categories fixed · ${ir.found} images matched${ir.cleared > 0 ? ` · ${ir.cleared} stock images cleared` : ''}`);
    onRefresh(); loadAudit();
  }

  async function handleScan() {
    setScanLoading(true); setScanResult(null);
    const r = await scanBucket();
    setScanResult(r); setScanLoading(false);
  }

  async function loadCatCounts() {
    setCatCountsLoading(true);
    setCatCounts(await getCategoryCounts());
    setCatCountsLoading(false);
  }

  async function handleRebalance() {
    setRebalResult(null); setAllResult(null);
    const r = await rebalanceCategories(setRebalProgress, getScopeIds());
    setRebalResult(r);
    await loadCatCounts();
    onRefresh(); loadAudit();
  }

  useEffect(() => { loadCatCounts(); }, []);

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

            {/* Rebalance Categories */}
          <div className="border border-orange-100 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-orange-50 rounded-lg flex items-center justify-center">
                <Filter className="w-3.5 h-3.5 text-orange-500" />
              </div>
              <span className="font-semibold text-gray-800 text-sm">Rebalance Categories</span>
            </div>
            <p className="text-xs text-gray-400">
              Splits oversized categories and fixes miscategorized products so every category stays within {CAT_MIN}–{CAT_MAX} products.
              Runs automatically based on tonnage, size, and product type.
            </p>
            <button
              onClick={() => setConfirmBulk({ title: 'Rebalance Categories?', message: `Apply subcategory rules (tonnage, size, type) to ${getScopeLabel()}. This will move products between categories automatically.`, action: handleRebalance })}
              disabled={isBusy() || !!rebalProgress || scopeEmpty}
              className="w-full flex items-center justify-center gap-1.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white py-2 rounded-lg text-xs font-bold">
              {rebalProgress
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span className="truncate max-w-[140px]">{rebalProgress}</span></>
                : <><Filter className="w-3.5 h-3.5" />Rebalance Categories</>}
            </button>
            {rebalResult && (
              <p className={`text-xs font-medium ${rebalResult.errors.length ? 'text-amber-600' : 'text-green-600'}`}>
                {rebalResult.updated} moved · {rebalResult.unchanged} ok{rebalResult.errors.length ? ` · ${rebalResult.errors.length} errors` : ' ✓'}
              </p>
            )}
          </div>

          {/* Normalize Category Names */}
          <div className="border border-gray-100 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center">
                <RefreshCw className="w-3.5 h-3.5 text-blue-500" />
              </div>
              <span className="font-semibold text-gray-800 text-sm">Normalize Categories</span>
            </div>
            <p className="text-xs text-gray-400">Fixes singular/plural mismatches ("Refrigerator" → "Refrigerators") and collapses legacy names ("Televisions &amp; LEDs" → "Televisions") directly in the DB.</p>
            <button
              onClick={handleNormalizeCategories}
              disabled={normLoading || isBusy()}
              className="w-full flex items-center justify-center gap-1.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white py-2 rounded-lg text-xs font-bold">
              {normLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Normalizing…</> : <><RefreshCw className="w-3.5 h-3.5" />Normalize Categories</>}
            </button>
            {normResult && <p className="text-xs font-medium text-green-600">{normResult}</p>}
          </div>

          {/* Merge Duplicates */}
          <div className="border border-gray-100 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-red-50 rounded-lg flex items-center justify-center">
                <Trash2 className="w-3.5 h-3.5 text-red-500" />
              </div>
              <span className="font-semibold text-gray-800 text-sm">Merge Duplicates</span>
            </div>
            <p className="text-xs text-gray-400">Strips color suffixes, REF/WB/LF codes, and slash-variants so same-series listings merge. Keeps the entry with image + highest price.</p>
            <div className="flex gap-2">
              <button
                onClick={handlePreviewMerge}
                disabled={isBusy() || previewLoading}
                className="flex-1 flex items-center justify-center gap-1.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 py-2 rounded-lg text-xs font-bold">
                {previewLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : '🔍'} Preview
              </button>
              <button
                onClick={() => setConfirmBulk({ title: 'Merge Duplicates?', message: 'Scans all products. Strips REF prefix, WB/LF, and color words (Gem Black, Cloud White, Coral Red, NOIR, Metallic Gold, etc.) before comparing. The entry with an image + highest price is kept; others are permanently deleted.', action: handleMergeDuplicates })}
                disabled={isBusy()}
                className="flex-1 flex items-center justify-center gap-1.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white py-2 rounded-lg text-xs font-bold">
                {mergeProgress ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span className="truncate max-w-[100px]">{mergeProgress}</span></> : <><Trash2 className="w-3.5 h-3.5" />Merge</>}
              </button>
            </div>
            {mergeResult && (
              <p className={`text-xs font-medium ${mergeResult.errors.length ? 'text-amber-600' : 'text-green-600'}`}>
                {mergeResult.groups} groups · {mergeResult.deleted} deleted · {mergeResult.kept} kept{mergeResult.errors.length ? ` · ${mergeResult.errors.length} errors` : ' ✓'}
              </p>
            )}
            {/* Preview results panel */}
            {mergePreview !== null && (
              <div className="border border-gray-100 rounded-lg overflow-hidden text-xs">
                <div className="bg-gray-50 px-3 py-2 font-semibold text-gray-700 flex items-center justify-between">
                  <span>{mergePreview.length === 0 ? 'No duplicate groups found' : `${mergePreview.length} group${mergePreview.length !== 1 ? 's' : ''} would be merged`}</span>
                  <button onClick={() => setMergePreview(null)} className="text-gray-400 hover:text-gray-600 text-base leading-none">×</button>
                </div>
                {mergePreview.length > 0 && (
                  <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
                    {mergePreview.map(g => (
                      <div key={g.normalizedKey} className="px-3 py-2 space-y-0.5">
                        <p className="text-gray-400 font-mono text-[10px] truncate">{g.normalizedKey}</p>
                        <p className="text-green-700 font-medium truncate">✓ Keep: {g.keep.model}</p>
                        {g.drop.map(d => (
                          <p key={d.id} className="text-red-500 truncate">✗ Drop: {d.model}</p>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Near-Duplicate Scanner */}
          <div className="border border-gray-100 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-amber-50 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <span className="font-semibold text-gray-800 text-sm">Near-Duplicate Scanner</span>
            </div>
            <p className="text-xs text-gray-400">Shows same-series variants (e.g. 9173 Graze+ vs 9173 LF Graze+) that survived the auto-merge. Review and manually delete the weaker entry.</p>
            <button
              onClick={handleScanNearDupes}
              disabled={nearDupesLoading}
              className="w-full flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white py-2 rounded-lg text-xs font-bold">
              {nearDupesLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Scanning…</> : <><AlertTriangle className="w-3.5 h-3.5" />Scan Near-Duplicates</>}
            </button>
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
                {imageResult.found} matched · {imageResult.missing} missing{imageResult.cleared > 0 ? ` · ${imageResult.cleared} cleared` : ''}{imageResult.errors.length ? ` · ${imageResult.errors.length} err` : ''}
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

        {/* Category Size Monitor */}
        <div className="border border-gray-100 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-700">Category Sizes (target: {CAT_MIN}–{CAT_MAX} products)</span>
            <button onClick={loadCatCounts} disabled={catCountsLoading}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-orange-500">
              {catCountsLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Refresh
            </button>
          </div>
          {catCounts ? (
            <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
              {Object.entries(catCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([cat, n]) => {
                  const over  = n > CAT_MAX;
                  const under = n < CAT_MIN;
                  return (
                    <div key={cat} className={`flex items-center gap-3 px-4 py-2 text-xs ${over ? 'bg-red-50' : under ? 'bg-amber-50' : ''}`}>
                      <span className={`w-8 text-right font-bold tabular-nums ${over ? 'text-red-600' : under ? 'text-amber-600' : 'text-gray-700'}`}>{n}</span>
                      <span className="flex-1 text-gray-700">{cat}</span>
                      {over  && <span className="text-red-500 font-semibold">↑ over</span>}
                      {under && <span className="text-amber-500 font-semibold">↓ under</span>}
                      {!over && !under && <span className="text-green-500">✓</span>}
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="px-4 py-3 text-xs text-gray-400">Loading…</div>
          )}
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

      {/* Near-Duplicate results panel */}
      {nearDupes !== null && (
        <div className="bg-white rounded-2xl border border-amber-100 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Near-Duplicate Groups
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {nearDupes.length === 0 ? 'No near-duplicates found ✓' : `${nearDupes.length} group${nearDupes.length !== 1 ? 's' : ''} — click 🗑 to delete the weaker variant`}
              </p>
            </div>
            <button onClick={() => setNearDupes(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
          </div>
          {nearDupes.map(group => (
            <div key={group.key} className="border border-amber-100 rounded-xl overflow-hidden">
              <div className="bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">{group.key}</div>
              <div className="divide-y divide-gray-50">
                {group.products.map(p => (
                  <div key={p.id} className="flex items-center gap-3 px-3 py-2.5">
                    {p.thumbnail_url
                      ? <img src={p.thumbnail_url} alt="" className="w-8 h-8 object-contain rounded flex-shrink-0" />
                      : <div className="w-8 h-8 bg-gray-100 rounded flex-shrink-0 flex items-center justify-center text-gray-400 text-xs">—</div>
                    }
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-gray-900 truncate">{p.model}</div>
                      <div className="text-xs text-gray-400 truncate">{p.simplified_name || '—'}</div>
                    </div>
                    <div className="text-xs font-medium text-gray-700 tabular-nums flex-shrink-0">
                      {p.price > 0 ? `PKR ${p.price.toLocaleString()}` : '—'}
                    </div>
                    <button
                      onClick={() => handleDeleteNearDupe(p.id, group.key)}
                      disabled={deletingNearId === p.id}
                      className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 text-red-500 disabled:opacity-40 transition-colors">
                      {deletingNearId === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

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

    </div>
  );
}

// ── WhatsApp Catalog Export Panel ─────────────────────────────────────────────

const FEED_URL = 'https://tajallis.com.pk/api/meta-catalog';

function CatalogExportPanel({ products }: { products: Product[] }) {
  const [view,       setView]       = useState<'summary' | 'issues' | 'sets'>('summary');
  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState<import('@/lib/catalog').CatalogValidationResult | null>(null);
  const [sets,       setSets]       = useState<import('@/lib/catalog').WAProductSet[]>([]);
  const [syncing,    setSyncing]    = useState(false);
  const [syncResult, setSyncResult] = useState<{ created: number; updated: number; failed: number; details?: any; feedFetch?: { ok: boolean; feedId?: string; feedName?: string; error?: string } } | null>(null);
  const [copied,     setCopied]     = useState(false);

  async function runValidation() {
    setValidating(true);
    const { buildCatalogFeed, validateCatalogFeed, buildWAProductSets } = await import('@/lib/catalog');
    const feed = buildCatalogFeed(products);
    setValidation(validateCatalogFeed(feed));
    setSets(buildWAProductSets(feed));
    setValidating(false);
  }

  async function handleSyncSets() {
    setSyncing(true); setSyncResult(null);
    try {
      const r = await fetch('/api/meta-sets-sync', { method: 'POST' });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Sync failed');
      setSyncResult(data);
    } catch (e: any) {
      setSyncResult({ created: 0, updated: 0, failed: -1, details: { error: e.message } });
    } finally {
      setSyncing(false);
    }
  }

  function copyFeedUrl() {
    navigator.clipboard.writeText(FEED_URL).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const formatPrice = (n: number) => n.toLocaleString();

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-5">
      <div>
        <h3 className="font-bold text-gray-900 flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-green-500" />
          WhatsApp / Meta Catalog
        </h3>
        <p className="text-sm text-gray-500 mt-0.5">
          Your catalog auto-syncs live — Meta fetches the feed URL below on its own schedule.
          No manual export needed.
        </p>
      </div>

      {/* Live feed URL */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-emerald-700 mb-0.5">Live Feed URL (Meta Data Source)</p>
          <p className="text-xs font-mono text-emerald-900 truncate">{FEED_URL}</p>
        </div>
        <button onClick={copyFeedUrl}
          className="shrink-0 flex items-center gap-1.5 border border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-100 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
          {copied ? <CheckCircle className="w-3.5 h-3.5" /> : <FileUp className="w-3.5 h-3.5" />}
          {copied ? 'Copied!' : 'Copy URL'}
        </button>
      </div>

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={runValidation} disabled={validating || products.length === 0}
          className="flex items-center gap-1.5 border border-gray-200 text-gray-600 hover:border-orange-300 text-xs font-semibold px-3 py-2 rounded-lg">
          {validating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ListChecks className="w-3.5 h-3.5" />}
          Validate Feed
        </button>
        <button onClick={handleSyncSets} disabled={syncing}
          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold px-3 py-2 rounded-lg">
          {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageCircle className="w-3.5 h-3.5" />}
          Sync WA Category Sets
        </button>
      </div>

      {/* Sync result banner */}
      {syncResult && (
        <div className={`rounded-xl px-4 py-3 text-xs flex items-start gap-2
          ${syncResult.failed === -1 ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-800'}`}>
          {syncResult.failed === -1 ? (
            <>
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span><strong>Sync failed:</strong> {syncResult.details?.error}
                {syncResult.details?.help && <><br />{syncResult.details.help}</>}
              </span>
            </>
          ) : (
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                {syncResult.failed > 0 && syncResult.created === 0 && syncResult.updated === 0
                  ? <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                  : <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />}
                <span>
                  WA Sets — <strong>{syncResult.created} created</strong>,{' '}
                  <strong>{syncResult.updated} updated</strong>
                  {syncResult.failed > 0 && <>, <strong className="text-red-600">{syncResult.failed} failed</strong></>}.
                </span>
              </div>
              {/* Per-set failure details */}
              {syncResult.details?.failed?.length > 0 && (
                <div className="pl-6 space-y-1">
                  {syncResult.details.failed.map((f: any, i: number) => (
                    <p key={i} className="text-red-600">
                      <strong>{f.name}</strong> ({f.op}): {f.error}
                    </p>
                  ))}
                </div>
              )}
              {syncResult.feedFetch && (
                <div className={`flex items-start gap-2 pl-6 ${syncResult.feedFetch.ok ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {syncResult.feedFetch.ok ? (
                    <><CheckCircle className="w-3 h-3 shrink-0 mt-0.5" />
                      <span>Feed re-crawl triggered on <strong>{syncResult.feedFetch.feedName}</strong>. Products will appear in category tabs once Meta finishes indexing (usually 1–5 min).</span>
                    </>
                  ) : (
                    <><AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                      <span>Could not trigger re-crawl: {syncResult.feedFetch.error}. Go to Commerce Manager → Catalog → Data Sources → Fetch Now.</span>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Quick info bar */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Products in feed', value: products.filter(p => p.stock_status !== 'Discontinued').length, color: 'text-gray-900' },
          { label: 'With images',      value: products.filter(productHasImage).length,    color: 'text-green-600' },
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

          {/* Feed instructions */}
          <details className="text-xs text-gray-500">
            <summary className="cursor-pointer hover:text-gray-700 font-medium">How the live feed works →</summary>
            <ol className="mt-2 space-y-1 pl-4 list-decimal text-gray-500">
              <li>The feed URL above is already set as the Data Source in Meta Commerce Manager.</li>
              <li>Meta auto-crawls it on a schedule — no manual upload needed.</li>
              <li>To force a refresh: go to <strong>Commerce Manager → Catalog → Data Sources</strong> and click <strong>Fetch Now</strong>.</li>
              <li>After clicking <strong>Sync WA Category Sets</strong>, trigger a re-crawl so new sets pick up their products.</li>
            </ol>
          </details>
        </div>
      )}
    </div>
  );
}

// ── Reviews Tab ───────────────────────────────────────────────────────────────

interface ReviewRow {
  id: string;
  product_id: string;
  customer_name: string;
  city: string | null;
  rating: number;
  comment: string;
  verified_purchase: boolean;
  created_at: string;
}

function ReviewsTab() {
  const [reviews,   setReviews]   = useState<ReviewRow[]>([]);
  const [prodNames, setProdNames] = useState<Record<string, string>>({});
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const deferredSearch            = useDeferredValue(search);
  const [ratingFilter, setRatingFilter] = useState(0);
  const [confirmDel, setConfirmDel] = useState<ReviewRow | null>(null);
  const [deleting,  setDeleting]  = useState<string | null>(null);
  const [toggling,  setToggling]  = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data: revs } = await supabase
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false });
    const rows = (revs ?? []) as ReviewRow[];
    setReviews(rows);
    const ids = [...new Set(rows.map(r => r.product_id))];
    if (ids.length) {
      const { data: prods } = await supabase
        .from('products')
        .select('id, simplified_name, model, brand')
        .in('id', ids);
      const map: Record<string, string> = {};
      (prods ?? []).forEach((p: any) => {
        map[p.id] = p.simplified_name || `${p.brand} ${p.model}`;
      });
      setProdNames(map);
    }
    setLoading(false);
  }

  useAutoRefresh(load, 'reviews', 60_000);

  async function handleDelete(id: string) {
    setDeleting(id);
    await supabase.from('reviews').delete().eq('id', id);
    setReviews(prev => prev.filter(r => r.id !== id));
    setDeleting(null);
    setConfirmDel(null);
  }

  async function toggleVerified(r: ReviewRow) {
    setToggling(r.id);
    const { data } = await supabase
      .from('reviews')
      .update({ verified_purchase: !r.verified_purchase })
      .eq('id', r.id)
      .select()
      .single();
    if (data) setReviews(prev => prev.map(x => x.id === r.id ? data as ReviewRow : x));
    setToggling(null);
  }

  const filtered = reviews.filter(r => {
    if (ratingFilter && r.rating !== ratingFilter) return false;
    if (deferredSearch) {
      const q = deferredSearch.toLowerCase();
      return r.customer_name.toLowerCase().includes(q)
        || r.comment.toLowerCase().includes(q)
        || (prodNames[r.product_id] || '').toLowerCase().includes(q);
    }
    return true;
  });

  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  return (
    <div className="max-w-6xl mx-auto py-6 space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Reviews', value: reviews.length,                                   color: 'text-gray-900' },
          { label: 'Avg Rating',    value: reviews.length ? avg.toFixed(1) : '—',            color: avg >= 4 ? 'text-green-600' : avg >= 3 ? 'text-amber-600' : 'text-red-600' },
          { label: 'Verified',      value: reviews.filter(r => r.verified_purchase).length,  color: 'text-green-600' },
          { label: '5-Star',        value: reviews.filter(r => r.rating === 5).length,       color: 'text-amber-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4">
            <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by product, customer, comment…"
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
        </div>
        <div className="flex gap-1">
          {[0, 5, 4, 3, 2, 1].map(n => (
            <button key={n} onClick={() => setRatingFilter(ratingFilter === n ? 0 : n)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors
                ${ratingFilter === n ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {n === 0 ? 'All' : `${n}★`}
            </button>
          ))}
        </div>
        <button onClick={load} className="flex items-center gap-1.5 border border-gray-200 text-gray-600 hover:border-orange-300 px-3 py-2 rounded-lg text-xs font-semibold">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-orange-400" /></div>
      ) : reviews.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
          <Star className="w-10 h-10 mx-auto mb-3 text-gray-200" />
          <p className="font-medium text-gray-500">No reviews yet</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Product</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Customer</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-28">Rating</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Comment</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-28">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-32">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 max-w-[160px]">
                      <div className="text-xs font-medium text-gray-800 truncate">
                        {prodNames[r.product_id] || <span className="text-gray-400 italic">{r.product_id.slice(0, 12)}…</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 text-xs">{r.customer_name}</div>
                      {r.city && <div className="text-xs text-gray-400">{r.city}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map(n => (
                          <Star key={n} className={`w-3.5 h-3.5 ${n <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="text-xs text-gray-700 truncate">{r.comment}</p>
                      {r.verified_purchase && (
                        <span className="text-[10px] text-green-700 font-semibold">✓ Verified purchase</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                      {new Date(r.created_at).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 items-center">
                        <button
                          onClick={() => toggleVerified(r)}
                          disabled={toggling === r.id}
                          className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-colors disabled:opacity-50 ${
                            r.verified_purchase
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}>
                          {toggling === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : r.verified_purchase ? '✓ Verified' : 'Verify'}
                        </button>
                        <button onClick={() => setConfirmDel(r)}
                          className="p-1.5 hover:bg-red-50 text-red-400 hover:text-red-600 rounded-lg">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length < reviews.length && (
            <div className="px-4 py-2 border-t border-gray-50 text-xs text-gray-400">
              Showing {filtered.length} of {reviews.length} reviews
            </div>
          )}
        </div>
      )}

      {confirmDel && (
        <ConfirmDialog
          title="Delete this review?"
          message={`"${confirmDel.comment.slice(0, 100)}"\n— ${confirmDel.customer_name}`}
          confirmLabel="Delete Review"
          danger
          onConfirm={() => handleDelete(confirmDel.id)}
          onCancel={() => setConfirmDel(null)}
        />
      )}
      {deleting && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-white" />
        </div>
      )}
    </div>
  );
}


// ── Partner Leads Tab ─────────────────────────────────────────────────────────

interface PartnerLead {
  id: string;
  company_name: string;
  contact_person: string;
  phone: string;
  email: string | null;
  category: string;
  monthly_volume: string | null;
  website: string | null;
  message: string | null;
  status: 'new' | 'contacted' | 'qualified' | 'closed' | 'rejected';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'closed', 'rejected'] as const;

const LEAD_STATUS_COLORS: Record<string, string> = {
  new:       'bg-blue-100 text-blue-700',
  contacted: 'bg-orange-100 text-orange-700',
  qualified: 'bg-green-100 text-green-700',
  closed:    'bg-purple-100 text-purple-700',
  rejected:  'bg-red-100 text-red-600',
};

// ── Quotation Tab ─────────────────────────────────────────────────────────────
// Generates branded PDF quotations and invoices, shareable via WhatsApp.
// Uses the same jsPDF pattern as the solar proposal generator.

interface QuoteLine {
  id: string;
  name: string;
  model: string;
  qty: number;
  unitPrice: number;
  category: string;   // normalized category for PDF grouping
  warranty: string;   // from product.warranty, editable
  keySpec: string;    // top 2 spec fields joined, editable
}

async function loadLogoWhite(): Promise<string> {
  const svgText = await fetch('/tajallis-logo-white.svg').then(r => r.text());
  const blob = new Blob([svgText], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 500; canvas.height = 335;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('logo load failed')); };
    img.src = url;
  });
}

async function loadQrBase64(): Promise<string> {
  const res = await fetch('/bank-qr.jpeg');
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function generateQuotationPdf(opts: {
  customerName: string;
  customerPhone: string;
  lines: QuoteLine[];
  discount: number;
  docType: 'quotation' | 'invoice';
  refNumber: string;
  installationType: 'supply-only' | 'installation-included';
  installationLines: Array<{ name: string; amount: number }>;
  advancePct: number;
  balanceNote: string;
}): Promise<Blob> {
  const ORANGE = '#EA580C';
  const DARK   = '#1A1A1A';
  const W = 210; const margin = 18;
  const printW = W - margin * 2;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const PKR = (n: number) => `PKR ${Math.round(n).toLocaleString('en-PK')}`;
  const now = new Date();
  const fmtDate = (d: Date) => d.toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' });
  const dateStr = fmtDate(now);
  const validUntilStr = fmtDate(new Date(now.getTime() + 7 * 86400_000));

  // ── Load assets ────────────────────────────────────────────────────────────
  let logoData: string | null = null;
  try { logoData = await loadLogoWhite(); } catch { /* fallback to text */ }

  let qrData: string | null = null;
  try { qrData = await loadQrBase64(); } catch { /* skip QR */ }

  // ── 1. Header band (40mm) ──────────────────────────────────────────────────
  doc.setFillColor(ORANGE);
  doc.rect(0, 0, W, 40, 'F');

  if (logoData) {
    doc.addImage(logoData, 'PNG', margin, 5, 0, 30);
  } else {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.setTextColor(255, 255, 255);
    doc.text("Tajalli's", margin, 24);
  }

  const textX = margin + 38;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(255, 255, 255);
  doc.text("Tajalli's", textX, 13);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(255, 214, 176);
  doc.text('Home & Commercial Solutions', textX, 19);
  doc.text('+92 370 2578788  |  tajallis.com.pk', textX, 25);
  doc.text('L-152 & 153, Sector 11C-1, North Karachi', textX, 31);

  const badgeLabel = opts.docType === 'invoice' ? 'INVOICE' : 'QUOTATION';
  const bW = 36; const bH = 11;
  doc.setFillColor(DARK);
  doc.roundedRect(W - margin - bW, 10, bW, bH, 2, 2, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(255, 255, 255);
  doc.text(badgeLabel, W - margin - bW / 2, 17, { align: 'center' });

  let y = 46;

  // ── 2. Info bar ────────────────────────────────────────────────────────────
  doc.setFillColor(243, 244, 246);
  doc.rect(margin, y, printW, 10, 'F');
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(80, 80, 80);
  const colW = printW / 4;
  doc.text(`Ref: ${opts.refNumber}`,    margin + 2,            y + 6.5);
  doc.text(`Date: ${dateStr}`,           margin + colW + 2,     y + 6.5);
  doc.text(`Valid: ${validUntilStr}`,    margin + colW * 2 + 2, y + 6.5);
  doc.setFont('helvetica', 'bold');
  doc.text(badgeLabel,                   margin + colW * 3 + 2, y + 6.5);
  y += 14;

  // ── 3. Customer block ──────────────────────────────────────────────────────
  doc.setFillColor(255, 247, 237);
  doc.rect(margin, y, printW, 20, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(234, 88, 12);
  doc.text('BILL TO', margin + 4, y + 6);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(20, 20, 20);
  doc.text(opts.customerName || '—', margin + 4, y + 13);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(100, 100, 100);
  if (opts.customerPhone) doc.text(opts.customerPhone, margin + 4, y + 18);
  y += 24;

  // ── 4. Item table (grouped by category) ───────────────────────────────────
  const productSubtotal  = opts.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
  const installSubtotal  = opts.installationLines.reduce((s, i) => s + i.amount, 0);
  const subtotalBeforeDiscount = productSubtotal + installSubtotal;
  const discountAmt  = Math.round(subtotalBeforeDiscount * opts.discount / 100);
  const grandTotal   = subtotalBeforeDiscount - discountAmt;

  // Group product lines by category
  const categoryOrder: string[] = [];
  const grouped: Record<string, QuoteLine[]> = {};
  for (const line of opts.lines) {
    const cat = line.category || 'Other';
    if (!grouped[cat]) { grouped[cat] = []; categoryOrder.push(cat); }
    grouped[cat].push(line);
  }

  const tableBody: any[] = [];
  for (const cat of categoryOrder) {
    const catLines = grouped[cat];
    const catSubtotal = catLines.reduce((s, l) => s + l.qty * l.unitPrice, 0);

    tableBody.push([{
      content: cat.toUpperCase(),
      colSpan: 6,
      styles: { fillColor: [26, 26, 26], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5, cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 } },
    }]);

    for (const line of catLines) {
      tableBody.push([
        line.model ? `${line.name}\n${line.model}` : line.name,
        line.keySpec || '—',
        line.warranty || '—',
        String(line.qty),
        PKR(line.unitPrice),
        PKR(line.qty * line.unitPrice),
      ]);
    }

    tableBody.push([
      { content: '', colSpan: 4, styles: { fillColor: [248, 248, 248] } },
      { content: 'Subtotal', styles: { halign: 'right' as const, fillColor: [248, 248, 248], textColor: [120, 120, 120], fontSize: 7 } },
      { content: PKR(catSubtotal), styles: { halign: 'right' as const, fillColor: [248, 248, 248], textColor: [120, 120, 120], fontSize: 7, fontStyle: 'bold' } },
    ]);
  }

  if (opts.installationType === 'installation-included' && opts.installationLines.length > 0) {
    tableBody.push([{
      content: 'INSTALLATION',
      colSpan: 6,
      styles: { fillColor: [26, 26, 26], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5, cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 } },
    }]);
    for (const inst of opts.installationLines) {
      tableBody.push([inst.name, '—', '—', '1', PKR(inst.amount), PKR(inst.amount)]);
    }
    tableBody.push([
      { content: '', colSpan: 4, styles: { fillColor: [248, 248, 248] } },
      { content: 'Subtotal', styles: { halign: 'right' as const, fillColor: [248, 248, 248], textColor: [120, 120, 120], fontSize: 7 } },
      { content: PKR(installSubtotal), styles: { halign: 'right' as const, fillColor: [248, 248, 248], textColor: [120, 120, 120], fontSize: 7, fontStyle: 'bold' } },
    ]);
  }

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Item / Description', 'Key Spec', 'Warranty', 'Qty', 'Unit Price', 'Total']],
    body: tableBody,
    columnStyles: {
      0: { cellWidth: 65 },
      1: { cellWidth: 28 },
      2: { cellWidth: 22 },
      3: { cellWidth: 10, halign: 'right' },
      4: { cellWidth: 26, halign: 'right' },
      5: { cellWidth: 23, halign: 'right', fontStyle: 'bold' },
    },
    headStyles: { fillColor: ORANGE, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    bodyStyles: { fontSize: 7.5, textColor: [40, 40, 40], lineColor: [229, 231, 235], lineWidth: 0.2 },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    styles: { overflow: 'linebreak', cellPadding: 2.5 },
  });

  // ── 5. Totals block ────────────────────────────────────────────────────────
  // @ts-ignore
  y = (doc as any).lastAutoTable.finalY + 6;
  const totalsX = W - margin - 72; const valX = W - margin;

  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(80, 80, 80);
  doc.text('Subtotal', totalsX, y);
  doc.text(PKR(subtotalBeforeDiscount), valX, y, { align: 'right' });
  y += 7;

  if (opts.discount > 0) {
    doc.setTextColor(234, 88, 12); doc.setFont('helvetica', 'italic');
    doc.text(`Discount (${opts.discount}%)`, totalsX, y);
    doc.text(`- ${PKR(discountAmt)}`, valX, y, { align: 'right' });
    doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 80);
    y += 8;
  }

  doc.setFillColor(ORANGE);
  doc.rect(totalsX - 4, y - 1, valX - totalsX + 4 + margin, 11, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(255, 255, 255);
  doc.text('Grand Total', totalsX, y + 7);
  doc.text(PKR(grandTotal), valX, y + 7, { align: 'right' });
  y += 17;

  // ── 6. Solar disclaimer (conditional) ─────────────────────────────────────
  const solarInv = opts.lines.find(l =>
    l.category.toLowerCase().includes('solar inverter') || l.category.toLowerCase().includes('solar & power')
  );
  if (solarInv) {
    const extractNum = (s: string, fallback: number) => { const m = s.match(/(\d+\.?\d*)/); return m ? parseFloat(m[1]) : fallback; };
    const inverterKW    = extractNum(solarInv.keySpec + ' ' + solarInv.name, 3.6);
    const maxLoad       = (inverterKW * 0.8).toFixed(1);
    const batLine       = opts.lines.find(l => l.category.toLowerCase().includes('batter'));
    const batteryKWh    = batLine ? extractNum(batLine.keySpec + ' ' + batLine.name, 2.4) : 0;
    const acs           = opts.lines.filter(l => l.category.toLowerCase().includes('air conditioner'));
    const totalTons     = acs.reduce((s, l) => s + extractNum(l.keySpec + ' ' + l.name, 1) * l.qty, 0);
    const estimatedDraw = (totalTons * 1.2).toFixed(1);
    const backupHrs     = batteryKWh > 0 && totalTons > 0
      ? ((batteryKWh * 0.5) / (totalTons * 1.2)).toFixed(1)
      : null;

    const disclaimerH = backupHrs ? 20 : 16;
    doc.setFillColor(255, 251, 235);
    doc.rect(margin, y, printW, disclaimerH, 'F');
    doc.setDrawColor(245, 158, 11); doc.setLineWidth(0.8);
    doc.line(margin, y, margin, y + disclaimerH);
    doc.setLineWidth(0.2);

    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(146, 64, 14);
    doc.text('System Capacity Note', margin + 3, y + 5);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(120, 80, 20);
    doc.text(
      `${inverterKW}kW inverter — recommended max simultaneous load ${maxLoad}kW. Startup surge may trip if all units run together.`,
      margin + 3, y + 10, { maxWidth: printW - 6 }
    );
    if (backupHrs) {
      doc.text(
        `Est. battery backup: ~${backupHrs} hrs at 50% load (${batteryKWh}kWh / ${estimatedDraw}kW draw).`,
        margin + 3, y + 15, { maxWidth: printW - 6 }
      );
    }
    y += disclaimerH + 5;
  }

  // ── 7. Scope of Work + Payment Terms + Bank Details ────────────────────────
  const boxY = y;
  const boxH = 32;

  if (opts.installationType === 'installation-included') {
    doc.setFillColor(255, 247, 237);
    doc.rect(margin, boxY, 55, boxH, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(234, 88, 12);
    doc.text('SCOPE OF WORK', margin + 3, boxY + 6);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(40, 40, 40);
    ['Supply & Delivery', 'Installation & Mounting', 'Testing & Commissioning'].forEach((item, i) => {
      doc.text(`\u2713 ${item}`, margin + 3, boxY + 12 + i * 6);
    });
  }

  const ptX = opts.installationType === 'installation-included' ? margin + 58 : margin;
  const ptW = opts.installationType === 'installation-included' ? 52 : 80;

  const advanceAmt = Math.round(grandTotal * opts.advancePct / 100);
  const balanceAmt = grandTotal - advanceAmt;
  doc.setFillColor(249, 250, 251);
  doc.rect(ptX, boxY, ptW, boxH, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(80, 80, 80);
  doc.text('PAYMENT TERMS', ptX + 3, boxY + 6);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(40, 40, 40);
  doc.text(`Advance: ${opts.advancePct}%  —  ${PKR(advanceAmt)}`, ptX + 3, boxY + 13);
  doc.text(`Balance: ${100 - opts.advancePct}%  —  ${PKR(balanceAmt)}`, ptX + 3, boxY + 19);
  doc.setTextColor(120, 120, 120);
  doc.text(`Due on ${opts.balanceNote || 'delivery'}`, ptX + 3, boxY + 25);

  const bdX = ptX + ptW + 3;
  const bdW = W - margin - bdX;
  doc.setFillColor(240, 253, 244);
  doc.rect(bdX, boxY, bdW, boxH, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(22, 101, 52);
  doc.text('BANK TRANSFER', bdX + 3, boxY + 6);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(20, 20, 20);
  doc.text("TAJALLI'S HOME COLLECTION", bdX + 3, boxY + 12);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(60, 60, 60);
  doc.text('IBAN: PK33MEZN0001060101874794', bdX + 3, boxY + 18);
  doc.text('Meezan Bank — F.B Area Branch, KHI', bdX + 3, boxY + 23);

  if (qrData) {
    const qrSize = 18;
    doc.addImage(qrData, 'JPEG', bdX + bdW - qrSize - 2, boxY + 3, qrSize, qrSize);
  }

  y = boxY + boxH + 6;

  // ── 8. CTA line ───────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(234, 88, 12);
  doc.text('To confirm order, share deposit slip on WhatsApp: +92 370 2578788', W / 2, y, { align: 'center' });

  // ── 9. Footer ─────────────────────────────────────────────────────────────
  const footerY = 282;
  const terms = opts.docType === 'invoice'
    ? 'Thank you for your business. All products carry official brand warranty. Payment terms as agreed.'
    : 'This quotation is valid for 7 days. Prices subject to availability. Advance payment required to confirm order.';

  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(150, 150, 150);
  doc.text(terms, margin, footerY, { maxWidth: printW });
  doc.setFontSize(7);
  doc.text('tajallis.com.pk  |  support@tajallis.com.pk  |  NTN: 42101-3836602-3', W / 2, footerY + 6, { align: 'center' });

  return doc.output('blob');
}

// ── Installment Invoice PDF Generators ────────────────────────────────────────

async function generateInstallmentAdvancePdf(opts: {
  customerName: string;
  customerPhone: string;
  lines: QuoteLine[];
  discount: number;
  refNumber: string;
  instTotalPrice: number;
  instAdvanceAmt: number;
  instMonths: number;
  instMonthlyAmt: number;
  instFirstDate: string;
}): Promise<Blob> {
  const ORANGE = '#EA580C';
  const DARK   = '#1A1A1A';
  const W = 210; const margin = 18;
  const printW = W - margin * 2;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const PKR = (n: number) => `PKR ${Math.round(n).toLocaleString('en-PK')}`;
  const now = new Date();
  const fmtDate = (d: Date) => d.toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' });
  const dateStr = fmtDate(now);

  let logoData: string | null = null;
  try { logoData = await loadLogoWhite(); } catch { /* fallback */ }
  let qrData: string | null = null;
  try { qrData = await loadQrBase64(); } catch { /* skip */ }

  // ── 1. Header band ────────────────────────────────────────────────────────
  doc.setFillColor(ORANGE);
  doc.rect(0, 0, W, 40, 'F');
  if (logoData) {
    doc.addImage(logoData, 'PNG', margin, 5, 0, 30);
  } else {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.setTextColor(255, 255, 255);
    doc.text("Tajalli's", margin, 24);
  }
  const textX = margin + 38;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(255, 255, 255);
  doc.text("Tajalli's", textX, 13);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(255, 214, 176);
  doc.text('Home & Commercial Solutions', textX, 19);
  doc.text('+92 370 2578788  |  tajallis.com.pk', textX, 25);
  doc.text('L-152 & 153, Sector 11C-1, North Karachi', textX, 31);
  const bW = 44; const bH = 11;
  doc.setFillColor(DARK);
  doc.roundedRect(W - margin - bW, 10, bW, bH, 2, 2, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(255, 255, 255);
  doc.text('ADVANCE INVOICE', W - margin - bW / 2, 17, { align: 'center' });

  let y = 46;

  // ── 2. Info bar ────────────────────────────────────────────────────────────
  doc.setFillColor(243, 244, 246);
  doc.rect(margin, y, printW, 10, 'F');
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(80, 80, 80);
  const colW = printW / 4;
  doc.text(`Ref: ${opts.refNumber}`, margin + 2, y + 6.5);
  doc.text(`Date: ${dateStr}`, margin + colW + 2, y + 6.5);
  doc.text('Advance Due: Today', margin + colW * 2 + 2, y + 6.5);
  doc.setFont('helvetica', 'bold');
  doc.text('ADVANCE INVOICE', margin + colW * 3 + 2, y + 6.5);
  y += 14;

  // ── 3. Customer block ──────────────────────────────────────────────────────
  doc.setFillColor(255, 247, 237);
  doc.rect(margin, y, printW, 20, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(234, 88, 12);
  doc.text('BILL TO', margin + 4, y + 6);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(20, 20, 20);
  doc.text(opts.customerName || '—', margin + 4, y + 13);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(100, 100, 100);
  if (opts.customerPhone) doc.text(opts.customerPhone, margin + 4, y + 18);
  y += 24;

  // ── 4. Products table ──────────────────────────────────────────────────────
  const productSubtotal = opts.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
  const discountAmt = Math.round(productSubtotal * opts.discount / 100);
  const cashPrice = productSubtotal - discountAmt;

  const categoryOrder: string[] = [];
  const grouped: Record<string, QuoteLine[]> = {};
  for (const line of opts.lines) {
    const cat = line.category || 'Other';
    if (!grouped[cat]) { grouped[cat] = []; categoryOrder.push(cat); }
    grouped[cat].push(line);
  }
  const tableBody: any[] = [];
  for (const cat of categoryOrder) {
    const catLines = grouped[cat];
    tableBody.push([{ content: cat.toUpperCase(), colSpan: 6, styles: { fillColor: [26, 26, 26], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5, cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 } } }]);
    for (const line of catLines) {
      tableBody.push([
        line.model ? `${line.name}\n${line.model}` : line.name,
        line.keySpec || '—', line.warranty || '—',
        String(line.qty), PKR(line.unitPrice), PKR(line.qty * line.unitPrice),
      ]);
    }
  }
  autoTable(doc, {
    startY: y, margin: { left: margin, right: margin },
    head: [['Item / Description', 'Key Spec', 'Warranty', 'Qty', 'Unit Price', 'Total']],
    body: tableBody,
    columnStyles: { 0: { cellWidth: 65 }, 1: { cellWidth: 28 }, 2: { cellWidth: 22 }, 3: { cellWidth: 10, halign: 'right' }, 4: { cellWidth: 26, halign: 'right' }, 5: { cellWidth: 23, halign: 'right', fontStyle: 'bold' } },
    headStyles: { fillColor: ORANGE, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    bodyStyles: { fontSize: 7.5, textColor: [40, 40, 40], lineColor: [229, 231, 235], lineWidth: 0.2 },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    styles: { overflow: 'linebreak', cellPadding: 2.5 },
  });
  // @ts-ignore
  y = (doc as any).lastAutoTable.finalY + 6;

  // ── 5. Installment summary block ───────────────────────────────────────────
  const sumX = W - margin - 80;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(80, 80, 80);
  if (opts.discount > 0) {
    doc.text('Cash Price', sumX, y);
    doc.text(PKR(cashPrice), W - margin, y, { align: 'right' });
    y += 7;
  }
  doc.text('Installment Total', sumX, y);
  doc.text(PKR(opts.instTotalPrice), W - margin, y, { align: 'right' });
  y += 7;
  doc.setFillColor(ORANGE);
  doc.rect(sumX - 4, y - 1, W - margin - sumX + 4 + margin, 11, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(255, 255, 255);
  doc.text('Advance Due Now', sumX, y + 7);
  doc.text(PKR(opts.instAdvanceAmt), W - margin, y + 7, { align: 'right' });
  y += 17;

  // ── 6. Installment schedule table ─────────────────────────────────────────
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(40, 40, 40);
  doc.text('INSTALLMENT SCHEDULE', margin, y + 1);
  y += 5;

  const schedBody: any[] = [];
  schedBody.push([
    { content: '0', styles: { fillColor: [234, 88, 12], textColor: [255, 255, 255], fontStyle: 'bold' } },
    { content: 'Advance Payment', styles: { fillColor: [234, 88, 12], textColor: [255, 255, 255], fontStyle: 'bold' } },
    { content: PKR(opts.instAdvanceAmt), styles: { fillColor: [234, 88, 12], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'right' as const } },
    { content: 'Upon Confirmation', styles: { fillColor: [234, 88, 12], textColor: [255, 255, 255], fontStyle: 'bold' } },
  ]);
  for (let i = 1; i <= opts.instMonths; i++) {
    const d = new Date(opts.instFirstDate);
    d.setMonth(d.getMonth() + (i - 1));
    schedBody.push([String(i), `Installment ${i}`, PKR(opts.instMonthlyAmt), fmtDate(d)]);
  }
  schedBody.push([
    { content: '', styles: { fillColor: [248, 248, 248] } },
    { content: 'TOTAL', styles: { fillColor: [248, 248, 248], fontStyle: 'bold', textColor: [40, 40, 40] } },
    { content: PKR(opts.instTotalPrice), styles: { fillColor: [248, 248, 248], fontStyle: 'bold', halign: 'right' as const, textColor: [40, 40, 40] } },
    { content: '', styles: { fillColor: [248, 248, 248] } },
  ]);

  autoTable(doc, {
    startY: y, margin: { left: margin, right: margin },
    head: [['#', 'Description', 'Amount', 'Due Date']],
    body: schedBody,
    columnStyles: { 0: { cellWidth: 12 }, 1: { cellWidth: 80 }, 2: { cellWidth: 40, halign: 'right' }, 3: { cellWidth: 42 } },
    headStyles: { fillColor: DARK, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    bodyStyles: { fontSize: 7.5, textColor: [40, 40, 40], lineColor: [229, 231, 235], lineWidth: 0.2 },
    styles: { overflow: 'linebreak', cellPadding: 2.5 },
  });
  // @ts-ignore
  y = (doc as any).lastAutoTable.finalY + 8;

  // ── 7. Bank details ────────────────────────────────────────────────────────
  const bdH = 28;
  doc.setFillColor(240, 253, 244);
  doc.rect(margin, y, printW, bdH, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(22, 101, 52);
  doc.text('BANK TRANSFER — PAY ADVANCE NOW', margin + 3, y + 6);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(20, 20, 20);
  doc.text("TAJALLI'S HOME COLLECTION", margin + 3, y + 13);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(60, 60, 60);
  doc.text('IBAN: PK33MEZN0001060101874794', margin + 3, y + 19);
  doc.text('Meezan Bank — F.B Area Branch, KHI', margin + 3, y + 25);
  if (qrData) { doc.addImage(qrData, 'JPEG', margin + printW - 21, y + 4, 18, 18); }
  y += bdH + 6;

  // ── 8. CTA ────────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(234, 88, 12);
  doc.text('To confirm order, share deposit slip on WhatsApp: +92 370 2578788', W / 2, y, { align: 'center' });

  // ── 9. Footer ─────────────────────────────────────────────────────────────
  const footerY = 282;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(150, 150, 150);
  doc.text(
    'Advance payment confirms your order. Balance due per installment schedule above. Late payment penalty: 1% of outstanding balance per additional day past due date.',
    margin, footerY, { maxWidth: printW }
  );
  doc.setFontSize(7);
  doc.text('tajallis.com.pk  |  support@tajallis.com.pk  |  NTN: 42101-3836602-3', W / 2, footerY + 6, { align: 'center' });

  return doc.output('blob');
}

async function generateInstallmentPaymentPdf(opts: {
  customerName: string;
  customerPhone: string;
  lines: QuoteLine[];
  discount: number;
  refNumber: string;
  instTotalPrice: number;
  instAdvanceAmt: number;
  instMonths: number;
  instMonthlyAmt: number;
  instFirstDate: string;
  paymentNumber: number;
}): Promise<Blob> {
  const ORANGE = '#EA580C';
  const DARK   = '#1A1A1A';
  const W = 210; const margin = 18;
  const printW = W - margin * 2;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const PKR = (n: number) => `PKR ${Math.round(n).toLocaleString('en-PK')}`;
  const fmtDate = (d: Date) => d.toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' });
  const now = new Date();
  const dateStr = fmtDate(now);

  const dueDate = new Date(opts.instFirstDate);
  dueDate.setMonth(dueDate.getMonth() + (opts.paymentNumber - 1));
  const dueDateStr = fmtDate(dueDate);
  const paidSoFar = opts.instAdvanceAmt + opts.paymentNumber * opts.instMonthlyAmt;
  const outstanding = Math.max(0, opts.instTotalPrice - paidSoFar);

  let logoData: string | null = null;
  try { logoData = await loadLogoWhite(); } catch { /* fallback */ }
  let qrData: string | null = null;
  try { qrData = await loadQrBase64(); } catch { /* skip */ }

  // ── 1. Header band ────────────────────────────────────────────────────────
  doc.setFillColor(ORANGE);
  doc.rect(0, 0, W, 40, 'F');
  if (logoData) {
    doc.addImage(logoData, 'PNG', margin, 5, 0, 30);
  } else {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.setTextColor(255, 255, 255);
    doc.text("Tajalli's", margin, 24);
  }
  const textX = margin + 38;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(255, 255, 255);
  doc.text("Tajalli's", textX, 13);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(255, 214, 176);
  doc.text('Home & Commercial Solutions', textX, 19);
  doc.text('+92 370 2578788  |  tajallis.com.pk', textX, 25);
  doc.text('L-152 & 153, Sector 11C-1, North Karachi', textX, 31);
  const bW = 48; const bH = 11;
  doc.setFillColor(DARK);
  doc.roundedRect(W - margin - bW, 10, bW, bH, 2, 2, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(255, 255, 255);
  doc.text('INSTALLMENT INVOICE', W - margin - bW / 2, 17, { align: 'center' });

  let y = 46;

  // ── 2. Info bar ────────────────────────────────────────────────────────────
  doc.setFillColor(243, 244, 246);
  doc.rect(margin, y, printW, 10, 'F');
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(80, 80, 80);
  const colW = printW / 4;
  doc.text(`Ref: ${opts.refNumber}`, margin + 2, y + 6.5);
  doc.text(`Date: ${dateStr}`, margin + colW + 2, y + 6.5);
  doc.text(`Due: ${dueDateStr}`, margin + colW * 2 + 2, y + 6.5);
  doc.setFont('helvetica', 'bold');
  doc.text(`PAYMENT ${opts.paymentNumber} / ${opts.instMonths}`, margin + colW * 3 + 2, y + 6.5);
  y += 14;

  // ── 3. Customer block ──────────────────────────────────────────────────────
  doc.setFillColor(255, 247, 237);
  doc.rect(margin, y, printW, 20, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(234, 88, 12);
  doc.text('BILL TO', margin + 4, y + 6);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(20, 20, 20);
  doc.text(opts.customerName || '—', margin + 4, y + 13);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(100, 100, 100);
  if (opts.customerPhone) doc.text(opts.customerPhone, margin + 4, y + 18);
  y += 24;

  // ── 4. Payment highlight box ───────────────────────────────────────────────
  const phH = 28;
  doc.setFillColor(255, 247, 237);
  doc.rect(margin, y, printW, phH, 'F');
  doc.setDrawColor(234, 88, 12); doc.setLineWidth(1);
  doc.line(margin, y, margin, y + phH);
  doc.setLineWidth(0.2);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(234, 88, 12);
  doc.text(`INSTALLMENT ${opts.paymentNumber} OF ${opts.instMonths}`, margin + 5, y + 7);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(20, 20, 20);
  doc.text(PKR(opts.instMonthlyAmt), margin + 5, y + 18);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(100, 100, 100);
  doc.text(`Due: ${dueDateStr}`, margin + 5, y + 25);
  if (outstanding > 0) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(100, 100, 100);
    doc.text('Outstanding after this payment:', W - margin - 62, y + 13);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(40, 40, 40);
    doc.text(PKR(outstanding), W - margin - 62, y + 22);
  } else {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(22, 101, 52);
    doc.text('FULLY PAID \u2713', W - margin - 42, y + 18);
  }
  y += phH + 8;

  // ── 5. Products reference table ────────────────────────────────────────────
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(120, 120, 120);
  doc.text('ITEMS PURCHASED (REFERENCE)', margin, y);
  y += 4;
  const refBody: any[] = [];
  for (const line of opts.lines) {
    refBody.push([
      line.model ? `${line.name}  ${line.model}` : line.name,
      line.keySpec || '—', String(line.qty), PKR(line.qty * line.unitPrice),
    ]);
  }
  autoTable(doc, {
    startY: y, margin: { left: margin, right: margin },
    head: [['Item', 'Spec', 'Qty', 'Total']],
    body: refBody,
    columnStyles: { 0: { cellWidth: 85 }, 1: { cellWidth: 50 }, 2: { cellWidth: 12, halign: 'right' }, 3: { cellWidth: 27, halign: 'right' } },
    headStyles: { fillColor: [80, 80, 80], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
    bodyStyles: { fontSize: 7, textColor: [80, 80, 80], lineColor: [229, 231, 235], lineWidth: 0.2 },
    styles: { overflow: 'linebreak', cellPadding: 2 },
  });
  // @ts-ignore
  y = (doc as any).lastAutoTable.finalY + 6;

  // ── 6. Full installment schedule ───────────────────────────────────────────
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(40, 40, 40);
  doc.text('INSTALLMENT SCHEDULE', margin, y + 1);
  y += 5;

  const schedBody: any[] = [];
  schedBody.push(['0', 'Advance Payment', PKR(opts.instAdvanceAmt), 'Upon Confirmation']);
  for (let i = 1; i <= opts.instMonths; i++) {
    const d = new Date(opts.instFirstDate);
    d.setMonth(d.getMonth() + (i - 1));
    const dStr = fmtDate(d);
    if (i === opts.paymentNumber) {
      schedBody.push([
        { content: String(i), styles: { fillColor: [234, 88, 12], textColor: [255, 255, 255], fontStyle: 'bold' } },
        { content: `Installment ${i}  \u2190 THIS PAYMENT`, styles: { fillColor: [234, 88, 12], textColor: [255, 255, 255], fontStyle: 'bold' } },
        { content: PKR(opts.instMonthlyAmt), styles: { fillColor: [234, 88, 12], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'right' as const } },
        { content: dStr, styles: { fillColor: [234, 88, 12], textColor: [255, 255, 255], fontStyle: 'bold' } },
      ]);
    } else {
      schedBody.push([String(i), `Installment ${i}`, PKR(opts.instMonthlyAmt), dStr]);
    }
  }
  schedBody.push([
    { content: '', styles: { fillColor: [248, 248, 248] } },
    { content: 'TOTAL', styles: { fillColor: [248, 248, 248], fontStyle: 'bold', textColor: [40, 40, 40] } },
    { content: PKR(opts.instTotalPrice), styles: { fillColor: [248, 248, 248], fontStyle: 'bold', halign: 'right' as const, textColor: [40, 40, 40] } },
    { content: '', styles: { fillColor: [248, 248, 248] } },
  ]);
  autoTable(doc, {
    startY: y, margin: { left: margin, right: margin },
    head: [['#', 'Description', 'Amount', 'Due Date']],
    body: schedBody,
    columnStyles: { 0: { cellWidth: 12 }, 1: { cellWidth: 80 }, 2: { cellWidth: 40, halign: 'right' }, 3: { cellWidth: 42 } },
    headStyles: { fillColor: DARK, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    bodyStyles: { fontSize: 7.5, textColor: [40, 40, 40], lineColor: [229, 231, 235], lineWidth: 0.2 },
    styles: { overflow: 'linebreak', cellPadding: 2.5 },
  });
  // @ts-ignore
  y = (doc as any).lastAutoTable.finalY + 8;

  // ── 7. Bank details ────────────────────────────────────────────────────────
  const bdH = 28;
  doc.setFillColor(240, 253, 244);
  doc.rect(margin, y, printW, bdH, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(22, 101, 52);
  doc.text('BANK TRANSFER', margin + 3, y + 6);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(20, 20, 20);
  doc.text("TAJALLI'S HOME COLLECTION", margin + 3, y + 13);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(60, 60, 60);
  doc.text('IBAN: PK33MEZN0001060101874794', margin + 3, y + 19);
  doc.text('Meezan Bank — F.B Area Branch, KHI', margin + 3, y + 25);
  if (qrData) { doc.addImage(qrData, 'JPEG', margin + printW - 21, y + 4, 18, 18); }
  y += bdH + 6;

  // ── 8. CTA ────────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(234, 88, 12);
  doc.text('Share payment confirmation on WhatsApp: +92 370 2578788', W / 2, y, { align: 'center' });

  // ── 9. Footer ─────────────────────────────────────────────────────────────
  const footerY = 282;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(150, 150, 150);
  doc.text(
    'Late payment penalty: 1% of outstanding balance per additional day past due date. All products carry official brand warranty.',
    margin, footerY, { maxWidth: printW }
  );
  doc.setFontSize(7);
  doc.text('tajallis.com.pk  |  support@tajallis.com.pk  |  NTN: 42101-3836602-3', W / 2, footerY + 6, { align: 'center' });

  return doc.output('blob');
}

// ── Brand alias map for fuzzy search tolerance ──
const BRAND_ALIASES: Record<string, string[]> = {
  haier:     ['hair', 'haiir', 'haer'],
  dawlance:  ['dolance', 'dawalance', 'dawalnce', 'dalwance'],
  ecostar:   ['eco star', 'ecostarr', 'eco-star'],
  gree:      ['gre', 'gree', 'grree'],
  orient:    ['orint', 'oriant', 'oriint'],
  pel:       ['pell', 'ple'],
  singer:    ['singr', 'sinjer'],
  westpoint: ['west point', 'west-point', 'westpoit'],
};

function normalizeOcr(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').replace(/0/g, 'o').replace(/1/g, 'i').replace(/5/g, 's');
}

function scoreSearchProduct(p: Product, rawQ: string): number {
  const q = rawQ.toLowerCase().trim();
  if (!q) return 0;
  const name  = (p.simplified_name || '').toLowerCase();
  const model = (p.model || '').toLowerCase();
  const brand = (p.brand || '').toLowerCase();

  // Exact substring matches (highest priority)
  if (name.includes(q))  return 100;
  if (brand === q)        return 95;
  if (model.includes(q)) return 90;
  if (brand.includes(q)) return 85;

  // Brand alias tolerance
  const qNorm = normalizeOcr(q);
  for (const [canonical, aliases] of Object.entries(BRAND_ALIASES)) {
    if (brand === canonical || brand.includes(canonical)) {
      if (aliases.some(a => q.includes(a) || a.includes(q))) return 80;
    }
    // user typed alias, product has canonical brand
    if (aliases.some(a => q.includes(a))) {
      if (brand === canonical) return 78;
    }
  }

  // OCR/typo normalization fallback
  const nameNorm  = normalizeOcr(name);
  const modelNorm = normalizeOcr(model);
  const brandNorm = normalizeOcr(brand);
  if (nameNorm.includes(qNorm))  return 60;
  if (modelNorm.includes(qNorm)) return 55;
  if (brandNorm.includes(qNorm)) return 50;

  // Word-level partial match
  const qWords = q.split(' ').filter(Boolean);
  if (qWords.length > 1) {
    const haystack = `${name} ${model} ${brand}`;
    const matches = qWords.filter(w => haystack.includes(w));
    if (matches.length === qWords.length) return 40;
    if (matches.length >= Math.ceil(qWords.length * 0.6)) return 25;
  }

  return 0;
}

// ── Phone formatter ──
function formatPhone(val: string): string {
  const digits = val.replace(/\D/g, '');
  let normalized = digits;
  if (normalized.startsWith('92')) {
    normalized = normalized.slice(0, 12);
  } else if (normalized.startsWith('0')) {
    normalized = '92' + normalized.slice(1);
    normalized = normalized.slice(0, 12);
  } else if (normalized.length > 0) {
    // treat as local digits without prefix
    normalized = normalized.slice(0, 10);
    return normalized; // don't format incomplete entry
  }
  // Format as: 92 3XX XXXXXXX
  if (normalized.length > 2) {
    const rest = normalized.slice(2);
    if (rest.length > 3) {
      return `92 ${rest.slice(0, 3)} ${rest.slice(3)}`;
    }
    return `92 ${rest}`;
  }
  return normalized;
}

function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  // Valid: starts with 03 (as 923) followed by 9 more digits = 12 total
  return digits.length === 12 && digits.startsWith('923');
}

function QuotationTab({ products }: { products: Product[] }) {
  const [customerName,  setCustomerName]  = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [docType, setDocType]             = useState<'quotation' | 'invoice' | 'installment-invoice'>('quotation');
  const [discount, setDiscount]           = useState(0);
  const [discountRaw, setDiscountRaw]     = useState('0');
  const [lines, setLines]                 = useState<QuoteLine[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [generating, setGenerating]       = useState(false);
  const [pdfState, setPdfState]           = useState<'idle' | 'generating' | 'success' | 'error'>('idle');
  const [pdfUrl, setPdfUrl]               = useState<string | null>(null);
  const [toastMsg, setToastMsg]           = useState('');
  const [draftBanner, setDraftBanner]     = useState(false);
  // ── Quotation meta state ──
  const [installationType, setInstallationType] = useState<'supply-only' | 'installation-included'>('supply-only');
  const [elevatedStructureOn, setElevatedStructureOn]   = useState(true);
  const [elevatedStructureAmt, setElevatedStructureAmt] = useState(0);
  const [wiringAmt, setWiringAmt]     = useState(0);
  const [laborAmt, setLaborAmt]       = useState(0);
  const [advancePct, setAdvancePct]   = useState(70);
  const [balanceNote, setBalanceNote] = useState('delivery');
  // ── Installment invoice state ──
  const [instTotalPrice, setInstTotalPrice]     = useState(0);
  const [instAdvanceAmt, setInstAdvanceAmt]     = useState(0);
  const [instMonths, setInstMonths]             = useState(6);
  const [instMonthlyAmt, setInstMonthlyAmt]     = useState(0);
  const [instFirstDate, setInstFirstDate]       = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [instPaymentNumber, setInstPaymentNumber] = useState(1);
  const [instAdvPdfState, setInstAdvPdfState]   = useState<'idle' | 'generating' | 'success' | 'error'>('idle');
  const [instPayPdfState, setInstPayPdfState]   = useState<'idle' | 'generating' | 'success' | 'error'>('idle');

  const autosaveRef                        = useRef<ReturnType<typeof setTimeout> | null>(null);

  const solarInverterLine = useMemo(() =>
    lines.find(l => l.category.toLowerCase().includes('solar inverter') || l.category.toLowerCase().includes('solar & power')),
    [lines]
  );
  const solarPanelLine = useMemo(() =>
    lines.find(l => l.category.toLowerCase().includes('solar panel')),
    [lines]
  );
  const hasSolarItems = !!(solarInverterLine || solarPanelLine);

  useEffect(() => {
    if (!hasSolarItems) return;
    const panelCount = solarPanelLine ? solarPanelLine.qty : 0;
    const extractKw = (s: string) => { const m = s.match(/(\d+\.?\d*)\s*kw/i); return m ? parseFloat(m[1]) : 3.6; };
    const systemKW = solarInverterLine
      ? extractKw(solarInverterLine.keySpec + ' ' + solarInverterLine.name)
      : 3.6;
    setElevatedStructureAmt(Math.round(panelCount * ELEVATED_FRAME_PER_PANEL));
    setWiringAmt(Math.round(systemKW * WIRING_PER_W * 1000));
    setLaborAmt(Math.round(systemKW * LABOR_PER_W * 1000));
  }, [hasSolarItems, solarPanelLine, solarInverterLine]);

  const refNumber = useMemo(() => {
    const d = new Date(); const pad = (n: number) => String(n).padStart(2, '0');
    return `TJ-${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${Math.floor(Math.random()*9000)+1000}`;
  }, []);

  // ── Autosave draft ──
  useEffect(() => {
    const saved = localStorage.getItem('reliance-invoice-draft');
    if (saved) {
      try {
        const draft = JSON.parse(saved);
        if (draft && (draft.lines?.length > 0 || draft.customerName)) {
          setDraftBanner(true);
        }
      } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => {
    if (autosaveRef.current) clearTimeout(autosaveRef.current);
    autosaveRef.current = setTimeout(() => {
      if (lines.length > 0 || customerName || customerPhone) {
        localStorage.setItem('reliance-invoice-draft', JSON.stringify({
          lines, customerName, customerPhone, discount, discountRaw, docType, refNumber,
          installationType, elevatedStructureOn, elevatedStructureAmt, wiringAmt, laborAmt,
          advancePct, balanceNote,
          instTotalPrice, instAdvanceAmt, instMonths, instMonthlyAmt, instFirstDate, instPaymentNumber,
        }));
      }
    }, 1000);
    return () => { if (autosaveRef.current) clearTimeout(autosaveRef.current); };
  }, [lines, customerName, customerPhone, discount, discountRaw, docType, refNumber,
      installationType, elevatedStructureOn, elevatedStructureAmt, wiringAmt, laborAmt, advancePct, balanceNote,
      instTotalPrice, instAdvanceAmt, instMonths, instMonthlyAmt, instFirstDate, instPaymentNumber]);

  function restoreDraft() {
    try {
      const saved = localStorage.getItem('reliance-invoice-draft');
      if (!saved) return;
      const draft = JSON.parse(saved);
      if (draft.lines)         setLines(draft.lines);
      if (draft.customerName)  setCustomerName(draft.customerName);
      if (draft.customerPhone) setCustomerPhone(draft.customerPhone);
      if (typeof draft.discount === 'number') { setDiscount(draft.discount); setDiscountRaw(String(draft.discount)); }
      if (draft.docType)       setDocType(draft.docType);
      if (draft.installationType) setInstallationType(draft.installationType);
      if (typeof draft.elevatedStructureOn === 'boolean') setElevatedStructureOn(draft.elevatedStructureOn);
      if (typeof draft.elevatedStructureAmt === 'number') setElevatedStructureAmt(draft.elevatedStructureAmt);
      if (typeof draft.wiringAmt === 'number') setWiringAmt(draft.wiringAmt);
      if (typeof draft.laborAmt === 'number') setLaborAmt(draft.laborAmt);
      if (typeof draft.advancePct === 'number') setAdvancePct(draft.advancePct);
      if (draft.balanceNote) setBalanceNote(draft.balanceNote);
      if (typeof draft.instTotalPrice === 'number') setInstTotalPrice(draft.instTotalPrice);
      if (typeof draft.instAdvanceAmt === 'number') setInstAdvanceAmt(draft.instAdvanceAmt);
      if (typeof draft.instMonths === 'number') setInstMonths(draft.instMonths);
      if (typeof draft.instMonthlyAmt === 'number') setInstMonthlyAmt(draft.instMonthlyAmt);
      if (draft.instFirstDate) setInstFirstDate(draft.instFirstDate);
      if (typeof draft.instPaymentNumber === 'number') setInstPaymentNumber(draft.instPaymentNumber);
    } catch { /* ignore */ }
    setDraftBanner(false);
  }

  function discardDraft() {
    localStorage.removeItem('reliance-invoice-draft');
    setDraftBanner(false);
  }

  // ── Toast auto-dismiss ──
  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(''), 2000);
    return () => clearTimeout(t);
  }, [toastMsg]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim();
    if (!q) return products.slice(0, 20);
    return products
      .map(p => ({ p, score: scoreSearchProduct(p, q) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)
      .map(({ p }) => p);
  }, [products, productSearch]);

  function addLine(p: Product) {
    const specEntries = Object.entries(p.specs ?? {}).slice(0, 2);
    const keySpec = specEntries.map(([k, v]) => `${k}: ${v}`).join(', ');
    setLines(ls => ls.some(l => l.id === p.id) ? ls : [...ls, {
      id: p.id,
      name: p.simplified_name || p.model,
      model: p.model,
      qty: 1,
      unitPrice: p.price.cash_floor,
      category: p.normalized_category || p.category || 'Other',
      warranty: p.warranty || '1 year manufacturer warranty',
      keySpec,
    }]);
    setProductSearch('');
    setToastMsg(`${p.brand || ''} ${p.model} added`.trim());
  }

  function updateLine(id: string, field: 'qty' | 'unitPrice', val: number) {
    setLines(ls => ls.map(l => l.id === id ? { ...l, [field]: val } : l));
  }

  function updateLineText(id: string, field: 'warranty' | 'keySpec', val: string) {
    setLines(ls => ls.map(l => l.id === id ? { ...l, [field]: val } : l));
  }

  function removeLine(id: string) { setLines(ls => ls.filter(l => l.id !== id)); }

  const subtotal = lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
  const discountAmt = Math.round(subtotal * discount / 100);
  const grandTotal = subtotal - discountAmt;

  // If the quote contains a solar inverter + solar battery, validate their compatibility
  const solarCompatCheck = useMemo(() => {
    const findProd = (catKeyword: string) =>
      lines.map(l => products.find(p => p.id === l.id)).find(p =>
        p && p.category.toLowerCase().replace(/[-\s]/g, '').includes(catKeyword)
      );
    const inv = findProd('solarinverter');
    const bat = findProd('solarbattery');
    if (!inv || !bat) return null;
    // Parse inverter kW from spec keys
    const invKw = (() => {
      for (const [k, v] of Object.entries(inv.specs ?? {})) {
        const kl = k.toLowerCase();
        if ((kl.includes('output') || kl.includes('rated') || kl.includes('capacity')) && kl.includes('kw')) {
          const m = String(v).match(/(\d+\.?\d*)/); if (m) return parseFloat(m[1]);
        }
      }
      const m = inv.simplified_name?.match(/(\d+\.?\d*)\s*kw/i); return m ? parseFloat(m[1]) : null;
    })();
    // Parse battery voltage from spec keys
    const batVoltRaw = Object.entries(bat.specs ?? {}).find(([k]) =>
      ['battery voltage','voltage','system voltage','nominal voltage','dc voltage'].includes(k.toLowerCase())
    )?.[1] ?? null;
    return checkCompatibility({
      inverterPowerKw: invKw,
      batteryVoltage:  parseBatteryVoltage(batVoltRaw),
      inverterBrand:   inv.brand,
      inverterModel:   inv.model,
    });
  }, [lines, products]);

  async function generate() {
    if (!lines.length || pdfState === 'generating') return;
    setPdfState('generating');
    setGenerating(true);
    const timeout = setTimeout(() => {
      setPdfState('error');
      setGenerating(false);
    }, 15000);
    try {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      const instLines: Array<{ name: string; amount: number }> = installationType === 'installation-included'
        ? [
            ...(elevatedStructureOn && elevatedStructureAmt > 0 ? [{ name: 'Elevated Structure (per panel)', amount: elevatedStructureAmt }] : []),
            ...(wiringAmt > 0 ? [{ name: 'Wiring & Cabling', amount: wiringAmt }] : []),
            ...(laborAmt > 0 ? [{ name: 'Installation Labour', amount: laborAmt }] : []),
          ]
        : [];
      const blob = await generateQuotationPdf({ customerName, customerPhone: customerPhone.replace(/\D/g, ''), lines, discount, docType: docType as 'quotation' | 'invoice', refNumber, installationType, installationLines: instLines, advancePct, balanceNote });
      clearTimeout(timeout);
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      const a = document.createElement('a');
      a.href = url; a.download = `tajallis_${docType}_${refNumber}.pdf`; a.click();
      setPdfState('success');
      setGenerating(false);
      setTimeout(() => setPdfState('idle'), 3000);
    } catch {
      clearTimeout(timeout);
      setPdfState('error');
      setGenerating(false);
    }
  }

  async function generateAdvanceInvoice() {
    if (!lines.length || instAdvPdfState === 'generating') return;
    setInstAdvPdfState('generating');
    const timeout = setTimeout(() => setInstAdvPdfState('error'), 15000);
    try {
      const blob = await generateInstallmentAdvancePdf({
        customerName, customerPhone: customerPhone.replace(/\D/g, ''),
        lines, discount, refNumber,
        instTotalPrice, instAdvanceAmt, instMonths, instMonthlyAmt, instFirstDate,
      });
      clearTimeout(timeout);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `tajallis_advance_invoice_${refNumber}.pdf`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      setInstAdvPdfState('success');
      setTimeout(() => setInstAdvPdfState('idle'), 3000);
    } catch {
      clearTimeout(timeout);
      setInstAdvPdfState('error');
    }
  }

  async function generatePaymentInvoice() {
    if (!lines.length || instPayPdfState === 'generating') return;
    setInstPayPdfState('generating');
    const timeout = setTimeout(() => setInstPayPdfState('error'), 15000);
    try {
      const blob = await generateInstallmentPaymentPdf({
        customerName, customerPhone: customerPhone.replace(/\D/g, ''),
        lines, discount, refNumber,
        instTotalPrice, instAdvanceAmt, instMonths, instMonthlyAmt, instFirstDate,
        paymentNumber: instPaymentNumber,
      });
      clearTimeout(timeout);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `tajallis_installment_${instPaymentNumber}_${refNumber}.pdf`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      setInstPayPdfState('success');
      setTimeout(() => setInstPayPdfState('idle'), 3000);
    } catch {
      clearTimeout(timeout);
      setInstPayPdfState('error');
    }
  }

  const phoneDigits = customerPhone.replace(/\D/g, '');
  const waFallbackPhone = phoneDigits.length >= 10 ? phoneDigits : '';
  const waText = encodeURIComponent(
    `*Tajalli's ${docType === 'invoice' ? 'Invoice' : 'Quotation'} — ${refNumber}*\n\n` +
    `Customer: ${customerName}\n` +
    lines.map(l => `• ${l.name} × ${l.qty} — PKR ${(l.qty * l.unitPrice).toLocaleString('en-PK')}`).join('\n') +
    `\n\n*Grand Total: PKR ${grandTotal.toLocaleString('en-PK')}*` +
    (discount > 0 ? `\n_Discount ${discount}% applied_` : '') +
    `\n\nValid for 7 days. tajallis.com.pk`
  );
  const waErrorText = encodeURIComponent(
    `Invoice #${refNumber} — ${customerName || 'Customer'}\n` +
    `Items: ${lines.length}\nGrand Total: PKR ${grandTotal.toLocaleString('en-PK')}\n\nContact Tajalli's for PDF`
  );
  const waErrorHref = waFallbackPhone
    ? `https://wa.me/${waFallbackPhone}?text=${waErrorText}`
    : `https://wa.me/?text=${waErrorText}`;

  const phoneValid   = isValidPhone(customerPhone);
  const phoneInvalid = customerPhone.length > 0 && !phoneValid;

  return (
    <div className="max-w-5xl mx-auto py-6 pb-24 lg:pb-6 space-y-5">
      {/* ── Toast notification ── */}
      {toastMsg && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg pointer-events-none animate-fade-in">
          {toastMsg}
        </div>
      )}

      {/* ── Draft restore banner ── */}
      {draftBanner && (
        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm">
          <span className="text-amber-800 font-medium">Restore unsaved invoice draft?</span>
          <div className="flex gap-2 ml-4">
            <button onClick={restoreDraft}
              className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-3 py-1 rounded-lg text-xs transition-colors">
              Restore
            </button>
            <button onClick={discardDraft}
              className="bg-white border border-amber-300 text-amber-700 hover:bg-amber-100 font-semibold px-3 py-1 rounded-lg text-xs transition-colors">
              Discard
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900">Quotation / Invoice Generator</h2>
          <p className="text-xs text-gray-400 mt-0.5">Branded PDF · WhatsApp-ready · Ref: <span className="font-mono text-gray-600">{refNumber}</span></p>
        </div>
        <div className="flex gap-2">
          {([
            ['quotation', 'Quotation'],
            ['invoice', 'Invoice'],
            ['installment-invoice', 'Installment'],
          ] as [typeof docType, string][]).map(([t, label]) => (
            <button key={t} onClick={() => setDocType(t)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                docType === t ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>{label}</button>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Customer</p>
          <input value={customerName} onChange={e => setCustomerName(e.target.value)}
            placeholder="Customer name"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
          {/* Phone input with validation indicator */}
          <div className="relative">
            <input
              value={customerPhone}
              onChange={e => setCustomerPhone(formatPhone(e.target.value))}
              placeholder="Phone (03XX-XXXXXXX)"
              inputMode="numeric"
              className={`w-full border rounded-xl px-4 py-2.5 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 ${
                phoneInvalid ? 'border-red-300' : phoneValid ? 'border-green-400' : 'border-gray-200'
              }`}
            />
            {phoneValid && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500 text-base">✓</span>
            )}
            {phoneInvalid && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-red-400 text-xs font-bold">✗</span>
            )}
          </div>
          {/* Discount input with normalization */}
          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-gray-600 shrink-0">Discount %</label>
            <input
              type="text"
              inputMode="numeric"
              min={0}
              max={100}
              value={discountRaw}
              onChange={e => {
                const raw = e.target.value.replace(/[^0-9]/g, '');
                setDiscountRaw(raw);
                const n = Math.min(100, Math.max(0, Number(raw) || 0));
                setDiscount(n);
              }}
              onBlur={() => {
                // Remove leading zeros, clamp
                const n = Math.min(100, Math.max(0, Number(discountRaw) || 0));
                setDiscount(n);
                setDiscountRaw(String(n));
              }}
              className="w-24 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
          {/* ── Installation scope (solar items only) ── */}
          {hasSolarItems && (
            <div className="space-y-2 pt-1 border-t border-gray-100">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Installation</p>
              <div className="flex gap-2">
                {(['supply-only', 'installation-included'] as const).map(t => (
                  <button key={t} onClick={() => setInstallationType(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      installationType === t ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}>
                    {t === 'supply-only' ? 'Supply Only' : 'With Installation'}
                  </button>
                ))}
              </div>
              {installationType === 'installation-included' && (
                <div className="bg-orange-50 rounded-xl p-3 space-y-2">
                  {[
                    { label: 'Elevated Structure', on: elevatedStructureOn, setOn: setElevatedStructureOn, amt: elevatedStructureAmt, setAmt: setElevatedStructureAmt },
                    { label: 'Wiring & Equipment', on: true as boolean, setOn: (_: boolean) => {}, amt: wiringAmt, setAmt: setWiringAmt },
                    { label: 'Labor', on: true as boolean, setOn: (_: boolean) => {}, amt: laborAmt, setAmt: setLaborAmt },
                  ].map(({ label, on, setOn, amt, setAmt }) => (
                    <div key={label} className="flex items-center gap-2">
                      <input type="checkbox" checked={on} onChange={e => setOn(e.target.checked)}
                        className="accent-orange-500 w-4 h-4 shrink-0" />
                      <span className="text-xs text-gray-700 flex-1">{label}</span>
                      <span className="text-xs text-gray-400">PKR</span>
                      <input type="number" value={amt} onChange={e => setAmt(Number(e.target.value))}
                        className="w-28 border border-orange-200 rounded-lg px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-orange-400" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {/* ── Payment terms (quotation / invoice only) ── */}
          {docType !== 'installment-invoice' && (
            <div className="space-y-2 pt-1 border-t border-gray-100">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Payment Terms</p>
              <div className="flex items-center gap-3">
                <label className="text-xs font-semibold text-gray-600 shrink-0">Advance %</label>
                <input
                  type="number" min={0} max={100} value={advancePct}
                  onChange={e => setAdvancePct(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                  className="w-20 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
                <span className="text-xs text-gray-400">Balance: {100 - advancePct}%</span>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs font-semibold text-gray-600 shrink-0">Balance due on</label>
                <input
                  type="text" value={balanceNote}
                  onChange={e => setBalanceNote(e.target.value)}
                  placeholder="delivery / installation"
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
            </div>
          )}

          {/* ── Installment plan (installment-invoice only) ── */}
          {docType === 'installment-invoice' && (
            <div className="space-y-3 pt-1 border-t border-gray-100">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Installment Plan</p>
              <div className="flex items-center gap-3">
                <label className="text-xs font-semibold text-gray-600 w-40 shrink-0">Total Installment Price</label>
                <span className="text-xs text-gray-400 shrink-0">PKR</span>
                <input type="number" min={0} value={instTotalPrice || ''}
                  onChange={e => setInstTotalPrice(Math.max(0, Number(e.target.value) || 0))}
                  placeholder="0"
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs font-semibold text-gray-600 w-40 shrink-0">Advance Amount</label>
                <span className="text-xs text-gray-400 shrink-0">PKR</span>
                <input type="number" min={0} value={instAdvanceAmt || ''}
                  onChange={e => setInstAdvanceAmt(Math.max(0, Number(e.target.value) || 0))}
                  placeholder="0"
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs font-semibold text-gray-600 w-40 shrink-0">Monthly Installments</label>
                <input type="number" min={1} max={24} value={instMonths}
                  onChange={e => setInstMonths(Math.max(1, Math.min(24, Number(e.target.value) || 1)))}
                  className="w-20 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                <span className="text-xs text-gray-400">months</span>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs font-semibold text-gray-600 w-40 shrink-0">Monthly Amount</label>
                <span className="text-xs text-gray-400 shrink-0">PKR</span>
                <input type="number" min={0} value={instMonthlyAmt || ''}
                  onChange={e => setInstMonthlyAmt(Math.max(0, Number(e.target.value) || 0))}
                  placeholder="0"
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs font-semibold text-gray-600 w-40 shrink-0">First Installment Date</label>
                <input type="date" value={instFirstDate}
                  onChange={e => setInstFirstDate(e.target.value)}
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
              {/* Plan summary + mismatch warning */}
              {(instTotalPrice > 0 || instAdvanceAmt > 0 || instMonthlyAmt > 0) && (
                <div className={`rounded-xl px-3 py-2 text-xs font-medium ${
                  instAdvanceAmt + instMonths * instMonthlyAmt === instTotalPrice
                    ? 'bg-orange-50 text-orange-800'
                    : 'bg-red-50 text-red-700'
                }`}>
                  PKR {instAdvanceAmt.toLocaleString('en-PK')} advance + {instMonths} × PKR {instMonthlyAmt.toLocaleString('en-PK')} = PKR {(instAdvanceAmt + instMonths * instMonthlyAmt).toLocaleString('en-PK')}
                  {instAdvanceAmt + instMonths * instMonthlyAmt !== instTotalPrice && instTotalPrice > 0 && (
                    <span className="ml-1">≠ total PKR {instTotalPrice.toLocaleString('en-PK')} — please reconcile</span>
                  )}
                </div>
              )}
              {/* Payment invoice selector */}
              <div className="pt-1 border-t border-gray-100 space-y-2">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Payment Invoice</p>
                <div className="flex items-center gap-3">
                  <label className="text-xs font-semibold text-gray-600 shrink-0">Installment #</label>
                  <input type="number" min={1} max={instMonths} value={instPaymentNumber}
                    onChange={e => setInstPaymentNumber(Math.max(1, Math.min(instMonths, Number(e.target.value) || 1)))}
                    className="w-20 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                  <span className="text-xs text-gray-400">of {instMonths}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Add Products</p>
          <input value={productSearch} onChange={e => setProductSearch(e.target.value)}
            placeholder="Search by name, model, or brand…"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
          {productSearch.trim() && (
            <div className="border border-gray-100 rounded-xl overflow-hidden max-h-44 overflow-y-auto">
              {filteredProducts.map(p => (
                <button key={p.id} onClick={() => addLine(p)}
                  className="w-full flex items-center justify-between px-3 py-2 hover:bg-orange-50 text-left border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-xs font-semibold text-gray-800">{p.simplified_name || p.model}</p>
                    <p className="text-[10px] text-gray-400">{p.brand} · {p.model}</p>
                  </div>
                  <p className="text-xs font-bold text-orange-600 shrink-0 ml-3">
                    PKR {p.price.cash_floor.toLocaleString('en-PK')}
                  </p>
                </button>
              ))}
              {filteredProducts.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">No products found</p>
              )}
            </div>
          )}
        </div>
      </div>

      {lines.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Item</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 w-20">Qty</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 w-36">Unit Price (PKR)</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 w-28">Total</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {lines.map(line => (
                <tr key={line.id}>
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-gray-900 text-xs">{line.name}</p>
                    <p className="text-[10px] text-gray-400">{line.model}</p>
                    {/* Warranty + Key Spec inline */}
                    <div className="flex gap-2 mt-1">
                      <input
                        type="text"
                        value={line.warranty}
                        onChange={e => updateLineText(line.id, 'warranty', e.target.value)}
                        placeholder="Warranty"
                        className="flex-1 border border-gray-100 rounded-lg px-2 py-1 text-xs text-gray-500 focus:outline-none focus:ring-1 focus:ring-orange-300 bg-gray-50"
                      />
                      <input
                        type="text"
                        value={line.keySpec}
                        onChange={e => updateLineText(line.id, 'keySpec', e.target.value)}
                        placeholder="Key spec"
                        className="flex-1 border border-gray-100 rounded-lg px-2 py-1 text-xs text-gray-500 focus:outline-none focus:ring-1 focus:ring-orange-300 bg-gray-50"
                      />
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <input type="number" min={1} value={line.qty} onChange={e => updateLine(line.id, 'qty', Math.max(1, Number(e.target.value)))}
                      className="w-16 border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-orange-400" />
                  </td>
                  <td className="px-4 py-2.5">
                    <input type="number" min={0} value={line.unitPrice} onChange={e => updateLine(line.id, 'unitPrice', Math.max(0, Number(e.target.value)))}
                      className="w-32 border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-orange-400" />
                  </td>
                  <td className="px-4 py-2.5 font-bold text-xs text-gray-900">
                    PKR {(line.qty * line.unitPrice).toLocaleString('en-PK')}
                  </td>
                  <td className="px-2 py-2.5">
                    <button onClick={() => removeLine(line.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-6 text-sm">
            {discount > 0 && <span className="text-gray-500">Subtotal: PKR {subtotal.toLocaleString('en-PK')} · Discount: − PKR {discountAmt.toLocaleString('en-PK')}</span>}
            <span className="font-black text-gray-900 text-base">Grand Total: PKR {grandTotal.toLocaleString('en-PK')}</span>
          </div>
        </div>
      )}

      {solarCompatCheck && (
        <div className={`rounded-xl px-4 py-3 flex gap-3 text-sm items-start ${
          solarCompatCheck.status === 'incompatible'
            ? 'bg-red-50 border border-red-200 text-red-800'
            : solarCompatCheck.status === 'compatible'
            ? 'bg-green-50 border border-green-200 text-green-800'
            : 'bg-amber-50 border border-amber-200 text-amber-800'
        }`}>
          <span className="shrink-0 text-base">
            {solarCompatCheck.status === 'incompatible' ? '⛔' : solarCompatCheck.status === 'compatible' ? '✓' : '⚠️'}
          </span>
          <div>
            <p className="font-bold text-xs">
              Battery / Inverter: {solarCompatCheck.status === 'compatible' ? 'Compatible' : solarCompatCheck.status === 'incompatible' ? 'INCOMPATIBLE — do not issue this quote' : 'Manual review required'}
            </p>
            <p className="text-xs mt-0.5 opacity-80">{solarCompatCheck.message}</p>
          </div>
        </div>
      )}

      {/* ── Quotation / Invoice buttons ── */}
      {docType !== 'installment-invoice' && (
        <div className="flex flex-wrap gap-3">
          <button
            onClick={generate}
            disabled={!lines.length || pdfState === 'generating' || solarCompatCheck?.status === 'incompatible'}
            className={`flex items-center gap-2 font-bold px-5 py-2.5 rounded-xl text-sm disabled:opacity-40 transition-colors ${
              pdfState === 'success'
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : pdfState === 'error'
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-gray-900 hover:bg-gray-800 text-white'
            }`}
          >
            {pdfState === 'generating'
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
              : pdfState === 'success'
              ? <>✓ Downloaded!</>
              : pdfState === 'error'
              ? <>⚠ PDF failed — retry</>
              : <>📄 Download {docType === 'invoice' ? 'Invoice' : 'Quotation'} PDF</>}
          </button>

          {pdfState === 'error' && lines.length > 0 && (
            <a href={waErrorHref}
              target="_blank" rel="noreferrer"
              className="flex items-center gap-2 bg-[#25D366] hover:bg-[#1ebe5c] text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors">
              <MessageCircle className="w-4 h-4" /> Send via WhatsApp instead
            </a>
          )}

          {lines.length > 0 && customerPhone && pdfState !== 'error' && (
            <a href={`https://wa.me/${waFallbackPhone}?text=${waText}`}
              target="_blank" rel="noreferrer"
              className="flex items-center gap-2 bg-[#25D366] hover:bg-[#1ebe5c] text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors">
              <MessageCircle className="w-4 h-4" /> Send Summary on WhatsApp
            </a>
          )}
          {lines.length === 0 && (
            <p className="text-xs text-gray-400 self-center">Add at least one product to generate a document.</p>
          )}
        </div>
      )}

      {/* ── Installment invoice buttons ── */}
      {docType === 'installment-invoice' && (
        <div className="flex flex-wrap gap-3 items-center">
          <button
            onClick={generateAdvanceInvoice}
            disabled={!lines.length || instAdvPdfState === 'generating'}
            className={`flex items-center gap-2 font-bold px-5 py-2.5 rounded-xl text-sm disabled:opacity-40 transition-colors ${
              instAdvPdfState === 'success'
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : instAdvPdfState === 'error'
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-orange-600 hover:bg-orange-700 text-white'
            }`}
          >
            {instAdvPdfState === 'generating'
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
              : instAdvPdfState === 'success' ? <>✓ Downloaded!</>
              : instAdvPdfState === 'error' ? <>⚠ Failed — retry</>
              : <>📄 Download Advance Invoice</>}
          </button>

          <button
            onClick={generatePaymentInvoice}
            disabled={!lines.length || instPayPdfState === 'generating'}
            className={`flex items-center gap-2 font-bold px-5 py-2.5 rounded-xl text-sm disabled:opacity-40 transition-colors ${
              instPayPdfState === 'success'
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : instPayPdfState === 'error'
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-gray-900 hover:bg-gray-800 text-white'
            }`}
          >
            {instPayPdfState === 'generating'
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
              : instPayPdfState === 'success' ? <>✓ Downloaded!</>
              : instPayPdfState === 'error' ? <>⚠ Failed — retry</>
              : <>📄 Payment Invoice #{instPaymentNumber}</>}
          </button>

          {lines.length === 0 && (
            <p className="text-xs text-gray-400 self-center">Add at least one product to generate a document.</p>
          )}
        </div>
      )}

      {/* ── Mobile sticky summary bar ── */}
      {lines.length > 0 && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Grand Total</p>
            <p className="text-base font-black text-gray-900">PKR {grandTotal.toLocaleString('en-PK')}</p>
          </div>
          <div className="flex gap-2">
            {lines.length > 0 && waFallbackPhone && (
              <a href={`https://wa.me/${waFallbackPhone}?text=${waText}`}
                target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 bg-[#25D366] text-white font-bold px-3 py-2 rounded-xl text-xs transition-colors">
                <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
              </a>
            )}
            {docType !== 'installment-invoice' && (
              <button
                onClick={generate}
                disabled={pdfState === 'generating' || solarCompatCheck?.status === 'incompatible'}
                className="flex items-center gap-1.5 bg-gray-900 text-white font-bold px-3 py-2 rounded-xl text-xs disabled:opacity-40 transition-colors">
                {pdfState === 'generating'
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating…</>
                  : <>📄 PDF</>}
              </button>
            )}
            {docType === 'installment-invoice' && (
              <button
                onClick={generateAdvanceInvoice}
                disabled={!lines.length || instAdvPdfState === 'generating'}
                className="flex items-center gap-1.5 bg-orange-600 text-white font-bold px-3 py-2 rounded-xl text-xs disabled:opacity-40 transition-colors">
                {instAdvPdfState === 'generating'
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating…</>
                  : <>📄 Advance</>}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Solar Leads Tab ────────────────────────────────────────────────────────────


function generateSolarPdf(lead: SolarLead, opts: {
  batteryType: 'tubular' | 'lithium';
  panelPrice: number;
  inverterPrice: number;
  batteryPrice: number;
  installPrice: number;
}): Blob {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const W = 210; const margin = 18;
  let y = 0;

  // ── Header ──
  doc.setFillColor(15, 15, 15);
  doc.rect(0, 0, W, 48, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('RELIANCE TAJALLI', margin, 20);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(160, 160, 160);
  doc.text('tajallis.com.pk  |  +92 335 426 6238  |  Karachi', margin, 28);

  doc.setTextColor(251, 146, 60); // orange-400
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Solar Independence Proposal', margin, 40);

  y = 60;

  // ── Customer block ──
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(margin, y, W - margin * 2, 28, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text('PREPARED FOR', margin + 5, y + 7);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(20, 20, 20);
  doc.text(lead.name, margin + 5, y + 15);
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(`${lead.phone}   |   ${lead.city}`, margin + 5, y + 22);

  const dateStr = new Date().toLocaleDateString('en-PK', { day: '2-digit', month: 'long', year: 'numeric' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text('DATE', W - margin - 30, y + 7);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(20, 20, 20);
  doc.text(dateStr, W - margin - 30, y + 15);
  doc.text('Valid 7 days', W - margin - 30, y + 22, { align: 'right' });

  y += 40;

  // ── System Summary ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(20, 20, 20);
  doc.text('System Configuration', margin, y);
  y += 6;
  doc.setDrawColor(251, 146, 60);
  doc.setLineWidth(0.5);
  doc.line(margin, y, W - margin, y);
  y += 8;

  const specs = [
    ['System Type',   'Hybrid Solar (Battery Storage)'],
    ['System Size',   `${lead.system_kw} kW`],
    ['Solar Panels',  `${Math.ceil((lead.system_kw * 1000) / PANEL_WATTS)} × ${PANEL_WATTS}W Crown Bi-Facial`],
    ['Inverter',      `${lead.system_kw}kW Hybrid Inverter (Crown)`],
    ['Battery Bank',  `${lead.battery_kwh} kWh — ${opts.batteryType === 'lithium' ? 'Lithium LiFePO₄' : 'Tubular Lead-Acid'}`],
    ['Battery Voltage', opts.batteryType === 'lithium' ? (lead.system_kw < 3.7 ? '24V' : '48V') : '12V × bank'],
    ['Night Backup',  `${lead.backup_hours} Hours`],
    ['Installation',  'Included — Karachi only'],
  ];

  doc.setFontSize(9);
  specs.forEach(([k, v]) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 100, 100);
    doc.text(k, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(20, 20, 20);
    doc.text(v, margin + 55, y);
    y += 7;
  });

  y += 6;

  // ── Pricing Table ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(20, 20, 20);
  doc.text('Price Breakdown', margin, y);
  y += 6;
  doc.setDrawColor(251, 146, 60);
  doc.line(margin, y, W - margin, y);
  y += 8;

  // Table header
  doc.setFillColor(15, 15, 15);
  doc.rect(margin, y - 4, W - margin * 2, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('LINE ITEM', margin + 3, y + 1);
  doc.text('QTY', margin + 100, y + 1);
  doc.text('UNIT PRICE', margin + 115, y + 1);
  doc.text('TOTAL (PKR)', W - margin - 3, y + 1, { align: 'right' });
  y += 9;

  const panelQty = Math.ceil((lead.system_kw * 1000) / PANEL_WATTS);
  const battVoltDisplay = opts.batteryType === 'lithium' ? (lead.system_kw < 3.7 ? '24V' : '48V') : '12V';

  const lineItems = [
    { desc: `${PANEL_WATTS}W Crown Bi-Facial Solar Panel`, qty: panelQty, unit: opts.panelPrice },
    { desc: `Crown ${lead.system_kw}kW Hybrid Inverter`, qty: 1, unit: opts.inverterPrice },
    { desc: opts.batteryType === 'lithium'
        ? `Lithium LiFePO₄ Battery — ${lead.battery_kwh}kWh @ ${battVoltDisplay}`
        : `Tubular Battery Bank — ${lead.battery_kwh}kWh`,
      qty: 1, unit: opts.batteryPrice },
    { desc: 'Installation & Commissioning', qty: 1, unit: opts.installPrice },
  ];

  let subtotal = 0;
  lineItems.forEach((item, i) => {
    const total = item.qty * item.unit;
    subtotal += total;
    if (i % 2 === 0) {
      doc.setFillColor(248, 248, 248);
      doc.rect(margin, y - 4, W - margin * 2, 8, 'F');
    }
    doc.setTextColor(20, 20, 20);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(item.desc, margin + 3, y + 1);
    doc.text(String(item.qty), margin + 103, y + 1);
    doc.text(`PKR ${item.unit.toLocaleString()}`, margin + 118, y + 1);
    doc.text(`PKR ${total.toLocaleString()}`, W - margin - 3, y + 1, { align: 'right' });
    y += 9;
  });

  // Total row
  doc.setFillColor(15, 15, 15);
  doc.rect(margin, y - 4, W - margin * 2, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('TOTAL', margin + 3, y + 2);
  doc.setTextColor(251, 146, 60);
  doc.text(`PKR ${subtotal.toLocaleString()}`, W - margin - 3, y + 2, { align: 'right' });
  y += 16;

  // ── ROI ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(20, 20, 20);
  doc.text('Estimated ROI (Karachi planning average — actual savings vary by usage)', margin, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  const breakEven = lead.est_savings > 0 ? (subtotal / lead.est_savings).toFixed(1) : '—';
  doc.text(`Est. Monthly Saving: PKR ${lead.est_savings.toLocaleString()}   |   Payback: ~${breakEven} months   |   25-Year Panel Warranty`, margin, y);
  y += 12;

  // ── Footer ──
  doc.setFillColor(15, 15, 15);
  doc.rect(0, 275, W, 22, 'F');
  doc.setTextColor(120, 120, 120);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text('This proposal is valid for 7 days. Prices are subject to market variation. Reliance Tajalli — Karachi.', margin, 284);
  doc.setTextColor(251, 146, 60);
  doc.text('tajallis.com.pk', W / 2, 291, { align: 'center' });

  return doc.output('blob') as Blob;
}

function SolarQuoteModal({ lead, onClose }: { lead: SolarLead; onClose: () => void }) {
  const [battType,     setBattType]     = useState<'tubular' | 'lithium'>(DEFAULT_BATTERY_CHEMISTRY);
  const [panelPrice,   setPanelPrice]   = useState(String(Math.round(PANEL_WATTS * PANEL_PRICE_PER_W)));
  const [invPrice,     setInvPrice]     = useState(String(Math.round(lead.system_kw * INVERTER_PKR_PER_KW)));
  const [battPrice,    setBattPrice]    = useState(String(Math.round(lead.battery_kwh * (DEFAULT_BATTERY_CHEMISTRY === 'lithium' ? BATTERY_PKR_PER_KWH : 18000))));
  const [installPrice, setInstallPrice] = useState('25000');
  const [saving,       setSaving]       = useState(false);
  const [err,          setErr]          = useState('');
  const [waUrl,        setWaUrl]        = useState('');

  const subtotal = (parseInt(panelPrice) * Math.ceil((lead.system_kw * 1000) / PANEL_WATTS)) +
    parseInt(invPrice) + parseInt(battPrice) + parseInt(installPrice);

  const handleGenerate = async () => {
    setSaving(true); setErr('');
    try {
      const blob = generateSolarPdf(lead, {
        batteryType:   battType,
        panelPrice:    parseInt(panelPrice)    || 0,
        inverterPrice: parseInt(invPrice)      || 0,
        batteryPrice:  parseInt(battPrice)     || 0,
        installPrice:  parseInt(installPrice)  || 0,
      });

      // Try to upload to Supabase storage (requires service role or permissive bucket);
      // if that fails, fall back to a local object URL so the admin can share the file.
      let pdfUrl = '';
      try {
        const fakeId = `manual_${Date.now()}`;
        pdfUrl = await saveSolarProposal(fakeId, blob);
      } catch {
        // Fallback: create a browser-side download link
        pdfUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = pdfUrl;
        a.download = `reliance_solar_proposal_${lead.name.replace(/\s+/g, '_')}.pdf`;
        a.click();
      }

      const phone = lead.phone.replace(/\D/g, '');
      const e164  = phone.startsWith('0') ? '92' + phone.slice(1) : phone.startsWith('92') ? phone : '92' + phone;
      const msg   = encodeURIComponent(
        `Assalam-o-Alaikum ${lead.name},\n\n` +
        `Here is your customised Off-Grid Solar Proposal from Reliance Tajalli.\n\n` +
        (pdfUrl.startsWith('blob:') ? `I've sent the proposal PDF — please check our chat.\n\n` : `View Proposal: ${pdfUrl}\n\n`) +
        `This setup provides ${lead.backup_hours} hours of night backup independence.\n\n` +
        `JazakAllah Khayran.`
      );
      setWaUrl(`https://wa.me/${e164}?text=${msg}`);
    } catch (e: any) {
      setErr(e.message || 'Failed to generate proposal');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 space-y-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-black text-gray-900 text-lg">Generate Proposal</div>
            <div className="text-sm text-gray-500">{lead.name} — {lead.system_kw}kW Off-Grid System</div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><X className="w-5 h-5" /></button>
        </div>

        {/* Battery type */}
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wider block mb-2">Battery Type</label>
          <div className="grid grid-cols-2 gap-2">
            {(['tubular', 'lithium'] as const).map(t => (
              <button key={t} onClick={() => setBattType(t)}
                className={`py-2.5 px-4 rounded-2xl border text-sm font-medium transition-all ${
                  battType === t ? 'bg-orange-500 border-orange-500 text-white' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}>
                {t === 'tubular' ? '🔋 Tubular Lead-Acid' : '⚡ Lithium LiFePO₄'}
              </button>
            ))}
          </div>
        </div>

        {/* Price inputs */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Panel Unit Price (PKR)', val: panelPrice, set: setPanelPrice },
            { label: 'Inverter Price (PKR)', val: invPrice, set: setInvPrice },
            { label: 'Battery Bank Price (PKR)', val: battPrice, set: setBattPrice },
            { label: 'Installation (PKR)', val: installPrice, set: setInstallPrice },
          ].map(f => (
            <div key={f.label}>
              <label className="text-xs text-gray-500 block mb-1">{f.label}</label>
              <input
                type="number" value={f.val} onChange={e => f.set(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
              />
            </div>
          ))}
        </div>

        <div className="bg-gray-50 rounded-2xl px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-gray-500">Estimated Total</span>
          <span className="font-black text-gray-900">PKR {subtotal.toLocaleString()}</span>
        </div>

        {err && <p className="text-red-500 text-xs">{err}</p>}

        {waUrl ? (
          <a href={waUrl} target="_blank" rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20bc5a] text-white font-bold py-3.5 rounded-2xl transition-all text-sm">
            <MessageCircle className="w-4 h-4" />
            Send Proposal on WhatsApp
          </a>
        ) : (
          <button onClick={handleGenerate} disabled={saving}
            className="w-full bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white font-bold py-3.5 rounded-2xl transition-all text-sm flex items-center justify-center gap-2">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating PDF…</> : '📄 Generate & Send via WhatsApp'}
          </button>
        )}
      </div>
    </div>
  );
}

const SOLAR_STATUS_COLORS: Record<string, string> = {
  new:       'bg-blue-100 text-blue-700',
  contacted: 'bg-yellow-100 text-yellow-700',
  quoted:    'bg-purple-100 text-purple-700',
  closed:    'bg-green-100 text-green-700',
};

function SolarLeadsTab() {
  const UNIT_PRICE   = UNIT_RATE_PKR;  // canonical → solarRules.ts
  const PEAK_SUN_HRS = 4.5;

  const [leads,   setLeads]   = useState<SolarLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [err,     setErr]     = useState('');
  const [quoting, setQuoting] = useState<SolarLead | null>(null);
  const [showNew, setShowNew] = useState(false);
  // New-lead form state
  const [nf, setNf] = useState({ name:'', phone:'', city:'Karachi', bill:'', backup:'8' });
  const [nfErr, setNfErr] = useState('');
  const setN = (k: string, v: string) => setNf(f => ({ ...f, [k]: v }));

  const load = async () => {
    setLoading(true); setErr('');
    try { setLeads(await getSolarLeads()); }
    catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (lead: SolarLead, status: SolarLead['status']) => {
    await updateSolarLeadStatus(lead.id!, status);
    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status } : l));
  };

  const handleNewLead = () => {
    const bill = parseInt(nf.bill.replace(/,/g, ''));
    if (!nf.name.trim() || !nf.phone.trim() || !bill) { setNfErr('Fill all fields'); return; }
    setNfErr('');
    const backup   = parseInt(nf.backup);
    const dailyU   = (bill / UNIT_PRICE) / 30;
    const systemKw = Math.max(1, Math.ceil(dailyU / PEAK_SUN_HRS));
    const battKwh  = parseFloat((dailyU * (backup / 24) * 1.2).toFixed(1));
    // Use governed saving percentages based on bill size (mirrors GreenCorridor logic)
    const basePct  = bill < BILL_THRESHOLD_SMALL ? SAVING_PCT_3KW : bill < BILL_THRESHOLD_LARGE ? SAVING_PCT_5KW : SAVING_PCT_8KW;
    const savingPct = Math.min(0.90, basePct + SAVING_PCT_BATTERY_ADDON);
    setQuoting({
      name: nf.name.trim(), phone: nf.phone.trim(), city: nf.city,
      monthly_bill: bill, backup_hours: backup,
      system_kw: systemKw, battery_kwh: battKwh,
      est_savings: Math.round(bill * savingPct), status: 'new',
    });
    setShowNew(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">☀️ Off-Grid Solar Leads</h2>
          <p className="text-sm text-gray-500">Leads from /solar/off-grid · Authenticated admin view</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowNew(v => !v)}
            className="text-sm bg-orange-500 hover:bg-orange-400 text-white px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-1">
            <Plus className="w-4 h-4" /> New Quote
          </button>
          <button onClick={load} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Manual new-lead entry */}
      {showNew && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            New Quote — Enter Customer Details
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { label:'Customer Name', key:'name', ph:'Muhammad Ali', type:'text' },
              { label:'Phone (WhatsApp)', key:'phone', ph:'03001234567', type:'text' },
              { label:'Monthly Bill (PKR)', key:'bill', ph:'35000', type:'number' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs text-gray-500 block mb-1">{f.label}</label>
                <input type={f.type} value={(nf as any)[f.key]} placeholder={f.ph}
                  onChange={e => setN(f.key, e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400" />
              </div>
            ))}
            <div>
              <label className="text-xs text-gray-500 block mb-1">Night Backup Required</label>
              <select value={nf.backup} onChange={e => setN('backup', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400">
                <option value="4">4 Hours</option>
                <option value="8">8 Hours</option>
                <option value="12">12 Hours</option>
              </select>
            </div>
          </div>
          {nfErr && <p className="text-red-500 text-xs">{nfErr}</p>}
          <button onClick={handleNewLead}
            className="bg-orange-500 hover:bg-orange-400 text-white font-bold py-2.5 px-6 rounded-xl text-sm transition-all">
            Generate Proposal PDF
          </button>
        </div>
      )}

      {err && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">{err}</div>}

      {loading ? (
        <div className="text-center py-12 text-gray-400"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" /></div>
      ) : leads.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">☀️</div>
          <p className="font-medium">No solar leads yet</p>
          <p className="text-sm mt-1">Leads appear here when customers submit the consultation form at /solar/off-grid.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Customer','System','Battery','Bill / Savings','Status','Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {leads.map(lead => (
                <tr key={lead.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{lead.name}</div>
                    <div className="text-gray-500 text-xs">{lead.phone}</div>
                    <div className="text-gray-400 text-xs">{lead.city}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{lead.system_kw} kW</div>
                    <div className="text-gray-500 text-xs">{lead.backup_hours}h backup</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{lead.battery_kwh} kWh</div>
                    <div className="text-gray-400 text-xs">{(() => { const v = lead.system_kw < 3.7 ? 24 : 48; return `${Math.ceil((lead.battery_kwh * 1000) / v)}Ah @ ${v}V`; })()}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">PKR {lead.monthly_bill.toLocaleString()}</div>
                    <div className="text-green-600 text-xs">Saves ~PKR {lead.est_savings.toLocaleString()}/mo</div>
                  </td>
                  <td className="px-4 py-3">
                    <select value={lead.status || 'new'}
                      onChange={e => updateStatus(lead, e.target.value as SolarLead['status'])}
                      className={`text-xs font-medium px-2.5 py-1 rounded-full border-0 cursor-pointer focus:outline-none ${SOLAR_STATUS_COLORS[lead.status || 'new']}`}>
                      {(['new','contacted','quoted','closed'] as const).map(s => (
                        <option key={s} value={s} className="bg-white text-gray-900">
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setQuoting(lead)}
                        className="text-xs bg-orange-500 hover:bg-orange-400 text-white px-3 py-1.5 rounded-xl font-medium transition-all">
                        Generate Quote
                      </button>
                      {lead.proposal_url && (
                        <a href={lead.proposal_url} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-700 underline">PDF</a>
                      )}
                    </div>
                    <div className="text-gray-400 text-xs mt-1">
                      {lead.created_at ? new Date(lead.created_at).toLocaleDateString('en-PK',{day:'2-digit',month:'short',year:'numeric'}) : '—'}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {quoting && (
        <SolarQuoteModal lead={quoting} onClose={() => { setQuoting(null); load(); }} />
      )}
    </div>
  );
}

function PartnerLeadsTab() {
  const [leads,        setLeads]        = useState<PartnerLead[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [loadError,    setLoadError]    = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expanded,     setExpanded]     = useState<string | null>(null);
  const [updatingId,   setUpdatingId]   = useState<string | null>(null);
  const [noteEditing,  setNoteEditing]  = useState<string | null>(null);
  const [noteValue,    setNoteValue]    = useState('');
  const [savingNote,   setSavingNote]   = useState(false);

  async function load() {
    setLoading(true); setLoadError('');
    const { data, error } = await supabase
      .from('partner_leads')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) setLoadError(error.message);
    setLeads((data ?? []) as PartnerLead[]);
    setLoading(false);
  }

  useAutoRefresh(load, 'partner_leads', 30_000);

  async function updateStatus(id: string, status: string) {
    setUpdatingId(id);
    const { data } = await supabase
      .from('partner_leads')
      .update({ status })
      .eq('id', id)
      .select()
      .single();
    if (data) setLeads(prev => prev.map(l => l.id === id ? data as PartnerLead : l));
    setUpdatingId(null);
  }

  async function saveNote(id: string) {
    setSavingNote(true);
    const { data } = await supabase
      .from('partner_leads')
      .update({ notes: noteValue })
      .eq('id', id)
      .select()
      .single();
    if (data) setLeads(prev => prev.map(l => l.id === id ? data as PartnerLead : l));
    setSavingNote(false);
    setNoteEditing(null);
  }

  const filtered = statusFilter === 'all' ? leads : leads.filter(l => l.status === statusFilter);
  const counts = Object.fromEntries(LEAD_STATUSES.map(s => [s, leads.filter(l => l.status === s).length]));

  return (
    <div className="max-w-6xl mx-auto py-6 space-y-5">
      {/* Pipeline stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {LEAD_STATUSES.map(s => (
          <button key={s} onClick={() => setStatusFilter(statusFilter === s ? 'all' : s)}
            className={`rounded-xl border p-4 text-left transition-colors ${
              statusFilter === s ? 'border-orange-400 bg-orange-50' : 'bg-white border-gray-100 hover:border-gray-200'
            }`}>
            <div className="text-2xl font-black text-gray-900">{counts[s]}</div>
            <div className="mt-1">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${LEAD_STATUS_COLORS[s]}`}>{s}</span>
            </div>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500">
          {filtered.length} lead{filtered.length !== 1 ? 's' : ''}
          {statusFilter !== 'all' && ` · ${statusFilter}`}
        </span>
        {statusFilter !== 'all' && (
          <button onClick={() => setStatusFilter('all')} className="text-xs text-orange-500 hover:text-orange-700 font-medium">
            Show all
          </button>
        )}
        <div className="flex-1" />
        <button onClick={load} className="flex items-center gap-1.5 border border-gray-200 text-gray-600 hover:border-orange-300 px-3 py-2 rounded-lg text-xs font-semibold">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {loadError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          <strong>Error loading leads:</strong> {loadError}
          {loadError.includes('permission') || loadError.includes('policy') ? (
            <p className="mt-1 text-xs">Run <code className="bg-red-100 px-1 rounded">20260315_admin_rls.sql</code> in Supabase SQL Editor to grant authenticated access.</p>
          ) : null}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-orange-400" /></div>
      ) : !loadError && leads.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
          <Building2 className="w-10 h-10 mx-auto mb-3 text-gray-200" />
          <p className="font-medium text-gray-500">No partner applications yet</p>
          <p className="text-xs text-gray-400 mt-1">Submissions from /partner will appear here</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Company</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Contact</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-40">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-28">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-20">WA</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(lead => (
                  <>
                    <tr key={lead.id}
                      className={`border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors ${expanded === lead.id ? 'bg-orange-50/30' : ''}`}
                      onClick={() => setExpanded(expanded === lead.id ? null : lead.id)}>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900 text-sm">{lead.company_name}</div>
                        {lead.monthly_volume && <div className="text-xs text-gray-400">{lead.monthly_volume}/mo</div>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-800">{lead.contact_person}</div>
                        <a href={`tel:${lead.phone}`} className="text-xs text-blue-500 hover:underline" onClick={e => e.stopPropagation()}>
                          {lead.phone}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 capitalize">{lead.category}</td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          <select
                            value={lead.status}
                            onChange={e => updateStatus(lead.id, e.target.value)}
                            disabled={updatingId === lead.id}
                            className={`text-xs font-semibold rounded-lg px-2 py-1 border focus:outline-none focus:ring-2 focus:ring-orange-400 cursor-pointer capitalize
                              ${LEAD_STATUS_COLORS[lead.status]} border-transparent disabled:opacity-60`}>
                            {LEAD_STATUSES.map(s => (
                              <option key={s} value={s} className="bg-white text-gray-800 font-normal capitalize">{s}</option>
                            ))}
                          </select>
                          {updatingId === lead.id && <Loader2 className="w-3 h-3 animate-spin text-orange-400" />}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                        {new Date(lead.created_at).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <a
                          href={`https://wa.me/${lead.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${lead.contact_person}, this is Reliance Appliances regarding your partner application.`)}`}
                          target="_blank" rel="noreferrer"
                          className="p-1.5 hover:bg-green-50 text-green-600 rounded-lg flex items-center justify-center w-8 h-8"
                          title="WhatsApp">
                          <MessageCircle className="w-4 h-4" />
                        </a>
                      </td>
                    </tr>

                    {expanded === lead.id && (
                      <tr key={`${lead.id}-detail`} className="bg-orange-50/20 border-b border-orange-100">
                        <td colSpan={6} className="px-6 py-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                            {lead.email && (
                              <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-0.5">Email</p>
                                <a href={`mailto:${lead.email}`} className="text-blue-500 hover:underline text-sm">{lead.email}</a>
                              </div>
                            )}
                            {lead.website && (
                              <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-0.5">Website</p>
                                <a href={lead.website} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline text-sm truncate block">{lead.website}</a>
                              </div>
                            )}
                            {lead.message && (
                              <div className="sm:col-span-2">
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-0.5">Their Message</p>
                                <p className="text-sm text-gray-700 bg-white rounded-lg px-3 py-2 border border-gray-100">{lead.message}</p>
                              </div>
                            )}
                            <div className="sm:col-span-2">
                              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Internal Notes</p>
                              {noteEditing === lead.id ? (
                                <div className="flex gap-2">
                                  <textarea
                                    value={noteValue}
                                    onChange={e => setNoteValue(e.target.value)}
                                    rows={2}
                                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none bg-white"
                                  />
                                  <div className="flex flex-col gap-1">
                                    <button onClick={() => saveNote(lead.id)} disabled={savingNote}
                                      className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-xs font-bold rounded-lg">
                                      {savingNote ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save'}
                                    </button>
                                    <button onClick={() => setNoteEditing(null)}
                                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs rounded-lg">
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-start gap-2">
                                  <p className="text-sm text-gray-700 flex-1 bg-white rounded-lg px-3 py-2 border border-gray-100 min-h-[40px]">
                                    {lead.notes || <span className="text-gray-300 italic">No notes yet</span>}
                                  </p>
                                  <button
                                    onClick={() => { setNoteEditing(lead.id); setNoteValue(lead.notes ?? ''); }}
                                    className="text-xs text-orange-500 hover:text-orange-700 font-semibold shrink-0 mt-2">
                                    Edit
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}


// ── Orders Tab ────────────────────────────────────────────────────────────────

interface Order {
  id: string;
  customer_name: string;
  customer_phone: string;
  email: string | null;
  address: string | null;
  city: string | null;
  products: Array<{ model: string; brand: string; qty: number; price: number }>;
  total_amount: number;
  payment_method: string | null;
  plan: string | null;
  status: string;
  created_at: string;
}

const ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'delivered', 'cancelled'] as const;

const ORDER_STATUS_COLORS: Record<string, string> = {
  pending:    'bg-yellow-100 text-yellow-700',
  confirmed:  'bg-blue-100 text-blue-700',
  processing: 'bg-orange-100 text-orange-700',
  delivered:  'bg-green-100 text-green-700',
  cancelled:  'bg-red-100 text-red-600',
};

function OrdersTab() {
  const [orders,      setOrders]      = useState<Order[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [loadError,   setLoadError]   = useState('');
  const [statusFilter,setStatusFilter]= useState('all');
  const [search,      setSearch]      = useState('');
  const deferredSearch                = useDeferredValue(search);
  const [expanded,    setExpanded]    = useState<string | null>(null);
  const [updatingId,  setUpdatingId]  = useState<string | null>(null);

  async function load() {
    setLoading(true); setLoadError('');
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) setLoadError(error.message);
    setOrders((data ?? []) as Order[]);
    setLoading(false);
  }
  useAutoRefresh(load, 'orders', 30_000);

  async function updateStatus(id: string, status: string) {
    setUpdatingId(id);
    const { data } = await supabase.from('orders').update({ status }).eq('id', id).select().single();
    if (data) setOrders(prev => prev.map(o => o.id === id ? data as Order : o));
    setUpdatingId(null);
  }

  const filtered = orders.filter(o => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    if (deferredSearch) {
      const q = deferredSearch.toLowerCase();
      return o.customer_name?.toLowerCase().includes(q)
          || o.customer_phone?.includes(q)
          || o.id.toLowerCase().includes(q);
    }
    return true;
  });

  const counts = Object.fromEntries(ORDER_STATUSES.map(s => [s, orders.filter(o => o.status === s).length]));
  const revenue = orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + (o.total_amount || 0), 0);
  const todayCount = orders.filter(o => new Date(o.created_at).toDateString() === new Date().toDateString()).length;

  return (
    <div className="max-w-6xl mx-auto py-6 space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Orders',   value: orders.length,                          color: 'text-gray-900' },
          { label: "Today",          value: todayCount,                             color: 'text-blue-600' },
          { label: 'Pending',        value: counts['pending'] || 0,                 color: counts['pending'] > 0 ? 'text-amber-600' : 'text-gray-400' },
          { label: 'Total Revenue',  value: `PKR ${revenue.toLocaleString()}`,      color: 'text-green-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4">
            <div className={`text-xl font-black ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        {(['all', ...ORDER_STATUSES] as string[]).map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
              statusFilter === s ? 'bg-orange-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
            }`}>
            {s === 'all' ? `All (${orders.length})` : `${s} (${counts[s] || 0})`}
          </button>
        ))}
        <div className="flex-1" />
        <button onClick={load} className="flex items-center gap-1.5 border border-gray-200 text-gray-600 hover:border-orange-300 px-3 py-2 rounded-lg text-xs font-semibold">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, phone, order ID…"
          className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
      </div>

      {loadError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          <strong>Error:</strong> {loadError}
          {(loadError.includes('permission') || loadError.includes('policy') || loadError.includes('relation')) && (
            <p className="mt-1 text-xs">Run <code className="bg-red-100 px-1 rounded">20260316_admin_orders.sql</code> in Supabase SQL Editor.</p>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-orange-400" /></div>
      ) : !loadError && orders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
          <ShoppingBag className="w-10 h-10 mx-auto mb-3 text-gray-200" />
          <p className="font-medium text-gray-500">No orders yet</p>
          <p className="text-xs text-gray-400 mt-1">Orders placed via /checkout will appear here</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-28">Order</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Customer</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Items</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-28">Total</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-40">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-28">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-16">WA</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(order => {
                  const prods = Array.isArray(order.products) ? order.products : [];
                  return (
                    <>
                      <tr key={order.id}
                        className={`border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors ${expanded === order.id ? 'bg-orange-50/30' : ''}`}
                        onClick={() => setExpanded(expanded === order.id ? null : order.id)}>
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{order.id.slice(0, 8)}…</td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-900 text-sm">{order.customer_name}</div>
                          <a href={`tel:${order.customer_phone}`} className="text-xs text-blue-500 hover:underline" onClick={e => e.stopPropagation()}>{order.customer_phone}</a>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-xs text-gray-700">
                            {prods.slice(0, 2).map((p, i) => <div key={i}>{p.brand} {p.model}{p.qty > 1 ? ` ×${p.qty}` : ''}</div>)}
                            {prods.length > 2 && <div className="text-gray-400">+{prods.length - 2} more</div>}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-900 text-sm">PKR {(order.total_amount || 0).toLocaleString()}</td>
                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-1.5">
                            <select
                              value={order.status || 'pending'}
                              onChange={e => updateStatus(order.id, e.target.value)}
                              disabled={updatingId === order.id}
                              className={`text-xs font-semibold rounded-lg px-2 py-1 border-0 focus:outline-none focus:ring-2 focus:ring-orange-400 capitalize cursor-pointer disabled:opacity-60
                                ${ORDER_STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-600'}`}>
                              {ORDER_STATUSES.map(s => <option key={s} value={s} className="bg-white text-gray-800 font-normal capitalize">{s}</option>)}
                            </select>
                            {updatingId === order.id && <Loader2 className="w-3 h-3 animate-spin text-orange-400" />}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                          {new Date(order.created_at).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </td>
                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                          <a
                            href={`https://wa.me/${order.customer_phone?.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${order.customer_name}, your Reliance Appliances order (ref: ${order.id.slice(0, 8)}) has been received. We'll confirm shortly.`)}`}
                            target="_blank" rel="noreferrer"
                            className="p-1.5 hover:bg-green-50 text-green-600 rounded-lg flex items-center justify-center w-8 h-8">
                            <MessageCircle className="w-4 h-4" />
                          </a>
                        </td>
                      </tr>

                      {expanded === order.id && (
                        <tr key={`${order.id}-d`} className="bg-orange-50/20 border-b border-orange-100">
                          <td colSpan={7} className="px-6 py-4">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Customer</p>
                                <p className="text-sm font-medium text-gray-900">{order.customer_name}</p>
                                <p className="text-xs text-gray-500">{order.customer_phone}</p>
                                {order.email && <p className="text-xs text-gray-500">{order.email}</p>}
                                {order.address && <p className="text-xs text-gray-500 mt-1">{order.address}{order.city ? `, ${order.city}` : ''}</p>}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Payment</p>
                                <p className="text-sm text-gray-800 capitalize">{order.payment_method || '—'}</p>
                                {order.plan && <p className="text-xs text-gray-500">{order.plan} plan</p>}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Items</p>
                                {prods.map((p, i) => (
                                  <div key={i} className="flex justify-between text-xs text-gray-700">
                                    <span>{p.brand} {p.model}{p.qty > 1 ? ` ×${p.qty}` : ''}</span>
                                    <span className="text-gray-400 ml-4">PKR {(p.price || 0).toLocaleString()}</span>
                                  </div>
                                ))}
                                <div className="flex justify-between text-sm font-bold text-gray-900 mt-1 pt-1 border-t border-gray-100">
                                  <span>Total</span><span>PKR {(order.total_amount || 0).toLocaleString()}</span>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtered.length < orders.length && (
            <div className="px-4 py-2 border-t border-gray-50 text-xs text-gray-400">
              Showing {filtered.length} of {orders.length} orders
            </div>
          )}
        </div>
      )}
    </div>
  );
}


// ── Enquiries Tab ─────────────────────────────────────────────────────────────

interface Enquiry {
  id: string;
  event: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  message: string | null;
  product_id: string | null;
  brand: string | null;
  model: string | null;
  created_at: string;
}

function EnquiriesTab() {
  const [items,      setItems]      = useState<Enquiry[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [loadError,  setLoadError]  = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  async function load() {
    setLoading(true); setLoadError('');
    const { data, error } = await supabase
      .from('analytics')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) setLoadError(error.message);
    setItems((data ?? []) as Enquiry[]);
    setLoading(false);
  }
  useAutoRefresh(load, 'analytics', 30_000);

  const types = [...new Set(items.map(i => i.event))].filter(Boolean);
  const filtered = typeFilter === 'all' ? items : items.filter(i => i.event === typeFilter);
  const counts = Object.fromEntries(types.map(t => [t, items.filter(i => i.event === t).length]));
  const todayCount = items.filter(i => new Date(i.created_at).toDateString() === new Date().toDateString()).length;

  return (
    <div className="max-w-6xl mx-auto py-6 space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total',   value: items.length,           color: 'text-gray-900' },
          { label: 'Today',   value: todayCount,             color: 'text-blue-600' },
          { label: 'Contact', value: counts['contact'] || 0, color: 'text-purple-600' },
          { label: 'Enquiry', value: counts['enquiry'] || 0, color: 'text-orange-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4">
            <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {(['all', ...types] as string[]).map(t => (
          <button key={t} onClick={() => setTypeFilter(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
              typeFilter === t ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            {t === 'all' ? `All (${items.length})` : `${t} (${counts[t] || 0})`}
          </button>
        ))}
        <div className="flex-1" />
        <button onClick={load} className="flex items-center gap-1.5 border border-gray-200 text-gray-600 hover:border-orange-300 px-3 py-2 rounded-lg text-xs font-semibold">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {loadError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          <strong>Error:</strong> {loadError}
          {(loadError.includes('permission') || loadError.includes('policy') || loadError.includes('relation')) && (
            <p className="mt-1 text-xs">Run <code className="bg-red-100 px-1 rounded">20260316_admin_orders.sql</code> in Supabase SQL Editor.</p>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-orange-400" /></div>
      ) : !loadError && items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
          <Mail className="w-10 h-10 mx-auto mb-3 text-gray-200" />
          <p className="font-medium text-gray-500">No enquiries yet</p>
          <p className="text-xs text-gray-400 mt-1">Contact form and product enquiries appear here</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Contact</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-24">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Message / Product</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-28">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-20">Reach</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900 text-sm">{item.name || '—'}</td>
                    <td className="px-4 py-3">
                      {item.phone && <a href={`tel:${item.phone}`} className="text-xs text-blue-500 hover:underline block">{item.phone}</a>}
                      {item.email && <a href={`mailto:${item.email}`} className="text-xs text-gray-400 hover:underline block">{item.email}</a>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                        item.event === 'contact' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'
                      }`}>{item.event}</span>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      {item.brand && item.model
                        ? <span className="text-xs font-medium text-gray-800">{item.brand} {item.model}</span>
                        : <span className="text-xs text-gray-600 line-clamp-2">{item.message || '—'}</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                      {new Date(item.created_at).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {item.phone && (
                          <a href={`https://wa.me/${item.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${item.name || ''}, thank you for contacting Reliance Appliances!`)}`}
                            target="_blank" rel="noreferrer"
                            className="p-1.5 hover:bg-green-50 text-green-600 rounded-lg">
                            <MessageCircle className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {item.email && (
                          <a href={`mailto:${item.email}`}
                            className="p-1.5 hover:bg-blue-50 text-blue-500 rounded-lg">
                            <Mail className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length < items.length && (
            <div className="px-4 py-2 border-t border-gray-50 text-xs text-gray-400">
              Showing {filtered.length} of {items.length} entries
            </div>
          )}
        </div>
      )}
    </div>
  );
}


// ── Settings Tab ──────────────────────────────────────────────────────────────

interface SiteSettingRow { key: string; value: string; label: string | null; }

const BANNER_THEMES = [
  { value: 'orange', label: 'Orange',  swatch: 'bg-orange-500' },
  { value: 'dark',   label: 'Dark',    swatch: 'bg-gray-900'   },
  { value: 'blue',   label: 'Blue',    swatch: 'bg-blue-600'   },
  { value: 'green',  label: 'Green',   swatch: 'bg-emerald-600'},
  { value: 'teal',   label: 'Teal',    swatch: 'bg-teal-600'   },
  { value: 'red',    label: 'Red',     swatch: 'bg-red-600'    },
  { value: 'purple', label: 'Purple',  swatch: 'bg-purple-600' },
];

function SettingsTab() {
  const [rows,       setRows]       = useState<SiteSettingRow[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [loadError,  setLoadError]  = useState('');
  const [local,      setLocal]      = useState<Record<string, string>>({});
  const [saving,     setSaving]     = useState<string | null>(null);
  const [saved,      setSaved]      = useState<Set<string>>(new Set());
  const [banners,    setBanners]    = useState<OfferBanner[]>(DEFAULT_BANNERS);
  const [bannerSaving, setBannerSaving] = useState(false);
  const [bannerSaved,  setBannerSaved]  = useState(false);

  async function load() {
    setLoading(true); setLoadError('');
    const { data, error } = await supabase.from('site_settings').select('*').order('key');
    if (error) { setLoadError(error.message); setLoading(false); return; }
    const r = (data ?? []) as SiteSettingRow[];
    setRows(r);
    setLocal(Object.fromEntries(r.map(s => [s.key, s.value])));
    const bannerRow = r.find(s => s.key === 'offer_banners');
    if (bannerRow) { try { setBanners(JSON.parse(bannerRow.value)); } catch {} }
    setLoading(false);
  }
  useAutoRefresh(load, 'site_settings', 120_000);

  function updateBanner(id: number, field: keyof OfferBanner, value: string | boolean) {
    setBanners(prev => prev.map(b => b.id === id ? { ...b, [field]: value } : b));
  }

  async function saveBanners() {
    setBannerSaving(true);
    const value = JSON.stringify(banners);
    await supabase.from('site_settings').upsert({ key: 'offer_banners', value, updated_at: new Date().toISOString() });
    await useSettingsStore.getState().load();
    setBannerSaving(false); setBannerSaved(true);
    setTimeout(() => setBannerSaved(false), 2500);
  }

  function setField(key: string, value: string) {
    setLocal(prev => ({ ...prev, [key]: value }));
  }

  async function saveSetting(key: string) {
    setSaving(key);
    const value = local[key] ?? '';
    await supabase.from('site_settings').upsert({ key, value, updated_at: new Date().toISOString() });
    setRows(prev => prev.map(r => r.key === key ? { ...r, value } : r));
    // Reload the settings store so changes take effect sitewide immediately
    await useSettingsStore.getState().load();
    setSaved(prev => new Set([...prev, key]));
    setTimeout(() => setSaved(prev => { const n = new Set(prev); n.delete(key); return n; }), 2500);
    setSaving(null);
  }

  async function saveAll(keys: string[]) {
    for (const key of keys) await saveSetting(key);
  }

  function FieldRow({ k, label, type = 'text', min, max, step, unit, hint }: {
    k: string; label: string; type?: string; min?: number; max?: number; step?: number; unit?: string; hint?: string;
  }) {
    return (
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700 w-48 shrink-0">{label}</label>
        <div className="flex items-center gap-2 flex-1">
          {unit && <span className="text-xs text-gray-400">{unit}</span>}
          <input
            type={type}
            value={local[k] ?? ''}
            onChange={e => setField(k, e.target.value)}
            min={min} max={max} step={step}
            className="w-36 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          {hint && <span className="text-xs text-gray-400">{hint}</span>}
        </div>
        <button onClick={() => saveSetting(k)} disabled={saving === k}
          className="flex items-center gap-1 text-xs font-bold bg-orange-100 hover:bg-orange-200 disabled:opacity-50 text-orange-700 px-3 py-2 rounded-lg whitespace-nowrap">
          {saving === k ? <Loader2 className="w-3 h-3 animate-spin" /> : saved.has(k) ? <><Check className="w-3 h-3" /> Saved</> : 'Save'}
        </button>
      </div>
    );
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-orange-400" /></div>;

  return (
    <div className="max-w-3xl mx-auto py-6 space-y-6">
      {loadError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          <strong>Error:</strong> {loadError}
          {(loadError.includes('relation') || loadError.includes('does not exist')) && (
            <p className="mt-1 text-xs">Run <code className="bg-red-100 px-1 rounded">20260316_admin_orders.sql</code> in Supabase SQL Editor to create the site_settings table first.</p>
          )}
        </div>
      )}

      {/* Announcement Banner */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Bell className="w-4 h-4 text-orange-500" />
          <h3 className="font-bold text-gray-900">Announcement Banner</h3>
          <span className="text-xs text-gray-400 ml-auto">Shown sitewide above the navbar — dismissable by visitors</span>
        </div>

        <div className="flex gap-3 items-center">
          <input
            value={local['announcement_text'] ?? ''}
            onChange={e => setField('announcement_text', e.target.value)}
            placeholder="e.g. Eid Sale — extra 5% off on all ACs this week only!"
            className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <label className="flex items-center gap-2 cursor-pointer select-none shrink-0">
            <input type="checkbox"
              checked={local['announcement_enabled'] === 'true'}
              onChange={e => setField('announcement_enabled', String(e.target.checked))}
              className="w-4 h-4 accent-orange-500" />
            <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Show banner</span>
          </label>
          <button
            onClick={() => saveAll(['announcement_text', 'announcement_enabled'])}
            disabled={saving === 'announcement_text' || saving === 'announcement_enabled'}
            className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-xs font-bold px-4 py-2 rounded-xl whitespace-nowrap">
            {(saving === 'announcement_text' || saving === 'announcement_enabled')
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : (saved.has('announcement_text') || saved.has('announcement_enabled'))
                ? '✓ Saved!'
                : 'Save Banner'}
          </button>
        </div>
      </div>

      {/* Offer Banner Slider */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-orange-500" />
            <h3 className="font-bold text-gray-900">Offer Banner Slider</h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">Shown on homepage · up to 5 banners · auto-rotates</span>
            <button onClick={saveBanners} disabled={bannerSaving}
              className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-xs font-bold px-4 py-2 rounded-xl whitespace-nowrap">
              {bannerSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : bannerSaved ? '✓ Saved!' : 'Save All Banners'}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {banners.map((banner, i) => (
            <div key={banner.id} className={`rounded-2xl border-2 p-4 space-y-3 transition-colors ${banner.active ? 'border-orange-200 bg-orange-50/30' : 'border-gray-100 bg-gray-50/50'}`}>
              {/* Header row */}
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                <span className="text-sm font-semibold text-gray-700 flex-1">Banner {i + 1}</span>
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input type="checkbox" checked={banner.active}
                    onChange={e => updateBanner(banner.id, 'active', e.target.checked)}
                    className="w-3.5 h-3.5 accent-orange-500" />
                  <span className="text-xs font-medium text-gray-600">Active</span>
                </label>
                {/* Theme swatches */}
                <div className="flex items-center gap-1">
                  {BANNER_THEMES.map(t => (
                    <button key={t.value} title={t.label} onClick={() => updateBanner(banner.id, 'theme', t.value)}
                      className={`w-4 h-4 rounded-full ${t.swatch} transition-all ${banner.theme === t.value ? 'ring-2 ring-offset-1 ring-gray-500 scale-110' : 'opacity-60 hover:opacity-100'}`} />
                  ))}
                </div>
              </div>

              {/* Fields */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Headline *</label>
                  <input value={banner.title} onChange={e => updateBanner(banner.id, 'title', e.target.value)}
                    placeholder="e.g. Eid Sale — 10% Off All ACs"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Badge / Label</label>
                  <input value={banner.badge} onChange={e => updateBanner(banner.id, 'badge', e.target.value)}
                    placeholder="e.g. Limited Time · This Week Only"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Subtitle</label>
                  <input value={banner.subtitle} onChange={e => updateBanner(banner.id, 'subtitle', e.target.value)}
                    placeholder="e.g. All inverter ACs from top brands — deal ends Sunday"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Button Text</label>
                  <input value={banner.cta} onChange={e => updateBanner(banner.id, 'cta', e.target.value)}
                    placeholder="e.g. Shop ACs"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Button Link</label>
                  <input value={banner.ctaLink} onChange={e => updateBanner(banner.id, 'ctaLink', e.target.value)}
                    placeholder="e.g. /products?category=air-conditioners"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Consultation Threshold */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Phone className="w-4 h-4 text-orange-500" />
          <h3 className="font-bold text-gray-900">Consultation Threshold</h3>
        </div>
        <p className="text-sm text-gray-500">Products at or above this price show "Book Free Consultation" instead of Add to Cart. Changes take effect immediately on the product page.</p>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 shrink-0">PKR</span>
          <input type="number" min={0} step={10000}
            value={local['consultation_threshold'] ?? SETTING_DEFAULTS.consultationThreshold}
            onChange={e => setField('consultation_threshold', e.target.value)}
            className="w-40 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
          <button onClick={() => saveSetting('consultation_threshold')} disabled={saving === 'consultation_threshold'}
            className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-xs font-bold px-4 py-2 rounded-xl">
            {saving === 'consultation_threshold' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved.has('consultation_threshold') ? '✓ Saved!' : 'Save'}
          </button>
          <span className="text-xs text-gray-400">Default: PKR {SETTING_DEFAULTS.consultationThreshold.toLocaleString()}</span>
        </div>
      </div>

      {/* Installment Plan Rates */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-orange-500" />
            <h3 className="font-bold text-gray-900">Installment Plan Rates</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Live — applies on next page load</span>
            <button onClick={() => {
              const planKeys = ['2m','3m','6m','12m'];
              for (const p of planKeys) {
                const mk = parseFloat(local[`plan_${p}_markup`] ?? '1');
                const av = parseFloat(local[`plan_${p}_advance`] ?? '0');
                if (isNaN(mk) || mk < 1.0 || mk > 3) { alert(`Markup for ${p} must be between 1.0 and 3.0`); return; }
                if (isNaN(av) || av < 0.2 || av > 0.7) { alert(`Advance ratio for ${p} must be between 0.20 and 0.70`); return; }
              }
              saveAll(['plan_2m_markup','plan_2m_advance','plan_3m_markup','plan_3m_advance','plan_6m_markup','plan_6m_advance','plan_12m_markup','plan_12m_advance']);
            }}
              className="text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg">
              Save All Plans
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-500">Markup multiplier and advance ratio for each plan. Changes are stored in Supabase and applied to all installment price displays.</p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 rounded-xl">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-gray-600 w-16">Plan</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Markup multiplier</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Advance ratio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(['2m', '3m', '6m', '12m'] as const).map(plan => {
                const mk = `plan_${plan}_markup`;
                const av = `plan_${plan}_advance`;
                const markup = parseFloat(local[mk] ?? '1');
                const adv    = parseFloat(local[av]  ?? '0');
                return (
                  <tr key={plan}>
                    <td className="px-4 py-3 font-black text-gray-900">{plan}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <input type="number" step="0.01" min="1" max="3"
                          value={local[mk] ?? ''}
                          onChange={e => setField(mk, e.target.value)}
                          className={`w-24 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 ${!isNaN(markup) && (markup < 1 || markup > 3) ? 'border-red-300 bg-red-50' : 'border-gray-200'}`} />
                        <span className={`text-xs ${!isNaN(markup) && (markup < 1 || markup > 3) ? 'text-red-500' : 'text-gray-400'}`}>
                          {isNaN(markup) ? '?' : markup < 1 || markup > 3 ? 'Must be 1.0–3.0' : `${((markup - 1) * 100).toFixed(0)}% surcharge`}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <input type="number" step="0.01" min="0.2" max="0.7"
                          value={local[av] ?? ''}
                          onChange={e => setField(av, e.target.value)}
                          className={`w-24 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 ${!isNaN(adv) && (adv < 0.2 || adv > 0.7) ? 'border-red-300 bg-red-50' : 'border-gray-200'}`} />
                        <span className={`text-xs ${!isNaN(adv) && (adv < 0.2 || adv > 0.7) ? 'text-red-500' : 'text-gray-400'}`}>
                          {isNaN(adv) ? '?' : adv < 0.2 || adv > 0.7 ? 'Must be 0.20–0.70' : `${(adv * 100).toFixed(0)}% advance`}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Raw settings viewer */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-900 flex items-center gap-2"><Settings className="w-4 h-4 text-gray-400" /> All Settings (Raw)</h3>
          <button onClick={load} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600">
            <RefreshCw className="w-3.5 h-3.5" /> Reload from DB
          </button>
        </div>
        <div className="space-y-1.5">
          {rows.map(s => (
            <div key={s.key} className="flex items-center gap-3 py-1 border-b border-gray-50 last:border-0">
              <span className="font-mono text-xs text-gray-500 w-52 shrink-0">{s.key}</span>
              <span className="text-xs text-gray-800">{s.value || <span className="italic text-gray-300">empty</span>}</span>
            </div>
          ))}
          {rows.length === 0 && <p className="text-xs text-gray-400 italic">No settings stored yet — they'll appear here after you save above.</p>}
        </div>
      </div>
    </div>
  );
}


// ── Compatibility Review Tab ──────────────────────────────────────────────────

import { checkCompatibility, parseBatteryVoltage } from '@/lib/compatibility';

function CompatibilityReviewTab({ products, onRefresh }: { products: Product[]; onRefresh: () => void }) {
  const [saving, setSaving] = useState<string | null>(null);
  const [saved,  setSaved]  = useState<Set<string>>(new Set());

  // Separate products by system role based on normalized_category / category
  const inverters = products.filter(p =>
    p.normalized_category === 'Solar Inverters' ||
    p.category.toLowerCase().includes('inverter') ||
    p.category.toLowerCase().includes('solar converter')
  );
  const batteries = products.filter(p =>
    p.normalized_category === 'Solar Batteries' ||
    p.category.toLowerCase().includes('solar battery') ||
    p.category.toLowerCase().includes('lifepo4')
  );

  // For each inverter, check compatibility status derived from specs
  function getInverterKw(p: Product): number | null {
    const specVals = Object.values(p.specs || {}).join(' ');
    const m = specVals.match(/(\d+\.?\d*)\s*kw/i) || p.model.match(/(\d+\.?\d*)\s*kw/i) || p.model.match(/pv(\d{4,5})/i);
    if (!m) return null;
    const v = parseFloat(m[1]);
    // PV model codes: PV8500 = 8.5kW, PV7000 = 7kW
    if (p.model.toUpperCase().match(/PV\d{4,5}/)) return v / 1000;
    return v;
  }

  function getBatteryVoltage(p: Product): number | null {
    const specVals = Object.values(p.specs || {}).join(' ');
    const m = specVals.match(/\b(24|48)\s*v/i);
    if (m) return parseInt(m[1]);
    return null;
  }

  async function saveField(id: string, field: string, value: unknown) {
    setSaving(id);
    try {
      const { error } = await supabase.from('products').update({ [field]: value, updated_at: new Date().toISOString() }).eq('id', id);
      if (!error) { setSaved(prev => new Set([...prev, id])); onRefresh(); }
    } finally { setSaving(null); }
  }

  return (
    <div className="space-y-8">
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
        <h2 className="font-black text-gray-900 text-lg mb-1">⚡ Compatibility Review</h2>
        <p className="text-sm text-gray-600">
          Solar inverters and batteries must have <strong>inverter_power_kw</strong> and <strong>battery_voltage</strong> populated
          before they can be paired or recommended. Products missing these fields are blocked from compatibility matching.
        </p>
        <div className="mt-3 grid sm:grid-cols-3 gap-3 text-xs text-center">
          {[
            { label: 'Solar Inverters', count: inverters.length, color: 'bg-amber-100 text-amber-800' },
            { label: 'Solar Batteries', count: batteries.length, color: 'bg-blue-100 text-blue-800' },
            { label: 'Unresolved (missing data)', count: [...inverters, ...batteries].filter(p => !getInverterKw(p) && !getBatteryVoltage(p)).length, color: 'bg-red-100 text-red-700' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl px-4 py-3 font-bold ${s.color}`}>
              <div className="text-2xl">{s.count}</div>
              <div>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Inverter review table */}
      <section>
        <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
          <span className="text-lg">⚡</span> Inverters ({inverters.length})
        </h3>
        <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-900 text-white text-left">
                <th className="px-4 py-3 font-bold">Product</th>
                <th className="px-4 py-3 font-bold">Detected kW</th>
                <th className="px-4 py-3 font-bold">DB inverter_power_kw</th>
                <th className="px-4 py-3 font-bold">Status</th>
              </tr>
            </thead>
            <tbody>
              {inverters.map((p, i) => {
                const detectedKw = getInverterKw(p);
                const dbKw = (p as any).inverter_power_kw;
                const isSaved = saved.has(p.id);
                const result = checkCompatibility({ inverterPowerKw: dbKw ?? detectedKw, batteryVoltage: 48 });
                return (
                  <tr key={p.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900 text-xs">{p.brand} {p.simplified_name || p.model}</div>
                      <div className="text-gray-400 text-[10px]">{p.category}</div>
                    </td>
                    <td className="px-4 py-3">
                      {detectedKw !== null
                        ? <span className="font-bold text-blue-700">{detectedKw} kW</span>
                        : <span className="text-red-500 text-xs">Not detected</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {dbKw
                          ? <span className="font-bold text-green-700">{dbKw} kW</span>
                          : <span className="text-gray-400 text-xs italic">not set</span>}
                        {detectedKw && !dbKw && (
                          <button
                            disabled={saving === p.id}
                            onClick={() => saveField(p.id, 'inverter_power_kw', detectedKw)}
                            className="text-[10px] bg-orange-500 text-white px-2 py-0.5 rounded font-bold hover:bg-orange-600 disabled:opacity-40"
                          >
                            {saving === p.id ? '…' : isSaved ? '✓' : `Set ${detectedKw}kW`}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        result.status === 'compatible' ? 'bg-green-100 text-green-700' :
                        result.status === 'missing_data_blocked' ? 'bg-red-100 text-red-700' :
                        result.status === 'uncertain_manual_review' ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {result.status === 'missing_data_blocked' ? '⚠ Missing data' :
                         result.status === 'uncertain_manual_review' ? '🔍 Review needed' :
                         result.status === 'compatible' ? '✓ Data OK' : result.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {inverters.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400 text-sm">No solar inverters found in catalog.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Battery review table */}
      <section>
        <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
          <span className="text-lg">🔋</span> Batteries ({batteries.length})
        </h3>
        <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-900 text-white text-left">
                <th className="px-4 py-3 font-bold">Product</th>
                <th className="px-4 py-3 font-bold">Detected Voltage</th>
                <th className="px-4 py-3 font-bold">DB battery_voltage</th>
                <th className="px-4 py-3 font-bold">Status</th>
              </tr>
            </thead>
            <tbody>
              {batteries.map((p, i) => {
                const detectedV = getBatteryVoltage(p);
                const dbV = (p as any).battery_voltage;
                const isSaved = saved.has(p.id);
                return (
                  <tr key={p.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900 text-xs">{p.brand} {p.simplified_name || p.model}</div>
                      <div className="text-gray-400 text-[10px]">{p.category}</div>
                    </td>
                    <td className="px-4 py-3">
                      {detectedV !== null
                        ? <span className="font-bold text-blue-700">{detectedV}V</span>
                        : <span className="text-red-500 text-xs">Not detected</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {dbV
                          ? <span className="font-bold text-green-700">{dbV}V</span>
                          : <span className="text-gray-400 text-xs italic">not set</span>}
                        {detectedV && !dbV && (
                          <button
                            disabled={saving === p.id}
                            onClick={() => saveField(p.id, 'battery_voltage', detectedV)}
                            className="text-[10px] bg-orange-500 text-white px-2 py-0.5 rounded font-bold hover:bg-orange-600 disabled:opacity-40"
                          >
                            {saving === p.id ? '…' : isSaved ? '✓' : `Set ${detectedV}V`}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        dbV || detectedV ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {dbV ? '✓ Data OK' : detectedV ? '⚠ Detected, not saved' : '⚠ Missing voltage data'}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {batteries.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400 text-sm">No solar batteries found in catalog.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-800">
        <strong>Rules enforced by the compatibility engine:</strong>
        <ul className="mt-2 space-y-1 list-disc list-inside">
          <li>24V batteries only with inverters below 3.7 kW</li>
          <li>Inverters above 4.0 kW require 48V batteries</li>
          <li>3.7–4.0 kW band is ambiguous — flagged for manual review unless an approved rule exists in <code className="text-xs bg-amber-100 px-1 rounded">compatibility.ts → APPROVED_EDGE_RULES</code></li>
          <li>Missing data → blocked from recommendations, never guessed</li>
        </ul>
      </div>
    </div>
  );
}

// ── Main AdminPortal ──────────────────────────────────────────────────────────

export default function AdminPortal() {
  const { isLoggedIn, loading, signOut, isRecovery, setRecovery } = useAuthStore();

  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [authErr, setAuthErr]   = useState('');
  const [authOk, setAuthOk]     = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [products, setProducts]   = useState<Product[]>([]);
  const [fetching, setFetching]   = useState(false);
  const [search, setSearch]       = useState('');
  const deferredSearch            = useDeferredValue(search);
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
  type AdminTab = 'products' | 'images' | 'import' | 'tools' | 'qc' | 'reviews' | 'leads' | 'orders' | 'enquiries' | 'quotation' | 'settings' | 'schema' | 'audit' | 'catalog' | 'solar' | 'compatibility';
  const VALID_TABS: AdminTab[] = ['products','images','import','tools','qc','reviews','leads','orders','enquiries','quotation','settings','schema','audit','catalog','solar','compatibility'];
  const tabFromHash = (): AdminTab => {
    const h = window.location.hash.slice(1) as AdminTab;
    return VALID_TABS.includes(h) ? h : 'products';
  };
  const [tab, setTab] = useState<AdminTab>(tabFromHash);
  const changeTab = (t: AdminTab) => { setTab(t); window.location.hash = t; };
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [enrichingId, setEnrichingId] = useState<string | null>(null);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault(); setAuthErr(''); setAuthOk(''); setSubmitting(true);
    try {
      if (authMode === 'forgot') {
        const redirectTo = `${window.location.origin}/admin`;
        await resetPasswordForEmail(email, redirectTo);
        setAuthOk('Password reset email sent! Check your inbox and click the link.');
      } else if (authMode === 'signup') {
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

  async function handleSetNewPassword(e: React.FormEvent) {
    e.preventDefault(); setAuthErr(''); setAuthOk(''); setSubmitting(true);
    try {
      if (password !== confirm) { setAuthErr('Passwords do not match'); setSubmitting(false); return; }
      await updatePassword(password);
      setAuthOk('Password updated! Signing you in…');
      setRecovery(false);
      setPassword(''); setConfirm('');
    } catch (err: any) { setAuthErr(err.message || 'Something went wrong'); }
    finally { setSubmitting(false); }
  }

  async function loadProducts() {
    setFetching(true);
    const { products: p } = await getProducts({ admin: 'true', ...(catFilter ? { category: catFilter } : {}) });
    setProducts(p); setFetching(false);
  }

  useEffect(() => {
    const onHash = () => setTab(tabFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => { if (isLoggedIn) loadProducts(); }, [isLoggedIn, catFilter]);

  // Build search index whenever products change
  const searchIndex = useMemo(() => buildSearchIndex(products), [products]);

  // All unique brands for filter dropdown
  const allBrands = useMemo(() => [...new Set(products.map(p => p.brand))].sort(), [products]);

  // Use search engine for text search; then apply additional filter bar filters.
  // deferredSearch lets the input feel instant while the expensive filter runs at lower priority.
  const filtered = useMemo(() => {
    let list = deferredSearch.trim()
      ? adminSearch(searchIndex, deferredSearch).map(r => r.product)
      : products;
    if (brandFilter) list = list.filter(p => p.brand === brandFilter);
    if (missingImgFilter) list = list.filter(p => !productHasImage(p));
    if (installFilter) list = list.filter(p => p.installments && Object.keys(p.installments).length > 0);
    if (priceMin) list = list.filter(p => p.price.cash_floor >= Number(priceMin));
    if (priceMax) list = list.filter(p => p.price.cash_floor <= Number(priceMax));
    return list;
  }, [deferredSearch, searchIndex, products, brandFilter, missingImgFilter, installFilter, priceMin, priceMax]);

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

  async function handleBulkDelete() {
    setBulkRunning(true);
    try {
      for (const id of selectedIds) await deleteProduct(id);
      logAdminAction({ action: 'Bulk Delete', productsAffected: selectedIds.size, fields: [] });
      await loadProducts();
      setSelectedIds(new Set());
    } finally {
      setBulkRunning(false);
      setBulkDeleteConfirm(false);
    }
  }

  // ── Login screen ─────────────────────────────────────────────────────────────

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>;
  }

  // ── Password recovery screen (user clicked the reset email link) ─────────────
  if (isRecovery) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border w-full max-w-sm p-8">
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Package className="w-6 h-6 text-orange-600" />
            </div>
            <h1 className="text-xl font-black text-gray-900">Set New Password</h1>
            <p className="text-sm text-gray-500 mt-1">Enter and confirm your new password</p>
          </div>
          <form onSubmit={handleSetNewPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">New Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoFocus minLength={8}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Confirm New Password</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required minLength={8}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
            {authErr && <p className="text-red-500 text-xs">{authErr}</p>}
            {authOk  && <p className="text-green-600 text-xs">{authOk}</p>}
            <button type="submit" disabled={submitting}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg font-bold text-sm disabled:opacity-60 flex items-center justify-center gap-2">
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating…</> : 'Set New Password'}
            </button>
          </form>
        </div>
      </div>
    );
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
            <p className="text-sm text-gray-500 mt-1">
              {authMode === 'forgot' ? 'Reset your password' : authMode === 'signin' ? 'Sign in to manage products' : 'Create an admin account'}
            </p>
          </div>

          {authMode !== 'forgot' && (
            <div className="flex rounded-xl border border-gray-200 p-1 mb-5">
              {(['signin', 'signup'] as const).map(m => (
                <button key={m} type="button" onClick={() => { setAuthMode(m); setAuthErr(''); setAuthOk(''); }}
                  className={`flex-1 py-1.5 rounded-lg text-sm font-semibold transition-colors ${authMode === m ? 'bg-orange-500 text-white' : 'text-gray-500 hover:text-gray-700'}`}>
                  {m === 'signin' ? 'Sign In' : 'Sign Up'}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
            {authMode !== 'forgot' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
            )}
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
                ? <><Loader2 className="w-4 h-4 animate-spin" /> {authMode === 'signin' ? 'Signing in…' : authMode === 'forgot' ? 'Sending…' : 'Creating account…'}</>
                : (authMode === 'signin' ? 'Sign In' : authMode === 'forgot' ? 'Send Reset Email' : 'Create Account')}
            </button>
            {authMode === 'signin' && (
              <button type="button" onClick={() => { setAuthMode('forgot'); setAuthErr(''); setAuthOk(''); }}
                className="w-full text-center text-xs text-gray-400 hover:text-orange-500 mt-1">
                Forgot password?
              </button>
            )}
            {authMode === 'forgot' && (
              <button type="button" onClick={() => { setAuthMode('signin'); setAuthErr(''); setAuthOk(''); }}
                className="w-full text-center text-xs text-gray-400 hover:text-orange-500 mt-1">
                ← Back to Sign In
              </button>
            )}
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

      {/* Tabs — grouped by function */}
      <div className="bg-white border-b border-gray-100 px-4 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {([
            { id: 'products',  label: 'Products',    group: 'catalog' },
            { id: 'images',    label: `Images${missingImgCount > 0 ? ` (${missingImgCount})` : ''}`, group: 'catalog' },
            { id: 'import',    label: 'Import CSV',  group: 'catalog' },
            { id: 'tools',     label: 'Data Tools',  group: 'catalog' },
            { id: 'qc',        label: `QC${products.length > 0 ? ` (${qcSummary(products).qcIssues})` : ''}`, group: 'catalog' },
            { id: 'catalog',   label: 'WhatsApp Catalog', group: 'catalog' },
            { id: 'orders',    label: 'Orders',      group: 'crm' },
            { id: 'enquiries', label: 'Enquiries',   group: 'crm' },
            { id: 'quotation', label: '📄 Quotation', group: 'crm' },
            { id: 'reviews',   label: 'Reviews',     group: 'crm' },
            { id: 'solar',     label: '☀️ Solar Leads', group: 'crm' },
            { id: 'leads',     label: 'Partners',    group: 'crm' },
            { id: 'settings',  label: 'Settings',    group: 'config' },
            { id: 'schema',    label: 'Spec Schema', group: 'config' },
            { id: 'audit',        label: 'Audit Log',        group: 'config' },
            { id: 'compatibility', label: '⚡ Compatibility',  group: 'config' },
          ] as const).map((t, i, arr) => {
            const prevGroup = i > 0 ? arr[i - 1].group : t.group;
            return (
              <div key={t.id} className={`flex items-center ${prevGroup !== t.group && i > 0 ? 'ml-2 pl-2 border-l border-gray-200' : ''}`}>
                <button onClick={() => changeTab(t.id)}
                  className={`px-3 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    tab === t.id ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}>
                  {t.label}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {tab === 'import' ? (
          <ImportTab onImported={loadProducts} existingProducts={products} />
        ) : tab === 'tools' ? (
          <ToolsTab onRefresh={loadProducts} products={products} selectedIds={selectedIds} />
        ) : tab === 'images' ? (
          <ImagesTab products={products} onRefresh={loadProducts} />
        ) : tab === 'qc' ? (
          <QCQueueTab products={products} onRefresh={loadProducts} />
        ) : tab === 'orders' ? (
          <OrdersTab />
        ) : tab === 'enquiries' ? (
          <EnquiriesTab />
        ) : tab === 'quotation' ? (
          <QuotationTab products={products} />
        ) : tab === 'reviews' ? (
          <ReviewsTab />
        ) : tab === 'solar' ? (
          <SolarLeadsTab />
        ) : tab === 'leads' ? (
          <PartnerLeadsTab />
        ) : tab === 'settings' ? (
          <SettingsTab />
        ) : tab === 'schema' ? (
          <SpecSchemaTab />
        ) : tab === 'audit' ? (
          <AuditLogTab />
        ) : tab === 'catalog' ? (
          <CatalogExportPanel products={products} />
        ) : tab === 'compatibility' ? (
          <CompatibilityReviewTab products={products} onRefresh={loadProducts} />
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
                <button disabled={bulkRunning}
                  onClick={() => setBulkDeleteConfirm(true)}
                  className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-xs font-bold px-3 py-1.5 rounded-lg">
                  <Trash2 className="w-3.5 h-3.5" /> Delete Selected
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
              <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-opacity duration-150 ${deferredSearch !== search ? 'opacity-60' : ''}`}>
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
                        const qc = scoreProduct(p);
                        const qcFail = qc.score < 90;
                        const noImage = !hasImg;
                        const noName  = !p.simplified_name?.trim();
                        const noSpecs = !p.specs || Object.keys(p.specs).length === 0;
                        return (
                          <tr key={p.id} className={`transition-colors ${isSelected ? 'bg-orange-50/60' : noImage ? 'bg-amber-50/40 hover:bg-amber-50' : 'hover:bg-gray-50'}`}>
                            <td className="px-4 py-3">
                              <button onClick={() => toggleSelect(p.id)} className="text-gray-300 hover:text-orange-500 transition-colors">
                                {isSelected ? <CheckSquare className="w-4 h-4 text-orange-500" /> : <Square className="w-4 h-4" />}
                              </button>
                            </td>
                            <td className="px-4 py-3">
                              <div className="relative group w-10 h-10">
                                {hasImg
                                  ? <img src={productDisplayImage(p)} alt={p.simplified_name || p.model}
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
                              {qcFail && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {noImage && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-600">NO IMAGE</span>}
                                  {noName  && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">NO NAME</span>}
                                  {noSpecs && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">NO SPECS</span>}
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${qc.score < 70 ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'}`}>QC {qc.score}</span>
                                </div>
                              )}
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
              specs: p.specs || {},
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

      {/* Bulk delete confirm */}
      {bulkDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full text-center">
            <Trash2 className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <h3 className="font-bold text-gray-900 mb-2">Delete {selectedIds.size} product{selectedIds.size !== 1 ? 's' : ''}?</h3>
            <p className="text-sm text-gray-500 mb-5">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setBulkDeleteConfirm(false)} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm font-medium hover:bg-gray-50">Cancel</button>
              <button onClick={handleBulkDelete} disabled={bulkRunning}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-lg py-2 text-sm font-bold disabled:opacity-60 flex items-center justify-center gap-2">
                {bulkRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Delete All
              </button>
            </div>
          </div>
        </div>
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
