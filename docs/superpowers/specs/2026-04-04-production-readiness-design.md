# Production Readiness Design — Reliance by Tajallis
**Date:** 2026-04-04  
**Status:** Approved

---

## Overview

Transform the website from "partially polished" to genuinely live-ready with an Apple-like UX across phone, tablet, and desktop. This is a production cleanup — not a redesign. Every change must make the site materially better: more honest, more consistent, and more effortless to use.

---

## Constraints

- Do NOT touch pricing/installment calculation math
- Do NOT remove business content — merge, relocate, or consolidate instead
- WhatsApp remains primary CTA only on product pages and in the header
- May change cart store structure
- May remove fake/misleading UI (fake file upload)
- May centralize constants, shared utilities, taxonomy definitions

---

## A. Live-Readiness Fixes

### A1. Installment plan persistence (cart → checkout)

**Problem:** Cart store has no `selectedPlan` field. Checkout always initializes to `'cash'`.  
**Fix:**
- `cartStore.ts`: add `selectedPlan: 'cash'|'2m'|'3m'|'6m'|'12m'` and `setSelectedPlan()` action, persisted via Zustand `persist`.
- `ProductDetail.tsx`: on Add to Cart, also call `setSelectedPlan(plan)`.
- `Checkout.tsx`: initialize `const [plan, setPlan] = useState(cartStore.selectedPlan ?? 'cash')`.

### A2. Out-of-stock add-to-cart guard

**Problem:** ProductCard renders the Add to Cart quick-action button for out-of-stock and discontinued products.  
**Fix:**
- `ProductCard.tsx`: when `p.stock_status !== 'In Stock'`, disable/hide the cart quick-action button. `handleAdd` should early-return if stock isn't available.

### A3. Remove misleading file-upload UI

**Problem:** `Checkout.tsx` has `input[type=file]` that stores a file in state but never uploads it. The post-order screen implies the file was attached when it wasn't.  
**Fix:**
- Remove the file picker input entirely.
- Replace with a clear instruction block: "After placing your order, send your transfer screenshot to +92 370 2578788 on WhatsApp." Include a pre-filled WhatsApp button showing the order reference.
- The post-order "transferFile" block is also removed since there's no file to reference.

### A4. Centralize all hardcoded WhatsApp URLs

**Problem:** Multiple files use hardcoded `https://wa.me/923702578788?text=...` instead of the `waSales()` / `waOrder()` utility in `whatsapp.ts`. If the number changes, every file must be manually updated.

**Files to fix:**
- `Cart.tsx`: replace hardcoded `waLink` with `waOrder(summaryText)`
- `BuyingGuide.tsx`: replace hardcoded WA href with `waSales(msg)`
- `PolicyPage.tsx`: replace hardcoded WA href with `waSales()`
- `Referral.tsx`: replace hardcoded WA hrefs with `waSales(msg)`
- `Support.tsx`: replace hardcoded `wa.me` in `window.open` and anchors with `waSales(msg)` or `wa(WA_SALES, msg)`
- `misc.tsx` (Services + Corporate): replace hardcoded WA hrefs with `waSales(msg)` and `waAdmin(msg)` respectively
- `SolarCalculator.tsx`: replace `window.open(https://wa.me/...)` with `openWhatsApp(waSales(msg))`
- `Portal.tsx`: replace hardcoded WA in `window.open` and href with `waSales(msg)`
- `OffGridSolar.tsx`: uses `WA_NUMBER` local var — replace with `WA_SALES` from `config.ts`

**No functional change** — same numbers, same messages.

### A5. WhatsApp graceful fallback

**Problem:** All WhatsApp links open in a new tab. If the WhatsApp URL fails (app not installed, blocked popup), there's no fallback.  
**Fix:**
- Add `openWhatsApp(url: string): void` to `whatsapp.ts`:
  ```ts
  export function openWhatsApp(url: string): void {
    try {
      const w = window.open(url, '_blank', 'noopener,noreferrer')
      if (!w) window.location.href = url
    } catch {
      window.location.href = url
    }
  }
  ```
- For programmatic opens (`window.open(waUrl, '_blank')` calls), replace with `openWhatsApp(url)`.
- `<a>` tags that already have `target="_blank" rel="noreferrer"` are fine — browsers handle these gracefully.

---

## B. Navigation & Routing Unification

### B1. Standardize category URL pattern

**Problem:** Three different URL patterns route to the Products page with a category:
1. Navbar: `?category=air-conditioners`
2. Homepage: `?group=cooling` (legacy group)
3. Footer: `/products/category/air-conditioners` (route param)

All technically work but create URL inconsistency and make filtering/tracking harder.

**Fix:** Standardize on `?category=<id>` (the pattern Navbar already uses — matches `PRIMARY_BROWSE_CATS` IDs).
- `Footer.tsx`: Change category links from `/products/category/${slug}` to `/products?category=${id}`. Use the same canonical IDs as `PRIMARY_BROWSE_CATS`.
- `Home.tsx` `HOME_CATEGORIES`: Change `?group=` links to `?category=` with the correct `PRIMARY_BROWSE_CATS` IDs.
- The `/products/category/:categorySlug` route and `categorySlug` param handling in Products.tsx can remain for SEO/external links — just stop generating new links using it.

**Category ID mapping for Footer/Home:**
| Label | Old | New |
|---|---|---|
| Air Conditioners | `/category/air-conditioners` or `?group=cooling` | `?category=air-conditioners` |
| Refrigerators | `/category/refrigerators` | `?category=refrigerators` |
| Freezers | `/category/freezers` | `?category=freezers` |
| Washing Machines | `/category/washing-machines` | `?category=washing-machines` |
| Televisions | `/category/televisions` | `?category=televisions` |
| Solar Solutions | `/category/solar-solutions` | `/solar` (dedicated page) |
| Kitchen Appliances | `/category/kitchen-appliances` | `?category=kitchen-appliances` |

---

## C. Homepage Simplification

### C1. Merge duplicate solar CTAs (Option A)

**Problem:** Two back-to-back solar promotional sections:
1. "Green Corridor Teaser" — dark, with Solar→Battery→AC journey
2. "Solar CTA" — amber gradient, solar calculator promo

**Fix:** Remove the standalone amber "Solar CTA" section. Keep only the Green Corridor Teaser. Add a compact 2-button CTA row to the Green Corridor Teaser: "Calculate Your Savings" (primary) + "View Solar Products" (secondary). All navigation value preserved.

### C2. Reduce section fatigue

**Problem:** Homepage has 14 sections. Too many repeated "shop now" and trust signals.

**Fix:** Reduce to 10 cohesive sections by:
1. Removing standalone "Solar CTA" (merged into Green Corridor — see C1)
2. Moving the dark "Trust Strip" (animated counters) inline into the Hero section as a subtle stat row below the CTA buttons. Remove it as a standalone full-width section.
3. Compressing "Why Choose Reliance?" from a standalone section into a 4-icon horizontal strip inside the Final CTA section (it already echoes the Trust Strip; this keeps the content without the repetition of a dedicated section).

**New section order:**
1. Hero (with inline trust stats)
2. Category Grid
3. Offer Banners
4. MYOP Promo
5. Featured Products
6. Installment Engine
7. Green Corridor (merged solar CTAs)
8. Brands
9. Tools
10. Gallery + Final CTA (combined: gallery strip → why-reliance 4 icons → final CTA buttons)

---

## D. CTA Governance

### D1. Remove WhatsApp from footer

**Fix:** `Footer.tsx` — remove the WhatsApp button from the brand column. Keep Facebook link and the phone/email contact list. WhatsApp is in the header; no need to double it in the footer.

### D2. Remove WhatsApp from homepage Final CTA

**Fix:** `Home.tsx` — in the "Ready to shop?" section, remove the green "WhatsApp Us" button. Keep only "Shop All Products". Users who want WhatsApp can use the header icon.

### D3. Preserved WhatsApp placements (correct)
- Navbar header phone icon → `waSales()` ✓
- ProductCard quick-action WhatsApp → `waProduct()` ✓
- ProductDetail page WhatsApp CTA → `waProduct()` / `waInstallment()` ✓
- Cart "Order via WhatsApp" button → keep (cart is a pre-purchase context; acceptable)

---

## E. Mobile/Tablet Quality

### E1. OfferBannerSlider: add touch swipe

**Fix:** `OfferBannerSlider.tsx` — add `onTouchStart` / `onTouchEnd` handlers:
- Store `touchStartX` on start
- On end: if `|deltaX| > 50px`, advance (negative delta) or retreat (positive delta) the slide
- No external library needed

### E2. Products page sticky stacking

**Fix:** Audit the Products page sticky filter panel on mobile. Ensure any sticky sub-element uses `top-14` (56px = navbar height) so it doesn't stack below another sticky bar. Remove any redundant sticky positioning on mobile.

---

## F. Out-of-scope (confirmed)

- AdminPortal.tsx hardcoded WA links — internal admin tool, not customer-facing
- Dashboard.tsx WA links — internal
- Pricing/installment calculation math — untouched
- Green Corridor page content — untouched
- Route structure for `/products/category/:categorySlug` — kept for SEO/backward compat

---

## Files Changed

| File | Change |
|---|---|
| `store/cartStore.ts` | Add `selectedPlan` field |
| `pages/ProductDetail.tsx` | Call `setSelectedPlan()` on add to cart |
| `pages/Checkout.tsx` | Read `selectedPlan` from store; remove file upload UI |
| `components/products/ProductCard.tsx` | Block add-to-cart for non-In-Stock |
| `lib/whatsapp.ts` | Add `openWhatsApp()` helper |
| `pages/Cart.tsx` | Use `waOrder()` instead of hardcoded URL |
| `pages/BuyingGuide.tsx` | Use `waSales()` |
| `pages/PolicyPage.tsx` | Use `waSales()` |
| `pages/Referral.tsx` | Use `waSales()` |
| `pages/Support.tsx` | Use `waSales()` / `openWhatsApp()` |
| `pages/misc.tsx` | Use `waSales()` / `waAdmin()` |
| `pages/SolarCalculator.tsx` | Use `openWhatsApp(waSales(msg))` |
| `pages/Portal.tsx` | Use `waSales()` |
| `pages/OffGridSolar.tsx` | Use `WA_SALES` from config |
| `components/layout/Footer.tsx` | Fix category links; remove WA button |
| `pages/Home.tsx` | Merge solar CTAs; simplify sections; fix category routing; remove WA from final CTA; inline trust stats |
| `components/OfferBannerSlider.tsx` | Add touch swipe |
