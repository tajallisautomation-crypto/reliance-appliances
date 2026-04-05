# Production Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all launch-blocking, trust-damaging, and UX-fatiguing issues across the Reliance by Tajallis website to make it genuinely live-ready.

**Architecture:** Fixes are spread across store (Zustand), pages, and shared components. No new files needed — every change is a targeted edit to an existing file. Changes are ordered so foundational utilities (whatsapp.ts, cartStore.ts) come first so later tasks can depend on them.

**Tech Stack:** React 18, TypeScript, Zustand (persist middleware), React Router v6, Tailwind CSS, Lucide icons, react-hot-toast.

---

## File Map

| File | What changes |
|---|---|
| `src/lib/whatsapp.ts` | Add `openWhatsApp()` helper |
| `src/store/cartStore.ts` | Add `selectedPlan` field + `setSelectedPlan()` |
| `src/components/products/ProductCard.tsx` | Block add-to-cart for non-In-Stock |
| `src/pages/ProductDetail.tsx` | Call `setSelectedPlan()` on add to cart |
| `src/pages/Checkout.tsx` | Read plan from store; remove misleading file upload |
| `src/pages/Cart.tsx` | Use `waOrder()` instead of hardcoded URL |
| `src/pages/misc.tsx` | Use `waSales()` / `waAdmin()` |
| `src/pages/Support.tsx` | Use `waSales()` / `openWhatsApp()` |
| `src/pages/Portal.tsx` | Use `waSales()` / `openWhatsApp()` |
| `src/pages/SolarCalculator.tsx` | Use `openWhatsApp(waSales(msg))` |
| `src/pages/OffGridSolar.tsx` | Use `WA_ADMIN` from config instead of local `WA_NUMBER` |
| `src/pages/BuyingGuide.tsx` | Use `waSales()` |
| `src/pages/PolicyPage.tsx` | Use `waSales()` |
| `src/pages/Referral.tsx` | Use `waSales()` |
| `src/components/layout/Footer.tsx` | Fix category links; remove WA button |
| `src/pages/Home.tsx` | Unify category routing; merge solar CTAs; trim sections; remove WA from final CTA |
| `src/components/OfferBannerSlider.tsx` | Add touch swipe |

---

## Task 1: Add `openWhatsApp()` to whatsapp.ts

**Files:**
- Modify: `src/lib/whatsapp.ts` (after line 28, before `waSales`)

- [ ] **Step 1: Add the helper**

Open `src/lib/whatsapp.ts`. After the `wa()` helper on line 28, add:

```ts
// ── Safe opener — falls back gracefully if popup blocked ────────────────────
export function openWhatsApp(url: string): void {
  try {
    const w = window.open(url, '_blank', 'noopener,noreferrer')
    if (!w) window.location.href = url
  } catch {
    window.location.href = url
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/whatsapp.ts
git commit -m "feat: add openWhatsApp() safe-open helper to whatsapp utility"
```

---

## Task 2: Persist selected installment plan in cart store

**Files:**
- Modify: `src/store/cartStore.ts`

- [ ] **Step 1: Extend the store interface and state**

Replace the entire contents of `src/store/cartStore.ts` with:

```ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Product } from '../lib/api'

type PlanKey = 'cash' | '2m' | '3m' | '6m' | '12m'

interface CartItem extends Product { qty: number }

interface CartStore {
  items: CartItem[]
  selectedPlan: PlanKey
  addItem: (p: Product, qty?: number) => void
  removeItem: (id: string) => void
  updateQty: (id: string, qty: number) => void
  clearCart: () => void
  total: () => number
  setSelectedPlan: (plan: PlanKey) => void
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      selectedPlan: 'cash',
      addItem: (p, qty = 1) => set(s => {
        const ex = s.items.find(i => i.id === p.id)
        if (ex) return { items: s.items.map(i => i.id === p.id ? { ...i, qty: i.qty + qty } : i) }
        return { items: [...s.items, { ...p, qty }] }
      }),
      removeItem: (id) => set(s => ({ items: s.items.filter(i => i.id !== id) })),
      updateQty: (id, qty) => set(s => ({
        items: qty <= 0 ? s.items.filter(i => i.id !== id) : s.items.map(i => i.id === id ? { ...i, qty } : i)
      })),
      clearCart: () => set({ items: [], selectedPlan: 'cash' }),
      total: () => get().items.reduce((t, i) => t + (i.price?.cash_floor || 0) * i.qty, 0),
      setSelectedPlan: (plan) => set({ selectedPlan: plan }),
    }),
    { name: 'reliance-cart' }
  )
)
```

- [ ] **Step 2: Commit**

```bash
git add src/store/cartStore.ts
git commit -m "feat: persist selectedPlan in cartStore so checkout inherits product-page plan selection"
```

---

## Task 3: Block add-to-cart for out-of-stock products in ProductCard

**Files:**
- Modify: `src/components/products/ProductCard.tsx`

- [ ] **Step 1: Guard handleAdd and disable the button**

In `ProductCard.tsx`, replace the `handleAdd` function and the add-to-cart button:

Find `handleAdd`:
```ts
const handleAdd = (e: React.MouseEvent) => {
  e.preventDefault();
  addItem(p);
  setAdded(true);
  toast.success(`${p.brand} ${p.model} added to cart`);
  setTimeout(() => setAdded(false), 1500);
};
```

Replace with:
```ts
const isAvailable = p.stock_status === 'In Stock';

const handleAdd = (e: React.MouseEvent) => {
  e.preventDefault();
  if (!isAvailable) return;
  addItem(p);
  setAdded(true);
  toast.success(`${p.brand} ${p.model} added to cart`);
  setTimeout(() => setAdded(false), 1500);
};
```

Then find the cart button inside the quick-actions div:
```tsx
<button onClick={handleAdd} aria-label={`Add ${p.model} to cart`}
  className={`w-10 h-10 rounded-full shadow-apple-lg flex items-center justify-center transition-all duration-200 ${added ? 'bg-emerald-500 text-white scale-110' : 'bg-white text-brand-500 active:bg-brand-500 active:text-white hover:bg-brand-500 hover:text-white'}`}>
  {added
    ? <CheckCircle className="w-4 h-4" />
    : <ShoppingCart className="w-4 h-4" />}
</button>
```

Replace with:
```tsx
{isAvailable && (
  <button onClick={handleAdd} aria-label={`Add ${p.model} to cart`}
    className={`w-10 h-10 rounded-full shadow-apple-lg flex items-center justify-center transition-all duration-200 ${added ? 'bg-emerald-500 text-white scale-110' : 'bg-white text-brand-500 active:bg-brand-500 active:text-white hover:bg-brand-500 hover:text-white'}`}>
    {added
      ? <CheckCircle className="w-4 h-4" />
      : <ShoppingCart className="w-4 h-4" />}
  </button>
)}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/products/ProductCard.tsx
git commit -m "fix: prevent add-to-cart for out-of-stock and discontinued products in ProductCard"
```

---

## Task 4: Persist plan selection from ProductDetail into cart store

**Files:**
- Modify: `src/pages/ProductDetail.tsx`

- [ ] **Step 1: Wire setSelectedPlan into handleAdd**

Find the `addItem` import line:
```ts
const addItem = useCartStore(s => s.addItem);
```

Replace with:
```ts
const addItem        = useCartStore(s => s.addItem);
const setSelectedPlan = useCartStore(s => s.setSelectedPlan);
```

Find `handleAdd`:
```ts
const handleAdd = () => { addItem(p); toast.success(`${p.brand} ${p.model} added to cart!`); };
```

Replace with:
```ts
const handleAdd = () => {
  addItem(p);
  setSelectedPlan(plan);
  toast.success(`${p.brand} ${p.model} added to cart!`);
};
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/ProductDetail.tsx
git commit -m "feat: persist selected installment plan to cart store when adding from product detail"
```

---

## Task 5: Checkout reads plan from store; remove misleading file upload

**Files:**
- Modify: `src/pages/Checkout.tsx`

- [ ] **Step 1: Import selectedPlan from cart store**

Find:
```ts
const { items, total, clearCart } = useCartStore()
```

Replace with:
```ts
const { items, total, clearCart, selectedPlan: storedPlan } = useCartStore()
```

- [ ] **Step 2: Initialize plan state from store**

Find:
```ts
const [plan, setPlan] = useState('cash')
```

Replace with:
```ts
const [plan, setPlan] = useState<string>(storedPlan ?? 'cash')
```

- [ ] **Step 3: Remove the file upload state and Upload import**

Find and remove these lines:
```ts
const [transferFile, setTransferFile] = useState<File | null>(null)
```

Also remove `Upload` from the lucide-react import line:
```ts
import { CheckCircle, AlertCircle, Copy, Banknote, Upload, ArrowRight } from 'lucide-react'
```
→ becomes:
```ts
import { CheckCircle, AlertCircle, Copy, Banknote, ArrowRight } from 'lucide-react'
```

- [ ] **Step 4: Replace file upload UI with honest instruction block**

Find the entire `<div className="mt-4">` block containing the file input (lines ~253–265):
```tsx
<div className="mt-4">
  <label className="text-xs font-medium text-amber-800 block mb-1.5">
    Attach transfer screenshot <span className="font-normal text-amber-600">(max 5 MB — jpg, png, pdf)</span>
  </label>
  <input
    type="file" accept="image/*,application/pdf"
    onChange={e => setTransferFile(e.target.files?.[0] || null)}
    className="w-full text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-amber-100 file:text-amber-700 file:font-medium hover:file:bg-amber-200 cursor-pointer"
  />
  {transferFile && <p className="text-xs text-green-600 mt-1">✓ {transferFile.name}</p>}
  <p className="text-xs text-amber-600 mt-1.5">Or send the screenshot via WhatsApp to <strong>+92 370 2578788</strong>.</p>
</div>
```

Replace with:
```tsx
<div className="mt-4 bg-amber-100/60 rounded-xl p-3">
  <p className="text-xs font-medium text-amber-800 mb-1">Send your transfer screenshot</p>
  <p className="text-xs text-amber-700">After placing your order, send your transfer proof via WhatsApp to <strong>+92 370 2578788</strong> with your order reference. We'll verify and schedule delivery.</p>
</div>
```

- [ ] **Step 5: Remove the post-order transferFile block**

Find the `if (done)` return block. Inside it, find and remove this entire conditional:
```tsx
{transferFile && (
  <div className="w-full bg-amber-50 border border-amber-200 rounded-2xl p-4 text-left">
    <div className="flex items-center gap-2 mb-2">
      <Upload className="w-4 h-4 text-amber-600 flex-shrink-0" />
      <p className="text-sm font-bold text-amber-900">Send your transfer proof</p>
    </div>
    <p className="text-xs text-amber-700 mb-3">You selected <strong>{transferFile.name}</strong> — please send it via WhatsApp so we can confirm your transfer and proceed.</p>
    <a href={waSales(`Order ref: ${orderId} — attaching transfer proof`)} target="_blank" rel="noreferrer"
      className="inline-flex items-center gap-2 bg-green-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold w-full justify-center">
      💬 Send Screenshot on WhatsApp
    </a>
  </div>
)}
```

- [ ] **Step 6: Commit**

```bash
git add src/pages/Checkout.tsx
git commit -m "feat: checkout reads selectedPlan from cart store; remove misleading file-upload UI"
```

---

## Task 6: Fix hardcoded WhatsApp URL in Cart.tsx

**Files:**
- Modify: `src/pages/Cart.tsx`

- [ ] **Step 1: Import waOrder**

Find the existing import line at the top. There is no whatsapp import yet. Add:
```ts
import { waOrder } from '../lib/whatsapp'
```

- [ ] **Step 2: Replace the hardcoded waLink**

Find:
```ts
const waLink = `https://wa.me/923702578788?text=${encodeURIComponent(
  'Hi! I want to order:\n' +
  items.map(i => `• ${i.qty}× ${i.simplified_name || i.model} — ${fmtPKR((i.price?.cash_floor || 0) * i.qty)}`).join('\n') +
  `\n\nTotal: ${fmtPKR(cartTotal)}`
)}`
```

Replace with:
```ts
const waLink = waOrder(
  'Hi! I want to order:\n' +
  items.map(i => `• ${i.qty}× ${i.simplified_name || i.model} — ${fmtPKR((i.price?.cash_floor || 0) * i.qty)}`).join('\n') +
  `\n\nTotal: ${fmtPKR(cartTotal)}`
)
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/Cart.tsx
git commit -m "fix: use waOrder() utility instead of hardcoded WhatsApp URL in Cart"
```

---

## Task 7: Fix hardcoded WhatsApp URLs in misc.tsx (Services + Corporate)

**Files:**
- Modify: `src/pages/misc.tsx`

- [ ] **Step 1: Add whatsapp imports**

Find the existing import block at the top of `misc.tsx`. Add:
```ts
import { waSales, waAdmin } from '@/lib/whatsapp'
```

- [ ] **Step 2: Replace the 5 hardcoded WA hrefs**

**Line ~89** (Services hero — book service):
```tsx
<a href="https://wa.me/923702578788?text=Hi%2C%20I%27d%20like%20to%20book%20a%20service"
```
→
```tsx
<a href={waSales('Hi, I\'d like to book a service')} target="_blank" rel="noreferrer"
```

**Line ~286** (AMC enquiry):
```tsx
<a href="https://wa.me/923702578788?text=Hi%2C%20I%27d%20like%20to%20know%20about%20the%20Annual%20Maintenance%20Contract"
```
→
```tsx
<a href={waSales('Hi, I\'d like to know about the Annual Maintenance Contract')} target="_blank" rel="noreferrer"
```

**Line ~302** (book service visit):
```tsx
<a href="https://wa.me/923702578788?text=Hi%2C%20I%27d%20like%20to%20book%20a%20service%20visit"
```
→
```tsx
<a href={waSales('Hi, I\'d like to book a service visit')} target="_blank" rel="noreferrer"
```

**Line ~379** (Corporate quote):
```tsx
<a href="https://wa.me/923354266238?text=Hi%2C%20I%27d%20like%20a%20corporate%20quote"
```
→
```tsx
<a href={waAdmin('Hi, I\'d like a corporate quote')} target="_blank" rel="noreferrer"
```

**Line ~468** (Corporate appliance quote):
```tsx
<a href="https://wa.me/923354266238?text=Hi%2C%20I%27d%20like%20a%20corporate%20appliance%20quote%20for%20my%20business"
```
→
```tsx
<a href={waAdmin('Hi, I\'d like a corporate appliance quote for my business')} target="_blank" rel="noreferrer"
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/misc.tsx
git commit -m "fix: replace hardcoded WhatsApp URLs in Services/Corporate with waSales()/waAdmin() utility"
```

---

## Task 8: Fix hardcoded WhatsApp in Support.tsx

**Files:**
- Modify: `src/pages/Support.tsx`

The file already imports `waSales` but still has two hardcoded references.

- [ ] **Step 1: Fix window.open call (line ~44)**

Find:
```ts
window.open(`https://wa.me/923702578788?text=${msg}`, '_blank')
```

Replace with:
```ts
import { waSales, openWhatsApp } from '@/lib/whatsapp'
// ...
openWhatsApp(waSales(decodeURIComponent(msg)))
```

Wait — `msg` here is already `encodeURIComponent`-encoded. Check what `msg` is built from first. The pattern is:
```ts
const msg = encodeURIComponent(`...`)
window.open(`https://wa.me/923702578788?text=${msg}`, '_blank')
```

Replace the full `window.open` call with:
```ts
openWhatsApp(`https://wa.me/923702578788?text=${msg}`)
```

(Keep using the already-encoded `msg` — just swap `window.open` for `openWhatsApp` and import it.)

Add to the import line that already has `waSales`:
```ts
import { waSales, openWhatsApp } from '@/lib/whatsapp'
```

- [ ] **Step 2: Fix the hardcoded href anchor (line ~60)**

Find:
```tsx
<a href={`https://wa.me/923702578788`} target="_blank" rel="noreferrer"
```

Replace with:
```tsx
<a href={waSales()} target="_blank" rel="noreferrer"
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/Support.tsx
git commit -m "fix: replace hardcoded WhatsApp URLs in Support with waSales()/openWhatsApp()"
```

---

## Task 9: Fix hardcoded WhatsApp in Portal.tsx

**Files:**
- Modify: `src/pages/Portal.tsx`

The file already imports `waSales`. Three hardcoded references remain.

- [ ] **Step 1: Fix the local waLink function (line ~33)**

Find:
```ts
return `https://wa.me/923702578788?text=${encodeURIComponent(msgs[type] || 'Hi Reliance!')}`
```

Replace with:
```ts
import { waSales } from '@/lib/whatsapp'
// ...
return waSales(msgs[type] || 'Hi Reliance!')
```

(The import already exists — just replace the return value.)

- [ ] **Step 2: Fix the order enquiry href (line ~171)**

Find:
```tsx
<a href={`https://wa.me/923702578788?text=${encodeURIComponent(`Hi! I'm enquiring about my order. Customer: ${order.customer_name}, Phone: ${order.customer_phone}`)}`}
```

Replace with:
```tsx
<a href={waSales(`Hi! I'm enquiring about my order. Customer: ${order.customer_name}, Phone: ${order.customer_phone}`)}
```

- [ ] **Step 3: Fix the window.open call (line ~275)**

Find:
```ts
window.open(`https://wa.me/923702578788?text=${msg}`, '_blank')
```

Add `openWhatsApp` to the existing whatsapp import:
```ts
import { waSales, openWhatsApp } from '@/lib/whatsapp'
```

Replace the `window.open` call with:
```ts
openWhatsApp(`https://wa.me/923702578788?text=${msg}`)
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/Portal.tsx
git commit -m "fix: replace hardcoded WhatsApp URLs in Portal with waSales()/openWhatsApp()"
```

---

## Task 10: Fix hardcoded WhatsApp in SolarCalculator.tsx

**Files:**
- Modify: `src/pages/SolarCalculator.tsx`

- [ ] **Step 1: Import openWhatsApp and waSales**

Check existing imports — add `openWhatsApp` and `waSales` from whatsapp:
```ts
import { waSales, openWhatsApp } from '@/lib/whatsapp'
```

- [ ] **Step 2: Fix window.open call (line ~367)**

Find:
```ts
window.open(`https://wa.me/923702578788?text=${msg}`, '_blank')
```

Replace with (keeping `msg` which is already `encodeURIComponent`-encoded):
```ts
openWhatsApp(`https://wa.me/923702578788?text=${msg}`)
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/SolarCalculator.tsx
git commit -m "fix: replace hardcoded WhatsApp window.open in SolarCalculator with openWhatsApp()"
```

---

## Task 11: Fix hardcoded WhatsApp in OffGridSolar.tsx

**Files:**
- Modify: `src/pages/OffGridSolar.tsx`

- [ ] **Step 1: Replace local WA_NUMBER constant with imported WA_ADMIN**

Find at the top:
```ts
const WA_NUMBER    = '923354266238'
```

Remove it. Add to imports:
```ts
import { WA_ADMIN } from '@/lib/config'
import { openWhatsApp } from '@/lib/whatsapp'
```

- [ ] **Step 2: Replace all `WA_NUMBER` references with `WA_ADMIN`**

There are 4 occurrences — replace each `WA_NUMBER` with `WA_ADMIN`.

- [ ] **Step 3: Replace window.open calls with openWhatsApp**

Find (two occurrences):
```ts
window.open(`https://wa.me/${WA_ADMIN}?text=${encodeURIComponent(lines.join('\n'))}`, '_blank')
```

Replace each with:
```ts
openWhatsApp(`https://wa.me/${WA_ADMIN}?text=${encodeURIComponent(lines.join('\n'))}`)
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/OffGridSolar.tsx
git commit -m "fix: use WA_ADMIN from config and openWhatsApp() in OffGridSolar, remove local WA_NUMBER constant"
```

---

## Task 12: Fix hardcoded WhatsApp in BuyingGuide, PolicyPage, Referral

**Files:**
- Modify: `src/pages/BuyingGuide.tsx`
- Modify: `src/pages/PolicyPage.tsx`
- Modify: `src/pages/Referral.tsx`

- [ ] **Step 1: BuyingGuide.tsx — import and replace**

Add to imports:
```ts
import { waSales } from '@/lib/whatsapp'
```

Find (line ~679):
```tsx
href="https://wa.me/923702578788?text=Hi%2C%20I%20need%20help%20choosing%20the%20right%20appliance%20for%20my%20home."
```

Replace with:
```tsx
href={waSales('Hi, I need help choosing the right appliance for my home.')}
```

- [ ] **Step 2: PolicyPage.tsx — import and replace**

Add to imports:
```ts
import { waSales } from '@/lib/whatsapp'
```

Find (line ~180):
```tsx
<a href="https://wa.me/923702578788" target="_blank" rel="noreferrer"
```

Replace with:
```tsx
<a href={waSales()} target="_blank" rel="noreferrer"
```

- [ ] **Step 3: Referral.tsx — import and replace**

Add to imports:
```ts
import { waSales } from '@/lib/whatsapp'
```

Find (line ~156):
```tsx
<a href="https://wa.me/923702578788" className="text-orange-500 hover:underline">
```

Replace with:
```tsx
<a href={waSales()} target="_blank" rel="noreferrer" className="text-orange-500 hover:underline">
```

Find (line ~186):
```tsx
<a href="https://wa.me/923702578788?text=Hi%2C%20I%27d%20like%20to%20know%20more%20about%20the%20referral%20programme"
```

Replace with:
```tsx
<a href={waSales('Hi, I\'d like to know more about the referral programme')} target="_blank" rel="noreferrer"
```

Note: `Referral.tsx` also has `https://wa.me/?text=...` on line ~44 — that is a share URL (no phone number, uses device picker), leave it as-is.

- [ ] **Step 4: Commit**

```bash
git add src/pages/BuyingGuide.tsx src/pages/PolicyPage.tsx src/pages/Referral.tsx
git commit -m "fix: replace hardcoded WhatsApp URLs in BuyingGuide, PolicyPage, Referral with waSales()"
```

---

## Task 13: Footer — fix category links, remove WhatsApp button

**Files:**
- Modify: `src/components/layout/Footer.tsx`

- [ ] **Step 1: Replace category link generation**

Find the Products section in the footer:
```tsx
{['Air Conditioners','Refrigerators','Freezers','Washing Machines','Televisions','Solar Solutions','Kitchen Appliances'].map(c => (
  <li key={c}>
    <Link to={`/products/category/${c.toLowerCase().replace(/\s+/g,'-')}`}
      className="text-sm text-gray-400 hover:text-white transition-colors">{c}</Link>
  </li>
))}
```

Replace with:
```tsx
{[
  { label: 'Air Conditioners',   to: '/products?category=air-conditioners'   },
  { label: 'Refrigerators',      to: '/products?category=refrigerators'      },
  { label: 'Freezers',           to: '/products?category=freezers'           },
  { label: 'Washing Machines',   to: '/products?category=washing-machines'   },
  { label: 'Televisions',        to: '/products?category=televisions'        },
  { label: 'Solar Solutions',    to: '/solar'                                },
  { label: 'Kitchen Appliances', to: '/products?category=kitchen-appliances' },
].map(({ label, to }) => (
  <li key={label}>
    <Link to={to} className="text-sm text-gray-400 hover:text-white transition-colors">{label}</Link>
  </li>
))}
```

- [ ] **Step 2: Remove WhatsApp button from brand column**

Find the social button row:
```tsx
<div className="flex gap-2">
  <a href={waSales()} target="_blank" rel="noreferrer"
    className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-white bg-green-500 hover:bg-green-600 transition-colors">
    <MessageCircle className="h-4 w-4" /> WhatsApp
  </a>
  <a href="https://www.facebook.com/tajallishomecollection/" target="_blank" rel="noreferrer"
    className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors">
    <Facebook className="h-4 w-4" /> Facebook
  </a>
</div>
```

Replace with (remove WA, keep Facebook):
```tsx
<div className="flex gap-2">
  <a href="https://www.facebook.com/tajallishomecollection/" target="_blank" rel="noreferrer"
    className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors">
    <Facebook className="h-4 w-4" /> Facebook
  </a>
</div>
```

- [ ] **Step 3: Remove now-unused imports**

Remove `MessageCircle` from the lucide-react import in Footer.tsx since it's no longer used.
Remove `waSales` from the whatsapp import since it's no longer used.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/Footer.tsx
git commit -m "fix: footer category links use ?category= query params; remove WhatsApp button from footer per CTA governance"
```

---

## Task 14: Homepage — unify routing, merge solar CTAs, trim sections, remove WA from final CTA

**Files:**
- Modify: `src/pages/Home.tsx`

This task has the most changes. Work section by section.

- [ ] **Step 1: Fix HOME_CATEGORIES to use ?category= routing**

Find:
```ts
const HOME_CATEGORIES = [
  { id: 'cooling', name: 'Cooling & Refrigeration', icon: '❄️', group: 'cooling' },
  { id: 'laundry', name: 'Laundry',                 icon: '🫧', group: 'laundry' },
  { id: 'kitchen', name: 'Kitchen & Cooking',        icon: '🍳', group: 'kitchen' },
  { id: 'tv',      name: 'Televisions',              icon: '📺', group: 'tv'      },
  { id: 'solar',   name: 'Solar & Energy',           icon: '☀️', group: 'solar'   },
  { id: 'home',    name: 'Home & Comfort',           icon: '🏠', group: 'home'    },
]
```

Replace with:
```ts
const HOME_CATEGORIES = [
  { id: 'air-conditioners',   name: 'Air Conditioners',   icon: '❄️', to: '/products?category=air-conditioners'   },
  { id: 'refrigerators',      name: 'Refrigerators',      icon: '🧊', to: '/products?category=refrigerators'      },
  { id: 'washing-machines',   name: 'Washing Machines',   icon: '👕', to: '/products?category=washing-machines'   },
  { id: 'televisions',        name: 'Televisions',        icon: '📺', to: '/products?category=televisions'        },
  { id: 'solar',              name: 'Solar & Energy',     icon: '☀️', to: '/solar'                                },
  { id: 'kitchen-appliances', name: 'Kitchen & Cooking',  icon: '🍳', to: '/products?category=kitchen-appliances' },
]
```

- [ ] **Step 2: Update category grid links to use `to` field**

Find the category grid Link:
```tsx
<Link key={cat.id} to={`/products?group=${cat.group}`}
```

Replace with:
```tsx
<Link key={cat.id} to={cat.to}
```

- [ ] **Step 3: Remove standalone Trust Strip section**

Find and delete the entire "TRUST STRIP" section (the dark `bg-gray-950` section with animated counters):
```tsx
{/* ── TRUST STRIP ──────────────────────────────────────────── */}
<section className="bg-gray-950 py-14">
  <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
    {[
      ...
    ].map(item => (
      ...
    ))}
  </div>
</section>
```

Add a compact stat row to the Hero section instead, below the CTA buttons div:

Find the Hero CTA buttons div:
```tsx
<div className="flex flex-wrap gap-3">
  <Link to="/products" ...>Shop Now ...</Link>
  <Link to="/solar" ...><Zap .../> Solar Solutions</Link>
</div>
```

Add after that div (still inside the left column `<div>`):
```tsx
<div className="flex flex-wrap gap-x-6 gap-y-2 mt-6 text-sm text-gray-500">
  <span><strong className="text-gray-900 font-bold">11</strong> Years in Business</span>
  <span><strong className="text-gray-900 font-bold">14,400+</strong> Clients</span>
  <span><strong className="text-gray-900 font-bold">75%</strong> Return Rate</span>
  <span><strong className="text-gray-900 font-bold">24,000+</strong> Orders</span>
</div>
```

Also remove the `AnimatedCounter` import if it's no longer used anywhere else in Home.tsx:
```ts
import AnimatedCounter from '../components/ui/AnimatedCounter'
```
(Check before removing — if only used in the trust strip, remove it.)

- [ ] **Step 4: Remove standalone amber Solar CTA section**

Find and delete the entire "SOLAR CTA" section:
```tsx
{/* ── SOLAR CTA ────────────────────────────────────────────── */}
<section className="bg-gradient-to-r from-amber-500 via-brand-500 to-yellow-400 mx-4 md:mx-8 rounded-3xl overflow-hidden my-4">
  ...
</section>
```

- [ ] **Step 5: Add solar navigation CTAs inside Green Corridor Teaser**

In the Green Corridor Teaser section, find the existing CTA buttons:
```tsx
<div className="flex flex-col sm:flex-row gap-3 justify-center">
  <Link to="/solar-calculator"
    className="inline-flex items-center justify-center gap-2 bg-eco-500 hover:bg-eco-600 text-white font-bold px-8 py-4 rounded-2xl transition-colors shadow-eco">
    <Calculator className="w-4 h-4" /> Calculate Your Savings
  </Link>
  <Link to="/green-corridor"
    className="inline-flex items-center justify-center gap-2 border border-gray-700 text-gray-300 hover:bg-gray-800 font-medium px-8 py-4 rounded-2xl transition-colors">
    Explore Green Corridor <ChevronRight className="w-4 h-4" />
  </Link>
</div>
```

Replace with (add View Solar Products alongside existing CTAs):
```tsx
<div className="flex flex-col sm:flex-row gap-3 justify-center flex-wrap">
  <Link to="/solar-calculator"
    className="inline-flex items-center justify-center gap-2 bg-eco-500 hover:bg-eco-600 text-white font-bold px-8 py-4 rounded-2xl transition-colors shadow-eco">
    <Calculator className="w-4 h-4" /> Calculate Your Savings
  </Link>
  <Link to="/solar"
    className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-gray-600 text-gray-200 font-medium px-8 py-4 rounded-2xl transition-colors">
    View Solar Products <ChevronRight className="w-4 h-4" />
  </Link>
  <Link to="/green-corridor"
    className="inline-flex items-center justify-center gap-2 border border-gray-700 text-gray-400 hover:bg-gray-800 font-medium px-6 py-4 rounded-2xl transition-colors text-sm">
    Explore Green Corridor <ChevronRight className="w-4 h-4" />
  </Link>
</div>
```

- [ ] **Step 6: Remove WhatsApp from homepage Final CTA**

Find the Final CTA section buttons:
```tsx
<div className="flex flex-col sm:flex-row gap-4 justify-center">
  <Link to="/products" className="bg-brand-500 hover:bg-brand-600 text-white font-bold px-8 py-4 rounded-2xl transition-colors">
    Shop All Products
  </Link>
  <a href={waSales()} target="_blank" rel="noreferrer"
    className="bg-green-500 hover:bg-green-600 text-white font-bold px-8 py-4 rounded-2xl flex items-center gap-2 justify-center transition-colors">
    <MessageCircle className="w-4 h-4" /> WhatsApp Us
  </a>
</div>
```

Replace with:
```tsx
<div className="flex flex-col sm:flex-row gap-4 justify-center">
  <Link to="/products" className="bg-brand-500 hover:bg-brand-600 text-white font-bold px-8 py-4 rounded-2xl transition-colors">
    Shop All Products
  </Link>
  <Link to="/installments" className="border border-gray-600 text-gray-300 hover:bg-gray-800 font-bold px-8 py-4 rounded-2xl transition-colors">
    View Installment Plans
  </Link>
</div>
```

- [ ] **Step 7: Remove WHY RELIANCE section (content folded into Final CTA)**

Find and delete the standalone "WHY RELIANCE" section:
```tsx
{/* ── WHY RELIANCE ─────────────────────────────────────────── */}
<section className="max-w-7xl mx-auto px-4 py-14">
  ...
</section>
```

Add a compact 4-icon row inside the Final CTA section, between the heading and the buttons. Find:
```tsx
<section className="bg-gray-900 text-white py-16 px-4">
  <div className="max-w-3xl mx-auto text-center">
    <h2 className="text-3xl font-black mb-4">Ready to shop?</h2>
    <p className="text-gray-400 mb-8 text-lg">
```

After the `<p>` closing tag and before the buttons div, insert:
```tsx
<div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8 text-left sm:text-center">
  {[
    { icon: ShieldCheck, label: 'Authentic Products', sub: '100% genuine, full warranty' },
    { icon: CreditCard,  label: 'Easy Installments',  sub: '2–12 months, no bank needed' },
    { icon: Truck,       label: 'Home Delivery',      sub: 'Fast delivery & installation' },
    { icon: Headphones,  label: 'After-Sale Support', sub: 'Dedicated team, warranty claims' },
  ].map(({ icon: Icon, label, sub }) => (
    <div key={label} className="flex sm:flex-col items-start sm:items-center gap-3 sm:gap-2 bg-white/5 rounded-2xl p-4">
      <Icon className="w-5 h-5 text-brand-400 shrink-0" />
      <div>
        <p className="text-sm font-bold text-white">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{sub}</p>
      </div>
    </div>
  ))}
</div>
```

- [ ] **Step 8: Clean up unused imports in Home.tsx**

After all changes, check and remove any unused imports:
- `MessageCircle` — no longer used (removed from final CTA, never added elsewhere)
- `AnimatedCounter` — no longer used (trust strip removed)
- `waSales` — no longer used (WA button removed from final CTA)
- `Sun` — only used in the removed Solar CTA section; remove if no longer used

Keep: `ShieldCheck`, `CreditCard`, `Truck`, `Headphones` — now used in the final CTA trust row.

- [ ] **Step 9: Commit**

```bash
git add src/pages/Home.tsx
git commit -m "feat: homepage — unify category routing to ?category=, merge solar CTAs into Green Corridor, remove duplicate trust/WA sections, fold Why Reliance into Final CTA"
```

---

## Task 15: Add touch swipe to OfferBannerSlider

**Files:**
- Modify: `src/components/OfferBannerSlider.tsx`

- [ ] **Step 1: Add touch state ref and handlers**

After the `paused` state declaration, add:
```ts
const touchStartX = useRef<number | null>(null);
```

Add the `useRef` import to the existing React import if not already there:
```ts
import { useState, useEffect, useCallback, useRef } from 'react';
```

- [ ] **Step 2: Add onTouchStart and onTouchEnd to the section element**

Find:
```tsx
<section
  className="relative overflow-hidden"
  onMouseEnter={() => setPaused(true)}
  onMouseLeave={() => setPaused(false)}
>
```

Replace with:
```tsx
<section
  className="relative overflow-hidden"
  onMouseEnter={() => setPaused(true)}
  onMouseLeave={() => setPaused(false)}
  onTouchStart={e => { touchStartX.current = e.touches[0].clientX; }}
  onTouchEnd={e => {
    if (touchStartX.current === null || slides.length <= 1) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 50) delta < 0 ? next() : prev();
    touchStartX.current = null;
  }}
>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/OfferBannerSlider.tsx
git commit -m "feat: add touch swipe gesture to OfferBannerSlider for mobile"
```

---

## Self-Review

**Spec coverage check:**
- ✅ A1 — installment plan persistence: Tasks 2, 4, 5
- ✅ A2 — out-of-stock guard: Task 3
- ✅ A3 — remove misleading file upload: Task 5
- ✅ A4 — centralize hardcoded WA URLs: Tasks 6–12
- ✅ A5 — openWhatsApp fallback: Task 1
- ✅ B1 — footer category links fixed: Task 13
- ✅ B2 — homepage category routing: Task 14 Step 1
- ✅ C1 — merge solar CTAs: Task 14 Steps 4–5
- ✅ C2 — reduce section count: Task 14 Steps 3, 7
- ✅ D1 — remove WA from footer: Task 13 Step 2
- ✅ D2 — remove WA from homepage final CTA: Task 14 Step 6
- ✅ E1 — OfferBannerSlider touch swipe: Task 15

**Placeholder scan:** No TBDs, no "implement later", all code blocks are complete.

**Type consistency:** `PlanKey` defined in Task 2 (cartStore) used as `storedPlan: PlanKey` in Task 5 (Checkout). The type is consistent — `'cash'|'2m'|'3m'|'6m'|'12m'`. ProductDetail uses the same string union. ✅

**One gap found and fixed:** Task 14 Step 7 adds trust icons to Final CTA but imports `ShieldCheck`, `CreditCard`, `Truck`, `Headphones` — these are already imported in Home.tsx for `WHY_RELIANCE`, so removing the WHY_RELIANCE section doesn't break anything. The icons remain valid because they're now used in the Final CTA. ✅
