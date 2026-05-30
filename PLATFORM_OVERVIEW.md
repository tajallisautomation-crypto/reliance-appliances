# Tajalli's Home & Commercial Solutions — Platform Overview

<!-- AUTO:last-updated -->
**Version 4.0.1 · Last updated: 2026-05-30**  
**Domain:** reliance.tajallis.com.pk · **Stack:** Next.js 14 + Supabase + Vercel
<!-- /AUTO:last-updated -->

> **Auto-updated sections** — Routes, migrations, file inventory, and dependencies are regenerated
> from source files automatically. All other prose is manually maintained.
> Run `node scripts/update-platform-docs.mjs` to refresh manually.

---

## Table of Contents

1. [Company & Brand](#1-company--brand)
2. [Technical Stack](#2-technical-stack)
3. [Site Structure — All Routes](#3-site-structure--all-routes)
4. [Navigation](#4-navigation)
5. [Homepage Sections](#5-homepage-sections)
6. [Product System](#6-product-system)
7. [Solar Ecosystem](#7-solar-ecosystem)
8. [Installment System](#8-installment-system)
9. [Shopping Cart & Checkout](#9-shopping-cart--checkout)
10. [Package Builder — MYOP](#10-package-builder--myop)
11. [Bundle Offers](#11-bundle-offers)
12. [Services & Care Plans](#12-services--care-plans)
13. [Customer Portal](#13-customer-portal--portal)
14. [Admin Portal](#14-admin-portal--admin)
15. [Reports Portal](#15-reports-portal--reports)
16. [Customer Lifecycle Engine](#16-customer-lifecycle-engine)
17. [WhatsApp Integration](#17-whatsapp-integration)
18. [Referral System](#18-referral-system)
19. [SEO & Meta](#19-seo--meta)
20. [Database Schema & Migrations](#20-database-schema--migrations)
21. [Visual Assets & Graphics](#21-visual-assets--graphics)
22. [Key Business Rules](#22-key-business-rules)
23. [Known Gaps & Pending Work](#23-known-gaps--pending-work)
24. [File Inventory](#24-file-inventory)
25. [Dependencies](#25-dependencies)
26. [Contact & Credentials Reference](#26-contact--credentials-reference)

---

## 1. Company & Brand

| Field | Value |
|-------|-------|
| **Full name** | Tajalli's Home & Commercial Solutions |
| **Short name** | Tajalli's |
| **NTN** | 42101-3836602-3 |
| **City** | Karachi |
| **Est.** | 2015 |
| **Primary domain** | reliance.tajallis.com.pk |
| **Customer WhatsApp** | +92 370 2578788 |
| **Sales email** | sales@tajallis.com.pk |
| **Support email** | support@tajallis.com.pk |
| **Facebook** | facebook.com/tajallishomecollection |
| **Address** | L-152-153, Sector 11C-1, UP More, North Karachi |

### Brand Voice
- Tagline: **Delivered · Installed · Supported**
- Bilingual (English + Roman Urdu in WhatsApp)
- Consultative tone — never pushy
- Trust signals embedded in all communication (warranty, years in business, job count)

### Key Metrics (used across the site)
- 11+ years in business
- 14,400+ homes & businesses served
- 24,000+ jobs completed
- 75% repeat customers

---

## 2. Technical Stack

| Layer | Technology |
|-------|-----------|
| **Frontend framework** | Next.js 14 (App Router) + React 18 + TypeScript |
| **Rendering** | SSR + ISR (per-page `revalidate`) on Vercel — not a SPA |
| **Styling** | Tailwind CSS 3.4 (custom color scales: brand-, eco-, gold-) |
| **Routing** | Next.js App Router (`app/*/page.tsx` server components wrap `src/views/` client components) |
| **State management** | Zustand — 6 stores (cart, auth, adminAuth, settings, compare, myop) |
| **Database** | Supabase (Postgres + Row Level Security + Realtime) |
| **Auth — customers** | Supabase Auth (email + password) via `authStore` |
| **Auth — staff/admin** | Supabase Auth + `staff_members` DB table via `adminAuthStore` |
| **Hosting** | Vercel (Next.js native deployment) |
| **PDF generation** | jsPDF + jsPDF-autotable |
| **Charts** | Recharts |
| **Icons** | Lucide React |
| **Notifications** | react-hot-toast |
| **SEO** | Next.js metadata API (`export const metadata`) + `generateMetadata` per route |
| **Analytics — public traffic** | Plausible (privacy-first, no cookies, injected in `app/layout.tsx`) — page views, referrers, device stats |
| **Analytics — business events** | Supabase `analytics` table — product views, search queries, cart events, WhatsApp CTA clicks, checkout starts; consumed by ReportsPortal |
| **Sitemap** | Next.js native `app/sitemap.ts` (server function — fetches live product slugs from DB) |
| **Excel export** | xlsx |
| **QR codes** | qrcode |

### Zustand Stores
| Store | Persists? | Purpose |
|-------|-----------|---------|
| `cartStore` | ✅ localStorage `tajallis-cart` | Shopping cart items + qty + selected plan |
| `authStore` | ❌ | Logged-in customer session + password recovery mode |
| `adminAuthStore` | ❌ | Staff session + role, bootstrapped from Supabase auth state |
| `settingsStore` | ❌ | Site settings pulled from DB (banners, plan rates, thresholds) |
| `compareStore` | ✅ localStorage `tajalli-compare` | Products queued for side-by-side comparison (max 4 items enforced in store) |
| `myopStore` | ✅ localStorage `tajallis-myop` | Package builder selections, survives navigation and refresh |

### Project Structure
```
app/                     ← Next.js App Router (server components, metadata exports)
  layout.tsx             ← Root layout: LocalBusiness schema, Plausible, Google Fonts
  page.tsx               ← Home route (renders src/views/Home.tsx)
  [route]/page.tsx       ← Each route = server component wrapping a src/views/ client component
  sitemap.ts             ← Dynamic sitemap: static routes + categories + brands + all product slugs

src/
  views/                 ← Client components (one per route, 32 files)
  components/            ← Shared UI components (layout, admin, portal, products, ui, common)
  store/                 ← Zustand stores (6 files)
  lib/                   ← Business logic, Supabase queries, utilities
  styles/                ← Global CSS

api/                     ← Vercel serverless functions (legacy, pre-App Router)
  sitemap.xml.js         ← 308 redirect → /sitemap.xml (retired; safe to delete after GSC confirms no traffic)
  catalog-refresh.js     ← Cron target: daily product data refresh (scheduled via vercel.json at 02:00)
  meta-catalog.js        ← WhatsApp/Meta Commerce CSV feed — generates catalog for WhatsApp Shopping
  meta-sets-sync.js      ← Meta Catalog Product Sets sync — creates/updates category sets in Commerce Manager

scripts/                 ← Node.js maintenance and CI scripts
  update-platform-docs.mjs        ← Auto-regenerates AUTO: sections in this file
  check-no-admin-number.mjs       ← Pre-build security check: blocks build if admin number leaks into client code
  platform-truth-check.mjs        ← Audit script: validates doc against live file tree
  rebalance-categories.mjs        ← One-off: rebalance product taxonomy categories
  add_hanco_water_heater.mjs      ← One-off: seed Hanco water heater products
```

### Key Source Files
| File | Role |
|------|------|
| `app/layout.tsx` | Root layout: metadata, LocalBusiness schema, Plausible, font loading |
| `src/lib/api.ts` | All Supabase queries, product logic, plan calculations |
| `src/lib/config.ts` | Brand constants, env vars |
| `src/lib/whatsapp.ts` | All WhatsApp URL builders + 16 template categories |
| `src/lib/services.ts` | Structured service catalog + business rules |
| `src/lib/solarRules.ts` | Single source of truth for all solar pricing constants |
| `src/lib/compatibility.ts` | Solar inverter/battery voltage compatibility engine |
| `src/lib/search.ts` | Full-text search index + scoring |
| `src/lib/taxonomy.ts` | Category normalisation registry |
| `src/lib/plans.ts` | Live installment plan ratio management |

---

## 3. Site Structure — All Routes

### Public / Customer Pages

<!-- AUTO:routes-public -->
| Route | Page | Purpose |
|-------|------|---------|
| `/` | Home | Main landing page |
| `/about` | About | Company story + values |
| `/brands/[brandSlug]` | BrandProducts | Brand-filtered product listing (SEO landing page) |
| `/build-your-package` | MYOP | Make Your Own Package builder |
| `/bundles` | BundlesPage | 4 pre-configured bundle offers |
| `/buying-guide` | BuyingGuide | Appliance buying advice |
| `/cart` | Cart | Shopping cart |
| `/checkout` | Checkout | Order placement + payment selection |
| `/compare` | ComparePage | Side-by-side product comparison |
| `/contact` | Contact | Phone, email, map |
| `/corporate` | Corporate | B2B / commercial dedicated page |
| `/gallery` | Gallery | Installation photo gallery |
| `/green-corridor` | GreenCorridor | Green energy strategy + bill-to-package calc |
| `/installments` | Installments | Installment plans, calculator, FAQs |
| `/partner` | Partner | Partnership programme |
| `/policy/[type]` | PolicyPage | 8 types: privacy / terms / warranty / refund / installment / care-plan / solar / service |
| `/portal` | Portal | Customer self-service dashboard (auth gated) |
| `/products` | Products | Full product catalogue with filters |
| `/products/[slug]` | ProductDetail | Individual product page |
| `/products/category/[categorySlug]` | Products | Category pre-filtered view |
| `/referral` | Referral | Refer & Earn programme |
| `/search` | SearchResults | Full search results |
| `/services` | Services | Service pricing + care plans |
| `/solar` | SolarPage | Solar & UPS configurable packages |
| `/solar-calculator` | SolarCalculator | Interactive solar sizing tool (3-step) |
| `/solar/off-grid` | OffGridSolar | Off-grid solar information |
| `/support` | Support | Customer support + complaints |
| `/tools` | ToolsPage | Bill savings calc + UPS/battery calc |
<!-- /AUTO:routes-public -->

### Admin / Internal Pages

<!-- AUTO:routes-admin -->
| Route | Page | Purpose |
|-------|------|---------|
| `/admin` | AdminPortal | Admin CMS — Supabase staff auth (role-based) |
| `/catalog` | → /admin | Legacy bookmark redirect |
| `/reports` | ReportsPortal | BI analytics dashboard — Supabase staff auth (reports role) |
<!-- /AUTO:routes-admin -->

### Error Pages
| File | Purpose |
|------|---------|
| `app/not-found.tsx` | Custom 404 page — rendered by Next.js App Router on unmatched routes |

### Policy Pages (`/policy/:type`)
`privacy` · `terms` · `warranty` · `refund` · `installment` · `care-plan` · `solar` · `service`

---

## 4. Navigation

### Navbar (2 rows, sticky)
**Row 1:** Logo · Search bar (desktop inline) · WhatsApp icon · Account icon · Cart icon · Hamburger (mobile/tablet)

**Row 2 — desktop only (lg+):**
Products *(with 9-category mega-menu dropdown)* · Build a Package · Installments · Solar & Backup · For Business · Green Corridor · Resources *(Gallery, Buying Guide, Services)*

### Mobile Menu (4 collapsible accordion groups)
- **Shop:** Products, Build a Package, Installments, For Business
- **Solar & Backup:** Solar & Backup Solutions, Green Corridor, Solar Calculator
- **Tools & Guides:** Tools & Calculators, Buying Guide, Gallery
- **More:** My Account, Services, Partner, Refer & Earn, Support, About, Contact

### Footer (4 columns, collapsible on mobile)
- **Brand column:** Logo, tagline, Facebook link
- **Products column:** 7 category links
- **Services column:** 10 links including Customer Portal + WhatsApp area check CTA
- **Contact column:** Phone, 2 emails, address with Google Maps link
- **Authorized brands strip:** Haier · Dawlance · Westpoint · EcoStar · Gree · Hanco · Crown Solar · Ziewnic · Welcome · GFC · Orange LED
- **Policy bar:** Privacy · Terms · Warranty · Refund · Installments · Solar Disclaimer

---

## 5. Homepage Sections

The homepage loads featured products and gallery images from DB. Sections in order:

| # | Section | Notes |
|---|---------|-------|
| 1 | **Hero** | 45/55 two-column. Left: headline + 5 primary CTAs. Right: 4-slot rotating installation collage (fades every 5s, loaded from gallery DB) |
| 2 | **Hero Stats** | 11+ years · 14,400+ served · 24,000+ jobs · 75% repeat |
| 3 | **Recent Job Toast** | Fixed bottom-left floating toast — appears after 3s, rotates 6 entries every 9s |
| 4 | **Shop by Category** | 9 icon-tile grid linking to category or /solar |
| 5 | **Offer Banner Slider** | Up to 5 admin-configurable promotional banners |
| 6 | **MYOP Promo** | Dark card promoting /build-your-package with 5 example package chips |
| 7 | **Installment Engine** | Live calculator — select plan (2/3/6/12 months), enter price, shows advance + monthly + total |
| 8 | **Green Corridor Teaser** | Dark section with 7 product-type chips, CTAs to /green-corridor and /solar-calculator |
| 9 | **For Businesses** | 6 commercial use-case cards + CTAs to /corporate and WhatsApp business quote |
| 10 | **Brands** | Featured row (Haier, Crown, Westpoint) + secondary row (Dawlance, Gree, EcoStar) |
| 11 | **Tools** | 4-card grid: Solar Calc, Package Builder, Installment Calc, UPS & Battery Calc |
| 12 | **Bundle Section** | 4 bundle offer cards with WhatsApp CTAs |
| 13 | **Gallery Strip** | 6 installation photos from media_gallery DB |
| 14 | **Service Areas** | 16 Karachi area pills + WhatsApp "check your area" CTA |
| 15 | **Trust Band** | Dark section: 4 big metrics + 4 proof pillars (authentic, installments, delivery, support) |
| 16 | **Customer Reviews** | DB-driven via `getFeaturedReviews()` — pulls `status='approved' AND is_featured=true` from `reviews` table; `service_label` used as badge text. Migration `20260527_reviews_homepage.sql` adds `service_label` column and seeds 6 entries. Hardcoded `REVIEWS` constant kept as fallback. |
| 17 | **Featured Products** | 8 DB-driven products (Haier/Crown/Westpoint sorted first) |
| 18 | **Services & Care Plans** | Service packages card + Essential/Plus/Elite care plan tier cards |
| 19 | **Social Proof Loop** | Scrolling bottom ticker |

---

## 6. Product System

### Brands Carried
Haier · Dawlance · Gree · EcoStar · PEL · Orient · Samsung · TCL · Westpoint · Crown · Waves · Hanco · Ziewnic · Welcome · GFC · Orange LED

### Categories (9 main)
Air Conditioners · Refrigerators · Washing Machines · Freezers · Televisions · Solar/UPS/Backup · Kitchen Appliances · Water Dispensers · Small Appliances

### Products Page Features
- Filters: Category, Brand, Budget range (Under 20k / 20k–50k / 50k–1 Lac / 1–2 Lac / Above 2 Lac)
- Sort: Featured / Newest / Price ↑ / Price ↓ / Name A–Z
- **Deep subcategories** via `?sub=` URL param — pre-sets spec combos (T3 ACs, inverter fridges, front-load WMs, etc.)
- Grid / List view toggle
- All filter state in URL (shareable, bookmarkable)
- ~993 active products

### Product Detail Page Features
- Image gallery with lightbox zoom
- Plan selector: Cash / 2 / 3 / 6 / 12 months — live advance + monthly calculation
- Custom advance override
- Installation add-on toggle (ACs, washing machines — not fridges/TVs)
- Tabs: **Specs · About · Installation · Reviews · Price History**
- Solar Compatibility Panel (inverter/battery products only)
- Related products + Alternative products sections
- Price history chart (from audit log)
- Add to Cart + WhatsApp enquiry CTAs
- Consultation flow for orders > PKR 1,000,000
- JSON-LD product schema for SEO

### Product Card Features
- Lazy-loaded image with `BrandedImage` + placeholder fallback
- Savings badge (% off retail vs cash price)
- T3 badge (only genuine T3-rated models — governance enforced in code)
- Stock status badge
- Best installment plan shown
- Add to cart with toast notification
- Compare button
- WhatsApp enquiry link

---

## 7. Solar Ecosystem

### Solar Page (`/solar`)
Five configurable packages — customer picks inverter brand (Crown or Ziewnic) and battery brand:

| Package | kW | Type | Price source |
|---------|-----|------|-------------|
| UPS System | 3.6kW | UPS (no rooftop) | Crown prices from DB |
| Solar Starter | 3.6kW | Solar | Crown prices from DB |
| Solar Home | 5kW | Solar | Crown prices from DB *(Most Popular)* |
| Ziewnic Solar | 5.5kW | Solar | Catalog + 15% Tajalli margin |
| Solar Premium | 8kW | Solar | Crown prices from DB |

- Crown prices fetched live from the products DB at page load
- Ziewnic prices: Jan 2026 catalog + 15% Tajalli margin, rounded to nearest PKR 1,000
- Frame toggle: elevated galvanized steel frame ± PKR 96,000 (3.6kW package)
- Solar leads captured to `solar_leads` DB table

### Solar Calculator (`/solar-calculator`) — 3-step wizard
**Step 1:** Add appliances from a library of 40+ types with real wattage values  
**Step 2:** System configuration — battery kWh, net metering opt-in, elevated frame toggle  
**Step 3:** Cost breakdown + lead capture form

Key rules:
- Panel: Crown Bi-Facial 620W @ PKR 30,000 each
- Net metering: requires ≥ 10kW, adds PKR 250,000 one-time
- Solar > 5kW or > PKR 700,000 → cash only (no installments)
- 24V batteries only for inverters < 3.7kW; 48V required for > 4.0kW

### Green Corridor (`/green-corridor`)
Three-step energy independence journey: **Solar panels → Inverter ACs → Battery storage**

**Bill-to-package calculator** (thresholds from `solarRules.ts`):
| Monthly Bill | Recommended Package | Bill Saving |
|---|---|---|
| < PKR 15,000 | 3kW Starter (from PKR 450k) | ~57.5% |
| PKR 15k–40k | 5kW Home Complete (from PKR 850k) | ~72.5% |
| PKR 40k–45k | 5kW Home Complete (from PKR 850k) | ~72.5% |
| PKR 45k–60k | 6kW Advanced | ~77.5% |
| PKR 60k–75k | 7kW Premium | ~80% |
| PKR 75k–80k | 8kW Total Freedom (from PKR 1.4M) | ~82.5% |
| > PKR 80,000 | 10kW Ultimate (net metering zone) / 12kW Industrial | ~85–88% |

Note: saving percentages are base figures from `SAVING_PCT_*` constants; all Green Corridor packages include battery storage (additional ~5% peak-shaving bonus via `SAVING_PCT_BATTERY_ADDON`).

### Solar Rules — single source of truth (`src/lib/solarRules.ts`)
All pages and tools import from this file — values are never duplicated.
- Electricity rate: PKR 70/kWh (K-Electric blended average, 300–700 unit consumers)
- Panel: 620W Crown Bi-Facial @ PKR 30,000 (PKR 48.39/W)
- Installation: Wiring PKR 12/W + Labor PKR 6/W (solar); Wiring PKR 9/W + Labor PKR 3/W (UPS)
- Elevated frame: PKR 17,500 per panel (14-gauge galvanised steel)
- Battery fallback: PKR 65,000/kWh; Inverter fallback: PKR 55,000/kW
- Default battery chemistry: LiFePO₄ (lithium) — not Tall Tubular
- Net metering: ≥ 10kW, PKR 250,000 one-time cost
- Cash-only thresholds: > 5kW or > PKR 700,000
- Installment limits: > PKR 500k = max 2 payments; > PKR 150k = max 6 payments

---

## 8. Installment System

### Plans (admin-configurable live via Settings tab in `/admin`)
| Plan | Default Markup | Default Advance | Monthly Payments |
|------|----------------|-----------------|------------------|
| 2 Payments | 10% (1.10×) | 50% | 1 |
| 3 Payments | 15% (1.15×) | 45% | 2 |
| 6 Payments | 25% (1.25×) | 40% | 5 |
| 12 Payments | 40% (1.40×) | 30% | 11 |

- 12-month plan requires minimum PKR 50,000 (fans qualify at any price)
- Solar > 5kW or > PKR 700k = cash only
- Solar > PKR 500k = max 2 payments; > PKR 150k = max 6 payments
- Markup and advance ratios are editable by admin and push live immediately to all calculators

### Buyer Requirements
- **1 guarantor** if buyer OR guarantor is an existing Tajalli's customer (homeowner, not tenant)
- **2 guarantors** if neither is an existing customer
- **Documents:** NIC + utility bill (buyer); NIC + utility bill (each guarantor)
- **Home verification** within 4 working days
- **Late payment penalty:** 1% per day on outstanding principal; recovery proceedings after 30 days
- **Refund if all applications rejected:** Full refund unless forgery found — 10% service charge deducted

---

## 9. Shopping Cart & Checkout

### Cart
- Slide-in `CartDrawer` from Navbar cart icon
- Qty controls, item removal
- Cart persists across refreshes via Zustand `persist` middleware (localStorage key `tajallis-cart`)

### Checkout (`/checkout`)
- Customer details: name, phone, address
- Payment method: JazzCash · EasyPaisa · Bank Transfer
- QR code display + bank account details for transfer payments
- Order submitted to `orders` table in Supabase
- WhatsApp order confirmation message generated

### Payment Accounts
- **JazzCash / EasyPaisa:** Registered under "Reliance by Tajallis" — do not change this account name
- **Bank transfer:** Meezan Bank QR (`/meezan-qr.jpeg`), generic bank QR (`/bank-qr.jpeg`)

---

## 10. Package Builder — MYOP (`/build-your-package`)

- Multi-category product selector: ACs, Fridges, Washing Machines, TVs, Solar, Kitchen
- Solar compatibility check (24V/48V battery voltage validated via `compatibility.ts`)
- **5% bundle discount** automatically applied for 3+ items
- Installment plan calculation on package total
- Session-persistent via `myopStore` (Zustand with persist)
- WhatsApp summary message with full itemised order
- Pre-set example packages shown in hero: New Home, Salon Backup, Apartment Comfort, Office Essentials, Solar-Ready Home

---

## 11. Bundle Offers

Available at `/bundles` and as `BundleSection` component injected into the homepage.

| Bundle | Discount | Includes |
|--------|----------|---------|
| **AC Complete Package** | 5% | Inverter AC + professional install + voltage stabilizer + free solar consult |
| **Fridge & Home Bundle** | 4% | Inverter fridge + anti-vibration mat + free delivery + 1-yr care plan option |
| **Laundry Starter Pack** | 5% | Washing machine + stand + professional install + 1-yr service plan |
| **Solar Power Bundle** | 3% | Solar panels + hybrid inverter + battery bank + AC compatibility check |

Each bundle has a dedicated WhatsApp CTA pre-filled with a bilingual message.
Bundle seed data lives in `supabase/migrations/20260525_bundle_seed.sql`.

---

## 12. Services & Care Plans

### Service Price List (key prices at `/services`)

| Service | Price |
|---------|-------|
| Technician visit (no work done) | PKR 2,000 |
| AC cleaning & checkup | PKR 2,500 |
| AC master service (split) | PKR 4,500 |
| AC master service (floor standing) | PKR 7,500 |
| Solar cleaning & maintenance | PKR 6,500 |
| 1 ton AC leakage repair | PKR 13,000 |
| 1.5 ton AC leakage repair | PKR 17,000 |
| 2 ton AC leakage repair | PKR 24,000 |
| 1 ton coil change | PKR 30,000 |
| AC card repair | PKR 15,000 |
| AC card replacement | PKR 25,000 |
| Dispenser tap replacement | PKR 3,000 |
| Fridge leakage repair | PKR 10,000 |

Full price list in `src/views/misc.tsx` → `PRICE_LIST_SECTIONS`.

### Annual Care Plans

| Plan | Price/Year | Visits | Key Benefits |
|------|-----------|--------|-------------|
| **Essential** | From PKR 3,000 | 1 | Basic inspection, 10% off parts, 72hr response |
| **Plus** *(Best Value)* | From PKR 6,500 | 2 | Parts covered, maintenance labor included, 48hr priority |
| **Elite** | From PKR 13,650 | 3 | Repairs + parts + replacement if non-repairable, 24hr priority |

### Business Rules (enforced in `services.ts`)
- Brand-provided installations are **not charged** by Tajalli's
- Tajalli-performed installations are charged at Tajalli rates
- Site consultation required **only** for orders > PKR 1,000,000
- Diagnosis-first policy: visit fee forfeited if customer declines work after diagnosis

---

## 13. Customer Portal (`/portal`)

A full self-service dashboard available to logged-in customers.

### Authentication
- Email sign-in / sign-up / forgot-password via `AuthModal`
- Anonymous order lookup requires **both** phone number AND order ID (not either/or)
- Password recovery via Supabase email link → `SetNewPasswordView`

### Primary Tabs (always visible in tab bar)

| Tab | Component | Content |
|-----|-----------|---------|
| 🏠 Overview | `PortalOverview` | Welcome + loyalty tier + service alerts + installment alert + 4 module cards + recent orders |
| 🛡️ Care Plans | `PortalCarePlans` | Annual care plan status and management |
| 📋 Orders | `PortalOrders` | Order history with 6-step status timeline |
| 💳 Payments | `PortalPayments` | Installment schedules, bank details, payment proof upload |
| 📝 Installments | `PortalInstallments` | Active installment applications + approval status |
| 🕐 Timeline | `PortalTimeline` | Full service and purchase history timeline |
| 🎫 Support | `PortalSupport` | Quick-action chips, ticket form, ticket list |
| ⚙️ Account | `PortalAccount` | Profile, change password, sign out |

### Secondary Tabs (accessed via Overview module cards)

| Tab | Component | Content |
|-----|-----------|---------|
| Appliances | `PortalAppliances` | Register appliances with brand/model/year/serial, request service, claim warranty; solar/UPS capacity stored in notes JSON |
| Recommendations | `PortalRecommendations` | Energy load analysis — compares solar/UPS capacity vs appliance load, suggests upgrades |
| Referrals | `PortalReferrals` | Personal referral code + shareable link, earnings history |
| Loyalty | `PortalLoyalty` | Bronze → Silver → Gold → Platinum tier, points history, how-to-earn guide |

### Service Reminder Logic
| Appliance | Interval |
|-----------|----------|
| AC / Washing Machine / Geyser | 365 days |
| Fridge / Freezer | 730 days |

### DB Tables
`customer_profiles` · `customer_appliances` · `loyalty_transactions` · `referral_earnings` · `support_tickets` · `payment_proofs` · `installment_applications` · `customer_care_plans`

---

## 14. Admin Portal (`/admin`)

**Auth:** Supabase email auth + `staff_members` DB table (role: `owner | admin | sales | finance | service | reports`). Staff must exist in the table with `is_active = true` — no password-in-env fallback.  
Tabbed interface. Real-time via Supabase Realtime + 60s polling + visibility-change re-fetch. Refactor in progress: `OpsQueueTab`, `ReviewsTab`, `OrdersTab`, `EnquiriesTab`, `ConfirmDialog`, `useAutoRefresh`, `PricingGovernanceTab` extracted to `src/components/admin/` (9 files total). Remaining inline tabs are candidates for future extraction.

### Role Access Matrix
Sourced from `TAB_ACCESS` in `AdminPortal.tsx`. Roles are additive — `owner` can access everything.

| Tab | owner | admin | sales | finance | service | reports |
|-----|:-----:|:-----:|:-----:|:-------:|:-------:|:-------:|
| `dashboard` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `products` | ✅ | ✅ | ✅ | | | |
| `images` | ✅ | ✅ | | | | |
| `import` | ✅ | ✅ | | | | |
| `tools` | ✅ | ✅ | | | | |
| `qc` | ✅ | ✅ | | | | |
| `catalog` | ✅ | ✅ | ✅ | | | |
| `orders` | ✅ | ✅ | ✅ | ✅ | ✅ | |
| `enquiries` | ✅ | ✅ | ✅ | | ✅ | |
| `quotation` | ✅ | ✅ | ✅ | | | |
| `invoices` | ✅ | ✅ | | ✅ | | |
| `installment_ledger` | ✅ | ✅ | | ✅ | | |
| `ops` | ✅ | ✅ | | ✅ | ✅ | |
| `customers` | ✅ | ✅ | ✅ | ✅ | ✅ | |
| `lifecycle` | ✅ | ✅ | ✅ | | ✅ | |
| `referrals` | ✅ | ✅ | ✅ | | | |
| `reviews` | ✅ | ✅ | ✅ | | | |
| `solar` | ✅ | ✅ | ✅ | | ✅ | |
| `leads` | ✅ | ✅ | ✅ | | | |
| `settings` | ✅ | ✅ | | | | |
| `schema` | ✅ | ✅ | | | | |
| `audit` | ✅ | ✅ | | | | |
| `compatibility` | ✅ | ✅ | | | | |
| `health` | ✅ | ✅ | | | | |
| `team` | ✅ | | | | | |
| `reports` | ✅ | ✅ | | ✅ | | ✅ |
| `pricing` | ✅ | ✅ | | ✅ | | |

> Enforced in the UI: sidebar hides unauthorized tabs, `changeTab` blocks programmatic navigation, and URL hash access redirects to dashboard if the target tab is not in the role's allowlist.

### Admin Tabs (27 total, grouped in sidebar)

**Overview**
| Tab | Function |
|-----|---------|
| `dashboard` | Order metrics, recent orders, status pipeline (Pending → Confirmed → Delivered), quick stats |
| `reports` | Embeds full BI ReportsPortal |

**Catalog**
| Tab | Function |
|-----|---------|
| `products` | Full CRUD — add/edit/delete, CSV import, image upload (drag-drop + URL fetch), bulk ops, image rematch |
| `images` | Image audit — shows products with missing images, badge count when > 0 |
| `import` | CSV bulk import wizard |
| `tools` | Data Tools — re-enrich specs, category repair, duplicate detection & merge, bucket scan |
| `qc` | QC Queue — products flagged with data issues, badge count when > 0 |
| `catalog` | WhatsApp Catalog export |

**Sales & Finance**
| Tab | Function |
|-----|---------|
| `orders` | Order pipeline, status updates, WhatsApp confirmation dispatch |
| `enquiries` | Inbound enquiry/quote requests |
| `quotation` | Generate quotations / invoices as PDF (jsPDF) — multi-discount modes, trade-in, installment schedule, QR code |
| `invoices` | Invoice Log — full history of all generated documents |
| `installment_ledger` | Installment payment tracking ledger |
| `ops` | Ops Queues — delivery, installation, service, payments, installment applications, support tickets |

**CRM**
| Tab | Function |
|-----|---------|
| `customers` | Customer CRM — search, view profiles, purchase history |
| `lifecycle` | 6-stage AC customer journey, segment WhatsApp campaign dispatch |
| `referrals` | Referral programme dashboard, referral earnings management |
| `reviews` | Review moderation — approve / reject / feature product reviews |
| `solar` | Solar Leads pipeline — status management, proposal PDF generation |
| `leads` | Partner enquiry leads |

**Finance**
| Tab | Function |
|-----|---------|
| `pricing` | Pricing Governance — view all products with retail/cash/cost/margin, flag low-margin or no-cost items, inline price editing, CSV export (`PricingGovernanceTab`) |

**Settings**
| Tab | Function |
|-----|---------|
| `settings` | Site Settings — announcement banner, offer banners (5 slots), installment plan markups, consultation threshold |
| `schema` | Spec Schema — product specification taxonomy editor |
| `audit` | Audit Log — admin action history, clearable |
| `compatibility` | Solar/UPS compatibility rules — inverter × battery voltage matrix |
| `health` | System Health — database checks, data quality metrics |
| `team` | Team — add/manage staff members and roles |

> **Maintainability note:** `AdminPortal.tsx` is a monolithic single file (~16,000+ lines). All 27 tabs are defined inside it. Extracted so far to `src/components/admin/` (9 files): `OpsQueueTab`, `ReviewsTab`, `OrdersTab`, `EnquiriesTab`, `ConfirmDialog`, `useAutoRefresh`, `PricingGovernanceTab`, `LifecycleAdmin`, `StaffMembersTab`. Recommended further refactor: extract remaining large inline tabs (`QuotationTab` ~3000 lines, `CustomerCrmTab` ~600 lines, `InvoiceHistoryTab` ~540 lines). The tab router stays in `AdminPortal.tsx`.

### Invoice / Quotation System
Generated as PDF with: company header + NTN · customer + product details · multi-discount modes · trade-in deduction · installment schedule table · payment QR code · prepared-by field · auto-reference number.

---

## 15. Reports Portal (`/reports`)

Business intelligence dashboard. Same Supabase staff auth as Admin (role `reports` or higher).  
Intended subdomain: `reports.tajallis.com.pk` (CNAME to same Vercel app).

### 9 Tabs

| Tab | Content |
|-----|---------|
| **Executive Summary** (`summary`) | KPI cards (revenue, orders, margin, solar leads), revenue trend chart |
| **Revenue & Profitability** (`revenue`) | COGS vs revenue, margin by category, monthly P&L |
| **Sales Performance** (`sales`) | Channel breakdown (online/offline), installment vs cash mix |
| **Seasonality** (`seasonality`) | Month-on-month analysis, Pakistan appliance market seasonal context |
| **Customer Intelligence** (`customers`) | Segment analysis, repeat buyer rate, LTV indicators |
| **Lead Pipeline** (`leads`) | Solar leads by stage, conversion funnel |
| **Credit** (`credit`) | Installment payment analytics — advance paid, outstanding balances, overdue risk |
| **Strategic Insights** (`insights`) | Rule-based insight engine, auto-generated recommendations |
| **Data Studio** (`studio`) | Manual entry forms: expenses, monthly targets, offline sales, product cost prices |

### Data Sources
Online orders · Invoices + invoice lines · Solar leads · Analytics events · Installment ledger (view) · BI manual tables (expenses, targets, offline sales, product costs)

---

## 16. Customer Lifecycle Engine

Tracks AC buyers through a 6-stage post-sale journey. Admin accessible at `/admin` → CRM tab.

### Stages
| Stage | Day | WhatsApp Template |
|-------|-----|------------------|
| Installation Pending | 0 | `lifecycle_ac_install` |
| 7-Day Check | 7 | `lifecycle_ac_day7` |
| 3-Month Service | 90 | `lifecycle_ac_month3` |
| Pre-Summer Clean | 270 | `lifecycle_ac_presummer` |
| Annual Care Plan | 365 | `lifecycle_ac_care_plan` |
| Solar Offer | 540 | `lifecycle_ac_solar` |
| Completed | — | — |

### How it works
1. Staff adds customer record after AC sale
2. `lifecycle_action_queue` DB view surfaces customers overdue or due within 3 days
3. Staff clicks **Send** → opens pre-filled WhatsApp template for that stage
4. Staff clicks **Advance** → moves customer to next stage

### Customer Segments
`new_customer` · `repeat_buyer` · `high_value` · `at_risk` · `solar_prospect`

---

## 17. WhatsApp Integration

**Sales number (customer-facing):** +92 370 2578788  
**Admin number (internal only — never publish):** +92 335 4266238

All message links include referral tracking via `appendRef()`.  
All templates are bilingual (English + Roman Urdu).

### Template Categories (`src/lib/whatsapp.ts`)
| # | Category | Templates |
|---|---------|-----------|
| 1 | Greetings | EN + UR |
| 2 | Product enquiry | EN + UR, price-aware |
| 3 | Installment consultation | EN + UR, full plan breakdown |
| 4 | Closing a sale | EN + UR |
| 5 | Order confirmation | EN + UR with order ID |
| 6 | Post-sale follow-up | 3-day + quarterly + annual |
| 7 | Feedback / reviews | EN + UR |
| 8 | Upgrade / cross-sell | EN + UR |
| 9 | Service & maintenance reminders | EN + UR |
| 10 | Warranty & complaints | EN + UR |
| 11 | Corporate enquiry | UR |
| 12 | Solar consultation | UR, 4-question assessment |
| 13 | AC lifecycle journey | 6 stage-specific templates |
| 14 | Bundle offers | 4 templates (AC, Fridge, Washer, Solar) |
| 15 | Segment campaigns | 3 templates (repeat buyer, high value, solar prospect) |
| 16 | Bot auto-responses | Query router + price/delivery/warranty/availability replies |

---

## 18. Referral System

- `?ref=` URL parameter captured on every page load, stored in sessionStorage
- `appendRef()` appends active referral code to all WhatsApp message URLs automatically
- Customer portal Referrals tab: personal code, shareable link, WhatsApp share, earnings history
- `referral_earnings` DB table tracks commission per conversion

---

## 19. SEO & Meta

### Per-Page SEO
Each route's `app/*/page.tsx` server component exports `metadata` (static) or `generateMetadata` (dynamic) — Next.js injects these into `<head>` at render time. This works for all clients including social-media crawlers (WhatsApp, Facebook, etc.) which receive the fully server-rendered HTML directly. Fields: `title`, `description`, `keywords`, `openGraph`, `twitter`, `alternates.canonical`, `robots`.

### Structured Data (JSON-LD)
- **All pages:** LocalBusiness + Organization schema in `app/layout.tsx`
- **Home:** FAQPage schema (7 Q&As about Karachi appliance buying). Review/testimonial schema should only be enabled for approved DB reviews — not for the current hardcoded entries.
- **Solar page:** FAQPage schema (solar-specific queries)
- **Services page:** LocalBusiness schema with Service offer items (installation, maintenance)
- **Product pages:** Product schema with price, availability, image, organization

### Sitemap
Generated by `app/sitemap.ts` (Next.js native `MetadataRoute.Sitemap`). Includes: 19 static routes + 9 category slugs + 8 brand slugs + all live product slugs fetched from DB. `lastModified` is set to `product.updated_at || product.created_at` per product (falls back to build time if neither is present) — verify this is not falling back to `new Date()` for all URLs in practice. `public/sitemap.xml` is a legacy index file that should be removed once `api/sitemap.xml.js` is retired (see Known Gaps).

### Vercel Security Headers
```
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Assets: Cache-Control public, max-age=31536000, immutable
```

### Vercel Cron
`/api/catalog-refresh` runs daily at 02:00 to regenerate the Meta Commerce product feed.

### WhatsApp / Meta Commerce Feed
Two Vercel functions handle the Meta Commerce integration:
- **`/api/meta-catalog`** — serves a CSV product feed formatted for WhatsApp Business Catalog (titles ≤ 100 chars, descriptions ≤ 500 chars, `product_type` for category sections, `google_product_category` for ad targeting). Register this URL in Meta Commerce Manager.
- **`/api/meta-sets-sync`** — creates/updates/deletes WhatsApp Catalog Product Sets so products appear under category tabs in WhatsApp Shopping. Triggered via a button in the admin Catalog tab. Requires `META_ACCESS_TOKEN` + `META_CATALOG_ID` server env vars.

---

## 20. Database Schema & Migrations

### Core Tables
| Table | Purpose |
|-------|---------|
| `products` | Full product catalog (~993 active) |
| `orders` | Customer orders from checkout |
| `analytics` | Event tracking |
| `solar_leads` | Leads from solar calculator |
| `site_settings` | Admin-configurable settings (banners, plan rates) |
| `media_gallery` | Installation + featured photos |
| `audit_log` | Admin action history + price change log |
| `invoices` | Admin-generated invoices + quotations |
| `invoice_lines` | Line items per invoice |
| `partner_leads` | Partnership programme enquiries |
| `package_templates` | Bundle/package templates + 4 bundle seeds |
| `installment_ledger` | View: payment schedule per order |
| `customer_profiles` | Portal user loyalty + segments |
| `customer_appliances` | Portal appliance registry |
| `loyalty_transactions` | Loyalty points ledger |
| `referral_earnings` | Referral commission per conversion |
| `support_tickets` | Portal support tickets |
| `payment_proofs` | Installment payment uploads |
| `customer_lifecycle_flows` | 6-stage AC journey per customer |
| `lifecycle_action_queue` | View: customers due/overdue for next action |
| `reviews` | Product and service reviews — moderated via admin; featured reviews shown on homepage |
| `staff_members` | Admin staff accounts + roles + is_active flag |
| `wa_message_log` | Log of WhatsApp messages dispatched from admin |
| `competitor_benchmarks` | Manually-entered competitor price observations for pricing governance |
| `price_change_requests` | Request-and-approval workflow for pricing changes (request → review → apply/reject) |
| `bi_expenses` | BI manual expense entries |
| `bi_product_costs` | BI product cost prices |
| `bi_targets` | BI monthly revenue/order targets |
| `bi_offline_sales` | BI manual offline sales entries |

### Migration History

<!-- AUTO:migrations -->
| Date | Description | File |
|------|-------------|------|
| 2026-03-15 | admin rls | `20260315_admin_rls.sql` |
| 2026-03-15 | platform overhaul | `20260315_platform_overhaul.sql` |
| 2026-03-16 | admin orders | `20260316_admin_orders.sql` |
| 2026-03-19 | products admin rls | `20260319_products_admin_rls.sql` |
| 2026-03-25 | solar leads | `20260325_solar_leads.sql` |
| 2026-03-27 | create orders analytics | `20260327_create_orders_analytics.sql` |
| 2026-03-27 | data fixes | `20260327_data_fixes.sql` |
| 2026-03-27 | media gallery | `20260327_media_gallery.sql` |
| 2026-04-02 | compatibility columns | `20260402_compatibility_columns.sql` |
| 2026-04-02 | taxonomy columns | `20260402_taxonomy_columns.sql` |
| 2026-04-20 | invoice log | `20260420_invoice_log.sql` |
| 2026-04-20 | package templates | `20260420_package_templates.sql` |
| 2026-04-24 | invoice v2 | `20260424_invoice_v2.sql` |
| 2026-04-24 | price audit log | `20260424_price_audit_log.sql` |
| 2026-04-30 | invoice v3 | `20260430_invoice_v3.sql` |
| 2026-05-05 | hanco water heater | `20260505_hanco_water_heater.sql` |
| 2026-05-07 | bi tables | `20260507_bi_tables.sql` |
| 2026-05-07 | customer crm | `20260507_customer_crm.sql` |
| 2026-05-14 | invoice prepared by | `20260514_invoice_prepared_by.sql` |
| 2026-05-14 | invoice save fix | `20260514_invoice_save_fix.sql` |
| 2026-05-15 | invoice discount mode | `20260515_invoice_discount_mode.sql` |
| 2026-05-15 | invoice fullstate | `20260515_invoice_fullstate.sql` |
| 2026-05-16 | inst schedule json | `20260516_inst_schedule_json.sql` |
| 2026-05-16 | payment status advance paid | `20260516_payment_status_advance_paid.sql` |
| 2026-05-18 | customer portal tables | `20260518_customer_portal_tables.sql` |
| 2026-05-19 | appliance warranty fields | `20260519_appliance_warranty_fields.sql` |
| 2026-05-19 | batch1 ac price benchmark | `20260519_batch1_ac_price_benchmark.sql` |
| 2026-05-19 | batch2 dawlance ac price corrections | `20260519_batch2_dawlance_ac_price_corrections.sql` |
| 2026-05-19 | batch3 gree dawlance corrections | `20260519_batch3_gree_dawlance_corrections.sql` |
| 2026-05-19 | customer care plans | `20260519_customer_care_plans.sql` |
| 2026-05-19 | invoice multi discount | `20260519_invoice_multi_discount.sql` |
| 2026-05-19 | invoice tradein | `20260519_invoice_tradein.sql` |
| 2026-05-19 | portal support tables | `20260519_portal_support_tables.sql` |
| 2026-05-22 | portal credentials | `20260522_portal_credentials.sql` |
| 2026-05-25 | bundle seed | `20260525_bundle_seed.sql` |
| 2026-05-25 | lifecycle engine | `20260525_lifecycle_engine.sql` |
| 2026-05-25 | staff members | `20260525_staff_members.sql` |
| 2026-05-26 | cost price | `20260526_cost_price.sql` |
| 2026-05-26 | deduplicate products | `20260526_deduplicate_products.sql` |
| 2026-05-26 | find duplicate products | `20260526_find_duplicate_products.sql` |
| 2026-05-26 | installment applications | `20260526_installment_applications.sql` |
| 2026-05-26 | referral admin rls | `20260526_referral_admin_rls.sql` |
| 2026-05-26 | review moderation | `20260526_review_moderation.sql` |
| 2026-05-26 | ups solar packages | `20260526_ups_solar_packages.sql` |
| 2026-05-26 | wa message log | `20260526_wa_message_log.sql` |
| 2026-05-27 | data quality | `20260527_data_quality.sql` |
| 2026-05-27 | power consumption | `20260527_power_consumption.sql` |
| 2026-05-27 | price history | `20260527_price_history.sql` |
| 2026-05-27 | pricing cost changes | `20260527_pricing_cost_changes.sql` |
| 2026-05-27 | reviews homepage | `20260527_reviews_homepage.sql` |
| 2026-05-27 | solar lead scoring | `20260527_solar_lead_scoring.sql` |
| 2026-05-29 | invoice payment date | `20260529_invoice_payment_date.sql` |
| 2026-05-30 | gree pit pular fix | `20260530_gree_pit_pular_fix.sql` |
| 2026-05-30 | inverter battery backfill | `20260530_inverter_battery_backfill.sql` |
| 2026-05-30 | wattage backfill | `20260530_wattage_backfill.sql` |
| 2026-05-31 | competitor benchmarks | `20260531_competitor_benchmarks.sql` |
| 2026-05-31 | price change workflow | `20260531_price_change_workflow.sql` |
<!-- /AUTO:migrations -->

### Migration vs Production Status
The table above lists migration **files present locally**. A file being present does not prove the migration has been applied to production. To verify what is actually live, check `/admin#health` — the System Health tab runs database checks and will surface missing tables, views, columns, or seed rows.

Do not maintain a manual "pending" list here — it goes stale immediately. Use `/admin#health` as the authoritative source of migration status.

---

## 21. Visual Assets & Graphics

### Static Files (`/public`)
| File | Used for |
|------|---------|
| `tajallis-logo-icon.svg` | Navbar and Footer (CSS inverted to white via `brightness-0 invert`) |
| `tajallis-logo.svg` | General SVG logo |
| `tajallis-logo-white.svg` | Dark-background logo |
| `tajallis-logo.jpeg` | Raster logo |
| `favicon.svg` | Browser tab icon |
| `og-image.svg` | Social media share preview image |
| `placeholder-product.svg` | Shown when product has no image |
| `meezan-qr.jpeg` | Meezan Bank payment QR in checkout |
| `bank-qr.jpeg` | Generic bank transfer QR in checkout |
| `robots.txt` | Search engine crawl rules |
| `_redirects` | Netlify/CDN redirect rules (legacy; Vercel uses `vercel.json`) |

### Dynamic / Remote Images
- **Product images:** Stored in Supabase Storage bucket
- **Gallery images:** Pulled from `media_gallery` DB table (installation + featured photos)
- **Google Drive fallback:** `fixImageUrl()` in `api.ts` converts Drive file IDs to thumbnail URLs for legacy images

### `BrandedImage` Component (`src/components/common/BrandedImage.tsx`)
Wraps all remote images with: lazy loading, error fallback to placeholder, compact mode, style passthrough. Used everywhere a remote image is displayed.

### Homepage Collage Logic
Fetches up to 32 images (16 featured + 16 installation) from DB, shuffles them, splits into 4 rotating slots — each advances every 5 seconds with a fade + scale transition. Falls back to icon tiles while images load.

---

## 22. Key Business Rules

These rules are **enforced in code** — never change without updating the source file listed.

| Rule | Source file |
|------|------------|
| 12-month plan requires ≥ PKR 50,000 (fans qualify at any price) | `api.ts` → `allows12m()` |
| Solar > 5kW or > PKR 700,000 = cash only | `solarRules.ts` + `SolarCalculator.tsx` + `ProductDetail.tsx` |
| Site consultation only for orders > PKR 1,000,000 | `settingsStore.ts` → `CONSULTATION_THRESHOLD_DEFAULT` |
| T3 badge only for models with "T3" as word boundary in name | `api.ts` → `isTrueT3()` |
| 24V batteries: inverters < 3.7 kW only | `compatibility.ts` |
| 48V batteries: required for inverters > 4.0 kW | `compatibility.ts` |
| 3.7–4.0 kW band: uncertain / requires manual review | `compatibility.ts` |
| Customer-facing phone = +92 370 2578788 only | `config.ts` → `WA_SALES` |
| Admin phone (+92 335) = internal only, never shown in UI | `config.ts` → `WA_ADMIN` |
| `taxonomy_status = review/quarantine` hidden from public catalog | `api.ts` → `getProducts()` |
| Brand-free installations are not charged | `services.ts` → `InstallationProvider` |
| K-Electric net metering requires ≥ 10 kW | `solarRules.ts` → `NET_METERING_MIN_KW` |
| JazzCash/EasyPaisa account title "Reliance by Tajallis" must not change | `Checkout.tsx` (functional payment data) |

---

## 23. Known Gaps & Pending Work

| Priority | Gap | Notes |
|----------|-----|-------|
| ✅ Resolved | ~~Inverter / battery data backfill~~ | `20260530_inverter_battery_backfill.sql` — mirrors `getInverterKw`/`getBatteryVoltage`/`getBatteryKwh` auto-detection logic from AdminPortal. |
| ✅ Resolved | ~~Power consumption specs~~ | `20260530_wattage_backfill.sql` — adds `wattage_is_estimated` flag; backfills wattage from specs or category defaults. |
| ✅ Resolved | ~~Gree PIT/Pular inverter flag~~ | `20260530_gree_pit_pular_fix.sql` — flags PIT / Pular / Fairy / Flexi / Lomo models as `inverter: true`. |
| 🟡 Medium | **Pricing governance audit** | `PricingGovernanceTab` is live for review. Price change approval workflow added via `20260531_price_change_workflow.sql` — changes now require request → review → apply. |
| 🟡 Medium | **Keep `api/catalog-refresh.js`** | Vercel cron target (`vercel.json` schedules it at 02:00). No Next.js App Router equivalent for a cron endpoint — retain as-is. |
| 🟡 Medium | **`AdminPortal.tsx` refactor ongoing** | 9 components extracted to `src/components/admin/` (OpsQueueTab, ReviewsTab, OrdersTab, EnquiriesTab, ConfirmDialog, useAutoRefresh, PricingGovernanceTab, LifecycleAdmin, StaffMembersTab). ~14 inline tabs remain — continue extracting the largest ones (QuotationTab ~3000 lines, CustomerCrmTab ~600 lines, InvoiceHistoryTab ~540 lines). |
| 🟡 Medium | **`src/lib/api.ts` too broad** | Contains all Supabase queries, product logic, and plan calculations in one file. Recommended split: `products.ts`, `orders.ts`, `pricing.ts`, `invoices.ts`, `portal.ts`, `reports.ts`, `solar.ts`, `admin.ts`. Long-term maintainability risk as the codebase grows. |
| ✅ Resolved | ~~Homepage reviews still hardcoded~~ | `getFeaturedReviews()` in `api.ts` fetches `status='approved' AND is_featured=true`. `Home.tsx` calls it and uses `liveReviews ?? REVIEWS` fallback. Migration `20260527_reviews_homepage.sql` adds `service_label` + seeds 6 entries. |
| 🟢 Low | **Off-grid solar page** | Route `/solar/off-grid` exists; content not recently verified. |
| 🟢 Low | **PortalCarePlans / PortalInstallments completeness** | Recently added to PRIMARY_TABS — end-to-end user flow not confirmed. |
| ✅ Resolved | ~~Cart does not persist on refresh~~ | `persist` middleware in cartStore (localStorage `tajallis-cart`). |
| ✅ Resolved | ~~Admin password gate~~ | Replaced by Supabase staff_members DB auth with role-based access. |
| ✅ Resolved | ~~Solar compatibility admin tab~~ | CompatibilityReviewTab at /admin#compatibility. |
| 🟡 Medium | **SSR/SEO per-route verification** | Project is Next.js 14. Routes using `generateMetadata` with server-fetched data (e.g. product pages) are fully SSR. Routes that wrap a client component fetching data in the browser are still shell-rendered. Verify `/products/[slug]` and `/products/category/[slug]` specifically — confirm product content and schema are generated server-side, not only after client hydration. |
| ✅ Resolved | ~~Sitemap incomplete / static~~ | `app/sitemap.ts` generates dynamically: static routes + brand slugs + category slugs + all live product slugs from DB. `lastModified` uses actual product timestamps (`updated_at \|\| created_at`) rather than a fixed `new Date()` for all URLs. |
| ✅ Resolved | ~~`vercel.json` SPA rewrite / sitemap conflict~~ | Stale rewrites removed. `api/sitemap.xml.js` converted to 308 redirect. Next.js native sitemap canonical. |
| ✅ Resolved | ~~SPA-era Edge Middleware~~ | `middleware.js` and `api/og-meta.js` deleted. Next.js SSR serves complete HTML (including OG meta) directly to all clients including social bots — no intercept layer needed. |
| ✅ Resolved | ~~Per-tab role enforcement missing~~ | `TAB_ACCESS` map added to AdminPortal. Sidebar hides unauthorized tabs per role. `changeTab` and URL hash routing enforce the access matrix at runtime. |

---

## 24. File Inventory

*Auto-updated from the live source tree.*

<!-- AUTO:file-inventory -->
**Views (32) — `src/views/`**

- `About`
- `AdminDashboard`
- `AdminPortal`
- `BundlesPage`
- `BuyingGuide`
- `Cart`
- `Checkout`
- `ComparePage`
- `Contact`
- `Corporate`
- `Dashboard`
- `Gallery`
- `GreenCorridor`
- `Home`
- `Installments`
- `MYOP`
- `OffGridSolar`
- `Partner`
- `PolicyPage`
- `Portal`
- `ProductDetail`
- `Products`
- `Referral`
- `ReportsPortal`
- `SalesCatalog`
- `SearchResults`
- `Services`
- `SolarCalculator`
- `SolarPage`
- `Support`
- `ToolsPage`
- `misc`

**Library (26) — `src/lib/`**

- `__tests__/compatibility.test`
- `__tests__/installments.test`
- `__tests__/invoice.test`
- `__tests__/setup`
- `__tests__/taxonomy.test`
- `analytics`
- `api`
- `auth`
- `catalog`
- `compare`
- `compatibility`
- `config`
- `gallery`
- `invoiceLogic`
- `plans`
- `qc`
- `referral`
- `salesCatalog`
- `search`
- `services`
- `solarRules`
- `supabase`
- `supabase-server`
- `taxonomy`
- `types`
- `whatsapp`

**Components (52) — `src/components/`**

- `AnnouncementBanner`
- `AuthModal`
- `BookingModal`
- `BundleSection`
- `CompareButton`
- `InstallmentCalculator`
- `OfferBannerSlider`
- `PaymentSelection`
- `SearchBar`
- `SolarROISlider`
- `admin/ConfirmDialog`
- `admin/EnquiriesTab`
- `admin/LifecycleAdmin`
- `admin/OrdersTab`
- `admin/OpsQueueTab`
- `admin/CompetitorBenchmarksTab`
- `admin/PricingGovernanceTab`
- `admin/ReviewsTab`
- `admin/StaffMembersTab`
- `admin/useAutoRefresh`
- `cart/CartDrawer`
- `common/BrandedImage`
- `layout/Footer`
- `layout/Layout`
- `layout/MobileBottomBar`
- `layout/Navbar`
- `portal/PortalAccount`
- `portal/PortalAppliances`
- `portal/PortalAuth`
- `portal/PortalCarePlans`
- `portal/PortalInstallments`
- `portal/PortalLoyalty`
- `portal/PortalOrders`
- `portal/PortalOverview`
- `portal/PortalPayments`
- `portal/PortalRecommendations`
- `portal/PortalReferrals`
- `portal/PortalSupport`
- `portal/PortalTimeline`
- `portal/portalConstants`
- `portal/portalTypes`
- `products/ProductCard`
- `products/ReviewSection`
- `products/SolarCompatibilityPanel`
- `providers/ClientProviders`
- `ui/AnimatedCounter`
- `ui/ComparisonTable`
- `ui/CorporateQuoteForm`
- `ui/ErrorBoundary`
- `ui/FAQSection`
- `ui/SEO`
- `ui/ServiceBookingWidget`
- `ui/SocialProofLoop`
- `ui/Spinner`
<!-- /AUTO:file-inventory -->

---

## 25. Dependencies

*Auto-updated from package.json.*

<!-- AUTO:dependencies -->
**Package name:** `reliance-appliances`  
**Version:** `4.0.0`

| Package | Version |
|---------|---------|
| `@supabase/supabase-js` | `^2.98.0` |
| `@types/qrcode` | `^1.5.6` |
| `html2canvas` | `^1.4.1` |
| `jspdf` | `^4.2.1` |
| `jspdf-autotable` | `^5.0.7` |
| `lucide-react` | `^0.303.0` |
| `next` | `^14.2.30` |
| `qrcode` | `^1.5.4` |
| `react` | `^18.2.0` |
| `react-dom` | `^18.2.0` |
| `react-hot-toast` | `^2.6.0` |
| `recharts` | `^3.7.0` |
| `xlsx` | `^0.18.5` |
| `zustand` | `^4.4.7` |
<!-- /AUTO:dependencies -->

---

## 26. Contact & Credentials Reference

### Customer-Facing
| Channel | Value |
|---------|-------|
| WhatsApp / Phone | +92 370 2578788 |
| Sales email | sales@tajallis.com.pk |
| Support email | support@tajallis.com.pk |
| Address | L-152-153, Sector 11C-1, UP More, North Karachi |

### Internal / Dev
| Item | Value |
|------|-------|
| Admin WhatsApp | +92 335 4266238 *(internal only — do not publish)* |
| Supabase project | Set via `NEXT_PUBLIC_SUPABASE_URL` env var |
| Admin portal auth | Supabase staff auth — add user via `staff_members` table |
| Vercel project | See `.vercel/project.json` |

### Required Environment Variables

**Next.js client-side (NEXT_PUBLIC_)** — inlined at build time into the client bundle. No privileged server-only Supabase key is currently in use. Public Supabase access uses the anon key, with RLS enforcing access control.
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_SITE_URL      (default: https://reliance.tajallis.com.pk)
NEXT_PUBLIC_WA_SALES      (default: 923702578788)
NEXT_PUBLIC_WA_ADMIN      (default: 923354266238)
```

**Server-side (api/ Vercel functions)** — used by `api/meta-sets-sync.js` for Meta Commerce Manager integration:
```
META_ACCESS_TOKEN   — long-lived System User token from Meta Business Suite
META_CATALOG_ID     — numeric Commerce Manager catalog ID
```

### Deprecated / Legacy Environment Variables
```
VITE_ADMIN_PASS   — no longer used. Admin access is controlled by Supabase Auth + staff_members table.
VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY / VITE_SITE_URL / VITE_WA_SALES / VITE_WA_ADMIN
                  — legacy Vite-era names. Still referenced inside api/meta-catalog.js and
                    api/meta-sets-sync.js (pre-App Router functions). .env.example still uses
                    these names. Set both NEXT_PUBLIC_* and VITE_* in Vercel env until api/
                    functions are migrated to NEXT_PUBLIC_*.
```
`VITE_ADMIN_PASS` can be deleted from Vercel safely. The `VITE_*` data vars must remain until the api/ functions are updated.

### Future Server-Only Variables
If admin reports, cron jobs, or maintenance tasks ever require privileged Supabase access, add:
```
SUPABASE_SERVICE_ROLE_KEY   (server-only — NEVER prefix with NEXT_PUBLIC_)
```
Do not add until actually needed. When added, use only inside `app/api/` routes or server actions with strict authorization checks — never import into client components.

---

*Sections marked AUTO are regenerated from source files. Run `node scripts/update-platform-docs.mjs` to refresh, or edits will trigger it automatically.*
