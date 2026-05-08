import React, { useState, useEffect, useRef, useMemo, useDeferredValue, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import { signIn, signUp, resetPasswordForEmail, updatePassword } from '@/lib/auth';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import {
  getProducts, upsertProduct, deleteProduct,
  uploadBrandImage, updateProductImages, fetchAndUploadOrSaveUrl, saveProductImages,
  calcAllPlans, calcPlan, roundUp500, fmtPKR, CATEGORY_MAP,
  processCSVImport, reenrichAllProducts, rematchAllImages, getDataAudit, scanBucket, fixAllCategories,
  rebalanceCategories, getCategoryCounts, CAT_MIN, CAT_MAX,
  mergeDuplicates, findNearDuplicates, normalizeCategoryNames, type MergeResult, type MergePreviewGroup, type NearDupeGroup,
  composeImages, decomposeImages, logAdminAction, getAuditLog, clearAuditLog,
  getSolarLeads, updateSolarLeadStatus, saveSolarProposal, type SolarLead,
  type ImportSummary, type CsvImportRow, type Product, type AuditProduct, type BucketScanResult,
  type ProductGalleryImage, type AuditLogEntry,
} from '@/lib/api';
import { buildSearchIndex, adminSearch } from '@/lib/search';
import { calcGrandTotal, validateFloor, generateWhatsAppSummary, buildDetailedAdvisory, generateRefNumber } from '@/lib/invoiceLogic';
import {
  PANEL_WATTS, PANEL_PRICE_PER_W, INVERTER_PKR_PER_KW, BATTERY_PKR_PER_KWH,
  UNIT_RATE_PKR, NET_METERING_COST_PKR, DEFAULT_BATTERY_CHEMISTRY,
  SAVING_PCT_3KW, SAVING_PCT_5KW, SAVING_PCT_8KW, SAVING_PCT_BATTERY_ADDON,
  BILL_THRESHOLD_SMALL, BILL_THRESHOLD_LARGE,
  ELEVATED_FRAME_PER_PANEL, WIRING_PER_W, LABOR_PER_W,
} from '@/lib/solarRules';
import { GC_PACKAGES, type GCPackage } from './GreenCorridor';
import { PACKAGES as SOLAR_PACKAGES, type SolarPackage } from './SolarPage';
import {
  LogOut, Plus, Pencil, Trash2, Upload, Search, X, Check,
  ChevronDown, ChevronUp, Package, FileUp, Loader2, Sparkles, Image as ImageIcon,
  RefreshCw, AlertTriangle, Camera, ImageOff, Tag, Wand2, ListChecks, MessageCircle,
  CheckSquare, Square, Filter, History, Edit2, Star, MoveUp, MoveDown,
  Building2, Phone, Mail, Bell, Settings, ShoppingBag, CalendarDays, CheckCircle, Layers,
  MapPin, Users,
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

interface PriceAuditRow {
  id: string;
  brand: string;
  model: string;
  category: string;
  previous_price: number;
  reference_price: number;
  adjusted_price: number | null;
  reason: string | null;
  action: 'no_change' | 'flagged' | 'adjusted';
  applied: boolean;
  created_at: string;
}

function PriceAuditPanel() {
  const [rows, setRows] = useState<PriceAuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('price_audit_log' as any)
      .select('*').in('action', ['flagged', 'adjusted']).order('created_at', { ascending: false }).limit(200)
      .then(({ data, error }) => {
        if (error) { setErr(error.message); }
        else { setRows((data || []) as PriceAuditRow[]); }
        setLoading(false);
      });
  }, []);

  function exportCSV() {
    const lines = [
      'brand,model,category,previous_price,reference_price,adjusted_price,action,applied,created_at',
      ...rows.map(r =>
        [r.brand, r.model, r.category, r.previous_price, r.reference_price,
          r.adjusted_price ?? '', r.action, r.applied, r.created_at].join(',')
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `price_audit_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  }

  if (loading) return <div className="py-6 text-center text-sm text-gray-400">Loading price audit data…</div>;
  if (err) {
    if (err.includes('does not exist') || err.includes('PGRST205')) {
      return (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          <strong>price_audit_log table not yet created.</strong> Apply the migration
          (<code>supabase/migrations/20260424_price_audit_log.sql</code>) in the Supabase dashboard,
          then run <code>node audit_prices.mjs</code> from the repo root to populate it.
        </div>
      );
    }
    return <div className="text-sm text-red-500 py-4">{err}</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-800 text-sm">Price Audit — Flagged SKUs</h3>
          <p className="text-xs text-gray-400 mt-0.5">{rows.length} flagged across all runs · populated by <code>node audit_prices.mjs</code></p>
        </div>
        {rows.length > 0 && (
          <button onClick={exportCSV}
            className="text-xs font-semibold border border-blue-200 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-50">
            Export CSV
          </button>
        )}
      </div>
      {rows.length === 0 ? (
        <div className="bg-gray-50 rounded-xl p-8 text-center text-gray-400 text-sm">
          No flagged SKUs yet. Run <code>node audit_prices.mjs</code> after filling in <code>price_audit_reference.csv</code>.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-gray-500">Brand / Model</th>
                <th className="text-left px-3 py-2 font-medium text-gray-500">Category</th>
                <th className="text-right px-3 py-2 font-medium text-gray-500">Site Price</th>
                <th className="text-right px-3 py-2 font-medium text-gray-500">Reference</th>
                <th className="text-right px-3 py-2 font-medium text-gray-500">Adjusted</th>
                <th className="text-center px-3 py-2 font-medium text-gray-500">Applied</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <div className="font-medium text-gray-800">{r.brand}</div>
                    <div className="text-gray-400">{r.model}</div>
                  </td>
                  <td className="px-3 py-2 text-gray-500">{r.category}</td>
                  <td className="px-3 py-2 text-right font-mono text-gray-700">
                    {r.previous_price?.toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-green-700">
                    {r.reference_price?.toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-blue-700">
                    {r.adjusted_price?.toLocaleString() ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={`inline-block w-2 h-2 rounded-full ${r.applied ? 'bg-green-400' : 'bg-gray-300'}`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

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

      <div className="border-t border-gray-100 pt-6">
        <PriceAuditPanel />
      </div>
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

interface InvoiceLogPayload {
  refNumber:       string;
  docType:         'quotation' | 'invoice' | 'installment-invoice' | 'installment_payment_receipt' | 'service_receipt';
  customerName:    string;
  customerPhone:   string;
  customerEmail:   string;
  customerAddress: string;
  customerCnic:    string;
  customerType:    'house' | 'apartment' | 'commercial';
  serviceLevel:    'supply_only' | 'supply_install' | 'full_service';
  discountReason:  string;
  lines:           QuoteLine[];
  services:        Array<{ service_type: string; service_name: string; description: string; status: 'included' | 'charged' | 'not_selected'; visible_value: number; charged_amount: number }>;
  customCharges?:  Array<{ name: string; amount: number }>;
  guarantorName?:  string;
  guarantorPhone?: string;
  guarantorCnic?:  string;
  discount:        number;
  discountType:    string;
  grandTotal:      number;
  serviceTotal:    number;
  advancePct:      number;
  instTotalPrice:  number;
  instAdvanceAmt:  number;
  instMonths:      number;
  instMonthlyAmt:  number;
  instFirstDate:   string;
  notes?:          string;
}

async function logInvoiceToSupabase(payload: InvoiceLogPayload): Promise<void> {
  try {
    const subtotal = payload.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
    const saleType = (payload.docType === 'installment-invoice' || payload.docType === 'installment_payment_receipt')
      ? 'installment' : 'cash';

    const { data: inv, error: invErr } = await supabase
      .from('invoices')
      .insert({
        ref_number:          payload.refNumber,
        doc_type:            payload.docType,
        customer_name:       payload.customerName || null,
        customer_phone:      payload.customerPhone || null,
        customer_email:      payload.customerEmail || null,
        customer_address:    payload.customerAddress || null,
        customer_cnic:       payload.customerCnic || null,
        customer_type:       payload.customerType,
        service_level:       payload.serviceLevel,
        sale_type:           saleType,
        subtotal,
        service_total:       payload.serviceTotal || null,
        discount_pct:        payload.discount,
        discount_type:       payload.discountType,
        discount_reason:     payload.discountReason || null,
        grand_total:         payload.grandTotal,
        advance_pct:         payload.advancePct,
        inst_total_price:    payload.instTotalPrice || null,
        inst_advance_amt:    payload.instAdvanceAmt || null,
        inst_months:         payload.instMonths || null,
        inst_monthly_amt:    payload.instMonthlyAmt || null,
        payment_status:      'pending',
        custom_charges_json: payload.customCharges?.length ? payload.customCharges : null,
        guarantor_name:      payload.guarantorName || null,
        guarantor_phone:     payload.guarantorPhone || null,
        guarantor_cnic:      payload.guarantorCnic || null,
        notes:               payload.notes || null,
      })
      .select('id')
      .single();

    if (invErr || !inv) {
      console.warn('[invoice-log] Failed to log invoice header:', invErr?.message);
      return;
    }

    // ── invoice_lines ──────────────────────────────────────────────────────
    const lineRows = payload.lines.map(l => ({
      invoice_id:             inv.id,
      product_id:             l.id,
      name:                   l.name,
      model:                  l.model,
      category:               l.category,
      qty:                    l.qty,
      unit_price:             l.unitPrice,
      line_total:             l.qty * l.unitPrice,
      min_price:              l.minPrice || null,
      approved_floor_price:   l.floorPrice || null,
      override_reason:        l.overrideReason || null,
      kwh_per_month:          l.kwhPerMonth || null,
      warranty:               l.warranty || null,
      key_spec:               l.keySpec || null,
      key_specs_json:         (l.displayPrefix || l.packageNote || l.isPackage || l.packageComponents.length > 0)
                                ? {
                                    displayPrefix:     l.displayPrefix || '',
                                    packageNote:       l.packageNote || '',
                                    isPackage:         l.isPackage || false,
                                    packageComponents: l.packageComponents || [],
                                  }
                                : null,
    }));

    const { data: insertedLines, error: lineErr } = await supabase
      .from('invoice_lines')
      .insert(lineRows)
      .select('id, product_id');
    if (lineErr) console.warn('[invoice-log] Failed to log invoice lines:', lineErr.message);

    // ── price_overrides ────────────────────────────────────────────────────
    if (insertedLines) {
      const overrideRows = payload.lines
        .map((l, idx) => ({ l, lineId: insertedLines[idx]?.id }))
        .filter(({ l }) => l.overrideReason.trim())
        .map(({ l, lineId }) => ({
          invoice_id:      inv.id,
          invoice_line_id: lineId ?? null,
          product_id:      l.id,
          floor_price:     l.floorPrice,
          attempted_price: l.unitPrice,
          approved_price:  l.unitPrice,
          reason:          l.overrideReason,
        }));
      if (overrideRows.length > 0) {
        const { error: ovErr } = await supabase.from('price_overrides').insert(overrideRows);
        if (ovErr) console.warn('[invoice-log] Failed to log price overrides:', ovErr.message);
      }
    }

    // ── invoice_services ───────────────────────────────────────────────────
    const serviceRows = payload.services
      .filter(s => s.status !== 'not_selected')
      .map(s => ({
        invoice_id:     inv.id,
        service_type:   s.service_type,
        service_name:   s.service_name,
        description:    s.description,
        status:         s.status,
        visible_value:  s.visible_value,
        charged_amount: s.charged_amount,
      }));
    if (serviceRows.length > 0) {
      const { error: svcErr } = await supabase.from('invoice_services').insert(serviceRows);
      if (svcErr) console.warn('[invoice-log] Failed to log services:', svcErr.message);
    }

    // ── installment_schedules ──────────────────────────────────────────────
    if (payload.docType === 'installment-invoice' && payload.instMonths > 0 && payload.instFirstDate) {
      const scheduleRows = Array.from({ length: payload.instMonths }, (_, i) => {
        const due = new Date(payload.instFirstDate);
        due.setMonth(due.getMonth() + i);
        return {
          invoice_id:     inv.id,
          installment_no: i + 1,
          due_date:       due.toISOString().slice(0, 10),
          amount_due:     payload.instMonthlyAmt,
          status:         'pending',
        };
      });
      const { error: schedErr } = await supabase.from('installment_schedules').insert(scheduleRows);
      if (schedErr) console.warn('[invoice-log] Failed to log installment schedule:', schedErr.message);
    }
  } catch (e) {
    console.warn('[invoice-log] Unexpected error:', e);
  }
}

interface PackageComponent {
  id: string;
  name: string;
  qty: number;
  keySpec: string;
  warranty: string;
  status: 'included' | 'addon';
  addonPrice: number;
  hidden: boolean;
  group: 'core' | 'generation' | 'infrastructure' | 'service';
}

async function updateInvoiceInSupabase(invoiceId: string, payload: InvoiceLogPayload): Promise<void> {
  try {
    const { error: invErr } = await supabase
      .from('invoices')
      .update({
        customer_name:       payload.customerName || null,
        customer_phone:      payload.customerPhone || null,
        customer_email:      payload.customerEmail || null,
        customer_address:    payload.customerAddress || null,
        customer_cnic:       payload.customerCnic || null,
        customer_type:       payload.customerType || null,
        doc_type:            payload.docType,
        sale_type:           payload.docType === 'installment-invoice' ? 'installment' : 'cash',
        service_level:       payload.serviceLevel || null,
        subtotal:            payload.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0),
        discount_pct:        payload.discount,
        discount_type:       payload.discountType || null,
        discount_reason:     payload.discountReason || null,
        grand_total:         payload.grandTotal,
        service_total:       payload.serviceTotal,
        advance_pct:         payload.advancePct,
        inst_total_price:    payload.instTotalPrice || null,
        inst_advance_amt:    payload.instAdvanceAmt || null,
        inst_months:         payload.instMonths || null,
        inst_monthly_amt:    payload.instMonthlyAmt || null,
        inst_first_date:     payload.instFirstDate || null,
        custom_charges_json: payload.customCharges?.length ? payload.customCharges : null,
        guarantor_name:      payload.guarantorName || null,
        guarantor_phone:     payload.guarantorPhone || null,
        guarantor_cnic:      payload.guarantorCnic || null,
        notes:               payload.notes || null,
      })
      .eq('id', invoiceId);
    if (invErr) { console.warn('[invoice-update] header failed:', invErr.message); return; }

    // Replace lines
    await supabase.from('invoice_lines').delete().eq('invoice_id', invoiceId);
    if (payload.lines.length > 0) {
      const lineRows = payload.lines.map(l => ({
        invoice_id:  invoiceId,
        product_id:  l.id || null,
        name:        l.name,
        model:       l.model || null,
        category:    l.category || null,
        qty:         l.qty,
        unit_price:  l.unitPrice,
        kwh_per_month: l.kwhPerMonth || null,
        warranty:    l.warranty || null,
        key_spec:    l.keySpec || null,
        key_specs_json: {
          displayPrefix: l.displayPrefix,
          packageNote: l.packageNote,
          isPackage: l.isPackage,
          packageComponents: l.packageComponents,
        },
      }));
      const { error: lineErr } = await supabase.from('invoice_lines').insert(lineRows);
      if (lineErr) console.warn('[invoice-update] lines failed:', lineErr.message);
    }

    // Replace services
    await supabase.from('invoice_services').delete().eq('invoice_id', invoiceId);
    const serviceRows = payload.services
      .filter(s => s.status !== 'not_selected')
      .map(s => ({
        invoice_id:     invoiceId,
        service_type:   s.service_type,
        service_name:   s.service_name,
        description:    s.description,
        status:         s.status,
        visible_value:  s.visible_value,
        charged_amount: s.charged_amount,
      }));
    if (serviceRows.length > 0) {
      const { error: svcErr } = await supabase.from('invoice_services').insert(serviceRows);
      if (svcErr) console.warn('[invoice-update] services failed:', svcErr.message);
    }
  } catch (e) {
    console.warn('[invoice-update] unexpected:', e);
  }
}

interface QuoteLine {
  id: string;
  name: string;
  model: string;
  qty: number;
  unitPrice: number;
  category: string;   // normalized category for PDF grouping
  warranty: string;   // from product.warranty, editable
  keySpec: string;    // top 2 spec fields joined, editable
  kwhPerMonth: number; // estimated monthly consumption; 0 = not set
  savingsPct: number;  // inverter saving % vs conventional; 0 = not applicable
  minPrice: number;
  floorPrice: number;
  overrideReason: string;
  displayPrefix: string;  // prepended to name in PDF (e.g. "Additional Battery — ")
  packageNote: string;    // italic note sub-line below specs (e.g. "System includes inverter…")
  isPackage: boolean;     // render as expanded package with component list
  packageComponents: PackageComponent[];
}

// ── Default component definitions per package (keyed by QuoteLine.id) ─────────
const _pc = (
  id: string, name: string, qty: number, keySpec: string, warranty: string,
  group: PackageComponent['group'] = 'core',
  status: 'included' | 'addon' = 'included', addonPrice = 0,
): PackageComponent => ({ id, name, qty, keySpec, warranty, group, status, addonPrice, hidden: false });

const DEFAULT_PACKAGE_COMPONENTS: Record<string, PackageComponent[]> = {
  'solar-ups-3.6kw': [
    _pc('inv',   'Crown Yorker 3.6kW Hybrid Inverter',    1, '3.6kW · MPPT · Hybrid',             '3 year replacement',  'core'),
    _pc('bat',   'Crown Elektra Boost Pro 2.4kW Battery', 1, '2.4kWh · LiFePO4 · 48V',            '10 year replacement', 'core'),
    _pc('cable', 'Wiring, Cabling & Protection',          1, 'MCB · Earthing · AC/DC protection',  '1 year workmanship',  'infrastructure'),
    _pc('labor', 'Professional Installation & Transport', 1, 'Certified engineers',                 '1 year workmanship',  'service'),
  ],
  'solar-solar-3.6kw': [
    _pc('inv',    'Crown Yorker 3.6kW Hybrid Inverter',        1, '3.6kW · MPPT · Hybrid',            '3 year replacement',                    'core'),
    _pc('bat',    'Crown Elektra Boost Pro 2.4kW Battery',     1, '2.4kWh · LiFePO4 · 48V',           '10 year replacement',                   'core'),
    _pc('panels', 'Crown Bi-Facial 620W Solar Plates',         6, '620W · Mono Bi-Facial · PERC',      '12 year product · 25 year performance', 'generation'),
    _pc('frame',  'Elevated Solar Frame & Mounting Structure', 1, 'Galvanised steel · Wind-rated',     '5 year structural',                     'infrastructure'),
    _pc('cable',  'DC/AC Wiring, Cabling & Protection',        1, 'Solar DC cable · MCB · Earthing',   '1 year workmanship',                    'infrastructure'),
    _pc('labor',  'Professional Installation & Transport',     1, 'Certified engineers · City-wide',   '1 year workmanship',                    'service'),
  ],
  'solar-ups-5kw': [
    _pc('inv',   'Crown Yorker 5kW Hybrid Inverter',      1, '5kW · MPPT · Hybrid',             '3 year replacement',  'core'),
    _pc('bat',   'Crown Elektra Boost Pro 5.12kW Battery',1, '5.12kWh · LiFePO4 · 48V',         '10 year replacement', 'core'),
    _pc('cable', 'Wiring, Cabling & Protection',          1, 'MCB · Earthing · AC/DC protection','1 year workmanship',  'infrastructure'),
    _pc('labor', 'Professional Installation & Transport', 1, 'Certified engineers',               '1 year workmanship',  'service'),
  ],
  'solar-solar-5kw': [
    _pc('inv',    'Crown Yorker 5kW Hybrid Inverter',          1, '5kW · MPPT · Hybrid',              '3 year replacement',                    'core'),
    _pc('bat',    'Crown Elektra Boost Pro 5.12kW Battery',    1, '5.12kWh · LiFePO4 · 48V',          '10 year replacement',                   'core'),
    _pc('panels', 'Crown Bi-Facial 620W Solar Plates',         8, '620W · Mono Bi-Facial · PERC',      '12 year product · 25 year performance', 'generation'),
    _pc('frame',  'Elevated Solar Frame & Mounting Structure', 1, 'Galvanised steel · Wind-rated',     '5 year structural',                     'infrastructure'),
    _pc('cable',  'DC/AC Wiring, Cabling & Protection',        1, 'Solar DC cable · MCB · Earthing',   '1 year workmanship',                    'infrastructure'),
    _pc('labor',  'Professional Installation & Transport',     1, 'Certified engineers · City-wide',   '1 year workmanship',                    'service'),
  ],
  'solar-solar-8kw': [
    _pc('inv',    'Crown Nexus 8kW Hybrid Inverter',           1, '8kW · MPPT · Hybrid',               '5 year replacement',                    'core'),
    _pc('bat',    'Crown Elektra Boost Pro 5.12kW Battery',    1, '5.12kWh · LiFePO4 · 48V',           '10 year replacement',                   'core'),
    _pc('panels', 'Crown Bi-Facial 620W Solar Plates',        14, '620W · Mono Bi-Facial · PERC',       '12 year product · 25 year performance', 'generation'),
    _pc('frame',  'Elevated Solar Frame & Mounting Structure', 1, 'Galvanised steel · Wind-rated',      '5 year structural',                     'infrastructure'),
    _pc('cable',  'DC/AC Wiring, Cabling & Protection',        1, 'Solar DC cable · MCB · Earthing',    '1 year workmanship',                    'infrastructure'),
    _pc('labor',  'Professional Installation & Transport',     1, 'Certified engineers · City-wide',    '1 year workmanship',                    'service'),
  ],
  'solar-solar-12kw': [
    _pc('inv',    'Crown Nexus 12kW Hybrid Inverter',          1, '12kW · MPPT · Hybrid',               '5 year replacement',                    'core'),
    _pc('bat',    'Crown Elektra Boost Pro 5.12kW Battery',    1, '5.12kWh · LiFePO4 · 48V',            '10 year replacement',                   'core'),
    _pc('panels', 'Crown Bi-Facial 620W Solar Plates',        20, '620W · Mono Bi-Facial · PERC',        '12 year product · 25 year performance', 'generation'),
    _pc('frame',  'Elevated Solar Frame & Mounting Structure', 1, 'Galvanised steel · Wind-rated',       '5 year structural',                     'infrastructure'),
    _pc('cable',  'DC/AC Wiring, Cabling & Protection',        1, 'Solar DC cable · MCB · Earthing',     '1 year workmanship',                    'infrastructure'),
    _pc('labor',  'Professional Installation & Transport',     1, 'Certified engineers · City-wide',     '1 year workmanship',                    'service'),
  ],
};

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

async function generateQrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, { width: 120, margin: 1, color: { dark: '#1A1A1A', light: '#FFFFFF' } });
}

function normalizeAddress(raw: string): string {
  if (!raw?.trim()) return raw;
  let s = raw.trim();

  // Fix common city typos first (before title-case changes the case)
  s = s.replace(/\bkarach\b/gi, 'Karachi');
  s = s.replace(/\blahroe\b/gi, 'Lahore');

  // "near X" at end → second line "(Near X)"
  s = s.replace(/,?\s*near\s+([^,]+)$/i, '\n(Near $1)');

  // Common word substitutions
  s = s.replace(/\bbufferzone\b/gi, 'Buffer Zone');
  s = s.replace(/\bsector\b/gi, 'Sector');

  // Title-case each word; preserve all-caps abbreviations (DHA, NTS, KDA)
  s = s.replace(/\b\w+/g, w => {
    if (/^[A-Z]{2,}$/.test(w) || /^\d/.test(w)) return w;
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  });

  // Hyphenate letter(s)+digit: both adjacent (A366→A-366) and spaced (R 812→R-812)
  // Avoid re-hyphenating already-hyphenated or slash-separated (15/A2 stays intact)
  s = s.replace(/([^-\/\w])([A-Z]{1,2})(\d)/g, (_, pre, letters, digits) => pre + letters + '-' + digits);
  s = s.replace(/\b([A-Z]{1,2}) (\d)/g, '$1-$2');

  // Known area name normalisation (post title-case)
  s = s.replace(/Gulistan[- ]?E[- ]?Johar/gi, 'Gulistan-e-Johar');
  s = s.replace(/\bMasjid\s+[Ee]\s+Nimra\b/gi, 'Masjid-e-Nimra');
  s = s.replace(/\bFb\s+Area\b/gi, 'F.B. Area');
  s = s.replace(/\bF\.?B\.?\s+Area\b/gi, 'F.B. Area');

  // Insert comma before Block / Sector keywords if not already preceded by comma
  s = s.replace(/([^,])\s+(Block\s+\w)/g, '$1, $2');
  s = s.replace(/([^,])\s+(Sector\s+\S)/g, '$1, $2');

  // Insert comma after "Block N" or "Sector N" when followed by an area name (uppercase word)
  s = s.replace(/\b(Block\s+\S+),?\s+(?=[A-Z][a-z])/g, '$1, ');
  s = s.replace(/\b(Sector\s+\S+),?\s+(?=[A-Z][a-z])/g, '$1, ');

  // Insert comma before known city names at the end of the string
  const cities = ['Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Multan', 'Faisalabad', 'Peshawar'];
  for (const city of cities) {
    s = s.replace(new RegExp(`([^,])\\s+(${city})\\s*$`), `$1, $2`);
  }

  // Clean spacing and trailing duplicate city
  s = s.replace(/\s*,\s*/g, ', ').replace(/\s{2,}/g, ' ').trim();
  s = s.replace(/, ([^,]+)(, \1)+$/i, ', $1');
  return s;
}

async function generateQuotationPdf(opts: {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
  customerCnic: string;
  customerType: 'house' | 'apartment' | 'commercial';
  customerArea: string;
  isExistingCustomer: boolean | null;
  lines: QuoteLine[];
  services: Array<{
    service_type: string; service_name: string; description: string;
    status: 'included' | 'charged' | 'not_selected';
    visible_value: number; display_value?: string; charged_amount: number;
  }>;
  customCharges?: Array<{ name: string; amount: number }>;
  discount: number;
  discountMode: 'percentage' | 'fixed';
  discountType: string;
  discountReason: string;
  docType: 'quotation' | 'invoice';
  saleType: 'cash' | 'installment';
  refNumber: string;
  preparedBy: string;
  stockStatus: string;
  validityHours: number;
  installationType: 'supply-only' | 'installation-included';
  installationLines: Array<{ name: string; amount: number }>;
  advancePct: number;
  advanceAmtFixed?: number;
  cashPaySchedule?: Array<{ date: string; amount: number; note: string }>;
  balanceNote: string;
  advancePaid: boolean;
  deliveryEta: string;
  showNtn?: boolean;
  instTeaserMonthly?: number;
  instTeaserMonths?: number;
  instTotalPrice?: number;
  instAdvanceAmt?: number;
  instMonths?: number;
  instMonthlyAmt?: number;
  instFirstDate?: string;
}): Promise<Blob> {
  const ORANGE = '#EA580C';
  const DARK   = '#1A1A1A';
  const W = 210; const margin = 9;
  const printW = W - margin * 2;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const PKR = (n: number) => `PKR ${(Math.ceil(n / 100) * 100).toLocaleString('en-PK')}`;
  const fmtPKPhone = (p: string) => {
    const d = p.replace(/\D/g, '');
    if (d.length === 11 && d.startsWith('0')) return '+92 ' + d.slice(1, 4) + ' ' + d.slice(4);
    if (d.length === 12 && d.startsWith('92')) return '+92 ' + d.slice(2, 5) + ' ' + d.slice(5);
    if (d.length === 10) return '+92 ' + d.slice(0, 3) + ' ' + d.slice(3);
    return p;
  };
  const now = new Date();
  const fmtDate = (d: Date) => d.toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' });
  const dateStr = fmtDate(now);
  const validUntil = new Date(now.getTime() + opts.validityHours * 3_600_000);
  const validUntilStr = fmtDate(validUntil);

  // ── Load assets ──────────────────────────────────────────────────────────────
  let logoData: string | null = null;
  try { logoData = await loadLogoWhite(); } catch { /* fallback */ }
  let qrData: string | null = null;
  try { qrData = await loadQrBase64(); } catch { /* skip */ }
  let fbQrData: string | null = null;
  try { fbQrData = await generateQrDataUrl('https://www.facebook.com/share/g/18be5ayTCF/'); } catch { /* skip */ }
  let waQrData: string | null = null;
  try { waQrData = await generateQrDataUrl('https://wa.me/923702578788'); } catch { /* skip */ }

  // ── Totals ───────────────────────────────────────────────────────────────────
  const productSubtotal   = opts.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
  const installSubtotal   = opts.installationLines.reduce((s, i) => s + i.amount, 0);
  const chargedSvcTotal   = opts.services.filter(s => s.status === 'charged').reduce((sum, s) => sum + s.charged_amount, 0);
  const customChargesTotal = (opts.customCharges ?? []).reduce((s, c) => s + c.amount, 0);
  const baseBeforeDisc    = productSubtotal + installSubtotal + chargedSvcTotal;
  let discountAmt = 0;
  if (opts.discountMode === 'fixed') {
    discountAmt = Math.min(opts.discount, baseBeforeDisc);
  } else {
    discountAmt = Math.round(baseBeforeDisc * opts.discount / 100);
  }
  const grandTotal = baseBeforeDisc - discountAmt + customChargesTotal;

  // ── LAYOUT CONSTANTS ─────────────────────────────────────────────────────────
  const isCompact = opts.docType === 'invoice' || opts.lines.length >= 1;
  const cellPad = isCompact ? 0.8 : 1.0;
  const colGap = 4;
  const leftW = 112;
  const rightW = printW - leftW - colGap;   // 74
  const rightX = margin + leftW + colGap;
  const leftAutoMarginRight = W - (margin + leftW); // autoTable right margin for left column

  // ── ① HEADER STRIP (36mm) ─────────────────────────────────────────────────────
  const HEADER_H = 36;
  const badgeLabel = opts.docType === 'invoice' ? 'INVOICE' : 'QUOTATION';

  // Main orange band
  doc.setFillColor(ORANGE);
  doc.rect(0, 0, W, HEADER_H, 'F');

  // Right meta zone — dark mahogany band for strong visual separation
  doc.setFillColor(180, 55, 5);
  doc.rect(W - 62, 0, 62, HEADER_H, 'F');

  // Logo — left
  if (logoData) {
    doc.addImage(logoData, 'PNG', margin, 4, 0, 27);
  } else {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(255, 255, 255);
    doc.text("Tajalli's", margin, 18);
  }

  // Brand — two-line layout
  doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.setTextColor(255, 255, 255);
  doc.text('HOME & COMMERCIAL', margin + 38, 13);
  doc.text('SOLUTIONS', margin + 38, 21);
  // Thin white rule beneath brand
  doc.setDrawColor(255, 255, 255); doc.setLineWidth(0.5);
  doc.line(margin + 38, 23.5, margin + 38 + 74, 23.5);
  // Tagline below rule
  doc.setFont('helvetica', 'normal'); doc.setFontSize(6); doc.setTextColor(255, 222, 188);
  doc.text('Ghar Se Tijarat Tak — Har Zaroorat Ka Hal', margin + 38, 28.5);

  // Right meta zone: doc-type label (tiny, muted) → REF (large, dominant) → date (small)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(5.5); doc.setTextColor(255, 185, 145);
  doc.text(badgeLabel, W - margin, 8, { align: 'right' });
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(255, 255, 255);
  doc.text(opts.refNumber, W - margin, 19, { align: 'right' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(6); doc.setTextColor(255, 210, 175);
  doc.text(dateStr, W - margin, 28, { align: 'right' });

  // Vertical separator
  doc.setDrawColor(255, 255, 255); doc.setLineWidth(0.5);
  doc.line(W - 64, 3, W - 64, HEADER_H - 3);
  doc.setLineWidth(0.2);

  // Contact strip — full width at very bottom of header
  doc.setFont('helvetica', 'normal'); doc.setFontSize(5.5); doc.setTextColor(255, 210, 175);
  const contactParts = ['L-152 & 153, Sector 11C-1, North Karachi', '+92 370 2578788', 'support@tajallis.com.pk'];
  if (opts.showNtn) contactParts.push('NTN: 42101-3836602-3');
  doc.text(contactParts.join('  ·  '), margin, HEADER_H - 2);

  // ── TWO-COLUMN ZONE ───────────────────────────────────────────────────────────
  let leftY = HEADER_H + 2;
  let rightY = HEADER_H + 2;

  const secLabel = (text: string, x: number, y: number) => {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(ORANGE);
    doc.text(text, x, y);
  };

  // ── ROW 1 LEFT: Client ────────────────────────────────────────────────────────
  const custFields: Array<[string, string]> = [
    ['NAME', opts.customerName || '—'],
    ['PHONE', opts.customerPhone ? fmtPKPhone(opts.customerPhone) : '—'],
    ...(opts.customerEmail ? [['EMAIL', opts.customerEmail] as [string, string]] : []),
    ['ADDRESS', opts.customerAddress ? normalizeAddress(opts.customerAddress) : '—'],
    ...(opts.customerArea ? [['AREA', opts.customerArea] as [string, string]] : []),
    ['TYPE', opts.customerType === 'apartment' ? 'Flat / Apartment'
      : opts.customerType === 'house' ? 'House / Independent Unit' : 'Commercial'],
    ['EXISTING', opts.isExistingCustomer === true ? 'Yes — Returning'
      : opts.isExistingCustomer === false ? 'No — New' : '—'],
    ['ETA', opts.deliveryEta || '—'],
  ];

  const custRowH = 4.3;
  const EXTRA_LINE_H = 2.8; // mm per additional text line beyond the first

  // Pre-compute split lines + per-row height (multiline address needs more space)
  const custRows = custFields.map(([lbl, val]) => {
    const isName = lbl === 'NAME';
    doc.setFontSize(isName ? 8 : 7);
    const vl = doc.splitTextToSize(val, leftW - 26);
    const rowH = custRowH + Math.max(0, vl.length - 1) * EXTRA_LINE_H;
    return { lbl, val, vl, rowH, isName };
  });
  const custBlockH = custRows.reduce((s, r) => s + r.rowH, 0) + 9;

  doc.setFillColor(255, 247, 237);
  doc.rect(margin, leftY, leftW, custBlockH, 'F');
  doc.setDrawColor(234, 88, 12); doc.setLineWidth(0.5);
  doc.line(margin, leftY, margin, leftY + custBlockH);
  doc.setLineWidth(0.2);
  doc.setFillColor(ORANGE);
  doc.rect(margin, leftY, leftW, 4, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(255, 255, 255);
  doc.text('CLIENT', margin + 3, leftY + 3);

  let cy = leftY + 4 + custRowH;
  for (const { lbl, vl, rowH, isName } of custRows) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(5.5); doc.setTextColor(180, 100, 50);
    doc.text(lbl, margin + 3, cy);
    doc.setFont('helvetica', isName ? 'bold' : 'normal');
    doc.setFontSize(isName ? 8 : 7); doc.setTextColor(isName ? 20 : 30, 20, 20);
    doc.text(vl, margin + 22, cy);
    cy += rowH;
  }
  leftY += custBlockH + 2;

  // ── ROW 1 RIGHT: Invoice Meta ─────────────────────────────────────────────────
  const metaFields: Array<[string, string]> = [
    ['REF', opts.refNumber],
    ['DATE', dateStr],
    ['PREPARED BY', opts.preparedBy || '—'],
    ['SALE TYPE', opts.saleType === 'cash' ? 'Cash' : 'Installment'],
    ['SERVICE', opts.installationType === 'installation-included' ? 'Supply + Install' : 'Supply Only'],
    ['STOCK', opts.stockStatus],
    ...(opts.docType !== 'invoice' ? [['VALID', `${validUntilStr} (${opts.validityHours}h)`] as [string, string]] : []),
  ];

  const metaBlockH = metaFields.length * 4.0 + 8;
  doc.setFillColor(243, 244, 246);
  doc.rect(rightX, rightY, rightW, metaBlockH, 'F');
  doc.setFillColor(DARK);
  doc.rect(rightX, rightY, rightW, 4, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(255, 255, 255);
  doc.text('INVOICE DETAILS', rightX + 3, rightY + 3);

  let my = rightY + 4 + 4.0;
  for (const [lbl, val] of metaFields) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(5.5); doc.setTextColor(120, 120, 120);
    doc.text(lbl, rightX + 3, my);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(30, 30, 30);
    const vl = doc.splitTextToSize(val, rightW - 26);
    doc.text(vl, rightX + 22, my);
    my += 4.0;
  }
  rightY += metaBlockH + 2;

  // sync row 1
  leftY = Math.max(leftY, rightY);
  rightY = leftY;

  // ── ROW 2 LEFT: Items table ───────────────────────────────────────────────────
  // Merge similar categories: "Solar Systems" → "Solar", "AC Systems" → "AC" etc.
  const normCat = (c: string) => c.replace(/\s+systems?\s*$/i, '').replace(/\s+/g, ' ').trim() || c;

  const categoryOrder: string[] = [];
  const grouped: Record<string, QuoteLine[]> = {};
  const categoryDisplayName: Record<string, string> = {};
  for (const line of opts.lines) {
    const rawCat = line.category || 'Other';
    const key = normCat(rawCat);
    if (!grouped[key]) {
      grouped[key] = [];
      categoryOrder.push(key);
      categoryDisplayName[key] = rawCat;
    }
    grouped[key].push(line);
  }

  // Standardise warranty strings → "N-yr Type" format, title-cased
  const formatWty = (w: string): string => {
    if (!w?.trim()) return '';
    const TYPE_WORDS = ['replacement', 'manufacturer', 'workmanship', 'performance', 'product', 'structural', 'compressor'];
    return w.split(/\s*[·,]\s*/).map(part => {
      let s = part.trim();
      s = s.replace(/\b(\d+)\s*-?\s*years?\b/gi, '$1-yr');
      s = s.replace(/\b(\d+)\s*yr\b/gi, '$1-yr');
      s = s.replace(/\bwarranty\b/gi, '').replace(/\bonly\b/gi, '');
      // Remove brand/component suffixes like "— Inverter", "— Battery"
      s = s.replace(/\s*[—–-]+\s*(inverter|battery|panel|compressor|product)\b.*/i, '');
      // Expand abbreviations
      s = s.replace(/\bRplc\b/g, 'Replacement').replace(/\bMfr\b/g, 'Manufacturer').replace(/\bComp\b/g, 'Compressor');
      // Title-case type words
      TYPE_WORDS.forEach(t => {
        s = s.replace(new RegExp(`\\b${t}\\b`, 'gi'), t.charAt(0).toUpperCase() + t.slice(1));
      });
      return s.replace(/\s{2,}/g, ' ').replace(/(\d)-yr\b/g, '$1-yr').trim();
    }).filter(Boolean).join(' · ');
  };

  // Short display name for package components: strip brand prefix + marketing adjectives
  const compDisplayName = (name: string): string => {
    let s = name
      .replace(/^Crown\s+/i, '')
      .replace(/\bBi-?Facial\b/gi, '')
      .replace(/\bHybrid\b/gi, '')
      .replace(/\bMono\b/gi, '')
      .replace(/\bSolar\s+Plates?\b/gi, 'Solar Panels')
      .replace(/\s{2,}/g, ' ')
      .trim();
    // Remove trailing separator artifacts
    s = s.replace(/^[\s·\-]+|[\s·\-]+$/g, '').trim();
    return s;
  };

  // ── Collect warranty entries (deduped across entire invoice) ─────────────────
  const warrantyEntries: Array<{ name: string; model?: string; coverage: string }> = [];
  const _wtySet = new Set<string>();
  for (const _line of opts.lines) {
    if (_line.isPackage && _line.packageComponents?.length) {
      for (const _c of _line.packageComponents.filter((c: PackageComponent) => !c.hidden && c.warranty)) {
        if (!_wtySet.has(_c.name)) {
          _wtySet.add(_c.name);
          warrantyEntries.push({ name: compDisplayName(_c.name), coverage: formatWty(_c.warranty) });
        }
      }
    } else if (_line.warranty) {
      const _dn = _line.displayPrefix ? `${_line.displayPrefix}${_line.name}` : _line.name;
      const _wtyKey = `${_line.name}|${_line.model || ''}`;
      if (!_wtySet.has(_wtyKey)) {
        _wtySet.add(_wtyKey);
        warrantyEntries.push({ name: _dn, model: _line.model || undefined, coverage: formatWty(_line.warranty) });
      }
    }
  }

  // Add installation warranty if any installation lines exist
  if (opts.installationLines.length > 0 && !_wtySet.has('_install')) {
    _wtySet.add('_install');
    warrantyEntries.push({ name: 'Installation & Setup', coverage: formatWty('1 year workmanship') });
  }

  const itemsBody: any[] = [];
  for (const cat of categoryOrder) {
    itemsBody.push([{
      content: (categoryDisplayName[cat] || cat).toUpperCase(), colSpan: 4,
      styles: { fillColor: [26, 26, 26], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 6, cellPadding: { top: 1.0, bottom: 1.0, left: 2 } },
    }]);
    for (const line of grouped[cat]) {
      const displayName = line.displayPrefix ? `${line.displayPrefix}${line.name}` : line.name;

      if (line.isPackage && line.packageComponents && line.packageComponents.length > 0) {
        // ── Package: header row + group sub-headers + component rows + add-ons ─
        const visibleComps = line.packageComponents.filter((c: PackageComponent) => !c.hidden);
        const includedComps = visibleComps.filter((c: PackageComponent) => c.status === 'included');
        const addonComps = visibleComps.filter((c: PackageComponent) => c.status === 'addon');

        // Package header row
        const hdrParts: string[] = [displayName];
        if (line.model) hdrParts.push(`Model: ${line.model}`);
        if (line.packageNote) hdrParts.push(line.packageNote);
        if (line.kwhPerMonth > 0) hdrParts.push(`~${line.kwhPerMonth} kWh/mo`);
        itemsBody.push([
          { content: hdrParts.join('\n'), styles: { fontStyle: 'bold' as const, textColor: [20, 20, 20] as [number,number,number], fillColor: [255, 252, 245] as [number,number,number] } },
          { content: String(line.qty), styles: { fontStyle: 'bold' as const, fillColor: [255, 252, 245] as [number,number,number] } },
          { content: 'Package', styles: { fontStyle: 'italic' as const, textColor: [140, 80, 20] as [number,number,number], fillColor: [255, 252, 245] as [number,number,number] } },
          { content: PKR(line.qty * line.unitPrice), styles: { fontStyle: 'bold' as const, fillColor: [255, 252, 245] as [number,number,number] } },
        ]);

        // Group sub-sections
        const GRP_LABELS: Record<string, string> = {
          core: 'SYSTEM CORE', generation: 'SOLAR GENERATION',
          infrastructure: 'INFRASTRUCTURE', service: 'SERVICES',
        };
        for (const grp of ['core', 'generation', 'infrastructure', 'service']) {
          const grpComps = includedComps.filter((c: PackageComponent) => (c.group || 'core') === grp);
          if (grpComps.length === 0) continue;
          itemsBody.push([{
            content: GRP_LABELS[grp], colSpan: 4,
            styles: {
              fillColor: [45, 45, 55] as [number,number,number],
              textColor: [185, 185, 200] as [number,number,number],
              fontStyle: 'bold' as const, fontSize: 4.5,
              cellPadding: { top: 0.4, bottom: 0.4, left: 10, right: 2 },
            },
          }]);
          for (const comp of grpComps) {
            const shortName = compDisplayName(comp.name);
            const pwW = comp.keySpec?.match(/\b(\d{2,4})\s*W\b/i);
            const pwTag = pwW ? `  ${pwW[1]}W` : '';
            const lineText = comp.qty > 1 ? `· ${comp.qty}×  ${shortName}${pwTag}` : `· ${shortName}${pwTag}`;
            itemsBody.push([{
              content: lineText, colSpan: 4,
              styles: {
                textColor: [55, 65, 81] as [number,number,number],
                fontSize: 5,
                cellPadding: { top: 0.4, bottom: 0.4, left: 14, right: 4 },
              },
            }]);
          }
        }

        // Add-on sub-section
        if (addonComps.length > 0) {
          itemsBody.push([{
            content: 'ADD-ONS', colSpan: 4,
            styles: {
              fillColor: [253, 237, 225] as [number,number,number],
              textColor: [180, 60, 0] as [number,number,number],
              fontStyle: 'bold' as const, fontSize: 4.5,
              cellPadding: { top: 0.4, bottom: 0.4, left: 10, right: 2 },
            },
          }]);
          for (const comp of addonComps) {
            const aShort = compDisplayName(comp.name);
            const aText = comp.qty > 1 ? `· ${comp.qty}×  ${aShort}` : `· ${aShort}`;
            itemsBody.push([
              { content: aText, styles: { textColor: [160, 50, 0] as [number,number,number], fontSize: 5, cellPadding: { top: 0.4, bottom: 0.4, left: 14, right: 4 } } },
              { content: String(comp.qty), styles: { textColor: [110, 110, 110] as [number,number,number], halign: 'right' as const } },
              { content: PKR(comp.addonPrice), styles: { halign: 'right' as const } },
              { content: PKR(comp.qty * comp.addonPrice), styles: { fontStyle: 'bold' as const, halign: 'right' as const } },
            ]);
          }
        }
      } else {
        // ── Regular line ──────────────────────────────────────────────────────
        const nameParts = [displayName];
        if (line.model) nameParts.push(`Model: ${line.model}`);
        if (line.keySpec) {
          line.keySpec.split(',').map((s: string) => s.trim())
            .filter((s: string) => s.length > 2 && !/:\s*(No|N\/A|None|—|NA|-)\s*$/i.test(s))
            .slice(0, 3)
            .forEach((s: string) => nameParts.push(`· ${s}`));
        }
        if (line.kwhPerMonth > 0) nameParts.push(`· ${line.kwhPerMonth} kWh/mo`);
        if (line.packageNote) nameParts.push(`> ${line.packageNote}`);
        itemsBody.push([
          nameParts.join('\n'),
          String(line.qty),
          PKR(line.unitPrice),
          PKR(line.qty * line.unitPrice),
        ]);
      }
    }
  }

  if (opts.installationLines.length > 0) {
    itemsBody.push([{
      content: 'INSTALLATION', colSpan: 4,
      styles: { fillColor: [26, 26, 26], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 6.5, cellPadding: { top: 1.5, bottom: 1.5, left: 2 } },
    }]);
    for (const inst of opts.installationLines) {
      itemsBody.push([inst.name, '1', PKR(inst.amount), PKR(inst.amount)]);
    }
    itemsBody.push(['Post-Install Check', '1', 'Complimentary', 'PKR 0']);
  }

  // ── Custom charges section ───────────────────────────────────────────────
  if ((opts.customCharges ?? []).length > 0) {
    itemsBody.push([{
      content: 'ADDITIONAL CHARGES', colSpan: 4,
      styles: { fillColor: [45, 45, 55] as [number,number,number], textColor: [255, 255, 255] as [number,number,number], fontStyle: 'bold' as const, fontSize: 6.5, cellPadding: { top: 1.5, bottom: 1.5, left: 2 } },
    }]);
    for (const cc of opts.customCharges!) {
      itemsBody.push([cc.name, '1', PKR(cc.amount), PKR(cc.amount)]);
    }
  }

  autoTable(doc, {
    startY: leftY,
    margin: { left: margin, right: leftAutoMarginRight },
    head: [
      [{ content: 'ITEMS', colSpan: 4, styles: { fillColor: ORANGE, textColor: [255,255,255] as [number,number,number], fontSize: 7, fontStyle: 'bold' as const, cellPadding: { top: 2, bottom: 2, left: 3 } } }],
      ['PRODUCT / SPECS', 'QTY', 'UNIT', 'TOTAL'],
    ],
    body: itemsBody,
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 8, halign: 'right' },
      2: { cellWidth: 22, halign: 'right' },
      3: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
    },
    headStyles: { fillColor: ORANGE, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 6 },
    bodyStyles: { fontSize: 6, textColor: [40, 40, 40], lineColor: [229, 231, 235], lineWidth: 0.15 },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    styles: { overflow: 'linebreak', cellPadding: cellPad },
  });
  // @ts-ignore
  leftY = (doc as any).lastAutoTable.finalY + 5;

  // ── ROW 2 RIGHT: Warranty → 12-Month Option → Pricing (balanced) ─────────────
  // Warranty and 12-month are capped; Pricing always renders at bottom of column.
  const RIGHT_CAP = 200;

  // WARRANTY — first in right column, no top separator
  if (warrantyEntries.length > 0) {
    const wtyRowH = 2.9;
    const wtyModelH = 2.5;
    const totalWtyBodyH = warrantyEntries.reduce((s, we) => s + wtyRowH + (we.model ? wtyModelH : 0), 0) + 1;
    doc.setFillColor(26, 26, 26);
    doc.rect(rightX, rightY, rightW, 3.5, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(5.5); doc.setTextColor(255, 255, 255);
    doc.text('WARRANTY COVERAGE', rightX + 3, rightY + 2.5);
    rightY += 3.5;
    doc.setFillColor(248, 250, 252);
    doc.rect(rightX, rightY, rightW, totalWtyBodyH, 'F');
    doc.setDrawColor(220, 220, 220); doc.setLineWidth(0.15);
    doc.rect(rightX, rightY, rightW, totalWtyBodyH, 'S');
    doc.setLineWidth(0.2);
    let wy = rightY + wtyRowH;
    for (const we of warrantyEntries) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(5); doc.setTextColor(25, 25, 25);
      const wName = doc.splitTextToSize(`· ${we.name}`, rightW - 28)[0];
      doc.text(wName, rightX + 2, wy);
      if (we.coverage) {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(4.5); doc.setTextColor(80, 80, 80);
        const covTxt = doc.splitTextToSize(we.coverage, rightW - 28);
        doc.text(covTxt[0] || we.coverage, rightX + rightW - 2, wy, { align: 'right' });
      }
      wy += wtyRowH;
      if (we.model) {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(4.5); doc.setTextColor(100, 100, 100);
        doc.text(`Model: ${we.model}`, rightX + 5, wy);
        wy += wtyModelH;
      }
    }
    rightY += totalWtyBodyH + 4;
  }

  // 12-MONTH OPTION — compact 2-line format, capped at RIGHT_CAP
  const _p12 = calcPlan(grandTotal, '12m');
  if (opts.saleType === 'cash' && grandTotal > 0) {
    const instBoxH = 4 + 4 + 4; // header 4 + line1 4 + line2 4 = 12mm
    if (rightY + 4 + instBoxH <= RIGHT_CAP) {
      doc.setDrawColor(220, 220, 220); doc.setLineWidth(0.3);
      doc.line(rightX, rightY + 1, rightX + rightW, rightY + 1);
      doc.setLineWidth(0.2);
      rightY += 4;
      doc.setFillColor(255, 247, 237);
      doc.rect(rightX, rightY, rightW, instBoxH, 'F');
      doc.setFillColor(ORANGE);
      doc.rect(rightX, rightY, rightW, 4, 'F');
      doc.setDrawColor(ORANGE); doc.setLineWidth(0.4);
      doc.line(rightX, rightY, rightX, rightY + instBoxH);
      doc.setLineWidth(0.2);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(255, 255, 255);
      doc.text('12-MONTH OPTION', rightX + 3, rightY + 3);
      // Line 1: Total
      doc.setFont('helvetica', 'bold'); doc.setFontSize(5.5); doc.setTextColor(180, 80, 20);
      doc.text('Total', rightX + 3, rightY + 8);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(30, 30, 30);
      doc.text(PKR(_p12.total), rightX + rightW - 3, rightY + 8, { align: 'right' });
      // Line 2: Advance + Monthly combined
      const advPct = Math.round(_p12.advancePct * 100);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(5); doc.setTextColor(100, 60, 20);
      doc.text(`${advPct}% adv ${PKR(_p12.advance)}  ·  ${PKR(_p12.monthly)}/mo × ${_p12.monthlyPayments}`, rightX + 3, rightY + 11.5, { maxWidth: rightW - 5 });
      rightY += instBoxH + 2;
    }
  }

  // PRICING — separator above, always rendered below warranty + 12-month
  {
    doc.setDrawColor(220, 220, 220); doc.setLineWidth(0.3);
    doc.line(rightX, rightY + 1, rightX + rightW, rightY + 1);
    doc.setLineWidth(0.2);
    rightY += 4;
    const pricingRows: Array<[string, string]> = [
      ['Product subtotal', PKR(productSubtotal)],
      ...(installSubtotal > 0 ? [['Installation', PKR(installSubtotal)] as [string, string]] : []),
      ...(chargedSvcTotal > 0 ? [['Services', PKR(chargedSvcTotal)] as [string, string]] : []),
      ...(customChargesTotal > 0 ? [['Additional Charges', PKR(customChargesTotal)] as [string, string]] : []),
    ];
    if (discountAmt > 0) {
      const discLabel = opts.discountMode === 'fixed'
        ? `${opts.discountType} Discount (fixed)`
        : `${opts.discountType} Discount (${opts.discount}%)`;
      pricingRows.push([discLabel, `- ${PKR(discountAmt)}`]);
    }

    const pricingRowH = 4.8;
    const reasonH = (discountAmt > 0 && opts.discountReason) ? 7 : 0;
    const pricingH = pricingRows.length * pricingRowH + 27 + reasonH;
    doc.setFillColor(250, 250, 250);
    doc.rect(rightX, rightY, rightW, pricingH, 'F');
    doc.setDrawColor(229, 231, 235); doc.setLineWidth(0.2);
    doc.rect(rightX, rightY, rightW, pricingH, 'S');
    doc.setFillColor(DARK);
    doc.rect(rightX, rightY, rightW, 4, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(255, 255, 255);
    doc.text('PRICING', rightX + 3, rightY + 3);

    let pry = rightY + 4 + 4.5;
    for (const [lbl, val] of pricingRows) {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(80, 80, 80);
      doc.text(lbl, rightX + 3, pry);
      doc.text(val, rightX + rightW - 3, pry, { align: 'right' });
      pry += pricingRowH;
    }

    doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.3);
    doc.line(rightX + 3, pry - 1, rightX + rightW - 3, pry - 1);

    doc.setFillColor(ORANGE);
    doc.rect(rightX, pry - 1, rightW, 18, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(255, 255, 255);
    doc.text('GRAND TOTAL', rightX + 3, pry + 5.5);
    doc.text(PKR(grandTotal), rightX + rightW - 3, pry + 5.5, { align: 'right' });

    const _gtAdvAmt = opts.advanceAmtFixed && opts.advanceAmtFixed > 0
      ? opts.advanceAmtFixed
      : Math.round(grandTotal * opts.advancePct / 100);
    const _isFullyPaid = opts.advancePaid && _gtAdvAmt >= grandTotal;
    const _balStatusLabel = _isFullyPaid ? 'AMOUNT PAID' : 'BALANCE DUE';
    const _balStatusAmt = _isFullyPaid ? grandTotal : (grandTotal - (opts.advancePaid ? _gtAdvAmt : 0));
    doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(255, 220, 185);
    doc.text(_balStatusLabel, rightX + 3, pry + 13);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(255, 255, 255);
    doc.text(PKR(_balStatusAmt), rightX + rightW - 3, pry + 13, { align: 'right' });

    if (discountAmt > 0 && opts.discountReason) {
      const calloutY = pry + 19;
      doc.setFillColor(255, 247, 237);
      doc.rect(rightX, calloutY, rightW, 7, 'F');
      doc.setDrawColor(234, 88, 12); doc.setLineWidth(0.3);
      doc.line(rightX, calloutY, rightX, calloutY + 7);
      doc.setLineWidth(0.2);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(5); doc.setTextColor(180, 80, 20);
      doc.text('✶ ' + opts.discountReason, rightX + 3, calloutY + 4.5, { maxWidth: rightW - 6 });
    }

    rightY += pricingH + 5;
  }

  // ── ROW 3 LEFT: Services (active) + Optional suggestions ─────────────────────
  const pkgInstallCovered = opts.lines.some(l =>
    l.isPackage && (l.packageComponents as PackageComponent[] || [])
      .some((c: PackageComponent) => !c.hidden && c.status === 'included' && /install/i.test(c.name))
  );
  const filteredServices = pkgInstallCovered
    ? opts.services.filter(svc => !/install/i.test(svc.service_name))
    : opts.services;

  // Active: included or charged (displayed in table)
  const activeServices = filteredServices.filter(svc => {
    const override = opts.installationType === 'installation-included'
      && /install/i.test(svc.service_name) && svc.status === 'not_selected';
    return override || svc.status === 'included' || svc.status === 'charged';
  });
  // Suggestions: not selected but have a visible price
  const optionalServices = filteredServices.filter(svc => {
    const override = opts.installationType === 'installation-included'
      && /install/i.test(svc.service_name) && svc.status === 'not_selected';
    return !override && svc.status === 'not_selected' && (svc.visible_value > 0 || svc.display_value);
  });

  if (activeServices.length > 0) {
    const activeSvcBody: any[] = activeServices.map(svc => {
      const override = opts.installationType === 'installation-included'
        && /install/i.test(svc.service_name) && svc.status === 'not_selected';
      const effStatus = override ? 'included' : svc.status;
      const statusLabel = effStatus === 'included' ? 'INCL' : 'BILLED';
      const statusColor: [number, number, number] = effStatus === 'included' ? [22, 163, 74] : [234, 88, 12];
      const amtLabel = effStatus === 'included' ? 'PKR 0' : PKR(svc.charged_amount);
      const mktLabel = svc.visible_value > 0 ? PKR(svc.visible_value) : '—';
      return [
        { content: svc.service_name, styles: { fontStyle: 'bold' as const } },
        { content: mktLabel, styles: { textColor: [120, 120, 120] as [number,number,number], halign: 'right' as const } },
        { content: statusLabel, styles: { textColor: statusColor, fontStyle: 'bold' as const, halign: 'center' as const } },
        { content: amtLabel, styles: { fontStyle: 'bold' as const,
          textColor: effStatus === 'included' ? [22, 163, 74] as [number,number,number] : [40,40,40] as [number,number,number],
          halign: 'right' as const } },
      ];
    });
    autoTable(doc, {
      startY: leftY,
      margin: { left: margin, right: leftAutoMarginRight },
      head: [
        [{ content: 'SERVICES', colSpan: 4, styles: { fillColor: DARK, textColor: [255,255,255] as [number,number,number], fontSize: 7, fontStyle: 'bold' as const, cellPadding: { top: 2, bottom: 2, left: 3 } } }],
        ['SERVICE', 'MARKET RATE', 'STATUS', 'AMOUNT'],
      ],
      body: activeSvcBody,
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 24, halign: 'right' as const },
        2: { cellWidth: 14, halign: 'center' as const },
        3: { cellWidth: 22, halign: 'right' as const },
      },
      headStyles: { fillColor: DARK, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 6 },
      bodyStyles: { fontSize: 6, textColor: [40, 40, 40], lineColor: [229, 231, 235], lineWidth: 0.15 },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      styles: { overflow: 'linebreak', cellPadding: cellPad },
    });
    // @ts-ignore
    leftY = (doc as any).lastAutoTable.finalY + 5;
  }

  if (optionalServices.length > 0) {
    const suggBoxH = optionalServices.length * 4.0 + 7;
    doc.setFillColor(250, 250, 250);
    doc.rect(margin, leftY, leftW, suggBoxH, 'F');
    doc.setDrawColor(229, 231, 235); doc.setLineWidth(0.2);
    doc.rect(margin, leftY, leftW, suggBoxH, 'S');
    doc.setFillColor(DARK);
    doc.rect(margin, leftY, leftW, 4, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(255, 255, 255);
    doc.text('AVAILABLE ADD-ONS', margin + 3, leftY + 3);
    let sy = leftY + 4 + 3.0;
    for (const svc of optionalServices) {
      const priceStr = svc.display_value ?? (svc.visible_value > 0 ? PKR(svc.visible_value) : 'Contact us');
      doc.setFont('helvetica', 'normal'); doc.setFontSize(6); doc.setTextColor(80, 80, 80);
      doc.text(`· ${svc.service_name}`, margin + 3, sy);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(6); doc.setTextColor(234, 88, 12);
      doc.text(priceStr, margin + leftW - 3, sy, { align: 'right' });
      sy += 4.0;
    }
    leftY += suggBoxH + 2;
  }

  // ── SYNC COLUMNS → FULL-WIDTH ZONE ───────────────────────────────────────────
  let y = Math.max(leftY, rightY) + 6;
  // Horizontal rule to cleanly separate two-column zone from full-width sections
  doc.setDrawColor(229, 231, 235); doc.setLineWidth(0.4);
  doc.line(margin, y - 3, W - margin, y - 3);
  doc.setLineWidth(0.2);

  // ── FULL-WIDTH ENERGY CONSUMPTION + SOLAR/UPS ADVISORY ───────────────────────
  // Always rendered. Category-based kWh estimates fill in when product specs lack
  // explicit energy data, so every invoice shows consumption figures.
  {
    const catKwh = (kwhPerMonth: number, category: string, name: string): { kwh: number; isEst: boolean } => {
      if (kwhPerMonth > 0) return { kwh: kwhPerMonth, isEst: false };
      const cat = category.toLowerCase();
      const nm  = name.toLowerCase();
      if (/air.?cond|split\s+ac|window\s+ac/i.test(cat) || /\bac\b/.test(nm))           return { kwh: 240, isEst: true };  // 8h/day @ ~1 kW avg
      if (/refrigerator|fridge/i.test(cat) || /fridge|refrig/i.test(nm))                return { kwh: 100, isEst: true };  // 24h/day operation
      if (/deep.?freez|chest.?freez|vertical.?freez/i.test(cat) || /freezer/i.test(nm)) return { kwh: 150, isEst: true };  // 24h/day operation
      if (/washing|washer/i.test(cat))                                                   return { kwh: 30,  isEst: true };
      if (/microwave/i.test(cat))                                                        return { kwh: 12,  isEst: true };
      if (/water.?heater|geyser/i.test(cat))                                             return { kwh: 45,  isEst: true };
      if (/television|led.*tv/i.test(cat) || /\btv\b/.test(nm))                         return { kwh: 10,  isEst: true };
      return { kwh: 0, isEst: false };
    };

    const energyLines2 = opts.lines
      .map(l => {
        const fullName = l.displayPrefix ? `${l.displayPrefix}${l.name}` : l.name;
        const { kwh, isEst } = catKwh(l.kwhPerMonth || 0, l.category || '', fullName);
        return { line: l, fullName, kwh, isEst };
      })
      .filter(l => l.kwh > 0 && !/solar.*inv|inverter.*sys/i.test(l.line.category || ''));
    const totalEffKwh = energyLines2.reduce((s, l) => s + l.kwh * l.line.qty, 0);

    const advisoryLines2 = opts.lines.map(l => {
      const fullName = l.displayPrefix ? `${l.displayPrefix}${l.name}` : l.name;
      const energyEntry = energyLines2.find(e => e.line === l);
      return {
        name: fullName,
        category: l.category || '',
        kwhPerMonth: energyEntry ? energyEntry.kwh : (l.kwhPerMonth || 0),
        qty: l.qty,
        keySpec: l.keySpec,
      };
    });
    const advisory2 = buildDetailedAdvisory(opts.customerType, advisoryLines2);

    const pwrRowH2  = 3.0;
    const dispRows2 = Math.min(energyLines2.length, 6);

    const eColW2 = Math.round(printW * 0.48);
    const aColX2 = margin + eColW2 + 3;
    const aColW2 = printW - eColW2 - 3;

    const hasInverterAcKwh2 = energyLines2.some(l => /air.?cond|split.*ac/i.test(l.line.category || '') && /inverter/i.test(l.fullName));
    const hasAnyInverter2 = energyLines2.some(l => /inverter/i.test(l.fullName));
    const energyH2 = 7 + dispRows2 * pwrRowH2 + (hasInverterAcKwh2 ? 18 : 14) + (hasAnyInverter2 ? 3 : 0);
    // Estimate advisory height without paragraph limit so strip can stretch to fill whitespace
    const advParas2Preview = advisory2 ? advisory2.paragraphs : [''];
    const advEstH2 = 9 + advParas2Preview.reduce(
      (sum, p) => sum + Math.ceil(p.length / 48) * 3.2 + 2, 0
    );
    const naturalStripH = Math.max(32, Math.max(energyH2, advEstH2));
    // Stretch strip to fill whitespace before the fixed payment/trust/T&C block
    const PAY_START_Y = 196;
    const stretchTarget = PAY_START_Y - y - 12;
    const stripH2 = Math.max(naturalStripH, Math.min(stretchTarget, naturalStripH + 55));

    // Left: Energy consumption
    doc.setFillColor(255, 253, 234);
    doc.rect(margin, y, eColW2, stripH2, 'F');
    doc.setDrawColor(202, 138, 4); doc.setLineWidth(0.4);
    doc.line(margin, y, margin, y + stripH2);
    doc.setLineWidth(0.2);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(ORANGE);
    doc.text('ENERGY CONSUMPTION', margin + 3, y + 5);

    if (energyLines2.length === 0) {
      doc.setFont('helvetica', 'italic'); doc.setFontSize(5.5); doc.setTextColor(120, 80, 0);
      doc.text('Energy data not available — contact us for a consumption estimate.', margin + 3, y + 10, { maxWidth: eColW2 - 6 });
    } else {
      let ey = y + 9;
      for (const pl of energyLines2.slice(0, 6)) {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(5.5); doc.setTextColor(80, 60, 0);
        const pNameFit = doc.splitTextToSize(pl.fullName, eColW2 - 22);
        doc.text(`· ${pNameFit[0]}`, margin + 3, ey);
        const kwhLabel = pl.isEst ? `~${pl.kwh * pl.line.qty} kWh/mo` : `${pl.kwh * pl.line.qty} kWh/mo`;
        doc.setFont('helvetica', 'bold'); doc.setFontSize(5.5); doc.setTextColor(101, 61, 0);
        doc.text(kwhLabel, margin + eColW2 - 2, ey, { align: 'right' });
        ey += pwrRowH2;
      }
      if (energyLines2.length > 6) {
        doc.setFont('helvetica', 'italic'); doc.setFontSize(5); doc.setTextColor(130, 100, 30);
        doc.text(`+ ${energyLines2.length - 6} more items`, margin + 3, ey);
        ey += pwrRowH2;
      }
      doc.setDrawColor(180, 140, 0); doc.setLineWidth(0.15);
      doc.line(margin + 3, ey, margin + eColW2 - 3, ey);
      ey += 3.5;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(6); doc.setTextColor(101, 61, 0);
      doc.text('TOTAL', margin + 3, ey);
      doc.text(`${totalEffKwh} kWh/mo`, margin + eColW2 - 2, ey, { align: 'right' });
      const hasEst2 = energyLines2.some(l => l.isEst);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(5.5); doc.setTextColor(120, 80, 0);
      doc.text(`${hasEst2 ? 'Est. ' : ''}electricity bill ~${PKR(totalEffKwh * UNIT_RATE_PKR)}/month`, margin + 3, ey + 3.5);
      const inverterAcKwh2 = energyLines2
        .filter(l => /air.?cond|split.*ac/i.test(l.line.category || '') && /inverter/i.test(l.fullName))
        .reduce((s, l) => s + l.kwh * l.line.qty, 0);
      if (inverterAcKwh2 > 0) {
        const co2SavedKg = Math.round(inverterAcKwh2 * 0.35 * 0.45);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(4.8); doc.setTextColor(34, 120, 60);
        doc.text(`♻ ~${co2SavedKg} kg CO₂ saved/mo vs fixed-speed AC`, margin + 3, ey + 7.0);
        doc.setFont('helvetica', 'italic'); doc.setFontSize(4.8); doc.setTextColor(160, 110, 40);
        doc.text('Basis: AC ~8h/day  |  Fridge/Freezer ~24h/day', margin + 3, ey + 10.0);
      } else {
        doc.setFont('helvetica', 'italic'); doc.setFontSize(4.8); doc.setTextColor(160, 110, 40);
        doc.text('Basis: AC ~8h/day  |  Fridge/Freezer ~24h/day', margin + 3, ey + 7.0);
      }
      // Inverter savings vs non-inverter equivalents
      if (hasAnyInverter2) {
        const invSavingsKwh = energyLines2
          .filter(l => /inverter/i.test(l.fullName))
          .reduce((s, l) => {
            const isAc = /air.?cond|split.*ac/i.test(l.line.category || '');
            const factor = isAc ? 0.35 : 0.30;
            return s + Math.round(l.kwh * l.line.qty * factor / (1 - factor));
          }, 0);
        const invBaseY = inverterAcKwh2 > 0 ? ey + 13.5 : ey + 10.5;
        doc.setFont('helvetica', 'bold'); doc.setFontSize(4.8); doc.setTextColor(22, 100, 50);
        doc.text(`⚡ Inverter saving: ~${invSavingsKwh} kWh/mo vs non-inverter equivalents`, margin + 3, invBaseY);
      }
    }

    // Right: Solar / UPS advisory
    const advFill2: [number,number,number]   = !advisory2 ? [248,248,248] : advisory2.color === 'blue' ? [239,246,255] : advisory2.color === 'green' ? [240,253,244] : [248,248,248];
    const advBorder2: [number,number,number] = !advisory2 ? [160,160,160] : advisory2.color === 'blue' ? [59,130,246]  : advisory2.color === 'green' ? [34,197,94]   : [160,160,160];
    doc.setFillColor(...advFill2);
    doc.rect(aColX2, y, aColW2, stripH2, 'F');
    doc.setDrawColor(...advBorder2); doc.setLineWidth(0.5);
    doc.line(aColX2, y, aColX2, y + stripH2);
    doc.setLineWidth(0.2);
    const advTitle2 = advisory2
      ? (advisory2.color === 'green' ? 'SOLAR RECOMMENDATION' : advisory2.color === 'blue' ? 'UPS / BACKUP ADVISORY' : 'ENERGY ADVISORY')
      : 'ENERGY ADVISORY';
    doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(ORANGE);
    doc.text(advTitle2, aColX2 + 3, y + 5);
    const advParas2 = advisory2
      ? advisory2.paragraphs
      : ['Ask us for an energy-saving assessment and solar proposal tailored to your property type.'];
    let ay = y + 9;
    for (const para of advParas2) {
      const wrapped = doc.splitTextToSize(para, aColW2 - 5);
      const available = Math.max(1, Math.floor((y + stripH2 - ay - 2) / 3.2));
      const toShow = wrapped.slice(0, available);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(5.5); doc.setTextColor(40, 40, 40);
      doc.text(toShow, aColX2 + 3, ay, { lineHeightFactor: 1.4 });
      ay += toShow.length * 3.2 + 2;
      if (ay >= y + stripH2 - 2) break;
    }

    y += stripH2 + 2;
    // Separator below energy strip
    doc.setDrawColor(229, 231, 235); doc.setLineWidth(0.4);
    doc.line(margin, y, W - margin, y);
    doc.setLineWidth(0.2);
    y += 5;
  }

  // ── INSTALLMENT SCHEDULE — compact 2-column layout ───────────────────────────
  if (opts.saleType === 'installment' && (opts.instTotalPrice ?? 0) > 0 && (opts.instMonths ?? 0) > 0 && opts.instFirstDate) {
    const instMonths = opts.instMonths ?? 0;
    const fmtDI = (d: Date) => d.toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: 'numeric' });

    // Full-width dark header
    doc.setFillColor(26, 26, 26);
    doc.rect(margin, y, printW, 5.5, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(255, 255, 255);
    doc.text('INSTALLMENT SCHEDULE', W / 2, y + 3.8, { align: 'center' });
    y += 5.5;

    const schedColW = (printW - 3) / 2;
    const cPad = { top: 0.5, bottom: 0.5, left: 1.5, right: 1.5 };
    const hStyles = { fillColor: [50, 50, 50] as [number,number,number], textColor: [255,255,255] as [number,number,number], fontStyle: 'bold' as const, fontSize: 5.5, cellPadding: { top: 1, bottom: 1, left: 1.5, right: 1.5 } };
    const bStyles = { fontSize: 5.5, textColor: [40,40,40] as [number,number,number], lineColor: [229,231,235] as [number,number,number], lineWidth: 0.15 as number, cellPadding: cPad };
    const altStyles = { fillColor: [250,250,250] as [number,number,number] };
    const colStyles = { 0: { cellWidth: 7 }, 2: { cellWidth: 26, halign: 'right' as const }, 3: { cellWidth: 24 } };

    const advRow: any[] = [
      { content: '0', styles: { fillColor: [234,88,12] as [number,number,number], textColor: [255,255,255] as [number,number,number], fontStyle: 'bold' as const } },
      { content: 'Advance', styles: { fillColor: [234,88,12] as [number,number,number], textColor: [255,255,255] as [number,number,number], fontStyle: 'bold' as const } },
      { content: PKR(opts.instAdvanceAmt ?? 0), styles: { fillColor: [234,88,12] as [number,number,number], textColor: [255,255,255] as [number,number,number], fontStyle: 'bold' as const, halign: 'right' as const } },
      { content: 'On confirm', styles: { fillColor: [234,88,12] as [number,number,number], textColor: [255,255,255] as [number,number,number], fontStyle: 'bold' as const } },
    ];
    const instRows2: any[][] = [];
    for (let i = 1; i <= instMonths; i++) {
      const d = new Date(opts.instFirstDate); d.setMonth(d.getMonth() + (i - 1));
      instRows2.push([String(i), `Month ${i}`, PKR(opts.instMonthlyAmt ?? 0), fmtDI(d)]);
    }
    const totalRow2: any[] = [
      { content: '', styles: { fillColor: [248,248,248] as [number,number,number] } },
      { content: 'CONTRACT TOTAL', styles: { fillColor: [248,248,248] as [number,number,number], fontStyle: 'bold' as const, textColor: [40,40,40] as [number,number,number] } },
      { content: PKR(opts.instTotalPrice ?? 0), styles: { fillColor: [248,248,248] as [number,number,number], fontStyle: 'bold' as const, halign: 'right' as const, textColor: [40,40,40] as [number,number,number] } },
      { content: '', styles: { fillColor: [248,248,248] as [number,number,number] } },
    ];

    const half = Math.ceil(instMonths / 2);
    const leftSched = [advRow, ...instRows2.slice(0, half)];
    const rightSched = [...instRows2.slice(half), totalRow2];

    autoTable(doc, {
      startY: y, margin: { left: margin, right: margin + schedColW + 3 },
      head: [['#', 'DESCRIPTION', 'AMOUNT', 'DATE']],
      body: leftSched,
      headStyles: hStyles, bodyStyles: bStyles, alternateRowStyles: altStyles,
      columnStyles: colStyles, styles: { overflow: 'linebreak' },
    });
    const leftSchedFinalY = (doc as any).lastAutoTable.finalY;

    autoTable(doc, {
      startY: y, margin: { left: margin + schedColW + 3, right: margin },
      head: [['#', 'DESCRIPTION', 'AMOUNT', 'DATE']],
      body: rightSched,
      headStyles: hStyles, bodyStyles: bStyles, alternateRowStyles: altStyles,
      columnStyles: colStyles, styles: { overflow: 'linebreak' },
    });
    // @ts-ignore
    y = Math.max(leftSchedFinalY, (doc as any).lastAutoTable.finalY) + 2;

    doc.setFont('helvetica', 'italic'); doc.setFontSize(5.5); doc.setTextColor(120, 80, 0);
    doc.text('Late payment: 1% per day past due. Post-dated cheques required.', margin, y);
    y += 4;
  }

  // ── PAYMENT + BANK + QR (merged full-width block) ─────────────────────────────
  doc.setDrawColor(229, 231, 235); doc.setLineWidth(0.4);
  doc.line(margin, y - 1, W - margin, y - 1);
  doc.setLineWidth(0.2);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(ORANGE);
  doc.text('PAYMENT & BANK TRANSFER', margin, y);
  y += 3.5;

  const advanceAmt = opts.advanceAmtFixed && opts.advanceAmtFixed > 0
    ? opts.advanceAmtFixed
    : Math.round(grandTotal * opts.advancePct / 100);
  const balanceAmt = grandTotal - advanceAmt;
  const advancePctDisplay = grandTotal > 0 ? Math.round(advanceAmt / grandTotal * 100) : opts.advancePct;
  const showInstTeaser = opts.saleType === 'cash' && grandTotal > 0 && !!opts.instTeaserMonthly && !!opts.instTeaserMonths;
  const hasCashSchedule = (opts.cashPaySchedule?.length ?? 0) > 0;

  const payBankH = hasCashSchedule ? Math.max(40, 10 + (opts.cashPaySchedule!.length + 1) * 5.0 + 6) : 40;
  const payColW = Math.round(printW * 0.34);  // 64mm — cash payment
  const qrColW = 44;                          // fixed 44mm for QR
  const bankColW = printW - payColW - qrColW - 6; // remaining for bank
  const bankColX = margin + payColW + 3;
  const qrColX = bankColX + bankColW + 3;

  doc.setFillColor(243, 244, 246);
  doc.rect(margin, y, payColW, payBankH, 'F');
  doc.setFillColor(240, 253, 244);
  doc.rect(bankColX, y, bankColW, payBankH, 'F');
  doc.setFillColor(232, 248, 237);
  doc.rect(qrColX, y, qrColW, payBankH, 'F');

  // Payment col
  doc.setFont('helvetica', 'bold'); doc.setFontSize(6); doc.setTextColor(80, 80, 80);
  doc.text(opts.saleType === 'installment' ? 'INSTALLMENT PLAN' : hasCashSchedule ? 'PAYMENT SCHEDULE' : 'CASH PAYMENT', margin + 3, y + 6);
  let ppy = y + 12;
  if (hasCashSchedule) {
    // Render deferred payment schedule rows
    for (const slot of opts.cashPaySchedule!) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(5.5); doc.setTextColor(120, 120, 120);
      doc.text(slot.note || slot.date, margin + 3, ppy);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(30, 30, 30);
      doc.text(PKR(slot.amount), margin + payColW - 3, ppy, { align: 'right' });
      doc.setFont('helvetica', 'normal'); doc.setFontSize(5); doc.setTextColor(150, 150, 150);
      if (slot.note) doc.text(slot.date, margin + 3, ppy + 3);
      ppy += slot.note ? 5.5 : 5;
    }
    // Total line
    doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.2);
    doc.line(margin + 3, ppy - 0.5, margin + payColW - 3, ppy - 0.5);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(6); doc.setTextColor(234, 88, 12);
    doc.text('Total', margin + 3, ppy + 3.5);
    doc.text(PKR(grandTotal), margin + payColW - 3, ppy + 3.5, { align: 'right' });
    ppy += 8;
  } else {
    const payRows: Array<[string, string]> = [
      ['Advance', `${advancePctDisplay}%  ${PKR(advanceAmt)}`],
      ['Balance', `${100 - advancePctDisplay}%  ${PKR(balanceAmt)}`],
      ['Due on', opts.advancePct === 0 ? 'Delivery' : opts.balanceNote || 'Delivery'],
      ...(opts.docType !== 'invoice' ? [['Valid', opts.validityHours >= 168 ? '7 days' : `${opts.validityHours}h`] as [string, string]] : []),
      // Installment teaser intentionally omitted — details shown in 12-MONTH OPTION block above
    ];
    for (const [lbl, val] of payRows) {
      const isOpt = lbl === 'Installment';
      doc.setFont('helvetica', 'bold'); doc.setFontSize(5.5);
      doc.setTextColor(...(isOpt ? [234, 88, 12] as [number, number, number] : [120, 120, 120] as [number, number, number]));
      doc.text(lbl, margin + 3, ppy);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
      doc.setTextColor(...(isOpt ? [180, 60, 0] as [number, number, number] : [30, 30, 30] as [number, number, number]));
      doc.text(val, margin + payColW - 3, ppy, { align: 'right' });
      ppy += 5.0;
    }
    // Signature / acknowledgement line
    const sigLineY = Math.min(ppy + 1, y + payBankH - 9);
    doc.setDrawColor(160, 160, 160); doc.setLineWidth(0.3);
    doc.line(margin + 3, sigLineY + 5, margin + payColW - 3, sigLineY + 5);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(4.5); doc.setTextColor(140, 140, 140);
    doc.text('Customer Acknowledgement', margin + 3, sigLineY + 7.5);
  }

  // Bank col
  doc.setFont('helvetica', 'bold'); doc.setFontSize(6); doc.setTextColor(22, 101, 52);
  doc.text('BANK TRANSFER — RAAST / IBAN', bankColX + 3, y + 6);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(20, 20, 20);
  doc.text("TAJALLI'S HOME COLLECTION", bankColX + 3, y + 12);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(40, 40, 40);
  doc.text('PK33 MEZN 0001 0601 0187 4794', bankColX + 3, y + 18);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(80, 80, 80);
  doc.text('Meezan Bank — F.B Area Branch', bankColX + 3, y + 24);
  if (!opts.advancePaid) {
    doc.setFont('helvetica', 'italic'); doc.setFontSize(6); doc.setTextColor(22, 101, 52);
    doc.text('Send payment proof via WhatsApp to confirm.', bankColX + 3, y + 30, { maxWidth: bankColW - 6 });
  }

  // QR col — Raast payment QR only, centered
  const QR_S = 20;
  const qr1X = qrColX + (qrColW - QR_S) / 2;
  const qrY = y + 8; // start below 6mm banner (banner: y+1..y+7)
  if (qrData) {
    doc.setFillColor(22, 101, 52);
    doc.rect(qrColX + 2, y + 1, qrColW - 4, 6, 'F'); // 6mm banner, no overlap with QR box
    doc.setFont('helvetica', 'bold'); doc.setFontSize(5); doc.setTextColor(255, 255, 255);
    doc.text('SCAN TO PAY', qrColX + qrColW / 2, y + 5, { align: 'center' });

    doc.setFillColor(255, 255, 255);
    doc.rect(qr1X - 1, qrY - 1, QR_S + 2, QR_S + 2, 'F');
    doc.setDrawColor(22, 101, 52); doc.setLineWidth(0.4);
    doc.rect(qr1X - 1, qrY - 1, QR_S + 2, QR_S + 2, 'S');
    doc.setLineWidth(0.2);
    doc.addImage(qrData, 'JPEG', qr1X, qrY, QR_S, QR_S);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(5); doc.setTextColor(22, 101, 52);
    doc.text("Tajalli's — Meezan Bank", qrColX + qrColW / 2, qrY + QR_S + 4.5, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(4.5); doc.setTextColor(80, 80, 80);
    doc.text('Raast / IBAN', qrColX + qrColW / 2, qrY + QR_S + 8, { align: 'center' });
  }
  y += payBankH + 2;
  doc.setDrawColor(229, 231, 235); doc.setLineWidth(0.4);
  doc.line(margin, y, W - margin, y);
  doc.setLineWidth(0.2);
  y += 3;

  // ── TRUST + COMMUNITY STRIP (compact 16mm) ───────────────────────────────────
  const trustH = 16;
  const trustStatW = Math.round(printW * 0.67);
  const commAreaX = margin + trustStatW;
  const commAreaW = printW - trustStatW;

  doc.setFillColor(26, 26, 26);
  doc.rect(margin, y, trustStatW, trustH, 'F');
  doc.setFillColor(18, 90, 210);
  doc.rect(commAreaX, y, commAreaW, trustH, 'F');

  const trustStats = [
    ['11+ yrs', 'IN BUSINESS'],
    ['24,000+', 'ORDERS FULFILLED'],
    ['14,000+', 'LOCATIONS SERVED'],
    ['1,600+', 'COMMUNITY'],
  ];
  const segW = trustStatW / trustStats.length;
  trustStats.forEach(([num, lbl], i) => {
    const sx = margin + i * segW + segW / 2;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(234, 88, 12);
    doc.text(num, sx, y + 5.5, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(4); doc.setTextColor(170, 170, 170);
    doc.text(lbl, sx, y + 10, { align: 'center' });
  });

  // Two QR codes side by side: FB (Priority Support) | WhatsApp (Emergency Support)
  {
    const QR_SIZE = 6;
    const halfW = commAreaW / 2;
    // Left half — Facebook community
    const fbCx = commAreaX + halfW / 2;
    const fbQrX = commAreaX + (halfW - QR_SIZE) / 2;
    const fbQrY = y + 3.5;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(3.2); doc.setTextColor(255, 255, 255);
    doc.text('PRIORITY SUPPORT', fbCx, y + 2.2, { align: 'center' });
    if (fbQrData) {
      doc.setFillColor(255, 255, 255);
      doc.rect(fbQrX - 0.8, fbQrY - 0.8, QR_SIZE + 1.6, QR_SIZE + 1.6, 'F');
      doc.addImage(fbQrData, 'PNG', fbQrX, fbQrY, QR_SIZE, QR_SIZE);
      doc.link(fbQrX - 1, fbQrY - 1, QR_SIZE + 2, QR_SIZE + 2, { url: 'https://www.facebook.com/share/g/18be5ayTCF/' });
    }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(3.5); doc.setTextColor(255, 255, 255);
    doc.text('Appliance Reliance', fbCx, fbQrY + QR_SIZE + 2, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(3); doc.setTextColor(180, 210, 255);
    doc.text('Facebook Group', fbCx, fbQrY + QR_SIZE + 4, { align: 'center' });

    // Divider
    doc.setDrawColor(255, 255, 255); doc.setLineWidth(0.2);
    doc.line(commAreaX + halfW, y + 2, commAreaX + halfW, y + trustH - 2);
    doc.setLineWidth(0.2);

    // Right half — WhatsApp emergency
    const waCx = commAreaX + halfW + halfW / 2;
    const waQrX = commAreaX + halfW + (halfW - QR_SIZE) / 2;
    const waQrY = y + 3.5;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(3.2); doc.setTextColor(255, 255, 255);
    doc.text('EMERGENCY SUPPORT', waCx, y + 2.2, { align: 'center' });
    if (waQrData) {
      doc.setFillColor(255, 255, 255);
      doc.rect(waQrX - 0.8, waQrY - 0.8, QR_SIZE + 1.6, QR_SIZE + 1.6, 'F');
      doc.addImage(waQrData, 'PNG', waQrX, waQrY, QR_SIZE, QR_SIZE);
      doc.link(waQrX - 1, waQrY - 1, QR_SIZE + 2, QR_SIZE + 2, { url: 'https://wa.me/923702578788' });
    }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(3.5); doc.setTextColor(255, 255, 255);
    doc.text('+92 370 2578788', waCx, waQrY + QR_SIZE + 2, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(3); doc.setTextColor(180, 210, 255);
    doc.text('Emergency Support', waCx, waQrY + QR_SIZE + 4, { align: 'center' });
  }

  y += trustH + 2;
  doc.setDrawColor(229, 231, 235); doc.setLineWidth(0.4);
  doc.line(margin, y, W - margin, y);
  doc.setLineWidth(0.2);
  y += 3;

  // ── TERMS & CONDITIONS ─────────────────────────────────────────────────────────
  const tcItems = [
    'Prices valid until stated validity date.',
    'Stock subject to confirmation before payment.',
    'Warranty by official brand / manufacturer.',
    "Tajalli's facilitates; manufacturer decides.",
    'Installation included only if listed in services.',
    'Physical damage: report within 24 hours.',
    'Unboxed goods non-refundable unless warranty.',
    'Payment terms apply as agreed before dispatch.',
    'Installments require CNIC verification.',
    'Supply Only: liability at point of handover.',
    'Payment proof to +92 370 2578788 (WhatsApp).',
    'Post-install issues: report within 48 hours.',
  ];
  const tcCols = 3;
  const tcPerCol = Math.ceil(tcItems.length / tcCols);
  const colTcW = (printW - (tcCols - 1) * 3) / tcCols;
  const tcRowH = 2.8;
  const tcBgH = tcPerCol * tcRowH + 5;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(ORANGE);
  doc.text('TERMS & CONDITIONS', margin, y);
  const tcBodyY = y + 3.5;
  doc.setFillColor(249, 249, 249);
  doc.rect(margin, tcBodyY, printW, tcBgH, 'F');
  for (let i = 0; i < tcItems.length; i++) {
    const col = Math.floor(i / tcPerCol);
    const row = i % tcPerCol;
    const tx = margin + 3 + col * (colTcW + 3);
    const tcy = tcBodyY + 3.5 + row * tcRowH;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(5); doc.setTextColor(120, 120, 120);
    doc.text(`${i + 1}.`, tx, tcy);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(5); doc.setTextColor(80, 80, 80);
    doc.text(tcItems[i], tx + 4, tcy, { maxWidth: colTcW - 5 });
  }

  // ── FOOTER ────────────────────────────────────────────────────────────────────
  const footerY = 286;
  doc.setDrawColor(229, 231, 235); doc.setLineWidth(0.3);
  doc.line(margin, footerY, W - margin, footerY);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(6); doc.setTextColor(120, 120, 120);
  doc.text(`${opts.refNumber}  ·  ${badgeLabel}  ·  PAGE 1 OF 1${opts.showNtn ? '  ·  NTN: 42101-3836602-3' : ''}`, margin, footerY + 4.5);
  doc.text('tajallis.com.pk  ·  support@tajallis.com.pk', W - margin, footerY + 4.5, { align: 'right' });

  return doc.output('blob');
}


// ── Installment Invoice PDF Generators ────────────────────────────────────────

async function generateInstallmentAdvancePdf(opts: {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
  customerCnic: string;
  lines: QuoteLine[];
  services?: Array<{
    service_name: string;
    description: string;
    status: 'included' | 'charged' | 'not_selected';
    visible_value: number;
    display_value?: string;
    charged_amount: number;
  }>;
  customCharges?: Array<{ name: string; amount: number }>;
  guarantorName?: string;
  guarantorPhone?: string;
  guarantorCnic?: string;
  discount: number;
  discountMode?: 'percentage' | 'fixed';
  refNumber: string;
  instTotalPrice: number;
  instAdvanceAmt: number;
  instMonths: number;
  instMonthlyAmt: number;
  instFirstDate: string;
  showNtn?: boolean;
  isApartmentClient?: boolean;
}): Promise<Blob> {
  const ORANGE = '#EA580C';
  const DARK   = '#1A1A1A';
  const W = 210; const margin = 18;
  const printW = W - margin * 2;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const PKR = (n: number) => `PKR ${(Math.ceil(n / 100) * 100).toLocaleString('en-PK')}`;
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
  // Advance invoice label — right-aligned, large and prominent
  doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(255, 255, 255);
  doc.text('ADVANCE INVOICE', W - margin, 16, { align: 'right' });

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
  doc.text('Supply + Installment', margin + colW * 3 + 2, y + 6.5);
  y += 14;

  // ── 3. Customer block ──────────────────────────────────────────────────────
  const extraLinesAdv = [opts.customerEmail, opts.customerAddress, opts.customerCnic ? `CNIC: ${opts.customerCnic}` : ''].filter(Boolean);
  const custHAdv = 20 + extraLinesAdv.length * 5;
  doc.setFillColor(255, 247, 237);
  doc.rect(margin, y, printW, custHAdv, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(234, 88, 12);
  doc.text('BILL TO', margin + 4, y + 6);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(20, 20, 20);
  doc.text(opts.customerName || '—', margin + 4, y + 13);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(100, 100, 100);
  let custYAdv = y + 18;
  if (opts.customerPhone) { doc.text(opts.customerPhone, margin + 4, custYAdv); custYAdv += 5; }
  for (const line of extraLinesAdv) { doc.text(line, margin + 4, custYAdv); custYAdv += 5; }
  y += custHAdv + 4;

  // ── 4. Products table ──────────────────────────────────────────────────────
  doc.setDrawColor(229, 231, 235); doc.setLineWidth(0.4);
  doc.line(margin, y - 1, W - margin, y - 1);
  doc.setLineWidth(0.2);
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
  doc.setDrawColor(229, 231, 235); doc.setLineWidth(0.4);
  doc.line(margin, y - 1, W - margin, y - 1);
  doc.setLineWidth(0.2);
  y += 2;
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

  // ── 6b. Services ──────────────────────────────────────────────────────────
  const chargedAdvServices = (opts.services ?? []).filter(s => s.status === 'charged');
  const includedAdvServices = (opts.services ?? []).filter(s => s.status === 'included');
  if (chargedAdvServices.length > 0 || includedAdvServices.length > 0) {
    const svcBodyAdv = [...chargedAdvServices, ...includedAdvServices].map(svc => {
      const statusLabel = svc.status === 'charged' ? 'BILLED' : 'INCL';
      const statusColor: [number, number, number] = svc.status === 'charged' ? [234, 88, 12] : [22, 163, 74];
      const valueStr = svc.display_value
        ? svc.display_value
        : svc.status === 'charged' ? PKR(svc.charged_amount) : 'PKR 0';
      return [
        { content: svc.service_name, styles: { fontStyle: 'bold' as const } },
        { content: statusLabel, styles: { textColor: statusColor, fontStyle: 'bold' as const, halign: 'center' as const } },
        { content: valueStr, styles: { halign: 'right' as const } },
      ];
    });
    autoTable(doc, {
      startY: y, margin: { left: margin, right: margin },
      head: [['SERVICE', 'STATUS', 'AMOUNT']],
      body: svcBodyAdv,
      columnStyles: { 0: { cellWidth: 'auto' }, 1: { cellWidth: 18, halign: 'center' as const }, 2: { cellWidth: 35, halign: 'right' as const } },
      headStyles: { fillColor: [45, 45, 55] as [number,number,number], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
      bodyStyles: { fontSize: 7, textColor: [40, 40, 40], lineColor: [229, 231, 235], lineWidth: 0.15 },
      styles: { overflow: 'linebreak', cellPadding: 1.5 },
    });
    // @ts-ignore
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // ── 6c. Custom charges ─────────────────────────────────────────────────────
  if ((opts.customCharges ?? []).length > 0) {
    const ccBodyAdv = opts.customCharges!.map(c => [
      { content: c.name, styles: { fontStyle: 'bold' as const } },
      { content: PKR(c.amount), styles: { halign: 'right' as const, fontStyle: 'bold' as const } },
    ]);
    autoTable(doc, {
      startY: y, margin: { left: margin, right: margin },
      head: [['ADDITIONAL CHARGE', 'AMOUNT']],
      body: ccBodyAdv,
      columnStyles: { 0: { cellWidth: 'auto' }, 1: { cellWidth: 35, halign: 'right' as const } },
      headStyles: { fillColor: [45, 45, 55] as [number,number,number], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
      bodyStyles: { fontSize: 7, textColor: [40, 40, 40], lineColor: [229, 231, 235], lineWidth: 0.15 },
      styles: { overflow: 'linebreak', cellPadding: 1.5 },
    });
    // @ts-ignore
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // ── 6d. Guarantor block ────────────────────────────────────────────────────
  if (opts.guarantorName?.trim() || opts.guarantorCnic?.trim()) {
    const gtH = 22;
    doc.setFillColor(255, 247, 237);
    doc.rect(margin, y, printW, gtH, 'F');
    doc.setDrawColor(234, 88, 12); doc.setLineWidth(0.8);
    doc.line(margin, y, margin, y + gtH);
    doc.setLineWidth(0.2);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(234, 88, 12);
    doc.text('GUARANTOR', margin + 4, y + 6);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(20, 20, 20);
    doc.text(opts.guarantorName || '—', margin + 4, y + 13);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(80, 80, 80);
    const gtParts = [
      ...(opts.guarantorPhone ? [opts.guarantorPhone] : []),
      ...(opts.guarantorCnic ? [`CNIC: ${opts.guarantorCnic}`] : []),
    ];
    doc.text(gtParts.join('   '), margin + 4, y + 19);
    y += gtH + 6;
  }

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
  if (qrData) {
    doc.addImage(qrData, 'JPEG', margin + printW - 21, y + 4, 18, 18);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(4.5); doc.setTextColor(22, 101, 52);
    doc.text("Tajalli's — Meezan Bank", margin + printW - 12, y + 24, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(4); doc.setTextColor(80, 80, 80);
    doc.text('Raast / IBAN', margin + printW - 12, y + 27, { align: 'center' });
  }
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
  doc.text(opts.showNtn ? 'tajallis.com.pk  |  support@tajallis.com.pk  |  NTN: 42101-3836602-3' : 'tajallis.com.pk  |  support@tajallis.com.pk', W / 2, footerY + 6, { align: 'center' });

  return doc.output('blob');
}

async function generateInstallmentPaymentPdf(opts: {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
  customerCnic: string;
  lines: QuoteLine[];
  discount: number;
  refNumber: string;
  instTotalPrice: number;
  instAdvanceAmt: number;
  instMonths: number;
  instMonthlyAmt: number;
  instFirstDate: string;
  paymentNumber: number;
  customCharges?: Array<{ name: string; amount: number }>;
  showNtn?: boolean;
}): Promise<Blob> {
  const ORANGE = '#EA580C';
  const DARK   = '#1A1A1A';
  const W = 210; const margin = 18;
  const printW = W - margin * 2;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const PKR = (n: number) => `PKR ${(Math.ceil(n / 100) * 100).toLocaleString('en-PK')}`;
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
  let fbQrData: string | null = null;
  try { fbQrData = await generateQrDataUrl('https://www.facebook.com/share/g/18be5ayTCF/'); } catch { /* skip */ }

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
  // Installment invoice label — right-aligned, large and prominent
  doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(255, 255, 255);
  doc.text('INSTALLMENT INVOICE', W - margin, 16, { align: 'right' });

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
  const extraLinesPay = [opts.customerEmail, opts.customerAddress, opts.customerCnic ? `CNIC: ${opts.customerCnic}` : ''].filter(Boolean);
  const custHPay = 20 + extraLinesPay.length * 5;
  doc.setFillColor(255, 247, 237);
  doc.rect(margin, y, printW, custHPay, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(234, 88, 12);
  doc.text('BILL TO', margin + 4, y + 6);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(20, 20, 20);
  doc.text(opts.customerName || '—', margin + 4, y + 13);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(100, 100, 100);
  let custYPay = y + 18;
  if (opts.customerPhone) { doc.text(opts.customerPhone, margin + 4, custYPay); custYPay += 5; }
  for (const line of extraLinesPay) { doc.text(line, margin + 4, custYPay); custYPay += 5; }
  y += custHPay + 4;

  // ── 4. Payment highlight box ───────────────────────────────────────────────
  doc.setDrawColor(229, 231, 235); doc.setLineWidth(0.4);
  doc.line(margin, y - 1, W - margin, y - 1);
  doc.setLineWidth(0.2);
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
  doc.setDrawColor(229, 231, 235); doc.setLineWidth(0.4);
  doc.line(margin, y - 1, W - margin, y - 1);
  doc.setLineWidth(0.2);
  y += 2;
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

  // ── 6b. Custom charges ─────────────────────────────────────────────────────
  if ((opts.customCharges ?? []).length > 0) {
    const ccBody = opts.customCharges!.map(c => [
      { content: c.name, styles: { fontStyle: 'bold' as const } },
      { content: PKR(c.amount), styles: { halign: 'right' as const, fontStyle: 'bold' as const } },
    ]);
    autoTable(doc, {
      startY: y, margin: { left: margin, right: margin },
      head: [['ADDITIONAL CHARGE', 'AMOUNT']],
      body: ccBody,
      columnStyles: { 0: { cellWidth: 'auto' }, 1: { cellWidth: 35, halign: 'right' as const } },
      headStyles: { fillColor: [45, 45, 55] as [number,number,number], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
      bodyStyles: { fontSize: 7, textColor: [40, 40, 40], lineColor: [229, 231, 235], lineWidth: 0.15 },
      styles: { overflow: 'linebreak', cellPadding: 1.5 },
    });
    // @ts-ignore
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // ── 6c. Community strip ────────────────────────────────────────────────────
  const commH = 18;
  const trustStatW = Math.round(printW * 0.74);
  const commAreaX = margin + trustStatW;
  const commAreaW = printW - trustStatW;
  doc.setFillColor(26, 26, 26);
  doc.rect(margin, y, trustStatW, commH, 'F');
  doc.setFillColor(18, 90, 210);
  doc.rect(commAreaX, y, commAreaW, commH, 'F');
  const payTrustStats = [['11+ yrs', 'IN BUSINESS'], ['24,000+', 'ORDERS FULFILLED'], ['14,000+', 'HOUSEHOLDS SERVED'], ['1,600+', 'COMMUNITY']];
  const paySegW = trustStatW / payTrustStats.length;
  payTrustStats.forEach(([num, lbl], i) => {
    const sx = margin + i * paySegW + paySegW / 2;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(234, 88, 12);
    doc.text(num, sx, y + 6, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(4); doc.setTextColor(170, 170, 170);
    doc.text(lbl, sx, y + 11, { align: 'center' });
  });
  if (fbQrData) {
    const FB_QR = 10;
    const cx = commAreaX + commAreaW / 2;
    const fbQrX = commAreaX + (commAreaW - FB_QR) / 2;
    const fbQrY = y + 4;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(4); doc.setTextColor(255, 255, 255);
    doc.text('JOIN OUR FB GROUP', cx, y + 2.5, { align: 'center' });
    doc.setFillColor(255, 255, 255);
    doc.rect(fbQrX - 1, fbQrY - 1, FB_QR + 2, FB_QR + 2, 'F');
    doc.addImage(fbQrData, 'PNG', fbQrX, fbQrY, FB_QR, FB_QR);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(4); doc.setTextColor(255, 255, 255);
    doc.text('Appliance Reliance', cx, fbQrY + FB_QR + 2.5, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(3.5); doc.setTextColor(180, 210, 255);
    doc.text('Facebook Group', cx, fbQrY + FB_QR + 4.5, { align: 'center' });
  }
  y += commH + 6;

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
  if (qrData) {
    doc.addImage(qrData, 'JPEG', margin + printW - 21, y + 4, 18, 18);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(4.5); doc.setTextColor(22, 101, 52);
    doc.text("Tajalli's — Meezan Bank", margin + printW - 12, y + 24, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(4); doc.setTextColor(80, 80, 80);
    doc.text('Raast / IBAN', margin + printW - 12, y + 27, { align: 'center' });
  }
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
  doc.text(opts.showNtn ? 'tajallis.com.pk  |  support@tajallis.com.pk  |  NTN: 42101-3836602-3' : 'tajallis.com.pk  |  support@tajallis.com.pk', W / 2, footerY + 6, { align: 'center' });

  return doc.output('blob');
}

// ── Service Receipt PDF ───────────────────────────────────────────────────────

async function generateServiceReceiptPdf(opts: {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
  refNumber: string;
  deviceBrand?: string;
  deviceModel?: string;
  faultDesc?: string;
  jobLines: Array<{type: 'work'|'part'; description: string; qty: number; unitPrice: number}>;
  warrantyDays?: number;
  customCharges: Array<{ name: string; amount: number }>;
  discount: number;
  discountMode: 'percentage' | 'fixed';
  discountType: string;
  discountReason: string;
  notes: string;
  preparedBy: string;
  showNtn?: boolean;
}): Promise<Blob> {
  const ORANGE = '#EA580C';
  const DARK   = '#1A1A1A';
  const W = 210; const margin = 10;
  const printW = W - margin * 2;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const PKR = (n: number) => `PKR ${(Math.ceil(n / 100) * 100).toLocaleString('en-PK')}`;
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' });

  let logoData: string | null = null;
  try { logoData = await loadLogoWhite(); } catch { /* fallback */ }
  let qrData: string | null = null;
  try { qrData = await loadQrBase64(); } catch { /* skip */ }

  // ── Header ───────────────────────────────────────────────────────────────
  const HEADER_H = 38;
  doc.setFillColor(ORANGE);
  doc.rect(0, 0, W, HEADER_H, 'F');
  doc.setFillColor(180, 55, 5);
  doc.rect(W - 62, 0, 62, HEADER_H, 'F');
  if (logoData) {
    doc.addImage(logoData, 'PNG', margin, 4, 0, 28);
  } else {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(255, 255, 255);
    doc.text("Tajalli's", margin, 20);
  }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(255, 255, 255);
  doc.text('HOME & COMMERCIAL', margin + 38, 14);
  doc.text('SOLUTIONS', margin + 38, 23);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(6); doc.setTextColor(255, 222, 188);
  doc.text('Ghar Se Tijarat Tak — Har Zaroorat Ka Hal', margin + 38, 30);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(5.5); doc.setTextColor(255, 185, 145);
  doc.text('SERVICE RECEIPT', W - margin, 9, { align: 'right' });
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(255, 255, 255);
  doc.text(opts.refNumber, W - margin, 21, { align: 'right' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(6); doc.setTextColor(255, 210, 175);
  doc.text(dateStr, W - margin, 30, { align: 'right' });
  doc.setDrawColor(255, 255, 255); doc.setLineWidth(0.5);
  doc.line(W - 64, 3, W - 64, HEADER_H - 3);
  doc.setLineWidth(0.2);
  const contactParts = ['L-152 & 153, Sector 11C-1, North Karachi', '+92 370 2578788', 'support@tajallis.com.pk'];
  if (opts.showNtn) contactParts.push('NTN: 42101-3836602-3');
  doc.setFont('helvetica', 'normal'); doc.setFontSize(5.5); doc.setTextColor(255, 210, 175);
  doc.text(contactParts.join('  ·  '), margin, HEADER_H - 2);

  let y = HEADER_H + 4;

  // ── Customer + meta (two-column) ─────────────────────────────────────────
  const colGap = 4; const leftW = 112; const rightW = printW - leftW - colGap;
  const rightX = margin + leftW + colGap;

  // Left: customer
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(ORANGE);
  doc.text('CLIENT', margin, y);
  y += 3.5;
  const custFields: Array<[string, string]> = [
    ['NAME', opts.customerName || '—'],
    ['PHONE', opts.customerPhone || '—'],
    ...(opts.customerEmail ? [['EMAIL', opts.customerEmail] as [string, string]] : []),
    ['ADDRESS', opts.customerAddress || '—'],
  ];
  const custRowH = 4.5;
  const custBlockH = custFields.length * custRowH + 5;
  doc.setFillColor(255, 247, 237);
  doc.rect(margin, y, leftW, custBlockH, 'F');
  doc.setDrawColor(234, 88, 12); doc.setLineWidth(0.5);
  doc.line(margin, y, margin, y + custBlockH);
  doc.setLineWidth(0.2);
  let cy = y + custRowH;
  for (const [lbl, val] of custFields) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(5.5); doc.setTextColor(180, 100, 50);
    doc.text(lbl, margin + 3, cy);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(30, 30, 30);
    doc.text(val, margin + 22, cy);
    cy += custRowH;
  }

  // Right: receipt meta
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(ORANGE);
  doc.text('RECEIPT DETAILS', rightX, y - 3.5);
  const metaRows: Array<[string, string]> = [
    ['REF',         opts.refNumber],
    ['DATE',        dateStr],
    ['PREPARED BY', opts.preparedBy || '—'],
    ['TYPE',        'Service Receipt'],
  ];
  const metaBlockH = metaRows.length * 4.5 + 5;
  doc.setFillColor(243, 244, 246);
  doc.rect(rightX, y, rightW, metaBlockH, 'F');
  let my = y + 4.5;
  for (const [lbl, val] of metaRows) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(5.5); doc.setTextColor(120, 120, 120);
    doc.text(lbl, rightX + 3, my);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(30, 30, 30);
    doc.text(val, rightX + 22, my);
    my += 4.5;
  }
  y += Math.max(custBlockH, metaBlockH) + 4;

  // ── Device / Equipment block ──────────────────────────────────────────────
  const hasDevice = !!(opts.deviceBrand || opts.deviceModel || opts.faultDesc);
  if (hasDevice) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(ORANGE);
    doc.text('DEVICE / EQUIPMENT', margin, y);
    y += 3.5;
    const devFields: Array<[string, string]> = [];
    if (opts.deviceBrand || opts.deviceModel) devFields.push(['APPLIANCE', [opts.deviceBrand, opts.deviceModel].filter(Boolean).join(' ')]);
    if (opts.faultDesc) devFields.push(['FAULT REPORTED', opts.faultDesc]);
    const devRowH = 4.5;
    const devBlockH = devFields.length * devRowH + 5;
    doc.setFillColor(254, 242, 232);
    doc.rect(margin, y, printW, devBlockH, 'F');
    doc.setDrawColor(234, 88, 12); doc.setLineWidth(0.5);
    doc.line(margin, y, margin, y + devBlockH);
    doc.setLineWidth(0.2);
    let dy = y + devRowH;
    for (const [lbl, val] of devFields) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(5.5); doc.setTextColor(180, 100, 50);
      doc.text(lbl, margin + 3, dy);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(30, 30, 30);
      doc.text(val, margin + 36, dy);
      dy += devRowH;
    }
    y += devBlockH + 4;
  }

  // ── Work Performed table ──────────────────────────────────────────────────
  doc.setDrawColor(229, 231, 235); doc.setLineWidth(0.4);
  doc.line(margin, y - 1, W - margin, y - 1);
  doc.setLineWidth(0.2);
  const workLines = opts.jobLines.filter(l => l.type === 'work');
  const partLines = opts.jobLines.filter(l => l.type === 'part');

  if (workLines.length > 0) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(ORANGE);
    doc.text('WORK PERFORMED', margin, y);
    y += 3.5;
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['DESCRIPTION', 'QTY', 'RATE', 'AMOUNT']],
      body: workLines.map(l => [
        { content: l.description, styles: { fontStyle: 'bold' as const } },
        { content: String(l.qty), styles: { halign: 'center' as const } },
        { content: PKR(l.unitPrice), styles: { halign: 'right' as const } },
        { content: PKR(l.qty * l.unitPrice), styles: { fontStyle: 'bold' as const, halign: 'right' as const } },
      ]),
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 12, halign: 'center' as const },
        2: { cellWidth: 28, halign: 'right' as const },
        3: { cellWidth: 28, halign: 'right' as const },
      },
      headStyles: { fillColor: DARK, textColor: [255,255,255], fontStyle: 'bold', fontSize: 7 },
      bodyStyles: { fontSize: 7, textColor: [40,40,40], lineColor: [229,231,235], lineWidth: 0.15 },
      alternateRowStyles: { fillColor: [250,250,250] },
      styles: { overflow: 'linebreak', cellPadding: 1.2 },
    });
    y = (doc as any).lastAutoTable.finalY + 4;
  }

  // ── Parts / Spare Parts table ─────────────────────────────────────────────
  if (partLines.length > 0) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(ORANGE);
    doc.text('PARTS / SPARE PARTS', margin, y);
    y += 3.5;
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['PART DESCRIPTION', 'QTY', 'UNIT PRICE', 'AMOUNT']],
      body: partLines.map(l => [
        { content: l.description, styles: { fontStyle: 'bold' as const } },
        { content: String(l.qty), styles: { halign: 'center' as const } },
        { content: PKR(l.unitPrice), styles: { halign: 'right' as const } },
        { content: PKR(l.qty * l.unitPrice), styles: { fontStyle: 'bold' as const, halign: 'right' as const } },
      ]),
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 12, halign: 'center' as const },
        2: { cellWidth: 28, halign: 'right' as const },
        3: { cellWidth: 28, halign: 'right' as const },
      },
      headStyles: { fillColor: [60,60,60], textColor: [255,255,255], fontStyle: 'bold', fontSize: 7 },
      bodyStyles: { fontSize: 7, textColor: [40,40,40], lineColor: [229,231,235], lineWidth: 0.15 },
      alternateRowStyles: { fillColor: [250,250,250] },
      styles: { overflow: 'linebreak', cellPadding: 1.2 },
    });
    y = (doc as any).lastAutoTable.finalY + 4;
  }

  // ── Custom charges table ──────────────────────────────────────────────────
  if (opts.customCharges.length > 0) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(ORANGE);
    doc.text('ADDITIONAL CHARGES', margin, y);
    y += 3.5;
    const ccBody = opts.customCharges.map(c => [
      { content: c.name, styles: { fontStyle: 'bold' as const } },
      { content: PKR(c.amount), styles: { fontStyle: 'bold' as const, halign: 'right' as const } },
    ]);
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['CHARGE DESCRIPTION', 'AMOUNT']],
      body: ccBody,
      columnStyles: { 0: { cellWidth: 'auto' }, 1: { cellWidth: 30, halign: 'right' as const } },
      headStyles: { fillColor: DARK, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
      bodyStyles: { fontSize: 7, textColor: [40, 40, 40], lineColor: [229, 231, 235], lineWidth: 0.15 },
      styles: { overflow: 'linebreak', cellPadding: 1.2 },
    });
    // @ts-ignore
    y = (doc as any).lastAutoTable.finalY + 4;
  }

  // ── Totals block ──────────────────────────────────────────────────────────
  doc.setDrawColor(229, 231, 235); doc.setLineWidth(0.4);
  doc.line(margin, y, W - margin, y);
  doc.setLineWidth(0.2);
  y += 3;
  const workTotal = opts.jobLines.filter(l => l.type === 'work').reduce((s, l) => s + l.qty * l.unitPrice, 0);
  const partsTotal = opts.jobLines.filter(l => l.type === 'part').reduce((s, l) => s + l.qty * l.unitPrice, 0);
  const customTotal = opts.customCharges.reduce((s, c) => s + c.amount, 0);
  const baseTotal = workTotal + partsTotal + customTotal;
  let discountAmt = 0;
  if (opts.discountMode === 'fixed') {
    discountAmt = Math.min(opts.discount, baseTotal);
  } else if (opts.discount > 0) {
    discountAmt = Math.round(baseTotal * opts.discount / 100);
  }
  const grandTotal = baseTotal - discountAmt;

  const totalsRightX = W - margin - 70;
  const pricingRows: Array<[string, string]> = [];
  if (workTotal > 0)   pricingRows.push(['Labour & Service', PKR(workTotal)]);
  if (partsTotal > 0)  pricingRows.push(['Parts & Materials', PKR(partsTotal)]);
  if (customTotal > 0) pricingRows.push(['Additional Charges', PKR(customTotal)]);
  if (discountAmt > 0) {
    const lbl = opts.discountMode === 'fixed'
      ? `${opts.discountType} Discount (fixed)`
      : `${opts.discountType} Discount (${opts.discount}%)`;
    pricingRows.push([lbl, `- ${PKR(discountAmt)}`]);
    if (opts.discountReason) pricingRows.push(['Reason', opts.discountReason]);
  }

  const pricingRowH = 5;
  const pricingH = pricingRows.length * pricingRowH + 18;
  doc.setFillColor(250, 250, 250);
  doc.rect(totalsRightX, y, W - margin - totalsRightX, pricingH, 'F');
  doc.setDrawColor(229, 231, 235); doc.setLineWidth(0.2);
  doc.rect(totalsRightX, y, W - margin - totalsRightX, pricingH, 'S');
  let pry = y + 5;
  for (const [lbl, val] of pricingRows) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(80, 80, 80);
    doc.text(lbl, totalsRightX + 3, pry);
    doc.text(val, W - margin - 3, pry, { align: 'right' });
    pry += pricingRowH;
  }
  doc.setFillColor(ORANGE);
  doc.rect(totalsRightX, pry - 1, W - margin - totalsRightX, 11, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(255, 255, 255);
  doc.text('TOTAL DUE', totalsRightX + 3, pry + 7);
  doc.text(PKR(grandTotal), W - margin - 3, pry + 7, { align: 'right' });
  y += pricingH + 4;

  // ── Notes ─────────────────────────────────────────────────────────────────
  if (opts.notes?.trim()) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(ORANGE);
    doc.text('NOTES', margin, y);
    y += 3;
    doc.setFillColor(255, 247, 237);
    doc.rect(margin, y, printW, 14, 'F');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(60, 60, 60);
    const noteLines = doc.splitTextToSize(opts.notes, printW - 6);
    doc.text(noteLines, margin + 3, y + 5);
    y += 18;
  }

  // ── Warranty on work ─────────────────────────────────────────────────────
  if ((opts.warrantyDays ?? 0) > 0) {
    doc.setFillColor(240, 253, 244);
    doc.rect(margin, y, printW, 10, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(22, 101, 52);
    doc.text(`WARRANTY ON WORK: ${opts.warrantyDays} DAYS from date of service`, margin + 3, y + 6.5);
    y += 14;
  }

  // ── Bank transfer ─────────────────────────────────────────────────────────
  doc.setDrawColor(229, 231, 235); doc.setLineWidth(0.4);
  doc.line(margin, y, W - margin, y);
  doc.setLineWidth(0.2);
  y += 3;
  const bdH = 28;
  doc.setFillColor(240, 253, 244);
  doc.rect(margin, y, printW, bdH, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(6); doc.setTextColor(22, 101, 52);
  doc.text('BANK TRANSFER — RAAST / IBAN', margin + 3, y + 6);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(20, 20, 20);
  doc.text("TAJALLI'S HOME COLLECTION", margin + 3, y + 13);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(60, 60, 60);
  doc.text('IBAN: PK33MEZN0001060101874794', margin + 3, y + 19);
  doc.text('Meezan Bank — F.B Area Branch, KHI', margin + 3, y + 25);
  if (qrData) {
    doc.addImage(qrData, 'JPEG', margin + printW - 21, y + 4, 18, 18);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(4.5); doc.setTextColor(22, 101, 52);
    doc.text("Tajalli's — Meezan Bank", margin + printW - 12, y + 24, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(4); doc.setTextColor(80, 80, 80);
    doc.text('Raast / IBAN', margin + printW - 12, y + 27, { align: 'center' });
  }
  y += bdH + 4;

  // ── Footer ────────────────────────────────────────────────────────────────
  const footerY = 285;
  doc.setDrawColor(229, 231, 235); doc.setLineWidth(0.3);
  doc.line(margin, footerY, W - margin, footerY);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(120, 120, 120);
  doc.text(`${opts.refNumber}  ·  SERVICE RECEIPT  ·  PAGE 1 OF 1`, margin, footerY + 5);
  doc.text('tajallis.com.pk  ·  support@tajallis.com.pk  ·  +92 370 2578788', W - margin, footerY + 5, { align: 'right' });

  return doc.output('blob');
}

// ── Customer CRM ──────────────────────────────────────────────────────────────

interface CustomerProfile {
  key: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  cnic: string | null;
  area: string | null;
  totalSpent: number;
  invoiceCount: number;
  transactionCount: number;
  firstAt: string;
  lastAt: string;
  hasActiveInstallment: boolean;
  hasServiceHistory: boolean;
  invoices: InvoiceRow[];
}

interface CustomerNote {
  id: string;
  customer_phone: string;
  note: string;
  created_by: string | null;
  created_at: string;
}

function getAutoTags(p: CustomerProfile): string[] {
  const tags: string[] = [];
  const daysSinceLast = (Date.now() - new Date(p.lastAt).getTime()) / 86400000;
  if (p.totalSpent >= 200000) tags.push('VIP');
  else if (p.totalSpent >= 100000) tags.push('High Value');
  if (p.transactionCount >= 3) tags.push('Loyal');
  else if (p.transactionCount >= 2) tags.push('Returning');
  else if (p.transactionCount === 1) tags.push('New');
  if (daysSinceLast > 90) tags.push('Lapsed');
  if (p.hasActiveInstallment) tags.push('Installment');
  if (p.hasServiceHistory) tags.push('Service');
  return tags;
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30)  return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}yr ago`;
}

const TAG_COLORS: Record<string, string> = {
  'VIP':          'bg-yellow-100 text-yellow-800 border border-yellow-300',
  'High Value':   'bg-amber-100 text-amber-800 border border-amber-300',
  'Loyal':        'bg-green-100 text-green-800 border border-green-300',
  'Returning':    'bg-blue-100 text-blue-800 border border-blue-300',
  'New':          'bg-teal-100 text-teal-800 border border-teal-300',
  'Lapsed':       'bg-red-100 text-red-700 border border-red-300',
  'Installment':  'bg-purple-100 text-purple-800 border border-purple-300',
  'Service':      'bg-orange-100 text-orange-800 border border-orange-300',
};

const CRM_DOC_TYPE_BADGE: Record<string, { label: string; color: string }> = {
  quotation:                    { label: 'Quotation',     color: 'bg-gray-100 text-gray-600' },
  invoice:                      { label: 'Invoice',       color: 'bg-blue-100 text-blue-700' },
  'installment-invoice':        { label: 'Installment',   color: 'bg-purple-100 text-purple-700' },
  service_receipt:              { label: 'Service',       color: 'bg-orange-100 text-orange-700' },
  installment_payment_receipt:  { label: 'Inst. Receipt', color: 'bg-indigo-100 text-indigo-700' },
};

function CustomerCrmTab() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [segment, setSegment] = useState<'all'|'vip'|'returning'|'new'|'installment'|'service'|'lapsed'>('all');
  const [selected, setSelected] = useState<CustomerProfile | null>(null);
  const [notes, setNotes] = useState<CustomerNote[]>([]);
  const [noteText, setNoteText] = useState('');
  const [noteBy, setNoteBy] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);

  async function fetchInvoices() {
    setLoading(true);
    const { data } = await supabase
      .from('invoices')
      .select('id,ref_number,doc_type,customer_name,customer_phone,customer_email,customer_address,customer_cnic,customer_area,sale_type,service_level,discount_reason,subtotal,discount_pct,discount_type,grand_total,advance_pct,payment_status,created_at,inst_total_price,inst_advance_amt,inst_months,inst_monthly_amt,inst_first_date,custom_charges_json,guarantor_name,guarantor_phone,guarantor_cnic,notes')
      .order('created_at', { ascending: false });
    if (data) setInvoices(data as InvoiceRow[]);
    setLoading(false);
  }

  useEffect(() => { fetchInvoices(); }, []);

  const profiles = useMemo((): CustomerProfile[] => {
    const map = new Map<string, InvoiceRow[]>();
    for (const inv of invoices) {
      const rawPhone = (inv.customer_phone ?? '').replace(/\D/g, '');
      const key = rawPhone || (inv.customer_name?.trim() ?? 'unknown');
      if (!key) continue;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(inv);
    }
    const result: CustomerProfile[] = [];
    for (const [key, rows] of map) {
      rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const getName = () => rows.find(r => r.customer_name?.trim())?.customer_name ?? 'Unknown';
      const getLatest = <T,>(field: keyof InvoiceRow): T | null =>
        (rows.find(r => r[field] != null)?.[field] as T) ?? null;
      const transactions = rows.filter(r => r.doc_type !== 'quotation');
      result.push({
        key,
        name: getName()!,
        phone: getLatest<string>('customer_phone'),
        email: getLatest<string>('customer_email'),
        address: getLatest<string>('customer_address'),
        cnic: getLatest<string>('customer_cnic'),
        area: getLatest<string>('customer_area'),
        totalSpent: transactions.reduce((s, r) => s + (r.grand_total || 0), 0),
        invoiceCount: rows.length,
        transactionCount: transactions.length,
        firstAt: rows[rows.length - 1].created_at,
        lastAt: rows[0].created_at,
        hasActiveInstallment: rows.some(r => r.doc_type === 'installment-invoice' && r.payment_status === 'pending'),
        hasServiceHistory: rows.some(r => r.doc_type === 'service_receipt'),
        invoices: rows,
      });
    }
    result.sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());
    return result;
  }, [invoices]);

  const filtered = useMemo(() => {
    let list = profiles;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.phone ?? '').includes(q) ||
        (p.email ?? '').toLowerCase().includes(q) ||
        (p.address ?? '').toLowerCase().includes(q)
      );
    }
    if (segment !== 'all') {
      list = list.filter(p => {
        const tags = getAutoTags(p);
        const daysSince = (Date.now() - new Date(p.lastAt).getTime()) / 86400000;
        if (segment === 'vip')         return tags.includes('VIP') || tags.includes('High Value');
        if (segment === 'returning')   return p.transactionCount >= 2;
        if (segment === 'new')         return p.transactionCount === 1;
        if (segment === 'installment') return p.hasActiveInstallment;
        if (segment === 'service')     return p.hasServiceHistory;
        if (segment === 'lapsed')      return daysSince > 90;
        return true;
      });
    }
    return list;
  }, [profiles, search, segment]);

  const stats = useMemo(() => ({
    total: profiles.length,
    vip: profiles.filter(p => p.totalSpent >= 100000).length,
    returning: profiles.filter(p => p.transactionCount >= 2).length,
    lapsed: profiles.filter(p => (Date.now() - new Date(p.lastAt).getTime()) / 86400000 > 90).length,
    totalRevenue: profiles.reduce((s, p) => s + p.totalSpent, 0),
  }), [profiles]);

  async function fetchNotes(phone: string) {
    const { data } = await supabase
      .from('customer_notes')
      .select('*')
      .eq('customer_phone', phone)
      .order('created_at', { ascending: false });
    if (data) setNotes(data as CustomerNote[]);
  }

  async function addNote() {
    if (!noteText.trim() || !selected?.phone) return;
    setAddingNote(true);
    await supabase.from('customer_notes').insert({
      customer_phone: selected.phone,
      note: noteText.trim(),
      created_by: noteBy.trim() || null,
    });
    setNoteText('');
    await fetchNotes(selected.phone);
    setAddingNote(false);
  }

  async function deleteNote(id: string) {
    await supabase.from('customer_notes').delete().eq('id', id);
    if (selected?.phone) fetchNotes(selected.phone);
  }

  function selectCustomer(p: CustomerProfile) {
    setSelected(p);
    setNotes([]);
    setNoteText('');
    setExpandedInvoiceId(null);
    if (p.phone) fetchNotes(p.phone);
  }

  const PKR_CRM = (n: number) => `PKR ${Math.round(n).toLocaleString('en-PK')}`;

  const SEGMENTS: { id: typeof segment; label: string; count: number }[] = [
    { id: 'all',         label: 'All',         count: profiles.length },
    { id: 'vip',         label: 'VIP',         count: profiles.filter(p => p.totalSpent >= 100000).length },
    { id: 'returning',   label: 'Returning',   count: profiles.filter(p => p.transactionCount >= 2).length },
    { id: 'new',         label: 'New',         count: profiles.filter(p => p.transactionCount === 1).length },
    { id: 'installment', label: 'Installment', count: profiles.filter(p => p.hasActiveInstallment).length },
    { id: 'service',     label: 'Service',     count: profiles.filter(p => p.hasServiceHistory).length },
    { id: 'lapsed',      label: 'Lapsed',      count: profiles.filter(p => (Date.now() - new Date(p.lastAt).getTime()) / 86400000 > 90).length },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>Loading customers…</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Customers', value: stats.total, color: 'text-gray-800' },
          { label: 'Total Revenue',   value: PKR_CRM(stats.totalRevenue), color: 'text-green-700' },
          { label: 'VIP / High Value',value: stats.vip,   color: 'text-yellow-700' },
          { label: 'Lapsed (90d+)',   value: stats.lapsed, color: 'text-red-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Two-pane layout */}
      <div className="grid md:grid-cols-[320px_1fr] gap-4 min-h-[600px]">
        {/* ── Left pane ── */}
        <div className="flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Search */}
          <div className="p-3 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search name or phone…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Segment filters */}
          <div className="p-2 border-b border-gray-100 flex flex-wrap gap-1">
            {SEGMENTS.map(s => (
              <button
                key={s.id}
                onClick={() => setSegment(s.id)}
                className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                  segment === s.id
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s.label} <span className="opacity-70">({s.count})</span>
              </button>
            ))}
          </div>

          {/* Customer list */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {filtered.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-gray-400 text-sm">No customers found</div>
            ) : (
              filtered.map(p => {
                const tags = getAutoTags(p);
                const isSelected = selected?.key === p.key;
                return (
                  <button
                    key={p.key}
                    onClick={() => selectCustomer(p)}
                    className={`w-full text-left px-3 py-2.5 hover:bg-orange-50 transition-colors ${
                      isSelected ? 'bg-orange-50 border-l-2 border-orange-500' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm text-gray-900 truncate">{p.name}</div>
                        {p.phone && <div className="text-xs text-gray-500">{p.phone}</div>}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs text-gray-400">{relativeTime(p.lastAt)}</div>
                        {p.totalSpent > 0 && (
                          <div className="text-xs font-semibold text-green-700">{PKR_CRM(p.totalSpent)}</div>
                        )}
                      </div>
                    </div>
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {tags.map(t => (
                          <span key={t} className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${TAG_COLORS[t] ?? 'bg-gray-100 text-gray-600'}`}>
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── Right pane ── */}
        {selected === null ? (
          <div className="hidden md:flex items-center justify-center bg-white rounded-xl border border-gray-200 shadow-sm text-gray-400 flex-col gap-3">
            <Users className="w-12 h-12 text-gray-200" />
            <span className="text-sm">Select a customer to view their profile</span>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-sm">
                  {selected.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{selected.name}</div>
                  {selected.area && <div className="text-xs text-gray-500">{selected.area}</div>}
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5">
              {/* Auto-tags */}
              {getAutoTags(selected).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {getAutoTags(selected).map(t => (
                    <span key={t} className={`text-xs px-2.5 py-1 rounded-full font-medium ${TAG_COLORS[t] ?? 'bg-gray-100 text-gray-600'}`}>
                      {t}
                    </span>
                  ))}
                </div>
              )}

              {/* Contact card */}
              <div className="grid sm:grid-cols-2 gap-2 text-sm">
                {selected.phone && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="truncate">{selected.phone}</span>
                    <a
                      href={`https://wa.me/92${selected.phone.replace(/^0/, '').replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-1 text-green-600 hover:text-green-700"
                      title="WhatsApp"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </a>
                  </div>
                )}
                {selected.email && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="truncate">{selected.email}</span>
                  </div>
                )}
                {selected.address && (
                  <div className="flex items-start gap-2 text-gray-700 sm:col-span-2">
                    <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                    <span>{selected.address}</span>
                  </div>
                )}
                {selected.cnic && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wide w-10">CNIC</span>
                    <span>{selected.cnic}</span>
                  </div>
                )}
              </div>

              {/* Spend summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label: 'Total Spent',   value: PKR_CRM(selected.totalSpent),       color: 'text-green-700' },
                  { label: 'Transactions',  value: selected.transactionCount,            color: 'text-blue-700' },
                  { label: 'First Visit',   value: new Date(selected.firstAt).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }), color: 'text-gray-700' },
                  { label: 'Last Visit',    value: relativeTime(selected.lastAt),        color: 'text-gray-700' },
                ].map(m => (
                  <div key={m.label} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                    <div className={`text-base font-bold ${m.color}`}>{m.value}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{m.label}</div>
                  </div>
                ))}
              </div>

              {/* Invoice timeline */}
              <div>
                <div className="text-sm font-semibold text-gray-700 mb-2">
                  Invoice History ({selected.invoices.length})
                </div>
                <div className="space-y-2">
                  {selected.invoices.map(inv => {
                    const badge = CRM_DOC_TYPE_BADGE[inv.doc_type] ?? { label: inv.doc_type, color: 'bg-gray-100 text-gray-600' };
                    const isExpanded = expandedInvoiceId === inv.id;
                    return (
                      <div key={inv.id} className="border border-gray-200 rounded-lg overflow-hidden">
                        <button
                          className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 transition-colors text-left"
                          onClick={() => setExpandedInvoiceId(isExpanded ? null : inv.id)}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${badge.color}`}>
                              {badge.label}
                            </span>
                            <span className="text-xs text-gray-500 shrink-0">
                              {new Date(inv.created_at).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                            <span className="text-xs font-medium text-gray-700 truncate">{inv.ref_number}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            {inv.grand_total > 0 && (
                              <span className="text-xs font-semibold text-gray-800">{PKR_CRM(inv.grand_total)}</span>
                            )}
                            {inv.payment_status && inv.payment_status !== 'paid' && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                inv.payment_status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                inv.payment_status === 'partial' ? 'bg-blue-100 text-blue-700' :
                                inv.payment_status === 'overdue' ? 'bg-red-100 text-red-700' :
                                'bg-gray-100 text-gray-600'
                              }`}>
                                {inv.payment_status}
                              </span>
                            )}
                            {isExpanded
                              ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
                              : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                            }
                          </div>
                        </button>
                        {isExpanded && (
                          <div className="px-3 pb-3 pt-1 bg-gray-50 border-t border-gray-100 text-xs text-gray-600 space-y-1">
                            {inv.subtotal > 0 && (
                              <div className="flex justify-between">
                                <span className="text-gray-500">Subtotal</span>
                                <span>{PKR_CRM(inv.subtotal)}</span>
                              </div>
                            )}
                            {(inv.discount_pct ?? 0) > 0 && (
                              <div className="flex justify-between">
                                <span className="text-gray-500">Discount</span>
                                <span>{inv.discount_pct}%{inv.discount_reason ? ` — ${inv.discount_reason}` : ''}</span>
                              </div>
                            )}
                            {inv.sale_type && (
                              <div className="flex justify-between">
                                <span className="text-gray-500">Sale type</span>
                                <span className="capitalize">{inv.sale_type}</span>
                              </div>
                            )}
                            {inv.inst_months && (
                              <div className="flex justify-between">
                                <span className="text-gray-500">Installment</span>
                                <span>{inv.inst_months} months — {PKR_CRM(inv.inst_monthly_amt ?? 0)}/mo</span>
                              </div>
                            )}
                            {inv.notes?.trim() && (
                              <div className="mt-1 p-2 bg-yellow-50 rounded text-yellow-800 border border-yellow-100">
                                {inv.notes}
                              </div>
                            )}
                            {inv.invoice_lines && inv.invoice_lines.length > 0 && (
                              <div className="mt-2 space-y-1">
                                <div className="font-medium text-gray-700 mb-1">Items</div>
                                {inv.invoice_lines.map((line, idx) => (
                                  <div key={idx} className="flex justify-between gap-2">
                                    <span className="truncate">{line.qty > 1 ? `${line.qty}× ` : ''}{line.name}{line.model ? ` (${line.model})` : ''}</span>
                                    <span className="shrink-0 font-medium text-gray-700">{PKR_CRM(line.unit_price * line.qty)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Notes section */}
              <div>
                <div className="text-sm font-semibold text-gray-700 mb-2">Staff Notes</div>
                {selected.phone ? (
                  <>
                    {/* Existing notes */}
                    {notes.length > 0 && (
                      <div className="space-y-2 mb-3">
                        {notes.map(n => (
                          <div key={n.id} className="flex items-start gap-2 p-2.5 bg-gray-50 rounded-lg border border-gray-100">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">{n.note}</p>
                              <p className="text-xs text-gray-400 mt-1">
                                {n.created_by ? `${n.created_by} · ` : ''}
                                {new Date(n.created_at).toLocaleString('en-PK', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                            <button
                              onClick={() => deleteNote(n.id)}
                              className="shrink-0 p-1 text-gray-300 hover:text-red-500 transition-colors"
                              title="Delete note"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {notes.length === 0 && (
                      <p className="text-xs text-gray-400 mb-3">No notes yet.</p>
                    )}

                    {/* Add note form */}
                    <div className="space-y-2">
                      <textarea
                        rows={3}
                        value={noteText}
                        onChange={e => setNoteText(e.target.value)}
                        placeholder="Add a staff note…"
                        className="w-full resize-none border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                      />
                      <div className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={noteBy}
                          onChange={e => setNoteBy(e.target.value)}
                          placeholder="Your name (optional)"
                          className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                        />
                        <button
                          onClick={addNote}
                          disabled={addingNote || !noteText.trim()}
                          className="px-3 py-1.5 bg-orange-500 text-white text-sm rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 shrink-0"
                        >
                          {addingNote ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                          Add
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-gray-400">Notes require a phone number to be associated with the customer.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
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

// ── Invoice History Tab ───────────────────────────────────────────────────────

const REPRINT_DEFAULT_SERVICES = [
  { service_type: 'delivery', service_name: 'Delivery & Last-Mile Logistics', description: 'Secure transit to premises, careful handover', status: 'included' as const, visible_value: 3000, charged_amount: 0 },
  { service_type: 'installation', service_name: 'Installation', description: 'Positioning, levelling, first-run test', status: 'not_selected' as const, visible_value: 2500, charged_amount: 0 },
  { service_type: 'warranty_facilitation', service_name: 'Warranty Facilitation', description: 'Claim coordination with brand service centre', status: 'included' as const, visible_value: 0, display_value: 'Bundled', charged_amount: 0 },
  { service_type: 'maintenance', service_name: 'Annual Maintenance Package', description: '2 visits/year · cleaning, gas check, diagnostics', status: 'not_selected' as const, visible_value: 6500, charged_amount: 0 },
  { service_type: 'ups_setup', service_name: 'UPS / Battery Setup', description: 'Inverter + battery installation', status: 'not_selected' as const, visible_value: 0, charged_amount: 0 },
];

type InvoiceRow = {
  id: string;
  ref_number: string;
  doc_type: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  customer_address: string | null;
  customer_cnic: string | null;
  customer_type: string | null;
  customer_area: string | null;
  sale_type: string | null;
  service_level: string | null;
  discount_reason: string | null;
  subtotal: number;
  discount_pct: number;
  discount_type: string | null;
  grand_total: number;
  advance_pct: number | null;
  payment_status: string;
  created_at: string;
  // installment columns
  inst_total_price: number | null;
  inst_advance_amt: number | null;
  inst_months: number | null;
  inst_monthly_amt: number | null;
  inst_first_date: string | null;
  // v3 columns
  custom_charges_json: Array<{ name: string; amount: number }> | null;
  guarantor_name: string | null;
  guarantor_phone: string | null;
  guarantor_cnic: string | null;
  notes: string | null;
  invoice_lines?: Array<{
    name: string;
    model: string | null;
    category: string | null;
    qty: number;
    unit_price: number;
    kwh_per_month: number | null;
    warranty: string | null;
    key_spec: string | null;
    key_specs_json: { displayPrefix?: string; packageNote?: string; isPackage?: boolean; packageComponents?: PackageComponent[] } | null;
    product_id: string | null;
  }>;
  invoice_services?: Array<{
    service_type: string;
    service_name: string;
    description: string;
    status: 'included' | 'charged' | 'not_selected';
    visible_value: number;
    charged_amount: number;
  }>;
};

const STATUS_COLORS: Record<string, string> = {
  pending:  'bg-yellow-100 text-yellow-800',
  partial:  'bg-blue-100 text-blue-800',
  paid:     'bg-green-100 text-green-800',
  overdue:  'bg-red-100 text-red-800',
};

// ── InstallmentLedgerTab ────────────────────────────────────────────────────
type InstallmentSlot = {
  id: string;
  installment_no: number;
  due_date: string;
  amount_due: number;
  amount_paid: number;
  status: 'pending' | 'paid' | 'overdue';
  paid_date: string | null;
  payment_method: string | null;
  receipt_ref: string | null;
};

type LedgerRow = {
  id: string;
  ref_number: string;
  customer_name: string | null;
  customer_phone: string | null;
  created_at: string;
  inst_total_price: number | null;
  inst_advance_amt: number | null;
  inst_months: number | null;
  inst_monthly_amt: number | null;
  payment_status: string;
  slots: InstallmentSlot[];
};

function InstallmentLedgerTab() {
  const [rows, setRows]           = useState<LedgerRow[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [search, setSearch]       = useState('');
  const [expanded, setExpanded]   = useState<string | null>(null);
  const [saving, setSaving]       = useState<string | null>(null);
  const [editSlot, setEditSlot]   = useState<{ invoiceId: string; slot: InstallmentSlot } | null>(null);
  const [payDate, setPayDate]     = useState('');
  const [payMethod, setPayMethod] = useState<string>('cash');
  const [payRef, setPayRef]       = useState('');

  const PKR = (n: number) => `PKR ${Math.round(n).toLocaleString('en-PK')}`;

  async function load() {
    setLoading(true);
    const { data: invData, error: invErr } = await supabase
      .from('invoices')
      .select('id, ref_number, customer_name, customer_phone, created_at, inst_total_price, inst_advance_amt, inst_months, inst_monthly_amt, payment_status')
      .eq('doc_type', 'installment-invoice')
      .order('created_at', { ascending: false });
    if (invErr) { setError(invErr.message); setLoading(false); return; }

    const invIds = (invData ?? []).map(r => r.id);
    const { data: slotData } = invIds.length > 0
      ? await supabase
          .from('installment_schedules')
          .select('id, invoice_id, installment_no, due_date, amount_due, amount_paid, status, paid_date, payment_method, receipt_ref')
          .in('invoice_id', invIds)
          .order('installment_no', { ascending: true })
      : { data: [] };

    const slotMap: Record<string, InstallmentSlot[]> = {};
    for (const s of (slotData ?? [])) {
      if (!slotMap[s.invoice_id]) slotMap[s.invoice_id] = [];
      slotMap[s.invoice_id].push(s);
    }
    setRows((invData ?? []).map(r => ({ ...r, slots: slotMap[r.id] ?? [] })));
    setLoading(false);
    setError('');
  }

  useEffect(() => { load(); }, []);

  async function markPaid(invoiceId: string, slot: InstallmentSlot) {
    setSaving(slot.id);
    const { error: err } = await supabase
      .from('installment_schedules')
      .update({
        status: 'paid',
        amount_paid: slot.amount_due,
        paid_date: payDate || new Date().toISOString().slice(0, 10),
        payment_method: payMethod,
        receipt_ref: payRef || null,
      })
      .eq('id', slot.id);
    setSaving(null);
    setEditSlot(null);
    setPayRef('');
    if (!err) load();
  }

  async function markOverdue(slotId: string) {
    setSaving(slotId);
    await supabase.from('installment_schedules').update({ status: 'overdue' }).eq('id', slotId);
    setSaving(null);
    load();
  }

  async function revertPending(slotId: string) {
    setSaving(slotId);
    await supabase.from('installment_schedules').update({ status: 'pending', amount_paid: 0, paid_date: null, payment_method: null, receipt_ref: null }).eq('id', slotId);
    setSaving(null);
    load();
  }

  const filtered = rows.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (r.customer_name ?? '').toLowerCase().includes(q)
      || (r.customer_phone ?? '').includes(q)
      || r.ref_number.toLowerCase().includes(q);
  });

  const totalOutstanding = filtered.reduce((s, r) => {
    const collected = r.slots.filter(sl => sl.status === 'paid').reduce((a, sl) => a + sl.amount_paid, 0);
    return s + (r.inst_total_price ?? 0) - collected;
  }, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-black text-gray-900">Installment Ledger</h2>
          <p className="text-xs text-gray-400 mt-0.5">Track installment sales and log payments</p>
        </div>
        <div className="flex gap-2">
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search customer / ref…"
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <button onClick={load} className="px-3 py-2 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl transition-colors">↻ Refresh</button>
        </div>
      </div>

      {filtered.length > 0 && (
        <div className="bg-orange-50 rounded-xl px-4 py-2.5 text-sm font-semibold text-orange-800">
          Total outstanding across {filtered.length} installment sale{filtered.length !== 1 ? 's' : ''}: {PKR(totalOutstanding)}
        </div>
      )}

      {loading && <p className="text-sm text-gray-400">Loading…</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}
      {!loading && !error && filtered.length === 0 && (
        <p className="text-sm text-gray-400">No installment sales found.</p>
      )}

      {filtered.map(row => {
        const collected = row.slots.filter(sl => sl.status === 'paid').reduce((s, sl) => s + sl.amount_paid, 0);
        const outstanding = (row.inst_total_price ?? 0) - collected;
        const pendingCount = row.slots.filter(sl => sl.status === 'pending').length;
        const overdueCount = row.slots.filter(sl => sl.status === 'overdue').length;
        const isOpen = expanded === row.id;
        return (
          <div key={row.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <button
              className="w-full text-left px-5 py-4 flex items-start gap-3 hover:bg-gray-50 transition-colors"
              onClick={() => setExpanded(isOpen ? null : row.id)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-gray-900 text-sm">{row.customer_name ?? '—'}</span>
                  <span className="font-mono text-xs text-gray-400">{row.ref_number}</span>
                  {overdueCount > 0 && <span className="text-xs font-semibold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{overdueCount} overdue</span>}
                  {pendingCount > 0 && !overdueCount && <span className="text-xs font-semibold bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">{pendingCount} pending</span>}
                  {pendingCount === 0 && overdueCount === 0 && <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Fully paid</span>}
                </div>
                <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                  <span>{row.customer_phone ?? '—'}</span>
                  <span>{new Date(row.created_at).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                  {row.inst_total_price && <span>Total: {PKR(row.inst_total_price)}</span>}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-gray-900">{PKR(outstanding)}</p>
                <p className="text-xs text-gray-400">outstanding</p>
              </div>
              <span className="text-gray-300 mt-1">{isOpen ? '▲' : '▼'}</span>
            </button>

            {isOpen && (
              <div className="px-5 pb-5 border-t border-gray-100 space-y-3 pt-4">
                {/* Progress bar */}
                {row.inst_total_price && row.inst_total_price > 0 && (
                  <div>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Collected: {PKR(collected)}</span>
                      <span>{Math.round((collected / row.inst_total_price) * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className="bg-orange-500 h-2 rounded-full transition-all" style={{ width: `${Math.min(100, Math.round((collected / row.inst_total_price) * 100))}%` }} />
                    </div>
                  </div>
                )}

                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-400 border-b border-gray-100">
                      <th className="text-left py-1.5 font-semibold">#</th>
                      <th className="text-left py-1.5 font-semibold">Due Date</th>
                      <th className="text-right py-1.5 font-semibold">Amount</th>
                      <th className="text-center py-1.5 font-semibold">Status</th>
                      <th className="text-right py-1.5 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {row.slots.map(slot => (
                      <tr key={slot.id} className="border-b border-gray-50 last:border-0">
                        <td className="py-2 text-gray-500">{slot.installment_no === 0 ? 'Adv' : slot.installment_no}</td>
                        <td className="py-2 text-gray-700">{slot.due_date}</td>
                        <td className="py-2 text-right font-semibold text-gray-900">{PKR(slot.amount_due)}</td>
                        <td className="py-2 text-center">
                          <span className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${STATUS_COLORS[slot.status] ?? 'bg-gray-100 text-gray-600'}`}>
                            {slot.status}
                          </span>
                          {slot.status === 'paid' && slot.paid_date && (
                            <p className="text-[10px] text-gray-400 mt-0.5">{slot.paid_date}{slot.payment_method ? ` · ${slot.payment_method}` : ''}</p>
                          )}
                        </td>
                        <td className="py-2 text-right">
                          {saving === slot.id ? (
                            <span className="text-gray-400 text-[10px]">saving…</span>
                          ) : slot.status !== 'paid' ? (
                            <div className="flex gap-1 justify-end">
                              <button
                                onClick={() => { setEditSlot({ invoiceId: row.id, slot }); setPayDate(new Date().toISOString().slice(0, 10)); setPayMethod('cash'); setPayRef(''); }}
                                className="px-2 py-1 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold transition-colors">
                                ✓ Paid
                              </button>
                              {slot.status !== 'overdue' && (
                                <button onClick={() => markOverdue(slot.id)}
                                  className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-semibold transition-colors">
                                  Overdue
                                </button>
                              )}
                            </div>
                          ) : (
                            <button onClick={() => revertPending(slot.id)}
                              className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-[10px] font-semibold transition-colors">
                              Revert
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pay modal inline */}
                {editSlot?.invoiceId === row.id && (
                  <div className="bg-green-50 rounded-xl p-4 border border-green-200 space-y-3">
                    <p className="text-xs font-bold text-gray-700">
                      Mark installment #{editSlot.slot.installment_no === 0 ? 'Advance' : editSlot.slot.installment_no} as paid — {PKR(editSlot.slot.amount_due)}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 block mb-1">Payment Date</label>
                        <input type="date" value={payDate} onChange={e => setPayDate(e.target.value)}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 block mb-1">Method</label>
                        <select value={payMethod} onChange={e => setPayMethod(e.target.value)}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-400">
                          <option value="cash">Cash</option>
                          <option value="bank_transfer">Bank Transfer</option>
                          <option value="cheque">Cheque</option>
                          <option value="online">Online</option>
                        </select>
                      </div>
                    </div>
                    <input value={payRef} onChange={e => setPayRef(e.target.value)}
                      placeholder="Reference / receipt number (optional)"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                    <div className="flex gap-2">
                      <button onClick={() => markPaid(row.id, editSlot.slot)}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-xl text-sm transition-colors">
                        Confirm Payment
                      </button>
                      <button onClick={() => setEditSlot(null)}
                        className="px-4 bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold py-2 rounded-xl text-sm transition-colors">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function InvoiceHistoryTab({ onEditRequest }: { onEditRequest?: (row: InvoiceRow) => void }) {
  const [rows, setRows]               = useState<InvoiceRow[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [dateFrom, setDateFrom]       = useState('');
  const [dateTo, setDateTo]           = useState('');
  const [search, setSearch]           = useState('');
  const [docTypeFilter, setDocTypeFilter] = useState('');
  const [statusFilter, setStatusFilter]   = useState('');
  const [expanded, setExpanded]       = useState<string | null>(null);
  const [updatingId, setUpdatingId]   = useState<string | null>(null);
  const [reprinting, setReprinting]   = useState<string | null>(null);
  const [loadingEdit, setLoadingEdit] = useState<string | null>(null);
  const [confirmDel, setConfirmDel]   = useState<InvoiceRow | null>(null);
  const [deleting, setDeleting]       = useState<string | null>(null);

  async function reprintInvoice(row: InvoiceRow) {
    setReprinting(row.id);
    try {
      const lines: QuoteLine[] = (row.invoice_lines ?? []).map(l => ({
        id: l.product_id ?? '',
        name: l.name,
        model: l.model ?? '',
        category: l.category ?? 'General',
        qty: l.qty,
        unitPrice: l.unit_price,
        kwhPerMonth: l.kwh_per_month ?? 0,
        savingsPct: 0,
        warranty: l.warranty ?? '',
        keySpec: l.key_spec ?? '',
        minPrice: 0,
        floorPrice: 0,
        overrideReason: '',
        displayPrefix:     l.key_specs_json?.displayPrefix ?? '',
        packageNote:       l.key_specs_json?.packageNote ?? '',
        isPackage:         l.key_specs_json?.isPackage ?? false,
        packageComponents: l.key_specs_json?.packageComponents ?? [],
      }));
      const customCharges = row.custom_charges_json ?? [];
      const discountIsFixed = (row.discount_pct ?? 0) > 100;
      let blob: Blob;
      let filename: string;

      if (row.doc_type === 'installment_payment_receipt') {
        // Extract payment number from ref suffix e.g. "TJ-20260101-123456-P3" → 3
        const paymentNumber = parseInt(row.ref_number.split('-P').pop() ?? '1', 10) || 1;
        blob = await generateInstallmentPaymentPdf({
          customerName: row.customer_name ?? '',
          customerPhone: (row.customer_phone ?? '').replace(/\D/g, ''),
          customerEmail: row.customer_email ?? '',
          customerAddress: row.customer_address ?? '',
          customerCnic: row.customer_cnic ?? '',
          lines,
          discount: row.discount_pct ?? 0,
          refNumber: row.ref_number,
          instTotalPrice: row.inst_total_price ?? 0,
          instAdvanceAmt: row.inst_advance_amt ?? 0,
          instMonths: row.inst_months ?? 0,
          instMonthlyAmt: row.inst_monthly_amt ?? 0,
          instFirstDate: row.inst_first_date ?? new Date().toISOString().slice(0, 10),
          paymentNumber,
          customCharges,
          showNtn: true,
        });
        filename = `${(row.customer_name || 'Customer').replace(/[/\\:*?"<>|]/g, '').trim()} - ${row.ref_number}.pdf`;

      } else if (row.doc_type === 'installment-invoice') {
        const services = (row.invoice_services ?? []).map(s => ({
          service_name: s.service_name,
          description: s.description,
          status: s.status,
          visible_value: s.visible_value,
          charged_amount: s.charged_amount,
        }));
        blob = await generateInstallmentAdvancePdf({
          customerName: row.customer_name ?? '',
          customerPhone: (row.customer_phone ?? '').replace(/\D/g, ''),
          customerEmail: row.customer_email ?? '',
          customerAddress: row.customer_address ?? '',
          customerCnic: row.customer_cnic ?? '',
          lines,
          services,
          customCharges,
          guarantorName: row.guarantor_name ?? '',
          guarantorPhone: row.guarantor_phone ?? '',
          guarantorCnic: row.guarantor_cnic ?? '',
          discount: row.discount_pct ?? 0,
          discountMode: discountIsFixed ? 'fixed' : 'percentage',
          refNumber: row.ref_number,
          instTotalPrice: row.inst_total_price ?? 0,
          instAdvanceAmt: row.inst_advance_amt ?? 0,
          instMonths: row.inst_months ?? 0,
          instMonthlyAmt: row.inst_monthly_amt ?? 0,
          instFirstDate: row.inst_first_date ?? new Date().toISOString().slice(0, 10),
          showNtn: true,
        });
        filename = `${(row.customer_name || 'Customer').replace(/[/\\:*?"<>|]/g, '').trim()} - ${row.ref_number}.pdf`;

      } else if (row.doc_type === 'service_receipt') {
        const jobLines = (row.invoice_lines ?? [])
          .filter(l => l.category === 'Service Work' || l.category === 'Spare Part')
          .map(l => ({
            type: (l.category === 'Spare Part' ? 'part' : 'work') as 'work' | 'part',
            description: l.name,
            qty: l.qty,
            unitPrice: l.unit_price,
          }));
        const notesRaw = row.notes ?? '';
        let deviceBrand = '', deviceModel = '', faultDesc = '', warrantyDays = 0, srNotes = notesRaw;
        const prefixMatch = notesRaw.match(/^\[Device:\s*(.*?)\s*\|\s*Fault:\s*(.*?)(?:\s*\|\s*Warranty:\s*(\d+)\s*days)?\]\n?\n?/s);
        if (prefixMatch) {
          const devicePart = prefixMatch[1].trim();
          const spaceIdx = devicePart.indexOf(' ');
          deviceBrand = spaceIdx > -1 ? devicePart.slice(0, spaceIdx) : devicePart;
          deviceModel = spaceIdx > -1 ? devicePart.slice(spaceIdx + 1) : '';
          faultDesc = prefixMatch[2].trim();
          warrantyDays = prefixMatch[3] ? Number(prefixMatch[3]) : 0;
          srNotes = notesRaw.replace(prefixMatch[0], '').trim();
        }
        blob = await generateServiceReceiptPdf({
          customerName: row.customer_name ?? '',
          customerPhone: (row.customer_phone ?? '').replace(/\D/g, ''),
          customerEmail: row.customer_email ?? '',
          customerAddress: row.customer_address ?? '',
          refNumber: row.ref_number,
          deviceBrand,
          deviceModel,
          faultDesc,
          jobLines,
          warrantyDays,
          customCharges,
          discount: row.discount_pct ?? 0,
          discountMode: discountIsFixed ? 'fixed' : 'percentage',
          discountType: row.discount_type ?? '',
          discountReason: row.discount_reason ?? '',
          notes: srNotes,
          preparedBy: '',
          showNtn: true,
        });
        filename = `${(row.customer_name || 'Customer').replace(/[/\\:*?"<>|]/g, '').trim()} - ${row.ref_number}.pdf`;

      } else {
        const docType: 'quotation' | 'invoice' =
          row.doc_type === 'quotation' ? 'quotation' : 'invoice';
        const grandTotal = row.grand_total ?? 0;
        const services = row.invoice_services?.length
          ? row.invoice_services.map(s => ({
              service_type: s.service_type,
              service_name: s.service_name,
              description: s.description,
              status: s.status,
              visible_value: s.visible_value,
              charged_amount: s.charged_amount,
            }))
          : REPRINT_DEFAULT_SERVICES;
        blob = await generateQuotationPdf({
          customerName: row.customer_name ?? '',
          customerPhone: (row.customer_phone ?? '').replace(/\D/g, ''),
          customerEmail: row.customer_email ?? '',
          customerAddress: row.customer_address ?? '',
          customerCnic: row.customer_cnic ?? '',
          customerType: (row.customer_type ?? 'house') as 'house' | 'apartment' | 'commercial',
          customerArea: row.customer_area ?? '',
          isExistingCustomer: null,
          lines,
          services,
          discount: row.discount_pct ?? 0,
          discountMode: discountIsFixed ? 'fixed' : 'percentage',
          discountType: row.discount_type ?? '',
          discountReason: row.discount_reason ?? '',
          docType,
          saleType: (row.sale_type ?? 'cash') as 'cash' | 'installment',
          refNumber: row.ref_number,
          preparedBy: '',
          stockStatus: 'Reprint copy',
          validityHours: 72,
          installationType: row.service_level === 'supply_install' ? 'installation-included' : 'supply-only',
          installationLines: [],
          advancePct: row.advance_pct ?? 50,
          balanceNote: 'delivery',
          advancePaid: false,
          deliveryEta: '',
          showNtn: true,
          customCharges,
          instTotalPrice: row.inst_total_price ?? undefined,
          instAdvanceAmt: row.inst_advance_amt ?? undefined,
          instMonths: row.inst_months ?? undefined,
          instMonthlyAmt: row.inst_monthly_amt ?? undefined,
          instFirstDate: row.inst_first_date ?? undefined,
          instTeaserMonthly: grandTotal > 0 ? Math.round(grandTotal * 1.25 / 12) : undefined,
          instTeaserMonths: 12,
        });
        filename = `${(row.customer_name || 'Customer').replace(/[/\\:*?"<>|]/g, '').trim()} - ${row.ref_number}.pdf`;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (e) {
      console.error('[reprint]', e);
    }
    setReprinting(null);
  }

  async function editInvoice(row: InvoiceRow) {
    if (!onEditRequest) return;
    setLoadingEdit(row.id);
    // Re-fetch the full row so we have invoice_services + new v3 columns
    const { data } = await supabase
      .from('invoices')
      .select('*, invoice_lines(name, model, category, qty, unit_price, kwh_per_month, warranty, key_spec, key_specs_json, product_id), invoice_services(service_type, service_name, description, status, visible_value, charged_amount)')
      .eq('id', row.id)
      .single();
    setLoadingEdit(null);
    if (data) onEditRequest(data as InvoiceRow);
  }

  async function fetchInvoices() {
    setLoading(true); setError('');
    try {
      let q = supabase
        .from('invoices')
        .select('*, invoice_lines(name, model, category, qty, unit_price, kwh_per_month, warranty, key_spec, key_specs_json, product_id), invoice_services(service_type, service_name, description, status, visible_value, charged_amount)')
        .order('created_at', { ascending: false })
        .limit(200);

      if (dateFrom) q = q.gte('created_at', dateFrom);
      if (dateTo)   q = q.lte('created_at', dateTo + 'T23:59:59');
      if (docTypeFilter) q = q.eq('doc_type', docTypeFilter);
      if (statusFilter)  q = q.eq('payment_status', statusFilter);

      const { data, error: err } = await q;
      if (err) { setError(err.message); setLoading(false); return; }

      let filtered = (data ?? []) as InvoiceRow[];
      if (search.trim()) {
        const q2 = search.toLowerCase();
        filtered = filtered.filter(r =>
          (r.customer_name?.toLowerCase().includes(q2)) ||
          (r.customer_phone?.includes(q2)) ||
          (r.ref_number?.toLowerCase().includes(q2))
        );
      }
      setRows(filtered);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load invoices');
    }
    setLoading(false);
  }

  useEffect(() => { fetchInvoices(); }, [dateFrom, dateTo, docTypeFilter, statusFilter]);

  async function updateStatus(id: string, status: string) {
    setUpdatingId(id);
    await supabase.from('invoices').update({ payment_status: status }).eq('id', id);
    setRows(rs => rs.map(r => r.id === id ? { ...r, payment_status: status } : r));
    setUpdatingId(null);
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    await supabase.from('invoices').delete().eq('id', id);
    setRows(prev => prev.filter(r => r.id !== id));
    setDeleting(null);
    setConfirmDel(null);
  }

  const PKR = (n: number) => `PKR ${Math.round(n).toLocaleString('en-PK')}`;

  const filtered = search.trim()
    ? rows.filter(r => {
        const q2 = search.toLowerCase();
        return (r.customer_name?.toLowerCase().includes(q2)) ||
               (r.customer_phone?.includes(q2)) ||
               (r.ref_number?.toLowerCase().includes(q2));
      })
    : rows;

  const totalRevenue = filtered
    .filter(r => r.payment_status === 'paid')
    .reduce((s, r) => s + (r.grand_total ?? 0), 0);

  return (
    <div className="space-y-5">
      {/* ── Filters ── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Filter Invoices</p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            placeholder="From"
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            placeholder="To"
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Name / phone / ref…"
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
          <select value={docTypeFilter} onChange={e => setDocTypeFilter(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400">
            <option value="">All types</option>
            <option value="quotation">Quotation</option>
            <option value="invoice">Invoice</option>
            <option value="installment-invoice">Installment</option>
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400">
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
        <button onClick={fetchInvoices}
          className="mt-3 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl transition-colors">
          Refresh
        </button>
      </div>

      {/* ── Summary bar ── */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: 'Documents', value: filtered.length },
            { label: 'Paid Revenue', value: PKR(totalRevenue) },
            { label: 'Pending / Overdue', value: filtered.filter(r => r.payment_status === 'pending' || r.payment_status === 'overdue').length },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-3 sm:p-4">
              <p className="text-xs text-gray-400 font-medium">{s.label}</p>
              <p className="text-lg sm:text-xl font-black text-gray-900 mt-1 truncate">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Table ── */}
      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
          <p className="text-red-700 font-semibold text-sm">Failed to load: {error}</p>
          <p className="text-red-500 text-xs mt-1">Run the migration <code>20260420_invoice_log.sql</code> in Supabase first.</p>
        </div>
      ) : loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Loading invoice history…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">No invoices match your filters.</div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Ref', 'Date', 'Customer', 'Type', 'Total', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(row => (
                <>
                  <tr key={row.id}
                    className="border-b border-gray-50 hover:bg-orange-50/30 transition-colors cursor-pointer"
                    onClick={() => setExpanded(expanded === row.id ? null : row.id)}>
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">{row.ref_number}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(row.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900 text-xs">{row.customer_name || '—'}</p>
                      {row.customer_phone && <p className="text-[10px] text-gray-400">{row.customer_phone}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block bg-gray-100 text-gray-600 text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize">
                        {row.doc_type?.replace('-', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-gray-900 text-xs">{PKR(row.grand_total ?? 0)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[row.payment_status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {row.payment_status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <select
                          value={row.payment_status}
                          onClick={e => e.stopPropagation()}
                          onChange={e => updateStatus(row.id, e.target.value)}
                          disabled={updatingId === row.id}
                          className="border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-orange-400">
                          <option value="pending">Pending</option>
                          <option value="partial">Partial</option>
                          <option value="paid">Paid</option>
                          <option value="overdue">Overdue</option>
                        </select>
                        <button
                          onClick={e => { e.stopPropagation(); reprintInvoice(row); }}
                          disabled={reprinting === row.id}
                          title="Download PDF copy"
                          className="p-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-600 transition-colors disabled:opacity-40 flex-shrink-0">
                          {reprinting === row.id ? (
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          )}
                        </button>
                        {onEditRequest && (
                          <button
                            onClick={e => { e.stopPropagation(); editInvoice(row); }}
                            disabled={loadingEdit === row.id}
                            title="Edit invoice"
                            className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors disabled:opacity-40 flex-shrink-0">
                            {loadingEdit === row.id ? (
                              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            )}
                          </button>
                        )}
                        <button
                          onClick={e => { e.stopPropagation(); setConfirmDel(row); }}
                          disabled={deleting === row.id}
                          title="Delete invoice"
                          className="p-1.5 hover:bg-red-50 text-red-400 hover:text-red-600 rounded-lg transition-colors disabled:opacity-40 flex-shrink-0">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expanded === row.id && (
                    <tr key={`${row.id}-exp`} className="bg-orange-50/40">
                      <td colSpan={7} className="px-6 py-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs font-bold text-gray-500 mb-2">LINE ITEMS</p>
                            <div className="space-y-1">
                              {(row.invoice_lines ?? []).map((l, i) => (
                                <div key={i} className="flex justify-between text-xs text-gray-700">
                                  <span>{l.name} × {l.qty}</span>
                                  <span className="font-semibold">{PKR(l.qty * l.unit_price)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="space-y-1 text-xs">
                            <p className="font-bold text-gray-500 mb-2">DETAILS</p>
                            {row.discount_pct > 0 && (
                              <p className="text-orange-600">{row.discount_type ?? 'Discount'}: {row.discount_pct}% — saving {PKR((row.subtotal ?? 0) * row.discount_pct / 100)}</p>
                            )}
                            {row.customer_email && <p className="text-gray-600">Email: {row.customer_email}</p>}
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

      {confirmDel && (
        <ConfirmDialog
          title="Delete this invoice?"
          message={`Ref ${confirmDel.ref_number} — ${confirmDel.customer_name ?? 'Unknown'}\nThis cannot be undone.`}
          confirmLabel="Delete Invoice"
          danger
          onConfirm={() => handleDelete(confirmDel.id)}
          onCancel={() => setConfirmDel(null)}
        />
      )}
    </div>
  );
}

function QuotationTab({ products, editRequest, onEditConsumed }: { products: Product[]; editRequest?: InvoiceRow | null; onEditConsumed?: () => void }) {
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [customerName,    setCustomerName]    = useState('');
  const [customerPhone,   setCustomerPhone]   = useState('');
  const [customerEmail,   setCustomerEmail]   = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerCnic,    setCustomerCnic]    = useState('');
  const [docType, setDocType]                 = useState<'quotation' | 'invoice' | 'installment-invoice' | 'service_receipt'>('quotation');
  const [discount, setDiscount]           = useState(0);
  const [discountRaw, setDiscountRaw]     = useState('0');
  const [discountType, setDiscountType]   = useState('Promotional');
  const [lines, setLines]                 = useState<QuoteLine[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [generating, setGenerating]       = useState(false);
  const [pdfState, setPdfState]           = useState<'idle' | 'generating' | 'success' | 'error'>('idle');
  // ── Package templates state ──
  type PkgTemplate = { id: string; name: string; description: string | null; category_tag: string | null; lines: QuoteLine[]; discount: number; discount_type: string };
  const [templates, setTemplates]         = useState<PkgTemplate[]>([]);
  const [pkgPanelOpen, setPkgPanelOpen]   = useState(false);
  const [savingPkg, setSavingPkg]         = useState(false);
  const [pkgName, setPkgName]             = useState('');
  const [pkgDesc, setPkgDesc]             = useState('');
  const [pkgTag, setPkgTag]               = useState('');
  const [pdfUrl, setPdfUrl]               = useState<string | null>(null);
  const [toastMsg, setToastMsg]           = useState('');
  const [draftBanner, setDraftBanner]     = useState(false);
  // ── Quotation meta state ──
  const [elevatedStructureOn, setElevatedStructureOn]   = useState(true);
  const [elevatedStructureAmt, setElevatedStructureAmt] = useState(0);
  const [wiringAmt, setWiringAmt]     = useState(0);
  const [laborAmt, setLaborAmt]       = useState(0);
  const [advancePct, setAdvancePct]   = useState(70);
  const [advanceMode, setAdvanceMode] = useState<'pct' | 'fixed'>('pct');
  const [advanceFixedAmt, setAdvanceFixedAmt] = useState(0);
  const [cashPaySchedule, setCashPaySchedule] = useState<Array<{id: string; date: string; amount: number; note: string}>>([]);
  const [balanceNote, setBalanceNote] = useState('delivery');
  const [showNtn, setShowNtn]         = useState(false);
  const [customerType, setCustomerType] = useState<'house' | 'apartment' | 'commercial'>('house');
  const [serviceLevel, setServiceLevel] = useState<'supply_only' | 'supply_install' | 'full_service'>('supply_only');
  const [discountReason, setDiscountReason] = useState('');
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

  interface InvoiceService {
    service_type: string;
    service_name: string;
    description: string;
    status: 'included' | 'charged' | 'not_selected';
    visible_value: number;
    display_value?: string;   // e.g. "Bundled", "Ask to add" — shown instead of PKR amount when set
    charged_amount: number;
  }

  const DEFAULT_SERVICES: InvoiceService[] = [
    {
      service_type: 'delivery',
      service_name: 'Delivery & Last-Mile Logistics',
      description: 'Secure transit to premises, careful handover',
      status: 'included',
      visible_value: 3000,
      charged_amount: 0,
    },
    {
      service_type: 'installation',
      service_name: 'Installation',
      description: 'Positioning, levelling, first-run test',
      status: 'not_selected',
      visible_value: 2500,
      charged_amount: 0,
    },
    {
      service_type: 'warranty_facilitation',
      service_name: 'Warranty Facilitation',
      description: 'Claim coordination with brand service centre',
      status: 'included',
      visible_value: 0,
      display_value: 'Bundled',
      charged_amount: 0,
    },
    {
      service_type: 'maintenance',
      service_name: 'Annual Maintenance Package',
      description: '2 visits/year · cleaning, gas check, diagnostics',
      status: 'not_selected',
      visible_value: 6500,
      charged_amount: 0,
    },
    {
      service_type: 'ups_setup',
      service_name: 'UPS / Battery Setup',
      description: 'Inverter + battery installation',
      status: 'not_selected',
      visible_value: 0,
      charged_amount: 0,
    },
  ];

  const [services, setServices] = useState<InvoiceService[]>(DEFAULT_SERVICES);
  const [saleType, setSaleType]           = useState<'cash' | 'installment'>('cash');
  const [discountMode, setDiscountMode]   = useState<'percentage' | 'fixed'>('percentage');
  const [discountFixed, setDiscountFixed] = useState(0);
  const [discountFixedRaw, setDiscountFixedRaw] = useState('0');
  const [deliveryEta, setDeliveryEta]     = useState('24–48h after payment');
  const [preparedBy, setPreparedBy]       = useState('');
  const [stockStatus, setStockStatus]     = useState('In stock · confirm before payment');
  const [advancePaid, setAdvancePaid]     = useState(false);
  const [customerArea, setCustomerArea]   = useState('');
  const [isExistingCustomer, setIsExistingCustomer] = useState<boolean | null>(null);
  const [validityHours, setValidityHours] = useState<24 | 48 | 72 | 168>(48);
  // ── Custom charges ──
  const [customCharges, setCustomCharges] = useState<Array<{id: string; name: string; amount: number}>>([]);
  // ── Custom product form ──
  const [showCustomProductForm, setShowCustomProductForm] = useState(false);
  const [customProductName,     setCustomProductName]     = useState('');
  const [customProductModel,    setCustomProductModel]    = useState('');
  const [customProductBrand,    setCustomProductBrand]    = useState('');
  const [customProductCategory, setCustomProductCategory] = useState('General');
  const [customProductPrice,    setCustomProductPrice]    = useState('');
  const [customProductWarranty, setCustomProductWarranty] = useState('');
  const [customProductKeySpec,  setCustomProductKeySpec]  = useState('');
  const [savingCustomProduct,   setSavingCustomProduct]   = useState(false);
  // ── Custom service form ──
  const [showCustomServiceForm,   setShowCustomServiceForm]   = useState(false);
  const [customServiceName,       setCustomServiceName]       = useState('');
  const [customServiceDesc,       setCustomServiceDesc]       = useState('');
  const [customServiceStatus,     setCustomServiceStatus]     = useState<'included' | 'charged'>('charged');
  const [customServiceAmount,     setCustomServiceAmount]     = useState('');
  // ── Guarantor (installment) ──
  const [guarantorName,  setGuarantorName]  = useState('');
  const [guarantorPhone, setGuarantorPhone] = useState('');
  const [guarantorCnic,  setGuarantorCnic]  = useState('');
  const [invoiceNotes,   setInvoiceNotes]   = useState('');

  // ── Service Receipt specific fields ──
  const [srDeviceBrand,   setSrDeviceBrand]   = useState('');
  const [srDeviceModel,   setSrDeviceModel]   = useState('');
  const [srFaultDesc,     setSrFaultDesc]     = useState('');
  const [srWarrantyDays,  setSrWarrantyDays]  = useState(0);
  const [srJobLines,      setSrJobLines]      = useState<Array<{id: string; type: 'work'|'part'; description: string; qty: number; unitPrice: number}>>([]);

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
  const installationType = (serviceLevel === 'supply_install' || serviceLevel === 'full_service')
    ? 'installation-included'
    : 'supply-only';

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

  const [refNumber, setRefNumber] = useState(() => generateRefNumber());

  // ── Autosave draft ──
  useEffect(() => {
    const saved = localStorage.getItem('tajallis-invoice-draft');
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
        localStorage.setItem('tajallis-invoice-draft', JSON.stringify({
          lines, customerName, customerPhone, customerEmail, customerAddress, customerCnic,
          discount, discountRaw, discountType, docType, refNumber,
          serviceLevel, elevatedStructureOn, elevatedStructureAmt, wiringAmt, laborAmt,
          customerType, discountReason, discountMode, discountFixed, discountFixedRaw,
          advancePct, advanceMode, advanceFixedAmt, cashPaySchedule, balanceNote,
          saleType, deliveryEta, preparedBy, stockStatus, advancePaid, customerArea, isExistingCustomer, validityHours,
          instTotalPrice, instAdvanceAmt, instMonths, instMonthlyAmt, instFirstDate, instPaymentNumber,
          customCharges, guarantorName, guarantorPhone, guarantorCnic, invoiceNotes,
          srDeviceBrand, srDeviceModel, srFaultDesc, srWarrantyDays, srJobLines,
          services,
        }));
      }
    }, 1000);
    return () => { if (autosaveRef.current) clearTimeout(autosaveRef.current); };
  }, [lines, customerName, customerPhone, customerEmail, customerAddress, customerCnic,
      discount, discountRaw, discountType, docType, refNumber,
      serviceLevel, elevatedStructureOn, elevatedStructureAmt, wiringAmt, laborAmt,
      advancePct, advanceMode, advanceFixedAmt, cashPaySchedule, balanceNote,
      customerType, discountReason,
      discountMode, discountFixed, discountFixedRaw,
      saleType, deliveryEta, preparedBy, stockStatus, advancePaid,
      customerArea, isExistingCustomer, validityHours,
      instTotalPrice, instAdvanceAmt, instMonths, instMonthlyAmt, instFirstDate, instPaymentNumber,
      customCharges, guarantorName, guarantorPhone, guarantorCnic, invoiceNotes,
      srDeviceBrand, srDeviceModel, srFaultDesc, srWarrantyDays, srJobLines, services]);

  function restoreDraft() {
    try {
      const saved = localStorage.getItem('tajallis-invoice-draft');
      if (!saved) return;
      const draft = JSON.parse(saved);
      if (draft.lines)         setLines(draft.lines);
      if (draft.customerName)    setCustomerName(draft.customerName);
      if (draft.customerPhone)   setCustomerPhone(draft.customerPhone);
      if (draft.customerEmail)   setCustomerEmail(draft.customerEmail);
      if (draft.customerAddress) setCustomerAddress(draft.customerAddress);
      if (draft.customerCnic)    setCustomerCnic(draft.customerCnic);
      if (typeof draft.discount === 'number') { setDiscount(draft.discount); setDiscountRaw(String(draft.discount)); }
      if (draft.discountType)  setDiscountType(draft.discountType);
      if (draft.docType)       setDocType(draft.docType);
      if (draft.customerType) setCustomerType(draft.customerType);
      if (draft.serviceLevel) setServiceLevel(draft.serviceLevel);
      if (draft.discountReason) setDiscountReason(draft.discountReason);
      if (draft.discountMode) setDiscountMode(draft.discountMode);
      if (typeof draft.discountFixed === 'number') { setDiscountFixed(draft.discountFixed); setDiscountFixedRaw(String(draft.discountFixed)); }
      if (draft.saleType) setSaleType(draft.saleType);
      if (draft.deliveryEta) setDeliveryEta(draft.deliveryEta);
      if (draft.preparedBy !== undefined) setPreparedBy(draft.preparedBy);
      if (draft.stockStatus) setStockStatus(draft.stockStatus);
      if (typeof draft.advancePaid === 'boolean') setAdvancePaid(draft.advancePaid);
      if (draft.customerArea !== undefined) setCustomerArea(draft.customerArea);
      if (draft.isExistingCustomer !== undefined) setIsExistingCustomer(draft.isExistingCustomer);
      if (typeof draft.validityHours === 'number') setValidityHours(draft.validityHours);
      if (typeof draft.elevatedStructureOn === 'boolean') setElevatedStructureOn(draft.elevatedStructureOn);
      if (typeof draft.elevatedStructureAmt === 'number') setElevatedStructureAmt(draft.elevatedStructureAmt);
      if (typeof draft.wiringAmt === 'number') setWiringAmt(draft.wiringAmt);
      if (typeof draft.laborAmt === 'number') setLaborAmt(draft.laborAmt);
      if (typeof draft.advancePct === 'number') setAdvancePct(draft.advancePct);
      if (draft.advanceMode) setAdvanceMode(draft.advanceMode);
      if (typeof draft.advanceFixedAmt === 'number') setAdvanceFixedAmt(draft.advanceFixedAmt);
      if (Array.isArray(draft.cashPaySchedule)) setCashPaySchedule(draft.cashPaySchedule);
      if (draft.balanceNote) setBalanceNote(draft.balanceNote);
      if (typeof draft.instTotalPrice === 'number') setInstTotalPrice(draft.instTotalPrice);
      if (typeof draft.instAdvanceAmt === 'number') setInstAdvanceAmt(draft.instAdvanceAmt);
      if (typeof draft.instMonths === 'number') setInstMonths(draft.instMonths);
      if (typeof draft.instMonthlyAmt === 'number') setInstMonthlyAmt(draft.instMonthlyAmt);
      if (draft.instFirstDate) setInstFirstDate(draft.instFirstDate);
      if (typeof draft.instPaymentNumber === 'number') setInstPaymentNumber(draft.instPaymentNumber);
      if (Array.isArray(draft.customCharges)) setCustomCharges(draft.customCharges);
      if (draft.guarantorName)  setGuarantorName(draft.guarantorName);
      if (draft.guarantorPhone) setGuarantorPhone(draft.guarantorPhone);
      if (draft.guarantorCnic)  setGuarantorCnic(draft.guarantorCnic);
      if (draft.invoiceNotes)   setInvoiceNotes(draft.invoiceNotes);
      if (Array.isArray(draft.services) && draft.services.length > 0) setServices(draft.services);
    } catch { /* ignore */ }
    setDraftBanner(false);
  }

  function discardDraft() {
    localStorage.removeItem('tajallis-invoice-draft');
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

  // ── Load invoice for editing ─────────────────────────────────────────────
  function loadForEdit(row: InvoiceRow) {
    setEditingInvoiceId(row.id);
    setRefNumber(row.ref_number);
    setCustomerName(row.customer_name ?? '');
    setCustomerPhone(row.customer_phone ?? '');
    setCustomerEmail(row.customer_email ?? '');
    setCustomerAddress(row.customer_address ?? '');
    setCustomerCnic(row.customer_cnic ?? '');
    setCustomerType((row.customer_type ?? 'house') as 'house' | 'apartment' | 'commercial');
    setCustomerArea(row.customer_area ?? '');
    setDocType((row.doc_type ?? 'invoice') as typeof docType);
    setSaleType((row.sale_type ?? 'cash') as 'cash' | 'installment');
    setServiceLevel((row.service_level ?? 'supply_only') as 'supply_only' | 'supply_install' | 'full_service');
    setDiscountType(row.discount_type ?? 'Promotional');
    setDiscountReason(row.discount_reason ?? '');
    const dp = row.discount_pct ?? 0;
    if (dp > 100) { setDiscountMode('fixed'); setDiscountFixed(dp); setDiscountFixedRaw(String(dp)); setDiscount(0); setDiscountRaw('0'); }
    else { setDiscountMode('percentage'); setDiscount(dp); setDiscountRaw(String(dp)); setDiscountFixed(0); setDiscountFixedRaw('0'); }
    setAdvancePct(row.advance_pct ?? 70);
    setAdvanceMode('pct');
    setAdvanceFixedAmt(0);
    setCashPaySchedule([]);
    setInstTotalPrice(row.inst_total_price ?? 0);
    setInstAdvanceAmt(row.inst_advance_amt ?? 0);
    setInstMonths(row.inst_months ?? 0);
    setInstMonthlyAmt(row.inst_monthly_amt ?? 0);
    setInstFirstDate(row.inst_first_date ?? '');
    if (Array.isArray(row.custom_charges_json)) {
      setCustomCharges(row.custom_charges_json.map(c => ({ ...c, id: crypto.randomUUID() })));
    } else {
      setCustomCharges([]);
    }
    setGuarantorName(row.guarantor_name ?? '');
    setGuarantorPhone(row.guarantor_phone ?? '');
    setGuarantorCnic(row.guarantor_cnic ?? '');
    setInvoiceNotes(row.notes ?? '');
    // Lines
    const editLines: QuoteLine[] = (row.invoice_lines ?? []).map(l => ({
      id: l.product_id ?? '',
      name: l.name,
      model: l.model ?? '',
      category: l.category ?? 'General',
      qty: l.qty,
      unitPrice: l.unit_price,
      kwhPerMonth: l.kwh_per_month ?? 0,
      savingsPct: 0,
      warranty: l.warranty ?? '',
      keySpec: l.key_spec ?? '',
      minPrice: 0,
      floorPrice: 0,
      overrideReason: '',
      displayPrefix:     l.key_specs_json?.displayPrefix ?? '',
      packageNote:       l.key_specs_json?.packageNote ?? '',
      isPackage:         l.key_specs_json?.isPackage ?? false,
      packageComponents: l.key_specs_json?.packageComponents ?? [],
    }));
    setLines(editLines);
    // Services — merge stored services into DEFAULT_SERVICES, then append any custom ones
    if ((row.invoice_services ?? []).length > 0) {
      const stored = row.invoice_services!;
      const defaultDefaultServiceTypes = new Set(DEFAULT_SERVICES.map(d => d.service_type));
      const restoredDefaults = DEFAULT_SERVICES.map(def => {
        const match = stored.find(s => s.service_type === def.service_type);
        return match
          ? { ...def, status: match.status, visible_value: match.visible_value, charged_amount: match.charged_amount }
          : def;
      });
      const customServices = stored
        .filter(s => !defaultDefaultServiceTypes.has(s.service_type))
        .map(s => ({
          service_type:   s.service_type,
          service_name:   s.service_name,
          description:    s.description ?? '',
          status:         s.status as 'included' | 'charged' | 'not_selected',
          visible_value:  s.visible_value ?? 0,
          charged_amount: s.charged_amount ?? 0,
        }));
      setServices([...restoredDefaults, ...customServices]);
    }
    // Service receipt fields — restore from invoice_lines (category-based) + notes prefix
    if (row.doc_type === 'service_receipt') {
      const srLines = (row.invoice_lines ?? [])
        .filter(l => l.category === 'Service Work' || l.category === 'Spare Part')
        .map(l => ({
          id: crypto.randomUUID(),
          type: (l.category === 'Spare Part' ? 'part' : 'work') as 'work' | 'part',
          description: l.name,
          qty: l.qty,
          unitPrice: l.unit_price,
        }));
      setSrJobLines(srLines);
      // Parse device prefix from notes: "[Device: BRAND MODEL | Fault: DESC | Warranty: N days]\n\n..."
      const notesRaw = row.notes ?? '';
      const prefixMatch = notesRaw.match(/^\[Device:\s*(.*?)\s*\|\s*Fault:\s*(.*?)(?:\s*\|\s*Warranty:\s*(\d+)\s*days)?\]\n?\n?/s);
      if (prefixMatch) {
        const devicePart = prefixMatch[1].trim();
        const spaceIdx = devicePart.indexOf(' ');
        setSrDeviceBrand(spaceIdx > -1 ? devicePart.slice(0, spaceIdx) : devicePart);
        setSrDeviceModel(spaceIdx > -1 ? devicePart.slice(spaceIdx + 1) : '');
        setSrFaultDesc(prefixMatch[2].trim());
        setSrWarrantyDays(prefixMatch[3] ? Number(prefixMatch[3]) : 0);
        setInvoiceNotes(notesRaw.replace(prefixMatch[0], '').trim());
      }
      setLines([]);
    }
    onEditConsumed?.();
  }

  useEffect(() => {
    if (editRequest) loadForEdit(editRequest);
  }, [editRequest]);

  // ── Package template helpers ──────────────────────────────────────────────
  async function fetchTemplates() {
    const { data } = await supabase
      .from('package_templates')
      .select('id,name,description,category_tag,lines,discount,discount_type')
      .eq('is_active', true)
      .order('sort_order')
      .order('created_at');
    if (data) setTemplates(data as PkgTemplate[]);
  }

  useEffect(() => { fetchTemplates(); }, []);

  async function saveAsPackage() {
    if (!pkgName.trim() || !lines.length) return;
    setSavingPkg(true);
    const { error } = await supabase.from('package_templates').insert({
      name:          pkgName.trim(),
      description:   pkgDesc.trim() || null,
      category_tag:  pkgTag.trim() || null,
      lines:         JSON.stringify(lines),
      discount,
      discount_type: discountType,
    });
    setSavingPkg(false);
    if (!error) {
      setPkgName(''); setPkgDesc(''); setPkgTag('');
      setPkgPanelOpen(false);
      setToastMsg('Package saved!');
      fetchTemplates();
    } else {
      setToastMsg('Save failed — run migration 20260420_package_templates.sql first');
    }
  }

  function loadTemplate(tmpl: PkgTemplate) {
    setLines(tmpl.lines.map(l => ({ ...l })));
    setDiscount(tmpl.discount ?? 0);
    setDiscountRaw(String(tmpl.discount ?? 0));
    setDiscountType(tmpl.discount_type ?? 'Promotional');
    setToastMsg(`"${tmpl.name}" loaded — ${tmpl.lines.length} items`);
  }

  async function deleteTemplate(id: string) {
    await supabase.from('package_templates').update({ is_active: false }).eq('id', id);
    setTemplates(ts => ts.filter(t => t.id !== id));
    setToastMsg('Package removed');
  }

  function addLine(p: Product) {
    const specEntries = Object.entries(p.specs ?? {}).slice(0, 2);
    const keySpec = specEntries.map(([k, v]) => `${k}: ${v}`).join(', ');

    // ── Auto-parse energy data from product specs ──────────────────────────
    const specs = p.specs ?? {};
    let kwhPerMonth = 0;

    // 1. "Power Consumption" → "XXW (avg. annual: YYYY kWh/yr)" pattern from api.ts enrichment
    const pwrConsumption = specs['Power Consumption'] ?? '';
    const annualMatch = pwrConsumption.match(/(\d+(?:\.\d+)?)\s*kWh\/yr/i);
    if (annualMatch) {
      kwhPerMonth = Math.round(parseFloat(annualMatch[1]) / 12);
    }

    // 2. Dedicated "Annual Energy Consumption" key (some brands store this directly)
    if (!kwhPerMonth) {
      for (const [k, v] of Object.entries(specs)) {
        if (/annual.*energy|energy.*consumption/i.test(k)) {
          const n = parseFloat(String(v));
          if (n > 0) { kwhPerMonth = Math.round(n / 12); break; }
        }
      }
    }

    // 3. "Estimated Daily Output" for solar (kWh/day × 30)
    if (!kwhPerMonth && specs['Estimated Daily Output']) {
      const m = String(specs['Estimated Daily Output']).match(/(\d+(?:\.\d+)?)/);
      if (m) kwhPerMonth = Math.round(parseFloat(m[1]) * 30);
    }

    // Inverter savings %: parse from "Inverter Technology" spec or "Inverter" compressor tag
    let savingsPct = 0;
    const invTech = specs['Inverter Technology'] ?? '';
    if (/40%/i.test(invTech))      savingsPct = 40;
    else if (/35%/i.test(invTech)) savingsPct = 35;
    else if (/60%/i.test(invTech)) savingsPct = 60;
    else if (/inverter/i.test(invTech) || /inverter/i.test(specs['Compressor'] ?? '')) savingsPct = 40;

    setLines(ls => ls.some(l => l.id === p.id) ? ls : [...ls, {
      id: p.id,
      name: p.simplified_name || p.model,
      model: p.model,
      qty: 1,
      unitPrice: p.price.cash_floor,
      category: p.normalized_category || p.category || 'Other',
      warranty: p.warranty || '1 year manufacturer warranty',
      keySpec,
      kwhPerMonth,
      savingsPct,
      minPrice: p.price.min || 0,
      floorPrice: p.price.cash_floor,
      overrideReason: '',
      displayPrefix: '',
      packageNote: '',
      isPackage: false,
      packageComponents: [],
    }]);
    setProductSearch('');
    setToastMsg(`${p.brand || ''} ${p.model} added`.trim());
  }

  async function addCustomProduct() {
    const name  = customProductName.trim();
    const price = Number(customProductPrice);
    if (!name || !price) return;
    setSavingCustomProduct(true);
    const id   = crypto.randomUUID();
    const slug = slugify(`${customProductBrand || name}-${customProductModel || name}-${Date.now()}`);
    try {
      await upsertProduct({
        id,
        slug,
        brand:              customProductBrand.trim() || null,
        model:              customProductModel.trim() || name,
        simplified_name:    name,
        category:           customProductCategory,
        normalized_category: customProductCategory,
        retail_price:       price,
        cash_floor:         price,
        min_price:          price,
        taxonomy_status:    'review',
        stock_status:       'In Stock',
        warranty:           customProductWarranty.trim() || null,
        import_date:        new Date().toISOString().slice(0, 10),
      });
      setLines(ls => [...ls, {
        id,
        name,
        model:             customProductModel.trim() || name,
        qty:               1,
        unitPrice:         price,
        category:          customProductCategory,
        warranty:          customProductWarranty.trim(),
        keySpec:           customProductKeySpec.trim(),
        kwhPerMonth:       0,
        savingsPct:        0,
        minPrice:          price,
        floorPrice:        price,
        overrideReason:    '',
        displayPrefix:     '',
        packageNote:       '',
        isPackage:         false,
        packageComponents: [],
      }]);
      setToastMsg(`"${name}" saved to DB for review and added to quote`);
      setCustomProductName(''); setCustomProductModel(''); setCustomProductBrand('');
      setCustomProductCategory('General'); setCustomProductPrice('');
      setCustomProductWarranty(''); setCustomProductKeySpec('');
      setShowCustomProductForm(false);
    } catch {
      setToastMsg('Failed to save custom product — check console');
    } finally {
      setSavingCustomProduct(false);
    }
  }

  function addCustomService() {
    const name   = customServiceName.trim();
    const amount = Number(customServiceAmount) || 0;
    if (!name) return;
    setServices(prev => [...prev, {
      service_type:   `custom_${Date.now()}`,
      service_name:   name,
      description:    customServiceDesc.trim(),
      status:         customServiceStatus,
      visible_value:  customServiceStatus === 'charged' ? amount : 0,
      charged_amount: customServiceStatus === 'charged' ? amount : 0,
    }]);
    setToastMsg(`"${name}" added to services`);
    setCustomServiceName(''); setCustomServiceDesc('');
    setCustomServiceStatus('charged'); setCustomServiceAmount('');
    setShowCustomServiceForm(false);
  }

  function updateLine(id: string, field: 'qty' | 'unitPrice', val: number) {
    setLines(ls => ls.map(l => l.id === id ? { ...l, [field]: val } : l));
  }

  function updateLineText(id: string, field: 'warranty' | 'keySpec' | 'displayPrefix' | 'packageNote', val: string) {
    setLines(ls => ls.map(l => l.id === id ? { ...l, [field]: val } : l));
  }

  function togglePackage(id: string) {
    setLines(ls => ls.map(l => {
      if (l.id !== id) return l;
      const becoming = !l.isPackage;
      return {
        ...l,
        isPackage: becoming,
        packageComponents: becoming && l.packageComponents.length === 0
          ? (DEFAULT_PACKAGE_COMPONENTS[l.id] ?? [])
          : l.packageComponents,
      };
    }));
  }

  function updateComponent(lineId: string, idx: number, patch: Partial<PackageComponent>) {
    setLines(ls => ls.map(l => {
      if (l.id !== lineId) return l;
      const comps = [...l.packageComponents];
      comps[idx] = { ...comps[idx], ...patch };
      return { ...l, packageComponents: comps };
    }));
  }

  function addComponent(lineId: string) {
    const newComp: PackageComponent = {
      id: `custom-${Date.now()}`, name: '', qty: 1, keySpec: '', warranty: '',
      group: 'core', status: 'included', addonPrice: 0, hidden: false,
    };
    setLines(ls => ls.map(l => l.id === lineId
      ? { ...l, packageComponents: [...l.packageComponents, newComp] } : l));
  }

  function removeComponent(lineId: string, idx: number) {
    setLines(ls => ls.map(l => l.id === lineId
      ? { ...l, packageComponents: l.packageComponents.filter((_, i) => i !== idx) } : l));
  }

  function resetComponents(lineId: string) {
    setLines(ls => ls.map(l => l.id === lineId
      ? { ...l, packageComponents: DEFAULT_PACKAGE_COMPONENTS[l.id] ?? [] } : l));
  }

  function updateLineOverride(id: string, val: string) {
    setLines(ls => ls.map(l => l.id === id ? { ...l, overrideReason: val } : l));
  }

  function updateLineKwh(id: string, val: number) {
    setLines(ls => ls.map(l => l.id === id ? { ...l, kwhPerMonth: val } : l));
  }

  function removeLine(id: string) { setLines(ls => ls.filter(l => l.id !== id)); }

  function updateService(index: number, patch: Partial<InvoiceService>) {
    setServices(prev => prev.map((s, i) => i === index ? { ...s, ...patch } : s));
  }

  const totals = calcGrandTotal(
    lines, services,
    discountMode,
    discountMode === 'fixed' ? discountFixed : discount
  );
  const subtotal = totals.subtotal;
  const serviceTotal = totals.serviceTotal;
  const discountAmt = totals.discountAmt;
  const grandTotal = totals.grandTotal;
  const customChargesTotal = customCharges.reduce((s, c) => s + c.amount, 0);
  const effectiveTotal = grandTotal + customChargesTotal;

  const srJobTotal = srJobLines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
  const srCustomTotal = docType === 'service_receipt' ? customCharges.reduce((s, c) => s + c.amount, 0) : 0;
  const srBaseTotal = srJobTotal + srCustomTotal;
  const srDiscountAmt = docType === 'service_receipt'
    ? (discountMode === 'fixed' ? Math.min(discountFixed, srBaseTotal) : Math.round(srBaseTotal * discount / 100))
    : 0;
  const srGrandTotal = srBaseTotal - srDiscountAmt;

  const hasUnapprovedFloorViolation = lines.some(l => {
    const r = validateFloor(l.unitPrice, l.minPrice);
    return !r.valid && !l.overrideReason.trim();
  });

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
    if (docType !== 'service_receipt' && !lines.length || pdfState === 'generating') return;
    setPdfState('generating');
    setGenerating(true);
    const timeout = setTimeout(() => {
      setPdfState('error');
      setGenerating(false);
    }, 15000);
    try {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      let blob: Blob;
      if (docType === 'service_receipt') {
        blob = await generateServiceReceiptPdf({
          customerName,
          customerPhone: customerPhone.replace(/\D/g, ''),
          customerEmail,
          customerAddress,
          refNumber,
          deviceBrand: srDeviceBrand,
          deviceModel: srDeviceModel,
          faultDesc: srFaultDesc,
          jobLines: srJobLines,
          warrantyDays: srWarrantyDays,
          customCharges: customCharges.map(({ name, amount }) => ({ name, amount })),
          discount: discountMode === 'fixed' ? discountFixed : discount,
          discountMode,
          discountType,
          discountReason,
          notes: invoiceNotes,
          preparedBy,
          showNtn,
        });
      } else {
        const instLines: Array<{ name: string; amount: number }> = installationType === 'installation-included'
          ? [
              ...(elevatedStructureOn && elevatedStructureAmt > 0 ? [{ name: 'Elevated Structure (per panel)', amount: elevatedStructureAmt }] : []),
              ...(wiringAmt > 0 ? [{ name: 'Wiring & Cabling', amount: wiringAmt }] : []),
              ...(laborAmt > 0 ? [{ name: 'Installation Labour', amount: laborAmt }] : []),
            ]
          : [];
        blob = await generateQuotationPdf({
          customerName,
          customerPhone: customerPhone.replace(/\D/g, ''),
          customerEmail,
          customerAddress,
          customerCnic,
          customerType,
          customerArea,
          isExistingCustomer,
          lines,
          services,
          discount: discountMode === 'fixed' ? discountFixed : discount,
          discountMode,
          discountType,
          discountReason,
          docType: docType as 'quotation' | 'invoice',
          saleType,
          refNumber,
          preparedBy,
          stockStatus,
          validityHours,
          installationType,
          installationLines: instLines,
          advancePct,
          advanceAmtFixed: advanceMode === 'fixed' && advanceFixedAmt > 0 ? advanceFixedAmt : undefined,
          cashPaySchedule: cashPaySchedule.length > 0 ? cashPaySchedule.map(({ date, amount, note }) => ({ date, amount, note })) : undefined,
          balanceNote,
          advancePaid,
          deliveryEta,
          showNtn,
          customCharges: customCharges.map(({ name, amount }) => ({ name, amount })),
          instTotalPrice: saleType === 'installment' ? instTotalPrice : undefined,
          instAdvanceAmt: saleType === 'installment' ? instAdvanceAmt : undefined,
          instMonths: saleType === 'installment' ? instMonths : undefined,
          instMonthlyAmt: saleType === 'installment' ? instMonthlyAmt : undefined,
          instFirstDate: saleType === 'installment' ? instFirstDate : undefined,
          instTeaserMonthly: saleType !== 'installment' && grandTotal > 0 ? Math.round(grandTotal * 1.25 / 12) : undefined,
          instTeaserMonths: 12,
        });
      }
      clearTimeout(timeout);
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      const a = document.createElement('a');
      a.href = url; a.download = `${(customerName || 'Customer').replace(/[/\\:*?"<>|]/g, '').trim()} - ${refNumber}.pdf`; a.click();
      const logPayload: InvoiceLogPayload = {
        refNumber,
        docType: docType as 'quotation' | 'invoice' | 'installment-invoice' | 'installment_payment_receipt' | 'service_receipt',
        customerName, customerPhone: customerPhone.replace(/\D/g, ''),
        customerEmail, customerAddress, customerCnic,
        customerType, serviceLevel, discountReason,
        lines: docType === 'service_receipt'
          ? srJobLines.map(l => ({
              id: l.id,
              name: l.description,
              model: '',
              qty: l.qty,
              unitPrice: l.unitPrice,
              category: l.type === 'work' ? 'Service Work' : 'Spare Part',
              warranty: '',
              keySpec: '',
              kwhPerMonth: 0,
              savingsPct: 0,
              minPrice: 0,
              floorPrice: 0,
              overrideReason: '',
              displayPrefix: '',
              packageNote: '',
              isPackage: false,
              packageComponents: [],
            }))
          : lines,
        services, discount, discountType,
        grandTotal: docType === 'service_receipt' ? srGrandTotal : effectiveTotal, serviceTotal, advancePct,
        instTotalPrice: saleType === 'installment' ? instTotalPrice : 0,
        instAdvanceAmt: saleType === 'installment' ? instAdvanceAmt : 0,
        instMonths: saleType === 'installment' ? instMonths : 0,
        instMonthlyAmt: saleType === 'installment' ? instMonthlyAmt : 0,
        instFirstDate,
        customCharges: customCharges.map(({ name, amount }) => ({ name, amount })),
        guarantorName, guarantorPhone, guarantorCnic,
        notes: (() => {
          if (docType !== 'service_receipt') return invoiceNotes;
          const devicePart = [srDeviceBrand, srDeviceModel].filter(Boolean).join(' ');
          const parts = ['Device: ' + devicePart, 'Fault: ' + (srFaultDesc || '—')];
          if (srWarrantyDays > 0) parts.push('Warranty: ' + srWarrantyDays + ' days');
          const prefix = parts.length ? '[' + parts.join(' | ') + ']' : '';
          return [prefix, invoiceNotes].filter(Boolean).join('\n\n');
        })(),
      };
      if (editingInvoiceId) {
        updateInvoiceInSupabase(editingInvoiceId, logPayload);
      } else {
        logInvoiceToSupabase(logPayload);
      } // fire-and-forget
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
        customerEmail, customerAddress, customerCnic,
        lines, discount, refNumber,
        instTotalPrice, instAdvanceAmt, instMonths, instMonthlyAmt, instFirstDate, showNtn,
        isApartmentClient: customerType === 'apartment',
        services,
        customCharges: customCharges.map(({ name, amount }) => ({ name, amount })),
        guarantorName, guarantorPhone, guarantorCnic,
        discountMode,
      });
      clearTimeout(timeout);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${(customerName || 'Customer').replace(/[/\\:*?"<>|]/g, '').trim()} - ${refNumber}.pdf`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      const advPayload: InvoiceLogPayload = {
        refNumber, docType: 'installment-invoice',
        customerName, customerPhone: customerPhone.replace(/\D/g, ''),
        customerEmail, customerAddress, customerCnic,
        customerType, serviceLevel, discountReason,
        lines, services, discount, discountType,
        grandTotal: effectiveTotal, serviceTotal, advancePct: 0,
        instTotalPrice, instAdvanceAmt, instMonths, instMonthlyAmt, instFirstDate,
        customCharges: customCharges.map(({ name, amount }) => ({ name, amount })),
        guarantorName, guarantorPhone, guarantorCnic,
        notes: invoiceNotes,
      };
      if (editingInvoiceId) {
        updateInvoiceInSupabase(editingInvoiceId, advPayload);
      } else {
        logInvoiceToSupabase(advPayload);
      }
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
        customerEmail, customerAddress, customerCnic,
        lines, discount, refNumber,
        instTotalPrice, instAdvanceAmt, instMonths, instMonthlyAmt, instFirstDate,
        paymentNumber: instPaymentNumber, showNtn,
        customCharges: customCharges.map(({ name, amount }) => ({ name, amount })),
      });
      clearTimeout(timeout);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${(customerName || 'Customer').replace(/[/\\:*?"<>|]/g, '').trim()} - ${refNumber}.pdf`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      logInvoiceToSupabase({
        refNumber: `${refNumber}-P${instPaymentNumber}`,
        docType: 'installment_payment_receipt',
        customerName, customerPhone: customerPhone.replace(/\D/g, ''),
        customerEmail, customerAddress, customerCnic,
        customerType, serviceLevel, discountReason,
        lines, services, discount, discountType,
        grandTotal, serviceTotal, advancePct: 0,
        instTotalPrice, instAdvanceAmt, instMonths, instMonthlyAmt, instFirstDate,
      });
      setInstPayPdfState('success');
      setTimeout(() => setInstPayPdfState('idle'), 3000);
    } catch {
      clearTimeout(timeout);
      setInstPayPdfState('error');
    }
  }

  const phoneDigits = customerPhone.replace(/\D/g, '');
  const waFallbackPhone = phoneDigits.length >= 10 ? phoneDigits : '';
  const waDocLabel = docType === 'invoice' ? 'Invoice'
    : docType === 'installment-invoice' ? 'Installment Invoice'
    : 'Quotation';
  const waText = encodeURIComponent(
    generateWhatsAppSummary({
      refNumber,
      docLabel:        waDocLabel,
      customerName,
      customerPhone,
      customerAddress,
      lines:           lines.map(l => ({ name: l.name, model: l.model, qty: l.qty, unitPrice: l.unitPrice })),
      services,
      discountAmt,
      grandTotal,
      instTotalPrice,
      instAdvanceAmt,
      instMonths,
      instMonthlyAmt,
    })
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

      {editingInvoiceId && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-blue-800">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span><span className="font-bold">Editing</span> — changes will update invoice <span className="font-mono">{refNumber}</span> in the database.</span>
          </div>
          <button
            onClick={() => {
              setEditingInvoiceId(null);
              setRefNumber(generateRefNumber());
            }}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 whitespace-nowrap">
            ✕ Cancel edit
          </button>
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
            ['service_receipt', 'Service Receipt'],
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
          <input value={customerEmail} onChange={e => setCustomerEmail(e.target.value)}
            placeholder="Email (optional)"
            type="email"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
          <input value={customerAddress} onChange={e => setCustomerAddress(e.target.value)}
            placeholder="Delivery address (optional)"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
          {docType === 'service_receipt' && (
            <>
              <div className="border-t border-gray-100 pt-3 space-y-3">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Device / Equipment</p>
                <div className="grid grid-cols-2 gap-3">
                  <input value={srDeviceBrand} onChange={e => setSrDeviceBrand(e.target.value)}
                    placeholder="Brand (e.g. Haier)"
                    className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                  <input value={srDeviceModel} onChange={e => setSrDeviceModel(e.target.value)}
                    placeholder="Model / Type"
                    className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                </div>
                <textarea value={srFaultDesc} onChange={e => setSrFaultDesc(e.target.value)}
                  placeholder="Fault reported by customer"
                  rows={2}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none" />
                <div className="flex items-center gap-3">
                  <label className="text-xs font-semibold text-gray-600 shrink-0">Warranty on work</label>
                  <input type="number" min={0} value={srWarrantyDays || ''}
                    onChange={e => setSrWarrantyDays(Math.max(0, Number(e.target.value) || 0))}
                    placeholder="days (0 = none)"
                    className="w-28 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                  <span className="text-xs text-gray-400">days</span>
                </div>
              </div>
            </>
          )}
          {docType !== 'service_receipt' && (<>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Property Type</label>
              <select
                value={customerType}
                onChange={e => setCustomerType(e.target.value as 'house' | 'apartment' | 'commercial')}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
              >
                <option value="house">House</option>
                <option value="apartment">Apartment / Flat</option>
                <option value="commercial">Commercial</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Service Level</label>
              <select
                value={serviceLevel}
                onChange={e => setServiceLevel(e.target.value as 'supply_only' | 'supply_install' | 'full_service')}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
              >
                <option value="supply_only">Supply Only</option>
                <option value="supply_install">Supply + Install</option>
                <option value="full_service">360° Full Service</option>
              </select>
            </div>
          </div>
          {docType === 'installment-invoice' && (
            <input value={customerCnic} onChange={e => setCustomerCnic(e.target.value)}
              placeholder="CNIC (required for installment)"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
          )}
          {/* Sale type */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Sale Type</label>
            <div className="flex rounded-xl overflow-hidden border border-gray-200 text-sm">
              {(['cash', 'installment'] as const).map(t => (
                <button key={t} onClick={() => setSaleType(t)}
                  className={`flex-1 py-2 font-semibold transition-colors ${saleType === t ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                  {t === 'cash' ? 'Cash' : 'Installment'}
                </button>
              ))}
            </div>
          </div>
          {/* Prepared by + Stock status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Prepared By</label>
              <input value={preparedBy} onChange={e => setPreparedBy(e.target.value)}
                placeholder="Staff name"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Stock Status</label>
              <select value={stockStatus} onChange={e => setStockStatus(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400">
                <option value="In stock · confirm before payment">In stock · confirm before payment</option>
                <option value="In stock · ready to ship">In stock · ready to ship</option>
                <option value="Limited stock · confirm urgently">Limited stock · confirm urgently</option>
                <option value="Pre-order · 3–5 days">Pre-order · 3–5 days</option>
                <option value="Check availability">Check availability</option>
              </select>
            </div>
          </div>
          {/* Customer area + Existing customer */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Area</label>
              <input value={customerArea} onChange={e => setCustomerArea(e.target.value)}
                placeholder="e.g. Malir · Karachi"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Existing Customer?</label>
              <select value={isExistingCustomer === null ? '' : String(isExistingCustomer)}
                onChange={e => setIsExistingCustomer(e.target.value === '' ? null : e.target.value === 'true')}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400">
                <option value="">Unknown</option>
                <option value="true">Yes · Returning</option>
                <option value="false">No · New customer</option>
              </select>
            </div>
          </div>
          {/* Delivery ETA + Validity hours (validity only for quotations) */}
          <div className={docType === 'invoice' ? '' : 'grid grid-cols-2 gap-3'}>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Delivery ETA</label>
              <select value={deliveryEta} onChange={e => setDeliveryEta(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400">
                <option value="24–48h after payment">24–48h after payment</option>
                <option value="Same day (if ordered before 2pm)">Same day (if ordered before 2pm)</option>
                <option value="3–5 business days">3–5 business days</option>
                <option value="7–10 business days">7–10 business days</option>
                <option value="On order placement">On order placement</option>
              </select>
            </div>
            {docType !== 'invoice' && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Validity</label>
              <select value={validityHours} onChange={e => setValidityHours(Number(e.target.value) as 24 | 48 | 72 | 168)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400">
                <option value={24}>24 hours</option>
                <option value={48}>48 hours</option>
                <option value={72}>72 hours</option>
                <option value={168}>7 days</option>
              </select>
            </div>
            )}
          </div>
          {/* Advance paid toggle */}
          <label className="flex items-center gap-2 cursor-pointer w-fit">
            <input type="checkbox" checked={advancePaid} onChange={e => setAdvancePaid(e.target.checked)}
              className="w-4 h-4 accent-orange-500 rounded" />
            <span className="text-xs text-gray-500">Advance already paid (removes WA payment proof note)</span>
          </label>
          </>)}
          {docType === 'service_receipt' && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Prepared By</label>
              <input value={preparedBy} onChange={e => setPreparedBy(e.target.value)}
                placeholder="Staff name"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
          )}
          {/* Discount mode toggle + input */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-gray-600 shrink-0">Discount</label>
              <div className="flex rounded-lg overflow-hidden border border-gray-200 text-xs">
                {(['percentage', 'fixed'] as const).map(mode => (
                  <button key={mode} onClick={() => setDiscountMode(mode)}
                    className={`px-3 py-1.5 font-semibold transition-colors ${discountMode === mode ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                    {mode === 'percentage' ? '%' : 'PKR'}
                  </button>
                ))}
              </div>
              {discountMode === 'percentage' ? (
                <input
                  type="text" inputMode="numeric" value={discountRaw}
                  onChange={e => {
                    const raw = e.target.value.replace(/[^0-9]/g, '');
                    setDiscountRaw(raw);
                    setDiscount(Math.min(100, Math.max(0, Number(raw) || 0)));
                  }}
                  onBlur={() => {
                    const n = Math.min(100, Math.max(0, Number(discountRaw) || 0));
                    setDiscount(n); setDiscountRaw(String(n));
                  }}
                  placeholder="0"
                  className="w-20 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              ) : (
                <input
                  type="text" inputMode="numeric" value={discountFixedRaw}
                  onChange={e => {
                    const raw = e.target.value.replace(/[^0-9]/g, '');
                    setDiscountFixedRaw(raw);
                    setDiscountFixed(Math.max(0, Number(raw) || 0));
                  }}
                  onBlur={() => {
                    const n = Math.max(0, Number(discountFixedRaw) || 0);
                    setDiscountFixed(n); setDiscountFixedRaw(String(n));
                  }}
                  placeholder="0"
                  className="w-28 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              )}
              <select value={discountType} onChange={e => setDiscountType(e.target.value)}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white">
                {["Promotional", "MYOP", "Exchange Credit", "Seasonal Sale", "Founder's Special", "Clearance", "Volume", "Custom"].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            {(discountMode === 'percentage' ? discount > 0 : discountFixed > 0) && (
              <input
                value={discountReason}
                onChange={e => setDiscountReason(e.target.value)}
                placeholder="Discount reason (required)"
                className={`w-full border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 ${
                  !discountReason.trim() ? 'border-red-300' : 'border-gray-200'
                }`}
              />
            )}
          </div>
          {/* ── Installation scope (solar items only) ── */}
          {hasSolarItems && (
            <div className="space-y-2 pt-1 border-t border-gray-100">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Installation</p>
              <div className="flex gap-2">
                <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                  installationType === 'supply-only' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'
                }`}>
                  {installationType === 'supply-only' ? 'Supply Only' : 'With Installation'}
                </span>
                <span className="text-xs text-gray-400 self-center">(set via Service Level above)</span>
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
              {/* Advance — % or fixed PKR */}
              <div className="flex items-center gap-2 flex-wrap">
                <label className="text-xs font-semibold text-gray-600 shrink-0">Advance</label>
                <div className="flex rounded-lg overflow-hidden border border-gray-200 text-xs">
                  {(['pct', 'fixed'] as const).map(m => (
                    <button key={m} onClick={() => setAdvanceMode(m)}
                      className={`px-2.5 py-1.5 font-semibold transition-colors ${advanceMode === m ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                      {m === 'pct' ? '%' : 'PKR'}
                    </button>
                  ))}
                </div>
                {advanceMode === 'pct' ? (
                  <>
                    <input type="number" min={0} max={100} value={advancePct}
                      onChange={e => setAdvancePct(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                      className="w-20 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                    {effectiveTotal > 0 && <span className="text-xs text-gray-400">= PKR {Math.round(effectiveTotal * advancePct / 100).toLocaleString('en-PK')} · Balance: {100 - advancePct}%</span>}
                  </>
                ) : (
                  <>
                    <input type="number" min={0} value={advanceFixedAmt || ''}
                      onChange={e => {
                        const v = Math.max(0, Number(e.target.value) || 0);
                        setAdvanceFixedAmt(v);
                        if (effectiveTotal > 0) setAdvancePct(Math.round(v / effectiveTotal * 100));
                      }}
                      placeholder="0"
                      className="w-32 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                    {effectiveTotal > 0 && advanceFixedAmt > 0 && (
                      <span className="text-xs text-gray-400">
                        ≈ {Math.round(advanceFixedAmt / effectiveTotal * 100)}% · Balance: PKR {(effectiveTotal - advanceFixedAmt).toLocaleString('en-PK')}
                      </span>
                    )}
                  </>
                )}
              </div>
              {/* Balance due note */}
              {cashPaySchedule.length === 0 && (
                <div className="flex items-center gap-3">
                  <label className="text-xs font-semibold text-gray-600 shrink-0">Balance due on</label>
                  <input type="text" value={balanceNote}
                    onChange={e => setBalanceNote(e.target.value)}
                    placeholder="delivery / installation"
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                </div>
              )}
              {/* Deferred payment schedule (cash, ≤30 days) */}
              <div className="pt-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Deferred Payment Schedule <span className="font-normal normal-case">(≤ 30 days)</span></p>
                    <button
                      onClick={() => {
                        const today = new Date().toISOString().slice(0, 10);
                        setCashPaySchedule(prev => [...prev, { id: crypto.randomUUID(), date: today, amount: 0, note: '' }]);
                      }}
                      className="px-2.5 py-1 text-[10px] font-semibold bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors">
                      + Add Row
                    </button>
                  </div>
                  {cashPaySchedule.length === 0 && (
                    <p className="text-[10px] text-gray-400">Optional — add rows for split payments. Replaces advance/balance on the invoice.</p>
                  )}
                  {(() => {
                    const maxDate = new Date();
                    maxDate.setDate(maxDate.getDate() + 30);
                    const maxStr = maxDate.toISOString().slice(0, 10);
                    const today = new Date().toISOString().slice(0, 10);
                    const schedTotal = cashPaySchedule.reduce((s, r) => s + r.amount, 0);
                    return (
                      <>
                        {cashPaySchedule.map((row, i) => (
                          <div key={row.id} className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-400 w-4 shrink-0">{i + 1}</span>
                            <input type="date" value={row.date} min={today} max={maxStr}
                              onChange={e => setCashPaySchedule(prev => prev.map((r, j) => j === i ? { ...r, date: e.target.value } : r))}
                              className="border border-gray-200 rounded-xl px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-orange-400" />
                            <input type="number" min={0} value={row.amount || ''}
                              onChange={e => setCashPaySchedule(prev => prev.map((r, j) => j === i ? { ...r, amount: Number(e.target.value) || 0 } : r))}
                              placeholder="Amount"
                              className="w-28 border border-gray-200 rounded-xl px-2 py-1.5 text-xs text-right focus:outline-none focus:ring-2 focus:ring-orange-400" />
                            <input value={row.note}
                              onChange={e => setCashPaySchedule(prev => prev.map((r, j) => j === i ? { ...r, note: e.target.value } : r))}
                              placeholder="Label (e.g. Advance, On delivery)"
                              className="flex-1 border border-gray-200 rounded-xl px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-orange-400" />
                            <button onClick={() => setCashPaySchedule(prev => prev.filter((_, j) => j !== i))}
                              className="text-gray-300 hover:text-red-500 transition-colors">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                        {cashPaySchedule.length > 0 && (
                          <div className={`flex justify-between text-xs font-semibold px-1 ${schedTotal !== effectiveTotal && effectiveTotal > 0 ? 'text-red-600' : 'text-green-700'}`}>
                            <span>Schedule total: PKR {schedTotal.toLocaleString('en-PK')}</span>
                            {effectiveTotal > 0 && schedTotal !== effectiveTotal && (
                              <span>≠ invoice total PKR {effectiveTotal.toLocaleString('en-PK')}</span>
                            )}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              <label className="flex items-center gap-2 cursor-pointer w-fit">
                <input type="checkbox" checked={showNtn} onChange={e => setShowNtn(e.target.checked)}
                  className="w-4 h-4 accent-orange-500 rounded" />
                <span className="text-xs text-gray-500">Include NTN in footer</span>
              </label>
            </div>
          )}

          {/* ── Installment plan (installment-invoice only) ── */}
          {docType === 'installment-invoice' && (
            <div className="space-y-3 pt-1 border-t border-gray-100">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Installment Plan</p>
              {/* Quick-select plan buttons from calcAllPlans */}
              {grandTotal > 0 && (() => {
                const plans = calcAllPlans(grandTotal);
                return Object.keys(plans).length > 0 ? (
                  <div className="space-y-1.5">
                    <p className="text-[10px] text-gray-400 font-medium">Auto-fill from installment rates:</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(plans).map(([key, plan]) => (
                        <button key={key} onClick={() => {
                          setInstTotalPrice(plan.total);
                          setInstAdvanceAmt(plan.advance);
                          setInstMonths(plan.months);
                          setInstMonthlyAmt(plan.monthly);
                        }}
                          className="px-3 py-1.5 text-xs font-semibold bg-orange-50 hover:bg-orange-500 hover:text-white text-orange-700 border border-orange-200 rounded-lg transition-colors">
                          {key} · PKR {plan.monthly.toLocaleString('en-PK')}/mo
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Total Price (PKR)', value: instTotalPrice || '', setter: (v: number) => setInstTotalPrice(v), unit: 'PKR', wide: true },
                  { label: 'Advance (PKR)',     value: instAdvanceAmt || '', setter: (v: number) => setInstAdvanceAmt(v), unit: 'PKR', wide: true },
                  { label: 'Monthly Amount (PKR)', value: instMonthlyAmt || '', setter: (v: number) => setInstMonthlyAmt(v), unit: 'PKR', wide: true },
                  { label: 'Months',            value: instMonths,           setter: (v: number) => setInstMonths(Math.max(1, Math.min(24, v))), unit: 'mo', wide: false },
                ].map(({ label, value, setter, unit }) => (
                  <div key={label}>
                    <label className="text-[10px] font-bold text-gray-500 block mb-1">{label}</label>
                    <div className="flex items-center gap-1">
                      <input type="number" min={0} value={value as number}
                        onChange={e => setter(Math.max(0, Number(e.target.value) || 0))}
                        placeholder="0"
                        className="flex-1 min-w-0 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                      <span className="text-xs text-gray-400 shrink-0">{unit}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 block mb-1">First Installment Date</label>
                <input type="date" value={instFirstDate}
                  onChange={e => setInstFirstDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
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
                <div>
                  <label className="text-[10px] font-bold text-gray-500 block mb-1">Installment # (of {instMonths})</label>
                  <input type="number" min={1} max={instMonths} value={instPaymentNumber}
                    onChange={e => setInstPaymentNumber(Math.max(1, Math.min(instMonths, Number(e.target.value) || 1)))}
                    className="w-28 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                </div>
              </div>
              {/* Guarantor */}
              <div className="pt-1 border-t border-gray-100 space-y-2">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Guarantor <span className="font-normal text-gray-400 normal-case">(optional)</span></p>
                <input value={guarantorName} onChange={e => setGuarantorName(e.target.value)}
                  placeholder="Guarantor name"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                <div className="grid grid-cols-2 gap-2">
                  <input value={guarantorPhone} onChange={e => setGuarantorPhone(e.target.value)}
                    placeholder="Guarantor phone"
                    className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                  <input value={guarantorCnic} onChange={e => setGuarantorCnic(e.target.value)}
                    placeholder="Guarantor CNIC"
                    className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Service Job Lines panel (service_receipt only) ── */}
        {docType === 'service_receipt' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Work &amp; Parts</p>
              <div className="flex gap-2">
                <button onClick={() => setSrJobLines(prev => [...prev, {id: crypto.randomUUID(), type: 'work', description: '', qty: 1, unitPrice: 0}])}
                  className="px-3 py-1.5 text-xs font-semibold bg-gray-900 hover:bg-gray-800 text-white rounded-lg">
                  + Work Item
                </button>
                <button onClick={() => setSrJobLines(prev => [...prev, {id: crypto.randomUUID(), type: 'part', description: '', qty: 1, unitPrice: 0}])}
                  className="px-3 py-1.5 text-xs font-semibold bg-orange-500 hover:bg-orange-600 text-white rounded-lg">
                  + Part
                </button>
              </div>
            </div>
            {srJobLines.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-4">Add work performed and parts used above.</p>
            )}
            {srJobLines.map((jl, i) => (
              <div key={jl.id} className={`flex items-start gap-2 p-3 rounded-xl border ${jl.type === 'part' ? 'border-orange-100 bg-orange-50/30' : 'border-gray-100 bg-gray-50/30'}`}>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${jl.type === 'part' ? 'bg-orange-100 text-orange-700' : 'bg-gray-200 text-gray-600'}`}>
                      {jl.type === 'work' ? 'WORK' : 'PART'}
                    </span>
                    <button onClick={() => setSrJobLines(prev => prev.map((l,j) => j===i ? {...l, type: l.type==='work'?'part':'work'} : l))}
                      className="text-[10px] text-blue-500 hover:text-blue-700 underline">
                      switch
                    </button>
                  </div>
                  <input value={jl.description}
                    onChange={e => setSrJobLines(prev => prev.map((l,j) => j===i ? {...l, description: e.target.value} : l))}
                    placeholder={jl.type === 'work' ? 'e.g. Compressor repair, Gas recharge' : 'e.g. Capacitor 35µF, Fan motor belt'}
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-orange-400" />
                  <div className="flex gap-2">
                    <input type="number" min={1} value={jl.qty}
                      onChange={e => setSrJobLines(prev => prev.map((l,j) => j===i ? {...l, qty: Math.max(1, Number(e.target.value))} : l))}
                      className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-1 focus:ring-orange-400" placeholder="Qty" />
                    <input type="number" min={0} value={jl.unitPrice || ''}
                      onChange={e => setSrJobLines(prev => prev.map((l,j) => j===i ? {...l, unitPrice: Number(e.target.value)||0} : l))}
                      className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-orange-400" placeholder="PKR amount" />
                    <span className="text-xs font-bold text-gray-700 self-center whitespace-nowrap">= {(jl.qty * jl.unitPrice).toLocaleString('en-PK')}</span>
                  </div>
                </div>
                <button onClick={() => setSrJobLines(prev => prev.filter((_,j) => j!==i))}
                  className="text-gray-300 hover:text-red-500 mt-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            {srJobLines.length > 0 && (
              <div className="flex justify-between text-sm font-bold text-gray-900 pt-2 border-t border-gray-100">
                <span>Total</span>
                <span>PKR {srJobTotal.toLocaleString('en-PK')}</span>
              </div>
            )}
          </div>
        )}

        {/* ── Package Templates panel ── */}
        {docType !== 'service_receipt' && <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Packages</p>
            <div className="flex gap-2">
              {lines.length > 0 && (
                <button onClick={() => setPkgPanelOpen(o => !o)}
                  className="px-3 py-1.5 text-xs font-semibold bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors">
                  {pkgPanelOpen ? 'Cancel' : 'Save as Package'}
                </button>
              )}
              <button onClick={fetchTemplates}
                className="px-3 py-1.5 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors">
                ↻ Refresh
              </button>
            </div>
          </div>

          {/* Save form */}
          {pkgPanelOpen && (
            <div className="bg-orange-50 rounded-xl p-4 space-y-2 border border-orange-100">
              <p className="text-xs font-bold text-orange-700 mb-1">Save current {lines.length} items as a package</p>
              <input value={pkgName} onChange={e => setPkgName(e.target.value)}
                placeholder="Package name  e.g. Home Starter Bundle"
                className="w-full border border-orange-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white" />
              <input value={pkgDesc} onChange={e => setPkgDesc(e.target.value)}
                placeholder="Description (optional)"
                className="w-full border border-orange-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white" />
              <select value={pkgTag} onChange={e => setPkgTag(e.target.value)}
                className="w-full border border-orange-200 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-orange-400">
                <option value="">Category tag (optional)</option>
                {['home-starter','kitchen','solar','office','commercial','bedroom'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <button onClick={saveAsPackage} disabled={!pkgName.trim() || savingPkg}
                className="w-full py-2 text-xs font-bold bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white rounded-lg transition-colors">
                {savingPkg ? 'Saving…' : 'Save Package'}
              </button>
            </div>
          )}

          {/* Template list */}
          {templates.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-3">
              No packages saved yet. Build a quote and click "Save as Package".
            </p>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {templates.map(tmpl => {
                const total = (tmpl.lines as QuoteLine[]).reduce((s, l) => s + l.qty * l.unitPrice, 0);
                const discountedTotal = Math.round(total * (1 - (tmpl.discount ?? 0) / 100));
                return (
                  <div key={tmpl.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-orange-200 hover:bg-orange-50/30 transition-all group">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-gray-800 truncate">{tmpl.name}</p>
                        {tmpl.category_tag && (
                          <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full shrink-0">{tmpl.category_tag}</span>
                        )}
                      </div>
                      {tmpl.description && <p className="text-[10px] text-gray-400 truncate mt-0.5">{tmpl.description}</p>}
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        {(tmpl.lines as QuoteLine[]).length} items · PKR {discountedTotal.toLocaleString('en-PK')}
                        {tmpl.discount > 0 && <span className="text-orange-500 ml-1">({tmpl.discount}% off)</span>}
                      </p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button onClick={() => loadTemplate(tmpl)}
                        className="px-3 py-1.5 text-xs font-semibold bg-gray-900 hover:bg-orange-500 text-white rounded-lg transition-colors">
                        Load
                      </button>
                      <button onClick={() => deleteTemplate(tmpl.id)}
                        className="px-2 py-1.5 text-xs text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Website Packages ── */}
          <div className="pt-3 border-t border-gray-100 space-y-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Website Packages</p>
            <p className="text-[10px] text-gray-400">Green Corridor</p>
            <div className="space-y-1.5">
              {GC_PACKAGES.map(pkg => (
                <div key={pkg.id} className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-gray-100 hover:border-green-200 hover:bg-green-50/30 transition-all">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-800">{pkg.name}</p>
                    <p className="text-[10px] text-gray-400 truncate">{pkg.solarKw}kW · {pkg.acCount}× {pkg.acTonnage} AC · {pkg.billReduction} bill saving</p>
                    <p className="text-[10px] text-green-700 font-semibold">PKR {pkg.price.toLocaleString('en-PK')}</p>
                  </div>
                  <button onClick={() => {
                    const gcId = `gc-${pkg.id}`;
                    const line: QuoteLine = {
                      id: gcId,
                      name: `${pkg.name} — Green Corridor Package`,
                      model: `GC-${pkg.id.toUpperCase()}`,
                      qty: 1,
                      unitPrice: pkg.price,
                      category: 'Solar',
                      warranty: `${pkg.workmanshipWarranty} workmanship · ${pkg.inverterWarranty} inverter${pkg.batteryWarranty ? ` · ${pkg.batteryWarranty} battery` : ''}`,
                      keySpec: `${pkg.solarKw}kW solar · ${pkg.acCount}× ${pkg.acTonnage} AC · ${pkg.billReduction} bill reduction`,
                      kwhPerMonth: Math.round((pkg.monthlyUnitsMin + pkg.monthlyUnitsMax) / 2),
                      savingsPct: 60,
                      minPrice: pkg.price,
                      floorPrice: pkg.price,
                      overrideReason: '',
                      displayPrefix: '',
                      packageNote: '',
                      isPackage: false,
                      packageComponents: [],
                    };
                    setLines(ls => ls.some(l => l.id === line.id) ? ls : [...ls, line]);
                  }}
                    className="px-3 py-1.5 text-xs font-semibold bg-gray-900 hover:bg-green-600 text-white rounded-lg transition-colors shrink-0">
                    Add
                  </button>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-gray-400 pt-1">Solar / UPS Systems</p>
            <div className="space-y-1.5">
              {SOLAR_PACKAGES.map(pkg => (
                <div key={pkg.id} className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-gray-100 hover:border-amber-200 hover:bg-amber-50/30 transition-all">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-800">{pkg.name}</p>
                    <p className="text-[10px] text-gray-400 truncate">{pkg.badge} · {pkg.kw}</p>
                    <p className="text-[10px] text-amber-700 font-semibold">PKR {pkg.total.toLocaleString('en-PK')}</p>
                  </div>
                  <button onClick={() => {
                    const solarId = `solar-${pkg.id}`;
                    const line: QuoteLine = {
                      id: solarId,
                      name: pkg.name,
                      model: pkg.id.toUpperCase(),
                      qty: 1,
                      unitPrice: pkg.total,
                      category: pkg.type === 'solar' ? 'Solar' : 'Inverter/UPS',
                      warranty: pkg.warranties.join(' · '),
                      keySpec: `${pkg.kw} ${pkg.badge}`,
                      kwhPerMonth: 0,
                      savingsPct: pkg.type === 'solar' ? 60 : 0,
                      minPrice: pkg.total,
                      floorPrice: pkg.total,
                      overrideReason: '',
                      displayPrefix: '',
                      packageNote: '',
                      isPackage: true,
                      packageComponents: DEFAULT_PACKAGE_COMPONENTS[solarId] ?? [],
                    };
                    setLines(ls => ls.some(l => l.id === line.id) ? ls : [...ls, line]);
                  }}
                    className="px-3 py-1.5 text-xs font-semibold bg-gray-900 hover:bg-amber-500 text-white rounded-lg transition-colors shrink-0">
                    Add
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>}

        {docType !== 'service_receipt' && <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Add Products</p>
            <button
              onClick={() => { setShowCustomProductForm(v => !v); setProductSearch(''); }}
              className="px-3 py-1.5 text-xs font-semibold bg-gray-800 hover:bg-orange-500 text-white rounded-lg transition-colors">
              + Custom Item
            </button>
          </div>

          {/* ── Custom product form ── */}
          {showCustomProductForm && (
            <div className="border border-orange-200 rounded-xl p-4 space-y-2.5 bg-orange-50">
              <p className="text-xs font-semibold text-orange-700">New custom product — will be saved to DB (status: Needs Review)</p>
              <div className="grid grid-cols-2 gap-2">
                <input value={customProductName} onChange={e => setCustomProductName(e.target.value)}
                  placeholder="Product name *"
                  className="col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white" />
                <input value={customProductBrand} onChange={e => setCustomProductBrand(e.target.value)}
                  placeholder="Brand (e.g. Haier)"
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white" />
                <input value={customProductModel} onChange={e => setCustomProductModel(e.target.value)}
                  placeholder="Model number"
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white" />
                <select value={customProductCategory} onChange={e => setCustomProductCategory(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white">
                  {['Air Conditioners','Refrigerators','Deep Freezers','Washing Machines','Televisions',
                    'Microwaves','Water Heaters','Fans','UPS / Inverters','Solar Inverters','Solar Panels',
                    'Solar Batteries','Solar Systems','Kitchen Appliances','Small Appliances','General'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <input type="number" min={0} value={customProductPrice} onChange={e => setCustomProductPrice(e.target.value)}
                  placeholder="Price (PKR) *"
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white" />
                <input value={customProductWarranty} onChange={e => setCustomProductWarranty(e.target.value)}
                  placeholder="Warranty (e.g. 1 year)"
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white" />
                <input value={customProductKeySpec} onChange={e => setCustomProductKeySpec(e.target.value)}
                  placeholder="Key spec (e.g. 1.5 Ton · Inverter)"
                  className="col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white" />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={addCustomProduct}
                  disabled={!customProductName.trim() || !customProductPrice || savingCustomProduct}
                  className="flex-1 py-2 text-sm font-semibold bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg transition-colors">
                  {savingCustomProduct ? 'Saving…' : 'Add to Quote & Save to DB'}
                </button>
                <button onClick={() => setShowCustomProductForm(false)}
                  className="px-4 py-2 text-sm text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* ── Catalog search ── */}
          {!showCustomProductForm && (
            <>
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
                    <div className="px-3 py-3 text-center space-y-1">
                      <p className="text-xs text-gray-400">No catalog match for "{productSearch}"</p>
                      <button
                        onClick={() => { setCustomProductName(productSearch); setProductSearch(''); setShowCustomProductForm(true); }}
                        className="text-xs font-semibold text-orange-600 hover:text-orange-800 underline">
                        Add "{productSearch}" as a custom product →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>}
      </div>

      {lines.length > 0 && docType !== 'service_receipt' && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[540px]">
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
                    {/* Display prefix for add-on items */}
                    <div className="flex gap-2 mt-1">
                      <input
                        type="text"
                        value={line.displayPrefix}
                        onChange={e => updateLineText(line.id, 'displayPrefix', e.target.value)}
                        placeholder='Prefix (e.g. "Additional Battery — ")'
                        className="flex-1 border border-gray-100 rounded-lg px-2 py-1 text-xs text-gray-500 focus:outline-none focus:ring-1 focus:ring-orange-300 bg-gray-50"
                      />
                    </div>
                    {/* Package toggle + component editor */}
                    <div className="mt-1.5 flex items-center gap-2">
                      <button
                        onClick={() => togglePackage(line.id)}
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border transition-colors ${
                          line.isPackage
                            ? 'bg-orange-500 text-white border-orange-500'
                            : 'bg-white text-gray-500 border-gray-200 hover:border-orange-300'
                        }`}
                      >
                        {line.isPackage ? 'Package Mode ON' : 'Expand as Package'}
                      </button>
                      {line.isPackage && (
                        <button onClick={() => resetComponents(line.id)}
                          className="text-[10px] text-blue-500 hover:text-blue-700 underline">
                          Restore Defaults
                        </button>
                      )}
                    </div>
                    {line.isPackage && (
                      <div className="mt-2 border border-orange-200 rounded-xl p-2.5 bg-orange-50/60 space-y-1.5">
                        <p className="text-[10px] font-bold text-orange-700 uppercase tracking-wide mb-1">
                          Package Components ({line.packageComponents.length})
                        </p>
                        {line.packageComponents.map((comp, idx) => (
                          <div key={comp.id} className={`border rounded-lg p-2 text-[10px] space-y-1 ${comp.hidden ? 'opacity-40 bg-gray-50' : 'bg-white border-gray-100'}`}>
                            <div className="flex gap-1 items-center">
                              <input
                                value={comp.name}
                                onChange={e => updateComponent(line.id, idx, { name: e.target.value })}
                                placeholder="Component name"
                                className="flex-1 border border-gray-200 rounded px-1.5 py-0.5 text-[10px] focus:outline-none focus:ring-1 focus:ring-orange-300"
                              />
                              <input
                                type="number" min={1} value={comp.qty}
                                onChange={e => updateComponent(line.id, idx, { qty: Math.max(1, Number(e.target.value)) })}
                                className="w-10 border border-gray-200 rounded px-1 py-0.5 text-center text-[10px] focus:outline-none focus:ring-1 focus:ring-orange-300"
                              />
                              <select value={comp.status}
                                onChange={e => updateComponent(line.id, idx, { status: e.target.value as 'included' | 'addon' })}
                                className="border border-gray-200 rounded px-1 py-0.5 text-[10px] focus:outline-none">
                                <option value="included">Included</option>
                                <option value="addon">Add-on</option>
                              </select>
                              <select value={comp.group || 'core'}
                                onChange={e => updateComponent(line.id, idx, { group: e.target.value as PackageComponent['group'] })}
                                className="border border-gray-200 rounded px-1 py-0.5 text-[10px] focus:outline-none text-gray-500">
                                <option value="core">Core</option>
                                <option value="generation">Generation</option>
                                <option value="infrastructure">Infrastructure</option>
                                <option value="service">Service</option>
                              </select>
                              <button onClick={() => updateComponent(line.id, idx, { hidden: !comp.hidden })}
                                className={`text-[10px] px-1.5 py-0.5 rounded ${comp.hidden ? 'bg-gray-200 text-gray-500' : 'bg-green-100 text-green-700'}`}>
                                {comp.hidden ? 'Hidden' : 'Show'}
                              </button>
                              <button onClick={() => removeComponent(line.id, idx)}
                                className="text-red-400 hover:text-red-600 text-xs leading-none px-1">×</button>
                            </div>
                            <div className="flex gap-1">
                              <input
                                value={comp.keySpec}
                                onChange={e => updateComponent(line.id, idx, { keySpec: e.target.value })}
                                placeholder="Specs (e.g. 620W · Mono Bi-Facial)"
                                className="flex-1 border border-gray-200 rounded px-1.5 py-0.5 text-[10px] focus:outline-none focus:ring-1 focus:ring-orange-300"
                              />
                              <input
                                value={comp.warranty}
                                onChange={e => updateComponent(line.id, idx, { warranty: e.target.value })}
                                placeholder="Warranty"
                                className="w-32 border border-gray-200 rounded px-1.5 py-0.5 text-[10px] focus:outline-none focus:ring-1 focus:ring-orange-300"
                              />
                              {comp.status === 'addon' && (
                                <input
                                  type="number" min={0} value={comp.addonPrice}
                                  onChange={e => updateComponent(line.id, idx, { addonPrice: Math.max(0, Number(e.target.value)) })}
                                  placeholder="Add-on price"
                                  className="w-24 border border-orange-200 rounded px-1.5 py-0.5 text-[10px] focus:outline-none focus:ring-1 focus:ring-orange-300 text-orange-700"
                                />
                              )}
                            </div>
                          </div>
                        ))}
                        <button onClick={() => addComponent(line.id)}
                          className="w-full text-[10px] py-1 border border-dashed border-orange-300 rounded-lg text-orange-600 hover:bg-orange-100 transition-colors">
                          + Add Component
                        </button>
                        <div className="mt-1">
                          <input
                            type="text"
                            value={line.packageNote}
                            onChange={e => updateLineText(line.id, 'packageNote', e.target.value)}
                            placeholder='Package note shown in PDF (e.g. "Includes Crown inverter; additional battery for extended backup.")'
                            className="w-full border border-gray-100 rounded-lg px-2 py-1 text-[10px] text-gray-500 focus:outline-none focus:ring-1 focus:ring-orange-300 bg-white"
                          />
                        </div>
                      </div>
                    )}
                    {!line.isPackage && (
                      <div className="mt-1">
                        <input
                          type="text"
                          value={line.packageNote}
                          onChange={e => updateLineText(line.id, 'packageNote', e.target.value)}
                          placeholder='Note (optional)'
                          className="w-full border border-gray-100 rounded-lg px-2 py-1 text-xs text-gray-500 focus:outline-none focus:ring-1 focus:ring-orange-300 bg-gray-50"
                        />
                      </div>
                    )}
                    {/* Monthly kWh for efficiency block */}
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[10px] text-blue-400 shrink-0">⚡ units/mo</span>
                      <input
                        type="number"
                        min={0}
                        value={line.kwhPerMonth || ''}
                        onChange={e => updateLineKwh(line.id, Math.max(0, Number(e.target.value) || 0))}
                        placeholder="0"
                        title="Monthly energy consumption in kWh (units) — enables efficiency block in PDF"
                        className="w-16 border border-blue-100 rounded-lg px-2 py-0.5 text-xs text-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-300 bg-blue-50"
                      />
                      {line.kwhPerMonth > 0 && (
                        <span className="text-[10px] text-blue-400">
                          saves ~{Math.round(line.kwhPerMonth * ((line.savingsPct || 42) / 100))} units/mo
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <input type="number" min={1} value={line.qty} onChange={e => updateLine(line.id, 'qty', Math.max(1, Number(e.target.value)))}
                      className="w-16 border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-orange-400" />
                  </td>
                  <td className="px-4 py-2.5">
                    <input type="number" min={0} value={line.unitPrice} onChange={e => updateLine(line.id, 'unitPrice', Math.max(0, Number(e.target.value)))}
                      className="w-32 border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-orange-400" />
                    {(() => {
                      const fv = validateFloor(line.unitPrice, line.minPrice);
                      if (fv.valid) return null;
                      return (
                        <div className="mt-1.5 space-y-1">
                          <p className="text-xs text-red-500 font-semibold">
                            Below floor: PKR {fv.floor.toLocaleString('en-PK')} (shortfall PKR {fv.shortfall.toLocaleString('en-PK')})
                          </p>
                          <input
                            value={line.overrideReason}
                            onChange={e => updateLineOverride(line.id, e.target.value)}
                            placeholder="Override reason (required to generate)"
                            className="w-full border border-red-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-red-400"
                          />
                        </div>
                      );
                    })()}
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
          </div>
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-6 text-sm">
            {discount > 0 && <span className="text-gray-500">Subtotal: PKR {subtotal.toLocaleString('en-PK')} · Discount: − PKR {discountAmt.toLocaleString('en-PK')}</span>}
            <span className="font-black text-gray-900 text-base">Grand Total: PKR {effectiveTotal.toLocaleString('en-PK')}</span>
          </div>
        </div>
      )}

      {/* ── Services Panel ── */}
      {docType !== 'service_receipt' && <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Services</p>
          <button
            onClick={() => setShowCustomServiceForm(v => !v)}
            className="px-3 py-1.5 text-xs font-semibold bg-gray-800 hover:bg-orange-500 text-white rounded-lg transition-colors">
            + Custom Service
          </button>
        </div>

        {/* ── Custom service form ── */}
        {showCustomServiceForm && (
          <div className="border border-orange-200 rounded-xl p-4 space-y-2.5 bg-orange-50">
            <p className="text-xs font-semibold text-orange-700">Add a service not in the standard list</p>
            <input value={customServiceName} onChange={e => setCustomServiceName(e.target.value)}
              placeholder="Service name *"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white" />
            <input value={customServiceDesc} onChange={e => setCustomServiceDesc(e.target.value)}
              placeholder="Description (optional)"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white" />
            <div className="flex gap-2 items-center">
              <select value={customServiceStatus} onChange={e => setCustomServiceStatus(e.target.value as 'included' | 'charged')}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white">
                <option value="charged">Charged</option>
                <option value="included">Included (no extra charge)</option>
              </select>
              {customServiceStatus === 'charged' && (
                <input type="number" min={0} value={customServiceAmount} onChange={e => setCustomServiceAmount(e.target.value)}
                  placeholder="PKR amount"
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white" />
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={addCustomService}
                disabled={!customServiceName.trim()}
                className="flex-1 py-2 text-sm font-semibold bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg transition-colors">
                Add Service
              </button>
              <button onClick={() => setShowCustomServiceForm(false)}
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}

        {services.map((svc, i) => (
          <div key={svc.service_type} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800">{svc.service_name}</p>
              <p className="text-xs text-gray-400">{svc.description}</p>
            </div>
            <div className="flex gap-1 shrink-0">
              {(['not_selected', 'included', 'charged'] as const).map(opt => (
                <button
                  key={opt}
                  onClick={() => updateService(i, { status: opt })}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    svc.status === opt
                      ? opt === 'charged' ? 'bg-orange-500 text-white'
                        : opt === 'included' ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-600'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {opt === 'not_selected' ? '—' : opt.charAt(0).toUpperCase() + opt.slice(1)}
                </button>
              ))}
            </div>
            {svc.status === 'included' && (
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-xs text-gray-400">Value: PKR</span>
                <input
                  type="number"
                  value={svc.visible_value}
                  onChange={e => updateService(i, { visible_value: Number(e.target.value) })}
                  className="w-24 border border-gray-200 rounded-lg px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-orange-400"
                />
              </div>
            )}
            {svc.status === 'charged' && (
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-xs text-gray-400">PKR</span>
                <input
                  type="number"
                  value={svc.charged_amount}
                  onChange={e => updateService(i, {
                    charged_amount: Number(e.target.value),
                    visible_value: Number(e.target.value),
                  })}
                  className="w-24 border border-orange-200 rounded-lg px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-orange-400"
                />
              </div>
            )}
            {/* Remove button only for custom (non-default) services */}
            {svc.service_type.startsWith('custom_') && (
              <button onClick={() => setServices(prev => prev.filter((_, j) => j !== i))}
                className="text-gray-300 hover:text-red-500 transition-colors p-1 shrink-0">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
        {serviceTotal > 0 && (
          <div className="flex justify-between text-sm text-gray-500">
            <span>Services</span>
            <span>+ {fmtPKR(serviceTotal)}</span>
          </div>
        )}
      </div>}

      {/* ── Custom Charges Panel ── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Additional Charges</p>
          <button
            onClick={() => setCustomCharges(prev => [...prev, { id: crypto.randomUUID(), name: '', amount: 0 }])}
            className="px-3 py-1.5 text-xs font-semibold bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors">
            + Add Charge
          </button>
        </div>
        {customCharges.length === 0 && (
          <p className="text-xs text-gray-400">No additional charges. Use this for one-off work not in the services list.</p>
        )}
        {customCharges.map((cc, i) => (
          <div key={cc.id} className="flex items-center gap-2">
            <input
              value={cc.name}
              onChange={e => setCustomCharges(prev => prev.map((c, j) => j === i ? { ...c, name: e.target.value } : c))}
              placeholder="Charge description"
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            <input
              type="number" min={0}
              value={cc.amount || ''}
              onChange={e => setCustomCharges(prev => prev.map((c, j) => j === i ? { ...c, amount: Number(e.target.value) || 0 } : c))}
              placeholder="PKR"
              className="w-28 border border-gray-200 rounded-xl px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            <button onClick={() => setCustomCharges(prev => prev.filter((_, j) => j !== i))}
              className="text-gray-300 hover:text-red-500 transition-colors p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
        {customChargesTotal > 0 && (
          <div className="flex justify-between text-sm text-gray-500">
            <span>Additional Charges</span>
            <span>+ {fmtPKR(customChargesTotal)}</span>
          </div>
        )}
      </div>

      {/* ── Notes ── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-2">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Internal Notes</p>
        <textarea
          value={invoiceNotes}
          onChange={e => setInvoiceNotes(e.target.value)}
          placeholder="Internal notes (not printed on document)"
          rows={2}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
        />
      </div>

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

      {/* ── SR Grand Total display ── */}
      {docType === 'service_receipt' && (srJobLines.length > 0 || customCharges.length > 0) && (
        <div className="bg-white rounded-2xl border border-gray-100 px-4 py-3 flex items-center justify-end gap-6 text-sm">
          {srDiscountAmt > 0 && <span className="text-gray-500">Subtotal: PKR {srBaseTotal.toLocaleString('en-PK')} · Discount: − PKR {srDiscountAmt.toLocaleString('en-PK')}</span>}
          <span className="font-black text-gray-900 text-base">Total Due: PKR {srGrandTotal.toLocaleString('en-PK')}</span>
        </div>
      )}

      {/* ── Quotation / Invoice buttons ── */}
      {docType !== 'installment-invoice' && (
        <div className="flex flex-wrap gap-3">
          <button
            onClick={generate}
            disabled={
              (docType !== 'service_receipt' && !lines.length) ||
              pdfState === 'generating' ||
              solarCompatCheck?.status === 'incompatible' ||
              hasUnapprovedFloorViolation ||
              (discount > 0 && !discountReason.trim())
            }
            title={
              hasUnapprovedFloorViolation ? 'Enter override reason for all below-floor prices' :
              (discount > 0 && !discountReason.trim()) ? 'Enter discount reason to proceed' :
              ''
            }
            className={`flex items-center gap-2 font-bold px-5 py-2.5 rounded-xl text-sm disabled:opacity-40 transition-colors ${
              pdfState === 'success'
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : pdfState === 'error'
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-gray-900 hover:bg-gray-800 text-white'
            } ${
              (hasUnapprovedFloorViolation || (discount > 0 && !discountReason.trim()))
                ? 'opacity-50 cursor-not-allowed'
                : ''
            }`}
          >
            {pdfState === 'generating'
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
              : pdfState === 'success'
              ? <>✓ Downloaded!</>
              : pdfState === 'error'
              ? <>⚠ PDF failed — retry</>
              : <>📄 Download {docType === 'invoice' ? 'Invoice' : docType === 'service_receipt' ? 'Service Receipt' : 'Quotation'} PDF</>}
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
          {lines.length === 0 && docType !== 'service_receipt' && (
            <p className="text-xs text-gray-400 self-center">Add at least one product to generate a document.</p>
          )}
        </div>
      )}

      {/* ── Installment invoice buttons ── */}
      {docType === 'installment-invoice' && (
        <div className="flex flex-wrap gap-3 items-center">
          <button
            onClick={generateAdvanceInvoice}
            disabled={
              !lines.length ||
              instAdvPdfState === 'generating' ||
              hasUnapprovedFloorViolation ||
              (discount > 0 && !discountReason.trim())
            }
            title={
              hasUnapprovedFloorViolation ? 'Enter override reason for all below-floor prices' :
              (discount > 0 && !discountReason.trim()) ? 'Enter discount reason to proceed' :
              ''
            }
            className={`flex items-center gap-2 font-bold px-5 py-2.5 rounded-xl text-sm disabled:opacity-40 transition-colors ${
              instAdvPdfState === 'success'
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : instAdvPdfState === 'error'
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-orange-600 hover:bg-orange-700 text-white'
            } ${
              (hasUnapprovedFloorViolation || (discount > 0 && !discountReason.trim()))
                ? 'opacity-50 cursor-not-allowed'
                : ''
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
            disabled={
              !lines.length ||
              instPayPdfState === 'generating' ||
              hasUnapprovedFloorViolation ||
              (discount > 0 && !discountReason.trim())
            }
            title={
              hasUnapprovedFloorViolation ? 'Enter override reason for all below-floor prices' :
              (discount > 0 && !discountReason.trim()) ? 'Enter discount reason to proceed' :
              ''
            }
            className={`flex items-center gap-2 font-bold px-5 py-2.5 rounded-xl text-sm disabled:opacity-40 transition-colors ${
              instPayPdfState === 'success'
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : instPayPdfState === 'error'
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-gray-900 hover:bg-gray-800 text-white'
            } ${
              (hasUnapprovedFloorViolation || (discount > 0 && !discountReason.trim()))
                ? 'opacity-50 cursor-not-allowed'
                : ''
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
            <p className="text-base font-black text-gray-900">PKR {effectiveTotal.toLocaleString('en-PK')}</p>
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
  doc.text("TAJALLI'S", margin, 20);
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
  doc.text("This proposal is valid for 7 days. Prices are subject to market variation. Tajalli's — Karachi.", margin, 284);
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
        a.download = `tajallis_solar_proposal_${lead.name.replace(/\s+/g, '_')}.pdf`;
        a.click();
      }

      const phone = lead.phone.replace(/\D/g, '');
      const e164  = phone.startsWith('0') ? '92' + phone.slice(1) : phone.startsWith('92') ? phone : '92' + phone;
      const msg   = encodeURIComponent(
        `Assalam-o-Alaikum ${lead.name},\n\n` +
        `Here is your customised Off-Grid Solar Proposal from Tajalli's.\n\n` +
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
          <div className="overflow-x-auto">
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
                          href={`https://wa.me/${lead.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${lead.contact_person}, this is Tajalli's regarding your partner application.`)}`}
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
  const [confirmDel,  setConfirmDel]  = useState<Order | null>(null);
  const [deleting,    setDeleting]    = useState<string | null>(null);

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

  async function handleDelete(id: string) {
    setDeleting(id);
    await supabase.from('orders').delete().eq('id', id);
    setOrders(prev => prev.filter(o => o.id !== id));
    setDeleting(null);
    setConfirmDel(null);
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
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-28">Order</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Customer</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Items</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-28">Total</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-40">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-28">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-16">WA</th>
                  <th className="px-4 py-3 w-10"></th>
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
                            href={`https://wa.me/${order.customer_phone?.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${order.customer_name}, your Tajalli's order (ref: ${order.id.slice(0, 8)}) has been received. We'll confirm shortly.`)}`}
                            target="_blank" rel="noreferrer"
                            className="p-1.5 hover:bg-green-50 text-green-600 rounded-lg flex items-center justify-center w-8 h-8">
                            <MessageCircle className="w-4 h-4" />
                          </a>
                        </td>
                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                          <button onClick={() => setConfirmDel(order)}
                            className="p-1.5 hover:bg-red-50 text-red-400 hover:text-red-600 rounded-lg">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>

                      {expanded === order.id && (
                        <tr key={`${order.id}-d`} className="bg-orange-50/20 border-b border-orange-100">
                          <td colSpan={8} className="px-6 py-4">
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

      {confirmDel && (
        <ConfirmDialog
          title="Delete this order?"
          message={`Order from ${confirmDel.customer_name} — PKR ${(confirmDel.total_amount || 0).toLocaleString()}\nThis cannot be undone.`}
          confirmLabel="Delete Order"
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
  const [confirmDel, setConfirmDel] = useState<Enquiry | null>(null);
  const [deleting,   setDeleting]   = useState<string | null>(null);

  async function handleDelete(id: string) {
    setDeleting(id);
    await supabase.from('analytics').delete().eq('id', id);
    setItems(prev => prev.filter(i => i.id !== id));
    setDeleting(null);
    setConfirmDel(null);
  }

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
                  <th className="px-4 py-3 w-10"></th>
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
                          <a href={`https://wa.me/${item.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${item.name || ''}, thank you for contacting Tajalli's!`)}`}
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
                    <td className="px-4 py-3">
                      <button onClick={() => setConfirmDel(item)}
                        className="p-1.5 hover:bg-red-50 text-red-400 hover:text-red-600 rounded-lg">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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

      {confirmDel && (
        <ConfirmDialog
          title="Delete this enquiry?"
          message={`From: ${confirmDel.name || 'Unknown'}\nType: ${confirmDel.event}\nThis cannot be undone.`}
          confirmLabel="Delete"
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
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <label className="text-sm font-medium text-gray-700 w-full sm:w-48 sm:shrink-0">{label}</label>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {unit && <span className="text-xs text-gray-400 shrink-0">{unit}</span>}
          <input
            type={type}
            value={local[k] ?? ''}
            onChange={e => setField(k, e.target.value)}
            min={min} max={max} step={step}
            className="w-full sm:w-36 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          {hint && <span className="text-xs text-gray-400 hidden sm:inline">{hint}</span>}
        </div>
        <button onClick={() => saveSetting(k)} disabled={saving === k}
          className="flex items-center gap-1 text-xs font-bold bg-orange-100 hover:bg-orange-200 disabled:opacity-50 text-orange-700 px-3 py-2 rounded-lg whitespace-nowrap shrink-0">
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

        <div className="flex flex-wrap gap-3 items-center">
          <input
            value={local['announcement_text'] ?? ''}
            onChange={e => setField('announcement_text', e.target.value)}
            placeholder="e.g. Eid Sale — extra 5% off on all ACs this week only!"
            className="flex-1 min-w-0 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
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
  type AdminTab = 'products' | 'images' | 'import' | 'tools' | 'qc' | 'reviews' | 'leads' | 'orders' | 'enquiries' | 'quotation' | 'invoices' | 'installment_ledger' | 'customers' | 'settings' | 'schema' | 'audit' | 'catalog' | 'solar' | 'compatibility';
  const VALID_TABS: AdminTab[] = ['products','images','import','tools','qc','reviews','leads','orders','enquiries','quotation','invoices','installment_ledger','customers','settings','schema','audit','catalog','solar','compatibility'];
  const tabFromHash = (): AdminTab => {
    const h = window.location.hash.slice(1) as AdminTab;
    return VALID_TABS.includes(h) ? h : 'products';
  };
  const [tab, setTab] = useState<AdminTab>(tabFromHash);
  const changeTab = (t: AdminTab) => { setTab(t); window.location.hash = t; };
  const [editRequest, setEditRequest] = useState<InvoiceRow | null>(null);
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
            <h1 className="text-xl font-black text-gray-900">Tajalli's Admin</h1>
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
      {/* Header + Tabs — sticky unit sits below the public navbar */}
      <div className="sticky top-14 sm:top-16 lg:top-[104px] z-20 bg-white shadow-sm">
      {/* Header */}
      <div className="border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
            <Package className="w-4 h-4 text-orange-600" />
          </div>
          <span className="font-black text-gray-900">Tajalli's Admin</span>
          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">{products.length} products</span>
        </div>
        <button onClick={() => signOut()} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </div>

      {/* Tabs — grouped by function */}
      <div className="border-b border-gray-100 px-4 overflow-x-auto">
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
            { id: 'quotation',          label: '📄 Quotation',         group: 'crm' },
            { id: 'invoices',           label: '🗂 Invoice Log',        group: 'crm' },
            { id: 'installment_ledger', label: '📅 Installment Ledger', group: 'crm' },
            { id: 'customers',          label: '👥 Customers',          group: 'crm' },
            { id: 'reviews',            label: 'Reviews',               group: 'crm' },
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
      </div>{/* end sticky header+tabs wrapper */}

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
          <QuotationTab products={products} editRequest={editRequest} onEditConsumed={() => setEditRequest(null)} />
        ) : tab === 'invoices' ? (
          <InvoiceHistoryTab onEditRequest={row => { setEditRequest(row); changeTab('quotation'); }} />
        ) : tab === 'installment_ledger' ? (
          <InstallmentLedgerTab />
        ) : tab === 'customers' ? (
          <CustomerCrmTab />
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
