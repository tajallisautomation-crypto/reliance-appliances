# Reliance Appliances — Complete Setup Guide

## 🚀 Quickstart (5 steps)

### Step 1 — Google Apps Script (do this first)
1. Open your Google Sheet
2. Click **Extensions → Apps Script**
3. Delete everything, paste the entire contents of `ApplianceStoreBrain.gs`
4. Click **Save**, then **Run → `setupAllSheets`** *(creates all 15 tabs)*
5. Click **Deploy → New Deployment → Web App**
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Copy the Web App URL (looks like `https://script.google.com/macros/s/ABC.../exec`)

### Step 2 — Configure environment
```bash
cp .env.example .env
```
Open `.env` and paste your Web App URL:
```
VITE_SHEETS_URL=https://script.google.com/macros/s/YOUR_ID/exec
VITE_SITE_URL=https://relianceappliances.pk
VITE_WA_SALES=923702578788
VITE_WA_ADMIN=923354266238
```

### Step 3 — Install & run locally
```bash
npm install
npm run dev
```
Open http://localhost:5173 — website is live with fallback products.

### Step 4 — Add your products
1. Go to **Raw_Import** tab in your Google Sheet
2. Add rows: `Brand | Model | Category | Sub_Category | Min_Price | Notes`
3. In the **🏠 Reliance** menu: click **"2. Import Raw Data → Master Products"**
4. Then click **"3. Enrich All Products"** to auto-fetch specs, images, SEO

### Step 5 — Deploy to GitHub / Vercel
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/reliance-appliances.git
git push -u origin main
```
- Go to [vercel.com](https://vercel.com) → Import GitHub repo
- Add environment variables from your `.env`
- Deploy → done!

---

## 📁 Project Structure

```
├── ApplianceStoreBrain.gs    ← Paste this into Google Apps Script
├── src/
│   ├── App.tsx               ← All routes
│   ├── main.tsx              ← Entry point
│   ├── components/
│   │   ├── layout/           ← Navbar, Footer, Layout
│   │   ├── ui/               ← SEO, Spinner
│   │   ├── products/         ← ProductCard
│   │   └── cart/             ← CartDrawer
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── Products.tsx
│   │   ├── ProductDetail.tsx
│   │   ├── Cart.tsx
│   │   ├── Checkout.tsx
│   │   ├── Installments.tsx
│   │   ├── Services.tsx
│   │   ├── SolarPage.tsx
│   │   ├── Corporate.tsx
│   │   ├── Portal.tsx        ← Customer portal + CRM
│   │   └── misc.tsx          ← About, Contact, FAQ, Policy, 404
│   ├── lib/
│   │   ├── api.ts            ← Sheets API + fallback products
│   │   ├── config.ts         ← Env variables
│   │   ├── types.ts          ← TypeScript interfaces
│   │   └── whatsapp.ts       ← WhatsApp link helpers
│   └── store/
│       ├── cartStore.ts      ← Zustand cart
│       └── authStore.ts      ← Zustand auth
├── tailwind.config.js        ← All custom shadows/radius defined here
├── src/styles/globals.css    ← Only standard Tailwind in @apply
└── public/
    ├── favicon.svg
    ├── robots.txt
    └── _redirects            ← Netlify SPA fallback
```

---

## 🗄️ Google Sheets Tabs

| Tab | Purpose |
|-----|---------|
| **Raw_Import** | Paste new product data here |
| **Master_Products** | All products with full data, images, SEO |
| **Price_Archive** | Historical price log |
| **CRM_Customers** | Customer profiles, tiers, points |
| **Orders** | All orders |
| **FollowUp_Schedule** | Post-sale, quarterly, annual, maintenance follow-ups |
| **Warranty_Tracker** | Warranty claims and expiry |
| **Maintenance_Reminders** | Service due dates per product |
| **Power_Solutions** | Solar/backup power quotes per customer |
| **Packages_Offers** | Bundled packages and deals |
| **Loyalty_Tiers** | Bronze/Silver/Gold/Platinum definitions |
| **Referrals** | Referral tracking and rewards |
| **SEO_Content** | Auto-generated SEO per product |
| **Bot_Scripts** | WhatsApp bot response templates |
| **Sync_Logs** | All action logs |

---

## 🔄 Follow-Up Schedule (auto-created per order)

| Trigger | When | Message Type |
|---------|------|-------------|
| Post-Sale | Day 3 | Product experience check |
| Quarterly | Day 90 | Service offer + feedback |
| Annual | Day 365 | 1-year anniversary + annual service |
| Maintenance | Product-specific | Filter clean / service due |
| Renewal | 30 days before warranty expiry | Extended warranty offer |

---

## 📸 Drive Images Setup

1. Set `DRIVE_IMAGES_FOLDER_ID` in `ApplianceStoreBrain.gs`
2. Organise images:
   ```
   ProductImages/
   ├── Haier/
   │   ├── haier-hsu18hnf-front.jpg   ← "front" = thumbnail
   │   └── haier-hsu18hnf-side.jpg    ← becomes gallery
   ├── Gree/
   └── Samsung/
   ```
3. Script does **lenient matching** — partial model number matches work
4. "Front", "main", "primary", "display" in filename = thumbnail priority

---

## 💰 Installment Formula

| Plan | Markup | Advance | Monthly Payments |
|------|--------|---------|-----------------|
| 2 Month | +10% | 50% of total | 1× remaining |
| 3 Month | +15% | 50% of total | 2× remaining |
| 6 Month | +25% | 40% of total | 5× remaining |
| 12 Month | +40% | 30% of total | 11× remaining |

---

## 📞 WhatsApp Numbers
- Sales: +92 370 2578788
- Admin/Corporate: +92 335 4266238
